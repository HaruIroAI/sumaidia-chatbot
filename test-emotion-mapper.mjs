#!/usr/bin/env node

/**
 * Test script for emotion mapper system
 */

import { 
  analyzeEmotion, 
  ensureEmotionTag, 
  getQuickResponseEmotion,
  getTimeBasedEmotion,
  getAvailableEmotions 
} from './src/utils/emotion-mapper.mjs';

console.log('😊 Testing Emotion Mapper System\n');
console.log('=' .repeat(50));

// Test cases for emotion analysis
const testMessages = [
  // Positive messages
  { text: "はろー！スマイちゃんです✨", expected: "greeting" },
  { text: "ありがとう！助かりました💕", expected: "grateful" },
  { text: "すごい！最高ですね！", expected: "excited" },
  { text: "印刷のお見積もりは約1,000円です", expected: "professional" },
  
  // Neutral/Thinking messages
  { text: "うーん、そうですね", expected: "thinking" },
  { text: "なぜそうなるのですか？", expected: "curious" },
  { text: "詳しく説明します", expected: "explaining" },
  
  // Concerned messages
  { text: "ごめんなさい、間違えました", expected: "worried" },
  { text: "それは残念です😢", expected: "sad" },
  
  // Action messages
  { text: "一緒に頑張りましょう！", expected: "determined" },
  { text: "印刷作業を開始します", expected: "working" },
  
  // Special messages
  { text: "わくわくしますね！", expected: "playful" },
  { text: "かっこいいデザインですね", expected: "cool" },
  { text: "えっ！本当ですか？", expected: "surprised" }
];

console.log('\n📝 Emotion Analysis Tests:\n');

let passed = 0;
let failed = 0;

for (const test of testMessages) {
  const emotion = analyzeEmotion(test.text, 'assistant');
  const success = emotion === test.expected;
  
  console.log(`Text: "${test.text.substring(0, 30)}..."`);
  console.log(`  Expected: ${test.expected}, Got: ${emotion}`);
  console.log(`  ${success ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (success) passed++;
  else failed++;
}

// Test emotion tag ensuring
console.log('\n' + '=' .repeat(50));
console.log('\n🏷️  Emotion Tag Tests:\n');

const tagTests = [
  { text: "こんにちは", hasTag: false },
  { text: "こんにちは [[emo:greeting]]", hasTag: true },
  { text: "ありがとう [[emo:invalid]]", hasTag: true }, // Invalid tag should be replaced
];

for (const test of tagTests) {
  const result = ensureEmotionTag(test.text);
  const hasTag = result.includes('[[emo:');
  
  console.log(`Input: "${test.text}"`);
  console.log(`Output: "${result}"`);
  console.log(`Has tag: ${hasTag}\n`);
}

// Test quick response emotions
console.log('=' .repeat(50));
console.log('\n⚡ Quick Response Emotion Tests:\n');

const quickTypes = ['greeting', 'thanks', 'farewell', 'simple', 'faq', 'error'];
for (const type of quickTypes) {
  const emotion = getQuickResponseEmotion(type);
  console.log(`Type: ${type} → Emotion: ${emotion}`);
}

// Test time-based emotions
console.log('\n' + '=' .repeat(50));
console.log('\n🕐 Time-based Emotion Test:\n');

const currentEmotion = getTimeBasedEmotion();
const hour = new Date().getHours();
console.log(`Current hour: ${hour}:00`);
console.log(`Suggested emotion: ${currentEmotion}`);

// Show available emotions
console.log('\n' + '=' .repeat(50));
console.log('\n📋 Available Emotions (30 patterns):\n');

const emotions = getAvailableEmotions();
console.log(emotions.join(', '));
console.log(`\nTotal: ${emotions.length} emotions`);

// Summary
console.log('\n' + '=' .repeat(50));
console.log('\n📊 Test Summary:\n');
console.log(`Analysis Tests: ${passed} passed, ${failed} failed`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n✅ All tests passed! Emotion mapper is working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Review the emotion patterns.');
}