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

## 自動継続 / 夜間実行

- 参照・棚卸し・再開準備の作業では、途中経過を non-blocking telemetry として扱い、ユーザー応答待ちの handoff point にしない
- 未完了の調査 / docs update / restart prep step が残っている限り stop せずに続行する
- 夜間実行 / unattended run では、最終完了時または hard blocker 発生時だけ報告する
- hard blocker は新規契約判断、secret / auth / permission 不足、不可逆な方式分岐、競合する user edits、retry / rollback を使い切った外部障害に限る

@./.claude/rules/lessons-learned.md
