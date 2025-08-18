/**
 * Shared Wash Sale Detection Library
 * 
 * Implements IRS Section 1091 wash sale rules and ETF similarity detection
 * 
 * @version 3.0.0
 */

class WashSaleDetection {
  constructor(config = {}) {
    this.config = {
      washSaleWindow: config.washSaleWindow || 61, // 30 days before + 30 days after + sale date
      similarityThreshold: config.similarityThreshold || 85,
      strictMode: config.strictMode !== false,
      enableLogging: config.enableLogging !== false
    };
    
    // ETF similarity database (simplified version)
    this.etfDatabase = {
      'SPY': { assetClass: 'US Equity', style: 'Large Cap', sector: 'Broad Market', similarity: 100 },
      'VOO': { assetClass: 'US Equity', style: 'Large Cap', sector: 'Broad Market', similarity: 95 },
      'IVV': { assetClass: 'US Equity', style: 'Large Cap', sector: 'Broad Market', similarity: 95 },
      'VTI': { assetClass: 'US Equity', style: 'Total Market', sector: 'Broad Market', similarity: 90 },
      'QQQ': { assetClass: 'US Equity', style: 'Large Cap', sector: 'Technology', similarity: 70 },
      'VGT': { assetClass: 'US Equity', style: 'Large Cap', sector: 'Technology', similarity: 85 },
      'XLK': { assetClass: 'US Equity', style: 'Large Cap', sector: 'Technology', similarity: 85 }
    };
  }

  /**
   * Check for wash sale violations in a set of recommendations
   * @param {Array} recommendations - Trading recommendations
   * @param {Array} recentPurchases - Recent purchase history
   * @returns {Array} Array of violations found
   */
  checkWashSaleViolations(recommendations, recentPurchases = []) {
    const violations = [];
    const soldSymbols = recommendations.map(r => r.symbol);
    
    // Check each sold position against recent purchases
    for (const recommendation of recommendations) {
      if (recommendation.unrealizedGain >= 0) continue; // Only losses can trigger wash sales
      
      // Check for direct repurchases
      const directViolations = this.checkDirectRepurchases(recommendation, recentPurchases);
      violations.push(...directViolations);
      
      // Check for substantially identical securities
      const similarityViolations = this.checkSimilarSecurities(recommendation, recentPurchases);
      violations.push(...similarityViolations);
    }
    
    return violations;
  }

  /**
   * Check for direct repurchases of the same security
   */
  checkDirectRepurchases(soldPosition, recentPurchases) {
    const violations = [];
    const saleDate = new Date();
    
    for (const purchase of recentPurchases) {
      if (purchase.symbol !== soldPosition.symbol) continue;
      
      const purchaseDate = new Date(purchase.date);
      const daysDifference = Math.abs((saleDate - purchaseDate) / (1000 * 60 * 60 * 24));
      
      if (daysDifference <= 30) {
        violations.push({
          type: 'direct_repurchase',
          soldSymbol: soldPosition.symbol,
          purchasedSymbol: purchase.symbol,
          soldAmount: soldPosition.unrealizedGain,
          purchaseDate: purchase.date,
          daysDifference,
          riskLevel: 'HIGH',
          description: `Direct repurchase of ${soldPosition.symbol} within 30 days`
        });
      }
    }
    
    return violations;
  }

