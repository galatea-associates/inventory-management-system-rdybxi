--
-- V3__position_tables.sql
--
-- PostgreSQL migration script that creates the position-related tables
-- for the Inventory Management System.
--

-- ===========================================
-- Position Type Definitions
-- ===========================================

-- Position type enum for categorizing positions
CREATE TYPE position_type AS ENUM ('TRADING', 'FINANCING', 'CLIENT', 'PROPRIETARY', 'MARKET_MAKING', 'HEDGING');

-- Calculation status enum for tracking calculation states
CREATE TYPE calculation_status AS ENUM ('PENDING', 'VALID', 'INVALID', 'ERROR', 'STALE');

-- ===========================================
-- Position Tables
-- ===========================================

-- Core positions table with settlement ladder information
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id VARCHAR(50) NOT NULL,
  security_id UUID NOT NULL REFERENCES securities(id),
  counterparty_id UUID REFERENCES counterparties(id),
  aggregation_unit_id UUID REFERENCES aggregation_units(id),
  business_date DATE NOT NULL,
  position_type position_type NOT NULL,
  is_hypothecatable BOOLEAN NOT NULL DEFAULT FALSE,
  is_reserved BOOLEAN NOT NULL DEFAULT FALSE,
  contractual_qty NUMERIC(19, 8) NOT NULL DEFAULT 0,
  settled_qty NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd0_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd0_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd1_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd1_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd2_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd2_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd3_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd3_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd4_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd4_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  status status_type NOT NULL DEFAULT 'ACTIVE',
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_positions UNIQUE (book_id, security_id, business_date)
);

-- Position history table for tracking historical position changes
CREATE TABLE position_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID NOT NULL REFERENCES positions(id),
  book_id VARCHAR(50) NOT NULL,
  security_id UUID NOT NULL REFERENCES securities(id),
  counterparty_id UUID REFERENCES counterparties(id),
  aggregation_unit_id UUID REFERENCES aggregation_units(id),
  business_date DATE NOT NULL,
  position_type position_type NOT NULL,
  is_hypothecatable BOOLEAN NOT NULL DEFAULT FALSE,
  is_reserved BOOLEAN NOT NULL DEFAULT FALSE,
  contractual_qty NUMERIC(19, 8) NOT NULL DEFAULT 0,
  settled_qty NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd0_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd0_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd1_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd1_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd2_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd2_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd3_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd3_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd4_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd4_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  snapshot_reason VARCHAR(50) NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Calculated positions table for storing calculation results
CREATE TABLE calculated_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID NOT NULL REFERENCES positions(id),
  book_id VARCHAR(50) NOT NULL,
  security_id UUID NOT NULL REFERENCES securities(id),
  business_date DATE NOT NULL,
  calculation_date DATE NOT NULL,
  calculation_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  calculation_status calculation_status NOT NULL DEFAULT 'PENDING',
  contractual_qty NUMERIC(19, 8) NOT NULL DEFAULT 0,
  settled_qty NUMERIC(19, 8) NOT NULL DEFAULT 0,
  projected_settled_qty NUMERIC(19, 8) NOT NULL DEFAULT 0,
  projected_position NUMERIC(19, 8) NOT NULL DEFAULT 0,
  net_settlement_today NUMERIC(19, 8) NOT NULL DEFAULT 0,
  net_settlement NUMERIC(19, 8) NOT NULL DEFAULT 0,
  total_deliveries NUMERIC(19, 8) NOT NULL DEFAULT 0,
  total_receipts NUMERIC(19, 8) NOT NULL DEFAULT 0,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_calculated_positions UNIQUE (position_id, calculation_date)
);

-- Settlement ladders table for detailed settlement projections
CREATE TABLE settlement_ladders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id VARCHAR(50) NOT NULL,
  security_id UUID NOT NULL REFERENCES securities(id),
  business_date DATE NOT NULL,
  calculation_date DATE NOT NULL,
  calculation_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  calculation_status calculation_status NOT NULL DEFAULT 'PENDING',
  sd0_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd0_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd1_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd1_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd2_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd2_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd3_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd3_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd4_deliver NUMERIC(19, 8) NOT NULL DEFAULT 0,
  sd4_receipt NUMERIC(19, 8) NOT NULL DEFAULT 0,
  net_settlement NUMERIC(19, 8) NOT NULL DEFAULT 0,
  deliveries JSONB,
  receipts JSONB,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_settlement_ladders UNIQUE (book_id, security_id, business_date)
);

