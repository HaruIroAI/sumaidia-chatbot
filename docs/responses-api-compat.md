# Responses API 互換性ガイド

## 概要
OpenAI Responses API（GPT-5 Mini）使用時の互換性と実装ガイド

## やって良いパラメータ ✅

### 必須パラメータ
- `model`: モデル名（例: `"gpt-5-mini"`）
- `input`: 構造化入力データ

### オプションパラメータ
- `max_output_tokens`: 最大出力トークン数（推奨: 300）
- `stream`: ストリーミング（デフォルト: false）

## やってはダメなパラメータ ❌

### Chat Completions API 専用（使用不可）
- `messages` → 代わりに `input` を使用
- `max_tokens` → 代わりに `max_output_tokens` を使用
- `max_completion_tokens` → 代わりに `max_output_tokens` を使用

### このモデルで非対応
- `temperature`
- `presence_penalty`
- `frequency_penalty`
- `top_p`
- `n`
- `stop`
- `logit_bias`

## 実装の型定義

### 入力の型（input）

```typescript
type ResponsesAPIInput = Array<{
  role: "system" | "user" | "assistant";
  content: Array<{
    type: "input_text";  // 注意: "text" ではなく "input_text"
    text: string;
  }>;
}>;
```

### 出力の型（response）

```typescript
type ResponsesAPIResponse = {
  id: string;
  object: "response";
  created: number;
  model: string;
  output_text?: string;  // 優先的に使用
  output?: Array<{
    index: number;
    content: Array<{
      type: "output_text";  // 注意: "text" ではなく "output_text"
      text: string;
    }>;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};
```

## 実装例

### 正しい実装 ✅

```javascript
// 構造化入力（推奨）
const input = [
  {
    role: "system",
    content: [{ type: "input_text", text: "あなたは親切なアシスタントです" }]
  },
  {
    role: "user",
    content: [{ type: "input_text", text: "こんにちは" }]
  }
];

// API リクエスト
const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: "gpt-5-mini",
    input: input,
    max_output_tokens: 300
  })
});

// 出力抽出（安全な方法）
const data = await response.json();
let text = data.output_text || "";
if (!text && Array.isArray(data.output)) {
  text = data.output
    .flatMap(p => p?.content ?? [])
    .filter(c => c?.type === "output_text")
    .map(c => c.text)
    .join("")
    .trim();
}
```

### 間違った実装 ❌

```javascript
// NG: Chat Completions API の形式
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  body: JSON.stringify({
    model: "gpt-5-mini",
    messages: [...],  // ❌ messages は使えない
    max_tokens: 300,  // ❌ max_tokens は使えない
    temperature: 0.7  // ❌ temperature は使えない
  })
});
```

## フロントエンド互換性

### Chat Completions 形式への変換

```javascript
// Responses API → Chat Completions 形式
function convertToCompatibleFormat(responsesApiData) {
  const text = extractText(responsesApiData);
  return {
    choices: [{
      message: {
        role: "assistant",
        content: text
      },
      finish_reason: "stop"
    }],
    usage: responsesApiData.usage
  };
}
```

## トラブルシューティング

### よくあるエラーパターン

1. **パラメータエラー**
   - 症状: `Unsupported parameter: 'xxx'`
   - 原因: Chat Completions API のパラメータを使用
   - 対処: このドキュメントの「やってはダメなパラメータ」を確認

2. **型エラー**
   - 症状: `Invalid value: 'text'`
   - 原因: content の type に `"text"` を使用
   - 対処: `"input_text"` または `"output_text"` を使用

3. **空の応答**
   - 症状: レスポンスが空
   - 原因: 出力の抽出方法が間違っている
   - 対処: `output_text` → `output[].content[]` の順で抽出

## ベストプラクティス

1. **最小限のパラメータ**: 必須パラメータのみ使用
2. **エラーハンドリング**: `hint` フィールドで原因を明示
3. **型の一貫性**: input_text/output_text を正確に使用
4. **フォールバック**: 複数の出力抽出方法を実装
5. **ログ記録**: エラー時は完全なレスポンスを記録