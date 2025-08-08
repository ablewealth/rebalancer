const express = require('express');
const router = express.Router();

// Mock data for development without database
const mockPortfolios = [
  {
    id: 1,
    portfolio_name: 'Sample Portfolio',
    description: 'A sample portfolio for development',
    position_count: 3,
    total_value: 50000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    positions: [
      {
        id: 1,
        portfolio_id: 1,
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        quantity: 100,
        price: 220.00,
        cost_basis: 21000,
        target_weight: 0.60,
        acquired_date: '2023-01-15'
      },
      {
        id: 2,
        portfolio_id: 1,
        symbol: 'BND',
        name: 'Vanguard Total Bond Market ETF',
        quantity: 200,
        price: 75.00,
        cost_basis: 15500,
        target_weight: 0.30,
        acquired_date: '2023-02-01'
      },
      {
        id: 3,
        portfolio_id: 1,
        symbol: 'VNQ',
        name: 'Vanguard Real Estate ETF',
        quantity: 50,
        price: 85.00,
        cost_basis: 4000,
        target_weight: 0.10,
        acquired_date: '2023-03-01'
      }
    ]
  }
];

const mockModels = [
  {
    id: 1,
    model_name: 'Conservative Growth',
    description: 'Balanced portfolio with 60% stocks, 40% bonds',
    holding_count: 3,
    total_weight: 1.0,
    is_active: true,
    holdings: [
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', target_weight: 0.40 },
      { symbol: 'VTIAX', name: 'Vanguard Total International Stock Index', target_weight: 0.20 },
      { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', target_weight: 0.40 }
    ]
  },
  {
    id: 2,
    model_name: 'Aggressive Growth',
    description: 'Growth-focused portfolio with 90% stocks, 10% bonds',
    holding_count: 4,
    total_weight: 1.0,
    is_active: true,
    holdings: [
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', target_weight: 0.50 },
      { symbol: 'VTIAX', name: 'Vanguard Total International Stock Index', target_weight: 0.30 },
      { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', target_weight: 0.10 },
      { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', target_weight: 0.10 }
    ]
  }
];

const mockPrices = [
  { symbol: 'VTI', price: 220.00, price_date: '2024-01-15', source: 'mock' },
  { symbol: 'VTIAX', price: 28.50, price_date: '2024-01-15', source: 'mock' },
  { symbol: 'BND', price: 75.00, price_date: '2024-01-15', source: 'mock' },
  { symbol: 'VNQ', price: 85.00, price_date: '2024-01-15', source: 'mock' },
  { symbol: 'VTEB', price: 52.00, price_date: '2024-01-15', source: 'mock' }
];

// Development API endpoints with mock data
router.get('/portfolios', (req, res) => {
  res.json({
    success: true,
    data: mockPortfolios,
    count: mockPortfolios.length,
    note: 'Mock data - database not connected'
  });
});

router.get('/portfolios/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const portfolio = mockPortfolios.find(p => p.id === id);
  
  if (!portfolio) {
    return res.status(404).json({
      success: false,
      error: 'Portfolio not found'
    });
  }
  
  res.json({
    success: true,
    data: portfolio,
    note: 'Mock data - database not connected'
  });
});

router.get('/models', (req, res) => {
  res.json({
    success: true,
    data: mockModels,
    count: mockModels.length,
    note: 'Mock data - database not connected'
  });
});

router.get('/models/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const model = mockModels.find(m => m.id === id);
  
  if (!model) {
    return res.status(404).json({
      success: false,
      error: 'Model not found'
    });
  }
  
  res.json({
    success: true,
    data: model,
    note: 'Mock data - database not connected'
  });
});

// Create new model
router.post('/models', (req, res) => {
  try {
    const { model_name, description, holdings } = req.body;
    
    if (!model_name || !model_name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Model name is required'
      });
    }
    
    // Validate holdings
    const validHoldings = holdings ? holdings.filter(h => h.symbol && h.symbol.trim() && h.target_weight > 0) : [];
    const totalWeight = validHoldings.reduce((sum, h) => sum + h.target_weight, 0);
    
    if (validHoldings.length > 0 && Math.abs(totalWeight - 1.0) > 0.01) {
      return res.status(400).json({
        success: false,
        error: `Total weight must equal 100% (1.0), got ${(totalWeight * 100).toFixed(2)}%`
      });
    }
    
    // Create new model
    const newModel = {
      id: Math.max(...mockModels.map(m => m.id), 0) + 1,
      model_name: model_name.trim(),
      description: description ? description.trim() : '',
      holding_count: validHoldings.length,
      total_weight: totalWeight,
      is_active: true,
      holdings: validHoldings.map(h => ({
        symbol: h.symbol.toUpperCase().trim(),
        name: h.name ? h.name.trim() : h.symbol.toUpperCase().trim(),
        target_weight: h.target_weight
      }))
    };
    
    mockModels.push(newModel);
    
    res.json({
      success: true,
      data: newModel,
      message: 'Model created successfully',
      note: 'Mock data - database not connected'
    });
    
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create model'
    });
  }
});

