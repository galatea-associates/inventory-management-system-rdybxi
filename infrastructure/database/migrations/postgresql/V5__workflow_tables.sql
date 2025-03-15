--
-- V5__workflow_tables.sql
--
-- PostgreSQL migration script that creates the workflow-related tables
-- for the Inventory Management System.
--

-- ===========================================
-- Workflow Type Definitions
-- ===========================================

-- Locate status enum for tracking locate request status
CREATE TYPE locate_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- Locate type enum for different types of locate requests
CREATE TYPE locate_type AS ENUM ('SHORT_SELL', 'SWAP');

-- Order type enum for different types of orders
CREATE TYPE order_type AS ENUM ('LONG_SELL', 'SHORT_SELL', 'BUY');

-- Order validation status enum for tracking order validation status
CREATE TYPE order_validation_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Workflow rule type enum for different types of workflow rules
CREATE TYPE workflow_rule_type AS ENUM ('LOCATE_APPROVAL', 'SHORT_SELL_APPROVAL');

-- ===========================================
-- Workflow Tables
-- ===========================================

-- Table to store locate requests
CREATE TABLE locate_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id VARCHAR(100) NOT NULL,
  security_id UUID NOT NULL REFERENCES securities(id),
  requestor_id UUID NOT NULL REFERENCES counterparties(id),
  client_id UUID NOT NULL REFERENCES counterparties(id),
  aggregation_unit_id UUID REFERENCES aggregation_units(id),
  locate_type locate_type NOT NULL,
  requested_quantity NUMERIC(19, 8) NOT NULL,
  request_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status locate_status NOT NULL DEFAULT 'PENDING',
  swap_cash_indicator VARCHAR(10),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_locate_requests_request_id UNIQUE (request_id)
);

-- Table to store approved locates
CREATE TABLE locate_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id VARCHAR(100) NOT NULL,
  request_id UUID NOT NULL REFERENCES locate_requests(id),
  approved_quantity NUMERIC(19, 8) NOT NULL,
  decrement_quantity NUMERIC(19, 8) NOT NULL,
  approval_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_by VARCHAR(50) NOT NULL,
  expiry_date DATE NOT NULL,
  is_auto_approved BOOLEAN NOT NULL DEFAULT FALSE,
  security_temperature security_temperature NOT NULL,
  borrow_rate NUMERIC(10, 6),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_locate_approvals_approval_id UNIQUE (approval_id),
  CONSTRAINT uk_locate_approvals_request_id UNIQUE (request_id)
);

-- Table to store rejected locates
CREATE TABLE locate_rejections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rejection_id VARCHAR(100) NOT NULL,
  request_id UUID NOT NULL REFERENCES locate_requests(id),
  rejection_reason VARCHAR(255) NOT NULL,
  rejection_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rejected_by VARCHAR(50) NOT NULL,
  is_auto_rejected BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_locate_rejections_rejection_id UNIQUE (rejection_id),
  CONSTRAINT uk_locate_rejections_request_id UNIQUE (request_id)
);

-- Table to store order validations
CREATE TABLE order_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  validation_id VARCHAR(100) NOT NULL,
  order_id VARCHAR(100) NOT NULL,
  order_type order_type NOT NULL,
  security_id UUID NOT NULL REFERENCES securities(id),
  client_id UUID NOT NULL REFERENCES counterparties(id),
  aggregation_unit_id UUID NOT NULL REFERENCES aggregation_units(id),
  quantity NUMERIC(19, 8) NOT NULL,
  validation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status order_validation_status NOT NULL DEFAULT 'PENDING',
  rejection_reason VARCHAR(255),
  processing_time BIGINT,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_order_validations_validation_id UNIQUE (validation_id),
  CONSTRAINT uk_order_validations_order_id UNIQUE (order_id)
);

-- Table to store workflow rules
CREATE TABLE workflow_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type workflow_rule_type NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  status status_type NOT NULL DEFAULT 'ACTIVE',
  market VARCHAR(50) NOT NULL DEFAULT 'GLOBAL',
  approved_by VARCHAR(50),
  approval_date DATE,
  condition_expression TEXT,
  action_expression TEXT,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_workflow_rules_rule_id_version UNIQUE (rule_id, version)
);

-- Table to store workflow rule conditions
CREATE TABLE workflow_rule_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID NOT NULL REFERENCES workflow_rules(id),
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
  CONSTRAINT uk_workflow_rule_conditions UNIQUE (rule_id, condition_id)
);

-- Table to store workflow rule actions
CREATE TABLE workflow_rule_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID NOT NULL REFERENCES workflow_rules(id),
  action_id VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  parameters JSONB,
  sequence INTEGER NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_workflow_rule_actions UNIQUE (rule_id, action_id)
);

