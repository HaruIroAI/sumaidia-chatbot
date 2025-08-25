# スマイちゃん更新手順

## 🔄 更新の流れ

### 1. ファイルを修正
```bash
# 例：会話パターンを追加
cd /Users/kamikoyuuichi/kamiko-independence/projects/sumaidia/deployment/
# conversation-patterns.js を編集
```

### 2. ローカルでテスト
```bash
# ブラウザで確認
open index.html
```

### 3. ZIPファイル作成
```bash
cd /Users/kamikoyuuichi/kamiko-independence/projects/sumaidia/
zip -r smaichan-deployment-update.zip deployment/
```

### 4. Netlifyで更新
1. https://app.netlify.com にログイン
2. cute-frangipane-efe657 サイトを選択
3. Deploys タブを開く
4. 新しいZIPをドラッグ&ドロップ

### ✨ 更新完了！
- 同じURL（https://cute-frangipane-efe657.netlify.app/）で自動更新
- 1-2分で反映
- ダウンタイムなし

## 💡 よくある修正

### 会話パターン追加
- `deployment/conversation-patterns.js` の exactMatchPatterns に追加

### 表情画像の変更
- `deployment/logo/` フォルダ内の画像を差し替え

### UI/デザイン変更
- `deployment/index.html` のCSSセクションを編集

### 会社情報更新
- `deployment/company-knowledge-base.js` を編集

## 🚀 プロのTips

1. **バージョン管理**
   - 更新前にバックアップ
   - smaichan-deployment-v1.zip, v2.zip... と保存

2. **段階的更新**
   - まず index-standalone.html でテスト
   - 問題なければ index.html も更新

3. **更新履歴**
   - README.txt に更新内容を記載
   - 例：「2024/07/23 - 会話パターン50個追加」