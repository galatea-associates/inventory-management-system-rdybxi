#!/bin/bash
#
# initialize-db.sh - Database initialization script for the Inventory Management System (IMS)
#
# This script automates the setup of PostgreSQL, TimescaleDB, and Cassandra databases
# with proper schema, extensions, and initial configuration. It supports different
# environments (development, staging, production) and ensures all database components
# are properly initialized before application deployment.
#
# Usage: ./initialize-db.sh [options]
#   Options:
#     -e, --environment ENV       Target environment (dev, staging, prod)
#     -c, --components COMPONENTS Comma-separated list of database components to initialize
#     -d, --database DATABASE     Specific PostgreSQL database to initialize
#     -v, --verify                Verify database setup after initialization
#     -f, --force                 Force initialization even if database already exists
#     -h, --help                  Display help information
#

# Enable error handling
set -e
set -o pipefail

# Define global variables and constants
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/../.." && pwd)
LOG_FILE="${PROJECT_ROOT}/logs/db_init_$(date +%Y%m%d_%H%M%S).log"
DEFAULT_ENVIRONMENT="dev"
MIGRATION_DIR="${PROJECT_ROOT}/infrastructure/database/migrations"
POSTGRESQL_MIGRATION_DIR="${MIGRATION_DIR}/postgresql"
TIMESCALEDB_MIGRATION_DIR="${MIGRATION_DIR}/timescaledb"
CASSANDRA_MIGRATION_DIR="${MIGRATION_DIR}/cassandra"

# Import health check function
source "${SCRIPT_DIR}/health-check.sh"

# Function to display usage information
usage() {
  echo "Usage: $0 [options]"
  echo "Initialize and configure database components for the IMS"
  echo ""
  echo "Options:"
  echo "  -e, --environment ENV       Target environment (dev, staging, prod) (default: dev)"
  echo "  -c, --components COMPONENTS Comma-separated list of database components to initialize"
  echo "                              (postgresql,timescaledb,cassandra,all) (default: all)"
  echo "  -d, --database DATABASE     Specific PostgreSQL database to initialize (default: all)"
  echo "  -v, --verify                Verify database setup after initialization (default: true)"
  echo "  -f, --force                 Force initialization even if database already exists (default: false)"
  echo "  -h, --help                  Display this help information"
  echo ""
  echo "Examples:"
  echo "  $0 -e dev                   Initialize all database components in dev environment"
  echo "  $0 -e prod -c postgresql    Initialize only PostgreSQL databases in production"
  echo "  $0 -e staging -d ims_auth   Initialize only the ims_auth PostgreSQL database in staging"
}

# Function to log messages
log() {
  local level="$1"
  local message="$2"
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  
  # Log level from environment variable or default to INFO
  local log_level="${DB_INIT_LOG_LEVEL:-INFO}"
  
  # Only log if the message level is at or above the current log level
  # Priority: DEBUG < INFO < WARN < ERROR
  case "$log_level" in
    "DEBUG")
      # Log everything
      ;;
    "INFO")
      # Skip DEBUG logs
      if [[ "$level" == "DEBUG" ]]; then
        return
      fi
      ;;
    "WARN")
      # Skip DEBUG and INFO logs
      if [[ "$level" == "DEBUG" || "$level" == "INFO" ]]; then
        return
      fi
      ;;
    "ERROR")
      # Only log ERROR messages
      if [[ "$level" != "ERROR" ]]; then
        return
      fi
      ;;
  esac
  
  local log_entry="[${timestamp}] [${level}] $message"
  
  # Ensure log directory exists
  mkdir -p "$(dirname "$LOG_FILE")"
  
  echo "$log_entry"
  echo "$log_entry" >> "$LOG_FILE"
}

