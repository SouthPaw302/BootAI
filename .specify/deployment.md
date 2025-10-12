# BootAI Deployment Specification

## Overview

BootAI runs as a Node.js service that opens a browser-based UI on port 3000. The repository includes `pkg` metadata so the server can be compiled into a standalone Windows executable, and it now ships the WSL build script (`scripts/build.sh`) that the backend expects.

## Target Environments

| Scenario | Supported? | Notes |
| --- | --- | --- |
| Local development on Windows 10/11 with WSL2 | ✅ | Required for PowerShell, diskpart, `wsl`, and running `scripts/build.sh`. Ollama installation is optional but enables model caching. |
| Local development on macOS/Linux | ⚠️ | HTTP server runs, but USB/WSL functionality is Windows-specific. The build script can run on Linux if the dependencies are available. |
| Packaged Windows executable (`bootai.exe`) | ⚠️ | `npm run build` produces an EXE via `pkg`; the binary still depends on external tooling (PowerShell, diskpart, WSL, Ollama). |
| Headless/CI deployment | ❌ | No CI pipeline or environment automation exists. |

## Prerequisites

- Node.js ≥ 18
- npm ≥ 8
- Windows PowerShell (built-in on Windows)
- Windows Subsystem for Linux with an Ubuntu distribution (for ISO build + Ollama commands)
- `curl` inside WSL (required by `scripts/build.sh`)
- Optional: Ollama CLI inside WSL if model caching is desired
- `pkg` (installed automatically via `npm install`)

## Development Workflow

1. Install dependencies
   ```bash
   npm install
   ```
2. Start the application in development mode
   ```bash
   npm run dev
   ```
3. The server listens on `http://localhost:3000` and automatically calls `open()` to launch the default browser.
4. Stop the server with `Ctrl+C` when finished.

## Building an ISO (WSL)

1. Launch a WSL shell in the repository root.
2. Run the build script directly or via the API:
   ```bash
   bash scripts/build.sh ubuntu-22.04 phi3:mini
   ```
3. On success, the script emits:
   - `bootai-<base>-<model>.iso`
   - `ai-node.iso` (legacy name for compatibility)
   - `bootai-<base>-<model>.iso.sha256`
4. ISO downloads are cached under `/root/bootai-cache/isos/`; reruns reuse the cached images.
5. Ollama models are pulled when the CLI is installed; failures log warnings but do not abort the build.

## Packaging Workflow (Windows)

1. Ensure `pkg` has downloaded the Node.js base binaries (first run may take a while).
2. Run the build script
   ```bash
   npm run build
   ```
3. Output: `bootai.exe` in the repository root.
4. Distribute the executable alongside instructions covering external prerequisites (WSL, Ollama, diskpart access).

## Runtime Considerations

- The packaged executable still shells out to PowerShell, diskpart, and WSL. Those tools must be present on the host machine and accessible from the environment in which `bootai.exe` runs.
- ISO creation succeeds when network access and disk space are available for the selected distro image. Model caching requires Ollama.
- USB writing requires administrator privileges; otherwise diskpart will fail.

## Deployment Gaps

| Gap | Impact |
| --- | --- |
| Limited ISO customization | Current builds replicate the base ISO without embedding BootAI tooling. Users must customize manually after booting. |
| No environment bootstrap | There is no automation to install WSL distributions, Ollama, or cache directories. |
| No logging configuration | Output is written only to STDOUT/STDERR; packaged builds rely on a visible console for diagnostics. |
| No updater / release process | Releases must be created manually. The committed `bootai.exe` has no provenance documentation. |

## Recommended Next Steps

1. Expand `scripts/build.sh` to customize the ISO (chroot, install packages, configure services).
2. Provide an installation script or guide that installs WSL requirements, Ollama, and any needed cache directories.
3. Add structured logging and optional log files so packaged builds remain debuggable.
4. Define a release checklist (versioning, changelog, integrity verification) once the workflow is functional.
