#!/bin/bash
#
# seed-reference-data.sh - Reference data seeding script for the Inventory Management System (IMS)
#
# This script automates the loading of securities, counterparties, aggregation units, and
# index compositions from fixture files into the appropriate database tables. It supports
# both development and production environments and provides verification of seeded data.
#
# Usage: ./seed-reference-data.sh [options]
#   Options:
#     -e, --environment ENV    Target environment (dev, staging, prod) (default: dev)
#     -d, --database NAME      Target database name (default: ims_ingestion)
#     -s, --service NAME       Database service name (default: ims-data-ingestion-db)
#     -c, --components LIST    Comma-separated list of data components to seed
#                              (securities,counterparties,aggregation_units,index_compositions,all)
#     -v, --verify BOOL        Verify data seeding after completion (default: true)
#     -f, --force              Force seeding by cleaning up existing data first (default: false)
#     -h, --help               Display help information
#
# Environment Variables:
#   KUBECONFIG                 Path to Kubernetes configuration file
#   POSTGRES_USER              PostgreSQL admin username (default: postgres)
#   POSTGRES_PASSWORD          PostgreSQL admin password
#   SEED_LOG_LEVEL             Log level for seeding script (default: INFO)
#
# Dependencies:
#   kubectl (latest)           Kubernetes command-line tool
#   psql (15+)                 PostgreSQL client
#   jq (1.6+)                  JSON processor
#
# Returns:
#   0 on success, non-zero on failure
#

# Enable error handling
set -e
set -o pipefail

# Define global variables and constants
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/../.." && pwd)
LOG_FILE="${PROJECT_ROOT}/logs/seed_reference_data_$(date +%Y%m%d_%H%M%S).log"
DEFAULT_ENVIRONMENT="dev"
FIXTURES_DIR="${PROJECT_ROOT}/src/test/common/fixtures"
SECURITIES_FIXTURE="${FIXTURES_DIR}/securities.json"
COUNTERPARTIES_FIXTURE="${FIXTURES_DIR}/counterparties.json"
AGGREGATION_UNITS_FIXTURE="${FIXTURES_DIR}/aggregation_units.json"
INDEX_COMPOSITIONS_FIXTURE="${FIXTURES_DIR}/index_compositions.json"

# Import utility functions from other scripts
source "${SCRIPT_DIR}/initialize-db.sh"
source "${SCRIPT_DIR}/health-check.sh"

# Function to display usage information
usage() {
  echo "Usage: $0 [options]"
  echo "Seed reference data into the Inventory Management System database"
  echo ""
  echo "Options:"
  echo "  -e, --environment ENV    Target environment (dev, staging, prod) (default: dev)"
  echo "  -d, --database NAME      Target database name (default: ims_ingestion)"
  echo "  -s, --service NAME       Database service name (default: ims-data-ingestion-db)"
  echo "  -c, --components LIST    Comma-separated list of data components to seed"
  echo "                           (securities,counterparties,aggregation_units,index_compositions,all)"
  echo "                           (default: all)"
  echo "  -v, --verify BOOL        Verify data seeding after completion (default: true)"
  echo "  -f, --force              Force seeding by cleaning up existing data first (default: false)"
  echo "  -h, --help               Display this help information"
  echo ""
  echo "Examples:"
  echo "  $0 -e dev                Seed all reference data in dev environment"
  echo "  $0 -e prod -c securities Seed only securities data in production environment"
  echo "  $0 -e staging -f         Force re-seeding of all data in staging environment"
}

