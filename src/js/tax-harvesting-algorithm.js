/**
 * Tax Harvesting Algorithm - Version 1.0.1
 * PROTECTED CORE ALGORITHM - DO NOT MODIFY WITHOUT TESTING
 * 
 * This file contains the isolated tax harvesting algorithm logic.
 * Any changes to this file must be thoroughly tested with various scenarios.
 * 
 * CHANGE HISTORY:
 * - 1.0.0: Initial stable version with strict target adherence
 * - 1.0.1: Enhanced safeguards against overshooting, improved targeting precision
 * 
 * @author Kiro Finance
 * @lastStableVersion 1.0.1
 */

// Try to load utilities if in browser context
let Utils = window.TaxHarvestingUtilities;
if (typeof window !== 'undefined' && !Utils) {
    console.warn('TaxHarvestingUtilities not found, loading fallback utilities');
    // Fallback utilities to ensure algorithm works even if utilities aren't loaded
    Utils = {
        formatCurrency: (val) => "$" + Math.abs(val).toFixed(2),
        isWithinTolerance: (val, target, tolerance) => {
            if (target === 0) return val === 0;
            const diff = Math.abs((val - target) / target);
            return diff <= tolerance;
        }
    };
}

// The core tax harvesting algorithm, isolated from the UI
const TaxHarvestingAlgorithm = {
    /**
     * Version of the algorithm
     */
    version: '1.0.1',
    
    /**
     * Find the best combination of lots to meet a target gain/loss
     * 
     * @param {number} targetAmount - The target gain/loss amount
     * @param {Array} availableLots - Array of lots available for selection
     * @returns {Array} Selected lots that best meet the target
     */
    findBestCombination: function(targetAmount, availableLots) {
        console.log('TaxHarvestingAlgorithm.findBestCombination called with target:', targetAmount, 'lots:', availableLots?.length || 0);
        
        // EMERGENCY FIX: Print the first few lots to debug data structure
        if (availableLots && availableLots.length > 0) {
            console.log('SAMPLE LOT DATA:', JSON.stringify(availableLots[0], null, 2));
        }
        
        if (!availableLots || availableLots.length === 0) {
            console.error('No available lots provided');
            return [];
        }
        
        if (Math.abs(targetAmount) < 0.01) {
            console.log('Target amount too small, no action needed');
            return [];
        }
        
        // EMERGENCY FIX: Super simple greedy algorithm with strict limits
        console.log(`EMERGENCY FIX: Using simplified tax harvesting algorithm for target ${targetAmount}`);
        
        // Create a deep copy of the lots to avoid modifying the original data
        const lotsCopy = JSON.parse(JSON.stringify(availableLots));
        
        // Filter lots by gain direction (gains for positive target, losses for negative target)
        const relevantLots = lotsCopy.filter(lot => {
            // First check if unrealizedGain is valid
            if (typeof lot.unrealizedGain !== 'number' || isNaN(lot.unrealizedGain)) {
                console.error(`Invalid lot data: ${lot.symbol} has invalid unrealizedGain: ${lot.unrealizedGain}`);
                return false;
            }
            
            // Filter by gain direction
            return (targetAmount > 0 && lot.unrealizedGain > 0) || 
                   (targetAmount < 0 && lot.unrealizedGain < 0);
        });
        
        console.log(`Found ${relevantLots.length} relevant lots for ${targetAmount > 0 ? 'gains' : 'losses'}`);
        
        if (relevantLots.length === 0) {
            console.warn(`No relevant lots found for target ${targetAmount}`);
            return [];
        }
        
        // Sort by gain magnitude (largest first)
        relevantLots.sort((a, b) => {
            if (targetAmount > 0) {
                return b.unrealizedGain - a.unrealizedGain; // Largest gains first
            } else {
                return a.unrealizedGain - b.unrealizedGain; // Largest losses first
            }
        });
        
        // Define strict limit - never exceed 105% of target
        const absoluteLimit = Math.abs(targetAmount) * 1.05;
        
        // EMERGENCY FIX: Simplified selection algorithm
        const selectedLots = [];
        let currentTotal = 0;
        
        for (const lot of relevantLots) {
            // Calculate how much of the target is remaining
            const remaining = targetAmount - currentTotal;
            console.log(`Evaluating ${lot.symbol}: gain ${lot.unrealizedGain}, remaining needed: ${remaining}`);
            
            // If we've reached our target, stop
            if ((targetAmount > 0 && currentTotal >= targetAmount) || 
                (targetAmount < 0 && currentTotal <= targetAmount)) {
                console.log('Target reached, stopping');
                break;
            }
            
            // Calculate if adding this lot would exceed our absolute limit
            const projectedTotal = currentTotal + lot.unrealizedGain;
            const wouldExceedLimit = (targetAmount > 0 && projectedTotal > absoluteLimit) || 
                                    (targetAmount < 0 && projectedTotal < -absoluteLimit);
            
            // If adding the whole lot would exceed our limit, try partial
            if (wouldExceedLimit) {
                console.log(`Adding whole lot would exceed limit. Current: ${currentTotal}, Projected: ${projectedTotal}, Limit: ${absoluteLimit}`);
                
                // Only use partial lot if it's worth it (at least 20% of the lot)
                const gainPerShare = lot.unrealizedGain / lot.quantity;
                const sharesNeeded = Math.floor(remaining / gainPerShare);
                
                if (sharesNeeded >= Math.max(1, lot.quantity * 0.2)) {
                    // Use partial lot
                    const partialGain = gainPerShare * sharesNeeded;
                    console.log(`Using partial lot: ${sharesNeeded}/${lot.quantity} shares, gain: ${partialGain}`);
                    
                    selectedLots.push({
                        ...lot,
                        sharesToSell: sharesNeeded,
                        actualGain: partialGain,
                        proceeds: (lot.price * sharesNeeded),
                        reason: targetAmount > 0 ? 'Tax Gain Harvesting' : 'Tax Loss Harvesting'
                    });
                    
                    currentTotal += partialGain;
                }
                
                // Stop after using a partial lot
                break;
            } else {
                // Use the whole lot
                console.log(`Adding whole lot: ${lot.symbol}, gain: ${lot.unrealizedGain}`);
                
                selectedLots.push({
                    ...lot,
                    sharesToSell: lot.quantity,
                    actualGain: lot.unrealizedGain,
                    proceeds: (lot.price * lot.quantity),
                    reason: targetAmount > 0 ? 'Tax Gain Harvesting' : 'Tax Loss Harvesting'
                });
                
                currentTotal += lot.unrealizedGain;
            }
            
            // Safety check - stop if we're at 95% of target to avoid overshooting
            if ((targetAmount > 0 && currentTotal >= targetAmount * 0.95) || 
                (targetAmount < 0 && currentTotal <= targetAmount * 0.95)) {
                console.log(`Reached 95% of target (${currentTotal} vs ${targetAmount}), stopping to avoid overshooting`);
                break;
            }
        }
        
        // Print results
        const finalTotal = selectedLots.reduce((sum, lot) => sum + lot.actualGain, 0);
        console.log(`\n=== EMERGENCY TAX HARVESTING RESULTS ===`);
        console.log(`Target: ${targetAmount.toFixed(2)}`);
        console.log(`Actual: ${finalTotal.toFixed(2)}`);
        console.log(`Selected ${selectedLots.length} lots`);
        
        // Sanity check results
        if (selectedLots.length > 0) {
            if ((targetAmount > 0 && finalTotal <= 0) || (targetAmount < 0 && finalTotal >= 0)) {
                console.error(`ERROR: Selected lots have wrong gain direction. Target: ${targetAmount}, Actual: ${finalTotal}`);
            }
        }
        
        return selectedLots;
    },
        
        // Sort by unrealized gain magnitude (largest first for more efficient targeting)
        // This prevents overshooting by selecting fewer, larger positions
        const sortedLots = [...relevantLots].sort((a, b) => {
            if (targetAmount > 0) {
                return b.unrealizedGain - a.unrealizedGain; // Largest gains first
            } else {
                return a.unrealizedGain - b.unrealizedGain; // Largest losses first (most negative)
            }
        });
        
        const selectedLots = [];
        let currentAmount = 0;
        
        console.log(`Targeting ${targetAmount > 0 ? 'gains' : 'losses'} of ${Math.abs(targetAmount).toFixed(2)}`);
        
        // Use a greedy approach with strict target adherence
        for (const lot of sortedLots) {
            const remainingNeeded = targetAmount - currentAmount;
            console.log(`\nEvaluating ${lot.symbol}: gain ${lot.unrealizedGain.toFixed(2)}, remaining needed: ${remainingNeeded.toFixed(2)}`);
            
            // Stop if we've already reached the target within tolerance
            if (Math.abs(remainingNeeded) < 0.01) {
                console.log('Target reached within tolerance, stopping');
                break;
            }
            
            // CRITICAL FIX: Enforce absolute maximum limit first
            const lotTotalGain = lot.unrealizedGain;
            const projectedTotal = currentAmount + lotTotalGain;
            
            // Immediate rejection if this lot would cause us to exceed our strict max limit
            if (Math.abs(projectedTotal) > STRICT_MAX_LIMIT) {
                console.log(`⛔ STRICT LIMIT: Adding ${lot.symbol} would exceed maximum allowed total (${STRICT_MAX_LIMIT.toFixed(2)}), skipping`);
                break; // Break the entire loop - we're too close to limit
            }
            
            const targetExceedance = Math.abs(projectedTotal - targetAmount);
            
            // Progressive tolerance - stricter for larger targets
            let tolerancePercent = 0.02; // 2% baseline tolerance
            if (Math.abs(targetAmount) > 50000) {
                // For large targets (>$50k), use even stricter tolerance
                tolerancePercent = 0.01; // 1% for large targets
            }
            const targetTolerance = Math.abs(targetAmount) * tolerancePercent;
            
            // If adding the whole lot stays within reasonable bounds, add it
            if ((targetAmount > 0 && projectedTotal <= targetAmount) ||
                (targetAmount < 0 && projectedTotal >= targetAmount)) {
                
                // Add extra check to avoid crossing the target boundary 
                // when we're already close to target
                const currentProximity = Math.abs(currentAmount / targetAmount);
                if (currentProximity > 0.9 && // Already at 90%+ of target
                   ((targetAmount > 0 && projectedTotal > targetAmount) ||
                    (targetAmount < 0 && projectedTotal < targetAmount))) {
                    console.log(`✗ Skipping whole lot - would cross target when already close`);
                } else {
                    selectedLots.push({
                        ...lot,
                        sharesToSell: lot.quantity,
                        actualGain: lotTotalGain,
                        proceeds: (lot.price * lot.quantity),
                        reason: targetAmount > 0 ? 'Tax Gain Harvesting' : 'Tax Loss Harvesting'
                    });
                    
                    currentAmount = projectedTotal;
                    console.log(`✓ Added whole lot: ${lot.symbol}, gain: ${lotTotalGain.toFixed(2)}, running total: ${currentAmount.toFixed(2)}`);
                }
                
            } else if (targetExceedance <= targetTolerance && 
                      // CRITICAL FIX: Much stricter threshold - only allow exceeding if we're below 90% of target
                      Math.abs(currentAmount) < Math.abs(targetAmount) * 0.90) {
                
                // CRITICAL CHECK: Enforce the absolute maximum limit
                if (Math.abs(projectedTotal) > STRICT_MAX_LIMIT) {
                    console.log(`⛔ STRICT LIMIT: Adding ${lot.symbol} would exceed maximum allowed total (${STRICT_MAX_LIMIT.toFixed(2)}), skipping`);
                    break; // Exit the loop entirely
                }
                
                // Extra check - if target is large and we're already close, be extra cautious
                if (Math.abs(targetAmount) > 50000 && Math.abs(currentAmount) > Math.abs(targetAmount) * 0.75) {
                    // For large targets when already near 75%, check if exceeding by more than 0.5%
                    if (targetExceedance > Math.abs(targetAmount) * 0.005) {
                        console.log(`✗ Skipping lot - too much overshoot for a large target already near completion`);
                        break; // Stop here to avoid overshooting large targets
                    }
                }
                
                // If overshoot is within tolerance and we haven't already reached close to target, add the whole lot
                selectedLots.push({
                    ...lot,
                    sharesToSell: lot.quantity,
                    actualGain: lotTotalGain,
                    proceeds: (lot.price * lot.quantity),
                    reason: targetAmount > 0 ? 'Tax Gain Harvesting' : 'Tax Loss Harvesting'
                });
                
                currentAmount = projectedTotal;
                console.log(`✓ Added whole lot (within tolerance): ${lot.symbol}, gain: ${lotTotalGain.toFixed(2)}, running total: ${currentAmount.toFixed(2)}`);
                break; // Stop here as we're close enough
            } else {
                // Try partial shares for more precision
                const lotGainPerShare = lot.unrealizedGain / lot.quantity;
                
                if (Math.abs(lotGainPerShare) > 0.001) { // Meaningful gain per share
                    const sharesNeeded = Math.abs(remainingNeeded / lotGainPerShare);
                    let idealShares = Math.floor(sharesNeeded);
                    
                    // Ensure we have at least 1 share but not more than available
                    idealShares = Math.max(1, Math.min(idealShares, lot.quantity));
                    
                    // Only proceed if it's a reasonable number of shares (at least 1% of position)
                    const minShares = Math.max(1, Math.ceil(lot.quantity * 0.01));
                    
                    if (idealShares >= minShares && idealShares < lot.quantity) {
                        const actualGain = lotGainPerShare * idealShares;
                        const newTotal = currentAmount + actualGain;
                        
                        // Ensure partial addition doesn't overshoot
                        const partialExceedance = (targetAmount > 0) ? 
                            Math.max(0, newTotal - targetAmount) : 
                            Math.max(0, targetAmount - newTotal);
                        
                        // More strict tolerance for partial lots, especially large targets
                        let partialTolerance;
                        if (Math.abs(targetAmount) > 75000) {
                            partialTolerance = targetTolerance * 0.5; // Half the normal tolerance for large targets
                        } else {
                            partialTolerance = targetTolerance * 0.75; // 75% of normal tolerance otherwise
                        }
                        
                        // Only allow partial selling if it gets us closer to target
                        const currentDistance = Math.abs(targetAmount - currentAmount);
                        const newDistance = Math.abs(targetAmount - newTotal);
                        
                        // More stringent conditions for partial lot inclusion
                        if (newDistance < currentDistance && partialExceedance <= partialTolerance) {
                            selectedLots.push({
                                ...lot,
                                sharesToSell: idealShares,
                                actualGain: actualGain,
                                proceeds: (lot.price * idealShares),
                                reason: targetAmount > 0 ? 'Tax Gain Harvesting' : 'Tax Loss Harvesting'
                            });
                            
                            currentAmount = newTotal;
                            console.log(`✓ Added partial lot: ${lot.symbol}, shares: ${idealShares}/${lot.quantity}, gain: ${actualGain.toFixed(2)}, running total: ${currentAmount.toFixed(2)}`);
                        } else {
                            console.log(`✗ Partial lot would overshoot or not improve accuracy, skipping`);
                        }
                    }
                }
                
                // After trying partial, stop the loop to avoid further overshooting
                break;
            }
            
            // CRITICAL FIX: Much stricter early termination threshold
            if ((targetAmount > 0 && currentAmount >= targetAmount * 0.90) || // Stop at 90% of target for positive targets
                (targetAmount < 0 && currentAmount <= targetAmount * 0.90)) { // Stop at 90% of target for negative targets
                console.log('⚠️ EARLY TERMINATION: Target reached 90%+ of goal, stopping to prevent overshooting');
                break;
            }
            
            // CRITICAL FIX: Check against strict maximum limit
            if (Math.abs(currentAmount) > STRICT_MAX_LIMIT * 0.95) { // If we're at 95% of our strict limit
                console.log(`⛔ STRICT LIMIT: Already at ${(Math.abs(currentAmount)/STRICT_MAX_LIMIT*100).toFixed(1)}% of maximum allowed total (${STRICT_MAX_LIMIT.toFixed(2)}), halting immediately`);
                break;
            }
            
            // Additional safety checks with progressive thresholds based on target size
            const currentExceedance = Math.abs(currentAmount - targetAmount);
            let maxExceedancePercent = 0.015; // 1.5% default
            
            // For larger targets, use even stricter thresholds
            if (Math.abs(targetAmount) > 50000) {
                maxExceedancePercent = 0.01; // 1% for large targets
            }
            if (Math.abs(targetAmount) > 100000) {
                maxExceedancePercent = 0.005; // 0.5% for very large targets
            }
            
            if (currentExceedance > Math.abs(targetAmount) * maxExceedancePercent) {
                console.log(`⚠️ Exceeding target by more than ${(maxExceedancePercent*100).toFixed(1)}%, halting immediately`);
                break;
            }
        }
        
        const finalTotal = selectedLots.reduce((sum, lot) => sum + lot.actualGain, 0);
        const accuracy = Math.abs(finalTotal - targetAmount);
        const accuracyPercent = (accuracy / Math.abs(targetAmount)) * 100;
        
        console.log(`\n=== TaxHarvestingAlgorithm Results ===`);
        console.log(`Target: ${targetAmount.toFixed(2)}`);
        console.log(`Actual: ${finalTotal.toFixed(2)}`);
        console.log(`Accuracy: ${accuracy.toFixed(2)} (${accuracyPercent.toFixed(1)}% off target)`);
        console.log(`Selected ${selectedLots.length} lots`);
        
        return selectedLots;
    },
    
    /**
     * Generate recommendations based on ST and LT targets
     * 
     * @param {number} neededST - Short-term target amount
     * @param {number} neededLT - Long-term target amount
     * @param {Array} portfolioData - Available portfolio positions
     * @returns {Array} - Selected positions for tax harvesting
     */
    generateRecommendations: function(neededST, neededLT, portfolioData) {
        console.log('EMERGENCY: TaxHarvestingAlgorithm.generateRecommendations called with:', 
                   'ST:', neededST, 
                   'LT:', neededLT, 
                   'Portfolio items:', portfolioData?.length || 0);
        
        if (!portfolioData || portfolioData.length === 0) {
            console.error('No portfolio data provided');
            return [];
        }
        
        // Log sample portfolio data
        if (portfolioData.length > 0) {
            console.log('SAMPLE PORTFOLIO DATA:', JSON.stringify(portfolioData[0], null, 2));
        }
        
        // EMERGENCY FIX: Ensure includedInSelling is properly handled
        const lots = portfolioData.map(lot => {
            // Create a copy with includedInSelling defaulting to true if not specified
            return {
                ...lot,
                includedInSelling: lot.hasOwnProperty('includedInSelling') ? lot.includedInSelling : true
            };
        }).filter(lot => lot.includedInSelling);
        
        console.log('Available lots for trading after filtering:', lots.length);
        
        const recommendationsArray = [];

        // Separate into categories with validation
        const stGains = lots.filter(l => {
            const isValid = l.term === 'Short' && typeof l.unrealizedGain === 'number' && l.unrealizedGain > 0;
            if (l.term === 'Short' && (!isValid && l.unrealizedGain > 0)) {
                console.warn(`Invalid ST gain position: ${l.symbol}, gain: ${l.unrealizedGain}, term: ${l.term}`);
            }
            return isValid;
        });
        
        const stLosses = lots.filter(l => {
            const isValid = l.term === 'Short' && typeof l.unrealizedGain === 'number' && l.unrealizedGain < 0;
            if (l.term === 'Short' && (!isValid && l.unrealizedGain < 0)) {
                console.warn(`Invalid ST loss position: ${l.symbol}, gain: ${l.unrealizedGain}, term: ${l.term}`);
            }
            return isValid;
        });
        
        const ltGains = lots.filter(l => {
            const isValid = l.term === 'Long' && typeof l.unrealizedGain === 'number' && l.unrealizedGain > 0;
            if (l.term === 'Long' && (!isValid && l.unrealizedGain > 0)) {
                console.warn(`Invalid LT gain position: ${l.symbol}, gain: ${l.unrealizedGain}, term: ${l.term}`);
            }
            return isValid;
        });
        
        const ltLosses = lots.filter(l => {
            const isValid = l.term === 'Long' && typeof l.unrealizedGain === 'number' && l.unrealizedGain < 0;
            if (l.term === 'Long' && (!isValid && l.unrealizedGain < 0)) {
                console.warn(`Invalid LT loss position: ${l.symbol}, gain: ${l.unrealizedGain}, term: ${l.term}`);
            }
            return isValid;
        });

        console.log('Categories - ST Gains:', stGains.length, 'ST Losses:', stLosses.length, 
                    'LT Gains:', ltGains.length, 'LT Losses:', ltLosses.length);
        
        // EMERGENCY FIX: Detect potential issues with target and available positions
        let missingPositions = [];
        if (neededST > 0 && stGains.length === 0) missingPositions.push('ST gains');
        if (neededST < 0 && stLosses.length === 0) missingPositions.push('ST losses');
        if (neededLT > 0 && ltGains.length === 0) missingPositions.push('LT gains');
        if (neededLT < 0 && ltLosses.length === 0) missingPositions.push('LT losses');
        
        if (missingPositions.length > 0) {
            console.warn(`⚠️ CRITICAL ISSUE: Missing required position types: ${missingPositions.join(', ')}`);
            
            // Provide information on what's available
            const available = [];
            if (stGains.length > 0) available.push(`ST gains (${stGains.length} positions)`);
            if (stLosses.length > 0) available.push(`ST losses (${stLosses.length} positions)`);
            if (ltGains.length > 0) available.push(`LT gains (${ltGains.length} positions)`);
            if (ltLosses.length > 0) available.push(`LT losses (${ltLosses.length} positions)`);
            
            console.log(`Available position types: ${available.join(', ')}`);
            
            // Try to adapt targets if possible
            if (neededST > 0 && stGains.length === 0 && ltGains.length > 0) {
                console.log('ADAPTATION: Using LT gains for ST gain target');
                neededLT = (neededLT || 0) + neededST;
                neededST = 0;
                console.log(`Adapted targets: ST=${neededST}, LT=${neededLT}`);
            } else if (neededLT > 0 && ltGains.length === 0 && stGains.length > 0) {
                console.log('ADAPTATION: Using ST gains for LT gain target');
                neededST = (neededST || 0) + neededLT;
                neededLT = 0;
                console.log(`Adapted targets: ST=${neededST}, LT=${neededLT}`);
            }
        }
        
        // Apply caps to targets (105% maximum)
        const cappedSTTarget = neededST > 0 ? Math.min(neededST, neededST * 1.05) : 
                              neededST < 0 ? Math.max(neededST, neededST * 1.05) : 0;
        
        const cappedLTTarget = neededLT > 0 ? Math.min(neededLT, neededLT * 1.05) : 
                              neededLT < 0 ? Math.max(neededLT, neededLT * 1.05) : 0;
        
        console.log(`EMERGENCY: Original ST Target: ${neededST}, Capped: ${cappedSTTarget}`);
        console.log(`EMERGENCY: Original LT Target: ${neededLT}, Capped: ${cappedLTTarget}`);

        // Generate recommendations using simplified approach
        if (cappedSTTarget > 0 && stGains.length > 0) {
            console.log('Finding ST gains...');
            const stSelections = this.findBestCombination(cappedSTTarget, stGains);
            recommendationsArray.push(...stSelections);
        }
        else if (cappedSTTarget < 0 && stLosses.length > 0) {
            console.log('Finding ST losses...');
            const stSelections = this.findBestCombination(cappedSTTarget, stLosses);
            recommendationsArray.push(...stSelections);
        }

        if (cappedLTTarget > 0 && ltGains.length > 0) {
            console.log('Finding LT gains...');
            const ltSelections = this.findBestCombination(cappedLTTarget, ltGains);
            recommendationsArray.push(...ltSelections);
        }
        else if (cappedLTTarget < 0 && ltLosses.length > 0) {
            console.log('Finding LT losses...');
            const ltSelections = this.findBestCombination(cappedLTTarget, ltLosses);
            recommendationsArray.push(...ltSelections);
        }

        console.log('EMERGENCY: Generated recommendations:', recommendationsArray.length);
        
        // Log the results
        let stTotal = 0;
        let ltTotal = 0;
        
        recommendationsArray.forEach(rec => {
            if (rec.term === 'Short') {
                stTotal += rec.actualGain || 0;
            } else if (rec.term === 'Long') {
                ltTotal += rec.actualGain || 0;
            }
        });
        
        console.log(`ST Recommendations Total: ${stTotal.toFixed(2)} (Target: ${cappedSTTarget.toFixed(2)})`);
        console.log(`LT Recommendations Total: ${ltTotal.toFixed(2)} (Target: ${cappedLTTarget.toFixed(2)})`);
        
        return recommendationsArray;
    },

        // Separate into categories
        const stGains = lots.filter(l => l.term === 'Short' && l.unrealizedGain > 0);
        const stLosses = lots.filter(l => l.term === 'Short' && l.unrealizedGain < 0);
        const ltGains = lots.filter(l => l.term === 'Long' && l.unrealizedGain > 0);
        const ltLosses = lots.filter(l => l.term === 'Long' && l.unrealizedGain < 0);

        console.log('Categories - ST Gains:', stGains.length, 'ST Losses:', stLosses.length, 
                    'LT Gains:', ltGains.length, 'LT Losses:', ltLosses.length);
        
        // CRITICAL FIX: Detect potential issues with target and available positions
        if ((neededST > 0 && stGains.length === 0) || 
            (neededST < 0 && stLosses.length === 0) ||
            (neededLT > 0 && ltGains.length === 0) ||
            (neededLT < 0 && ltLosses.length === 0)) {
            
            console.warn('⚠️ CRITICAL ISSUE: Missing positions needed to meet targets:');
            if (neededST > 0 && stGains.length === 0) console.warn(`- Need ST gains of $${neededST.toFixed(2)} but no ST gain positions available`);
            if (neededST < 0 && stLosses.length === 0) console.warn(`- Need ST losses of $${neededST.toFixed(2)} but no ST loss positions available`);
            if (neededLT > 0 && ltGains.length === 0) console.warn(`- Need LT gains of $${neededLT.toFixed(2)} but no LT gain positions available`);
            if (neededLT < 0 && ltLosses.length === 0) console.warn(`- Need LT losses of $${neededLT.toFixed(2)} but no LT loss positions available`);
            
            // FALLBACK STRATEGY: Try to find closest substitutes if primary category is empty
            console.log('Attempting fallback strategies for missing position types...');
            
            // For ST gains, try LT gains if available and ST gain positions are missing
            if (neededST > 0 && stGains.length === 0 && ltGains.length > 0) {
                console.log('FALLBACK: Using LT gain positions for ST gain target');
                // Copy the ST target to LT if LT isn't already being targeted
                if (neededLT <= 0) {
                    neededLT = neededST;
                    neededST = 0;
                    console.log(`Moved ST gain target to LT: now targeting LT gain of $${neededLT.toFixed(2)}`);
                }
            }
            
            // For LT gains, try ST gains if available and LT gain positions are missing
            if (neededLT > 0 && ltGains.length === 0 && stGains.length > 0) {
                console.log('FALLBACK: Using ST gain positions for LT gain target');
                // Copy the LT target to ST if ST isn't already being targeted
                if (neededST <= 0) {
                    neededST = neededLT;
                    neededLT = 0;
                    console.log(`Moved LT gain target to ST: now targeting ST gain of $${neededST.toFixed(2)}`);
                }
            }
        }
        
        // CRITICAL FIX: Check for excessive targets and cap them
        const capTarget = (target) => {
            // For gains, don't exceed 105% of target
            // For losses, don't go below 105% of target
            const maxMultiplier = 1.05;
            if (target > 0) {
                return Math.min(target, target * maxMultiplier);
            } else {
                return Math.max(target, target * maxMultiplier);
            }
        };
        
        // Apply caps to targets
        const cappedSTTarget = capTarget(neededST);
        const cappedLTTarget = capTarget(neededLT);
        
        console.log(`Original ST Target: ${neededST}, Capped: ${cappedSTTarget}`);
        console.log(`Original LT Target: ${neededLT}, Capped: ${cappedLTTarget}`);

        // CRITICAL FIX: Add check for target differential from current amounts
        if (cappedSTTarget > 0) {
            console.log('Finding ST gains');
            const selectedSTGains = this.findBestCombination(cappedSTTarget, stGains);
            recommendationsArray.push(...selectedSTGains);
        }
        else if (cappedSTTarget < 0) {
            console.log('Finding ST losses');
            recommendationsArray.push(...this.findBestCombination(cappedSTTarget, stLosses));
        }

        if (cappedLTTarget > 0) {
            console.log('Finding LT gains');
            const selectedLTGains = this.findBestCombination(cappedLTTarget, ltGains);
            recommendationsArray.push(...selectedLTGains);
        }
        else if (cappedLTTarget < 0) {
            console.log('Finding LT losses');
            recommendationsArray.push(...this.findBestCombination(cappedLTTarget, ltLosses));
        }

        console.log('Generated recommendations:', recommendationsArray.length);
        return recommendationsArray;
    },
    
    /**
     * Test function to validate the algorithm with predefined scenarios
     * 
     * @returns {boolean} Whether all test cases pass
     */
    runValidationTests: function() {
        console.log('Running validation tests for TaxHarvestingAlgorithm v' + this.version);
        let allTestsPassed = true;
        
        // Test Case 1: Basic gain harvesting
        const testCase1 = {
            target: 10000,
            lots: [
                { symbol: 'AAPL', quantity: 100, unrealizedGain: 5000, price: 150, term: 'Long' },
                { symbol: 'MSFT', quantity: 50, unrealizedGain: 3000, price: 300, term: 'Long' },
                { symbol: 'GOOGL', quantity: 25, unrealizedGain: 4000, price: 2500, term: 'Long' }
            ]
        };
        
        const result1 = this.findBestCombination(testCase1.target, testCase1.lots);
        const total1 = result1.reduce((sum, lot) => sum + lot.actualGain, 0);
        const test1Passed = total1 <= testCase1.target * 1.05 && total1 >= testCase1.target * 0.85;
        console.log('Test Case 1:', test1Passed ? 'PASSED' : 'FAILED', 
                   `Target: ${testCase1.target}, Result: ${total1}`);
        if (!test1Passed) allTestsPassed = false;
        
        // Test Case 2: Loss harvesting
        const testCase2 = {
            target: -7500,
            lots: [
                { symbol: 'XYZ', quantity: 200, unrealizedGain: -2000, price: 25, term: 'Short' },
                { symbol: 'ABC', quantity: 150, unrealizedGain: -3000, price: 40, term: 'Short' },
                { symbol: 'DEF', quantity: 300, unrealizedGain: -4000, price: 15, term: 'Short' }
            ]
        };
        
        const result2 = this.findBestCombination(testCase2.target, testCase2.lots);
        const total2 = result2.reduce((sum, lot) => sum + lot.actualGain, 0);
        const test2Passed = total2 >= testCase2.target * 1.05 && total2 <= testCase2.target * 0.85;
        console.log('Test Case 2:', test2Passed ? 'PASSED' : 'FAILED', 
                   `Target: ${testCase2.target}, Result: ${total2}`);
        if (!test2Passed) allTestsPassed = false;
        
        // Test Case 3: Large target with precision requirements
        const testCase3 = {
            target: 50000,
            lots: [
                { symbol: 'LRG1', quantity: 1000, unrealizedGain: 20000, price: 100, term: 'Long' },
                { symbol: 'LRG2', quantity: 500, unrealizedGain: 15000, price: 200, term: 'Long' },
                { symbol: 'LRG3', quantity: 200, unrealizedGain: 30000, price: 500, term: 'Long' }
            ]
        };
        
        const result3 = this.findBestCombination(testCase3.target, testCase3.lots);
        const total3 = result3.reduce((sum, lot) => sum + lot.actualGain, 0);
        // Stricter tolerance for large targets (1%)
        const test3Passed = total3 <= testCase3.target * 1.01 && total3 >= testCase3.target * 0.9;
        console.log('Test Case 3 (Large Target):', test3Passed ? 'PASSED' : 'FAILED', 
                   `Target: ${testCase3.target}, Result: ${total3}`);
        if (!test3Passed) allTestsPassed = false;
        
        // Test Case 4: Extreme precision test
        const testCase4 = {
            target: 100000,
            lots: Array.from({ length: 50 }, (_, i) => ({
                symbol: `TEST${i}`,
                quantity: Math.floor(Math.random() * 500) + 50,
                unrealizedGain: Math.floor(Math.random() * 10000) + 1000,
                price: Math.floor(Math.random() * 200) + 50,
                term: 'Long'
            }))
        };
        
        const result4 = this.findBestCombination(testCase4.target, testCase4.lots);
        const total4 = result4.reduce((sum, lot) => sum + lot.actualGain, 0);
        // Even stricter tolerance for very large targets (0.5%)
        const test4Passed = total4 <= testCase4.target * 1.005 && total4 >= testCase4.target * 0.95;
        console.log('Test Case 4 (Extreme Precision):', test4Passed ? 'PASSED' : 'FAILED', 
                   `Target: ${testCase4.target}, Result: ${total4}`);
        if (!test4Passed) allTestsPassed = false;
        
        // Test Case 5: Edge case with small target
        const testCase5 = {
            target: 500,
            lots: [
                { symbol: 'SML1', quantity: 10, unrealizedGain: 200, price: 50, term: 'Short' },
                { symbol: 'SML2', quantity: 5, unrealizedGain: 350, price: 100, term: 'Short' },
                { symbol: 'SML3', quantity: 20, unrealizedGain: 100, price: 25, term: 'Short' }
            ]
        };
        
        const result5 = this.findBestCombination(testCase5.target, testCase5.lots);
        const total5 = result5.reduce((sum, lot) => sum + lot.actualGain, 0);
        const test5Passed = total5 <= testCase5.target * 1.05 && total5 >= testCase5.target * 0.8;
        console.log('Test Case 5 (Small Target):', test5Passed ? 'PASSED' : 'FAILED', 
                   `Target: ${testCase5.target}, Result: ${total5}`);
        if (!test5Passed) allTestsPassed = false;
        
        console.log(`Validation testing complete: ${allTestsPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
        return allTestsPassed;
    },
    
    /**
     * Check if algorithm version is still valid
     * This prevents accidental editing of algorithm when a version manager is available
     */
    validateVersion: function() {
        if (typeof window !== 'undefined' && window.AlgorithmVersionManager) {
            const expectedVersion = window.AlgorithmVersionManager.getCurrentVersion('tax-harvesting');
            if (expectedVersion && expectedVersion !== this.version) {
                console.error(`❌ Algorithm version mismatch: expected ${expectedVersion}, but got ${this.version}`);
                return false;
            }
            
            // Ideally would also validate integrity/hash of algorithm code
            return true;
        }
        return true; // No version manager available, assume valid
    }
};

// Automatically run version validation when loaded
if (typeof window !== 'undefined') {
    setTimeout(() => {
        TaxHarvestingAlgorithm.validateVersion();
    }, 100);
}

// Export the module for use in the application
if (typeof module !== 'undefined') {
    module.exports = TaxHarvestingAlgorithm;
} else if (typeof window !== 'undefined') {
    window.TaxHarvestingAlgorithm = TaxHarvestingAlgorithm;
}
