// Deploy Preview Test Suite
// Copy and paste into browser DevTools console on Deploy Preview

console.log('🧪 Deploy Preview Test Suite\n');
console.log('Starting 4 tests...\n');

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
      console.log('✅ Test A PASSED: received "pong"');
    } else {
      console.error('❌ Test A FAILED: expected "pong", got:', content);
    }
  } catch (e) {
    console.error('❌ Test A FAILED:', e.message);
  }
}).catch(e => console.error('❌ Test A ERROR:', e));

// Test B: selftest → ok:true
setTimeout(() => {
  console.log('\n📝 Test B: selftest → ok:true');
  fetch('/.netlify/functions/selftest')
    .then(r => r.json())
    .then(data => {
      if (data.ok === true && data.expected === 'pong' && data.sample === 'pong') {
        console.log('✅ Test B PASSED:', data);
      } else {
        console.error('❌ Test B FAILED:', data);
      }
    }).catch(e => console.error('❌ Test B ERROR:', e));
}, 2000);

// Test C: Normal chat (meaningful content)
setTimeout(() => {
  console.log('\n📝 Test C: Normal chat (should return meaningful content)');
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
      
      // Check for error messages
      const hasError = content.includes('暫定エラー') || 
                       content.includes('応答テキストが取得できませんでした') ||
                       content === '';
      
      if (!hasError && content.length > 0) {
        console.log('✅ Test C PASSED');
        console.log('  Content preview:', content.substring(0, 80) + '...');
      } else {
        console.error('❌ Test C FAILED: empty or error content');
        console.log('  Content:', content);
      }
    } catch (e) {
      console.error('❌ Test C FAILED:', e.message);
    }
  }).catch(e => console.error('❌ Test C ERROR:', e));
}, 4000);

// Test D: Debug mode - verify no banned keys
setTimeout(() => {
  console.log('\n📝 Test D: Debug mode (verify no banned keys)');
  fetch('/.netlify/functions/chat?raw=1&debug=1', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      input: [
        {role: 'system', content: [{type: 'input_text', text: '「pong」と1語だけ返す'}]},
        {role: 'user', content: [{type: 'input_text', text: 'ping'}]}
      ],
      max_output_tokens: 16
    })
  }).then(r => r.json())
    .then(data => {
      const payloadKeys = data.payload_keys || data.debug?.payload_keys || [];
      console.log('  payload_keys:', payloadKeys);
      
      const bannedKeys = ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'stop', 'seed', 'response_format'];
      const foundBanned = bannedKeys.filter(k => payloadKeys.includes(k));
      
      if (foundBanned.length === 0) {
        console.log('✅ Test D PASSED: No banned keys found');
      } else {
        console.error('❌ Test D FAILED: Found banned keys:', foundBanned);
      }
    }).catch(e => console.error('❌ Test D ERROR:', e));
}, 6000);

console.log('\n⏳ Tests will complete in ~7 seconds...');
console.log('📌 Check results above for PASS/FAIL status');

// Summary after all tests
setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test Suite Complete!');
  console.log('Check results above. All tests should show ✅ PASSED');
  console.log('='.repeat(50));
}, 8000);