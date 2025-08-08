const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// GET /api/prices - Get current prices for all symbols
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT ON (symbol) 
             symbol, price, price_date, source, created_at
      FROM price_history 
      ORDER BY symbol, price_date DESC, created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
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

// GET /api/prices/:symbol - Get price history for specific symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = parseInt(req.query.limit) || 30;
    
    const result = await query(`
      SELECT * FROM price_history 
      WHERE symbol = $1 
      ORDER BY price_date DESC, created_at DESC 
      LIMIT $2
    `, [symbol, limit]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      symbol
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price history',
      message: error.message
    });
  }
});

// POST /api/prices - Update prices (single or batch)
router.post('/', async (req, res) => {
  try {
    const { prices } = req.body;
    
    if (!prices || !Array.isArray(prices)) {
      return res.status(400).json({
        success: false,
        error: 'Prices array is required'
      });
    }
    
    const client = await require('../config/database').getClient();
    const updatedPrices = [];
    
    try {
      await client.query('BEGIN');
      
      for (const priceData of prices) {
        const { symbol, price, price_date, source = 'manual' } = priceData;
        
        if (!symbol || !price) {
          continue; // Skip invalid entries
        }
        
        const result = await client.query(`
          INSERT INTO price_history (symbol, price, price_date, source)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [
          symbol.toUpperCase(),
          parseFloat(price),
          price_date || new Date().toISOString().split('T')[0],
          source
        ]);
        
        updatedPrices.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        data: updatedPrices,
        count: updatedPrices.length,
        message: `Updated prices for ${updatedPrices.length} symbols`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prices',
      message: error.message
    });
  }
});

// PUT /api/prices/:symbol - Update price for specific symbol
router.put('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const { price, price_date, source = 'manual' } = req.body;
    
    if (!price) {
      return res.status(400).json({
        success: false,
        error: 'Price is required'
      });
    }
    
    const result = await query(`
      INSERT INTO price_history (symbol, price, price_date, source)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      symbol,
      parseFloat(price),
      price_date || new Date().toISOString().split('T')[0],
      source
    ]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: `Price updated for ${symbol}`
    });
    
  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update price',
      message: error.message
    });
  }
});

// GET /api/prices/symbols/all - Get all unique symbols from portfolios and models
router.get('/symbols/all', async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT symbol, 'portfolio' as source FROM positions WHERE symbol IS NOT NULL AND symbol != ''
      UNION
      SELECT DISTINCT symbol, 'model' as source FROM model_holdings WHERE symbol IS NOT NULL AND symbol != ''
      ORDER BY symbol
    `);
    
    const symbols = [...new Set(result.rows.map(row => row.symbol))];
    
    res.json({
      success: true,
      data: symbols,
      count: symbols.length
    });
  } catch (error) {
    console.error('Error fetching symbols:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch symbols',
      message: error.message
    });
  }
});

module.exports = router;