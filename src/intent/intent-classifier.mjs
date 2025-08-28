import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IntentClassifier {
  constructor(intentsPath = null) {
    const configPath = intentsPath || path.join(__dirname, '../../data/intents.json');
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.intents = this.config.intents;
    this.defaultDomain = this.config.defaultDomain || 'general';
    this.threshold = this.config.threshold || 0.3;
  }

  /**
   * Classify input text to determine intent domain
   * @param {string} text - Input text to classify
   * @returns {{domain: string, score: number, confidence: string}}
   */
  classify(text) {
    if (!text || typeof text !== 'string') {
      return {
        domain: this.defaultDomain,
        score: 0,
        confidence: 'low'
      };
    }

    const normalizedText = this.normalizeText(text);
    const scores = {};

    // Calculate scores for each intent domain
    for (const [domain, config] of Object.entries(this.intents)) {
      let score = 0;

      // Keyword matching
      if (config.keywords && Array.isArray(config.keywords)) {
        for (const keyword of config.keywords) {
          if (normalizedText.includes(keyword.toLowerCase())) {
            score += (config.weight || 1.0) * 1.0;
          }
        }
      }

      // Pattern matching
      if (config.patterns && Array.isArray(config.patterns)) {
        for (const pattern of config.patterns) {
          try {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(normalizedText)) {
              score += (config.weight || 1.0) * 1.5;
            }
          } catch (e) {
            console.error(`Invalid regex pattern: ${pattern}`, e);
          }
        }
      }

      scores[domain] = score;
    }

    // Find domain with highest score
    let maxScore = 0;
    let bestDomain = this.defaultDomain;

    for (const [domain, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestDomain = domain;
      }
    }

    // Determine confidence level
    let confidence = 'low';
    if (maxScore >= 3.0) {
      confidence = 'high';
    } else if (maxScore >= 1.0) {
      confidence = 'medium';
    }

    // Use default domain if score is below threshold
    if (maxScore < this.threshold) {
      bestDomain = this.defaultDomain;
      confidence = 'low';
    }

    return {
      domain: bestDomain,
      score: maxScore,
      confidence,
      scores // Include all scores for debugging
    };
  }

  /**
   * Normalize text for matching
   * @param {string} text
   * @returns {string}
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff]/g, match => match) // Keep Japanese
      .replace(/[^\w\sぁ-んァ-ヶー一-龠０-９]/g, ' ') // Remove special chars except Japanese
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get intent configuration for a domain
   * @param {string} domain
   * @returns {object}
   */
  getIntentConfig(domain) {
    return this.intents[domain] || this.intents[this.defaultDomain];
  }

  /**
   * Get all available domains
   * @returns {string[]}
   */
  getAvailableDomains() {
    return Object.keys(this.intents);
  }
}

// Export default instance
export default new IntentClassifier();