# Function to check prerequisites
check_prerequisites() {
  local missing_tools=()
  
  log "INFO" "Checking prerequisites..."
  
  # Check if kubectl is installed
  if ! command -v kubectl &> /dev/null; then
    missing_tools+=("kubectl")
  fi
  
  # Check if psql is installed
  if ! command -v psql &> /dev/null; then
    missing_tools+=("psql (postgresql-client)")
  fi
  
  # Check if jq is installed
  if ! command -v jq &> /dev/null; then
    missing_tools+=("jq")
  fi
  
  if [[ ${#missing_tools[@]} -gt 0 ]]; then
    log "ERROR" "Missing required tools: ${missing_tools[*]}"
    log "ERROR" "Please install the missing tools and try again"
    return 1
  fi
  
  log "INFO" "All prerequisites met"
  return 0
}

# Function to wait for database to be ready
wait_for_database() {
  local environment="$1"
  local service_name="$2"
  local max_attempts=30
  local attempt=1
  local wait_time=5
  
  log "INFO" "Waiting for database service $service_name to be ready..."
  
  # Use the check_service_health function from health-check.sh
  if check_service_health "$service_name" "http://$service_name.ims-$environment:5432/"; then
    log "INFO" "Database service $service_name is ready"
    return 0
  fi
  
  # Get the pod name for the database service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for database service: $service_name"
    return 1
  fi
  
  log "INFO" "Found database pod: $pod_name"
  
  # Wait for the database to be ready
  while [[ $attempt -le $max_attempts ]]; do
    log "INFO" "Attempt $attempt of $max_attempts: Checking if database is ready..."
    
    if kubectl exec "$pod_name" -n "ims-$environment" -- pg_isready -U postgres > /dev/null 2>&1; then
      log "INFO" "Database service $service_name is ready"
      return 0
    fi
    
    log "INFO" "Database service $service_name is not ready yet, waiting $wait_time seconds..."
    sleep $wait_time
    
    # Increase wait time for next attempt (exponential backoff)
    wait_time=$((wait_time + 5))
    attempt=$((attempt + 1))
  done
  
  log "ERROR" "Timed out waiting for database service $service_name to be ready after $max_attempts attempts"
  return 1
}

# Function to seed securities data
seed_securities() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  
  log "INFO" "Seeding securities data..."
  
  # Check if securities fixture file exists
  if [[ ! -f "$SECURITIES_FIXTURE" ]]; then
    log "ERROR" "Securities fixture file not found: $SECURITIES_FIXTURE"
    return 1
  fi
  
  # Get the pod name for the database service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for database service: $service_name"
    return 1
  fi
  
  # Generate SQL statements for inserting securities
  log "INFO" "Generating SQL statements for securities..."
  
  local temp_sql_file=$(mktemp)
  
  # Create SQL transaction block
  echo "BEGIN;" > "$temp_sql_file"
  
  # Process each security in the JSON file
  jq -c '.[]' "$SECURITIES_FIXTURE" | while read -r security; do
    local internal_id=$(echo "$security" | jq -r '.internalId')
    local security_type=$(echo "$security" | jq -r '.securityType')
    local issuer=$(echo "$security" | jq -r '.issuer')
    local issue_date=$(echo "$security" | jq -r '.issueDate')
    local maturity_date=$(echo "$security" | jq -r '.maturityDate // "null"')
    local currency=$(echo "$security" | jq -r '.currency')
    local status=$(echo "$security" | jq -r '.status')
    local market=$(echo "$security" | jq -r '.market')
    local version=$(echo "$security" | jq -r '.version // 1')
    
    # Escape single quotes in string values
    issuer="${issuer//\'/\'\'}"
    
    # Handle NULL values for maturity_date
    if [[ "$maturity_date" == "null" ]]; then
      maturity_date="NULL"
    else
      maturity_date="'$maturity_date'"
    fi
    
    # Generate INSERT statement
    echo "INSERT INTO securities (internal_id, security_type, issuer, issue_date, maturity_date, currency, status, market, version) 
    VALUES ('$internal_id', '$security_type', '$issuer', '$issue_date', $maturity_date, '$currency', '$status', '$market', $version)
    ON CONFLICT (internal_id) DO UPDATE 
    SET security_type = EXCLUDED.security_type,
        issuer = EXCLUDED.issuer,
        issue_date = EXCLUDED.issue_date,
        maturity_date = EXCLUDED.maturity_date,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        market = EXCLUDED.market,
        version = EXCLUDED.version;" >> "$temp_sql_file"
  done
  
  # Commit transaction
  echo "COMMIT;" >> "$temp_sql_file"
  
  # Copy SQL file to pod
  kubectl cp "$temp_sql_file" "ims-$environment/$pod_name:/tmp/securities.sql"
  
  # Execute SQL file
  log "INFO" "Executing SQL statements for securities..."
  if kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -f "/tmp/securities.sql" > /dev/null; then
    log "INFO" "Securities data seeded successfully"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/securities.sql"
    rm -f "$temp_sql_file"
    return 0
  else
    log "ERROR" "Failed to seed securities data"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/securities.sql"
    rm -f "$temp_sql_file"
    return 1
  fi
}

# Function to seed security identifiers data
seed_security_identifiers() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  
  log "INFO" "Seeding security identifiers data..."
  
  # Check if securities fixture file exists
  if [[ ! -f "$SECURITIES_FIXTURE" ]]; then
    log "ERROR" "Securities fixture file not found: $SECURITIES_FIXTURE"
    return 1
  fi
  
  # Get the pod name for the database service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for database service: $service_name"
    return 1
  fi
  
  # Generate SQL statements for inserting security identifiers
  log "INFO" "Generating SQL statements for security identifiers..."
  
  local temp_sql_file=$(mktemp)
  
  # Create SQL transaction block
  echo "BEGIN;" > "$temp_sql_file"
  
  # Process each security in the JSON file
  jq -c '.[]' "$SECURITIES_FIXTURE" | while read -r security; do
    local internal_id=$(echo "$security" | jq -r '.internalId')
    
    # Process identifiers for each security
    echo "$security" | jq -c '.identifiers[]?' | while read -r identifier; do
      # Skip if null (no identifiers)
      if [[ -z "$identifier" || "$identifier" == "null" ]]; then
        continue
      fi
      
      local identifier_type=$(echo "$identifier" | jq -r '.type')
      local identifier_value=$(echo "$identifier" | jq -r '.value')
      local source=$(echo "$identifier" | jq -r '.source')
      
      # Generate INSERT statement
      echo "INSERT INTO security_identifiers (internal_security_id, identifier_type, identifier_value, source) 
      VALUES ('$internal_id', '$identifier_type', '$identifier_value', '$source')
      ON CONFLICT (internal_security_id, identifier_type, source) DO UPDATE 
      SET identifier_value = EXCLUDED.identifier_value;" >> "$temp_sql_file"
    done
  done
  
  # Commit transaction
  echo "COMMIT;" >> "$temp_sql_file"
  
  # Copy SQL file to pod
  kubectl cp "$temp_sql_file" "ims-$environment/$pod_name:/tmp/security_identifiers.sql"
  
  # Execute SQL file
  log "INFO" "Executing SQL statements for security identifiers..."
  if kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -f "/tmp/security_identifiers.sql" > /dev/null; then
    log "INFO" "Security identifiers data seeded successfully"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/security_identifiers.sql"
    rm -f "$temp_sql_file"
    return 0
  else
    log "ERROR" "Failed to seed security identifiers data"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/security_identifiers.sql"
    rm -f "$temp_sql_file"
    return 1
  fi
}

# Function to seed counterparties data
seed_counterparties() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  
  log "INFO" "Seeding counterparties data..."
  
  # Check if counterparties fixture file exists
  if [[ ! -f "$COUNTERPARTIES_FIXTURE" ]]; then
    log "ERROR" "Counterparties fixture file not found: $COUNTERPARTIES_FIXTURE"
    return 1
  fi
  
  # Get the pod name for the database service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for database service: $service_name"
    return 1
  fi
  
  # Generate SQL statements for inserting counterparties
  log "INFO" "Generating SQL statements for counterparties..."
  
  local temp_sql_file=$(mktemp)
  
  # Create SQL transaction block
  echo "BEGIN;" > "$temp_sql_file"
  
  # Process each counterparty in the JSON file
  jq -c '.[]' "$COUNTERPARTIES_FIXTURE" | while read -r counterparty; do
    local counterparty_id=$(echo "$counterparty" | jq -r '.counterpartyId')
    local name=$(echo "$counterparty" | jq -r '.name')
    local type=$(echo "$counterparty" | jq -r '.type')
    local kyc_status=$(echo "$counterparty" | jq -r '.kycStatus')
    local status=$(echo "$counterparty" | jq -r '.status')
    
    # Escape single quotes in string values
    name="${name//\'/\'\'}"
    
    # Generate INSERT statement
    echo "INSERT INTO counterparties (counterparty_id, name, type, kyc_status, status) 
    VALUES ('$counterparty_id', '$name', '$type', '$kyc_status', '$status')
    ON CONFLICT (counterparty_id) DO UPDATE 
    SET name = EXCLUDED.name,
        type = EXCLUDED.type,
        kyc_status = EXCLUDED.kyc_status,
        status = EXCLUDED.status;" >> "$temp_sql_file"
  done
  
  # Commit transaction
  echo "COMMIT;" >> "$temp_sql_file"
  
  # Copy SQL file to pod
  kubectl cp "$temp_sql_file" "ims-$environment/$pod_name:/tmp/counterparties.sql"
  
  # Execute SQL file
  log "INFO" "Executing SQL statements for counterparties..."
  if kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -f "/tmp/counterparties.sql" > /dev/null; then
    log "INFO" "Counterparties data seeded successfully"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/counterparties.sql"
    rm -f "$temp_sql_file"
    return 0
  else
    log "ERROR" "Failed to seed counterparties data"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/counterparties.sql"
    rm -f "$temp_sql_file"
    return 1
  fi
}

