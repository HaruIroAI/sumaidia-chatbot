#!/bin/bash

# Verify ESM loader implementation
echo "🧪 ESM Loader Implementation Verification"
echo "========================================="

# Test 1: Check for pathToFileURL
echo -e "\n📝 Test 1: pathToFileURL implementation"
if grep -q "const { pathToFileURL } = require('url')" netlify/functions/chat.js; then
  echo "✅ Using pathToFileURL from url module"
else
  echo "❌ Not using pathToFileURL"
fi

# Test 2: Check fileUrlFromRoot function
echo -e "\n📝 Test 2: fileUrlFromRoot function"
if grep -q "function fileUrlFromRoot(rel)" netlify/functions/chat.js; then
  echo "✅ fileUrlFromRoot function defined"
  grep "LAMBDA_TASK_ROOT || __dirname" netlify/functions/chat.js | head -1 | sed 's/^/  /'
else
  echo "❌ fileUrlFromRoot not found"
fi

# Test 3: Check loader functions
echo -e "\n📝 Test 3: Loader functions"
for loader in loadIntent loadRouter loadPrompt; do
  if grep -q "async function $loader()" netlify/functions/chat.js; then
    echo "✅ $loader function present"
  else
    echo "❌ $loader function missing"
  fi
done

# Test 4: Verify no relative paths
echo -e "\n📝 Test 4: No relative paths (../../)"
REL_COUNT=$(grep -c "\.\./\.\." netlify/functions/chat.js 2>/dev/null || echo 0)
if [ "$REL_COUNT" -eq "0" ]; then
  echo "✅ No relative paths found"
else
  echo "❌ Found $REL_COUNT relative path(s)"
  grep "\.\./\.\." netlify/functions/chat.js | head -3
fi

# Test 5: Check src/ paths
echo -e "\n📝 Test 5: Using src/ paths"
echo "Import statements:"
grep "fileUrlFromRoot('src/" netlify/functions/chat.js | sed 's/^/  /'

# Test 6: Check caching variables
echo -e "\n📝 Test 6: Module caching"
if grep -q "let _intentMod, _routerMod, _promptMod;" netlify/functions/chat.js; then
  echo "✅ Cache variables declared"
else
  echo "❌ Cache variables not found"
fi

# Test 7: Verify import statements are wrapped
echo -e "\n📝 Test 7: Conditional loading"
if grep -q "if (!_intentMod)" netlify/functions/chat.js; then
  echo "✅ Conditional loading implemented"
else
  echo "❌ No conditional loading"
fi

echo -e "\n========================================="
echo "✨ ESM Loader verification complete!"