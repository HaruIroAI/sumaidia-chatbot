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

## Operating Model (Solo Kernel)

- Claude Code と Codex に固定レーンはなく、どちらも実装・検証・修正・PR作成・通常mergeを行える
- review Issue、再帰的な review round、final approval handoff、read-back は通常作業の必須条件ではない
- 関連チェックが通った通常変更は、branch / commit / push / PR / merge までAIが進められる
- 過去の `.auto-dev/`、`codex-review` Issue、handoff記録、`.github/workflows-disabled/` は履歴であり、現行の実行指示ではない
- production deploy / publish は、実行直前にHumanが対象環境とfull commit SHAを承認する。承認後は担当Agentがguarded deploy / publish、smoke check、read-backを実行し、Humanにコマンドのcopy/pasteやterminal操作を依頼しない。環境またはSHAが変われば再承認を得る
- 新規契約、secret / auth、決済、外部送信、破壊的または不可逆な操作はHumanが実行する

## 成果物（参照用）

- チャットボット: https://cute-frangipane-efe657.netlify.app/（Netlify 稼働中・保守なし）
- HR評価システム: 技術的に95%完成（先方データ未提供で実データ投入のみ未完了）
- GitHub: https://github.com/HaruIroAI/sumaidia-chatbot

## 次回再開時の必須手順

1. 書面契約締結・着手金入金を先行（絶対ルール）
2. STATUS.md と ADR-close-project.md を再確認
3. HR評価システムの残タスク（実データ投入）を ExecPlan 化
4. 新しい TASK-XXXX を作成してから着手

上記の再開条件はproduction実行者の境界変更によって緩和されない。
