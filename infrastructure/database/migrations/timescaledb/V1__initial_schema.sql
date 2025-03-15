-- V1__initial_schema.sql
--
-- TimescaleDB migration script for Inventory Management System
-- Creates the initial schema for time-series market data to support high-throughput ingestion
-- and efficient querying across all global markets
--
-- Requirements:
--   - Market Data Ingestion (F-102)
--   - High-Throughput Message Processing (F-501)
--   - Time-Series Data Storage optimization
--   - Performance optimization for 300,000+ events per second
--
-- TimescaleDB Version: 2.10

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ===========================================
-- Market Data Tables
-- ===========================================

-- Prices table for security price data
CREATE TABLE prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  security_id UUID NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  price NUMERIC(19, 8),
  bid_price NUMERIC(19, 8),
  ask_price NUMERIC(19, 8),
  volume NUMERIC(19, 8),
  currency VARCHAR(3),
  source VARCHAR(50) NOT NULL,
  batch_id VARCHAR(100),
  is_composite BOOLEAN NOT NULL DEFAULT FALSE,
  additional_attributes JSONB,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1
);

-- Basket NAVs table for ETF and index NAV data
CREATE TABLE basket_navs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basket_id UUID NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  nav_value NUMERIC(19, 8) NOT NULL,
  nav_type VARCHAR(20) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  source VARCHAR(50) NOT NULL,
  batch_id VARCHAR(100),
  additional_attributes JSONB,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1
);

-- Volatility curves table for volatility data
CREATE TABLE volatility_curves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  security_id UUID NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  tenor INTEGER NOT NULL,
  volatility NUMERIC(19, 8) NOT NULL,
  curve_type VARCHAR(20) NOT NULL,
  source VARCHAR(50) NOT NULL,
  batch_id VARCHAR(100),
  additional_attributes JSONB,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1
);

-- FX rates table for currency exchange rates
CREATE TABLE fx_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency VARCHAR(3) NOT NULL,
  quote_currency VARCHAR(3) NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  rate NUMERIC(19, 8) NOT NULL,
  source VARCHAR(50) NOT NULL,
  rate_type VARCHAR(20) NOT NULL,
  batch_id VARCHAR(100),
  additional_attributes JSONB,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1
);

-- Market data table for generic market data
CREATE TABLE market_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  security_id UUID NOT NULL,
  market_data_type VARCHAR(50) NOT NULL,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  price NUMERIC(19, 8),
  bid_price NUMERIC(19, 8),
  ask_price NUMERIC(19, 8),
  volume NUMERIC(19, 8),
  nav_value NUMERIC(19, 8),
  volatility NUMERIC(19, 8),
  tenor INTEGER,
  currency VARCHAR(3),
  source VARCHAR(50) NOT NULL,
  batch_id VARCHAR(100),
  processing_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  is_composite BOOLEAN NOT NULL DEFAULT FALSE,
  additional_attributes JSONB,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1
);

-- ===========================================
-- Indexes for Market Data Tables
-- ===========================================

-- Indexes for prices table
CREATE INDEX idx_prices_security_id ON prices(security_id);
CREATE INDEX idx_prices_event_time ON prices(event_time DESC);
CREATE INDEX idx_prices_source ON prices(source);
CREATE INDEX idx_prices_batch_id ON prices(batch_id);

-- Indexes for basket_navs table
CREATE INDEX idx_basket_navs_basket_id ON basket_navs(basket_id);
CREATE INDEX idx_basket_navs_event_time ON basket_navs(event_time DESC);
CREATE INDEX idx_basket_navs_source ON basket_navs(source);
CREATE INDEX idx_basket_navs_nav_type ON basket_navs(nav_type);

-- Indexes for volatility_curves table
CREATE INDEX idx_volatility_curves_security_id ON volatility_curves(security_id);
CREATE INDEX idx_volatility_curves_event_time ON volatility_curves(event_time DESC);
CREATE INDEX idx_volatility_curves_tenor ON volatility_curves(tenor);
CREATE INDEX idx_volatility_curves_curve_type ON volatility_curves(curve_type);

-- Indexes for fx_rates table
CREATE INDEX idx_fx_rates_currency_pair ON fx_rates(base_currency, quote_currency);
CREATE INDEX idx_fx_rates_event_time ON fx_rates(event_time DESC);
CREATE INDEX idx_fx_rates_source ON fx_rates(source);
CREATE INDEX idx_fx_rates_rate_type ON fx_rates(rate_type);

-- Indexes for market_data table
CREATE INDEX idx_market_data_security_id ON market_data(security_id);
CREATE INDEX idx_market_data_event_time ON market_data(event_time DESC);
CREATE INDEX idx_market_data_type ON market_data(market_data_type);
CREATE INDEX idx_market_data_source ON market_data(source);
CREATE INDEX idx_market_data_processing_status ON market_data(processing_status);

-- Composite indexes for efficient time-series queries
CREATE INDEX idx_prices_security_time ON prices(security_id, event_time DESC);
CREATE INDEX idx_basket_navs_basket_time ON basket_navs(basket_id, event_time DESC);
CREATE INDEX idx_volatility_curves_security_tenor_time ON volatility_curves(security_id, tenor, event_time DESC);
CREATE INDEX idx_fx_rates_pair_time ON fx_rates(base_currency, quote_currency, event_time DESC);
CREATE INDEX idx_market_data_security_type_time ON market_data(security_id, market_data_type, event_time DESC);

-- ===========================================
-- Audit Triggers
-- ===========================================

-- Create audit triggers for all tables
CREATE TRIGGER prices_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON prices
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER basket_navs_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON basket_navs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER volatility_curves_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON volatility_curves
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER fx_rates_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON fx_rates
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER market_data_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON market_data
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ===========================================
-- Table Comments
-- ===========================================

COMMENT ON TABLE prices IS 'Stores time-series price data for securities with TimescaleDB optimization';
COMMENT ON TABLE basket_navs IS 'Stores time-series NAV data for ETFs and indexes with TimescaleDB optimization';
COMMENT ON TABLE volatility_curves IS 'Stores time-series volatility data with TimescaleDB optimization';
COMMENT ON TABLE fx_rates IS 'Stores time-series FX rate data with TimescaleDB optimization';
COMMENT ON TABLE market_data IS 'Stores generic time-series market data with TimescaleDB optimization';

-- ===========================================
-- Version Update
-- ===========================================

-- Record this migration in the version table
INSERT INTO db_version (version, description, installed_by, success)
VALUES ('V1_TIMESCALE', 'TimescaleDB initial schema', current_user, TRUE);