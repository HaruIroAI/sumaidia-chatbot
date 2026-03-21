#!/usr/bin/env bash
set -euo pipefail

TOOLCHAIN_ROOT="${CODEX_TOOLCHAIN_ROOT:-$HOME/kamiko-independence}"
SHARED_SCRIPT="${TOOLCHAIN_ROOT}/.auto-dev/scripts/codex-start.sh"

if [[ -x "$SHARED_SCRIPT" && -z "${GITHUB_ACTIONS:-}" ]]; then
  exec bash "$SHARED_SCRIPT" "$@"
fi

if [[ "${1:-}" != "--review-only" ]]; then
  if [[ -x "$SHARED_SCRIPT" ]]; then
    exec bash "$SHARED_SCRIPT" "$@"
  fi
  echo "Repo-local fallback only supports --review-only" >&2
  exit 2
fi

: "${ISSUE_NUMBER:?ISSUE_NUMBER is required}"
: "${REPO:?REPO is required}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${OPENAI_API_KEY:?OPENAI_API_KEY is required}"

if ! command -v codex >/dev/null 2>&1; then
  echo "Codex CLI is required" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

issue_data="$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json title,body,labels,url)"
issue_title="$(printf '%s\n' "$issue_data" | jq -r '.title')"
issue_body="$(printf '%s\n' "$issue_data" | jq -r '.body // ""')"
issue_labels="$(printf '%s\n' "$issue_data" | jq -r '.labels[].name' 2>/dev/null | tr '\n' ',' || true)"

is_design_review=false
if [[ "$issue_labels" == *"codex-plan-review"* ]]; then
  is_design_review=true
fi

if [[ "$is_design_review" == "true" ]]; then
  review_prompt="設計文書のレビューを実施してください。

## レビュー対象
- Repository: $REPO
- Issue: #$ISSUE_NUMBER
- Title: $issue_title

## Issue内容
$issue_body

## 出力形式
- 総合判定: APPROVED / NEEDS_REVISION / MAJOR_CONCERNS
- 指摘があれば優先度ごとに列挙
- 最後に再レビュー要否を明示"
else
  review_prompt="GitHub Issue #$ISSUE_NUMBER のコード/変更レビューを実施してください。

## Issue情報
- Repository: $REPO
- Issue: #$ISSUE_NUMBER
- Title: $issue_title

## Issue内容
$issue_body

## 出力形式
- 問題を指摘する場合は file:line と再現条件を含める
- 重大な問題がなければ LGTM と残存リスクを記載
- 最後に REPORT:: status=success または REPORT:: status=needs_changes を付ける"
fi

output_file="$(mktemp)"
trap 'rm -f "$output_file"' EXIT

codex exec --full-auto -m codex-mini-latest -o "$output_file" "$review_prompt" >/tmp/codex-review.log 2>&1 || true
review_output="$(cat "$output_file" 2>/dev/null || true)"

if [[ -z "$review_output" ]]; then
  echo "Codex produced no output" >&2
  cat /tmp/codex-review.log >&2 || true
  exit 1
fi

comment_body="## 🤖 Codex Automated Review

$review_output

---
_Automated review by Codex via Auto-Dev System_"

gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "$comment_body" >/dev/null

is_lgtm=false
if printf '%s\n' "$review_output" | grep -qiE '\bLGTM\b' && \
   ! printf '%s\n' "$review_output" | grep -qiE '(not|no|isn.t|cannot|unable)\s+LGTM'; then
  is_lgtm=true
fi
if printf '%s\n' "$review_output" | grep -qE 'REPORT::\s*status=success'; then
  is_lgtm=true
fi

if [[ "$is_lgtm" == "true" ]]; then
  gh issue close "$ISSUE_NUMBER" --repo "$REPO" -c "LGTM - Automated review passed" >/dev/null || true
fi
