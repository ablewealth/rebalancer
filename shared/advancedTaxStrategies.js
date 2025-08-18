/**
 * Advanced Tax Strategies Module
 * Implements sophisticated tax optimization strategies including:
 * - Tax-gain harvesting
 * - Multi-account coordination
 * - Asset location optimization
 * - Tax-efficient rebalancing
 */

class AdvancedTaxStrategies {
  constructor() {
    this.accountTypes = {
      TAXABLE: 'taxable',
      TRADITIONAL_IRA: 'traditional_ira',
      ROTH_IRA: 'roth_ira',
      HSA: 'hsa',
      FOUR_OH_ONE_K: '401k'
    };
    
    this.assetTaxEfficiency = {
      // Most tax-efficient (best for taxable accounts)
      'municipal_bonds': 1,
      'tax_managed_funds': 2,
      'index_funds': 3,
      'individual_stocks': 4,
      
      // Moderately tax-efficient
      'balanced_funds': 5,
      'large_cap_funds': 6,
      'international_funds': 7,
      
      // Least tax-efficient (best for tax-advantaged accounts)
      'small_cap_funds': 8,
      'emerging_markets': 9,
      'reits': 10,
      'high_yield_bonds': 11,
      'commodities': 12
    };
  }

  /**
   * Tax-Gain Harvesting Strategy
   * Realizes gains to offset future losses or utilize lower tax brackets
   */
  analyzeTaxGainHarvesting(portfolioData, options = {}) {
    const {
      targetGainAmount = 0,
      maxTaxRate = 0.20, // 20% long-term capital gains
      currentTaxBracket = 0.22,
      futureProjectedBracket = 0.32,
      minHoldingPeriod = 365 // Days for long-term treatment
    } = options;

    const gainHarvestingOpportunities = [];
    const today = new Date();

    portfolioData.positions.forEach(position => {
      const unrealizedGain = position.currentValue - position.costBasis;
      const holdingPeriod = this.calculateHoldingPeriod(position.acquiredDate, today);
      
      if (unrealizedGain > 0) {
        const isLongTerm = holdingPeriod >= minHoldingPeriod;
        const applicableTaxRate = isLongTerm ? maxTaxRate : currentTaxBracket;
        const taxImplication = unrealizedGain * applicableTaxRate;
        
        // Consider gain harvesting if:
        // 1. Current tax rate is lower than projected future rate
        // 2. We can utilize lower long-term capital gains rates
        // 3. We have tax loss carryforwards to offset
        const shouldHarvest = this.shouldHarvestGain(position, {
          currentTaxBracket,
          futureProjectedBracket,
          isLongTerm,
          unrealizedGain,
          taxImplication
        });

        if (shouldHarvest.recommended) {
          gainHarvestingOpportunities.push({
            symbol: position.symbol,
            quantity: position.quantity,
            unrealizedGain,
            taxImplication,
            holdingPeriod,
            isLongTerm,
            reason: shouldHarvest.reason,
            priority: shouldHarvest.priority,
            recommendedAction: shouldHarvest.action
          });
        }
      }
    });

    return {
      opportunities: gainHarvestingOpportunities.sort((a, b) => b.priority - a.priority),
      totalPotentialGains: gainHarvestingOpportunities.reduce((sum, opp) => sum + opp.unrealizedGain, 0),
      totalTaxImplications: gainHarvestingOpportunities.reduce((sum, opp) => sum + opp.taxImplication, 0),
      strategy: 'tax_gain_harvesting'
    };
  }

  /**
   * Multi-Account Tax Optimization
   * Coordinates tax strategies across multiple account types
   */
  optimizeMultiAccountStrategy(accounts, options = {}) {
    const {
      rebalanceThreshold = 0.05, // 5% deviation triggers rebalancing
      taxLossThreshold = 1000, // Minimum loss to harvest
      assetLocationOptimization = true
    } = options;

    const accountAnalysis = accounts.map(account => ({
      ...account,
      accountType: account.accountType || this.accountTypes.TAXABLE,
      taxAdvantaged: this.isTaxAdvantaged(account.accountType),
      analysis: this.analyzeAccountPositions(account)
    }));

    const multiAccountStrategy = {
      taxLossHarvesting: this.coordinateTaxLossHarvesting(accountAnalysis, taxLossThreshold),
      assetLocation: assetLocationOptimization ? this.optimizeAssetLocation(accountAnalysis) : null,
      rebalancing: this.coordinateRebalancing(accountAnalysis, rebalanceThreshold),
      cashManagement: this.optimizeCashPlacement(accountAnalysis)
    };

    return {
      accounts: accountAnalysis,
      strategy: multiAccountStrategy,
      recommendations: this.generateMultiAccountRecommendations(multiAccountStrategy),
      projectedTaxSavings: this.calculateProjectedTaxSavings(multiAccountStrategy)
    };
  }

