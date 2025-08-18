import React, { useState, useEffect } from 'react';
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useToast } from './Toast';
import { apiClient } from '../utils/apiClient';

interface ProviderStatus {
  name: string;
  hasApiKey: boolean;
  requestsRemaining: number;
  resetIn: number;
  lastRequest: number;
}

interface MarketDataStatus {
  [key: string]: ProviderStatus;
}

interface PriceData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: string;
  volume?: number;
  timestamp: string;
  source: string;
}

const MarketDataManager: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [status, setStatus] = useState<MarketDataStatus>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [missingSymbols, setMissingSymbols] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  useEffect(() => {
    loadProviderStatus();
    loadMissingSymbols();
  }, []);

  const loadProviderStatus = async () => {
    try {
      const result = await apiClient.get('/api/market-data/status');
      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to load provider status:', error);
    }
  };

  const loadMissingSymbols = async () => {
    try {
      const result = await apiClient.get('/api/market-data/symbols/missing-prices?hours=24');
      if (result.success) {
        setMissingSymbols(result.data);
      }
    } catch (error) {
      console.error('Failed to load missing symbols:', error);
    }
  };

  const refreshPortfolioPrices = async () => {
    setRefreshing(true);
    try {
      const result = await apiClient.post('/api/market-data/refresh-portfolio');
      
      if (result.success) {
        const count = (result as any).count || 0;
        const errorCount = (result as any).errorCount || 0;
        setLastRefresh(new Date().toISOString());
        
        if (errorCount > 0) {
          showWarning(
            'Partial Success',
            `Updated ${count} symbols, ${errorCount} failed. Check provider status.`
          );
        } else {
          showSuccess(
            'Prices Updated',
            `Successfully updated prices for ${count} symbols`
          );
        }
        
        // Reload status and missing symbols
        await loadProviderStatus();
        await loadMissingSymbols();
      } else {
        showError('Update Failed', result.message || 'Failed to update prices');
      }
    } catch (error: any) {
      showError('Update Error', error.message || 'Failed to refresh portfolio prices');
    } finally {
      setRefreshing(false);
    }
  };

  const testSingleSymbol = async (symbol: string) => {
    setLoading(true);
    try {
      const result = await apiClient.get(`/api/market-data/price/${symbol}?forceRefresh=true`);
      
      if (result.success) {
        const price = result.data as PriceData;
        showSuccess(
          'Price Retrieved',
          `${symbol}: $${price.price.toFixed(2)} from ${price.source}`
        );
      } else {
        showError('Price Fetch Failed', result.message || `Failed to get price for ${symbol}`);
      }
    } catch (error: any) {
      showError('Price Error', error.message || `Failed to fetch ${symbol} price`);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds <= 0) return 'Available now';
    
    const seconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const getProviderStatusIcon = (provider: ProviderStatus) => {
    if (!provider.hasApiKey) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
    if (provider.requestsRemaining > 0) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    return <ClockIcon className="h-5 w-5 text-orange-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Market Data Integration</h2>
          <p className="text-gray-600">Real-time price data from multiple providers</p>
        </div>
        <button
          onClick={refreshPortfolioPrices}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh All Prices'}
        </button>
      </div>

      {/* Provider Status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Provider Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(status).map(([key, provider]) => (
              <div key={key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{provider.name}</h4>
                  {getProviderStatusIcon(provider)}
                </div>
                
                {!provider.hasApiKey ? (
                  <p className="text-sm text-yellow-600">No API key configured</p>
                ) : (
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>Requests remaining: {provider.requestsRemaining}</div>
                    <div>Reset in: {formatTimeRemaining(provider.resetIn)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Missing Prices Alert */}
      {missingSymbols.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Missing Price Data
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{missingSymbols.length} symbols don't have recent prices (24h):</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {missingSymbols.slice(0, 10).map(symbol => (
                    <span key={symbol} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      {symbol}
                    </span>
                  ))}
                  {missingSymbols.length > 10 && (
                    <span className="text-xs text-yellow-600">
                      +{missingSymbols.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Test Price Lookup
          </h3>
          <div className="flex space-x-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter symbol (e.g., AAPL, VTI)"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                    if (target.value.trim()) {
                      testSingleSymbol(target.value.trim().toUpperCase());
                    }
                  }
                }}
              />
            </div>
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder*="Enter symbol"]') as HTMLInputElement;
                if (input?.value.trim()) {
                  testSingleSymbol(input.value.trim().toUpperCase());
                }
              }}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              {loading ? 'Testing...' : 'Test'}
            </button>
          </div>
        </div>
      </div>

      {/* Last Refresh Info */}
      {lastRefresh && (
        <div className="bg-gray-50 rounded-md p-4">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">
              Last refresh: {new Date(lastRefresh).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Configuration Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              API Configuration
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>To enable real-time market data, configure API keys in your backend environment:</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li><strong>Alpha Vantage:</strong> Free tier with 25 requests/day</li>
                <li><strong>Finnhub:</strong> Free tier with 60 requests/minute</li>
                <li><strong>Polygon.io:</strong> Free tier with limited requests</li>
              </ul>
              <p className="mt-2">
                Set environment variables: <code className="text-xs bg-blue-100 px-1 rounded">ALPHA_VANTAGE_API_KEY</code>, 
                <code className="text-xs bg-blue-100 px-1 rounded ml-1">FINNHUB_API_KEY</code>, 
                <code className="text-xs bg-blue-100 px-1 rounded ml-1">POLYGON_API_KEY</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDataManager;
