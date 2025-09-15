/**
 * Response Optimizer
 * Optimizes response time by categorizing messages and applying appropriate strategies
 */

// Message complexity levels
const COMPLEXITY_LEVELS = {
  INSTANT: 0,    // < 10ms - cached or simple pattern
  QUICK: 1,      // < 50ms - pattern matching
  MODERATE: 2,   // < 500ms - simple AI
  COMPLEX: 3     // > 500ms - full AI processing
};

// Pre-compiled regex patterns for faster matching
const COMPILED_PATTERNS = {
  // Ultra-simple patterns that should respond instantly
  instant: [
    /^(はい|うん|ok|わかった|了解|オッケー)[！!]*$/i,
    /^(こんにちは|おはよう|こんばんは|hello|hi)[！!]*$/i,
    /^(ありがとう|thanks?|どうも)[！!]*$/i,
    /^(バイバイ|またね|じゃあね|bye|see you)[！!]*$/i,
  ],
  
  // Simple patterns that need minimal processing
  quick: [
    /^[あ-ん]{1,5}[！!?？]*$/,  // Very short hiragana messages
    /^[ァ-ヴ]{1,5}[！!?？]*$/,  // Very short katakana messages
    /^[a-z]{1,10}[！!?？]*$/i,  // Very short English messages
    /^(元気|調子|誰|何してる)[?？]*$/i,
  ],
  
  // Patterns that indicate complex queries
  complex: [
    /詳し(く|い)/, // Detailed explanations
    /説明/, // Explanations
    /教えて/, // Teaching/explaining
    /どうやって/, // How-to questions
    /なぜ|どうして/, // Why questions
    /比較|違い/, // Comparisons
    /\d{2,}/, // Multiple digits (quantities, prices)
    /[。、].*[。、]/, // Multiple clauses
  ]
};

/**
 * Analyze message complexity
 */
export function analyzeComplexity(message) {
  if (!message || message.length === 0) {
    return COMPLEXITY_LEVELS.INSTANT;
  }
  
  const trimmed = message.trim();
  
  // Check instant patterns first
  for (const pattern of COMPILED_PATTERNS.instant) {
    if (pattern.test(trimmed)) {
      return COMPLEXITY_LEVELS.INSTANT;
    }
  }
  
  // Check if it's a complex query
  for (const pattern of COMPILED_PATTERNS.complex) {
    if (pattern.test(trimmed)) {
      return COMPLEXITY_LEVELS.COMPLEX;
    }
  }
  
  // Check quick patterns
  for (const pattern of COMPILED_PATTERNS.quick) {
    if (pattern.test(trimmed)) {
      return COMPLEXITY_LEVELS.QUICK;
    }
  }
  
  // Length-based heuristics
  if (trimmed.length <= 10) {
    return COMPLEXITY_LEVELS.QUICK;
  } else if (trimmed.length <= 30) {
    return COMPLEXITY_LEVELS.MODERATE;
  } else {
    return COMPLEXITY_LEVELS.COMPLEX;
  }
}

/**
 * Determine if message should skip AI entirely
 */
export function shouldSkipAI(message, complexity = null) {
  const level = complexity !== null ? complexity : analyzeComplexity(message);
  return level <= COMPLEXITY_LEVELS.QUICK;
}

/**
 * Get optimized model parameters based on complexity
 */
export function getOptimizedModelParams(complexity) {
  switch (complexity) {
    case COMPLEXITY_LEVELS.INSTANT:
    case COMPLEXITY_LEVELS.QUICK:
      return {
        max_tokens: 60,  // Reduced for faster response
        temperature: 0.3,
        skipReasoning: true
      };
      
    case COMPLEXITY_LEVELS.MODERATE:
      return {
        max_tokens: 120,  // Reduced for faster response
        temperature: 0.5,
        skipReasoning: true
      };
      
    case COMPLEXITY_LEVELS.COMPLEX:
    default:
      return {
        max_tokens: 200,  // Significantly reduced for faster response
        temperature: 0.7,
        skipReasoning: false
      };
  }
}

/**
 * Optimize response based on message patterns
 */
export function optimizeResponse(message, response) {
  const complexity = analyzeComplexity(message);
  
  // For simple messages, ensure response is also simple
  if (complexity <= COMPLEXITY_LEVELS.QUICK && response.length > 100) {
    // Truncate to first sentence or reasonable length
    const firstSentence = response.match(/^[^。！!？?]+[。！!？?]/);
    if (firstSentence) {
      return firstSentence[0];
    }
    return response.substring(0, 50) + '...';
  }
  
  return response;
}

/**
 * Pre-process message for faster routing
 */
export function preprocessMessage(message) {
  if (!message) return { original: '', normalized: '', complexity: COMPLEXITY_LEVELS.INSTANT };
  
  const normalized = message
    .trim()
    .toLowerCase()
    .replace(/[！!]+/g, '!')
    .replace(/[？?]+/g, '?')
    .replace(/\s+/g, ' ');
  
  const complexity = analyzeComplexity(message);
  
  return {
    original: message,
    normalized: normalized,
    complexity: complexity,
    shouldCache: complexity <= COMPLEXITY_LEVELS.MODERATE,
    skipAI: complexity <= COMPLEXITY_LEVELS.QUICK
  };
}

/**
 * Get performance hints for monitoring
 */
export function getPerformanceHints(complexity) {
  const hints = {
    [COMPLEXITY_LEVELS.INSTANT]: {
      expectedTime: '0-10ms',
      strategy: 'cached/pattern',
      aiRequired: false
    },
    [COMPLEXITY_LEVELS.QUICK]: {
      expectedTime: '10-50ms',
      strategy: 'quick-response',
      aiRequired: false
    },
    [COMPLEXITY_LEVELS.MODERATE]: {
      expectedTime: '50-500ms',
      strategy: 'simple-ai',
      aiRequired: true
    },
    [COMPLEXITY_LEVELS.COMPLEX]: {
      expectedTime: '500ms+',
      strategy: 'full-ai',
      aiRequired: true
    }
  };
  
  return hints[complexity] || hints[COMPLEXITY_LEVELS.COMPLEX];
}

export default {
  COMPLEXITY_LEVELS,
  analyzeComplexity,
  shouldSkipAI,
  getOptimizedModelParams,
  optimizeResponse,
  preprocessMessage,
  getPerformanceHints
};