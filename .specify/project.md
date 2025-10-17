# BootAI Project Specification

## Project Overview

BootAI lets Windows users assemble a bootable Linux image with pre-downloaded Ollama models and copy that image to a USB drive. The repository ships a Node.js/Express backend (`src/main.js`), a static single-page interface (`public/index.html`), a WSL-oriented build script (`scripts/build.sh`), and `pkg` metadata for emitting a Windows binary (`bootai.exe`).

The build script now included in `scripts/build.sh` downloads a supported distro ISO, ensures it is cached, optionally caches the requested Ollama model when the CLI is installed, and emits a BootAI-branded ISO copy so that the Windows experience completes end to end. The script does **not** yet customize the operating system image—it provides a clean base image with model caching in place.

## Current Codebase Snapshot

| Area | Files | Status |
| --- | --- | --- |
| HTTP server & WebSocket bridge | `src/main.js` | Present. Provides REST endpoints and streams progress based on script output. |
| Web UI | `public/index.html` | Present. Offers a step-by-step wizard that calls the REST API. |
| Windows packaging | `package.json`, `bootai.exe` | `npm run build` uses `pkg` to emit a Windows binary. The committed `bootai.exe` was produced elsewhere; rebuilding requires Windows with `pkg`. |
| ISO build script | `scripts/build.sh` | Present. Downloads/caches the distro ISO, optionally pulls Ollama models, and copies the base ISO to a BootAI-prefixed output. No in-image customization yet. |
| USB writing helpers | `src/main.js` (PowerShell + `dd` calls) | Code exists but is unverified. Disk selection logic assumes a Windows + WSL environment. |
| Cache management | Backend endpoints call into `/root/bootai-cache` | Script creates cache directories. Commands succeed when WSL is set up with the expected paths. |
| Automated tests | — | None. `npm test` prints "Tests not configured yet". |

## Implementation Highlights

- Express server exposes endpoints for USB discovery, ISO build initiation, cache inspection, and cache clearing. WebSocket updates mirror key log lines from `scripts/build.sh` and the USB flashing helpers.
- The front-end wizard progresses through OS/model selection, ISO building, and USB flashing, reacting to WebSocket events emitted by the backend.
- Packaging uses `pkg` with the `node18-win-x64` target; assets from `public/` and `scripts/` are embedded during packaging.
- The WSL build script focuses on cache priming and emitting a distributable ISO file so the application workflow completes successfully.

## Known Gaps and Limitations

- The build script does not yet customize the Linux filesystem beyond caching assets. Future work should chroot into the image and pre-install Ollama/model assets.
- USB writing now derives disk numbers via PowerShell and builds a per-run diskpart script, but the workflow still requires elevated privileges and manual validation on Windows hardware.
- Cache management and Ollama integration depend on software inside WSL that the repo does not configure. Users must install Ollama manually for model pulls to succeed.
- There are no automated tests, linting, or CI definitions. Quality checks are manual.
- README marketing copy assumes richer functionality (GPU detection, automatic configuration) than the code currently implements.

## Current Status (March 2025)

- ✅ Web server starts locally with `npm run dev` and serves the UI.
- ✅ `scripts/build.sh` runs under WSL, downloads the selected base ISO, and emits a BootAI-branded copy alongside a checksum file.
- ⚠️ Model downloads only work when the Ollama CLI is installed; otherwise the step is skipped with a warning.
- ⚠️ USB flashing commands rely on diskpart/`dd` and need administrator privileges and manual verification.
- ❌ Automated QA is not implemented.

## Near-Term Priorities

1. Extend `scripts/build.sh` to customize the root filesystem (install Ollama, pre-pull models, configure services) rather than copying the base ISO untouched.
2. Add additional guard rails for USB flashing (confirm removability, prompt the user for destructive actions, surface detailed diskpart/`dd` output).
3. Replace optimistic progress handling with streamed subprocess output so the UI reflects real-time status precisely.
4. Introduce a minimal automated test suite (e.g., smoke tests for the REST API) and a linter.
5. Align README/marketing claims with implemented functionality or complete the missing features.

## Stabilization Plan for Identified Defects

### 1. Root Route Serves Incorrect HTML File
- **Goal**: Ensure the Express root route returns the SPA entry point from `public/index.html` so the UI loads without a 404.
- **Approach**: Recompute the file path using the project root instead of `__dirname` and cover both dev and packaged execution contexts.
- **Implementation Steps**:
  1. In `src/main.js`, derive the project root via `path.resolve(__dirname, '..')` (or equivalent) when building the `sendFile` path.
  2. Update the static asset middleware, if necessary, to align with the new root calculation.
  3. Manually verify that the packaged executable and `npm run dev` both serve the same document.
