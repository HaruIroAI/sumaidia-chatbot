#!/bin/bash

# Verify sanitizer implementation
echo "🧪 Verifying sanitizer implementation"
echo "====================================="

# Test 1: Check BANNED_KEYS list
echo -e "\n📝 Test 1: Checking BANNED_KEYS list"
if grep -q "const BANNED_KEYS = \[" netlify/functions/chat.js; then
  echo "✅ BANNED_KEYS list found"
  grep "BANNED_KEYS = \[" -A 3 netlify/functions/chat.js | sed 's/^/  /'
else
  echo "❌ BANNED_KEYS list not found"
fi

# Test 2: Check sanitizePayload function
echo -e "\n📝 Test 2: Checking sanitizePayload function"
if grep -q "function sanitizePayload" netlify/functions/chat.js; then
  echo "✅ sanitizePayload function found"
else
  echo "❌ sanitizePayload function not found"
fi

# Test 3: Check toResponsesPayload function
echo -e "\n📝 Test 3: Checking toResponsesPayload function"
if grep -q "function toResponsesPayload" netlify/functions/chat.js; then
  echo "✅ toResponsesPayload function found"
  # Verify it caps at 512
  if grep -q "Math.min(512" netlify/functions/chat.js; then
    echo "✅ Max tokens capped at 512"
  else
    echo "❌ Max tokens not properly capped"
  fi
else
  echo "❌ toResponsesPayload function not found"
fi

# Test 4: Check payload creation uses toResponsesPayload
echo -e "\n📝 Test 4: Checking payload creation"
if grep -q "const payload = toResponsesPayload(" netlify/functions/chat.js; then
  echo "✅ Using toResponsesPayload for payload creation"
else
  echo "❌ Not using toResponsesPayload"
fi

# Test 5: Check for any remaining temperature references
echo -e "\n📝 Test 5: Checking for banned parameters"
BANNED_COUNT=$(grep -c "temperature:" netlify/functions/chat.js 2>/dev/null || echo 0)
if [ "$BANNED_COUNT" -eq "0" ]; then
  echo "✅ No temperature: in payload"
else
  echo "❌ Found temperature: in payload ($BANNED_COUNT occurrences)"
fi

# Test 6: Check selftest.js doesn't send banned params
echo -e "\n📝 Test 6: Checking selftest.js"
if grep -q "temperature" netlify/functions/selftest.js 2>/dev/null; then
  if grep -q "// IMPORTANT: No temperature" netlify/functions/selftest.js; then
    echo "✅ selftest.js has warning comment (good)"
  else
    echo "❌ selftest.js contains temperature"
  fi
else
  echo "✅ selftest.js clean of banned params"
fi

# Test 7: Verify required fields are present
echo -e "\n📝 Test 7: Checking required fields in payload"
if grep -q "text: { format: { type: 'text' }" netlify/functions/chat.js; then
  echo "✅ text.format properly set"
else
  echo "❌ text.format not found"
fi

if grep -q "reasoning: { effort: 'low' }" netlify/functions/chat.js; then
  echo "✅ reasoning.effort properly set"
else
  echo "❌ reasoning.effort not found"
fi

echo -e "\n====================================="
echo "✨ Verification complete!"