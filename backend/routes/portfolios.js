const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// GET /api/portfolios - Get all portfolios
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, 
             COUNT(pos.id) as position_count,
             COALESCE(SUM(pos.quantity * pos.price), 0) as total_value
      FROM portfolios p
      LEFT JOIN positions pos ON p.id = pos.portfolio_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolios',
      message: error.message
    });
  }
});

// GET /api/portfolios/:id - Get specific portfolio with positions
router.get('/:id', async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.id);
    
    // Get portfolio info
    const portfolioResult = await query(
      'SELECT * FROM portfolios WHERE id = $1',
      [portfolioId]
    );
    
    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }
    
    // Get positions
    const positionsResult = await query(
      'SELECT * FROM positions WHERE portfolio_id = $1 ORDER BY symbol',
      [portfolioId]
    );
    
    const portfolio = portfolioResult.rows[0];
    portfolio.positions = positionsResult.rows;
    
    res.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio',
      message: error.message
    });
  }
});

// POST /api/portfolios - Create new portfolio
router.post('/', async (req, res) => {
  try {
    const { portfolio_name, description, positions = [] } = req.body;
    
    if (!portfolio_name) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio name is required'
      });
    }
    
    // Start transaction
    const client = await require('../config/database').getClient();
    
    try {
      await client.query('BEGIN');
      
      // Create portfolio
      const portfolioResult = await client.query(
        'INSERT INTO portfolios (portfolio_name, description) VALUES ($1, $2) RETURNING *',
        [portfolio_name, description]
      );
      
      const portfolio = portfolioResult.rows[0];
      
      // Add positions if provided
      if (positions.length > 0) {
        for (const position of positions) {
          await client.query(`
            INSERT INTO positions (portfolio_id, symbol, name, quantity, price, cost_basis, target_weight, acquired_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            portfolio.id,
            position.symbol,
            position.name || '',
            position.quantity || 0,
            position.price || 0,
            position.cost_basis || 0,
            position.target_weight || 0,
            position.acquired_date || null
          ]);
        }
      }
      
      await client.query('COMMIT');
      
      // Fetch complete portfolio with positions
      const completePortfolio = await query(
        'SELECT * FROM portfolios WHERE id = $1',
        [portfolio.id]
      );
      
      const portfolioPositions = await query(
        'SELECT * FROM positions WHERE portfolio_id = $1',
        [portfolio.id]
      );
      
      const result = completePortfolio.rows[0];
      result.positions = portfolioPositions.rows;
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Portfolio created successfully'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create portfolio',
      message: error.message
    });
  }
});

// PUT /api/portfolios/:id - Update portfolio
router.put('/:id', async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.id);
    const { portfolio_name, description, positions = [] } = req.body;
    
    const client = await require('../config/database').getClient();
    
    try {
      await client.query('BEGIN');
      
      // Update portfolio
      await client.query(
        'UPDATE portfolios SET portfolio_name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [portfolio_name, description, portfolioId]
      );
      
      // Delete existing positions
      await client.query('DELETE FROM positions WHERE portfolio_id = $1', [portfolioId]);
      
      // Add new positions
      for (const position of positions) {
        await client.query(`
          INSERT INTO positions (portfolio_id, symbol, name, quantity, price, cost_basis, target_weight, acquired_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          portfolioId,
          position.symbol,
          position.name || '',
          position.quantity || 0,
          position.price || 0,
          position.cost_basis || 0,
          position.target_weight || 0,
          position.acquired_date || null
        ]);
      }
      
      await client.query('COMMIT');
      
      // Return updated portfolio
      const updatedPortfolio = await query('SELECT * FROM portfolios WHERE id = $1', [portfolioId]);
      const updatedPositions = await query('SELECT * FROM positions WHERE portfolio_id = $1', [portfolioId]);
      
      const result = updatedPortfolio.rows[0];
      result.positions = updatedPositions.rows;
      
      res.json({
        success: true,
        data: result,
        message: 'Portfolio updated successfully'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error updating portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update portfolio',
      message: error.message
    });
  }
});

// DELETE /api/portfolios/:id - Delete portfolio
router.delete('/:id', async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.id);
    
    const result = await query('DELETE FROM portfolios WHERE id = $1 RETURNING *', [portfolioId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Portfolio deleted successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete portfolio',
      message: error.message
    });
  }
});

module.exports = router;