-- Depot positions table for custodian positions
CREATE TABLE depot_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  depot_id VARCHAR(50) NOT NULL,
  security_id UUID NOT NULL REFERENCES securities(id),
  business_date DATE NOT NULL,
  settled_qty NUMERIC(19, 8) NOT NULL DEFAULT 0,
  custodian VARCHAR(100) NOT NULL,
  status status_type NOT NULL DEFAULT 'ACTIVE',
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_depot_positions UNIQUE (depot_id, security_id, business_date)
);

-- ===========================================
-- Indexes
-- ===========================================

-- Positions table indexes
CREATE INDEX idx_positions_book_id ON positions(book_id);
CREATE INDEX idx_positions_security_id ON positions(security_id);
CREATE INDEX idx_positions_counterparty_id ON positions(counterparty_id);
CREATE INDEX idx_positions_aggregation_unit_id ON positions(aggregation_unit_id);
CREATE INDEX idx_positions_business_date ON positions(business_date);
CREATE INDEX idx_positions_position_type ON positions(position_type);
CREATE INDEX idx_positions_is_hypothecatable ON positions(is_hypothecatable);
CREATE INDEX idx_positions_is_reserved ON positions(is_reserved);
CREATE INDEX idx_positions_status ON positions(status);

-- Position history table indexes
CREATE INDEX idx_position_history_position_id ON position_history(position_id);
CREATE INDEX idx_position_history_book_id ON position_history(book_id);
CREATE INDEX idx_position_history_security_id ON position_history(security_id);
CREATE INDEX idx_position_history_business_date ON position_history(business_date);
CREATE INDEX idx_position_history_snapshot_time ON position_history(snapshot_time);

-- Calculated positions table indexes
CREATE INDEX idx_calculated_positions_position_id ON calculated_positions(position_id);
CREATE INDEX idx_calculated_positions_book_id ON calculated_positions(book_id);
CREATE INDEX idx_calculated_positions_security_id ON calculated_positions(security_id);
CREATE INDEX idx_calculated_positions_business_date ON calculated_positions(business_date);
CREATE INDEX idx_calculated_positions_calculation_date ON calculated_positions(calculation_date);
CREATE INDEX idx_calculated_positions_calculation_status ON calculated_positions(calculation_status);

-- Settlement ladders table indexes
CREATE INDEX idx_settlement_ladders_book_id ON settlement_ladders(book_id);
CREATE INDEX idx_settlement_ladders_security_id ON settlement_ladders(security_id);
CREATE INDEX idx_settlement_ladders_business_date ON settlement_ladders(business_date);
CREATE INDEX idx_settlement_ladders_calculation_date ON settlement_ladders(calculation_date);
CREATE INDEX idx_settlement_ladders_calculation_status ON settlement_ladders(calculation_status);

-- Depot positions table indexes
CREATE INDEX idx_depot_positions_depot_id ON depot_positions(depot_id);
CREATE INDEX idx_depot_positions_security_id ON depot_positions(security_id);
CREATE INDEX idx_depot_positions_business_date ON depot_positions(business_date);
CREATE INDEX idx_depot_positions_custodian ON depot_positions(custodian);
CREATE INDEX idx_depot_positions_status ON depot_positions(status);

-- ===========================================
-- Audit Triggers
-- ===========================================

-- Positions audit trigger
CREATE TRIGGER positions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON positions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Calculated positions audit trigger
CREATE TRIGGER calculated_positions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON calculated_positions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Settlement ladders audit trigger
CREATE TRIGGER settlement_ladders_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON settlement_ladders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Depot positions audit trigger
CREATE TRIGGER depot_positions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON depot_positions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ===========================================
-- Table Comments
-- ===========================================

COMMENT ON TABLE positions IS 'Stores current positions with settlement ladder information for all securities across all books';
COMMENT ON TABLE position_history IS 'Stores historical snapshots of positions for audit and analysis purposes';
COMMENT ON TABLE calculated_positions IS 'Stores calculated position results including projections and net settlements';
COMMENT ON TABLE settlement_ladders IS 'Stores detailed settlement ladder projections for position analysis';
COMMENT ON TABLE depot_positions IS 'Stores positions held at custodians for regulatory requirements';

