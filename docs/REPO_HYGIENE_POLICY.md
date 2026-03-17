# Repo Hygiene Policy

## Purpose

- local artifact と実作業差分を分離する
- 別 repo の dirty state を親 repo で勝手に処理しない
- dirty state を放置したまま review / close しない

## Categories

### Local Artifact

- `.codex/`, `.codex-alt-test/`
- `.claude/state/*.json`, `.claude/memory/session-log.md`
- `.auto-dev/current-task.json`, `.auto-dev/logs/*.json`, `.auto-dev/logs/*.jsonl`
- `.DS_Store`, `__pycache__/`, `.env.local`
- `backup-captures/`, `data/nerfstudio/`, `.wrangler/`

原則:

- commit しない
- `.gitignore` へ寄せるか、削除する

補足:

- `.claude/state/*` と `.auto-dev/current-task.json` / `.auto-dev/logs/*` は system 自身の運用状態なので non-blocking local artifact とみなす
- review / close を止めるのは、これら以外の dirty state か、follow-up 未登録の dirty state

### Tracked Local Artifact

- 例: `projects/automated-dev-system/dashboard/dev.db`

原則:

- `.gitignore` だけでは解決しない
- tracked をやめる / サンプル DB に切り替える / 差分を戻す、のいずれかを別タスクで判断する

### Delegated Repo State

- nested repo / 別プロジェクトの dirty state

原則:

- 親 repo から勝手に commit / revert しない
- follow-up を登録し、担当 repo / 担当セッションへ委譲する

### Repo Structure Issue

- gitlink / submodule / 削除済み project の残骸

原則:

- 現在の repo で正式に除去する
- `rm -rf` ではなく git 管理情報を更新する

## Operational Rules

1. SessionStart/Stop で repo hygiene を自動検知する
2. dirty state がある場合は `.claude/state/cleanup-hints.json` に記録する
3. review request 作成前に hygiene check を走らせる
4. 未解決の dirty state は、修正するか follow-up を登録するまで close しない
5. follow-up は `.claude/state/repo-hygiene-followups.json` に保持する
6. non-blocking local artifact は session continuity のため保持してよいが、git 管理対象にはしない

## Follow-up Contract

各 follow-up は最低限以下を持つ:

- `path`
- `kind`
- `owner`
- `reason`
- `status`

`status=open` の follow-up がある path は「未解決だが委譲済み」とみなす。
