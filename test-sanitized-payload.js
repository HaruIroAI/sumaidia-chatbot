// Browser test for sanitized payload with debug mode
// Copy and paste into browser DevTools console

console.log('🧪 Testing sanitized payload enforcement...\n');

// Test A: raw=1 with debug to see payload_keys
console.log('📝 Test A: raw=1 with debug (check payload_keys)');
fetch('/.netlify/functions/chat?raw=1&debug=1', {
  method: 'POST',
  headers: {'content-type': 'application/json'},
  body: JSON.stringify({
    input: [
      {role: 'system', content: [{type: 'input_text', text: '「pong」と1語だけ返す'}]},
      {role: 'user', content: [{type: 'input_text', text: 'ping'}]}
    ],
    max_output_tokens: 16,
    // Try to inject banned params (should be stripped)
    temperature: 0.9,
    top_p: 0.95,
    frequency_penalty: 0.5
  })
}).then(async r => {
  const hasXSanitized = r.headers.get('x-sanitized') === '1';
  const text = await r.text();
  try {
    const data = JSON.parse(text);
    console.log('  Status:', r.status);
    console.log('  x-sanitized header:', hasXSanitized ? '✅' : '❌');
    console.log('  Payload keys:', data.payload_keys);
    
    // Check if banned keys are absent
    const hasBannedKeys = data.payload_keys?.some(k => 
      ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty'].includes(k)
    );
    
    if (!hasBannedKeys && data.payload_keys) {
      console.log('  ✅ No banned keys in payload');
    } else if (hasBannedKeys) {
      console.error('  ❌ Found banned keys!', data.payload_keys);
    }
    
    console.log('  Response sanitized:', data.response?.sanitized ? '✅' : '❌');
  } catch (e) {
    console.error('  Parse error:', e);
  }
}).catch(e => console.error('❌ Test A failed:', e));

// Test B: Normal mode with debug
setTimeout(() => {
  console.log('\n📝 Test B: Normal mode with debug');
  fetch('/.netlify/functions/chat?debug=1', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      messages: [{role: 'user', content: 'テスト'}],
      // Try to inject banned params
      temperature: 1.0,
      response_format: { type: 'json' }
    })
  }).then(async r => {
    const text = await r.text();
    try {
      const data = JSON.parse(text);
      console.log('  Payload keys:', data.payload_keys);
      console.log('  Has temperature?', data.payload_keys?.includes('temperature') ? '❌ YES' : '✅ NO');
      console.log('  Has response_format?', data.payload_keys?.includes('response_format') ? '❌ YES' : '✅ NO');
      console.log('  x-sanitized:', r.headers.get('x-sanitized') === '1' ? '✅' : '❌');
    } catch (e) {
      console.error('  Parse error:', e);
    }
  }).catch(e => console.error('❌ Test B failed:', e));
}, 2000);

// Test C: Bypass mode 
setTimeout(() => {
  console.log('\n📝 Test C: Bypass mode (should also be sanitized)');
  fetch('/.netlify/functions/chat?bypass=1', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      messages: [{role: 'user', content: 'bypass test'}],
      temperature: 0.7  // Should be stripped
    })
  }).then(async r => {
    const text = await r.text();
    console.log('  Status:', r.status);
    console.log('  x-domain:', r.headers.get('x-domain'));
    
    // Check Network tab to verify no temperature in request
    console.log('  ⚠️  Check Network tab > chat request > Payload');
    console.log('      Should NOT contain temperature/top_p/etc');
  }).catch(e => console.error('❌ Test C failed:', e));
}, 4000);

console.log('\n⏳ Tests will complete in ~5 seconds...');
console.log('📌 IMPORTANT: Check Network tab for actual payloads sent to OpenAI');