/**
 * Printing Services Conversation Flow Manager
 * 印刷サービス（名刺・チラシ・ポスター）専用の会話フロー管理
 */

// 印刷サービスの価格情報
const PRINTING_PRICES = {
  businessCard: {
    100: { price: '3,000円〜', delivery: '3営業日' },
    500: { price: '8,000円〜', delivery: '5営業日' },
    1000: { price: '12,000円〜', delivery: '7営業日' },
    design: {
      template: '無料（テンプレート利用）',
      semi: '+5,000円〜（セミオーダー）',
      full: '+15,000円〜（フルオーダー）'
    }
  },
  flyer: {
    A4: {
      1000: { price: '5,000円〜', delivery: '5営業日' },
      5000: { price: '15,000円〜', delivery: '7営業日' },
      10000: { price: '25,000円〜', delivery: '10営業日' }
    },
    A3: {
      1000: { price: '8,000円〜', delivery: '5営業日' },
      5000: { price: '25,000円〜', delivery: '7営業日' }
    }
  },
  poster: {
    A2: { price: '15,000円〜（10枚）', delivery: '7営業日' },
    A1: { price: '25,000円〜（10枚）', delivery: '10営業日' },
    A0: { price: '40,000円〜（10枚）', delivery: '14営業日' }
  }
};

// 印刷セッション管理
const printingSessions = new Map();

const PRINTING_STATES = {
  INITIAL: 'initial',
  TYPE_SELECTED: 'type_selected',
  QUANTITY_INQUIRY: 'quantity_inquiry',
  DESIGN_INQUIRY: 'design_inquiry',
  DELIVERY_INQUIRY: 'delivery_inquiry',
  PRICING_PROVIDED: 'pricing_provided',
  CONTACT_COLLECTION: 'contact_collection'
};

/**
 * Initialize or get printing session
 */
export function getPrintingSession(sessionId) {
  if (!printingSessions.has(sessionId)) {
    printingSessions.set(sessionId, {
      state: PRINTING_STATES.INITIAL,
      type: null, // businessCard, flyer, poster
      quantity: null,
      size: null,
      designType: null,
      deadline: null,
      messageCount: 0,
      startTime: Date.now()
    });
  }
  return printingSessions.get(sessionId);
}

/**
 * Analyze printing context
 */
export function analyzePrintingContext(message, sessionId) {
  const session = getPrintingSession(sessionId);
  session.messageCount++;
  
  const context = {
    isPrintingRelated: false,
    type: null,
    quantity: null,
    deadline: null,
    askingPrice: false,
    message: message // 元のメッセージも保持
  };
  
  const lowerMessage = message.toLowerCase();
  
  // Service type detection
  if (lowerMessage.includes('名刺')) {
    context.isPrintingRelated = true;
    context.type = 'businessCard';
    session.type = 'businessCard';
  } else if (lowerMessage.includes('チラシ') || lowerMessage.includes('フライヤー')) {
    context.isPrintingRelated = true;
    context.type = 'flyer';
    session.type = 'flyer';
  } else if (lowerMessage.includes('ポスター')) {
    context.isPrintingRelated = true;
    context.type = 'poster';
    session.type = 'poster';
  }
  
  // Quantity detection
  const quantityMatch = message.match(/(\d+)\s*[枚部個]/);
  if (quantityMatch) {
    context.quantity = parseInt(quantityMatch[1]);
    session.quantity = context.quantity;
  }
  
  // Deadline detection
  if (lowerMessage.includes('来週') || lowerMessage.includes('らいしゅう')) {
    context.deadline = '来週';
    session.deadline = '7営業日';
  } else if (lowerMessage.includes('今週')) {
    context.deadline = '今週';
    session.deadline = '3営業日';
  } else if (lowerMessage.includes('明日')) {
    context.deadline = '明日';
    session.deadline = '特急（要相談）';
  }
  
  // Price inquiry detection
  if (lowerMessage.includes('費用') || lowerMessage.includes('金額') || 
      lowerMessage.includes('いくら') || lowerMessage.includes('価格') ||
      lowerMessage.includes('値段')) {
    context.askingPrice = true;
  }
  
  return context;
}

/**
 * Generate printing-specific response
 */
