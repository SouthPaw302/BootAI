# BootAI Architecture Specification

## High-Level Architecture

BootAI ships as a Node.js application that serves a static front-end and orchestrates operating-system tooling through child processes. The repository now includes the WSL build script (`scripts/build.sh`) required by the backend, enabling the primary ISO workflow to succeed when run inside Windows + WSL.

```
Browser (public/index.html)
        │  Fetch + WebSocket
        ▼
Express server (src/main.js)
        │  exec(…) calls to Windows / WSL tooling
        ▼
External commands (PowerShell, diskpart, wsl, ollama, scripts/build.sh)
```

## Components

### Front-End (public/index.html)
- Single HTML file with inline CSS/JS.
- Implements a multi-step wizard for configuring base OS + model, triggering builds, scanning USB drives, and writing the ISO.
- Connects to `ws://localhost:3000` for progress updates and calls REST endpoints with `fetch`.
- Progress bars respond to keywords produced by the backend subprocesses.

### Backend (src/main.js)
- Sets up an Express server and a `ws` WebSocket server on port 3000.
- Endpoints:
  - `GET /api/usb-drives` → executes a PowerShell command to enumerate removable drives. Returns an array; errors resolve to `[]`.
  - `GET /api/wsl-status` → runs several `wsl` commands (status, list, tool availability) and returns a structured result.
  - `POST /api/build-iso` → validates inputs then runs `wsl -u root bash scripts/build.sh …`. With the script now present, the flow downloads/caches the distro ISO, optionally pulls the requested Ollama model, and emits a BootAI-branded copy.
  - `POST /api/write-usb` → derives disk numbers via PowerShell (`Get-Partition`/`Get-Disk`), writes a temporary diskpart script, launches diskpart, then streams a WSL `dd` command. Progress milestones (`formatting_usb`, `usb_formatted`, `writing_iso`, `usb_write_completed`) are forwarded to the WebSocket.
  - `GET /api/download-iso` → streams the first matching ISO file if present, otherwise responds with `{ success: false, error: … }`.
  - `GET /api/cache-status` / `POST /api/clear-cache` → inspect and clean `/root/bootai-cache` inside WSL; success depends on external environment state.
- Broadcasts WebSocket messages derived from subprocess stdout/stderr.

### Build Script (scripts/build.sh)
- Bash script intended to run inside WSL.
- Accepts `<base OS> <model>` arguments that mirror the UI selections.
- Creates `/root/bootai-cache/{isos,models}` directories and a temporary working directory.
- Downloads the requested distro ISO with resume support and caches it for future builds.
- Attempts to pull the requested Ollama model when the `ollama` CLI is available; continues gracefully if not.
- Emits progress-friendly log lines that the backend relays to the UI.
- Copies the base ISO to `bootai-<base>-<model>.iso`, produces `ai-node.iso` for legacy tooling, and writes a SHA-256 checksum file.

### External Dependencies
- Node.js 18+ runtime (server + packaging).
- Windows PowerShell for USB enumeration and diskpart scripting.
- Windows Subsystem for Linux for ISO building and model management.
- Optional: Ollama CLI inside WSL so model downloads succeed.
- `pkg` dev dependency for emitting a standalone `bootai.exe`.

## Data & File Flow

1. User interacts with the wizard in the browser.
2. Browser issues REST calls to Express.
3. Express validates input and spawns operating-system tools with `child_process.exec`.
4. Subprocess output is forwarded to the UI via WebSocket events and JSON responses.
5. Generated artifacts (ISO files, cache directories, checksum) land under the project root or `/root/bootai-cache/`.

## Key Architectural Considerations

- **Cache-first builds**: `scripts/build.sh` prioritises using cached ISOs/models to avoid repeated downloads.
- **Graceful degradation**: When Ollama or cache directories are missing the script warns but continues.
- **Privilege-sensitive operations**: USB flashing and cache management commands require elevated privileges and precise device targeting; the code now derives disk numbers automatically but still lacks guard rails against selecting the wrong drive.
- **Process supervision**: Long-running commands rely on manual timeouts defined in `src/main.js`. There is no retry or resume logic.
- **Error propagation**: Many subprocess errors are only logged to the console, leaving the UI with generic failures.

## Recommended Next Steps

1. Enhance `scripts/build.sh` to customize the ISO contents (chroot, install dependencies, configure services) rather than duplicating the base image.
2. Introduce stronger USB safeguards (confirm device type, prompt for confirmation, surface diskpart/`dd` output to the UI).
3. Centralize subprocess execution with structured logging and error handling so UI feedback stays in sync with backend state.
4. Consider splitting the architecture into explicit modules (USB, build pipeline, cache) to improve testability once automated tests are introduced.
