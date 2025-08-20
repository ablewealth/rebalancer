-- Tax Harvesting Database Schema (Enhanced for Neon Integration)
-- This schema supports portfolio management with migration tracking

-- Create database (run this separately)
-- CREATE DATABASE tax_harvesting;

-- Migrations table for tracking schema changes
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Portfolios table (simplified without user_id)
CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    portfolio_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Positions table for portfolio holdings
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    quantity DECIMAL(15,4) DEFAULT 0,
    price DECIMAL(10,4) DEFAULT 0,
    cost_basis DECIMAL(15,4) DEFAULT 0,
    target_weight DECIMAL(5,4) DEFAULT 0, -- As decimal (0.05 = 5%)
    acquired_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tax calculations table for storing calculation results
CREATE TABLE IF NOT EXISTS tax_calculations (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
    calculation_name VARCHAR(255),
    target_st_gain DECIMAL(15,2) DEFAULT 0,
    target_lt_gain DECIMAL(15,2) DEFAULT 0,
    realized_st_gain DECIMAL(15,2) DEFAULT 0,
    realized_lt_gain DECIMAL(15,2) DEFAULT 0,
    results JSONB, -- Store the full calculation results
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model portfolios table for storing reusable portfolio templates
CREATE TABLE IF NOT EXISTS model_portfolios (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model portfolio holdings
CREATE TABLE IF NOT EXISTS model_holdings (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES model_portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    target_weight DECIMAL(5,4) NOT NULL, -- As decimal (0.05 = 5%)
    price DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Price history table for tracking symbol prices over time
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(10,4) NOT NULL,
    price_date DATE DEFAULT CURRENT_DATE,
    source VARCHAR(50) DEFAULT 'manual',
    metadata JSONB, -- Store additional price data (volume, change, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_tax_calculations_portfolio_id ON tax_calculations(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_model_holdings_model_id ON model_holdings(model_id);
CREATE INDEX IF NOT EXISTS idx_model_holdings_symbol ON model_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(price_date);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_portfolios_updated_at BEFORE UPDATE ON model_portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_holdings_updated_at BEFORE UPDATE ON model_holdings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample model portfolios
INSERT INTO model_portfolios (model_name, description) VALUES
('Conservative Growth', 'Balanced portfolio with 60% stocks, 40% bonds'),
('Aggressive Growth', 'Growth-focused portfolio with 90% stocks, 10% bonds'),
('Income Focus', 'Dividend and bond focused portfolio')
ON CONFLICT (model_name) DO NOTHING;

-- ETF Wash Sale Database (for Neon-enhanced wash sale detection)
CREATE TABLE IF NOT EXISTS etf_wash_sale_data (
    id SERIAL PRIMARY KEY,
    primary_symbol VARCHAR(20) NOT NULL,
    similar_symbols TEXT[], -- Array of similar ETF symbols
    similarity_score INTEGER DEFAULT 0, -- 0-100 similarity score
    category VARCHAR(100), -- Asset category (Large Cap, International, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(primary_symbol)
);

-- Enhanced portfolio analytics (Neon-optimized for real-time analysis)
CREATE TABLE IF NOT EXISTS portfolio_analytics (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
    analysis_date DATE DEFAULT CURRENT_DATE,
    total_value DECIMAL(15,2),
    total_gain_loss DECIMAL(15,2),
    total_gain_loss_pct DECIMAL(8,4),
    st_gains DECIMAL(15,2) DEFAULT 0,
    lt_gains DECIMAL(15,2) DEFAULT 0,
    st_losses DECIMAL(15,2) DEFAULT 0,
    lt_losses DECIMAL(15,2) DEFAULT 0,
    wash_sale_violations INTEGER DEFAULT 0,
    risk_score DECIMAL(5,2), -- Portfolio risk assessment
    diversification_score DECIMAL(5,2), -- Diversification metric
    metadata JSONB, -- Additional analytics data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, analysis_date)
);

-- Neon-optimized indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_etf_wash_sale_primary ON etf_wash_sale_data(primary_symbol);
CREATE INDEX IF NOT EXISTS idx_etf_wash_sale_category ON etf_wash_sale_data(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_analytics_portfolio_date ON portfolio_analytics(portfolio_id, analysis_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_analytics_date ON portfolio_analytics(analysis_date);

-- Add triggers for new tables
CREATE TRIGGER update_etf_wash_sale_updated_at BEFORE UPDATE ON etf_wash_sale_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries (Neon-optimized)
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT 
    p.id,
    p.portfolio_name,
    COUNT(pos.id) as position_count,
    COALESCE(SUM(pos.quantity * pos.price), 0) as total_value,
    COALESCE(SUM(pos.quantity * pos.price - pos.cost_basis), 0) as total_unrealized_gain,
    p.created_at,
    p.updated_at
FROM portfolios p
LEFT JOIN positions pos ON p.id = pos.portfolio_id
GROUP BY p.id, p.portfolio_name, p.created_at, p.updated_at;

-- Function to calculate portfolio metrics (optimized for Neon)
CREATE OR REPLACE FUNCTION calculate_portfolio_metrics(portfolio_id_param INTEGER)
RETURNS TABLE(
    total_value DECIMAL(15,2),
    total_gain_loss DECIMAL(15,2),
    st_gains DECIMAL(15,2),
    lt_gains DECIMAL(15,2),
    position_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(pos.quantity * pos.price), 0)::DECIMAL(15,2) as total_value,
        COALESCE(SUM(pos.quantity * pos.price - pos.cost_basis), 0)::DECIMAL(15,2) as total_gain_loss,
        COALESCE(SUM(CASE 
            WHEN pos.acquired_date > CURRENT_DATE - INTERVAL '1 year' 
            AND (pos.quantity * pos.price - pos.cost_basis) > 0
            THEN pos.quantity * pos.price - pos.cost_basis 
            ELSE 0 
        END), 0)::DECIMAL(15,2) as st_gains,
        COALESCE(SUM(CASE 
            WHEN pos.acquired_date <= CURRENT_DATE - INTERVAL '1 year' 
            AND (pos.quantity * pos.price - pos.cost_basis) > 0
            THEN pos.quantity * pos.price - pos.cost_basis 
            ELSE 0 
        END), 0)::DECIMAL(15,2) as lt_gains,
        COUNT(pos.id)::INTEGER as position_count
    FROM positions pos
    WHERE pos.portfolio_id = portfolio_id_param;
END;
$$ LANGUAGE plpgsql;

-- Sample model holdings for Conservative Growth
INSERT INTO model_holdings (model_id, symbol, name, target_weight, price) VALUES
((SELECT id FROM model_portfolios WHERE model_name = 'Conservative Growth'), 'VTI', 'Vanguard Total Stock Market ETF', 0.30, 220.00),
((SELECT id FROM model_portfolios WHERE model_name = 'Conservative Growth'), 'VTIAX', 'Vanguard Total International Stock Index', 0.20, 28.50),
((SELECT id FROM model_portfolios WHERE model_name = 'Conservative Growth'), 'BND', 'Vanguard Total Bond Market ETF', 0.30, 75.00),
((SELECT id FROM model_portfolios WHERE model_name = 'Conservative Growth'), 'VTEB', 'Vanguard Tax-Exempt Bond ETF', 0.15, 52.00),
((SELECT id FROM model_portfolios WHERE model_name = 'Conservative Growth'), 'VNQ', 'Vanguard Real Estate ETF', 0.05, 85.00)
ON CONFLICT DO NOTHING;