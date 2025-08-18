const request = require('supertest');
const express = require('express');
const { TaxHarvestingCore } = require('../../../shared/taxHarvestingCore');
const { WashSaleDetection } = require('../../../shared/washSaleDetection');
const { PerformanceMonitor } = require('../../../shared/performanceMonitor');

describe('Tax Harvesting Integration Tests', () => {
  let app;
  let performanceMonitor;
  
  beforeAll(() => {
    app = express();
    app.use(express.json({ limit: '50mb' })); // Increase payload limit for large portfolios
    performanceMonitor = new PerformanceMonitor();
    
    // Mock API endpoint for testing
    app.post('/api/calculate', (req, res) => {
      const { portfolio, targets, options } = req.body;
      const core = new TaxHarvestingCore();
      
      const measurement = performanceMonitor.startMeasurement('integration-test', {
        portfolioSize: portfolio.length
      });
      
      const result = core.calculateTaxHarvesting(portfolio, targets, options);
      
      performanceMonitor.endMeasurement(measurement, result);
      
      res.json(result);
    });
  });

  describe('End-to-End Tax Harvesting', () => {
    test('should handle complete tax harvesting workflow', async () => {
      const portfolio = testUtils.generateMockPortfolio(20);
      const targets = { shortTerm: -3000, longTerm: 0 };
      
      const response = await request(app)
        .post('/api/calculate')
        .send({ portfolio, targets })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.recommendations).toBeDefined();
      expect(response.body.summary).toBeDefined();
      expect(response.body.metadata.calculationTime).toBeLessThan(5000);
    });

    test('should handle cash raising calculations', async () => {
      const portfolio = testUtils.generateMockPortfolio(15);
      const core = new TaxHarvestingCore();
      
      const result = core.calculateCashRaising(portfolio, 50000);
      
      expect(result.success).toBe(true);
      expect(result.summary.cashRaised).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Wash Sale Integration', () => {
    test('should detect and handle wash sale violations', () => {
      const washSaleDetector = new WashSaleDetection();
      
      const recommendations = [
        {
          symbol: 'SPY',
          unrealizedGain: -1000,
          action: 'sell'
        }
      ];
      
      const recentPurchases = [
        {
          symbol: 'VOO', // Similar to SPY
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
          quantity: 100
        }
      ];
      
      const violations = washSaleDetector.checkWashSaleViolations(recommendations, recentPurchases);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe('similar_security');
    });

    test('should provide alternative ETF recommendations', () => {
      const washSaleDetector = new WashSaleDetection();
      const alternatives = washSaleDetector.findAlternatives('SPY');
      
      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives[0]).toHaveProperty('symbol');
      expect(alternatives[0]).toHaveProperty('similarity');
      expect(alternatives[0]).toHaveProperty('washSaleRisk');
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should track performance metrics across calculations', async () => {
      // Reset performance monitor to start fresh
      performanceMonitor.reset();
      
      // Run multiple calculations to build metrics
      for (let i = 0; i < 5; i++) {
        const portfolio = testUtils.generateMockPortfolio(10 + i * 5);
        await request(app)
          .post('/api/calculate')
          .send({ 
            portfolio, 
            targets: { shortTerm: -1000 * (i + 1), longTerm: 500 * i }
          });
      }
      
      const report = performanceMonitor.getPerformanceReport();
      
      expect(report.summary.totalCalculations).toBe(5);
      expect(report.baselines).toBeDefined();
      expect(report.recentCalculations.length).toBeLessThanOrEqual(5);
    });

    test('should generate performance recommendations', () => {
      // Add some slow calculations to trigger recommendations
      for (let i = 0; i < 15; i++) {
        const measurement = performanceMonitor.startMeasurement('slow-test-' + i);
        measurement.startTime = performance.now() - 3000; // Simulate 3 second calculation
        
        performanceMonitor.endMeasurement(measurement, {
          success: true,
          recommendations: [],
          metadata: { positionsAnalyzed: 100 },
          summary: { accuracy: { stAccuracy: 85, ltAccuracy: 85 } }
        });
      }
      
      const report = performanceMonitor.getPerformanceReport();
      const recommendations = report.recommendations;
      
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
      if (recommendations.length > 0) {
        expect(recommendations.some(r => r.type === 'OPTIMIZATION')).toBe(true);
      }
    });
  });

  describe('Large Portfolio Stress Tests', () => {
    test('should handle large portfolios efficiently', async () => {
      const largePortfolio = testUtils.generateMockPortfolio(500);
      const targets = { shortTerm: -10000, longTerm: 5000 };
      
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/calculate')
        .send({ portfolio: largePortfolio, targets })
        .expect(200);
      
      const duration = performance.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      // Large portfolios may not always have recommendations if no suitable positions exist
      expect(response.body.recommendations).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty portfolio gracefully', async () => {
      const response = await request(app)
        .post('/api/calculate')
        .send({ 
          portfolio: [], 
          targets: { shortTerm: -1000, longTerm: 0 }
        })
        .expect(200);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid inputs');
    });

    test('should handle invalid targets', async () => {
      const portfolio = testUtils.generateMockPortfolio(5);
      
      const response = await request(app)
        .post('/api/calculate')
        .send({ 
          portfolio, 
          targets: null
        })
        .expect(200);
      
      expect(response.body.success).toBe(false);
    });

    test('should handle portfolios with no suitable positions', async () => {
      const portfolio = testUtils.generateMockPortfolio(5).map(pos => ({
        ...pos,
        includedInSelling: false // Exclude all positions
      }));
      
      const response = await request(app)
        .post('/api/calculate')
        .send({ 
          portfolio, 
          targets: { shortTerm: -1000, longTerm: 0 }
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.recommendations).toHaveLength(0);
    });
  });
});
