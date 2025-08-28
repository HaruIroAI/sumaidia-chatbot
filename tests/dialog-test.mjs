#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { IntentClassifier } from '../src/intent/intent-classifier.mjs';
import { ConversationRouter } from '../src/agent/router.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test runner for golden dialog tests
class DialogTestRunner {
  constructor() {
    this.classifier = new IntentClassifier();
    this.router = new ConversationRouter();
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runTests() {
    console.log('🧪 Running Dialog Tests\n');
    console.log('=' . repeat(50));
    
    const testDirs = ['printing', 'web', 'recruiting'];
    
    for (const domain of testDirs) {
      await this.runDomainTests(domain);
    }
    
    this.printSummary();
    
    // Exit with error code if tests failed
    if (this.results.failed > 0) {
      process.exit(1);
    }
  }

  async runDomainTests(domain) {
    const testDir = path.join(__dirname, 'golden-dialogs', domain);
    
    console.log(`\n📁 Testing ${domain.toUpperCase()} domain`);
    console.log('-'.repeat(40));
    
    try {
      const files = fs.readdirSync(testDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const testPath = path.join(testDir, file);
        const testData = JSON.parse(fs.readFileSync(testPath, 'utf8'));
        
        await this.runSingleTest(testData, domain);
      }
    } catch (error) {
      console.error(`Error reading tests for ${domain}:`, error.message);
    }
  }

  async runSingleTest(testData, expectedDomain) {
    this.results.total++;
    const testId = testData.id;
    const sessionId = `test-${testId}-${Date.now()}`;
    
    console.log(`\n🔍 Test: ${testId}`);
    console.log(`   Description: ${testData.description}`);
    
    let passed = true;
    const errors = [];
    
    try {
      // Clear any existing session
      this.router.clearSession(sessionId);
      
      for (let i = 0; i < testData.dialog.length; i++) {
        const turn = testData.dialog[i];
        
        if (turn.role === 'user') {
          // Classify intent
          const intentResult = this.classifier.classify(turn.content);
          
          // Route conversation
          const routingResult = this.router.route({
            domain: intentResult.domain,
            text: turn.content,
            sessionId: sessionId
          });
          
          // Get next assistant turn for validation
          const nextTurn = testData.dialog[i + 1];
          if (nextTurn && nextTurn.role === 'assistant') {
            // Validate domain
            if (nextTurn.expectedDomain && intentResult.domain !== nextTurn.expectedDomain) {
              errors.push(`Turn ${i}: Expected domain '${nextTurn.expectedDomain}', got '${intentResult.domain}'`);
              passed = false;
            }
            
            // Validate FAQ detection
            if (nextTurn.expectedFAQ !== undefined) {
              const hasFAQ = routingResult.faqAnswer !== null;
              if (hasFAQ !== nextTurn.expectedFAQ) {
                errors.push(`Turn ${i}: FAQ detection mismatch. Expected ${nextTurn.expectedFAQ}, got ${hasFAQ}`);
                passed = false;
              }
            }
            
            // Validate slots
            if (nextTurn.expectedSlots) {
              const session = this.router.getSession(sessionId, intentResult.domain);
              if (session) {
                for (const slot of nextTurn.expectedSlots) {
                  if (!session.filledSlots[slot]) {
                    errors.push(`Turn ${i}: Expected slot '${slot}' not filled`);
                    passed = false;
                  }
                }
              }
            }
            
            // Validate question count (for guardrail testing)
            if (nextTurn.expectedQuestions !== undefined) {
              const questionCount = routingResult.questions ? routingResult.questions.length : 0;
              const cappedQuestions = Math.min(questionCount, 3); // Should never exceed 3
              if (cappedQuestions !== nextTurn.expectedQuestions && nextTurn.expectedQuestions <= 3) {
                errors.push(`Turn ${i}: Expected ${nextTurn.expectedQuestions} questions, got ${cappedQuestions}`);
                passed = false;
              }
            }
            
            // Check completion
            if (nextTurn.expectedComplete) {
              const session = this.router.getSession(sessionId, intentResult.domain);
              if (session && routingResult.missingSlots.length > 0) {
                errors.push(`Turn ${i}: Expected completion but still have missing slots: ${routingResult.missingSlots.map(s => s.key).join(', ')}`);
                passed = false;
              }
            }
          }
        }
      }
      
      if (passed) {
        console.log('   ✅ PASSED');
        this.results.passed++;
      } else {
        console.log('   ❌ FAILED');
        console.log('   Errors:');
        errors.forEach(err => console.log(`     - ${err}`));
        this.results.failed++;
      }
      
      this.results.details.push({
        testId,
        passed,
        errors
      });
      
    } catch (error) {
      console.log('   ❌ ERROR:', error.message);
      this.results.failed++;
      this.results.details.push({
        testId,
        passed: false,
        errors: [error.message]
      });
    } finally {
      // Clean up session
      this.router.clearSession(sessionId);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    const passRate = this.results.total > 0 
      ? ((this.results.passed / this.results.total) * 100).toFixed(1) 
      : 0;
    
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Pass Rate: ${passRate}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.details
        .filter(d => !d.passed)
        .forEach(d => {
          console.log(`  - ${d.testId}`);
          d.errors.forEach(e => console.log(`    ${e}`));
        });
    }
    
    console.log('\n' + (this.results.failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed'));
  }
}

// Run tests
const runner = new DialogTestRunner();
runner.runTests().catch(console.error);