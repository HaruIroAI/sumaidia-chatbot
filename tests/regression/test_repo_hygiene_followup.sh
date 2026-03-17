#!/bin/bash
# tests/regression/test_repo_hygiene_followup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FOLLOWUP_SCRIPT="$PROJECT_ROOT/scripts/repo-hygiene-followup.sh"

TMP_ROOT=$(mktemp -d)
trap 'rm -rf "$TMP_ROOT"' EXIT

mkdir -p "$TMP_ROOT/parent/subproject/scripts"
cp "$FOLLOWUP_SCRIPT" "$TMP_ROOT/parent/subproject/scripts/repo-hygiene-followup.sh"
chmod +x "$TMP_ROOT/parent/subproject/scripts/repo-hygiene-followup.sh"

cd "$TMP_ROOT/parent"
git init >/dev/null
git config user.name "Test User"
git config user.email "test@example.com"

mkdir -p .claude/state

cd "$TMP_ROOT/parent/subproject"
./scripts/repo-hygiene-followup.sh add foo/bar --kind delegated_repo_state --owner test-owner --reason "nested project follow-up" >/dev/null

FOLLOWUPS_FILE="$TMP_ROOT/parent/.claude/state/repo-hygiene-followups.json"
if [[ ! -f "$FOLLOWUPS_FILE" ]]; then
  echo "FAIL: follow-up file was not created at repo root"
  exit 1
fi

if ! grep -q '"path": "foo/bar"' "$FOLLOWUPS_FILE"; then
  echo "FAIL: follow-up path not recorded"
  exit 1
fi

echo "PASS: Repo hygiene follow-up"
