/**
 * Expression Diversifier
 * Ensures diverse usage of all 30 avatar expressions
 */

// Full list of 30 available expressions
const ALL_EXPRESSIONS = [
  'normal', 'happy', 'excited', 'proud', 'confident',
  'thinking', 'curious', 'surprised', 'worried', 'confused',
  'tired', 'sad', 'disappointed', 'frustrated', 'angry',
  'shy', 'embarrassed', 'love', 'star_eyes', 'wink',
  'sleepy', 'sick', 'neutral', 'professional', 'explaining',
  'attentive', 'supportive', 'determined', 'relaxed', 'mischievous'
];

// Expression categories for context-based selection
const EXPRESSION_CATEGORIES = {
  positive: [
    'happy', 'excited', 'proud', 'confident', 'love', 
    'star_eyes', 'wink', 'mischievous'
  ],
  neutral: [
    'normal', 'neutral', 'professional', 'explaining', 
    'attentive', 'relaxed'
  ],
  thoughtful: [
    'thinking', 'curious', 'supportive', 'determined'
  ],
  uncertain: [
    'worried', 'confused', 'surprised', 'shy', 'embarrassed'
  ],
  negative: [
    'tired', 'sad', 'disappointed', 'frustrated', 'angry', 
    'sick', 'sleepy'
  ]
};

// Usage history to ensure diversity
const expressionHistory = [];
const HISTORY_SIZE = 10;

// Context-based expression mapping with variations
const CONTEXT_EXPRESSIONS = {
  // Greetings - rotate through friendly expressions
  greeting: ['happy', 'excited', 'wink', 'star_eyes', 'confident'],
  
  // EC site inquiries - professional with enthusiasm
  ec_inquiry: ['professional', 'excited', 'confident', 'star_eyes', 'proud'],
  ec_budget: ['thinking', 'professional', 'attentive', 'supportive'],
  ec_proposal: ['proud', 'confident', 'star_eyes', 'excited'],
  
  // Pricing discussions
  pricing: ['professional', 'explaining', 'attentive', 'confident'],
  expensive: ['surprised', 'worried', 'thinking', 'professional'],
  affordable: ['happy', 'excited', 'wink', 'love'],
  
  // Technical explanations
  explaining: ['explaining', 'professional', 'attentive', 'confident'],
  features: ['excited', 'proud', 'star_eyes', 'confident'],
  
  // Problem solving
  helping: ['supportive', 'determined', 'attentive', 'professional'],
  solution: ['proud', 'confident', 'happy', 'excited'],
  
  // Questions
  asking: ['curious', 'thinking', 'attentive', 'professional'],
  confirming: ['professional', 'attentive', 'confident', 'happy'],
  
  // Emotional responses
  empathy: ['supportive', 'worried', 'attentive', 'sad'],
  celebration: ['excited', 'star_eyes', 'love', 'happy'],
  apology: ['embarrassed', 'sad', 'worried', 'shy'],
  
  // Time-based
  urgent: ['determined', 'professional', 'worried', 'attentive'],
  relaxed: ['relaxed', 'happy', 'confident', 'normal'],
  
  // Fun/casual
  joke: ['mischievous', 'wink', 'happy', 'excited'],
  casual: ['relaxed', 'happy', 'normal', 'wink']
};

/**
 * Get least recently used expression from a category
 */
