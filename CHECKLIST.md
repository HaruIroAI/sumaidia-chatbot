# CHECKLIST.md

## 変更時に必ず実行するセルフテスト手順

### 🔧 変更前チェック

- [ ] 変更内容を明確に理解している
- [ ] 現在の動作を確認済み（変更前の状態を記録）
- [ ] バックアップまたは git コミット済み

### 🔑 環境変数チェック

- [ ] `OPENAI_API_KEY` が設定されている
  ```bash
  # Netlify: Site settings → Environment variables
  # または Functions → Environment variables で確認
  ```

- [ ] `OPENAI_MODEL` が正しく設定されている（オプション）
  - デフォルト: `gpt-5-mini`
  - 誤字チェック（OPENI_MODEL などの typo がないか）

### 📝 コード変更チェック

- [ ] `chat.js` に非対応パラメータが混入していないか
  - ❌ `max_tokens` → ✅ `max_output_tokens`
  - ❌ `max_completion_tokens` → ✅ `max_output_tokens`
  - ❌ `temperature`（このモデルでは非対応）
  - ❌ `presence_penalty`（Responses API 非対応）
  - ❌ `frequency_penalty`（Responses API 非対応）
  - ❌ `messages` → ✅ `input`

- [ ] 型名が正しいか
  - 入力: `type: "input_text"`（"text" ではない）
  - 出力: `type: "output_text"`（"text" ではない）

### 🚀 デプロイ前チェック

- [ ] ローカルでテスト済み（可能な場合）
  ```bash
  netlify dev
  # 別ターミナルで
  curl http://localhost:8888/.netlify/functions/selftest
  ```

- [ ] git にコミット済み
  ```bash
  git add -A
  git commit -m "fix: [変更内容を簡潔に記述]"
  ```

### 🌐 デプロイ後チェック

- [ ] Netlify ビルドログでエラーがないか確認
  - Deploys → 最新のデプロイ → View deploy log

- [ ] `/selftest` で ok:true を確認
  ```javascript
  // ブラウザのコンソールで実行
  fetch("/.netlify/functions/selftest")
    .then(r => r.json())
    .then(console.log)
  // 期待値: { ok: true, model: "gpt-5-mini", sample: "pong" }
  ```

- [ ] `/chat` エンドポイントの動作確認
  ```javascript
  // ブラウザのコンソールで実行
  fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "『pong』と1語だけ返す" },
        { role: "user", content: "ping" }
      ]
    })
  }).then(async r => {
    console.log("status:", r.status);
    console.log("x-model:", r.headers.get("x-model"));
    console.log("json:", await r.json());
  });
  // 期待値: status 200, choices[0].message.content に "pong"
  ```

- [ ] Network タブで確認
  - レスポンスヘッダーの `x-model` が正しいモデル名か
  - レスポンスヘッダーの `x-backend` が `openai` か
  - エラー時は `hint` フィールドを確認

### 📊 本番動作確認

- [ ] 実際のチャットボット UI から会話をテスト
  - 基本的な挨拶が返ってくるか
  - エラーが表示されないか
  - レスポンス時間が適切か（通常 1-3 秒）

- [ ] Functions ログの確認
  - Netlify → Functions → View logs
  - エラーやワーニングがないか確認

### 📚 ドキュメント更新

- [ ] 変更内容が大きい場合は `TROUBLESHOOTING.md` を更新
- [ ] 新しいエラーパターンを発見したら記録
- [ ] 前回の Postmortem を参照（`docs/` または `TROUBLESHOOTING.md`）

### ✅ 完了基準

- [ ] すべてのテストが PASS
- [ ] エラーログなし
- [ ] ユーザー向け機能が正常動作
- [ ] ドキュメントが最新

---

## クイックコマンド集

```bash
# セルフテスト実行（本番環境）
curl https://cute-frangipane-efe657.netlify.app/.netlify/functions/selftest

# ログ確認（Netlify CLI）
netlify logs:function chat

# キャッシュクリアして再デプロイ
# Netlify UI: Deploys → Deploy site → Clear cache and deploy site

# 環境変数の確認
# Netlify UI: Site settings → Environment variables
```

## トラブル時の連絡先

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) を確認
- [Responses API 互換性ガイド](./docs/responses-api-compat.md) を参照
- Netlify サポート: https://answers.netlify.com/