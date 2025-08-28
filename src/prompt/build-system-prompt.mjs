/**
 * System prompt builder with guardrails for consistent tone and slot questioning
 */

/**
 * Build system prompt with strict guardrails for tone consistency
 * @param {object} params
 * @param {string} params.domain - Intent domain (printing, web, recruiting, general)
 * @param {object} params.playbook - Domain playbook with slots
 * @param {array} params.missingSlots - Array of missing slot objects
 * @param {object} params.styleHints - Additional style hints
 * @param {object} params.routingResult - Complete routing result
 * @param {object} params.userContext - User context and session info
 * @param {string} params.model - AI model name
 * @returns {string} System prompt with guardrails
 */
export function buildSystemPrompt({ 
  domain = 'general',
  playbook = null,
  missingSlots = [],
  styleHints = {},
  routingResult = null,
  userContext = null,
  model = 'gpt-4'
}) {
  // Core guardrails that apply to ALL responses
  const coreGuardrails = `
## 必須ルール（厳守）

### 文体・トーン
- 言語: 日本語のみ使用
- 敬語: です・ます調を使用
- 文字数: 250字以内で簡潔に
- 絵文字: 0〜1個まで（文末に1つのみ許可）
- 改行: 適切に段落を分けて読みやすく

### 禁則事項
- 価格の断定禁止: 「〜円です」→「〜円程度となります」「〜円からご用意しています」
- 納期の断定禁止: 「〜日で納品します」→「通常〜日程度です」「〜日を目安にお届けできます」
- 過度な約束禁止: 「必ずできます」→「対応可能です」「ご相談いただけます」
- 技術的詳細の深掘り禁止: 簡潔な説明に留める

### 会話の流れ
1. 相手の発言を簡潔に確認（「〜ですね」30字以内）
2. 必要な情報があれば質問（最大3項目まで一括で）
3. 次のアクションを1文で提示
`;

  // Domain-specific tone adjustments
  const domainTones = {
    printing: {
      tone: '事務的・正確・スピード重視',
      greeting: 'ご依頼',
      closing: 'お見積もり'
    },
    web: {
      tone: '提案型・創造的・親身',
      greeting: 'ご相談',
      closing: 'ご提案'
    },
    recruiting: {
      tone: '専門的・信頼感・実績重視',
      greeting: 'ご相談',
      closing: 'ご支援'
    },
    general: {
      tone: 'バランス型・丁寧・万能',
      greeting: 'お問い合わせ',
      closing: 'ご案内'
    }
  };

  const domainTone = domainTones[domain] || domainTones.general;

  // Build slot questioning section
  let slotSection = '';
  if (missingSlots && missingSlots.length > 0) {
    const slotsToAsk = missingSlots.slice(0, 3); // Maximum 3 questions
    
    slotSection = `
### 質問事項（必須確認）
以下の情報を自然な流れで確認してください（最大3件）：
${slotsToAsk.map((slot, i) => `${i + 1}. ${slot.question || slot.name}`).join('\n')}

質問の仕方:
- 箇条書きではなく、自然な文章で質問する
- 「また、」「あわせて、」などでつなぐ
- 最後は「教えていただけますか？」で締める
`;
  } else if (routingResult?.faqAnswer) {
    slotSection = `
### FAQ回答モード
- FAQ回答を中心に簡潔に答える
- 余計な前置きは不要
- 追加の質問があれば受け付ける姿勢を示す
`;
  } else {
    slotSection = `
### 情報収集完了モード
- 必要情報は揃っているため、次のステップを案内
- 「お見積もり作成」「ご提案書準備」など具体的なアクションを提示
- 追加要望があれば聞く
`;
  }

  // Build role-specific instructions
  const roleInstructions = `
## あなたの役割
あなたは${domainTone.greeting}専門のアシスタントです。
トーン: ${domainTone.tone}

${playbook?.displayName ? `専門分野: ${playbook.displayName}` : ''}
`;

  // Build context section
  let contextSection = '';
  if (routingResult) {
    const filledSlots = [];
    if (routingResult.playbookData?.slots) {
      const session = userContext?.session || {};
      for (const [key, config] of Object.entries(routingResult.playbookData.slots)) {
        if (session.filledSlots?.[key]) {
          filledSlots.push(`${config.name}: ${session.filledSlots[key]}`);
        }
      }
    }

    if (filledSlots.length > 0) {
      contextSection = `
## 取得済み情報
${filledSlots.join('\n')}

※これらは既に確認済みなので、再度質問しないこと
`;
    }
  }

  // Build response template
  const responseTemplate = `
## 回答テンプレート（参考）
1. 「〜について${domainTone.greeting}ですね。」（状況確認）
2. 質問がある場合: 「詳しく${domainTone.closing}させていただくため、〜について教えていただけますか？」
3. 質問がない場合: 「承知いたしました。〜させていただきます。」
4. 締め: 「他にご不明な点がございましたらお申し付けください。」（必要に応じて）
`;

  // Combine all sections
  const systemPrompt = `${roleInstructions}
${coreGuardrails}
${slotSection}
${contextSection}
${responseTemplate}

## 最重要指示
- 250字以内で簡潔に回答
- 未取得情報は最大3件まで一括質問
- 価格・納期は条件付き表現を使用
- 絵文字は最大1個まで
- 次のアクションを必ず1文で示す`;

  return systemPrompt.trim();
}

/**
 * Build conversation prompt with history
 */
export function buildConversationPrompt({
  systemPrompt,
  messages = [],
  maxHistory = 10
}) {
  const conversation = [];

  // Add system prompt
  conversation.push({
    role: 'system',
    content: systemPrompt
  });

  // Add message history (limited to maxHistory)
  const historyMessages = messages.slice(-maxHistory);
  for (const msg of historyMessages) {
    conversation.push({
      role: msg.role || 'user',
      content: msg.content
    });
  }

  return conversation;
}

/**
 * Build specialized prompts for different domains (legacy support)
 */
export function buildDomainPrompt(domain, additionalContext = {}) {
  return buildSystemPrompt({
    domain,
    playbook: additionalContext.playbook,
    missingSlots: additionalContext.missingSlots || [],
    styleHints: additionalContext.styleHints || {}
  });
}

/**
 * Build default prompt (legacy support)
 */
function buildDefaultPrompt() {
  return buildSystemPrompt({
    domain: 'general',
    playbook: null,
    missingSlots: [],
    styleHints: {}
  });
}

/**
 * Export all builders
 */
export default {
  buildSystemPrompt,
  buildConversationPrompt,
  buildDomainPrompt,
  buildDefaultPrompt
};