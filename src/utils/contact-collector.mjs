/**
 * Contact Collector Utility
 * Manages customer contact information collection and follow-up handling
 */

// Contact request patterns
const CONTACT_TRIGGERS = [
  // Complex pricing requests
  /詳し(い|く).*見積/,
  /複雑.*価格/,
  /特殊.*仕様/,
  /大量.*発注/,
  /\d{1000,}[枚部個]/, // Large quantities (1000+)
  
  // Urgent requests
  /至急|今すぐ|明日まで|今日中/,
  /緊急/,
  
  // Custom design requests
  /オリジナル.*デザイン/,
  /完全.*オーダー/,
  /特注/,
  
  // Business consultation
  /売上.*相談/,
  /集客.*方法/,
  /マーケティング/,
  /ブランディング/,
  
  // Technical specifications
  /特殊.*加工/,
  /技術的.*相談/,
  /詳細.*仕様/
];

/**
 * Check if message requires contact collection
 */
export function shouldCollectContact(message, context = {}) {
  if (!message) return false;
  
  const lowerMessage = message.toLowerCase();
  
  // Check trigger patterns
  for (const pattern of CONTACT_TRIGGERS) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  // Check for complex multi-part requests
  const hasMultipleProducts = (
    (message.match(/名刺/g) || []).length +
    (message.match(/チラシ/g) || []).length +
    (message.match(/ポスター/g) || []).length +
    (message.match(/カタログ/g) || []).length
  ) >= 2;
  
  if (hasMultipleProducts) {
    return true;
  }
  
  // Check context flags
  if (context.isComplex || context.requiresHuman) {
    return true;
  }
  
  return false;
}

/**
 * Generate contact collection prompt
 */
export function generateContactPrompt(reason = 'detailed-consultation') {
  const prompts = {
    'detailed-consultation': {
      message: 'このご相談は詳しくお話を伺った方が良さそうだね！✨ 担当スタッフから詳しいご提案をさせていただくよ〜',
      fields: ['name', 'phone', 'email', 'company', 'preferred_time'],
      followUp: '情報いただいたら、営業時間内に担当者から連絡させていただくね💕'
    },
    'urgent': {
      message: 'お急ぎなんだね！すぐに対応できるスタッフを手配するよ〜💪',
      fields: ['name', 'phone', 'company'],
      followUp: '30分以内に担当者から電話させていただくね！'
    },
    'complex-order': {
      message: 'おお〜、大きなご注文だね！専門スタッフがしっかりサポートするよ✨',
      fields: ['name', 'phone', 'email', 'company', 'budget'],
      followUp: '見積もり担当から詳しい提案書を準備して連絡するね〜'
    },
    'business-consulting': {
      message: '売上アップのご相談だね！マーケティング担当がお力になれるよ💡',
      fields: ['name', 'phone', 'email', 'company', 'current_situation'],
      followUp: 'マーケティング担当の山田から改善提案を持って連絡させていただくね！'
    },
    'technical': {
      message: '技術的なご相談だね！印刷のプロが詳しく説明するよ〜📐',
      fields: ['name', 'phone', 'email', 'specs'],
      followUp: '技術担当から詳しい仕様確認の連絡をさせていただくね'
    }
  };
  
  return prompts[reason] || prompts['detailed-consultation'];
}

/**
 * Build contact form HTML
 */
