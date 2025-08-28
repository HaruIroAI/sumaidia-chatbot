#!/bin/bash

# Final sanitization test
echo "🧪 Final Sanitization & ESM Import Test"
echo "========================================"

# Test 1: Check pathToFileURL implementation
echo -e "\n📝 Test 1: pathToFileURL ESM loader"
if grep -q "pathToFileURL" netlify/functions/chat.js; then
  echo "✅ Using pathToFileURL for ESM imports"
  grep "fileUrlFromRoot" netlify/functions/chat.js | head -3 | sed 's/^/  /'
else
  echo "❌ Not using pathToFileURL"
fi

# Test 2: Check LAMBDA_TASK_ROOT usage
echo -e "\n📝 Test 2: LAMBDA_TASK_ROOT handling"
if grep -q "LAMBDA_TASK_ROOT" netlify/functions/chat.js; then
  echo "✅ Using LAMBDA_TASK_ROOT for Netlify"
  grep "LAMBDA_TASK_ROOT" netlify/functions/chat.js | head -1 | sed 's/^/  /'
else
  echo "❌ Not using LAMBDA_TASK_ROOT"
fi

# Test 3: Verify sanitizer is in place
echo -e "\n📝 Test 3: Sanitization functions"
if grep -q "function sanitizePayload" netlify/functions/chat.js; then
  echo "✅ sanitizePayload function present"
else
  echo "❌ sanitizePayload not found"
fi

if grep -q "function toResponsesPayload" netlify/functions/chat.js; then
  echo "✅ toResponsesPayload function present"
else
  echo "❌ toResponsesPayload not found"
fi

# Test 4: Check all paths use toResponsesPayload
echo -e "\n📝 Test 4: Unified payload creation"
PAYLOAD_COUNT=$(grep -c "const payload = toResponsesPayload(" netlify/functions/chat.js)
if [ "$PAYLOAD_COUNT" -ge "1" ]; then
  echo "✅ Using toResponsesPayload for payload creation ($PAYLOAD_COUNT occurrence(s))"
else
  echo "❌ Not using toResponsesPayload consistently"
fi

# Test 5: Verify no direct temperature usage
echo -e "\n📝 Test 5: No banned parameters in payload"
TEMP_COUNT=$(grep -c "temperature:" netlify/functions/chat.js | grep -v "BANNED_KEYS" | wc -l)
if [ "$TEMP_COUNT" -eq "0" ]; then
  echo "✅ No temperature in payload creation"
else
  echo "❌ Found temperature in payload"
fi

# Test 6: Check src/ paths (not ../../src/)
echo -e "\n📝 Test 6: ESM import paths"
if grep -q "fileUrlFromRoot('src/" netlify/functions/chat.js; then
  echo "✅ Using src/ paths (not relative ../../)"
  grep "fileUrlFromRoot('src/" netlify/functions/chat.js | head -3 | sed 's/^/  /'
else
  echo "❌ Not using correct src/ paths"
fi

# Test 7: Verify selftest.js is clean
echo -e "\n📝 Test 7: selftest.js cleanliness"
SELFTEST_BANNED=$(grep -c "temperature\|top_p\|frequency_penalty" netlify/functions/selftest.js | grep -v "IMPORTANT" | wc -l)
if [ "$SELFTEST_BANNED" -eq "0" ]; then
  echo "✅ selftest.js has no banned parameters"
else
  echo "❌ selftest.js contains banned parameters"
fi

echo -e "\n========================================"
echo "✨ Test complete!"