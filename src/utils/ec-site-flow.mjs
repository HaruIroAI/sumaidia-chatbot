/**
 * EC Site Conversation Flow Manager
 * ECサイト相談専用の会話フロー管理
 */

import { getECPricingRecommendation, generateECPricingMessage } from '../knowledge/ec-site-pricing.mjs';

// ECサイト相談の状態管理
const ecSessions = new Map();

/**
 * EC conversation states
 */
const EC_STATES = {
  INITIAL: 'initial',
  BUDGET_INQUIRY: 'budget_inquiry',
  TIMELINE_INQUIRY: 'timeline_inquiry',
  FEATURES_INQUIRY: 'features_inquiry',
  SCALE_INQUIRY: 'scale_inquiry',
  PROPOSAL: 'proposal',
  CONTACT_COLLECTION: 'contact_collection'
};

/**
 * Initialize or get EC session
 */
export function getECSession(sessionId) {
  if (!ecSessions.has(sessionId)) {
    ecSessions.set(sessionId, {
      state: EC_STATES.INITIAL,
      collectedInfo: {},
      askedAbout: [],
      messageCount: 0,
      startTime: Date.now()
    });
  }
  return ecSessions.get(sessionId);
}

/**
 * Analyze EC site message context
 */
export function analyzeECContext(message, sessionId) {
  const session = getECSession(sessionId);
  session.messageCount++;
  
  const context = {
    isECRelated: false,
    mentionsBudget: false,
    mentionsTimeline: false,
    mentionsFeatures: false,
    mentionsScale: false,
    budget: null,
    timeline: null,
    scale: null
  };
  
  // Check if EC related
  const ecKeywords = ['ECサイト', 'EC', 'ネットショップ', 'オンラインショップ', 'Amazon', 'アマゾン'];
  context.isECRelated = ecKeywords.some(keyword => message.includes(keyword));
  
  // Budget detection
  const budgetMatch = message.match(/(\d+[\d,]*)\s*万円/);
  if (budgetMatch) {
    context.mentionsBudget = true;
    context.budget = budgetMatch[0];
    session.collectedInfo.budget = context.budget;
  }
  
  // Timeline detection
  const timelinePatterns = [
    /(\d+)\s*ヶ月/,
    /(\d+)\s*か月/,
    /(\d+)\s*カ月/,
    /来月/,
    /今月/,
    /急ぎ/,
    /なるべく早く/
  ];
  
  for (const pattern of timelinePatterns) {
    if (pattern.test(message)) {
      context.mentionsTimeline = true;
      const match = message.match(pattern);
      context.timeline = match[0];
      session.collectedInfo.timeline = context.timeline;
      break;
    }
  }
  
  // Scale detection
  if (message.includes('Amazon') || message.includes('アマゾン')) {
    context.mentionsScale = true;
    context.scale = 'Amazon';
    session.collectedInfo.scale = 'Amazon';
  }
  
  // Features detection
  const featureKeywords = ['機能', '決済', '会員', 'ポイント', '在庫管理', 'AI'];
  context.mentionsFeatures = featureKeywords.some(keyword => message.includes(keyword));
  
  return context;
}

/**
 * Generate EC site specific response
 */