- **Validation**:
  - Start the dev server (`npm run dev`) and confirm `GET /` returns status 200 and renders the SPA.
  - Run `npm run build` on Windows and confirm `bootai.exe` serves the same file.
- **Risks / Mitigations**: Minimal—ensure path resolution works for both POSIX and Windows by using `path.join` and avoiding hard-coded separators.

### 2. Windows Build Script Path Resolution Fails
- **Goal**: Guarantee the `/api/build-iso` endpoint launches the WSL script reliably on Windows by using an absolute WSL-safe path.
- **Approach**: Convert the Node-side script path to a WSL path before invoking `wsl.exe`.
- **Implementation Steps**:
  1. Compute the absolute host path to `scripts/build.sh` with `path.join`.
  2. Convert that path using `wsl wslpath -a` (or `wslpath` via `child_process.execSync`). Cache the result per process.
  3. Update the Windows-specific command assembly in `src/main.js` to call `bash "<convertedPath>" …`.
  4. Maintain the Linux/macOS branch logic as-is.
- **Validation**:
  - Unit-test the command builder (inject the path converter) to confirm the generated command matches expectations.
  - On Windows hardware, run `/api/build-iso` and ensure the script launches without “No such file or directory.”
- **Risks / Mitigations**: Handle conversion failures by surfacing a descriptive error to the API client and avoid caching stale paths if the working directory moves.

### 3. ISO Download Endpoint Misses Generated Filenames
- **Goal**: Align `/api/download-iso` filename discovery with the artifacts produced by `scripts/build.sh`.
- **Approach**: Normalize colon-delimited model identifiers to dash-delimited filenames before searching.
- **Implementation Steps**:
  1. Mirror the naming convention used in `scripts/build.sh` when deriving candidate filenames (replace `:` with `-`).
  2. Optionally, read the most recent `.sha256` file to discover the paired ISO name if direct guessing fails.
  3. Update logging to indicate which filename was selected.
- **Validation**:
  - Build an ISO and ensure `/api/download-iso` returns HTTP 200 with the correct file.
  - Add regression coverage in a lightweight test (mock filesystem) to ensure new names resolve.
- **Risks / Mitigations**: Maintain backward compatibility by checking legacy names before falling back to the normalized pattern.

### 4. WSL Status Summary Not Surfaced in UI
- **Goal**: Display actionable diagnostic messages in the UI when WSL validation fails.
- **Approach**: Update the frontend to render `summary` (and optionally detailed `checks`) instead of an undefined `error` field.
- **Implementation Steps**:
  1. Modify `public/index.html` to use `result.summary` (with a fallback message) when `available === false`.
  2. Include optional expandable details for each failed check to aid troubleshooting.
  3. Ensure success flow remains unchanged.
- **Validation**:
  - Mock a failed `/api/wsl-status` response in the browser (e.g., via DevTools) and confirm the summary appears.
  - Confirm that a successful response still advances the wizard.
- **Risks / Mitigations**: Keep the UI text concise to avoid overwhelming users; consider sanitizing output before insertion.

### 5. Unsafe Windows Disk-to-WSL Device Mapping
- **Goal**: Prevent accidental data loss by correctly mapping Windows disk numbers to WSL block devices before running `dd`.
- **Approach**: Introduce an explicit lookup that correlates the selected Windows disk with WSL device metadata (e.g., serial number or size).
- **Implementation Steps**:
  1. Extend `/api/write-usb` to query `lsblk --json --output NAME,SERIAL,SIZE,MODEL` (or `/dev/disk/by-id`) inside WSL.
  2. Match the PowerShell-reported disk attributes (size, model, serial) against the WSL results; require an exact match.
  3. Abort the operation with a descriptive error if no unique match is found.
  4. Log and surface the resolved `/dev/disk/by-id/...` path to the UI for user confirmation before flashing.
  5. Update progress reporting to reflect the additional validation step.
- **Validation**:
  - Write integration tests that mock PowerShell/WSL responses to confirm correct path resolution.
  - On hardware, run the USB writing flow and verify the reported target matches `lsblk` output.
- **Risks / Mitigations**: Matching by size alone is insufficient—ensure at least two identifiers align. Provide a manual override path only with explicit confirmation.