// Update existing model
router.put('/models/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { model_name, description, holdings } = req.body;
    
    const modelIndex = mockModels.findIndex(m => m.id === id);
    if (modelIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }
    
    if (!model_name || !model_name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Model name is required'
      });
    }
    
    // Validate holdings
    const validHoldings = holdings ? holdings.filter(h => h.symbol && h.symbol.trim() && h.target_weight > 0) : [];
    const totalWeight = validHoldings.reduce((sum, h) => sum + h.target_weight, 0);
    
    if (validHoldings.length > 0 && Math.abs(totalWeight - 1.0) > 0.01) {
      return res.status(400).json({
        success: false,
        error: `Total weight must equal 100% (1.0), got ${(totalWeight * 100).toFixed(2)}%`
      });
    }
    
    // Update model
    const updatedModel = {
      ...mockModels[modelIndex],
      model_name: model_name.trim(),
      description: description ? description.trim() : '',
      holding_count: validHoldings.length,
      total_weight: totalWeight,
      holdings: validHoldings.map(h => ({
        symbol: h.symbol.toUpperCase().trim(),
        name: h.name ? h.name.trim() : h.symbol.toUpperCase().trim(),
        target_weight: h.target_weight
      }))
    };
    
    mockModels[modelIndex] = updatedModel;
    
    res.json({
      success: true,
      data: updatedModel,
      message: 'Model updated successfully',
      note: 'Mock data - database not connected'
    });
    
  } catch (error) {
    console.error('Error updating model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update model'
    });
  }
});

// Delete model
router.delete('/models/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const modelIndex = mockModels.findIndex(m => m.id === id);
    
    if (modelIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }
    
    const deletedModel = mockModels.splice(modelIndex, 1)[0];
    
    res.json({
      success: true,
      data: deletedModel,
      message: 'Model deleted successfully',
      note: 'Mock data - database not connected'
    });
    
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete model'
    });
  }
});

router.get('/prices', (req, res) => {
  res.json({
    success: true,
    data: mockPrices,
    count: mockPrices.length,
    note: 'Mock data - database not connected'
  });
});

// Update or create price data
router.post('/prices', (req, res) => {
  try {
    const { prices } = req.body;
    
    if (!Array.isArray(prices)) {
      return res.status(400).json({
        success: false,
        error: 'Prices must be an array'
      });
    }
    
    // Update mock prices array
    prices.forEach(priceUpdate => {
      const { symbol, price, name } = priceUpdate;
      if (symbol && price >= 0) {
        const existingIndex = mockPrices.findIndex(p => p.symbol.toUpperCase() === symbol.toUpperCase());
        const priceData = {
          symbol: symbol.toUpperCase(),
          price: parseFloat(price) || 0,
          price_date: new Date().toISOString().split('T')[0],
          source: 'user_updated',
          name: name || symbol
        };
        
        if (existingIndex >= 0) {
          mockPrices[existingIndex] = priceData;
        } else {
          mockPrices.push(priceData);
        }
      }
    });
    
    res.json({
      success: true,
      data: mockPrices,
      message: `Updated ${prices.length} price entries`,
      note: 'Mock data - database not connected'
    });
    
  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prices'
    });
  }
});

router.post('/calculate', (req, res) => {
  const { 
    portfolioData, 
    targetST = 0, 
    targetLT = 0, 
    realizedST = 0, 
    realizedLT = 0,
    cashMaximizationMode = false,
    // Cash raising feature
    useCashRaising = false,
    cashNeeded = 0,
    currentCash = 0
  } = req.body;
  
  // Use real algorithm even in dev mode
  try {
    const TaxHarvestingService = require('../services/taxHarvestingService');
    const taxService = new TaxHarvestingService();
    
    // Use provided portfolio data or fall back to mock data
    const dataToUse = portfolioData && portfolioData.length > 0 ? portfolioData : [
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        quantity: 100,
        price: 220.00,
        costBasis: 21000,
        unrealizedGain: 1000,
        term: 'Long',
        includedInSelling: true
      },
      {
        symbol: 'BND',
        name: 'Vanguard Total Bond Market ETF',
        quantity: 200,
        price: 75.00,
        costBasis: 16000,
        unrealizedGain: -1000,
        term: 'Long',
        includedInSelling: true
      }
    ];
    
    const result = taxService.runTaxHarvesting(
      dataToUse, 
      targetST, 
      targetLT, 
      realizedST, 
      realizedLT, 
      cashMaximizationMode,
      {
        useCashRaising,
        cashNeeded: parseFloat(cashNeeded) || 0,
        currentCash: parseFloat(currentCash) || 0
      }
    );
    
    res.json({
      success: true,
      data: result,
      note: 'Real calculation using tax harvesting service - database not connected'
    });
    
  } catch (error) {
    console.error('Error in dev calculation:', error);
    
    // Fallback to simple mock
    const mockResult = {
      recommendations: [],
      summary: {
        targetST,
        targetLT,
        actualST: 0,
        actualLT: 0,
        totalRecommendations: 0
      },
      errors: ['Calculation service error: ' + error.message]
    };
    
    res.json({
      success: true,
      data: mockResult,
      note: 'Fallback mock calculation - service error'
    });
  }
});

module.exports = router;