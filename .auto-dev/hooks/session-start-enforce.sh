#!/bin/bash
# Auto-Dev System v5.0 - Enhanced SessionStart Hook
# Injects comprehensive context for session continuity

# Note: Not using set -e to allow graceful handling of missing files

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NOTIFY_SCRIPT="$SCRIPT_DIR/../scripts/notify.sh"

LOG_DIR=".auto-dev/logs"
STATE_DIR=".claude/state"
MEMORY_DIR=".claude/memory"

mkdir -p "$LOG_DIR" "$STATE_DIR" "$MEMORY_DIR" 2>/dev/null

LOG_FILE="$LOG_DIR/session-$(date +%Y%m%d-%H%M%S).json"
SESSION_FILE="$STATE_DIR/session.json"

# ============================================
# Helper functions
# ============================================

get_json_field() {
  local file="$1"
  local field="$2"
  local default="${3:-}"

  if [ -f "$file" ] && command -v jq &>/dev/null; then
    jq -r "$field // \"$default\"" "$file" 2>/dev/null || echo "$default"
  else
    echo "$default"
  fi
}

extract_execplan_section() {
  local file="$1"
  local section="$2"
  local max_lines="${3:-10}"

  if [ -f "$file" ]; then
    sed -n "/^## $section/,/^## /p" "$file" 2>/dev/null | head -n "$max_lines" | grep -v "^## " || echo ""
  fi
}

# ============================================
# Read configuration and state
# ============================================

# Feature flag
ENFORCE=$(get_json_field ".auto-dev/config.json" ".AUTO_DEV_HOOKS_ENFORCE" "false")

# Current task
CURRENT_TASK=$(cat .auto-dev/current-task.json 2>/dev/null || echo '{}')
TASK_ID=$(echo "$CURRENT_TASK" | jq -r '.task_id // ""' 2>/dev/null || echo "")
SETUP_GATE=$(echo "$CURRENT_TASK" | jq -r '.setup_gate_passed // false' 2>/dev/null || echo "false")
EXECPLAN_PATH=$(echo "$CURRENT_TASK" | jq -r '.execplan_path // ""' 2>/dev/null || echo "")

# Find ExecPlan if not specified
if [ -z "$EXECPLAN_PATH" ] && [ -n "$TASK_ID" ]; then
  EXECPLAN_PATH=$(find plans/active -name "*${TASK_ID}*.md" 2>/dev/null | head -1 || echo "")
fi

