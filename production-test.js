/**
 * Production Environment Test Script
 * Run this in browser console after deployment
 */

// Configuration
const BASE_URL = ''; // Will use current domain
const TESTS = [];

// Test 1: Health Check
TESTS.push({
  name: 'Health Check',
  run: async () => {
    const response = await fetch('/.netlify/functions/selftest');
    const data = await response.json();
    return data.ok === true && data.sample && data.expected === 'pong';
  }
});

// Test 2: Smaichan Greeting
TESTS.push({
  name: 'Smaichan Greeting',
  run: async () => {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'こんにちは！' }]
      })
    });
    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || '';
    return message.includes('はろー') || message.includes('スマイちゃん');
  }
});

// Test 3: Price Inquiry
TESTS.push({
  name: 'Business Card Price',
  run: async () => {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '名刺100枚の値段を教えて' }]
      })
    });
    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || '';
    return message.includes('3,300') || message.includes('円');
  }
});

// Test 4: Delivery Time
TESTS.push({
  name: 'Delivery Time Query',
  run: async () => {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'チラシの納期はどのくらい？' }]
      })
    });
    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || '';
    return message.includes('営業日') || message.includes('納期');
  }
});

// Test 5: Quote Calculation
TESTS.push({
  name: 'Flyer Quote',
  run: async () => {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'A4のチラシ1000枚、カラーでお願いします' }]
      })
    });
    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || '';
    return message.includes('円') && (message.includes('チラシ') || message.includes('フライヤー'));
  }
});

// Test 6: Response Headers
TESTS.push({
  name: 'Response Headers',
  run: async () => {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }]
      })
    });
    const smaichan = response.headers.get('x-smaichan');
    const domain = response.headers.get('x-domain');
    return smaichan === 'enabled' && domain !== null;
  }
});

// Test 7: Session Persistence
TESTS.push({
  name: 'Session Persistence',
  run: async () => {
    const sessionId = 'test-' + Date.now();
    
    // First request
    const response1 = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '名刺を作りたい' }]
      })
    });
    const data1 = await response1.json();
    
    // Second request with same session
    const response2 = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '名刺を作りたい' },
          { role: 'assistant', content: data1.choices[0].message.content },
          { role: 'user', content: '100枚です' }
        ]
      })
    });
    const data2 = await response2.json();
    
    return data2.choices?.[0]?.message?.content !== undefined;
  }
});

// Run all tests
async function runTests() {
  console.log('🚀 Starting Production Tests');
  console.log('============================\n');
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of TESTS) {
    try {
      console.log(`Testing: ${test.name}...`);
      const startTime = Date.now();
      const result = await test.run();
      const duration = Date.now() - startTime;
      
      if (result) {
        console.log(`✅ PASS (${duration}ms)`);
        passed++;
      } else {
        console.log(`❌ FAIL (${duration}ms)`);
        failed++;
      }
      
      results.push({ name: test.name, passed: result, duration });
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
      results.push({ name: test.name, passed: false, error: error.message });
    }
  }
  
  console.log('\n============================');
  console.log('Test Results Summary');
  console.log('============================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${Math.round(passed / TESTS.length * 100)}%`);
  
  // Performance summary
  const avgDuration = results
    .filter(r => r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.duration).length;
  console.log(`⏱️  Average Response Time: ${Math.round(avgDuration)}ms`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Deployment successful!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the deployment.');
    console.log('Failed tests:', results.filter(r => !r.passed).map(r => r.name));
  }
  
  return results;
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('Production Test Script Loaded');
  console.log('Run tests with: runTests()');
  window.runTests = runTests;
} else {
  console.log('This script should be run in a browser console on the production site.');
}