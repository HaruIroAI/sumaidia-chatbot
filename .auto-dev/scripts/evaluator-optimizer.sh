#!/usr/bin/env bash
set -euo pipefail

STATE_INPUT=""
ROUND_COUNTER=0
MAX_ROUNDS="${MAX_ROUNDS:-5}"
NOTIFY_CMD="${NOTIFY_CMD:-echo 'round_limit_exceeded' >&2}"
CLAUDE_FIX_CMD="${CLAUDE_FIX_CMD:-}"
CODEX_REREVIEW_CMD="${CODEX_REREVIEW_CMD:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --state)
      STATE_INPUT="$2"
      shift 2
      ;;
    --round-counter)
      ROUND_COUNTER="$2"
      shift 2
      ;;
    --max-rounds)
      MAX_ROUNDS="$2"
      shift 2
      ;;
    --notify-cmd)
      NOTIFY_CMD="$2"
      shift 2
      ;;
    --claude-fix-cmd)
      CLAUDE_FIX_CMD="$2"
      shift 2
      ;;
    --codex-rereview-cmd)
      CODEX_REREVIEW_CMD="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

run_stub() {
  local command_string="$1"
  if [[ -z "$command_string" ]]; then
    return 0
  fi

  bash -lc "$command_string"
}

if (( ROUND_COUNTER > MAX_ROUNDS )); then
  run_stub "$NOTIFY_CMD"
  echo "escalation_notify_calls=1"
  echo "round_counter=${ROUND_COUNTER}"
  exit 0
fi

if [[ "$STATE_INPUT" == "NEEDS_CHANGES" ]]; then
  if [[ -n "$CLAUDE_FIX_CMD" ]]; then
    run_stub "$CLAUDE_FIX_CMD"
    echo "claude_fix_stub_calls=1"
  else
    echo "claude_fix_stub_calls=0"
  fi
  if [[ -n "$CODEX_REREVIEW_CMD" ]]; then
    run_stub "$CODEX_REREVIEW_CMD"
    echo "codex_rereview_stub_calls=1"
  else
    echo "codex_rereview_stub_calls=0"
  fi
  echo "round_counter_after=$((ROUND_COUNTER + 1))"
  exit 0
fi

echo "noop=1"
