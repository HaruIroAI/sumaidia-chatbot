#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const fixturesPath = join(__dirname, '..', 'tests', 'expressions.fixtures.json');
const configPath = join(__dirname, '..', 'config', 'expressions.json');
const failuresPath = join(__dirname, '..', 'tests', '.last-failures.json');
const enginePath = join(__dirname, 'expression-engine.js');

/**
 * Run tests and capture failures
 */
async function captureTestFailures() {
    console.log('🧪 Running tests to capture failures...\n');
    
    // Load fixtures and expressions
    const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf-8'));
    const expressions = JSON.parse(readFileSync(configPath, 'utf-8'));
    const engineCode = readFileSync(enginePath, 'utf-8');
    
    // Create mock window
    global.window = {
        __exprState: null,
        __debugExpressions: false,
        __lastExpressionId: null
    };
    
    // Evaluate engine
    eval(engineCode);
    
    // Initialize engine
    global.window.setTestMode(true);
    global.window.setNow(() => 1234567890);
    global.window.resetState();
    
    global.window.expressionEngine.expressions = expressions.map(exp => ({
        ...exp,
        priority: exp.priority ?? 50,
        threshold: exp.threshold ?? 12,
        cooldown: exp.cooldown ?? 1800,
        group: exp.group ?? 'neutral',
        patterns: exp.patterns ?? []
    }));
    global.window.expressionEngine.initialized = true;
    
    // Capture failures
    const failures = [];
    
    for (const fixture of fixtures) {
        global.window.resetState();
        
        const result = global.window.expressionEngine.select({
            text: fixture.text,
            role: 'assistant',
            contexts: [],
            lastId: null
        });
        
        if (result.id !== fixture.expect) {
            failures.push({
                text: fixture.text,
                expected: fixture.expect,
                actual: result.id,
                score: result.score,
                reasons: result.reasons
            });
        }
    }
    
    // Save failures
    writeFileSync(failuresPath, JSON.stringify(failures, null, 2));
    console.log(`💾 Saved ${failures.length} failures to tests/.last-failures.json\n`);
    
    return failures;
}

/**
 * Simple Japanese tokenizer (basic morphological-like splitting)
 */
function tokenizeJapanese(text) {
    const tokens = [];
    
    // Extract hiragana sequences
    const hiragana = text.match(/[\u3040-\u309F]+/g) || [];
    tokens.push(...hiragana);
    
    // Extract katakana sequences
    const katakana = text.match(/[\u30A0-\u30FF]+/g) || [];
    tokens.push(...katakana);
    
    // Extract kanji sequences (simplified)
    const kanji = text.match(/[\u4E00-\u9FAF]+/g) || [];
    tokens.push(...kanji);
    
    // Extract kanji + hiragana combinations (common patterns)
    const kanjiHiragana = text.match(/[\u4E00-\u9FAF]+[\u3040-\u309F]+/g) || [];
    tokens.push(...kanjiHiragana);
    
    // Extract English words
    const english = text.match(/[a-zA-Z]+/g) || [];
    tokens.push(...english);
    
    return tokens;
}

/**
 * Extract emojis from text
 */
function extractEmojis(text) {
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    return text.match(emojiPattern) || [];
}

/**
 * Extract symbols and punctuation
 */
function extractSymbols(text) {
    // Common Japanese and English punctuation
    const symbols = text.match(/[！？。、・〜「」『』（）【】!?,.\-_]/g) || [];
    return symbols;
}

/**
 * Extract bigrams from tokens
 */
function extractBigrams(tokens) {
    const bigrams = [];
    for (let i = 0; i < tokens.length - 1; i++) {
        bigrams.push(tokens[i] + tokens[i + 1]);
    }
    return bigrams;
}

/**
 * Analyze failures and suggest keywords/patterns
 */
