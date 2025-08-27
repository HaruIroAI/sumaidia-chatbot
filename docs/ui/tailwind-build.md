# Tailwind CSS ビルド移行計画

## 現状
- 現在はCDN版Tailwind CSS（`https://cdn.tailwindcss.com`）を使用
- プロダクション環境では推奨されない方法
- コンソールに警告が表示される可能性あり

## 将来の移行計画

### フェーズ1: PostCSS/CLI移行（推奨）

1. **必要なパッケージのインストール**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

2. **tailwind.config.jsの設定**
```javascript
module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

3. **input.cssの作成**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

4. **ビルドスクリプトの追加（package.json）**
```json
{
  "scripts": {
    "build-css": "tailwindcss -i ./src/input.css -o ./dist/output.css --watch",
    "build-css:prod": "tailwindcss -i ./src/input.css -o ./dist/output.css --minify"
  }
}
```

5. **HTMLの更新**
```html
<!-- CDN版を削除 -->
<!-- <script src="https://cdn.tailwindcss.com"></script> -->

<!-- ビルド版を追加 -->
<link href="/dist/output.css" rel="stylesheet">
```

### メリット
- パフォーマンス向上（未使用CSSの削除）
- カスタマイズの柔軟性
- プロダクション最適化
- コンソール警告の解消

### 注意事項
- ビルドプロセスが必要になる
- 開発時はwatchモードを使用
- Netlifyの場合はビルドコマンドの設定が必要

## 当面の対応
- CDN版でも機能的には問題なし
- パフォーマンスが問題になった時点で移行
- 現時点では他の機能開発を優先

## Netlifyでのビルド設定（将来）
```toml
# netlify.toml
[build]
  command = "npm run build-css:prod"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
```