function getLeastUsedExpression(expressions) {
  // Filter out recently used expressions
  const available = expressions.filter(exp => 
    !expressionHistory.slice(-3).includes(exp)
  );
  
  // If all were recently used, use the full list
  const pool = available.length > 0 ? available : expressions;
  
  // Random selection from available pool
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Analyze message content for context
 */
export function analyzeMessageContext(message, role = 'assistant') {
  const lowerMessage = message.toLowerCase();
  
  // Check for specific contexts
  if (lowerMessage.includes('ecサイト') || lowerMessage.includes('ec')) {
    if (lowerMessage.includes('予算') || lowerMessage.includes('万円')) {
      return 'ec_budget';
    }
    if (lowerMessage.includes('amazon') || lowerMessage.includes('アマゾン')) {
      return 'ec_proposal';
    }
    return 'ec_inquiry';
  }
  
  // Greetings
  if (lowerMessage.includes('はろー') || lowerMessage.includes('こんにちは')) {
    return 'greeting';
  }
  
  // Questions
  if (lowerMessage.includes('？') || lowerMessage.includes('か？')) {
    if (lowerMessage.includes('どう') || lowerMessage.includes('どんな')) {
      return 'asking';
    }
    return 'confirming';
  }
  
  // Pricing
  if (lowerMessage.includes('円') || lowerMessage.includes('費用') || lowerMessage.includes('価格')) {
    if (lowerMessage.includes('500万') || lowerMessage.includes('300万')) {
      return 'expensive';
    }
    if (lowerMessage.includes('50万') || lowerMessage.includes('100万')) {
      return 'affordable';
    }
    return 'pricing';
  }
  
  // Emotional keywords
  if (lowerMessage.includes('大変') || lowerMessage.includes('困った')) {
    return 'empathy';
  }
  
  if (lowerMessage.includes('素敵') || lowerMessage.includes('素晴らしい')) {
    return 'celebration';
  }
  
  if (lowerMessage.includes('ごめん') || lowerMessage.includes('申し訳')) {
    return 'apology';
  }
  
  // Time sensitivity
  if (lowerMessage.includes('急ぎ') || lowerMessage.includes('すぐ') || lowerMessage.includes('今日')) {
    return 'urgent';
  }
  
  // Technical/features
  if (lowerMessage.includes('機能') || lowerMessage.includes('ai') || lowerMessage.includes('システム')) {
    return 'features';
  }
  
  // Solutions
  if (lowerMessage.includes('できる') || lowerMessage.includes('作れる') || lowerMessage.includes('対応')) {
    return 'solution';
  }
  
  // Fun elements
  if (lowerMessage.includes('✨') || lowerMessage.includes('💕')) {
    return 'casual';
  }
  
  // Default based on message length and tone
  if (message.length < 50) {
    return 'casual';
  } else if (message.length > 200) {
    return 'explaining';
  }
  
  return 'professional';
}

/**
 * Get diverse expression based on context
 */
export function getDiverseExpression(message, suggestedEmotion = null, role = 'assistant') {
  // If suggested emotion is already diverse, use it occasionally
  if (suggestedEmotion && !expressionHistory.slice(-2).includes(suggestedEmotion)) {
    if (Math.random() < 0.6) { // 60% chance to use suggested
      expressionHistory.push(suggestedEmotion);
      if (expressionHistory.length > HISTORY_SIZE) {
        expressionHistory.shift();
      }
      return suggestedEmotion;
    }
  }
  
  // Analyze context
  const context = analyzeMessageContext(message, role);
  
  // Get context-appropriate expressions
  const contextExpressions = CONTEXT_EXPRESSIONS[context] || CONTEXT_EXPRESSIONS.professional;
  
  // Select least used expression from context
  const expression = getLeastUsedExpression(contextExpressions);
  
  // Update history
  expressionHistory.push(expression);
  if (expressionHistory.length > HISTORY_SIZE) {
    expressionHistory.shift();
  }
  
  return expression;
}

/**
 * Get expression statistics (for debugging)
 */
export function getExpressionStats() {
  const stats = {};
  ALL_EXPRESSIONS.forEach(exp => {
    stats[exp] = expressionHistory.filter(e => e === exp).length;
  });
  return {
    totalUsed: expressionHistory.length,
    uniqueUsed: new Set(expressionHistory).size,
    distribution: stats,
    recentHistory: expressionHistory.slice(-5)
  };
}

/**
 * Reset expression history (for new conversations)
 */
export function resetExpressionHistory() {
  expressionHistory.length = 0;
}

export default {
  ALL_EXPRESSIONS,
  EXPRESSION_CATEGORIES,
  CONTEXT_EXPRESSIONS,
  analyzeMessageContext,
  getDiverseExpression,
  getExpressionStats,
  resetExpressionHistory
};