# Function to set up the environment
setup_environment() {
  local environment="$1"
  
  log "INFO" "Setting up environment: $environment"
  
  # Validate environment
  case "$environment" in
    "dev"|"development")
      ENV="dev"
      ;;
    "staging")
      ENV="staging"
      ;;
    "prod"|"production")
      ENV="prod"
      ;;
    *)
      log "ERROR" "Invalid environment: $environment. Must be one of: dev, staging, prod"
      return 1
      ;;
  esac
  
  # Create necessary log directories
  mkdir -p "${PROJECT_ROOT}/logs"
  
  # Configure kubectl context based on environment
  if [[ -n "${KUBECONFIG}" ]]; then
    log "INFO" "Using KUBECONFIG: ${KUBECONFIG}"
  else
    log "INFO" "Using default kubectl configuration"
  fi
  
  # Verify access to Kubernetes cluster
  if ! kubectl cluster-info > /dev/null 2>&1; then
    log "ERROR" "Cannot connect to Kubernetes cluster"
    return 1
  fi
  
  log "INFO" "Environment setup complete: $ENV"
  return 0
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
  
  # Check if cqlsh is installed
  if ! command -v cqlsh &> /dev/null; then
    missing_tools+=("cqlsh (cassandra-tools)")
  fi
  
  # Check if flyway is installed
  if ! command -v flyway &> /dev/null; then
    missing_tools+=("flyway")
  fi
  
  if [[ ${#missing_tools[@]} -gt 0 ]]; then
    log "ERROR" "Missing required tools: ${missing_tools[*]}"
    log "ERROR" "Please install the missing tools and try again"
    return 1
  fi
  
  log "INFO" "All prerequisites met"
  return 0
}

# Function to wait for PostgreSQL to be ready
wait_for_postgresql() {
  local environment="$1"
  local service_name="$2"
  local max_attempts=30
  local attempt=1
  local wait_time=5
  
  log "INFO" "Waiting for PostgreSQL service $service_name to be ready..."
  
  # Get the pod name for the PostgreSQL service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for PostgreSQL service: $service_name"
    return 1
  fi
  
  log "INFO" "Found PostgreSQL pod: $pod_name"
  
  # Wait for PostgreSQL to be ready
  while [[ $attempt -le $max_attempts ]]; do
    log "INFO" "Attempt $attempt of $max_attempts: Checking if PostgreSQL is ready..."
    
    if kubectl exec "$pod_name" -n "ims-$environment" -- pg_isready -U postgres > /dev/null 2>&1; then
      log "INFO" "PostgreSQL service $service_name is ready"
      return 0
    fi
    
    log "INFO" "PostgreSQL service $service_name is not ready yet, waiting $wait_time seconds..."
    sleep $wait_time
    
    # Increase wait time for next attempt (exponential backoff)
    wait_time=$((wait_time + 5))
    attempt=$((attempt + 1))
  done
  
  log "ERROR" "Timed out waiting for PostgreSQL service $service_name to be ready after $max_attempts attempts"
  return 1
}

# Function to wait for Cassandra to be ready
wait_for_cassandra() {
  local environment="$1"
  local max_attempts=30
  local attempt=1
  local wait_time=5
  
  log "INFO" "Waiting for Cassandra to be ready..."
  
  # Get the pod name for the Cassandra service
  local pod_name=$(kubectl get pods -l app=ims-cassandra -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for Cassandra"
    return 1
  fi
  
  log "INFO" "Found Cassandra pod: $pod_name"
  
  # Wait for Cassandra to be ready
  while [[ $attempt -le $max_attempts ]]; do
    log "INFO" "Attempt $attempt of $max_attempts: Checking if Cassandra is ready..."
    
    if kubectl exec "$pod_name" -n "ims-$environment" -- nodetool status | grep -q "UN"; then
      log "INFO" "Cassandra is ready"
      return 0
    fi
    
    log "INFO" "Cassandra is not ready yet, waiting $wait_time seconds..."
    sleep $wait_time
    
    # Increase wait time for next attempt (exponential backoff)
    wait_time=$((wait_time + 5))
    attempt=$((attempt + 1))
  done
  
  log "ERROR" "Timed out waiting for Cassandra to be ready after $max_attempts attempts"
  return 1
}

# Function to create PostgreSQL database if not exists
create_database_if_not_exists() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  
  log "INFO" "Checking if database $database_name exists in service $service_name..."
  
  # Get the pod name for the PostgreSQL service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for PostgreSQL service: $service_name"
    return 1
  fi
  
  # Check if database exists
  local db_exists=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$database_name'")
  
  if [[ "$db_exists" == "1" ]]; then
    if [[ "$FORCE" == "true" ]]; then
      log "INFO" "Database $database_name exists, but force flag is set. Dropping database..."
      kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -c "DROP DATABASE $database_name" > /dev/null
      log "INFO" "Database $database_name dropped successfully"
    else
      log "INFO" "Database $database_name already exists"
      return 0
    fi
  fi
  
  log "INFO" "Creating database $database_name..."
  
  # Create the database
  kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -c "CREATE DATABASE $database_name" > /dev/null
  
  # Verify database was created
  db_exists=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$database_name'")
  
  if [[ "$db_exists" == "1" ]]; then
    log "INFO" "Database $database_name created successfully"
    return 0
  else
    log "ERROR" "Failed to create database $database_name"
    return 1
  fi
}

# Function to apply PostgreSQL migrations using Flyway
apply_postgresql_migrations() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  local migration_dir="$4"
  
  log "INFO" "Applying PostgreSQL migrations to $database_name from $migration_dir..."
  
  # Get the service details
  local service_host=$(kubectl get svc "$service_name" -n "ims-$environment" -o jsonpath="{.spec.clusterIP}")
  local service_port=$(kubectl get svc "$service_name" -n "ims-$environment" -o jsonpath="{.spec.ports[0].port}")
  
  if [[ -z "$service_host" || -z "$service_port" ]]; then
    log "ERROR" "Could not determine host or port for service $service_name"
    return 1
  fi
  
  # Get credentials from environment variables or use defaults
  local db_user="${POSTGRES_USER:-postgres}"
  local db_password="${POSTGRES_PASSWORD:-}"
  
  # Build Flyway command
  log "INFO" "Running Flyway migrations for $database_name..."
  
  # Set up Flyway command
  local flyway_command=(
    flyway
    -url="jdbc:postgresql://$service_host:$service_port/$database_name"
    -user="$db_user"
    -locations="filesystem:$migration_dir"
    migrate
  )
  
  # Add password if provided
  if [[ -n "$db_password" ]]; then
    flyway_command+=( -password="$db_password" )
  fi
  
  # Create a temporary file for Flyway output
  local flyway_output=$(mktemp)
  
  # Run the Flyway command
  if "${flyway_command[@]}" > "$flyway_output" 2>&1; then
    log "INFO" "Flyway migrations applied successfully to $database_name"
    grep "Successfully applied" "$flyway_output" | tail -1 | log "INFO"
    # Clean up
    rm -f "$flyway_output"
    return 0
  else
    log "ERROR" "Failed to apply Flyway migrations to $database_name"
    cat "$flyway_output" | log "ERROR"
    # Clean up
    rm -f "$flyway_output"
    return 1
  fi
}

# Function to apply Cassandra migrations
apply_cassandra_migrations() {
  local environment="$1"
  local migration_dir="$2"
  
  log "INFO" "Applying Cassandra migrations from $migration_dir..."
  
  # Get the pod name for the Cassandra service
  local pod_name=$(kubectl get pods -l app=ims-cassandra -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for Cassandra"
    return 1
  fi
  
  # Get credentials from environment variables or use defaults
  local db_user="${CASSANDRA_USER:-cassandra}"
  local db_password="${CASSANDRA_PASSWORD:-}"
  
  # Find all CQL scripts in the migration directory
  local cql_scripts=()
  if [[ -d "$migration_dir" ]]; then
    # Sort CQL scripts by version number
    mapfile -t cql_scripts < <(find "$migration_dir" -name "*.cql" | sort -V)
  else
    log "ERROR" "Cassandra migration directory not found: $migration_dir"
    return 1
  fi
  
  if [[ ${#cql_scripts[@]} -eq 0 ]]; then
    log "WARNING" "No CQL scripts found in $migration_dir"
    return 0
  fi
  
  log "INFO" "Found ${#cql_scripts[@]} CQL scripts to apply"
  
  # Apply each CQL script
  local success=true
  for script in "${cql_scripts[@]}"; do
    local script_name=$(basename "$script")
    log "INFO" "Applying CQL script: $script_name"
    
    # Copy the script to the pod
    if ! kubectl cp "$script" "ims-$environment/$pod_name:/tmp/$script_name"; then
      log "ERROR" "Failed to copy script $script_name to Cassandra pod"
      success=false
      continue
    fi
    
    # Execute the script
    local cqlsh_cmd="cqlsh -u $db_user"
    if [[ -n "$db_password" ]]; then
      cqlsh_cmd="$cqlsh_cmd -p $db_password"
    fi
    cqlsh_cmd="$cqlsh_cmd -f /tmp/$script_name"
    
    # Create a temporary file for cqlsh output
    local cqlsh_output=$(mktemp)
    
    if ! kubectl exec "$pod_name" -n "ims-$environment" -- bash -c "$cqlsh_cmd" > "$cqlsh_output" 2>&1; then
      log "ERROR" "Failed to execute CQL script $script_name"
      cat "$cqlsh_output" | log "ERROR"
      success=false
    else
      log "INFO" "Successfully applied CQL script $script_name"
    fi
    
    # Clean up
    kubectl exec "$pod_name" -n "ims-$environment" -- rm -f "/tmp/$script_name"
    rm -f "$cqlsh_output"
  done
  
  if $success; then
    log "INFO" "All Cassandra migrations applied successfully"
    return 0
  else
    log "ERROR" "Some Cassandra migrations failed"
    return 1
  fi
}

# Function to initialize PostgreSQL database
initialize_postgresql() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  
  log "INFO" "Initializing PostgreSQL database $database_name in service $service_name..."
  
  # Wait for PostgreSQL to be ready
  if ! wait_for_postgresql "$environment" "$service_name"; then
    log "ERROR" "PostgreSQL service $service_name not ready, aborting initialization"
    return 1
  fi
  
  # Create database if it doesn't exist
  if ! create_database_if_not_exists "$environment" "$service_name" "$database_name"; then
    log "ERROR" "Failed to create database $database_name"
    return 1
  fi
  
  # Apply migrations
  if ! apply_postgresql_migrations "$environment" "$service_name" "$database_name" "$POSTGRESQL_MIGRATION_DIR"; then
    log "ERROR" "Failed to apply migrations to database $database_name"
    return 1
  fi
  
  # Verify setup if requested
  if [[ "$VERIFY" == "true" ]]; then
    if ! verify_postgresql_setup "$environment" "$service_name" "$database_name"; then
      log "ERROR" "Verification failed for PostgreSQL database $database_name"
      return 1
    fi
  fi
  
  log "INFO" "PostgreSQL database $database_name initialized successfully"
  return 0
}

# Function to initialize TimescaleDB
initialize_timescaledb() {
  local environment="$1"
  
  log "INFO" "Initializing TimescaleDB..."
  
  # For TimescaleDB, we use a specific service name and database name
  local service_name="ims-timescaledb"
  local database_name="ims_timeseries"
  
  # Wait for TimescaleDB to be ready
  if ! wait_for_postgresql "$environment" "$service_name"; then
    log "ERROR" "TimescaleDB not ready, aborting initialization"
    return 1
  fi
  
  # Create database if it doesn't exist
  if ! create_database_if_not_exists "$environment" "$service_name" "$database_name"; then
    log "ERROR" "Failed to create TimescaleDB database $database_name"
    return 1
  fi
  
  # Get the pod name for the TimescaleDB service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for TimescaleDB service"
    return 1
  fi
  
  # Create TimescaleDB extension if it doesn't exist
  log "INFO" "Creating TimescaleDB extension..."
  kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;" > /dev/null
  
  # Apply migrations
  if ! apply_postgresql_migrations "$environment" "$service_name" "$database_name" "$TIMESCALEDB_MIGRATION_DIR"; then
    log "ERROR" "Failed to apply migrations to TimescaleDB database"
    return 1
  fi
  
  # Create hypertables for time-series data
  log "INFO" "Creating hypertables for time-series data..."
  
  # Define the tables that should be converted to hypertables
  local hypertables=("prices" "basket_navs" "volatility_curves" "fx_rates" "market_data")
  
  for table in "${hypertables[@]}"; do
    log "INFO" "Creating hypertable for table: $table"
    
    # Execute SQL to create hypertable - we're assuming these tables already have a timestamp column
    local sql="SELECT create_hypertable('$table', 'timestamp', if_not_exists => TRUE);"
    
    if ! kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -c "$sql" > /dev/null; then
      log "ERROR" "Failed to create hypertable for table $table"
      return 1
    fi
  done
  
  # Configure retention policies based on environment
  log "INFO" "Configuring retention policies..."
  
  local retention_period
  case "$environment" in
    "dev")
      retention_period="interval '7 days'"
      ;;
    "staging")
      retention_period="interval '30 days'"
      ;;
    "prod")
      retention_period="interval '90 days'"
      ;;
  esac
  
  for table in "${hypertables[@]}"; do
    log "INFO" "Setting retention policy for table: $table"
    
    # Execute SQL to add a retention policy
    local sql="SELECT add_retention_policy('$table', $retention_period);"
    
    if ! kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -c "$sql" > /dev/null 2>&1; then
      log "WARNING" "Failed to set retention policy for table $table - this may be normal if the function doesn't exist"
    fi
  done
  
  # Verify setup if requested
  if [[ "$VERIFY" == "true" ]]; then
    if ! verify_timescaledb_setup "$environment"; then
      log "ERROR" "Verification failed for TimescaleDB"
      return 1
    fi
  fi
  
  log "INFO" "TimescaleDB initialized successfully"
  return 0
}

# Function to initialize Cassandra
initialize_cassandra() {
  local environment="$1"
  
  log "INFO" "Initializing Cassandra..."
  
  # Wait for Cassandra to be ready
  if ! wait_for_cassandra "$environment"; then
    log "ERROR" "Cassandra not ready, aborting initialization"
    return 1
  fi
  
  # Apply Cassandra migrations
  if ! apply_cassandra_migrations "$environment" "$CASSANDRA_MIGRATION_DIR"; then
    log "ERROR" "Failed to apply Cassandra migrations"
    return 1
  fi
  
  # Configure replication strategy based on environment
  log "INFO" "Configuring replication strategy..."
  
  local replication_strategy
  case "$environment" in
    "dev")
      replication_strategy="{'class': 'SimpleStrategy', 'replication_factor': 1}"
      ;;
    "staging")
      replication_strategy="{'class': 'NetworkTopologyStrategy', 'Americas': 2, 'Europe': 2, 'Asia-Pacific': 2}"
      ;;
    "prod")
      replication_strategy="{'class': 'NetworkTopologyStrategy', 'Americas': 3, 'Europe': 3, 'Asia-Pacific': 3}"
      ;;
  esac
  
  # Get the pod name for the Cassandra service
  local pod_name=$(kubectl get pods -l app=ims-cassandra -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for Cassandra"
    return 1
  fi
  
  # Configure replication for the keyspace
  log "INFO" "Configuring replication for keyspace ims_inventory..."
  
  local cqlsh_cmd="cqlsh -e \"ALTER KEYSPACE ims_inventory WITH replication = $replication_strategy;\""
  
  if ! kubectl exec "$pod_name" -n "ims-$environment" -- bash -c "$cqlsh_cmd" > /dev/null 2>&1; then
    log "ERROR" "Failed to configure replication for keyspace ims_inventory"
    return 1
  fi
  
  # Verify setup if requested
  if [[ "$VERIFY" == "true" ]]; then
    if ! verify_cassandra_setup "$environment"; then
      log "ERROR" "Verification failed for Cassandra"
      return 1
    fi
  fi
  
  log "INFO" "Cassandra initialized successfully"
  return 0
}

