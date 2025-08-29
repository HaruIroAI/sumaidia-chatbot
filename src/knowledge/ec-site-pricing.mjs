/**
 * EC Site Pricing Knowledge Base
 * ECサイト制作の価格情報
 */

export const EC_SITE_PRICING = {
  basic: {
    name: 'ベーシックプラン',
    price: '50万円〜',
    features: [
      '商品登録（〜50点）',
      '基本的な決済機能',
      'レスポンシブデザイン',
      '管理画面'
    ],
    timeline: '1〜2ヶ月'
  },
  standard: {
    name: 'スタンダードプラン',
    price: '100万円〜200万円',
    features: [
      '商品登録（〜500点）',
      '複数決済対応',
      '在庫管理機能',
      '会員機能',
      'メルマガ機能',
      'クーポン機能'
    ],
    timeline: '2〜3ヶ月'
  },
  professional: {
    name: 'プロフェッショナルプラン',
    price: '300万円〜500万円',
    features: [
      '商品無制限登録',
      'マルチ決済',
      '高度な在庫管理',
      'CRM連携',
      'AI推奨機能',
      '多言語対応',
      'マーケットプレイス機能'
    ],
    timeline: '3〜6ヶ月'
  },
  enterprise: {
    name: 'エンタープライズ',
    price: '500万円〜',
    features: [
      'フルカスタマイズ',
      'API連携',
      'ビッグデータ分析',
      'オムニチャネル対応',
      '24時間サポート'
    ],
    timeline: '6ヶ月〜'
  }
};

/**
 * Get pricing recommendation based on requirements
 */
export function getECPricingRecommendation(requirements = {}) {
  const { budget, timeline, features, scale } = requirements;
  
  // Budget-based recommendation
  if (budget) {
    const budgetNum = parseInt(budget.replace(/[^\d]/g, ''));
    if (budgetNum <= 100) {
      return EC_SITE_PRICING.basic;
    } else if (budgetNum <= 200) {
      return EC_SITE_PRICING.standard;
    } else if (budgetNum <= 500) {
      return EC_SITE_PRICING.professional;
    } else {
      return EC_SITE_PRICING.enterprise;
    }
  }
  
  // Scale-based recommendation
  if (scale === 'Amazon' || scale === 'large') {
    return EC_SITE_PRICING.professional;
  }
  
  // Default recommendation
  return EC_SITE_PRICING.standard;
}

/**
 * Generate pricing message for Smaichan
 */
export function generateECPricingMessage(requirements = {}) {
  const recommendation = getECPricingRecommendation(requirements);
  
  if (requirements.budget === '300万円') {
    return `300万円の予算ならプロフェッショナルプランがピッタリ！商品無制限登録、AI推奨機能、マーケットプレイス機能とか、Amazonみたいな本格的なECサイトが作れるよ〜✨ 1ヶ月後の納期だとちょっとタイトだから、段階リリースも提案できるよ💕`;
  }
  
  return `ECサイトの費用感は、ベーシック50万円〜、スタンダード100-200万円、プロ300-500万円くらいだよ〜！機能や規模によって変わるから、詳しく聞かせて✨`;
}

export default {
  EC_SITE_PRICING,
  getECPricingRecommendation,
  generateECPricingMessage
};