# Tax Harvesting Modular Architecture

## Overview

This document outlines the new modular architecture for the tax harvesting application. The architecture was designed to address recurring issues with algorithm regression and improve long-term stability.

## Core Principles

1. **Separation of Concerns** - Algorithm logic is now isolated from UI code
2. **Version Control** - Each module has explicit versioning
3. **Protected Core Algorithm** - Critical algorithms are protected from accidental changes
4. **Progressive Tolerance** - Stricter tolerance for larger targets (1% for large targets vs 2% base)
5. **Multiple Safeguards** - Multiple independent checks to prevent target overshooting

## Module Structure

The application is now structured into the following modules:

### 1. Algorithm Version Manager (`algorithm-version-manager.js`)

- Tracks all algorithm versions
- Enforces version integrity
- Prevents unauthorized changes
- Provides reversion capability

### 2. Tax Harvesting Utilities (`tax-harvesting-utilities.js`)

- Common utility functions
- Format currency and percentages
- Tolerance checking
- CSV parsing
- Resource path resolution

### 3. Tax Harvesting Algorithm (`tax-harvesting-algorithm.js`)

- Core algorithm logic
- Target adherence with strict limits
- Progressive tolerance system
- Comprehensive validation tests
- Version validation

### 4. Module Loader (`module-loader.js`)

- Central loading for all components
- Proper initialization order
- Dependency management
- Module registry

## How It Works

The architecture loads modules in the following order:

1. Module Loader initializes
2. Version Manager loads (no dependencies)
3. Utilities load (no dependencies)
4. Algorithm loads (depends on Utilities and Version Manager)

The UI code then accesses modules through the Module Registry:

```javascript
// Example usage in UI code
if (window.ModuleRegistry && window.ModuleRegistry.get('algorithm')) {
    const algorithm = window.ModuleRegistry.get('algorithm');
    const result = algorithm.findBestCombination(targetAmount, availableLots);
    // ...
}
```

## Algorithm Safeguards

The tax harvesting algorithm now includes multiple levels of protection:

1. **Hard Caps** - Absolute 5% maximum limit on target overshooting
2. **Progressive Tolerance** - Stricter tolerance for larger targets:
   - 2% base tolerance
   - 1% for targets > $50,000
   - 0.5% for targets > $100,000
3. **Early Termination** - Algorithm stops at 90% of target to prevent overshooting
4. **Cross-Target Boundary Protection** - Prevents crossing target boundary when close
5. **Large Target Safeguards** - Extra caution when handling large targets

## Validation & Testing

The architecture includes a comprehensive testing framework:

- Test scenarios with different target sizes
- Edge case testing
- Automated validation
- Version integrity checking

## Compatibility

The system is designed for backward compatibility:

- Falls back to embedded algorithm if modules aren't available
- Progressive enhancement approach
- No breaking changes to UI code

## Future Enhancements

Potential future improvements:

1. Add automated runtime tests
2. Implement algorithm regression detection
3. Add more sophisticated version management
4. Implement configuration management
5. Add performance monitoring

## Maintenance Guidelines

When maintaining the tax harvesting application:

1. Never modify the algorithm directly in `index.html`
2. Always update the module version when changing algorithm behavior
3. Run validation tests after any changes
4. Document all algorithm changes in version history
5. Monitor algorithm performance with different target sizes
