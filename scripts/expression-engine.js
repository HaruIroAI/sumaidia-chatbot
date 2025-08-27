/**
 * Expression Engine with Weighted Scoring
 * Maps text content to appropriate avatar expressions using multi-signal scoring
 */
class ExpressionEngine {
    constructor() {
        this.expressions = [];
        this.defaultExpression = 'neutral';
        this.initialized = false;
        this.lastUpdateTime = {};
        
        // Debug telemetry buffer (ring buffer, max 100 entries)
        this.telemetryBuffer = [];
        this.maxTelemetrySize = 100;
        
        // Simple sentiment dictionaries
        this.positiveWords = ['うれし', '嬉し', '最高', '素敵', 'いい', '良い', '楽し', 'やった', '成功', 'おめでと', '感謝', 'ありがと'];
        this.negativeWords = ['悲し', 'つら', '困', '失敗', 'ダメ', '無理', '難し', 'イライラ', 'むか', '怒', '最悪', '嫌'];
        
        // Emoji patterns
        this.emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
        this.kaomoji = ['(^_^)', '(T_T)', '(>_<)', '(^^)', '(-_-)', '(o_o)', '(;_;)', '(^o^)', 'm(_ _)m', 'orz'];
        
        // Context mappings
        this.contextExpressions = {
            'pricing': ['thinking', 'focused', 'confident'],
            'delivery': ['motivated', 'determined', 'worried'],
            'design': ['creative', 'sparkle', 'star_eyes'],
            'quality': ['proud', 'confident', 'focused'],
            'technical': ['thinking', 'focused', 'determined']
        };
    }

    /**
     * Initialize with expression configurations
     */
    async init(configPath = '/config/expressions.json') {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                console.warn('Failed to load expressions config, using defaults');
                this.loadDefaults();
                return;
            }
            this.expressions = await response.json();
            
            // Add defaults for missing fields
            this.expressions = this.expressions.map(exp => ({
                ...exp,
                priority: exp.priority ?? 50,
                threshold: exp.threshold ?? 12,
                cooldown: exp.cooldown ?? 1800,
                group: exp.group ?? 'neutral',
                patterns: exp.patterns ?? []
            }));
            