# Function to verify PostgreSQL setup
verify_postgresql_setup() {
  local environment="$1"
  local service_name="$2"
  local database_name="$3"
  
  log "INFO" "Verifying PostgreSQL setup for database $database_name..."
  
  # Get the pod name for the PostgreSQL service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for PostgreSQL service: $service_name"
    return 1
  fi
  
  # Verify database exists
  local db_exists=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$database_name'")
  
  if [[ "$db_exists" != "1" ]]; then
    log "ERROR" "Database $database_name does not exist"
    return 1
  fi
  
  # Define required extensions based on the database
  local required_extensions=("uuid-ossp" "pgcrypto" "btree_gist")
  
  # Verify required extensions are installed
  log "INFO" "Verifying required extensions..."
  
  for ext in "${required_extensions[@]}"; do
    local ext_exists=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -tAc "SELECT 1 FROM pg_extension WHERE extname='$ext'")
    
    if [[ "$ext_exists" != "1" ]]; then
      log "ERROR" "Required extension $ext is not installed in database $database_name"
      return 1
    fi
  done
  
  # Verify essential tables exist based on the database
  log "INFO" "Verifying essential tables..."
  
  local tables_query="SELECT count(tablename) FROM pg_tables WHERE schemaname='public'"
  local table_count=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -tAc "$tables_query")
  
  if [[ "$table_count" -eq "0" ]]; then
    log "ERROR" "No tables found in database $database_name"
    return 1
  fi
  
  log "INFO" "Database $database_name has $table_count tables"
  
  # Verify Flyway schema history table exists
  local flyway_exists=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='flyway_schema_history'")
  
  if [[ "$flyway_exists" != "1" ]]; then
    log "ERROR" "Flyway schema history table does not exist in database $database_name"
    return 1
  fi
  
  log "INFO" "PostgreSQL setup verification passed for database $database_name"
  return 0
}

