#!/usr/bin/env node
/**
 * Database Seeding Script for Neon Integration
 * Populates the database with sample data for testing and development
 */

const { query, testConnection } = require('../config/database');

const sampleData = {
    portfolios: [
        { name: 'Conservative Growth', description: 'Low-risk portfolio focused on steady growth' },
        { name: 'Aggressive Growth', description: 'High-risk, high-reward investment strategy' },
        { name: 'Income Focused', description: 'Dividend and income-generating assets' }
    ],
    
    modelPortfolios: [
        { 
            name: 'AWM Model - All Equity', 
            description: 'Diversified equity portfolio with global exposure',
            allocation: [
                { symbol: 'VTI', name: 'Vanguard Total Stock Market', weight: 0.40 },
                { symbol: 'VTIAX', name: 'Vanguard Total International', weight: 0.30 },
                { symbol: 'VEA', name: 'Vanguard Developed Markets', weight: 0.20 },
                { symbol: 'VWO', name: 'Vanguard Emerging Markets', weight: 0.10 }
            ]
        },
        {
            name: 'AWM Model - Balanced',
            description: 'Balanced portfolio with 60/40 stock/bond allocation',
            allocation: [
                { symbol: 'VTI', name: 'Vanguard Total Stock Market', weight: 0.36 },
                { symbol: 'VTIAX', name: 'Vanguard Total International', weight: 0.24 },
                { symbol: 'BND', name: 'Vanguard Total Bond Market', weight: 0.30 },
                { symbol: 'VBTLX', name: 'Vanguard Total International Bond', weight: 0.10 }
            ]
        }
    ],
    
    positions: [
        // Portfolio 1 - Conservative Growth
        { symbol: 'VTI', name: 'Vanguard Total Stock Market', quantity: 100, price: 220.50, costBasis: 20000, acquiredDate: '2023-01-15' },
        { symbol: 'BND', name: 'Vanguard Total Bond Market', quantity: 200, price: 78.25, costBasis: 16000, acquiredDate: '2023-02-01' },
        { symbol: 'VTIAX', name: 'Vanguard Total International', quantity: 50, price: 28.75, costBasis: 1400, acquiredDate: '2023-03-01' },
        
        // Portfolio 2 - Aggressive Growth  
        { symbol: 'QQQ', name: 'Invesco QQQ Trust', quantity: 50, price: 375.00, costBasis: 17500, acquiredDate: '2023-01-10' },
        { symbol: 'VUG', name: 'Vanguard Growth ETF', quantity: 75, price: 285.50, costBasis: 20000, acquiredDate: '2023-02-15' },
        { symbol: 'ARKK', name: 'ARK Innovation ETF', quantity: 100, price: 45.25, costBasis: 5500, acquiredDate: '2023-04-01' },
        
        // Portfolio 3 - Income Focused
        { symbol: 'SCHD', name: 'Schwab US Dividend Equity ETF', quantity: 200, price: 74.50, costBasis: 14000, acquiredDate: '2023-01-20' },
        { symbol: 'JEPI', name: 'JPMorgan Equity Premium Income ETF', quantity: 150, price: 58.75, costBasis: 8500, acquiredDate: '2023-03-15' },
        { symbol: 'REITS', name: 'Real Estate Investment Trusts', quantity: 100, price: 85.25, costBasis: 8000, acquiredDate: '2023-05-01' }
    ],
    
    etfWashSaleData: [
        { primarySymbol: 'VTI', similarSymbols: ['ITOT', 'SPTM'], similarity: 95 },
        { primarySymbol: 'BND', similarSymbols: ['AGG', 'SCHZ'], similarity: 90 },
        { primarySymbol: 'QQQ', similarSymbols: ['ONEQ', 'QQQM'], similarity: 85 },
        { primarySymbol: 'VUG', similarSymbols: ['SPYG', 'IVW'], similarity: 88 }
    ]
};