-- ===========================================
-- Functions and Triggers
-- ===========================================

-- Function to update settlement ladder when position changes
CREATE OR REPLACE FUNCTION update_settlement_ladder()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert into settlement_ladders table
  INSERT INTO settlement_ladders (
    book_id,
    security_id,
    business_date,
    calculation_date,
    calculation_status,
    sd0_deliver,
    sd0_receipt,
    sd1_deliver,
    sd1_receipt,
    sd2_deliver,
    sd2_receipt,
    sd3_deliver,
    sd3_receipt,
    sd4_deliver,
    sd4_receipt,
    net_settlement,
    created_by,
    updated_by
  ) VALUES (
    NEW.book_id,
    NEW.security_id,
    NEW.business_date,
    NEW.business_date,
    'VALID',
    NEW.sd0_deliver,
    NEW.sd0_receipt,
    NEW.sd1_deliver,
    NEW.sd1_receipt,
    NEW.sd2_deliver,
    NEW.sd2_receipt,
    NEW.sd3_deliver,
    NEW.sd3_receipt,
    NEW.sd4_deliver,
    NEW.sd4_receipt,
    (NEW.sd0_receipt - NEW.sd0_deliver) +
    (NEW.sd1_receipt - NEW.sd1_deliver) +
    (NEW.sd2_receipt - NEW.sd2_deliver) +
    (NEW.sd3_receipt - NEW.sd3_deliver) +
    (NEW.sd4_receipt - NEW.sd4_deliver),
    NEW.created_by,
    NEW.updated_by
  )
  ON CONFLICT (book_id, security_id, business_date)
  DO UPDATE SET
    calculation_date = EXCLUDED.calculation_date,
    calculation_time = CURRENT_TIMESTAMP,
    calculation_status = EXCLUDED.calculation_status,
    sd0_deliver = EXCLUDED.sd0_deliver,
    sd0_receipt = EXCLUDED.sd0_receipt,
    sd1_deliver = EXCLUDED.sd1_deliver,
    sd1_receipt = EXCLUDED.sd1_receipt,
    sd2_deliver = EXCLUDED.sd2_deliver,
    sd2_receipt = EXCLUDED.sd2_receipt,
    sd3_deliver = EXCLUDED.sd3_deliver,
    sd3_receipt = EXCLUDED.sd3_receipt,
    sd4_deliver = EXCLUDED.sd4_deliver,
    sd4_receipt = EXCLUDED.sd4_receipt,
    net_settlement = EXCLUDED.net_settlement,
    updated_by = EXCLUDED.updated_by,
    updated_at = CURRENT_TIMESTAMP,
    version = settlement_ladders.version + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update settlement ladder when position changes
CREATE TRIGGER update_settlement_ladder_trigger
  AFTER INSERT OR UPDATE OF sd0_deliver, sd0_receipt, sd1_deliver, sd1_receipt, sd2_deliver, sd2_receipt, sd3_deliver, sd3_receipt, sd4_deliver, sd4_receipt ON positions
  FOR EACH ROW EXECUTE FUNCTION update_settlement_ladder();

