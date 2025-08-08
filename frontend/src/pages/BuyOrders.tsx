import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../components/Toast';
import { apiClient, ApiError } from '../utils/apiClient';

interface ModelPortfolio {
  id: number;
  model_name: string;
  description: string;
  holdings: ModelHolding[];
}

interface ModelHolding {
  symbol: string;
  name: string;
  target_weight: number;
}

interface PriceData {
  symbol: string;
  name: string;
  price: number;
}

interface BuyOrder {
  symbol: string;
  name: string;
  price: number;
  targetPercent: number;
  sharesToBuy: number;
  investmentAmount: number;
  actualPercent: number;
}

const BuyOrders: React.FC = () => {
  const { showWarning, showError, showSuccess, showInfo } = useToast();
  const [clientName, setClientName] = useState('');
  const [custodian, setCustodian] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [cashAvailable, setCashAvailable] = useState<number>(0);
  const [cashReservePercent, setCashReservePercent] = useState<number>(1.0);
  const [cashReserveDollar, setCashReserveDollar] = useState<number>(0);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [models, setModels] = useState<ModelPortfolio[]>([]);
  const [buyOrders, setBuyOrders] = useState<BuyOrder[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<Map<string, PriceData>>(new Map());

  useEffect(() => {
    fetchModels();
    checkForTransferredData();
    loadPriceData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkForTransferredData = () => {
    try {
      const transferData = localStorage.getItem('taxHarvestingTransfer');
      if (transferData) {
        const data = JSON.parse(transferData);
        
        if (data.cashFromSales > 0) {
          // Set all financial data
          setCashAvailable(data.cashFromSales);
          
          // Set account information
          setClientName(data.clientName || '');
          setCustodian(data.custodian || '');
          setAccountNumber(data.accountNumber || '');
          
          // Store comprehensive context for reference
          const context = {
            taxHarvestingData: {
              targetST: data.targetST,
              targetLT: data.targetLT,
              realizedST: data.realizedST,
              realizedLT: data.realizedLT,
              actualST: data.actualST,
              actualLT: data.actualLT,
              cashMaximizationMode: data.cashMaximizationMode,
              portfolioDataSize: data.portfolioDataSize,
              recommendations: data.recommendations,
              summary: data.summary,
              transferId: data.transferId,
              timestamp: data.timestamp
            }
          };
          
          // Store context in component state for use throughout Buy Orders
          sessionStorage.setItem('buyOrdersContext', JSON.stringify(context));
          
          // Enhanced success message with more detail
          showSuccess(
            'Tax Harvesting Portfolio Loaded',
            `$${data.cashFromSales.toLocaleString()} from ${data.recommendations?.length || 0} sales. ` +
            `Tax gains: ST $${(data.actualST || 0).toLocaleString()}, LT $${(data.actualLT || 0).toLocaleString()}. ` +
            `${data.cashMaximizationMode ? 'Cash Maximization' : 'Target Precision'} mode.`
          );
          
          // Clear the transfer data after successful load
          localStorage.removeItem('taxHarvestingTransfer');
        }
      }
      
      // Also check for persistent session data on page refreshes
      const sessionData = sessionStorage.getItem('taxHarvestingSession');
      if (sessionData && !transferData) {
        const session = JSON.parse(sessionData);
        setClientName(session.clientName || '');
        setCustodian(session.custodian || '');
        setAccountNumber(session.accountNumber || '');
        
        showInfo(
          'Previous Session Restored',
          `Client data restored. Last transfer: $${session.lastTransferAmount?.toLocaleString() || 0} ` +
          `on ${new Date(session.lastTransferDate).toLocaleDateString()}`
        );
      }
      
    } catch (error) {
      console.error('Error loading transfer data:', error);
      showError('Data Load Error', 'Failed to load tax harvesting transfer data');
    }
  };

  const loadPriceData = async () => {
    try {
      // First try to load from dedicated prices endpoint
      const pricesResult = await apiClient.get('/api/prices');
      const priceMap = new Map<string, PriceData>();
      
      if (pricesResult.success && pricesResult.data) {
        pricesResult.data.forEach((price: any) => {
          const symbolKey = price.symbol.toUpperCase();
          const priceValue = price.price || 0;
          priceMap.set(symbolKey, {
            symbol: symbolKey,
            name: price.name || price.symbol,
            price: priceValue
          });
        });
      }

      // Also scan models to get symbols that might not have prices yet
      // This ensures we know about all symbols even if they don't have prices
      const modelsResult = await apiClient.get('/api/models');
      if (modelsResult.success && modelsResult.data) {
        modelsResult.data.forEach((model: any) => {
          if (model.holdings) {
            model.holdings.forEach((holding: any) => {
              const symbol = holding.symbol?.toUpperCase();
              if (symbol && !priceMap.has(symbol)) {
                // Add symbol with zero price - user will need to set price
                priceMap.set(symbol, {
                  symbol,
                  name: holding.name || symbol,
                  price: 0
                });
              }
            });
          }
        });
      }

      setPriceData(priceMap);
    } catch (error) {
      console.error('Error loading price data:', error);
      // Continue without prices - user will need to set them manually
    }
  };

  const fetchModels = async () => {
    try {
      setError(null);
      const result = await apiClient.get<ModelPortfolio[]>('/api/models');
      
      if (result.success && result.data) {
        setModels(result.data);
      } else {
        const errorMsg = result.error || 'Failed to fetch models';
        setError(errorMsg);
        showError('Failed to Load Models', errorMsg);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to connect to server';
      setError(errorMessage);
      showError('Connection Error', errorMessage);
      console.error('Error fetching models:', err);
    }
  };

  const generateBuyOrders = async () => {
    if (!selectedModelId || cashAvailable <= 0) {
      showWarning('Missing Information', 'Please select a model portfolio and enter available cash');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const selectedModel = models.find(m => m.id === parseInt(selectedModelId));
      if (!selectedModel) {
        throw new Error('Selected model not found');
      }

      // Calculate cash to invest
      const reserveFromPercent = cashAvailable * (cashReservePercent / 100);
      const totalReserve = reserveFromPercent + cashReserveDollar;
      const cashToInvest = Math.max(0, cashAvailable - totalReserve);

      if (cashToInvest <= 0) {
        throw new Error('No cash available to invest after reserves');
      }

      // Generate buy orders using pricing data
      const orders: BuyOrder[] = [];
      const missingPrices: string[] = [];

      for (const holding of selectedModel.holdings) {
        // Get price from price data
        const priceInfo = priceData.get(holding.symbol.toUpperCase());
        const price = priceInfo?.price || 0;

        if (price <= 0) {
          missingPrices.push(holding.symbol);
          continue;
        }

        const targetAmount = cashToInvest * holding.target_weight;
        // Ensure whole number of shares only
        const sharesToBuy = Math.floor(targetAmount / price);
        const actualInvestment = sharesToBuy * price;
        const actualPercent = cashToInvest > 0 ? (actualInvestment / cashToInvest) : 0;

        if (sharesToBuy > 0) {
          orders.push({
            symbol: holding.symbol,
            name: holding.name,
            price: price,
            targetPercent: holding.target_weight * 100,
            sharesToBuy,
            investmentAmount: actualInvestment,
            actualPercent: actualPercent * 100
          });
        }
      }

      if (missingPrices.length > 0) {
        showWarning(
          'Missing Prices', 
          `No prices found for: ${missingPrices.join(', ')}. Please update prices in Price Manager.`
        );
      }

      setBuyOrders(orders);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate buy orders');
      console.error('Error generating buy orders:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportCSV = () => {
    if (buyOrders.length === 0) return;

    const csvContent = [
      ['Action', 'Symbol', 'Name', 'Price', 'Target %', 'Shares to Buy', 'Investment Amount', 'Actual %'].join(','),
      ...buyOrders.map(order => [
        'BUY',
        order.symbol,
        order.name,
        order.price.toFixed(2),
        order.targetPercent.toFixed(2),
        order.sharesToBuy,
        order.investmentAmount.toFixed(2),
        order.actualPercent.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buy-orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const totalInvestment = buyOrders.reduce((sum, order) => sum + order.investmentAmount, 0);
  const cashReserved = cashAvailable * (cashReservePercent / 100) + cashReserveDollar;
  const cashRemaining = cashAvailable - totalInvestment - cashReserved;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Portfolio Rebalancing - Buy Orders
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Generate buy orders to invest cash from sell orders into your target portfolio allocation.
        </p>
      </div>

      {/* Tax Harvesting Context */}
      {(() => {
        try {
          const contextData = sessionStorage.getItem('buyOrdersContext');
          if (contextData) {
            const context = JSON.parse(contextData);
            const thData = context.taxHarvestingData;
            if (thData) {
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium text-blue-900 mb-2">Tax Harvesting Portfolio Active</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                        <div>
                          <p className="font-medium">Proceeds Available</p>
                          <p>${cashAvailable.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="font-medium">Tax Gains Realized</p>
                          <p>ST: ${(thData.actualST || 0).toLocaleString()}</p>
                          <p>LT: ${(thData.actualLT || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="font-medium">Strategy Used</p>
                          <p>{thData.cashMaximizationMode ? 'Cash Maximization' : 'Target Precision'}</p>
                          <p className="text-xs text-blue-600 mt-1">
                            {thData.recommendations?.length || 0} positions sold
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          }
        } catch (error) {
          console.error('Error displaying tax harvesting context:', error);
        }
        return null;
      })()}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-red-800">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-3">1. Portfolio Setup</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
                Client Name
              </label>
              <input
                type="text"
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="John Doe"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label htmlFor="custodian" className="block text-sm font-medium text-gray-700">
                Custodian
              </label>
              <input
                type="text"
                id="custodian"
                value={custodian}
                onChange={(e) => setCustodian(e.target.value)}
                placeholder="Fidelity"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
              Account Number
            </label>
            <input
              type="text"
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter Account Number"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="cashAvailable" className="block text-sm font-medium text-gray-700">
              Total Cash Available
            </label>
            <input
              type="number"
              id="cashAvailable"
              value={cashAvailable}
              onChange={(e) => setCashAvailable(parseFloat(e.target.value) || 0)}
              placeholder="50000.00"
              step="0.01"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            />
            <p className="text-xs text-gray-500 mt-1">Total cash from sell orders or available for investment</p>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Cash Management</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cashReservePercent" className="block text-sm font-medium text-gray-700">
                  Portfolio Cash Allocation % <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    id="cashReservePercent"
                    value={cashReservePercent}
                    onChange={(e) => setCashReservePercent(parseFloat(e.target.value) || 0)}
                    placeholder="1.0"
                    step="0.1"
                    min="0"
                    max="50"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 pr-8 border"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Required: % of total cash to allocate to cash position</p>
              </div>
              <div>
                <label htmlFor="cashReserveDollar" className="block text-sm font-medium text-gray-700">
                  Additional Fixed Reserve (Optional)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="cashReserveDollar"
                    value={cashReserveDollar}
                    onChange={(e) => setCashReserveDollar(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="100"
                    min="0"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 pl-7 border"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Optional: Additional fixed dollar amount to reserve</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Total cash reserved = Portfolio Cash Allocation % + Additional Fixed Reserve</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="portfolioSelect" className="block text-sm font-medium text-gray-700">
                Select Model Portfolio
              </label>
              <button
                onClick={fetchModels}
                className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 flex items-center"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Refresh
              </button>
            </div>
            <select
              id="portfolioSelect"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            >
              <option value="">Select a model portfolio...</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.model_name} ({model.holdings?.length || 0} holdings)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Generate Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-3">2. Generate Buy Orders</h2>
          <p className="text-sm text-gray-600 mb-4">
            The system will calculate whole share quantities based on your target allocation percentages.
          </p>
          
          {/* Cash Summary */}
          {cashAvailable > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Cash Allocation Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Available:</span>
                  <span className="font-medium">{formatCurrency(cashAvailable)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Cash Reserve ({cashReservePercent}%):</span>
                  <span>{formatCurrency(cashAvailable * (cashReservePercent / 100))}</span>
                </div>
                {cashReserveDollar > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Fixed Reserve:</span>
                    <span>{formatCurrency(cashReserveDollar)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1">
                  <span>Available to Invest:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(Math.max(0, cashAvailable - cashReserved))}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col space-y-4">
            <button
              onClick={generateBuyOrders}
              disabled={isGenerating || !selectedModelId || cashAvailable <= 0}
              className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md flex items-center justify-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Buy Orders'}
            </button>

            {buyOrders.length > 0 && (
              <button
                onClick={exportCSV}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md flex items-center justify-center"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export Buy Orders CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {buyOrders.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-3">3. Recommended Buy Orders</h2>
          
          {/* Summary */}
          <div className="mb-6 p-4 bg-gray-100 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvestment)}</div>
              <div className="text-sm text-gray-600">Total Investment</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{buyOrders.length}</div>
              <div className="text-sm text-gray-600">Buy Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(cashRemaining)}</div>
              <div className="text-sm text-gray-600">Cash Remaining</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target %
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shares to Buy
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investment Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {buyOrders.map((order, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        BUY
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.symbol}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {order.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(order.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {order.targetPercent.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {order.sharesToBuy.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(order.investmentAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`font-medium ${
                        Math.abs(order.actualPercent - order.targetPercent) <= 1 
                          ? 'text-green-600' 
                          : 'text-yellow-600'
                      }`}>
                        {order.actualPercent.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {cashRemaining > 100 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Cash Remaining</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    {formatCurrency(cashRemaining)} remains uninvested due to whole share requirements. 
                    Consider adjusting your model or cash allocation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BuyOrders;