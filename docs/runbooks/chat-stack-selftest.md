# チャットスタック運用手順書 (Chat Stack Selftest Runbook)

## 目的
チャット機能障害発生時に、**5分以内に復旧**できる定型フローを提供する。

## 前提条件
- Netlify管理画面へのアクセス権限
- 環境変数設定権限
- GitHub リポジトリへのアクセス権限

## 障害検知と初期診断（2分以内）

### 1. selftest確認
```bash
# 本番環境で実行
curl https://cute-frangipane-efe657.netlify.app/.netlify/functions/selftest
```

**期待値**: 
```json
{ "ok": true, "model": "gpt-5-mini", "sample": "pong" }
```

**NGの場合**: デバッグモードで再実行
```bash
curl "https://cute-frangipane-efe657.netlify.app/.netlify/functions/selftest?debug=1"
```

### 2. chat通常モード確認
```javascript
// ブラウザコンソールで実行
fetch('/.netlify/functions/chat',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body: JSON.stringify({
    messages:[
      {role:'system',content:'「pong」と1語だけ返す'},
      {role:'user',content:'ping'}
    ]
  })
}).then(async r => {
  console.log('Status:', r.status, 'Model:', r.headers.get('x-model'));
  console.log('Response:', await r.json());
});
```

### 3. chatのrawモード確認
```javascript
// ブラウザコンソールで実行
fetch('/.netlify/functions/chat?raw=1',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body: JSON.stringify({
    input:[
      {role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
      {role:'user',content:[{type:'input_text',text:'ping'}]}
    ],
    max_output_tokens: 16
  })
}).then(async r => {
  console.log('Status:', r.status, 'Model:', r.headers.get('x-model'));
  console.log('Response:', await r.json());
});
```

## 障害パターン別対応（3分以内）

### パターン1: selftest失敗 (ok: false)

1. **Functions Logsを確認**
   - Netlify Dashboard → Functions → selftest → View logs
   - 直近のエラーメッセージを確認

2. **よくあるエラー**
   - `Missing OPENAI_API_KEY`: 環境変数確認
   - `Invalid value: 'input_text'`: APIフォーマットエラー
   - `do not have access to model`: モデル権限確認

3. **対処**
   ```bash
   # キャッシュクリアして再デプロイ
   Netlify Dashboard → Deploys → Trigger deploy → Clear cache and deploy site
   ```

### パターン2: 5xx/429エラー

1. **一時的対処**
   ```javascript
   // strict=1モードで再試行（フォールバック無効）
   fetch('/.netlify/functions/chat?raw=1&strict=1',{
     method:'POST',
     headers:{'content-type':'application/json'},
     body: /* 上記と同じ */
   });
   ```

2. **恒久対処**
   - OpenAI API Statusを確認
   - Rate limitの場合は指数バックオフ実装

### パターン3: 空の応答

1. **x-modelヘッダー確認**
   - 存在しない場合: API接続エラー
   - 存在する場合: 抽出ロジックエラー

2. **extractTextの動作確認**
   ```javascript
   // デバッグモードでraw応答を確認
   fetch('/.netlify/functions/selftest?debug=1')
     .then(r => r.json())
     .then(data => console.log('Raw:', data.raw));
   ```

### パターン4: UIが古い

1. **ブラウザキャッシュクリア**
   - Hard reload: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

2. **デプロイ確認**
   - Netlify Dashboard → Deploys
   - 最新のコミットが反映されているか確認

## 環境変数チェックリスト

1. **Netlify Dashboard → Site settings → Environment variables**
   - [ ] `OPENAI_API_KEY` が設定されている
   - [ ] `OPENAI_MODEL` が正しい（例: gpt-5-mini）
   - [ ] Scopeが "All deploy contexts" になっている

2. **誤字チェック**
   - ❌ `OPENI_MODEL` (誤)
   - ✅ `OPENAI_MODEL` (正)

## PR作成とデプロイフロー

### 1. 修正作業
```bash
git checkout -b fix/[issue-name]
# 修正作業
git add -A
git commit -m "fix: [具体的な修正内容]"
git push origin fix/[issue-name]
```

### 2. PR作成
```bash
# GitHub上でPR作成
# タイトル: fix: [問題の概要]
# 本文: 
# - 問題: [何が起きていたか]
# - 原因: [なぜ起きたか]
# - 対策: [何を修正したか]
# - テスト: 3テスト（selftest/通常/raw）の結果を貼る
```

### 3. Deploy Preview確認
1. PRのチェック欄で "Deploy Preview ready!" を待つ
2. Preview URLで3テスト実行
3. 全て成功したらマージ

### 4. 本番確認
1. マージ後、本番デプロイ完了を待つ（約1-2分）
2. 本番で3テスト実行
3. 成功を確認

## エスカレーション

上記手順で解決しない場合：
1. `test-report-YYYY-MM-DD.md` を作成
2. 以下を記載：
   - 実行した手順
   - エラーメッセージ（完全版）
   - Functions Logsのスクリーンショット
   - 3テストの結果
3. GitHubにIssueを作成

## クイックリファレンス

### 正しいResponses APIパラメータ
✅ 正しい:
- `input` (not messages)
- `max_output_tokens` (not max_tokens)
- `text: { format: { type: 'text' } }` (not response_format)

❌ 間違い:
- `messages`, `max_tokens`, `response_format`
- `temperature`, `presence_penalty` (一部モデルで非対応)

### extractTextの優先順位
1. `output[].content[].type === 'output_text'`
2. `choices[0].message.content`
3. `output_text`

### デバッグコマンド集
```bash
# selftest基本
curl https://cute-frangipane-efe657.netlify.app/.netlify/functions/selftest

# selftestデバッグ
curl "https://cute-frangipane-efe657.netlify.app/.netlify/functions/selftest?debug=1"

# ローカルテスト（Netlify CLI使用時）
netlify dev
curl http://localhost:8888/.netlify/functions/selftest
```