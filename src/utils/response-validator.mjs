/**
 * Response Validator
 * APIからの応答が文脈に合っているか検証
 */

/**
 * Validate if response matches context
 */
export function validateResponse(response, context) {
  const issues = [];
  
  // 名刺の話をしているのにWebサイトの話が含まれていないか
  if (context.type === 'businessCard' || context.isPrintingService) {
    if (response.includes('サイト') || response.includes('Web') || 
        response.includes('LP') || response.includes('EC') ||
        response.includes('公開') || response.includes('リニューアル')) {
      issues.push('printing_context_lost');
    }
  }
  
  // 既に伝えた情報を再度聞いていないか
  if (context.sessionInfo) {
    if (context.sessionInfo.quantity && 
        (response.includes('何枚') || response.includes('何部') || response.includes('枚数'))) {
      issues.push('asking_known_quantity');
    }
    
    if (context.sessionInfo.deadline && 
        (response.includes('いつまで') || response.includes('納期') || response.includes('締切'))) {
      issues.push('asking_known_deadline');
    }
  }
  
  // 複数の質問をしていないか
  const questionMarks = (response.match(/？/g) || []).length;
  const andPatterns = (response.match(/と|あと|それから/g) || []).length;
  
  if (questionMarks > 1 || (questionMarks === 1 && andPatterns >= 2)) {
    issues.push('multiple_questions');
  }
  
  return {
    valid: issues.length === 0,
    issues: issues
  };
}

/**
 * Fix invalid response
 */
export function fixInvalidResponse(response, context, issues) {
  // 文脈が失われた場合
  if (issues.includes('printing_context_lost')) {
    if (context.type === 'businessCard') {
      if (context.sessionInfo?.quantity && context.sessionInfo?.deadline) {
        return `名刺${context.sessionInfo.quantity}枚で${context.sessionInfo.deadline}までに作るよ！デザインどうする？💕`;
      } else if (context.sessionInfo?.quantity) {
        return `名刺${context.sessionInfo.quantity}枚ね！いつまでに必要？✨`;
      } else {
        return `名刺作るんだね！何枚必要？✨`;
      }
    }
  }
  
  // 既知情報を再度聞いている場合
  if (issues.includes('asking_known_quantity')) {
    return response.replace(/何枚.*？|枚数.*？|何部.*？/g, '');
  }
  
  if (issues.includes('asking_known_deadline')) {
    return response.replace(/いつまで.*？|納期.*？|締切.*？/g, '');
  }
  
  // 複数質問の場合、最初の質問だけにする
  if (issues.includes('multiple_questions')) {
    const firstQuestion = response.match(/^[^？]+？/);
    if (firstQuestion) {
      return firstQuestion[0] + '✨';
    }
  }
  
  return response;
}

/**
 * Get context summary for validation
 */
export function getValidationContext(session, domain) {
  return {
    type: session?.type,
    isPrintingService: domain === 'printing' || session?.type === 'businessCard',
    sessionInfo: {
      quantity: session?.quantity,
      deadline: session?.deadline,
      design: session?.designType
    }
  };
}

export default {
  validateResponse,
  fixInvalidResponse,
  getValidationContext
};