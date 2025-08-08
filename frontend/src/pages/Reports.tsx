import React, { useState, useEffect } from 'react';
import { 
  DocumentChartBarIcon,
  ChartPieIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../components/Toast';
import { apiClient } from '../utils/apiClient';

interface ReportData {
  taxHarvesting: {
    summary: any;
    recommendations: any[];
    metadata: any;
    optimizationVerification: any;
  } | null;
  modelPortfolios: any[];
  buyOrders: any[];
  priceData: any[];
  systemMetrics: {
    totalModels: number;
    totalSymbols: number;
    lastUpdate: string;
    systemHealth: 'healthy' | 'warning' | 'error';
  };
}

interface PortfolioMetrics {
  totalValue: number;
  concentration: {
    topHolding: string;
    topWeight: number;
    diversificationScore: number;
  };
  coverage: {
    symbolsWithPrices: number;
    totalSymbols: number;
    coveragePercent: number;
  };
  efficiency: {
    avgWeight: number;
    balanceScore: number;
  };
}

const Reports: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [reportData, setReportData] = useState<ReportData>({
    taxHarvesting: null,
    modelPortfolios: [],
    buyOrders: [],
    priceData: [],
    systemMetrics: {
      totalModels: 0,
      totalSymbols: 0,
      lastUpdate: new Date().toISOString(),
      systemHealth: 'healthy'
    }
  });
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tax-harvesting' | 'portfolios' | 'performance'>('overview');

  useEffect(() => {
    loadReportData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Load data from all system components
      const [modelsResponse, pricesResponse] = await Promise.all([
        apiClient.get('/api/models'),
        apiClient.get('/api/prices')
      ]);

      // Check for stored tax harvesting data
      const taxHarvestingData = (() => {
        try {
          const stored = sessionStorage.getItem('buyOrdersContext');
          if (stored) {
            const context = JSON.parse(stored);
            return context.taxHarvestingData;
          }
          return null;
        } catch {
          return null;
        }
      })();

      // Calculate portfolio metrics
      const models = modelsResponse.success ? modelsResponse.data : [];
      const prices = pricesResponse.success ? pricesResponse.data : [];
      
      const metrics = calculatePortfolioMetrics(models, prices);
      setPortfolioMetrics(metrics);

      // Update report data
      setReportData({
        taxHarvesting: taxHarvestingData,
        modelPortfolios: models,
        buyOrders: [], // Could be loaded from localStorage if available
        priceData: prices,
        systemMetrics: {
          totalModels: models.length,
          totalSymbols: prices.length,
          lastUpdate: new Date().toISOString(),
          systemHealth: prices.length > 0 ? 'healthy' : 'warning'
        }
      });

      showSuccess('Reports Loaded', `Generated analytics for ${models.length} models and ${prices.length} prices`);
    } catch (error) {
      console.error('Error loading report data:', error);
      showError('Load Error', 'Failed to load some report data');
    } finally {
      setLoading(false);
    }
  };

  const calculatePortfolioMetrics = (models: any[], prices: any[]): PortfolioMetrics => {
    if (models.length === 0) {
      return {
        totalValue: 0,
        concentration: { topHolding: 'N/A', topWeight: 0, diversificationScore: 0 },
        coverage: { symbolsWithPrices: 0, totalSymbols: 0, coveragePercent: 0 },
        efficiency: { avgWeight: 0, balanceScore: 0 }
      };
    }

    // Aggregate all holdings across models
    const symbolMap = new Map<string, { weight: number; count: number; totalValue: number }>();

    models.forEach(model => {
      if (model.holdings) {
        model.holdings.forEach((holding: any) => {
          const symbol = holding.symbol?.toUpperCase();
          if (symbol) {
            const existing = symbolMap.get(symbol) || { weight: 0, count: 0, totalValue: 0 };
            const price = prices.find(p => p.symbol?.toUpperCase() === symbol)?.price || 0;
            const value = holding.target_weight * price * 100; // Estimated value
            
            symbolMap.set(symbol, {
              weight: existing.weight + holding.target_weight,
              count: existing.count + 1,
              totalValue: existing.totalValue + value
            });
          }
        });
      }
    });

    // Calculate metrics
    const symbols = Array.from(symbolMap.entries());
    const totalValue = symbols.reduce((sum, [_, data]) => sum + data.totalValue, 0);
    
    // Find top holding
    const topHolding = symbols.reduce((max, [symbol, data]) => 
      data.weight > max.weight ? { symbol, weight: data.weight } : max,
      { symbol: 'N/A', weight: 0 }
    );

    // Calculate diversification score (lower concentration = higher score)
    const weights = symbols.map(([_, data]) => data.weight);
    const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
    const variance = weights.length > 0 ? weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length : 0;
    const diversificationScore = Math.max(0, 100 - Math.sqrt(variance) * 100);

    // Price coverage
    const symbolsWithPrices = symbols.filter(([symbol]) => 
      prices.some(p => p.symbol?.toUpperCase() === symbol)
    ).length;

    return {
      totalValue,
      concentration: {
        topHolding: topHolding.symbol,
        topWeight: topHolding.weight,
        diversificationScore
      },
      coverage: {
        symbolsWithPrices,
        totalSymbols: symbols.length,
        coveragePercent: symbols.length > 0 ? (symbolsWithPrices / symbols.length) * 100 : 0
      },
      efficiency: {
        avgWeight,
        balanceScore: diversificationScore
      }
    };
  };

  const exportReportData = () => {
    const exportData = {
      generatedAt: new Date().toISOString(),
      systemMetrics: reportData.systemMetrics,
      portfolioMetrics,
      taxHarvesting: reportData.taxHarvesting,
      modelPortfolios: reportData.modelPortfolios.length,
      priceData: reportData.priceData.length
    };

    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rebalancer_report_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showSuccess('Report Exported', 'Report data exported successfully');
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center">
            <ChartPieIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Model Portfolios</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.systemMetrics.totalModels}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Price Coverage</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.systemMetrics.totalSymbols}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${portfolioMetrics?.totalValue.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center">
            {reportData.systemMetrics.systemHealth === 'healthy' ? (
              <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
            ) : (
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600 mr-3" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-600">System Health</p>
              <p className="text-lg font-bold text-gray-900 capitalize">
                {reportData.systemMetrics.systemHealth}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Analysis */}
      {portfolioMetrics && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-2" />
            Portfolio Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Concentration Analysis</h4>
              <p className="text-sm text-gray-600">Top Holding: <span className="font-medium">{portfolioMetrics.concentration.topHolding}</span></p>
              <p className="text-sm text-gray-600">Weight: <span className="font-medium">{(portfolioMetrics.concentration.topWeight * 100).toFixed(1)}%</span></p>
              <p className="text-sm text-gray-600">Diversification Score: <span className="font-medium">{portfolioMetrics.concentration.diversificationScore.toFixed(0)}/100</span></p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Price Coverage</h4>
              <p className="text-sm text-gray-600">Symbols with Prices: <span className="font-medium">{portfolioMetrics.coverage.symbolsWithPrices}</span></p>
              <p className="text-sm text-gray-600">Total Symbols: <span className="font-medium">{portfolioMetrics.coverage.totalSymbols}</span></p>
              <p className="text-sm text-gray-600">Coverage: <span className="font-medium">{portfolioMetrics.coverage.coveragePercent.toFixed(1)}%</span></p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Efficiency Metrics</h4>
              <p className="text-sm text-gray-600">Avg Weight: <span className="font-medium">{(portfolioMetrics.efficiency.avgWeight * 100).toFixed(1)}%</span></p>
              <p className="text-sm text-gray-600">Balance Score: <span className="font-medium">{portfolioMetrics.efficiency.balanceScore.toFixed(0)}/100</span></p>
              <p className="text-sm text-gray-600">Models: <span className="font-medium">{reportData.modelPortfolios.length}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Tax Harvesting Summary */}
      {reportData.taxHarvesting && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <BanknotesIcon className="h-6 w-6 mr-2" />
            Recent Tax Harvesting Activity
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-700">Cash Generated</p>
              <p className="text-xl font-bold text-green-900">
                ${(reportData.taxHarvesting.summary?.totalProceeds || 0).toLocaleString()}
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Short-Term Gains</p>
              <p className="text-xl font-bold text-blue-900">
                ${(reportData.taxHarvesting.summary?.actualST || 0).toLocaleString()}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-700">Long-Term Gains</p>
              <p className="text-xl font-bold text-purple-900">
                ${(reportData.taxHarvesting.summary?.actualLT || 0).toLocaleString()}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Positions Sold</p>
              <p className="text-xl font-bold text-gray-900">
                {reportData.taxHarvesting.recommendations?.length || 0}
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <InformationCircleIcon className="h-4 w-4 inline mr-1" />
              Strategy: {reportData.taxHarvesting.summary?.cashMaximizationMode ? 'Cash Maximization' : 'Target Precision'} | 
              Portfolio Size: {reportData.taxHarvesting.metadata?.availableLots || 0} lots | 
              Generated: {reportData.taxHarvesting.metadata?.timestamp ? new Date(reportData.taxHarvesting.metadata.timestamp).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderTaxHarvestingTab = () => (
    <div className="space-y-6">
      {reportData.taxHarvesting ? (
        <>
          {/* Performance Metrics */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Tax Harvesting Performance</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Target vs Actual Results</h4>
                {reportData.taxHarvesting.summary && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Short-Term Target:</span>
                      <span className="font-medium">${(reportData.taxHarvesting.summary.targetST || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Short-Term Actual:</span>
                      <span className="font-medium">${(reportData.taxHarvesting.summary.actualST || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Long-Term Target:</span>
                      <span className="font-medium">${(reportData.taxHarvesting.summary.targetLT || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Long-Term Actual:</span>
                      <span className="font-medium">${(reportData.taxHarvesting.summary.actualLT || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Efficiency Analysis</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Cash Generated:</span>
                    <span className="font-medium text-green-600">
                      ${(reportData.taxHarvesting.summary?.totalProceeds || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Positions Selected:</span>
                    <span className="font-medium">{reportData.taxHarvesting.recommendations?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Proceeds/Position:</span>
                    <span className="font-medium">
                      ${reportData.taxHarvesting.recommendations?.length > 0 
                        ? Math.round((reportData.taxHarvesting.summary?.totalProceeds || 0) / reportData.taxHarvesting.recommendations.length).toLocaleString()
                        : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Strategy Used:</span>
                    <span className="font-medium">
                      {reportData.taxHarvesting.summary?.cashMaximizationMode ? 'Cash Max' : 'Target Precision'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations Table */}
          {reportData.taxHarvesting.recommendations && reportData.taxHarvesting.recommendations.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Generated Recommendations</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Proceeds</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gain</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.taxHarvesting.recommendations.slice(0, 10).map((rec: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{rec.symbol}</div>
                          <div className="text-sm text-gray-500">{rec.name || rec.symbol}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rec.sharesToSell?.toLocaleString() || rec.quantity?.toLocaleString() || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ${(rec.proceeds || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ${(rec.actualGain || rec.unrealizedGain || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            rec.term === 'Short' || rec.term === 'Short Term' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {rec.term || 'Long'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {reportData.taxHarvesting.recommendations.length > 10 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      Showing 10 of {reportData.taxHarvesting.recommendations.length} recommendations
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white p-12 rounded-xl shadow-md border border-gray-200 text-center">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tax Harvesting Data</h3>
          <p className="text-gray-600 mb-6">
            No recent tax harvesting calculations found. Run a tax harvesting analysis to see performance reports here.
          </p>
        </div>
      )}
    </div>
  );

  const renderPortfoliosTab = () => (
    <div className="space-y-6">
      {reportData.modelPortfolios.length > 0 ? (
        <>
          {/* Portfolio Summary */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Portfolio Summary</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reportData.modelPortfolios.map((portfolio, index) => (
                <div key={portfolio.id || index} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{portfolio.model_name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{portfolio.description}</p>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Holdings:</span>
                      <span className="font-medium">{portfolio.holdings?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Weight:</span>
                      <span className="font-medium">
                        {portfolio.holdings 
                          ? (portfolio.holdings.reduce((sum: number, h: any) => sum + (h.target_weight || 0), 0) * 100).toFixed(1)
                          : '0'}%
                      </span>
                    </div>
                    {portfolio.last_updated && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Updated:</span>
                        <span className="font-medium text-xs">
                          {new Date(portfolio.last_updated).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Holdings Analysis */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Holdings Analysis</h3>
            
            {(() => {
              // Aggregate holdings across all portfolios
              const holdingsMap = new Map<string, { weight: number; models: string[]; hasPrice: boolean }>();
              
              reportData.modelPortfolios.forEach(portfolio => {
                if (portfolio.holdings) {
                  portfolio.holdings.forEach((holding: any) => {
                    const symbol = holding.symbol?.toUpperCase();
                    if (symbol) {
                      const existing = holdingsMap.get(symbol) || { weight: 0, models: [], hasPrice: false };
                      existing.weight += holding.target_weight || 0;
                      if (!existing.models.includes(portfolio.model_name)) {
                        existing.models.push(portfolio.model_name);
                      }
                      existing.hasPrice = reportData.priceData.some(p => p.symbol?.toUpperCase() === symbol);
                      holdingsMap.set(symbol, existing);
                    }
                  });
                }
              });

              const holdings = Array.from(holdingsMap.entries())
                .map(([symbol, data]) => ({ symbol, ...data }))
                .sort((a, b) => b.weight - a.weight);

              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Weight</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Models</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Price Data</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {holdings.slice(0, 20).map((holding, index) => (
                        <tr key={holding.symbol} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{holding.symbol}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {(holding.weight * 100).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {holding.models.length}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {holding.hasPrice ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {holdings.length > 20 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Showing 20 of {holdings.length} unique holdings
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      ) : (
        <div className="bg-white p-12 rounded-xl shadow-md border border-gray-200 text-center">
          <ChartPieIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Portfolio Data</h3>
          <p className="text-gray-600 mb-6">
            No model portfolios found. Create some model portfolios to see analysis here.
          </p>
        </div>
      )}
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* System Performance Metrics */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">System Performance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-700">System Status</p>
                <p className="text-lg font-bold text-green-900 capitalize">
                  {reportData.systemMetrics.systemHealth}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-6 w-6 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-700">Last Updated</p>
                <p className="text-sm font-bold text-blue-900">
                  {new Date(reportData.systemMetrics.lastUpdate).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ScaleIcon className="h-6 w-6 text-purple-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-purple-700">Data Quality</p>
                <p className="text-lg font-bold text-purple-900">
                  {portfolioMetrics ? `${portfolioMetrics.coverage.coveragePercent.toFixed(0)}%` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DocumentChartBarIcon className="h-6 w-6 text-gray-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-700">Total Records</p>
                <p className="text-lg font-bold text-gray-900">
                  {reportData.systemMetrics.totalModels + reportData.systemMetrics.totalSymbols}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality Assessment */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Data Quality Assessment</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <ChartPieIcon className="h-5 w-5 text-blue-600 mr-3" />
              <span className="font-medium">Model Portfolio Coverage</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">{reportData.systemMetrics.totalModels} models</span>
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 text-green-600 mr-3" />
              <span className="font-medium">Price Data Coverage</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">
                {portfolioMetrics 
                  ? `${portfolioMetrics.coverage.symbolsWithPrices}/${portfolioMetrics.coverage.totalSymbols} symbols`
                  : 'N/A'}
              </span>
              {portfolioMetrics && portfolioMetrics.coverage.coveragePercent > 80 ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <BanknotesIcon className="h-5 w-5 text-purple-600 mr-3" />
              <span className="font-medium">Tax Harvesting Data</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">
                {reportData.taxHarvesting ? 'Available' : 'No recent data'}
              </span>
              {reportData.taxHarvesting ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">System Recommendations</h3>
        
        <div className="space-y-3">
          {portfolioMetrics && portfolioMetrics.coverage.coveragePercent < 80 && (
            <div className="flex items-start p-4 bg-yellow-50 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">Incomplete Price Coverage</p>
                <p className="text-sm text-yellow-700">
                  {portfolioMetrics.coverage.totalSymbols - portfolioMetrics.coverage.symbolsWithPrices} symbols 
                  are missing price data. Visit Price Manager to update pricing information.
                </p>
              </div>
            </div>
          )}

          {!reportData.taxHarvesting && (
            <div className="flex items-start p-4 bg-blue-50 rounded-lg">
              <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800">No Recent Tax Harvesting</p>
                <p className="text-sm text-blue-700">
                  Run a tax harvesting analysis to generate performance insights and optimization reports.
                </p>
              </div>
            </div>
          )}

          {reportData.systemMetrics.totalModels === 0 && (
            <div className="flex items-start p-4 bg-gray-50 rounded-lg">
              <InformationCircleIcon className="h-5 w-5 text-gray-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800">No Model Portfolios</p>
                <p className="text-sm text-gray-700">
                  Create model portfolios to enable portfolio analysis and buy order generation.
                </p>
              </div>
            </div>
          )}

          {portfolioMetrics && portfolioMetrics.coverage.coveragePercent >= 80 && reportData.taxHarvesting && reportData.systemMetrics.totalModels > 0 && (
            <div className="flex items-start p-4 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">System Operating Optimally</p>
                <p className="text-sm text-green-700">
                  All system components are functioning well with good data coverage and recent activity.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Reports & Analytics
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Comprehensive reporting and analysis of your rebalancing system performance.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={loadReportData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
          
          <button
            onClick={exportReportData}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Export Report
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Last updated: {new Date(reportData.systemMetrics.lastUpdate).toLocaleString()}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: ChartBarIcon },
            { key: 'tax-harvesting', label: 'Tax Harvesting', icon: BanknotesIcon },
            { key: 'portfolios', label: 'Portfolios', icon: ChartPieIcon },
            { key: 'performance', label: 'Performance', icon: ArrowTrendingUpIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-5 w-5 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'tax-harvesting' && renderTaxHarvestingTab()}
        {activeTab === 'portfolios' && renderPortfoliosTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
      </div>
    </div>
  );
};

export default Reports;