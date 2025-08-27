# Tailwind を CDN から CLI/PostCSS に移行する手順（計画）

## 目的
- 本番ビルドの最適化と CDN 警告解消
- パフォーマンス向上とカスタマイズ性の確保

## 移行手順の骨子

### 1. 開発依存パッケージのインストール
```bash
npm i -D tailwindcss postcss autoprefixer
```

### 2. Tailwind/PostCSS の設定初期化
```bash
npx tailwindcss init -p
```

### 3. コンテンツパスの設定
`tailwind.config.js` の content を以下に設定:
```javascript
content: [
  "./*.html",
  "./**/*.html", 
  "./**/*.js"
]
```

### 4. Tailwind CSS エントリーファイル作成
`src/styles/tailwind.css` に以下を記載:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 5. ビルドスクリプトの追加
`package.json` に追加:
```json
"scripts": {
  "build:css": "tailwindcss -i ./src/styles/tailwind.css -o ./assets/tailwind.css --minify"
}
```

### 6. HTML の更新
`index.html` から CDN の script タグを削除し、以下に差し替え:
```html
<link rel="stylesheet" href="/assets/tailwind.css">
```

### 7. Netlify ビルド設定
Netlify の build command を以下に設定:
```bash
npm ci && npm run build
```

### 8. 動作確認
- UI崩れがないか全ページ確認
- レスポンシブデザインの動作検証
- パフォーマンス計測

## 現状と今後の対応

⚠️ **注意**: 現状は影響範囲が大きいため「計画」段階に留める

- 次の大きめリファクタリング時に着手予定
- 段階的移行を検討（開発環境→ステージング→本番）
- 移行前に十分なテスト期間を設ける

## 期待される効果

- 🚀 ページロード速度の向上
- 📦 ビルドサイズの最適化（未使用スタイルの削除）
- 🔧 カスタマイズの柔軟性向上
- ⚡ CDN依存の解消による安定性向上