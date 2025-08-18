// Jest setup file for global test configuration
const { performance } = require('perf_hooks');

// Global test utilities
global.testUtils = {
  // Performance measurement utilities
  measurePerformance: (fn, label = 'operation') => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${label} took ${(end - start).toFixed(2)} milliseconds`);
    return result;
  },

  // Mock portfolio data generator
  generateMockPortfolio: (size = 10) => {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'ADBE', 'CRM'];
    return Array.from({ length: size }, (_, i) => {
      const quantity = Math.floor(Math.random() * 1000) + 1;
      const price = Math.random() * 500 + 10;
      const costBasisPerShare = Math.random() * 400 + 5;
      const costBasis = quantity * costBasisPerShare;
      const currentValue = quantity * price;
      
      return {
        symbol: symbols[i % symbols.length] + (i >= symbols.length ? `_${Math.floor(i / symbols.length)}` : ''),
        name: `Test Company ${i + 1}`,
        quantity,
        price,
        costBasis,
        unrealizedGain: currentValue - costBasis,
        term: Math.random() > 0.5 ? 'Long' : 'Short',
        acquiredDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        includedInSelling: true,
        accountType: 'taxable'
      };
    });
  },

  // Tax calculation test scenarios
  testScenarios: {
    basicLossHarvesting: {
      targets: { shortTerm: -3000, longTerm: 0 },
      description: 'Basic $3000 loss harvesting'
    },
    gainRealization: {
      targets: { shortTerm: 5000, longTerm: 10000 },
      description: 'Gain realization for rebalancing'
    },
    mixedStrategy: {
      targets: { shortTerm: -1000, longTerm: 2000 },
      description: 'Mixed loss/gain strategy'
    }
  }
};

// Setup test database if needed
beforeAll(async () => {
  // Initialize test environment
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Cleanup test environment
});
