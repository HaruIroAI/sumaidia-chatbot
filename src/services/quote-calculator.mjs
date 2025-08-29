/**
 * Quote Calculator Service
 * Provides automatic price calculation for various services
 */

import { loadPricingData, loadDeliveryData } from '../data/pricing-loader.mjs';

/**
 * Calculate quote for printing services
 */
export class QuoteCalculator {
  constructor() {
    this.pricingData = loadPricingData();
    this.deliveryData = loadDeliveryData();
  }

  /**
   * Calculate business card printing quote
   * @param {object} specs - Specifications
   * @returns {object} Quote details
   */
  calculateBusinessCards(specs) {
    const { quantity = 100, cardType = 'standard', options = [], express = false } = specs;
    const pricing = this.pricingData?.printing?.businessCards;
    
    if (!pricing) return this.errorQuote('価格データが見つかりません');

    // Find appropriate quantity tier
    const tiers = Object.keys(pricing.basePrice)
      .map(q => parseInt(q))
      .sort((a, b) => a - b);
    
    let selectedTier = tiers[0];
    let nextTier = null;
    
    for (let i = 0; i < tiers.length; i++) {
      if (quantity >= tiers[i]) {
        selectedTier = tiers[i];
        nextTier = tiers[i + 1] || null;
      }
    }

    // Base price calculation
    let basePrice = pricing.basePrice[selectedTier]?.[cardType] || 0;
    let totalPrice = basePrice;
    let appliedOptions = [];

    // Apply options
    for (const option of options) {
      const optionPrice = pricing.options[option];
      if (optionPrice) {
        if (optionPrice.includes('%')) {
          const percentage = parseInt(optionPrice.match(/\d+/)[0]) / 100;
          totalPrice *= (1 + percentage);
          appliedOptions.push({
            name: option,
            type: 'percentage',
            value: percentage * 100,
            cost: Math.round(basePrice * percentage)
          });
        } else {
          const additionalCost = parseInt(optionPrice.match(/\d+/)[0]);
          totalPrice += additionalCost;
          appliedOptions.push({
            name: option,
            type: 'fixed',
            value: additionalCost,
            cost: additionalCost
          });
        }
      }
    }

    // Express delivery surcharge
    if (express) {
      totalPrice *= 1.5;
      appliedOptions.push({
        name: '特急料金',
        type: 'percentage',
        value: 50,
        cost: Math.round(totalPrice * 0.5)
      });
    }

    // Delivery info
    const delivery = this.deliveryData?.printing?.['名刺'];
    const deliveryDays = express ? delivery?.express?.workDays : delivery?.standard?.workDays;

    return {
      service: '名刺印刷',
      quantity: quantity,
      tier: selectedTier,
      nextTier: nextTier,
      basePrice: basePrice,
      options: appliedOptions,
      subtotal: Math.round(totalPrice),
      tax: Math.round(totalPrice * 0.1),
      total: Math.round(totalPrice * 1.1),
      delivery: {
        type: express ? '特急' : '通常',
        days: deliveryDays,
        unit: '営業日'
      },
      notes: [
        nextTier ? `${nextTier}枚以上だと単価がお得になります` : null,
        '価格は概算です。正式見積もりは仕様確定後',
        '送料は別途'
      ].filter(Boolean),
      smaichanMessage: this.generateSmaichanMessage('businessCards', Math.round(totalPrice * 1.1), deliveryDays)
    };
  }

  /**
   * Calculate flyer printing quote
   * @param {object} specs - Specifications
   * @returns {object} Quote details
   */
  calculateFlyers(specs) {
    const { 
      quantity = 1000, 
      size = 'A4', 
      color = 'color', 
      doubleSided = false,
      express = false 
    } = specs;
    
    const pricing = this.pricingData?.printing?.flyers;
    if (!pricing) return this.errorQuote('価格データが見つかりません');

    // Get size-specific pricing
    const sizePricing = pricing.sizes[size];
    if (!sizePricing) return this.errorQuote(`${size}サイズの価格が見つかりません`);

    // Find quantity tier
    const quantities = Object.keys(sizePricing)
      .filter(k => !isNaN(k))
      .map(q => parseInt(q))
      .sort((a, b) => a - b);

    let selectedQty = quantities[0];
    for (const qty of quantities) {
      if (quantity >= qty) selectedQty = qty;
    }

    // Base price
    const priceData = sizePricing[selectedQty];
    let basePrice = priceData?.[color] || priceData?.color || 0;
    let totalPrice = basePrice;

    // Double-sided printing
    if (doubleSided) {
      totalPrice *= 1.4;
    }

    // Express delivery
    if (express) {
      totalPrice *= 1.5;
    }

    // Delivery info
    const delivery = this.deliveryData?.printing?.['チラシ・フライヤー'];
    const deliveryDays = express ? delivery?.express?.workDays : delivery?.standard?.workDays;

    return {
      service: 'チラシ・フライヤー印刷',
      specifications: {
        quantity: quantity,
        size: size,
        color: color === 'color' ? 'カラー' : 'モノクロ',
        sides: doubleSided ? '両面' : '片面'
      },
      basePrice: basePrice,
      adjustments: [
        doubleSided ? { name: '両面印刷', cost: Math.round(basePrice * 0.4) } : null,
        express ? { name: '特急料金', cost: Math.round(totalPrice * 0.33) } : null
      ].filter(Boolean),
      subtotal: Math.round(totalPrice),
      tax: Math.round(totalPrice * 0.1),
      total: Math.round(totalPrice * 1.1),
      delivery: {
        type: express ? '特急' : '通常',
        days: deliveryDays,
        unit: '営業日'
      },
      smaichanMessage: this.generateSmaichanMessage('flyers', Math.round(totalPrice * 1.1), deliveryDays)
    };
  }

