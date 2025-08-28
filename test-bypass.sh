#!/bin/bash

# Test bypass and debug modes
API_URL="${API_URL:-http://localhost:8888/.netlify/functions/chat}"

echo "🧪 Testing chat.js bypass and debug modes"
echo "========================================="

# Test 1: Bypass mode
echo -e "\n📝 Test 1: Bypass mode (?bypass=1)"
echo "Command: curl -X POST '$API_URL?bypass=1'"
curl -s -X POST "$API_URL?bypass=1" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-bypass" \
  -d '{
    "messages": [
      {"role": "user", "content": "印刷の料金を教えて"}
    ]
  }' \
  -i | head -30 | grep -E "HTTP|x-(domain|backend|error):" | sed 's/^/  /'

# Test 2: Debug mode
echo -e "\n📝 Test 2: Debug mode (?debug=1)"
echo "Command: curl -X POST '$API_URL?debug=1'"
result=$(curl -s -X POST "$API_URL?debug=1" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-debug" \
  -d '{
    "messages": [
      {"role": "user", "content": "名刺を100枚作りたい"}
    ]
  }')

# Pretty print debug response
echo "$result" | python3 -c "import sys, json; data = json.load(sys.stdin); print('  ok:', data.get('ok')); print('  openai.status:', data.get('openai', {}).get('status')); print('  openai.first_item_type:', data.get('openai', {}).get('first_item_type')); print('  response.domain:', data.get('response', {}).get('domain'));"

# Test 3: Normal mode with FAQ
echo -e "\n📝 Test 3: Normal mode with FAQ match"
echo "Command: curl -X POST '$API_URL'"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-normal" \
  -d '{
    "messages": [
      {"role": "user", "content": "印刷料金はいくらですか？"}
    ]
  }' \
  -i | head -20 | grep -E "HTTP|x-(domain|backend|faq):" | sed 's/^/  /'

# Test 4: Empty output handling
echo -e "\n📝 Test 4: Empty output (force 502)"
echo "Command: curl -X POST '$API_URL' with max_output_tokens=1"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-empty" \
  -d '{
    "messages": [
      {"role": "user", "content": ""}
    ],
    "max_output_tokens": 1
  }' \
  -i | head -25 | grep -E "HTTP|x-error|error.*empty" | sed 's/^/  /'

echo -e "\n========================================="
echo "✅ Tests complete!"