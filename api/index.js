// Vercel API Handler for Tax Harvesting Backend
// This creates a serverless function from the Express app

const path = require('path');

// Set up environment for backend
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Import the express app
const createApp = () => {
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const morgan = require('morgan');
  
  const app = express();
  
  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: ['https://awm-rebalancer.netlify.app', 'http://localhost:3000'],
    credentials: true
  }));
  app.use(morgan('combined'));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Basic routes
  app.get('/', (req, res) => {
    res.json({
      message: 'Tax Harvesting Backend API',
      version: '2.0.0',
      status: 'running',
      timestamp: new Date().toISOString()
    });
  });
  
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
  
  // Try to load the full backend routes
  try {
    const devRoutes = require('../backend/routes/dev');
    app.use('/api', devRoutes);
    
    const marketDataRoutes = require('../backend/routes/marketData');
    app.use('/api/market-data', marketDataRoutes);
    
    const advancedTaxRoutes = require('../backend/routes/advancedTaxStrategies');
    app.use('/api/advanced-tax', advancedTaxRoutes);
    
    console.log('✅ Backend routes loaded successfully');
  } catch (error) {
    console.warn('⚠️ Could not load all backend routes:', error.message);
    
    // Fallback API
    app.get('/api', (req, res) => {
      res.json({
        message: 'Tax Harvesting API (Serverless)',
        status: 'partial',
        note: 'Some routes may not be available'
      });
    });
  }
  
  return app;
};

// Export for Vercel serverless
module.exports = createApp();
