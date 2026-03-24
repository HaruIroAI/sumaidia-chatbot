#!/bin/bash
# Auto-Dev System v5.0 - Enhanced Session End Hook
# Updates experience, writes session log for continuity

set -euo pipefail

LOG_DIR=".auto-dev/logs"
EXPERIENCE_DIR=".auto-dev/experience"
STATE_DIR=".claude/state"
MEMORY_DIR=".claude/memory"
REPORT_GATE_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../scripts/report-gate.sh"

mkdir -p "$LOG_DIR" "$EXPERIENCE_DIR/stats" "$STATE_DIR" "$MEMORY_DIR" 2>/dev/null

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SESSION_FILE="$STATE_DIR/session.json"
TEST_REC_FILE="$STATE_DIR/test-recommendation.json"
SESSION_LOG="$MEMORY_DIR/session-log.md"
REPO_HYGIENE_SUMMARY=""

# ============================================
# Gather session statistics
# ============================================

# Count operations
WRITE_COUNT=0
if [ -f "$LOG_DIR/write-operations.jsonl" ]; then
  WRITE_COUNT=$(wc -l < "$LOG_DIR/write-operations.jsonl" | tr -d ' ')
fi

TOOL_COUNT=0
if [ -f "$LOG_DIR/tool-invocations.jsonl" ]; then
  TOOL_COUNT=$(wc -l < "$LOG_DIR/tool-invocations.jsonl" | tr -d ' ')
fi

# Current task
CURRENT_TASK=$(cat .auto-dev/current-task.json 2>/dev/null || echo '{}')
TASK_ID=""
if command -v jq &>/dev/null; then
  TASK_ID=$(echo "$CURRENT_TASK" | jq -r '.task_id // ""' 2>/dev/null || echo "")
fi

# Session state
SESSION_ID=""
CHANGED_FILES=""
TESTS_RUN=""
PENDING_TESTS=""
TEST_FAILURES=""

if [ -f "$SESSION_FILE" ] && command -v jq &>/dev/null; then
  SESSION_ID=$(jq -r '.session_id // ""' "$SESSION_FILE" 2>/dev/null || echo "")
  CHANGED_FILES=$(jq -r '.changed_files[:10] | .[]?' "$SESSION_FILE" 2>/dev/null | head -10)
  PENDING_TESTS=$(jq -r '.pending_recommended_tests[:5] | .[]?' "$SESSION_FILE" 2>/dev/null | head -5)
  TESTS_RUN=$(jq -r '.tests_run[:5] | .[].command?' "$SESSION_FILE" 2>/dev/null | head -5)
  TEST_FAILURES=$(jq -r '[.tests_run[] | select(.success == false)] | length' "$SESSION_FILE" 2>/dev/null || echo "0")
fi

if [ -f "scripts/repo-hygiene-check.py" ]; then
  REPO_HYGIENE_SUMMARY=$(python3 scripts/repo-hygiene-check.py --format summary --write-cleanup-hints 2>/dev/null || true)
fi

# ============================================
# Log session summary (JSONL)
# ============================================

cat >> "$LOG_DIR/session-summary.jsonl" << EOF
{"event":"session_end","timestamp":"$TIMESTAMP","session_id":"$SESSION_ID","task_id":"$TASK_ID","tool_invocations":$TOOL_COUNT,"write_operations":$WRITE_COUNT,"test_failures":$TEST_FAILURES,"mode":"enforce"}
EOF

# ============================================
# Write session log (Markdown for continuity)
# ============================================

