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
| **Invalid value: 'input_text'** (400エラー) | **`response_format`** を削除、input形式を最小化 |
| **本文が空になる** | `output_text` 優先 → `output[*].content[*].text (type==="output_text")` の順で抽出 |
| **暫定エラー: 応答テキストが取得できませんでした** (200/空文字) | フロントの変数名不一致、または output_text 抽出失敗 |
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

## Responses API要点まとめ

### ✅ 正しいパラメータ
- **`input`**: メッセージ配列（messagesではない）
- **`max_output_tokens`**: 最大出力トークン数（max_tokensではない）
- **`text: { format: { type: 'text' }, verbosity: 'low' }`**: テキスト形式指定
- **`reasoning: { effort: 'low' }`**: 推論レベル指定

### ❌ 非対応パラメータ
- `messages` → `input` を使う
- `max_tokens` → `max_output_tokens` を使う
- `response_format` → `text.format` を使う
- `temperature`, `presence_penalty`, `frequency_penalty` → 削除（一部モデルで非対応）

## 自己診断フロー

### 1. 基本診断（30秒以内）
```bash
# Step 1: selftest確認
curl https://cute-frangipane-efe657.netlify.app/.netlify/functions/selftest

# 期待値: {"ok":true,"expected":"pong","sample":"pong","model":"gpt-5-mini"}

# NGの場合はデバッグモード
curl "https://cute-frangipane-efe657.netlify.app/.netlify/functions/selftest?debug=1"
```

### 2. 詳細診断（Functions Logs）
1. Netlify Dashboard → Functions → selftest/chat → View logs
2. エラーメッセージをコピー
3. 上記のエラー対処一覧と照合

### 3. 再デプロイ（キャッシュクリア）
- Netlify Dashboard → Deploys → Deploy site → **Clear cache and deploy site**
- 約2-3分待ってから再度selftest実行

## 障害時の対応

### 5xx/429エラーの対処

#### 一時的対処
```javascript
// raw=1&strict=1モードで再試行（フォールバック無効）
fetch('/.netlify/functions/chat?raw=1&strict=1', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 'テスト' }] },
      { role: 'user', content: [{ type: 'input_text', text: 'ping' }] }
    ],
    max_output_tokens: 16
  })
});
```

#### 指数バックオフ実装例
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}
```

## extractTextの詳細

### 抽出優先順位
```javascript
// netlify/functions/_extractText.js の実装
export function extractText(data) {
  // 1. output配列から抽出（Responses API形式）
  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (item?.type === "output_text" && typeof item.text === "string") {
        return item.text;
      }
      if (Array.isArray(item?.content)) {
        for (const content of item.content) {
          if (content?.type === "output_text" && typeof content.text === "string") {
            return content.text;
          }
        }
      }
    }
  }
  
  // 2. choices形式（Chat Completions互換）
  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  
  // 3. トップレベルのoutput_text
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }
  
  // 4. text.valueがある場合
  if (data?.text?.value) {
    return data.text.value;
  }
  
  return "";
}
```

## Responses APIでの典型エラーと修正要点

### よく発生するエラーパターン

1. **パラメータエラー**
   ```json
   {"error": {"message": "Unsupported parameter: 'max_tokens'"}}
   ```
   - **原因**: Chat Completions API のパラメータを使用
   - **修正**: `max_tokens` → `max_output_tokens`

2. **型エラー**
   ```json
   {"error": {"message": "Invalid value: 'text' for content[].type"}}
   ```
   - **原因**: content の type が間違っている
   - **修正**: 入力は `type: "input_text"`、出力は `type: "output_text"`

3. **空のレスポンス**
   - **症状**: `data.output_text` が undefined
   - **原因**: 出力の抽出方法が不適切
   - **修正**: 以下の優先順位で抽出
     ```javascript
     // 1. output_text を最優先
     let text = data.output_text || "";
     // 2. output 配列から抽出
     if (!text && Array.isArray(data.output)) {
       text = data.output
         .flatMap(p => p?.content ?? [])
         .filter(c => c?.type === "output_text")
         .map(c => c.text)
         .join("");
     }
     ```

### デバッグのコツ

1. **生レスポンスの確認**
   ```bash
   curl "https://your-site.netlify.app/.netlify/functions/chat?debug=1" \
     -X POST -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"test"}]}'
   ```

2. **最小限のテスト**
   ```javascript
   // selftest エンドポイントで基本動作確認
   fetch("/.netlify/functions/selftest")
     .then(r => r.json())
     .then(console.log)
   ```

3. **ログの確認場所**
   - Netlify Dashboard → Functions → View logs
   - エラー時は完全なスタックトレースが記録される

## クイックチェックリスト

### API動作確認の手順
1. **x-modelヘッダー**: `curl -I` でx-modelが返されるか確認
2. **ステータス200**: selftest/chatエンドポイントが200を返すか
3. **pongテスト**: 単純な応答が正しく返るか
4. **通常会話**: 長い応答が途切れずに返るか

### エラー時の終了コード（scripts/selftest.mjs）
- `0`: 成功
- `1`: HTTPエラー（200以外）
- `2`: 空文字応答
- `3`: JSON解析エラー
- `4`: contentフィールドが存在しない
- `5`: その他の一般エラー

## 関連ドキュメント
- [Responses API 互換性ガイド](docs/responses-api-compat.md)
- [変更時チェックリスト](CHECKLIST.md)