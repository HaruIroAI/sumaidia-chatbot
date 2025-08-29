#!/usr/bin/env node

/**
 * Test script for quote calculator
 */

import { QuoteCalculator } from './src/services/quote-calculator.mjs';

console.log('🧮 Testing Quote Calculator\n');
console.log('=' .repeat(50));

const calculator = new QuoteCalculator();

// Test cases
const testCases = [
  {
    name: "Business cards - 100 standard",
    service: 'businessCards',
    entities: { quantity: 100, cardType: 'standard' }
  },
  {
    name: "Business cards - 500 with options",
    service: 'businessCards',
    entities: { 
      quantity: 500, 
      cardType: 'premium',
      options: ['両面印刷', 'PP加工'],
      express: false
    }
  },
  {
    name: "Business cards - 200 express",
    service: 'businessCards',
    entities: { quantity: 200, express: true }
  },
  {
    name: "Flyers - A4 1000 color",
    service: 'flyers',
    entities: { 
      quantity: 1000,
      size: 'A4',
      color: 'color',
      doubleSided: false
    }
  },
  {
    name: "Flyers - A3 5000 double-sided",
    service: 'flyers',
    entities: { 
      quantity: 5000,
      size: 'A3',
      color: 'color',
      doubleSided: true,
      express: true
    }
  },
  {
    name: "Web - Landing page standard",
    service: 'web',
    entities: {
      type: 'landingPage',
      plan: 'standard'
    }
  },
  {
    name: "Web - Corporate site with maintenance",
    service: 'web',
    entities: {
      type: 'corporateSite',
      pages: 10,
      maintenance: true
    }
  }
];

// Run tests
for (const testCase of testCases) {
  console.log(`\n📋 ${testCase.name}`);
  console.log('-'.repeat(50));
  
  let result;
  switch (testCase.service) {
    case 'businessCards':
      result = calculator.calculateBusinessCards(testCase.entities);
      break;
    case 'flyers':
      result = calculator.calculateFlyers(testCase.entities);
      break;
    case 'web':
      result = calculator.calculateWebDesign(testCase.entities);
      break;
  }
  
  if (result.error) {
    console.log(`❌ Error: ${result.message}`);
  } else {
    console.log(`Service: ${result.service}`);
    console.log(`Base Price: ¥${result.basePrice?.toLocaleString()}`);
    console.log(`Total (with tax): ¥${result.total?.toLocaleString()}`);
    console.log(`Delivery: ${result.delivery?.days || result.delivery?.duration}${result.delivery?.unit || ''}`);
    console.log(`\n💬 Smaichan says:`);
    console.log(`"${result.smaichanMessage}"`);
  }
}

// Test entity extraction
console.log('\n\n🔍 Testing Entity Extraction');
console.log('=' .repeat(50));

const testMessages = [
  "名刺を100枚作りたい",
  "A3のチラシ1000枚、両面カラーで急ぎです",
  "500枚のフライヤーをモノクロで",
  "ホームページを作りたい"
];

for (const message of testMessages) {
  console.log(`\nMessage: "${message}"`);
  const entities = calculator.extractQuoteEntities(message);
  console.log('Extracted:', JSON.stringify(entities, null, 2));
}

console.log('\n✅ All tests completed!');