# Function to seed counterparty identifiers data
seed_counterparty_identifiers() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  
  log "INFO" "Seeding counterparty identifiers data..."
  
  # Check if counterparties fixture file exists
  if [[ ! -f "$COUNTERPARTIES_FIXTURE" ]]; then
    log "ERROR" "Counterparties fixture file not found: $COUNTERPARTIES_FIXTURE"
    return 1
  fi
  
  # Get the pod name for the database service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for database service: $service_name"
    return 1
  fi
  
  # Generate SQL statements for inserting counterparty identifiers
  log "INFO" "Generating SQL statements for counterparty identifiers..."
  
  local temp_sql_file=$(mktemp)
  
  # Create SQL transaction block
  echo "BEGIN;" > "$temp_sql_file"
  
  # Process each counterparty in the JSON file
  jq -c '.[]' "$COUNTERPARTIES_FIXTURE" | while read -r counterparty; do
    local counterparty_id=$(echo "$counterparty" | jq -r '.counterpartyId')
    
    # Process identifiers for each counterparty
    echo "$counterparty" | jq -c '.identifiers[]?' | while read -r identifier; do
      # Skip if null (no identifiers)
      if [[ -z "$identifier" || "$identifier" == "null" ]]; then
        continue
      fi
      
      local identifier_type=$(echo "$identifier" | jq -r '.type')
      local identifier_value=$(echo "$identifier" | jq -r '.value')
      
      # Generate INSERT statement
      echo "INSERT INTO counterparty_identifiers (counterparty_id, identifier_type, identifier_value) 
      VALUES ('$counterparty_id', '$identifier_type', '$identifier_value')
      ON CONFLICT (counterparty_id, identifier_type) DO UPDATE 
      SET identifier_value = EXCLUDED.identifier_value;" >> "$temp_sql_file"
    done
  done
  
  # Commit transaction
  echo "COMMIT;" >> "$temp_sql_file"
  
  # Copy SQL file to pod
  kubectl cp "$temp_sql_file" "ims-$environment/$pod_name:/tmp/counterparty_identifiers.sql"
  
  # Execute SQL file
  log "INFO" "Executing SQL statements for counterparty identifiers..."
  if kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -f "/tmp/counterparty_identifiers.sql" > /dev/null; then
    log "INFO" "Counterparty identifiers data seeded successfully"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/counterparty_identifiers.sql"
    rm -f "$temp_sql_file"
    return 0
  else
    log "ERROR" "Failed to seed counterparty identifiers data"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/counterparty_identifiers.sql"
    rm -f "$temp_sql_file"
    return 1
  fi
}