            this.initialized = true;
            console.log(`Loaded ${this.expressions.length} expressions`);
        } catch (error) {
            console.warn('Error loading expressions:', error);
            this.loadDefaults();
        }
    }

    /**
     * Load default expressions as fallback
     */
    loadDefaults() {
        this.expressions = [
            {
                id: 'neutral',
                files: ['logo/smaichan.png'],
                priority: 50,
                threshold: 0,
                cooldown: 1000,
                group: 'neutral',
                when: ['default'],
                patterns: []
            },
            {
                id: 'happy',
                files: ['logo/smaichan_happy.png'],
                priority: 85,
                threshold: 12,
                cooldown: 1600,
                group: 'positive',
                when: ['うれし', '嬉しい', '最高', 'やった', '✨', '👍', '助かる'],
                patterns: ['すご(い|っ)', 'ありがと(う|ー|!)+']
            },
            {
                id: 'confused',
                files: ['logo/smaichan_confused.png'],
                priority: 80,
                threshold: 10,
                cooldown: 1800,
                group: 'negative',
                when: ['わから', 'どゆこと', '不明', '？？'],
                patterns: ['(どういう|何(の|が))']
            }
        ];
        this.initialized = true;
    }

    /**
     * Main selection API with weighted scoring
     */
    select({ text, role = 'assistant', contexts = [], lastId = null, isTyping = false }) {
        if (!this.initialized) {
            this.loadDefaults();
        }

        // Special handling for typing indicator
        if (isTyping) {
            const thinkingExp = this.expressions.find(e => e.id === 'thinking');
            if (thinkingExp) {
                const now = Date.now();
                window.__exprState = {
                    id: 'thinking',
                    until: now + (thinkingExp.cooldown || 1800)
                };
                return { id: 'thinking', score: 100, reasons: ['typing indicator'] };
            }
        }

        if (!text || typeof text !== 'string') {
            return this.getExpressionById(this.defaultExpression);
        }

        const normalizedText = text.toLowerCase();
        const scores = new Map();
        const reasons = new Map();

        // Calculate scores for each expression
        for (const expression of this.expressions) {
            let score = 0;
            const expressionReasons = [];

            // a) Keyword matching (+10 per keyword)
            const keywordMatches = expression.when.filter(kw => 
                kw !== 'default' && normalizedText.includes(kw.toLowerCase())
            );
            if (keywordMatches.length > 0) {
                score += keywordMatches.length * 10;
                expressionReasons.push(`keywords: ${keywordMatches.join(',')}`);
            }

            // b) Regex patterns (+15 per pattern)
            if (expression.patterns && expression.patterns.length > 0) {
                for (const pattern of expression.patterns) {
                    try {
                        const regex = new RegExp(pattern, 'gi');
                        if (regex.test(text)) {
                            score += 15;
                            expressionReasons.push(`pattern: ${pattern}`);
                        }
                    } catch (e) {
                        // Invalid regex, skip
                    }
                }
            }

            // c) Exclamation/Question marks (+3 per mark, max +9)
            const exclamations = (text.match(/[！!]+/g) || []).length;
            const questions = (text.match(/[？?]+/g) || []).length;
            const exclamScore = Math.min(exclamations * 3, 9);
            const questionScore = Math.min(questions * 3, 9);
            if (exclamScore > 0) {
                score += exclamScore;
                expressionReasons.push(`exclamations: +${exclamScore}`);
            }
            if (questionScore > 0) {
                score += questionScore;
                expressionReasons.push(`questions: +${questionScore}`);
            }

            // d) Emoji/Kaomoji (+8)
            const hasEmoji = this.emojiPattern.test(text);
            const hasKaomoji = this.kaomoji.some(km => text.includes(km));
            if (hasEmoji || hasKaomoji) {
                score += 8;
                expressionReasons.push('emoji/kaomoji');
            }

            // e) Context matching (+6)
            for (const context of contexts) {
                if (this.contextExpressions[context]?.includes(expression.id)) {
                    score += 6;
                    expressionReasons.push(`context: ${context}`);
                }
            }

            // f) Sentiment matching (+6 per word)
            const positiveMatches = this.positiveWords.filter(word => normalizedText.includes(word));
            const negativeMatches = this.negativeWords.filter(word => normalizedText.includes(word));
            
            if (expression.group === 'positive' && positiveMatches.length > 0) {
                score += positiveMatches.length * 6;
                expressionReasons.push(`positive words: ${positiveMatches.length}`);
            } else if (expression.group === 'negative' && negativeMatches.length > 0) {
                score += negativeMatches.length * 6;
                expressionReasons.push(`negative words: ${negativeMatches.length}`);
            }

            // g) Previous expression proximity (+4)
            if (lastId && expression.group) {
                const lastExpression = this.expressions.find(e => e.id === lastId);
                if (lastExpression?.group === expression.group) {
                    score += 4;
                    expressionReasons.push('group continuity');
                }
            }

            // Edge case processing
            // Negation detection
            const hasNegation = /じゃない|なくて|無理|ない|ません/.test(normalizedText);
            if (hasNegation && expression.group === 'positive') {
                score -= 8;
                expressionReasons.push('negation penalty');
            }

            // Direct boosts for specific patterns
            if (expression.id === 'confused') {
                if (/わから|どゆこと|どういう/.test(normalizedText)) {
                    score += 12;
                    expressionReasons.push('direct confused boost');
                }
            } else if (expression.id === 'grateful' || expression.id === 'happy') {
                if (/ありがとう|助かる|感謝/.test(normalizedText)) {
                    score += 12;
                    expressionReasons.push('direct grateful boost');
                }
            }

            // Apply cooldown penalty
            const now = Date.now();
            const lastUsed = this.lastUpdateTime[expression.id];
            if (lastUsed && (now - lastUsed) < expression.cooldown) {
                score -= 5;
                expressionReasons.push('cooldown penalty');
            }

            scores.set(expression.id, score);
            reasons.set(expression.id, expressionReasons);
        }

        // Find best expression above threshold
        let bestExpression = null;
        let bestScore = -1;

        for (const expression of this.expressions) {
            const score = scores.get(expression.id);
            
            // Skip if below threshold
            if (score < expression.threshold) continue;

            // Select if better score or same score but higher priority
            if (score > bestScore || 
                (score === bestScore && expression.priority > bestExpression.priority)) {
                bestExpression = expression;
                bestScore = score;
            }
        }

        // Check hysteresis and cooldown state
        const now = Date.now();
        const currentState = window.__exprState;
        
        if (currentState && currentState.until > now) {
            // We're still in cooldown period
            const currentExpression = this.expressions.find(e => e.id === currentState.id);
            const currentScore = scores.get(currentState.id) || 0;
            
            if (currentExpression && bestExpression) {
                // Check if we should maintain current expression
                const scoreDifference = bestScore - currentScore;
                const sameGroup = currentExpression.group === bestExpression.group;
                
                // Only switch if:
                // 1. Different group with significant difference (>= 8 points)
                // 2. Same group but massive difference (>= 15 points)
                const significantDifference = sameGroup ? 15 : 8;
                
                if (scoreDifference < significantDifference) {
                    // Keep current expression due to hysteresis
                    bestExpression = currentExpression;
                    bestScore = currentScore;
                    reasons.set(currentState.id, [...(reasons.get(currentState.id) || []), 'hysteresis']);
                }
            }
        }

        // Fallback to default if no expression meets threshold
        if (!bestExpression) {
            bestExpression = this.expressions.find(e => e.id === this.defaultExpression) || this.expressions[0];
            bestScore = 0;
        }

        // Update state with new expression and cooldown
        window.__exprState = {
            id: bestExpression.id,
            until: now + (bestExpression.cooldown || 1800)
        };

        // Update last use time
        this.lastUpdateTime[bestExpression.id] = now;

        const result = {
            id: bestExpression.id,
            score: bestScore,
            reasons: reasons.get(bestExpression.id) || []
        };

        // Debug telemetry logging
        if (window.__debugExpressions) {
            this.logTelemetry(text, result);
        }

        return result;
    }

    /**
     * Log telemetry data for debugging
     */
    logTelemetry(text, result) {
        // Create a simple hash of the text for privacy
        const textHash = this.simpleHash(text || '');
        
        const entry = {
            ts: new Date().toISOString().substring(11, 19), // HH:MM:SS
            textHash: textHash,
            id: result.id,
            score: result.score,
            reason: result.reasons[0] || 'none'
        };
        
        // Add to ring buffer
        this.telemetryBuffer.push(entry);
        
        // Maintain max size
        if (this.telemetryBuffer.length > this.maxTelemetrySize) {
            this.telemetryBuffer.shift();
        }
    }

    /**
     * Simple hash function for text (for privacy in telemetry)
     */
    simpleHash(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).substring(0, 6);
    }

    /**
     * Get expression by ID
     */
    getExpressionById(id) {
        const expression = this.expressions.find(exp => exp.id === id);
        if (!expression) {
            const defaultExp = this.expressions.find(exp => exp.id === this.defaultExpression) || this.expressions[0];
            return { id: defaultExp.id, score: 0, reasons: ['default'] };
        }
        return { id: expression.id, score: 0, reasons: ['direct'] };
    }
}

// Create and export global instance
const expressionEngine = new ExpressionEngine();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => expressionEngine.init());
    } else {
        expressionEngine.init();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExpressionEngine, expressionEngine };
}

// Browser global
if (typeof window !== 'undefined') {
    window.expressionEngine = expressionEngine;
    window.ExpressionEngine = ExpressionEngine;
    
    // Debug utility function
    window.dumpExpressions = function() {
        if (!expressionEngine.telemetryBuffer || expressionEngine.telemetryBuffer.length === 0) {
            console.log('No expression telemetry data. Enable with: window.__debugExpressions = true');
            return;
        }
        
        console.log(`Expression Telemetry (last ${expressionEngine.telemetryBuffer.length} selections):`);
        console.table(expressionEngine.telemetryBuffer);
        
        // Also show summary statistics
        const stats = {};
        expressionEngine.telemetryBuffer.forEach(entry => {
            stats[entry.id] = (stats[entry.id] || 0) + 1;
        });
        
        console.log('\nExpression frequency:');
        console.table(Object.entries(stats).map(([id, count]) => ({
            expression: id,
            count: count,
            percentage: `${(count / expressionEngine.telemetryBuffer.length * 100).toFixed(1)}%`
        })));
    };
}