# Function to verify TimescaleDB setup
verify_timescaledb_setup() {
  local environment="$1"
  
  log "INFO" "Verifying TimescaleDB setup..."
  
  # For TimescaleDB, we use a specific service name and database name
  local service_name="ims-timescaledb"
  local database_name="ims_timeseries"
  
  # Get the pod name for the TimescaleDB service
  local pod_name=$(kubectl get pods -l app="$service_name" -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for TimescaleDB service"
    return 1
  fi
  
  # Verify database exists
  local db_exists=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$database_name'")
  
  if [[ "$db_exists" != "1" ]]; then
    log "ERROR" "Database $database_name does not exist"
    return 1
  fi
  
  # Verify TimescaleDB extension is installed
  local ext_exists=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -tAc "SELECT 1 FROM pg_extension WHERE extname='timescaledb'")
  
  if [[ "$ext_exists" != "1" ]]; then
    log "ERROR" "TimescaleDB extension is not installed"
    return 1
  fi
  
  # Verify hypertables are created
  log "INFO" "Verifying hypertables..."
  
  local hypertables=("prices" "basket_navs" "volatility_curves" "fx_rates" "market_data")
  
  for table in "${hypertables[@]}"; do
    local hypertable_query="SELECT 1 FROM _timescaledb_catalog.hypertable WHERE table_name='$table'"
    local hypertable_exists=$(kubectl exec "$pod_name" -n "ims-$environment" -- psql -U postgres -d "$database_name" -tAc "$hypertable_query")
    
    if [[ "$hypertable_exists" != "1" ]]; then
      log "ERROR" "Hypertable $table is not configured"
      return 1
    fi
  done
  
  log "INFO" "TimescaleDB setup verification passed"
  return 0
}

