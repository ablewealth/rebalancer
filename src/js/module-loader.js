/**
 * Tax Harvesting Module Loader
 * 
 * This file provides central loading for all tax harvesting components,
 * ensuring proper initialization order and compatibility.
 * It also acts as a registry for all modular components.
 */

// Keep track of loaded modules
const ModuleRegistry = {
    loaded: {},
    versions: {},
    
    /**
     * Register a module as loaded
     * 
     * @param {string} name - Module name
     * @param {object} module - Module object
     * @param {string} version - Module version
     */
    register: function(name, module, version) {
        this.loaded[name] = module;
        this.versions[name] = version;
        console.log(`Module registered: ${name} v${version}`);
    },
    
    /**
     * Get a loaded module
     * 
     * @param {string} name - Module name
     * @returns {object|null} Module object or null if not loaded
     */
    get: function(name) {
        return this.loaded[name] || null;
    },
    
    /**
     * Check if all required modules are loaded
     * 
     * @param {Array} requiredModules - Array of required module names
     * @returns {boolean} Whether all required modules are loaded
     */
    checkDependencies: function(requiredModules) {
        for (const module of requiredModules) {
            if (!this.loaded[module]) {
                console.error(`Required module '${module}' not loaded`);
                return false;
            }
        }
        return true;
    }
};

/**
 * Load all required modules in proper order
 */
async function loadModules() {
    console.log('Loading Tax Harvesting modules...');
    
    try {
        // First load the version manager (no dependencies)
        await loadScript('js/algorithm-version-manager.js')
            .then(() => {
                if (!window.AlgorithmVersionManager) {
                    throw new Error('AlgorithmVersionManager not defined after loading');
                }
                ModuleRegistry.register('versionManager', 
                                       window.AlgorithmVersionManager,
                                       '1.0.0');
            })
            .catch(err => {
                console.error('Failed to load Version Manager:', err);
                throw err;
            });
        
        // Next load utilities (no dependencies)
        await loadScript('js/tax-harvesting-utilities.js')
            .then(() => {
                if (!window.TaxHarvestingUtilities) {
                    throw new Error('TaxHarvestingUtilities not defined after loading');
                }
                ModuleRegistry.register('utilities', 
                                       window.TaxHarvestingUtilities,
                                       '1.0.0');
            })
            .catch(err => {
                console.error('Failed to load Utilities:', err);
                throw err;
            });
        
        // Finally load the algorithm (depends on utilities and version manager)
        if (ModuleRegistry.checkDependencies(['utilities', 'versionManager'])) {
            // EMERGENCY FIX: Use the emergency version of the algorithm
            await loadScript('js/tax-harvesting-algorithm-emergency.js')
                .then(() => {
                    if (!window.TaxHarvestingAlgorithm) {
                        throw new Error('TaxHarvestingAlgorithm not defined after loading');
                    }
                    ModuleRegistry.register('algorithm', 
                                           window.TaxHarvestingAlgorithm,
                                           window.TaxHarvestingAlgorithm.version);
                    console.log('✅ Successfully loaded EMERGENCY TaxHarvestingAlgorithm v' + window.TaxHarvestingAlgorithm.version);
                })
                .catch(err => {
                    console.error('Failed to load Algorithm:', err);
                    throw err;
                });
        }
        
        console.log('Module loading complete. Available modules:', Object.keys(ModuleRegistry.loaded).join(', '));
    } catch (error) {
        console.error('❌ ERROR DURING MODULE LOADING:', error);
        console.warn('Falling back to embedded algorithm due to module loading failure');
    }
    
    // Run automated tests if in test mode
    if (window.location.search.includes('runTests=true')) {
        if (window.TaxHarvestingAlgorithm && 
            typeof window.TaxHarvestingAlgorithm.runValidationTests === 'function') {
            window.TaxHarvestingAlgorithm.runValidationTests();
        }
    }
}

/**
 * Load a script asynchronously
 * 
 * @param {string} src - Script path relative to current page
 * @returns {Promise} Promise resolving when script is loaded
 */
function loadScript(src) {
    // Ensure we have the correct path relative to the current page
    const baseDir = getBaseDir();
    const fullPath = baseDir + src;
    
    console.log(`Loading script: ${fullPath}`);
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = fullPath;
        script.onload = () => {
            console.log(`Script loaded successfully: ${fullPath}`);
            resolve();
        };
        script.onerror = (err) => {
            console.error(`Error loading script: ${fullPath}`, err);
            reject(err);
        };
        document.head.appendChild(script);
    });
}

/**
 * Get the base directory of the current page
 * 
 * @returns {string} Base directory path with trailing slash
 */
function getBaseDir() {
    // Get the current page path
    const fullPath = window.location.pathname;
    
    // Extract just the directory part (everything before the last slash)
    const lastSlashIndex = fullPath.lastIndexOf('/');
    if (lastSlashIndex === -1) return '/';
    
    return fullPath.substring(0, lastSlashIndex + 1);
}

// Automatically load modules when page loads
window.addEventListener('DOMContentLoaded', loadModules);

// Make registry available globally
window.ModuleRegistry = ModuleRegistry;
