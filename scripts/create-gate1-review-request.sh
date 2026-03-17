#!/bin/bash
# Create or update a Gate 1 ExecPlan review request issue.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_REPO="HaruIroAI/kamiko-independence"
REPO_ROOT="$(git -C "$PROJECT_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$PROJECT_ROOT")"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/create-gate1-review-request.sh <execplan-path> [options]

Options:
  --round N        Review round number. If omitted, infer from ExecPlan status.
  --commit HASH    Commit hash to embed. Default: git rev-parse --short HEAD
  --issue NUM      Update existing issue instead of creating a new one
  --repo OWNER/REPO
  --dry-run        Print title/body only
EOF
}

require_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    (
      cd "$(dirname "$path")"
      printf '%s/%s\n' "$PWD" "$(basename "$path")"
    )
    return 0
  fi
  if [[ -f "$PWD/$path" ]]; then
    (
      cd "$(dirname "$PWD/$path")"
      printf '%s/%s\n' "$PWD" "$(basename "$path")"
    )
    return 0
  fi
  echo "File not found: $path" >&2
  exit 1
}

infer_round() {
  local file="$1"
  local status_line
  status_line=$(grep -m1 '^> \*\*ステータス\*\*:' "$file" || true)
  if [[ "$status_line" =~ Gate[[:space:]]1[[:space:]]Round[[:space:]]([0-9]+) ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
    return 0
  fi
  printf '1\n'
}

infer_task_id() {
  local file="$1"
  local heading
  heading=$(grep -m1 '^# TASK-' "$file" || true)
  if [[ "$heading" =~ ^#\ (TASK-[0-9]+): ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
    return 0
  fi
  echo "Unable to infer task id from: $file" >&2
  exit 1
}

infer_task_title() {
  local file="$1"
  local heading
  heading=$(grep -m1 '^# TASK-' "$file" || true)
  printf '%s\n' "${heading#*: }"
}

infer_status() {
  local file="$1"
  grep -m1 '^> \*\*ステータス\*\*:' "$file" | sed 's/^> \*\*ステータス\*\*: //' || true
}

repo_relative() {
  local path="$1"
  if [[ "$path" == "$REPO_ROOT/"* ]]; then
    printf '%s\n' "${path#$REPO_ROOT/}"
    return 0
  fi
  if [[ "$path" == "$PROJECT_ROOT/"* ]]; then
    printf '%s\n' "${path#$PROJECT_ROOT/}"
    return 0
  fi
  printf '%s\n' "$path"
}

build_body() {
  local execplan_rel="$1"
  local round="$2"
  local commit_hash="$3"
  local status="$4"
  local gate1_doc_rel="$5"

  cat <<EOF
## レビュー対象

- ExecPlan: \`$execplan_rel\`
- コミット: \`$commit_hash\`
- ステータス: \`$status\`
- 変更内容: Gate 1 review contract 整合 + 収束レビュー

## レビュープロトコル（必須・順序厳守）

**Pass 1 — 広域スキャン**: ExecPlan 全体を読み、RTM と review contract の齟齬を確認する。

**Pass 2 — 深掘り**: 特に以下を確認する。

- In-Scope -> Step -> DoD -> Evidence が 1 対 1 で閉じているか
- Evidence が絶対パスで、false positive を起こしにくいか
- same payload / same branch / retry / callback / side effect を \`grep\` で証明していないか
- relation-heavy predicate が verify script / smoke test に切り替わっているか
- \`Validation & Acceptance\` / \`Decision Log\` / \`Risks & Mitigations\` が shared review contract と整合しているか

**Pass 3 — 要件照合（提出前 5 項目チェック）**:

- [ ] 全 DoD 条件に Evidence コマンドが 1 対 1 で紐付いているか
- [ ] Evidence コマンドが絶対パス、かつ false positive にならないか
- [ ] 条件に主観語が残っていないか
- [ ] 複数条件を 1 文に束ねていないか
- [ ] Scope の In-Scope 全項目が Step・DoD・Evidence に対応しているか

## 収束モード

- Round $round のレビューとして扱う
- 新しい設計論点の追加ではなく、shared review contract に照らした未充足項目だけを返す
- Round 3 以降に Evidence formulation だけが争点なら、abstract finding ではなく差し替え案か verify script / smoke test への切り替えを返す
- shared review contract に反する新基準は追加しない

## チェック観点

- [ ] relation-heavy predicate が verify script / smoke test で証明されているか
- [ ] review request と ExecPlan の前提が一致しているか
- [ ] 追加指摘が shared review contract 内に収まっているか
- [ ] Round $round でも unresolved が残る場合、実装欠陥か contract 欠陥かを切り分けているか

## 参照

- Gate 1 運用ルール: \`$gate1_doc_rel\`
- 現状ルール: \`~/.claude/rules/execplan-standards.md\`

> 注記: 今回は個別論点の拡張ではなく Gate 1 の収束レビューです。
> same payload / retry / callback / side effect は \`grep\` ではなく verify script / smoke test 前提でレビューしてください。
EOF
}

EXECPLAN_ARG="${1:-}"
if [[ -z "$EXECPLAN_ARG" ]]; then
  usage
  exit 1
fi
shift

ROUND=""
COMMIT_HASH="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
ISSUE_NUMBER=""
REPO="$DEFAULT_REPO"
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --round)
      ROUND="$2"
      shift 2
      ;;
    --commit)
      COMMIT_HASH="$2"
      shift 2
      ;;
    --issue)
      ISSUE_NUMBER="$2"
      shift 2
      ;;
    --repo)
      REPO="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

EXECPLAN_PATH=$(require_file "$EXECPLAN_ARG")
EXECPLAN_REL="$(repo_relative "$EXECPLAN_PATH")"
ROUND="${ROUND:-$(infer_round "$EXECPLAN_PATH")}"
TASK_ID=$(infer_task_id "$EXECPLAN_PATH")
TASK_TITLE=$(infer_task_title "$EXECPLAN_PATH")
STATUS=$(infer_status "$EXECPLAN_PATH")
GATE1_DOC_PATH="$PROJECT_ROOT/docs/GATE1_REVIEW_OPERATIONS.md"
GATE1_DOC_REL="$(repo_relative "$GATE1_DOC_PATH")"

ISSUE_TITLE="[Gate 1 Round $ROUND] $TASK_ID ${TASK_TITLE} ExecPlan レビュー"
ISSUE_BODY=$(build_body "$EXECPLAN_REL" "$ROUND" "$COMMIT_HASH" "$STATUS" "$GATE1_DOC_REL")

if [[ "$DRY_RUN" == "true" ]]; then
  echo "$ISSUE_TITLE"
  echo ""
  echo "$ISSUE_BODY"
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required" >&2
  exit 1
fi

TMP_BODY=$(mktemp)
trap 'rm -f "$TMP_BODY"' EXIT
printf '%s\n' "$ISSUE_BODY" > "$TMP_BODY"

if [[ -n "$ISSUE_NUMBER" ]]; then
  gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --title "$ISSUE_TITLE" --body-file "$TMP_BODY"
else
  gh issue create --repo "$REPO" --title "$ISSUE_TITLE" --body-file "$TMP_BODY" --label "codex-plan-review"
fi
