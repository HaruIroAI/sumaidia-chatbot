#!/usr/bin/env bash
set -euo pipefail

COMMAND="check"
if [[ $# -gt 0 && "$1" != --* ]]; then
  COMMAND="$1"
  shift
fi

PROJECT_ROOT=""
STATE_FILE=""
RESULTS_DIR=""
ISSUE_NUMBER=""
STATE_NAME=""
REASON=""
SOURCE_NAME=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      PROJECT_ROOT="$2"
      shift 2
      ;;
    --state-file)
      STATE_FILE="$2"
      shift 2
      ;;
    --results-dir)
      RESULTS_DIR="$2"
      shift 2
      ;;
    --issue-number)
      ISSUE_NUMBER="$2"
      shift 2
      ;;
    --state)
      STATE_NAME="$2"
      shift 2
      ;;
    --reason)
      REASON="$2"
      shift 2
      ;;
    --source)
      SOURCE_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

resolve_project_root() {
  if [[ -n "$PROJECT_ROOT" ]]; then
    printf '%s\n' "$PROJECT_ROOT"
    return 0
  fi

  if git rev-parse --show-toplevel >/dev/null 2>&1; then
    git rev-parse --show-toplevel
    return 0
  fi

  pwd
}

init_paths() {
  PROJECT_ROOT="$(resolve_project_root)"
  STATE_FILE="${STATE_FILE:-$PROJECT_ROOT/.auto-dev/session/report-state.json}"
  RESULTS_DIR="${RESULTS_DIR:-$PROJECT_ROOT/.auto-dev/session/review-results}"
}

ensure_session_dir() {
  mkdir -p "$(dirname "$STATE_FILE")"
}

latest_result_file() {
  if [[ -n "$ISSUE_NUMBER" && -f "$RESULTS_DIR/issue-${ISSUE_NUMBER}.json" ]]; then
    printf '%s\n' "$RESULTS_DIR/issue-${ISSUE_NUMBER}.json"
    return 0
  fi

  local latest=""
  latest="$(ls -1t "$RESULTS_DIR"/issue-*.json 2>/dev/null | head -1 || true)"
  if [[ -n "$latest" ]]; then
    printf '%s\n' "$latest"
  fi
}

print_result() {
  local allowed="$1"
  local state="$2"
  local reason="$3"
  local source_name="$4"

  printf 'allowed=%s\n' "$allowed"
  printf 'state=%s\n' "$state"
  printf 'reason=%s\n' "$reason"
  printf 'source=%s\n' "$source_name"
}

check_from_state_file() {
  if [[ ! -f "$STATE_FILE" ]] || ! command -v jq >/dev/null 2>&1; then
    return 1
  fi

  local state allowed reason source_name
  state="$(jq -r '.state // "pending"' "$STATE_FILE" 2>/dev/null || echo "pending")"
  reason="$(jq -r '.reason // "state_file"' "$STATE_FILE" 2>/dev/null || echo "state_file")"
  source_name="$(jq -r '.source // "state_file"' "$STATE_FILE" 2>/dev/null || echo "state_file")"
  allowed="0"

  case "$state" in
    done | hard_blocker)
      allowed="1"
      ;;
    pending)
      allowed="0"
      ;;
    *)
      state="pending"
      reason="unknown_state"
      source_name="state_file"
      ;;
  esac

  print_result "$allowed" "$state" "$reason" "$source_name"
  return 0
}

check_from_review_result() {
  if ! command -v jq >/dev/null 2>&1; then
    return 1
  fi

  local result_file
  result_file="$(latest_result_file)"
  if [[ -z "$result_file" || ! -f "$result_file" ]]; then
    return 1
  fi

  if jq -e '(.report_gate_state // "") == "hard_blocker"' "$result_file" >/dev/null 2>&1; then
    print_result "1" "hard_blocker" \
      "$(jq -r '.report_gate_reason // "review_result_hard_blocker"' "$result_file")" \
      "review_result"
    return 0
  fi

  if jq -e '(.report_gate_state // "") == "done"' "$result_file" >/dev/null 2>&1; then
    print_result "1" "done" \
      "$(jq -r '.report_gate_reason // "review_result_done"' "$result_file")" \
      "review_result"
    return 0
  fi

  if jq -e '(.final_handoff_ready // false) == true' "$result_file" >/dev/null 2>&1; then
    print_result "1" "done" "review_result_final_handoff_ready" "review_result"
    return 0
  fi

  if jq -e '
    .status == "success" and
    (.close_issue // false) == true and
    (.trigger_claude_fix // false) == false and
    (.final_handoff_required // false) == false
  ' "$result_file" >/dev/null 2>&1; then
    print_result "1" "done" "review_result_success" "review_result"
    return 0
  fi

  return 1
}

cmd_check() {
  init_paths

  if check_from_state_file; then
    return 0
  fi

  if check_from_review_result; then
    return 0
  fi

  print_result "0" "pending" "awaiting_completion_gate" "default"
}

cmd_mark() {
  init_paths
  ensure_session_dir

  case "$STATE_NAME" in
    pending | done | hard_blocker)
      ;;
    *)
      echo "--state must be pending, done, or hard_blocker" >&2
      exit 1
      ;;
  esac

  if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required for mark" >&2
    exit 1
  fi

  local now tmp_file
  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  tmp_file="${STATE_FILE}.tmp"

  jq -n \
    --arg version "1.0.0" \
    --arg state "$STATE_NAME" \
    --arg reason "${REASON:-manual}" \
    --arg source "${SOURCE_NAME:-report-gate}" \
    --arg updated_at "$now" \
    '{
      version: $version,
      state: $state,
      reason: $reason,
      source: $source,
      updated_at: $updated_at
    }' > "$tmp_file"

  mv "$tmp_file" "$STATE_FILE"
  print_result "$([[ "$STATE_NAME" == "pending" ]] && echo 0 || echo 1)" "$STATE_NAME" "${REASON:-manual}" "${SOURCE_NAME:-report-gate}"
}

case "$COMMAND" in
  check)
    cmd_check
    ;;
  mark)
    cmd_mark
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    exit 1
    ;;
esac
