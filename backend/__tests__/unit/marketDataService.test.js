const MarketDataService = require('../../services/marketDataService');

// Mock fetch globally
global.fetch = jest.fn();

// Mock database
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn()
}));

describe('MarketDataService', () => {
  let marketDataService;
  
  beforeEach(() => {
    // Set up environment variables for testing
    process.env.ALPHA_VANTAGE_API_KEY = 'test_alpha_key';
    process.env.FINNHUB_API_KEY = 'test_finnhub_key';
    process.env.POLYGON_API_KEY = 'test_polygon_key';
    
    marketDataService = new MarketDataService();
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Configuration', () => {
    test('should initialize with correct provider configurations', () => {
      expect(marketDataService.providers.alphavantage.apiKey).toBe('test_alpha_key');
      expect(marketDataService.providers.finnhub.apiKey).toBe('test_finnhub_key');
      expect(marketDataService.providers.polygon.apiKey).toBe('test_polygon_key');
    });

    test('should have correct rate limits', () => {
      expect(marketDataService.providers.alphavantage.rateLimit.requests).toBe(25);
      expect(marketDataService.providers.finnhub.rateLimit.requests).toBe(60);
      expect(marketDataService.providers.polygon.rateLimit.requests).toBe(5);
    });
  });

  describe('Alpha Vantage Integration', () => {
    test('should fetch price from Alpha Vantage successfully', async () => {
      const mockResponse = {
        'Global Quote': {
          '01. symbol': 'AAPL',
          '05. price': '150.25',
          '09. change': '2.50',
          '10. change percent': '1.69%',
          '06. volume': '50000000'
        }
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await marketDataService.fetchFromAlphaVantage('AAPL', marketDataService.providers.alphavantage);

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: '1.69%',
        volume: 50000000,
        timestamp: expect.any(String),
        source: 'alphavantage'
      });
    });

    test('should handle Alpha Vantage API errors', async () => {
      const mockResponse = {
        'Error Message': 'Invalid API call'
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      await expect(
        marketDataService.fetchFromAlphaVantage('INVALID', marketDataService.providers.alphavantage)
      ).rejects.toThrow('Invalid API call');
    });

    test('should handle Alpha Vantage rate limit', async () => {
      const mockResponse = {
        'Note': 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute'
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      await expect(
        marketDataService.fetchFromAlphaVantage('AAPL', marketDataService.providers.alphavantage)
      ).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('Finnhub Integration', () => {
    test('should fetch price from Finnhub successfully', async () => {
      const mockResponse = {
        c: 150.25, // current price
        d: 2.50,   // change
        dp: 1.69,  // change percent
        h: 152.00, // high
        l: 148.00, // low
        o: 149.00, // open
        pc: 147.75 // previous close
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await marketDataService.fetchFromFinnhub('AAPL', marketDataService.providers.finnhub);

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        high: 152.00,
        low: 148.00,
        open: 149.00,
        previousClose: 147.75,
        timestamp: expect.any(String),
        source: 'finnhub'
      });
    });

    test('should handle Finnhub API errors', async () => {
      const mockResponse = {
        error: 'You don\'t have access to this resource.'
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      await expect(
        marketDataService.fetchFromFinnhub('AAPL', marketDataService.providers.finnhub)
      ).rejects.toThrow('You don\'t have access to this resource.');
    });
  });

  describe('Polygon.io Integration', () => {
    test('should fetch price from Polygon successfully', async () => {
      const mockResponse = {
        status: 'OK',
        results: [{
          c: 150.25, // close
          o: 149.00, // open
          h: 152.00, // high
          l: 148.00, // low
          v: 50000000, // volume
          t: 1640995200000 // timestamp
        }]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await marketDataService.fetchFromPolygon('AAPL', marketDataService.providers.polygon);

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.25,
        open: 149.00,
        high: 152.00,
        low: 148.00,
        volume: 50000000,
        timestamp: expect.any(String),
        source: 'polygon'
      });
    });

    test('should handle Polygon API errors', async () => {
      const mockResponse = {
        status: 'ERROR',
        error: 'API key not found'
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      await expect(
        marketDataService.fetchFromPolygon('AAPL', marketDataService.providers.polygon)
      ).rejects.toThrow('API key not found');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const provider = marketDataService.providers.alphavantage;
      
      // Simulate hitting the rate limit
      provider.requestCount = provider.rateLimit.requests;
      provider.resetTime = Date.now();

      await expect(
        marketDataService.checkRateLimit('alphavantage')
      ).rejects.toThrow(/Rate limit exceeded/);
    });

    test('should reset rate limit after period', async () => {
      const provider = marketDataService.providers.alphavantage;
      
      // Simulate old reset time
      provider.requestCount = provider.rateLimit.requests;
      provider.resetTime = Date.now() - provider.rateLimit.period - 1000;

      // Should not throw error as period has passed
      await expect(
        marketDataService.checkRateLimit('alphavantage')
      ).resolves.toBeUndefined();

      // Should reset the counter
      expect(provider.requestCount).toBe(1);
    });
  });

  describe('Caching', () => {
    test('should cache price data', async () => {
      const priceData = {
        symbol: 'AAPL',
        price: 150.25,
        timestamp: new Date().toISOString(),
        source: 'test'
      };

      marketDataService.setCachedPrice('AAPL', priceData);
      const cached = marketDataService.getCachedPrice('AAPL');

      expect(cached).toEqual(priceData);
    });

    test('should return null for expired cache', async () => {
      const priceData = {
        symbol: 'AAPL',
        price: 150.25,
        timestamp: new Date().toISOString(),
        source: 'test'
      };

      marketDataService.setCachedPrice('AAPL', priceData);
      
      // Simulate cache expiration
      const cacheEntry = marketDataService.cache.get('AAPL');
      cacheEntry.timestamp = Date.now() - marketDataService.cacheTimeout - 1000;

      const cached = marketDataService.getCachedPrice('AAPL');
      expect(cached).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    test('should create correct batches', () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META'];
      const batches = marketDataService.createBatches(symbols, 3);

      expect(batches).toHaveLength(2);
      expect(batches[0]).toEqual(['AAPL', 'GOOGL', 'MSFT']);
      expect(batches[1]).toEqual(['TSLA', 'AMZN', 'META']);
    });

    test('should handle empty array', () => {
      const batches = marketDataService.createBatches([], 5);
      expect(batches).toEqual([]);
    });
  });

  describe('Provider Status', () => {
    test('should return correct provider status', () => {
      const status = marketDataService.getProviderStatus();

      expect(status).toHaveProperty('alphavantage');
      expect(status).toHaveProperty('finnhub');
      expect(status).toHaveProperty('polygon');

      expect(status.alphavantage).toMatchObject({
        name: 'Alpha Vantage',
        hasApiKey: true,
        requestsRemaining: expect.any(Number),
        resetIn: expect.any(Number)
      });
    });

    test('should show no API key when not configured', () => {
      delete process.env.ALPHA_VANTAGE_API_KEY;
      const newService = new MarketDataService();
      const status = newService.getProviderStatus();

      expect(status.alphavantage.hasApiKey).toBe(false);
    });
  });

  describe('Fallback Logic', () => {
    test('should try fallback providers on failure', async () => {
      // Mock Alpha Vantage to fail
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ 'Error Message': 'API error' })
      });

      // Mock Finnhub to succeed
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          c: 150.25,
          d: 2.50,
          dp: 1.69,
          h: 152.00,
          l: 148.00,
          o: 149.00,
          pc: 147.75
        })
      });

      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({});

      const result = await marketDataService.getPrice('AAPL');

      expect(result.source).toBe('finnhub');
      expect(result.price).toBe(150.25);
    });

    test('should throw error when all providers fail', async () => {
      // Mock all providers to fail
      fetch.mockResolvedValue({
        json: () => Promise.resolve({ error: 'All providers failed' })
      });

      await expect(
        marketDataService.getPrice('INVALID')
      ).rejects.toThrow('Unable to fetch price for INVALID from any provider');
    });
  });
});
