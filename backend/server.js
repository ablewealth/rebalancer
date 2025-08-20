const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { shutdown } = require('./config/database');
const { NeonDatabaseService } = require('./services/neonDatabaseService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8742;

// Initialize Neon Database Service
const neonService = new NeonDatabaseService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' })); // Increased limit for large portfolio data
app.use(express.urlencoded({ extended: true }));

// Make Neon service available to routes
app.locals.neonService = neonService;

// Neon Database API Routes
// Portfolio Analytics Routes
app.get('/api/neon/portfolios/:id/analytics', async (req, res) => {
  try {
    const analytics = await neonService.getPortfolioAnalytics(req.params.id);
    res.json(analytics);
  } catch (error) {
    console.error('Portfolio analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio analytics' });
  }
});

app.post('/api/neon/portfolios/:id/analytics', async (req, res) => {
  try {
    const analytics = await neonService.storePortfolioAnalytics(req.params.id, req.body);
    res.json(analytics);
  } catch (error) {
    console.error('Store analytics error:', error);
    res.status(500).json({ error: 'Failed to store portfolio analytics' });
  }
});

// Tax Calculation Routes
app.post('/api/neon/tax-calculations', async (req, res) => {
  try {
    const calculation = await neonService.storeTaxCalculation(req.body);
    res.json(calculation);
  } catch (error) {
    console.error('Tax calculation error:', error);
    res.status(500).json({ error: 'Failed to store tax calculation' });
  }
});

app.get('/api/neon/portfolios/:id/tax-calculations', async (req, res) => {
  try {
    const calculations = await neonService.getTaxCalculationHistory(req.params.id);
    res.json(calculations);
  } catch (error) {
    console.error('Tax calculation history error:', error);
    res.status(500).json({ error: 'Failed to fetch tax calculation history' });
  }
});

// Wash Sale Detection Routes
app.get('/api/neon/wash-sales/:symbol', async (req, res) => {
  try {
    const washSaleData = await neonService.getWashSaleInfo(req.params.symbol);
    res.json(washSaleData);
  } catch (error) {
    console.error('Wash sale info error:', error);
    res.status(500).json({ error: 'Failed to fetch wash sale information' });
  }
});

app.post('/api/neon/wash-sales/check', async (req, res) => {
  try {
    const { portfolio_id, symbol, trade_date, trade_type } = req.body;
    const isWashSale = await neonService.checkWashSaleViolation(portfolio_id, symbol, trade_date, trade_type);
    res.json({ is_wash_sale: isWashSale });
  } catch (error) {
    console.error('Wash sale check error:', error);
    res.status(500).json({ error: 'Failed to check wash sale violation' });
  }
});

// Health and Performance Routes
app.get('/api/neon/health', async (req, res) => {
  try {
    const health = await neonService.getHealthStatus();
    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed', status: 'unhealthy' });
  }
});

app.get('/api/neon/performance', async (req, res) => {
  try {
    const performance = await neonService.getPerformanceMetrics();
    res.json(performance);
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// Database Feature Testing Routes
app.post('/api/neon/test-features', async (req, res) => {
  try {
    const results = await neonService.testNeonFeatures();
    res.json(results);
  } catch (error) {
    console.error('Feature test error:', error);
    res.status(500).json({ error: 'Feature testing failed' });
  }
});

// Neon API Info Route
app.get('/api/neon', (req, res) => {
  res.json({
    message: 'Neon Database Service API',
    version: '1.0.0',
    status: 'active',
    features: {
      portfolio_analytics: true,
      tax_calculations: true,
      wash_sale_detection: true,
      real_time_monitoring: true,
      performance_metrics: true
    },
    endpoints: {
      analytics: '/api/neon/portfolios/:id/analytics',
      tax_calculations: '/api/neon/tax-calculations',
      wash_sales: '/api/neon/wash-sales/:symbol',
      health: '/api/neon/health',
      performance: '/api/neon/performance',
      test_features: '/api/neon/test-features'
    }
  });
});

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
  
  // Load market data routes
  console.log('📈 Loading market data API routes...');
  const marketDataRoutes = require('./routes/marketData');
  app.use('/api/market-data', marketDataRoutes);
  
  // Load advanced tax strategies routes
  console.log('🧠 Loading advanced tax strategies API routes...');
  const advancedTaxRoutes = require('./routes/advancedTaxStrategies');
  app.use('/api/advanced-tax', advancedTaxRoutes);
  
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
        calculate: '/api/calculate',
        marketData: '/api/market-data',
        advancedTax: '/api/advanced-tax'
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
  console.log(`📊 Tax Harvesting Backend v2.0.0 with Neon Integration`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: Neon PostgreSQL Service`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n📋 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close Neon service connections
    if (neonService && neonService.close) {
      console.log('🔌 Closing Neon database connections...');
      await neonService.close();
    }
    
    // Close traditional database connections if available
    if (shutdown) {
      console.log('🔌 Closing database connections...');
      await shutdown();
    }
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

module.exports = app;