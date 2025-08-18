const request = require('supertest');

// Mock the market data service to avoid real API calls
jest.mock('../../services/marketDataService');
const MarketDataService = require('../../services/marketDataService');

// Mock database
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn()
}));

const app = require('../../server');

describe('Market Data API Integration', () => {
  let mockMarketDataService;

  beforeEach(() => {
    mockMarketDataService = {
      getPrice: jest.fn(),
      getPrices: jest.fn(),
      getProviderStatus: jest.fn(),
      healthCheck: jest.fn()
    };
    
    MarketDataService.mockImplementation(() => mockMarketDataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/market-data/price/:symbol', () => {
    test('should fetch price for a single symbol', async () => {
      const mockPriceData = {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: '1.69%',
        volume: 50000000,
        timestamp: new Date().toISOString(),
        source: 'alphavantage'
      };

      mockMarketDataService.getPrice.mockResolvedValue(mockPriceData);

      const response = await request(app)
        .get('/api/market-data/price/AAPL')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockPriceData,
        symbol: 'AAPL'
      });

      expect(mockMarketDataService.getPrice).toHaveBeenCalledWith('AAPL', {
        forceRefresh: false,
        provider: null
      });
    });

    test('should handle force refresh parameter', async () => {
      const mockPriceData = {
        symbol: 'AAPL',
        price: 150.25,
        timestamp: new Date().toISOString(),
        source: 'alphavantage'
      };

      mockMarketDataService.getPrice.mockResolvedValue(mockPriceData);

      await request(app)
        .get('/api/market-data/price/AAPL?forceRefresh=true&provider=finnhub')
        .expect(200);

      expect(mockMarketDataService.getPrice).toHaveBeenCalledWith('AAPL', {
        forceRefresh: true,
        provider: 'finnhub'
      });
    });

    test('should handle price fetch errors', async () => {
      mockMarketDataService.getPrice.mockRejectedValue(new Error('API rate limit exceeded'));

      const response = await request(app)
        .get('/api/market-data/price/INVALID')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to fetch price',
        message: 'API rate limit exceeded',
        symbol: 'INVALID'
      });
    });
  });

  describe('POST /api/market-data/prices', () => {
    test('should fetch prices for multiple symbols', async () => {
      const mockResults = {
        results: {
          'AAPL': { symbol: 'AAPL', price: 150.25, source: 'alphavantage' },
          'GOOGL': { symbol: 'GOOGL', price: 2500.00, source: 'finnhub' }
        },
        errors: []
      };

      mockMarketDataService.getPrices.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/market-data/prices')
        .send({
          symbols: ['AAPL', 'GOOGL'],
          forceRefresh: true,
          maxConcurrent: 3
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockResults.results,
        errors: mockResults.errors,
        count: 2,
        errorCount: 0
      });

      expect(mockMarketDataService.getPrices).toHaveBeenCalledWith(['AAPL', 'GOOGL'], {
        forceRefresh: true,
        maxConcurrent: 3
      });
    });

    test('should handle partial failures', async () => {
      const mockResults = {
        results: {
          'AAPL': { symbol: 'AAPL', price: 150.25, source: 'alphavantage' }
        },
        errors: [
          { symbol: 'INVALID', error: 'Symbol not found' }
        ]
      };

      mockMarketDataService.getPrices.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/market-data/prices')
        .send({ symbols: ['AAPL', 'INVALID'] })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        count: 1,
        errorCount: 1
      });
    });

    test('should validate symbols array', async () => {
      const response = await request(app)
        .post('/api/market-data/prices')
        .send({ symbols: 'not-an-array' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Symbols array is required'
      });
    });
  });

  describe('GET /api/market-data/status', () => {
    test('should return provider status', async () => {
      const mockStatus = {
        alphavantage: {
          name: 'Alpha Vantage',
          hasApiKey: true,
          requestsRemaining: 20,
          resetIn: 3600000,
          lastRequest: Date.now()
        },
        finnhub: {
          name: 'Finnhub',
          hasApiKey: true,
          requestsRemaining: 55,
          resetIn: 30000,
          lastRequest: Date.now()
        }
      };

      mockMarketDataService.getProviderStatus.mockReturnValue(mockStatus);

      const response = await request(app)
        .get('/api/market-data/status')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockStatus,
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/market-data/health', () => {
    test('should return health check results', async () => {
      const mockHealthResults = {
        alphavantage: { status: 'healthy', error: null },
        finnhub: { status: 'error', error: 'API key invalid' },
        polygon: { status: 'healthy', error: null }
      };

      mockMarketDataService.healthCheck.mockResolvedValue(mockHealthResults);

      const response = await request(app)
        .get('/api/market-data/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          overall: 'degraded',
          providers: mockHealthResults
        },
        timestamp: expect.any(String)
      });
    });

    test('should show healthy when all providers are working', async () => {
      const mockHealthResults = {
        alphavantage: { status: 'healthy', error: null },
        finnhub: { status: 'healthy', error: null },
        polygon: { status: 'healthy', error: null }
      };

      mockMarketDataService.healthCheck.mockResolvedValue(mockHealthResults);

      const response = await request(app)
        .get('/api/market-data/health')
        .expect(200);

      expect(response.body.data.overall).toBe('healthy');
    });
  });

  describe('POST /api/market-data/refresh-portfolio', () => {
    test('should refresh all portfolio symbols', async () => {
      // Mock database query for symbols
      const { query } = require('../../config/database');
      query.mockResolvedValue({
        rows: [
          { symbol: 'AAPL' },
          { symbol: 'GOOGL' },
          { symbol: 'MSFT' }
        ]
      });

      const mockResults = {
        results: {
          'AAPL': { symbol: 'AAPL', price: 150.25 },
          'GOOGL': { symbol: 'GOOGL', price: 2500.00 },
          'MSFT': { symbol: 'MSFT', price: 300.00 }
        },
        errors: []
      };

      mockMarketDataService.getPrices.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/market-data/refresh-portfolio')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        count: 3,
        errorCount: 0,
        message: 'Refreshed prices for 3 symbols'
      });

      expect(mockMarketDataService.getPrices).toHaveBeenCalledWith(
        ['AAPL', 'GOOGL', 'MSFT'],
        { forceRefresh: true }
      );
    });

    test('should handle empty portfolio', async () => {
      const { query } = require('../../config/database');
      query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/market-data/refresh-portfolio')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'No symbols found in portfolios',
        count: 0
      });
    });
  });

  describe('GET /api/market-data/symbols/missing-prices', () => {
    test('should find symbols without recent prices', async () => {
      const { query } = require('../../config/database');
      query.mockResolvedValue({
        rows: [
          { symbol: 'AAPL' },
          { symbol: 'GOOGL' }
        ]
      });

      const response = await request(app)
        .get('/api/market-data/symbols/missing-prices?hours=48')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: ['AAPL', 'GOOGL'],
        count: 2,
        message: 'Found 2 symbols without recent prices (48h)'
      });

      // Verify SQL query includes the hours parameter
      expect(query).toHaveBeenCalledWith(expect.stringContaining('48 hours'));
    });

    test('should default to 24 hours', async () => {
      const { query } = require('../../config/database');
      query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/market-data/symbols/missing-prices')
        .expect(200);

      expect(query).toHaveBeenCalledWith(expect.stringContaining('24 hours'));
    });
  });

  describe('POST /api/market-data/auto-refresh', () => {
    test('should configure auto-refresh', async () => {
      const response = await request(app)
        .post('/api/market-data/auto-refresh')
        .send({
          enabled: true,
          intervalMinutes: 30
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Auto-refresh configuration updated',
        data: {
          enabled: true,
          intervalMinutes: 30,
          nextRefresh: expect.any(String)
        }
      });
    });

    test('should disable auto-refresh', async () => {
      const response = await request(app)
        .post('/api/market-data/auto-refresh')
        .send({ enabled: false })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Auto-refresh disabled',
        data: { enabled: false }
      });
    });
  });
});
