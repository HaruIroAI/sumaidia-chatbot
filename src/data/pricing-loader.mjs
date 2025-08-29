/**
 * Pricing and delivery data loader
 * Provides access to pricing tables and delivery schedules
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cache for loaded data
let pricingData = null;
let deliveryData = null;

/**
 * Load pricing data from JSON files
 */
export function loadPricingData() {
  if (pricingData) return pricingData;
  
  try {
    const printingPrices = JSON.parse(
      readFileSync(join(__dirname, '../../data/pricing/printing-prices.json'), 'utf8')
    );
    const digitalPrices = JSON.parse(
      readFileSync(join(__dirname, '../../data/pricing/digital-prices.json'), 'utf8')
    );
    
    pricingData = {
      printing: printingPrices,
      digital: digitalPrices
    };
    
    return pricingData;
  } catch (error) {
    console.error('Error loading pricing data:', error);
    return null;
  }
}

/**
 * Load delivery schedule data
 */
export function loadDeliveryData() {
  if (deliveryData) return deliveryData;
  
  try {
    deliveryData = JSON.parse(
      readFileSync(join(__dirname, '../../data/pricing/delivery-schedule.json'), 'utf8')
    );
    return deliveryData;
  } catch (error) {
    console.error('Error loading delivery data:', error);
    return null;
  }
}

/**
 * Get price estimate for a service
 * @param {string} category - Service category (printing/digital)
 * @param {string} service - Service type
 * @param {object} specs - Specifications (quantity, size, options, etc.)
 * @returns {object} Price estimate with breakdown
 */
export function getPriceEstimate(category, service, specs = {}) {
  const pricing = loadPricingData();
  if (!pricing) return null;
  
  const categoryData = pricing[category];
  if (!categoryData) return null;
  
  // Example: Business cards pricing
  if (category === 'printing' && service === 'businessCards') {
    const serviceData = categoryData.businessCards;
    const quantity = specs.quantity || 100;
    const type = specs.type || 'standard';
    
    // Find closest quantity tier
    const quantities = Object.keys(serviceData.basePrice)
      .map(q => parseInt(q))
      .sort((a, b) => a - b);
    
    let selectedQty = quantities[0];
    for (const qty of quantities) {
      if (quantity >= qty) selectedQty = qty;
      else break;
    }
    
    const basePrice = serviceData.basePrice[selectedQty]?.[type] || 0;
    let totalPrice = basePrice;
    let appliedOptions = [];
    
    // Apply options
    if (specs.options) {
      for (const option of specs.options) {
        const optionPrice = serviceData.options[option];
        if (optionPrice) {
          if (optionPrice.includes('%')) {
            const percentage = parseInt(optionPrice.replace(/[^\d]/g, '')) / 100;
            totalPrice *= (1 + percentage);
            appliedOptions.push(`${option}: +${percentage * 100}%`);
          } else {
            const additionalCost = parseInt(optionPrice.replace(/[^\d]/g, ''));
            totalPrice += additionalCost;
            appliedOptions.push(`${option}: +${additionalCost}円`);
          }
        }
      }
    }
    
    return {
      service: serviceData.name,
      quantity: quantity,
      basePrice: basePrice,
      options: appliedOptions,
      estimatedPrice: Math.round(totalPrice),
      currency: '円',
      note: '税別・送料別',
      delivery: specs.express ? serviceData.deliveryDays.express : serviceData.deliveryDays.standard
    };
  }
  
  // Add more service-specific logic as needed
  return {
    error: 'Price calculation not implemented for this service',
    service: service,
    category: category
  };
}

/**
 * Get delivery estimate
 * @param {string} category - Service category
 * @param {string} service - Service type
 * @param {boolean} express - Express delivery requested
 * @returns {object} Delivery information
 */
export function getDeliveryEstimate(category, service, express = false) {
  const delivery = loadDeliveryData();
  if (!delivery) return null;
  
  const categoryData = delivery[category];
  if (!categoryData?.[service]) return null;
  
  const serviceDelivery = categoryData[service];
  const deliveryType = express ? 'express' : 'standard';
  const deliveryInfo = serviceDelivery[deliveryType] || serviceDelivery;
  
  return {
    service: service,
    type: deliveryType,
    duration: deliveryInfo.workDays || deliveryInfo.duration,
    unit: deliveryInfo.unit || '',
    surcharge: express ? (deliveryInfo.surcharge || 'Contact for express pricing') : null,
    conditions: deliveryInfo.conditions,
    factors: deliveryInfo.factors,
    phases: deliveryInfo.phases
  };
}

/**
 * Format price for display
 * @param {number} price - Price in yen
 * @returns {string} Formatted price string
 */
export function formatPrice(price) {
  if (!price || price === 0) return '要見積もり';
  
  // Format with thousand separators
  const formatted = price.toLocaleString('ja-JP');
  return `${formatted}円〜`;
}

/**
 * Format delivery time for display
 * @param {object} delivery - Delivery information
 * @returns {string} Formatted delivery string
 */
export function formatDelivery(delivery) {
  if (!delivery) return '要確認';
  
  if (delivery.duration) {
    return delivery.duration;
  }
  
  if (delivery.workDays) {
    return `${delivery.workDays}${delivery.unit || '営業日'}`;
  }
  
  return '要確認';
}

/**
 * Search pricing data for relevant information
 * @param {string} query - Search query
 * @returns {array} Matching price/delivery information
 */
export function searchPricing(query) {
  const results = [];
  const pricing = loadPricingData();
  const delivery = loadDeliveryData();
  
  if (!pricing || !delivery) return results;
  
  const lowerQuery = query.toLowerCase();
  
  // Search in printing prices
  if (lowerQuery.includes('名刺')) {
    results.push({
      type: 'pricing',
      service: '名刺印刷',
      data: pricing.printing.businessCards
    });
  }
  
  if (lowerQuery.includes('チラシ') || lowerQuery.includes('フライヤー')) {
    results.push({
      type: 'pricing',
      service: 'チラシ・フライヤー印刷',
      data: pricing.printing.flyers
    });
  }
  
  // Search in digital prices
  if (lowerQuery.includes('web') || lowerQuery.includes('ホームページ') || lowerQuery.includes('サイト')) {
    results.push({
      type: 'pricing',
      service: 'Webサイト制作',
      data: pricing.digital.webDesign
    });
  }
  
  if (lowerQuery.includes('動画') || lowerQuery.includes('ビデオ')) {
    results.push({
      type: 'pricing',
      service: '動画制作',
      data: pricing.digital.videoProduction
    });
  }
  
  // Search for delivery information
  if (lowerQuery.includes('納期') || lowerQuery.includes('いつ') || lowerQuery.includes('日数')) {
    // Add relevant delivery info based on other keywords in query
    if (lowerQuery.includes('名刺')) {
      results.push({
        type: 'delivery',
        service: '名刺',
        data: delivery.printing['名刺']
      });
    }
  }
  
  return results;
}

// Export all functions
export default {
  loadPricingData,
  loadDeliveryData,
  getPriceEstimate,
  getDeliveryEstimate,
  formatPrice,
  formatDelivery,
  searchPricing
};