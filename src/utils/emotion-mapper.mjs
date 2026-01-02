/**
 * Emotion Mapper for Smaichan Avatar
 * Maps message content to appropriate facial expressions
 */

// 30 expression patterns available
const EXPRESSION_PATTERNS = {
  // Positive emotions
  happy: {
    keywords: ['嬉しい', '楽しい', 'わーい', 'やった', '最高', 'いいね', '素敵'],
    patterns: [/😊/, /😄/, /✨/, /💕/],
    default: false
  },
  excited: {
    keywords: ['すごい', 'まじで', 'やばい', '最高', 'わくわく'],
    patterns: [/[!！]{2,}/, /すご[いー]+/],
    default: false
  },
  grateful: {
    keywords: ['ありがとう', 'ありがたい', '感謝', 'お礼', 'どうも'],
    patterns: [/ありがと/],
    default: false
  },
  confident: {
    keywords: ['任せて', 'できる', '大丈夫', 'オッケー', 'OK', '了解'],
    patterns: [/任せ/, /できる/],
    default: false
  },
  proud: {
    keywords: ['自信', '得意', 'プロ', '専門', '実績'],
    patterns: [/自信/, /得意/],
    default: false
  },
  
  // Neutral/Thinking emotions
  neutral: {
    keywords: [],
    patterns: [],
    default: true  // Default expression
  },
  thinking: {
    keywords: ['うーん', 'えーと', 'そうだな', '考える', '検討'],
    patterns: [/う[ーぅ]+ん/, /え[ーぇ]+と/],
    default: false
  },
  curious: {
    keywords: ['なに', '何', 'どんな', 'どう', 'なぜ', 'どうして'],
    patterns: [/[?？]/, /何/, /どう/],
    default: false
  },
  focused: {
    keywords: ['詳しく', '具体的', '正確', 'しっかり', 'きちんと'],
    patterns: [/詳し/, /具体/],
    default: false
  },
  
  // Concern/Worry emotions
  worried: {
    keywords: ['心配', '不安', '大丈夫', '問題', 'ごめん'],
    patterns: [/心配/, /ごめん/],
    default: false
  },
  sad: {
    keywords: ['悲しい', '寂しい', '残念', 'つらい', '困った'],
    patterns: [/😢/, /😭/, /悲し/, /残念/],
    default: false
  },
  embarrassed: {
    keywords: ['恥ずかしい', 'えへへ', 'てへ', '照れ'],
    patterns: [/恥ずかし/, /えへ/],
    default: false
  },
  
  // Action/Work emotions
  determined: {
    keywords: ['頑張る', 'がんばる', 'やる', '挑戦', 'チャレンジ'],
    patterns: [/頑張/, /がんば/],
    default: false
  },
  working: {
    keywords: ['作業', '仕事', '製作', '印刷', '制作'],
    patterns: [/作る/, /印刷/],
    default: false
  },
  explaining: {
    keywords: ['説明', '教える', 'ご紹介', '解説', 'について'],
    patterns: [/説明/, /教え/],
    default: false
  },
  
  // Special/Playful emotions
  playful: {
    keywords: ['楽しい', '遊ぶ', 'わくわく', 'きらきら'],
    patterns: [/キラキラ/, /わくわく/],
    default: false
  },
  cool: {
    keywords: ['かっこいい', 'クール', 'イケてる', 'おしゃれ'],
    patterns: [/かっこ/, /クール/],
    default: false
  },
  surprised: {
    keywords: ['びっくり', '驚', 'えっ', 'まさか', 'ほんと'],
    patterns: [/[!！]/, /えっ/, /まさか/],
    default: false
  },
  
  // Professional emotions
  professional: {
    keywords: ['ビジネス', '仕事', '業務', '営業', '見積'],
    patterns: [/見積/, /納期/, /価格/],
    default: false
  },
  supportive: {
    keywords: ['応援', 'サポート', '助ける', '手伝う', '一緒に'],
    patterns: [/応援/, /一緒に/],
    default: false
  },
  
  // Additional expressions to reach 30
  loving: {
    keywords: ['大好き', 'ラブ', '愛'],
    patterns: [/💕/, /❤/, /大好き/],
    default: false
  },
  sleepy: {
    keywords: ['眠い', 'ねむい', 'おやすみ', '疲れた'],
    patterns: [/眠/, /おやすみ/],
    default: false
  },
  energetic: {
    keywords: ['元気', 'パワー', 'エネルギー', '活発'],
    patterns: [/元気/, /パワー/],
    default: false
  },
  friendly: {
    keywords: ['友達', '仲良し', 'フレンドリー'],
    patterns: [/友/, /仲良/],
    default: false
  },
  greeting: {
    keywords: ['こんにちは', 'はろー', 'おはよう', 'こんばんは'],
    patterns: [/こんにち/, /はろ/, /おはよ/],
    default: false
  },
  farewell: {
    keywords: ['さようなら', 'バイバイ', 'またね', 'じゃあね'],
    patterns: [/バイバイ/, /またね/, /さよう/],
    default: false
  },
  impressed: {
    keywords: ['感動', '素晴らしい', 'すばらしい'],
    patterns: [/感動/, /素晴らし/],
    default: false
  },
  mischievous: {
    keywords: ['いたずら', 'にやり', 'ふふふ'],
    patterns: [/にや/, /ふふ/],
    default: false
  },
  satisfied: {
    keywords: ['満足', '完璧', 'ばっちり', 'できた'],
    patterns: [/満足/, /完璧/, /できた/],
    default: false
  },
  attentive: {
    keywords: ['聞く', '聞いて', 'お話', '相談'],
    patterns: [/聞/, /相談/],
    default: false
  }
};

