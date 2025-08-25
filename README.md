# スマイちゃんチャットボット

SUMAIDIA様向けAIチャットボット「スマイちゃん」のプロジェクトです。

## 現在のバージョン
**Version 1.0.0** - モックアップ版（2024-08-24）

## プロジェクト概要
- **キャラクター**: 18歳のギャル系AI印刷アシスタント
- **目的**: 印刷サービスの案内と見積もり提供
- **技術**: JavaScript、Three.js、TailwindCSS

## ファイル構成
```
/projects/sumaidia/
├── smaichan-chatbot-complete.html    # メインファイル
├── conversation-patterns.js           # 会話パターン（2000+）
├── company-knowledge-base.js          # 会社情報DB
├── conversation-patterns-simple.js    # シンプル版（バックアップ）
├── avatar-expression-guide.md         # アバター表情ガイド
├── version-history.md                 # バージョン履歴
└── README.md                         # このファイル
```

## 起動方法
1. `smaichan-chatbot-complete.html`をブラウザで開く
2. チャット画面が表示される
3. 入力欄にメッセージを入力して会話開始

## 主な会話例
- 「はろー」→ 挨拶を返す
- 「あなたは誰？」→ 自己紹介
- 「年齢は？」→ 18歳と回答
- 「名刺作りたい」→ 見積もり案内
- 「WEBサイトを作りたい」→ Web制作の案内

## アバター表情について
以下の表情画像が必要です（/ロゴ/フォルダに配置）：
- スマイちゃん.png（既存・通常表情）
- スマイちゃん_happy.png
- スマイちゃん_thinking.png
- スマイちゃん_confused.png
- スマイちゃん_wink.png

## 注意事項
- これはモックアップ版です
- 実際のAPI連携は未実装
- 一部の会話パターンで不自然な応答がある場合があります

## 今後の開発予定
1. 自然言語処理の強化
2. 実際のAPIとの連携
3. 会話履歴の保存機能
4. より多様な表情パターン

## お問い合わせ
SUMAIDIA様専用のカスタマイズについては別途ご相談ください。
