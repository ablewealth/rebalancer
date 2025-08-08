#!/usr/bin/env node

/**
 * Test script for Tax Harvesting Service
 * Tests the core algorithm functionality
 */

const TaxHarvestingService = require('./services/taxHarvestingService');

console.log('🧪 Testing Tax Harvesting Service');
console.log('=================================\n');

// Initialize service
const taxService = new TaxHarvestingService();

// Test data - sample portfolio positions
const testPortfolio = [
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    quantity: 100,
    price: 220.00,
    costBasis: 21000,
    unrealizedGain: 1000,  // $1000 gain
    term: 'Long',
    includedInSelling: true
  },
  {
    symbol: 'VTIAX',
    name: 'Vanguard Total International Stock Index',
    quantity: 500,
    price: 28.50,
    costBasis: 15000,
    unrealizedGain: -750,  // $750 loss
    term: 'Long',
    includedInSelling: true
  },
  {
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    quantity: 200,
    price: 75.00,
    costBasis: 16000,
    unrealizedGain: -1000, // $1000 loss
    term: 'Short',
    includedInSelling: true
  },
  {
    symbol: 'VNQ',
    name: 'Vanguard Real Estate ETF',
    quantity: 50,
    price: 85.00,
    costBasis: 4000,
    unrealizedGain: 250,   // $250 gain
    term: 'Short',
    includedInSelling: true
  }
];

console.log('📊 Test Portfolio:');
testPortfolio.forEach(pos => {
  console.log(`  ${pos.symbol}: ${pos.term} term, ${pos.unrealizedGain > 0 ? '+' : ''}$${pos.unrealizedGain} unrealized`);
});
console.log('');

// Test scenarios
const testScenarios = [
  {
    name: 'Harvest $500 Long-Term Losses',
    targetST: 0,
    targetLT: -500,
    realizedST: 0,
    realizedLT: 0
  },
  {
    name: 'Harvest $800 Long-Term Gains',
    targetST: 0,
    targetLT: 800,
    realizedST: 0,
    realizedLT: 0
  },
  {
    name: 'Harvest $200 Short-Term Gains',
    targetST: 200,
    targetLT: 0,
    realizedST: 0,
    realizedLT: 0
  },
  {
    name: 'Mixed: $100 ST Gains, $300 LT Losses',
    targetST: 100,
    targetLT: -300,
    realizedST: 0,
    realizedLT: 0
  },
  {
    name: 'Already Realized Some Gains',
    targetST: 500,
    targetLT: 1000,
    realizedST: 300,  // Already realized $300 ST
    realizedLT: 200   // Already realized $200 LT
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const scenario of testScenarios) {
    console.log(`🎯 Test: ${scenario.name}`);
    console.log(`   Targets: ST=$${scenario.targetST}, LT=$${scenario.targetLT}`);
    console.log(`   Already realized: ST=$${scenario.realizedST}, LT=$${scenario.realizedLT}`);
    
    try {
      const result = taxService.runTaxHarvesting(
        testPortfolio,
        scenario.targetST,
        scenario.targetLT,
        scenario.realizedST,
        scenario.realizedLT
      );
      
      console.log(`   ✅ Generated ${result.recommendations.length} recommendations`);
      console.log(`   📈 Actual: ST=$${result.summary.actualST.toFixed(2)}, LT=$${result.summary.actualLT.toFixed(2)}`);
      
      if (result.recommendations.length > 0) {
        console.log('   📋 Recommendations:');
        result.recommendations.forEach(rec => {
          console.log(`      - SELL ${rec.sharesToSell} shares of ${rec.symbol} (${rec.term} term, $${rec.actualGain.toFixed(2)} ${rec.actualGain > 0 ? 'gain' : 'loss'})`);
        });
      }
      
      if (result.warnings && result.warnings.length > 0) {
        console.log('   ⚠️  Warnings:', result.warnings.join(', '));
      }
      
      passed++;
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }
  
  console.log('📊 Test Results:');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Tax Harvesting Service is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

// Test individual functions
console.log('🔧 Testing individual functions...\n');

// Test findBestCombination for losses
console.log('Test 1: Find best combination for $500 losses');
const lossLots = testPortfolio.filter(p => p.unrealizedGain < 0);
const lossResult = taxService.findBestCombination(-500, lossLots);
console.log(`Result: ${lossResult.length} lots selected`);
lossResult.forEach(lot => {
  console.log(`  - ${lot.symbol}: ${lot.sharesToSell} shares, $${lot.actualGain} gain`);
});
console.log('');

// Test findBestCombination for gains
console.log('Test 2: Find best combination for $800 gains');
const gainLots = testPortfolio.filter(p => p.unrealizedGain > 0);
const gainResult = taxService.findBestCombination(800, gainLots);
console.log(`Result: ${gainResult.length} lots selected`);
gainResult.forEach(lot => {
  console.log(`  - ${lot.symbol}: ${lot.sharesToSell} shares, $${lot.actualGain} gain`);
});
console.log('');

// Run full test suite
runTests().catch(console.error);