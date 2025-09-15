/**
 * Enhanced Quick Response System with Caching
 * Provides instant responses for more patterns without AI
 */

// In-memory cache for recent responses
const responseCache = new Map();
const CACHE_TTL = 300000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// Extended quick response patterns
const QUICK_RESPONSES = {
  greetings: {
    patterns: [
      { match: /^こんにちは[！!]*$/i, response: "こんにちは〜！スマイディアのサービスをご案内するね✨ [[emo:greeting]]", skipAI: true },
      { match: /^はじめまして[！!]*$/i, response: "はじめまして〜！スマイちゃんだよ。どんなご用件かな？💕 [[emo:friendly]]", skipAI: true },
      { match: /^おはよう(?:ございます)?[！!]*$/i, response: "おはよ〜！今日はどんなお手伝いができるかな？✨ [[emo:energetic]]", skipAI: true },
      { match: /^こんばんは[！!]*$/i, response: "こんばんは〜！どのサービスについて聞きたい？💕 [[emo:greeting]]", skipAI: true },
      { match: /^hello[！!]*$/i, response: "Hello! スマイディアへようこそ✨ [[emo:greeting]]", skipAI: true },
      { match: /^hi[！!]*$/i, response: "Hi! どんなご相談かな？💕 [[emo:friendly]]", skipAI: true },
      { match: /^はろー[！!]*$/i, response: "やっほー！どのサービスに興味ある？✨ [[emo:greeting]]", skipAI: true },
      { match: /^やっほー[！!]*$/i, response: "やっほー！調子どう？💕 [[emo:playful]]" },
      { match: /^よろしく(?:お願いします)?[！!]*$/i, response: "よろしくね〜！何でも相談して✨ [[emo:friendly]]" },
      { match: /^どうも[！!]*$/i, response: "どうも〜！今日は何かお手伝いできる？✨ [[emo:greeting]]" },
      { match: /^ヨ[ーッ]+$/i, response: "ヨー！調子いい？💕 [[emo:playful]]" },
      { match: /^お疲れ(?:様)?[！!]*$/i, response: "お疲れさま〜！ゆっくりしてってね✨ [[emo:supportive]]" }
    ]
  },
  thanks: {
    patterns: [
      { match: /^ありがとう(?:ございます)?[！!]*$/i, response: "どういたしまして〜！また何かあったら言ってね💕 [[emo:grateful]]" },
      { match: /^thanks?[！!]*$/i, response: "You're welcome! 他にも聞きたいことある？✨ [[emo:happy]]" },
      { match: /^感謝[！!]*$/i, response: "こちらこそ〜！お役に立てて嬉しい💕 [[emo:grateful]]" },
      { match: /^助かった[！!]*$/i, response: "よかった〜！また困ったら言ってね✨ [[emo:happy]]" },
      { match: /^サンキュー[！!]*$/i, response: "どういたしまして！他にも何かある？💕 [[emo:friendly]]" }
    ]
  },
  farewell: {
    patterns: [
      { match: /^(?:それ)?じゃ+(?:ね)?[！!]*$/i, response: "またね〜！いつでも来てね✨ [[emo:farewell]]" },
      { match: /^バイバイ[！!]*$/i, response: "バイバイ〜！また話そうね💕 [[emo:farewell]]" },
      { match: /^さよ(?:う)?なら[！!]*$/i, response: "さよなら〜！気をつけてね✨ [[emo:farewell]]" },
      { match: /^またね[！!]*$/i, response: "うん、またね〜！楽しみにしてる💕 [[emo:farewell]]" },
      { match: /^bye[！!]*$/i, response: "Bye bye! See you soon✨ [[emo:farewell]]" },
      { match: /^see you[！!]*$/i, response: "See you! またね〜💕 [[emo:farewell]]" },
      { match: /^失礼します[！!]*$/i, response: "はい、お疲れさまでした〜✨ [[emo:farewell]]" }
    ]
  },
  simple: {
    patterns: [
      { match: /^はい[！!]*$/i, response: "オッケー！何か聞きたいことある？✨ [[emo:confident]]" },
      { match: /^うん[！!]*$/i, response: "了解〜！続きをどうぞ💕 [[emo:friendly]]" },
      { match: /^ok[！!]*$/i, response: "OK! 他に何かある？✨ [[emo:confident]]" },
      { match: /^わかった[！!]*$/i, response: "よかった〜！他にも質問ある？💕 [[emo:happy]]" },
      { match: /^なるほど[！!]*$/i, response: "だよね〜！何か作りたいものとかある？✨ [[emo:thinking]]" },
      { match: /^そうなんだ[！!]*$/i, response: "そうなの〜！面白いよね💕 [[emo:curious]]" },
      { match: /^了解[！!]*$/i, response: "了解！次はどうする？✨ [[emo:confident]]" },
      { match: /^オッケー[！!]*$/i, response: "オッケー！準備できたよ💕 [[emo:confident]]" },
      { match: /^いいよ[！!]*$/i, response: "やった〜！じゃあ始めよう✨ [[emo:happy]]" },
      { match: /^大丈夫[！!]*$/i, response: "よかった！安心した〜💕 [[emo:satisfied]]" }
    ]
  },
  questions: {
    patterns: [
      { match: /^元気[?？]*$/i, response: "元気だよ〜！今日も頑張ろう✨ [[emo:energetic]]" },
      { match: /^調子(?:は)?どう[?？]*$/i, response: "絶好調だよ〜！何か作る？💕 [[emo:energetic]]" },
      { match: /^何してる[?？]*$/i, response: "みんなのお手伝い待ってるよ〜✨ [[emo:friendly]]" },
      { match: /^誰[?？]*$/i, response: "スマイちゃんだよ！印刷のプロ💕 [[emo:proud]]" },
      { match: /^できる[?？]*$/i, response: "もちろん！任せて〜✨ [[emo:confident]]" }
    ]
  },
  emotions: {
    patterns: [
      { match: /^嬉しい[！!]*$/i, response: "わーい！私も嬉しい〜💕 [[emo:happy]]" },
      { match: /^楽しい[！!]*$/i, response: "楽しいよね〜！もっと楽しもう✨ [[emo:playful]]" },
      { match: /^すごい[！!]*$/i, response: "でしょ〜！もっとすごいのもあるよ💕 [[emo:proud]]" },
      { match: /^かわいい[！!]*$/i, response: "えへへ〜！照れちゃう💕 [[emo:embarrassed]]" },
      { match: /^頑張って[！!]*$/i, response: "うん！一緒に頑張ろう✨ [[emo:determined]]" },
      { match: /^応援(?:してる)?[！!]*$/i, response: "ありがとう！私も応援してる〜💕 [[emo:supportive]]" }
    ]
  },
  business: {
    patterns: [
      { match: /^印刷[！!?？]*$/i, response: "印刷のことなら何でも聞いて！名刺？チラシ？✨ [[emo:professional]]" },
      { match: /^名刺[！!?？]*$/i, response: "名刺作りたいの？デザインから印刷まで全部できるよ💕 [[emo:working]]" },
      { match: /^チラシ[！!?？]*$/i, response: "チラシね！サイズと枚数教えてもらえる？✨ [[emo:professional]]" },
      { match: /^ポスター[！!?？]*$/i, response: "ポスター制作もお任せ！どんなイメージ？💕 [[emo:working]]" },
      { match: /他とは?違うチラシ/i, response: "他と違うチラシ作りたいんだね！キラキラ加工とか、特殊な紙とか、AR付きとか、いろんな方法があるよ〜✨ どんなイメージが好き？ [[emo:excited]]" },
      { match: /かわいい名刺/i, response: "かわいい名刺いいね〜！丸い角とか、パステルカラーとか、イラスト入りとか、いろんなかわいいデザインできるよ💕 [[emo:love]]" },
      { match: /どんな.*チラシ.*いい/i, response: "目的によって変わるよ〜！イベント告知なら派手に、高級店なら上品に、セールなら目立つように✨ 何を宣伝する？ [[emo:thinking]]" },
      { match: /チラシ.*作りたい/i, response: "チラシ制作お任せ〜！A4が人気だけど、三つ折りや変形サイズもできるよ✨ 何枚くらい必要？ [[emo:professional]]" },
      { match: /^名刺.*作りたい/i, response: "名刺作りたいんだね！何枚必要？✨ [[emo:confident]]", skipAI: true },
      { match: /^名刺を作りたい$/i, response: "名刺いいね〜！何枚必要？✨ [[emo:excited]]", skipAI: true },
      { match: /魅力的な名刺/i, response: "魅力的な名刺作るね〜！何枚必要？✨ [[emo:excited]]", skipAI: true },
      { match: /魅力的な名刺.*作りたい/i, response: "魅力的な名刺作るね〜！何枚必要？✨ [[emo:excited]]", skipAI: true },
      { match: /かっこいい名刺/i, response: "かっこいい名刺いいね！何枚作る？✨ [[emo:confident]]", skipAI: true },
      { match: /シンプルな名刺/i, response: "シンプルな名刺だね！何枚必要？✨ [[emo:professional]]", skipAI: true }
    ]
  }
};

