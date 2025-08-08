import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface TaxRecommendation {
  symbol: string;
  name: string;
  sharesToSell: number;
  actualGain: number;
  proceeds: number;
  term: 'Short' | 'Long';
  reason: string;
  price: number;
}

interface TaxCalculationResult {
  recommendations: TaxRecommendation[];
  summary: {
    targetST: number;
    targetLT: number;
    actualST: number;
    actualLT: number;
    totalRecommendations: number;
    totalProceeds?: number;
    cashMaximizationMode?: boolean;
    ytdRealizedST?: number;
    ytdRealizedLT?: number;
    totalAnnualST?: number;
    totalAnnualLT?: number;
    // Cash raising mode fields
    cashNeeded?: number;
    currentCash?: number;
    additionalCashNeeded?: number;
    actualCashRaised?: number;
    taxImpact?: {
      shortTermGain: number;
      longTermGain: number;
      totalTaxableGain: number;
    };
  };
  warnings?: string[];
  metadata?: any;
  optimizationVerification?: {
    precision: {
      stDifference: number;
      ltDifference: number;
      stPrecisionPercent: number;
      ltPrecisionPercent: number;
      overallQuality: string;
    };
    alternativeTests: {
      testCount: number;
      betterAlternativesFound: number;
      isOptimal: boolean;
      confidenceLevel: string;
    };
    efficiency: {
      selectedPositions: number;
      totalAvailable: number;
      utilizationRate: string;
      avgProceedsPerPosition: string;
    };
  };
}

interface TaxResultsProps {
  results: TaxCalculationResult;
  onTransferToBuyOrders?: () => void;
}

