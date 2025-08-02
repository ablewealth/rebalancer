# Tax Harvesting Modular Architecture

This repository contains a modular implementation of the tax harvesting algorithm with enhanced safeguards against regressions.

## Key Features

- **Isolated Algorithm Logic**: Separates core algorithm from UI code
- **Version Control**: Explicit versioning of all algorithm changes
- **Multiple Safeguards**: Prevents target overshooting with progressive tolerances
- **Comprehensive Testing**: Automated validation tests for algorithm integrity
- **Backward Compatibility**: Works with existing code through graceful fallbacks

## Getting Started

1. Include the module loader in your HTML:
   ```html
   <script src="js/module-loader.js"></script>
   ```

2. Use the algorithm through the ModuleRegistry:
   ```javascript
   if (window.ModuleRegistry && window.ModuleRegistry.get('algorithm')) {
       const algorithm = window.ModuleRegistry.get('algorithm');
       const result = algorithm.findBestCombination(targetAmount, availableLots);
   }
   ```

## Documentation

- [Modular Architecture](docs/Modular_Architecture.md) - Detailed explanation of the architecture
- [Developer Reference](docs/Developer_Reference.md) - Quick reference for developers
- [Algorithm Changelog](docs/Algorithm_Changelog.md) - History of algorithm changes

## Files

- `src/js/module-loader.js` - Central loader for all modules
- `src/js/algorithm-version-manager.js` - Tracks and enforces version integrity
- `src/js/tax-harvesting-utilities.js` - Common utility functions
- `src/js/tax-harvesting-algorithm.js` - Core algorithm logic with safeguards

## Why This Architecture?

This architecture was created to address recurring issues with the tax harvesting algorithm:

1. **Preventing Regressions**: By isolating core algorithm code, we prevent accidental changes
2. **Enforcing Versioning**: All changes must be explicitly versioned and documented
3. **Multiple Safeguards**: Progressive tolerance system adapts to different target sizes
4. **Automated Testing**: Built-in validation ensures algorithm behavior remains consistent

## Key Improvements

The modular architecture includes several key improvements to the tax harvesting algorithm:

1. **Hard 5% Cap**: Absolute maximum limit on target overshooting
2. **Progressive Tolerance**: 
   - 2% base tolerance
   - 1% for targets > $50,000
   - 0.5% for targets > $100,000
3. **Early Termination**: Algorithm stops at 90% of target
4. **Target Boundary Protection**: Prevents crossing target boundary when already close

## Testing

Append `?runTests=true` to the URL to run validation tests automatically:
```
http://localhost:8080/index.html?runTests=true
```
