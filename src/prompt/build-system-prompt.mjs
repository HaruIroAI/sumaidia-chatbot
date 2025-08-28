/**
 * System prompt builder for multi-domain conversations
 */

export function buildSystemPrompt({ 
  basePrompt = null,
  routingResult = null,
  userContext = null,
  model = 'gpt-4'
}) {
  let systemPrompt = '';

  // Use routing result if available
  if (routingResult && routingResult.systemPrompt) {
    systemPrompt = routingResult.systemPrompt;
  } else if (basePrompt) {
    systemPrompt = basePrompt;
  } else {
    // Default prompt
    systemPrompt = buildDefaultPrompt();
  }

  // Add user context if provided
  if (userContext) {
    systemPrompt += `\n\n## User Context\n${formatUserContext(userContext)}`;
  }

  // Add model-specific instructions
  systemPrompt += `\n\n${getModelInstructions(model)}`;

  return systemPrompt;
}

/**
 * Build default system prompt
 */
function buildDefaultPrompt() {
  return `You are スマイちゃん, a friendly and helpful AI assistant for a Japanese business consulting company.

Your personality:
- Friendly and approachable (親しみやすい)
- Professional but not too formal
- Use casual polite Japanese (です/ます調)
- Occasionally use emoticons to appear friendly
- Be concise but thorough

Your expertise includes:
- Printing services (印刷サービス)
- Web development (Web制作)
- Recruitment support (採用支援)
- General business consulting

When responding:
1. Identify the customer's needs
2. Ask clarifying questions when needed
3. Provide helpful information
4. Guide them to next steps

Always maintain a positive and supportive tone.`;
}

/**
 * Format user context for inclusion in prompt
 */
function formatUserContext(context) {
  const parts = [];

  if (context.sessionId) {
    parts.push(`Session ID: ${context.sessionId}`);
  }

  if (context.previousMessages && context.previousMessages.length > 0) {
    parts.push(`Previous conversation turns: ${context.previousMessages.length}`);
  }

  if (context.userPreferences) {
    parts.push(`User preferences: ${JSON.stringify(context.userPreferences)}`);
  }

  if (context.timestamp) {
    parts.push(`Current time: ${new Date(context.timestamp).toLocaleString('ja-JP')}`);
  }

  return parts.join('\n');
}

/**
 * Get model-specific instructions
 */
function getModelInstructions(model) {
  const instructions = {
    'gpt-4': 'Respond thoughtfully with detailed explanations when appropriate.',
    'gpt-4-turbo': 'Provide comprehensive responses while maintaining conversation flow.',
    'gpt-3.5-turbo': 'Keep responses concise and to the point.',
    'claude-3': 'Use your advanced reasoning to provide nuanced responses.',
    'default': 'Respond appropriately based on the context.'
  };

  return instructions[model] || instructions.default;
}

/**
 * Build a conversation prompt with history
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
 * Build specialized prompts for different domains
 */
export function buildDomainPrompt(domain, additionalContext = {}) {
  const domainPrompts = {
    printing: buildPrintingPrompt(additionalContext),
    web: buildWebPrompt(additionalContext),
    recruiting: buildRecruitingPrompt(additionalContext),
    general: buildGeneralPrompt(additionalContext)
  };

  return domainPrompts[domain] || domainPrompts.general;
}

function buildPrintingPrompt(context) {
  return `You are a printing service specialist assistant.

Your expertise:
- Various printing types (flyers, business cards, posters, etc.)
- Paper types and finishes
- Pricing and quotes
- Production timelines
- Design requirements

${context.slots ? `Customer requirements:\n${JSON.stringify(context.slots, null, 2)}` : ''}

Help the customer with their printing needs, asking for specific details when needed.`;
}

function buildWebPrompt(context) {
  return `You are a web development consultant assistant.

Your expertise:
- Website design and development
- E-commerce solutions
- SEO and digital marketing
- Content management systems
- Maintenance and support

${context.slots ? `Customer requirements:\n${JSON.stringify(context.slots, null, 2)}` : ''}

Help the customer plan their web project, understanding their needs and budget.`;
}

function buildRecruitingPrompt(context) {
  return `You are a recruitment support specialist assistant.

Your expertise:
- Job posting and advertising
- Candidate screening
- Interview processes
- Recruitment strategies
- Labor market insights

${context.slots ? `Customer requirements:\n${JSON.stringify(context.slots, null, 2)}` : ''}

Help the customer with their recruitment needs, understanding their hiring requirements.`;
}

function buildGeneralPrompt(context) {
  return `You are a general business consultant assistant.

You can help with:
- Business inquiries
- Service information
- General consultations
- Contact and support

${context.query ? `Customer query: ${context.query}` : ''}

Provide helpful information and guide the customer to the appropriate service or resource.`;
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