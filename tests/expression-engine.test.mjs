#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import assert from 'assert';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the expression engine
const enginePath = join(__dirname, '..', 'scripts', 'expression-engine.js');
const engineCode = readFileSync(enginePath, 'utf-8');

// Create a mock window object for the engine
global.window = {
    __exprState: null,
    __debugExpressions: false,
    __lastExpressionId: null
};

// Evaluate the engine code
eval(engineCode);

// Get test mode functions (they should be available on window after eval)
const testFunctions = {
    setTestMode: (enabled) => global.window.setTestMode(enabled),
    resetState: () => global.window.resetState(),
    setNow: (fn) => global.window.setNow(fn)
};

// Load fixtures
const fixturesPath = join(__dirname, 'expressions.fixtures.json');
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

// Load expression config
const configPath = join(__dirname, '..', 'config', 'expressions.json');
const expressions = JSON.parse(readFileSync(configPath, 'utf-8'));

// Test runner
class ExpressionTester {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.failures = [];
    }

    async run() {
        console.log('🧪 Expression Engine Golden Tests\n');
        console.log('═══════════════════════════════════════\n');

        // Enable test mode and set fixed time
        testFunctions.setTestMode(true);
        testFunctions.setNow(() => 1234567890);
        
        // Initialize the engine with expressions
        global.window.expressionEngine.expressions = expressions;
        global.window.expressionEngine.initialized = true;
        
        // Add defaults for missing fields
        global.window.expressionEngine.expressions = global.window.expressionEngine.expressions.map(exp => ({
            ...exp,
            priority: exp.priority ?? 50,
            threshold: exp.threshold ?? 12,
            cooldown: exp.cooldown ?? 1800,
            group: exp.group ?? 'neutral',
            patterns: exp.patterns ?? []
        }));

        // Run tests
        for (const [index, fixture] of fixtures.entries()) {
            // Reset state before each test
            testFunctions.resetState();
            await this.testFixture(fixture, index + 1);
        }

        // Print summary
        this.printSummary();
        
        // Exit with appropriate code
        process.exit(this.failed > 0 ? 1 : 0);
    }

    async testFixture(fixture, testNumber) {
        const { text, expect, expectAny, comment } = fixture;
        
        try {
            
            // Run expression selection
            const result = global.window.expressionEngine.select({
                text: text,
                role: 'assistant',
                contexts: [],
                lastId: null
            });

            // Handle expectAny for ambiguous cases
            if (expectAny) {
                const isMatch = expectAny.includes(result.id);
                if (!isMatch) {
                    throw new Error(`Expected one of [${expectAny.join(', ')}] but got "${result.id}"`);
                }
                this.passed++;
                const commentStr = comment ? ` // ${comment}` : '';
                console.log(`✅ Test #${testNumber}: "${text.substring(0, 30)}..." → ${result.id} ∈ [${expectAny.join(',')}] (score: ${result.score})${commentStr}`);
            } else {
                // Assert exact match
                assert.strictEqual(
                    result.id,
                    expect,
                    `Expected "${expect}" but got "${result.id}"`
                );
                this.passed++;
                console.log(`✅ Test #${testNumber}: "${text.substring(0, 30)}..." → ${result.id} (score: ${result.score})`);
            }
            
        } catch (error) {
            this.failed++;
            this.failures.push({ testNumber, fixture, error });
            
            // Get the actual result for debugging
            const actualResult = global.window.expressionEngine.select({
                text: text,
                role: 'assistant',
                contexts: [],
                lastId: null
            });
            
            console.log(`❌ Test #${testNumber}: "${text.substring(0, 30)}..."`);
            if (expectAny) {
                console.log(`   Expected one of: [${expectAny.join(', ')}]`);
                if (comment) console.log(`   Comment: ${comment}`);
            } else {
                console.log(`   Expected: ${expect}`);
            }
            console.log(`   Got: ${actualResult.id} (score: ${actualResult.score})`);
            console.log(`   Reasons: ${actualResult.reasons.join(', ')}`);
            console.log('');
        }
    }

    printSummary() {
        console.log('\n═══════════════════════════════════════\n');
        console.log('📊 Test Results Summary\n');
        
        const total = this.passed + this.failed;
        const passRate = ((this.passed / total) * 100).toFixed(1);
        
        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`📈 Pass Rate: ${passRate}%`);
        
        if (this.failed > 0) {
            console.log('\n⚠️  Failed Tests Details:\n');
            
            // Group failures by expected expression
            const failuresByExpected = {};
            for (const failure of this.failures) {
                const expected = failure.fixture.expectAny 
                    ? `[${failure.fixture.expectAny.join(', ')}]`
                    : failure.fixture.expect;
                if (!failuresByExpected[expected]) {
                    failuresByExpected[expected] = [];
                }
                failuresByExpected[expected].push(failure);
            }
            
            // Print grouped failures
            for (const [expected, failures] of Object.entries(failuresByExpected)) {
                const isArray = expected.startsWith('[');
                const label = isArray ? `Expected one of ${expected}` : `Expected "${expected}"`;
                console.log(`\n  ${label} (${failures.length} failures):`);
                for (const failure of failures) {
                    const commentStr = failure.fixture.comment ? ` // ${failure.fixture.comment}` : '';
                    console.log(`    - Test #${failure.testNumber}: "${failure.fixture.text.substring(0, 40)}..."${commentStr}`);
                }
            }
            
            console.log('\n💡 Tip: Review the scoring weights in expression-engine.js');
            console.log('   or adjust the "when" and "patterns" in config/expressions.json');
        } else {
            console.log('\n🎉 All tests passed! The expression mapping is working correctly.');
        }
    }
}

// Run tests
const tester = new ExpressionTester();
tester.run().catch(console.error);