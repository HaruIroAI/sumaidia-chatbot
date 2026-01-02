#!/usr/bin/env node

/**
 * Performance test for response system
 */

import { getQuickResponse, getCacheStats } from './src/utils/enhanced-quick-response.mjs';
import { analyzeComplexity, getPerformanceHints, preprocessMessage } from './src/utils/response-optimizer.mjs';

console.log('⚡ Performance Testing Suite\n');
console.log('=' .repeat(50));

// Test messages with expected performance
const testCases = [
  // INSTANT (0-10ms)
  { message: "はい", expectedLevel: 0, description: "Ultra simple acknowledgment" },
  { message: "OK", expectedLevel: 0, description: "Simple OK" },
  { message: "こんにちは", expectedLevel: 0, description: "Simple greeting" },
  { message: "ありがとう", expectedLevel: 0, description: "Simple thanks" },
  
  // QUICK (10-50ms)
  { message: "元気？", expectedLevel: 1, description: "Simple question" },
  { message: "誰？", expectedLevel: 1, description: "Who question" },
  { message: "できる？", expectedLevel: 1, description: "Can you?" },
  
  // MODERATE (50-500ms)
  { message: "名刺を100枚作りたい", expectedLevel: 2, description: "Specific request" },
  { message: "印刷の料金を教えて", expectedLevel: 2, description: "Price inquiry" },
  
  // COMPLEX (500ms+)
  { message: "名刺100枚とチラシ500枚の見積もりをお願いします。納期は来週までで、デザインも相談したいです。", expectedLevel: 3, description: "Complex multi-part request" },
  { message: "なぜ印刷料金は枚数によって単価が変わるのですか？詳しく説明してください。", expectedLevel: 3, description: "Detailed explanation request" }
];

console.log('\n📊 Complexity Analysis:\n');

const results = [];
for (const test of testCases) {
  const startTime = process.hrtime.bigint();
  
  // Preprocess message
  const processed = preprocessMessage(test.message);
  
  // Check for quick response
  const quickResponse = getQuickResponse(test.message);
  
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1000000; // Convert to ms
  
  const hints = getPerformanceHints(processed.complexity);
  
  console.log(`📝 "${test.message.substring(0, 30)}..."`);
  console.log(`   Description: ${test.description}`);
  console.log(`   Expected Level: ${test.expectedLevel}, Got: ${processed.complexity}`);
  console.log(`   Skip AI: ${processed.skipAI}`);
  console.log(`   Quick Response: ${quickResponse ? 'YES' : 'NO'}`);
  console.log(`   Analysis Time: ${duration.toFixed(2)}ms`);
  console.log(`   Strategy: ${hints.strategy}`);
  console.log(`   Expected Time: ${hints.expectedTime}`);
  
  const success = processed.complexity === test.expectedLevel;
  console.log(`   ${success ? '✅ PASS' : '❌ FAIL'}\n`);
  
  results.push({
    message: test.message,
    complexity: processed.complexity,
    expected: test.expectedLevel,
    duration: duration,
    success: success,
    skipAI: processed.skipAI,
    hasQuickResponse: !!quickResponse
  });
}

// Performance summary
console.log('=' .repeat(50));
console.log('\n🏁 Performance Summary:\n');

const instant = results.filter(r => r.complexity === 0);
const quick = results.filter(r => r.complexity === 1);
const moderate = results.filter(r => r.complexity === 2);
const complex = results.filter(r => r.complexity === 3);

console.log(`INSTANT (0-10ms): ${instant.length} messages`);
console.log(`  - Skip AI: ${instant.filter(r => r.skipAI).length}/${instant.length}`);
console.log(`  - Has Quick Response: ${instant.filter(r => r.hasQuickResponse).length}/${instant.length}`);

console.log(`\nQUICK (10-50ms): ${quick.length} messages`);
console.log(`  - Skip AI: ${quick.filter(r => r.skipAI).length}/${quick.length}`);
console.log(`  - Has Quick Response: ${quick.filter(r => r.hasQuickResponse).length}/${quick.length}`);

console.log(`\nMODERATE (50-500ms): ${moderate.length} messages`);
console.log(`  - Skip AI: ${moderate.filter(r => r.skipAI).length}/${moderate.length}`);

console.log(`\nCOMPLEX (500ms+): ${complex.length} messages`);
console.log(`  - Skip AI: ${complex.filter(r => r.skipAI).length}/${complex.length}`);

// Cache statistics
console.log('\n' + '=' .repeat(50));
console.log('\n💾 Cache Statistics:\n');

const cacheStats = getCacheStats();
console.log(`Cache Size: ${cacheStats.size}/${cacheStats.maxSize}`);
console.log(`TTL: ${cacheStats.ttl / 1000}s`);

// Test rapid-fire messages (cache effectiveness)
console.log('\n' + '=' .repeat(50));
console.log('\n🔥 Rapid-fire Test (Cache Effectiveness):\n');

const rapidMessage = "こんにちは";
const iterations = 100;
let cached = 0;
let uncached = 0;

const rapidStart = process.hrtime.bigint();
for (let i = 0; i < iterations; i++) {
  const response = getQuickResponse(rapidMessage);
  if (response && response.cached) {
    cached++;
  } else {
    uncached++;
  }
}
const rapidEnd = process.hrtime.bigint();
const rapidDuration = Number(rapidEnd - rapidStart) / 1000000;

console.log(`Message: "${rapidMessage}"`);
console.log(`Iterations: ${iterations}`);
console.log(`Cached hits: ${cached}`);
console.log(`Uncached hits: ${uncached}`);
console.log(`Total time: ${rapidDuration.toFixed(2)}ms`);
console.log(`Average per message: ${(rapidDuration / iterations).toFixed(3)}ms`);

// Overall results
console.log('\n' + '=' .repeat(50));
console.log('\n✨ Overall Results:\n');

const passed = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;

console.log(`Tests Passed: ${passed}/${results.length}`);
console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

const avgAnalysisTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
console.log(`Average Analysis Time: ${avgAnalysisTime.toFixed(2)}ms`);

if (failed === 0) {
  console.log('\n✅ All performance tests passed!');
} else {
  console.log('\n⚠️  Some tests failed. Review complexity analysis.');
}