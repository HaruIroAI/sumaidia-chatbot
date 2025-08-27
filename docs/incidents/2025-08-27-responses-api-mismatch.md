# インシデントポストモーテム: Responses API パラメータ不一致とchat機能障害

## 概要
- **発生日時**: 2025年8月27日
- **影響時間**: 数時間（断続的）
- **重要度**: High
- **影響**: 本番環境でUIが古い状態で固定、会話が崩れる、空返答が発生

## 影響
- 本番環境でのチャット機能が正常に動作しない
- ユーザーメッセージに対して空の返答または「暫定エラー」が返る
- UI更新が反映されない（古いコードが実行される）
- selftestが通らない（期待値"pong"が返らない）

## 原因

### 直接原因
1. **APIパラメータ不一致**
   - Chat Completions API からResponses APIへの移行時のパラメータ名の相違
   - `messages` → `input` への変更
   - `max_tokens` → `max_output_tokens` への変更
   - `response_format` → `text: { format: { type: 'text' } }` への変更
   - 一部モデルで `temperature` / `presence_penalty` 非対応

2. **selftest.jsの経路ズレ**
   - OpenAI APIを直接呼び出していたため、chat.jsとは異なる処理経路
   - 本番環境と異なる結果を返す可能性

3. **応答抽出ロジックの不足**
   - Responses APIの出力形式に対応した抽出ロジックが不完全
   - 空文字でUIフォールバックが発生し、会話が崩壊

4. **一時的な障害への対応不足**
   - 5xx/429エラーによる断続的失敗
   - リトライロジックの欠如

### 真因
- Chat Completions API と Responses API の仕様差異の理解不足
- APIの移行テストが不十分
- selftestとchatの処理経路が分離していたことによる検証漏れ

## 兆候
- selftestで `{ ok: false }` が返る
- chatエンドポイントで空の応答または「暫定エラー」
- Deploy Previewでは動作するが本番で動作しない
- `x-model` ヘッダーが返らない

## 対策

### 一次対策（実施済み）
1. **raw=1モードの追加**
   - `/chat?raw=1` で前処理バイパス
   - strict=1でフォールバック無効化

2. **extractText共通化**
   - `_extractText.js` ヘルパー関数の作成
   - 複数の出力形式に対応

3. **x-modelヘッダー付与**
   - 使用モデルの可視化
   - デバッグの容易化

4. **selftest.jsの内部プロキシ化**
   - `/chat?raw=1` を内部呼び出し
   - 同一パイプラインでの検証

5. **厳密判定の実装**
   - selftest: `text === "pong"` の完全一致判定
   - 不一致時はHTTP 500を返す

### 恒久対策
1. **運用ドキュメントの整備**（本ドキュメント）
2. **ランブックの作成**（chat-stack-selftest.md）
3. **自動検知の仕組み**（GitHub Actions）
4. **参照スニペットの管理**

## 学び
1. **API移行時は仕様差異の詳細な確認が必要**
   - パラメータ名の相違
   - 出力形式の相違
   - エラーハンドリングの相違

2. **selftestは本番と同じ経路で実行すべき**
   - 内部プロキシ方式の採用
   - 処理経路の統一

3. **複数の出力形式に対応した抽出ロジックが必要**
   - フォーマットの多様性を想定
   - 堅牢な実装

4. **段階的なデバッグモードの実装が有効**
   - `?debug=1` パラメータ
   - raw応答の確認

## 付録

### テストコマンド
```javascript
// 1) selftest
fetch('/.netlify/functions/selftest').then(r=>r.json()).then(console.log);

// 2) 通常モード
fetch('/.netlify/functions/chat',{method:'POST',headers:{'content-type':'application/json'},
  body: JSON.stringify({messages:[
    {role:'system',content:'「pong」と1語だけ返す'},
    {role:'user',content:'ping'}
  ]})}).then(r=>r.text()).then(console.log);

// 3) raw モード
fetch('/.netlify/functions/chat?raw=1',{method:'POST',headers:{'content-type':'application/json'},
  body: JSON.stringify({input:[
    {role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
    {role:'user',content:[{type:'input_text',text:'ping'}]}
  ],max_output_tokens: 16})}).then(r=>r.text()).then(console.log);
```

### 関連ファイル
- `/netlify/functions/chat.js` - メインのチャット処理
- `/netlify/functions/selftest.js` - セルフテスト機能
- `/netlify/functions/_extractText.js` - テキスト抽出ヘルパー
- `TROUBLESHOOTING.md` - トラブルシューティングガイド