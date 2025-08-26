# Netlify Deployment Guide for Smaichan Chatbot

## 概要
このガイドでは、スマイちゃんチャットボットをNetlifyにデプロイし、APIキーを安全に管理する方法を説明します。

## デプロイ手順

### 1. Netlifyにログイン
1. [Netlify](https://app.netlify.com)にアクセス
2. GitHubアカウントでログイン

### 2. 環境変数の設定
1. Netlifyダッシュボードでサイトを選択
2. "Site configuration" → "Environment variables" に移動
3. 以下の環境変数を追加：
   - **Key**: `OPENAI_API_KEY`
   - **Value**: あなたのOpenAI APIキー（sk-で始まる文字列）

### 3. デプロイの確認
1. "Deploys"タブで最新のデプロイを確認
2. デプロイが成功したら、サイトURLにアクセス
3. チャットボットが自動的にオンラインモード（ChatGPT）で動作することを確認

## ファイル構成
```
/sumaidia
  ├── functions/
  │   └── chat.js              # Netlify Function（APIプロキシ）
  ├── netlify.toml             # Netlify設定ファイル
  ├── smaichan-chatbot-complete-with-api.html  # メインファイル
  ├── conversation-patterns.js # 会話パターン
  └── company-knowledge-base.js # 企業情報
```

## 動作の仕組み
1. **Netlifyで実行時**：
   - APIキー入力欄は自動的に非表示
   - ChatGPTモードがデフォルトで有効
   - Netlify Functionsを経由してOpenAI APIを呼び出し

2. **ローカルで実行時**：
   - APIキー入力欄が表示される
   - オフラインモードがデフォルト
   - APIキーを入力することでChatGPTモードに切り替え可能

## セキュリティ
- APIキーは環境変数として保存され、クライアント側には公開されません
- Netlify Functionsがプロキシとして動作し、安全にAPIを呼び出します

## トラブルシューティング
- **チャットが応答しない場合**：
  1. Netlifyの環境変数が正しく設定されているか確認
  2. Functions logでエラーを確認
  3. OpenAI APIキーが有効か確認

- **デプロイが失敗する場合**：
  1. `netlify.toml`が正しい場所にあるか確認
  2. `functions`フォルダが存在するか確認