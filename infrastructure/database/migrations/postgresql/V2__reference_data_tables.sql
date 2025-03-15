--
-- V2__reference_data_tables.sql
--
-- PostgreSQL migration script that creates the reference data tables
-- for the Inventory Management System.
--

-- ===========================================
-- Securities Tables
-- ===========================================

-- Core securities table
CREATE TABLE securities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  internal_id VARCHAR(100) UNIQUE NOT NULL,
  security_type VARCHAR(50) NOT NULL,
  issuer VARCHAR(255),
  description TEXT,
  currency VARCHAR(3),
  issue_date DATE,
  maturity_date DATE,
  market VARCHAR(50),
  exchange VARCHAR(50),
  status status_type NOT NULL DEFAULT 'ACTIVE',
  is_basket_product BOOLEAN NOT NULL DEFAULT FALSE,
  basket_type VARCHAR(50),
  primary_identifier_type VARCHAR(50),
  primary_identifier_value VARCHAR(100),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1
);

-- Security identifiers table for mapping external IDs
CREATE TABLE security_identifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  security_id UUID NOT NULL REFERENCES securities(id),
  identifier_type VARCHAR(50) NOT NULL,
  identifier_value VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_security_identifier UNIQUE (security_id, identifier_type, source)
);

-- ===========================================
-- Counterparty Tables
-- ===========================================

-- Core counterparties table
CREATE TABLE counterparties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counterparty_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50),
  status status_type NOT NULL DEFAULT 'ACTIVE',
  kyc_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  risk_rating VARCHAR(50),
  country VARCHAR(2),
  region VARCHAR(50),
  primary_identifier_type VARCHAR(50),
  primary_identifier_value VARCHAR(100),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1
);

-- Counterparty identifiers table for mapping external IDs
CREATE TABLE counterparty_identifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counterparty_id UUID NOT NULL REFERENCES counterparties(id),
  identifier_type VARCHAR(50) NOT NULL,
  identifier_value VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_counterparty_identifier UNIQUE (counterparty_id, identifier_type, source)
);

-- ===========================================
-- Aggregation Units Tables
-- ===========================================

-- Aggregation units table
CREATE TABLE aggregation_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregation_unit_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  market VARCHAR(50) NOT NULL,
  region VARCHAR(50),
  status status_type NOT NULL DEFAULT 'ACTIVE',
  officer_id VARCHAR(100),
  regulatory_id VARCHAR(100),
  parent_entity_id VARCHAR(100),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1
);

-- Aggregation unit book mappings
CREATE TABLE aggregation_unit_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregation_unit_id UUID NOT NULL REFERENCES aggregation_units(id),
  book_id VARCHAR(50) NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_aggregation_unit_book UNIQUE (aggregation_unit_id, book_id)
);

-- ===========================================
-- Index Composition Tables
-- ===========================================

-- Index composition table for basket products
CREATE TABLE index_compositions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  index_security_id UUID NOT NULL REFERENCES securities(id),
  constituent_security_id UUID NOT NULL REFERENCES securities(id),
  weight NUMERIC(19, 8) NOT NULL,
  composition_type VARCHAR(50) NOT NULL,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  source VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_index_composition UNIQUE (index_security_id, constituent_security_id, effective_date)
);

-- ===========================================
-- Indexes
-- ===========================================

-- Securities indexes
CREATE INDEX idx_securities_security_type ON securities(security_type);
CREATE INDEX idx_securities_issuer ON securities(issuer);
CREATE INDEX idx_securities_market ON securities(market);
CREATE INDEX idx_securities_status ON securities(status);
CREATE INDEX idx_securities_is_basket_product ON securities(is_basket_product);

-- Security identifiers indexes
CREATE INDEX idx_security_identifiers_security_id ON security_identifiers(security_id);
CREATE INDEX idx_security_identifiers_identifier_type ON security_identifiers(identifier_type);
CREATE INDEX idx_security_identifiers_identifier_value ON security_identifiers(identifier_value);
CREATE INDEX idx_security_identifiers_source ON security_identifiers(source);
CREATE INDEX idx_security_identifiers_is_primary ON security_identifiers(is_primary);
CREATE INDEX idx_security_identifiers_composite ON security_identifiers(identifier_type, identifier_value, source);

