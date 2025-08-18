/**
 * Unified API Routes
 * 
 * Provides consolidated API endpoints using the unified tax harvesting service
 */

const express = require('express');
const { UnifiedTaxHarvestingService } = require('../services/unifiedTaxHarvestingService');

const router = express.Router();

// Initialize unified service
const taxService = new UnifiedTaxHarvestingService({
  enableLogging: process.env.NODE_ENV !== 'production',
  enablePerformanceMonitoring: true,
  enableWashSaleDetection: true,
  cacheResults: true
});

/**
 * POST /api/v2/calculate
 * Main tax harvesting calculation endpoint
 */
router.post('/calculate', async (req, res) => {
  try {
    const { portfolio, targets, options = {} } = req.body;
    
    if (!portfolio || !Array.isArray(portfolio)) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio data is required and must be an array'
      });
    }

    const result = await taxService.calculateTaxHarvesting(portfolio, targets, options);
    res.json(result);
    
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during calculation'
    });
  }
});

/**
 * POST /api/v2/cash-raising
 * Cash raising calculation endpoint
 */
router.post('/cash-raising', async (req, res) => {
  try {
    const { portfolio, cashNeeded, options = {} } = req.body;
    
    if (!portfolio || !Array.isArray(portfolio)) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio data is required and must be an array'
      });
    }

    if (!cashNeeded || typeof cashNeeded !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Cash needed amount is required and must be a number'
      });
    }

    const result = await taxService.calculateTaxHarvesting(portfolio, null, {
      ...options,
      mode: 'cash-raising',
      cashNeeded
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Cash raising calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during cash raising calculation'
    });
  }
});

/**
 * POST /api/v2/wash-sale-check
 * Wash sale compliance validation
 */
router.post('/wash-sale-check', (req, res) => {
  try {
    const { tradingPlan, purchaseHistory = [] } = req.body;
    
    if (!tradingPlan || !Array.isArray(tradingPlan)) {
      return res.status(400).json({
        success: false,
        error: 'Trading plan is required and must be an array'
      });
    }

    const result = taxService.validateWashSaleCompliance(tradingPlan, purchaseHistory);
    res.json({ success: true, ...result });
    
  } catch (error) {
    console.error('Wash sale check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during wash sale validation'
    });
  }
});

/**
 * GET /api/v2/alternatives/:symbol
 * Get alternative ETFs for wash sale avoidance
 */
router.get('/alternatives/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;
    const { exclude } = req.query;
    
    const excludeSymbols = exclude ? exclude.split(',') : [];
    const alternatives = taxService.findWashSaleAlternatives(symbol, excludeSymbols);
    
    res.json({
      success: true,
      symbol,
      alternatives
    });
    
  } catch (error) {
    console.error('Alternatives lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during alternatives lookup'
    });
  }
});

/**
 * GET /api/v2/performance
 * Get performance metrics and diagnostics
 */
router.get('/performance', (req, res) => {
  try {
    const report = taxService.getPerformanceReport();
    res.json({
      success: true,
      ...report
    });
  } catch (error) {
    console.error('Performance report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error getting performance report'
    });
  }
});

/**
 * GET /api/v2/diagnostics
 * Get service diagnostics and health information
 */
router.get('/diagnostics', (req, res) => {
  try {
    const diagnostics = taxService.exportDiagnostics();
    res.json({
      success: true,
      ...diagnostics
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error getting diagnostics'
    });
  }
});

/**
 * POST /api/v2/reset
 * Reset service state (development/testing only)
 */
router.post('/reset', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Reset not allowed in production'
    });
  }
  
  try {
    taxService.reset();
    res.json({
      success: true,
      message: 'Service state reset successfully'
    });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during reset'
    });
  }
});

module.exports = router;
