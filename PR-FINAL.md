# fix: Complete sanitization and ESM import stabilization

## 目的
- raw=1/selftest の 400/500 エラーを解消
- 全経路で Responses API への禁止キー送信を防止
- ESM import を Netlify で確実に解決

## 実装内容

### 1. OpenAI ペイロードのサニタイズ強制

```javascript
const BANNED_KEYS = [
  'temperature','top_p','frequency_penalty','presence_penalty',
  'stop','seed','response_format'
];

function sanitizePayload(obj) {
  const clean = JSON.parse(JSON.stringify(obj || {}));
  for (const k of BANNED_KEYS) delete clean[k];
  if (clean.text && 'temperature' in clean.text) delete clean.text.temperature;
  if (clean.response_format) delete clean.response_format;
  return clean;
}

function toResponsesPayload({ input, max_output_tokens }) {
  const capped = Math.min(512, Number(max_output_tokens || 256));
  return sanitizePayload({
    model: process.env.OPENAI_MODEL || 'gpt-5-mini-2025-08-07',
    input,
    max_output_tokens: capped,
    text: { format: { type: 'text' }, verbosity: 'low' },
    reasoning: { effort: 'low' }
  });
}
```

全経路で統一:
```javascript
const finalInput = body?.input ?? (input || toResponsesInputFromMessages(body?.messages || []));
const payload = toResponsesPayload({ input: finalInput, max_output_tokens: body?.max_output_tokens });
// 🔒 ここより先は payload に禁止キーが無い状態
```

### 2. ESM import の安定化

```javascript
const path = require('path');
const { pathToFileURL } = require('url');

function fileUrlFromRoot(rel) {
  const base = process.env.LAMBDA_TASK_ROOT || __dirname; // Netlify: /var/task
  return pathToFileURL(path.join(base, rel)).href;
}

let _intentMod, _routerMod, _promptMod;

async function loadIntent() {
  if (!_intentMod) _intentMod = await import(fileUrlFromRoot('src/intent/intent-classifier.mjs'));
  return _intentMod;
}
// 同様に loadRouter(), loadPrompt()
```

### 3. selftest.js の最小化

- /chat?raw=1 を呼び出し
- 送信: `input` と `max_output_tokens` のみ（禁止キーなし）
- pong 完全一致で ok:true、それ以外は 500

### 4. デバッグ機能

- `?debug=1` で `payload_keys` 表示
- `x-sanitized: 1` ヘッダー
- 禁止キー除去の確認が可能

## 動作確認テスト

`deploy-preview-tests.js` をブラウザ DevTools で実行:

```javascript
// A: raw=1 → "pong"
fetch('/.netlify/functions/chat?raw=1', {
  method:'POST', headers:{'content-type':'application/json'},
  body:JSON.stringify({
    input:[
      {role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
      {role:'user',content:[{type:'input_text',text:'ping'}]}
    ],
    max_output_tokens:16
  })
}).then(r=>r.text()).then(console.log);

// B: selftest → ok:true
fetch('/.netlify/functions/selftest').then(r=>r.json()).then(console.log);

// C: 通常チャット（本文が空でない）
fetch('/.netlify/functions/chat', {
  method:'POST', headers:{'content-type':'application/json'},
  body:JSON.stringify({messages:[{role:'user',content:'名刺を100部作りたい'}]})
}).then(r=>r.text()).then(console.log);

// D: デバッグ（禁止キーが除去されていることを確認）
fetch('/.netlify/functions/chat?raw=1&debug=1', {
  method:'POST', headers:{'content-type':'application/json'},
  body:JSON.stringify({
    input:[
      {role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
      {role:'user',content:[{type:'input_text',text:'ping'}]}
    ],
    max_output_tokens:16
  })
}).then(r=>r.json()).then(j=>console.log('payload_keys', j.payload_keys));
```

## 合格条件

- ✅ Test A: "pong" が返る (200)
- ✅ Test B: {ok:true, expected:'pong', sample:'pong'} (200)
- ✅ Test C: 意味のある本文（暫定エラーなし）(200)
- ✅ Test D: payload_keys に temperature 等が含まれない

## 影響範囲

- 既存の会話ロジック・キャラクター設定には影響なし
- トランスポート層のみの修正
- UI 互換性維持（choices[0].message.content 形式）

## Deploy Preview

作成後にURLを追記