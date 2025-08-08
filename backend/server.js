const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8742;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' })); // Increased limit for large portfolio data
app.use(express.urlencoded({ extended: true }));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({
    message: 'Tax Harvesting Backend Server is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API routes (with graceful database handling)
try {
  // Try to load development routes with mock data first
  console.log('🔧 Loading development API routes...');
  const devRoutes = require('./routes/dev');
  app.use('/api', devRoutes);
  
  // Add API info endpoint
  app.get('/api', (req, res) => {
    res.json({
      message: 'Tax Harvesting API (Development Mode)',
      status: 'development',
      database: 'mock-data',
      note: 'Using mock data for development. Configure PostgreSQL database to enable full functionality',
      endpoints: {
        portfolios: '/api/portfolios',
        models: '/api/models',
        prices: '/api/prices',
        calculate: '/api/calculate'
      }
    });
  });
  
  console.log('✅ Development API routes loaded successfully');
  
  // Test database connection in background (non-blocking)
  setTimeout(() => {
    try {
      const { testConnection } = require('./config/database');
      testConnection()
        .then(() => {
          console.log('✅ Database connection available - you can switch to full database mode');
        })
        .catch(err => {
          console.log('ℹ️  Database not connected - continuing with mock data');
        });
    } catch (error) {
      console.log('ℹ️  Database configuration not found - using mock data');
    }
  }, 1000);
    
} catch (error) {
  console.warn('⚠️  Could not load API routes:', error.message);
  
  // Fallback API endpoint
  app.get('/api', (req, res) => {
    res.json({
      message: 'Tax Harvesting API (Basic Mode)',
      status: 'error',
      error: 'Could not initialize API routes',
      note: 'Check server logs for details'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
  console.log(`📊 Tax Harvesting Backend v1.0.0`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

module.exports = app;