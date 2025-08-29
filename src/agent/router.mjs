import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchPricing, getPriceEstimate, getDeliveryEstimate, formatPrice, formatDelivery } from '../data/pricing-loader.mjs';
import quoteCalculator from '../services/quote-calculator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ConversationRouter {
  constructor(dataDir = null) {
    this.dataDir = dataDir || path.join(__dirname, '../../data');
    this.playbooks = this.loadPlaybooks();
    this.faqs = this.loadFAQs();
    this.conversationState = new Map(); // Track conversation state per session
  }

  /**
   * Load all playbook files
   */
  loadPlaybooks() {
    const playbooks = {};
    const playbookDir = path.join(this.dataDir, 'playbooks');
    
    try {
      const files = fs.readdirSync(playbookDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const domain = path.basename(file, '.json');
          const content = fs.readFileSync(path.join(playbookDir, file), 'utf8');
          playbooks[domain] = JSON.parse(content);
        }
      }
    } catch (error) {
      console.error('Error loading playbooks:', error);
    }
    
    return playbooks;
  }

  /**
   * Load all FAQ files
   */
  loadFAQs() {
    const faqs = {};
    const faqDir = path.join(this.dataDir, 'faq');
    
    try {
      const files = fs.readdirSync(faqDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const domain = path.basename(file, '.json');
          const content = fs.readFileSync(path.join(faqDir, file), 'utf8');
          faqs[domain] = JSON.parse(content);
        }
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
    }
    
    return faqs;
  }

  /**
   * Route conversation based on domain and context
   * @param {object} params
   * @param {string} params.domain - Intent domain
   * @param {string} params.text - User input text
   * @param {string} params.sessionId - Session identifier
   * @param {object} params.context - Additional context
   * @returns {object} Routing result with guidance
   */
  route({ domain, text, sessionId = 'default', context = {} }) {
    const result = {
      domain,
      faqAnswer: null,
      missingSlots: [],
      questions: [],
      systemPrompt: null,
      playbookData: null,
      pricingInfo: null,  // Add pricing information
      quote: null  // Add quote calculation result
    };

    // Check for pricing/delivery queries
    const pricingResults = searchPricing(text);
    if (pricingResults.length > 0) {
      result.pricingInfo = pricingResults;
      // Add pricing context to the result
      result.hasPricingQuery = true;
      
      // Try to calculate quote if specific service is detected
      const entities = quoteCalculator.extractQuoteEntities(text);
      if (domain === 'printing' && text.match(/名刺|business\s*card/i)) {
        result.quote = quoteCalculator.calculateBusinessCards(entities);
      } else if (domain === 'printing' && text.match(/チラシ|フライヤー|flyer/i)) {
        result.quote = quoteCalculator.calculateFlyers(entities);
      } else if (domain === 'web' && text.match(/サイト|ホームページ|web/i)) {
        result.quote = quoteCalculator.calculateWebDesign(entities);
      }
    }

    // Check FAQ first
    const faqAnswer = this.findFAQAnswer(domain, text);
    if (faqAnswer) {
      result.faqAnswer = faqAnswer;
      result.systemPrompt = this.buildFAQPrompt(faqAnswer, domain);
      return result;
    }

    // Get playbook for domain
    const playbook = this.playbooks[domain];
    if (!playbook) {
      result.systemPrompt = this.buildGenericPrompt(domain);
      return result;
    }

    result.playbookData = playbook;

    // Get or create session state
    const state = this.getSessionState(sessionId, domain);
    
    // Extract slots from user input
    this.extractSlots(text, playbook, state);
    
    // Find missing required slots
    const missingSlots = this.findMissingSlots(playbook, state);
    result.missingSlots = missingSlots;

    // Generate questions for missing slots (max 3)
    const questions = this.generateQuestions(missingSlots.slice(0, 3), playbook);
    result.questions = questions;

    // Build system prompt
    result.systemPrompt = this.buildSystemPrompt(playbook, state, questions, domain);

    // Update session state
    this.updateSessionState(sessionId, state);

    return result;
  }

  /**
   * Find matching FAQ answer with scoring
   */
  findFAQAnswer(domain, text) {
    const domainFAQ = this.faqs[domain];
    if (!domainFAQ || !domainFAQ.faqs) return null;

    const normalizedText = text.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const faq of domainFAQ.faqs) {
      let score = 0;
      
      // Check for exact question match (highest priority)
      if (faq.question && normalizedText === faq.question.toLowerCase()) {
        return {
          question: faq.question,
          answer: faq.answer,
          matched: true,
          matchType: 'exact',
          score: 1.0
        };
      }
      
      // Calculate keyword matching score
      if (faq.keywords && Array.isArray(faq.keywords)) {
        let keywordMatches = 0;
        let totalKeywords = faq.keywords.length;
        
        for (const keyword of faq.keywords) {
          if (normalizedText.includes(keyword.toLowerCase())) {
            keywordMatches++;
          }
        }
        
        if (keywordMatches > 0) {
          // Score based on how many keywords matched
          score = keywordMatches / totalKeywords;
          
          // Boost score if all keywords matched
          if (keywordMatches === totalKeywords) {
            score = Math.min(score * 1.2, 0.95);
          }
          
          // Additional boost for question similarity
          if (faq.question) {
            const questionSimilarity = this.calculateSimilarity(
              normalizedText, 
              faq.question.toLowerCase()
            );
            score = score * 0.7 + questionSimilarity * 0.3;
          }
        }
      }
      
      // Update best match if this score is better
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          question: faq.question,
          answer: faq.answer,
          matched: true,
          matchType: 'partial',
          score: score
        };
      }
    }
    
    // Return match if score meets threshold (0.7)
    if (bestScore >= 0.7) {
      return bestMatch;
    }
    
    return null;
  }
  
  /**
   * Calculate simple text similarity (Jaccard coefficient)
   */
  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    if (words1.size === 0 && words2.size === 0) return 1;
    if (words1.size === 0 || words2.size === 0) return 0;
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Extract slots from user input
   */
  extractSlots(text, playbook, state) {
    if (!playbook.slots) return;

    const normalizedText = text.toLowerCase();

    for (const [slotKey, slotConfig] of Object.entries(playbook.slots)) {
      // Skip if already filled
      if (state.filledSlots[slotKey]) continue;

      // Check for example matches
      if (slotConfig.examples && Array.isArray(slotConfig.examples)) {
        for (const example of slotConfig.examples) {
          if (normalizedText.includes(example.toLowerCase())) {
            state.filledSlots[slotKey] = example;
            break;
          }
        }
      }

      // Enhanced heuristic extraction based on slot key and patterns
      // Product types
      if (slotKey === 'product_type') {
        const products = ['チラシ', 'パンフレット', '名刺', 'ポスター', '冊子', 'カタログ'];
        for (const product of products) {
          if (text.includes(product)) {
            state.filledSlots[slotKey] = product;
            break;
          }
        }
      }

      // Quantity patterns
      if (slotKey === 'quantity' || slotKey === 'number_of_positions') {
        const quantityMatch = text.match(/(\d+)\s*[部枚個名人]/);
        if (quantityMatch) {
          state.filledSlots[slotKey] = quantityMatch[0];
        }
      }

      // Size patterns
      if (slotKey === 'size') {
        const sizeMatch = text.match(/(A[0-9]|B[0-9])/i);
        if (sizeMatch) {
          state.filledSlots[slotKey] = sizeMatch[0].toUpperCase();
        }
      }

      // Deadline patterns
      if (slotKey === 'deadline' || slotKey === 'timeline' || slotKey === 'start_date') {
        const deadlinePatterns = [
          '明日', '今週', '来週', '今月', '来月', '急ぎ',
          '\\d+日', '\\d+週間', '\\d+ヶ月', '\\d+月'
        ];
        for (const pattern of deadlinePatterns) {
          const regex = new RegExp(pattern);
          if (regex.test(text)) {
            const match = text.match(regex);
            state.filledSlots[slotKey] = match[0];
            break;
          }
        }
      }

      // Color patterns
      if (slotKey === 'color') {
        if (text.includes('フルカラー') || text.includes('カラー')) {
          state.filledSlots[slotKey] = 'フルカラー';
        } else if (text.includes('モノクロ')) {
          state.filledSlots[slotKey] = 'モノクロ';
        }
      }

      // Paper type
      if (slotKey === 'paper_type') {
        const papers = ['光沢', 'マット', '上質紙', 'コート紙'];
        for (const paper of papers) {
          if (text.includes(paper)) {
            state.filledSlots[slotKey] = paper + (paper.includes('紙') ? '' : '紙');
            break;
          }
        }
      }

      // Employment type
      if (slotKey === 'employment_type') {
        const types = ['正社員', '契約社員', 'パート', 'アルバイト', '派遣', '新卒'];
        for (const type of types) {
          if (text.includes(type)) {
            state.filledSlots[slotKey] = type;
            break;
          }
        }
      }

      // Position/Job type
      if (slotKey === 'position') {
        const positions = ['エンジニア', '営業', '事務', '総合職', 'デザイナー', 'マーケター'];
        for (const position of positions) {
          if (text.includes(position)) {
            state.filledSlots[slotKey] = position;
            break;
          }
        }
      }

      // Project type for web
      if (slotKey === 'project_type') {
        if (text.includes('新規') || text.includes('新しく')) {
          state.filledSlots[slotKey] = '新規制作';
        } else if (text.includes('リニューアル')) {
          state.filledSlots[slotKey] = 'リニューアル';
        } else if (text.includes('EC') || text.includes('ネットショップ')) {
          state.filledSlots[slotKey] = 'ECサイト';
        }
      }

      // Features for web
      if (slotKey === 'features') {
        const features = [];
        if (text.includes('お問い合わせ') || text.includes('フォーム')) {
          features.push('お問い合わせフォーム');
        }
        if (text.includes('ブログ')) {
          features.push('ブログ機能');
        }
        if (text.includes('決済') || text.includes('クレジットカード')) {
          features.push('決済機能');
        }
        if (features.length > 0) {
          state.filledSlots[slotKey] = features.join('、');
        }
      }

      // Page count
      if (slotKey === 'page_count') {
        const pageMatch = text.match(/(\d+)\s*ページ/);
        if (pageMatch) {
          state.filledSlots[slotKey] = pageMatch[0];
        }
      }

      // Budget
      if (slotKey === 'budget') {
        const budgetMatch = text.match(/(\d+)\s*万/);
        if (budgetMatch) {
          state.filledSlots[slotKey] = budgetMatch[0] + '円';
        }
      }

      // Experience required
      if (slotKey === 'experience_required') {
        const expMatch = text.match(/(\d+)\s*年/);
        if (expMatch) {
          state.filledSlots[slotKey] = expMatch[0] + '以上';
        } else if (text.includes('未経験')) {
          state.filledSlots[slotKey] = '未経験可';
        }
      }

      // Recruitment method
      if (slotKey === 'recruitment_method') {
        if (text.includes('求人サイト') || text.includes('求人広告')) {
          state.filledSlots[slotKey] = '求人広告';
        } else if (text.includes('人材紹介')) {
          state.filledSlots[slotKey] = '人材紹介';
        }
      }
    }
  }

  /**
   * Find missing required slots
   */
  findMissingSlots(playbook, state) {
    const missing = [];

    if (!playbook.slots) return missing;

    for (const [slotKey, slotConfig] of Object.entries(playbook.slots)) {
      if (slotConfig.required && !state.filledSlots[slotKey]) {
        missing.push({
          key: slotKey,
          name: slotConfig.name,
          question: slotConfig.question
        });
      }
    }

    return missing;
  }

  /**
   * Generate questions for missing slots
   */
  generateQuestions(missingSlots, playbook) {
    const questions = [];

    for (const slot of missingSlots) {
      questions.push({
        slotKey: slot.key,
        slotName: slot.name,
        question: slot.question
      });
    }

    return questions;
  }

  /**
   * Build system prompt for FAQ response
   */
  buildFAQPrompt(faqAnswer, domain) {
    return `You are a helpful customer service assistant specializing in ${domain} services.
A customer asked: "${faqAnswer.question}"

Please provide this answer in a friendly, conversational tone:
${faqAnswer.answer}

Add a brief follow-up question to see if they need any additional information.`;
  }

  /**
   * Build generic system prompt
   */
  buildGenericPrompt(domain) {
    return `You are a helpful customer service assistant.
The customer's inquiry is related to: ${domain}

Please provide a friendly and helpful response, asking for more details about their specific needs.`;
  }

  /**
   * Build system prompt based on playbook and state
   */
  buildSystemPrompt(playbook, state, questions, domain) {
    let prompt = `You are a helpful customer service assistant specializing in ${playbook.displayName || domain}.

Current conversation context:
- Domain: ${domain}
- Service: ${playbook.displayName}
`;

    // Add filled slots
    if (Object.keys(state.filledSlots).length > 0) {
      prompt += '\nInformation already provided:\n';
      for (const [key, value] of Object.entries(state.filledSlots)) {
        const slotConfig = playbook.slots[key];
        if (slotConfig) {
          prompt += `- ${slotConfig.name}: ${value}\n`;
        }
      }
    }

    // Add questions to ask
    if (questions.length > 0) {
      prompt += '\nPlease ask the customer about:\n';
      for (const q of questions) {
        prompt += `- ${q.question}\n`;
      }
      prompt += '\nAsk these questions naturally in your response, not as a list.';
    } else if (Object.keys(state.filledSlots).length >= 3) {
      prompt += '\nYou have enough information. Please provide a summary and next steps.';
    }

    // Add response guidelines
    prompt += `\n\nResponse guidelines:
- Be friendly and professional
- Use casual Japanese (です/ます調)
- Keep responses concise but informative
- If questions are needed, integrate them naturally into the conversation`;

    return prompt;
  }

  /**
   * Get or create session state
   */
  getSessionState(sessionId, domain) {
    const key = `${sessionId}:${domain}`;
    
    if (!this.conversationState.has(key)) {
      this.conversationState.set(key, {
        domain,
        filledSlots: {},
        conversationTurns: 0,
        lastUpdated: Date.now()
      });
    }

    const state = this.conversationState.get(key);
    state.conversationTurns++;
    return state;
  }

  /**
   * Update session state
   */
  updateSessionState(sessionId, state) {
    const key = `${sessionId}:${state.domain}`;
    state.lastUpdated = Date.now();
    this.conversationState.set(key, state);
  }

  /**
   * Clear old sessions (cleanup)
   */
  clearOldSessions(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    for (const [key, state] of this.conversationState.entries()) {
      if (now - state.lastUpdated > maxAge) {
        this.conversationState.delete(key);
      }
    }
  }

  /**
   * Get session state for external access
   */
  getSession(sessionId, domain) {
    const key = `${sessionId}:${domain}`;
    return this.conversationState.get(key);
  }

  /**
   * Clear specific session
   */
  clearSession(sessionId, domain = null) {
    if (domain) {
      this.conversationState.delete(`${sessionId}:${domain}`);
    } else {
      // Clear all domains for this session
      for (const key of this.conversationState.keys()) {
        if (key.startsWith(`${sessionId}:`)) {
          this.conversationState.delete(key);
        }
      }
    }
  }
}

// Export default instance
export default new ConversationRouter();