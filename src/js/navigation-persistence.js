// Data Persistence Module (No Navigation - Uses Existing)
(function() {
    'use strict';

    // Data persistence keys
    const STORAGE_KEYS = {
        TAX_HARVESTING: 'taxHarvestingData',
        BUY_ORDERS: 'buyOrdersData',
        MODEL_PORTFOLIOS: 'modelPortfoliosData',
        PRICE_MANAGER: 'priceManagerData',
        REPORTS: 'reportsData',
        SHARED_DATA: 'sharedAppData',
        LAST_UPDATED: 'lastDataUpdate'
    };

    // Auto-save functionality
    class DataPersistence {
        constructor() {
            this.autoSaveInterval = null;
            this.unsavedChanges = false;
        }

        // Save data to localStorage with timestamp
        saveData(key, data) {
            try {
                const dataToSave = {
                    data: data,
                    timestamp: new Date().toISOString(),
                    version: '1.0'
                };
                localStorage.setItem(key, JSON.stringify(dataToSave));
                localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, new Date().toISOString());
                this.unsavedChanges = false;
                return true;
            } catch (e) {
                console.error('Error saving data:', e);
                if (e.name === 'QuotaExceededError') {
                    alert('Storage quota exceeded. Please clear some data.');
                }
                return false;
            }
        }

        // Load data from localStorage
        loadData(key) {
            try {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    return parsed.data || parsed; // Handle both new and old format
                }
                return null;
            } catch (e) {
                console.error('Error loading data:', e);
                return null;
            }
        }

        // Clear specific data
        clearData(key) {
            localStorage.removeItem(key);
        }

        // Clear all app data
        clearAllData() {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        }

        // Export all data as JSON
        exportAllData() {
            const exportData = {};
            Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
                const data = this.loadData(key);
                if (data) {
                    exportData[name] = data;
                }
            });
            return exportData;
        }

        // Import data from JSON
        importData(jsonData) {
            try {
                const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
                Object.entries(data).forEach(([name, value]) => {
                    const key = STORAGE_KEYS[name];
                    if (key) {
                        this.saveData(key, value);
                    }
                });
                return true;
            } catch (e) {
                console.error('Error importing data:', e);
                return false;
            }
        }

        // Start auto-save
        startAutoSave(callback, interval = 30000) { // Default 30 seconds
            this.stopAutoSave();
            this.autoSaveInterval = setInterval(() => {
                if (this.unsavedChanges && callback) {
                    callback();
                }
            }, interval);
        }

        // Stop auto-save
        stopAutoSave() {
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
                this.autoSaveInterval = null;
            }
        }

        // Mark that there are unsaved changes
        markUnsaved() {
            this.unsavedChanges = true;
        }
    }

    // Add data management buttons to existing navigation
    function enhanceExistingNavigation() {
        // Wait for DOM to be ready
        setTimeout(() => {
            // Find the main nav container
            const navContainer = document.querySelector('nav .flex.justify-between.items-center');
            const mobileNav = document.querySelector('#mobile-menu .space-y-1');
            
            if (navContainer) {
                // First, let's modify the existing middle section to have better spacing
                const middleSection = navContainer.querySelector('.hidden.md\\:flex');
                if (middleSection) {
                    // Update the existing navigation links container to be more compact
                    const linksContainer = middleSection.querySelector('.flex.items-center.space-x-6');
                    if (linksContainer) {
                        // Make navigation links slightly more compact
                        linksContainer.className = 'flex items-center space-x-3';
                        
                        // Make individual nav links more compact
                        const navLinks = linksContainer.querySelectorAll('a.nav-link');
                        navLinks.forEach(link => {
                            // Reduce padding on navigation links
                            link.classList.remove('px-4');
                            link.classList.add('px-3');
                        });
                    }
                }
                
                // Create a new right-side container for data buttons
                const rightSection = document.createElement('div');
                rightSection.className = 'hidden lg:flex items-center space-x-2';
                rightSection.innerHTML = `
                    <button id="saveDataBtn" class="px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition-colors duration-200 flex items-center" title="Save All Data">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2"></path>
                        </svg>
                        Save
                    </button>
                    <button id="exportDataBtn" class="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors duration-200 flex items-center" title="Export Data">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Export
                    </button>
                    <button id="importDataBtn" class="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium transition-colors duration-200 flex items-center" title="Import Data">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        Import
                    </button>
                    <span id="saveStatus" class="text-xs text-green-600 ml-1 font-medium opacity-0 transition-opacity duration-300"></span>
                `;
                
                // Find the mobile menu button to insert before it
                const mobileMenuBtn = navContainer.querySelector('.md\\:hidden');
                if (mobileMenuBtn) {
                    navContainer.insertBefore(rightSection, mobileMenuBtn);
                } else {
                    navContainer.appendChild(rightSection);
                }
                
                // Also add a medium screen version with icon-only buttons
                const mediumSection = document.createElement('div');
                mediumSection.className = 'hidden md:flex lg:hidden items-center space-x-1';
                mediumSection.innerHTML = `
                    <button id="saveDataBtnMd" class="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200" title="Save All Data">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2"></path>
                        </svg>
                    </button>
                    <button id="exportDataBtnMd" class="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200" title="Export Data">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </button>
                    <button id="importDataBtnMd" class="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors duration-200" title="Import Data">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                    </button>
                `;
                
                navContainer.insertBefore(mediumSection, mobileMenuBtn || rightSection);
            }
            
            if (mobileNav) {
                // Add separator for mobile
                const mobileSeparator = document.createElement('div');
                mobileSeparator.className = 'border-t border-gray-200 my-2';
                mobileNav.appendChild(mobileSeparator);
                
                // Add data management buttons for mobile
                const mobileButtons = document.createElement('div');
                mobileButtons.className = 'space-y-1';
                mobileButtons.innerHTML = `
                    <button id="mobileSaveBtn" class="w-full text-left px-3 py-2 bg-green-100 text-green-700 rounded-md text-base font-medium hover:bg-green-200 transition-colors duration-200">
                        Save Data
                    </button>
                    <button id="mobileExportBtn" class="w-full text-left px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-base font-medium hover:bg-blue-200 transition-colors duration-200">
                        Export Data
                    </button>
                    <button id="mobileImportBtn" class="w-full text-left px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-base font-medium hover:bg-purple-200 transition-colors duration-200">
                        Import Data
                    </button>
                `;
                mobileNav.appendChild(mobileButtons);
            }
            
            // Setup button functionality
            setupDataButtons();
        }, 100); // Small delay to ensure DOM is ready
    }

    function setupDataButtons() {
        const persistence = new DataPersistence();
        
        // Desktop save buttons (both full and icon-only)
        document.getElementById('saveDataBtn')?.addEventListener('click', handleSave);
        document.getElementById('saveDataBtnMd')?.addEventListener('click', handleSave);
        // Mobile save button
        document.getElementById('mobileSaveBtn')?.addEventListener('click', handleSave);
        
        function handleSave() {
            if (window.saveCurrentPageData && typeof window.saveCurrentPageData === 'function') {
                window.saveCurrentPageData();
                showSaveStatus('Data saved!');
            } else {
                showSaveStatus('No data to save on this page');
            }
        }
        
        // Desktop export buttons
        document.getElementById('exportDataBtn')?.addEventListener('click', handleExport);
        document.getElementById('exportDataBtnMd')?.addEventListener('click', handleExport);
        // Mobile export button
        document.getElementById('mobileExportBtn')?.addEventListener('click', handleExport);
        
        function handleExport() {
            const data = persistence.exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `portfolio-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showSaveStatus('Data exported!');
        }
        
        // Desktop import buttons
        document.getElementById('importDataBtn')?.addEventListener('click', handleImport);
        document.getElementById('importDataBtnMd')?.addEventListener('click', handleImport);
        // Mobile import button
        document.getElementById('mobileImportBtn')?.addEventListener('click', handleImport);
        
        function handleImport() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (persistence.importData(event.target.result)) {
                            showSaveStatus('Data imported! Refreshing...');
                            setTimeout(() => window.location.reload(), 1000);
                        } else {
                            alert('Error importing data. Please check the file format.');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        }
    }

    function showSaveStatus(message) {
        const status = document.getElementById('saveStatus');
        if (status) {
            status.textContent = message;
            status.style.opacity = '1';
            setTimeout(() => {
                status.style.opacity = '0';
                setTimeout(() => {
                    status.textContent = '';
                }, 300);
            }, 2000);
        } else {
            // Fallback to a temporary notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50';
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.remove();
            }, 2000);
        }
    }

    // Initialize on DOM ready
    function initialize() {
        enhanceExistingNavigation();
        
        // Make persistence available globally
        window.DataPersistence = DataPersistence;
        window.STORAGE_KEYS = STORAGE_KEYS;
        window.dataPersistence = new DataPersistence();
        
        // Set up beforeunload warning for unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (window.dataPersistence.unsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();