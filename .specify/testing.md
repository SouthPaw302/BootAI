# BootAI Testing Specification

## Current Testing Posture

- There is **no automated test suite** in the repository. `npm test` simply prints "Tests not configured yet" as defined in `package.json`.
- There are no linting, formatting, or static-analysis steps.
- Manual smoke testing is the only available validation approach today.

## Manual Verification Checklist

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Run the development server**
   ```bash
   npm run dev
   ```
3. **Open the UI** at <http://localhost:3000> and verify that the wizard renders.
4. **Trigger API smoke checks** from a separate terminal (Windows PowerShell recommended):
   ```powershell
   curl http://localhost:3000/api/usb-drives
   curl http://localhost:3000/api/wsl-status
   curl -X POST http://localhost:3000/api/build-iso -H "Content-Type: application/json" -d '{"baseOs":"ubuntu-22.04","model":"phi3:mini"}'
   ```
   Confirm that `/api/usb-drives` includes `diskNumber` metadata for each drive. Expect the build request to succeed when WSL networking is available; verify that ISO files appear in the repository root.
5. **Observe WebSocket logs** in the server console for progress/error events when the build endpoint is triggered.
6. **Verify ISO outputs and USB write workflow**:
   ```bash
   ls -lh bootai-*.iso bootai-latest.iso ai-node.iso*
   sha256sum -c bootai-*.iso.sha256
   ```
   If testing on Windows hardware, initiate `/api/write-usb` and watch for `formatting_usb`, `usb_formatted`, `writing_iso`, and `usb_write_completed` progress events in the console.
7. **Optional:** Call `scripts/build.sh` directly to confirm it handles missing Ollama gracefully and reuses cached ISOs on subsequent runs.

## Gaps to Address

| Area | Current State | Suggested Next Step |
| --- | --- | --- |
| API regression tests | None | Add Jest + Supertest smoke tests for each REST endpoint (success + failure paths). |
| Web UI tests | None | Introduce Playwright or Cypress for the step-by-step wizard once backend endpoints are reliable. |
| Unit tests | None | Factor out validation logic from `src/main.js` and cover it with Jest. |
| Linting/formatting | None | Adopt ESLint + Prettier to enforce consistent style. |
| CI pipeline | None | Configure GitHub Actions (or equivalent) to run install + lint + tests on every push. |

## Interim Testing Guidance

- When exercising diskpart/`dd` flows, use non-production hardware and be explicit about the target disk to avoid data loss.
- Capture server logs when reporting bugs—the backend currently surfaces most failures only via console output.
- Check `scripts/build.sh` output to ensure the expected progress markers are present; the UI relies on these exact strings.

## Future Test Automation Targets

1. Mocked integration tests for the WSL/PowerShell commands (using dependency injection around `child_process.exec`).
2. Contract tests ensuring WebSocket messages follow the documented schema.
3. Performance benchmarks once ISO customization is implemented (e.g., measuring build duration and resource usage).
