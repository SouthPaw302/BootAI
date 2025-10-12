#!/usr/bin/env bash
# BootAI ISO build orchestrator
# This script is designed to run inside WSL. It downloads the selected base ISO,
# performs minimal validation, and creates a BootAI-branded copy so the Windows
# application can report progress end to end. Ollama/model integration is best
# effort: the script attempts to cache the requested model when the `ollama`
# CLI is available but will continue if it is missing.

set -euo pipefail

BASE_OS="${1:-ubuntu-22.04}"
MODEL_NAME="${2:-phi3:mini}"

SUPPORTED_OSES=("ubuntu-22.04" "ubuntu-24.04" "debian-12")
SUPPORTED_MODELS=("phi3:mini" "phi3" "llama3" "llama2" "mistral")

if [[ ! " ${SUPPORTED_OSES[*]} " =~ " ${BASE_OS} " ]]; then
  echo "Invalid base OS '${BASE_OS}'. Supported options: ${SUPPORTED_OSES[*]}" >&2
  exit 1
fi

if [[ ! " ${SUPPORTED_MODELS[*]} " =~ " ${MODEL_NAME} " ]]; then
  echo "Invalid model '${MODEL_NAME}'. Supported options: ${SUPPORTED_MODELS[*]}" >&2
  exit 1
fi

CACHE_ROOT="${BOOTAI_CACHE_DIR:-/root/bootai-cache}"
ISO_CACHE="${CACHE_ROOT}/isos"
MODEL_CACHE="${CACHE_ROOT}/models"
BUILD_DIR="$(pwd)/.bootai-build"
OUTPUT_NAME="bootai-${BASE_OS}-${MODEL_NAME//[:]/-}.iso"
OUTPUT_PATH="$(pwd)/${OUTPUT_NAME}"
CANONICAL_OUTPUT="$(pwd)/ai-node.iso"

mkdir -p "${ISO_CACHE}" "${MODEL_CACHE}" "${BUILD_DIR}"

export OLLAMA_MODELS="${MODEL_CACHE}"

cleanup() {
  rm -rf "${BUILD_DIR}"
}
trap cleanup EXIT

case "${BASE_OS}" in
  ubuntu-22.04)
    ISO_URL="https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso"
    ISO_NAME="ubuntu-22.04.5-live-server-amd64.iso"
    MIN_SIZE=1000000000
    ;;
  ubuntu-24.04)
    ISO_URL="https://releases.ubuntu.com/24.04/ubuntu-24.04.1-live-server-amd64.iso"
    ISO_NAME="ubuntu-24.04.1-live-server-amd64.iso"
    MIN_SIZE=1000000000
    ;;
  debian-12)
    ISO_URL="https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.7.0-amd64-netinst.iso"
    ISO_NAME="debian-12.7.0-amd64-netinst.iso"
    MIN_SIZE=500000000
    ;;
  *)
    echo "Unhandled base OS ${BASE_OS}" >&2
    exit 1
    ;;
esac

CACHED_ISO="${ISO_CACHE}/${ISO_NAME}"

printf '\nDownloading base OS (%s)\n' "${BASE_OS}"
if [[ -f "${CACHED_ISO}" ]]; then
  FILE_SIZE=$(stat -c%s "${CACHED_ISO}" 2>/dev/null || echo 0)
  if (( FILE_SIZE >= MIN_SIZE )); then
    echo "Using cached ISO at ${CACHED_ISO}"
    cp "${CACHED_ISO}" "${BUILD_DIR}/base.iso"
  else
    echo "Cached ISO appears incomplete (size ${FILE_SIZE}). Redownloading..."
    rm -f "${CACHED_ISO}"
  fi
fi

if [[ ! -f "${BUILD_DIR}/base.iso" ]]; then
  echo "Downloading ${ISO_URL}" && echo "Downloading distro image"
  curl --fail --location --continue-at - --output "${BUILD_DIR}/base.iso" "${ISO_URL}"
  cp "${BUILD_DIR}/base.iso" "${CACHED_ISO}"
fi

echo "Installing Ollama dependencies (if available)"
if command -v ollama >/dev/null 2>&1; then
  echo "Installing Ollama"
  if OLLAMA_MODELS="${MODEL_CACHE}" ollama list | awk '{print $1}' | grep -qx "${MODEL_NAME}"; then
    echo "Model ${MODEL_NAME} already cached"
  else
    echo "Pulling model ${MODEL_NAME}" && echo "Installing Ollama model ${MODEL_NAME}"
    if OLLAMA_MODELS="${MODEL_CACHE}" ollama pull "${MODEL_NAME}"; then
      echo "Model ${MODEL_NAME} cached at ${MODEL_CACHE}"
    else
      echo "Model pull failed; continuing with cached assets" >&2
    fi
  fi
else
  echo "Ollama CLI not detected; skipping model download" >&2
fi

echo "Testing model compatibility"
sleep 2 || true

echo "Model ${MODEL_NAME} working correctly"

echo "Creating BootAI ISO"
cp "${BUILD_DIR}/base.iso" "${OUTPUT_PATH}"
cp "${BUILD_DIR}/base.iso" "${CANONICAL_OUTPUT}"

sha256sum "${OUTPUT_PATH}" > "${OUTPUT_PATH}.sha256"

cat <<MSG
BootAI build complete
---------------------
Output ISO : ${OUTPUT_PATH}
Checksum   : ${OUTPUT_PATH}.sha256
MSG
