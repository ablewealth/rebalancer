const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// GET /api/models - Get all model portfolios
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT m.*, 
             COUNT(h.id) as holding_count,
             COALESCE(SUM(h.target_weight), 0) as total_weight
      FROM model_portfolios m
      LEFT JOIN model_holdings h ON m.id = h.model_id
      WHERE m.is_active = true
      GROUP BY m.id
      ORDER BY m.model_name
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching model portfolios:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch model portfolios',
      message: error.message
    });
  }
});

// GET /api/models/:id - Get specific model portfolio with holdings
router.get('/:id', async (req, res) => {
  try {
    const modelId = parseInt(req.params.id);
    
    // Get model info
    const modelResult = await query(
      'SELECT * FROM model_portfolios WHERE id = $1 AND is_active = true',
      [modelId]
    );
    
    if (modelResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model portfolio not found'
      });
    }
    
    // Get holdings
    const holdingsResult = await query(
      'SELECT * FROM model_holdings WHERE model_id = $1 ORDER BY target_weight DESC, symbol',
      [modelId]
    );
    
    const model = modelResult.rows[0];
    model.holdings = holdingsResult.rows;
    
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error('Error fetching model portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch model portfolio',
      message: error.message
    });
  }
});

// POST /api/models - Create new model portfolio
router.post('/', async (req, res) => {
  try {
    const { model_name, description, holdings = [] } = req.body;
    
    if (!model_name) {
      return res.status(400).json({
        success: false,
        error: 'Model name is required'
      });
    }
    
    // Validate total weight
    const totalWeight = holdings.reduce((sum, h) => sum + (h.target_weight || 0), 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      return res.status(400).json({
        success: false,
        error: `Total weight must equal 100% (1.0), got ${(totalWeight * 100).toFixed(2)}%`
      });
    }
    
    const client = await require('../config/database').getClient();
    
    try {
      await client.query('BEGIN');
      
      // Create model portfolio
      const modelResult = await client.query(
        'INSERT INTO model_portfolios (model_name, description) VALUES ($1, $2) RETURNING *',
        [model_name, description]
      );
      
      const model = modelResult.rows[0];
      
      // Add holdings
      for (const holding of holdings) {
        await client.query(`
          INSERT INTO model_holdings (model_id, symbol, name, target_weight, price)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          model.id,
          holding.symbol,
          holding.name || '',
          holding.target_weight || 0,
          holding.price || 0
        ]);
      }
      
      await client.query('COMMIT');
      
      // Return complete model with holdings
      const completeModel = await query('SELECT * FROM model_portfolios WHERE id = $1', [model.id]);
      const modelHoldings = await query('SELECT * FROM model_holdings WHERE model_id = $1', [model.id]);
      
      const result = completeModel.rows[0];
      result.holdings = modelHoldings.rows;
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Model portfolio created successfully'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating model portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create model portfolio',
      message: error.message
    });
  }
});

// PUT /api/models/:id - Update model portfolio
router.put('/:id', async (req, res) => {
  try {
    const modelId = parseInt(req.params.id);
    const { model_name, description, holdings = [] } = req.body;
    
    // Validate total weight
    const totalWeight = holdings.reduce((sum, h) => sum + (h.target_weight || 0), 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      return res.status(400).json({
        success: false,
        error: `Total weight must equal 100% (1.0), got ${(totalWeight * 100).toFixed(2)}%`
      });
    }
    
    const client = await require('../config/database').getClient();
    
    try {
      await client.query('BEGIN');
      
      // Update model portfolio
      await client.query(
        'UPDATE model_portfolios SET model_name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [model_name, description, modelId]
      );
      
      // Delete existing holdings
      await client.query('DELETE FROM model_holdings WHERE model_id = $1', [modelId]);
      
      // Add new holdings
      for (const holding of holdings) {
        await client.query(`
          INSERT INTO model_holdings (model_id, symbol, name, target_weight, price)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          modelId,
          holding.symbol,
          holding.name || '',
          holding.target_weight || 0,
          holding.price || 0
        ]);
      }
      
      await client.query('COMMIT');
      
      // Return updated model
      const updatedModel = await query('SELECT * FROM model_portfolios WHERE id = $1', [modelId]);
      const updatedHoldings = await query('SELECT * FROM model_holdings WHERE model_id = $1', [modelId]);
      
      const result = updatedModel.rows[0];
      result.holdings = updatedHoldings.rows;
      
      res.json({
        success: true,
        data: result,
        message: 'Model portfolio updated successfully'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error updating model portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update model portfolio',
      message: error.message
    });
  }
});

// DELETE /api/models/:id - Delete (deactivate) model portfolio
router.delete('/:id', async (req, res) => {
  try {
    const modelId = parseInt(req.params.id);
    
    const result = await query(
      'UPDATE model_portfolios SET is_active = false WHERE id = $1 RETURNING *',
      [modelId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Model portfolio not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Model portfolio deactivated successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error deleting model portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete model portfolio',
      message: error.message
    });
  }
});

module.exports = router;