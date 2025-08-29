#!/usr/bin/env node

/**
 * Test script for Smaichan personality integration
 * Tests the complete flow with pricing data
 */

import { IntentClassifier } from './src/intent/intent-classifier.mjs';
import { ConversationRouter } from './src/agent/router.mjs';
import { buildSystemPrompt } from './src/prompt/build-system-prompt.mjs';

console.log('🧪 Testing Smaichan Integration\n');
console.log('=' .repeat(50));

// Test cases
const testCases = [
  {
    name: "Price inquiry for business cards",
    message: "名刺を100枚作りたいんですが、いくらくらいかかりますか？",
    expectedDomain: "printing"
  },
  {
    name: "Delivery time for flyers",
    message: "チラシ1000枚の納期はどのくらいですか？",
    expectedDomain: "printing"
  },
  {
    name: "Website creation cost",
    message: "ホームページを作りたいのですが料金を教えてください",
    expectedDomain: "web"
  },
  {
    name: "General greeting",
    message: "こんにちは",
    expectedDomain: "general"
  }
];

// Initialize components
const classifier = new IntentClassifier();
const router = new ConversationRouter();

// Run tests
for (const testCase of testCases) {
  console.log(`\n📝 Test: ${testCase.name}`);
  console.log(`   User: "${testCase.message}"`);
  console.log('-'.repeat(50));
  
  // 1. Classify intent
  const intentResult = classifier.classify(testCase.message);
  console.log(`   Domain: ${intentResult.domain} (confidence: ${intentResult.confidence})`);
  
  // 2. Route conversation
  const routingResult = router.route({
    domain: intentResult.domain,
    text: testCase.message,
    sessionId: `test-${Date.now()}`
  });
  
  // 3. Build system prompt
  const systemPrompt = buildSystemPrompt({
    domain: intentResult.domain,
    playbook: routingResult.playbookData,
    missingSlots: routingResult.missingSlots,
    routingResult: routingResult,
    enableSmaichan: true,
    pricingInfo: routingResult.pricingInfo
  });
  
  // Display results
  console.log(`   Has Pricing: ${routingResult.pricingInfo ? 'Yes' : 'No'}`);
  if (routingResult.pricingInfo) {
    console.log(`   Pricing Info:`, routingResult.pricingInfo.map(p => p.service).join(', '));
  }
  
  console.log(`   Missing Slots: ${routingResult.missingSlots.length > 0 ? 
    routingResult.missingSlots.map(s => s.name).join(', ') : 'None'}`);
  
  // Show first 200 chars of system prompt
  console.log(`\n   System Prompt Preview:`);
  console.log(`   ${systemPrompt.substring(0, 200)}...`);
  
  // Check if Smaichan personality is included
  const hasSmaichan = systemPrompt.includes('スマイちゃん');
  console.log(`   ✅ Smaichan Personality: ${hasSmaichan ? 'Active' : 'Not Found'}`);
}

console.log('\n' + '='.repeat(50));
console.log('✨ Test Complete!');

// Test with Smaichan disabled
console.log('\n📊 Testing Traditional Mode (Smaichan disabled)');
console.log('-'.repeat(50));

const traditionalPrompt = buildSystemPrompt({
  domain: 'printing',
  enableSmaichan: false
});

console.log(`Traditional prompt preview: ${traditionalPrompt.substring(0, 150)}...`);
console.log(`Has Smaichan: ${traditionalPrompt.includes('スマイちゃん') ? 'Yes' : 'No'}`);

console.log('\n✅ All tests completed!');