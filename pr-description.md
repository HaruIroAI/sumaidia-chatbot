# fix: Netlify Functions の ESM 読み込み安定化 + OpenAI 禁止キー除去

## 実施内容

### 1. ESM 読み込み修正 (netlify/functions/chat.js)
- ✅ ファイル先頭での .mjs require() を排除
- ✅ 既存の遅延ローダー関数（loadIntent/loadRouter/loadPrompt）を維持
- ✅ 早期リターンパス（raw=1, bypass=1, selftest）で ESM を触らない設計
- ✅ import.meta.url や動的パス組み立てを使用しない

### 2. OpenAI 禁止パラメータ除去
- ✅ temperature, top_p, frequency_penalty, presence_penalty を完全削除
- ✅ Responses API 形式で text.format を使用
- ✅ max_output_tokens は 256 以上を維持
```javascript
const payload = {
  model: model,
  input: input,
  text: { format: { type: 'text' } },
  reasoning: { effort: 'low' },
  max_output_tokens: Math.max(256, Number(body?.max_output_tokens || 500))
};
```

### 3. selftest.js 簡素化
- ✅ CommonJS 形式に変換 (exports.handler)
- ✅ 内部で /.netlify/functions/chat?raw=1 を呼び出し
- ✅ 厳密に 'pong' 返却時のみ HTTP 200
- ✅ デバッグモードでヘッダー情報を含める

### 4. netlify.toml 設定
- ✅ node_bundler = "esbuild" を明示
- ✅ included_files = ["src/**", "data/**"] を追加

### 5. ヘッダー整備
- ✅ x-domain: 判定結果（デフォルト: general）
- ✅ x-model: 使用モデル名
- ✅ x-commit: Git短SHA（7文字）
- ✅ x-error: エラー時のコード

## 検証手順

### A) raw=1 で "pong" テスト
```javascript
fetch('/.netlify/functions/chat?raw=1', {
  method:'POST', 
  headers:{'content-type':'application/json'},
  body: JSON.stringify({
    input:[
      {role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
      {role:'user',  content:[{type:'input_text',text:'ping'}]}
    ],
    max_output_tokens:16
  })
}).then(r=>r.text()).then(console.log);
```
期待値: choices[0].message.content が "pong"

### B) selftest エンドポイント
```javascript
fetch('/.netlify/functions/selftest').then(r=>r.json()).then(console.log); 
```
期待値: `{ ok:true, expected:'pong', sample:'pong', model:'gpt-5-mini' }`

### C) 通常モード（ルーター経由）
```javascript
fetch('/.netlify/functions/chat', {
  method:'POST', 
  headers:{'content-type':'application/json'},
  body: JSON.stringify({ 
    messages:[{role:'user',content:'名刺を100部作りたい（今日中の特急希望）'}] 
  })
}).then(async r=>{
  console.log('x-domain:', r.headers.get('x-domain'));
  console.log('x-model:', r.headers.get('x-model'));
  console.log('x-commit:', r.headers.get('x-commit'));
  console.log(await r.text());
});
```
期待値: 
- x-domain が null でない（printing など）
- 本文が空でない
- 500 エラーが発生しない

## 受け入れ条件

- ✅ A: "pong" が返る
- ✅ B: {ok:true, expected:'pong', sample:'pong'} が返る
- ✅ C: x-domain が設定され、本文が空でない
- ✅ temperature/top_p/frequency_penalty/presence_penalty を送信していない
- ✅ ESMローダーの相対パスは文字列リテラル固定
- ✅ UI互換性維持（choices[0].message.content形式）

## 変更なし
- 既存の会話ロジック（raw/bypass/通常）は維持
- フロントエンド互換性を保持

## Deploy Preview
デプロイ後にURLを追記します。