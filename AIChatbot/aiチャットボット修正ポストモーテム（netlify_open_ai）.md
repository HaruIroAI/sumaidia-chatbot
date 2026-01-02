# AIチャットボット修正ポストモーテム（Netlify × OpenAI Responses API）

作成日: 2025-08-26  
対象: Netlify Functions（Node/ESM）＋ OpenAI Responses API を使った社内チャットボット

---

## 目的
今回の修正で **半日〜1日** かかったポイントを体系化し、次回以降は短時間で安定稼働まで持っていくための「決めごと」「手順」「スニペット」「チェックリスト」を一式で残す。

---

## タイムライン概要
- **症状A:** `temperature` など **未サポート・禁止キー** が payload に混入 → OpenAI 側で 400。  
- **症状B:** 通常チャットで **理由推論モード (reasoning)** が有効のまま → reasoning tokens を大量消費 → `empty_output` または `incomplete/max_output_tokens`。  
- **症状C:** ESM を **相対パス import** → Netlify Lambda 環境で `Cannot find module`／`The "path" argument must be of type string`。  
- **症状D:** `raw` / `bypass` 入力検証不足 → 空配列などで 500。  
- **症状E:** **CORS プリフライト未対応** → ブラウザからの最初のリクエストで失敗。  
- **症状F:** `debug=1` 時でも空出力で 502 を返す → **内部状態が観察できず** 調査が長引く。

---

## 今回の主な修正点（要点）
1. **禁止キーの一括サニタイズ**: `deepDeleteKeys()` / `sanitizeResponsesPayload()` を実装し、payload 組み立て後に最終除去。
2. **ESM 安定 import**: `esmUrlFromSrc()` を導入。`LAMBDA_TASK_ROOT` を使い **Lambda とローカルで分岐**、`pathToFileURL()` で **file:// 絶対URL** にして `import()`。
3. **通常チャットの reasoning 無効化**: `reasoning` は **raw の時だけ** 付与。通常チャットは削除。
4. **max_output_tokens の下限引き上げ＋1回だけ再試行**: 初回不足時は倍増（下限 >= 2048 相当）して再実行。
5. **入力ガード**: `raw`/`bypass` で **非空配列必須**。満たさない場合は 400 を返却。
6. **CORS プリフライト対応**: `OPTIONS` を即 200 返却、許可ヘッダ付与。
7. **debug の返却順序変更**: **空出力でも 200** で payload/usage を返し、観測容易化。
8. **自己診断エンドポイント**（`selftest`）: 実関数 (`chat?raw=1`) に対して **pong** を確認、`endpoint` と `status_from_chat` をログ化。

---

## つまずきポイントと対策
### 1) Responses API の禁止キー
- **つまずき**: `temperature`, `top_p`, `presence_penalty`, `frequency_penalty`, `response_format`, `logit_bias`, `seed` などを従来の Chat Completions 感覚で渡して 400。  
- **対策**: **payload 最終段階で再帰的に削除**。呼び出し元や途中で混入しても最終段で必ず消えるようにする。

### 2) reasoning tokens の暴走
- **つまずき**: 通常チャットでも `reasoning` が残り、**reasoning_tokens** が出力枠を圧迫 → `incomplete` や `empty_output`。  
- **対策**: 通常チャットは **reasoning を完全に外す**。raw のみ `reasoning: { effort: 'low' }` を許可。

### 3) ESM import のパス解決
- **つまずき**: `../../src/...` のような相対 import は、Netlify の **Lambda 展開パス (/var/task)** で崩れやすい。  
- **対策**: `LAMBDA_TASK_ROOT` 基準 + `pathToFileURL()` で **絶対 URL** を作る関数を用意し、**共通化**。

### 4) CORS とプリフライト
- **つまずき**: ブラウザから `OPTIONS` が飛び、未対応で 4xx/5xx。  
- **対策**: `OPTIONS` は早期 return（200）＋ `Access-Control-Allow-*` を付与。

### 5) デバッグが見えない
- **つまずき**: `debug=1` でも、空出力で 502 を返す順序だったため、**内部の usage/payload が観測不能**。  
- **対策**: `empty_output` チェック **より前** に debug 返却を配置。失敗時も payload_keys/usage を返す。

### 6) トークン不足の見極め
- **つまずき**: `max_output_tokens` が小さすぎると `incomplete: max_output_tokens`。  
- **対策**: 下限（例: 1024〜2048）を設け、**1回だけ倍増**して再実行。

---