// Frequently asked simple questions with instant answers
const QUICK_FAQ = {
  hours: {
    patterns: [/営業時間/, /何時から/, /何時まで/, /開いて/],
    response: "平日8:30-18:00、土曜は隔週営業だよ〜！日祝はお休み✨ [[emo:explaining]]"
  },
  location: {
    patterns: [/どこにある/, /場所は/, /住所/],
    response: "滋賀県栗東市が本社で、東京にもオフィスあるよ！詳しい住所教える？💕 [[emo:explaining]]"
  },
  contact: {
    patterns: [/電話番号/, /連絡先/],
    response: "077-552-1045だよ！平日8:30-18:00に電話してね✨ [[emo:professional]]"
  },
  services: {
    patterns: [/何ができる/, /できること/, /サービス/],
    response: "印刷全般、Web制作、動画、SNS運用とか何でもできるよ〜！詳しく聞きたい？💕 [[emo:proud]]"
  },
  price: {
    patterns: [/いくら/, /値段/, /料金/, /価格/],
    response: "種類や枚数によって変わるから、詳しく教えてもらえる？見積もり出すよ〜✨ [[emo:professional]]"
  },
  delivery: {
    patterns: [/納期/, /いつまで/, /何日/],
    response: "通常は3-5営業日だけど、急ぎの相談も乗るよ！いつまでに必要？💕 [[emo:professional]]"
  }
};

