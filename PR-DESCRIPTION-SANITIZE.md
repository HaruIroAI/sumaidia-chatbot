# fix: sanitize OpenAI payloads to remove all banned parameters

## 問題
- Responses API に temperature 等の禁止パラメータが送信され 400/500 エラーが発生
- raw=1 と /selftest でエラーが頻発

## 解決策

### 1. 禁止パラメータリスト定義
```javascript
const BANNED_KEYS = [
  'temperature', 'top_p', 'frequency_penalty', 'presence_penalty',
  'stop', 'seed', 'response_format'
];
```

### 2. サニタイザ関数実装
- `sanitizePayload()`: 禁止キーを完全除去
- `toResponsesPayload()`: クリーンな最小ペイロードを構築
  - max_output_tokens を 512 でキャップ
  - 許可フィールドのみ: model, input, max_output_tokens, text.format, reasoning.effort

### 3. 全経路に適用
- raw モード ✅
- bypass モード ✅  
- 通常モード ✅
- すべて `toResponsesPayload()` 経由で統一

### 4. selftest.js 修正
- 禁止パラメータを送信しない
- /chat?raw=1 を呼び出して pong 完全一致を検証

## テスト手順

ブラウザ DevTools コンソールで実行:

```javascript
// A: raw=1 → "pong"
fetch('/.netlify/functions/chat?raw=1',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({
    input:[
      {role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
      {role:'user',content:[{type:'input_text',text:'ping'}]}
    ],
    max_output_tokens:16
  })
}).then(r=>r.text()).then(console.log);
// 期待: choices[0].message.content = "pong"

// B: selftest → ok:true
fetch('/.netlify/functions/selftest').then(r=>r.json()).then(console.log);
// 期待: {ok:true, expected:'pong', sample:'pong'}

// C: 通常チャット
fetch('/.netlify/functions/chat',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({messages:[{role:'user',content:'名刺を100部作りたい'}]})
}).then(r=>r.text()).then(console.log);
// 期待: エラーメッセージではない意味のある応答
```

## 受け入れ条件

- ✅ Test A: "pong" が返る (200)
- ✅ Test B: {ok:true, expected:'pong', sample:'pong'} (200)
- ✅ Test C: 「暫定エラー」を出さず意味のある応答 (200)
- ✅ Network タブで temperature 等の禁止キーが送信されていない

## 変更ファイル
- `netlify/functions/chat.js`: サニタイザとビルダ追加
- `netlify/functions/selftest.js`: 禁止パラメータ除去

## Deploy Preview
作成後に追記

## 既存機能への影響
- なし（トランスポート層のみの修正）
- キャラクター設定・会話ロジック・表情切替は無変更