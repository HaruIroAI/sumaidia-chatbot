#!/bin/bash
# スマイちゃん自動デプロイスクリプト

echo "🚀 スマイちゃんを更新中..."

# 変更をステージング
git add .

# コミット
git commit -m "更新: $(date '+%Y-%m-%d %H:%M:%S')"

# GitHubにプッシュ（Netlifyが自動デプロイ）
git push

echo "✅ 更新完了！1-2分後に反映されます。"
echo "📍 URL: https://cute-frangipane-efe657.netlify.app/"