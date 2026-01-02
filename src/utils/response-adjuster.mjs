/**
 * Response Length Adjuster
 * Adjusts response length based on context and user input
 */

/**
 * Analyze user message to determine appropriate response length
 * @param {string} userMessage - User's input message
 * @param {object} context - Additional context
 * @returns {object} Response adjustment settings
 */
export function analyzeResponseLength(userMessage, context = {}) {
  const message = userMessage.toLowerCase();
  const messageLength = userMessage.length;
  
  // Simple greetings → Short response
  const simpleGreetings = [
    'こんにちは', 'おはよう', 'こんばんは', 'はじめまして',
    'よろしく', 'hello', 'hi', 'hey', 'はろー'
  ];
  
  // Complex questions → Detailed response
  const complexKeywords = [
    '見積', '価格', '料金', '納期', 'いくら', 'どのくらい',
    '教えて', '説明', '詳しく', '比較', '違い', 'どうやって'
  ];
  
  // Yes/No questions → Medium response
  const yesNoPatterns = [
    'ですか？', 'ますか？', 'できる？', 'いい？', 'ある？'
  ];
  
  // Check message type
  let messageType = 'general';
  let targetLength = 'medium';
  let responseStyle = 'balanced';
  
  // 1. Check if simple greeting
  if (simpleGreetings.some(greeting => message.includes(greeting)) && messageLength < 20) {
    messageType = 'greeting';
    targetLength = 'short';
    responseStyle = 'friendly';
  }
  // 2. Check if complex question
  else if (complexKeywords.some(keyword => message.includes(keyword))) {
    messageType = 'complex_question';
    targetLength = 'detailed';
    responseStyle = 'informative';
  }
  // 3. Check if yes/no question
  else if (yesNoPatterns.some(pattern => message.includes(pattern))) {
    messageType = 'yes_no_question';
    targetLength = 'medium';
    responseStyle = 'direct';
  }
  // 4. Check if very short input
  else if (messageLength < 10) {
    messageType = 'short_input';
    targetLength = 'short';
    responseStyle = 'concise';
  }
  // 5. Check if follow-up (based on context)
  else if (context.isFollowUp) {
    messageType = 'follow_up';
    targetLength = 'medium';
    responseStyle = 'conversational';
  }
  
  // Additional adjustments based on specific scenarios
  const adjustments = {
    // Service inquiries
    hasServiceKeyword: /名刺|チラシ|ポスター|カタログ|サイト|ホームページ|動画/.test(message),
    // Specific number mentioned
    hasSpecificNumber: /\d+[枚部個冊]/.test(message),
    // Urgent request
    isUrgent: /急ぎ|至急|すぐ|今日|明日/.test(message),
    // Confirmation request
    isConfirmation: /お願い|頼む|やって|作って/.test(message)
  };
  
  // Adjust based on additional factors
  if (adjustments.hasServiceKeyword && adjustments.hasSpecificNumber) {
    // Specific service with quantity → Provide quote
    targetLength = 'detailed';
    responseStyle = 'quote';
  } else if (adjustments.isUrgent) {
    // Urgent → Be concise and action-oriented
    targetLength = 'medium';
    responseStyle = 'action_oriented';
  }
  
  return {
    messageType,
    targetLength,
    responseStyle,
    adjustments,
    guidelines: getResponseGuidelines(targetLength, responseStyle)
  };
}

/**
 * Get specific guidelines for response generation
 * @param {string} targetLength - Target response length
 * @param {string} responseStyle - Response style
 * @returns {object} Guidelines for response
 */
function getResponseGuidelines(targetLength, responseStyle) {
  const lengthGuidelines = {
    short: {
      charLimit: 50,
      sentences: '1-2文',
      instruction: '簡潔に一言で返答',
      example: 'はろー！何か作りたいものある？✨'
    },
    medium: {
      charLimit: 100,
      sentences: '2-3文',
      instruction: '要点を押さえて返答',
      example: 'オッケー！名刺100枚だね。3,300円くらいからできるよ〜✨'
    },
    detailed: {
      charLimit: 200,
      sentences: '3-5文',
      instruction: '必要な情報を含めて丁寧に返答',
      example: '名刺100枚なら3,300円くらいからできるよ！納期は通常5営業日くらいかな。デザインから作る場合は教えてね〜✨'
    }
  };
  
  const styleGuidelines = {
    friendly: {
      tone: '明るく軽い挨拶',
      focus: '親しみやすさ',
      avoid: '長い説明'
    },
    informative: {
      tone: '分かりやすく説明',
      focus: '必要な情報提供',
      avoid: '冗長な表現'
    },
    direct: {
      tone: '端的に回答',
      focus: '質問への直接的な答え',
      avoid: '余計な情報'
    },
    concise: {
      tone: '最小限の返答',
      focus: '核心のみ',
      avoid: '詳細説明'
    },
    conversational: {
      tone: '会話を続ける',
      focus: '流れを保つ',
      avoid: '唐突な話題変更'
    },
    quote: {
      tone: '具体的な提案',
      focus: '価格と納期',
      avoid: '曖昧な表現'
    },
    action_oriented: {
      tone: '次のステップ重視',
      focus: '行動提案',
      avoid: '長い前置き'
    }
  };
  
  return {
    length: lengthGuidelines[targetLength] || lengthGuidelines.medium,
    style: styleGuidelines[responseStyle] || styleGuidelines.balanced
  };
}

/**
 * Build adjusted Smaichan guardrails based on context
 * @param {object} analysis - Response length analysis
 * @returns {string} Adjusted guardrails
 */
export function buildAdjustedGuardrails(analysis) {
  const { targetLength, responseStyle, guidelines } = analysis;
  
  return `
## 返答の長さ調整ルール

### 今回の返答タイプ: ${targetLength}（${guidelines.length.sentences}）
- 文字数制限: ${guidelines.length.charLimit}字以内
- スタイル: ${responseStyle}
- 重点: ${guidelines.style.focus}
- 避けること: ${guidelines.style.avoid}

### 返答例
${guidelines.length.example}

### 厳守事項
- 挨拶だけの時は短く返す（50字以内）
- 具体的な質問には必要な情報を含める（100-200字）
- 会話の流れを大切にする
- 不必要に長くしない`;
}

/**
 * Determine if this is a follow-up message
 * @param {array} previousMessages - Previous conversation messages
 * @returns {boolean} Whether this is a follow-up
 */
export function isFollowUpMessage(previousMessages = []) {
  if (!previousMessages || previousMessages.length === 0) {
    return false;
  }
  
  // Check if there's recent conversation (within last 2 messages)
  const recentMessages = previousMessages.slice(-2);
  return recentMessages.length > 0;
}

export default {
  analyzeResponseLength,
  buildAdjustedGuardrails,
  isFollowUpMessage
};