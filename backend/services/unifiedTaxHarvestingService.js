/**
 * Unified Tax Harvesting Service
 * 
 * Consolidates the enhanced backend service with the shared core library
 * to eliminate duplication and provide a single source of truth
 * 
 * @version 3.0.0
 */

const { TaxHarvestingCore } = require('../../shared/taxHarvestingCore');
const { WashSaleDetection } = require('../../shared/washSaleDetection');
const { PerformanceMonitor } = require('../../shared/performanceMonitor');
const { z } = require('zod');

// Import existing schemas from enhanced service
const LotSchema = z.object({
  symbol: z.string().min(1).max(20),
  name: z.string().optional(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  costBasis: z.number().nonnegative(),
  unrealizedGain: z.number(),
  term: z.enum(['Short', 'Long', 'Short-Term', 'Long-Term']),
  acquired: z.string().optional(),
  acquiredDate: z.date().optional(),
  includedInSelling: z.boolean().default(true),
  accountType: z.enum(['taxable', 'traditional-ira', 'roth-ira', '401k', 'hsa']).default('taxable'),
  washSaleFlag: z.boolean().default(false)
});

const PortfolioSchema = z.array(LotSchema);

class UnifiedTaxHarvestingService {
  constructor(config = {}) {
    this.version = '3.0.0';
    this.config = {
      enableLogging: config.enableLogging !== false,
      enablePerformanceMonitoring: config.enablePerformanceMonitoring !== false,
      enableWashSaleDetection: config.enableWashSaleDetection !== false,
      cacheResults: config.cacheResults !== false,
      ...config
    };
    
    // Initialize core components
    this.core = new TaxHarvestingCore(config.coreConfig || {});
    this.washSaleDetector = new WashSaleDetection(config.washSaleConfig || {});
    this.performanceMonitor = config.enablePerformanceMonitoring 
      ? new PerformanceMonitor(config.performanceConfig || {})
      : null;
    
    // Cache for performance optimization
    this.cache = new Map();
    this.lastCacheClean = Date.now();
    
    if (this.config.enableLogging) {
      console.log(`Unified Tax Harvesting Service v${this.version} initialized`);
    }
  }

  /**
   * Main calculation method that combines all functionality
   */
  async calculateTaxHarvesting(portfolio, targets, options = {}) {
    const calculationId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Start performance monitoring
    const measurement = this.performanceMonitor?.startMeasurement(calculationId, {
      portfolioSize: portfolio.length,
      hasTargets: !!targets,
      mode: options.mode || 'tax-target'
    });

    try {
      // Validate inputs
      const validationResult = await this.validatePortfolioData(portfolio);
      if (!validationResult.isValid) {
        throw new Error(`Invalid portfolio data: ${validationResult.errors.join(', ')}`);
      }

      // Check cache if enabled
      const cacheKey = this.generateCacheKey(portfolio, targets, options);
      if (this.config.cacheResults && this.cache.has(cacheKey)) {
        if (this.config.enableLogging) {
          console.log('Returning cached result for', calculationId);
        }
        return this.cache.get(cacheKey);
      }

      // Perform core calculation
      let result;
      if (options.mode === 'cash-raising') {
        result = this.core.calculateCashRaising(portfolio, options.cashNeeded || 0, options);
      } else {
        result = this.core.calculateTaxHarvesting(portfolio, targets, options);
      }

      // Apply wash sale detection if enabled
      if (this.config.enableWashSaleDetection && result.success) {
        const washSaleResults = this.washSaleDetector.checkWashSaleViolations(
          result.recommendations,
          options.recentPurchases || []
        );
        
        if (washSaleResults.length > 0) {
          result.washSaleViolations = washSaleResults;
          result.alternatives = washSaleResults.map(violation => ({
            violatedSymbol: violation.soldSymbol,
            alternatives: this.washSaleDetector.findAlternatives(violation.soldSymbol)
          }));
        }
      }

      // Cache result if enabled
      if (this.config.cacheResults) {
        this.cache.set(cacheKey, result);
        this.cleanCacheIfNeeded();
      }

      // End performance monitoring
      if (this.performanceMonitor) {
        const metrics = this.performanceMonitor.endMeasurement(measurement, result);
        result.performanceMetrics = {
          calculationTime: metrics.duration,
          memoryUsage: metrics.memoryDelta,
          calculationId
        };
      }

      return result;

    } catch (error) {
      if (this.performanceMonitor) {
        this.performanceMonitor.endMeasurement(measurement, { success: false, error: error.message });
      }
      
      return {
        success: false,
        error: error.message,
        calculationId,
        recommendations: []
      };
    }
  }

  /**
   * Validate portfolio data using Zod schema
   */
  async validatePortfolioData(portfolio) {
    try {
      PortfolioSchema.parse(portfolio);
      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
  }

  /**
   * Generate cache key for results
   */
  generateCacheKey(portfolio, targets, options) {
    const portfolioHash = this.hashObject(portfolio);
    const targetsHash = this.hashObject(targets);
    const optionsHash = this.hashObject(options);
    return `${portfolioHash}-${targetsHash}-${optionsHash}`;
  }

  /**
   * Simple hash function for objects
   */
  hashObject(obj) {
    return JSON.stringify(obj).split('').reduce((hash, char) => {
      hash = ((hash << 5) - hash) + char.charCodeAt(0);
      return hash & hash; // Convert to 32-bit integer
    }, 0).toString(36);
  }

  /**
   * Clean cache periodically
   */
  cleanCacheIfNeeded() {
    const now = Date.now();
    if (now - this.lastCacheClean > 300000) { // 5 minutes
      this.cache.clear();
      this.lastCacheClean = now;
      if (this.config.enableLogging) {
        console.log('Cache cleaned');
      }
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    return this.performanceMonitor?.getPerformanceReport() || {
      error: 'Performance monitoring not enabled'
    };
  }

  /**
   * Validate wash sale compliance for a trading plan
   */
  validateWashSaleCompliance(tradingPlan, purchaseHistory = []) {
    if (!this.config.enableWashSaleDetection) {
      return { error: 'Wash sale detection not enabled' };
    }
    
    return this.washSaleDetector.validateTradingPlan(tradingPlan, purchaseHistory);
  }

  /**
   * Find alternative ETFs to avoid wash sales
   */
  findWashSaleAlternatives(symbol, excludeSymbols = []) {
    return this.washSaleDetector.findAlternatives(symbol, excludeSymbols);
  }

  /**
   * Export service metrics and configuration
   */
  exportDiagnostics() {
    return {
      version: this.version,
      config: this.config,
      cacheSize: this.cache.size,
      performanceReport: this.getPerformanceReport(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset service state (useful for testing)
   */
  reset() {
    this.cache.clear();
    this.performanceMonitor?.reset();
    this.lastCacheClean = Date.now();
  }
}

module.exports = { UnifiedTaxHarvestingService };
