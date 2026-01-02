#!/bin/bash

# Final Integration Tests for Smaichan Integration
# Run this script to verify all components are working

echo "🚀 Starting Final Integration Tests"
echo "=================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

# Function to run test
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_pattern=$3
    
    echo -n "Testing: $test_name... "
    
    # Run the test and capture output
    output=$($test_command 2>&1)
    
    # Check if output contains expected pattern
    if echo "$output" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Expected pattern: $expected_pattern"
        echo "  Got: $(echo "$output" | head -1)"
        ((FAIL++))
    fi
}

echo "1. Component Tests"
echo "------------------"

# Test 1: Smaichan Integration
run_test "Smaichan personality loading" \
    "node -e \"import('./src/prompt/build-system-prompt.mjs').then(m => console.log(m.SMAICHAN_PERSONA ? 'SMAICHAN_LOADED' : 'FAILED'))\"" \
    "SMAICHAN_LOADED"

# Test 2: Pricing Data Loading
run_test "Pricing data loading" \
    "node -e \"import('./src/data/pricing-loader.mjs').then(m => { const d = m.loadPricingData(); console.log(d ? 'PRICING_LOADED' : 'FAILED'); })\"" \
    "PRICING_LOADED"

# Test 3: Quote Calculator
run_test "Quote calculator" \
    "node -e \"import('./src/services/quote-calculator.mjs').then(m => { const q = m.default.calculateBusinessCards({quantity: 100}); console.log(q.total === 3300 ? 'CALC_OK' : 'FAILED'); })\"" \
    "CALC_OK"

# Test 4: Intent Classification
run_test "Intent classifier" \
    "node -e \"import('./src/intent/intent-classifier.mjs').then(m => { const c = new m.IntentClassifier(); const r = c.classify('名刺を作りたい'); console.log(r.domain === 'printing' ? 'INTENT_OK' : 'FAILED'); })\"" \
    "INTENT_OK"

# Test 5: Router with pricing
run_test "Router pricing integration" \
    "node -e \"import('./src/agent/router.mjs').then(m => { const r = new m.ConversationRouter(); const result = r.route({domain: 'printing', text: '名刺100枚'}); console.log(result.pricingInfo ? 'ROUTER_OK' : 'FAILED'); })\"" \
    "ROUTER_OK"

echo ""
echo "2. Integration Tests"
echo "--------------------"

# Test 6: Full integration test
run_test "Full Smaichan integration" \
    "node test-smaichan-integration.mjs 2>&1 | grep -c 'Smaichan Personality: Active'" \
    "4"

# Test 7: Quote calculation test
run_test "Quote calculations" \
    "node test-quote-calculator.mjs 2>&1 | grep 'All tests completed'" \
    "All tests completed"

echo ""
echo "3. Build System Prompt Tests"
echo "-----------------------------"

# Test 8: Smaichan mode enabled
run_test "Smaichan mode (enabled)" \
    "node -e \"import('./src/prompt/build-system-prompt.mjs').then(m => { const p = m.buildSystemPrompt({domain: 'printing', enableSmaichan: true}); console.log(p.includes('スマイちゃん') ? 'SMAICHAN_ON' : 'FAILED'); })\"" \
    "SMAICHAN_ON"

# Test 9: Smaichan mode disabled
run_test "Traditional mode (disabled)" \
    "node -e \"import('./src/prompt/build-system-prompt.mjs').then(m => { const p = m.buildSystemPrompt({domain: 'printing', enableSmaichan: false}); console.log(!p.includes('スマイちゃん') ? 'TRADITIONAL_OK' : 'FAILED'); })\"" \
    "TRADITIONAL_OK"

# Test 10: Quote in prompt
run_test "Quote in system prompt" \
    "node -e \"import('./src/prompt/build-system-prompt.mjs').then(m => { const q = {service: 'test', total: 1000}; const p = m.buildSystemPrompt({quote: q}); console.log(p.includes('見積もり') ? 'QUOTE_OK' : 'FAILED'); })\"" \
    "QUOTE_OK"

echo ""
echo "=================================="
echo "Test Results Summary"
echo "=================================="
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"

if [ $FAIL -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Ready for deployment.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Some tests failed. Please review before deployment.${NC}"
    exit 1
fi