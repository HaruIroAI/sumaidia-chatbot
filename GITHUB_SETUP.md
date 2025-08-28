# 🔐 GitHub認証セットアップガイド

## 1. GitHub Token の作成と保存

### Step 1: Fine-grained Personal Access Token の作成
1. https://github.com/settings/tokens?type=beta にアクセス
2. "Generate new token" をクリック
3. 以下を設定:
   - **Token name**: `sumaidia-bot`
   - **Expiration**: 90 days (推奨)
   - **Repository access**: Selected repositories
   - **Select repositories**: `HaruIroAI/sumaidia-chatbot`
   - **Permissions**:
     - Contents: Read and Write
     - Pull requests: Read and Write
     - Metadata: Read (自動選択)
4. "Generate token" をクリック
5. トークンをコピー

### Step 2: トークンの保存
```bash
# .env.local ファイルを編集
echo "GITHUB_TOKEN=your_token_here" > .env.local

# または環境変数として設定
export GITHUB_TOKEN='your_token_here'
```

### Step 3: SSO認可（組織で必要な場合）
1. https://github.com/settings/tokens?type=beta
2. 作成したトークンの横の "Configure SSO" をクリック
3. 組織を選択して "Authorize"

## 2. 認証テスト

```bash
# 認証テストスクリプトを実行
./scripts/github-auth-test.sh
```

期待される出力:
```
🔐 GitHub Authentication Test
=========================================
1️⃣ Token Check:
✅ GITHUB_TOKEN is set (40 chars)

2️⃣ API Authentication Test:
✅ Authenticated as: YourUsername

3️⃣ Repository Permissions Check:
✅ Repository access confirmed: HaruIroAI/sumaidia-chatbot

4️⃣ Git Configuration:
✅ Git configured to use token

5️⃣ Push Test (dry-run):
✅ Push permission confirmed (dry-run successful)
```

## 3. 自動化された画像デプロイ

### 基本的な使い方
```bash
# 画像を自動デプロイ
./scripts/auto-deploy-images.sh ./path/to/images feat/new-avatars
```

### 処理フロー
1. 指定ディレクトリから画像をコピー
2. ブランチを作成してコミット
3. GitHubにプッシュ
4. PRを自動作成
5. Deploy Previewを待機
6. 画像の検証（HTTP 200チェック）
7. 成功したら自動マージ

### 例: 20枚のアバター追加
```bash
# アバター画像があるディレクトリを指定
./scripts/auto-deploy-images.sh ./new-avatars feat/avatars-batch2
```

## 4. ユーティリティ関数

`scripts/github-pr-utils.sh` で提供される関数:

```bash
# スクリプト内で使用
source ./scripts/github-pr-utils.sh

# トークン読み込み
load_github_token

# PR作成
create_pr "branch-name" "PR Title" "PR Body"

# Deploy Preview URL取得
get_deploy_preview 123  # PR番号

# 画像検証
verify_images "https://deploy-preview-123.netlify.app" image1.png image2.png

# PRマージ
merge_pr 123

# PR一覧
list_prs

# CI状態確認
check_ci_status 123
```

## 5. トラブルシューティング

### Token が動作しない場合
```bash
# トークンの権限を確認
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/HaruIroAI/sumaidia-chatbot \
  | grep -E '"permissions"' -A 5
```

### Push が失敗する場合
```bash
# リモートURLを確認
git remote -v

# HTTPSでトークン付きURLに設定
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/HaruIroAI/sumaidia-chatbot.git"
```

### PR作成が失敗する場合
```bash
# APIレスポンスを確認
curl -v -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/HaruIroAI/sumaidia-chatbot/pulls \
  -d '{"title":"Test","head":"branch","base":"main"}'
```

## 6. セキュリティ注意事項

- **`.env.local` をGitにコミットしない** （.gitignoreに追加済み）
- **トークンを定期的に更新** （90日ごと）
- **最小権限の原則** （必要な権限のみ付与）
- **トークンをログに出力しない**

## 7. 定期メンテナンス

### 月次チェック
```bash
# トークンの有効期限確認
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/user \
  | grep -E '"created_at"|"updated_at"'

# 権限の確認
./scripts/github-auth-test.sh
```

### トークン更新時
1. 新しいトークンを生成
2. `.env.local` を更新
3. `./scripts/github-auth-test.sh` で確認

---

## クイックコマンド集

```bash
# 認証セットアップ
echo "GITHUB_TOKEN=your_token" > .env.local
./scripts/github-auth-test.sh

# 画像デプロイ
./scripts/auto-deploy-images.sh ./images feat/new-images

# PR確認
source ./scripts/github-pr-utils.sh
load_github_token
list_prs

# 手動検証
./verify-avatars.sh https://deploy-preview-123.netlify.app
```

---

*最終更新: 2025-08-28*