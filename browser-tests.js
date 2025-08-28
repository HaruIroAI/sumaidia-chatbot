// Browser test suite for Netlify Functions
// Copy and paste into browser DevTools console

console.log('🧪 Starting browser tests...\n');

// Test A: raw=1 "pong" test
console.log('📝 Test A: raw=1 "pong" test');
fetch('/.netlify/functions/chat?raw=1', {
  method:'POST', 
  headers:{'content-type':'application/json'},
  body: JSON.stringify({
    input:[
      {role:'system',content:[{type:'input_text',text:'「pong」と1語だけ返す'}]},
      {role:'user',  content:[{type:'input_text',text:'ping'}]}
    ],
    max_output_tokens:16
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
    console.log('Response:', data);
  } catch (e) {
    console.error('❌ Test A failed: invalid JSON', text);
  }
}).catch(e => console.error('❌ Test A failed:', e));

// Test B: selftest endpoint
setTimeout(() => {
  console.log('\n📝 Test B: selftest endpoint');
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

// Test C: Normal mode (router)
setTimeout(() => {
  console.log('\n📝 Test C: Normal mode (router)');
  fetch('/.netlify/functions/chat', {
    method:'POST', 
    headers:{'content-type':'application/json'},
    body: JSON.stringify({ 
      messages:[{role:'user',content:'名刺を100部作りたい（今日中の特急希望）'}] 
    })
  }).then(async r => {
    const domain = r.headers.get('x-domain');
    const model = r.headers.get('x-model');
    const commit = r.headers.get('x-commit');
    
    console.log('Headers:');
    console.log('  x-domain:', domain);
    console.log('  x-model:', model);
    console.log('  x-commit:', commit);
    
    const text = await r.text();
    try {
      const data = JSON.parse(text);
      const content = data?.choices?.[0]?.message?.content;
      
      if (domain && domain !== 'null' && content && content.length > 0) {
        console.log('✅ Test C passed');
        console.log('  Domain:', domain);
        console.log('  Content length:', content.length);
        console.log('  Content preview:', content.substring(0, 100) + '...');
      } else {
        console.error('❌ Test C failed');
        if (!domain || domain === 'null') console.error('  Missing x-domain header');
        if (!content || content.length === 0) console.error('  Empty content');
      }
    } catch (e) {
      console.error('❌ Test C failed: invalid JSON', text);
    }
  }).catch(e => console.error('❌ Test C failed:', e));
}, 4000);

console.log('\nTests will complete in ~5 seconds...');