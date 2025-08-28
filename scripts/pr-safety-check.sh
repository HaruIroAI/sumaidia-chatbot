#!/bin/bash
set -e

# ============================================
# PR Safety Check Script
# ============================================
# Checks if a PR contains any required avatar files
# and adds 'do-not-merge' label if needed
# ============================================

# Required 30 files that must not be deleted
REQUIRED_FILES=(
  # Existing 10
  "logo/smaichan.png"
  "logo/smaichan_happy.png"
  "logo/smaichan_excited.png"
  "logo/smaichan_surprised.png"
  "logo/smaichan_confused.png"
  "logo/smaichan_thinking.png"
  "logo/smaichan_sleepy.png"
  "logo/smaichan_wink.png"
  "logo/smaichan_shy.png"
  "logo/smaichan_motivated.png"
  # New 20
  "logo/smaichan_laughing.png"
  "logo/smaichan_cool.png"
  "logo/smaichan_angry.png"
  "logo/smaichan_sad.png"
  "logo/smaichan_love.png"
  "logo/smaichan_star_eyes.png"
  "logo/smaichan_peace.png"
  "logo/smaichan_determined.png"
  "logo/smaichan_playful.png"
  "logo/smaichan_worried.png"
  "logo/smaichan_proud.png"
  "logo/smaichan_curious.png"
  "logo/smaichan_grateful.png"
  "logo/smaichan_confident.png"
  "logo/smaichan_focused.png"
  "logo/smaichan_embarrassed.png"
  "logo/smaichan_relaxed.png"
  "logo/smaichan_mischievous.png"
  "logo/smaichan_supportive.png"
  "logo/smaichan_sparkle.png"
)

# Load GitHub token
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN not set"
  exit 1
fi

# Check PR
PR_NUMBER="${1:-}"
if [ -z "$PR_NUMBER" ]; then
  echo "Usage: $0 <PR_NUMBER>"
  exit 1
fi

echo "🔍 Checking PR #$PR_NUMBER for required file deletions..."
echo ""

# Get PR files
PR_FILES=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/HaruIroAI/sumaidia-chatbot/pulls/$PR_NUMBER/files" | \
  grep '"filename"' | cut -d'"' -f4)

# Check for required files
FOUND_REQUIRED=false
VIOLATIONS=()

for file in $PR_FILES; do
  for required in "${REQUIRED_FILES[@]}"; do
    if [ "$file" = "$required" ]; then
      FOUND_REQUIRED=true
      VIOLATIONS+=("$file")
    fi
  done
done

if [ "$FOUND_REQUIRED" = true ]; then
  echo "❌ PR contains required files that must not be deleted:"
  for v in "${VIOLATIONS[@]}"; do
    echo "  - $v"
  done
  echo ""
  echo "⚠️  Adding 'do-not-merge' label..."
  
  # Add label via API
  curl -s -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/HaruIroAI/sumaidia-chatbot/issues/$PR_NUMBER/labels" \
    -d '["do-not-merge"]' > /dev/null
  
  echo "✅ Label added"
  exit 1
else
  echo "✅ PR is safe - no required files being deleted"
  echo ""
  echo "Files in PR:"
  echo "$PR_FILES" | while read f; do
    if [[ "$f" == logo/* ]]; then
      echo "  - $f"
    fi
  done
fi