  /**
   * Calculate web design quote
   * @param {object} specs - Specifications
   * @returns {object} Quote details
   */
  calculateWebDesign(specs) {
    const { 
      type = 'landingPage',
      plan = 'standard',
      pages = 5,
      maintenance = false
    } = specs;

    const pricing = this.pricingData?.digital?.webDesign;
    if (!pricing) return this.errorQuote('価格データが見つかりません');

    let basePrice = 0;
    let serviceName = '';
    let deliveryTime = '';

    // Determine pricing based on type
    if (type === 'landingPage') {
      const lpPricing = pricing.types.landingPage;
      basePrice = lpPricing[plan]?.price || 0;
      serviceName = 'ランディングページ制作';
      deliveryTime = pricing.deliveryDays.landingPage;
    } else if (type === 'corporateSite') {
      const corpPricing = pricing.types.corporateSite;
      if (pages <= 5) {
        basePrice = corpPricing.small.price;
        serviceName = '企業サイト制作（小規模）';
      } else if (pages <= 10) {
        basePrice = corpPricing.medium.price;
        serviceName = '企業サイト制作（中規模）';
      } else {
        basePrice = corpPricing.large.price;
        serviceName = '企業サイト制作（大規模）';
      }
      deliveryTime = pricing.deliveryDays.corporateSite;
    }

    // Add maintenance if requested
    let maintenanceCost = 0;
    if (maintenance) {
      maintenanceCost = pricing.maintenance.standard.monthly;
    }

    return {
      service: serviceName,
      specifications: {
        type: type,
        plan: plan,
        pages: pages,
        maintenance: maintenance ? '月額保守あり' : 'なし'
      },
      basePrice: basePrice,
      maintenanceMonthly: maintenanceCost,
      subtotal: basePrice,
      tax: Math.round(basePrice * 0.1),
      total: Math.round(basePrice * 1.1),
      delivery: {
        duration: deliveryTime,
        type: '制作期間'
      },
      annualCost: maintenance ? {
        maintenance: maintenanceCost * 12,
        total: Math.round(basePrice * 1.1) + (maintenanceCost * 12)
      } : null,
      smaichanMessage: this.generateSmaichanMessage('web', Math.round(basePrice * 1.1), deliveryTime)
    };
  }

  /**
   * Generate Smaichan-style message for quote
   * @param {string} service - Service type
   * @param {number} price - Total price
   * @param {string} delivery - Delivery time
   * @returns {string} Smaichan message
   */
  generateSmaichanMessage(service, price, delivery) {
    const messages = {
      businessCards: [
        `名刺なら${price.toLocaleString()}円くらいでできるよ〜！`,
        `${delivery}営業日くらいで仕上がる予定だよ✨`,
        `オプションとか追加したい場合は相談してね〜`
      ],
      flyers: [
        `チラシだと${price.toLocaleString()}円くらいかな〜`,
        `納期は${delivery}営業日を見込んでるよ！`,
        `デザインも一緒に作れるから聞いてね💕`
      ],
      web: [
        `サイト制作なら${price.toLocaleString()}円くらいからだよ〜`,
        `制作期間は${delivery}くらいかな✨`,
        `詳しい要望聞かせてくれたら正確に見積もるね！`
      ]
    };

    return messages[service]?.join(' ') || `${price.toLocaleString()}円くらいでできそう！詳しく相談しよ〜✨`;
  }

  /**
   * Generate error quote
   * @param {string} message - Error message
   * @returns {object} Error quote
   */
  errorQuote(message) {
    return {
      error: true,
      message: message,
      smaichanMessage: `ごめんね〜、今すぐ計算できないみたい💦 詳しく確認してくるね！`
    };
  }

  /**
   * Calculate quote based on intent and extracted entities
   * @param {object} params - Parameters
   * @returns {object} Quote result
   */
  calculateQuote({ service, entities = {} }) {
    switch (service) {
      case 'businessCards':
      case '名刺':
        return this.calculateBusinessCards(entities);
      
      case 'flyers':
      case 'チラシ':
      case 'フライヤー':
        return this.calculateFlyers(entities);
      
      case 'web':
      case 'ホームページ':
      case 'サイト':
        return this.calculateWebDesign(entities);
      
      default:
        return this.errorQuote('このサービスの見積もり計算はまだ対応してないよ〜');
    }
  }

  /**
   * Extract entities from user message for quote calculation
   * @param {string} message - User message
   * @returns {object} Extracted entities
   */
  extractQuoteEntities(message) {
    const entities = {};
    
    // Extract quantity
    const qtyMatch = message.match(/(\d+)\s*(枚|部|個|冊)/);
    if (qtyMatch) {
      entities.quantity = parseInt(qtyMatch[1]);
    }

    // Extract size
    const sizeMatch = message.match(/(A[0-6]|B[0-6])/i);
    if (sizeMatch) {
      entities.size = sizeMatch[1].toUpperCase();
    }

    // Check for express
    if (message.includes('急ぎ') || message.includes('特急') || message.includes('至急')) {
      entities.express = true;
    }

    // Check for double-sided
    if (message.includes('両面')) {
      entities.doubleSided = true;
    }

    // Check for color
    if (message.includes('カラー')) {
      entities.color = 'color';
    } else if (message.includes('モノクロ') || message.includes('白黒')) {
      entities.color = 'mono';
    }

    return entities;
  }
}

// Export singleton instance
export default new QuoteCalculator();