#!/usr/bin/env bash
set -euo pipefail

TOOLCHAIN_ROOT="${CODEX_TOOLCHAIN_ROOT:-$HOME/kamiko-independence}"
SHARED_SCRIPT="${TOOLCHAIN_ROOT}/.auto-dev/scripts/codex-start.sh"

if [[ ! -x "$SHARED_SCRIPT" ]]; then
  echo "Shared codex-start.sh not found: $SHARED_SCRIPT" >&2
  exit 1
fi

exec bash "$SHARED_SCRIPT" "$@"
