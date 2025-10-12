# BootAI API Specification

All endpoints are served from `http://localhost:3000`. There is no authentication layer and CORS is enabled for any origin.

> **Important:** Several endpoints delegate to external tooling (PowerShell, diskpart, WSL, Ollama). The repository now ships a WSL build script (`scripts/build.sh`), but operations still require a properly provisioned Windows + WSL environment.

## WebSocket Channel

- URL: `ws://localhost:3000`
- Message formats:
  - Progress update
    ```json
    {
      "type": "progress",
      "stage": "downloading" | "installing" | "testing_model" | "model_tested" | "model_timeout" | "building_iso" | "formatting_usb" | "usb_formatted" | "writing_iso" | "completed" | "usb_write_completed",
      "message": "Free-form text mirrored from subprocess output",
      "progress": 0
    }
    ```
  - Error
    ```json
    {
      "type": "error",
      "message": "Free-form error string"
    }
    ```
- The backend emits messages when subprocess stdout contains specific keywords. `scripts/build.sh` prints the required markers ("Downloading", "Installing Ollama", "Testing model compatibility", "Model … working correctly", "Creating BootAI ISO") so the UI sees meaningful progress.

## REST Endpoints

### `GET /api/usb-drives`
Enumerates removable drives via PowerShell.

- **Response body (success):** an array of drive descriptors. Example
  ```json
  [
    {
      "deviceName": "E:",
      "volumeName": "BOOTAI",
      "size": "57 GB",
      "freeSpace": "56 GB",
      "diskNumber": 3
    }
  ]
  ```
- **Failure modes:** PowerShell errors or JSON parsing failures log to the console and the handler resolves to `[]` (no HTTP error code).
- **Notes:** The drive list is a best-effort snapshot. No validation ensures the selected device is removable or safe to overwrite.

### `GET /api/wsl-status`
Runs a series of diagnostic `wsl` commands.

- **Response body:**
  ```json
  {
    "available": false,
    "checks": [
      {
        "name": "WSL Status",
        "success": false,
        "output": "",
        "error": "Timeout"
      }
    ],
    "summary": "WSL validation error: …"
  }
  ```
  Each `check` entry corresponds to the command list in `validateWSL()`.
- **Failure modes:** If any command errors or times out, `available` is `false` and errors are captured per check. The endpoint always returns HTTP 200.

### `POST /api/build-iso`
Validates request parameters then spawns `wsl -u root bash scripts/build.sh <baseOs> <model>`.

- **Expected request body:**
  ```json
  {
    "baseOs": "ubuntu-22.04" | "ubuntu-24.04" | "debian-12",
    "model": "phi3:mini" | "phi3" | "llama3" | "llama2" | "mistral"
  }
  ```
- **Success response:**
  ```json
  {
    "success": true,
    "message": "ISO build completed successfully"
  }
  ```
  (The variant message mentions model test timeout when `code === 124`, but the current script exits with `0` on success.)
- **Validation errors:** Missing parameters or invalid values return HTTP 400 with `{ success: false, error: "…" }`.
- **Current behaviour:** `scripts/build.sh` downloads/caches the requested distro ISO, optionally pulls the Ollama model, copies the ISO to `bootai-<baseOs>-<model>.iso`, and writes a matching checksum file. Output logs include the keywords consumed by the WebSocket bridge.

### `POST /api/write-usb`
Initiates USB flashing by creating a diskpart script and invoking diskpart + `dd`.

- **Expected request body:**
  ```json
  {
    "isoPath": "ai-node.iso",
    "usbDevice": "E:",
    "diskNumber": 3 // optional optimisation; backend re-derives if omitted
  }
  ```
- **Success response:**
  ```json
  {
    "success": true,
    "message": "USB write process started for E:"
  }
  ```
  The API responds before `diskpart`/`dd` finish; results are observable through console logs / WebSocket events.
- **Validation errors:** HTTP 400 when the ISO path is not provided, does not end with `.iso`, or the drive name is not a single capital letter followed by a colon.
- **Current behaviour:** The handler derives the disk number via `Get-Partition`/`Get-Disk`, writes a temporary diskpart script, and launches diskpart followed by a WSL `dd` command. Progress events mirror key milestones (`formatting_usb`, `usb_formatted`, `writing_iso`, `usb_write_completed`). Administrator privileges are still required and no guard rails prevent the user from targeting the wrong disk.

### `GET /api/download-iso`
Streams an ISO file if one exists in the working directory.

- **Success response:** Binary stream with `Content-Type: application/octet-stream` and `Content-Disposition` derived from the on-disk file name. The server searches for `ai-node.iso`, `base.iso`, or distro/model-specific variants.
- **Failure response:** HTTP 404 with `{ success: false, error: "No ISO file found. Please build an ISO first." }`.

### `GET /api/cache-status`
Queries cache folders inside WSL and the Ollama model list.

- **Success response:**
  ```json
  {
    "success": true,
    "cache": {
      "isos": [ { "name": "…", "size": "…", "date": "…" } ],
      "models": [ { "name": "…", "size": "…", "modified": "…" } ]
    }
  }
  ```
- **Failure modes:**
  - If commands time out (>10s) the endpoint responds with `{ success: false, error: "Cache status check timeout" }`.
  - If the directories do not exist the endpoint returns `{ success: false, cache: { isos: [], models: [] } }`.

### `POST /api/clear-cache`
Clears cache directories via WSL.

- **Expected request body:** `{ "type": "isos" | "models" | "all" }`. Any other value falls into the `else` branch and is treated as `all`.
- **Success response:** `{ "success": true, "message": "…" }`, where the message is whatever the shell command prints.
- **Failure response:** `{ "success": false, "error": "…" }` when the WSL command fails or times out (>30s).

## Endpoint Status Summary

| Endpoint | Status | Notes |
| --- | --- | --- |
| `GET /api/usb-drives` | ⚠️ Returns empty array on errors; parsing failures are silently swallowed. Adds disk numbers to drive metadata. |
| `GET /api/wsl-status` | ⚠️ Works when WSL is installed; otherwise reports failures but still HTTP 200. |
| `POST /api/build-iso` | ✅ Finishes successfully when `scripts/build.sh` can download the base ISO and disk space/network are available. |
| `POST /api/write-usb` | ⚠️ Starts processes, derives disk numbers automatically, and streams additional progress, but still requires elevated privileges and manual validation. |
| `GET /api/download-iso` | ✅ Succeeds after a build; otherwise returns 404. |
| `GET /api/cache-status` | ⚠️ Depends on WSL directories and Ollama availability. |
| `POST /api/clear-cache` | ⚠️ Requires WSL + Ollama; commands may fail silently. |
| WebSocket | ✅ Receives meaningful progress markers from the build script. |

## Suggested Improvements

1. Extend `scripts/build.sh` to customize the ISO rather than copying the base image.
2. Add structured error responses for `GET /api/usb-drives` (currently indistinguishable from "no drives found").
3. Improve `/api/write-usb` safety: confirm drive removability, request confirmation in the UI, and surface diskpart/`dd` output directly to the user.
4. Provide health endpoints and/or diagnostics that confirm the external environment before allowing long-running jobs to start.
5. Document expected JSON shapes in the README once the missing features are implemented.
