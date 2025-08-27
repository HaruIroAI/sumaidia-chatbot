# TROUBLESHOOTING.md

## 目的
Responses API の互換性問題に遭遇した際の即時復旧ガイド

## 前提
- 環境変数 `OPENAI_API_KEY` 必須
- 環境変数 `OPENAI_MODEL` 推奨（デフォルト: `gpt-5-mini`）

## 典型エラーと対処

### エラー⇔対処一覧（必ず文言そのまま記載）

| エラーメッセージ | 対処法 |
|---------------|-------|
| **Unsupported parameter: 'max_tokens'** | Responses API では **`max_output_tokens`** を使う |
| **Unsupported parameter: 'max_completion_tokens'** | **`max_output_tokens`** に変更 |
| **Unknown parameter: 'presence_penalty'**（`frequency_penalty` 含む） | **削除**（Responses API 非対応） |
| **Unsupported parameter: 'temperature'** | **削除**（このモデルでは非対応） |
| **Unsupported parameter: 'messages'** | **`input`** を使う（`messages` は Chat Completions 用） |
| **Invalid value: 'text'** | 入力側の型は **`input_text`**、出力側は **`output_text`** を用いる |
| **本文が空になる** | `output_text` 優先 → `output[*].content[*].text (type==="output_text")` の順で抽出 |
| **環境変数ミス（例：OPENI_MODEL）** | 正：**`OPENAI_MODEL`**。誤綴りを削除 |
| **do not have access to model** | モデル権限/有効化を確認。暫定で gpt-4o-mini へ切替可 |

## 確認の順番

1. **Netlify** → **Site settings** → **Environment variables**
   - `OPENAI_API_KEY` が設定されているか確認
   - `OPENAI_MODEL` が正しく設定されているか確認（誤字注意）

2. **Deploys** → **Deploy site** → **Clear cache and deploy site**（クリーンビルド）

3. `/.netlify/functions/selftest` をブラウザで叩く
   - `{ "ok": true, "model": "gpt-5-mini", "sample": "pong" }` を確認

4. `/.netlify/functions/chat` に「pongテスト」を投げる
   ```javascript
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
     console.log("status:", r.status, "x-model:", r.headers.get("x-model"));
     console.log("json:", await r.json());
   });
   ```
   - ステータス 200 と `"pong"` 返答を確認

5. エラーが続く場合
   - **Functions** → **View logs** → `chat`/`selftest` のエラーメッセージを参照
   - レスポンスの `hint` フィールドを確認（原因推測のヒント）

## よくある問題と解決策

### 問題: Functions が表示されない
- **原因**: ビルド設定の問題
- **解決**: `netlify.toml` の `functions = "netlify/functions"` を確認

### 問題: 500 エラーが返る
- **原因**: API キー未設定または無効
- **解決**: 環境変数 `OPENAI_API_KEY` を確認

### 問題: モデルエラー
- **原因**: モデル名の誤り
- **解決**: `gpt-5-mini` が正しいモデル名か確認（OpenAI ダッシュボードで確認）

## デバッグ用コマンド

### ローカルテスト（Netlify CLI 使用時）
```bash
netlify dev
# 別ターミナルで
curl http://localhost:8888/.netlify/functions/selftest
```

### 本番環境テスト
```bash
curl https://cute-frangipane-efe657.netlify.app/.netlify/functions/selftest
```

## 関連ドキュメント
- [Responses API 互換性ガイド](docs/responses-api-compat.md)
- [変更時チェックリスト](CHECKLIST.md)