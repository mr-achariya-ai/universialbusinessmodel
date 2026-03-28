#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

for file in main.js webrtc.js; do
  target="${REPO_ROOT}/${file}"
  if [[ ! -f "${target}" ]]; then
    echo "Missing file: ${target}" >&2
    exit 1
  fi

  echo "Checking ${target}"
  node --check "${target}"
done