const TaxResults: React.FC<TaxResultsProps> = ({ results, onTransferToBuyOrders }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getAccuracyColor = (actual: number, target: number) => {
    if (target === 0) return actual === 0 ? 'text-green-600' : 'text-yellow-600';
    const accuracy = Math.abs((actual - target) / target);
    if (accuracy <= 0.05) return 'text-green-600';
    if (accuracy <= 0.15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyIcon = (actual: number, target: number) => {
    if (target === 0) return actual === 0 ? CheckCircleIcon : InformationCircleIcon;
    const accuracy = Math.abs((actual - target) / target);
    if (accuracy <= 0.05) return CheckCircleIcon;
    if (accuracy <= 0.15) return ExclamationTriangleIcon;
    return ExclamationTriangleIcon;
  };

  const stAccuracyIcon = getAccuracyIcon(results.summary.actualST, results.summary.targetST);
  const ltAccuracyIcon = getAccuracyIcon(results.summary.actualLT, results.summary.targetLT);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-4 border-b pb-3">
        <h2 className="text-2xl font-semibold">Tax Harvesting Results</h2>
        {results.summary.cashMaximizationMode && (
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            💰 Cash Maximization Mode
          </div>
        )}
      </div>

      {/* YTD Context */}
      {(results.summary.ytdRealizedST !== undefined || results.summary.ytdRealizedLT !== undefined) && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <h3 className="text-lg font-medium text-indigo-800 mb-3">📊 Year-to-Date Context</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-indigo-600 font-medium">YTD ST Realized</div>
              <div className="text-lg font-bold text-indigo-900">
                {formatCurrency(results.summary.ytdRealizedST || 0)}
              </div>
            </div>
            <div>
              <div className="text-indigo-600 font-medium">YTD LT Realized</div>
              <div className="text-lg font-bold text-indigo-900">
                {formatCurrency(results.summary.ytdRealizedLT || 0)}
              </div>
            </div>
            <div>
              <div className="text-indigo-600 font-medium">Total Annual ST</div>
              <div className="text-lg font-bold text-indigo-900">
                {formatCurrency(results.summary.totalAnnualST || 0)}
              </div>
            </div>
            <div>
              <div className="text-indigo-600 font-medium">Total Annual LT</div>
              <div className="text-lg font-bold text-indigo-900">
                {formatCurrency(results.summary.totalAnnualLT || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {results.metadata?.mode === 'cash_raising' ? (
        /* Cash Raising Mode Summary */
        <div className="mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-green-800 mb-2 flex items-center">
              💰 Cash Raising Results
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Cash Needed</div>
              <div className="text-xl font-bold text-blue-900">
                {formatCurrency(results.summary.cashNeeded || 0)}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 font-medium">Current Cash</div>
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(results.summary.currentCash || 0)}
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Cash Raised</div>
              <div className="text-xl font-bold text-green-900">
                {formatCurrency(results.summary.actualCashRaised || 0)}
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Total Available</div>
              <div className="text-xl font-bold text-purple-900">
                {formatCurrency((results.summary.currentCash || 0) + (results.summary.actualCashRaised || 0))}
              </div>
            </div>
          </div>
          
          {/* Tax Impact */}
          {results.summary.taxImpact && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">📊 Tax Impact</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-yellow-700">Short-Term Gain:</span>
                  <span className="font-medium ml-2">{formatCurrency(results.summary.taxImpact.shortTermGain)}</span>
                </div>
                <div>
                  <span className="text-yellow-700">Long-Term Gain:</span>
                  <span className="font-medium ml-2">{formatCurrency(results.summary.taxImpact.longTermGain)}</span>
                </div>
                <div>
                  <span className="text-yellow-700">Total Taxable:</span>
                  <span className="font-medium ml-2">{formatCurrency(results.summary.taxImpact.totalTaxableGain)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tax Target Mode Summary */
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-600 font-medium">ST Target</div>
                <div className="text-xl font-bold text-blue-900">
                  {formatCurrency(results.summary.targetST)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600 font-medium">ST Actual</div>
                <div className={`text-xl font-bold ${getAccuracyColor(results.summary.actualST, results.summary.targetST)}`}>
                  {formatCurrency(results.summary.actualST)}
                </div>
              </div>
              {React.createElement(stAccuracyIcon, { 
                className: `h-6 w-6 ${getAccuracyColor(results.summary.actualST, results.summary.targetST)}` 
              })}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-purple-600 font-medium">LT Target</div>
                <div className="text-xl font-bold text-purple-900">
                  {formatCurrency(results.summary.targetLT)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-orange-600 font-medium">LT Actual</div>
                <div className={`text-xl font-bold ${getAccuracyColor(results.summary.actualLT, results.summary.targetLT)}`}>
                  {formatCurrency(results.summary.actualLT)}
                </div>
              </div>
              {React.createElement(ltAccuracyIcon, { 
                className: `h-6 w-6 ${getAccuracyColor(results.summary.actualLT, results.summary.targetLT)}` 
              })}
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {results.warnings && results.warnings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Warnings</h3>
              <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                {results.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Table */}
      {results.recommendations.length > 0 ? (
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
                  Shares to Sell
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proceeds
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gain/Loss
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Term
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.recommendations.map((rec, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      SELL
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {rec.symbol}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {rec.name || rec.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {rec.sharesToSell.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(rec.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(rec.proceeds)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={rec.actualGain >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {formatCurrency(rec.actualGain)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`
                      inline-flex px-2 py-1 text-xs font-semibold rounded-full
                      ${rec.term === 'Long' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-orange-100 text-orange-800'
                      }
                    `}>
                      {rec.term}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {rec.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Enhanced Summary Row */}
          <div className="mt-4 space-y-4">
            {/* Trade Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3">📊 Trade Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-600">Positions to Sell</div>
                  <div className="text-2xl font-bold text-gray-900">{results.recommendations.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600">Total Proceeds</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(results.summary.totalProceeds || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600">Trade Gain/Loss</div>
                  <div className={`text-2xl font-bold ${(results.summary.actualST + results.summary.actualLT) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(results.summary.actualST + results.summary.actualLT)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600">💰 Available Cash</div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(results.summary.totalProceeds || 0)}</div>
                  <div className="text-xs text-gray-500 mt-1">for reinvestment</div>
                </div>
              </div>
            </div>

            {/* Annual Totals (if YTD data available) */}
            {(results.summary.ytdRealizedST !== undefined || results.summary.ytdRealizedLT !== undefined) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-3">🎯 Complete Annual Picture</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-blue-600">YTD ST Realized</div>
                    <div className="text-lg font-bold text-blue-900">
                      {formatCurrency(results.summary.ytdRealizedST || 0)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-600">+ ST from Trades</div>
                    <div className="text-lg font-bold text-blue-900">
                      {formatCurrency(results.summary.actualST)}
                    </div>
                  </div>
                  <div className="text-center border-l border-blue-300">
                    <div className="text-blue-600">YTD LT Realized</div>
                    <div className="text-lg font-bold text-blue-900">
                      {formatCurrency(results.summary.ytdRealizedLT || 0)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-600">+ LT from Trades</div>
                    <div className="text-lg font-bold text-blue-900">
                      {formatCurrency(results.summary.actualLT)}
                    </div>
                  </div>
                </div>
                
                {/* Total Annual Line */}
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                      <div className="text-blue-600 font-medium">📈 Total Annual ST</div>
                      <div className={`text-2xl font-bold ${(results.summary.totalAnnualST || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(results.summary.totalAnnualST || 0)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Target: {formatCurrency(results.summary.targetST)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                      <div className="text-blue-600 font-medium">📈 Total Annual LT</div>
                      <div className={`text-2xl font-bold ${(results.summary.totalAnnualLT || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(results.summary.totalAnnualLT || 0)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Target: {formatCurrency(results.summary.targetLT)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No recommendations generated</h3>
          <p className="mt-1 text-sm text-gray-500">
            The algorithm could not find suitable positions to meet your targets with the current portfolio.
          </p>
        </div>
      )}

      {/* Optimization Verification */}
      {results.optimizationVerification && (
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <h3 className="text-lg font-medium text-emerald-800 mb-3">✨ Algorithm Optimization Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Precision Analysis */}
            <div className="bg-white p-3 rounded border border-emerald-200">
              <h4 className="font-medium text-emerald-700 mb-2">Precision Quality</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>ST Accuracy:</span>
                  <span className={`font-medium ${
                    results.optimizationVerification.precision.stPrecisionPercent <= 5 ? 'text-green-600' :
                    results.optimizationVerification.precision.stPrecisionPercent <= 15 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {results.optimizationVerification.precision.stPrecisionPercent.toFixed(1)}% off
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>LT Accuracy:</span>
                  <span className={`font-medium ${
                    results.optimizationVerification.precision.ltPrecisionPercent <= 5 ? 'text-green-600' :
                    results.optimizationVerification.precision.ltPrecisionPercent <= 15 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {results.optimizationVerification.precision.ltPrecisionPercent.toFixed(1)}% off
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-emerald-200">
                  <div className="flex justify-between">
                    <span className="font-medium">Overall Quality:</span>
                    <span className={`font-bold ${
                      results.optimizationVerification.precision.overallQuality === 'Excellent' ? 'text-green-600' :
                      results.optimizationVerification.precision.overallQuality === 'Good' ? 'text-blue-600' :
                      results.optimizationVerification.precision.overallQuality === 'Acceptable' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {results.optimizationVerification.precision.overallQuality}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Alternative Testing */}
            <div className="bg-white p-3 rounded border border-emerald-200">
              <h4 className="font-medium text-emerald-700 mb-2">Optimization Verification</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Tests Run:</span>
                  <span className="font-medium">{results.optimizationVerification.alternativeTests.testCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Better Found:</span>
                  <span className={`font-medium ${
                    results.optimizationVerification.alternativeTests.betterAlternativesFound === 0 ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {results.optimizationVerification.alternativeTests.betterAlternativesFound}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span className="font-medium text-emerald-600">
                    {results.optimizationVerification.alternativeTests.confidenceLevel}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-emerald-200">
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span className={`font-bold ${
                      results.optimizationVerification.alternativeTests.isOptimal ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {results.optimizationVerification.alternativeTests.isOptimal ? '✓ Optimal' : '⚠ Review'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Efficiency Metrics */}
            <div className="bg-white p-3 rounded border border-emerald-200">
              <h4 className="font-medium text-emerald-700 mb-2">Efficiency Metrics</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Positions Used:</span>
                  <span className="font-medium">
                    {results.optimizationVerification.efficiency.selectedPositions} / {results.optimizationVerification.efficiency.totalAvailable}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Utilization:</span>
                  <span className="font-medium">{results.optimizationVerification.efficiency.utilizationRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg per Position:</span>
                  <span className="font-medium">${results.optimizationVerification.efficiency.avgProceedsPerPosition}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {results.metadata && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Calculation Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
            <div>
              <span className="font-medium">Available Lots:</span> {results.metadata.availableLots}
            </div>
            <div>
              <span className="font-medium">ST Gains:</span> {results.metadata.categories?.stGains || 0}
            </div>
            <div>
              <span className="font-medium">ST Losses:</span> {results.metadata.categories?.stLosses || 0}
            </div>
            <div>
              <span className="font-medium">LT Gains:</span> {results.metadata.categories?.ltGains || 0}
            </div>
            <div>
              <span className="font-medium">LT Losses:</span> {results.metadata.categories?.ltLosses || 0}
            </div>
            <div>
              <span className="font-medium">Algorithm:</span> v{results.metadata.version}
            </div>
            <div>
              <span className="font-medium">Mode:</span> {results.metadata.optimizationMode || 'Standard'}
            </div>
            <div>
              <span className="font-medium">Calculated:</span> {new Date(results.metadata.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Transfer to Buy Orders Button */}
      {results.recommendations.length > 0 && onTransferToBuyOrders && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Ready to Reinvest?</h4>
              <p className="text-sm text-gray-600">
                Transfer {formatCurrency(results.summary.totalProceeds || 0)} in proceeds to generate buy orders
              </p>
            </div>
            <button
              onClick={onTransferToBuyOrders}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <span>Generate Buy Orders</span>
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxResults;