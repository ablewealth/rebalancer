/**
 * Tax Harvesting Utilities
 * 
 * Common utility functions used across the tax harvesting application.
 * This isolates shared functionality to prevent duplication and ensure
 * consistent behavior across the application.
 */

const TaxHarvestingUtilities = {
    /**
     * Format a currency value for display
     * 
     * @param {number} value - The number to format
     * @param {boolean} showPositiveSign - Whether to show + for positive values
     * @returns {string} Formatted currency string
     */
    formatCurrency: function(value, showPositiveSign = false) {
        if (isNaN(value)) return "$0.00";
        
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        const formattedValue = formatter.format(Math.abs(value));
        
        if (value < 0) {
            return "-" + formattedValue;
        } else if (value > 0 && showPositiveSign) {
            return "+" + formattedValue;
        } else {
            return formattedValue;
        }
    },
    
    /**
     * Format a percentage for display
     * 
     * @param {number} value - The decimal value to format as percentage
     * @param {number} digits - Number of decimal places
     * @returns {string} Formatted percentage string
     */
    formatPercentage: function(value, digits = 2) {
        if (isNaN(value)) return "0.00%";
        
        const percentage = value * 100;
        return percentage.toFixed(digits) + "%";
    },
    
    /**
     * Calculate percentage difference between two values
     * 
     * @param {number} current - Current value
     * @param {number} target - Target value
     * @returns {number} Percentage difference as decimal
     */
    percentageDifference: function(current, target) {
        if (target === 0) return current === 0 ? 0 : Infinity;
        return (current - target) / Math.abs(target);
    },
    
    /**
     * Check if value is within tolerance of target
     * 
     * @param {number} value - Value to check
     * @param {number} target - Target value
     * @param {number} tolerance - Acceptable percentage difference (decimal)
     * @returns {boolean} Whether value is within tolerance
     */
    isWithinTolerance: function(value, target, tolerance) {
        // Special case: if target is 0, check if value is 0
        if (target === 0) return value === 0;
        
        const difference = Math.abs((value - target) / target);
        return difference <= tolerance;
    },
    
    /**
     * Parse CSV data into an array of objects
     * 
     * @param {string} csvData - CSV data as string
     * @param {boolean} hasHeader - Whether CSV has header row
     * @returns {Array} Array of objects with property names from header
     */
    parseCSV: function(csvData, hasHeader = true) {
        if (!csvData) return [];
        
        const lines = csvData.split('\n');
        if (lines.length === 0) return [];
        
        const results = [];
        const headers = hasHeader ? lines[0].split(',').map(h => h.trim()) : null;
        
        const startIndex = hasHeader ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',').map(v => v.trim());
            
            if (hasHeader) {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                results.push(obj);
            } else {
                results.push(values);
            }
        }
        
        return results;
    },
    
    /**
     * Load a file as text using fetch
     * 
     * @param {string} url - URL or path to file
     * @returns {Promise<string>} Promise resolving to file contents
     */
    loadFile: async function(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error loading file ${url}:`, error);
            throw error;
        }
    },
    
    /**
     * Find the absolute path for a resource based on current page
     * 
     * @param {string} relativePath - Relative path to resource
     * @returns {string} Absolute path to resource
     */
    resolveResourcePath: function(relativePath) {
        // Get the base path from current page
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/');
        
        // Remove the filename from the path
        pathParts.pop();
        
        // Handle relative path navigation
        const relativePathParts = relativePath.split('/');
        
        for (const part of relativePathParts) {
            if (part === '..') {
                pathParts.pop();
            } else if (part !== '.' && part) {
                pathParts.push(part);
            }
        }
        
        // Join the path parts and create absolute path
        return pathParts.join('/');
    }
};

// Export the module for use in the application
if (typeof module !== 'undefined') {
    module.exports = TaxHarvestingUtilities;
} else if (typeof window !== 'undefined') {
    window.TaxHarvestingUtilities = TaxHarvestingUtilities;
}
