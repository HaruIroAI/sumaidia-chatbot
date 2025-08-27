# Sumaidia Chatbot Project Status - 2025-01-28

## 概要
OpenAI Responses API移行に伴う障害対応と恒久的な運用体制の構築を完了しました。

## 直近の作業内容

### 1. Responses API移行問題の解決
**問題**: Chat Completions API → Responses API移行時のパラメータ不一致により、本番環境でチャット機能が正常に動作しない

**原因**:
- `messages` → `input` への変更
- `max_tokens` → `max_output_tokens` への変更  
- `response_format` → `text: { format: { type: 'text' } }` への変更
- selftest.jsがOpenAI APIを直接呼び出していたため、chat.jsと処理経路が異なる

**解決策**:
1. `/chat?raw=1` モードの追加（前処理バイパス）
2. `_extractText.js` ヘルパー関数で複数の出力形式に対応
3. selftest.jsを内部プロキシ化（`/chat?raw=1`を呼び出す）
4. 厳密な判定: `text === 'pong'` のみok:true

### 2. 運用体制の構築（5つのPR作成済み）

#### PR #2: ポストモーテムとランブック
- `docs/incidents/2025-08-27-responses-api-mismatch.md`
- `docs/runbooks/chat-stack-selftest.md` （5分以内復旧フロー）

#### PR #3: トラブルシューティング更新
- `TROUBLESHOOTING.md`: Responses API要点、自己診断フロー追加
- `CHECKLIST.md`: 3テスト必須確認、障害時チェックリスト追加

#### PR #4: 自動監視
- `scripts/selftest.mjs`: 厳密な"pong"判定
- `.github/workflows/production-selftest.yml`: mainへpush時の自動テスト

#### PR #5: 参照ドキュメント
- `docs/reference/extractText.js`: 最小限のテキスト抽出実装
- `docs/reference/responses-payload.md`: APIパラメータ正誤対照表

#### PR #6: UI改善
- `index.html`: faviconリンク追加
- `docs/ui/tailwind-build.md`: 将来のビルド移行計画

## 現在のブランチ構成
```
main (現在)
├── fix/responses-api-and-frontend-var (PR #1 - マージ済み)
├── docs/postmortem-responses-api (PR #2)
├── docs/troubleshooting-checklist-refresh (PR #3)
├── ci/production-selftest (PR #4)
├── docs/reference-snippets (PR #5)
└── chore/favicon-and-tailwind-note (PR #6)
```

## 必須テストコマンド（3テスト）
```javascript
// 1) selftest（必ず {ok:true, sample:'pong'} を期待）
fetch('/.netlify/functions/selftest').then(r=>r.json()).then(console.log);

// 2) 通常モード
fetch('/.netlify/functions/chat',{method:'POST',headers:{'content-type':'application/json'},
  body: JSON.stringify({messages:[
    {role:'system',content:'「pong」と1語だけ返す'},
    {role:'user',content:'ping'}
  ]})}).then(r=>r.text()).then(console.log);

// 3) raw モード
fetch('/.netlify/functions/chat?raw=1',{method:'POST',headers:{'content-type':'application/json'},
  body: JSON.stringify({input:[
    {role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
    {role:'user',content:[{type:'input_text',text:'ping'}]}
  ],max_output_tokens: 16})}).then(r=>r.text()).then(console.log);
```

## 環境変数（Netlify）
- `OPENAI_API_KEY`: 必須
- `OPENAI_MODEL`: gpt-5-mini（デフォルト）
- Scope: All deploy contexts（重要）

## 次回の作業
1. PR #2-#6 のレビューとマージ
2. GitHub Actionsの動作確認
3. README.mdに運用手順書へのリンク追加
4. 本番環境での最終動作確認

## 重要なファイル
- `/netlify/functions/chat.js`: メインのチャット処理（raw=1対応）
- `/netlify/functions/selftest.js`: セルフテスト（内部プロキシ化）
- `/netlify/functions/_extractText.js`: テキスト抽出ヘルパー
- `docs/runbooks/chat-stack-selftest.md`: 障害時の対応手順書

## 連絡先・参照
- 本番URL: https://cute-frangipane-efe657.netlify.app
- GitHub: https://github.com/HaruIroAI/sumaidia-chatbot
- Netlify Dashboard: アクセス権限が必要

---
このファイルは2025-01-28時点のプロジェクト状態を記録したものです。
次回作業時はこのファイルを参照してください。