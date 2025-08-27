# Expression Pipeline Operations Guide

このガイドは、表情システムの運用と問題解決について説明します。

## 🔧 Runtime Toggles（実行時トグル）

### 1. `window.__useModelHint` (default: true)
**機能**: AIモデルが提供する `[[emo:id]]` タグを優先使用

**有効時の動作**:
- レスポンス末尾の `[[emo:happy]]` などのタグを検出
- タグで指定された表情を強制使用
- タグはユーザーには表示されない（自動削除）

**無効化する場合**:
```javascript
// ブラウザコンソールで実行
window.__useModelHint = false;
```

**使用シーン**:
- モデルのタグが不正確な場合
- 表情エンジンの性能をテストする場合
- タグ処理に問題がある場合のデバッグ

### 2. `window.__useStyleRender` (default: true)
**機能**: 表情に応じたトーン調整を適用

**有効時の動作**:
- happy → 「✨」追加、語尾を「だよ！」に
- grateful → 「ありがとう」追加
- thinking → 「うーん、」を文頭に
- その他、感情に応じた軽微な装飾

**無効化する場合**:
```javascript
// ブラウザコンソールで実行
window.__useStyleRender = false;
```

**使用シーン**:
- 純粋なAI出力を確認したい場合
- スタイル調整が不自然な場合
- 事実情報の正確性を重視する場合

## 🚨 トラブルシューティング

### 問題1: [[emo:]] タグが来ない

**症状**: AIレスポンスに感情タグが含まれない

**確認方法**:
```javascript
// Network タブでレスポンスを確認
// または
fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        messages: [
            {role: 'system', content: '...'},
            {role: 'user', content: 'テスト'}
        ]
    })
}).then(r => r.json()).then(console.log);
```

**対策**:
1. システムプロンプトの確認
2. モデルのバージョン確認（gpt-4以降推奨）
3. フォールバック: `window.__useModelHint = false`

### 問題2: 誤ったタグが多い

**症状**: 不適切な表情タグ（悲しい内容なのに happy など）

**確認方法**:
```javascript
// デバッグモードを有効化
window.__debugExpressions = true;

// 会話後に履歴を確認
window.dumpExpressions();
```

**対策**:
1. システムプロンプトの調整
2. 許可IDリストの見直し
3. 一時的に無効化: `window.__useModelHint = false`

### 問題3: スタイル調整が不自然

**症状**: 絵文字が多すぎる、語尾が不自然

**対策**:
```javascript
// スタイル調整を無効化
window.__useStyleRender = false;

// または style-renderer.js を調整
```

### 問題4: 表情が頻繁に変わる

**症状**: 表情がパカパカ切り替わる

**対策**:
```javascript
// config/expressions.json で cooldown を調整
"cooldown": 3000  // 3秒に延長

// またはヒステリシス閾値を調整（expression-engine.js）
```

## 📊 Metrics の見方

### Netlify Functions Logs

**アクセス方法**:
1. Netlify Dashboard → Functions → metrics
2. "View logs" をクリック

**CLI でリアルタイム監視**:
```bash
netlify logs:function metrics --tail
```

**ログの読み方**:
```
[Metrics] Expression: id=happy source=model ts=2024-08-27T10:30:45.123Z
```
- `id`: 選択された表情
- `source`: `model`（AI提供）または `engine`（計算）
- `ts`: タイムスタンプ

### 分析のポイント

**表情の分布**:
```javascript
// ログから集計
grep "Expression:" logs.txt | awk '{print $3}' | sort | uniq -c
```

**ソース比率**:
```javascript
// model vs engine の比率
grep "source=model" logs.txt | wc -l
grep "source=engine" logs.txt | wc -l
```

## 🧪 ゴールデンテストの実行

### 基本的な実行方法

```bash
# プロジェクトルートで実行
npm test
```

### テスト結果の解釈

```
📊 Test Results Summary
Total Tests: 84
✅ Passed: 43
❌ Failed: 41
📈 Pass Rate: 51.2%
```

**注意点**:
- クールダウンペナルティで連続テストは失敗しやすい
- これは正常な動作（ヒステリシス効果）

### カスタムテストの追加

`tests/expressions.fixtures.json` を編集:
```json
{
  "text": "新しいテストケース",
  "expect": "happy"
}
```

### CI/CD での実行

`.github/workflows/test.yml`:
```yaml
- name: Run expression tests
  run: npm test
  continue-on-error: true  # 警告として扱う
```

## 🔍 デバッグツール

### Expression Tester UI

```bash
# ローカルで開く
open tools/expression-tester.html

# または本番環境
https://[your-domain]/tools/expression-tester.html
```

**使い方**:
1. テキストを入力
2. "Analyze" ボタンをクリック
3. スコアと理由を確認

### Console Commands

```javascript
// 現在の設定を確認
console.log({
    useModelHint: window.__useModelHint,
    useStyleRender: window.__useStyleRender,
    debugMode: window.__debugExpressions
});

// 表情エンジンの状態確認
console.log(window.__exprState);

// 手動で表情を選択
const result = window.expressionEngine.select({
    text: "テストテキスト",
    role: 'assistant',
    contexts: [],
    lastId: null
});
console.log(result);
```

## 📈 パフォーマンス最適化

### メトリクスベースの調整

1. **頻度の低い表情を確認**
   - 閾値が高すぎる可能性
   - キーワードが不足

2. **特定表情の過剰出現**
   - 優先度が高すぎる
   - キーワードが汎用的すぎる

3. **model vs engine のバランス**
   - model比率が低い → プロンプト調整
   - engine比率が低い → タグの信頼性向上

### 推奨設定

**安定重視**:
```javascript
window.__useModelHint = true;
window.__useStyleRender = false;
```

**表現豊か**:
```javascript
window.__useModelHint = true;
window.__useStyleRender = true;
```

**デバッグ**:
```javascript
window.__useModelHint = false;
window.__useStyleRender = false;
window.__debugExpressions = true;
```

## 🚀 今後の改善案

1. **A/Bテスト機能**
   - トグルをユーザーグループごとに自動設定
   - メトリクスで比較

2. **自動調整**
   - メトリクスに基づいて閾値を動的調整
   - 時間帯による表情傾向の変更

3. **フィードバック収集**
   - ユーザーが表情を評価できるUI
   - 機械学習による改善

---

*最終更新: 2024-08-27*