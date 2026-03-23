# AGENTS.md — スマイディア プロジェクト（クローズ済み）

## ⚠️ プロジェクトステータス: CLOSED（2026-02-27）

**このプロジェクトは精算完了済みのクローズ案件。**

- 新規開発・機能追加は行わない
- 石光社長から 2026年6〜7月 に再連絡の可能性あり（再開の場合は新 ExecPlan を作成）
- 参照のみ（lessons-learned の確認・成果物の棚卸しなど）が主な用途

## 最初に必ず読むこと

1. `STATUS.md` — プロジェクト全体の状態・経緯・教訓
2. `docs/decisions/ADR-close-project.md` — クローズ判断の記録
3. `.claude/rules/lessons-learned.md` — 次回受注時の鉄則

## クローズ案件での作業ルール

- **コード変更は行わない**（保守契約なし）
- 成果物の URL・接続情報を変更しない
- 石光社長から連絡が来た場合: 新しい書面契約＋着手金入金を先行させる（lessons-learned 参照）

## 自動継続 / 夜間実行ルール

- 参照・棚卸し・再開準備の作業では、途中報告や progress update を non-blocking telemetry として扱い、ユーザー応答待ちの handoff point にしない
- 未完了の調査 / docs update / restart prep step が残っている限り stop せずに続行する
- 夜間実行 / unattended run では、最終完了時または hard blocker 発生時だけユーザーへ報告する
- hard blocker は新規契約判断、secret / auth / permission 不足、不可逆な方式分岐、競合する user edits、retry / rollback を使い切った外部障害に限る

## 成果物（参照用）

- チャットボット: https://cute-frangipane-efe657.netlify.app/（Netlify 稼働中・保守なし）
- HR評価システム: 技術的に95%完成（先方データ未提供で実データ投入のみ未完了）
- GitHub: https://github.com/HaruIroAI/sumaidia-chatbot

## 次回再開時の必須手順

1. 書面契約締結・着手金入金を先行（絶対ルール）
2. STATUS.md と ADR-close-project.md を再確認
3. HR評価システムの残タスク（実データ投入）を ExecPlan 化
4. 新しい TASK-XXXX を作成してから着手

## Claude Final Approval Handoff

- `codex-review-done` label が付いた `codex-review` Issue では `Claude Final Approval Handoff` workflow が自動起動する
- Claude Code final approval prompt は元 issue に自動投稿される
- 同じ review issue に対する handoff comment は idempotent に 1 件だけ維持される

