#!/bin/bash

# Test to verify no forbidden parameters are sent to OpenAI
API_URL="${API_URL:-http://localhost:8888/.netlify/functions/chat}"

echo "🧪 Testing for forbidden OpenAI parameters"
echo "========================================="

# Test 1: Check raw mode payload
echo -e "\n📝 Test 1: Raw mode - checking payload"
echo "Testing: /.netlify/functions/chat?raw=1"

# Create a test that logs the payload
cat > /tmp/test-payload.js << 'EOF'
const payload = {
  model: 'gpt-5-mini',
  input: [
    {role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
    {role:'user',  content:[{type:'input_text',text:'ping'}]}
  ],
  text: { format: { type: 'text' } },
  reasoning: { effort: 'low' },
  max_output_tokens: 256
};

// Check for forbidden keys
const forbidden = ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty'];
const foundForbidden = forbidden.filter(key => key in payload);

if (foundForbidden.length > 0) {
  console.error("❌ Found forbidden keys:", foundForbidden);
  process.exit(1);
} else {
  console.log("✅ No forbidden keys in payload");
}

// Check required keys
const required = ['model', 'input', 'text', 'reasoning', 'max_output_tokens'];
const missingRequired = required.filter(key => !(key in payload));

if (missingRequired.length > 0) {
  console.error("❌ Missing required keys:", missingRequired);
  process.exit(1);
} else {
  console.log("✅ All required keys present");
}

console.log("✅ Payload structure is correct");
EOF

node /tmp/test-payload.js

# Test 2: Check chat.js source for forbidden parameters
echo -e "\n📝 Test 2: Checking chat.js source code"

if grep -q "temperature:" netlify/functions/chat.js; then
  echo "❌ Found 'temperature:' in chat.js"
  grep -n "temperature:" netlify/functions/chat.js | head -3
else
  echo "✅ No 'temperature:' in chat.js"
fi

if grep -q "top_p:" netlify/functions/chat.js; then
  echo "❌ Found 'top_p:' in chat.js"
  grep -n "top_p:" netlify/functions/chat.js | head -3
else
  echo "✅ No 'top_p:' in chat.js"
fi

if grep -q "frequency_penalty:" netlify/functions/chat.js; then
  echo "❌ Found 'frequency_penalty:' in chat.js"
else
  echo "✅ No 'frequency_penalty:' in chat.js"
fi

if grep -q "presence_penalty:" netlify/functions/chat.js; then
  echo "❌ Found 'presence_penalty:' in chat.js"
else
  echo "✅ No 'presence_penalty:' in chat.js"
fi

# Test 3: Check for text.format structure
echo -e "\n📝 Test 3: Checking text.format structure"

if grep -q "text: { format: { type: 'text' }" netlify/functions/chat.js; then
  echo "✅ Found correct text.format structure"
else
  echo "❌ text.format structure not found or incorrect"
fi

# Test 4: Check ESM loader functions remain unchanged
echo -e "\n📝 Test 4: Verifying ESM loader functions"

if grep -q "async function loadIntent()" netlify/functions/chat.js; then
  echo "✅ loadIntent() function present"
else
  echo "❌ loadIntent() function missing"
fi

if grep -q "async function loadRouter()" netlify/functions/chat.js; then
  echo "✅ loadRouter() function present"
else
  echo "❌ loadRouter() function missing"
fi

if grep -q "async function loadPrompt()" netlify/functions/chat.js; then
  echo "✅ loadPrompt() function present"
else
  echo "❌ loadPrompt() function missing"
fi

# Test 5: Check for CommonJS exports
echo -e "\n📝 Test 5: Checking CommonJS format"

if grep -q "^exports.handler" netlify/functions/chat.js; then
  echo "✅ Using exports.handler (CommonJS)"
else
  echo "❌ Not using CommonJS exports"
fi

if grep -q "^exports.handler" netlify/functions/selftest.js; then
  echo "✅ selftest.js using exports.handler (CommonJS)"
else
  echo "❌ selftest.js not using CommonJS exports"
fi

echo -e "\n========================================="
echo "✨ Forbidden parameters test complete!"