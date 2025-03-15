--
-- V4__inventory_tables.sql
--
-- PostgreSQL migration script that creates the inventory-related tables
-- for the Inventory Management System.
--

-- ===========================================
-- Inventory Type Definitions
-- ===========================================

-- Calculation type enum for categorizing different inventory calculations
CREATE TYPE calculation_type AS ENUM (
  'FOR_LOAN',      -- For loan availability calculation
  'FOR_PLEDGE',    -- For pledge availability calculation
  'SHORT_SELL',    -- Short sell availability calculation
  'LONG_SELL',     -- Long sell availability calculation
  'LOCATE',        -- Locate availability calculation
  'OVERBORROW'     -- Overborrow identification
);

-- Security temperature enum for security borrowing classification
CREATE TYPE security_temperature AS ENUM (
  'HTB',           -- Hard to Borrow
  'GC',            -- General Collateral
  'WARM',          -- Warm (intermediate availability)
  'COLD',          -- Cold (limited availability)
  'RESTRICTED'     -- Restricted (regulatory restrictions)
);

-- ===========================================
-- Inventory Tables
-- ===========================================

-- Table to store inventory availability calculations
CREATE TABLE inventory_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  security_id UUID NOT NULL REFERENCES securities(id),
  counterparty_id UUID REFERENCES counterparties(id),
  aggregation_unit_id UUID REFERENCES aggregation_units(id),
  business_date DATE NOT NULL,
  calculation_type calculation_type NOT NULL,
  gross_quantity NUMERIC(19, 8) NOT NULL DEFAULT 0,
  net_quantity NUMERIC(19, 8) NOT NULL DEFAULT 0,
  available_quantity NUMERIC(19, 8) NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC(19, 8) NOT NULL DEFAULT 0,
  decrement_quantity NUMERIC(19, 8) NOT NULL DEFAULT 0,
  market VARCHAR(50),
  security_temperature security_temperature,
  borrow_rate NUMERIC(10, 6),
  calculation_rule_id VARCHAR(100),
  calculation_rule_version VARCHAR(20),
  is_external_source BOOLEAN NOT NULL DEFAULT FALSE,
  external_source_name VARCHAR(100),
  calculation_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status status_type NOT NULL DEFAULT 'ACTIVE',
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_inventory_availability UNIQUE (security_id, counterparty_id, aggregation_unit_id, business_date, calculation_type)
);

-- Table to store calculation rule definitions
CREATE TABLE inventory_calculation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL,
  market VARCHAR(50),
  priority INTEGER NOT NULL DEFAULT 100,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  status status_type NOT NULL DEFAULT 'ACTIVE',
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_inventory_calculation_rules UNIQUE (rule_id, version)
);

-- Table to store rule conditions
CREATE TABLE inventory_rule_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID NOT NULL REFERENCES inventory_calculation_rules(id),
  condition_id VARCHAR(100) NOT NULL,
  attribute VARCHAR(100) NOT NULL,
  operator VARCHAR(50) NOT NULL,
  value TEXT,
  logical_operator VARCHAR(10),
  sequence INTEGER NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_inventory_rule_conditions UNIQUE (rule_id, condition_id)
);

-- Table to store rule actions
CREATE TABLE inventory_rule_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID NOT NULL REFERENCES inventory_calculation_rules(id),
  action_id VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  parameters JSONB,
  sequence INTEGER NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_inventory_rule_actions UNIQUE (rule_id, action_id)
);

-- Table to store external inventory sources
CREATE TABLE inventory_external_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name VARCHAR(100) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  connection_details JSONB,
  priority INTEGER NOT NULL DEFAULT 100,
  status status_type NOT NULL DEFAULT 'ACTIVE',
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_inventory_external_sources UNIQUE (source_name)
);

-- ===========================================
-- Indexes
-- ===========================================

-- Inventory availability indexes
CREATE INDEX idx_inventory_availability_security_id ON inventory_availability(security_id);
CREATE INDEX idx_inventory_availability_counterparty_id ON inventory_availability(counterparty_id);
CREATE INDEX idx_inventory_availability_aggregation_unit_id ON inventory_availability(aggregation_unit_id);
CREATE INDEX idx_inventory_availability_business_date ON inventory_availability(business_date);
CREATE INDEX idx_inventory_availability_calculation_type ON inventory_availability(calculation_type);
CREATE INDEX idx_inventory_availability_market ON inventory_availability(market);
CREATE INDEX idx_inventory_availability_security_temperature ON inventory_availability(security_temperature);
CREATE INDEX idx_inventory_availability_is_external_source ON inventory_availability(is_external_source);
CREATE INDEX idx_inventory_availability_status ON inventory_availability(status);

-- Inventory calculation rules indexes
CREATE INDEX idx_inventory_calculation_rules_rule_type ON inventory_calculation_rules(rule_type);
CREATE INDEX idx_inventory_calculation_rules_market ON inventory_calculation_rules(market);
CREATE INDEX idx_inventory_calculation_rules_effective_date ON inventory_calculation_rules(effective_date);
CREATE INDEX idx_inventory_calculation_rules_expiry_date ON inventory_calculation_rules(expiry_date);
CREATE INDEX idx_inventory_calculation_rules_status ON inventory_calculation_rules(status);

