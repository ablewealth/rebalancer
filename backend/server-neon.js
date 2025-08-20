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

// Basic route for testing
app.get('/', async (req, res) => {
  try {
    const dbInfo = await neonService.healthCheck();
    res.json({
      message: 'Tax Harvesting Backend Server with Neon Integration',
      version: '2.0.0-neon',
      timestamp: new Date().toISOString(),
      database: dbInfo
    });
  } catch (error) {
    res.json({
      message: 'Tax Harvesting Backend Server with Neon Integration',
      version: '2.0.0-neon',
      timestamp: new Date().toISOString(),
      database: { status: 'error', error: error.message }
    });
  }
});

// Enhanced health check endpoint with Neon integration
app.get('/health', async (req, res) => {
  try {
    const healthCheck = await neonService.healthCheck();
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: healthCheck
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Neon-specific endpoints
app.get('/api/neon/status', async (req, res) => {
  try {
    const status = await neonService.healthCheck();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/neon/portfolios/:id/analytics', async (req, res) => {
  try {
    const analytics = await neonService.getPortfolioAnalytics(req.params.id);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/neon/portfolios/:id/calculate', async (req, res) => {
  try {
    const result = await neonService.storeTaxCalculation(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/neon/portfolios/:id/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await neonService.getTaxCalculationHistory(req.params.id, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/neon/etf/:symbol/alternatives', async (req, res) => {
  try {
    const alternatives = await neonService.getETFAlternatives(req.params.symbol);
    res.json(alternatives);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
      message: 'Tax Harvesting API with Neon Integration',
      status: 'enhanced',
      database: 'neon-postgres',
      version: '2.0.0-neon',
      endpoints: {
        portfolios: '/api/portfolios',
        models: '/api/models',
        prices: '/api/prices',
        calculate: '/api/calculate',
        marketData: '/api/market-data',
        advancedTax: '/api/advanced-tax',
        neon: {
          status: '/api/neon/status',
          analytics: '/api/neon/portfolios/:id/analytics',
          calculate: '/api/neon/portfolios/:id/calculate',
          history: '/api/neon/portfolios/:id/history',
          alternatives: '/api/neon/etf/:symbol/alternatives'
        }
      }
    });
  });
  
  console.log('✅ Enhanced API routes loaded successfully');
  
  // Initialize Neon service in background
  setTimeout(async () => {
    try {
      await neonService.initialize();
      console.log('✅ Neon Database Service initialized successfully');
    } catch (error) {
      console.log('⚠️  Neon service initialization failed:', error.message);
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
    path: req.originalUrl,
    availableEndpoints: [
      '/',
      '/health',
      '/api',
      '/api/neon/status'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  await shutdown();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
  console.log(`📊 Tax Harvesting Backend v2.0.0-neon`);
  console.log(`🗄️  Neon Database Integration Enabled`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

module.exports = app;
