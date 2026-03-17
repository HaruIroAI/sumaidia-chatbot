#!/bin/bash
# tests/regression/test_gate1_evidence_lint.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LINT_SCRIPT="$PROJECT_ROOT/scripts/lint-gate1-evidence.py"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

BAD_PLAN="$TMP_DIR/bad.md"
GOOD_PLAN="$TMP_DIR/good.md"

cat > "$BAD_PLAN" <<'EOF'
# TASK-9999: bad

## Validation & Acceptance

**D-04** — same payload に handoff_id / correlation_id / issue_number が入っている

証拠コマンド:

```bash
grep -R 'handoff_id\|correlation_id\|issue_number' /tmp/example
```

Pass 基準: exit code 0
EOF

cat > "$GOOD_PLAN" <<'EOF'
# TASK-9999: good

## Validation & Acceptance

**D-04** — same payload に handoff_id / correlation_id / issue_number が入っている

証拠コマンド:

```bash
bash /abs/path/scripts/test-github-handoff-payload.sh
```

Pass 基準: exit code 0
EOF

python3 "$LINT_SCRIPT" "$BAD_PLAN" >/tmp/gate1-bad.log 2>&1 && BAD_EXIT=0 || BAD_EXIT=$?
python3 "$LINT_SCRIPT" "$GOOD_PLAN" >/tmp/gate1-good.log 2>&1 && GOOD_EXIT=0 || GOOD_EXIT=$?

if [[ "$BAD_EXIT" -ne 1 ]]; then
  echo "FAIL: bad plan should fail lint"
  cat /tmp/gate1-bad.log
  exit 1
fi

if [[ "$GOOD_EXIT" -ne 0 ]]; then
  echo "FAIL: good plan should pass lint"
  cat /tmp/gate1-good.log
  exit 1
fi

echo "PASS: Gate 1 evidence lint"