export function generatePrintingResponse(context, session) {
  let response = '';
  let emotion = 'professional';
  let nextActions = [];
  
  // 名刺の初回認識（または既に名刺と分かっている場合）
  if ((context.type === 'businessCard' || session.type === 'businessCard') && !session.quantity) {
    session.type = 'businessCard';
    session.state = PRINTING_STATES.TYPE_SELECTED;
    
    // 数量が既に言及されている場合は記録
    if (context.quantity) {
      session.quantity = context.quantity;
      // 納期について聞く
      response = `名刺${context.quantity}枚だね！いいね〜✨ いつまでに必要？`;
      emotion = 'curious';
      nextActions = [
        { text: '1週間以内', value: '1週間以内に必要です', emotion: 'professional' },
        { text: '2週間くらい', value: '2週間くらいで大丈夫です', emotion: 'relaxed' },
        { text: '急ぎじゃない', value: '特に急いでません', emotion: 'calm' },
        { text: '相談したい', value: '納期を相談したいです', emotion: 'thinking' }
      ];
    } else {
      // 数量を聞く
      response = `魅力的な名刺作るね〜！何枚必要？✨`;
      emotion = 'excited';
      nextActions = [
        { text: '100枚', value: '100枚お願いします', emotion: 'professional' },
        { text: '500枚', value: '500枚お願いします', emotion: 'professional' },
        { text: '1000枚', value: '1000枚お願いします', emotion: 'confident' },
        { text: '相談したい', value: '枚数を相談したいです', emotion: 'thinking' }
      ];
    }
    return { response, emotion, nextActions, state: session.state };
  }
  
  // 名刺で数量を答えた場合
  if (session.type === 'businessCard' && context.quantity && !session.quantity) {
    session.quantity = context.quantity;
    
    // 納期について聞く（1つだけ）
    response = `${context.quantity}枚ね！いつまでに必要？✨`;
    emotion = 'curious';
    nextActions = [
      { text: '1週間以内', value: '1週間以内にお願いします', emotion: 'determined' },
      { text: '2週間くらい', value: '2週間くらいで大丈夫です', emotion: 'relaxed' },
      { text: '1ヶ月以内', value: '1ヶ月以内ならOKです', emotion: 'calm' },
      { text: '急ぎじゃない', value: '特に急いでません', emotion: 'friendly' }
    ];
    session.state = PRINTING_STATES.QUANTITY_INQUIRY;
    return { response, emotion, nextActions, state: session.state };
  }
  
  // 納期を答えた場合
  if (session.type === 'businessCard' && session.quantity && context.deadline && !session.deadline) {
    session.deadline = context.deadline;
    
    // デザインについて聞く（1つだけ）
    response = `了解〜！デザインはどうする？💕`;
    emotion = 'helpful';
    nextActions = [
      { text: 'テンプレートでOK', value: 'テンプレートデザインでお願いします', emotion: 'confident' },
      { text: '一緒に考えたい', value: 'デザインを相談しながら決めたいです', emotion: 'thinking' },
      { text: 'データ持込', value: 'デザインデータを持ち込みます', emotion: 'professional' },
      { text: 'お任せ', value: 'デザインはお任せします', emotion: 'trusting' }
    ];
    session.state = PRINTING_STATES.DESIGN_INQUIRY;
    return { response, emotion, nextActions, state: session.state };
  }
  
  // デザインを「相談しながら」と答えた場合
  if (session.type === 'businessCard' && session.quantity && session.deadline && 
      (context.message?.includes('相談') || context.message?.includes('一緒に'))) {
    
    const pricing = getPricingForQuantity('businessCard', session.quantity);
    response = `オッケー！デザイン一緒に考えよう✨ ${session.quantity}枚で印刷${pricing.price}、デザイン料は相談内容によって5,000円〜15,000円くらいだよ。担当デザイナーから連絡させるね💕`;
    emotion = 'excited';
    nextActions = [
      { text: '詳しく相談したい', value: '詳しい相談をお願いします', emotion: 'professional' },
      { text: '見積もりが欲しい', value: '正式な見積もりをお願いします', emotion: 'determined' },
      { text: 'サンプルを見たい', value: 'デザインサンプルを見せてください', emotion: 'curious' },
      { text: '進めてください', value: '制作を進めてください', emotion: 'confident' }
    ];
    session.state = PRINTING_STATES.PRICING_PROVIDED;
    return { response, emotion, nextActions, state: session.state };
  }
  
  // 名刺の費用を聞かれた場合
  if (session.type === 'businessCard' && context.askingPrice) {
    if (session.quantity === 1000) {
      response = `名刺1000枚なら印刷だけで12,000円〜だよ〜！デザインは、テンプレート使えば無料、セミオーダーで+5,000円〜、フルオーダーで+15,000円〜って感じ✨ 来週までなら特急料金かかるかも。デザインどうする？`;
      emotion = 'explaining';
      nextActions = [
        { text: 'テンプレートでOK', value: 'テンプレートのデザインでお願いします', emotion: 'confident' },
        { text: 'セミオーダーで', value: 'セミオーダーでデザインしてほしい', emotion: 'thinking' },
        { text: 'フルオーダー希望', value: 'フルオーダーでオリジナルデザインを', emotion: 'excited' },
        { text: '相談したい', value: 'デザインについて詳しく相談したい', emotion: 'curious' }
      ];
    } else if (session.quantity) {
      const pricing = getPricingForQuantity('businessCard', session.quantity);
      response = `名刺${session.quantity}枚なら${pricing.price}くらいだよ〜！納期は通常${pricing.delivery}。デザインは別途相談できるよ✨`;
      emotion = 'helpful';
    } else {
      response = `名刺の費用は枚数によって変わるよ〜！100枚3,000円〜、500枚8,000円〜、1000枚12,000円〜が目安✨ デザイン込みだとプラス5,000円〜。何枚くらい必要？`;
      emotion = 'explaining';
      nextActions = [
        { text: '100枚', value: '100枚お願いします', emotion: 'professional' },
        { text: '500枚', value: '500枚お願いします', emotion: 'professional' },
        { text: '1000枚', value: '1000枚お願いします', emotion: 'professional' },
        { text: '相談したい', value: '枚数を相談したい', emotion: 'thinking' }
      ];
    }
    session.state = PRINTING_STATES.PRICING_PROVIDED;
  }
  
  // チラシの場合
  else if (session.type === 'flyer' && context.askingPrice) {
    response = `チラシの費用はA4サイズで1000枚5,000円〜、5000枚15,000円〜だよ〜！デザイン込みだとプラス10,000円〜✨ サイズと枚数はどうする？`;
    emotion = 'professional';
    nextActions = [
      { text: 'A4・1000枚', value: 'A4サイズ1000枚でお願いします', emotion: 'confident' },
      { text: 'A4・5000枚', value: 'A4サイズ5000枚でお願いします', emotion: 'confident' },
      { text: 'A3希望', value: 'A3サイズで検討してます', emotion: 'thinking' },
      { text: '相談したい', value: 'サイズと枚数を相談したい', emotion: 'curious' }
    ];
  }
  
  // デザインと費用の相談
  else if (session.type === 'businessCard' && session.quantity === 1000 && session.deadline) {
    response = `了解〜！名刺1000枚を来週までにね✨ デザインは相談しながら決めよう！テンプレートなら17,000円くらい、オリジナルなら27,000円くらいかな。特急でも間に合うように頑張るね💕`;
    emotion = 'determined';
    nextActions = [
      { text: '詳しい見積もりが欲しい', value: '正式な見積もりをお願いします', emotion: 'professional' },
      { text: 'デザイン案を見たい', value: 'デザインのサンプルを見せて', emotion: 'curious' },
      { text: '注文を進める', value: '注文を進めたいです', emotion: 'confident' }
    ];
    session.state = PRINTING_STATES.DESIGN_INQUIRY;
  }
  
  return {
    response,
    emotion,
    nextActions,
    state: session.state,
    sessionInfo: {
      type: session.type,
      quantity: session.quantity,
      deadline: session.deadline
    }
  };
}

/**
 * Get pricing for specific quantity
 */
function getPricingForQuantity(type, quantity) {
  if (type === 'businessCard') {
    if (quantity <= 100) return PRINTING_PRICES.businessCard[100];
    if (quantity <= 500) return PRINTING_PRICES.businessCard[500];
    return PRINTING_PRICES.businessCard[1000];
  }
  return { price: '要見積もり', delivery: '要相談' };
}

/**
 * Check if we should use printing flow
 */
export function shouldUsePrintingFlow(message, sessionId) {
  const context = analyzePrintingContext(message, sessionId);
  const session = getPrintingSession(sessionId);
  
  return context.isPrintingRelated || 
         session.type !== null ||
         (session.messageCount > 0 && (context.askingPrice || context.quantity));
}

/**
 * Generate contact form HTML
 */
export function generateContactForm() {
  return `
    <div class="contact-form-container">
      <div class="contact-form-header">
        <h3>担当者から詳しくご説明します✨</h3>
        <p>デザインの相談や正式な見積もりをお送りするため、連絡先を教えてください💕</p>
      </div>
      <form class="contact-form" id="printing-contact-form">
        <div class="form-group">
          <label>お名前 <span class="required">*</span></label>
          <input type="text" name="name" required placeholder="山田 太郎">
        </div>
        <div class="form-group">
          <label>会社名</label>
          <input type="text" name="company" placeholder="株式会社○○">
        </div>
        <div class="form-group">
          <label>メールアドレス <span class="required">*</span></label>
          <input type="email" name="email" required placeholder="example@email.com">
        </div>
        <div class="form-group">
          <label>電話番号 <span class="required">*</span></label>
          <input type="tel" name="phone" required placeholder="090-1234-5678">
        </div>
        <div class="form-group">
          <label>ご希望の連絡方法</label>
          <select name="contactMethod">
            <option value="email">メール</option>
            <option value="phone">電話</option>
            <option value="both">どちらでも</option>
          </select>
        </div>
        <button type="submit" class="submit-btn">送信する</button>
      </form>
    </div>
  `;
}

export default {
  getPrintingSession,
  analyzePrintingContext,
  generatePrintingResponse,
  shouldUsePrintingFlow,
  generateContactForm,
  PRINTING_STATES,
  PRINTING_PRICES
};