# Function to verify Cassandra setup
verify_cassandra_setup() {
  local environment="$1"
  
  log "INFO" "Verifying Cassandra setup..."
  
  # Get the pod name for the Cassandra service
  local pod_name=$(kubectl get pods -l app=ims-cassandra -n "ims-$environment" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
  
  if [[ -z "$pod_name" ]]; then
    log "ERROR" "No pod found for Cassandra"
    return 1
  fi
  
  # Verify keyspace exists
  local cqlsh_cmd="cqlsh -e \"DESCRIBE KEYSPACES;\" | grep ims_inventory"
  local keyspace_exists=$(kubectl exec "$pod_name" -n "ims-$environment" -- bash -c "$cqlsh_cmd" 2>/dev/null)
  
  if [[ -z "$keyspace_exists" ]]; then
    log "ERROR" "Keyspace ims_inventory does not exist"
    return 1
  fi
  
  # Verify tables exist in the keyspace
  log "INFO" "Verifying tables in keyspace ims_inventory..."
  
  local cqlsh_cmd="cqlsh -e \"DESCRIBE TABLES FROM ims_inventory;\""
  local tables=$(kubectl exec "$pod_name" -n "ims-$environment" -- bash -c "$cqlsh_cmd" 2>/dev/null)
  
  if [[ -z "$tables" ]]; then
    log "ERROR" "No tables found in keyspace ims_inventory"
    return 1
  fi
  
  # Verify replication configuration
  log "INFO" "Verifying replication configuration..."
  
  local cqlsh_cmd="cqlsh -e \"DESCRIBE KEYSPACE ims_inventory;\" | grep 'replication'"
  local replication_config=$(kubectl exec "$pod_name" -n "ims-$environment" -- bash -c "$cqlsh_cmd" 2>/dev/null)
  
  if [[ -z "$replication_config" ]]; then
    log "ERROR" "Could not retrieve replication configuration"
    return 1
  fi
  
  log "INFO" "Cassandra replication configuration: $replication_config"
  
  # Check replication strategy based on environment
  case "$environment" in
    "dev")
      if ! echo "$replication_config" | grep -q "SimpleStrategy"; then
        log "ERROR" "Expected SimpleStrategy for dev environment"
        return 1
      fi
      ;;
    "staging"|"prod")
      if ! echo "$replication_config" | grep -q "NetworkTopologyStrategy"; then
        log "ERROR" "Expected NetworkTopologyStrategy for $environment environment"
        return 1
      fi
      ;;
  esac
  
  log "INFO" "Cassandra setup verification passed"
  return 0
}

