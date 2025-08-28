#!/usr/bin/env node

/**
 * Test script for chat.js API verification
 * Run with: node scripts/test-chat-api.js
 */

import fetch from 'node-fetch';
import assert from 'assert';

const API_BASE = process.env.API_BASE || 'http://localhost:8888/.netlify/functions/chat';
const TEST_API_KEY = process.env.TEST_API_KEY || 'test-key';

// Test scenarios
const tests = [
  {
    name: 'Normal mode - FAQ match',
    request: {
      messages: [
        { role: 'user', content: '印刷料金はいくらですか？' }
      ]
    },
    validate: (res, data, headers) => {
      assert.equal(res.status, 200, 'Should return 200');
      assert.equal(headers.get('x-backend'), 'faq', 'Should use FAQ backend');
      assert.equal(headers.get('x-faq-match'), 'true', 'Should mark as FAQ match');
      assert.ok(headers.get('x-domain'), 'Should have x-domain header');
      assert.ok(data.choices[0].message.content, 'Should have response content');
    }
  },
  {
    name: 'Normal mode - No FAQ match',
    request: {
      messages: [
        { role: 'user', content: 'カスタム要件のチラシを作りたい' }
      ]
    },
    validate: (res, data, headers) => {
      assert.equal(res.status, 200, 'Should return 200');
      assert.equal(headers.get('x-backend'), 'openai', 'Should use OpenAI backend');
      assert.ok(headers.get('x-domain'), 'Should have x-domain header');
      assert.ok(!headers.get('x-faq-match'), 'Should not have FAQ match');
    }
  },
  {
    name: 'Raw mode',
    url: '?raw=1',
    request: {
      input: [
        { role: 'user', content: [{ type: 'input_text', text: 'Hello' }] }
      ]
    },
    validate: (res, data, headers) => {
      assert.equal(res.status, 200, 'Should return 200');
      assert.equal(headers.get('x-backend'), 'openai', 'Should use OpenAI backend');
      assert.equal(headers.get('x-domain'), 'unknown', 'Should have unknown domain in raw mode');
    }
  },
  {
    name: 'Empty response handling',
    request: {
      messages: [
        { role: 'user', content: '' }
      ],
      max_output_tokens: 1  // Force small output that might be empty
    },
    validate: (res, data, headers) => {
      // If empty, should return 502
      if (!data.choices?.[0]?.message?.content) {
        assert.equal(res.status, 502, 'Empty response should return 502');
        assert.equal(data.error, 'empty_output', 'Should have empty_output error');
      }
      assert.ok(headers.get('x-domain'), 'Should always have x-domain header');
    }
  },
  {
    name: 'Missing API key',
    env: { OPENAI_API_KEY: '' },
    request: {
      messages: [
        { role: 'user', content: 'Test without API key' }
      ]
    },
    validate: (res, data, headers) => {
      assert.equal(res.status, 500, 'Should return 500 for missing API key');
      assert.ok(data.error, 'Should have error message');
      assert.ok(headers.get('x-domain'), 'Should still have x-domain header');
    }
  }
];

// Test runner
async function runTest(test) {
  console.log(`\n🧪 Testing: ${test.name}`);
  
  const url = API_BASE + (test.url || '');
  const headers = {
    'content-type': 'application/json',
    'x-session-id': `test-${Date.now()}`
  };
  
  // Set environment if specified
  if (test.env) {
    for (const [key, value] of Object.entries(test.env)) {
      process.env[key] = value;
    }
  }
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(test.request)
    });
    
    const data = await res.json();
    const responseHeaders = res.headers;
    
    // Run validation
    test.validate(res, data, responseHeaders);
    
    console.log(`✅ ${test.name} passed`);
    console.log(`   Headers: x-domain=${responseHeaders.get('x-domain')}, x-backend=${responseHeaders.get('x-backend')}`);
    
  } catch (error) {
    console.error(`❌ ${test.name} failed:`, error.message);
    throw error;
  } finally {
    // Restore environment
    if (test.env) {
      for (const key of Object.keys(test.env)) {
        delete process.env[key];
      }
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting chat.js API tests\n');
  console.log(`Testing against: ${API_BASE}`);
  console.log('=' .repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await runTest(test);
      passed++;
    } catch (error) {
      failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runTest, tests };