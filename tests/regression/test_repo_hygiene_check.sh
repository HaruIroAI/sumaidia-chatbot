#!/bin/bash
# tests/regression/test_repo_hygiene_check.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CHECKER="$PROJECT_ROOT/scripts/repo-hygiene-check.py"

TMP_ROOT=$(mktemp -d)
trap 'rm -rf "$TMP_ROOT"' EXIT
CONFIG_PATH="$TMP_ROOT.rules.json"

cd "$TMP_ROOT"
git init >/dev/null
git config user.name "Test User"
git config user.email "test@example.com"

mkdir -p tracked projects/external .claude/state .codex
printf 'base\n' > tracked/dev.db
git add tracked/dev.db
git commit -m "init" >/dev/null

printf 'local change\n' >> tracked/dev.db
printf 'tmp\n' > .codex/state.json
mkdir -p projects/external/.git
printf 'delegated\n' > projects/external/file.txt

cat > "$CONFIG_PATH" <<'EOF'
{
  "local_artifact_patterns": [".codex/**", ".claude/state/*.json"],
  "non_blocking_local_artifact_patterns": [".claude/state/*.json"],
  "tracked_local_artifact_patterns": ["tracked/dev.db"],
  "delegated_repo_roots": ["projects/external"],
  "repo_structure_paths": []
}
EOF

if python3 "$CHECKER" --config "$CONFIG_PATH" --require-clean-or-followup >/dev/null 2>&1; then
  echo "FAIL: checker should fail without follow-up"
  exit 1
fi

cat > .claude/state/repo-hygiene-followups.json <<'EOF'
{
  "followups": [
    {
      "path": "tracked/dev.db",
      "kind": "tracked_local_artifact",
      "owner": "dashboard-cleanup",
      "reason": "sample DB strategy pending",
      "status": "open"
    },
    {
      "path": "projects/external",
      "kind": "delegated_repo_state",
      "owner": "external-session",
      "reason": "separate repo",
      "status": "open"
    },
    {
      "path": ".codex",
      "kind": "local_artifact",
      "owner": "ignore-policy",
      "reason": "local agent state",
      "status": "open"
    }
  ]
}
EOF

python3 "$CHECKER" \
  --config "$CONFIG_PATH" \
  --write-cleanup-hints \
  --require-clean-or-followup >/dev/null

if [[ ! -f .claude/state/cleanup-hints.json ]]; then
  echo "FAIL: cleanup hints not written"
  exit 1
fi

echo "PASS: Repo hygiene check"
