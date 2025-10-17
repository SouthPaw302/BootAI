#!/bin/bash
# BootAI test helper (documentation-oriented)
# Reflects the current state: there are no automated tests.

set -euo pipefail

if [ ! -f package.json ]; then
  echo "Run this script from the repository root (BootAI)." >&2
  exit 1
fi

echo "BootAI does not ship automated tests. Running 'npm test' will print the placeholder message defined in package.json."
echo
npm test || true

echo
cat <<'MSG'
Manual checks to perform next:
  1. npm run dev
  2. Open http://localhost:3000
  3. Trigger /api/usb-drives and confirm each entry exposes diskNumber metadata.
  4. Trigger /api/wsl-status and confirm the response matches your environment.
  5. Trigger /api/build-iso and confirm bootai-<base>-<model>.iso, bootai-latest.iso, and the ai-node.iso compatibility link are produced.
  6. Verify the generated SHA-256 checksum file matches the ISO (sha256sum -c bootai-*.iso.sha256).
  7. On Windows hardware, initiate /api/write-usb and watch for formatting_usb → usb_formatted → writing_iso → usb_write_completed events in the server log.
MSG
