const { 
  EnhancedTaxHarvestingService,
  InvalidPortfolioDataError,
  NoLotsFoundError,
  WashSaleViolationError 
} = require('./services/enhancedTaxHarvestingService');

async function testEnhancedService() {
  console.log('Testing Enhanced Tax Harvesting Service...\n');
  
  // Initialize service
  const service = new EnhancedTaxHarvestingService({
    enableLogging: true
  });
  
  // Test 1: Valid portfolio data
  console.log('Test 1: Valid portfolio calculation');
  try {
    const portfolioData = [
      {
        symbol: 'AAPL',
        quantity: 100,
        price: 140.00,
        costBasis: 15000.00, // 100 * 150.00
        unrealizedGain: -1000.00, // (140 - 150) * 100
        term: 'Long-Term',
        acquiredDate: new Date('2023-01-15'),
        accountType: 'taxable',
        includedInSelling: true
      },
      {
        symbol: 'MSFT',
        quantity: 50,
        price: 280.00,
        costBasis: 15000.00, // 50 * 300.00
        unrealizedGain: -1000.00, // (280 - 300) * 50
        term: 'Long-Term',
        acquiredDate: new Date('2023-03-20'),
        accountType: 'taxable',
        includedInSelling: true
      }
    ];
    
    const result = await service.runTaxHarvesting(
      portfolioData,
      0,    // targetST
      -1000, // targetLT
      0,    // realizedST
      0,    // realizedLT
      false, // cashMaximizationMode
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
    
    console.log('✅ Valid calculation successful');
    console.log(`Generated ${result.recommendations.length} recommendations`);
    console.log(`Total tax savings: $${result.summary?.totalTaxSavings || 0}\n`);
    
  } catch (error) {
    console.log('❌ Valid calculation failed:', error.message);
  }
  
  // Test 2: Invalid portfolio data
  console.log('Test 2: Invalid portfolio data validation');
  try {
    const invalidPortfolio = [
      {
        symbol: '',  // Invalid symbol
        quantity: -10, // Invalid quantity
        price: 100,
        costBasis: 'invalid', // Invalid cost
        unrealizedGain: 0,
        term: 'InvalidTerm' // Invalid term
      }
    ];
    
    const result = await service.runTaxHarvesting(
      invalidPortfolio,
      0, 0, 0, 0, false,
      { validateInputs: true }
    );
    
    console.log('❌ Should have failed validation');
    
  } catch (error) {
    if (error instanceof InvalidPortfolioDataError) {
      console.log('✅ Validation correctly caught invalid data');
      console.log(`Error details: ${JSON.stringify(error.details, null, 2)}\n`);
    } else {
      console.log('❌ Wrong error type:', error.message);
    }
  }
  
  // Test 3: No lots scenario
  console.log('Test 3: No lots available for harvesting');
  try {
    const profitablePortfolio = [
      {
        symbol: 'WINNING_STOCK',
        quantity: 100,
        price: 100.00,
        costBasis: 5000.00, // 100 * 50.00
        unrealizedGain: 5000.00, // All gains, no losses
        term: 'Long-Term',
        acquiredDate: new Date('2023-01-15'),
        accountType: 'taxable',
        includedInSelling: true
      }
    ];
    
    const result = await service.runTaxHarvesting(
      profitablePortfolio,
      0,    // targetST
      -1000, // targetLT (looking for losses)
      0,    // realizedST
      0,    // realizedLT
      false,
      { validateInputs: true }
    );
    
    if (result.recommendations.length === 0) {
      console.log('✅ Correctly found no harvesting opportunities');
    } else {
      console.log('❌ Should not have found recommendations for profitable portfolio');
    }
    
  } catch (error) {
    if (error instanceof NoLotsFoundError) {
      console.log('✅ Correctly identified no lots available');
      console.log(`Error details: ${JSON.stringify(error.details, null, 2)}\n`);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  // Test 4: Performance mode with large portfolio
  console.log('Test 4: Performance mode with large portfolio');
  try {
    const largePortfolio = [];
    for (let i = 0; i < 1500; i++) {
      const price = Math.random() * 200 + 50;
      const costBasisPerShare = Math.random() * 200 + 50;
      const quantity = Math.floor(Math.random() * 100) + 1;
      const costBasis = costBasisPerShare * quantity;
      const unrealizedGain = (price - costBasisPerShare) * quantity;
      
      largePortfolio.push({
        symbol: `STOCK_${i}`,
        quantity: quantity,
        price: price,
        costBasis: costBasis,
        unrealizedGain: unrealizedGain,
        term: Math.random() > 0.5 ? 'Long-Term' : 'Short-Term',
        acquiredDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        accountType: 'taxable',
        includedInSelling: true
      });
    }
    
    const startTime = Date.now();
    
    const result = await service.runTaxHarvesting(
      largePortfolio,
      0, -5000, 0, 0, false,
      {
        performanceMode: true,
        optimizationLevel: 'fast',
        maxLots: 50,
        validateInputs: true
      }
    );
    
    const duration = Date.now() - startTime;
    
    console.log('✅ Large portfolio calculation completed');
    console.log(`Processing time: ${duration}ms for ${largePortfolio.length} positions`);
    console.log(`Generated ${result.recommendations.length} recommendations\n`);
    
  } catch (error) {
    console.log('❌ Large portfolio calculation failed:', error.message);
  }
  
  // Test 5: Corporate actions preprocessing
  console.log('Test 5: Corporate actions handling');
  try {
    const portfolioWithSplits = [
      {
        symbol: 'SPLIT_STOCK',
        quantity: 400, // Post-split quantity
        price: 20.00,
        costBasis: 10000.00, // 400 * 25.00
        unrealizedGain: -2000.00, // (20 - 25) * 400
        term: 'Long-Term',
        acquiredDate: new Date('2023-01-15'),
        accountType: 'taxable',
        includedInSelling: true
      }
    ];
    
    const corporateActions = [
      {
        symbol: 'SPLIT_STOCK',
        type: 'split',
        date: new Date('2023-06-01'),
        ratio: 4 // 4:1 split
      }
    ];
    
    const result = await service.runTaxHarvesting(
      portfolioWithSplits,
      0, -500, 0, 0, false,
      {
        corporateActions,
        validateInputs: true
      }
    );
    
    console.log('✅ Corporate actions handling successful');
    console.log(`Generated ${result.recommendations.length} recommendations\n`);
    
  } catch (error) {
    console.log('❌ Corporate actions handling failed:', error.message);
  }
  
  console.log('Enhanced Tax Harvesting Service testing completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testEnhancedService()
    .then(() => {
      console.log('\n✅ All tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testEnhancedService };