-- Function to calculate projected position
CREATE OR REPLACE FUNCTION calculate_projected_position()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert into calculated_positions table
  INSERT INTO calculated_positions (
    position_id,
    book_id,
    security_id,
    business_date,
    calculation_date,
    calculation_status,
    contractual_qty,
    settled_qty,
    projected_settled_qty,
    projected_position,
    net_settlement_today,
    net_settlement,
    total_deliveries,
    total_receipts,
    created_by,
    updated_by
  ) VALUES (
    NEW.id,
    NEW.book_id,
    NEW.security_id,
    NEW.business_date,
    NEW.business_date,
    'VALID',
    NEW.contractual_qty,
    NEW.settled_qty,
    NEW.settled_qty + (NEW.sd0_receipt - NEW.sd0_deliver),
    NEW.settled_qty + 
    (NEW.sd0_receipt - NEW.sd0_deliver) +
    (NEW.sd1_receipt - NEW.sd1_deliver) +
    (NEW.sd2_receipt - NEW.sd2_deliver) +
    (NEW.sd3_receipt - NEW.sd3_deliver) +
    (NEW.sd4_receipt - NEW.sd4_deliver),
    (NEW.sd0_receipt - NEW.sd0_deliver),
    (NEW.sd0_receipt - NEW.sd0_deliver) +
    (NEW.sd1_receipt - NEW.sd1_deliver) +
    (NEW.sd2_receipt - NEW.sd2_deliver) +
    (NEW.sd3_receipt - NEW.sd3_deliver) +
    (NEW.sd4_receipt - NEW.sd4_deliver),
    NEW.sd0_deliver + NEW.sd1_deliver + NEW.sd2_deliver + NEW.sd3_deliver + NEW.sd4_deliver,
    NEW.sd0_receipt + NEW.sd1_receipt + NEW.sd2_receipt + NEW.sd3_receipt + NEW.sd4_receipt,
    NEW.created_by,
    NEW.updated_by
  )
  ON CONFLICT (position_id, calculation_date)
  DO UPDATE SET
    contractual_qty = EXCLUDED.contractual_qty,
    settled_qty = EXCLUDED.settled_qty,
    projected_settled_qty = EXCLUDED.projected_settled_qty,
    projected_position = EXCLUDED.projected_position,
    net_settlement_today = EXCLUDED.net_settlement_today,
    net_settlement = EXCLUDED.net_settlement,
    total_deliveries = EXCLUDED.total_deliveries,
    total_receipts = EXCLUDED.total_receipts,
    calculation_time = CURRENT_TIMESTAMP,
    updated_by = EXCLUDED.updated_by,
    updated_at = CURRENT_TIMESTAMP,
    version = calculated_positions.version + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate projected position when position changes
CREATE TRIGGER calculate_projected_position_trigger
  AFTER INSERT OR UPDATE OF contractual_qty, settled_qty, sd0_deliver, sd0_receipt, sd1_deliver, sd1_receipt, sd2_deliver, sd2_receipt, sd3_deliver, sd3_receipt, sd4_deliver, sd4_receipt ON positions
  FOR EACH ROW EXECUTE FUNCTION calculate_projected_position();

-- Function to archive position history
CREATE OR REPLACE FUNCTION archive_position_history()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO position_history (
      position_id,
      book_id,
      security_id,
      counterparty_id,
      aggregation_unit_id,
      business_date,
      position_type,
      is_hypothecatable,
      is_reserved,
      contractual_qty,
      settled_qty,
      sd0_deliver,
      sd0_receipt,
      sd1_deliver,
      sd1_receipt,
      sd2_deliver,
      sd2_receipt,
      sd3_deliver,
      sd3_receipt,
      sd4_deliver,
      sd4_receipt,
      snapshot_reason,
      created_by
    ) VALUES (
      OLD.id,
      OLD.book_id,
      OLD.security_id,
      OLD.counterparty_id,
      OLD.aggregation_unit_id,
      OLD.business_date,
      OLD.position_type,
      OLD.is_hypothecatable,
      OLD.is_reserved,
      OLD.contractual_qty,
      OLD.settled_qty,
      OLD.sd0_deliver,
      OLD.sd0_receipt,
      OLD.sd1_deliver,
      OLD.sd1_receipt,
      OLD.sd2_deliver,
      OLD.sd2_receipt,
      OLD.sd3_deliver,
      OLD.sd3_receipt,
      OLD.sd4_deliver,
      OLD.sd4_receipt,
      'UPDATE',
      NEW.updated_by
    );
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically archive position history
CREATE TRIGGER archive_position_history_trigger
  AFTER UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION archive_position_history();

-- Create composite indexes for optimized filtering
CREATE INDEX idx_positions_composite ON positions(security_id, business_date, position_type);
CREATE INDEX idx_settlement_ladders_composite ON settlement_ladders(security_id, business_date, calculation_status);
CREATE INDEX idx_calculated_positions_composite ON calculated_positions(security_id, business_date, calculation_status);
CREATE INDEX idx_depot_positions_composite ON depot_positions(security_id, business_date, custodian);

-- ===========================================
-- Update Version
-- ===========================================

INSERT INTO db_version (version, description, installed_by, success)
VALUES ('V3', 'Position tables', current_user, TRUE);