-- Counterparties indexes
CREATE INDEX idx_counterparties_type ON counterparties(type);
CREATE INDEX idx_counterparties_status ON counterparties(status);
CREATE INDEX idx_counterparties_kyc_status ON counterparties(kyc_status);
CREATE INDEX idx_counterparties_country ON counterparties(country);
CREATE INDEX idx_counterparties_region ON counterparties(region);

-- Counterparty identifiers indexes
CREATE INDEX idx_counterparty_identifiers_counterparty_id ON counterparty_identifiers(counterparty_id);
CREATE INDEX idx_counterparty_identifiers_identifier_type ON counterparty_identifiers(identifier_type);
CREATE INDEX idx_counterparty_identifiers_identifier_value ON counterparty_identifiers(identifier_value);
CREATE INDEX idx_counterparty_identifiers_source ON counterparty_identifiers(source);
CREATE INDEX idx_counterparty_identifiers_is_primary ON counterparty_identifiers(is_primary);
CREATE INDEX idx_counterparty_identifiers_composite ON counterparty_identifiers(identifier_type, identifier_value, source);

-- Aggregation units indexes
CREATE INDEX idx_aggregation_units_type ON aggregation_units(type);
CREATE INDEX idx_aggregation_units_market ON aggregation_units(market);
CREATE INDEX idx_aggregation_units_status ON aggregation_units(status);

-- Aggregation unit books indexes
CREATE INDEX idx_aggregation_unit_books_aggregation_unit_id ON aggregation_unit_books(aggregation_unit_id);
CREATE INDEX idx_aggregation_unit_books_book_id ON aggregation_unit_books(book_id);

-- Index compositions indexes
CREATE INDEX idx_index_compositions_index_security_id ON index_compositions(index_security_id);
CREATE INDEX idx_index_compositions_constituent_security_id ON index_compositions(constituent_security_id);
CREATE INDEX idx_index_compositions_effective_date ON index_compositions(effective_date);
CREATE INDEX idx_index_compositions_expiry_date ON index_compositions(expiry_date);
CREATE INDEX idx_index_compositions_is_active ON index_compositions(is_active);
CREATE INDEX idx_index_compositions_active ON index_compositions(index_security_id, is_active, effective_date, expiry_date);

-- ===========================================
-- Audit Triggers
-- ===========================================

-- Securities audit trigger
CREATE TRIGGER securities_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON securities
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Security identifiers audit trigger
CREATE TRIGGER security_identifiers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON security_identifiers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Counterparties audit trigger
CREATE TRIGGER counterparties_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON counterparties
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Counterparty identifiers audit trigger
CREATE TRIGGER counterparty_identifiers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON counterparty_identifiers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Aggregation units audit trigger
CREATE TRIGGER aggregation_units_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON aggregation_units
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Aggregation unit books audit trigger
CREATE TRIGGER aggregation_unit_books_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON aggregation_unit_books
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Index compositions audit trigger
CREATE TRIGGER index_compositions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON index_compositions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ===========================================
-- Table Comments
-- ===========================================

COMMENT ON TABLE securities IS 'Stores core security reference data including equities, bonds, and basket products';
COMMENT ON TABLE security_identifiers IS 'Maps external security identifiers (ISIN, CUSIP, SEDOL, etc.) to internal securities';
COMMENT ON TABLE counterparties IS 'Stores core counterparty reference data including clients, brokers, and internal entities';
COMMENT ON TABLE counterparty_identifiers IS 'Maps external counterparty identifiers (LEI, BIC, SWIFT, etc.) to internal counterparties';
COMMENT ON TABLE aggregation_units IS 'Stores aggregation unit definitions for regulatory reporting and position aggregation';
COMMENT ON TABLE aggregation_unit_books IS 'Maps books to aggregation units for position aggregation';
COMMENT ON TABLE index_compositions IS 'Stores relationships between basket securities (indexes/ETFs) and their constituent securities';

-- ===========================================
-- Update Version
-- ===========================================

INSERT INTO db_version (version, description, installed_by, success)
VALUES ('V2', 'Reference data tables', current_user, TRUE);