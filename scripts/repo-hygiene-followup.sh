#!/bin/bash
# Register or inspect repo hygiene follow-ups.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(git -C "$PROJECT_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$PROJECT_ROOT")"
FOLLOWUPS_FILE="$REPO_ROOT/.claude/state/repo-hygiene-followups.json"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/repo-hygiene-followup.sh status
  ./scripts/repo-hygiene-followup.sh add <path> --kind KIND --owner OWNER --reason REASON
  ./scripts/repo-hygiene-followup.sh close <path>

Examples:
  ./scripts/repo-hygiene-followup.sh add projects/haruiroai-lp --kind delegated_repo_state --owner haruiroai-lp-session --reason "別セッションで整理"
  ./scripts/repo-hygiene-followup.sh close projects/haruiroai-lp
EOF
}

ensure_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required" >&2
    exit 1
  fi
}

ensure_store() {
  mkdir -p "$(dirname "$FOLLOWUPS_FILE")"
  if [[ ! -f "$FOLLOWUPS_FILE" ]]; then
    printf '{\n  "followups": []\n}\n' > "$FOLLOWUPS_FILE"
  fi
}

show_status() {
  ensure_store
  jq '.' "$FOLLOWUPS_FILE"
}

add_followup() {
  local target_path="$1"
  shift

  local kind=""
  local owner=""
  local reason=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --kind)
        kind="$2"
        shift 2
        ;;
      --owner)
        owner="$2"
        shift 2
        ;;
      --reason)
        reason="$2"
        shift 2
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage
        exit 1
        ;;
    esac
  done

  if [[ -z "$kind" || -z "$owner" || -z "$reason" ]]; then
    echo "kind/owner/reason are required" >&2
    exit 1
  fi

  ensure_store
  local tmp
  tmp=$(mktemp)
  jq \
    --arg path "$target_path" \
    --arg kind "$kind" \
    --arg owner "$owner" \
    --arg reason "$reason" \
    --arg created_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '
      .followups =
      (
        [.followups[] | select(.path != $path)] +
        [{
          "path": $path,
          "kind": $kind,
          "owner": $owner,
          "reason": $reason,
          "status": "open",
          "created_at": $created_at
        }]
      )
    ' "$FOLLOWUPS_FILE" > "$tmp"
  mv "$tmp" "$FOLLOWUPS_FILE"
  show_status
}

close_followup() {
  local target_path="$1"
  ensure_store
  local tmp
  tmp=$(mktemp)
  jq \
    --arg path "$target_path" \
    --arg closed_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '
      .followups =
      [
        .followups[]
        | if .path == $path
          then .status = "closed" | .closed_at = $closed_at
          else .
          end
      ]
    ' "$FOLLOWUPS_FILE" > "$tmp"
  mv "$tmp" "$FOLLOWUPS_FILE"
  show_status
}

main() {
  ensure_jq
  local command="${1:-}"
  case "$command" in
    status)
      show_status
      ;;
    add)
      shift
      add_followup "${1:-}" "${@:2}"
      ;;
    close)
      shift
      close_followup "${1:-}"
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
