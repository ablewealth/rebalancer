-- Tax Harvesting Database Schema (Simplified - No User Authentication)
-- This schema supports portfolio management without user accounts

-- Create database (run this separately)
-- CREATE DATABASE tax_harvesting;

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

-- Sample model holdings for Conservative Growth
INSERT INTO model_holdings (model_id, symbol, name, target_weight, price) VALUES
((SELECT id FROM model_portfolios WHERE model_name = 'Conservative Growth'), 'VTI', 'Vanguard Total Stock Market ETF', 0.30, 220.00),
((SELECT id FROM model_portfolios WHERE model_name = 'Conservative Growth'), 'VTIAX', 'Vanguard Total International Stock Index', 0.20, 28.50),
((SELECT id FROM model_portfolios WHERE model_name = 'Conservative Growth'), 'BND', 'Vanguard Total Bond Market ETF', 0.30, 75.00),
((SELECT id FROM model_portfolios WHERE model_name = 'Conservative Growth'), 'VTEB', 'Vanguard Tax-Exempt Bond ETF', 0.15, 52.00),
((SELECT id FROM model_portfolios WHERE model_name = 'Conservative Growth'), 'VNQ', 'Vanguard Real Estate ETF', 0.05, 85.00)
ON CONFLICT DO NOTHING;