# スマイちゃん統合 - 本番環境テスト計画

## 1. デプロイ前チェックリスト

### コード確認
- [x] build-system-prompt.mjs: スマイちゃん人格統合
- [x] chat.js: enableSmaichanパラメータ追加
- [x] router.mjs: 価格情報検索機能
- [x] pricing-loader.mjs: 価格データローダー
- [x] 価格データJSON: 3ファイル作成済み

### ローカルテスト
- [x] スマイちゃんモード有効化確認
- [x] 従来モード（無効化時）の動作確認
- [x] 価格情報検索の動作確認

## 2. デプロイ手順

### Step 1: PRのマージ
```bash
# GitHubでPRを作成
# https://github.com/HaruIroAI/sumaidia-chatbot/pull/new/feature/integrate-smaichan-persona

# レビュー後、mainブランチにマージ
```

### Step 2: Netlifyデプロイ確認
- Netlifyダッシュボードでデプロイステータス確認
- ビルドログでエラーがないことを確認
- 環境変数確認:
  - `OPENAI_API_KEY`: 設定済み
  - `DISABLE_SMAICHAN`: 未設定（デフォルトで有効）

## 3. 本番環境テストケース

### 基本機能テスト

#### Test 1: ヘルスチェック
```javascript
fetch('/.netlify/functions/selftest')
  .then(r => r.json())
  .then(console.log);
// Expected: {ok: true, sample: '...', expected: 'pong'}
```

#### Test 2: スマイちゃん人格確認
```javascript
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    messages: [{role: 'user', content: 'こんにちは！'}]
  })
})
.then(r => r.json())
.then(r => console.log(r.choices[0].message.content));
// Expected: スマイちゃんの明るい挨拶（「はろー！」など）
```

#### Test 3: 価格問い合わせ
```javascript
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    messages: [{role: 'user', content: '名刺100枚の値段を教えて'}]
  })
})
.then(r => r.json())
.then(r => console.log(r.choices[0].message.content));
// Expected: 「名刺100枚なら3000円くらいからできるよ〜」のような回答
```

#### Test 4: 納期問い合わせ
```javascript
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    messages: [{role: 'user', content: 'チラシの納期はどのくらい？'}]
  })
})
.then(r => r.json())
.then(r => console.log(r.choices[0].message.content));
// Expected: 「通常7営業日くらいで仕上がるよ」のような回答
```

#### Test 5: レスポンスヘッダー確認
```javascript
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({messages: [{role: 'user', content: 'test'}]})
})
.then(r => {
  console.log('x-smaichan:', r.headers.get('x-smaichan'));
  console.log('x-domain:', r.headers.get('x-domain'));
  return r.json();
});
// Expected: x-smaichan: enabled, x-domain: [classified domain]
```

### エラーケーステスト

#### Test 6: 空メッセージ
```javascript
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({messages: []})
})
.then(r => r.json())
.then(console.log);
// Expected: エラーまたはデフォルト応答
```

#### Test 7: セッション継続性
```javascript
const sessionId = 'test-' + Date.now();
// 1回目
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId
  },
  body: JSON.stringify({
    messages: [{role: 'user', content: '名刺を作りたい'}]
  })
})
.then(r => r.json())
.then(console.log);

// 2回目（同じセッション）
setTimeout(() => {
  fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': sessionId
    },
    body: JSON.stringify({
      messages: [
        {role: 'user', content: '名刺を作りたい'},
        {role: 'assistant', content: '[前回の応答]'},
        {role: 'user', content: '100枚です'}
      ]
    })
  })
  .then(r => r.json())
  .then(console.log);
}, 1000);
// Expected: セッション情報が保持され、適切な応答
```

## 4. パフォーマンステスト

### レスポンスタイム測定
```javascript
console.time('response');
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    messages: [{role: 'user', content: 'テスト'}]
  })
})
.then(r => r.json())
.then(() => console.timeEnd('response'));
// Expected: < 3秒
```

## 5. ロールバック手順

問題が発生した場合:

### Option 1: スマイちゃん無効化
Netlify環境変数に追加:
```
DISABLE_SMAICHAN = true
```

### Option 2: 前バージョンへロールバック
```bash
# Netlifyダッシュボードから
# Deploys > 前のデプロイを選択 > Publish deploy
```

### Option 3: 緊急修正
```bash
git checkout main
git pull
# 修正実施
git add .
git commit -m "hotfix: [issue description]"
git push
```

## 6. モニタリング項目

### 確認すべきメトリクス
- [ ] エラー率の増加がないか
- [ ] レスポンスタイムの悪化がないか
- [ ] OpenAI APIクォータの消費量
- [ ] Netlify Function実行時間

### ログ確認
- Netlify Functions ログ
- x-errorヘッダーの値
- コンソールエラー

## 7. 成功基準

- [ ] すべてのテストケースがPASS
- [ ] エラー率 < 1%
- [ ] 平均レスポンスタイム < 3秒
- [ ] スマイちゃんの人格が適切に反映
- [ ] 価格情報が正しく提供される

## 8. 関係者への連絡

### デプロイ前
- チームに実施時刻を通知

### デプロイ後
- テスト結果のサマリー共有
- 問題があれば即座に報告

## 備考

- 本番環境URL: https://[your-netlify-domain].netlify.app
- テスト実施推奨時間: トラフィックの少ない時間帯
- 緊急連絡先: [担当者情報]

---

Last Updated: 2025-01-29
Author: Smaichan Integration Team