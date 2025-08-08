const express = require('express');
const router = express.Router();

// Import route modules
const portfolioRoutes = require('./portfolios');
const calculationRoutes = require('./calculations');
const modelRoutes = require('./models');
const priceRoutes = require('./prices');

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Tax Harvesting API',
    version: '1.0.0',
    endpoints: {
      portfolios: '/api/portfolios',
      calculations: '/api/calculate',
      models: '/api/models',
      prices: '/api/prices'
    },
    timestamp: new Date().toISOString()
  });
});

// Mount route modules
router.use('/portfolios', portfolioRoutes);
router.use('/calculate', calculationRoutes);
router.use('/models', modelRoutes);
router.use('/prices', priceRoutes);

module.exports = router;