# Function to seed aggregation units data
seed_aggregation_units() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  
  log "INFO" "Seeding aggregation units data..."
  
  # Check if aggregation units fixture file exists
  if [[ ! -f "$AGGREGATION_UNITS_FIXTURE" ]]; then
    log "ERROR" "Aggregation units fixture file not found: $AGGREGATION_UNITS_FIXTURE"
    return 1
  fi
  
  # Get the pod name for the database service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for database service: $service_name"
    return 1
  fi
  
  # Generate SQL statements for inserting aggregation units
  log "INFO" "Generating SQL statements for aggregation units..."
  
  local temp_sql_file=$(mktemp)
  
  # Create SQL transaction block
  echo "BEGIN;" > "$temp_sql_file"
  
  # Process each aggregation unit in the JSON file
  jq -c '.[]' "$AGGREGATION_UNITS_FIXTURE" | while read -r aggregation_unit; do
    local aggregation_unit_id=$(echo "$aggregation_unit" | jq -r '.aggregationUnitId')
    local name=$(echo "$aggregation_unit" | jq -r '.name')
    local type=$(echo "$aggregation_unit" | jq -r '.type')
    local market=$(echo "$aggregation_unit" | jq -r '.market')
    local officer_id=$(echo "$aggregation_unit" | jq -r '.officerId // "null"')
    
    # Escape single quotes in string values
    name="${name//\'/\'\'}"
    
    # Handle NULL values for officer_id
    if [[ "$officer_id" == "null" ]]; then
      officer_id="NULL"
    else
      officer_id="'$officer_id'"
    fi
    
    # Generate INSERT statement
    echo "INSERT INTO aggregation_units (aggregation_unit_id, name, type, market, officer_id) 
    VALUES ('$aggregation_unit_id', '$name', '$type', '$market', $officer_id)
    ON CONFLICT (aggregation_unit_id) DO UPDATE 
    SET name = EXCLUDED.name,
        type = EXCLUDED.type,
        market = EXCLUDED.market,
        officer_id = EXCLUDED.officer_id;" >> "$temp_sql_file"
  done
  
  # Commit transaction
  echo "COMMIT;" >> "$temp_sql_file"
  
  # Copy SQL file to pod
  kubectl cp "$temp_sql_file" "ims-$environment/$pod_name:/tmp/aggregation_units.sql"
  
  # Execute SQL file
  log "INFO" "Executing SQL statements for aggregation units..."
  if kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -f "/tmp/aggregation_units.sql" > /dev/null; then
    log "INFO" "Aggregation units data seeded successfully"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/aggregation_units.sql"
    rm -f "$temp_sql_file"
    return 0
  else
    log "ERROR" "Failed to seed aggregation units data"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/aggregation_units.sql"
    rm -f "$temp_sql_file"
    return 1
  fi
}

