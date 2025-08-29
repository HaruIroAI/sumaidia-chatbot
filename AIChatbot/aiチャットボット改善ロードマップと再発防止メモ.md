# AIチャットボット改善ロードマップと再発防止メモ

## 🎯 即座に確認すべき重要ポイント

### OpenAI API使用時の必須チェック
```javascript
// ❌ 絶対に使わない（Responses APIでは禁止）
temperature, top_p, frequency_penalty, presence_penalty, stop, seed, response_format

// ✅ 必ずサニタイズ関数を通す
const payload = sanitizeResponsesPayload({
  model: 'gpt-5-mini-2025-08-07',
  input: [...],  // Responses API形式
  max_output_tokens: 512,
  text: { format: { type: 'text' }, verbosity: 'low' },
  reasoning: { effort: 'low' }
});
```

### Netlify Functions必須設定
```toml
# netlify.toml
[functions]
  node_bundler = "esbuild"
  included_files = ["src/**", "data/**"]  # 必須：ESMファイルを含める
```

## 📋 実装チェックリスト

### 1. 新規プロジェクト開始時
- [ ] OpenAI APIの仕様を確認（Chat Completions API vs Responses API）
- [ ] Netlify環境変数を設定（OPENAI_API_KEY, OPENAI_MODEL）
- [ ] netlify.tomlにincluded_filesを設定
- [ ] package.jsonのtype設定を確認（"module"の場合は要注意）

### 2. 禁止パラメータ対策
- [ ] サニタイズ関数を実装（deepDeleteKeys + sanitizeResponsesPayload）
- [ ] 全てのOpenAI呼び出し箇所でサニタイズを適用
- [ ] クライアント側コードからも禁止パラメータを削除
- [ ] git grep でリポジトリ全体を検索して漏れがないか確認

### 3. ESMインポート対策
- [ ] LAMBDA_TASK_ROOT環境変数を使用
- [ ] pathToFileURLで確実なfile://プロトコル変換
- [ ] 相対パス（../../）を避けて固定パスを使用
- [ ] キャッシュ機能を実装（_mod ??= await loadEsm()）

### 4. デバッグ機能実装
- [ ] ?debug=1でpayload_keysを表示
- [ ] x-domain, x-backend, x-errorヘッダーを活用
- [ ] extractText()で統一的なレスポンス処理
- [ ] selftestエンドポイントを実装

## 🚫 よくある失敗パターン

### 1. "Unsupported parameter: 'temperature'" エラー
**原因**: Responses APIに非対応のパラメータを送信
**対策**: 
```javascript
// 全経路で必ずサニタイズ
if (isRaw) {
  input = body.input || [];
  // raw=1でも必ずサニタイズを適用！
}
```

### 2. "ESM import failed" エラー
**原因**: Lambda環境で相対パスが解決できない
**対策**:
```javascript
// ❌ ダメな例
await import('../../src/module.mjs');

// ✅ 正しい例
const ROOT = process.env.LAMBDA_TASK_ROOT || process.cwd();
await import(pathToFileURL(join(ROOT, 'src/module.mjs')).href);
```

### 3. selftest失敗
**原因**: 直接OpenAIを呼んで禁止パラメータが混入
**対策**: 同一オリジンの/chat?raw=1を経由

## 🔧 トラブルシューティング手順

### エラー発生時の確認順序

1. **ブラウザコンソールでテスト**
```javascript
// Step 1: raw=1が動くか確認
fetch('/.netlify/functions/chat?raw=1', {
  method:'POST', headers:{'content-type':'application/json'},
  body:JSON.stringify({
    input:[{role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
           {role:'user',content:[{type:'input_text',text:'ping'}]}],
    max_output_tokens:16
  })
}).then(r=>r.text()).then(console.log);
```

2. **デバッグモードで詳細確認**
```javascript
// Step 2: payload_keysを確認
fetch('/.netlify/functions/chat?raw=1&debug=1', {
  method:'POST', headers:{'content-type':'application/json'},
  body:JSON.stringify({...})
}).then(r=>r.json()).then(j=>console.log('keys:', j.debug?.payload_keys));
```

3. **レスポンスヘッダー確認**
- x-domain: どのルートを通ったか
- x-error: エラーの種類
- x-backend: 使用されたバックエンド

## 📈 改善ロードマップ

### Phase 1: 安定化（現在）
- [x] 禁止パラメータの完全除去
- [x] ESMインポートの安定化
- [x] selftest機能の実装
- [x] デバッグ機能の充実

### Phase 2: 機能強化（次期）
- [ ] ストリーミングレスポンス対応
- [ ] マルチモデル切り替え機能
- [ ] レート制限の実装
- [ ] エラーリトライの最適化

### Phase 3: 運用改善（将来）
- [ ] 監視ダッシュボード構築
- [ ] A/Bテスト機能
- [ ] カスタムプロンプトテンプレート
- [ ] 使用量分析とコスト最適化

## 💡 ベストプラクティス

### コード構造
```
netlify/functions/
├── chat.js          # メインハンドラー（CommonJS）
├── _extractText.js  # 共通ヘルパー
└── selftest.js      # ヘルスチェック

src/
├── intent/          # ESMモジュール
├── agent/
└── prompt/
```

### 環境変数管理
```bash
# .env.local（開発用）
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini-2025-08-07

# Netlify UI（本番用）
# Environment variables セクションで設定
```

### Git運用
```bash
# 機能ブランチ命名規則
fix/[問題の簡潔な説明]
feature/[機能名]
hotfix/[緊急修正内容]

# コミットメッセージ
fix: [何を修正したか]
feat: [何を追加したか]
docs: [何を文書化したか]
```

## 📝 定期メンテナンスチェック

### 週次
- [ ] selftestの動作確認
- [ ] エラーログの確認
- [ ] 使用量の確認

### 月次
- [ ] 依存パッケージの更新
- [ ] OpenAI APIの仕様変更確認
- [ ] パフォーマンス分析

### 四半期
- [ ] セキュリティ監査
- [ ] コスト最適化レビュー
- [ ] アーキテクチャ見直し

## 🔗 重要リンク

- [OpenAI Responses API Documentation](https://platform.openai.com/docs/api-reference/responses)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [ESM in Node.js](https://nodejs.org/api/esm.html)

---

**最終更新**: 2025-01-29
**次回レビュー予定**: 2025-02-29