  /**
   * Asset Location Optimization
   * Places tax-inefficient assets in tax-advantaged accounts
   */
  optimizeAssetLocation(accounts) {
    const taxableAccounts = accounts.filter(acc => !acc.taxAdvantaged);
    const taxAdvantagedAccounts = accounts.filter(acc => acc.taxAdvantaged);

    const recommendations = [];
    
    // Analyze current asset placement
    const assetPlacementAnalysis = this.analyzeCurrentAssetPlacement(accounts);
    
    // Generate optimization recommendations
    assetPlacementAnalysis.suboptimalPlacements.forEach(placement => {
      const betterAccount = this.findBetterAccountForAsset(placement.asset, accounts);
      
      if (betterAccount) {
        recommendations.push({
          action: 'relocate_asset',
          asset: placement.asset,
          fromAccount: placement.currentAccount,
          toAccount: betterAccount,
          reason: placement.reason,
          estimatedTaxSavings: placement.estimatedTaxSavings,
          priority: placement.priority
        });
      }
    });

    return {
      currentPlacement: assetPlacementAnalysis.currentPlacement,
      recommendations: recommendations.sort((a, b) => b.priority - a.priority),
      potentialTaxSavings: recommendations.reduce((sum, rec) => sum + rec.estimatedTaxSavings, 0)
    };
  }

  /**
   * Tax-Efficient Rebalancing
   * Rebalances portfolios while minimizing tax implications
   */
  generateTaxEfficientRebalancing(portfolioData, targetAllocation, options = {}) {
    const {
      allowTaxLossHarvesting = true,
      maxTaxImplication = 10000,
      preferNewMoney = true,
      washSaleAwareness = true
    } = options;

    const currentAllocation = this.calculateCurrentAllocation(portfolioData);
    const deviations = this.calculateAllocationDeviations(currentAllocation, targetAllocation);
    
    const rebalancingPlan = {
      cashFlows: [],
      trades: [],
      taxImplications: 0,
      washSaleRisks: []
    };

    // Prioritize rebalancing methods by tax efficiency
    const rebalancingMethods = [
      { method: 'new_contributions', taxImplication: 0, priority: 1 },
      { method: 'tax_loss_harvesting', taxImplication: -1, priority: 2 },
      { method: 'tax_neutral_trades', taxImplication: 0, priority: 3 },
      { method: 'minimal_gain_realization', taxImplication: 1, priority: 4 }
    ];

    // Apply rebalancing methods in order of tax efficiency
    for (const method of rebalancingMethods) {
      const methodResult = this.applyRebalancingMethod(
        portfolioData, 
        deviations, 
        method, 
        options
      );
      
      rebalancingPlan.trades.push(...methodResult.trades);
      rebalancingPlan.taxImplications += methodResult.taxImplications;
      
      // Update deviations after applying method
      deviations = this.updateDeviationsAfterTrades(deviations, methodResult.trades);
      
      // Stop if rebalancing is complete or tax limit reached
      if (this.isRebalancingComplete(deviations) || 
          rebalancingPlan.taxImplications > maxTaxImplication) {
        break;
      }
    }

    return {
      plan: rebalancingPlan,
      remainingDeviations: deviations,
      taxEfficiency: this.calculateTaxEfficiencyScore(rebalancingPlan),
      recommendations: this.generateRebalancingRecommendations(rebalancingPlan)
    };
  }

