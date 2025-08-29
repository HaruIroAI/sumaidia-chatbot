/**
 * Conversation Memory Manager
 * Maintains context and prevents repetitive questions
 */

// In-memory conversation storage (per session)
const conversationSessions = new Map();
const SESSION_TTL = 3600000; // 1 hour

/**
 * Extract key information from user messages
 */
export function extractKeyInfo(message) {
  const info = {};
  
  // Budget extraction
  const budgetMatch = message.match(/(\d+[\d,]*)\s*万円/);
  if (budgetMatch) {
    info.budget = parseInt(budgetMatch[1].replace(/,/g, '')) + '万円';
  }
  
  // Deadline extraction
  const deadlinePatterns = [
    /(\d+)\s*ヶ月後/,
    /(\d+)\s*月後/,
    /(\d+)\s*週間後/,
    /(\d+)\s*日後/,
    /明日/,
    /今週中/,
    /今月中/,
    /来週/,
    /来月/
  ];
  
  for (const pattern of deadlinePatterns) {
    const match = message.match(pattern);
    if (match) {
      if (match[0] === '明日') info.deadline = '明日';
      else if (match[0] === '今週中') info.deadline = '今週中';
      else if (match[0] === '今月中') info.deadline = '今月中';
      else if (match[0] === '来週') info.deadline = '来週';
      else if (match[0] === '来月') info.deadline = '来月';
      else info.deadline = match[0];
      break;
    }
  }
  
  // Service type extraction
  const serviceTypes = {
    'ECサイト': ['ECサイト', 'EC', 'ネットショップ', 'オンラインショップ', 'Amazon', 'AMAZON', 'アマゾン', 'イーコマース'],
    'Webサイト': ['ホームページ', 'HP', 'サイト', 'ウェブサイト', 'WEB'],
    '名刺': ['名刺', 'ビジネスカード', 'ネームカード'],
    'チラシ': ['チラシ', 'フライヤー', 'ビラ', 'フライヤ'],
    'ポスター': ['ポスター'],
    'カタログ': ['カタログ', 'パンフレット', 'ブックレット'],
    '動画': ['動画', 'ムービー', '映像', 'ビデオ'],
    'デザイン': ['デザイン', 'ロゴ', 'イラスト'],
    '広告': ['広告', 'PR', 'プロモーション', '宣伝']
  };
  
  for (const [type, keywords] of Object.entries(serviceTypes)) {
    if (keywords.some(keyword => message.includes(keyword))) {
      info.serviceType = type;
      break;
    }
  }
  
  // Quantity extraction
  const quantityMatch = message.match(/(\d+)\s*[枚部個点]/);
  if (quantityMatch) {
    info.quantity = quantityMatch[0];
  }
  
  // Scope/Feature extraction for web projects
  if (message.includes('機能')) {
    info.requestingFeatures = true;
  }
  
  // Business context
  if (message.includes('売上') || message.includes('売り上げ')) {
    info.businessContext = '売上改善';
  }
  
  return info;
}

/**
 * Get or create session
 */
export function getSession(sessionId) {
  // Clean expired sessions
  const now = Date.now();
  for (const [id, session] of conversationSessions.entries()) {
    if (now - session.lastActive > SESSION_TTL) {
      conversationSessions.delete(id);
    }
  }
  
  if (!conversationSessions.has(sessionId)) {
    conversationSessions.set(sessionId, {
      id: sessionId,
      startTime: Date.now(),
      lastActive: Date.now(),
      context: {},
      messages: [],
      extractedInfo: {},
      askedQuestions: new Set()
    });
  }
  
  const session = conversationSessions.get(sessionId);
  session.lastActive = Date.now();
  return session;
}

/**
 * Update session with new message and extracted info
 */
export function updateSession(sessionId, message, role = 'user') {
  const session = getSession(sessionId);
  
  // Store message
  session.messages.push({
    role,
    content: message,
    timestamp: Date.now()
  });
  
  // Extract and merge information if user message
  if (role === 'user') {
    const newInfo = extractKeyInfo(message);
    session.extractedInfo = { ...session.extractedInfo, ...newInfo };
    
    // Track what we've asked about
    if (role === 'assistant') {
      if (message.includes('納期')) session.askedQuestions.add('deadline');
      if (message.includes('予算')) session.askedQuestions.add('budget');
      if (message.includes('何を作る')) session.askedQuestions.add('serviceType');
      if (message.includes('枚数') || message.includes('数量')) session.askedQuestions.add('quantity');
    }
  }
  
  return session;
}