-- Inventory rule conditions indexes
CREATE INDEX idx_inventory_rule_conditions_rule_id ON inventory_rule_conditions(rule_id);
CREATE INDEX idx_inventory_rule_conditions_attribute ON inventory_rule_conditions(attribute);

-- Inventory rule actions indexes
CREATE INDEX idx_inventory_rule_actions_rule_id ON inventory_rule_actions(rule_id);
CREATE INDEX idx_inventory_rule_actions_action_type ON inventory_rule_actions(action_type);

-- Inventory external sources indexes
CREATE INDEX idx_inventory_external_sources_source_type ON inventory_external_sources(source_type);
CREATE INDEX idx_inventory_external_sources_status ON inventory_external_sources(status);

-- ===========================================
-- Audit Triggers
-- ===========================================

-- Inventory availability audit trigger
CREATE TRIGGER inventory_availability_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON inventory_availability
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Inventory calculation rules audit trigger
CREATE TRIGGER inventory_calculation_rules_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON inventory_calculation_rules
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Inventory rule conditions audit trigger
CREATE TRIGGER inventory_rule_conditions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON inventory_rule_conditions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Inventory rule actions audit trigger
CREATE TRIGGER inventory_rule_actions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON inventory_rule_actions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Inventory external sources audit trigger
CREATE TRIGGER inventory_external_sources_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON inventory_external_sources
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ===========================================
-- Table Comments
-- ===========================================

COMMENT ON TABLE inventory_availability IS 'Stores calculated inventory availability for different calculation types (for loan, for pledge, short sell, locate, etc.)';
COMMENT ON TABLE inventory_calculation_rules IS 'Stores calculation rule definitions for inventory calculations';
COMMENT ON TABLE inventory_rule_conditions IS 'Stores conditions for inventory calculation rules';
COMMENT ON TABLE inventory_rule_actions IS 'Stores actions for inventory calculation rules';
COMMENT ON TABLE inventory_external_sources IS 'Stores external inventory sources for integration with external systems';

-- ===========================================
-- Functions and Triggers
-- ===========================================

-- Function to update inventory availability based on position changes
CREATE OR REPLACE FUNCTION update_inventory_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called when positions are updated
  -- It will trigger recalculation of affected inventory availability
  
  -- For demonstration purposes, we're just logging the change
  -- In a real implementation, this would queue a calculation job
  PERFORM log_system_event(
    'INFO',
    'Position change detected, inventory recalculation required',
    jsonb_build_object(
      'security_id', NEW.security_id,
      'book_id', NEW.book_id,
      'business_date', NEW.business_date
    ),
    'update_inventory_availability',
    NULL
  );
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update inventory availability when positions change
CREATE TRIGGER update_inventory_availability_trigger
  AFTER INSERT OR UPDATE OF contractual_qty, settled_qty, is_hypothecatable, is_reserved ON positions
  FOR EACH ROW EXECUTE FUNCTION update_inventory_availability();

-- Function to apply market-specific rules to inventory calculations
CREATE OR REPLACE FUNCTION apply_market_specific_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- Apply market-specific rules to inventory calculations
  -- This is a placeholder for the actual implementation
  
  -- Taiwan-specific rules
  IF NEW.market = 'TW' AND NEW.calculation_type = 'FOR_LOAN' THEN
    -- Exclude borrowed shares from for-loan availability
    -- This is a simplified example
    PERFORM log_system_event(
      'INFO',
      'Applied Taiwan-specific rules for FOR_LOAN calculation',
      jsonb_build_object(
        'security_id', NEW.security_id,
        'market', NEW.market,
        'calculation_type', NEW.calculation_type
      ),
      'apply_market_specific_rules',
      NULL
    );
  END IF;
  
  -- Japan-specific rules
  IF NEW.market = 'JP' AND (NEW.calculation_type = 'FOR_LOAN' OR NEW.calculation_type = 'FOR_PLEDGE') THEN
    -- Apply settlement cut-off rules for SLAB activity
    -- This is a simplified example
    PERFORM log_system_event(
      'INFO',
      'Applied Japan-specific rules for inventory calculation',
      jsonb_build_object(
        'security_id', NEW.security_id,
        'market', NEW.market,
        'calculation_type', NEW.calculation_type
      ),
      'apply_market_specific_rules',
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to apply market-specific rules to inventory calculations
CREATE TRIGGER apply_market_specific_rules_trigger
  BEFORE INSERT OR UPDATE ON inventory_availability
  FOR EACH ROW EXECUTE FUNCTION apply_market_specific_rules();

-- ===========================================
-- Composite Indexes for optimized queries
-- ===========================================

-- Create composite indexes for common query patterns
CREATE INDEX idx_inventory_availability_composite ON inventory_availability(security_id, business_date, calculation_type);
CREATE INDEX idx_inventory_calculation_rules_composite ON inventory_calculation_rules(rule_type, market, status, effective_date, expiry_date);

-- ===========================================
-- Update Version
-- ===========================================

INSERT INTO db_version (version, description, installed_by, success)
VALUES ('V4', 'Inventory tables', current_user, TRUE);