## 再利用スニペット（コピペOK）
### ① 禁止キーの最終サニタイズ
```js
const FORBIDDEN_KEYS = new Set([
  'temperature','top_p','presence_penalty','frequency_penalty',
  'response_format','logit_bias','seed'
]);
function deepDeleteKeys(obj){
  if(!obj || typeof obj!== 'object') return obj;
  if(Array.isArray(obj)){ obj.forEach(deepDeleteKeys); return obj; }
  for(const k of Object.keys(obj)){
    if(FORBIDDEN_KEYS.has(k)) delete obj[k];
    else deepDeleteKeys(obj[k]);
  }
  return obj;
}
function sanitizeResponsesPayload(p){ return deepDeleteKeys(p); }
```

### ② ESM を Lambda/ローカル両対応で import
```js
const { join } = require('path');
const { pathToFileURL } = require('url');
function esmUrlFromSrc(...segmentsFromSrc){
  const isLambda = !!process.env.LAMBDA_TASK_ROOT;
  const base = isLambda ? process.env.LAMBDA_TASK_ROOT : __dirname;
  const abs  = isLambda
    ? join(base, 'src', ...segmentsFromSrc)
    : join(base, '..','..','src', ...segmentsFromSrc);
  return pathToFileURL(abs).href;
}
// 例:
// await import(esmUrlFromSrc('intent','intent-classifier.mjs'))
```

### ③ CORS プリフライト早期 return
```js
if (event.httpMethod === 'OPTIONS') {
  const headers = new Headers({
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'Content-Type, X-Session-Id, Authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS'
  });
  return { statusCode: 200, headers: Object.fromEntries(headers), body: '' };
}
```

### ④ payload の作り方（通常チャットは reasoning 無効）
```js
const MIN_TOKENS = 1024; // 案件により 768〜2048 で調整
const wanted = Number(body?.max_output_tokens);
const payload = {
  model,
  input,
  text: { format: { type: 'text' } },
  max_output_tokens: Number.isFinite(wanted) && wanted > 0
    ? Math.max(MIN_TOKENS, wanted)
    : MIN_TOKENS
};
if (isRaw) payload.reasoning = { effort: 'low' }; // raw の時だけ
sanitizeResponsesPayload(payload);
// 念のため（通常チャット）
if (!isRaw && 'reasoning' in payload) delete payload.reasoning;
```

### ⑤ 不足時の 1 回だけ再試行
```js
let text = extractText(data);
if(!text && (data?.status==='incomplete' || data?.incomplete_details?.reason==='max_output_tokens')){
  const current = payload.max_output_tokens || MIN_TOKENS;
  payload.max_output_tokens = Math.max(2048, Math.ceil(current * 2));
  sanitizeResponsesPayload(payload);
  const res2  = await fetch('https://api.openai.com/v1/responses', { /* ... */ });
  const data2 = await res2.json();
  if (res2.ok) text = extractText(data2);
}
```

### ⑥ debug は empty_output より前に返す
```js
if (debug) {
  const payload_keys = Object.keys(payload);
  return {
    statusCode: 200,
    headers: Object.fromEntries(headers),
    body: JSON.stringify({
      ok: true,
      payload: { model: payload.model, input_type: Array.isArray(payload.input)?'array':typeof payload.input, max_output_tokens: payload.max_output_tokens, payload_keys },
      openai:   { status: data?.status||'unknown', incomplete_details: data?.incomplete_details||null, usage: data?.usage||null },
      response: { text: text ?? '', domain: headers.get('x-domain') }
    })
  };
}
```

### ⑦ selftest 関数（pong 確認）
```js
// netlify/functions/selftest.js
exports.handler = async () => {
  try {
    const endpoint = (process.env.URL || '') + '/.netlify/functions/chat?raw=1';
    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'content-type':'application/json' },
      body: JSON.stringify({
        input: [
          { role:'system', content:[{ type:'input_text', text:'「pong」と1語だけ返す' }] },
          { role:'user',   content:[{ type:'input_text', text:'ping' }] }
        ],
        max_output_tokens: 256
      })
    });
    const json  = await res.json();
    const text  = json?.choices?.[0]?.message?.content ?? json?.output_text ?? '';
    return { statusCode:200, headers:{'content-type':'application/json','access-control-allow-origin':'*'}, body: JSON.stringify({ ok: text.trim()==='pong', expected:'pong', sample:text, endpoint, status_from_chat: res.status }) };
  } catch (e) {
    return { statusCode:500, headers:{'content-type':'application/json','access-control-allow-origin':'*'}, body: JSON.stringify({ ok:false, error:String(e) }) };
  }
};
```

---

