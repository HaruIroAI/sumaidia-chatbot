# スマイディア プロジェクト（クローズ済み）

## ステータス
**クローズ（2026-02-27）** — 精算完了。石光社長から6末〜7月に再連絡の可能性あり。

## 必読ファイル（セッション開始時）
1. この CLAUDE.md
2. STATUS.md（プロジェクト全体の状態・経緯・教訓）
3. docs/decisions/ADR-close-project.md（クローズ判断の記録）

## ステークホルダー

| 名前 | 役割 | 注意事項 |
|------|------|----------|
| 石光 健太郎 | スマイディア 代表 | 連絡途絶→入金→「7月に連絡する」の経緯あり |

## 重要な注意事項

### 次回受注時の鉄則
- **書面契約＋着手金入金を必ず先行させる**（口頭合意で進めて弁護士沙汰寸前になった反省）
- 停滞には期限を切る（2週間未回答→書面催促、1ヶ月→打ち切り通知）
- 値下げ幅は工数の70%カバーを死守

### 成果物
- チャットボット: https://cute-frangipane-efe657.netlify.app/（Netlify稼働中、保守なし）
- HR評価システム: 技術的に95%完成（先方データ未提供で実データ投入のみ未完了）
- GitHub: https://github.com/HaruIroAI/sumaidia-chatbot

## 技術スタック
- チャットボット: JavaScript, Three.js, TailwindCSS, Netlify Functions
- HR評価システム: Next.js, TypeScript
- API: OpenAI Responses API
- ホスティング: Netlify

## ディレクトリ構成
- `src/` — HR評価システム ソースコード
- `netlify/functions/` — チャットボット サーバーレス関数
- `docs/` — 技術ドキュメント・ADR
- `スマイディア議事録/` — 議事録（6件）
- `スマイディア様_契約書/` — 契約書類（未締結のまま）
- `スマイディア様向け提出資料/` — 提出済み資料
- `hr-evaluation-system/` — HR評価システム
- `context/` — プロジェクト状態管理（status.json）
