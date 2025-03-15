-- V2__hypertables.sql
--
-- TimescaleDB migration script for Inventory Management System
-- Converts regular PostgreSQL tables to TimescaleDB hypertables for optimized time-series data storage
-- Enables high-throughput market data processing required for the IMS (300,000+ events per second)
--
-- Requirements:
--   - Market Data Ingestion (F-102)
--   - High-Throughput Message Processing (F-501)
--   - Time-Series Data Storage optimization
--   - Performance optimization for market data queries
--
-- TimescaleDB Version: 2.10

-- ===========================================
-- Convert Tables to Hypertables
-- ===========================================

-- Convert prices table to a hypertable partitioned by event_time
SELECT create_hypertable('prices', 'event_time', if_not_exists => TRUE);

-- Convert basket_navs table to a hypertable partitioned by event_time
SELECT create_hypertable('basket_navs', 'event_time', if_not_exists => TRUE);

-- Convert volatility_curves table to a hypertable partitioned by event_time
SELECT create_hypertable('volatility_curves', 'event_time', if_not_exists => TRUE);

-- Convert fx_rates table to a hypertable partitioned by event_time
SELECT create_hypertable('fx_rates', 'event_time', if_not_exists => TRUE);

-- Convert market_data table to a hypertable partitioned by event_time
SELECT create_hypertable('market_data', 'event_time', if_not_exists => TRUE);

-- ===========================================
-- Configure Hypertable Settings
-- ===========================================

-- Set chunk time interval for each hypertable
-- This defines how TimescaleDB will partition the data
-- Using 1-day intervals to balance query performance and administrative overhead
SELECT set_chunk_time_interval('prices', INTERVAL '1 day');
SELECT set_chunk_time_interval('basket_navs', INTERVAL '1 day');
SELECT set_chunk_time_interval('volatility_curves', INTERVAL '1 day');
SELECT set_chunk_time_interval('fx_rates', INTERVAL '1 day');
SELECT set_chunk_time_interval('market_data', INTERVAL '1 day');

-- ===========================================
-- Configure Compression Policies
-- ===========================================

-- Add compression policies to automatically compress older chunks
-- Data older than 7 days will be compressed to optimize storage and query performance
SELECT add_compression_policy('prices', INTERVAL '7 days');
SELECT add_compression_policy('basket_navs', INTERVAL '7 days');
SELECT add_compression_policy('volatility_curves', INTERVAL '7 days');
SELECT add_compression_policy('fx_rates', INTERVAL '7 days');
SELECT add_compression_policy('market_data', INTERVAL '7 days');

-- ===========================================
-- Configure Retention Policies
-- ===========================================

-- Add retention policies to automatically drop chunks older than 90 days
-- Helps manage storage growth and maintain performance
-- The 90-day retention aligns with compliance requirements for market data
SELECT add_retention_policy('prices', INTERVAL '90 days');
SELECT add_retention_policy('basket_navs', INTERVAL '90 days');
SELECT add_retention_policy('volatility_curves', INTERVAL '90 days');
SELECT add_retention_policy('fx_rates', INTERVAL '90 days');
SELECT add_retention_policy('market_data', INTERVAL '90 days');

-- ===========================================
-- Create TimescaleDB-Specific Indexes
-- ===========================================

-- Create time-bucket based indexes for efficient time-bucket queries
-- These are particularly useful for aggregation queries that use time_bucket()
CREATE INDEX idx_prices_time_bucket ON prices (time_bucket('1 hour', event_time), security_id);
CREATE INDEX idx_basket_navs_time_bucket ON basket_navs (time_bucket('1 hour', event_time), basket_id);
CREATE INDEX idx_volatility_curves_time_bucket ON volatility_curves (time_bucket('1 hour', event_time), security_id, tenor);
CREATE INDEX idx_fx_rates_time_bucket ON fx_rates (time_bucket('1 hour', event_time), base_currency, quote_currency);
CREATE INDEX idx_market_data_time_bucket ON market_data (time_bucket('1 hour', event_time), security_id, market_data_type);

-- ===========================================
-- Update Table Comments
-- ===========================================

-- Update table comments to reflect TimescaleDB hypertables
COMMENT ON TABLE prices IS 'TimescaleDB hypertable for time-series price data';
COMMENT ON TABLE basket_navs IS 'TimescaleDB hypertable for time-series NAV data';
COMMENT ON TABLE volatility_curves IS 'TimescaleDB hypertable for time-series volatility data';
COMMENT ON TABLE fx_rates IS 'TimescaleDB hypertable for time-series FX rate data';
COMMENT ON TABLE market_data IS 'TimescaleDB hypertable for time-series market data';

-- ===========================================
-- Update Version Information
-- ===========================================

-- Record this migration in the version table
INSERT INTO db_version (version, description, installed_by, success)
VALUES ('V2_TIMESCALE', 'TimescaleDB hypertables configuration', current_user, TRUE);