## 検証手順（ブラウザコンソール用）
### A. raw 健全性
```js
fetch('/.netlify/functions/chat?raw=1',{
  method:'POST', headers:{'content-type':'application/json'},
  body: JSON.stringify({ input:[
    {role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
    {role:'user',  content:[{type:'input_text',text:'ping'}]}
  ], max_output_tokens:256 })
}).then(r=>r.text()).then(console.log);
```

### B. selftest
```js
fetch('/.netlify/functions/selftest?cb='+Date.now())
  .then(r=>r.json()).then(console.log); // => ok:true を期待
```

### C. 通常チャット（本文あり＆ヘッダ）
```js
fetch('/.netlify/functions/chat',{
  method:'POST', headers:{'content-type':'application/json'},
  body: JSON.stringify({ messages:[{role:'user',content:'名刺を100部作りたい（今日中の特急希望）'}] })
}).then(async r=>{
  console.log('x-domain:', r.headers.get('x-domain'), 'x-model:', r.headers.get('x-model'));
  console.log(await r.text());
});
```

### D. debug（サニタイズ＆usage確認）
```js
fetch('/.netlify/functions/chat?debug=1',{
  method:'POST', headers:{'content-type':'application/json'},
  body: JSON.stringify({ messages:[{role:'user',content:'名刺を100部作りたい'}] })
}).then(r=>r.json()).then(j=>{
  console.log('payload_keys:', j.payload?.payload_keys); // reasoning が無い。
  console.log('usage:', j.openai?.usage); // reasoning_tokens が小さい。
});
```

---

## 運用チェックリスト
**前提**
- [ ] `OPENAI_API_KEY` を Netlify 環境変数に設定
- [ ] `OPENAI_MODEL` は Responses API 対応モデル（例: `gpt-5-mini`）
- [ ] `netlify.toml` にて Functions のバンドラ設定済み（必要なら `included_files = ["src/**"]`）

**機能**
- [ ] `OPTIONS` で 200 が返る
- [ ] `/chat?raw=1` で pong が返る
- [ ] `/selftest` が `ok:true`
- [ ] 通常チャットで `x-domain` と本文が返る
- [ ] `debug=1` で `payload_keys` と `usage` が取れる

**コードガード**
- [ ] `sanitizeResponsesPayload()` を payload 直前で必ず実行
- [ ] 通常チャットで `reasoning` が残っていない
- [ ] `raw`/`bypass` の入力検証（空配列なら 400）

---

## よくある落とし穴（再掲）
- **禁止キー混入**（古い実装の名残）→ 最終サニタイズで防御
- **ESM 相対 import** → Lambda で崩壊 → `esmUrlFromSrc()` で絶対 URL
- **CORS プリフライト** 未対応 → ブラウザで 4xx/5xx
- **`debug` の返却順序** → 先に 200 で観測情報を返す
- **出力トークン不足** → 下限値＋再試行

---

## 次回のショートプレイブック（15分目安）
1. `.env` / Netlify 環境変数に `OPENAI_API_KEY`／`OPENAI_MODEL` をセット。
2. `chat.js` にスニペット①〜⑤を貼る（payload ビルド直後にサニタイズ）。
3. `esmUrlFromSrc()` に置換し、ESM はすべてそれで `import()`。
4. `OPTIONS` 早期 return を追加。
5. `selftest.js` を配置。
6. デプロイ後、検証 A→B→C→D の順で実行。
7. `usage` を見て reasoning_tokens が暴れていないか確認。

---

## 付録: 観測用レスポンスヘッダ（例）
- `x-domain`: ルーティングされたドメイン（例: `printing`）
- `x-backend`: `openai` / `faq` など
- `x-model`: 実行モデル
- `x-emo`: 応答末尾タグから抽出した感情ID（任意）
- `x-error`: エラー種別（`esm_import_failed` / `empty_output` など）

---

## 付録: エラー/リトライ方針
- **5xx**: `withRetry()` で指数バックオフ（最大3回）
- **OpenAI 4xx**: そのまま返却（`x-error: openai_<status>`）
- **empty_output**: 下限引き上げ・再試行後も空なら 502 とヒント返却

---

## まとめ
- 禁止キーの最終サニタイズ、ESM の絶対 URL import、reasoning のON/OFF、CORS プリフライト、debug の返却順序、トークン下限＆再試行――**この6点をテンプレ化**すれば、以降は初動〜安定稼働までを短時間で再現できる。  
- 本ドキュメントとスニペットをベースに、**新規案件でも同じ流れ**で導入すれば、設計・実装・検証が高速化できる。