export function generateECResponse(context, session) {
  const info = session.collectedInfo;
  let response = '';
  let emotion = 'professional';
  let nextActions = [];
  
  // Initial EC inquiry
  if (session.state === EC_STATES.INITIAL && context.isECRelated) {
    session.state = EC_STATES.BUDGET_INQUIRY;
    
    if (context.mentionsBudget && context.mentionsTimeline) {
      // Both budget and timeline provided
      if (info.budget === '300万円' && info.timeline === '1ヶ月') {
        response = '300万円の予算で1ヶ月後に必要なんだね！プロフェッショナルプラン（300-500万円）がピッタリだよ〜！AI推奨機能やマーケットプレイス機能も付けられるよ。ただ1ヶ月だとタイトだから、段階リリースの提案もできるよ💕';
        emotion = 'excited';
        session.state = EC_STATES.FEATURES_INQUIRY;
        nextActions = [
          { text: '段階リリースで進める', value: '段階リリースでお願いします', emotion: 'determined' },
          { text: '必要な機能を相談', value: '必要な機能を相談したい', emotion: 'thinking' },
          { text: '見積もりが欲しい', value: '正式な見積もりをお願いします', emotion: 'professional' }
        ];
      } else {
        response = generateECPricingMessage({ budget: info.budget, timeline: info.timeline });
        emotion = 'helpful';
      }
    } else if (context.mentionsBudget) {
      // Only budget provided
      response = `${info.budget}の予算でECサイトを作るんだね！いつまでに必要？納期によって最適なプランを提案するよ〜✨`;
      emotion = 'curious';
      session.state = EC_STATES.TIMELINE_INQUIRY;
      nextActions = [
        { text: '1ヶ月以内', value: '1ヶ月以内に必要です', emotion: 'determined' },
        { text: '2-3ヶ月', value: '2-3ヶ月で大丈夫です', emotion: 'relaxed' },
        { text: '急ぎではない', value: '特に急いでいません', emotion: 'neutral' }
      ];
    } else if (context.mentionsTimeline) {
      // Only timeline provided
      response = `${info.timeline}までにECサイトが必要なんだね！予算はどのくらいを考えてる？規模に合わせて提案するよ〜💕`;
      emotion = 'professional';
      session.state = EC_STATES.BUDGET_INQUIRY;
      nextActions = [
        { text: '〜100万円', value: '予算は100万円以内です', emotion: 'professional' },
        { text: '〜300万円', value: '予算は300万円以内です', emotion: 'professional' },
        { text: '500万円以上OK', value: '500万円以上でも大丈夫です', emotion: 'proud' }
      ];
    } else {
      // No specific info provided
      response = 'ECサイト作りたいんだね！素敵〜✨ まず予算と納期を教えてもらえる？ピッタリのプランを提案するね！';
      emotion = 'excited';
      nextActions = [
        { text: '費用を知りたい', value: 'ECサイトの費用を教えて', emotion: 'curious' },
        { text: '機能を相談', value: '必要な機能を相談したい', emotion: 'thinking' },
        { text: '事例を見たい', value: 'ECサイトの事例を見せて', emotion: 'interested' }
      ];
    }
  }
  
  // Follow-up states
  else if (session.state === EC_STATES.BUDGET_INQUIRY && context.mentionsBudget) {
    session.collectedInfo.budget = context.budget;
    if (session.collectedInfo.timeline) {
      response = generateECPricingMessage(session.collectedInfo);
      session.state = EC_STATES.PROPOSAL;
      emotion = 'proud';
    } else {
      response = `${context.budget}の予算だね！いつまでに公開したい？スケジュールによって最適な進め方を提案するよ〜✨`;
      session.state = EC_STATES.TIMELINE_INQUIRY;
      emotion = 'helpful';
    }
  }
  
  else if (session.state === EC_STATES.TIMELINE_INQUIRY && context.mentionsTimeline) {
    session.collectedInfo.timeline = context.timeline;
    if (session.collectedInfo.budget) {
      response = generateECPricingMessage(session.collectedInfo);
      session.state = EC_STATES.PROPOSAL;
      emotion = 'confident';
    } else {
      response = `${context.timeline}までに必要なんだね！予算はどのくらい？規模に合わせた最適プランを提案するよ💕`;
      session.state = EC_STATES.BUDGET_INQUIRY;
      emotion = 'curious';
    }
  }
  
  // Scale inquiry (Amazon-like)
  else if (context.mentionsScale && context.scale === 'Amazon') {
    response = 'Amazonみたいな本格的なECサイトだね！それならプロフェッショナルプラン（300-500万円）以上がおすすめ！マーケットプレイス機能、AI推奨、高度な在庫管理が全部できるよ✨';
    emotion = 'star_eyes';
    session.state = EC_STATES.FEATURES_INQUIRY;
    nextActions = [
      { text: '詳しく聞きたい', value: '詳しい機能を教えて', emotion: 'curious' },
      { text: '見積もりが欲しい', value: '見積もりをお願いします', emotion: 'professional' },
      { text: '事例を見たい', value: '類似の事例を見せて', emotion: 'interested' }
    ];
  }
  
  return {
    response,
    emotion,
    nextActions,
    state: session.state,
    collectedInfo: session.collectedInfo
  };
}

/**
 * Check if we should use EC flow
 */
export function shouldUseECFlow(message, sessionId) {
  const context = analyzeECContext(message, sessionId);
  const session = getECSession(sessionId);
  
  // Use EC flow if:
  // 1. Message mentions EC/online shop
  // 2. We're already in an EC conversation
  // 3. Message contains EC-related budget/timeline
  return context.isECRelated || 
         session.state !== EC_STATES.INITIAL ||
         (context.mentionsBudget && session.messageCount > 0);
}

/**
 * Get EC session summary for context
 */
export function getECSessionSummary(sessionId) {
  const session = getECSession(sessionId);
  if (!session || session.state === EC_STATES.INITIAL) {
    return null;
  }
  
  let summary = 'ECサイト相談中:\n';
  if (session.collectedInfo.budget) {
    summary += `- 予算: ${session.collectedInfo.budget}\n`;
  }
  if (session.collectedInfo.timeline) {
    summary += `- 納期: ${session.collectedInfo.timeline}\n`;
  }
  if (session.collectedInfo.scale) {
    summary += `- 規模: ${session.collectedInfo.scale}級\n`;
  }
  summary += `- 現在の状態: ${session.state}\n`;
  
  return summary;
}

/**
 * Clear EC session
 */
export function clearECSession(sessionId) {
  ecSessions.delete(sessionId);
}

export default {
  getECSession,
  analyzeECContext,
  generateECResponse,
  shouldUseECFlow,
  getECSessionSummary,
  clearECSession,
  EC_STATES
};