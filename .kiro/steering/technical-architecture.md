# Technical Architecture & Implementation Details

## System Architecture

### Production System (HTML/JavaScript)
- **Primary Implementation**: `src/index.html` - Main tax harvesting interface
- **Supporting Pages**: 
  - `src/model-portfolios.html` - Portfolio management
  - `src/buy-orders.html` - Order generation
  - `src/price-manager.html` - Centralized pricing
  - `src/report.html` - Comprehensive reporting

### Full-Stack Alternative (Node.js + React)
- **Backend**: Express.js API with PostgreSQL integration
- **Frontend**: React/TypeScript with Tailwind CSS
- **Purpose**: Modern deployment alternative to HTML version

## Core Algorithms

### Tax Harvesting Algorithm
```javascript
// Location: src/index.html - generateAdvancedRecommendations()
// Features:
- Multi-constraint optimization
- Position categorization (ST/LT gains/losses)
- Wash sale detection and avoidance
- Target achievement with precision controls
```

### Cash Raising Algorithm (NEW)
```javascript
// Location: src/index.html - generateCashRaisingRecommendations()
// Features:
- Tax-optimized cash generation
- Constraint satisfaction with thresholds
- Multiple optimization strategies
- Precision targeting (1% overage limit)
- Intelligent constraint relaxation
```

### Wash Sale Detection
```javascript
// Location: src/index.html - checkWashSaleViolations()
// Features:
- ETF similarity scoring (0-100 scale)
- Risk tier classification
- Alternative ETF recommendations
- IRS Section 1091 compliance
```

## Data Flow

### Input Processing
1. **CSV Upload** → `parseCostBasisCSV()` → Data validation → Portfolio display
2. **YTD Gains** → `parseYtdCSV()` → Auto-population of realized gains
3. **User Parameters** → Mode selection → Algorithm configuration

### Algorithm Execution
1. **Health Check** → `performSystemHealthCheck()` → Validation
2. **Position Processing** → Categorization → Constraint checking
3. **Optimization** → Selection → Validation → Results

### Output Generation
1. **Results Display** → `displayResults()` → Professional formatting
2. **AI Analysis** → `generateMockAiAnalysis()` → Mode-aware insights
3. **Export** → CSV generation → Download functionality

## Key Technical Features

### Debugging System
- **Comprehensive Logging**: Multi-category debug framework
- **Real-time Validation**: Data consistency checks throughout
- **Error Detection**: Suspicious value flagging and correction
- **Audit Trail**: Complete algorithm decision tracking

### User Experience
- **Mode Toggle**: Seamless switching between Tax Target and Cash Raising
- **Real-time Feedback**: Progress indicators and status updates
- **Professional UI**: Tailwind CSS with responsive design
- **Error Handling**: Graceful degradation with user-friendly messages

### Data Validation
- **Schema Validation**: Type checking and range validation
- **Calculation Verification**: Cross-checks all financial calculations
- **Consistency Checks**: Ensures data integrity across transformations
- **Health Monitoring**: Pre-calculation system integrity verification

## Performance Optimizations

### Algorithm Efficiency
- **Position Categorization**: Pre-sorting for optimal selection
- **Constraint Satisfaction**: Early termination when targets met
- **Memory Management**: Efficient data structures and cleanup
- **Calculation Caching**: Avoid redundant computations

### User Interface
- **Lazy Loading**: Progressive data display
- **Responsive Design**: Mobile-optimized layouts
- **Smooth Transitions**: CSS animations for professional feel
- **Error Boundaries**: Graceful handling of edge cases

## Security Considerations

### Data Handling
- **Client-Side Processing**: No sensitive data sent to servers
- **Local Storage**: Temporary data storage for session continuity
- **Input Validation**: Comprehensive sanitization and validation
- **Error Logging**: Secure error handling without data exposure

### Compliance
- **IRS Section 1091**: Wash sale rule compliance
- **Financial Accuracy**: Precise calculations with validation
- **Audit Trail**: Complete transaction logging
- **Documentation**: Comprehensive legal disclaimers

This architecture provides a robust, scalable foundation for sophisticated tax optimization while maintaining security and user experience standards.