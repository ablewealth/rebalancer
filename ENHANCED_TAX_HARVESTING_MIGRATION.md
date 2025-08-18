# Enhanced Tax Harvesting Service Migration Guide

## Overview

The Enhanced Tax Harvesting Service (v2.0.0) introduces significant improvements for dynamic functionality and robustness while maintaining backward compatibility.

## Key Enhancements

### 1. Dynamic Functionality

#### Configurable Tax Rates
- **Before**: Hardcoded 25% tax rate
- **After**: Fully configurable tax rates per jurisdiction and account type

```javascript
const taxConfig = {
    shortTermRate: 0.32,      // 32% for high earners
    longTermRate: 0.20,       // 20% long-term rate
    stateRate: 0.09,          // 9% state tax (CA/NY)
    netInvestmentIncomeRate: 0.038  // 3.8% NIIT
};
```

#### Dynamic Wash Sale Windows
- **Before**: Fixed 30-day buffer
- **After**: Configurable windows per jurisdiction

```javascript
const washSaleConfig = {
    beforeDays: 30,           // Days before sale
    afterDays: 30,            // Days after sale
    totalWindow: 61,          // Total window (US standard)
    jurisdiction: 'US',
    strictMode: true          // Enforce strict compliance
};
```

#### Account Type Support
- **Before**: No account type differentiation
- **After**: Full support for different account types

```javascript
const options = {
    accountTypes: ['taxable'],  // Only process taxable accounts
    // Supports: 'taxable', 'traditional-ira', 'roth-ira', '401k', 'hsa'
};
```

#### Corporate Actions Handling
- **Before**: No corporate action support
- **After**: Automatic adjustment for splits, mergers, spinoffs

```javascript
const corporateActions = [
    {
        symbol: 'AAPL',
        type: 'split',
        date: new Date('2024-08-01'),
        ratio: 4  // 4:1 split
    }
];
```

### 2. Robustness Improvements

#### Input Validation with Zod
- **Before**: Basic type checking
- **After**: Comprehensive schema validation

```javascript
// Automatic validation of all inputs
const validatedPortfolio = await service.validatePortfolioData(portfolioData);
```

#### Structured Error Handling
- **Before**: Generic console errors
- **After**: Specific error types with details

```javascript
try {
    const result = await service.runTaxHarvesting(portfolio, ...);
} catch (error) {
    if (error instanceof InvalidPortfolioDataError) {
        // Handle invalid data
    } else if (error instanceof NoLotsFoundError) {
        // Handle no available lots
    } else if (error instanceof WashSaleViolationError) {
        // Handle wash sale issues
    }
}
```

#### Asynchronous Operations
- **Before**: Synchronous blocking operations
- **After**: Full async/await support

```javascript
const result = await enhancedService.runTaxHarvesting(
    portfolioData,
    targetST,
    targetLT,
    realizedST,
    realizedLT,
    false,
    options
);
```

#### Performance Optimization
- **Before**: Single algorithm for all sizes
- **After**: Adaptive algorithms based on portfolio size

```javascript
const options = {
    performanceMode: true,        // Enable for large portfolios
    optimizationLevel: 'thorough', // 'fast', 'balanced', 'thorough'
    maxLots: 100                  // Limit recommendations
};
```

## Migration Steps

### 1. Install Dependencies

```bash
npm install zod
```

### 2. Update Service Import

```javascript
// Before
const TaxHarvestingService = require('./services/taxHarvestingService');

// After
const { 
    EnhancedTaxHarvestingService,
    TaxHarvestingError,
    InvalidPortfolioDataError 
} = require('./services/enhancedTaxHarvestingService');
```

### 3. Initialize Enhanced Service

```javascript
// Basic initialization
const service = new EnhancedTaxHarvestingService();

// Advanced initialization with custom config
const service = new EnhancedTaxHarvestingService({
    taxConfig: {
        shortTermRate: 0.35,
        longTermRate: 0.20,
        stateRate: 0.10
    },
    washSaleConfig: {
        beforeDays: 30,
        afterDays: 30,
        strictMode: true
    },
    maxPortfolioSize: 5000,
    enableLogging: true
});
```

### 4. Update Method Calls

