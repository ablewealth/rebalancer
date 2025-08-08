import React, { useState, useMemo } from 'react';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface PortfolioPosition {
  id?: number;
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  costBasis: number;
  unrealizedGain: number;
  term: 'Short' | 'Long';
  acquiredDate: string;
  includedInSelling: boolean;
}

interface GroupedPosition {
  symbol: string;
  name: string;
  lots: PortfolioPosition[];
  totalQuantity: number;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedGain: number;
  avgPrice: number;
  termDisplay: 'Short' | 'Long' | 'Mixed';
  allSelected: boolean;
}

interface PortfolioGridProps {
  portfolioData: PortfolioPosition[];
  onPortfolioDataChange: (data: PortfolioPosition[]) => void;
}

const PortfolioGrid: React.FC<PortfolioGridProps> = ({ portfolioData, onPortfolioDataChange }) => {
  const [selectAll, setSelectAll] = useState(true);
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Group portfolio positions by symbol (critical functionality from original)
  const groupedPositions = useMemo(() => {
    const grouped = portfolioData.reduce((acc: { [key: string]: PortfolioPosition[] }, position) => {
      if (!acc[position.symbol]) {
        acc[position.symbol] = [];
      }
      acc[position.symbol].push(position);
      return acc;
    }, {});

    return Object.entries(grouped).map(([symbol, lots]): GroupedPosition => {
      const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);
      const totalMarketValue = lots.reduce((sum, lot) => sum + (lot.quantity * lot.price), 0);
      const totalCostBasis = lots.reduce((sum, lot) => sum + lot.costBasis, 0);
      const totalUnrealizedGain = totalMarketValue - totalCostBasis;
      const avgPrice = totalQuantity > 0 ? totalMarketValue / totalQuantity : 0;
      
      // Determine term display (critical logic from original)
      const hasLongTerm = lots.some(lot => lot.term === 'Long');
      const hasShortTerm = lots.some(lot => lot.term === 'Short');
      const termDisplay = hasLongTerm && hasShortTerm ? 'Mixed' : (hasLongTerm ? 'Long' : 'Short');
      
      const allSelected = lots.every(lot => lot.includedInSelling);
      
      return {
        symbol,
        name: lots[0].name,
        lots,
        totalQuantity,
        totalMarketValue,
        totalCostBasis,
        totalUnrealizedGain,
        avgPrice,
        termDisplay,
        allSelected
      };
    }).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [portfolioData]);

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    const updatedData = portfolioData.map(position => ({
      ...position,
      includedInSelling: newSelectAll
    }));
    
    onPortfolioDataChange(updatedData);
  };

  const handleSymbolToggle = (symbol: string) => {
    const updatedData = portfolioData.map(position => {
      if (position.symbol === symbol) {
        return { ...position, includedInSelling: !position.includedInSelling };
      }
      return position;
    });
    onPortfolioDataChange(updatedData);
    
    // Update select all state
    const allSelected = updatedData.every(p => p.includedInSelling);
    setSelectAll(allSelected);
  };

  const handleLotToggle = (symbol: string, lotIndex: number) => {
    const updatedData = [...portfolioData];
    const globalIndex = updatedData.findIndex((pos, idx) => 
      pos.symbol === symbol && 
      updatedData.slice(0, idx + 1).filter(p => p.symbol === symbol).length === lotIndex + 1
    );
    
    if (globalIndex !== -1) {
      updatedData[globalIndex].includedInSelling = !updatedData[globalIndex].includedInSelling;
      onPortfolioDataChange(updatedData);
      
      // Update select all state
      const allSelected = updatedData.every(p => p.includedInSelling);
      setSelectAll(allSelected);
    }
  };

  const handleExpandToggle = (symbol: string) => {
    const newExpanded = new Set(expandedSymbols);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
    }
    setExpandedSymbols(newExpanded);
  };

  const selectedCount = portfolioData.filter(p => p.includedInSelling).length;
  const totalValue = portfolioData.reduce((sum, p) => sum + (p.quantity * p.price), 0);
  const totalUnrealizedGain = portfolioData.reduce((sum, p) => sum + p.unrealizedGain, 0);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-semibold mb-4 border-b pb-3">Current Portfolio Holdings</h2>
      <p className="text-sm text-gray-600 mb-4">
        Review your current holdings and uncheck any positions you want to exclude from the selling algorithm.
      </p>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSelectAll}
            className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
          >
            {selectAll ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-medium">{selectedCount}</span> of{' '}
          <span className="font-medium">{portfolioData.length}</span> positions selected
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</div>
          <div className="text-sm text-gray-600">Total Market Value</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${totalUnrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalUnrealizedGain)}
          </div>
          <div className="text-sm text-gray-600">Total Unrealized Gain/Loss</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{portfolioData.length}</div>
          <div className="text-sm text-gray-600">Total Positions</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Symbol
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Market Value
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost Basis
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unrealized Gain/Loss
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Term
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {groupedPositions.map((group) => {
              const isExpanded = expandedSymbols.has(group.symbol);
              const gainLossPercent = group.totalCostBasis > 0 ? (group.totalUnrealizedGain / group.totalCostBasis) * 100 : 0;
              
              return (
                <React.Fragment key={group.symbol}>
                  {/* Parent row - Symbol aggregate */}
                  <tr
                    className={`
                      parent-row font-medium text-gray-800 cursor-pointer hover:bg-gray-50 transition-colors
                      ${group.allSelected ? 'bg-white' : 'bg-gray-50 opacity-75'}
                    `}
                    onClick={() => handleExpandToggle(group.symbol)}
                  >
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={group.allSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSymbolToggle(group.symbol);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                        />
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                      {group.symbol}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {group.lots.length} lot{group.lots.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {group.totalQuantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right">
                      {formatCurrency(group.avgPrice)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(group.totalMarketValue)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(group.totalCostBasis)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right">
                      <div className={group.totalUnrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                        <div className="font-bold">{formatCurrency(group.totalUnrealizedGain)}</div>
                        <div className="text-xs">
                          ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-center">
                      <span className={`
                        inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${group.termDisplay === 'Mixed' ? 'bg-purple-100 text-purple-800' :
                          group.termDisplay === 'Long' ? 'bg-blue-100 text-blue-800' : 
                          'bg-orange-100 text-orange-800'
                        }
                      `}>
                        {group.termDisplay}
                      </span>
                    </td>
                  </tr>
                  
                  {/* Child rows - Individual lots */}
                  {isExpanded && group.lots.map((lot, lotIndex) => {
                    const lotMarketValue = lot.quantity * lot.price;
                    const lotGainLossPercent = lot.costBasis > 0 ? (lot.unrealizedGain / lot.costBasis) * 100 : 0;
                    
                    return (
                      <tr
                        key={`${group.symbol}-lot-${lotIndex}`}
                        className={`
                          child-row border-l-4 border-gray-200
                          ${lot.includedInSelling ? 'bg-gray-50' : 'bg-gray-100 opacity-60'}
                          hover:bg-gray-100 transition-colors
                        `}
                      >
                        <td className="px-6 py-4 whitespace-nowrap pl-12">
                          <input
                            type="checkbox"
                            checked={lot.includedInSelling}
                            onChange={() => handleLotToggle(group.symbol, lotIndex)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 pl-8">
                          Lot #{lotIndex + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">
                          {lot.acquiredDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                          {lot.quantity.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                          {formatCurrency(lot.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                          {formatCurrency(lotMarketValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                          {formatCurrency(lot.costBasis)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className={lot.unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                            <div className="font-medium">{formatCurrency(lot.unrealizedGain)}</div>
                            <div className="text-xs">
                              ({lotGainLossPercent >= 0 ? '+' : ''}{lotGainLossPercent.toFixed(1)}%)
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`
                            inline-flex px-2 py-1 text-xs font-semibold rounded-full
                            ${lot.term === 'Long' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}
                          `}>
                            {lot.term}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {portfolioData.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No portfolio data loaded</div>
          <div className="text-gray-500 text-sm">Upload a CSV file to see your holdings here</div>
        </div>
      )}
    </div>
  );
};

export default PortfolioGrid;