# Function to seed index compositions data
seed_index_compositions() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  
  log "INFO" "Seeding index compositions data..."
  
  # Check if index compositions fixture file exists
  if [[ ! -f "$INDEX_COMPOSITIONS_FIXTURE" ]]; then
    log "ERROR" "Index compositions fixture file not found: $INDEX_COMPOSITIONS_FIXTURE"
    return 1
  fi
  
  # Get the pod name for the database service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for database service: $service_name"
    return 1
  fi
  
  # Generate SQL statements for inserting index compositions
  log "INFO" "Generating SQL statements for index compositions..."
  
  local temp_sql_file=$(mktemp)
  
  # Create SQL transaction block
  echo "BEGIN;" > "$temp_sql_file"
  
  # Process each index composition in the JSON file
  jq -c '.[]' "$INDEX_COMPOSITIONS_FIXTURE" | while read -r composition; do
    local index_id=$(echo "$composition" | jq -r '.indexId')
    local constituent_id=$(echo "$composition" | jq -r '.constituentId')
    local weight=$(echo "$composition" | jq -r '.weight')
    local composition_type=$(echo "$composition" | jq -r '.compositionType')
    local effective_date=$(echo "$composition" | jq -r '.effectiveDate')
    
    # Generate INSERT statement
    echo "INSERT INTO index_compositions (index_id, constituent_id, weight, composition_type, effective_date) 
    VALUES ('$index_id', '$constituent_id', $weight, '$composition_type', '$effective_date')
    ON CONFLICT (index_id, constituent_id, effective_date) DO UPDATE 
    SET weight = EXCLUDED.weight,
        composition_type = EXCLUDED.composition_type;" >> "$temp_sql_file"
  done
  
  # Commit transaction
  echo "COMMIT;" >> "$temp_sql_file"
  
  # Copy SQL file to pod
  kubectl cp "$temp_sql_file" "ims-$environment/$pod_name:/tmp/index_compositions.sql"
  
  # Execute SQL file
  log "INFO" "Executing SQL statements for index compositions..."
  if kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -f "/tmp/index_compositions.sql" > /dev/null; then
    log "INFO" "Index compositions data seeded successfully"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/index_compositions.sql"
    rm -f "$temp_sql_file"
    return 0
  else
    log "ERROR" "Failed to seed index compositions data"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/index_compositions.sql"
    rm -f "$temp_sql_file"
    return 1
  fi
}

