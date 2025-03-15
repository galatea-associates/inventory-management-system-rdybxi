--
-- V1__initial_schema.sql
--
-- Initial PostgreSQL schema setup for Inventory Management System
-- This migration creates the foundation for the database including:
-- - Common extensions
-- - Standard types
-- - Audit infrastructure
-- - System logging
--

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ===========================================
-- Common Types
-- ===========================================

-- Status type for consistent status representation across tables
CREATE TYPE status_type AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED', 'SUSPENDED', 'PENDING');

-- ===========================================
-- Audit Tables
-- ===========================================

-- Audit logs table to track all data changes
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  operation VARCHAR(10) NOT NULL,
  record_id VARCHAR(100) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by VARCHAR(50),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- System logs table for operational events and errors
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_level VARCHAR(20) NOT NULL,
  log_message TEXT NOT NULL,
  log_context JSONB,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(255),
  correlation_id VARCHAR(100)
);

-- ===========================================
-- Audit Functions
-- ===========================================

-- Function to automatically log table changes
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  record_id VARCHAR(100);
  changed_by VARCHAR(50);
BEGIN
  IF TG_OP = 'INSERT' THEN
    record_id := NEW.id;
    changed_by := NEW.created_by;
  ELSIF TG_OP = 'UPDATE' THEN
    record_id := NEW.id;
    changed_by := NEW.updated_by;
  ELSE
    record_id := OLD.id;
    changed_by := current_user;
  END IF;

  INSERT INTO audit_logs(
    table_name,
    operation,
    record_id,
    old_data,
    new_data,
    changed_by,
    changed_at
  )
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    record_id,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    changed_by,
    CURRENT_TIMESTAMP
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log system events
CREATE OR REPLACE FUNCTION log_system_event(
  p_log_level VARCHAR(20),
  p_log_message TEXT,
  p_log_context JSONB DEFAULT NULL,
  p_source VARCHAR(255) DEFAULT NULL,
  p_correlation_id VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO system_logs(
    log_level,
    log_message,
    log_context,
    source,
    correlation_id
  )
  VALUES (
    p_log_level,
    p_log_message,
    p_log_context,
    p_source,
    p_correlation_id
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- Indexes
-- ===========================================

-- Audit logs indexes
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);

-- System logs indexes
CREATE INDEX idx_system_logs_log_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_logged_at ON system_logs(logged_at);
CREATE INDEX idx_system_logs_correlation_id ON system_logs(correlation_id);

-- ===========================================
-- Comments
-- ===========================================

COMMENT ON TABLE audit_logs IS 'Stores audit trail of all data changes across the system';
COMMENT ON TABLE system_logs IS 'Stores system events, errors, and operational logs';
COMMENT ON FUNCTION audit_trigger_func() IS 'Trigger function to automatically log changes to audited tables';
COMMENT ON FUNCTION log_system_event(VARCHAR, TEXT, JSONB, VARCHAR, VARCHAR) IS 'Function to log system events and errors';

-- ===========================================
-- Database Version Tracking
-- ===========================================

-- Table to track database version history
CREATE TABLE db_version (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  installed_by VARCHAR(100) NOT NULL,
  installed_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  execution_time BIGINT,
  success BOOLEAN NOT NULL
);

CREATE INDEX idx_db_version_version ON db_version(version);

COMMENT ON TABLE db_version IS 'Tracks database schema version history';

-- Insert initial version record
INSERT INTO db_version (version, description, installed_by, success)
VALUES ('V1', 'Initial schema setup', current_user, TRUE);