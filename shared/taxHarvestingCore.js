/**
 * Shared Tax Harvesting Core Library
 * 
 * This module contains the core tax harvesting algorithms that are shared
 * between the frontend HTML/JS implementation and the backend Node.js service.
 * 
 * @version 3.0.0
 * @author Tax Harvesting System
 */

class TaxHarvestingCore {
  constructor(config = {}) {
    this.version = '3.0.0';
    this.config = {
      maxOvershootPercent: config.maxOvershootPercent || 10,
      minTradeAmount: config.minTradeAmount || 50,
      precisionThreshold: config.precisionThreshold || 1,
      enableLogging: config.enableLogging !== false,
      minTargetThreshold: config.minTargetThreshold || 100
    };
  }

  /**
   * Main tax harvesting calculation engine
   * @param {Array} portfolio - Array of position objects
   * @param {Object} targets - Target gains/losses {shortTerm, longTerm}
   * @param {Object} options - Additional options
   * @returns {Object} Calculation results
   */
  calculateTaxHarvesting(portfolio, targets, options = {}) {
    const startTime = performance.now();
    
    if (this.config.enableLogging) {
      console.log('=== TAX HARVESTING CALCULATION START ===');
      console.log('Targets:', targets);
      console.log('Portfolio size:', portfolio.length);
    }

    // Validate inputs
    const validation = this.validateInputs(portfolio, targets);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'Invalid inputs',
        details: validation.errors,
        recommendations: []
      };
    }

    // Filter available positions
    const availablePositions = portfolio.filter(pos => 
      pos.includedInSelling && 
      pos.accountType === 'taxable'
    );

    // Categorize positions
    const categories = this.categorizePositions(availablePositions);
    
    // Calculate needed amounts
    const neededST = targets.shortTerm - (options.ytdGains?.shortTerm || 0);
    const neededLT = targets.longTerm - (options.ytdGains?.longTerm || 0);

    if (this.config.enableLogging) {
      console.log('Needed ST:', neededST, 'Needed LT:', neededLT);
      console.log('Categories:', Object.keys(categories).map(k => `${k}: ${categories[k].length}`));
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(categories, neededST, neededLT);
    
    // Calculate summary
    const summary = this.calculateSummary(recommendations, targets, options.ytdGains);
    
    const endTime = performance.now();
    
    return {
      success: true,
      recommendations,
      summary,
      metadata: {
        calculationTime: endTime - startTime,
        positionsAnalyzed: availablePositions.length,
        categoriesUsed: Object.keys(categories).filter(k => categories[k].length > 0),
        version: this.version
      }
    };
  }

  /**
   * Validate calculation inputs
   */
  validateInputs(portfolio, targets) {
    const errors = [];

    if (!Array.isArray(portfolio)) {
      errors.push('Portfolio must be an array');
    }

    if (!targets || typeof targets !== 'object') {
      errors.push('Targets must be an object');
    }

    if (portfolio.length === 0) {
      errors.push('Portfolio cannot be empty');
    }

    // Validate portfolio positions
    portfolio.forEach((pos, index) => {
      if (!pos.symbol || typeof pos.symbol !== 'string') {
        errors.push(`Position ${index}: Invalid symbol`);
      }
      if (typeof pos.quantity !== 'number' || pos.quantity <= 0) {
        errors.push(`Position ${index}: Invalid quantity`);
      }
      if (typeof pos.price !== 'number' || pos.price <= 0) {
        errors.push(`Position ${index}: Invalid price`);
      }
      if (typeof pos.unrealizedGain !== 'number') {
        errors.push(`Position ${index}: Invalid unrealized gain`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Categorize positions by term and gain/loss
   */
  categorizePositions(positions) {
    return {
      stGains: positions.filter(p => p.term === 'Short' && p.unrealizedGain > 0),
      stLosses: positions.filter(p => p.term === 'Short' && p.unrealizedGain < 0),
      ltGains: positions.filter(p => p.term === 'Long' && p.unrealizedGain > 0),
      ltLosses: positions.filter(p => p.term === 'Long' && p.unrealizedGain < 0)
    };
  }

  /**
   * Generate trading recommendations based on targets
   */
  generateRecommendations(categories, neededST, neededLT) {
    const recommendations = [];

    // Handle short-term targets - use lower threshold for individual trades
    if (Math.abs(neededST) >= this.config.minTargetThreshold) {
      if (neededST > 0) {
        // Need short-term gains
        recommendations.push(...this.selectOptimalPositions(categories.stGains, neededST));
      } else {
        // Need short-term losses
        recommendations.push(...this.selectOptimalPositions(categories.stLosses, neededST));
      }
    }

    // Handle long-term targets - use lower threshold for individual trades
    if (Math.abs(neededLT) >= this.config.minTargetThreshold) {
      if (neededLT > 0) {
        // Need long-term gains
        recommendations.push(...this.selectOptimalPositions(categories.ltGains, neededLT));
      } else {
        // Need long-term losses
        recommendations.push(...this.selectOptimalPositions(categories.ltLosses, neededLT));
      }
    }

    return recommendations;
  }

  /**
   * Select optimal positions using improved algorithm
   */
  selectOptimalPositions(positions, target) {
    if (positions.length === 0 || Math.abs(target) < this.config.minTradeAmount) {
      return [];
    }

    // Sort positions by efficiency (gain per dollar for gains, loss per dollar for losses)
    const sortedPositions = positions.slice().sort((a, b) => {
      if (target > 0) {
        // For gains, prefer higher efficiency
        return (b.unrealizedGain / (b.quantity * b.price)) - (a.unrealizedGain / (a.quantity * a.price));
      } else {
        // For losses, prefer higher absolute efficiency
        return (a.unrealizedGain / (a.quantity * a.price)) - (b.unrealizedGain / (b.quantity * b.price));
      }
    });

    // Use dynamic programming approach for optimal selection
    return this.dynamicProgrammingSelection(sortedPositions, target);
  }

  /**
   * Dynamic programming approach for optimal position selection
   */
  dynamicProgrammingSelection(positions, target) {
    const n = positions.length;
    const targetAbs = Math.abs(target);
    const maxOvershoot = targetAbs * (this.config.maxOvershootPercent / 100);
    
    // For small targets, use greedy approach instead of DP
    if (targetAbs < 10000) {
      return this.greedySelection(positions, target);
    }
    
    // DP table: dp[i][w] = best combination for first i items with weight w
    const dp = Array(n + 1).fill(null).map(() => Array(Math.floor(targetAbs + maxOvershoot) + 1).fill(null));
    
    // Initialize base case
    for (let w = 0; w <= targetAbs + maxOvershoot; w++) {
      dp[0][w] = { value: 0, items: [] };
    }

    // Fill DP table
    for (let i = 1; i <= n; i++) {
      const position = positions[i - 1];
      const weight = Math.abs(position.unrealizedGain);
      
      for (let w = 0; w <= targetAbs + maxOvershoot; w++) {
        // Don't include current position
        dp[i][w] = dp[i - 1][w];
        
        // Include current position if it fits
        if (weight <= w && dp[i - 1][w - weight]) {
          const newValue = dp[i - 1][w - weight].value + weight;
          if (!dp[i][w] || newValue > dp[i][w].value) {
            dp[i][w] = {
              value: newValue,
              items: [...dp[i - 1][w - weight].items, position]
            };
          }
        }
      }
    }

    // Find best solution within acceptable range - more flexible for smaller targets
    let bestSolution = { value: 0, items: [] };
    const minAcceptable = Math.max(this.config.minTradeAmount, Math.floor(targetAbs * 0.7));
    for (let w = minAcceptable; w <= targetAbs + maxOvershoot; w++) {
      if (dp[n][w] && dp[n][w].value > bestSolution.value) {
        bestSolution = dp[n][w];
      }
    }

    return bestSolution.items.map(position => ({
      ...position,
      action: 'sell',
      quantity: position.quantity, // Full position for now
      proceeds: position.quantity * position.price
    }));
  }

  /**
   * Greedy selection for smaller targets
   */
  greedySelection(positions, target) {
    const targetAbs = Math.abs(target);
    const selected = [];
    let currentTotal = 0;
    
    for (const position of positions) {
      const positionValue = Math.abs(position.unrealizedGain);
      
      // Add position if it helps us get closer to target
      if (currentTotal < targetAbs && positionValue >= this.config.minTradeAmount) {
        selected.push({
          ...position,
          action: 'sell',
          quantity: position.quantity,
          proceeds: position.quantity * position.price
        });
        currentTotal += positionValue;
        
        // Stop if we've exceeded target by reasonable amount
        if (currentTotal >= targetAbs * 0.9) {
          break;
        }
      }
    }
    
    return selected;
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(recommendations, targets, ytdGains = {}) {
    const totalST = recommendations
      .filter(r => r.term === 'Short')
      .reduce((sum, r) => sum + r.unrealizedGain, 0);
    
    const totalLT = recommendations
      .filter(r => r.term === 'Long')
      .reduce((sum, r) => sum + r.unrealizedGain, 0);

    const totalProceeds = recommendations.reduce((sum, r) => sum + r.proceeds, 0);

    return {
      targetST: targets.shortTerm,
      targetLT: targets.longTerm,
      actualST: (ytdGains.shortTerm || 0) + totalST,
      actualLT: (ytdGains.longTerm || 0) + totalLT,
      tradeST: totalST,
      tradeLT: totalLT,
      totalRecommendations: recommendations.length,
      totalProceeds,
      accuracy: {
        stAccuracy: this.calculateAccuracy(targets.shortTerm, (ytdGains.shortTerm || 0) + totalST),
        ltAccuracy: this.calculateAccuracy(targets.longTerm, (ytdGains.longTerm || 0) + totalLT)
      }
    };
  }

  /**
   * Calculate accuracy percentage
   */
  calculateAccuracy(target, actual) {
    if (target === 0) return actual === 0 ? 100 : 0;
    return Math.max(0, 100 - Math.abs((actual - target) / target) * 100);
  }

  /**
   * Cash raising algorithm
   */
  calculateCashRaising(portfolio, cashNeeded, options = {}) {
    const startTime = performance.now();
    
    const availablePositions = portfolio.filter(pos => 
      pos.includedInSelling && 
      pos.accountType === 'taxable'
    );

    // Sort by tax efficiency (losses first, then long-term gains, then short-term gains)
    const sortedPositions = availablePositions.slice().sort((a, b) => {
      // Losses are most tax-efficient
      if (a.unrealizedGain < 0 && b.unrealizedGain >= 0) return -1;
      if (b.unrealizedGain < 0 && a.unrealizedGain >= 0) return 1;
      
      // Among gains, prefer long-term
      if (a.unrealizedGain >= 0 && b.unrealizedGain >= 0) {
        if (a.term === 'Long' && b.term === 'Short') return -1;
        if (b.term === 'Long' && a.term === 'Short') return 1;
      }
      
      // Among same category, prefer smaller amounts to minimize tax impact
      return Math.abs(a.unrealizedGain) - Math.abs(b.unrealizedGain);
    });

    const selected = [];
    let totalCash = 0;
    let totalGainLoss = 0;

    for (const position of sortedPositions) {
      if (totalCash >= cashNeeded) break;
      
      const proceeds = position.quantity * position.price;
      selected.push({
        ...position,
        action: 'sell',
        quantity: position.quantity,
        proceeds
      });
      
      totalCash += proceeds;
      totalGainLoss += position.unrealizedGain;
    }

    const endTime = performance.now();

    return {
      success: true,
      recommendations: selected,
      summary: {
        cashTarget: cashNeeded,
        cashRaised: totalCash,
        cashExcess: totalCash - cashNeeded,
        totalGainLoss,
        shortTermGainLoss: selected.filter(s => s.term === 'Short').reduce((sum, s) => sum + s.unrealizedGain, 0),
        longTermGainLoss: selected.filter(s => s.term === 'Long').reduce((sum, s) => sum + s.unrealizedGain, 0),
        totalRecommendations: selected.length
      },
      metadata: {
        calculationTime: endTime - startTime,
        version: this.version
      }
    };
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TaxHarvestingCore };
} else if (typeof window !== 'undefined') {
  window.TaxHarvestingCore = TaxHarvestingCore;
}
