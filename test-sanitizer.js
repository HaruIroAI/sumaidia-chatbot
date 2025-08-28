// Browser test suite for sanitized payload
// Copy and paste into browser DevTools console

console.log('🧪 Testing sanitized OpenAI payloads...\n');

// Test A: raw=1 → "pong"
console.log('📝 Test A: raw=1 → "pong"');
fetch('/.netlify/functions/chat?raw=1', {
  method: 'POST',
  headers: {'content-type': 'application/json'},
  body: JSON.stringify({
    input: [
      {role: 'system', content: [{type: 'input_text', text: '「pong」と1語だけ返す'}]},
      {role: 'user', content: [{type: 'input_text', text: 'ping'}]}
    ],
    max_output_tokens: 16
  })
}).then(async r => {
  const text = await r.text();
  try {
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    if (content === 'pong') {
      console.log('✅ Test A passed: received "pong"');
    } else {
      console.error('❌ Test A failed: expected "pong", got:', content);
    }
    console.log('  Status:', r.status);
    console.log('  Content:', content);
  } catch (e) {
    console.error('❌ Test A failed: invalid JSON or error', r.status, text);
  }
}).catch(e => console.error('❌ Test A failed:', e));

// Test B: selftest → ok:true
setTimeout(() => {
  console.log('\n📝 Test B: selftest → {ok:true, expected:"pong", sample:"pong"}');
  fetch('/.netlify/functions/selftest')
    .then(r => r.json())
    .then(data => {
      if (data.ok === true && data.expected === 'pong' && data.sample === 'pong') {
        console.log('✅ Test B passed:', data);
      } else {
        console.error('❌ Test B failed:', data);
      }
    }).catch(e => console.error('❌ Test B failed:', e));
}, 2000);

// Test C: Normal chat (should not return error message)
setTimeout(() => {
  console.log('\n📝 Test C: Normal chat (should not return error)');
  fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({ 
      messages: [{role: 'user', content: '名刺を100部作りたい'}]
    })
  }).then(async r => {
    const text = await r.text();
    try {
      const data = JSON.parse(text);
      const content = data?.choices?.[0]?.message?.content || '';
      
      // Check for error message
      const hasError = content.includes('暫定エラー') || 
                       content.includes('応答テキストが取得できませんでした') ||
                       content === '';
      
      if (!hasError && content.length > 0) {
        console.log('✅ Test C passed');
        console.log('  Status:', r.status);
        console.log('  Content length:', content.length);
        console.log('  Content preview:', content.substring(0, 100) + '...');
      } else {
        console.error('❌ Test C failed');
        console.log('  Status:', r.status);
        console.log('  Content:', content);
      }
    } catch (e) {
      console.error('❌ Test C failed: invalid JSON', r.status, text);
    }
  }).catch(e => console.error('❌ Test C failed:', e));
}, 4000);

// Test D: Check network payload (manual verification)
setTimeout(() => {
  console.log('\n📝 Test D: Check Network tab for banned parameters');
  console.log('  1. Open DevTools Network tab');
  console.log('  2. Look for "chat" requests');
  console.log('  3. Check Request Payload');
  console.log('  4. Verify NO temperature, top_p, frequency_penalty, presence_penalty');
  console.log('  5. Verify ONLY: model, input, max_output_tokens, text, reasoning');
}, 6000);

console.log('\n⏳ Tests will complete in ~6 seconds...');