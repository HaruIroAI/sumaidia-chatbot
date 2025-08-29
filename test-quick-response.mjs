#!/usr/bin/env node

/**
 * Test script for quick response system
 */

import { getQuickResponse, needsAIProcessing, getVariedResponse } from './src/utils/quick-response.mjs';

console.log('⚡ Testing Quick Response System\n');
console.log('=' .repeat(50));

// Test cases
const testCases = [
  // Simple greetings (should skip AI)
  { message: "こんにちは", shouldSkipAI: true },
  { message: "はじめまして", shouldSkipAI: true },
  { message: "おはよう", shouldSkipAI: true },
  { message: "こんばんは", shouldSkipAI: true },
  { message: "ありがとう", shouldSkipAI: true },
  { message: "バイバイ", shouldSkipAI: true },
  { message: "はい", shouldSkipAI: true },
  { message: "OK", shouldSkipAI: true },
  
  // Complex messages (should use AI)
  { message: "名刺100枚の見積もりをお願いします", shouldSkipAI: false },
  { message: "チラシの納期はどのくらいですか？", shouldSkipAI: false },
  { message: "こんにちは、名刺を作りたいです", shouldSkipAI: false },
  { message: "詳しく教えてください", shouldSkipAI: false }
];

console.log('Quick Response Tests:\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const quickResponse = getQuickResponse(testCase.message);
  const hasQuickResponse = quickResponse && quickResponse.skipAI;
  const needsAI = needsAIProcessing(testCase.message);
  
  console.log(`📝 "${testCase.message}"`);
  
  if (hasQuickResponse) {
    console.log(`   → Quick: "${quickResponse.message}"`);
  } else {
    console.log(`   → Needs AI processing`);
  }
  
  const shouldSkipAI = hasQuickResponse && !needsAI;
  
  if (shouldSkipAI === testCase.shouldSkipAI) {
    console.log(`   ✅ PASS (Skip AI: ${shouldSkipAI})`);
    passed++;
  } else {
    console.log(`   ❌ FAIL (Expected Skip AI: ${testCase.shouldSkipAI}, Got: ${shouldSkipAI})`);
    failed++;
  }
  console.log();
}

// Test response variations
console.log('\n' + '=' .repeat(50));
console.log('Response Variation Test:\n');

console.log('Greeting variations:');
for (let i = 0; i < 3; i++) {
  console.log(`  ${i + 1}. ${getVariedResponse('greeting')}`);
}

console.log('\n' + '=' .repeat(50));
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ All tests passed!');
} else {
  console.log('⚠️  Some tests failed.');
}