# Function to verify seeded data
verify_seeding() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  
  log "INFO" "Verifying seeded reference data..."
  
  # Get the pod name for the database service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for database service: $service_name"
    return 1
  fi
  
  # Count records in each table
  log "INFO" "Counting records in each table..."
  
  # Count securities
  local securities_count=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -tAc "SELECT COUNT(*) FROM securities;")
  log "INFO" "Securities count: $securities_count"
  
  # Count security identifiers
  local security_identifiers_count=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -tAc "SELECT COUNT(*) FROM security_identifiers;")
  log "INFO" "Security identifiers count: $security_identifiers_count"
  
  # Count counterparties
  local counterparties_count=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -tAc "SELECT COUNT(*) FROM counterparties;")
  log "INFO" "Counterparties count: $counterparties_count"
  
  # Count counterparty identifiers
  local counterparty_identifiers_count=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -tAc "SELECT COUNT(*) FROM counterparty_identifiers;")
  log "INFO" "Counterparty identifiers count: $counterparty_identifiers_count"
  
  # Count aggregation units
  local aggregation_units_count=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -tAc "SELECT COUNT(*) FROM aggregation_units;")
  log "INFO" "Aggregation units count: $aggregation_units_count"
  
  # Count index compositions
  local index_compositions_count=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -tAc "SELECT COUNT(*) FROM index_compositions;")
  log "INFO" "Index compositions count: $index_compositions_count"
  
  # Verify against fixture file counts
  local expected_securities_count=$(jq 'length' "$SECURITIES_FIXTURE")
  local expected_counterparties_count=$(jq 'length' "$COUNTERPARTIES_FIXTURE")
  local expected_aggregation_units_count=$(jq 'length' "$AGGREGATION_UNITS_FIXTURE")
  local expected_index_compositions_count=$(jq 'length' "$INDEX_COMPOSITIONS_FIXTURE")
  
  # Count expected security identifiers
  local expected_security_identifiers_count=$(jq '[.[] | .identifiers | length] | add' "$SECURITIES_FIXTURE")
  
  # Count expected counterparty identifiers
  local expected_counterparty_identifiers_count=$(jq '[.[] | .identifiers | length] | add' "$COUNTERPARTIES_FIXTURE")
  
  # Check if counts match
  local verification_failed=false
  
  if [[ "$securities_count" -ne "$expected_securities_count" ]]; then
    log "ERROR" "Securities count mismatch: expected $expected_securities_count, got $securities_count"
    verification_failed=true
  fi
  
  if [[ "$security_identifiers_count" -ne "$expected_security_identifiers_count" ]]; then
    log "ERROR" "Security identifiers count mismatch: expected $expected_security_identifiers_count, got $security_identifiers_count"
    verification_failed=true
  fi
  
  if [[ "$counterparties_count" -ne "$expected_counterparties_count" ]]; then
    log "ERROR" "Counterparties count mismatch: expected $expected_counterparties_count, got $counterparties_count"
    verification_failed=true
  fi
  
  if [[ "$counterparty_identifiers_count" -ne "$expected_counterparty_identifiers_count" ]]; then
    log "ERROR" "Counterparty identifiers count mismatch: expected $expected_counterparty_identifiers_count, got $counterparty_identifiers_count"
    verification_failed=true
  fi
  
  if [[ "$aggregation_units_count" -ne "$expected_aggregation_units_count" ]]; then
    log "ERROR" "Aggregation units count mismatch: expected $expected_aggregation_units_count, got $aggregation_units_count"
    verification_failed=true
  fi
  
  if [[ "$index_compositions_count" -ne "$expected_index_compositions_count" ]]; then
    log "ERROR" "Index compositions count mismatch: expected $expected_index_compositions_count, got $index_compositions_count"
    verification_failed=true
  fi
  
  if $verification_failed; then
    log "ERROR" "Data verification failed"
    return 1
  else
    log "INFO" "Data verification successful - all record counts match"
    return 0
  fi
}