  /**
   * Check for substantially identical securities
   */
  checkSimilarSecurities(soldPosition, recentPurchases) {
    const violations = [];
    const soldETF = this.etfDatabase[soldPosition.symbol];
    
    if (!soldETF) return violations; // No similarity data available
    
    const saleDate = new Date();
    
    for (const purchase of recentPurchases) {
      if (purchase.symbol === soldPosition.symbol) continue; // Already checked in direct repurchases
      
      const purchasedETF = this.etfDatabase[purchase.symbol];
      if (!purchasedETF) continue;
      
      const similarity = this.calculateSimilarity(soldETF, purchasedETF);
      
      if (similarity >= this.config.similarityThreshold) {
        const purchaseDate = new Date(purchase.date);
        const daysDifference = Math.abs((saleDate - purchaseDate) / (1000 * 60 * 60 * 24));
        
        if (daysDifference <= 30) {
          violations.push({
            type: 'similar_security',
            soldSymbol: soldPosition.symbol,
            purchasedSymbol: purchase.symbol,
            soldAmount: soldPosition.unrealizedGain,
            purchaseDate: purchase.date,
            daysDifference,
            similarity,
            riskLevel: this.getRiskLevel(similarity),
            description: `Purchase of similar ETF ${purchase.symbol} (${similarity}% similar) within 30 days of selling ${soldPosition.symbol}`
          });
        }
      }
    }
    
    return violations;
  }

  /**
   * Calculate similarity between two ETFs
   */
  calculateSimilarity(etf1, etf2) {
    let score = 0;
    
    // Asset class match (40% weight)
    if (etf1.assetClass === etf2.assetClass) score += 40;
    
    // Style match (30% weight)
    if (etf1.style === etf2.style) score += 30;
    
    // Sector match (30% weight)
    if (etf1.sector === etf2.sector) score += 30;
    
    return Math.min(score, 100);
  }

  /**
   * Get risk level based on similarity score
   */
  getRiskLevel(similarity) {
    if (similarity >= 95) return 'CRITICAL';
    if (similarity >= 85) return 'HIGH';
    if (similarity >= 70) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Find alternative ETFs that avoid wash sale rules
   */
  findAlternatives(soldSymbol, excludeSymbols = []) {
    const soldETF = this.etfDatabase[soldSymbol];
    if (!soldETF) return [];
    
    const alternatives = [];
    
    for (const [symbol, etf] of Object.entries(this.etfDatabase)) {
      if (symbol === soldSymbol || excludeSymbols.includes(symbol)) continue;
      
      const similarity = this.calculateSimilarity(soldETF, etf);
      
      // Find ETFs that are similar enough to maintain exposure but different enough to avoid wash sale
      if (similarity >= 50 && similarity < this.config.similarityThreshold) {
        alternatives.push({
          symbol,
          similarity,
          riskLevel: this.getRiskLevel(similarity),
          description: `${etf.assetClass} ${etf.style} ${etf.sector}`,
          washSaleRisk: similarity >= 70 ? 'MEDIUM' : 'LOW'
        });
      }
    }
    
    // Sort by similarity (descending) but below wash sale threshold
    return alternatives.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Validate wash sale compliance for a trading plan
   */
  validateTradingPlan(tradingPlan, purchaseHistory = []) {
    const results = {
      isCompliant: true,
      violations: [],
      warnings: [],
      recommendations: []
    };
    
    // Check all sales for wash sale violations
    const sales = tradingPlan.filter(trade => trade.action === 'sell');
    const purchases = tradingPlan.filter(trade => trade.action === 'buy');
    
    // Combine recent purchases with planned purchases
    const allPurchases = [...purchaseHistory, ...purchases.map(p => ({
      symbol: p.symbol,
      date: new Date().toISOString(),
      quantity: p.quantity
    }))];
    
    for (const sale of sales) {
      const violations = this.checkWashSaleViolations([sale], allPurchases);
      
      if (violations.length > 0) {
        results.isCompliant = false;
        results.violations.push(...violations);
        
        // Generate alternatives for violated positions
        const alternatives = this.findAlternatives(sale.symbol);
        if (alternatives.length > 0) {
          results.recommendations.push({
            violatedSymbol: sale.symbol,
            alternatives: alternatives.slice(0, 3) // Top 3 alternatives
          });
        }
      }
    }
    
    return results;
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WashSaleDetection };
} else if (typeof window !== 'undefined') {
  window.WashSaleDetection = WashSaleDetection;
}
