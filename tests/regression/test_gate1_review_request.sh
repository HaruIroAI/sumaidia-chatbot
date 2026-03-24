#!/bin/bash
# tests/regression/test_gate1_review_request.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GENERATOR="$PROJECT_ROOT/scripts/create-gate1-review-request.sh"
EXECPLAN="$(mktemp /tmp/gate1-review-request-XXXXXX.md)"

cleanup() {
  rm -f "$EXECPLAN"
}

trap cleanup EXIT

cat > "$EXECPLAN" <<'EOF'
# TASK-9999: Regression Fixture

> **ステータス**: Gate 1 Round 8

## Discovery

| Item | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Contract review | [x] | `tests/verify-dashboard-phase1-boundary.sh` | fixture |
EOF

OUTPUT=$(cd "$PROJECT_ROOT" && EXECPLAN_PREFLIGHT_SKIP=1 AUTO_DEV_REPO_HYGIENE_SKIP=1 "$GENERATOR" "$EXECPLAN" --commit deadbee --dry-run)

if ! echo "$OUTPUT" | grep -q "\[Gate 1 Round 8\] TASK-9999"; then
  echo "FAIL: title does not include inferred round/task"
  exit 1
fi

if ! echo "$OUTPUT" | grep -q "レビュープロトコル"; then
  echo "FAIL: protocol section missing"
  exit 1
fi

if ! echo "$OUTPUT" | grep -q "verify script / smoke test"; then
  echo "FAIL: shared review contract note missing"
  exit 1
fi

echo "PASS: Gate 1 review request generator"
