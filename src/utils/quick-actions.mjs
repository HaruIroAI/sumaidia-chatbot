/**
 * Quick Actions System
 * 提案型のクイックアクションボタンを生成
 */

// コンテキストに応じたクイックアクション定義
const QUICK_ACTIONS = {
  // 初回の挨拶後 - スマイディアの全サービス
  initial_greeting: [
    { text: '印刷・製造加工', value: '印刷や製造加工について相談したいです', emotion: 'professional' },
    { text: 'Web・デジタル制作', value: 'Webサイトやデジタルコンテンツを作りたいです', emotion: 'excited' },
    { text: '採用支援', value: '採用支援サービスについて聞きたいです', emotion: 'supportive' },
    { text: '広告・ブランディング', value: '広告やブランディングの相談をしたいです', emotion: 'creative' },
    { text: 'その他のご相談', value: 'その他の相談があります', emotion: 'helpful' }
  ],
  
  // 印刷・製造加工のサブメニュー
  printing_menu: [
    { text: '名刺', value: '名刺を作りたいです', emotion: 'professional' },
    { text: 'チラシ・フライヤー', value: 'チラシを作りたいです', emotion: 'excited' },
    { text: 'ポスター', value: 'ポスターを作りたいです', emotion: 'proud' },
    { text: 'カタログ・パンフレット', value: 'カタログを作りたいです', emotion: 'professional' },
    { text: 'その他印刷物', value: 'その他の印刷物について相談したいです', emotion: 'helpful' }
  ],
  
  // Web・デジタルのサブメニュー
  web_menu: [
    { text: 'コーポレートサイト', value: '企業サイトを作りたいです', emotion: 'professional' },
    { text: 'ECサイト', value: 'ECサイトを作りたいです', emotion: 'excited' },
    { text: 'LP（ランディングページ）', value: 'LPを作りたいです', emotion: 'determined' },
    { text: '動画制作', value: '動画を作りたいです', emotion: 'creative' },
    { text: 'システム開発', value: 'システム開発の相談をしたいです', emotion: 'thinking' }
  ],
  
  // 売上相談
  sales_consultation: [
    { text: 'ECサイト運営中', value: 'ECサイトを運営しています', emotion: 'professional' },
    { text: '実店舗あり', value: '実店舗を運営しています', emotion: 'professional' },
    { text: '新規事業', value: '新規事業を始めます', emotion: 'excited' },
    { text: 'リニューアル検討', value: 'リニューアルを検討中です', emotion: 'thinking' }
  ],
  
  // ECサイト相談
  ec_consultation: [
    { text: '予算300万円以内', value: '予算は300万円以内です', emotion: 'professional' },
    { text: '予算500万円以内', value: '予算は500万円以内です', emotion: 'professional' },
    { text: '1ヶ月以内に必要', value: '1ヶ月以内に必要です', emotion: 'determined' },
    { text: 'まず費用を知りたい', value: 'まず費用感を教えてください', emotion: 'curious' }
  ],
  
  // 費用確認
  pricing_inquiry: [
    { text: 'ECサイトの費用', value: 'ECサイトの制作費用を教えて', emotion: 'professional' },
    { text: '名刺の費用', value: '名刺の印刷費用を教えて', emotion: 'professional' },
    { text: 'チラシの費用', value: 'チラシの印刷費用を教えて', emotion: 'professional' },
    { text: '詳しく相談したい', value: '詳しく相談したいです', emotion: 'attentive' }
  ],
  
  // 期限確認
  deadline_options: [
    { text: '急ぎ（1週間以内）', value: '1週間以内に必要です', emotion: 'determined' },
    { text: '1ヶ月以内', value: '1ヶ月以内に必要です', emotion: 'professional' },
    { text: '2-3ヶ月', value: '2-3ヶ月後で大丈夫です', emotion: 'relaxed' },
    { text: '相談して決める', value: '期限は相談して決めたいです', emotion: 'thinking' }
  ],
  
  // 機能選択（ECサイト）
  ec_features: [
    { text: '基本機能のみ', value: '基本的な機能で十分です', emotion: 'confident' },
    { text: '会員・ポイント機能', value: '会員機能とポイント機能が必要です', emotion: 'professional' },
    { text: 'AI推奨機能付き', value: 'AI推奨機能も欲しいです', emotion: 'excited' },
    { text: 'フルカスタマイズ', value: 'フルカスタマイズを希望します', emotion: 'proud' }
  ],
  
  // Yes/No選択
  yes_no: [
    { text: 'はい', value: 'はい', emotion: 'happy' },
    { text: 'いいえ', value: 'いいえ', emotion: 'neutral' },
    { text: '相談したい', value: '相談したいです', emotion: 'thinking' }
  ],
  
  // 詳細確認
  more_details: [
    { text: '詳しく教えて', value: '詳しく教えてください', emotion: 'curious' },
    { text: '他の選択肢は？', value: '他の選択肢を教えて', emotion: 'thinking' },
    { text: '電話で相談', value: '電話で相談したいです', emotion: 'professional' },
    { text: '見積もり依頼', value: '正式な見積もりをお願いします', emotion: 'determined' }
  ]
};