async function seedDatabase() {
    console.log('🌱 Starting database seeding...');
    
    try {
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            throw new Error('Database connection failed');
        }
        
        // Clear existing data (in reverse order of dependencies)
        console.log('🧹 Clearing existing sample data...');
        await query('DELETE FROM tax_calculations WHERE id > 0');
        await query('DELETE FROM positions WHERE id > 0');
        await query('DELETE FROM model_portfolio_allocations WHERE id > 0');
        await query('DELETE FROM model_portfolios WHERE id > 0');
        await query('DELETE FROM portfolios WHERE id > 0');
        await query('DELETE FROM etf_wash_sale_data WHERE id > 0');
        
        // Reset sequences
        await query('ALTER SEQUENCE portfolios_id_seq RESTART WITH 1');
        await query('ALTER SEQUENCE positions_id_seq RESTART WITH 1');
        await query('ALTER SEQUENCE model_portfolios_id_seq RESTART WITH 1');
        
        // Seed portfolios
        console.log('📁 Seeding portfolios...');
        const portfolioIds = [];
        for (const portfolio of sampleData.portfolios) {
            const result = await query(
                'INSERT INTO portfolios (portfolio_name, description) VALUES ($1, $2) RETURNING id',
                [portfolio.name, portfolio.description]
            );
            portfolioIds.push(result.rows[0].id);
        }
        console.log(`✅ Created ${portfolioIds.length} portfolios`);
        
        // Seed model portfolios
        console.log('🎯 Seeding model portfolios...');
        for (const model of sampleData.modelPortfolios) {
            const result = await query(
                'INSERT INTO model_portfolios (model_name, description) VALUES ($1, $2) RETURNING id',
                [model.name, model.description]
            );
            const modelId = result.rows[0].id;
            
            // Add allocations
            for (const allocation of model.allocation) {
                await query(`
                    INSERT INTO model_portfolio_allocations 
                    (model_portfolio_id, symbol, name, target_weight) 
                    VALUES ($1, $2, $3, $4)
                `, [modelId, allocation.symbol, allocation.name, allocation.weight]);
            }
        }
        console.log(`✅ Created ${sampleData.modelPortfolios.length} model portfolios`);
        
        // Seed positions
        console.log('💼 Seeding positions...');
        let positionIndex = 0;
        for (let i = 0; i < portfolioIds.length; i++) {
            const portfolioId = portfolioIds[i];
            const positionsPerPortfolio = 3;
            
            for (let j = 0; j < positionsPerPortfolio; j++) {
                const position = sampleData.positions[positionIndex];
                if (position) {
                    await query(`
                        INSERT INTO positions 
                        (portfolio_id, symbol, name, quantity, price, cost_basis, acquired_date) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `, [
                        portfolioId, 
                        position.symbol, 
                        position.name, 
                        position.quantity, 
                        position.price, 
                        position.costBasis, 
                        position.acquiredDate
                    ]);
                }
                positionIndex++;
            }
        }
        console.log(`✅ Created ${sampleData.positions.length} positions`);
        
        // Seed ETF wash sale data
        console.log('⚖️ Seeding wash sale data...');
        for (const washSale of sampleData.etfWashSaleData) {
            await query(`
                INSERT INTO etf_wash_sale_data 
                (primary_symbol, similar_symbols, similarity_score) 
                VALUES ($1, $2, $3)
            `, [washSale.primarySymbol, washSale.similarSymbols, washSale.similarity]);
        }
        console.log(`✅ Created ${sampleData.etfWashSaleData.length} wash sale entries`);
        
        // Create sample tax calculation
        console.log('🧮 Creating sample tax calculation...');
        await query(`
            INSERT INTO tax_calculations 
            (portfolio_id, calculation_name, target_st_gain, target_lt_gain, results) 
            VALUES ($1, $2, $3, $4, $5)
        `, [
            portfolioIds[0],
            'Sample Tax Harvesting Analysis',
            0,
            10000,
            JSON.stringify({
                recommendations: [
                    { symbol: 'VTI', action: 'sell', quantity: 25, gain: 12500, term: 'Long-Term' }
                ],
                summary: { totalGain: 12500, taxSavings: 2500 }
            })
        ]);
        
        console.log('✅ Database seeding completed successfully!');
        
        // Show summary
        const portfolioCount = await query('SELECT COUNT(*) as count FROM portfolios');
        const positionCount = await query('SELECT COUNT(*) as count FROM positions');
        const modelCount = await query('SELECT COUNT(*) as count FROM model_portfolios');
        
        console.log('📊 Seeding Summary:');
        console.log(`   Portfolios: ${portfolioCount.rows[0].count}`);
        console.log(`   Positions: ${positionCount.rows[0].count}`);
        console.log(`   Model Portfolios: ${modelCount.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    seedDatabase()
        .then(() => {
            console.log('🎉 Database seeding complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { seedDatabase };