{
  echo ""
  echo "---"
  echo ""
  echo "## Session: $SESSION_ID"
  echo ""
  echo "- **Timestamp**: $TIMESTAMP"
  echo "- **Task**: ${TASK_ID:-none}"
  echo "- **Tool invocations**: $TOOL_COUNT"
  echo "- **Write operations**: $WRITE_COUNT"
  echo ""

  if [ -n "$CHANGED_FILES" ]; then
    echo "### Changed Files"
    echo ""
    echo "$CHANGED_FILES" | while read -r f; do
      echo "- \`$f\`"
    done
    echo ""
  fi

  if [ -n "$TESTS_RUN" ]; then
    echo "### Tests Run"
    echo ""
    echo "$TESTS_RUN" | while read -r t; do
      echo "- \`$t\`"
    done
    if [ "$TEST_FAILURES" != "0" ]; then
      echo ""
      echo "**Failures**: $TEST_FAILURES"
    fi
    echo ""
  fi

  if [ -n "$PENDING_TESTS" ]; then
    echo "### Pending Tests (next session)"
    echo ""
    echo "$PENDING_TESTS" | while read -r t; do
      echo "- \`$t\`"
    done
    echo ""
  fi

  # Next actions
  echo "### Next Actions"
  echo ""
  if [ -n "$PENDING_TESTS" ]; then
    echo "- Run pending tests"
  fi
  if [ "$TEST_FAILURES" != "0" ]; then
    echo "- Fix failing tests"
  fi
  echo "- Update ExecPlan Progress"
  echo ""

  if [ -n "$REPO_HYGIENE_SUMMARY" ]; then
    echo "### Repo Hygiene"
    echo ""
    echo "$REPO_HYGIENE_SUMMARY" | sed 's/^/- /'
    echo ""
  fi

} >> "$SESSION_LOG"

# ============================================
# Update session state with summary
# ============================================

if [ -f "$SESSION_FILE" ] && command -v jq &>/dev/null; then
  SUMMARY="Session ended at $TIMESTAMP. $WRITE_COUNT writes, $TEST_FAILURES test failures."

  jq --arg s "$SUMMARY" '.last_session_summary = $s | .ended_at = (now | todate)' "$SESSION_FILE" > "$SESSION_FILE.tmp" && mv "$SESSION_FILE.tmp" "$SESSION_FILE"
fi

# ============================================
# Output session summary
# ============================================

REPORT_ALLOWED=0
if [ -x "$REPORT_GATE_SCRIPT" ]; then
  REPORT_ALLOWED=$(
    "$REPORT_GATE_SCRIPT" check | awk -F= '/^allowed=/{print $2}' | tail -1
  )
fi

if [ "${REPORT_ALLOWED:-0}" != "1" ]; then
  exit 0
fi

echo ""
echo "========================================"
echo "  Auto-Dev System v5.0 - Session End"
echo "========================================"
echo ""
echo "Session: $SESSION_ID"
echo ""
echo "Statistics:"
echo "  Tool invocations: $TOOL_COUNT"
echo "  Write operations: $WRITE_COUNT"

if [ -n "$TASK_ID" ]; then
  echo "  Active task: $TASK_ID"
fi

if [ -n "$CHANGED_FILES" ]; then
  CHANGED_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
  echo "  Files changed: $CHANGED_COUNT"
fi

if [ "$TEST_FAILURES" != "0" ]; then
  echo "  Test failures: $TEST_FAILURES"
fi

if [ -n "$REPO_HYGIENE_SUMMARY" ]; then
  echo "  $REPO_HYGIENE_SUMMARY" | head -1
fi

# ============================================
# Experience and level up
# ============================================

STATS_FILE="$EXPERIENCE_DIR/stats/level.json"
if [ -f "$STATS_FILE" ] && command -v jq &>/dev/null; then
  CURRENT_XP=$(jq -r '.experience_points // 0' "$STATS_FILE")
  NEXT_LEVEL=$(jq -r '.next_level_at // 100' "$STATS_FILE")
  CURRENT_LEVEL=$(jq -r '.current_level // 1' "$STATS_FILE")

  echo ""
  echo "Experience:"
  echo "  Level: $CURRENT_LEVEL"
  echo "  XP: $CURRENT_XP / $NEXT_LEVEL"

  # Level up check
  if [ "$CURRENT_XP" -ge "$NEXT_LEVEL" ]; then
    NEW_LEVEL=$((CURRENT_LEVEL + 1))
    NEW_NEXT=$((NEXT_LEVEL + 100))

    jq ".current_level = $NEW_LEVEL | .next_level_at = $NEW_NEXT" "$STATS_FILE" > "$STATS_FILE.tmp" && mv "$STATS_FILE.tmp" "$STATS_FILE"

    echo ""
    echo "LEVEL UP! Lv.$CURRENT_LEVEL -> Lv.$NEW_LEVEL"
  fi
fi

# ============================================
# Next session hints
# ============================================

if [ -n "$PENDING_TESTS" ]; then
  echo ""
  echo "Pending for next session:"
  echo "$PENDING_TESTS" | head -3 | sed 's/^/  - Run: /'
fi

echo ""
echo "Session log saved to: $SESSION_LOG"
echo "========================================"

exit 0
