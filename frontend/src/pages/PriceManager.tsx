import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  ArrowPathIcon, 
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../components/Toast';
import { apiClient } from '../utils/apiClient';

interface SymbolPrice {
  symbol: string;
  name: string;
  price: number;
  models: string[];
  lastUpdated: string;
}

const PriceManager: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [symbolPrices, setSymbolPrices] = useState<SymbolPrice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    scanModels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scanModels = async () => {
    setLoading(true);
    try {
      // First load existing prices from the backend prices API
      const symbolMap = new Map<string, SymbolPrice>();
      
      try {
        const pricesResult = await apiClient.get('/api/prices');
        if (pricesResult.success && pricesResult.data) {
          pricesResult.data.forEach((price: any) => {
            const symbol = price.symbol?.toUpperCase();
            if (symbol) {
              symbolMap.set(symbol, {
                symbol,
                name: price.name || symbol,
                price: price.price || 0,
                models: [], // Will be populated from models
                lastUpdated: price.price_date ? `${price.price_date}T00:00:00.000Z` : new Date().toISOString()
              });
            }
          });
        }
      } catch (error) {
        console.warn('Could not load existing prices:', error);
      }
      
      // Get all model portfolios from backend to discover symbols and associate with models
      const result = await apiClient.get('/api/models');
      
      if (result.success && result.data) {
        // Process each model to extract symbols and associate with models
        result.data.forEach((model: any) => {
          if (model.holdings) {
            model.holdings.forEach((holding: any) => {
              const symbol = holding.symbol?.toUpperCase();
              if (symbol) {
                if (symbolMap.has(symbol)) {
                  // Add this model to the existing symbol's model list
                  const existing = symbolMap.get(symbol)!;
                  existing.models.push(model.model_name);
                } else {
                  // Create new symbol entry with zero price (will need to be set)
                  symbolMap.set(symbol, {
                    symbol,
                    name: holding.name || symbol,
                    price: 0, // No price available yet
                    models: [model.model_name],
                    lastUpdated: new Date().toISOString()
                  });
                }
              }
            });
          }
        });

        const symbols = Array.from(symbolMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
        setSymbolPrices(symbols);
        
        showSuccess(
          'Scan Complete',
          `Found ${symbols.length} unique symbols from ${result.data.length} models`
        );
      } else {
        showError('Scan Failed', 'Failed to load model portfolios');
      }
    } catch (error) {
      showError('Scan Error', 'Failed to scan model portfolios');
      console.error('Error scanning models:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePrice = async (symbol: string, field: 'price' | 'name', value: string | number) => {
    // Update local state immediately for responsive UI
    const updatedPrices = symbolPrices.map(item => 
      item.symbol === symbol 
        ? { ...item, [field]: value, lastUpdated: new Date().toISOString() }
        : item
    );
    setSymbolPrices(updatedPrices);

    // Save to backend (debounced to avoid too many API calls)
    try {
      const updatedItem = updatedPrices.find(item => item.symbol === symbol);
      if (updatedItem && field === 'price') {
        // Only save price changes to backend, not name changes
        await apiClient.post('/api/prices', {
          prices: [{
            symbol: updatedItem.symbol,
            price: updatedItem.price,
            name: updatedItem.name
          }]
        });
        showSuccess('Price Saved', `${symbol} price updated to $${updatedItem.price}`);
      }
    } catch (error) {
      console.error('Error saving price to backend:', error);
      showError('Save Error', 'Failed to save price change');
    }
  };

  const exportPricesCSV = () => {
    if (symbolPrices.length === 0) {
      showWarning('No Data', 'No symbols to export. Please scan models first.');
      return;
    }

    const csvHeader = 'Symbol,Name,Price,Models,Last Updated\n';
    const csvData = symbolPrices.map(item => 
      `${item.symbol},"${item.name}",${item.price},"${item.models.join('; ')}",${item.lastUpdated}`
    ).join('\n');

    const csvContent = csvHeader + csvData;
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `symbol_prices_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    showSuccess('Export Complete', `Exported ${symbolPrices.length} symbol prices`);
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
          showError('Import Error', 'CSV must have at least a header row and one data row');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const symbolIndex = headers.indexOf('symbol');
        const priceIndex = headers.indexOf('price');

        if (symbolIndex === -1 || priceIndex === -1) {
          showError('Import Error', 'CSV must have Symbol and Price columns');
          return;
        }

        let updatedCount = 0;
        const updatedPrices = [...symbolPrices];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          const symbol = values[symbolIndex]?.toUpperCase();
          const price = parseFloat(values[priceIndex]) || 0;

          if (symbol && price > 0) {
            const existingIndex = updatedPrices.findIndex(item => item.symbol === symbol);
            if (existingIndex !== -1) {
              updatedPrices[existingIndex].price = price;
              updatedPrices[existingIndex].lastUpdated = new Date().toISOString();
              updatedCount++;
            }
          }
        }

        setSymbolPrices(updatedPrices);
        
        // Save updated prices to backend
        if (updatedCount > 0) {
          const pricesForBackend = updatedPrices
            .filter(item => item.price > 0)
            .map(item => ({
              symbol: item.symbol,
              price: item.price,
              name: item.name
            }));
          
          apiClient.post('/api/prices', { prices: pricesForBackend })
            .then(() => {
              showSuccess('Import Complete', `Updated and saved ${updatedCount} prices to backend`);
            })
            .catch(() => {
              showWarning('Import Partial', `Updated ${updatedCount} prices locally, but failed to save to backend`);
            });
        } else {
          showSuccess('Import Complete', `Updated prices for ${updatedCount} symbols`);
        }
      } catch (error) {
        showError('Import Error', 'Failed to parse CSV file');
        console.error('CSV import error:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Price Manager
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Centralized symbol pricing for all model portfolios. Update prices here to sync across all models.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1">
            <div className="flex gap-4">
              <button
                onClick={scanModels}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Scanning...' : 'Scan All Models'}
              </button>
              <button
                onClick={exportPricesCSV}
                disabled={symbolPrices.length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export CSV
              </button>
              <label className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
                <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {symbolPrices.length} symbols loaded
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">How Price Manager Works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click "Scan All Models" to discover symbols from all model portfolios</li>
              <li>Edit prices directly in the table - changes are saved automatically</li>
              <li>Updated prices will be used when generating buy orders</li>
              <li>Export prices to CSV for backup or bulk editing</li>
              <li>Import updated prices from CSV files</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Price Table */}
      {symbolPrices.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Used in Models
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {symbolPrices.map((item, index) => (
                  <tr key={item.symbol} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{item.symbol}</span>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updatePrice(item.symbol, 'name', e.target.value)}
                        className="w-full px-2 py-1 text-sm text-gray-900 bg-gray-50 border border-transparent rounded hover:bg-gray-100 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end">
                        <span className="text-sm text-gray-500 mr-1">$</span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updatePrice(item.symbol, 'price', parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min="0"
                          className="w-24 px-2 py-1 text-sm text-gray-900 bg-gray-50 border border-transparent rounded text-right hover:bg-gray-100 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span 
                        className="text-xs text-gray-500 cursor-help" 
                        title={item.models.join(', ')}
                      >
                        {item.models.length} models
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-gray-500">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl shadow-md border border-gray-200 text-center">
          <CurrencyDollarIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Symbols Found</h2>
          <p className="text-gray-600 mb-6">
            Click "Scan All Models" to discover symbols from your model portfolios.
          </p>
        </div>
      )}
    </div>
  );
};

export default PriceManager;