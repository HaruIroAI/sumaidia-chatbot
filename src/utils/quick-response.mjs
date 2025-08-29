/**
 * Quick Response System
 * Provides instant responses for common greetings without AI
 */

// Common greetings and their quick responses
const QUICK_RESPONSES = {
  greetings: {
    patterns: [
      { match: /^こんにちは[！!]*$/i, response: "はろー！何か作りたいものある？✨" },
      { match: /^はじめまして[！!]*$/i, response: "はじめまして〜！スマイちゃんだよ。印刷のこと何でも聞いてね💕" },
      { match: /^おはよう(?:ございます)?[！!]*$/i, response: "おはよ〜！今日も元気にいこう✨" },
      { match: /^こんばんは[！!]*$/i, response: "こんばんは〜！遅くまでお疲れさま💕" },
      { match: /^hello[！!]*$/i, response: "Hello! スマイちゃんです✨" },
      { match: /^hi[！!]*$/i, response: "Hi! 何かお手伝いできる？💕" },
      { match: /^はろー[！!]*$/i, response: "はろー！元気？何か作る？✨" },
      { match: /^やっほー[！!]*$/i, response: "やっほー！調子どう？💕" },
      { match: /^よろしく(?:お願いします)?[！!]*$/i, response: "よろしくね〜！何でも相談して✨" }
    ]
  },
  thanks: {
    patterns: [
      { match: /^ありがとう(?:ございます)?[！!]*$/i, response: "どういたしまして〜！また何かあったら言ってね💕" },
      { match: /^thanks?[！!]*$/i, response: "You're welcome! 他にも聞きたいことある？✨" },
      { match: /^どうも[！!]*$/i, response: "いえいえ〜！お役に立てて嬉しい💕" }
    ]
  },
  farewell: {
    patterns: [
      { match: /^(?:それ)?じゃ+(?:ね)?[！!]*$/i, response: "またね〜！いつでも来てね✨" },
      { match: /^バイバイ[！!]*$/i, response: "バイバイ〜！また話そうね💕" },
      { match: /^さよ(?:う)?なら[！!]*$/i, response: "さよなら〜！気をつけてね✨" },
      { match: /^またね[！!]*$/i, response: "うん、またね〜！楽しみにしてる💕" },
      { match: /^bye[！!]*$/i, response: "Bye bye! See you soon✨" }
    ]
  },
  simple: {
    patterns: [
      { match: /^はい[！!]*$/i, response: "オッケー！何か聞きたいことある？✨" },
      { match: /^うん[！!]*$/i, response: "了解〜！続きをどうぞ💕" },
      { match: /^ok[！!]*$/i, response: "OK! 他に何かある？✨" },
      { match: /^わかった[！!]*$/i, response: "よかった〜！他にも質問ある？💕" },
      { match: /^なるほど[！!]*$/i, response: "だよね〜！何か作りたいものとかある？✨" }
    ]
  }
};

// Frequently asked simple questions with instant answers
const QUICK_FAQ = {
  hours: {
    patterns: [/営業時間/, /何時から/, /何時まで/, /開いて/],
    response: "平日8:30-18:00、土曜は隔週営業だよ〜！日祝はお休み✨"
  },
  location: {
    patterns: [/どこにある/, /場所は/, /住所/],
    response: "滋賀県栗東市が本社で、東京にもオフィスあるよ！詳しい住所教える？💕"
  },
  contact: {
    patterns: [/電話番号/, /連絡先/],
    response: "077-552-1045だよ！平日8:30-18:00に電話してね✨"
  },
  services: {
    patterns: [/何ができる/, /できること/, /サービス/],
    response: "印刷全般、Web制作、動画、SNS運用とか何でもできるよ〜！詳しく聞きたい？💕"
  }
};

/**
 * Check if message qualifies for quick response
 * @param {string} message - User message
 * @returns {object|null} Quick response if matched, null otherwise
 */
export function getQuickResponse(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const trimmedMessage = message.trim();
  
  // Check greeting patterns
  for (const category of Object.values(QUICK_RESPONSES)) {
    for (const pattern of category.patterns) {
      if (pattern.match.test(trimmedMessage)) {
        return {
          type: 'quick_response',
          category: 'greeting',
          message: pattern.response,
          skipAI: true,
          responseTime: 0
        };
      }
    }
  }

  // Check FAQ patterns (only for very simple ones)
  for (const [key, faq] of Object.entries(QUICK_FAQ)) {
    for (const pattern of faq.patterns) {
      if (pattern.test(trimmedMessage)) {
        return {
          type: 'quick_faq',
          category: key,
          message: faq.response,
          skipAI: true,
          responseTime: 0
        };
      }
    }
  }

  return null;
}

/**
 * Check if message is too complex for quick response
 * @param {string} message - User message
 * @returns {boolean} True if message needs AI processing
 */
export function needsAIProcessing(message) {
  if (!message) return false;
  
  // Complex indicators
  const complexIndicators = [
    /\d+[枚部個冊]/, // Specific quantities
    /いくら|価格|料金|見積/, // Price inquiries
    /詳し|説明|教えて/, // Detailed explanations
    /どう|なぜ|どうやって/, // How/Why questions
    /比較|違い|おすすめ/, // Comparisons
    /[。、]/, // Multiple sentences
    message.length > 30 // Long messages
  ];

  return complexIndicators.some(indicator => 
    typeof indicator === 'boolean' ? indicator : indicator.test(message)
  );
}

/**
 * Generate a variety response for common greetings
 * @param {string} category - Response category
 * @returns {string} Randomized response
 */
export function getVariedResponse(category) {
  const variations = {
    greeting: [
      "はろー！何か作りたいものある？✨",
      "やっほー！今日は何しよっか💕",
      "こんにちは〜！印刷のこと聞きたい？✨",
      "はろー！スマイちゃんだよ〜💕"
    ],
    thanks: [
      "どういたしまして〜！💕",
      "いえいえ！またね〜✨",
      "喜んでもらえて嬉しい〜💕",
      "またいつでも聞いてね✨"
    ],
    simple: [
      "オッケー！✨",
      "了解〜💕",
      "うんうん！✨",
      "わかった〜💕"
    ]
  };

  const responses = variations[category] || variations.greeting;
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Build quick response with metadata
 * @param {string} message - User message
 * @param {object} options - Response options
 * @returns {object} Response object
 */
export function buildQuickResponse(message, options = {}) {
  const quickResponse = getQuickResponse(message);
  
  if (quickResponse) {
    return {
      content: quickResponse.message,
      metadata: {
        type: 'quick_response',
        skipAI: true,
        responseTime: Date.now(),
        category: quickResponse.category,
        confidence: 1.0
      }
    };
  }

  return null;
}

export default {
  getQuickResponse,
  needsAIProcessing,
  getVariedResponse,
  buildQuickResponse
};