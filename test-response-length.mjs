#!/usr/bin/env node

/**
 * Test script for response length adjustment
 */

import { analyzeResponseLength, buildAdjustedGuardrails } from './src/utils/response-adjuster.mjs';

console.log('📏 Testing Response Length Adjustment\n');
console.log('=' .repeat(50));

// Test cases
const testCases = [
  {
    message: "こんにちは",
    expectedType: "greeting",
    expectedLength: "short"
  },
  {
    message: "はじめまして",
    expectedType: "greeting",
    expectedLength: "short"
  },
  {
    message: "名刺100枚の見積もりを詳しく教えてください",
    expectedType: "complex_question",
    expectedLength: "detailed"
  },
  {
    message: "チラシの納期はどのくらいですか？",
    expectedType: "complex_question",
    expectedLength: "detailed"
  },
  {
    message: "できますか？",
    expectedType: "yes_no_question",
    expectedLength: "medium"
  },
  {
    message: "はい",
    expectedType: "short_input",
    expectedLength: "short"
  },
  {
    message: "名刺500枚、急ぎでお願いします",
    expectedType: "general",
    expectedLength: "detailed"
  },
  {
    message: "ありがとう",
    expectedType: "short_input",
    expectedLength: "short"
  }
];

// Run tests
console.log('Message Analysis Results:\n');

for (const testCase of testCases) {
  const analysis = analyzeResponseLength(testCase.message);
  
  console.log(`📝 "${testCase.message}"`);
  console.log(`   Type: ${analysis.messageType} (expected: ${testCase.expectedType})`);
  console.log(`   Length: ${analysis.targetLength} (expected: ${testCase.expectedLength})`);
  console.log(`   Style: ${analysis.responseStyle}`);
  console.log(`   Char Limit: ${analysis.guidelines.length.charLimit}字`);
  console.log(`   Sentences: ${analysis.guidelines.length.sentences}`);
  
  if (analysis.messageType === testCase.expectedType && 
      analysis.targetLength === testCase.expectedLength) {
    console.log(`   ✅ PASS`);
  } else {
    console.log(`   ⚠️  Unexpected result`);
  }
  console.log();
}

// Test guardrail generation
console.log('\n' + '=' .repeat(50));
console.log('Guardrail Generation Test:\n');

const sampleAnalysis = analyzeResponseLength("こんにちは");
const guardrails = buildAdjustedGuardrails(sampleAnalysis);

console.log('Input: "こんにちは"');
console.log('Generated Guardrails:');
console.log(guardrails);

console.log('\n✅ Test completed!');