-- ===========================================
-- Indexes
-- ===========================================

-- Locate requests indexes
CREATE INDEX idx_locate_requests_security_id ON locate_requests(security_id);
CREATE INDEX idx_locate_requests_requestor_id ON locate_requests(requestor_id);
CREATE INDEX idx_locate_requests_client_id ON locate_requests(client_id);
CREATE INDEX idx_locate_requests_aggregation_unit_id ON locate_requests(aggregation_unit_id);
CREATE INDEX idx_locate_requests_status ON locate_requests(status);
CREATE INDEX idx_locate_requests_request_timestamp ON locate_requests(request_timestamp);

-- Locate approvals indexes
CREATE INDEX idx_locate_approvals_request_id ON locate_approvals(request_id);
CREATE INDEX idx_locate_approvals_expiry_date ON locate_approvals(expiry_date);
CREATE INDEX idx_locate_approvals_security_temperature ON locate_approvals(security_temperature);
CREATE INDEX idx_locate_approvals_is_auto_approved ON locate_approvals(is_auto_approved);

-- Locate rejections indexes
CREATE INDEX idx_locate_rejections_request_id ON locate_rejections(request_id);
CREATE INDEX idx_locate_rejections_rejection_reason ON locate_rejections(rejection_reason);
CREATE INDEX idx_locate_rejections_is_auto_rejected ON locate_rejections(is_auto_rejected);

-- Order validations indexes
CREATE INDEX idx_order_validations_security_id ON order_validations(security_id);
CREATE INDEX idx_order_validations_client_id ON order_validations(client_id);
CREATE INDEX idx_order_validations_aggregation_unit_id ON order_validations(aggregation_unit_id);
CREATE INDEX idx_order_validations_order_type ON order_validations(order_type);
CREATE INDEX idx_order_validations_status ON order_validations(status);
CREATE INDEX idx_order_validations_validation_timestamp ON order_validations(validation_timestamp);

-- Workflow rules indexes
CREATE INDEX idx_workflow_rules_rule_type ON workflow_rules(rule_type);
CREATE INDEX idx_workflow_rules_market ON workflow_rules(market);
CREATE INDEX idx_workflow_rules_status ON workflow_rules(status);
CREATE INDEX idx_workflow_rules_effective_date ON workflow_rules(effective_date);
CREATE INDEX idx_workflow_rules_expiry_date ON workflow_rules(expiry_date);
CREATE INDEX idx_workflow_rules_priority ON workflow_rules(priority);

-- Workflow rule conditions indexes
CREATE INDEX idx_workflow_rule_conditions_rule_id ON workflow_rule_conditions(rule_id);
CREATE INDEX idx_workflow_rule_conditions_attribute ON workflow_rule_conditions(attribute);

-- Workflow rule actions indexes
CREATE INDEX idx_workflow_rule_actions_rule_id ON workflow_rule_actions(rule_id);
CREATE INDEX idx_workflow_rule_actions_action_type ON workflow_rule_actions(action_type);

-- ===========================================
-- Audit Triggers
-- ===========================================

-- Create audit triggers for all tables
CREATE TRIGGER locate_requests_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON locate_requests
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER locate_approvals_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON locate_approvals
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER locate_rejections_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON locate_rejections
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER order_validations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_validations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER workflow_rules_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON workflow_rules
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER workflow_rule_conditions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON workflow_rule_conditions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER workflow_rule_actions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON workflow_rule_actions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ===========================================
-- Table Comments
-- ===========================================

COMMENT ON TABLE locate_requests IS 'Stores locate requests submitted by clients or traders for borrowing securities';
COMMENT ON TABLE locate_approvals IS 'Stores approved locate requests with approval details';
COMMENT ON TABLE locate_rejections IS 'Stores rejected locate requests with rejection reasons';
COMMENT ON TABLE order_validations IS 'Stores order validations for short sell and long sell orders';
COMMENT ON TABLE workflow_rules IS 'Stores workflow rules for locate approval and short sell validation';
COMMENT ON TABLE workflow_rule_conditions IS 'Stores conditions for workflow rules';
COMMENT ON TABLE workflow_rule_actions IS 'Stores actions for workflow rules';

-- ===========================================
-- Functions and Triggers
-- ===========================================

