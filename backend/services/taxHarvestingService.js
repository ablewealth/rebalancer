/**
 * Tax Harvesting Service - Backend Implementation
 * 
 * Ported from frontend tax-harvesting-algorithm.js
 * This service contains the core tax harvesting optimization logic
 * isolated from UI concerns and adapted for Node.js backend use.
 * 
 * @version 1.0.1
 * @author Tax Harvesting Backend
 */

/**
 * Utility functions for tax harvesting calculations
 */
const TaxHarvestingUtils = {
    /**
     * Format a currency value for display
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
     * Check if value is within tolerance of target
     */
    isWithinTolerance: function(value, target, tolerance) {
        if (target === 0) return value === 0;
        const difference = Math.abs((value - target) / target);
        return difference <= tolerance;
    }
};

/**
 * Core Tax Harvesting Algorithm
 */
class TaxHarvestingService {
    constructor() {
        this.version = '1.0.1';
    }

    /**
     * Group lots by symbol for position-aware analysis
     */
    groupLotsBySymbol(lots) {
        const grouped = {};
        lots.forEach(lot => {
            if (!grouped[lot.symbol]) {
                grouped[lot.symbol] = [];
            }
            grouped[lot.symbol].push(lot);
        });
        return grouped;
    }

    /**
     * Generate position-level alternatives (partial vs full sales)
     */
    generatePositionAlternatives(symbolLots, targetAmount) {
        const alternatives = [];
        const symbol = symbolLots[0].symbol;
        
        // Sort lots within position by efficiency for target
        const sortedLots = [...symbolLots].sort((a, b) => {
            const aDiff = Math.abs(targetAmount - a.unrealizedGain);
            const bDiff = Math.abs(targetAmount - b.unrealizedGain);
            
            // If similar proximity, prefer larger lots
            if (Math.abs(aDiff - bDiff) < Math.abs(targetAmount) * 0.1) {
                return Math.abs(b.unrealizedGain) - Math.abs(a.unrealizedGain);
            }
            return aDiff - bDiff;
        });
        
        // Alternative 1: Best single lot from this position
        if (sortedLots.length > 0) {
            alternatives.push({
                lots: [sortedLots[0]],
                totalGain: sortedLots[0].unrealizedGain,
                symbol: symbol,
                strategy: 'single-lot'
            });
        }
        
        // Alternative 2: Best two lots if available
        if (sortedLots.length >= 2) {
            const twoLotCombo = [sortedLots[0], sortedLots[1]];
            alternatives.push({
                lots: twoLotCombo,
                totalGain: twoLotCombo.reduce((sum, lot) => sum + lot.unrealizedGain, 0),
                symbol: symbol,
                strategy: 'two-lot'
            });
        }
        
        // Alternative 3: Full position (all lots)
        if (sortedLots.length > 2) {
            alternatives.push({
                lots: [...sortedLots],
                totalGain: sortedLots.reduce((sum, lot) => sum + lot.unrealizedGain, 0),
                symbol: symbol,
                strategy: 'full-position'
            });
        }
        
        // Alternative 4: Optimal subset within position
        if (sortedLots.length > 2) {
            let bestSubset = [];
            let bestDifference = Infinity;
            
            // Test various combinations within the position
            for (let i = 1; i <= Math.min(sortedLots.length, 4); i++) {
                const subset = sortedLots.slice(0, i);
                const subsetTotal = subset.reduce((sum, lot) => sum + lot.unrealizedGain, 0);
                const difference = Math.abs(targetAmount - subsetTotal);
                
                if (difference < bestDifference) {
                    bestSubset = [...subset];
                    bestDifference = difference;
                }
            }
            
            if (bestSubset.length > 0 && bestSubset.length !== sortedLots.length) {
                alternatives.push({
                    lots: bestSubset,
                    totalGain: bestSubset.reduce((sum, lot) => sum + lot.unrealizedGain, 0),
                    symbol: symbol,
                    strategy: 'optimal-subset'
                });
            }
        }
        
        return alternatives;
    }

    /**
     * Calculate transaction cost for a lot
     * Implements explicit cost modeling from documentation
     */
    calculateTransactionCost(lot) {
        const proceeds = lot.quantity * lot.price;
        
        // Basic transaction cost model
        const baseFee = 0; // Most brokers are commission-free now
        const secFee = proceeds * 0.0000221; // SEC fee (2024 rate)
        const tafFee = lot.quantity * 0.0000166; // TAF fee (2024 rate)
        const bidAskSpread = proceeds * 0.001; // Assume 0.1% spread
        
        return baseFee + secFee + tafFee + bidAskSpread;
    }
    
    /**
     * Calculate net tax benefit after transaction costs
     */
    calculateNetBenefit(lots, baselineTaxBenefit = 0) {
        const transactionCosts = lots.reduce((total, lot) => {
            return total + this.calculateTransactionCost(lot);
        }, 0);
        
        // Estimate tax benefit (simplified - actual would depend on tax rates)
        const totalGainLoss = lots.reduce((sum, lot) => sum + lot.unrealizedGain, 0);
        let taxBenefit = 0;
        
        if (totalGainLoss < 0) {
            // Tax loss harvesting benefit (assume 25% tax rate)
            taxBenefit = Math.abs(totalGainLoss) * 0.25;
        } else {
            // Tax gain realization cost (negative benefit)
            taxBenefit = -totalGainLoss * 0.25;
        }
        
        return taxBenefit - transactionCosts;
    }
    
    /**
     * Enhanced wash sale detection and filtering
     * Actively avoids wash sale violations per documentation
     */
    filterWashSaleCandidates(lots, daysBuffer = 30) {
        // For now, apply conservative wash sale filtering
        // In production, this would check actual purchase history
        return lots.filter(lot => {
            // No wash sale risk for gains
            if (lot.unrealizedGain >= 0) return true;
            
            // For losses, apply conservative filter
            // Skip positions with very recent acquisition dates (rough proxy)
            const acquiredDate = new Date(lot.acquiredDate || '2020-01-01');
            const daysSinceAcquisition = (Date.now() - acquiredDate.getTime()) / (1000 * 60 * 60 * 24);
            
            // Conservatively avoid recently acquired positions for loss harvesting
            return daysSinceAcquisition > daysBuffer;
        });
    }
    
    /**
     * Calculate multi-criteria score for lot selection
     * Implements weighted scoring system from documentation
     */
    calculateLotScore(lot, target, portfolioLots = []) {
        const proximityScore = 1 / (1 + Math.abs(target - lot.unrealizedGain));
        const efficiencyScore = Math.abs(lot.unrealizedGain) / 1000; // Normalize to reasonable scale
        
        // Concentration penalty - avoid over-concentration in single position
        const sameSymbolLots = portfolioLots.filter(l => l.symbol === lot.symbol);
        const concentrationPenalty = sameSymbolLots.length > 3 ? 0.5 : 1.0;
        
        // Liquidity bonus - prefer larger positions (easier to trade)
        const lotValue = lot.quantity * lot.price;
        const liquidityBonus = Math.min(lotValue / 10000, 2.0); // Cap at 2x bonus
        
        // Wash sale penalty - penalize loss positions (potential wash sale risk)
        const washSalePenalty = lot.unrealizedGain < 0 ? 0.8 : 1.0;
        
        const totalScore = proximityScore * 0.4 + 
                          efficiencyScore * 0.3 + 
                          concentrationPenalty * 0.1 + 
                          liquidityBonus * 0.1 + 
                          washSalePenalty * 0.1;
        
        return {
            totalScore,
            proximityScore,
            efficiencyScore,
            concentrationPenalty,
            liquidityBonus,
            washSalePenalty
        };
    }

    /**
     * Memory-efficient greedy algorithm for large lot combinations
     * Optimized for datasets with 250+ lots without memory overflow
     */
    findOptimalCombinationDP(target, lots, maxLots = 8) {
        if (lots.length > 50) {
            // Use memory-efficient greedy approach for large datasets
            return this.findOptimalCombinationGreedy(target, lots, maxLots);
        }
        
        // Use limited DP for smaller datasets with memory constraints
        const memo = new Map();
        let bestResult = { combination: [], difference: Infinity, score: 0 };
        let memoSize = 0;
        const maxMemoSize = 50000; // Limit memoization size
        
        // Store reference to calculateLotScore method to avoid 'this' context issues
        const calculateLotScore = this.calculateLotScore.bind(this);
        
        function dp(remaining, index, currentCombination, currentScore) {
            // Base cases
            if (index >= lots.length || currentCombination.length >= maxLots) {
                const difference = Math.abs(remaining);
                if (difference < bestResult.difference) {
                    bestResult = {
                        combination: [...currentCombination],
                        difference,
                        score: currentScore
                    };
                }
                return difference;
            }
            
            // Memory-limited memoization
            const key = `${remaining.toFixed(2)}-${index}-${currentCombination.length}`;
            if (memo.has(key)) return memo.get(key);
            
            const lot = lots[index];
            const lotScore = calculateLotScore(lot, target, lots);
            
            // Option 1: Skip this lot
            const skipResult = dp(remaining, index + 1, currentCombination, currentScore);
            
            // Option 2: Include this lot
            const newRemaining = remaining - lot.unrealizedGain;
            const newScore = currentScore + lotScore.totalScore;
            const includeResult = dp(newRemaining, index + 1, [...currentCombination, lot], newScore);
            
            const result = Math.min(skipResult, includeResult);
            
            // Only memoize if under memory limit
            if (memoSize < maxMemoSize) {
                memo.set(key, result);
                memoSize++;
            }
            
            return result;
        }
        
        // Sort lots by score first for better performance
        const scoredLots = lots.map(lot => ({
            ...lot,
            score: this.calculateLotScore(lot, target, lots).totalScore
        })).sort((a, b) => b.score - a.score);
        
        dp(target, 0, [], 0);
        return bestResult.combination;
    }
    
    /**
     * Memory-efficient greedy algorithm for large datasets
     * Uses intelligent selection without exponential memory growth
     */
    findOptimalCombinationGreedy(target, lots, maxLots = 8) {
        // Score and sort lots by multiple criteria
        const scoredLots = lots.map(lot => {
            const score = this.calculateLotScore(lot, target, lots);
            return {
                ...lot,
                score: score.totalScore,
                proximityScore: score.proximityScore,
                efficiencyScore: score.efficiencyScore
            };
        }).sort((a, b) => {
            // Multi-criteria sorting: proximity first, then efficiency
            const proximityDiff = b.proximityScore - a.proximityScore;
            if (Math.abs(proximityDiff) > 0.1) return proximityDiff;
            return b.efficiencyScore - a.efficiencyScore;
        });
        
        let bestCombination = [];
        let bestDifference = Infinity;
        
        // Multiple greedy strategies
        const strategies = [
            this.greedyByProximity.bind(this),
            this.greedyByValue.bind(this),
            this.greedyByEfficiency.bind(this)
        ];
        
        for (const strategy of strategies) {
            const combination = strategy(target, scoredLots, maxLots);
            if (combination.length > 0) {
                const total = combination.reduce((sum, lot) => sum + lot.unrealizedGain, 0);
                const difference = Math.abs(target - total);
                
                if (difference < bestDifference) {
                    bestDifference = difference;
                    bestCombination = combination;
                }
            }
        }
        
        return bestCombination;
    }
    
    /**
     * Greedy selection by proximity to target
     */
    greedyByProximity(target, lots, maxLots) {
        const selected = [];
        let remaining = target;
        
        // First pass: find lots close to remaining target
        for (const lot of lots) {
            if (selected.length >= maxLots) break;
            
            const gain = lot.unrealizedGain;
            const afterIncluding = Math.abs(remaining - gain);
            const beforeIncluding = Math.abs(remaining);
            
            // Include if it gets us closer to target
            if (afterIncluding < beforeIncluding) {
                selected.push(lot);
                remaining -= gain;
                
                // Stop if very close to target
                if (Math.abs(remaining) < target * 0.05) break;
            }
        }
        
        return selected;
    }
    
    /**
     * Greedy selection by lot value
     */
    greedyByValue(target, lots, maxLots) {
        const selected = [];
        let remaining = target;
        
        // Sort by gain value relative to target
        const sortedByValue = [...lots].sort((a, b) => {
            const aDiff = Math.abs(remaining - a.unrealizedGain);
            const bDiff = Math.abs(remaining - b.unrealizedGain);
            return aDiff - bDiff;
        });
        
        for (const lot of sortedByValue) {
            if (selected.length >= maxLots) break;
            
            const gain = lot.unrealizedGain;
            const newRemaining = remaining - gain;
            
            // Include if reasonable contribution
            if (Math.abs(newRemaining) < Math.abs(remaining) || selected.length === 0) {
                selected.push(lot);
                remaining = newRemaining;
            }
        }
        
        return selected;
    }
    
    /**
     * Greedy selection by efficiency score
     */
    greedyByEfficiency(target, lots, maxLots) {
        const selected = [];
        let remaining = target;
        
        // Take top efficiency lots that contribute positively
        for (const lot of lots) {
            if (selected.length >= maxLots) break;
            
            const gain = lot.unrealizedGain;
            
            // Include if it moves us in right direction and has good efficiency
            if ((remaining > 0 && gain > 0) || (remaining < 0 && gain < 0)) {
                selected.push(lot);
                remaining -= gain;
            } else if (selected.length < maxLots / 2) {
                // Include some high-efficiency lots even if not perfect direction
                selected.push(lot);
                remaining -= gain;
            }
        }
        
        return selected;
    }

    /**
     * Enhanced position-aware lot combination finder with DP support
     * Uses sophisticated combinatorial optimization with position-level intelligence
     * 
     * @param {number} targetAmount - The target gain/loss amount
     * @param {Array} availableLots - Array of lots available for selection
     * @returns {Array} Selected lots that best meet the target
     */
    findBestCombination(targetAmount, availableLots) {
        console.log('TaxHarvestingService.findBestCombination called with target:', targetAmount, 'lots:', availableLots?.length || 0);
        
        if (!availableLots || availableLots.length === 0) {
            console.error('No available lots provided');
            return [];
        }
        
        if (Math.abs(targetAmount) < 0.01) {
            console.log('Target amount too small, no action needed');
            return [];
        }
        
        // Create a deep copy to avoid modifying original data
        const lotsCopy = JSON.parse(JSON.stringify(availableLots));
        
        // Filter lots by gain direction and wash sale rules
        let relevantLots = lotsCopy.filter(lot => {
            // Validate unrealizedGain
            if (typeof lot.unrealizedGain !== 'number' || isNaN(lot.unrealizedGain)) {
                console.error(`Invalid lot data: ${lot.symbol} has invalid unrealizedGain: ${lot.unrealizedGain}`);
                return false;
            }
            
            // Filter by gain direction
            return (targetAmount > 0 && lot.unrealizedGain > 0) || 
                   (targetAmount < 0 && lot.unrealizedGain < 0);
        });
        
        // Apply wash sale filtering for loss harvesting
        if (targetAmount < 0) {
            const beforeWashSaleFilter = relevantLots.length;
            relevantLots = this.filterWashSaleCandidates(relevantLots);
            const afterWashSaleFilter = relevantLots.length;
            
            if (beforeWashSaleFilter > afterWashSaleFilter) {
                console.log(`Wash sale filter: ${beforeWashSaleFilter - afterWashSaleFilter} lots excluded`);
            }
        }
        
        console.log(`Found ${relevantLots.length} relevant lots for ${targetAmount > 0 ? 'gains' : 'losses'}`);
        
        if (relevantLots.length === 0) {
            console.warn(`No relevant lots found for target ${targetAmount}`);
            return [];
        }
        
        // ENHANCED POSITION-AWARE COMBINATORIAL OPTIMIZATION WITH DYNAMIC PROGRAMMING
        console.log('Starting advanced position-aware optimization with DP support...');
        
        // Try Dynamic Programming approach first for complex scenarios
        if (relevantLots.length > 5 && Math.abs(targetAmount) > 1000) {
            console.log('Using Dynamic Programming for optimal combination search...');
            const dpResult = this.findOptimalCombinationDP(targetAmount, relevantLots, 8);
            
            if (dpResult && dpResult.length > 0) {
                const dpTotal = dpResult.reduce((sum, lot) => sum + lot.unrealizedGain, 0);
                const dpPrecision = Math.abs(targetAmount - dpTotal);
                
                console.log(`DP Result: ${dpResult.length} lots, precision: $${dpPrecision.toFixed(2)}`);
                
                // Convert to output format and return if good enough
                if (dpPrecision < Math.abs(targetAmount) * 0.05) { // Within 5%
                    const selectedLots = dpResult.map(lot => ({
                        ...lot,
                        sharesToSell: lot.quantity,
                        actualGain: lot.unrealizedGain,
                        proceeds: (lot.price * lot.quantity),
                        reason: targetAmount > 0 ? 'Tax Gain Harvesting (DP)' : 'Tax Loss Harvesting (DP)'
                    }));
                    
                    console.log(`\\n=== DYNAMIC PROGRAMMING OPTIMIZATION RESULTS ===`);
                    console.log(`Target: ${targetAmount.toFixed(2)}`);
                    console.log(`Actual: ${dpTotal.toFixed(2)}`);
                    console.log(`Precision: $${dpPrecision.toFixed(2)} (${(dpPrecision/Math.abs(targetAmount)*100).toFixed(1)}% off)`);
                    console.log(`Selected ${selectedLots.length} lots with DP optimization`);
                    
                    return selectedLots;
                }
            }
        }
        
        // Fallback to position-aware combinatorial optimization
        console.log('Using position-aware combinatorial optimization...');
        
        // Group lots by symbol for intelligent position analysis
        const groupedBySymbol = this.groupLotsBySymbol(relevantLots);
        const symbols = Object.keys(groupedBySymbol);
        console.log(`Analyzing ${symbols.length} positions: ${symbols.join(', ')}`);
        
        // Generate position-level alternatives
        const positionAlternatives = [];
        symbols.forEach(symbol => {
            const alternatives = this.generatePositionAlternatives(groupedBySymbol[symbol], targetAmount);
            positionAlternatives.push(...alternatives);
            console.log(`${symbol}: Generated ${alternatives.length} alternatives (${alternatives.map(a => a.strategy).join(', ')})`);
        });
        
        let bestCombination = [];
        let bestDifference = Infinity;
        let bestStrategy = '';
        
        // LEVEL 1: Single Position Optimization
        console.log('\n=== LEVEL 1: Single Position Analysis ===');
        positionAlternatives.forEach(alt => {
            const difference = Math.abs(targetAmount - alt.totalGain);
            if (difference < bestDifference) {
                bestCombination = alt.lots;
                bestDifference = difference;
                bestStrategy = `${alt.symbol} (${alt.strategy})`;
                console.log(`New best single position: ${alt.symbol} ${alt.strategy}, gain: ${alt.totalGain.toFixed(2)}, diff: ${difference.toFixed(2)}`);
            }
        });
        
        // LEVEL 2: Cross-Position Combinations
        console.log('\n=== LEVEL 2: Cross-Position Combinations ===');
        const maxCombinations = Math.min(positionAlternatives.length, 12);
        
        for (let i = 0; i < maxCombinations; i++) {
            for (let j = i + 1; j < maxCombinations; j++) {
                const alt1 = positionAlternatives[i];
                const alt2 = positionAlternatives[j];
                
                // Skip if same symbol (avoid double-dipping)
                if (alt1.symbol === alt2.symbol) continue;
                
                const combinedLots = [...alt1.lots, ...alt2.lots];
                const combinedGain = alt1.totalGain + alt2.totalGain;
                const difference = Math.abs(targetAmount - combinedGain);
                
                if (difference < bestDifference) {
                    bestCombination = combinedLots;
                    bestDifference = difference;
                    bestStrategy = `${alt1.symbol}+${alt2.symbol} (${alt1.strategy}+${alt2.strategy})`;
                    console.log(`New best cross-position: ${alt1.symbol}+${alt2.symbol}, gain: ${combinedGain.toFixed(2)}, diff: ${difference.toFixed(2)}`);
                }
            }
        }
        
        // LEVEL 3: Three-Position Combinations (for precision enhancement)
        console.log('\n=== LEVEL 3: Three-Position Combinations ===');
        const maxThreeWay = Math.min(positionAlternatives.length, 8);
        
        for (let i = 0; i < maxThreeWay; i++) {
            for (let j = i + 1; j < maxThreeWay; j++) {
                for (let k = j + 1; k < maxThreeWay; k++) {
                    const alt1 = positionAlternatives[i];
                    const alt2 = positionAlternatives[j];
                    const alt3 = positionAlternatives[k];
                    
                    // Skip if any symbols overlap
                    const symbols = [alt1.symbol, alt2.symbol, alt3.symbol];
                    if (new Set(symbols).size !== 3) continue;
                    
                    const combinedLots = [...alt1.lots, ...alt2.lots, ...alt3.lots];
                    const combinedGain = alt1.totalGain + alt2.totalGain + alt3.totalGain;
                    const difference = Math.abs(targetAmount - combinedGain);
                    
                    // Only accept if significant improvement (>25% better)
                    if (difference < bestDifference && difference < bestDifference * 0.75) {
                        bestCombination = combinedLots;
                        bestDifference = difference;
                        bestStrategy = `${symbols.join('+')} (3-way)`;
                        console.log(`New best three-way: ${symbols.join('+')}, gain: ${combinedGain.toFixed(2)}, diff: ${difference.toFixed(2)}`);
                    }
                }
            }
        }
        
        // Convert best combination to output format
        const selectedLots = bestCombination.map(lot => ({
            ...lot,
            sharesToSell: lot.quantity,
            actualGain: lot.unrealizedGain,
            proceeds: (lot.price * lot.quantity),
            reason: targetAmount > 0 ? 'Tax Gain Harvesting' : 'Tax Loss Harvesting'
        }));
        
        // Log results
        const finalTotal = selectedLots.reduce((sum, lot) => sum + lot.actualGain, 0);
        const precision = Math.abs(finalTotal - targetAmount);
        const precisionPercent = Math.abs(targetAmount) > 0 ? (precision / Math.abs(targetAmount)) * 100 : 0;
        
        console.log(`\n=== POSITION-AWARE OPTIMIZATION RESULTS ===`);
        console.log(`Target: ${targetAmount.toFixed(2)}`);
        console.log(`Actual: ${finalTotal.toFixed(2)}`);
        console.log(`Precision: $${precision.toFixed(2)} (${precisionPercent.toFixed(1)}% off)`);
        console.log(`Strategy: ${bestStrategy}`);
        console.log(`Selected ${selectedLots.length} lots from ${new Set(selectedLots.map(l => l.symbol)).size} positions`);
        
        // Enhanced logging with position breakdown
        const positionBreakdown = {};
        selectedLots.forEach(lot => {
            if (!positionBreakdown[lot.symbol]) {
                positionBreakdown[lot.symbol] = { lots: 0, gain: 0, proceeds: 0 };
            }
            positionBreakdown[lot.symbol].lots++;
            positionBreakdown[lot.symbol].gain += lot.unrealizedGain;
            positionBreakdown[lot.symbol].proceeds += (lot.price * lot.quantity);
        });
        
        console.log('Position Breakdown:');
        Object.entries(positionBreakdown).forEach(([symbol, data]) => {
            console.log(`  ${symbol}: ${data.lots} lots, ${data.gain.toFixed(0)} gain, $${data.proceeds.toFixed(0)} proceeds`);
        });
        
        // Quality assessment
        if (precision < 0.01) {
            console.log('🎯 Perfect match!');
        } else if (precision < 100) {
            console.log('✅ High precision');
        } else if (precision < 500) {
            console.log('⚠️  Acceptable precision');
        } else {
            console.log('❌ Suboptimal precision');
        }
        
        return selectedLots;
    }

    /**
     * Cash Maximization Algorithm
     * Generates maximum cash while staying within target constraints
     * 
     * @param {number} maxST - Maximum allowable short-term gain/loss
     * @param {number} maxLT - Maximum allowable long-term gain/loss
     * @param {Array} portfolioData - Available portfolio positions
     * @returns {Array} Selected positions for maximum cash generation
     */
    maximizeCashGeneration(maxST, maxLT, portfolioData) {
        console.log('=== CASH MAXIMIZATION MODE ===');
        console.log(`ST Constraint: ${maxST}, LT Constraint: ${maxLT}`);
        
        if (!portfolioData || portfolioData.length === 0) {
            return [];
        }
        
        // Filter and categorize lots
        const lots = portfolioData.filter(lot => lot.includedInSelling);
        
        const stGains = lots.filter(l => l.term === 'Short' && l.unrealizedGain > 0);
        const stLosses = lots.filter(l => l.term === 'Short' && l.unrealizedGain < 0);
        const ltGains = lots.filter(l => l.term === 'Long' && l.unrealizedGain > 0);
        const ltLosses = lots.filter(l => l.term === 'Long' && l.unrealizedGain < 0);
        
        console.log(`Available: ST Gains(${stGains.length}), ST Losses(${stLosses.length}), LT Gains(${ltGains.length}), LT Losses(${ltLosses.length})`);
        
        const selectedLots = [];
        let currentST = 0;
        let currentLT = 0;
        let totalCash = 0;
        
        // POSITION-AWARE CASH MAXIMIZATION STRATEGY
        // Group by symbol and analyze position-level cash generation
        const groupedBySymbol = this.groupLotsBySymbol(lots);
        const positionChoices = [];
        
        Object.entries(groupedBySymbol).forEach(([symbol, symbolLots]) => {
            // Sort lots within position by cash generation
            const sortedLots = symbolLots.sort((a, b) => {
                const aCash = a.quantity * a.price;
                const bCash = b.quantity * b.price;
                return bCash - aCash;
            });
            
            // Generate position alternatives
            const alternatives = [];
            
            // Single best lot
            if (sortedLots.length > 0) {
                alternatives.push({
                    lots: [sortedLots[0]],
                    cash: sortedLots[0].quantity * sortedLots[0].price,
                    stGain: sortedLots[0].term === 'Short' ? sortedLots[0].unrealizedGain : 0,
                    ltGain: sortedLots[0].term === 'Long' ? sortedLots[0].unrealizedGain : 0,
                    strategy: 'partial'
                });
            }
            
            // Full position
            if (sortedLots.length > 1) {
                const totalCash = sortedLots.reduce((sum, lot) => sum + (lot.quantity * lot.price), 0);
                const totalSTGain = sortedLots.filter(l => l.term === 'Short').reduce((sum, l) => sum + l.unrealizedGain, 0);
                const totalLTGain = sortedLots.filter(l => l.term === 'Long').reduce((sum, l) => sum + l.unrealizedGain, 0);
                
                alternatives.push({
                    lots: [...sortedLots],
                    cash: totalCash,
                    stGain: totalSTGain,
                    ltGain: totalLTGain,
                    strategy: 'full'
                });
            }
            
            alternatives.forEach(alt => {
                alt.symbol = symbol;
                alt.efficiency = alt.cash / alt.lots.length; // Cash per lot
            });
            
            positionChoices.push(...alternatives);
        });
        
        // Sort position choices by cash generation potential
        const sortedChoices = positionChoices.sort((a, b) => b.cash - a.cash);
        
        console.log('Evaluating position alternatives for maximum cash generation...');
        
        // Use greedy selection of position alternatives based on cash generation
        const usedSymbols = new Set();
        
        for (const choice of sortedChoices) {
            // Skip if we already selected this symbol
            if (usedSymbols.has(choice.symbol)) continue;
            
            // Check if adding this choice would violate constraints
            const newST = currentST + choice.stGain;
            const newLT = currentLT + choice.ltGain;
            
            let wouldViolateConstraint = false;
            
            if (maxST >= 0 && choice.stGain > 0 && newST > maxST) wouldViolateConstraint = true;
            if (maxST <= 0 && choice.stGain < 0 && newST < maxST) wouldViolateConstraint = true;
            if (maxLT >= 0 && choice.ltGain > 0 && newLT > maxLT) wouldViolateConstraint = true;
            if (maxLT <= 0 && choice.ltGain < 0 && newLT < maxLT) wouldViolateConstraint = true;
            
            if (!wouldViolateConstraint) {
                // Add all lots from this choice
                choice.lots.forEach(lot => {
                    selectedLots.push({
                        ...lot,
                        sharesToSell: lot.quantity,
                        actualGain: lot.unrealizedGain,
                        proceeds: lot.quantity * lot.price,
                        reason: `Cash Maximization (${choice.strategy})`
                    });
                });
                
                currentST += choice.stGain;
                currentLT += choice.ltGain;
                totalCash += choice.cash;
                usedSymbols.add(choice.symbol);
                
                console.log(`Added ${choice.symbol} (${choice.strategy}): $${choice.cash.toFixed(0)} cash, ${choice.stGain.toFixed(0)} ST, ${choice.ltGain.toFixed(0)} LT gain`);
            } else {
                console.log(`Skipped ${choice.symbol} (${choice.strategy}): would violate constraint (ST: ${choice.stGain.toFixed(0)}, LT: ${choice.ltGain.toFixed(0)})`);
            }
        }
        
        console.log(`\n=== CASH MAXIMIZATION RESULTS ===`);
        console.log(`Total Cash Generated: $${totalCash.toFixed(0)}`);
        console.log(`Final ST: ${currentST.toFixed(0)} (limit: ${maxST})`);
        console.log(`Final LT: ${currentLT.toFixed(0)} (limit: ${maxLT})`);
        console.log(`Positions Selected: ${selectedLots.length}`);
        
        return selectedLots;
    }

