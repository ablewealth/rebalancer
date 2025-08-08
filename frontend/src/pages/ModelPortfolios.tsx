import React, { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../components/Toast';
import { apiClient, ApiError } from '../utils/apiClient';

interface ModelHolding {
  id?: number;
  symbol: string;
  name: string;
  target_weight: number;
}

interface ModelPortfolio {
  id: number;
  model_name: string;
  description: string;
  holding_count: number;
  total_weight: number;
  is_active: boolean;
  holdings?: ModelHolding[];
}

const ModelPortfolios: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [models, setModels] = useState<ModelPortfolio[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelPortfolio | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [importData, setImportData] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState<'json' | 'csv'>('json');
  const [csvData, setCsvData] = useState('');

  // Form state
  const [modelName, setModelName] = useState('');
  const [description, setDescription] = useState('');
  const [holdings, setHoldings] = useState<ModelHolding[]>([]);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.get<ModelPortfolio[]>('/api/models');
      
      if (result.success && result.data) {
        setModels(result.data);
      } else {
        setError(result.error || 'Failed to fetch models');
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to connect to server';
      setError(errorMessage);
      console.error('Error fetching models:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModelDetails = async (modelId: number) => {
    try {
      const result = await apiClient.get<ModelPortfolio>(`/api/models/${modelId}`);
      
      if (result.success && result.data) {
        setSelectedModel(result.data);
        setModelName(result.data.model_name);
        setDescription(result.data.description || '');
        setHoldings(result.data.holdings || []);
      } else {
        showError('Failed to fetch model details', result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch model details';
      showError('Connection Error', errorMessage);
      console.error('Error fetching model details:', err);
    }
  };

  const handleCreateModel = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedModel(null);
    setModelName('');
    setDescription('');
    setHoldings([{ symbol: '', name: '', target_weight: 0 }]);
  };

  const handleEditModel = (model: ModelPortfolio) => {
    setIsEditing(true);
    setIsCreating(false);
    fetchModelDetails(model.id);
  };

  const handleSaveModel = async () => {
    try {
      // Validate
      if (!modelName.trim()) {
        showError('Validation Error', 'Model name is required');
        return;
      }

      const validHoldings = holdings.filter(h => h.symbol.trim() && h.target_weight > 0);
      const totalWeight = validHoldings.reduce((sum, h) => sum + h.target_weight, 0);
      
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        showError('Validation Error', `Total weight must equal 100% (1.0), got ${(totalWeight * 100).toFixed(2)}%`);
        return;
      }

      const modelData = {
        model_name: modelName,
        description,
        holdings: validHoldings
      };

      let result;
      if (isCreating) {
        result = await apiClient.post('/api/models', modelData);
      } else {
        result = await apiClient.put(`/api/models/${selectedModel?.id}`, modelData);
      }
      
      if (result.success) {
        await fetchModels();
        handleCancelEdit();
        showSuccess('Success', `Model ${isCreating ? 'created' : 'updated'} successfully!`);
      } else {
        showError('Save Failed', result.error || `Failed to ${isCreating ? 'create' : 'update'} model`);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : `Failed to ${isCreating ? 'create' : 'update'} model`;
      showError('Connection Error', errorMessage);
      console.error('Error saving model:', err);
    }
  };

  const handleDeleteModel = async (modelId: number) => {
    if (!window.confirm('Are you sure you want to delete this model?')) return;

    try {
      const result = await apiClient.delete(`/api/models/${modelId}`);
      
      if (result.success) {
        await fetchModels();
        if (selectedModel?.id === modelId) {
          setSelectedModel(null);
        }
        showSuccess('Success', 'Model deleted successfully!');
      } else {
        showError('Delete Failed', result.error || 'Failed to delete model');
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete model';
      showError('Connection Error', errorMessage);
      console.error('Error deleting model:', err);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
    setSelectedModel(null);
    setModelName('');
    setDescription('');
    setHoldings([]);
  };

  const addHolding = () => {
    setHoldings([...holdings, { symbol: '', name: '', target_weight: 0 }]);
  };

  const removeHolding = (index: number) => {
    setHoldings(holdings.filter((_, i) => i !== index));
  };

  const updateHolding = (index: number, field: keyof ModelHolding, value: string | number) => {
    const updated = [...holdings];
    updated[index] = { ...updated[index], [field]: value };
    setHoldings(updated);
  };

  const normalizeWeights = () => {
    const validHoldings = holdings.filter(h => h.symbol.trim() && h.target_weight > 0);
    const totalWeight = validHoldings.reduce((sum, h) => sum + h.target_weight, 0);
    
    if (totalWeight === 0) return;

    const normalized = holdings.map(h => {
      if (h.symbol.trim() && h.target_weight > 0) {
        return { ...h, target_weight: h.target_weight / totalWeight };
      }
      return h;
    });

    setHoldings(normalized);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const exportModel = (model: ModelPortfolio) => {
    const exportData = {
      model_name: model.model_name,
      description: model.description,
      holdings: model.holdings || []
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${model.model_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_model.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const exportModelCSV = (model: ModelPortfolio) => {
    if (!model.holdings || model.holdings.length === 0) {
      showWarning('Export Warning', 'No holdings to export');
      return;
    }
    
    const csvHeader = 'Symbol,Name,Target Weight\n';
    const csvData = model.holdings.map(h => 
      `${h.symbol},"${h.name}",${h.target_weight}`
    ).join('\n');
    
    const csvContent = csvHeader + csvData;
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${model.model_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_holdings.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const parseCSVData = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    // Parse header to determine format
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, '').toLowerCase());
    console.log('CSV Headers:', headers);

    // Determine CSV format based on headers
    let format: 'model' | 'simple' = 'simple';
    let modelIndex = -1, symbolIndex = -1, nameIndex = -1, priceIndex = -1, weightIndex = -1;

    // Check for model portfolio format: Model,Symbol,Name,Price,Target Percent
    if (headers.includes('model') && headers.includes('symbol') && headers.includes('target percent')) {
      format = 'model';
      modelIndex = headers.indexOf('model');
      symbolIndex = headers.indexOf('symbol');
      nameIndex = headers.indexOf('name');
      priceIndex = headers.indexOf('price');
      weightIndex = headers.indexOf('target percent');
    }
    // Check for simple format: Symbol,Name,Weight,Price (or variations)
    else if (headers.includes('symbol')) {
      symbolIndex = headers.indexOf('symbol');
      nameIndex = headers.findIndex(h => h.includes('name') || h.includes('description'));
      priceIndex = headers.findIndex(h => h.includes('price'));
      weightIndex = headers.findIndex(h => 
        h.includes('weight') || h.includes('percent') || h.includes('allocation') || h.includes('target')
      );
    } else {
      throw new Error('CSV format not recognized. Must include at least Symbol and Weight columns.');
    }

    console.log('Format:', format, 'Indices:', { modelIndex, symbolIndex, nameIndex, priceIndex, weightIndex });

    const parsedHoldings: ModelHolding[] = [];
    let extractedModelName = '';
    let processedRows = 0;

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV with quoted values
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      if (values.length < Math.max(symbolIndex, weightIndex) + 1) {
        console.warn(`Row ${i + 1} has insufficient columns, skipping`);
        continue;
      }

      const symbol = values[symbolIndex]?.trim().toUpperCase();
      if (!symbol || symbol === '') continue;

      // Extract model name from first row if model format
      if (format === 'model' && modelIndex !== -1 && !extractedModelName) {
        extractedModelName = values[modelIndex]?.trim().replace(/['"]/g, '') || '';
      }

      const name = nameIndex !== -1 ? values[nameIndex]?.trim() || symbol : symbol;
      const weightStr = weightIndex !== -1 ? values[weightIndex]?.trim() || '0' : '0';

      // Clean and parse weight (handle percentage format)
      let weight = parseFloat(weightStr.replace(/[%$,]/g, '')) || 0;
      
      // Convert percentage to decimal if it looks like a percentage (> 1)
      if (weight > 1) {
        weight = weight / 100;
      }

      if (weight > 0) {
        parsedHoldings.push({
          symbol,
          name,
          target_weight: weight
        });
        processedRows++;
      }
    }

    if (parsedHoldings.length === 0) {
      throw new Error('No valid holdings found in CSV data');
    }

    // Validate total weight
    const totalWeight = parsedHoldings.reduce((sum, h) => sum + h.target_weight, 0);
    console.log(`Parsed ${processedRows} holdings, total weight: ${totalWeight.toFixed(4)}`);

    // Auto-normalize if weights don't sum to 1 (with some tolerance)
    if (Math.abs(totalWeight - 1.0) > 0.05) {
      console.log('Auto-normalizing weights to sum to 100%');
      parsedHoldings.forEach(h => {
        h.target_weight = h.target_weight / totalWeight;
      });
    }

    return {
      modelName: extractedModelName || `Imported Model ${new Date().toISOString().split('T')[0]}`,
      holdings: parsedHoldings,
      originalTotal: totalWeight
    };
  };

  const handleImportModel = () => {
    try {
      if (importType === 'json') {
        const parsed = JSON.parse(importData);
        
        if (!parsed.model_name || !Array.isArray(parsed.holdings)) {
          throw new Error('Invalid JSON model format');
        }
        
        setModelName(parsed.model_name);
        setDescription(parsed.description || '');
        setHoldings(parsed.holdings.map((h: any) => ({
          symbol: h.symbol || '',
          name: h.name || '',
          target_weight: parseFloat(h.target_weight) || 0
        })));
      } else {
        // CSV import
        const csvResult = parseCSVData(csvData);
        
        setModelName(csvResult.modelName);
        setDescription(`Imported from CSV on ${new Date().toLocaleDateString()}`);
        setHoldings(csvResult.holdings);
        
        // Show success message with details
        const normalized = Math.abs(csvResult.originalTotal - 1.0) > 0.05;
        showSuccess(
          'Import Successful', 
          `Imported ${csvResult.holdings.length} holdings. Original weight: ${(csvResult.originalTotal * 100).toFixed(2)}%${normalized ? ' (Auto-normalized)' : ''}`
        );
      }
      
      setShowImport(false);
      setImportData('');
      setCsvData('');
      setIsCreating(true);
      
    } catch (error) {
      console.error('Import error:', error);
      showError('Import Failed', error instanceof Error ? error.message : 'Invalid format');
    }
  };

  const calculateModelAnalytics = (model: ModelPortfolio) => {
    if (!model.holdings || model.holdings.length === 0) return null;
    
    const maxWeight = Math.max(...model.holdings.map(h => h.target_weight));
    const minWeight = Math.min(...model.holdings.map(h => h.target_weight));
    const avgWeight = model.holdings.reduce((sum, h) => sum + h.target_weight, 0) / model.holdings.length;
    
    return {
      maxWeight,
      minWeight,
      avgWeight,
      concentration: maxWeight,
      diversification: 1 - maxWeight,
      holdingCount: model.holdings.length
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Model Portfolios Manager
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Create, edit, and manage your portfolio models for buy order generation.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Models List */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Model Portfolios</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowImport(true)}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
                >
                  <DocumentArrowUpIcon className="h-4 w-4 mr-1" />
                  Import
                </button>
                <button
                  onClick={handleCreateModel}
                  className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  New
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedModel?.id === model.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => fetchModelDetails(model.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{model.model_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>{model.holding_count} holdings</span>
                        <span>{formatPercentage(model.total_weight)} allocated</span>
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModel(model);
                          setShowAnalytics(true);
                        }}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Analytics"
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportModel(model);
                        }}
                        className="text-purple-600 hover:text-purple-800 p-1"
                        title="Export JSON"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditModel(model);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModel(model.id);
                        }}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {models.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FolderIcon className="mx-auto h-12 w-12 mb-2" />
                  <p>No model portfolios found</p>
                  <p className="text-sm">Create your first model to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Model Details/Editor */}
        <div className="lg:col-span-2">
          {(isEditing || isCreating) ? (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {isCreating ? 'Create New Model' : 'Edit Model'}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveModel}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </div>
              </div>

              {/* Model Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Conservative Growth"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the model"
                  />
                </div>
              </div>

              {/* Holdings */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium">Holdings</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={normalizeWeights}
                      className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
                    >
                      Normalize to 100%
                    </button>
                    <button
                      onClick={addHolding}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {holdings.map((holding, index) => (
                    <div key={index} className="grid grid-cols-10 gap-2 items-center p-2 bg-gray-50 rounded">
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={holding.symbol}
                          onChange={(e) => updateHolding(index, 'symbol', e.target.value.toUpperCase())}
                          className="w-full p-1 text-sm border border-gray-300 rounded"
                          placeholder="Symbol"
                        />
                      </div>
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={holding.name}
                          onChange={(e) => updateHolding(index, 'name', e.target.value)}
                          className="w-full p-1 text-sm border border-gray-300 rounded"
                          placeholder="Name"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          value={holding.target_weight * 100}
                          onChange={(e) => updateHolding(index, 'target_weight', (parseFloat(e.target.value) || 0) / 100)}
                          className="w-full p-1 text-sm border border-gray-300 rounded"
                          placeholder="Weight %"
                          step="0.1"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => removeHolding(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weight Summary */}
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Total Weight:</span>
                    <span className={`font-medium ${
                      Math.abs(holdings.reduce((sum, h) => sum + h.target_weight, 0) - 1.0) <= 0.01
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {formatPercentage(holdings.reduce((sum, h) => sum + h.target_weight, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedModel ? (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{selectedModel.model_name}</h2>
                  <p className="text-gray-600">{selectedModel.description}</p>
                </div>
                <button
                  onClick={() => handleEditModel(selectedModel)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
              </div>

              {/* Holdings Table */}
              {selectedModel.holdings && selectedModel.holdings.length > 0 ? (
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
                          Target Weight
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedModel.holdings.map((holding, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {holding.symbol}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {holding.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatPercentage(holding.target_weight)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No holdings defined for this model</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl shadow-md border border-gray-200 text-center">
              <FolderIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select a Model</h2>
              <p className="text-gray-600">
                Choose a model portfolio from the list to view its details, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Import Model Portfolio</h3>
              <button
                onClick={() => setShowImport(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Import Type Selector */}
            <div className="mb-6">
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => setImportType('csv')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${ 
                    importType === 'csv' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📊 CSV Import
                </button>
                <button
                  onClick={() => setImportType('json')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${ 
                    importType === 'json' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📋 JSON Import
                </button>
              </div>
            </div>

            {importType === 'csv' ? (
              <div className="space-y-4">
                {/* CSV Format Guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">📚 Supported CSV Formats</h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <div>
                      <strong>Model Portfolio Format:</strong>
                      <code className="block bg-white p-2 mt-1 rounded text-xs font-mono">
                        Model,Symbol,Name,Price,Target Percent<br/>
                        "My Model","AAPL","Apple Inc",150.00,25.5<br/>
                        "My Model","MSFT","Microsoft Corp",300.00,30.0
                      </code>
                    </div>
                    <div>
                      <strong>Simple Format:</strong>
                      <code className="block bg-white p-2 mt-1 rounded text-xs font-mono">
                        Symbol,Name,Weight,Price<br/>
                        AAPL,Apple Inc,0.255,150.00<br/>
                        MSFT,Microsoft Corp,0.30,300.00
                      </code>
                    </div>
                    <p className="text-xs mt-2">
                      • Weights can be percentages (25.5) or decimals (0.255)<br/>
                      • Auto-normalizes if weights don't sum to 100%<br/>
                      • Price column is optional
                    </p>
                  </div>
                </div>

                {/* CSV Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste CSV Data:
                  </label>
                  <textarea
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder={`Model,Symbol,Name,Price,Target Percent
"Balanced Growth","VTI","Vanguard Total Stock Market",220.00,40.0
"Balanced Growth","BND","Vanguard Total Bond Market",75.00,30.0
"Balanced Growth","VTIAX","Vanguard Intl Stock Index",28.50,20.0
"Balanced Growth","VNQ","Vanguard Real Estate ETF",85.00,10.0`}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-green-900 mb-2">📋 JSON Format</h4>
                  <code className="block bg-white p-2 text-xs font-mono rounded">
                    {`{
  "model_name": "Example Model",
  "description": "Optional description",
  "holdings": [
    {"symbol": "AAPL", "name": "Apple Inc", "target_weight": 0.4, "price": 150},
    {"symbol": "MSFT", "name": "Microsoft", "target_weight": 0.6, "price": 300}
  ]
}`}
                  </code>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste JSON Data:
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder='{"model_name": "Example Model", "description": "...", "holdings": [...]}'
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowImport(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImportModel}
                disabled={importType === 'csv' ? !csvData.trim() : !importData.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                Import {importType.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && selectedModel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Model Analytics: {selectedModel.model_name}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportModelCSV(selectedModel)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  CSV
                </button>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {(() => {
              const analytics = calculateModelAnalytics(selectedModel);
              if (!analytics) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <ExclamationTriangleIcon className="mx-auto h-12 w-12 mb-2" />
                    <p>No holdings data available for analysis</p>
                  </div>
                );
              }
              
              return (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-900">{selectedModel.holding_count}</div>
                      <div className="text-sm text-blue-600">Holdings</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-900">{formatPercentage(analytics.concentration)}</div>
                      <div className="text-sm text-green-600">Max Weight</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-900">{formatPercentage(analytics.avgWeight)}</div>
                      <div className="text-sm text-purple-600">Avg Weight</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-900">{formatPercentage(analytics.diversification)}</div>
                      <div className="text-sm text-orange-600">Diversification</div>
                    </div>
                  </div>
                  
                  {/* Weight Distribution Chart */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Weight Distribution</h4>
                    <div className="space-y-2">
                      {selectedModel.holdings?.map((holding, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-16 text-sm font-mono">{holding.symbol}</div>
                          <div className="flex-1 mx-3">
                            <div className="w-full bg-gray-200 rounded-full h-4">
                              <div
                                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                                style={{ width: `${holding.target_weight * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-16 text-sm text-right">{formatPercentage(holding.target_weight)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Holdings Details */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <h4 className="font-medium">Detailed Holdings</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Weight</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Value ($10K)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedModel.holdings?.map((holding, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm font-medium">{holding.symbol}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{holding.name}</td>
                              <td className="px-4 py-2 text-sm text-right">{formatPercentage(holding.target_weight)}</td>
                              <td className="px-4 py-2 text-sm text-right">{formatCurrency(holding.target_weight * 10000)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelPortfolios;