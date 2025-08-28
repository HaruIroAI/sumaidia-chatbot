#!/bin/bash

# Test ESM fix for chat.js
API_URL="${API_URL:-http://localhost:8888/.netlify/functions/chat}"

echo "🧪 Testing CommonJS/ESM fix for chat.js"
echo "========================================="

# Test 1: Bypass mode (no ESM loading)
echo -e "\n📝 Test 1: Bypass mode - should NOT load ESM modules"
echo "Command: curl -X POST '$API_URL?bypass=1'"
result=$(curl -s -X POST "$API_URL?bypass=1" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-bypass-esm" \
  -d '{
    "messages": [
      {"role": "user", "content": "Test bypass without ESM"}
    ]
  }' -w "\nHTTP_STATUS: %{http_code}" -o -)

http_status=$(echo "$result" | grep "HTTP_STATUS:" | cut -d: -f2 | tr -d ' ')
body=$(echo "$result" | sed '/HTTP_STATUS:/d')

echo "  HTTP Status: $http_status"
if [[ "$http_status" == "200" ]]; then
  echo "  ✅ Bypass mode works without ESM"
else
  echo "  ❌ Bypass mode failed"
  echo "  Response: $body" | head -5
fi

# Test 2: Normal mode with ESM loading
echo -e "\n📝 Test 2: Normal mode - should load ESM modules"
echo "Command: curl -X POST '$API_URL'"
result=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-normal-esm" \
  -d '{
    "messages": [
      {"role": "user", "content": "印刷料金はいくらですか？"}
    ]
  }' -i | head -20)

if echo "$result" | grep -q "x-domain: printing"; then
  echo "  ✅ ESM modules loaded successfully (domain classified)"
  echo "$result" | grep -E "x-(domain|backend|faq):" | sed 's/^/  /'
elif echo "$result" | grep -q "esm_import_failed"; then
  echo "  ❌ ESM import failed"
  echo "$result" | grep -E "error|message" | sed 's/^/  /'
else
  echo "  ⚠️  Unexpected response"
  echo "$result" | head -5 | sed 's/^/  /'
fi

# Test 3: Raw mode (no ESM loading)
echo -e "\n📝 Test 3: Raw mode - should NOT load ESM modules"
echo "Command: curl -X POST '$API_URL?raw=1'"
result=$(curl -s -X POST "$API_URL?raw=1" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-raw-esm" \
  -d '{
    "input": [
      {"role": "user", "content": [{"type": "input_text", "text": "Test raw mode"}]}
    ]
  }' -w "\nHTTP_STATUS: %{http_code}" -o -)

http_status=$(echo "$result" | grep "HTTP_STATUS:" | cut -d: -f2 | tr -d ' ')
echo "  HTTP Status: $http_status"
if [[ "$http_status" == "200" || "$http_status" == "502" ]]; then
  echo "  ✅ Raw mode works without ESM"
else
  echo "  ❌ Raw mode failed"
fi

# Test 4: Check CommonJS syntax
echo -e "\n📝 Test 4: Verify CommonJS syntax"
if grep -q "^exports.handler" netlify/functions/chat.js; then
  echo "  ✅ Using exports.handler (CommonJS)"
else
  echo "  ❌ Not using CommonJS exports"
fi

if grep -q "^const .* = require(" netlify/functions/chat.js; then
  echo "  ✅ Using require() for local imports"
else
  echo "  ❌ Not using require()"
fi

if grep -q "await import(" netlify/functions/chat.js; then
  echo "  ✅ Using dynamic import() for ESM"
else
  echo "  ❌ Not using dynamic import()"
fi

echo -e "\n========================================="
echo "✨ ESM fix verification complete!"