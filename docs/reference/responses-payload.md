# Responses API ペイロードリファレンス

## ✅ 正しいリクエスト形式

### 基本形
```javascript
{
  "model": "gpt-5-mini",
  "input": [
    {
      "role": "system",
      "content": [
        {
          "type": "input_text",
          "text": "あなたは親切なアシスタントです。"
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "こんにちは"
        }
      ]
    }
  ],
  "max_output_tokens": 500
}
```

### テキスト形式指定（推奨）
```javascript
{
  "model": "gpt-5-mini",
  "input": [...],
  "text": {
    "format": {
      "type": "text"
    },
    "verbosity": "low"
  },
  "reasoning": {
    "effort": "low"
  },
  "max_output_tokens": 500
}
```

## ❌ よくある間違い

### 間違い1: Chat Completions形式の使用
```javascript
// ❌ 間違い
{
  "model": "gpt-5-mini",
  "messages": [  // ← messagesではなくinputを使う
    {"role": "user", "content": "Hello"}
  ],
  "max_tokens": 100  // ← max_tokensではなくmax_output_tokensを使う
}

// ✅ 正しい
{
  "model": "gpt-5-mini",
  "input": [
    {
      "role": "user",
      "content": [{"type": "input_text", "text": "Hello"}]
    }
  ],
  "max_output_tokens": 100
}
```

### 間違い2: 非対応パラメータの使用
```javascript
// ❌ 間違い
{
  "model": "gpt-5-mini",
  "input": [...],
  "temperature": 0.7,        // ← 一部モデルで非対応
  "presence_penalty": 0.5,   // ← Responses APIでは非対応
  "frequency_penalty": 0.5,  // ← Responses APIでは非対応
  "response_format": {...}   // ← text.formatを使う
}

// ✅ 正しい
{
  "model": "gpt-5-mini",
  "input": [...],
  "text": {
    "format": {"type": "text"},
    "verbosity": "low"
  }
}
```

### 間違い3: content typeの誤り
```javascript
// ❌ 間違い
{
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",  // ← "text"ではなく"input_text"
          "text": "Hello"
        }
      ]
    }
  ]
}

// ✅ 正しい
{
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",  // ← 入力は"input_text"
          "text": "Hello"
        }
      ]
    }
  ]
}
```

## レスポンス形式

### 典型的なレスポンス
```javascript
{
  "id": "resp_xxx",
  "model": "gpt-5-mini",
  "status": "completed",
  "output": [
    {
      "type": "output",
      "content": [
        {
          "type": "output_text",  // ← 出力は"output_text"
          "text": "こんにちは！お手伝いできることはありますか？"
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 10,
    "output_tokens": 15,
    "reasoning_effort_tokens": 0
  }
}
```

### 互換性のためのchoices形式レスポンス（chat.jsで生成）
```javascript
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "こんにちは！お手伝いできることはありますか？"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

## クイックリファレンス

| Chat Completions API | Responses API | 説明 |
|---------------------|---------------|------|
| `messages` | `input` | メッセージ配列 |
| `max_tokens` | `max_output_tokens` | 最大出力トークン数 |
| `response_format` | `text.format` | 出力形式指定 |
| `temperature` | 非対応 | 一部モデルでは使用不可 |
| `presence_penalty` | 非対応 | Responses APIでは使用不可 |
| type: "text" | type: "input_text" | 入力コンテンツタイプ |
| - | type: "output_text" | 出力コンテンツタイプ |