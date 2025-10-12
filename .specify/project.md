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
