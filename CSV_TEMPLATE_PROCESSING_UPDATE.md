# Cost Basis CSV Template Format Processing Update

## Overview
Updated the system to automatically detect and process Cost Basis CSV files that match the template format used by brokerage firms. When this specific format is detected, the system will automatically remove unnecessary header rows and columns.

## Template Format Detection
The system detects the template format by checking for these characteristics:
1. **Line 1**: Account number (just digits, e.g., "67308440")
2. **Line 2**: Export record count (e.g., "43 Records exported")
3. **Line 3**: Report title containing "CostBasis for Single Account as of..."
4. **Line 8**: Headers starting with "Symbol,Name,Acquired/Opened..."

## Automatic Processing
When the template format is detected, the system automatically:
- **Removes rows 1-7**: Eliminates header information (account number, export count, title, totals, etc.)
- **Removes columns 11-14**: Eliminates the following columns:
  - Column 11: Notes
  - Column 12: Original Cost Basis
  - Column 13: ($)Original UGL Gain/Loss
  - Column 14: (%)Original UGL Gain/Loss

## Files Updated
The preprocessing function has been added to the following files:

### Main Application Files
- `/src/index.html` - Main tax harvesting application
- `/src/gemini.html` - Gemini-powered interface
- `/frontend/src/pages/TaxHarvesting.tsx` - React TypeScript version

### Archive Files
- `/archive/index.html` - Archived version
- `/archive/earlierversion.html` - Earlier archived version

## Technical Implementation
A new `preprocessCostBasisCSV()` function has been added to each parsing module that:
1. Analyzes the CSV structure to detect the template format
2. Removes the specified rows and columns if the format matches
3. Returns the cleaned CSV for normal processing
4. Leaves non-template CSV files unchanged

## Usage
No user action is required. The system automatically detects and processes template format CSV files when they are uploaded through the file input interfaces.

## Testing
A test file (`test_csv_preprocessing.html`) has been created to verify the preprocessing functionality works correctly with template format CSV files.

## Backward Compatibility
This update maintains full backward compatibility. CSV files that don't match the template format are processed exactly as before, ensuring existing workflows continue to work without modification.
