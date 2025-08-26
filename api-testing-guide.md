# ChatGPT API接続確認ガイド

## 1. ブラウザの開発者ツールで確認

### 手順：
1. サイトを開く（https://cute-frangipane-efe657.netlify.app/）
2. **F12**キー（またはMacなら**Command+Option+I**）で開発者ツールを開く
3. **Network**タブを選択
4. スマイちゃんとチャットを開始
5. メッセージを送信

### 確認ポイント：
- **Netlifyの場合**：`chat`というリクエストが表示される
  - URL: `https://cute-frangipane-efe657.netlify.app/.netlify/functions/chat`
  - Status: 200（成功）
  - Response: ChatGPTからの応答

- **ローカルの場合**：`chat/completions`というリクエスト
  - URL: `https://api.openai.com/v1/chat/completions`

## 2. Consoleタブで詳細確認

開発者ツールの**Console**タブで以下を確認：

```javascript
// 現在のモードを確認
console.log('Current Mode:', currentMode);

// APIキーの有無を確認（キー自体は表示されない）
console.log('API Key exists:', !!apiKey);

// 会話管理の状態を確認
console.log('Conversation Summary:', conversationManager.getConversationSummary());
```

## 3. API応答の違いで判断

### ChatGPT（オンライン）の特徴：
- 文脈を理解した自然な返答
- 過去の会話を覚えている
- 具体的な質問に柔軟に対応
- 長い回答も可能

### オフラインモードの特徴：
- 決まったパターンの返答
- 会話の文脈が続かない
- パターンマッチングベース

## 4. テスト用の質問例

```
1. 「前回話した名刺の件だけど」
   → ChatGPT：前の会話を覚えていれば言及
   → オフライン：「どんな名刺のことかな？」

2. 「1000枚の名刺と500枚のチラシ、合計いくら？」
   → ChatGPT：計算して正確な金額を提示
   → オフライン：個別の価格のみ提示

3. 「スマイディアの創業年と社長の名前は？」
   → ChatGPT：両方を正確に回答
   → オフライン：部分的な回答
```

## 5. Netlifyのログで確認

1. Netlifyダッシュボード → **Functions**タブ
2. `chat`関数のログを確認
3. エラーがないか、正常に処理されているか確認

## 6. エラーが出た場合のチェックリスト

- [ ] 環境変数`OPENAI_API_KEY`が設定されているか
- [ ] APIキーが有効か（OpenAIダッシュボードで確認）
- [ ] モデル名が正しいか（`gpt-5-mini`）
- [ ] ネットワークエラーがないか

## 7. 簡単な動作確認スクリプト

ブラウザのConsoleで実行：

```javascript
// API接続テスト
async function testAPI() {
    console.log('Testing API connection...');
    const testMessage = 'こんにちは、テストです';
    const response = await callChatGPT(testMessage);
    console.log('Response:', response);
    console.log('API Status:', response ? '✅ 成功' : '❌ 失敗');
}
testAPI();
```