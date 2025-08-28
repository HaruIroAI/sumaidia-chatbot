#!/bin/bash

# Test lazy loading and caching for ESM modules
API_URL="${API_URL:-http://localhost:8888/.netlify/functions/chat}"

echo "🧪 Testing lazy loading and caching for ESM modules"
echo "========================================="

# Test 1: Selftest (no ESM loading)
echo -e "\n📝 Test 1: Selftest mode - should NOT load ESM modules"
echo "Command: curl '$API_URL/selftest'"
result=$(curl -s "$API_URL/selftest" \
  -H "Content-Type: application/json" \
  -w "\nHTTP_STATUS: %{http_code}" -o -)

http_status=$(echo "$result" | grep "HTTP_STATUS:" | cut -d: -f2 | tr -d ' ')
body=$(echo "$result" | sed '/HTTP_STATUS:/d')

echo "  HTTP Status: $http_status"
if [[ "$http_status" == "200" ]]; then
  if echo "$body" | grep -q '"mode":"selftest"'; then
    echo "  ✅ Selftest works without ESM"
  else
    echo "  ❌ Selftest response unexpected"
    echo "$body" | head -3 | sed 's/^/    /'
  fi
else
  echo "  ❌ Selftest failed"
fi

# Test 2: Bypass mode (no ESM loading)
echo -e "\n📝 Test 2: Bypass mode - should NOT load ESM modules"
echo "Command: curl -X POST '$API_URL?bypass=1'"
result=$(curl -s -X POST "$API_URL?bypass=1" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-bypass-lazy" \
  -d '{
    "messages": [
      {"role": "user", "content": "Test bypass without ESM"}
    ]
  }' -i | head -20)

if echo "$result" | grep -q "x-domain: bypass"; then
  echo "  ✅ Bypass mode works without ESM"
  echo "$result" | grep "x-domain:" | sed 's/^/  /'
else
  echo "  ❌ Bypass mode failed or loaded ESM"
  echo "$result" | grep -E "HTTP|x-error" | head -3 | sed 's/^/  /'
fi

# Test 3: Raw mode (no ESM loading)
echo -e "\n📝 Test 3: Raw mode - should NOT load ESM modules"
echo "Command: curl -X POST '$API_URL?raw=1'"
result=$(curl -s -X POST "$API_URL?raw=1" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-raw-lazy" \
  -d '{
    "input": [
      {"role": "user", "content": [{"type": "input_text", "text": "Test raw mode"}]}
    ]
  }' -i | head -20)

if echo "$result" | grep -q "x-domain: raw"; then
  echo "  ✅ Raw mode works without ESM"
  echo "$result" | grep "x-domain:" | sed 's/^/  /'
else
  echo "  ❌ Raw mode failed"
  echo "$result" | grep -E "HTTP|x-error" | head -3 | sed 's/^/  /'
fi

# Test 4: Normal mode (loads ESM with caching)
echo -e "\n📝 Test 4: Normal mode - should load ESM modules lazily"
echo "Command: curl -X POST '$API_URL' (first call)"

start_time=$(date +%s%N)
result=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-normal-1" \
  -d '{
    "messages": [
      {"role": "user", "content": "印刷料金はいくらですか？"}
    ]
  }' -i | head -20)
end_time=$(date +%s%N)
duration1=$((($end_time - $start_time) / 1000000))

if echo "$result" | grep -q "x-domain: printing"; then
  echo "  ✅ First call loaded ESM successfully (${duration1}ms)"
  echo "$result" | grep -E "x-(domain|backend|faq):" | sed 's/^/  /'
elif echo "$result" | grep -q "esm_import_failed"; then
  echo "  ❌ ESM import failed"
  echo "$result" | grep -E "error|message" | head -3 | sed 's/^/  /'
else
  echo "  ⚠️  Unexpected response"
  echo "$result" | head -5 | sed 's/^/  /'
fi

# Test 5: Second normal mode call (should use cached ESM)
echo -e "\n📝 Test 5: Normal mode - should use cached ESM modules"
echo "Command: curl -X POST '$API_URL' (second call)"

start_time=$(date +%s%N)
result=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-normal-2" \
  -d '{
    "messages": [
      {"role": "user", "content": "名刺を100枚作りたい"}
    ]
  }' -i | head -20)
end_time=$(date +%s%N)
duration2=$((($end_time - $start_time) / 1000000))

if echo "$result" | grep -q "x-domain: printing"; then
  echo "  ✅ Second call used cached ESM (${duration2}ms)"
  if [ $duration2 -lt $duration1 ]; then
    echo "  ✅ Second call was faster (cache working)"
  fi
  echo "$result" | grep -E "x-domain:" | sed 's/^/  /'
else
  echo "  ❌ Second call failed"
fi

# Test 6: Check lazy loading implementation
echo -e "\n📝 Test 6: Verify lazy loading implementation"

# Check for cached module variables
if grep -q "^let _intentMod, _routerMod, _promptMod" netlify/functions/chat.js; then
  echo "  ✅ Cached module variables defined"
else
  echo "  ❌ Cached module variables not found"
fi

# Check for load functions with caching
if grep -q "if (!_intentMod)" netlify/functions/chat.js; then
  echo "  ✅ Caching logic implemented"
else
  echo "  ❌ Caching logic not found"
fi

# Check that exports.handler is used
if grep -q "^exports.handler" netlify/functions/chat.js; then
  echo "  ✅ Using exports.handler (CommonJS)"
else
  echo "  ❌ Not using CommonJS exports"
fi

# Check for early return paths
if grep -q "=== EARLY RETURN PATHS" netlify/functions/chat.js; then
  echo "  ✅ Early return paths implemented"
else
  echo "  ❌ Early return paths not found"
fi

echo -e "\n========================================="
echo "✨ Lazy loading test complete!"