# Tax Harvesting Developer Reference

## Quick Start

To use the tax harvesting modules in your code:

1. Include the module loader in your HTML file:
   ```html
   <script src="js/module-loader.js"></script>
   ```

2. Access modules through the ModuleRegistry:
   ```javascript
   if (window.ModuleRegistry && window.ModuleRegistry.get('algorithm')) {
       const algorithm = window.ModuleRegistry.get('algorithm');
       const result = algorithm.findBestCombination(targetAmount, availableLots);
   }
   ```

## Module Reference

### Algorithm Version Manager (`algorithm-version-manager.js`)

```javascript
// Get current version of an algorithm
const version = AlgorithmVersionManager.getCurrentVersion('tax-harvesting');

// Verify algorithm integrity
const isValid = AlgorithmVersionManager.verifyIntegrity('tax-harvesting', code);

// Record a new algorithm version
AlgorithmVersionManager.recordNewVersion(
    'tax-harvesting',
    '1.0.2',
    'Description of changes',
    ['Feature 1', 'Feature 2'],
    codeString
);
```

### Tax Harvesting Utilities (`tax-harvesting-utilities.js`)

```javascript
// Format currency
const formatted = TaxHarvestingUtilities.formatCurrency(1234.56);  // "$1,234.56"
const formattedWithSign = TaxHarvestingUtilities.formatCurrency(1234.56, true);  // "+$1,234.56"

// Format percentage
const percentage = TaxHarvestingUtilities.formatPercentage(0.1234);  // "12.34%"

// Calculate percentage difference
const diff = TaxHarvestingUtilities.percentageDifference(110, 100);  // 0.10

// Check tolerance
const withinTolerance = TaxHarvestingUtilities.isWithinTolerance(105, 100, 0.05);  // true

// Parse CSV
const data = TaxHarvestingUtilities.parseCSV(csvString);

// Load file
const content = await TaxHarvestingUtilities.loadFile('path/to/file.csv');

// Resolve resource path
const path = TaxHarvestingUtilities.resolveResourcePath('../data/file.csv');
```

### Tax Harvesting Algorithm (`tax-harvesting-algorithm.js`)

```javascript
// Get algorithm version
const version = TaxHarvestingAlgorithm.version;  // "1.0.1"

// Find best combination for tax harvesting
const selectedLots = TaxHarvestingAlgorithm.findBestCombination(
    targetAmount,  // e.g., 10000 for $10k gain, -5000 for $5k loss
    availableLots  // Array of lot objects
);

// Generate recommendations based on ST and LT targets
const recommendations = TaxHarvestingAlgorithm.generateRecommendations(
    shortTermTarget,
    longTermTarget,
    portfolioData
);

// Run validation tests
const allTestsPassed = TaxHarvestingAlgorithm.runValidationTests();

// Validate version integrity
const isValidVersion = TaxHarvestingAlgorithm.validateVersion();
```

### Module Loader (`module-loader.js`)

```javascript
// Get a loaded module
const algorithm = ModuleRegistry.get('algorithm');

// Check if dependencies are loaded
const dependenciesLoaded = ModuleRegistry.checkDependencies(['utilities', 'algorithm']);

// Register a custom module
ModuleRegistry.register('myModule', myModuleObject, '1.0.0');
```

## Algorithm Input/Output Formats

### Lot Object Format

```javascript
// Input lot format
{
    symbol: "AAPL",           // Stock symbol
    quantity: 100,            // Number of shares
    price: 150,               // Current price per share
    unrealizedGain: 5000,     // Unrealized gain/loss amount
    term: "Long",             // "Long" or "Short"
    includedInSelling: true,  // Whether lot is eligible for selling
    costBasis: 100            // Optional: Cost basis per share
}

// Output lot format (all input properties plus:)
{
    sharesToSell: 100,        // Number of shares to sell
    actualGain: 5000,         // Actual gain/loss from the sale
    proceeds: 15000,          // Total proceeds from the sale
    reason: "Tax Gain Harvesting" // Reason for recommendation
}
```

## Testing

To run algorithm validation tests, append `?runTests=true` to the URL:
```
http://localhost:8080/index.html?runTests=true
```

## Common Issues & Solutions

### Module Not Found

If `ModuleRegistry.get('moduleName')` returns null, check:
1. Ensure the module-loader.js is included before other scripts
2. Check browser console for script loading errors
3. Verify file paths in loadScript() calls

### Algorithm Exceeding Targets

If the algorithm still exceeds targets:
1. Verify you're using the latest algorithm version
2. Check that targets are reasonable given available lots
3. Use the module directly rather than embedded code:
   ```javascript
   TaxHarvestingAlgorithm.findBestCombination(target, lots);
   ```

### Version Mismatch

If you see "Algorithm version mismatch" errors:
1. Update AlgorithmVersionManager.versions to match TaxHarvestingAlgorithm.version
2. Ensure all files are properly deployed

## Algorithm Parameters

The tax harvesting algorithm uses these key parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| Base Tolerance | 2% | Basic tolerance for target adherence |
| Large Target Tolerance | 1% | Stricter tolerance for targets > $50k |
| Very Large Target Tolerance | 0.5% | Strictest tolerance for targets > $100k |
| Maximum Overshoot | 5% | Hard limit on maximum target exceedance |
| Early Termination | 90% | Stops adding positions at this % of target |

## Customizing Algorithm Behavior

To adjust algorithm behavior, modify these parameters in `tax-harvesting-algorithm.js`:

1. Tolerance thresholds (`tolerancePercent`)
2. Early termination percentage (`targetAmount * 0.90`)
3. Maximum limit multiplier (`targetAmount * 1.05`)

Always create a new version when modifying these parameters.