export function buildContactForm(fields = ['name', 'phone', 'email']) {
  const fieldDefinitions = {
    name: {
      label: 'お名前',
      type: 'text',
      required: true,
      placeholder: '山田 太郎'
    },
    phone: {
      label: '電話番号',
      type: 'tel',
      required: true,
      placeholder: '090-1234-5678'
    },
    email: {
      label: 'メールアドレス',
      type: 'email',
      required: false,
      placeholder: 'example@email.com'
    },
    company: {
      label: '会社名',
      type: 'text',
      required: false,
      placeholder: '株式会社○○'
    },
    preferred_time: {
      label: 'ご希望の連絡時間帯',
      type: 'select',
      required: false,
      options: [
        '午前中（9:00-12:00）',
        '午後（12:00-15:00）',
        '夕方（15:00-18:00）',
        'いつでも可'
      ]
    },
    budget: {
      label: 'ご予算',
      type: 'select',
      required: false,
      options: [
        '〜5万円',
        '5万円〜10万円',
        '10万円〜30万円',
        '30万円〜',
        '要相談'
      ]
    },
    current_situation: {
      label: '現在の課題',
      type: 'textarea',
      required: false,
      placeholder: '売上が伸び悩んでいる、新規顧客を増やしたい等'
    },
    specs: {
      label: '技術仕様',
      type: 'textarea',
      required: false,
      placeholder: '必要な加工や仕様について'
    }
  };
  
  let formHTML = '<div class="contact-form-container">';
  formHTML += '<form class="contact-form" id="customerContactForm">';
  
  fields.forEach(fieldName => {
    const field = fieldDefinitions[fieldName];
    if (!field) return;
    
    formHTML += '<div class="form-group">';
    formHTML += `<label for="${fieldName}">${field.label}${field.required ? ' *' : ''}</label>`;
    
    if (field.type === 'select') {
      formHTML += `<select id="${fieldName}" name="${fieldName}" ${field.required ? 'required' : ''}>`;
      formHTML += '<option value="">選択してください</option>';
      field.options.forEach(option => {
        formHTML += `<option value="${option}">${option}</option>`;
      });
      formHTML += '</select>';
    } else if (field.type === 'textarea') {
      formHTML += `<textarea id="${fieldName}" name="${fieldName}" 
                    placeholder="${field.placeholder}" 
                    ${field.required ? 'required' : ''}></textarea>`;
    } else {
      formHTML += `<input type="${field.type}" id="${fieldName}" name="${fieldName}" 
                    placeholder="${field.placeholder}" 
                    ${field.required ? 'required' : ''}>`;
    }
    
    formHTML += '</div>';
  });
  
  formHTML += '<button type="submit" class="submit-contact">送信する</button>';
  formHTML += '</form>';
  formHTML += '</div>';
  
  return formHTML;
}

/**
 * Format contact information for display
 */
export function formatContactConfirmation(contactData) {
  const staffAssignment = assignStaff(contactData);
  
  let confirmation = `ありがとうございます！以下の内容で承りました〜✨\n\n`;
  confirmation += `【お客様情報】\n`;
  
  if (contactData.name) confirmation += `お名前: ${contactData.name}様\n`;
  if (contactData.company) confirmation += `会社名: ${contactData.company}\n`;
  if (contactData.phone) confirmation += `電話番号: ${contactData.phone}\n`;
  if (contactData.email) confirmation += `メール: ${contactData.email}\n`;
  if (contactData.preferred_time) confirmation += `希望時間: ${contactData.preferred_time}\n`;
  
  confirmation += `\n【担当者】\n`;
  confirmation += `${staffAssignment.name}（${staffAssignment.department}）より\n`;
  confirmation += `${staffAssignment.timeframe}にご連絡させていただきます💕\n\n`;
  confirmation += `お急ぎの場合は直接お電話（077-552-1045）もどうぞ！`;
  
  return confirmation;
}

/**
 * Assign appropriate staff based on request type
 */
function assignStaff(contactData) {
  // Determine department based on context
  if (contactData.current_situation) {
    return {
      name: '山田',
      department: 'マーケティング部',
      timeframe: '本日中'
    };
  }
  
  if (contactData.specs) {
    return {
      name: '技術担当 佐藤',
      department: '印刷技術部',
      timeframe: '1時間以内'
    };
  }
  
  if (contactData.budget && contactData.budget.includes('30万')) {
    return {
      name: '営業部長 田中',
      department: '営業部',
      timeframe: '30分以内'
    };
  }
  
  // Default assignment
  return {
    name: '営業担当',
    department: '営業部',
    timeframe: '営業時間内'
  };
}

/**
 * Validate contact information
 */
export function validateContactInfo(data) {
  const errors = [];
  
  // Phone validation
  if (data.phone) {
    const phoneRegex = /^[0-9０-９\-－()（）\s]+$/;
    if (!phoneRegex.test(data.phone)) {
      errors.push('電話番号の形式が正しくありません');
    }
  }
  
  // Email validation
  if (data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('メールアドレスの形式が正しくありません');
    }
  }
  
  // Required fields check
  if (!data.name) {
    errors.push('お名前は必須です');
  }
  
  if (!data.phone && !data.email) {
    errors.push('電話番号またはメールアドレスのいずれかは必須です');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

export default {
  shouldCollectContact,
  generateContactPrompt,
  buildContactForm,
  formatContactConfirmation,
  validateContactInfo
};