#!/usr/bin/env bash
set -euo pipefail

REPO=""
REVIEW_ISSUE=""
TARGET_ISSUE=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="$2"
      shift 2
      ;;
    --review-issue)
      REVIEW_ISSUE="$2"
      shift 2
      ;;
    --target-issue)
      TARGET_ISSUE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

: "${REPO:?--repo is required}"
: "${REVIEW_ISSUE:?--review-issue is required}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 1
fi

issue_json="$(gh issue view "$REVIEW_ISSUE" --repo "$REPO" --json number,title,body,url,state,labels,comments)"

parsed_issue_json="$(
  ISSUE_JSON="$issue_json" python3 - <<'PY'
import json
import os
import re

issue = json.loads(os.environ["ISSUE_JSON"])
title = issue.get("title") or ""
body = issue.get("body") or ""
comments = issue.get("comments") or []

def extract(pattern: str, text: str) -> str:
    match = re.search(pattern, text, re.MULTILINE)
    return match.group(1).strip() if match else ""

task_match = re.search(r"(?i)\b(task-\d+)\b", f"{title}\n{body}")
task_id = task_match.group(1).upper() if task_match else ""

feature = extract(r"^\*\*Feature\*\*:\s*(.+)$", body)
project = extract(r"^\*\*Project\*\*:\s*`([^`]+)`$", body)
body_commit = extract(r"^\*\*Commit\*\*:\s*([0-9a-f]{7,40})$", body)
body_branch = extract(r"^\*\*Branch\*\*:\s*`([^`]+)`$", body)
source_issue = ""

source_issue_match = re.search(
    r"^\*\*Source Issue\*\*:\s*(?:#(\d+)|https://github\.com/[^/]+/[^/]+/issues/(\d+))$",
    body,
    re.MULTILINE,
)
if source_issue_match:
    source_issue = source_issue_match.group(1) or source_issue_match.group(2) or ""

review_state = ""
review_comment_url = ""
test_verification_lines = []
latest_commit = ""

for comment in reversed(comments):
    comment_body = comment.get("body") or ""
    if not latest_commit:
        commit_match = re.search(r"\bcommit\s+([0-9a-f]{7,40})\b", comment_body, re.IGNORECASE)
        if commit_match:
            latest_commit = commit_match.group(1)
    if not review_state:
        state_match = re.search(r"(?im)^##\s+Review Result:\s*([A-Z_]+)", comment_body)
        if state_match:
            review_state = state_match.group(1).upper()
            review_comment_url = comment.get("url") or ""
            capture = False
            for line in comment_body.splitlines():
                if re.match(r"^###\s+Test Verification\b", line):
                    capture = True
                    continue
                if capture and re.match(r"^###\s+", line):
                    break
                if capture and line.strip():
                    test_verification_lines.append(line.rstrip())

result = {
    "body_branch": body_branch,
    "body_commit": body_commit,
    "feature": feature,
    "project": project,
    "review_comment_url": review_comment_url,
    "review_issue_title": title,
    "review_issue_url": issue.get("url") or "",
    "review_state": review_state,
    "source_issue": source_issue,
    "task_id": task_id,
    "test_verification_lines": test_verification_lines,
}

if latest_commit:
    result["latest_commit"] = latest_commit

print(json.dumps(result))
PY
)"

review_state="$(printf '%s\n' "$parsed_issue_json" | jq -r '.review_state // ""')"

if [[ "$review_state" != "LGTM" ]]; then
  echo "Latest review result is not LGTM for issue #$REVIEW_ISSUE" >&2
  exit 1
fi

task_id="$(printf '%s\n' "$parsed_issue_json" | jq -r '.task_id // ""')"
project="$(printf '%s\n' "$parsed_issue_json" | jq -r '.project // ""')"
feature="$(printf '%s\n' "$parsed_issue_json" | jq -r '.feature // ""')"
review_issue_url="$(printf '%s\n' "$parsed_issue_json" | jq -r '.review_issue_url // ""')"
review_comment_url="$(printf '%s\n' "$parsed_issue_json" | jq -r '.review_comment_url // ""')"
commit_hash="$(printf '%s\n' "$parsed_issue_json" | jq -r '.latest_commit // .body_commit // ""')"
branch_name="$(printf '%s\n' "$parsed_issue_json" | jq -r '.body_branch // ""')"

