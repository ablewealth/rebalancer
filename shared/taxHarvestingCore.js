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
      minTargetThreshold: config.minTargetThreshold || 100,
      maxTradesPerCategory: config.maxTradesPerCategory || 10,
      portfolioValueThresholds: {
        small: 100000,    // Under $100k
        medium: 1000000,  // $100k - $1M
        large: 10000000   // Over $1M
      }
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
    
    // Calculate portfolio context for adaptive behavior
    const portfolioContext = this.analyzePortfolioContext(portfolio);
    
    if (this.config.enableLogging) {
      console.log('=== TAX HARVESTING CALCULATION START ===');
      console.log('Targets:', targets);
      console.log('Portfolio size:', portfolio.length);
      console.log('Portfolio context:', portfolioContext);
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

    // Generate recommendations with portfolio-aware logic
    const recommendations = this.generateRecommendations(categories, neededST, neededLT, portfolioContext);
    
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
        portfolioContext,
        version: this.version
      }
    };
  }

  /**
   * Analyze portfolio context for adaptive algorithm behavior
   */
  analyzePortfolioContext(portfolio) {
    const totalValue = portfolio.reduce((sum, pos) => sum + (pos.quantity * pos.price), 0);
    const taxablePositions = portfolio.filter(pos => pos.accountType === 'taxable');
    const avgPositionSize = taxablePositions.length > 0 ? totalValue / taxablePositions.length : 0;
    
    let sizeCategory = 'small';
    if (totalValue >= this.config.portfolioValueThresholds.large) {
      sizeCategory = 'large';
    } else if (totalValue >= this.config.portfolioValueThresholds.medium) {
      sizeCategory = 'medium';
    }

    return {
      totalValue,
      sizeCategory,
      positionCount: taxablePositions.length,
      avgPositionSize,
      hasLargeLots: taxablePositions.some(pos => (pos.quantity * pos.price) > 50000),
      hasSmallLots: taxablePositions.some(pos => (pos.quantity * pos.price) < 1000)
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
   * Generate trading recommendations based on targets with portfolio-aware logic
   */
  generateRecommendations(categories, neededST, neededLT, portfolioContext) {
    const recommendations = [];

    // Adapt thresholds based on portfolio size and context
    const adaptiveThresholds = this.calculateAdaptiveThresholds(portfolioContext);

    // Handle short-term targets
    if (Math.abs(neededST) >= adaptiveThresholds.minTarget) {
      if (neededST > 0) {
        // Need short-term gains
        recommendations.push(...this.selectOptimalPositions(categories.stGains, neededST, portfolioContext));
      } else {
        // Need short-term losses
        recommendations.push(...this.selectOptimalPositions(categories.stLosses, neededST, portfolioContext));
      }
    }

    // Handle long-term targets
    if (Math.abs(neededLT) >= adaptiveThresholds.minTarget) {
      if (neededLT > 0) {
        // Need long-term gains
        recommendations.push(...this.selectOptimalPositions(categories.ltGains, neededLT, portfolioContext));
      } else {
        // Need long-term losses
        recommendations.push(...this.selectOptimalPositions(categories.ltLosses, neededLT, portfolioContext));
      }
    }

    // Apply excessive trade prevention
    return this.preventExcessiveTrades(recommendations, portfolioContext);
  }

  /**
   * Calculate adaptive thresholds based on portfolio context
   */
  calculateAdaptiveThresholds(portfolioContext) {
    const { sizeCategory, avgPositionSize, totalValue } = portfolioContext;
    
    let minTarget = this.config.minTargetThreshold;
    let minTradeAmount = this.config.minTradeAmount;
    let maxTrades = this.config.maxTradesPerCategory;

    // Adjust based on portfolio size
    switch (sizeCategory) {
      case 'small':
        // Smaller portfolios: lower thresholds, fewer trades
        minTarget = Math.max(50, totalValue * 0.001); // 0.1% of portfolio or $50
        minTradeAmount = Math.max(25, avgPositionSize * 0.05); // 5% of avg position or $25
        maxTrades = Math.min(5, Math.floor(portfolioContext.positionCount * 0.3));
        break;
      case 'medium':
        // Medium portfolios: moderate thresholds
        minTarget = Math.max(500, totalValue * 0.0005); // 0.05% of portfolio or $500
        minTradeAmount = Math.max(100, avgPositionSize * 0.1); // 10% of avg position or $100
        maxTrades = Math.min(8, Math.floor(portfolioContext.positionCount * 0.4));
        break;
      case 'large':
        // Large portfolios: higher thresholds, more trades allowed
        minTarget = Math.max(2000, totalValue * 0.0002); // 0.02% of portfolio or $2000
        minTradeAmount = Math.max(500, avgPositionSize * 0.15); // 15% of avg position or $500
        maxTrades = Math.min(15, Math.floor(portfolioContext.positionCount * 0.5));
        break;
    }

    return { minTarget, minTradeAmount, maxTrades };
  }

  /**
   * Prevent excessive trades based on portfolio context
   */
  preventExcessiveTrades(recommendations, portfolioContext) {
    const thresholds = this.calculateAdaptiveThresholds(portfolioContext);
    
    // Group by category (ST gains, ST losses, LT gains, LT losses)
    const grouped = {
      stGains: recommendations.filter(r => r.term === 'Short' && r.unrealizedGain > 0),
      stLosses: recommendations.filter(r => r.term === 'Short' && r.unrealizedGain < 0),
      ltGains: recommendations.filter(r => r.term === 'Long' && r.unrealizedGain > 0),
      ltLosses: recommendations.filter(r => r.term === 'Long' && r.unrealizedGain < 0)
    };

    const filtered = [];
    
    // Limit trades per category and prioritize by efficiency
    Object.values(grouped).forEach(categoryTrades => {
      if (categoryTrades.length > thresholds.maxTrades) {
        // Sort by efficiency (absolute gain per dollar invested)
        const sorted = categoryTrades.sort((a, b) => {
          const efficiencyA = Math.abs(a.unrealizedGain) / (a.quantity * a.price);
          const efficiencyB = Math.abs(b.unrealizedGain) / (b.quantity * b.price);
          return efficiencyB - efficiencyA;
        });
        filtered.push(...sorted.slice(0, thresholds.maxTrades));
      } else {
        filtered.push(...categoryTrades);
      }
    });

    return filtered;
  }

  /**
   * Select optimal positions using improved algorithm with portfolio context
   */
  selectOptimalPositions(positions, target, portfolioContext) {
    const adaptiveThresholds = this.calculateAdaptiveThresholds(portfolioContext);
    
    if (positions.length === 0 || Math.abs(target) < adaptiveThresholds.minTradeAmount) {
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
    return this.dynamicProgrammingSelection(sortedPositions, target, adaptiveThresholds);
  }

  /**
   * Dynamic programming approach for optimal position selection
   */
  dynamicProgrammingSelection(positions, target, adaptiveThresholds) {
    const n = positions.length;
    const targetAbs = Math.abs(target);
    const maxOvershoot = targetAbs * (this.config.maxOvershootPercent / 100);
    
    // For small targets, use greedy approach instead of DP
    if (targetAbs < 10000) {
      return this.greedySelection(positions, target, adaptiveThresholds);
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
   * Greedy selection for smaller targets with adaptive thresholds
   */
  greedySelection(positions, target, adaptiveThresholds) {
    const targetAbs = Math.abs(target);
    const selected = [];
    let currentTotal = 0;
    let tradesCount = 0;
    
    for (const position of positions) {
      const positionValue = Math.abs(position.unrealizedGain);
      
      // Stop if we've reached max trades for this category
      if (tradesCount >= adaptiveThresholds.maxTrades) {
        break;
      }
      
      // Add position if it helps us get closer to target and meets minimum threshold
      if (currentTotal < targetAbs && positionValue >= adaptiveThresholds.minTradeAmount) {
        selected.push({
          ...position,
          action: 'sell',
          quantity: position.quantity,
          proceeds: position.quantity * position.price
        });
        currentTotal += positionValue;
        tradesCount++;
        
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
  module.exports = TaxHarvestingCore;
} else if (typeof window !== 'undefined') {
  window.TaxHarvestingCore = TaxHarvestingCore;
}
