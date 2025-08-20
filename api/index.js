// Vercel Serverless Function for Tax Harvesting Backend
const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'tax-harvesting-backend',
    timestamp: new Date().toISOString(),
    environment: 'production'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Tax Harvesting Backend API',
    version: '2.0.0',
    status: 'active',
    features: {
      portfolio_analytics: true,
      tax_calculations: true,
      wash_sale_detection: true,
      neon_database: true
    },
    endpoints: {
      health: '/api/health',
      test: '/api/test'
    }
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API test successful',
    timestamp: new Date().toISOString(),
    query: req.query,
    headers: {
      'user-agent': req.get('User-Agent'),
      'host': req.get('Host')
    }
  });
});

// Mock portfolio endpoint for testing
app.get('/api/portfolios', (req, res) => {
  res.json({
    message: 'Portfolio data endpoint',
    portfolios: [
      {
        id: 1,
        name: 'Sample Portfolio',
        total_value: 100000,
        status: 'active'
      }
    ]
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    available_endpoints: ['/api', '/api/health', '/api/test', '/api/portfolios']
  });
});

// Root handler
app.use('*', (req, res) => {
  res.json({
    message: 'Tax Harvesting Backend Serverless Function',
    note: 'Use /api/* routes for API access'
  });
});

// Export for Vercel
module.exports = app;
