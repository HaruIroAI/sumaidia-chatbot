#!/bin/bash

# Quick verification script for chat.js changes
# Usage: ./scripts/verify-chat.sh

API_URL="${API_URL:-http://localhost:8888/.netlify/functions/chat}"
SESSION_ID="verify-$(date +%s)"

echo "🔍 Verifying chat.js implementation"
echo "API URL: $API_URL"
echo "========================================="

# Test 1: FAQ match
echo -e "\n📝 Test 1: FAQ Match (should use FAQ backend)"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-session-id: $SESSION_ID-1" \
  -d '{
    "messages": [
      {"role": "user", "content": "印刷料金はいくらですか？"}
    ]
  }' \
  -i | grep -E "x-(domain|backend|faq-match):" | sed 's/^/  /'

# Test 2: Normal routing
echo -e "\n📝 Test 2: Normal Routing (should classify domain)"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-session-id: $SESSION_ID-2" \
  -d '{
    "messages": [
      {"role": "user", "content": "名刺を100枚作りたいです"}
    ]
  }' \
  -i | grep -E "x-(domain|backend):" | sed 's/^/  /'

# Test 3: Raw mode
echo -e "\n📝 Test 3: Raw Mode (should have x-domain=unknown)"
curl -s -X POST "$API_URL?raw=1" \
  -H "Content-Type: application/json" \
  -H "x-session-id: $SESSION_ID-3" \
  -d '{
    "input": [
      {"role": "user", "content": [{"type": "input_text", "text": "Test raw mode"}]}
    ]
  }' \
  -i | grep -E "x-(domain|backend):" | sed 's/^/  /'

# Test 4: Check toResponsesInputFromMessages
echo -e "\n📝 Test 4: Checking helper function presence"
grep -q "toResponsesInputFromMessages" netlify/functions/chat.js && \
  echo "  ✅ toResponsesInputFromMessages found" || \
  echo "  ❌ toResponsesInputFromMessages NOT found"

# Test 5: Check headers initialization
echo -e "\n📝 Test 5: Checking early headers initialization"
grep -q "Initialize common headers" netlify/functions/chat.js && \
  echo "  ✅ Early headers initialization found" || \
  echo "  ❌ Early headers initialization NOT found"

# Test 6: Check withRetry
echo -e "\n📝 Test 6: Checking retry logic"
grep -q "withRetry" netlify/functions/chat.js && \
  echo "  ✅ withRetry function found" || \
  echo "  ❌ withRetry function NOT found"

# Test 7: Check 502 for empty output
echo -e "\n📝 Test 7: Checking 502 for empty output"
grep -q "statusCode: 502" netlify/functions/chat.js && \
  echo "  ✅ 502 status for empty output found" || \
  echo "  ❌ 502 status NOT found"

echo -e "\n========================================="
echo "✨ Verification complete!"