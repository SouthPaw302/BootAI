#!/bin/bash
# BootAI debug helper (documentation-oriented)
# Provides a quick snapshot of environment details without assuming Windows-only tooling.

set -euo pipefail

if [ ! -f package.json ]; then
  echo "Run this script from the repository root (BootAI)." >&2
  exit 1
fi

echo "BootAI debugging summary"
echo "-----------------------"
echo "Node version : $(node --version 2>/dev/null || echo 'node not found')"
echo "npm version  : $(npm --version 2>/dev/null || echo 'npm not found')"
echo "Pkg detected : $(npx pkg --version 2>/dev/null || echo 'pkg not installed')"

echo
if lsof -i :3000 >/dev/null 2>&1; then
  echo "Port 3000    : in use"
else
  echo "Port 3000    : available"
fi

echo
if command -v wsl >/dev/null 2>&1; then
  echo "WSL command  : available"
  wsl --status 2>/dev/null || echo "(wsl --status failed; ensure WSL is enabled)"
else
  echo "WSL command  : not found (required on Windows for ISO builds)"
fi

echo
if [ -x scripts/build.sh ]; then
  echo "Build script : scripts/build.sh present and executable"
else
  echo "Build script : missing or not executable"
fi

echo
cat <<'MSG'
Next manual steps:
  - Ensure PowerShell + diskpart are available if you plan to test USB flashing.
  - Run scripts/build.sh from WSL to verify ISO creation and caching.
  - Tail the server console when testing; most errors are only visible there today.
MSG