```javascript
// Before
const result = service.runTaxHarvesting(
    portfolioData,
    targetST,
    targetLT,
    realizedST,
    realizedLT,
    false,
    { useCashRaising: false }
);

// After
const result = await service.runTaxHarvesting(
    portfolioData,
    targetST,
    targetLT,
    realizedST,
    realizedLT,
    false,
    {
        taxConfig: {
            shortTermRate: 0.32,
            longTermRate: 0.20,
            stateRate: 0.09
        },
        washSaleConfig: {
            beforeDays: 30,
            afterDays: 30,
            strictMode: true
        },
        accountTypes: ['taxable'],
        optimizationLevel: 'balanced',
        validateInputs: true
    }
);
```

### 5. Add Error Handling

```javascript
try {
    const result = await service.runTaxHarvesting(...);
    
    // Process successful result
    return {
        success: true,
        data: result
    };
    
} catch (error) {
    if (error instanceof InvalidPortfolioDataError) {
        return {
            success: false,
            error: 'Invalid portfolio data provided',
            details: error.details
        };
    } else if (error instanceof NoLotsFoundError) {
        return {
            success: false,
            error: 'No lots available for harvesting',
            details: error.details
        };
    } else {
        console.error('Unexpected error:', error);
        return {
            success: false,
            error: 'Internal calculation error'
        };
    }
}
```

## Backward Compatibility

The enhanced service maintains full backward compatibility:

1. **Default Values**: All new parameters have sensible defaults
2. **Optional Features**: Advanced features are opt-in
3. **Same Interface**: Core method signature unchanged
4. **Gradual Migration**: Can be adopted incrementally

## Performance Considerations

### For Large Portfolios (>1000 lots)
```javascript
const options = {
    performanceMode: true,
    optimizationLevel: 'fast',
    maxLots: 50
};
```

### For Precise Optimization (smaller portfolios)
```javascript
const options = {
    performanceMode: false,
    optimizationLevel: 'thorough',
    maxLots: 100
};
```

## Testing

The enhanced service includes comprehensive validation:

```javascript
// Test with invalid data
try {
    const result = await service.runTaxHarvesting([
        { symbol: 'TEST', quantity: -1 } // Invalid quantity
    ]);
} catch (error) {
    console.log(error instanceof InvalidPortfolioDataError); // true
}

// Test with wash sale restrictions
const result = await service.runTaxHarvesting(portfolio, 0, -1000, 0, 0, false, {
    washSaleConfig: { strictMode: true }
});
```

## Best Practices

1. **Always use async/await** for the enhanced service
2. **Configure tax rates** based on user's tax situation
3. **Enable validation** in production environments
4. **Use performance mode** for large portfolios
5. **Handle errors gracefully** with specific error types
6. **Cache service instances** for repeated calculations

## Example Complete Implementation

```javascript
const { 
    EnhancedTaxHarvestingService,
    InvalidPortfolioDataError,
    NoLotsFoundError 
} = require('./services/enhancedTaxHarvestingService');

class TaxHarvestingController {
    constructor() {
        this.service = new EnhancedTaxHarvestingService({
            enableLogging: process.env.NODE_ENV === 'development'
        });
    }
    
    async calculateHarvesting(req, res) {
        try {
            const { portfolioData, targetST, targetLT, realizedST, realizedLT, userTaxConfig } = req.body;
            
            const options = {
                taxConfig: userTaxConfig || {
                    shortTermRate: 0.25,
                    longTermRate: 0.15,
                    stateRate: 0.05
                },
                washSaleConfig: {
                    strictMode: true
                },
                accountTypes: ['taxable'],
                optimizationLevel: portfolioData.length > 1000 ? 'fast' : 'balanced',
                validateInputs: true
            };
            
            const result = await this.service.runTaxHarvesting(
                portfolioData,
                targetST,
                targetLT,
                realizedST,
                realizedLT,
                false,
                options
            );
            
            res.json({
                success: true,
                data: result
            });
            
        } catch (error) {
            if (error instanceof InvalidPortfolioDataError) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid portfolio data',
                    details: error.details
                });
            } else if (error instanceof NoLotsFoundError) {
                res.status(404).json({
                    success: false,
                    error: 'No lots available for harvesting',
                    details: error.details
                });
            } else {
                console.error('Tax harvesting error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    }
}
```
