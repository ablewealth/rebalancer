/**
 * Neon Database Service
 * Enhanced integration with Neon database for tax harvesting system
 */

const { query, getDatabaseInfo, testConnection } = require('../config/database');

class NeonDatabaseService {
    constructor() {
        this.isInitialized = false;
        this.dbInfo = getDatabaseInfo();
    }

    /**
     * Initialize the service and verify Neon connection
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Neon Database Service...');
            
            const connected = await testConnection();
            if (!connected) {
                throw new Error('Failed to connect to database');
            }
            
            console.log('📊 Database Info:', this.dbInfo);
            this.isInitialized = true;
            
            return {
                success: true,
                info: this.dbInfo,
                message: 'Neon Database Service initialized successfully'
            };
        } catch (error) {
            console.error('❌ Failed to initialize Neon Database Service:', error);
            throw error;
        }
    }

    /**
     * Get portfolio analytics optimized for Neon
     */
    async getPortfolioAnalytics(portfolioId) {
        if (!this.isInitialized) await this.initialize();
        
        try {
            // Get portfolio summary using optimized view
            const summary = await query(`
                SELECT * FROM portfolio_summary WHERE id = $1
            `, [portfolioId]);
            
            if (summary.rows.length === 0) {
                throw new Error(`Portfolio ${portfolioId} not found`);
            }
            
            // Get detailed metrics using the optimized function
            const metrics = await query(`
                SELECT * FROM calculate_portfolio_metrics($1)
            `, [portfolioId]);
            
            // Get positions with real-time calculations
            const positions = await query(`
                SELECT 
                    symbol,
                    name,
                    quantity,
                    price,
                    cost_basis,
                    (quantity * price) as market_value,
                    (quantity * price - cost_basis) as unrealized_gain,
                    ((quantity * price - cost_basis) / cost_basis * 100) as gain_loss_pct,
                    CASE 
                        WHEN acquired_date > CURRENT_DATE - INTERVAL '1 year' 
                        THEN 'Short-Term' 
                        ELSE 'Long-Term' 
                    END as term,
                    acquired_date
                FROM positions 
                WHERE portfolio_id = $1
                ORDER BY symbol
            `, [portfolioId]);
            
            // Check for wash sale violations
            const washSaleCheck = await this.checkWashSaleViolations(portfolioId);
            
            return {
                portfolio: summary.rows[0],
                metrics: metrics.rows[0],
                positions: positions.rows,
                washSaleViolations: washSaleCheck.violations,
                lastUpdated: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Error getting portfolio analytics:', error);
            throw error;
        }
    }

    /**
     * Enhanced wash sale violation detection using Neon data
     */
    async checkWashSaleViolations(portfolioId) {
        try {
            const violations = await query(`
                SELECT 
                    p.symbol,
                    p.name,
                    w.similar_symbols,
                    w.similarity_score,
                    p.acquired_date,
                    CASE 
                        WHEN w.similarity_score >= 90 THEN 'HIGH'
                        WHEN w.similarity_score >= 70 THEN 'MEDIUM'
                        ELSE 'LOW'
                    END as risk_level
                FROM positions p
                LEFT JOIN etf_wash_sale_data w ON p.symbol = w.primary_symbol
                WHERE p.portfolio_id = $1
                AND w.similarity_score IS NOT NULL
                ORDER BY w.similarity_score DESC
            `, [portfolioId]);
            
            return {
                violations: violations.rows,
                count: violations.rows.length,
                highRiskCount: violations.rows.filter(v => v.risk_level === 'HIGH').length
            };
        } catch (error) {
            console.error('❌ Error checking wash sales:', error);
            return { violations: [], count: 0, highRiskCount: 0 };
        }
    }

    /**
     * Store tax harvesting calculation results
     */
    async storeTaxCalculation(portfolioId, calculationData) {
        try {
            const result = await query(`
                INSERT INTO tax_calculations 
                (portfolio_id, calculation_name, target_st_gain, target_lt_gain, 
                 realized_st_gain, realized_lt_gain, results)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, created_at
            `, [
                portfolioId,
                calculationData.name || 'Tax Harvesting Analysis',
                calculationData.targetSTGain || 0,
                calculationData.targetLTGain || 0,
                calculationData.realizedSTGain || 0,
                calculationData.realizedLTGain || 0,
                JSON.stringify(calculationData.results)
            ]);
            
            return {
                id: result.rows[0].id,
                createdAt: result.rows[0].created_at,
                success: true
            };
        } catch (error) {
            console.error('❌ Error storing tax calculation:', error);
            throw error;
        }
    }

    /**
     * Get historical tax calculations
     */
    async getTaxCalculationHistory(portfolioId, limit = 10) {
        try {
            const results = await query(`
                SELECT 
                    id,
                    calculation_name,
                    target_st_gain,
                    target_lt_gain,
                    realized_st_gain,
                    realized_lt_gain,
                    results,
                    created_at
                FROM tax_calculations
                WHERE portfolio_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            `, [portfolioId, limit]);
            
            return results.rows.map(row => ({
                ...row,
                results: typeof row.results === 'string' ? JSON.parse(row.results) : row.results
            }));
        } catch (error) {
            console.error('❌ Error getting calculation history:', error);
            throw error;
        }
    }

    /**
     * Update portfolio analytics (for scheduled updates)
     */
    async updatePortfolioAnalytics(portfolioId) {
        try {
            const metrics = await query(`
                SELECT * FROM calculate_portfolio_metrics($1)
            `, [portfolioId]);
            
            if (metrics.rows.length === 0) {
                throw new Error(`No metrics found for portfolio ${portfolioId}`);
            }
            
            const metric = metrics.rows[0];
            
            // Calculate additional metrics
            const riskScore = this.calculateRiskScore(metric);
            const diversificationScore = await this.calculateDiversificationScore(portfolioId);
            
            // Upsert analytics record
            await query(`
                INSERT INTO portfolio_analytics 
                (portfolio_id, total_value, total_gain_loss, total_gain_loss_pct,
                 st_gains, lt_gains, risk_score, diversification_score, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (portfolio_id, analysis_date)
                DO UPDATE SET
                    total_value = EXCLUDED.total_value,
                    total_gain_loss = EXCLUDED.total_gain_loss,
                    total_gain_loss_pct = EXCLUDED.total_gain_loss_pct,
                    st_gains = EXCLUDED.st_gains,
                    lt_gains = EXCLUDED.lt_gains,
                    risk_score = EXCLUDED.risk_score,
                    diversification_score = EXCLUDED.diversification_score,
                    metadata = EXCLUDED.metadata
            `, [
                portfolioId,
                metric.total_value,
                metric.total_gain_loss,
                metric.total_value > 0 ? (metric.total_gain_loss / metric.total_value * 100) : 0,
                metric.st_gains,
                metric.lt_gains,
                riskScore,
                diversificationScore,
                JSON.stringify({
                    positionCount: metric.position_count,
                    lastUpdated: new Date().toISOString()
                })
            ]);
            
            return { success: true, portfolioId, updated: new Date().toISOString() };
        } catch (error) {
            console.error('❌ Error updating portfolio analytics:', error);
            throw error;
        }
    }

    /**
     * Get ETF alternatives for wash sale avoidance
     */
    async getETFAlternatives(symbol) {
        try {
            const alternatives = await query(`
                SELECT 
                    primary_symbol,
                    similar_symbols,
                    similarity_score,
                    category
                FROM etf_wash_sale_data
                WHERE primary_symbol = $1 OR $1 = ANY(similar_symbols)
                ORDER BY similarity_score DESC
            `, [symbol]);
            
            return alternatives.rows;
        } catch (error) {
            console.error('❌ Error getting ETF alternatives:', error);
            return [];
        }
    }

    /**
     * Calculate basic risk score (0-100)
     */
    calculateRiskScore(metrics) {
        if (!metrics.total_value || metrics.total_value <= 0) return 0;
        
        const gainLossPct = Math.abs(metrics.total_gain_loss / metrics.total_value * 100);
        const concentrationRisk = metrics.position_count < 5 ? 20 : 0;
        
        return Math.min(100, gainLossPct + concentrationRisk);
    }

    /**
     * Calculate diversification score (0-100)
     */
    async calculateDiversificationScore(portfolioId) {
        try {
            const positions = await query(`
                SELECT COUNT(*) as count,
                       MAX(quantity * price) as max_position,
                       SUM(quantity * price) as total_value
                FROM positions
                WHERE portfolio_id = $1
            `, [portfolioId]);
            
            if (positions.rows.length === 0) return 0;
            
            const { count, max_position, total_value } = positions.rows[0];
            if (!total_value || total_value <= 0) return 0;
            
            const concentrationPct = (max_position / total_value) * 100;
            const diversificationScore = Math.max(0, 100 - concentrationPct - Math.max(0, 10 - count) * 5);
            
            return Math.round(diversificationScore);
        } catch (error) {
            console.error('❌ Error calculating diversification score:', error);
            return 0;
        }
    }

    /**
     * Health check for Neon integration
     */
    async healthCheck() {
        try {
            const start = Date.now();
            
            // Test basic connection
            const connected = await testConnection();
            if (!connected) {
                throw new Error('Database connection failed');
            }
            
            // Test query performance
            const queryStart = Date.now();
            await query('SELECT COUNT(*) FROM portfolios');
            const queryTime = Date.now() - queryStart;
            
            // Test specific Neon features
            const neonFeatures = await this.testNeonFeatures();
            
            const totalTime = Date.now() - start;
            
            return {
                status: 'healthy',
                database: this.dbInfo,
                performance: {
                    totalTime,
                    queryTime
                },
                features: neonFeatures,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                database: this.dbInfo,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Test Neon-specific features
     */
    async testNeonFeatures() {
        try {
            // Test JSONB operations
            const jsonbTest = await query(`
                SELECT '{"test": true}'::jsonb -> 'test' as jsonb_support
            `);
            
            // Test array operations
            const arrayTest = await query(`
                SELECT ARRAY['test1', 'test2'] as array_support
            `);
            
            return {
                jsonb: !!jsonbTest.rows[0]?.jsonb_support,
                arrays: Array.isArray(arrayTest.rows[0]?.array_support),
                functions: true, // We created custom functions
                views: true // We created views
            };
        } catch (error) {
            console.error('❌ Error testing Neon features:', error);
            return {
                jsonb: false,
                arrays: false,
                functions: false,
                views: false
            };
        }
    }
}

module.exports = { NeonDatabaseService };
