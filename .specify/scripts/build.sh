#!/bin/bash
# BootAI build helper
# Summarises the current build workflow and invokes scripts/build.sh when desired.

set -euo pipefail

if [ ! -f package.json ]; then
  echo "Run this script from the repository root (BootAI)." >&2
  exit 1
fi

cat <<'MSG'
BootAI build summary
--------------------
- The repository provides a Node.js/Express server, static UI assets, and a WSL build script at scripts/build.sh.
- The build script downloads the selected distro ISO, caches it under /root/bootai-cache/isos/, sets `OLLAMA_MODELS=/root/bootai-cache/models` before invoking Ollama, and emits bootai-<base>-<model>.iso plus canonical/legacy links.
- ISO contents are not yet customised beyond caching; future work will mount/chroot into the filesystem.
MSG

if [ "$#" -gt 0 ]; then
  echo
  echo "Running scripts/build.sh $*"
  echo "-----------------------------"
  bash scripts/build.sh "$@"
else
  cat <<'MSG'
Usage examples:
  ./specify/scripts/build.sh ubuntu-22.04 phi3:mini
  ./specify/scripts/build.sh debian-12 mistral

The script will:
  1. Ensure /root/bootai-cache/{isos,models} exist
  2. Download (or reuse cached) ISO images
  3. Attempt to cache the Ollama model when available (respecting OLLAMA_MODELS=/root/bootai-cache/models)
  4. Produce bootai-<base>-<model>.iso, bootai-latest.iso (with ai-node.iso for legacy tools), and a SHA-256 checksum

Re-run with arguments to execute the build automatically.
MSG
fi