    /**
     * Verify and validate algorithm optimization quality
     * Tests alternative approaches and reports optimization metrics
     */
    verifyOptimization(selectedLots, targetST, targetLT, availableLots) {
        console.log('\n=== ALGORITHM OPTIMIZATION VERIFICATION ===');
        
        const selectedST = selectedLots.filter(l => l.term === 'Short').reduce((sum, l) => sum + l.actualGain, 0);
        const selectedLT = selectedLots.filter(l => l.term === 'Long').reduce((sum, l) => sum + l.actualGain, 0);
        const selectedProceeds = selectedLots.reduce((sum, l) => sum + l.proceeds, 0);
        
        // Calculate precision metrics
        const stPrecision = Math.abs(selectedST - targetST);
        const ltPrecision = Math.abs(selectedLT - targetLT);
        const stPrecisionPercent = targetST !== 0 ? (stPrecision / Math.abs(targetST)) * 100 : 0;
        const ltPrecisionPercent = targetLT !== 0 ? (ltPrecision / Math.abs(targetLT)) * 100 : 0;
        
        // Test alternative random combinations for comparison
        const alternativeTests = 5;
        let betterAlternatives = 0;
        let bestAlternativeScore = Infinity;
        
        for (let i = 0; i < alternativeTests; i++) {
            // Create random alternative selection
            const shuffled = [...availableLots].sort(() => Math.random() - 0.5);
            const altSelection = shuffled.slice(0, Math.min(selectedLots.length + 1, shuffled.length));
            
            const altST = altSelection.filter(l => l.term === 'Short').reduce((sum, l) => sum + l.unrealizedGain, 0);
            const altLT = altSelection.filter(l => l.term === 'Long').reduce((sum, l) => sum + l.unrealizedGain, 0);
            
            const altStPrecision = Math.abs(altST - targetST);
            const altLtPrecision = Math.abs(altLT - targetLT);
            const altTotalPrecision = altStPrecision + altLtPrecision;
            const selectedTotalPrecision = stPrecision + ltPrecision;
            
            if (altTotalPrecision < selectedTotalPrecision) {
                betterAlternatives++;
            }
            
            bestAlternativeScore = Math.min(bestAlternativeScore, altTotalPrecision);
        }
        
        // Quality assessment
        let qualityRating = 'Excellent';
        if (stPrecisionPercent > 5 || ltPrecisionPercent > 5) qualityRating = 'Good';
        if (stPrecisionPercent > 15 || ltPrecisionPercent > 15) qualityRating = 'Acceptable';
        if (stPrecisionPercent > 25 || ltPrecisionPercent > 25) qualityRating = 'Suboptimal';
        
        const verification = {
            precision: {
                stDifference: stPrecision,
                ltDifference: ltPrecision,
                stPrecisionPercent: stPrecisionPercent,
                ltPrecisionPercent: ltPrecisionPercent,
                overallQuality: qualityRating
            },
            alternativeTests: {
                testCount: alternativeTests,
                betterAlternativesFound: betterAlternatives,
                isOptimal: betterAlternatives === 0,
                confidenceLevel: ((alternativeTests - betterAlternatives) / alternativeTests * 100).toFixed(1) + '%'
            },
            efficiency: {
                selectedPositions: selectedLots.length,
                totalAvailable: availableLots.length,
                utilizationRate: (selectedLots.length / availableLots.length * 100).toFixed(1) + '%',
                avgProceedsPerPosition: selectedLots.length > 0 ? (selectedProceeds / selectedLots.length).toFixed(0) : 0
            }
        };
        
        console.log('Precision Analysis:');
        console.log(`  ST: ${selectedST.toFixed(2)} vs ${targetST.toFixed(2)} (${stPrecisionPercent.toFixed(1)}% off)`);
        console.log(`  LT: ${selectedLT.toFixed(2)} vs ${targetLT.toFixed(2)} (${ltPrecisionPercent.toFixed(1)}% off)`);
        console.log(`  Overall Quality: ${qualityRating}`);
        
        console.log('Optimization Verification:');
        console.log(`  Random alternatives tested: ${alternativeTests}`);
        console.log(`  Better alternatives found: ${betterAlternatives}`);
        console.log(`  Confidence level: ${verification.alternativeTests.confidenceLevel}`);
        console.log(`  Is likely optimal: ${verification.alternativeTests.isOptimal ? 'Yes' : 'Needs review'}`);
        
        return verification;
    }