if [[ -z "$TARGET_ISSUE" ]]; then
  TARGET_ISSUE="$(printf '%s\n' "$parsed_issue_json" | jq -r '.source_issue // ""')"
fi

if [[ -z "$TARGET_ISSUE" && -n "$task_id" ]]; then
  candidates_json="$(gh issue list --repo "$REPO" --state all --search "$task_id in:title" --json number,title,state,labels,url)"
  TARGET_ISSUE="$(
    CANDIDATES_JSON="$candidates_json" REVIEW_ISSUE="$REVIEW_ISSUE" python3 - <<'PY'
import json
import os

candidates = json.loads(os.environ["CANDIDATES_JSON"])
review_issue = int(os.environ["REVIEW_ISSUE"])

def is_review_issue(issue):
    title = issue.get("title") or ""
    labels = {label.get("name") for label in issue.get("labels") or []}
    return (
        title.startswith("[Codex Review]")
        or "codex-review" in labels
        or "codex-plan-review" in labels
        or "Gate 1" in title
    )

filtered = [issue for issue in candidates if issue.get("number") != review_issue and not is_review_issue(issue)]
filtered.sort(key=lambda issue: (issue.get("state") != "OPEN", -(issue.get("number") or 0)))
print(filtered[0]["number"] if filtered else "")
PY
  )"
fi

if [[ -z "$TARGET_ISSUE" ]]; then
  TARGET_ISSUE="$REVIEW_ISSUE"
fi

if [[ -z "$branch_name" && -n "$commit_hash" && -n "$TARGET_ISSUE" ]]; then
  target_issue_json="$(gh issue view "$TARGET_ISSUE" --repo "$REPO" --json comments,body 2>/dev/null || true)"
  if [[ -n "$target_issue_json" ]]; then
    branch_name="$(
      TARGET_ISSUE_JSON="$target_issue_json" COMMIT_HASH="$commit_hash" python3 -c '
import json
import os
import re

issue = json.loads(os.environ["TARGET_ISSUE_JSON"])
commit_hash = os.environ["COMMIT_HASH"]
candidates = []

for text in [issue.get("body") or ""] + [comment.get("body") or "" for comment in issue.get("comments") or []]:
    if commit_hash not in text:
        continue
    candidates.extend(re.findall(r"Branch `([^`]+)`", text))

print(candidates[-1] if candidates else "")
'
    )"
  fi
fi

if [[ -z "$branch_name" && -n "$commit_hash" ]] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  remote_branches="$(
    git branch -r --contains "$commit_hash" 2>/dev/null \
      | sed 's/^[ *]*//' \
      | grep -v ' -> ' || true
  )"
  branch_name="$(
    REMOTE_BRANCHES="$remote_branches" TASK_ID="$task_id" FEATURE="$feature" python3 - <<'PY'
import os
import re

branches = [line.strip() for line in os.environ.get("REMOTE_BRANCHES", "").splitlines() if line.strip()]
task_id = os.environ.get("TASK_ID", "").strip().lower()
feature = os.environ.get("FEATURE", "").strip().lower()

ignored_tokens = {
    "codex",
    "feature",
    "final",
    "gate",
    "implementation",
    "implement",
    "issue",
    "project",
    "prompt",
    "review",
    "step",
    "steps",
    "task",
}

tokens = []
for token in re.findall(r"[a-z0-9]+", feature):
    if len(token) < 3 or token in ignored_tokens or token.isdigit():
        continue
    if token not in tokens:
        tokens.append(token)

def score_branch(branch: str) -> tuple[int, int, int, str]:
    name = re.sub(r"^origin/", "", branch)
    lowered = name.lower()
    score = 0
    token_hits = 0

    if lowered in {"main", "master"}:
        score -= 1000
    if lowered.startswith("chore/"):
        score -= 200
    if lowered.startswith("feat/"):
        score += 40
    if task_id and task_id in lowered:
        score += 100

    for token in tokens:
        if token in lowered:
            token_hits += 1
            score += 15

    return (score, token_hits, -len(name), name)

ranked = sorted((score_branch(branch) for branch in branches), reverse=True)
print(ranked[0][3] if ranked else "")
PY
  )"