-- Function to update inventory when locate is approved
CREATE OR REPLACE FUNCTION update_inventory_on_locate_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called when a locate is approved
  -- It will update the inventory availability to reflect the decrement quantity
  
  -- Get the security_id, client_id, and aggregation_unit_id from the locate request
  DECLARE
    v_security_id UUID;
    v_client_id UUID;
    v_aggregation_unit_id UUID;
  BEGIN
    SELECT lr.security_id, lr.client_id, lr.aggregation_unit_id
    INTO v_security_id, v_client_id, v_aggregation_unit_id
    FROM locate_requests lr
    WHERE lr.id = NEW.request_id;
    
    -- Update inventory availability
    -- This is a simplified example - in a real implementation, this would be more complex
    UPDATE inventory_availability
    SET reserved_quantity = reserved_quantity + NEW.decrement_quantity,
        available_quantity = available_quantity - NEW.decrement_quantity,
        updated_by = NEW.created_by,
        updated_at = CURRENT_TIMESTAMP,
        version = version + 1
    WHERE security_id = v_security_id
      AND counterparty_id = v_client_id
      AND (aggregation_unit_id = v_aggregation_unit_id OR (aggregation_unit_id IS NULL AND v_aggregation_unit_id IS NULL))
      AND calculation_type = 'LOCATE';
    
    -- Log the inventory update
    PERFORM log_system_event(
      'INFO',
      'Inventory updated due to locate approval',
      jsonb_build_object(
        'locate_approval_id', NEW.id,
        'security_id', v_security_id,
        'client_id', v_client_id,
        'aggregation_unit_id', v_aggregation_unit_id,
        'decrement_quantity', NEW.decrement_quantity
      ),
      'update_inventory_on_locate_approval',
      NULL
    );
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update inventory when locate is approved
CREATE TRIGGER update_inventory_on_locate_approval_trigger
  AFTER INSERT ON locate_approvals
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_locate_approval();

-- Function to validate order against limits
CREATE OR REPLACE FUNCTION validate_order_against_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called when an order validation is created
  -- It will check client and aggregation unit limits and update the validation status
  
  -- This is a placeholder for the actual implementation
  -- In a real implementation, this would query client and aggregation unit limits
  -- and perform the validation logic
  
  -- For demonstration purposes, we're just logging the validation
  PERFORM log_system_event(
    'INFO',
    'Order validation triggered',
    jsonb_build_object(
      'order_id', NEW.order_id,
      'order_type', NEW.order_type,
      'security_id', NEW.security_id,
      'client_id', NEW.client_id,
      'aggregation_unit_id', NEW.aggregation_unit_id,
      'quantity', NEW.quantity
    ),
    'validate_order_against_limits',
    NULL
  );
  
  -- Set processing time (would be calculated in real implementation)
  NEW.processing_time = 50; -- 50ms example
  
  -- For demonstration, approve all orders
  -- In a real implementation, this would check actual limits
  NEW.status = 'APPROVED';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate order against limits
CREATE TRIGGER validate_order_against_limits_trigger
  BEFORE INSERT ON order_validations
  FOR EACH ROW EXECUTE FUNCTION validate_order_against_limits();

-- Function to evaluate workflow rules
CREATE OR REPLACE FUNCTION evaluate_workflow_rules(p_rule_type workflow_rule_type, p_context JSONB)
RETURNS TABLE(rule_id UUID, action_result JSONB) AS $$
BEGIN
  -- This function evaluates applicable workflow rules for a given rule type and context
  -- It returns the rule_id and action result for rules whose conditions are satisfied
  
  -- This is a placeholder for the actual implementation
  -- In a real implementation, this would evaluate rule conditions and execute actions
  
  -- Log the rule evaluation request
  PERFORM log_system_event(
    'INFO',
    'Workflow rule evaluation requested',
    jsonb_build_object(
      'rule_type', p_rule_type,
      'context', p_context
    ),
    'evaluate_workflow_rules',
    NULL
  );
  
  -- Return empty result set for now
  -- In a real implementation, this would return actual evaluation results
  RETURN QUERY
  SELECT id, '{}'::JSONB
  FROM workflow_rules
  WHERE rule_type = p_rule_type
    AND status = 'ACTIVE'
    AND effective_date <= CURRENT_DATE
    AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
  LIMIT 0;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- Composite Indexes for Common Query Patterns
-- ===========================================

-- Create composite index for locate requests filtering
CREATE INDEX idx_locate_requests_composite ON locate_requests(client_id, security_id, status);

-- Create composite index for order validations filtering
CREATE INDEX idx_order_validations_composite ON order_validations(client_id, security_id, order_type, status);

-- Create composite index for workflow rules filtering
CREATE INDEX idx_workflow_rules_composite ON workflow_rules(rule_type, market, status, priority);

-- ===========================================
-- Update Version
-- ===========================================

INSERT INTO db_version (version, description, installed_by, success)
VALUES ('V5', 'Workflow tables', current_user, TRUE);