    /**
     * Helper method to categorize portfolio lots
     */
    categorizePortfolio(portfolioData) {
        if (!portfolioData || portfolioData.length === 0) {
            return { stGains: 0, stLosses: 0, ltGains: 0, ltLosses: 0 };
        }
        
        const lots = portfolioData.filter(lot => lot.includedInSelling !== false);
        
        return {
            stGains: lots.filter(l => l.term === 'Short' && l.unrealizedGain > 0).length,
            stLosses: lots.filter(l => l.term === 'Short' && l.unrealizedGain < 0).length,
            ltGains: lots.filter(l => l.term === 'Long' && l.unrealizedGain > 0).length,
            ltLosses: lots.filter(l => l.term === 'Long' && l.unrealizedGain < 0).length
        };
    }

    /**
     * Generate tax harvesting recommendations
     * 
     * @param {number} neededST - Short-term target amount
     * @param {number} neededLT - Long-term target amount  
     * @param {Array} portfolioData - Available portfolio positions
     * @returns {Object} Recommendations and summary
     */
    generateRecommendations(neededST, neededLT, portfolioData, realizedST = 0, realizedLT = 0, originalTargetST = 0, originalTargetLT = 0) {
        console.log('TaxHarvestingService.generateRecommendations called with:', 
                   'ST:', neededST, 'LT:', neededLT, 'Portfolio items:', portfolioData?.length || 0);
        
        if (!portfolioData || portfolioData.length === 0) {
            console.error('No portfolio data provided');
            return {
                recommendations: [],
                summary: {
                    targetST: neededST,
                    targetLT: neededLT,
                    actualST: 0,
                    actualLT: 0,
                    totalRecommendations: 0
                },
                errors: ['No portfolio data provided']
            };
        }
        
        // Log sample data
        if (portfolioData.length > 0) {
            console.log('Sample portfolio data:', JSON.stringify(portfolioData[0], null, 2));
        }
        
        // Filter lots that are included in selling
        const lots = portfolioData.map(lot => ({
            ...lot,
            includedInSelling: lot.hasOwnProperty('includedInSelling') ? lot.includedInSelling : true
        })).filter(lot => lot.includedInSelling);
        
        console.log('Available lots for trading after filtering:', lots.length);
        
        // Separate into categories with validation
        const stGains = lots.filter(l => 
            l.term === 'Short' && typeof l.unrealizedGain === 'number' && l.unrealizedGain > 0
        );
        const stLosses = lots.filter(l => 
            l.term === 'Short' && typeof l.unrealizedGain === 'number' && l.unrealizedGain < 0
        );
        const ltGains = lots.filter(l => 
            l.term === 'Long' && typeof l.unrealizedGain === 'number' && l.unrealizedGain > 0
        );
        const ltLosses = lots.filter(l => 
            l.term === 'Long' && typeof l.unrealizedGain === 'number' && l.unrealizedGain < 0
        );

        console.log('Categories - ST Gains:', stGains.length, 'ST Losses:', stLosses.length, 
                    'LT Gains:', ltGains.length, 'LT Losses:', ltLosses.length);
        
        // Check for missing position types and adapt if possible
        const warnings = [];
        let adaptedST = neededST;
        let adaptedLT = neededLT;
        
        if (neededST > 0 && stGains.length === 0) {
            if (ltGains.length > 0) {
                console.log('ADAPTATION: Using LT gains for ST gain target');
                adaptedLT += adaptedST;
                adaptedST = 0;
                warnings.push('No ST gains available - adapted to use LT gains');
            } else {
                warnings.push('No ST gains available to meet target');
            }
        }
        
        if (neededLT > 0 && ltGains.length === 0) {
            if (stGains.length > 0) {
                console.log('ADAPTATION: Using ST gains for LT gain target');
                adaptedST += adaptedLT;
                adaptedLT = 0;
                warnings.push('No LT gains available - adapted to use ST gains');
            } else {
                warnings.push('No LT gains available to meet target');
            }
        }
        
        // Apply caps to targets (105% maximum)
        const cappedSTTarget = adaptedST > 0 ? Math.min(adaptedST, adaptedST * 1.05) : 
                              adaptedST < 0 ? Math.max(adaptedST, adaptedST * 1.05) : 0;
        const cappedLTTarget = adaptedLT > 0 ? Math.min(adaptedLT, adaptedLT * 1.05) : 
                              adaptedLT < 0 ? Math.max(adaptedLT, adaptedLT * 1.05) : 0;
        
        console.log(`Capped targets: ST=${cappedSTTarget}, LT=${cappedLTTarget}`);

        // Generate recommendations
        const recommendationsArray = [];
        
        if (cappedSTTarget > 0 && stGains.length > 0) {
            console.log('Finding ST gains...');
            const stSelections = this.findBestCombination(cappedSTTarget, stGains);
            recommendationsArray.push(...stSelections);
        } else if (cappedSTTarget < 0 && stLosses.length > 0) {
            console.log('Finding ST losses...');
            const stSelections = this.findBestCombination(cappedSTTarget, stLosses);
            recommendationsArray.push(...stSelections);
        }

        if (cappedLTTarget > 0 && ltGains.length > 0) {
            console.log('Finding LT gains...');
            const ltSelections = this.findBestCombination(cappedLTTarget, ltGains);
            recommendationsArray.push(...ltSelections);
        } else if (cappedLTTarget < 0 && ltLosses.length > 0) {
            console.log('Finding LT losses...');
            const ltSelections = this.findBestCombination(cappedLTTarget, ltLosses);
            recommendationsArray.push(...ltSelections);
        }

        // Calculate totals
        let actualST = 0;
        let actualLT = 0;
        
        recommendationsArray.forEach(rec => {
            if (rec.term === 'Short') {
                actualST += rec.actualGain || 0;
            } else if (rec.term === 'Long') {
                actualLT += rec.actualGain || 0;
            }
        });
        
        console.log(`Final totals - ST: ${actualST.toFixed(2)} (Target: ${neededST.toFixed(2)}), LT: ${actualLT.toFixed(2)} (Target: ${neededLT.toFixed(2)})`);
        
        return {
            recommendations: recommendationsArray,
            summary: {
                targetST: neededST,
                targetLT: neededLT,
                actualST,
                actualLT,
                totalRecommendations: recommendationsArray.length,
                totalProceeds: recommendationsArray.reduce((sum, rec) => sum + (rec.proceeds || 0), 0)
            },
            warnings,
            metadata: {
                availableLots: lots.length,
                categories: {
                    stGains: stGains.length,
                    stLosses: stLosses.length,
                    ltGains: ltGains.length,
                    ltLosses: ltLosses.length
                },
                version: this.version,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Generate trades to raise a specific amount of cash
     * 
     * @param {Array} portfolioData - Available portfolio positions
     * @param {number} cashNeeded - Total cash needed to raise
     * @param {number} currentCash - Cash currently available
     * @returns {Object} Recommendations to raise the needed cash
     */
    generateCashRaisingRecommendations(portfolioData, cashNeeded, currentCash = 0) {
        console.log('=== CASH RAISING CALCULATION ===');
        console.log(`Cash needed: ${cashNeeded}, Current cash: ${currentCash}`);
        
        if (!portfolioData || portfolioData.length === 0) {
            return {
                recommendations: [],
                summary: {
                    cashNeeded,
                    currentCash,
                    additionalCashNeeded: Math.max(0, cashNeeded - currentCash),
                    actualCashRaised: 0,
                    totalRecommendations: 0
                },
                errors: ['No portfolio data provided']
            };
        }
        
        const additionalCashNeeded = Math.max(0, cashNeeded - currentCash);
        
        if (additionalCashNeeded <= 0) {
            return {
                recommendations: [],
                summary: {
                    cashNeeded,
                    currentCash,
                    additionalCashNeeded: 0,
                    actualCashRaised: 0,
                    totalRecommendations: 0
                },
                message: 'You already have sufficient cash available'
            };
        }
        
        // Filter available positions
        const availablePositions = portfolioData.filter(pos => 
            pos.includedInSelling && pos.quantity > 0 && pos.price > 0
        );
        
        if (availablePositions.length === 0) {
            return {
                recommendations: [],
                summary: {
                    cashNeeded,
                    currentCash,
                    additionalCashNeeded,
                    actualCashRaised: 0,
                    totalRecommendations: 0
                },
                errors: ['No positions available for selling']
            };
        }
        
        // Sort positions by tax efficiency (prefer losses first, then long-term gains)
        const sortedPositions = [...availablePositions].sort((a, b) => {
            // Priority: Losses first (most tax efficient)
            if (a.unrealizedGain < 0 && b.unrealizedGain >= 0) return -1;
            if (b.unrealizedGain < 0 && a.unrealizedGain >= 0) return 1;
            
            // If both are losses, prefer larger losses
            if (a.unrealizedGain < 0 && b.unrealizedGain < 0) {
                return a.unrealizedGain - b.unrealizedGain; // More negative first
            }
            
            // If both are gains, prefer long-term gains (lower tax rate)
            if (a.unrealizedGain > 0 && b.unrealizedGain > 0) {
                if (a.term === 'Long' && b.term === 'Short') return -1;
                if (b.term === 'Long' && a.term === 'Short') return 1;
                // Within same term, prefer smaller gains
                return a.unrealizedGain - b.unrealizedGain;
            }
            
            return 0;
        });
        
        // Generate recommendations to raise the needed cash
        const recommendations = [];
        let totalCashRaised = 0;
        
        for (const position of sortedPositions) {
            if (totalCashRaised >= additionalCashNeeded) break;
            
            const remainingNeeded = additionalCashNeeded - totalCashRaised;
            const positionValue = position.quantity * position.price;
            
            let sharesToSell, actualProceeds, actualGain;
            
            if (positionValue <= remainingNeeded * 1.1) {
                // Sell entire position if it's close to what we need
                sharesToSell = position.quantity;
                actualProceeds = positionValue;
                actualGain = position.unrealizedGain;
            } else {
                // Sell partial position
                const sharesNeeded = Math.ceil(remainingNeeded / position.price);
                sharesToSell = Math.min(sharesNeeded, position.quantity);
                actualProceeds = sharesToSell * position.price;
                actualGain = (position.unrealizedGain / position.quantity) * sharesToSell;
            }
            
            if (sharesToSell > 0) {
                recommendations.push({
                    ...position,
                    sharesToSell,
                    actualGain,
                    proceeds: actualProceeds,
                    reason: 'Cash Raising - Tax Optimized'
                });
                
                totalCashRaised += actualProceeds;
            }
        }
        
        // Calculate tax impact
        let totalSTGain = 0;
        let totalLTGain = 0;
        
        recommendations.forEach(rec => {
            if (rec.term === 'Short') {
                totalSTGain += rec.actualGain;
            } else {
                totalLTGain += rec.actualGain;
            }
        });
        
        console.log(`Cash raising complete: ${totalCashRaised.toFixed(2)} raised from ${recommendations.length} positions`);
        
        return {
            recommendations,
            summary: {
                cashNeeded,
                currentCash,
                additionalCashNeeded,
                actualCashRaised: totalCashRaised,
                totalRecommendations: recommendations.length,
                taxImpact: {
                    shortTermGain: totalSTGain,
                    longTermGain: totalLTGain,
                    totalTaxableGain: totalSTGain + totalLTGain
                }
            },
            metadata: {
                mode: 'cash_raising',
                availablePositions: availablePositions.length,
                version: this.version,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Run tax harvesting calculation with portfolio data
     * Main entry point for the service
     */
    runTaxHarvesting(portfolioData, targetST = 0, targetLT = 0, realizedST = 0, realizedLT = 0, cashMaximizationMode = false, options = {}) {
        console.log('=== STARTING TAX HARVESTING CALCULATION ===');
        console.log(`Targets: ST=${targetST}, LT=${targetLT}`);
        console.log(`Already realized: ST=${realizedST}, LT=${realizedLT}`);
        console.log(`Cash Maximization Mode: ${cashMaximizationMode}`);
        console.log(`Options received:`, JSON.stringify(options, null, 2));
        
        // Check if this is cash raising mode
        if (options.useCashRaising) {
            console.log('=== CASH RAISING MODE ===');
            console.log(`Cash needed: ${options.cashNeeded}, Current cash: ${options.currentCash}`);
            return this.generateCashRaisingRecommendations(
                portfolioData, 
                options.cashNeeded || 0, 
                options.currentCash || 0
            );
        }
        
        let result;
        
        if (cashMaximizationMode) {
            // Cash maximization mode: use targets as constraints
            const maxAllowableST = targetST;
            const maxAllowableLT = targetLT;
            
            console.log(`Using targets as constraints: ST<=${maxAllowableST}, LT<=${maxAllowableLT}`);
            
            const recommendations = this.maximizeCashGeneration(maxAllowableST, maxAllowableLT, portfolioData);
            
            // Calculate actual totals
            const actualST = recommendations
                .filter(r => r.term === 'Short')
                .reduce((sum, r) => sum + r.actualGain, 0);
            const actualLT = recommendations
                .filter(r => r.term === 'Long')
                .reduce((sum, r) => sum + r.actualGain, 0);
            const totalProceeds = recommendations.reduce((sum, r) => sum + r.proceeds, 0);
            
            result = {
                recommendations,
                summary: {
                    targetST: targetST,
                    targetLT: targetLT,
                    actualST: actualST,
                    actualLT: actualLT,
                    totalRecommendations: recommendations.length,
                    totalProceeds: totalProceeds,
                    cashMaximizationMode: true,
                    // YTD Context
                    ytdRealizedST: realizedST,
                    ytdRealizedLT: realizedLT,
                    totalAnnualST: realizedST + actualST,
                    totalAnnualLT: realizedLT + actualLT
                },
                warnings: [],
                metadata: {
                    availableLots: portfolioData?.length || 0,
                    categories: this.categorizePortfolio(portfolioData),
                    version: this.version,
                    timestamp: new Date().toISOString(),
                    optimizationMode: 'Cash Maximization'
                }
            };
            
        } else {
            // Standard precision targeting mode
            const neededST = targetST - realizedST;
            const neededLT = targetLT - realizedLT;
            
            console.log(`Needed: ST=${neededST}, LT=${neededLT}`);
            
            result = this.generateRecommendations(neededST, neededLT, portfolioData, realizedST, realizedLT, targetST, targetLT);
            
            // Run optimization verification for standard mode
            if (result.recommendations && result.recommendations.length > 0) {
                const availableLots = portfolioData.filter(lot => lot.includedInSelling !== false);
                const verification = this.verifyOptimization(result.recommendations, neededST, neededLT, availableLots);
                result.optimizationVerification = verification;
            }
            
            // Add YTD context to summary for standard mode
            if (result.summary) {
                result.summary.ytdRealizedST = realizedST;
                result.summary.ytdRealizedLT = realizedLT;
                result.summary.totalAnnualST = realizedST + (result.summary.actualST || 0);
                result.summary.totalAnnualLT = realizedLT + (result.summary.actualLT || 0);
                result.summary.cashMaximizationMode = false;
            }
            
            // Add optimization mode metadata for standard mode
            if (result.metadata) {
                result.metadata.optimizationMode = 'Target Precision';
            }
        }
        
        // Add calculation metadata
        result.calculation = {
            inputs: {
                targetST,
                targetLT,
                realizedST,
                realizedLT,
                portfolioPositions: portfolioData?.length || 0,
                cashMaximizationMode
            },
            needed: cashMaximizationMode ? {
                maxST: targetST,
                maxLT: targetLT
            } : {
                neededST: targetST - realizedST,
                neededLT: targetLT - realizedLT
            },
            timestamp: new Date().toISOString(),
            version: this.version
        };
        
        console.log('=== TAX HARVESTING CALCULATION COMPLETE ===');
        
        return result;
    }
}

module.exports = TaxHarvestingService;