# スマイディア プロジェクト（クローズ済み）

## ステータス

**クローズ（2026-02-27）** — 精算完了。石光社長から6末〜7月に再連絡の可能性あり。

## 必読ファイル

- `STATUS.md`（プロジェクト全体の状態・経緯・教訓）
- `docs/decisions/ADR-close-project.md`（クローズ判断の記録）

## ステークホルダー

| 名前 | 役割 | 注意事項 |
|------|------|----------|
| 石光 健太郎 | スマイディア 代表 | 連絡途絶→入金→「7月に連絡する」の経緯あり |

## 成果物

- チャットボット: https://cute-frangipane-efe657.netlify.app/（Netlify稼働中、保守なし）
- HR評価システム: 技術的に95%完成（先方データ未提供で実データ投入のみ未完了）
- GitHub: https://github.com/HaruIroAI/sumaidia-chatbot

## 技術スタック

- チャットボット: JavaScript, Three.js, TailwindCSS, Netlify Functions
- HR評価システム: Next.js, TypeScript / API: OpenAI Responses API

## ディレクトリ構成

- `src/` — HR評価システム ソースコード
- `netlify/functions/` — チャットボット サーバーレス関数
- `hr-evaluation-system/` — HR評価システム
- `docs/` — 技術ドキュメント・ADR

## Operating Model (Solo Kernel)

- Claude Code と Codex は固定レーンを持たず、どちらも通常の開発・検証・PR・mergeを行える
- review Issue、再帰review、handoff、read-backは通常作業の必須条件ではない
- production deploy / publish は、実行直前にHumanが対象環境とfull commit SHAを承認する。承認後は担当Agentがguarded deploy / publish、smoke check、read-backを実行し、Humanにコマンドのcopy/pasteやterminal操作を依頼しない。環境またはSHAが変われば再承認を得る
- 新規契約、secret / auth、決済、外部送信、破壊的操作はHumanが実行する
- クローズ案件であることと、再開には新しい書面契約・着手金・ExecPlanが必要という製品固有の境界は維持する

@./.claude/rules/lessons-learned.md
