#!/bin/bash
# Post-Edit Hook: Run after file edits
# Can trigger linting, formatting, or other validation

set -uo pipefail

# Read input from stdin (JSON format)
INPUT=$(cat)

# Extract file path (if using jq)
if command -v jq &>/dev/null; then
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
else
    FILE_PATH=""
fi

# Skip if no file path
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Get file extension
EXT="${FILE_PATH##*.}"

# Resolve absolute path if needed
TARGET_PATH="$FILE_PATH"
if [[ ! -f "$TARGET_PATH" && -f "$PWD/$FILE_PATH" ]]; then
    TARGET_PATH="$PWD/$FILE_PATH"
fi

emit_additional_context() {
    local message="$1"
    python3 - "$message" <<'PY'
import json
import sys

message = sys.argv[1]
print(json.dumps({
    "decision": None,
    "hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": message
    }
}, ensure_ascii=False))
PY
}

# Run appropriate checks based on file type
case "$EXT" in
    ts|tsx|js|jsx)
        # TypeScript/JavaScript - could run eslint
        # npx eslint --fix "$FILE_PATH" 2>/dev/null || true
        ;;
    py)
        # Python - could run ruff/black
        # ruff check --fix "$FILE_PATH" 2>/dev/null || true
        ;;
    sh)
        # Shell - could run shellcheck
        # shellcheck "$FILE_PATH" 2>/dev/null || true
        ;;
    md)
        # Markdown - check plan files
        if [[ "$FILE_PATH" == plans/*.md ]]; then
            PROJECT=$(basename "$FILE_PATH" .md)
            # Optional: run plan lint
            # ./scripts/plan.sh lint "$PROJECT" 2>/dev/null || true
        fi

        if [[ "$TARGET_PATH" == *"/plans/active/"*.md ]] || [[ "$TARGET_PATH" == *"/plans/templates/execplan-template.md" ]]; then
            if [[ -f "$PWD/scripts/lint-gate1-evidence.py" ]]; then
                LINT_OUTPUT=$(python3 "$PWD/scripts/lint-gate1-evidence.py" "$TARGET_PATH" 2>&1) || LINT_STATUS=$?
                LINT_STATUS=${LINT_STATUS:-0}
                if [[ "$LINT_STATUS" -ne 0 ]]; then
                    emit_additional_context "Gate 1 loop guard: $LINT_OUTPUT"
                fi
            fi
        fi
        ;;
esac

# Always succeed (hooks are informational)
exit 0
