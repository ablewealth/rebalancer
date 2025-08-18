const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { 
  EnhancedTaxHarvestingService,
  TaxHarvestingError,
  InvalidPortfolioDataError,
  NoLotsFoundError,
  WashSaleViolationError 
} = require('../services/enhancedTaxHarvestingService');

// Initialize the enhanced tax harvesting service
const taxService = new EnhancedTaxHarvestingService({
  enableLogging: process.env.NODE_ENV === 'development'
});

// POST /api/calculate - Run tax harvesting calculation
router.post('/', async (req, res) => {
  try {
    const {
      portfolioData,
      targetST = 0,
      targetLT = 0,
      realizedST = 0,
      realizedLT = 0,
      portfolioId = null,
      calculationName = null,
      cashMaximizationMode = false,
      // Cash raising feature
      useCashRaising = false,
      cashNeeded = 0,
      currentCash = 0,
      // Enhanced service options
      taxConfig = {},
      washSaleConfig = {},
      accountTypes = ['taxable'],
      optimizationLevel = 'balanced',
      performanceMode = null
    } = req.body;
    
    // Validate input
    if (!portfolioData || !Array.isArray(portfolioData)) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio data is required and must be an array'
      });
    }
    
    if (portfolioData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio data cannot be empty'
      });
    }
    
    console.log(`Starting enhanced tax harvesting calculation for ${portfolioData.length} positions`);
    
    // Configure options for enhanced service
    const enhancedOptions = {
      useCashRaising,
      cashNeeded: parseFloat(cashNeeded) || 0,
      currentCash: parseFloat(currentCash) || 0,
      taxConfig: {
        shortTermRate: 0.25,  // Default tax rates
        longTermRate: 0.15,
        stateRate: 0.05,
        ...taxConfig  // Override with user provided rates
      },
      washSaleConfig: {
        beforeDays: 30,
        afterDays: 30,
        strictMode: true,
        ...washSaleConfig  // Override with user provided config
      },
      accountTypes,
      optimizationLevel: portfolioData.length > 1000 ? 'fast' : optimizationLevel,
      performanceMode: performanceMode !== null ? performanceMode : portfolioData.length > 1000,
      validateInputs: true
    };
    
    // Run the enhanced tax harvesting calculation
    const results = await taxService.runTaxHarvesting(
      portfolioData,
      parseFloat(targetST) || 0,
      parseFloat(targetLT) || 0,
      parseFloat(realizedST) || 0,
      parseFloat(realizedLT) || 0,
      cashMaximizationMode,
      enhancedOptions
    );
    
    // Save calculation to database if portfolioId provided and database is available
    let calculationId = null;
    if (portfolioId) {
      try {
        const calculationResult = await query(`
          INSERT INTO tax_calculations (portfolio_id, calculation_name, target_st_gain, target_lt_gain, realized_st_gain, realized_lt_gain, results)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          portfolioId,
          calculationName || `Calculation ${new Date().toISOString()}`,
          targetST,
          targetLT,
          realizedST,
          realizedLT,
          JSON.stringify(results)
        ]);
        
        calculationId = calculationResult.rows[0].id;
        console.log(`Saved calculation to database with ID: ${calculationId}`);
      } catch (dbError) {
        console.warn('Could not save calculation to database:', dbError.message);
        // Continue without saving - don't fail the calculation
      }
    }
    
    // Add calculation ID to results
    results.calculationId = calculationId;
    
    res.json({
      success: true,
      data: results,
      message: `Enhanced tax harvesting calculation completed. Generated ${results.recommendations.length} recommendations.`
    });
    
  } catch (error) {
    console.error('Error running enhanced tax harvesting calculation:', error);
    
    // Handle specific enhanced service errors
    if (error instanceof InvalidPortfolioDataError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid portfolio data provided',
        details: error.details,
        message: error.message
      });
    }
    
    if (error instanceof NoLotsFoundError) {
      return res.status(404).json({
        success: false,
        error: 'No lots available for harvesting',
        details: error.details,
        message: error.message
      });
    }
    
    if (error instanceof WashSaleViolationError) {
      return res.status(422).json({
        success: false,
        error: 'Wash sale violation detected',
        details: error.details,
        message: error.message
      });
    }
    
    if (error instanceof TaxHarvestingError) {
      return res.status(422).json({
        success: false,
        error: 'Tax harvesting calculation error',
        details: error.details,
        message: error.message
      });
    }
    
    // Generic error handling
    res.status(500).json({
      success: false,
      error: 'Failed to run tax harvesting calculation',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/calculate/history/:portfolioId - Get calculation history for portfolio
router.get('/history/:portfolioId', async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.portfolioId);
    
    const result = await query(`
      SELECT id, calculation_name, target_st_gain, target_lt_gain, 
             realized_st_gain, realized_lt_gain, created_at
      FROM tax_calculations 
      WHERE portfolio_id = $1 
      ORDER BY created_at DESC
      LIMIT 50
    `, [portfolioId]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching calculation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calculation history',
      message: error.message
    });
  }
});

// GET /api/calculate/:id - Get specific calculation results
router.get('/:id', async (req, res) => {
  try {
    const calculationId = parseInt(req.params.id);
    
    const result = await query(
      'SELECT * FROM tax_calculations WHERE id = $1',
      [calculationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Calculation not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching calculation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calculation',
      message: error.message
    });
  }
});

module.exports = router;