  /**
   * Helper Methods
   */
  shouldHarvestGain(position, context) {
    const { currentTaxBracket, futureProjectedBracket, isLongTerm, unrealizedGain } = context;
    
    // Don't harvest if future tax rate is lower
    if (futureProjectedBracket <= currentTaxBracket) {
      return { recommended: false, reason: 'Future tax rate not higher' };
    }
    
    // Prefer long-term gains for harvesting
    if (!isLongTerm && unrealizedGain < 10000) {
      return { recommended: false, reason: 'Short-term gain too small' };
    }
    
    // Calculate tax savings from harvesting now vs later
    const currentTax = unrealizedGain * (isLongTerm ? 0.20 : currentTaxBracket);
    const futureTax = unrealizedGain * futureProjectedBracket;
    const taxSavings = futureTax - currentTax;
    
    if (taxSavings > 500) { // Minimum savings threshold
      return {
        recommended: true,
        reason: `Tax savings of $${taxSavings.toFixed(2)}`,
        priority: taxSavings,
        action: 'harvest_and_reinvest'
      };
    }
    
    return { recommended: false, reason: 'Insufficient tax savings' };
  }

  calculateHoldingPeriod(acquiredDate, currentDate) {
    const acquired = new Date(acquiredDate);
    const diffTime = Math.abs(currentDate - acquired);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days
  }

  isTaxAdvantaged(accountType) {
    return [
      this.accountTypes.TRADITIONAL_IRA,
      this.accountTypes.ROTH_IRA,
      this.accountTypes.HSA,
      this.accountTypes.FOUR_OH_ONE_K
    ].includes(accountType);
  }

  analyzeAccountPositions(account) {
    return {
      totalValue: account.positions.reduce((sum, pos) => sum + pos.currentValue, 0),
      unrealizedGains: account.positions.reduce((sum, pos) => 
        sum + Math.max(0, pos.currentValue - pos.costBasis), 0),
      unrealizedLosses: account.positions.reduce((sum, pos) => 
        sum + Math.min(0, pos.currentValue - pos.costBasis), 0),
      taxEfficiencyScore: this.calculateAccountTaxEfficiency(account)
    };
  }

  coordinateTaxLossHarvesting(accounts, threshold) {
    const taxableAccounts = accounts.filter(acc => !acc.taxAdvantaged);
    const opportunities = [];
    
    taxableAccounts.forEach(account => {
      account.positions.forEach(position => {
        const unrealizedLoss = Math.min(0, position.currentValue - position.costBasis);
        if (Math.abs(unrealizedLoss) >= threshold) {
          opportunities.push({
            accountId: account.id,
            symbol: position.symbol,
            loss: Math.abs(unrealizedLoss),
            quantity: position.quantity,
            priority: Math.abs(unrealizedLoss)
          });
        }
      });
    });
    
    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  generateMultiAccountRecommendations(strategy) {
    const recommendations = [];
    
    // Tax loss harvesting recommendations
    strategy.taxLossHarvesting.slice(0, 5).forEach(opp => {
      recommendations.push({
        type: 'tax_loss_harvest',
        priority: 'high',
        description: `Harvest $${opp.loss.toFixed(2)} loss from ${opp.symbol}`,
        account: opp.accountId,
        action: `Sell ${opp.quantity} shares of ${opp.symbol}`
      });
    });
    
    // Asset location recommendations
    if (strategy.assetLocation) {
      strategy.assetLocation.recommendations.slice(0, 3).forEach(rec => {
        recommendations.push({
          type: 'asset_location',
          priority: 'medium',
          description: `Move ${rec.asset.symbol} to ${rec.toAccount.type} account`,
          estimatedSavings: rec.estimatedTaxSavings
        });
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  calculateProjectedTaxSavings(strategy) {
    let totalSavings = 0;
    
    // Tax loss harvesting savings (assume 22% tax rate)
    totalSavings += strategy.taxLossHarvesting.reduce((sum, opp) => sum + opp.loss * 0.22, 0);
    
    // Asset location savings
    if (strategy.assetLocation) {
      totalSavings += strategy.assetLocation.potentialTaxSavings;
    }
    
    return totalSavings;
  }

  calculateCurrentAllocation(portfolioData) {
    const totalValue = portfolioData.positions.reduce((sum, pos) => sum + pos.currentValue, 0);
    const allocation = {};
    
    portfolioData.positions.forEach(position => {
      const assetClass = position.assetClass || 'unknown';
      allocation[assetClass] = (allocation[assetClass] || 0) + (position.currentValue / totalValue);
    });
    
    return allocation;
  }

  calculateAllocationDeviations(current, target) {
    const deviations = {};
    
    Object.keys(target).forEach(assetClass => {
      const currentWeight = current[assetClass] || 0;
      const targetWeight = target[assetClass];
      deviations[assetClass] = currentWeight - targetWeight;
    });
    
    return deviations;
  }
}

module.exports = AdvancedTaxStrategies;
