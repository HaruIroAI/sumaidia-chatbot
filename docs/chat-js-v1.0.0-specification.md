# chat.js v1.0.0 仕様書

## バージョン情報
- **バージョン**: 1.0.0
- **リリース日**: 2025-01-29
- **ステータス**: 安定版（エラーなし動作確認済み）
- **GitHubリポジトリ**: sumaidia-chatbot/netlify/functions/chat.js

## 概要
このファイルは、Sumaidiaチャットボットの中核となるNetlify Function。OpenAI Responses APIを使用してユーザーとの対話を処理し、印刷関連の質問に対して適切な応答を生成する。

## 主要機能

### 1. 禁止パラメータサニタイザー
```javascript
const FORBIDDEN_KEYS = new Set([
  'temperature', 'top_p', 'presence_penalty', 'frequency_penalty',
  'response_format', 'logit_bias', 'seed'
]);
```
- OpenAI Responses APIで使用できないパラメータを自動除去
- `deepDeleteKeys()`関数で再帰的にネストされたオブジェクトも処理
- すべてのAPI呼び出し前に`sanitizeResponsesPayload()`で強制サニタイズ

### 2. ESMモジュールローダー
```javascript
function esmUrlFromSrc(...segmentsFromSrc) {
  const isLambda = !!process.env.LAMBDA_TASK_ROOT;
  const base = isLambda ? process.env.LAMBDA_TASK_ROOT : __dirname;
  // Lambda環境とローカル環境両対応
}
```
- Lambda環境（本番）とローカル環境（開発）を自動判別
- `pathToFileURL`でfile://プロトコルに変換し確実にインポート
- キャッシュ機能付きで重複読み込みを防止

### 3. 動作モード

#### 通常モード
- インテント分類 → ルーティング → FAQ照合 → AI生成
- `max_output_tokens`最小値: 1024トークン
- `reasoning`モードは使用しない（トークン節約）

#### raw=1モード
- ルーティングをスキップして直接OpenAIへ
- `reasoning: { effort: 'low' }`を付与
- デバッグ用途に最適

#### bypass=1モード
- ESMモジュールを読み込まずに高速処理
- messages形式をResponses API形式に変換
- 入力検証付き（空配列を拒否）

#### selftest モード
- ヘルスチェック用エンドポイント
- ESMモジュールを読み込まずに即座に応答

### 4. エラーハンドリング

#### リトライ機能
```javascript
async function withRetry(fn, { tries = 3, base = 250 } = {})
```
- 5xxエラー時に最大3回リトライ
- エクスポネンシャルバックオフ実装

#### 空出力対策
- 初回で空の場合、`max_output_tokens`を2倍（最低2048）にして再試行
- それでも空の場合は502エラーを返す

#### 入力検証
- raw=1: `body.input`が配列であることを確認
- bypass=1: `body.messages`に最低1メッセージあることを確認

### 5. CORS対応
```javascript
if (event.httpMethod === 'OPTIONS') {
  // CORSプリフライト対応
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-headers', 'Content-Type, X-Session-Id, Authorization');
  headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
}
```

## レスポンスヘッダー
- `x-model`: 使用中のモデル名
- `x-session-id`: セッションID
- `x-domain`: インテント分類結果（general/printing/web/recruiting等）
- `x-backend`: バックエンドタイプ（openai/faq/openai-bypass）
- `x-error`: エラー種別
- `x-emo`: 感情タグ（あれば）
- `x-faq-match`: FAQ一致フラグ
- `x-faq-score`: FAQ一致スコア

## 環境変数
- `OPENAI_API_KEY`: OpenAI APIキー（必須）
- `OPENAI_MODEL`: 使用モデル（デフォルト: gpt-5-mini）
- `LAMBDA_TASK_ROOT`: Lambda環境のルートパス（自動設定）
- `DEPLOY_ID`: デプロイID（Netlify自動設定）
- `COMMIT_REF`: コミットリファレンス（Netlify自動設定）

## デバッグモード（?debug=1）
```javascript
{
  "ok": true,
  "payload": {
    "model": "gpt-5-mini",
    "input_type": "array",
    "max_output_tokens": 1024,
    "payload_keys": ["model", "input", "text", "max_output_tokens"]
  },
  "openai": {
    "status": "completed",
    "usage": {...}
  },
  "response": {
    "text": "...",
    "domain": "printing"
  }
}
```

## 既知の制限事項
1. `max_output_tokens`の最小値が1024のため、短い応答でもトークンを消費
2. 通常モードでは`reasoning`モードを使用しないため、複雑な推論は苦手
3. FAQ閾値が0.7固定（調整不可）

## トラブルシューティング

### よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|--------|------|--------|
| `esm_import_failed` | ESMモジュールの読み込み失敗 | netlify.tomlの`included_files`確認 |
| `empty_output` | OpenAIが空応答を返した | max_output_tokensを増やす |
| `bad_raw_input` | raw=1で入力が不正 | body.inputが配列か確認 |
| `missing_api_key` | APIキーが未設定 | 環境変数OPENAI_API_KEY設定 |

## バックアップ復元方法
```bash
# バックアップファイルから復元
cp netlify/functions/chat.js.v1.0.0.backup netlify/functions/chat.js

# コミット
git add netlify/functions/chat.js
git commit -m "Restore chat.js to v1.0.0 stable version"
git push
```

## 次期バージョンでの改善予定
- [ ] max_output_tokensの動的調整
- [ ] reasoning モードの選択的使用
- [ ] FAQ閾値の環境変数化
- [ ] ストリーミングレスポンス対応
- [ ] より詳細なエラーログ

---

**注意**: このv1.0.0は安定版として保存されており、大規模な変更を加える前に必ずこのバージョンに戻すことを検討してください。