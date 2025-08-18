const express = require('express');
const router = express.Router();
const MarketDataService = require('../services/marketDataService');

// Initialize market data service
const marketDataService = new MarketDataService();

// GET /api/market-data/price/:symbol - Get current price for a symbol
router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { forceRefresh, provider } = req.query;
    
    const options = {
      forceRefresh: forceRefresh === 'true',
      provider: provider || null
    };
    
    const priceData = await marketDataService.getPrice(symbol, options);
    
    res.json({
      success: true,
      data: priceData,
      symbol: symbol.toUpperCase()
    });
  } catch (error) {
    console.error('Error fetching price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price',
      message: error.message,
      symbol: req.params.symbol
    });
  }
});

// POST /api/market-data/prices - Get prices for multiple symbols
router.post('/prices', async (req, res) => {
  try {
    const { symbols, forceRefresh, maxConcurrent } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required'
      });
    }
    
    const options = {
      forceRefresh: forceRefresh || false,
      maxConcurrent: maxConcurrent || 5
    };
    
    const { results, errors } = await marketDataService.getPrices(symbols, options);
    
    res.json({
      success: true,
      data: results,
      errors: errors,
      count: Object.keys(results).length,
      errorCount: errors.length
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prices',
      message: error.message
    });
  }
});

// GET /api/market-data/status - Get provider status and rate limits
router.get('/status', async (req, res) => {
  try {
    const status = marketDataService.getProviderStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting provider status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get provider status',
      message: error.message
    });
  }
});

// GET /api/market-data/health - Health check for all providers
router.get('/health', async (req, res) => {
  try {
    const healthResults = await marketDataService.healthCheck();
    
    const overallHealth = Object.values(healthResults).every(result => result.status === 'healthy');
    
    res.json({
      success: true,
      data: {
        overall: overallHealth ? 'healthy' : 'degraded',
        providers: healthResults
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform health check',
      message: error.message
    });
  }
});

// POST /api/market-data/refresh-portfolio - Refresh prices for all symbols in portfolios
router.post('/refresh-portfolio', async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    // Get all unique symbols from portfolios and models
    const symbolsResult = await query(`
      SELECT DISTINCT symbol FROM (
        SELECT DISTINCT symbol FROM positions WHERE symbol IS NOT NULL AND symbol != ''
        UNION
        SELECT DISTINCT symbol FROM model_holdings WHERE symbol IS NOT NULL AND symbol != ''
      ) AS all_symbols
      ORDER BY symbol
    `);
    
    const symbols = symbolsResult.rows.map(row => row.symbol);
    
    if (symbols.length === 0) {
      return res.json({
        success: true,
        message: 'No symbols found in portfolios',
        data: { results: {}, errors: [] },
        count: 0
      });
    }
    
    const { results, errors } = await marketDataService.getPrices(symbols, { forceRefresh: true });
    
    res.json({
      success: true,
      data: { results, errors },
      count: Object.keys(results).length,
      errorCount: errors.length,
      message: `Refreshed prices for ${Object.keys(results).length} symbols`
    });
  } catch (error) {
    console.error('Error refreshing portfolio prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh portfolio prices',
      message: error.message
    });
  }
});

// GET /api/market-data/symbols/missing-prices - Get symbols that don't have recent prices
router.get('/symbols/missing-prices', async (req, res) => {
  try {
    const { query } = require('../config/database');
    const { hours = 24 } = req.query;
    
    const result = await query(`
      WITH all_symbols AS (
        SELECT DISTINCT symbol FROM positions WHERE symbol IS NOT NULL AND symbol != ''
        UNION
        SELECT DISTINCT symbol FROM model_holdings WHERE symbol IS NOT NULL AND symbol != ''
      ),
      recent_prices AS (
        SELECT DISTINCT symbol 
        FROM price_history 
        WHERE created_at > NOW() - INTERVAL '${parseInt(hours)} hours'
      )
      SELECT s.symbol
      FROM all_symbols s
      LEFT JOIN recent_prices p ON s.symbol = p.symbol
      WHERE p.symbol IS NULL
      ORDER BY s.symbol
    `);
    
    const missingSymbols = result.rows.map(row => row.symbol);
    
    res.json({
      success: true,
      data: missingSymbols,
      count: missingSymbols.length,
      message: `Found ${missingSymbols.length} symbols without recent prices (${hours}h)`
    });
  } catch (error) {
    console.error('Error finding missing prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find missing prices',
      message: error.message
    });
  }
});

// POST /api/market-data/auto-refresh - Set up automatic price refresh
router.post('/auto-refresh', async (req, res) => {
  try {
    const { enabled, intervalMinutes = 60 } = req.body;
    
    if (enabled) {
      // This would typically be handled by a background job scheduler
      // For now, we'll just return the configuration
      res.json({
        success: true,
        message: 'Auto-refresh configuration updated',
        data: {
          enabled: true,
          intervalMinutes: intervalMinutes,
          nextRefresh: new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString()
        }
      });
    } else {
      res.json({
        success: true,
        message: 'Auto-refresh disabled',
        data: { enabled: false }
      });
    }
  } catch (error) {
    console.error('Error configuring auto-refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure auto-refresh',
      message: error.message
    });
  }
});

module.exports = router;
