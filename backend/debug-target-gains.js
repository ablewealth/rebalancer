const { 
  EnhancedTaxHarvestingService,
  InvalidPortfolioDataError,
  NoLotsFoundError 
} = require('./services/enhancedTaxHarvestingService');

async function debugTargetGainsIssue() {
  console.log('Debugging Target LT Gains Issue ($55,000)...\n');
  
  const service = new EnhancedTaxHarvestingService({
    enableLogging: true
  });
  
  // Create realistic test portfolio with significant gains
  const portfolioData = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      quantity: 1000,
      price: 175.00,
      costBasis: 100000.00, // $100 per share cost basis
      unrealizedGain: 75000.00, // $75 per share gain * 1000 = $75k gain
      term: 'Long-Term',
      acquiredDate: new Date('2022-01-15'),
      accountType: 'taxable',
      includedInSelling: true
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      quantity: 500,
      price: 350.00,
      costBasis: 125000.00, // $250 per share cost basis
      unrealizedGain: 50000.00, // $100 per share gain * 500 = $50k gain
      term: 'Long-Term',
      acquiredDate: new Date('2022-03-20'),
      accountType: 'taxable',
      includedInSelling: true
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      quantity: 200,
      price: 140.00,
      costBasis: 40000.00, // $200 per share cost basis
      unrealizedGain: -12000.00, // -$60 per share loss * 200 = -$12k loss
      term: 'Long-Term',
      acquiredDate: new Date('2022-06-15'),
      accountType: 'taxable',
      includedInSelling: true
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      quantity: 300,
      price: 220.00,
      costBasis: 90000.00, // $300 per share cost basis
      unrealizedGain: -24000.00, // -$80 per share loss * 300 = -$24k loss
      term: 'Long-Term',
      acquiredDate: new Date('2022-08-10'),
      accountType: 'taxable',
      includedInSelling: true
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      quantity: 100,
      price: 450.00,
      costBasis: 30000.00, // $300 per share cost basis
      unrealizedGain: 15000.00, // $150 per share gain * 100 = $15k gain
      term: 'Long-Term',
      acquiredDate: new Date('2022-04-12'),
      accountType: 'taxable',
      includedInSelling: true
    }
  ];
  
  // Calculate portfolio summary
  const totalValue = portfolioData.reduce((sum, pos) => sum + (pos.quantity * pos.price), 0);
  const totalCostBasis = portfolioData.reduce((sum, pos) => sum + pos.costBasis, 0);
  const totalUnrealizedGain = portfolioData.reduce((sum, pos) => sum + pos.unrealizedGain, 0);
  const gainPositions = portfolioData.filter(pos => pos.unrealizedGain > 0);
  const lossPositions = portfolioData.filter(pos => pos.unrealizedGain < 0);
  
  console.log('=== PORTFOLIO ANALYSIS ===');
  console.log(`Total Portfolio Value: $${totalValue.toLocaleString()}`);
  console.log(`Total Cost Basis: $${totalCostBasis.toLocaleString()}`);
  console.log(`Total Unrealized Gain: $${totalUnrealizedGain.toLocaleString()}`);
  console.log(`Positions with Gains: ${gainPositions.length}`);
  console.log(`Positions with Losses: ${lossPositions.length}`);
  console.log();
  
  gainPositions.forEach(pos => {
    console.log(`  ${pos.symbol}: +$${pos.unrealizedGain.toLocaleString()} gain`);
  });
  console.log();
  
  lossPositions.forEach(pos => {
    console.log(`  ${pos.symbol}: $${pos.unrealizedGain.toLocaleString()} loss`);
  });
  console.log();
  
  // Test different target scenarios
  const testScenarios = [
    { name: 'Moderate LT Gains', targetST: 0, targetLT: 10000, realizedST: 0, realizedLT: 0 },
    { name: 'High LT Gains', targetST: 0, targetLT: 25000, realizedST: 0, realizedLT: 0 },
    { name: 'Very High LT Gains', targetST: 0, targetLT: 55000, realizedST: 0, realizedLT: 0 },
    { name: 'Maximum LT Gains', targetST: 0, targetLT: 100000, realizedST: 0, realizedLT: 0 },
    { name: 'Loss Harvesting', targetST: 0, targetLT: -20000, realizedST: 0, realizedLT: 0 },
    { name: 'Mixed Strategy', targetST: 0, targetLT: 30000, realizedST: 0, realizedLT: -10000 }
  ];
  
  for (const scenario of testScenarios) {
    console.log(`=== TESTING: ${scenario.name} ===`);
    console.log(`Target: ST=${scenario.targetST}, LT=${scenario.targetLT}`);
    console.log(`Already Realized: ST=${scenario.realizedST}, LT=${scenario.realizedLT}`);
    
    try {
      const result = await service.runTaxHarvesting(
        portfolioData,
        scenario.targetST,
        scenario.targetLT,
        scenario.realizedST,
        scenario.realizedLT,
        false,
        {
          taxConfig: {
            shortTermRate: 0.32,
            longTermRate: 0.20,
            stateRate: 0.09
          },
          washSaleConfig: {
            strictMode: true
          },
          optimizationLevel: 'balanced',
          validateInputs: true
        }
      );
      
      if (result.recommendations && result.recommendations.length > 0) {
        console.log(`✅ Generated ${result.recommendations.length} recommendations`);
        
        let totalST = 0;
        let totalLT = 0;
        
        result.recommendations.forEach((rec, index) => {
          const gain = rec.actualGain || rec.unrealizedGain || 0;
          if (rec.term === 'Short-Term' || rec.term === 'Short') {
            totalST += gain;
          } else {
            totalLT += gain;
          }
          console.log(`  ${index + 1}. ${rec.symbol}: ${rec.term} $${gain.toLocaleString()} (${rec.quantity} shares)`);
        });
        
        console.log(`Total Generated: ST=$${totalST.toLocaleString()}, LT=$${totalLT.toLocaleString()}`);
        
        // Check if target was met
        const stTarget = scenario.targetST - scenario.realizedST;
        const ltTarget = scenario.targetLT - scenario.realizedLT;
        const stMet = Math.abs(totalST - stTarget) < 1000; // Within $1k
        const ltMet = Math.abs(totalLT - ltTarget) < 1000; // Within $1k
        
        if (stMet && ltMet) {
          console.log(`✅ Target achieved within tolerance`);
        } else {
          console.log(`⚠️  Target not fully met - ST needed: $${stTarget.toLocaleString()}, LT needed: $${ltTarget.toLocaleString()}`);
        }
        
      } else {
        console.log(`❌ No recommendations generated`);
        console.log(`Available gains: $${gainPositions.reduce((sum, pos) => sum + pos.unrealizedGain, 0).toLocaleString()}`);
        console.log(`Available losses: $${lossPositions.reduce((sum, pos) => sum + pos.unrealizedGain, 0).toLocaleString()}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      if (error instanceof NoLotsFoundError) {
        console.log(`   Details: ${JSON.stringify(error.details, null, 2)}`);
      }
    }
    
    console.log('');
  }
  
  // Test the original service for comparison
  console.log('=== TESTING ORIGINAL SERVICE (for comparison) ===');
  try {
    const originalService = require('./services/taxHarvestingService');
    const original = new originalService();
    
    const originalResult = original.runTaxHarvesting(
      portfolioData,
      0,     // targetST
      55000, // targetLT
      0,     // realizedST
      0,     // realizedLT
      false, // cashMaximizationMode
      { useCashRaising: false }
    );
    
    console.log(`Original service recommendations: ${originalResult.recommendations.length}`);
    if (originalResult.recommendations.length > 0) {
      originalResult.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.symbol}: ${rec.term} $${(rec.unrealizedGain || rec.actualGain || 0).toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.log(`Original service error: ${error.message}`);
  }
}

// Run debug if this file is executed directly
if (require.main === module) {
  debugTargetGainsIssue()
    .then(() => {
      console.log('\n✅ Debug analysis completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Debug analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { debugTargetGainsIssue };