# Function to clean up existing data
cleanup_existing_data() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  
  log "INFO" "Cleaning up existing reference data..."
  
  # Get the pod name for the database service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for database service: $service_name"
    return 1
  fi
  
  # Generate SQL statements for deleting data
  local temp_sql_file=$(mktemp)
  
  # Create SQL transaction block
  echo "BEGIN;" > "$temp_sql_file"
  
  # Delete data in reverse order of dependencies
  echo "DELETE FROM index_compositions;" >> "$temp_sql_file"
  echo "DELETE FROM security_identifiers;" >> "$temp_sql_file"
  echo "DELETE FROM counterparty_identifiers;" >> "$temp_sql_file"
  echo "DELETE FROM aggregation_units;" >> "$temp_sql_file"
  echo "DELETE FROM securities;" >> "$temp_sql_file"
  echo "DELETE FROM counterparties;" >> "$temp_sql_file"
  
  # Commit transaction
  echo "COMMIT;" >> "$temp_sql_file"
  
  # Copy SQL file to pod
  kubectl cp "$temp_sql_file" "ims-$environment/$pod_name:/tmp/cleanup.sql"
  
  # Execute SQL file
  log "INFO" "Executing SQL statements for cleanup..."
  if kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -f "/tmp/cleanup.sql" > /dev/null; then
    log "INFO" "Existing reference data cleaned up successfully"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/cleanup.sql"
    rm -f "$temp_sql_file"
    return 0
  else
    log "ERROR" "Failed to clean up existing reference data"
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/cleanup.sql"
    rm -f "$temp_sql_file"
    return 1
  fi
}

