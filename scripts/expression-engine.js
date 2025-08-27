/**
 * Expression Engine
 * Maps text content to appropriate avatar expressions
 */
class ExpressionEngine {
    constructor() {
        this.expressions = [];
        this.defaultExpression = 'neutral';
        this.initialized = false;
    }

    /**
     * Initialize the engine with expression configurations
     * @param {string} configPath - Path to expressions.json
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
            { id: 'neutral', files: ['logo/smaichan.png'], priority: 50, when: ['default'] },
            { id: 'happy', files: ['logo/smaichan_happy.png'], priority: 80, when: ['ありがと', '嬉しい', '!'] },
            { id: 'thinking', files: ['logo/smaichan_thinking.png'], priority: 70, when: ['考え', '...', 'hmm'] },
            { id: 'confused', files: ['logo/smaichan_confused.png'], priority: 75, when: ['わから', '？？'] },
            { id: 'excited', files: ['logo/smaichan_excited.png'], priority: 85, when: ['すごい', '！！！'] }
        ];
        this.initialized = true;
    }

    /**
     * Select the most appropriate expression based on message content
     * @param {string} message - The message to analyze (assistant or user)
     * @param {string} context - Optional context ('user', 'assistant')
     * @returns {object} Expression object with id and file path
     */
    select(message, context = 'assistant') {
        if (!this.initialized) {
            this.loadDefaults();
        }

        if (!message || typeof message !== 'string') {
            return this.getDefaultExpression();
        }

        const normalizedMessage = message.toLowerCase();
        let bestMatch = null;
        let highestPriority = -1;

        // Find the best matching expression
        for (const expression of this.expressions) {
            // Skip if lower priority than current best
            if (expression.priority <= highestPriority) continue;

            // Check if any keyword matches
            const hasMatch = expression.when.some(keyword => {
                if (keyword === 'default') return false;
                return normalizedMessage.includes(keyword.toLowerCase());
            });

            if (hasMatch) {
                bestMatch = expression;
                highestPriority = expression.priority;
            }
        }

        // Return best match or default
        if (bestMatch) {
            return {
                id: bestMatch.id,
                file: bestMatch.files[0], // Use first file for now
                priority: bestMatch.priority
            };
        }

        return this.getDefaultExpression();
    }

    /**
     * Get the default expression
     * @returns {object} Default expression object
     */
    getDefaultExpression() {
        const defaultExp = this.expressions.find(exp => exp.id === this.defaultExpression) || this.expressions[0];
        return {
            id: defaultExp.id,
            file: defaultExp.files[0],
            priority: defaultExp.priority
        };
    }

    /**
     * Analyze sentiment score (for future ML integration)
     * @param {string} message - Message to analyze
     * @returns {object} Sentiment scores
     */
    analyzeSentiment(message) {
        // Placeholder for future sentiment analysis
        // Could integrate with TensorFlow.js or external API
        return {
            positive: 0.5,
            negative: 0.0,
            neutral: 0.5,
            confidence: 0.3
        };
    }

    /**
     * Get expression by ID
     * @param {string} id - Expression ID
     * @returns {object|null} Expression object or null
     */
    getExpressionById(id) {
        const expression = this.expressions.find(exp => exp.id === id);
        if (!expression) return null;
        
        return {
            id: expression.id,
            file: expression.files[0],
            priority: expression.priority
        };
    }

    /**
     * Get all available expression IDs
     * @returns {string[]} Array of expression IDs
     */
    getAvailableExpressions() {
        return this.expressions.map(exp => exp.id);
    }
}

// Create global instance
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