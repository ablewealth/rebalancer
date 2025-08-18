import React, { useState } from 'react';
import { ExclamationTriangleIcon, DocumentArrowDownIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/apiClient';
import PortfolioGrid from '../components/PortfolioGrid';
import TaxResults from '../components/TaxResults';

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

interface TaxCalculationResult {
  recommendations: any[];
  summary: {
    targetST: number;
    targetLT: number;
    actualST: number;
    actualLT: number;
    totalRecommendations: number;
    totalProceeds?: number;
  };
  warnings?: string[];
  metadata?: any;
}

const TaxHarvesting: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [custodian, setCustodian] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [realizedST, setRealizedST] = useState<number>(0);
  const [realizedLT, setRealizedLT] = useState<number>(0);
  const [targetST, setTargetST] = useState<number>(0);
  const [targetLT, setTargetLT] = useState<number>(0);
  
  // Cash raising feature
  const [cashNeeded, setCashNeeded] = useState<number>(0);
  const [currentCash, setCurrentCash] = useState<number>(0);
  const [useCashRaising, setUseCashRaising] = useState<boolean>(false);
  const [portfolioData, setPortfolioData] = useState<PortfolioPosition[]>([]);
  const [calculationResults, setCalculationResults] = useState<TaxCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [enableWashSaleCheck, setEnableWashSaleCheck] = useState(true);
  const [conservativeMode, setConservativeMode] = useState(true);
  const [cashMaximizationMode, setCashMaximizationMode] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'costBasis' | 'ytd') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target?.result as string;
      if (fileType === 'costBasis') {
        parseCostBasisCSV(csvData);
      } else {
        parseYTDCSV(csvData);
      }
    };
    reader.readAsText(file);
  };

  const preprocessCostBasisCSV = (csvText: string): string => {
    console.log('Starting CSV preprocessing');
    
    const lines = csvText.trim().split('\n');
    if (lines.length < 8) {
      console.log('Not template format - insufficient lines for template');
      return csvText;
    }
    
    // Check if this matches the template format
    const line1 = lines[0].trim();
    const line2 = lines[1].trim();
    const line3 = lines[2].trim();
    const line8 = lines[7].trim();
    
    const isTemplateFormat = (
      /^\d+$/.test(line1) && // Line 1 is just digits (account number)
      /\d+\s+Records exported/.test(line2) && // Line 2 mentions records exported
      line3.includes('CostBasis for Single Account') && // Line 3 has the title
      line8.toLowerCase().includes('symbol') && line8.toLowerCase().includes('name') // Line 8 has headers
    );
    
    if (!isTemplateFormat) {
      console.log('Not template format - keeping original CSV');
      return csvText;
    }
    
    console.log('Template format detected - removing rows 1-7 and columns 11-14');
    
    // Remove rows 1-7 (keep from line 8 onwards, which is index 7)
    const filteredLines = lines.slice(7);
    
    // Remove columns 11-14 from each line
    const processedLines = filteredLines.map(line => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      
      // Keep columns 0-10, skip columns 11-14 (indices 10, 11, 12, 13), keep the rest
      const filteredValues = values.filter((value, index) => {
        return index < 10 || index > 13;
      });
      
      return filteredValues.join(',');
    });
    
    const processedCSV = processedLines.join('\n');
    console.log(`Processed CSV: removed 7 header rows and columns 11-14`);
    console.log(`Original lines: ${lines.length}, Processed lines: ${processedLines.length}`);
    
    return processedCSV;
  };

  const parseCostBasisCSV = (csvData: string) => {
    // Preprocess CSV to handle template format
    const processedCSV = preprocessCostBasisCSV(csvData);
    
    const lines = processedCSV.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Clean CSV value helper (matches original implementation)
    const cleanValue = (val: string) => {
      if (typeof val !== 'string') return 0;
      const cleaned = val.replace(/[$, "]/g, '');
      if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
        return parseFloat(cleaned.replace(/[()]/g, '')) * -1;
      }
      return parseFloat(cleaned) || 0;
    };

    // Find header indices (matches original implementation)
    const findHeaderIndices = (header: string[], requiredCols: string[]) => {
      const indices: { [key: string]: number } = {};
      const missingCols: string[] = [];
      
      requiredCols.forEach(col => {
        const index = header.findIndex(h => h.toLowerCase().includes(col.toLowerCase()));
        if (index === -1) {
          missingCols.push(col);
        }
        indices[col.replace(/[^a-z0-9]/gi, '').toLowerCase()] = index;
      });
      
      if (missingCols.length > 0) {
        throw new Error(`CSV is missing required columns: ${missingCols.join(', ')}`);
      }
      return indices;
    };

    try {
      // Match original required columns exactly
      const requiredCols = ['symbol', 'acquired', 'quantity', 'market value', 'cost basis', 'holding period'];
      const indices = findHeaderIndices(headers, requiredCols);

      const positions: PortfolioPosition[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Handle CSV with quoted values (matches original regex)
        const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        const symbol = values[indices.symbol]?.trim();
        if (!symbol || symbol.toLowerCase().includes('total')) continue;

        const quantity = cleanValue(values[indices.quantity]);
        const marketValue = cleanValue(values[indices.marketvalue]);
        const costBasis = cleanValue(values[indices.costbasis]);
        const acquiredDate = values[indices.acquired]?.trim() || '';
        
        // Calculate price from market value (matches original)
        const price = quantity > 0 ? marketValue / quantity : 0;
        const unrealizedGain = marketValue - costBasis;
        
        // Use holding period column (matches original)
        const holdingPeriod = values[indices.holdingperiod]?.trim() || '';
        const term = holdingPeriod.toLowerCase().includes('long') ? 'Long' : 'Short';

        if (!isNaN(quantity) && quantity > 0) {
          positions.push({
            symbol,
            name: symbol, // Will be filled from name lookup if available
            quantity,
            price,
            costBasis,
            unrealizedGain,
            term,
            acquiredDate,
            includedInSelling: true
          });
        }
      }

      setPortfolioData(positions);
      console.log('Portfolio data parsed:', positions.length, 'positions');
      
    } catch (error) {
      console.error('CSV parsing error:', error);
      showError('CSV Parse Error', error instanceof Error ? error.message : 'Failed to parse CSV file');
    }
  };

  const parseYTDCSV = (csvData: string) => {
    // Parse YTD realized gains CSV and update realized amounts
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim());
    
    // Clean CSV value helper (matches cost basis parsing)
    const cleanValue = (val: string) => {
      if (!val || typeof val !== 'string' || val.trim() === '') return 0;
      let cleaned = val.trim().replace(/[$, "]/g, '');
      
      // Handle parentheses for negative values: ($201.70) -> -201.70
      if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
        cleaned = '-' + cleaned.slice(1, -1);
      }
      
      const result = parseFloat(cleaned) || 0;
      return result;
    };

    // Find the exact column indices (match template structure)
    const stIndex = headers.findIndex(h => 
      h.toLowerCase().includes('short term realized gain') ||
      h.toLowerCase() === 'short term realized gain/(loss)'
    );
    const ltIndex = headers.findIndex(h => 
      h.toLowerCase().includes('long term realized gain') ||
      h.toLowerCase() === 'long term realized gain/(loss)'
    );

    console.log('YTD CSV Headers:', headers);
    console.log('ST Index:', stIndex, 'LT Index:', ltIndex);

    if (stIndex === -1 && ltIndex === -1) {
      console.error('Could not find Short Term or Long Term Realized Gain columns');
      showError('Format Error', 'YTD CSV format not recognized. Please ensure it has "Short Term Realized Gain/(Loss)" and "Long Term Realized Gain/(Loss)" columns.');
      return;
    }

    let stTotal = 0;
    let ltTotal = 0;
    let processedRows = 0;

    // Parse each data row (skip header)
    for (let i = 1; i < lines.length; i++) {
      // Handle CSV with quoted values (same as cost basis parsing)
      const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      
      if (values.length < headers.length) continue;
      
      // Process ST column
      if (stIndex !== -1 && stIndex < values.length) {
        const stValue = cleanValue(values[stIndex]);
        if (!isNaN(stValue)) {
          stTotal += stValue;
          if (stValue !== 0) {
            console.log(`Row ${i}: ST = ${stValue} (raw: "${values[stIndex]}")`);
          }
        }
      }
      
      // Process LT column  
      if (ltIndex !== -1 && ltIndex < values.length) {
        const ltValue = cleanValue(values[ltIndex]);
        if (!isNaN(ltValue)) {
          ltTotal += ltValue;
          if (ltValue !== 0) {
            console.log(`Row ${i}: LT = ${ltValue} (raw: "${values[ltIndex]}")`);
          }
        }
      }
      
      processedRows++;
    }

    setRealizedST(stTotal);
    setRealizedLT(ltTotal);
    
    // Show clear feedback to user
    console.log(`\n=== YTD CSV PARSING COMPLETE ===`);
    console.log(`Processed ${processedRows} rows`);
    console.log(`Total Short-Term Realized: $${stTotal.toFixed(2)}`);
    console.log(`Total Long-Term Realized: $${ltTotal.toFixed(2)}`);
    console.log(`Fields updated in form`);
    
    // Show success message to user
    if (stTotal !== 0 || ltTotal !== 0) {
      showSuccess('YTD Data Loaded', `Short-Term: $${stTotal.toFixed(2)}, Long-Term: $${ltTotal.toFixed(2)}`);
    } else {
      showWarning('No Data Found', 'YTD CSV processed, but no realized gains/losses found. Please verify the file contains data.');
    }
  };

  const handleCalculate = async () => {
    if (portfolioData.length === 0) {
      showWarning('Using Sample Data', 'No portfolio uploaded - using sample data for demonstration');
    }

    setIsCalculating(true);
    setCalculationResults(null);

    try {
      const result = await apiClient.post<TaxCalculationResult>('/api/calculate', {
        portfolioData,
        targetST: useCashRaising ? 0 : targetST,
        targetLT: useCashRaising ? 0 : targetLT,
        realizedST,
        realizedLT,
        cashMaximizationMode,
        // Cash raising feature
        useCashRaising,
        cashNeeded: useCashRaising ? cashNeeded : 0,
        currentCash: useCashRaising ? currentCash : 0,
      });

      if (result.success && result.data) {
        setCalculationResults(result.data);
      } else {
        throw new Error(result.error || 'Calculation failed');
      }
    } catch (error) {
      console.error('Calculation error:', error);
      showError('Calculation Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsCalculating(false);
    }
  };

  const transferToBuyOrders = () => {
    if (!calculationResults || !calculationResults.recommendations.length) {
      showWarning('No Data', 'No tax harvesting recommendations to transfer');
      return;
    }

    // Calculate total proceeds from all sell recommendations
    const totalProceeds = calculationResults.recommendations.reduce((sum: number, rec: any) => {
      return sum + (rec.proceeds || (rec.sharesToSell * rec.price));
    }, 0);

    if (totalProceeds <= 0) {
      showWarning('No Proceeds', 'No cash proceeds available from recommendations');
      return;
    }

    // Store comprehensive transfer data in localStorage for Buy Orders page
    const transferData = {
      // Financial data
      cashFromSales: totalProceeds,
      targetST,
      targetLT,
      realizedST,
      realizedLT,
      actualST: calculationResults.summary?.actualST || 0,
      actualLT: calculationResults.summary?.actualLT || 0,
      
      // Account information
      clientName,
      custodian,
      accountNumber,
      
      // Tax harvesting context
      cashMaximizationMode,
      portfolioDataSize: portfolioData.length,
      
      // Detailed recommendations
      recommendations: calculationResults.recommendations,
      
      // Summary data for reference
      summary: calculationResults.summary,
      
      // Transfer metadata
      source: 'tax-harvesting',
      timestamp: new Date().toISOString(),
      transferId: `TH-${Date.now()}` // Unique transfer ID
    };

    // Store in localStorage with comprehensive data
    localStorage.setItem('taxHarvestingTransfer', JSON.stringify(transferData));
    
    // Also store persistent session data that survives page refreshes
    sessionStorage.setItem('taxHarvestingSession', JSON.stringify({
      clientName,
      custodian,
      accountNumber,
      lastTransferAmount: totalProceeds,
      lastTransferDate: new Date().toISOString()
    }));
    
    showSuccess(
      'Complete Data Transferred', 
      `$${totalProceeds.toLocaleString()} proceeds + portfolio context transferred to Buy Orders`
    );

    // Navigate to Buy Orders page
    navigate('/buy-orders');
  };

  const handleExportCSV = () => {
    if (!calculationResults?.recommendations.length) return;

    const csvContent = [
      ['Symbol', 'Name', 'Action', 'Shares', 'Price', 'Proceeds', 'Gain/Loss', 'Term', 'Reason'].join(','),
      ...calculationResults.recommendations.map(rec => [
        rec.symbol,
        rec.name || '',
        'SELL',
        rec.sharesToSell,
        rec.price,
        rec.proceeds?.toFixed(2) || '',
        rec.actualGain?.toFixed(2) || '',
        rec.term,
        rec.reason || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-harvesting-recommendations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Advanced Tax Harvesting Optimization
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          This tool uses an optimization algorithm to find trades that best meet your tax goals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-3">1. Your Portfolio Data</h2>

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
            <label htmlFor="costBasisFile" className="block text-sm font-medium text-gray-700 mb-2">
              A. Upload Cost Basis CSV (Current Holdings)
            </label>
            <input
              type="file"
              id="costBasisFile"
              accept=".csv"
              onChange={(e) => handleFileUpload(e, 'costBasis')}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors duration-200 cursor-pointer"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="ytdFile" className="block text-sm font-medium text-gray-700 mb-2">
              B. Upload YTD Realized Gains CSV (Optional)
            </label>
            <input
              type="file"
              id="ytdFile"
              accept=".csv"
              onChange={(e) => handleFileUpload(e, 'ytd')}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors duration-200 cursor-pointer"
            />
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Year-to-Date Realized Gains (Auto-filled or Manual)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="realizedST" className="block text-sm font-medium text-gray-700">
                  Short-Term Gain/(Loss)
                </label>
                <input
                  type="number"
                  id="realizedST"
                  value={realizedST}
                  onChange={(e) => setRealizedST(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label htmlFor="realizedLT" className="block text-sm font-medium text-gray-700">
                  Long-Term Gain/(Loss)
                </label>
                <input
                  type="number"
                  id="realizedLT"
                  value={realizedLT}
                  onChange={(e) => setRealizedLT(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
            </div>
          </div>

          {/* Wash Sale Settings */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-600" />
              Wash Sale Compliance Settings
            </h3>
            <div className="space-y-3">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enableWashSaleCheck}
                    onChange={(e) => setEnableWashSaleCheck(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable automatic wash sale detection</span>
                </label>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={conservativeMode}
                    onChange={(e) => setConservativeMode(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Use conservative similarity scoring (recommended)</span>
                </label>
              </div>
              <div className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded border border-yellow-200">
                <p>
                  <strong>Important:</strong> This tool cannot detect purchases in other accounts (spouse, IRA, etc.). 
                  You must manually verify compliance across all your accounts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Target Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-3">2. Set Annual Targets</h2>
          <p className="text-sm text-gray-600 mb-4">Define your desired total capital gain or loss for the year.</p>
          
          {/* Optimization Mode Selection */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Optimization Strategy</h3>
            <div className="space-y-3">
              <div>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="optimizationMode"
                    checked={!cashMaximizationMode}
                    onChange={() => setCashMaximizationMode(false)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">
                    <strong>Target Precision Mode:</strong> Hit exact targets with minimal trades
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="optimizationMode"
                    checked={cashMaximizationMode}
                    onChange={() => setCashMaximizationMode(true)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">
                    <strong>Cash Maximization Mode:</strong> Generate maximum cash within target constraints
                  </span>
                </label>
              </div>
            </div>
            <div className={`text-xs mt-2 p-2 rounded ${cashMaximizationMode ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {cashMaximizationMode 
                ? '💰 This mode will sell as many positions as possible while staying within your annual targets, maximizing cash generation.'
                : '🎯 This mode finds the minimal set of trades to hit your exact targets with high precision.'
              }
            </div>
          </div>

          {/* Mode Selection */}
          <div className="mb-6">
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="calculationMode"
                  checked={!useCashRaising}
                  onChange={() => setUseCashRaising(false)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Tax Target Mode</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="calculationMode"
                  checked={useCashRaising}
                  onChange={() => setUseCashRaising(true)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Cash Raising Mode</span>
              </label>
            </div>
          </div>

          {/* Tax Target Mode */}
          {!useCashRaising && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="targetST" className="block text-sm font-medium text-gray-700">
                  Target Short-Term Gain/(Loss)
                </label>
                <input
                  type="number"
                  id="targetST"
                  value={targetST}
                  onChange={(e) => setTargetST(parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 2000"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label htmlFor="targetLT" className="block text-sm font-medium text-gray-700">
                  Target Long-Term Gain/(Loss)
                </label>
                <input
                  type="number"
                  id="targetLT"
                  value={targetLT}
                  onChange={(e) => setTargetLT(parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 5000"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
            </div>
          )}

          {/* Cash Raising Mode */}
          {useCashRaising && (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-medium text-green-800 mb-2 flex items-center">
                  💰 Cash Raising Mode
                </h3>
                <p className="text-sm text-green-700">
                  Generate trades to raise a specific amount of cash while being tax-efficient.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cashNeeded" className="block text-sm font-medium text-gray-700">
                    Cash Needed to Raise *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="cashNeeded"
                      value={cashNeeded}
                      onChange={(e) => setCashNeeded(parseFloat(e.target.value) || 0)}
                      placeholder="50000"
                      step="1000"
                      min="0"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 pl-7 border"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Amount of cash you need to raise</p>
                </div>
                <div>
                  <label htmlFor="currentCash" className="block text-sm font-medium text-gray-700">
                    Current Cash Available
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="currentCash"
                      value={currentCash}
                      onChange={(e) => setCurrentCash(parseFloat(e.target.value) || 0)}
                      placeholder="10000"
                      step="1000"
                      min="0"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 pl-7 border"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Cash you currently have available</p>
                </div>
              </div>
              
              {cashNeeded > 0 && currentCash >= 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Additional cash needed:</span>
                    <span className="font-medium text-blue-900">
                      ${Math.max(0, cashNeeded - currentCash).toLocaleString()}
                    </span>
                  </div>
                  {cashNeeded <= currentCash && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ You already have sufficient cash available
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col space-y-4">
            <button
              onClick={handleCalculate}
              disabled={isCalculating || portfolioData.length === 0}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md flex items-center justify-center"
            >
              <CalculatorIcon className="h-5 w-5 mr-2" />
              {isCalculating ? 'Calculating...' : 'Generate Recommendations'}
            </button>

            {calculationResults && (
              <button
                onClick={handleExportCSV}
                className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md flex items-center justify-center"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export to CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Grid */}
      {portfolioData.length > 0 && (
        <PortfolioGrid
          portfolioData={portfolioData}
          onPortfolioDataChange={setPortfolioData}
        />
      )}

      {/* Results */}
      {calculationResults && (
        <TaxResults results={calculationResults} onTransferToBuyOrders={transferToBuyOrders} />
      )}
    </div>
  );
};

export default TaxHarvesting;