/**
 * Analyze context and suggest quick actions
 */
export function suggestQuickActions(context) {
  const { message, serviceType, hasGreeted, askedAbout, messageCount, isInitialGreeting } = context;
  
  // 初回挨拶後（必ず表示）
  if (isInitialGreeting || messageCount === 0 || messageCount === 1) {
    return QUICK_ACTIONS.initial_greeting;
  }
  
  // 印刷サービスを選択した場合
  if (message?.includes('印刷') || message?.includes('製造加工')) {
    return QUICK_ACTIONS.printing_menu;
  }
  
  // Webサービスを選択した場合
  if (message?.includes('Web') || message?.includes('デジタル')) {
    return QUICK_ACTIONS.web_menu;
  }
  
  // 売上相談の文脈
  if (message?.includes('売上') || message?.includes('売り上げ')) {
    return QUICK_ACTIONS.sales_consultation;
  }
  
  // ECサイトの文脈
  if (serviceType === 'ECサイト' || message?.includes('EC')) {
    if (!askedAbout?.includes('budget')) {
      return QUICK_ACTIONS.ec_consultation;
    }
    if (!askedAbout?.includes('features')) {
      return QUICK_ACTIONS.ec_features;
    }
  }
  
  // 費用を聞かれた時
  if (message?.includes('費用') || message?.includes('いくら') || message?.includes('価格')) {
    return QUICK_ACTIONS.pricing_inquiry;
  }
  
  // 期限を聞かれた時
  if (message?.includes('いつまで') || message?.includes('納期') || message?.includes('期限')) {
    return QUICK_ACTIONS.deadline_options;
  }
  
  // デフォルト
  return QUICK_ACTIONS.more_details;
}

/**
 * Generate HTML for quick action buttons
 */
export function generateQuickActionHTML(actions) {
  if (!actions || actions.length === 0) return '';
  
  let html = '<div class="quick-actions">';
  html += '<div class="quick-actions-label">選択できる回答:</div>';
  html += '<div class="quick-action-buttons">';
  
  actions.forEach(action => {
    html += `<button class="quick-action-btn" 
              data-value="${action.value}" 
              data-emotion="${action.emotion}"
              onclick="sendQuickAction(this)">
              ${action.text}
            </button>`;
  });
  
  html += '</div>';
  html += '</div>';
  
  return html;
}

/**
 * Get context-aware EC site pricing response
 */
export function getECSitePricingResponse(budget, timeline) {
  const responses = {
    'under_100': {
      message: 'ベーシックプラン（50-100万円）がおすすめ！基本的なEC機能と商品50点まで登録できるよ。1ヶ月なら急ピッチで作れる✨',
      emotion: 'professional'
    },
    'under_300': {
      message: 'スタンダードプラン（100-200万円）かプロフェッショナル（300万円〜）がいいね！会員機能やAI推奨も付けられるよ💕',
      emotion: 'excited'
    },
    'under_500': {
      message: 'プロフェッショナルプラン（300-500万円）でAmazonみたいな本格ECサイトが作れるよ！マーケットプレイス機能も可能✨',
      emotion: 'proud'
    },
    'over_500': {
      message: 'エンタープライズプラン（500万円〜）でフルカスタマイズ！API連携やビッグデータ分析も含めて最高のECサイト作るよ💕',
      emotion: 'star_eyes'
    },
    'no_budget': {
      message: 'ECサイトは規模によって50万円〜500万円以上まで幅広いよ〜！どんな機能が必要か教えてもらえれば、ピッタリのプラン提案するね✨',
      emotion: 'helpful'
    }
  };
  
  if (!budget) return responses.no_budget;
  
  const budgetNum = parseInt(budget.toString().replace(/[^\d]/g, ''));
  if (budgetNum <= 100) return responses.under_100;
  if (budgetNum <= 300) return responses.under_300;
  if (budgetNum <= 500) return responses.under_500;
  return responses.over_500;
}

/**
 * Generate smart followup questions
 */
export function generateFollowupQuestions(context) {
  const { serviceType, extractedInfo, askedQuestions } = context;
  const questions = [];
  
  if (serviceType === 'ECサイト') {
    if (!extractedInfo.budget && !askedQuestions.has('budget')) {
      questions.push('ご予算はどのくらいをお考えですか？');
    }
    if (!extractedInfo.deadline && !askedQuestions.has('deadline')) {
      questions.push('いつまでに公開したいですか？');
    }
    if (!extractedInfo.features && !askedQuestions.has('features')) {
      questions.push('必要な機能（決済・会員・在庫管理など）はありますか？');
    }
    if (!extractedInfo.products && !askedQuestions.has('products')) {
      questions.push('商品点数はどのくらいの予定ですか？');
    }
  }
  
  // 最大2つまでの質問に絞る
  return questions.slice(0, 2);
}

export default {
  QUICK_ACTIONS,
  suggestQuickActions,
  generateQuickActionHTML,
  getECSitePricingResponse,
  generateFollowupQuestions
};