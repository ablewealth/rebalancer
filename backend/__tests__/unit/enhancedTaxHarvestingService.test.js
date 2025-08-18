const { EnhancedTaxHarvestingService } = require('../../services/enhancedTaxHarvestingService');

describe('EnhancedTaxHarvestingService', () => {
  let service;
  
  beforeEach(() => {
    service = new EnhancedTaxHarvestingService();
  });

  describe('Service Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(service.version).toBe('2.0.0');
      expect(service.config).toBeDefined();
      expect(service.cache).toBeDefined();
    });

    test('should accept custom configuration', () => {
      const customConfig = {
        taxConfig: { shortTermRate: 0.35 },
        enableLogging: false
      };
      const customService = new EnhancedTaxHarvestingService(customConfig);
      expect(customService.config.defaultTaxConfig.shortTermRate).toBe(0.35);
      expect(customService.config.enableLogging).toBe(false);
    });
  });

  describe('Portfolio Data Validation', () => {
    test('should validate valid portfolio data', async () => {
      const portfolio = testUtils.generateMockPortfolio(5);
      const result = await service.validatePortfolioData(portfolio);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid portfolio data', async () => {
      const invalidPortfolio = [
        { symbol: '', quantity: -1, price: 0 } // Invalid data
      ];
      const result = await service.validatePortfolioData(invalidPortfolio);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Tax Calculation Performance', () => {
    test('should handle small portfolios efficiently', async () => {
      const portfolio = testUtils.generateMockPortfolio(10);
      const targets = testUtils.testScenarios.basicLossHarvesting.targets;
      
      const result = await testUtils.measurePerformance(async () => {
        return await service.calculateTaxHarvesting(portfolio, targets);
      }, 'Small portfolio calculation');
      
      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should handle medium portfolios within performance threshold', async () => {
      const portfolio = testUtils.generateMockPortfolio(100);
      const targets = testUtils.testScenarios.gainRealization.targets;
      
      const start = performance.now();
      const result = await service.calculateTaxHarvesting(portfolio, targets);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toBeDefined();
    });
  });

  describe('Wash Sale Detection', () => {
    test('should filter out wash sale candidates correctly', async () => {
      const portfolio = [
        {
          symbol: 'AAPL',
          quantity: 100,
          price: 150,
          costBasis: 200,
          unrealizedGain: -50,
          term: 'Short',
          washSaleFlag: true,
          includedInSelling: true,
          accountType: 'taxable'
        }
      ];
      
      const filtered = await service.filterWashSaleCandidates(portfolio, {
        beforeDays: 30,
        afterDays: 30,
        strictMode: true
      });
      
      expect(filtered).toHaveLength(0); // Should be filtered out due to wash sale flag
    });
  });

  describe('Corporate Actions Processing', () => {
    test('should handle stock splits correctly', async () => {
      const portfolio = [{
        symbol: 'AAPL',
        quantity: 100,
        price: 150,
        costBasis: 10000,
        unrealizedGain: 5000,
        term: 'Long',
        includedInSelling: true,
        accountType: 'taxable'
      }];
      
      const corporateActions = [{
        symbol: 'AAPL',
        type: 'split',
        ratio: 2,
        date: new Date().toISOString()
      }];
      
      const processed = await service.preprocessCorporateActions(portfolio, corporateActions);
      
      expect(processed[0].quantity).toBe(200); // Doubled due to 2:1 split
      expect(processed[0].price).toBe(75); // Halved due to split
    });
  });

  describe('Cache Management', () => {
    test('should cache calculation results', async () => {
      const portfolio = testUtils.generateMockPortfolio(5);
      const targets = testUtils.testScenarios.basicLossHarvesting.targets;
      
      // First calculation
      const result1 = await service.calculateTaxHarvesting(portfolio, targets);
      expect(service.cache.size).toBeGreaterThan(0);
      
      // Second calculation should use cache
      const result2 = await service.calculateTaxHarvesting(portfolio, targets);
      expect(result1).toEqual(result2);
    });

    test('should clean cache periodically', () => {
      service.cache.set('test', 'value');
      service.lastCacheClean = Date.now() - 400000; // 6+ minutes ago
      
      service.cleanCache();
      expect(service.cache.size).toBe(0);
    });
  });
});