/**
 * Check cache for recent response
 */
function getCachedResponse(message) {
  const cached = responseCache.get(message.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  // Clean expired entries
  if (cached) {
    responseCache.delete(message.toLowerCase());
  }
  return null;
}

/**
 * Store response in cache
 */
function cacheResponse(message, response) {
  // Limit cache size
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  
  responseCache.set(message.toLowerCase(), {
    response: response,
    timestamp: Date.now()
  });
}

/**
 * Check if message qualifies for quick response (enhanced)
 */
export function getQuickResponse(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const trimmedMessage = message.trim();
  
  // Check cache first
  const cached = getCachedResponse(trimmedMessage);
  if (cached) {
    return cached;
  }
  
  // Check all response patterns
  for (const [categoryName, category] of Object.entries(QUICK_RESPONSES)) {
    for (const pattern of category.patterns) {
      if (pattern.match.test(trimmedMessage)) {
        const response = {
          type: 'quick_response',
          category: categoryName,
          message: pattern.response,
          skipAI: true,
          responseTime: 0,
          cached: false
        };
        // Cache this response
        cacheResponse(trimmedMessage, response);
        return response;
      }
    }
  }

  // Check FAQ patterns
  for (const [key, faq] of Object.entries(QUICK_FAQ)) {
    for (const pattern of faq.patterns) {
      if (pattern.test(trimmedMessage)) {
        const response = {
          type: 'quick_faq',
          category: key,
          message: faq.response,
          skipAI: true,
          responseTime: 0,
          cached: false
        };
        // Cache this response
        cacheResponse(trimmedMessage, response);
        return response;
      }
    }
  }

  return null;
}

/**
 * Check if message needs AI processing (more lenient)
 */
export function needsAIProcessing(message) {
  if (!message) return false;
  
  // More complex indicators that definitely need AI
  const complexIndicators = [
    /\d{3,}[枚部個冊]/, // Large quantities (100+)
    /詳し(く|い).*説明/, // Detailed explanations
    /どうやって.*作/, // How-to questions
    /比較|違い/, // Comparisons
    /[。、].*[。、]/, // Multiple sentences with punctuation
    message.length > 50 // Longer messages
  ];

  return complexIndicators.some(indicator => 
    typeof indicator === 'boolean' ? indicator : indicator.test(message)
  );
}

/**
 * Clear cache (for memory management)
 */
export function clearCache() {
  responseCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: responseCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL
  };
}

/**
 * Generate varied response for common greetings
 */
export function getVariedResponse(category) {
  const variations = {
    greeting: [
      "はろー！何か作りたいものある？✨ [[emo:greeting]]",
      "やっほー！今日は何しよっか💕 [[emo:playful]]",
      "こんにちは〜！印刷のこと聞きたい？✨ [[emo:friendly]]",
      "はろー！スマイちゃんだよ〜💕 [[emo:greeting]]"
    ],
    thanks: [
      "どういたしまして〜！💕 [[emo:grateful]]",
      "いえいえ！またね〜✨ [[emo:happy]]",
      "喜んでもらえて嬉しい〜💕 [[emo:happy]]",
      "またいつでも聞いてね✨ [[emo:friendly]]"
    ],
    simple: [
      "オッケー！✨ [[emo:confident]]",
      "了解〜💕 [[emo:friendly]]",
      "うんうん！✨ [[emo:attentive]]",
      "わかった〜💕 [[emo:confident]]"
    ]
  };

  const responses = variations[category] || variations.greeting;
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Build quick response with metadata
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
        confidence: 1.0,
        cached: quickResponse.cached || false
      }
    };
  }

  return null;
}

export default {
  getQuickResponse,
  needsAIProcessing,
  getVariedResponse,
  buildQuickResponse,
  clearCache,
  getCacheStats
};