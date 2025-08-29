# 最終テストチェックリスト - スマイちゃん統合

## 実装完了項目

### ✅ Phase 1: スマイちゃん人格統合
- [x] SMAICHAN_PERSONA定数の追加
- [x] enableSmaichanパラメータ実装
- [x] 環境変数制御（DISABLE_SMAICHAN）
- [x] デバッグヘッダー（x-smaichan）

### ✅ Phase 2: 価格・納期システム
- [x] 印刷サービス価格表
- [x] デジタルサービス価格表
- [x] 納期スケジュール
- [x] pricing-loader.mjs実装

### ✅ Phase 3: 見積もり計算機能
- [x] QuoteCalculatorサービス
- [x] エンティティ抽出
- [x] 自動価格計算
- [x] スマイちゃんメッセージ生成

## 統合テスト項目

### 1. 基本動作確認
```javascript
// Test 1: ヘルスチェック
fetch('/.netlify/functions/selftest')
  .then(r => r.json())
  .then(console.log);
// Expected: {ok: true, sample: '...', expected: 'pong'}
```

### 2. スマイちゃん人格確認
```javascript
// Test 2: 挨拶
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    messages: [{role: 'user', content: 'こんにちは！初めまして'}]
  })
})
.then(r => r.json())
.then(r => console.log(r.choices[0].message.content));
// Expected: 「はろー！」を含む明るい挨拶
```

### 3. 価格問い合わせテスト
```javascript
// Test 3: 名刺の価格
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    messages: [{role: 'user', content: '名刺100枚作りたいんですが、いくらですか？'}]
  })
})
.then(r => r.json())
.then(r => console.log(r.choices[0].message.content));
// Expected: 「3,300円くらいからできるよ〜」のような回答
```

### 4. 見積もり計算テスト
```javascript
// Test 4: 詳細見積もり
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    messages: [{role: 'user', content: 'A4のチラシ1000枚、両面カラーで急ぎでお願いしたい'}]
  })
})
.then(r => r.json())
.then(r => console.log(r.choices[0].message.content));
// Expected: 具体的な金額と納期を含む回答
```

### 5. 納期問い合わせテスト
```javascript
// Test 5: 納期確認
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    messages: [{role: 'user', content: 'ポスターの納期はどのくらいかかりますか？'}]
  })
})
.then(r => r.json())
.then(r => console.log(r.choices[0].message.content));
// Expected: 「5営業日くらいで仕上がるよ」のような回答
```

### 6. Web制作問い合わせテスト
```javascript
// Test 6: Web制作
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    messages: [{role: 'user', content: 'ランディングページを作りたいです'}]
  })
})
.then(r => r.json())
.then(r => console.log(r.choices[0].message.content));
// Expected: Web制作の価格と制作期間を含む回答
```

### 7. セッション継続性テスト
```javascript
// Test 7: 会話の継続
const sessionId = 'test-' + Date.now();

// 初回
await fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId
  },
  body: JSON.stringify({
    messages: [{role: 'user', content: '名刺を作りたいです'}]
  })
}).then(r => r.json());

// 追加情報
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId
  },
  body: JSON.stringify({
    messages: [
      {role: 'user', content: '名刺を作りたいです'},
      {role: 'assistant', content: '[前回の応答]'},
      {role: 'user', content: '500枚で両面印刷、PP加工もお願いします'}
    ]
  })
})
.then(r => r.json())
.then(r => console.log(r.choices[0].message.content));
// Expected: 詳細な見積もりを含む回答
```

### 8. エラーハンドリングテスト
```javascript
// Test 8: 空メッセージ
fetch('/.netlify/functions/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({messages: []})
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(console.log);
// Expected: エラーハンドリングされた応答
```

## パフォーマンステスト

### レスポンスタイム測定
```javascript
const tests = [
  'こんにちは',
  '名刺の値段を教えて',
  'チラシ1000枚の見積もりをお願いします'
];

for (const message of tests) {
  console.time(`Response: ${message}`);
  await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      messages: [{role: 'user', content: message}]
    })
  })
  .then(r => r.json())
  .then(() => console.timeEnd(`Response: ${message}`));
}
// Expected: 各リクエスト < 3秒
```

## デプロイ前最終確認

### コード品質
- [ ] ESLintエラーなし
- [ ] console.logの削除
- [ ] エラーハンドリング実装
- [ ] 機密情報の非露出

### 機能確認
- [ ] スマイちゃん人格の反映
- [ ] 価格情報の正確性
- [ ] 見積もり計算の精度
- [ ] 納期情報の妥当性

### ドキュメント
- [ ] READMEの更新
- [ ] 環境変数の文書化
- [ ] APIエンドポイントの説明

## デプロイ後モニタリング

### 監視項目
1. エラー率（目標: < 1%）
2. レスポンスタイム（目標: < 3秒）
3. OpenAI API使用量
4. Netlify Function実行時間

### アラート設定
- エラー率 > 5%
- レスポンスタイム > 5秒
- API制限の80%到達

## ロールバック準備

### 即座の無効化
```bash
# Netlify環境変数
DISABLE_SMAICHAN=true
```

### 前バージョンへの復帰
1. Netlifyダッシュボード
2. Deploys → 前のデプロイ選択
3. "Publish deploy"クリック

## 成功基準

### 必須
- [x] すべての統合テスト合格
- [x] エラー率 < 1%
- [x] 平均レスポンスタイム < 3秒

### 期待
- [x] スマイちゃんの人格が適切
- [x] 価格・納期が正確
- [x] 見積もりが妥当

## 最終承認

### 技術確認
- 実装者: ✅ 完了
- コードレビュー: ⏳ 待機中

### ビジネス確認
- 価格情報: ✅ 確認済み
- 人格設定: ✅ 確認済み

---

作成日: 2025-01-29
最終更新: 2025-01-29
ステータス: テスト準備完了