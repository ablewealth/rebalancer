const { query, getClient } = require('../config/database');

/**
 * Market Data Integration Service
 * Provides real-time and historical market data from multiple providers
 * with intelligent fallback, caching, and rate limiting
 */
class MarketDataService {
  constructor() {
    this.providers = {
      alphavantage: {
        name: 'Alpha Vantage',
        baseUrl: 'https://www.alphavantage.co/query',
        apiKey: process.env.ALPHA_VANTAGE_API_KEY,
        rateLimit: { requests: 25, period: 24 * 60 * 60 * 1000 }, // 25 per day
        lastRequest: 0,
        requestCount: 0,
        resetTime: 0
      },
      finnhub: {
        name: 'Finnhub',
        baseUrl: 'https://finnhub.io/api/v1',
        apiKey: process.env.FINNHUB_API_KEY,
        rateLimit: { requests: 60, period: 60 * 1000 }, // 60 per minute
        lastRequest: 0,
        requestCount: 0,
        resetTime: 0
      },
      polygon: {
        name: 'Polygon.io',
        baseUrl: 'https://api.polygon.io',
        apiKey: process.env.POLYGON_API_KEY,
        rateLimit: { requests: 5, period: 60 * 1000 }, // 5 per minute (free tier)
        lastRequest: 0,
        requestCount: 0,
        resetTime: 0
      }
    };
    
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.fallbackOrder = ['alphavantage', 'finnhub', 'polygon'];
  }

  /**
   * Get current price for a single symbol
   */
  async getPrice(symbol, options = {}) {
    const { forceRefresh = false, provider = null } = options;
    
    // Check cache first
    if (!forceRefresh) {
      const cached = this.getCachedPrice(symbol);
      if (cached) return cached;
    }
    
    const providers = provider ? [provider] : this.fallbackOrder;
    
    for (const providerName of providers) {
      try {
        const price = await this.fetchPriceFromProvider(symbol, providerName);
        if (price) {
          await this.storePriceInDatabase(symbol, price, providerName);
          this.setCachedPrice(symbol, price);
          return price;
        }
      } catch (error) {
        console.warn(`Failed to fetch ${symbol} from ${providerName}:`, error.message);
        continue;
      }
    }
    
    throw new Error(`Unable to fetch price for ${symbol} from any provider`);
  }

  /**
   * Get prices for multiple symbols (batch operation)
   */
  async getPrices(symbols, options = {}) {
    const { forceRefresh = false, maxConcurrent = 5 } = options;
    const results = {};
    const errors = [];
    
    // Process in batches to respect rate limits
    const batches = this.createBatches(symbols, maxConcurrent);
    
    for (const batch of batches) {
      const promises = batch.map(async (symbol) => {
        try {
          const price = await this.getPrice(symbol, { forceRefresh });
          results[symbol] = price;
        } catch (error) {
          errors.push({ symbol, error: error.message });
        }
      });
      
      await Promise.all(promises);
      
      // Add delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(1000);
      }
    }
    
