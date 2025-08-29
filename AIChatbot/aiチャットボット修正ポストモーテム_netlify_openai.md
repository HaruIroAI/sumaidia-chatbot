# AIチャットボット修正ポストモーテム（Netlify + OpenAI）

## 概要
Sumaidiaチャットボットの実装において、OpenAI Responses APIへの移行とNetlify Functionsでの動作に関する問題を解決した際の記録。

## 主要な問題と解決策

### 1. OpenAI Responses API の禁止パラメータ問題

#### 問題
- OpenAI Responses API では `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`, `stop`, `seed`, `response_format` などのパラメータが非対応
- これらのパラメータを送信すると400エラー（"Unsupported parameter"）が発生

#### 解決策
```javascript
// 禁止パラメータを再帰的に削除する関数
function deepDeleteKeys(obj, keys = []) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const k of Object.keys(obj)) {
    if (keys.includes(k)) {
      delete obj[k];
    } else {
      deepDeleteKeys(obj[k], keys);
    }
  }
  return obj;
}

// サニタイズ関数で全経路を統一
function sanitizeResponsesPayload(payload) {
  const BAN = [
    'temperature', 'top_p', 'frequency_penalty', 
    'presence_penalty', 'stop', 'seed', 'response_format'
  ];
  return deepDeleteKeys(structuredClone(payload), BAN);
}
```

#### 教訓
- **全ての経路で必ずサニタイズを適用** - raw=1, bypass=1, 通常ルート全てで統一
- **クライアント側コードも忘れずに修正** - index.html, enhanced-chat-function.js など
- **ネストされたオブジェクトも考慮** - text.temperature なども削除

### 2. ESM モジュールのインポートエラー

#### 問題
- Netlify Functions（AWS Lambda環境）でESMモジュールのインポートが失敗
- 相対パス（`../../src/...`）が解決できない
- `path is undefined` エラーが頻発

#### 解決策
```javascript
const path = require('path');
const { join } = path;
const { pathToFileURL } = require('url');

// Lambda環境のルートパスを使用
const ROOT = process.env.LAMBDA_TASK_ROOT || process.cwd();

async function loadEsm(relFromRoot) {
  const full = join(ROOT, relFromRoot);
  return import(pathToFileURL(full).href);
}

// キャッシュ付きローダー
let _intentMod, _routerMod, _promptMod;
async function loadIntent() { 
  return _intentMod ??= await loadEsm('src/intent/intent-classifier.mjs'); 
}
```

#### 教訓
- **LAMBDA_TASK_ROOT を活用** - Netlify環境では `/var/task` が配置ルート
- **pathToFileURL を使用** - file:// プロトコルで確実にインポート
- **相対パスを避ける** - リポジトリ構造を前提とした固定パスを使用
- **遅延ロード＋キャッシュ** - 必要時のみロード、一度ロードしたら再利用

### 3. netlify.toml の設定

#### 問題
- ESMファイルやデータファイルがバンドルに含まれない

#### 解決策
```toml
[functions]
  node_bundler = "esbuild"
  included_files = ["src/**", "data/**"]
```

#### 教訓
- **included_files を明示的に指定** - 必要なファイルを確実にバンドルに含める
- **esbuild を使用** - ESM対応のバンドラーを選択

### 4. selftest の実装

#### 問題
- selftest が直接OpenAIを呼ぶと禁止パラメータ問題が再発
- エラー時のデバッグが困難

#### 解決策
```javascript
// 同一オリジンの /chat?raw=1 を経由
const res = await fetch(`${origin}/.netlify/functions/chat?raw=1${debugParam}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    input: [
      { role:'system', content:[{ type:'input_text', text:'「pong」と1語だけ返す' }] },
      { role:'user', content:[{ type:'input_text', text:'ping' }] }
    ],
    max_output_tokens: 16
  })
});

// extractText() で統一的に本文抽出
const text = extractText(data)?.trim() || '';
const ok = text === 'pong';  // 完全一致で判定
```

#### 教訓
- **同一オリジンのAPIを経由** - Deploy Preview/本番で同じパイプライン
- **extractText() を共有** - レスポンス形式の差異を吸収
- **デバッグモード対応** - ?debug=1 で payload_keys を透過

## 時間がかかった点

1. **禁止パラメータの特定** - エラーメッセージから原因を特定するのに時間がかかった
2. **ESMインポートエラーの解決** - Lambda環境特有の問題で試行錯誤が必要だった
3. **全経路の統一** - raw=1, bypass=1, 通常ルートそれぞれで異なる処理をしていたため統一に時間がかかった

## 注意すべき点

### API移行時
- **新旧APIの仕様差異を事前調査** - パラメータ名、形式、制限事項
- **サニタイズ処理を単一箇所に集約** - 複数箇所で処理すると漏れが発生
- **クライアント側コードも忘れない** - サーバー側だけでなくフロントエンドも修正

### Netlify Functions使用時
- **環境変数の確認** - LAMBDA_TASK_ROOT, DEPLOY_ID, COMMIT_REF など
- **バンドル設定の明示** - included_files で必要ファイルを指定
- **ESM/CommonJSの混在対応** - 適切なローダー関数を用意

### デバッグ方法
- **段階的なテスト** - raw=1 → selftest → 通常チャット の順で確認
- **payload_keys の確認** - ?debug=1 で実際に送信されるキーを確認
- **ヘッダー情報の活用** - x-domain, x-backend, x-error でルーティング確認

## テストスクリプト

```javascript
// A: raw=1 テスト（"pong" が返るか）
fetch('/.netlify/functions/chat?raw=1', {
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

// B: selftest（ok:true が返るか）
fetch('/.netlify/functions/selftest')
  .then(r=>r.json())
  .then(console.log);

// C: 通常チャット（エラーなく動作するか）
fetch('/.netlify/functions/chat', {
  method:'POST', 
  headers:{'content-type':'application/json'},
  body: JSON.stringify({ 
    messages:[{role:'user',content:'名刺を100部作りたい'}] 
  })
}).then(r=>Promise.all([r, r.text()]))
  .then(([r,t])=>console.log('status', r.status, 'x-model', r.headers.get('x-model'), 'body', t));

// D: デバッグモード（payload_keys確認）
fetch('/.netlify/functions/chat?raw=1&debug=1', {
  method:'POST', 
  headers:{'content-type':'application/json'},
  body:JSON.stringify({
    input:[
      {role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
      {role:'user',content:[{type:'input_text',text:'ping'}]}
    ],
    max_output_tokens:16
  })
}).then(r=>r.json())
  .then(j=>console.log('payload_keys:', j.debug?.payload_keys));
```

## まとめ

OpenAI Responses APIへの移行とNetlify Functionsでの実装において、以下の3点が重要：

1. **APIの仕様差異を完全に理解** - 禁止パラメータ、形式の違い
2. **環境特有の問題への対処** - Lambda環境、ESMインポート
3. **統一的な処理の実装** - サニタイズ、エラーハンドリング、デバッグ機能

これらの経験を活かし、次回のAIチャットボット実装では同じ問題で時間を浪費しないよう注意する。