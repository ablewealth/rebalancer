const { EnhancedTaxHarvestingService } = require('./services/enhancedTaxHarvestingService');

console.log("Analyzing all possible combinations for $55,000 LT gains target...\n");

// Create realistic portfolio
const portfolio = [
    {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        quantity: 1000,
        price: 175,
        costBasis: 100000,
        unrealizedGain: 75000,
        term: 'Long-Term',
        acquiredDate: new Date('2022-01-15'),
        accountType: 'taxable',
        includedInSelling: true
    },
    {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        quantity: 500,
        price: 300,
        costBasis: 100000,
        unrealizedGain: 50000,
        term: 'Long-Term',
        acquiredDate: new Date('2022-02-01'),
        accountType: 'taxable',
        includedInSelling: true
    },
    {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        quantity: 100,
        price: 450,
        costBasis: 30000,
        unrealizedGain: 15000,
        term: 'Long-Term',
        acquiredDate: new Date('2022-03-01'),
        accountType: 'taxable',
        includedInSelling: true
    },
    {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        quantity: 200,
        price: 140,
        costBasis: 40000,
        unrealizedGain: -12000,
        term: 'Long-Term',
        acquiredDate: new Date('2022-04-01'),
        accountType: 'taxable',
        includedInSelling: true
    },
    {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        quantity: 150,
        price: 200,
        costBasis: 54000,
        unrealizedGain: -24000,
        term: 'Long-Term',
        acquiredDate: new Date('2022-05-01'),
        accountType: 'taxable',
        includedInSelling: true
    }
];

const target = 55000;
const gainLots = portfolio.filter(lot => lot.unrealizedGain > 0);

console.log("Available lots with gains:");
gainLots.forEach(lot => {
    console.log(`  ${lot.symbol}: $${lot.unrealizedGain.toLocaleString()} gain`);
});

console.log(`\nTarget: $${target.toLocaleString()}\n`);

// Calculate all possible combinations
function getAllCombinations(lots) {
    const combinations = [];
    const n = lots.length;
    
    // Generate all possible subsets (2^n combinations)
    for (let i = 1; i < (1 << n); i++) {
        const combination = [];
        let totalGain = 0;
        
        for (let j = 0; j < n; j++) {
            if (i & (1 << j)) {
                combination.push(lots[j]);
                totalGain += lots[j].unrealizedGain;
            }
        }
        
        combinations.push({
            lots: combination,
            totalGain,
            distance: Math.abs(target - totalGain),
            overshoot: totalGain > target ? totalGain - target : 0,
            undershoot: totalGain < target ? target - totalGain : 0
        });
    }
    
    return combinations.sort((a, b) => a.distance - b.distance);
}

const allCombinations = getAllCombinations(gainLots);

console.log("All possible combinations (sorted by distance from target):");
console.log("=" * 70);

allCombinations.forEach((combo, index) => {
    const symbols = combo.lots.map(lot => lot.symbol).join(' + ');
    const gains = combo.lots.map(lot => `$${lot.unrealizedGain.toLocaleString()}`).join(' + ');
    
    console.log(`${index + 1}. ${symbols}`);
    console.log(`   Gains: ${gains} = $${combo.totalGain.toLocaleString()}`);
    console.log(`   Distance from target: $${combo.distance.toLocaleString()}`);
    
    if (combo.overshoot > 0) {
        console.log(`   Overshoot: $${combo.overshoot.toLocaleString()}`);
    } else if (combo.undershoot > 0) {
        console.log(`   Undershoot: $${combo.undershoot.toLocaleString()}`);
    } else {
        console.log(`   ✅ EXACT MATCH!`);
    }
    console.log("");
});

// Test what the algorithm actually chooses
console.log("=" * 70);
console.log("TESTING ALGORITHM CHOICE:");

async function testAlgorithm() {
    const service = new EnhancedTaxHarvestingService();
    
    const result = await service.runTaxHarvesting(
        portfolio, 
        0, // ST target
        target, // LT target
        0, // already realized ST
        0  // already realized LT
    );
    
    console.log(`\nAlgorithm selected ${result.recommendations.length} recommendations:`);
    let totalGains = 0;
    result.recommendations.forEach((rec, index) => {
        const gain = rec.actualGain || rec.unrealizedGain || rec.gain || 0;
        console.log(`${index + 1}. ${rec.symbol}: $${gain.toLocaleString()}`);
        totalGains += gain;
    });
    
    console.log(`Total gains: $${totalGains.toLocaleString()}`);
    console.log(`Distance from target: $${Math.abs(target - totalGains).toLocaleString()}`);
    
    // Find this combination in our analysis
    const algorithmCombo = allCombinations.find(combo => {
        return combo.totalGain === totalGains && 
               combo.lots.length === result.recommendations.length;
    });
    
    if (algorithmCombo) {
        const rank = allCombinations.indexOf(algorithmCombo) + 1;
        console.log(`This is combination #${rank} out of ${allCombinations.length} possible combinations`);
        
        if (rank === 1) {
            console.log("✅ Algorithm chose the optimal combination!");
        } else {
            console.log(`⚠️  Algorithm did not choose the optimal combination (rank ${rank})`);
            console.log("Best combination would be:");
            const best = allCombinations[0];
            const bestSymbols = best.lots.map(lot => lot.symbol).join(' + ');
            console.log(`   ${bestSymbols}: $${best.totalGain.toLocaleString()} (distance: $${best.distance.toLocaleString()})`);
        }
    }
}

testAlgorithm().catch(console.error);
