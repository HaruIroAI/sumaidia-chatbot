# スマイちゃんチャットボット デプロイメントガイド

## 公開前チェックリスト

### 1. ファイルパスの修正
現在ローカルパスになっている部分を相対パスに変更：

```javascript
// 修正前
background-image: url('ロゴ/スマイちゃん.png');

// 修正後
background-image: url('./logo/smaichan.png');
```

### 2. 画像ファイルの準備
以下のファイルを用意して同じフォルダに配置：
```
/logo/
  ├── smaichan.png (通常表情)
  ├── smaichan_happy.png
  ├── smaichan_thinking.png
  ├── smaichan_confused.png
  └── smaichan_wink.png
```

### 3. ファイル構成
```
sumaidia-smaichan/
├── index.html (smaichan-chatbot-complete.htmlをリネーム)
├── conversation-patterns.js
├── company-knowledge-base.js
├── logo/
│   └── (アバター画像ファイル)
└── README.md
```

## 推奨する公開方法

### 初心者向け：Netlify
1. https://app.netlify.com/drop にアクセス
2. プロジェクトフォルダをドラッグ&ドロップ
3. 生成されたURLを共有

**メリット**：
- アカウント作成不要
- 即座に公開
- HTTPS対応
- 無料

### 企業向け：GitHub Pages
1. GitHubでプライベートリポジトリ作成
2. ファイルをアップロード
3. Settings → Pages で公開設定
4. Actions → Deploy static content to Pages

**メリット**：
- バージョン管理
- 共同編集可能
- 無料（プライベートリポジトリも可）

### プロ向け：独自ドメイン
1. SUMAIDIAのサブドメインを作成
   - chat.sumaidia.com
   - smaichan.sumaidia.com
2. SSL証明書を設定
3. FTPでファイルアップロード

## セキュリティ考慮事項

### 公開時の注意
1. デバッグログを削除
2. 個人情報が含まれていないか確認
3. アクセス制限が必要か検討

### コードの修正
```javascript
// デバッグログを削除
// console.log('=== generateResponse Debug ===');
// console.log('User input:', userMessage);
```

## 共有方法

### 社内向け
1. URLをメールで共有
2. QRコードを生成して配布
3. 社内ポータルにリンク設置

### テスト依頼文例
```
スマイちゃんチャットボット（モックアップ版）が完成しました。

URL: https://[公開URL]

以下の会話を試してみてください：
- 「はろー」と挨拶
- 「名刺を作りたい」と相談
- 「年齢は？」と質問

フィードバックをお待ちしています。
```

## トラブルシューティング

### よくある問題
1. **画像が表示されない**
   - パスが正しいか確認
   - ファイル名の大文字小文字を確認

2. **JavaScriptエラー**
   - ブラウザのコンソールを確認
   - キャッシュをクリア

3. **文字化け**
   - UTF-8エンコーディングを確認
   - metaタグが正しいか確認

## 次のステップ

1. ユーザーフィードバックの収集
2. アクセス解析の設置（Google Analytics等）
3. エラーログの収集システム
4. 継続的な改善