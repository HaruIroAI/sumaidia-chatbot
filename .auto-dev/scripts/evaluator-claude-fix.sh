#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${REPO:?REPO is required}"
: "${ISSUE_NUMBER:?ISSUE_NUMBER is required}"
ROUND="${ROUND_COUNTER:-1}"

PAYLOAD="{\"event_type\":\"claude-fix-requested\",\"client_payload\":{\"issue_number\":${ISSUE_NUMBER},\"issue_url\":\"https://github.com/${REPO}/issues/${ISSUE_NUMBER}\",\"round\":${ROUND}}}"

curl -sS --fail -X POST \
  "https://api.github.com/repos/${REPO}/dispatches" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  > /dev/null

echo "evaluator-claude-fix: dispatched claude-fix-requested for issue #${ISSUE_NUMBER} round ${ROUND}" >&2