fi

test_verification_block="$(
  printf '%s\n' "$parsed_issue_json" | jq -r '.test_verification_lines[]?' 2>/dev/null || true
)"

if [[ -z "$test_verification_block" ]]; then
  test_verification_block="- Validation details were not found in the review comment."
fi

checkout_instructions=$'git fetch origin\n'
if [[ -n "$branch_name" ]]; then
  checkout_instructions+="git checkout ${branch_name}"$'\n'
  checkout_instructions+="git pull --ff-only origin ${branch_name}"
elif [[ -n "$commit_hash" ]]; then
  checkout_instructions+="git branch -r --contains ${commit_hash}"$'\n'
  checkout_instructions+="git show --stat ${commit_hash}"
else
  checkout_instructions+="git branch -r"
fi

checkout_instructions_indented="$(printf '%s\n' "$checkout_instructions" | sed 's/^/   /')"

commit_line="- Commit: ${commit_hash:-unknown}"
branch_line="- Branch: ${branch_name:-unresolved (use commit lookup)}"
task_line=""
if [[ -n "$task_id" ]]; then
  task_line="- Task ID: ${task_id}"
fi

review_comment_line=""
if [[ -n "$review_comment_url" ]]; then
  review_comment_line="- Review result comment: ${review_comment_url}"
fi

prompt=$(
  cat <<EOF
あなたは Claude Code final approver です。確認は不要です。以下を順番に実行してください。

1. プロジェクトに移動:
   cd ~/kamiko-independence/projects/${project:-$(basename "$(pwd)")}

2. 実装 issue と Codex review issue を確認:
   gh issue view ${TARGET_ISSUE} --repo ${REPO}
   gh issue view ${REVIEW_ISSUE} --repo ${REPO}

3. 対象ブランチ/コミットを確認:
${checkout_instructions_indented}

4. 前提:
   - Codex Gate 2 review result: LGTM
   - Review issue: #${REVIEW_ISSUE}
   - Implementation issue: #${TARGET_ISSUE}
   ${commit_line}
   ${branch_line}
   ${task_line}

5. Claude に求めること:
   - 実装の最終承認
   - 必要なら軽微な追加指摘
   - 承認結果を issue #${TARGET_ISSUE} にコメント

6. 参考 validation:
$(printf '%s\n' "$test_verification_block" | sed 's/^/   /')
EOF
)

comment_body=$(
  cat <<EOF
## Claude Final Approval Handoff

Codex Gate 2 review finished with \`LGTM\`. Claude Code final approval prompt is below.

- Review issue: #${REVIEW_ISSUE}
- Implementation issue: #${TARGET_ISSUE}
${task_line}
${branch_line}
${commit_line}
${review_comment_line}
- Review issue URL: ${review_issue_url}

### Claude Code Prompt
\`\`\`text
${prompt}
\`\`\`

---
_Powered by Auto-Dev System_
EOF
)

if [[ "$DRY_RUN" == "1" ]]; then
  printf '%s\n' "$comment_body"
  exit 0
fi

existing_comments_json="$(gh issue view "$TARGET_ISSUE" --repo "$REPO" --json comments)"
already_posted="$(
  COMMENTS_JSON="$existing_comments_json" REVIEW_ISSUE="$REVIEW_ISSUE" python3 - <<'PY'
import json
import os

comments = json.loads(os.environ["COMMENTS_JSON"]).get("comments") or []
needle = f"Review issue: #{os.environ['REVIEW_ISSUE']}"

for comment in comments:
    body = comment.get("body") or ""
    if "## Claude Final Approval Handoff" in body and needle in body:
        print(comment.get("url") or "")
        break
PY
)"

if [[ -n "$already_posted" ]]; then
  echo "handoff_comment_url=${already_posted}"
  echo "target_issue=${TARGET_ISSUE}"
  echo "review_issue=${REVIEW_ISSUE}"
  echo "created=0"
  exit 0
fi

comment_url="$(gh issue comment "$TARGET_ISSUE" --repo "$REPO" --body "$comment_body")"

echo "handoff_comment_url=${comment_url}"
echo "target_issue=${TARGET_ISSUE}"
echo "review_issue=${REVIEW_ISSUE}"
echo "created=1"
