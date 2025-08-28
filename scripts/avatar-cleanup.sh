#!/bin/bash
set -e

echo "🔍 Avatar PNG Cleanup Analysis"
echo "=================================="
echo ""

# Required 20 files
REQUIRED_FILES=(
  "smaichan_laughing.png"
  "smaichan_cool.png"
  "smaichan_angry.png"
  "smaichan_sad.png"
  "smaichan_love.png"
  "smaichan_star_eyes.png"
  "smaichan_peace.png"
  "smaichan_determined.png"
  "smaichan_playful.png"
  "smaichan_worried.png"
  "smaichan_proud.png"
  "smaichan_curious.png"
  "smaichan_grateful.png"
  "smaichan_confident.png"
  "smaichan_focused.png"
  "smaichan_embarrassed.png"
  "smaichan_relaxed.png"
  "smaichan_mischievous.png"
  "smaichan_supportive.png"
  "smaichan_sparkle.png"
)

# Check current state
echo "📂 Current files in logo/:"
ls logo/*.png 2>/dev/null | xargs -n1 basename | sort
echo ""

# Find missing required files
echo "❌ Missing required files:"
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "logo/$file" ]; then
    echo "  - $file"
  fi
done
echo ""

# Find extra files not in required list
echo "🗑️  Files to remove (not in required list):"
for file in logo/*.png; do
  filename=$(basename "$file")
  is_required=false
  
  for required in "${REQUIRED_FILES[@]}"; do
    if [ "$filename" = "$required" ]; then
      is_required=true
      break
    fi
  done
  
  if [ "$is_required" = false ]; then
    echo "  - $filename"
  fi
done
echo ""

# Find ChatGPT named files specifically
echo "🗑️  ChatGPT Image files to remove:"
ls -1 logo/ | grep -i "ChatGPT" || echo "  (none found)"
echo ""

# Summary
echo "📊 Summary:"
echo "  Required files: 20"
echo "  Current PNG files: $(ls logo/*.png 2>/dev/null | wc -l | xargs)"
echo "  Missing required: $(for f in "${REQUIRED_FILES[@]}"; do [ ! -f "logo/$f" ] && echo 1; done | wc -l | xargs)"
echo ""