/**
 * Get questions that haven't been answered yet
 */
export function getMissingInfo(sessionId) {
  const session = getSession(sessionId);
  const missing = [];
  
  // Required info based on context
  const required = {
    'ECサイト': ['budget', 'deadline', 'features'],
    'Webサイト': ['budget', 'deadline', 'pages'],
    '名刺': ['quantity', 'deadline', 'design'],
    'チラシ': ['quantity', 'size', 'deadline'],
    '売上改善': ['currentSituation', 'targetAudience', 'budget']
  };
  
  const serviceType = session.extractedInfo.serviceType || session.extractedInfo.businessContext;
  const requiredFields = required[serviceType] || ['serviceType', 'deadline', 'budget'];
  
  for (const field of requiredFields) {
    if (!session.extractedInfo[field] && !session.askedQuestions.has(field)) {
      missing.push(field);
    }
  }
  
  return missing;
}

/**
 * Build context summary for AI
 */
export function buildContextSummary(sessionId) {
  const session = getSession(sessionId);
  const info = session.extractedInfo;
  
  let summary = '## 現在把握している情報\n';
  
  if (info.serviceType) {
    summary += `- 作りたいもの: ${info.serviceType}\n`;
  }
  if (info.budget) {
    summary += `- 予算: ${info.budget}\n`;
  }
  if (info.deadline) {
    summary += `- 納期: ${info.deadline}\n`;
  }
  if (info.quantity) {
    summary += `- 数量: ${info.quantity}\n`;
  }
  if (info.businessContext) {
    summary += `- 相談内容: ${info.businessContext}\n`;
  }
  
  // Add conversation count
  summary += `\n## 会話情報\n`;
  summary += `- やり取り回数: ${session.messages.length}回\n`;
  
  // Add what we've already asked
  if (session.askedQuestions.size > 0) {
    summary += `\n## 既に質問済みの項目（再度聞かないこと）\n`;
    const questionLabels = {
      'deadline': '納期',
      'budget': '予算',
      'serviceType': '作りたいもの',
      'quantity': '数量'
    };
    
    for (const question of session.askedQuestions) {
      summary += `- ${questionLabels[question] || question}\n`;
    }
  }
  
  // Add missing info that we need
  const missing = getMissingInfo(sessionId);
  if (missing.length > 0) {
    summary += `\n## まだ確認が必要な項目\n`;
    const fieldLabels = {
      'features': '必要な機能',
      'pages': 'ページ数',
      'design': 'デザインの要望',
      'size': 'サイズ',
      'currentSituation': '現在の状況',
      'targetAudience': 'ターゲット層'
    };
    
    for (const field of missing) {
      summary += `- ${fieldLabels[field] || field}\n`;
    }
  }
  
  return summary;
}

/**
 * Check if information was already provided
 */
export function wasAlreadyProvided(sessionId, infoType) {
  const session = getSession(sessionId);
  return !!session.extractedInfo[infoType];
}

/**
 * Get specific information from session
 */
export function getSessionInfo(sessionId, infoType) {
  const session = getSession(sessionId);
  return session.extractedInfo[infoType];
}

/**
 * Clear session
 */
export function clearSession(sessionId) {
  conversationSessions.delete(sessionId);
}

/**
 * Get all active sessions (for debugging)
 */
export function getAllSessions() {
  return Array.from(conversationSessions.entries()).map(([id, session]) => ({
    id,
    messageCount: session.messages.length,
    extractedInfo: session.extractedInfo,
    lastActive: new Date(session.lastActive).toISOString()
  }));
}

export default {
  extractKeyInfo,
  getSession,
  updateSession,
  getMissingInfo,
  buildContextSummary,
  wasAlreadyProvided,
  getSessionInfo,
  clearSession,
  getAllSessions
};