/**
 * Analyze message and determine appropriate emotion
 * @param {string} message - Message content to analyze
 * @param {string} context - Context type (user/assistant)
 * @returns {string} Emotion ID
 */
export function analyzeEmotion(message, context = 'assistant') {
  if (!message) return 'neutral';
  
  const lowerMessage = message.toLowerCase();
  let scores = {};
  
  // Calculate scores for each emotion
  for (const [emotion, config] of Object.entries(EXPRESSION_PATTERNS)) {
    let score = 0;
    
    // Check keywords
    for (const keyword of config.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        score += 10;
      }
    }
    
    // Check patterns
    for (const pattern of config.patterns) {
      if (pattern.test(message)) {
        score += 8;
      }
    }
    
    // Context-based adjustments
    if (context === 'assistant') {
      // Assistant-specific scoring
      if (emotion === 'greeting' && lowerMessage.includes('はろー')) {
        score += 15;
      }
      if (emotion === 'confident' && lowerMessage.includes('できる')) {
        score += 10;
      }
      if (emotion === 'professional' && (lowerMessage.includes('円') || lowerMessage.includes('営業日'))) {
        score += 12;
      }
    }
    
    scores[emotion] = score;
  }
  
  // Find highest scoring emotion
  let maxScore = 0;
  let selectedEmotion = 'neutral';
  
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      selectedEmotion = emotion;
    }
  }
  
  // If no clear match, use contextual defaults
  if (maxScore === 0) {
    if (context === 'assistant') {
      // Default emotions for different response types
      if (message.length < 50) {
        return 'friendly';  // Short responses
      } else if (lowerMessage.includes('？') || lowerMessage.includes('?')) {
        return 'curious';  // Questions
      } else if (lowerMessage.includes('！') || lowerMessage.includes('!')) {
        return 'excited';  // Exclamations
      } else {
        return 'neutral';  // Default
      }
    }
  }
  
  return selectedEmotion;
}

/**
 * Get emotion for quick responses
 * @param {string} responseType - Type of quick response
 * @returns {string} Emotion ID
 */
export function getQuickResponseEmotion(responseType) {
  const emotionMap = {
    greeting: 'greeting',
    thanks: 'grateful',
    farewell: 'farewell',
    simple: 'friendly',
    faq: 'explaining',
    error: 'worried',
    thinking: 'thinking'
  };
  
  return emotionMap[responseType] || 'neutral';
}

/**
 * Ensure emotion tag is present in message
 * @param {string} message - Message content
 * @param {string} emotion - Emotion to add if missing
 * @returns {string} Message with emotion tag
 */
export function ensureEmotionTag(message, emotion = null) {
  // Check if emotion tag already exists
  const existingTag = message.match(/\[\[emo:([a-z0-9_-]+)\]\]$/i);
  
  if (existingTag) {
    // Validate existing emotion
    const existingEmotion = existingTag[1];
    if (EXPRESSION_PATTERNS[existingEmotion]) {
      return message;  // Valid emotion already present
    }
    // Replace invalid emotion with analyzed one
    emotion = emotion || analyzeEmotion(message, 'assistant');
    return message.replace(/\s*\[\[emo:[^\]]+\]\]$/i, '') + ` [[emo:${emotion}]]`;
  }
  
  // No tag present, add one
  emotion = emotion || analyzeEmotion(message, 'assistant');
  return message + ` [[emo:${emotion}]]`;
}

/**
 * Get fallback emotion based on time of day
 * @returns {string} Emotion ID
 */
export function getTimeBasedEmotion() {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 10) {
    return 'energetic';  // Morning
  } else if (hour >= 10 && hour < 17) {
    return 'professional';  // Business hours
  } else if (hour >= 17 && hour < 21) {
    return 'friendly';  // Evening
  } else {
    return 'sleepy';  // Night
  }
}

/**
 * Get all available emotions
 * @returns {array} List of emotion IDs
 */
export function getAvailableEmotions() {
  return Object.keys(EXPRESSION_PATTERNS);
}

export default {
  analyzeEmotion,
  getQuickResponseEmotion,
  ensureEmotionTag,
  getTimeBasedEmotion,
  getAvailableEmotions,
  EXPRESSION_PATTERNS
};