if [ -z "$EXECPLAN_PATH" ]; then
  EXECPLAN_PATH=$(ls plans/active/*.md 2>/dev/null | head -1 || echo "")
fi

# Active plans count
ACTIVE_PLANS=$(ls plans/active/*.md 2>/dev/null | wc -l | tr -d ' ')

# Previous session state
PREV_CHANGED_FILES=""
PREV_PENDING_TESTS=""
PREV_SUMMARY=""

if [ -f "$SESSION_FILE" ] && command -v jq &>/dev/null; then
  PREV_CHANGED_FILES=$(jq -r '.changed_files[:5] | .[]?' "$SESSION_FILE" 2>/dev/null | head -5)
  PREV_PENDING_TESTS=$(jq -r '.pending_recommended_tests[:3] | .[]?' "$SESSION_FILE" 2>/dev/null | head -3)
  PREV_SUMMARY=$(jq -r '.last_session_summary // ""' "$SESSION_FILE" 2>/dev/null)
fi

# Git state
GIT_BRANCH=""
GIT_DIRTY_COUNT=0
if command -v git &>/dev/null && [ -d .git ]; then
  GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  GIT_DIRTY_COUNT=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
fi

# ============================================
# Initialize new session state
# ============================================

SESSION_ID="$(date +%Y%m%d-%H%M%S)-$$"

if command -v jq &>/dev/null; then
  cat > "$SESSION_FILE" << EOF
{
  "session_id": "$SESSION_ID",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "task_id": "$TASK_ID",
  "changed_files": [],
  "tests_run": [],
  "pending_recommended_tests": [],
  "last_session_summary": null
}
EOF
fi

# ============================================
# Log session start
# ============================================

cat > "$LOG_FILE" << EOF
{
  "event": "session_start",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "session_id": "$SESSION_ID",
  "current_task": $CURRENT_TASK,
  "active_plans_count": $ACTIVE_PLANS,
  "mode": "enforce",
  "enforce_enabled": $ENFORCE,
  "git_branch": "$GIT_BRANCH",
  "git_dirty_count": $GIT_DIRTY_COUNT
}
EOF

# ============================================
# Output context (injected into Claude)
# ============================================

echo "[AUTO-DEV CONTEXT PACK]"
echo ""

# Task status
if [ -n "$TASK_ID" ]; then
  echo "Task: $TASK_ID"
else
  echo "Task: (none active)"
fi

# Setup Gate status
if [ "$SETUP_GATE" = "true" ]; then
  echo "SetupGate: PASSED"
else
  echo "SetupGate: NOT_PASSED"
fi

# Mode
if [ "$ENFORCE" = "true" ]; then
  echo "Mode: ENFORCE"
else
  echo "Mode: OBSERVE"
fi

# ExecPlan info
if [ -n "$EXECPLAN_PATH" ] && [ -f "$EXECPLAN_PATH" ]; then
  echo "ExecPlan: $EXECPLAN_PATH"
  echo ""

  # Extract Purpose (first 3 lines)
  PURPOSE=$(extract_execplan_section "$EXECPLAN_PATH" "Purpose" 5)
  if [ -n "$PURPOSE" ]; then
    echo "Purpose:"
    echo "$PURPOSE" | sed 's/^/  /'
    echo ""
  fi

  # Extract unchecked Plan of Work items
  echo "Pending Tasks:"
  grep -E "^- \[ \]" "$EXECPLAN_PATH" 2>/dev/null | head -5 | sed 's/^/  /' || echo "  (none found)"
  echo ""

  # Extract Validation items
  VALIDATION_ITEMS=$(sed -n '/^## Validation/,/^## /p' "$EXECPLAN_PATH" 2>/dev/null | grep -E "^-" | head -5)
  if [ -n "$VALIDATION_ITEMS" ]; then
    echo "Validation:"
    echo "$VALIDATION_ITEMS" | sed 's/^/  /'
    echo ""
  fi

  if [ -f "scripts/lint-gate1-evidence.py" ]; then
    GATE1_LINT_OUTPUT=$(python3 scripts/lint-gate1-evidence.py "$EXECPLAN_PATH" 2>&1)
    GATE1_LINT_STATUS=$?
    if [ "$GATE1_LINT_STATUS" -eq 0 ]; then
      echo "Gate1LoopGuard: PASS"
    else
      echo "Gate1LoopGuard: FAIL"
      echo "$GATE1_LINT_OUTPUT" | tail -n +2 | head -3 | sed 's/^/  - /'
    fi
    echo ""
  fi
fi

# Next Actions
echo "Next Actions:"
if [ "$SETUP_GATE" != "true" ]; then
  echo "  - Fill MVG-12 Setup Gate: purpose_and_dod / nfr_sli_slo / adr>=3 / error_fallback / threat_model"
fi
if [ -n "$PREV_PENDING_TESTS" ]; then
  echo "  - Run pending tests:"
  echo "$PREV_PENDING_TESTS" | sed 's/^/    - /'
fi
if [ -n "$EXECPLAN_PATH" ]; then
  echo "  - Update ExecPlan Progress & Validation"
fi
echo ""

# Repository state
echo "Repository:"
if [ -n "$GIT_BRANCH" ]; then
  echo "  Branch: $GIT_BRANCH"
  echo "  Dirty files: $GIT_DIRTY_COUNT"
else
  echo "  (not a git repository)"
fi
echo ""

# Previous session context
if [ -n "$PREV_CHANGED_FILES" ]; then
  echo "Recent changes (last session):"
  echo "$PREV_CHANGED_FILES" | sed 's/^/  - /'
  echo ""
fi

if [ -n "$PREV_SUMMARY" ] && [ "$PREV_SUMMARY" != "null" ]; then
  echo "Last session: $PREV_SUMMARY"
  echo ""
fi

echo "========================================"

# ============================================
# Slack notification
# ============================================

if [ -x "$NOTIFY_SCRIPT" ]; then
  MODE="ENFORCE"
  [ "$ENFORCE" != "true" ] && MODE="OBSERVE"
  "$NOTIFY_SCRIPT" session_start "${TASK_ID:-None}" "$MODE" 2>/dev/null &
fi

exit 0