# Main function
main() {
  local ENVIRONMENT="$DEFAULT_ENVIRONMENT"
  local DATABASE="ims_ingestion"
  local SERVICE="ims-data-ingestion-db"
  local COMPONENTS="all"
  local VERIFY="true"
  local FORCE="false"
  local HELP="false"
  
  # Parse command line arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -e|--environment)
        ENVIRONMENT="$2"
        shift 2
        ;;
      -d|--database)
        DATABASE="$2"
        shift 2
        ;;
      -s|--service)
        SERVICE="$2"
        shift 2
        ;;
      -c|--components)
        COMPONENTS="$2"
        shift 2
        ;;
      -v|--verify)
        VERIFY="$2"
        shift 2
        ;;
      -f|--force)
        FORCE="true"
        shift
        ;;
      -h|--help)
        HELP="true"
        shift
        ;;
      *)
        echo "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done
  
  # Display help if requested
  if [[ "$HELP" == "true" ]]; then
    usage
    exit 0
  fi
  
  # Ensure log directory exists
  mkdir -p "$(dirname "$LOG_FILE")"
  
  # Start logging
  log "INFO" "===== Reference Data Seeding Script ====="
  log "INFO" "Environment: $ENVIRONMENT"
  log "INFO" "Database: $DATABASE"
  log "INFO" "Service: $SERVICE"
  log "INFO" "Components: $COMPONENTS"
  log "INFO" "Verify: $VERIFY"
  log "INFO" "Force: $FORCE"
  
  # Check prerequisites
  if ! check_prerequisites; then
    log "ERROR" "Prerequisite check failed"
    exit 1
  fi
  
  # Set up environment
  if ! setup_environment "$ENVIRONMENT"; then
    log "ERROR" "Environment setup failed"
    exit 1
  fi
  
  # Wait for database to be ready
  if ! wait_for_database "$ENVIRONMENT" "$SERVICE"; then
    log "ERROR" "Database not ready, aborting seeding"
    exit 1
  fi
  
  # Clean up existing data if force flag is set
  if [[ "$FORCE" == "true" ]]; then
    if ! cleanup_existing_data "$ENVIRONMENT" "$SERVICE" "$DATABASE"; then
      log "ERROR" "Failed to clean up existing data"
      exit 1
    fi
  fi
  
  # Seed securities data if requested
  if [[ "$COMPONENTS" == "all" || "$COMPONENTS" == *"securities"* ]]; then
    if ! seed_securities "$ENVIRONMENT" "$SERVICE" "$DATABASE"; then
      log "ERROR" "Failed to seed securities data"
      exit 1
    fi
    
    if ! seed_security_identifiers "$ENVIRONMENT" "$SERVICE" "$DATABASE"; then
      log "ERROR" "Failed to seed security identifiers data"
      exit 1
    fi
  fi
  
  # Seed counterparties data if requested
  if [[ "$COMPONENTS" == "all" || "$COMPONENTS" == *"counterparties"* ]]; then
    if ! seed_counterparties "$ENVIRONMENT" "$SERVICE" "$DATABASE"; then
      log "ERROR" "Failed to seed counterparties data"
      exit 1
    fi
    
    if ! seed_counterparty_identifiers "$ENVIRONMENT" "$SERVICE" "$DATABASE"; then
      log "ERROR" "Failed to seed counterparty identifiers data"
      exit 1
    fi
  fi
  
  # Seed aggregation units data if requested
  if [[ "$COMPONENTS" == "all" || "$COMPONENTS" == *"aggregation_units"* ]]; then
    if ! seed_aggregation_units "$ENVIRONMENT" "$SERVICE" "$DATABASE"; then
      log "ERROR" "Failed to seed aggregation units data"
      exit 1
    fi
  fi
  
  # Seed index compositions data if requested
  if [[ "$COMPONENTS" == "all" || "$COMPONENTS" == *"index_compositions"* ]]; then
    if ! seed_index_compositions "$ENVIRONMENT" "$SERVICE" "$DATABASE"; then
      log "ERROR" "Failed to seed index compositions data"
      exit 1
    fi
  fi
  
  # Verify seeding if requested
  if [[ "$VERIFY" == "true" ]]; then
    if ! verify_seeding "$ENVIRONMENT" "$SERVICE" "$DATABASE"; then
      log "ERROR" "Data verification failed"
      exit 1
    fi
  fi
  
  log "INFO" "Reference data seeding completed successfully"
  return 0
}

# Trap signals for clean exit
trap 'log "INFO" "Script interrupted, exiting..."; exit 1' INT TERM

# Execute main function with all arguments
main "$@"
exit $?