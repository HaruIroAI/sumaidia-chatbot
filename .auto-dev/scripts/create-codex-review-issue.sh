#!/usr/bin/env bash
set -euo pipefail

TOOLCHAIN_ROOT="${CODEX_TOOLCHAIN_ROOT:-$HOME/kamiko-independence}"
SHARED_SCRIPT="${TOOLCHAIN_ROOT}/.auto-dev/scripts/create-codex-review-issue.sh"

if [[ ! -x "$SHARED_SCRIPT" ]]; then
  echo "Shared create-codex-review-issue.sh not found: $SHARED_SCRIPT" >&2
  exit 1
fi

REPO_SLUG="$(git remote get-url origin 2>/dev/null | sed -E 's|.*github\.com[:/]||; s|\.git$||')"
if [[ -z "$REPO_SLUG" ]]; then
  echo "Could not detect GitHub repo slug from origin" >&2
  exit 1
fi

exec bash "$SHARED_SCRIPT" --repo "$REPO_SLUG" "$@"
