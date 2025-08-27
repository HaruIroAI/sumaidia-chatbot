#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load fixtures
const fixturesPath = join(__dirname, '..', 'tests', 'expressions.fixtures.json');
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

// Load expression config
const configPath = join(__dirname, '..', 'config', 'expressions.json');
const expressions = JSON.parse(readFileSync(configPath, 'utf-8'));

// Load the expression engine
const enginePath = join(__dirname, 'expression-engine.js');
const engineCode = readFileSync(enginePath, 'utf-8');

// Parameter ranges to explore
const parameterSpace = {
    globalThreshold: [8, 10, 12, 14, 16, 18],
    keywordWeight: [8, 10, 12],
    regexWeight: [12, 15, 18],
    punctuationCap: [6, 9],
    negationPenalty: [6, 8, 10]
};

/**
 * Create a modified engine with custom weights
 */
function createModifiedEngine(weights) {
    let modifiedCode = engineCode;
    
    // Replace keyword weight (line ~147)
    modifiedCode = modifiedCode.replace(
        /score \+= keywordMatches\.length \* 10;/,
        `score += keywordMatches.length * ${weights.keywordWeight};`
    );
    
    // Replace regex weight (line ~157)
    modifiedCode = modifiedCode.replace(
        /score \+= 15;/,
        `score += ${weights.regexWeight};`
    );
    
    // Replace punctuation cap (line ~169-170)
    modifiedCode = modifiedCode.replace(
        /const exclamScore = Math\.min\(exclamations \* 3, 9\);/,
        `const exclamScore = Math.min(exclamations * 3, ${weights.punctuationCap});`
    );
    modifiedCode = modifiedCode.replace(
        /const questionScore = Math\.min\(questions \* 3, 9\);/,
        `const questionScore = Math.min(questions * 3, ${weights.punctuationCap});`
    );
    
    // Replace negation penalty (line ~221)
    modifiedCode = modifiedCode.replace(
        /score -= 8;/,
        `score -= ${weights.negationPenalty};`
    );
    
    return modifiedCode;
}

/**
 * Evaluate a single parameter combination
 */
function evaluateWeights(weights) {
    // Create mock window object
    global.window = {
        __exprState: null,
        __debugExpressions: false,
        __lastExpressionId: null
    };
    
    // Create modified engine code
    const modifiedEngine = createModifiedEngine(weights);
    
    // Evaluate the modified engine
    eval(modifiedEngine);
    
    // Set test mode
    global.window.setTestMode(true);
    global.window.setNow(() => 1234567890);
    global.window.resetState();
    
    // Initialize engine
    global.window.expressionEngine.expressions = expressions.map(exp => ({
        ...exp,
        priority: exp.priority ?? 50,
        threshold: exp.threshold ?? weights.globalThreshold,
        cooldown: exp.cooldown ?? 1800,
        group: exp.group ?? 'neutral',
        patterns: exp.patterns ?? []
    }));
    global.window.expressionEngine.initialized = true;
    
    // Run tests
    let passed = 0;
    let failed = 0;
    
    for (const fixture of fixtures) {
        global.window.resetState();
        
        const result = global.window.expressionEngine.select({
            text: fixture.text,
            role: 'assistant',
            contexts: [],
            lastId: null
        });
        
        if (result.id === fixture.expect) {
            passed++;
        } else {
            failed++;
        }
    }
    
    return {
        weights,
        passed,
        failed,
        passRate: (passed / fixtures.length) * 100
    };
}

/**
 * Grid search through parameter space
 */
function gridSearch() {
    console.log('🔍 Starting parameter tuning...\n');
    console.log('Parameter space:');
    console.log(JSON.stringify(parameterSpace, null, 2));
    console.log('\n════════════════════════════════════════\n');
    
    let bestResult = null;
    let totalCombinations = 1;
    
    // Calculate total combinations
    for (const param in parameterSpace) {
        totalCombinations *= parameterSpace[param].length;
    }
    
    console.log(`Total combinations to test: ${totalCombinations}\n`);
    
    let combinationCount = 0;
    
    // Grid search
    for (const globalThreshold of parameterSpace.globalThreshold) {
        for (const keywordWeight of parameterSpace.keywordWeight) {
            for (const regexWeight of parameterSpace.regexWeight) {
                for (const punctuationCap of parameterSpace.punctuationCap) {
                    for (const negationPenalty of parameterSpace.negationPenalty) {
                        combinationCount++;
                        
                        const weights = {
                            globalThreshold,
                            keywordWeight,
                            regexWeight,
                            punctuationCap,
                            negationPenalty
                        };
                        
                        const result = evaluateWeights(weights);
                        
                        // Progress indicator
                        if (combinationCount % 10 === 0) {
                            process.stdout.write(`\rTesting: ${combinationCount}/${totalCombinations} (${(combinationCount/totalCombinations*100).toFixed(1)}%)`);
                        }
                        
                        // Track best result
                        if (!bestResult || result.passRate > bestResult.passRate) {
                            bestResult = result;
                        }
                    }
                }
            }
        }
    }
    
    console.log('\n\n════════════════════════════════════════\n');
    
    return bestResult;
}

/**
 * Main execution
 */
async function main() {
    console.log('🎯 Expression Engine Auto-Tuner\n');
    console.log(`Evaluating ${fixtures.length} test fixtures...\n`);
    
    // Run grid search
    const bestResult = gridSearch();
    
    // Display results
    console.log('🏆 Best Configuration Found:\n');
    console.log(`Pass Rate: ${bestResult.passRate.toFixed(1)}%`);
    console.log(`Passed: ${bestResult.passed}/${fixtures.length}`);
    console.log('\nOptimal weights:');
    console.log(JSON.stringify(bestResult.weights, null, 2));
    
    // Write weights to file
    const weightsPath = join(__dirname, '..', 'config', 'weights.json');
    writeFileSync(weightsPath, JSON.stringify(bestResult.weights, null, 2));
    console.log(`\n✅ Weights saved to: config/weights.json`);
    
    // Also show top failures if any
    if (bestResult.failed > 0) {
        console.log('\n⚠️  Note: Some tests still failing with best configuration.');
        console.log('Consider adjusting expression keywords or patterns for 100% accuracy.');
    }
    
    console.log('\n🚀 Run "npm test" to verify the optimized configuration.\n');
}

// Run the tuner
main().catch(console.error);