function analyzeSuggestions(failures) {
    const suggestions = {};
    
    // Group failures by expected expression
    const failuresByExpression = {};
    for (const failure of failures) {
        if (!failuresByExpression[failure.expected]) {
            failuresByExpression[failure.expected] = [];
        }
        failuresByExpression[failure.expected].push(failure);
    }
    
    // Analyze each expression's failures
    for (const [expressionId, expressionFailures] of Object.entries(failuresByExpression)) {
        const allTokens = [];
        const allEmojis = [];
        const allSymbols = [];
        const allBigrams = [];
        
        for (const failure of expressionFailures) {
            const tokens = tokenizeJapanese(failure.text);
            const emojis = extractEmojis(failure.text);
            const symbols = extractSymbols(failure.text);
            const bigrams = extractBigrams(tokens);
            
            allTokens.push(...tokens);
            allEmojis.push(...emojis);
            allSymbols.push(...symbols);
            allBigrams.push(...bigrams);
        }
        
        // Count frequencies
        const tokenFreq = countFrequencies(allTokens);
        const emojiFreq = countFrequencies(allEmojis);
        const bigramFreq = countFrequencies(allBigrams);
        
        // Get top suggestions
        const topTokens = getTopItems(tokenFreq, 10);
        const topEmojis = getTopItems(emojiFreq, 3);
        const topBigrams = getTopItems(bigramFreq, 5);
        
        // Filter out very short tokens (likely particles)
        const meaningfulTokens = topTokens.filter(t => t.length > 1);
        
        // Create pattern suggestions from common bigrams
        const patternSuggestions = topBigrams
            .filter(bg => bg.length > 2)
            .map(bg => {
                // Convert to simple regex pattern
                if (bg.includes('です') || bg.includes('ます')) {
                    return `${bg.substring(0, bg.length - 2)}(です|ます)?`;
                }
                return bg;
            })
            .slice(0, 3);
        
        suggestions[expressionId] = {
            failureCount: expressionFailures.length,
            suggestedKeywords: [...new Set([...meaningfulTokens, ...topEmojis])].slice(0, 10),
            suggestedPatterns: patternSuggestions,
            sampleFailures: expressionFailures.slice(0, 2).map(f => ({
                text: f.text.substring(0, 50) + '...',
                actual: f.actual
            }))
        };
    }
    
    return suggestions;
}

/**
 * Count frequencies of items
 */
function countFrequencies(items) {
    const freq = {};
    for (const item of items) {
        freq[item] = (freq[item] || 0) + 1;
    }
    return freq;
}

/**
 * Get top N items by frequency
 */
function getTopItems(freq, n) {
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([item]) => item);
}

/**
 * Format suggestions as JSON for manual application
 */
function formatSuggestions(suggestions, expressions) {
    const output = {
        timestamp: new Date().toISOString(),
        totalExpressions: Object.keys(suggestions).length,
        suggestions: {}
    };
    
    for (const [expressionId, data] of Object.entries(suggestions)) {
        const currentExpr = expressions.find(e => e.id === expressionId);
        const currentWhen = currentExpr?.when || [];
        const currentPatterns = currentExpr?.patterns || [];
        
        // Filter out already existing keywords
        const newKeywords = data.suggestedKeywords.filter(k => 
            !currentWhen.some(w => w.includes(k) || k.includes(w))
        );
        
        // Filter out already existing patterns
        const newPatterns = data.suggestedPatterns.filter(p =>
            !currentPatterns.some(cp => cp.includes(p) || p.includes(cp))
        );
        
        output.suggestions[expressionId] = {
            failureCount: data.failureCount,
            currentWhen: currentWhen.slice(0, 5),
            addToWhen: newKeywords.slice(0, 5),
            currentPatterns: currentPatterns.slice(0, 3),
            addToPatterns: newPatterns.slice(0, 2),
            examples: data.sampleFailures
        };
    }
    
    return output;
}

/**
 * Main execution
 */
async function main() {
    console.log('🔍 Keyword/Pattern Suggester for Expression Engine\n');
    console.log('═══════════════════════════════════════════════════\n');
    
    // Check if failures file exists, otherwise run tests
    let failures;
    if (existsSync(failuresPath)) {
        console.log('📁 Loading existing failures from tests/.last-failures.json\n');
        failures = JSON.parse(readFileSync(failuresPath, 'utf-8'));
    } else {
        failures = await captureTestFailures();
    }
    
    if (failures.length === 0) {
        console.log('✨ No failures found! All tests passing.\n');
        console.log('💡 Tip: If you want to improve coverage, add more test fixtures.\n');
        return;
    }
    
    console.log(`📊 Analyzing ${failures.length} failures...\n`);
    
    // Load current expressions
    const expressions = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    // Analyze and generate suggestions
    const suggestions = analyzeSuggestions(failures);
    const formatted = formatSuggestions(suggestions, expressions);
    
    // Output suggestions
    console.log('📝 SUGGESTED IMPROVEMENTS:\n');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(JSON.stringify(formatted, null, 2));
    
    console.log('\n═══════════════════════════════════════════════════\n');
    console.log('📋 HOW TO APPLY:\n');
    console.log('1. Review the suggestions above');
    console.log('2. Manually add promising keywords to config/expressions.json');
    console.log('3. Run: npm run tune:expr');
    console.log('4. Run: npm test\n');
    
    // Save suggestions to file for reference
    const suggestionsPath = join(__dirname, '..', 'config', 'keyword-suggestions.json');
    writeFileSync(suggestionsPath, JSON.stringify(formatted, null, 2));
    console.log(`💾 Suggestions saved to: config/keyword-suggestions.json\n`);
}

// Run the suggester
main().catch(console.error);