    return { results, errors };
  }

  /**
   * Fetch price from specific provider
   */
  async fetchPriceFromProvider(symbol, providerName) {
    const provider = this.providers[providerName];
    
    if (!provider.apiKey) {
      throw new Error(`No API key configured for ${provider.name}`);
    }
    
    // Check rate limits
    await this.checkRateLimit(providerName);
    
    switch (providerName) {
      case 'alphavantage':
        return await this.fetchFromAlphaVantage(symbol, provider);
      case 'finnhub':
        return await this.fetchFromFinnhub(symbol, provider);
      case 'polygon':
        return await this.fetchFromPolygon(symbol, provider);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Alpha Vantage implementation
   */
  async fetchFromAlphaVantage(symbol, provider) {
    const url = `${provider.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${provider.apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    if (data['Note']) {
      throw new Error('API rate limit exceeded');
    }
    
    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) {
      throw new Error('Invalid response format');
    }
    
    return {
      symbol: symbol.toUpperCase(),
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent'],
      volume: parseInt(quote['06. volume']),
      timestamp: new Date().toISOString(),
      source: 'alphavantage'
    };
  }

  /**
   * Finnhub implementation
   */
  async fetchFromFinnhub(symbol, provider) {
    const url = `${provider.baseUrl}/quote?symbol=${symbol}&token=${provider.apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!data.c) {
      throw new Error('No price data available');
    }
    
    return {
      symbol: symbol.toUpperCase(),
      price: data.c, // current price
      change: data.d, // change
      changePercent: data.dp, // change percent
      high: data.h, // high price of the day
      low: data.l, // low price of the day
      open: data.o, // open price of the day
      previousClose: data.pc, // previous close price
      timestamp: new Date().toISOString(),
      source: 'finnhub'
    };
  }

  /**
   * Polygon.io implementation
   */
  async fetchFromPolygon(symbol, provider) {
    const url = `${provider.baseUrl}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${provider.apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(data.error || 'API request failed');
    }
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No price data available');
    }
    
    const result = data.results[0];
    
    return {
      symbol: symbol.toUpperCase(),
      price: result.c, // close price
      open: result.o, // open price
      high: result.h, // high price
      low: result.l, // low price
      volume: result.v, // volume
      timestamp: new Date(result.t).toISOString(),
      source: 'polygon'
    };
  }

  /**
   * Rate limiting logic
   */
  async checkRateLimit(providerName) {
    const provider = this.providers[providerName];
    const now = Date.now();
    
    // Reset counter if period has passed
    if (now - provider.resetTime > provider.rateLimit.period) {
      provider.requestCount = 0;
      provider.resetTime = now;
    }
    
    // Check if we're at the limit
    if (provider.requestCount >= provider.rateLimit.requests) {
      const waitTime = provider.rateLimit.period - (now - provider.resetTime);
      throw new Error(`Rate limit exceeded for ${provider.name}. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    // Increment counter and update last request time
    provider.requestCount++;
    provider.lastRequest = now;
  }

  /**
   * Cache management
   */
  getCachedPrice(symbol) {
    const cached = this.cache.get(symbol.toUpperCase());
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedPrice(symbol, priceData) {
    this.cache.set(symbol.toUpperCase(), {
      data: priceData,
      timestamp: Date.now()
    });
  }

  /**
   * Database storage
   */
  async storePriceInDatabase(symbol, priceData, source) {
    try {
      await query(`
        INSERT INTO price_history (symbol, price, price_date, source, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        symbol.toUpperCase(),
        priceData.price,
        new Date().toISOString().split('T')[0],
        source,
        JSON.stringify({
          change: priceData.change,
          changePercent: priceData.changePercent,
          volume: priceData.volume,
          high: priceData.high,
          low: priceData.low,
          open: priceData.open,
          previousClose: priceData.previousClose
        })
      ]);
    } catch (error) {
      console.error('Failed to store price in database:', error);
    }
  }

  /**
   * Utility methods
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get provider status and rate limit info
   */
  getProviderStatus() {
    const status = {};
    
    for (const [name, provider] of Object.entries(this.providers)) {
      const now = Date.now();
      const timeSinceReset = now - provider.resetTime;
      const remainingRequests = Math.max(0, provider.rateLimit.requests - provider.requestCount);
      
      status[name] = {
        name: provider.name,
        hasApiKey: !!provider.apiKey,
        requestsRemaining: remainingRequests,
        resetIn: Math.max(0, provider.rateLimit.period - timeSinceReset),
        lastRequest: provider.lastRequest
      };
    }
    
    return status;
  }

  /**
   * Health check for all providers
   */
  async healthCheck() {
    const results = {};
    
    for (const providerName of this.fallbackOrder) {
      try {
        // Test with a common symbol
        await this.fetchPriceFromProvider('AAPL', providerName);
        results[providerName] = { status: 'healthy', error: null };
      } catch (error) {
        results[providerName] = { status: 'error', error: error.message };
      }
    }
    
    return results;
  }
}

module.exports = MarketDataService;