# Main function
main() {
  local ENVIRONMENT="$DEFAULT_ENVIRONMENT"
  local COMPONENTS="all"
  local DATABASE="all"
  local VERIFY="true"
  local FORCE="false"
  local EXIT_CODE=0
  
  # Parse command line arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -e|--environment)
        ENVIRONMENT="$2"
        shift 2
        ;;
      -c|--components)
        COMPONENTS="$2"
        shift 2
        ;;
      -d|--database)
        DATABASE="$2"
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
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done
  
  # Set up logging
  log "INFO" "===== IMS Database Initialization Script ====="
  log "INFO" "Environment: $ENVIRONMENT"
  log "INFO" "Components: $COMPONENTS"
  log "INFO" "Database: $DATABASE"
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
  
  # Initialize PostgreSQL databases if requested
  if [[ "$COMPONENTS" == "all" || "$COMPONENTS" == *"postgresql"* ]]; then
    log "INFO" "Initializing PostgreSQL databases..."
    
    if [[ "$DATABASE" == "all" ]]; then
      # Initialize all PostgreSQL databases
      initialize_postgresql "$ENVIRONMENT" "ims-data-ingestion-db" "ims_ingestion" || { log "ERROR" "Failed to initialize ims_ingestion database"; EXIT_CODE=1; }
      initialize_postgresql "$ENVIRONMENT" "ims-calculation-db" "ims_calculation" || { log "ERROR" "Failed to initialize ims_calculation database"; EXIT_CODE=1; }
      initialize_postgresql "$ENVIRONMENT" "ims-workflow-db" "ims_workflow" || { log "ERROR" "Failed to initialize ims_workflow database"; EXIT_CODE=1; }
      initialize_postgresql "$ENVIRONMENT" "ims-auth-db" "ims_auth" || { log "ERROR" "Failed to initialize ims_auth database"; EXIT_CODE=1; }
    else
      # Initialize specific PostgreSQL database
      case "$DATABASE" in
        "ims_ingestion")
          initialize_postgresql "$ENVIRONMENT" "ims-data-ingestion-db" "ims_ingestion" || { log "ERROR" "Failed to initialize ims_ingestion database"; EXIT_CODE=1; }
          ;;
        "ims_calculation")
          initialize_postgresql "$ENVIRONMENT" "ims-calculation-db" "ims_calculation" || { log "ERROR" "Failed to initialize ims_calculation database"; EXIT_CODE=1; }
          ;;
        "ims_workflow")
          initialize_postgresql "$ENVIRONMENT" "ims-workflow-db" "ims_workflow" || { log "ERROR" "Failed to initialize ims_workflow database"; EXIT_CODE=1; }
          ;;
        "ims_auth")
          initialize_postgresql "$ENVIRONMENT" "ims-auth-db" "ims_auth" || { log "ERROR" "Failed to initialize ims_auth database"; EXIT_CODE=1; }
          ;;
        *)
          log "ERROR" "Unknown PostgreSQL database: $DATABASE"
          EXIT_CODE=1
          ;;
      esac
    fi
  fi
  
  # Initialize TimescaleDB if requested
  if [[ "$COMPONENTS" == "all" || "$COMPONENTS" == *"timescaledb"* ]]; then
    log "INFO" "Initializing TimescaleDB..."
    initialize_timescaledb "$ENVIRONMENT" || { log "ERROR" "Failed to initialize TimescaleDB"; EXIT_CODE=1; }
  fi
  
  # Initialize Cassandra if requested
  if [[ "$COMPONENTS" == "all" || "$COMPONENTS" == *"cassandra"* ]]; then
    log "INFO" "Initializing Cassandra..."
    initialize_cassandra "$ENVIRONMENT" || { log "ERROR" "Failed to initialize Cassandra"; EXIT_CODE=1; }
  fi
  
  if [[ "$EXIT_CODE" -eq 0 ]]; then
    log "INFO" "Database initialization completed successfully"
  else
    log "ERROR" "Database initialization completed with errors"
  fi
  
  return $EXIT_CODE
}

# Trap signals for clean exit
trap 'log "INFO" "Script interrupted, exiting..."; exit 1' INT TERM

# Ensure secure handling of credentials
cleanup() {
  # Clean up any temporary files or sensitive data
  unset POSTGRES_PASSWORD
  unset CASSANDRA_PASSWORD
  log "INFO" "Cleanup complete, exiting with code $1"
  exit $1
}

# Execute main function with all arguments
main "$@"
EXIT_CODE=$?
cleanup $EXIT_CODE