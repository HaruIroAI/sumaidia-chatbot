---
name: auto-dev-implement
description: |
  GitHub Issue（SSOT）から要件を読み取り、実装してPRを作成する。
  SUMAIDIA プロジェクト向けに最適化。
  不動産コンサルタントシステム・Excel出力機能に特化。
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash(gh issue view *)
  - Bash(gh issue comment *)
  - Bash(gh pr create *)
  - Bash(git checkout *)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(git push *)
  - Bash(git status)
  - Bash(git diff *)
  - Bash(npm test *)
  - Bash(npm run *)
  - Bash(npx vitest *)
  - Bash(npx tsx *)
---

# Auto-Dev Implement Skill (SUMAIDIA)

## Purpose

GitHub Issue を SSOT（Single Source of Truth）として、SUMAIDIA プロジェクトの要件を読み取り、実装して PR を作成する。

## Project-Specific Context

### Technology Stack
- Runtime: Node.js with ESM
- Language: TypeScript (tsx)
- Testing: Vitest
- Key Library: ExcelJS (Excel出力)
- Scripts: Orchestration scripts for demo

### Quality Gates
- Tests: `npm run test` must pass
- E2E: `npm run e2e` must pass
- Demo Export: `npm run export:demo` must work

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     DUAL-LANE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│  Lane 1 (Implementation)     │    Lane 2 (Review)               │
│  ─────────────────────────   │    ─────────────────────────     │
│  Claude Code                 │    Codex CLI                     │
│  @claude /autodev-implement  │    codex-review label            │
└─────────────────────────────────────────────────────────────────┘
```

## Execution Steps

### Step 1: Read SSOT (Issue Body)

```bash
gh issue view $ISSUE_NUMBER --json title,body,labels,assignees
```

### Step 2: Project-Specific Checks

#### Excel Export Validation
```bash
# Test Excel export functionality
npm run export:demo

# Verify output file exists and is valid
ls -la output/*.xlsx
```

### Step 3: Create Branch and Implement

```bash
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | head -c 30)
git checkout -b feature/issue-$ISSUE_NUMBER-$SLUG

# Implement following SSOT requirements
# - Excel format specifications
# - Data validation rules
# - Output file naming conventions
```

### Step 4: Run Tests

```bash
# Run all tests
npm run test

# Run E2E tests
npm run e2e

# Verify demo export
npm run export:demo
```

### Step 5: Create PR

```bash
git push -u origin HEAD

gh pr create \
  --title "feat: $TITLE" \
  --body "$(cat <<'EOF'
## Summary

[Brief description from Issue SSOT]

## Changes

- [x] Change 1
- [x] Change 2

## Validation

- [ ] `npm run test` passed
- [ ] `npm run e2e` passed
- [ ] `npm run export:demo` works correctly

## Excel Output

- [ ] Format matches specification
- [ ] Data validation correct
- [ ] File naming convention followed

## Related

- Closes #$ISSUE_NUMBER

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 6: Trigger Codex Review Handoff

After PR creation, invoke `codex-review-handoff` skill.

## Error Handling

### Excel Export Errors
```
Excel出力エラーが発生しました。
1. ExcelJSの設定を確認
2. セルフォーマット・データ型を確認
3. 出力先ディレクトリの権限を確認
```

### Test Timeout
```
テストがタイムアウトしました。
1. run-with-timeout.mjs の設定を確認
2. 非同期処理の完了を確認
3. タイムアウト値を調整
```

## Security Notes

- 顧客データは出力ファイルに含めない（デモデータのみ）
- 認証情報をコードにハードコードしない
- 出力ファイルは適切に管理する
