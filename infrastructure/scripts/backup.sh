#!/bin/bash
#
# backup.sh - Comprehensive backup script for the Inventory Management System (IMS)
#
# This script automates the process of backing up all IMS components including:
# - PostgreSQL databases (reference data, calculation data, workflow data, auth data)
# - TimescaleDB time-series data (market data)
# - Cassandra keyspaces (position and inventory data, analytics, audit)
# - Redis caches (session data)
# - Kubernetes configuration resources (ConfigMaps, Secrets, Deployments, etc.)
#
# The script supports local and cloud-based (S3) backup destinations, implements
# encryption, compression, and verification to ensure backup integrity.
#
# Dependencies:
# - aws-cli (latest) - For S3 storage operations
# - kubectl (latest) - For accessing database pods
# - postgresql-client (15+) - For PostgreSQL backup utility
# - cassandra-tools (4.1+) - For Cassandra administration and snapshots
# - redis-tools (7.0+) - For Redis command-line interface
#
# Usage: ./backup.sh [options]
#   Options:
#     -e, --environment ENV       Target environment (dev, staging, prod)
#     -c, --components LIST       Comma-separated list of components to backup
#                                (postgresql,timescaledb,cassandra,redis,config,all)
#     -d, --database DB           Specific database to backup (for PostgreSQL component)
#     -k, --keyspace KEYSPACE     Specific keyspace to backup (for Cassandra component)
#     -l, --local-only            Store backups locally only, do not upload to S3
#     -s, --s3-only               Upload backups to S3 only, do not keep local copies
#     -n, --no-encryption         Do not encrypt backup files
#     -f, --force                 Force backup even if system health check fails
#     -r, --retention-days DAYS   Number of days to retain backups
#     -k, --encryption-key FILE   Path to encryption key file
#     -h, --help                  Display help information
#
# Environment Variables:
#   AWS_PROFILE                  AWS profile to use for authentication
#   KUBECONFIG                   Path to Kubernetes configuration file
#   BACKUP_ENCRYPTION_KEY        Path to GPG encryption key for backup encryption
#   BACKUP_NOTIFICATION_EMAIL    Email address for backup notifications
#   BACKUP_SLACK_WEBHOOK         Slack webhook URL for backup notifications
#   BACKUP_LOG_LEVEL             Log level for backup script
#   S3_BACKUP_BUCKET             S3 bucket name for backups
#   SECONDARY_REGION             Secondary AWS region for backup replication
#
# Returns:
#   0 if backup is successful, non-zero otherwise

# Enable stricter bash mode
set -o errexit
set -o pipefail
set -o nounset

# Set script directory and project root
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/../.." && pwd)
LOG_FILE="${PROJECT_ROOT}/logs/backup_$(date +%Y%m%d_%H%M%S).log"

# Default values
DEFAULT_ENVIRONMENT="dev"
BACKUP_ROOT="${PROJECT_ROOT}/backups"
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
S3_BUCKET_PREFIX="ims-backups"
ENCRYPTION_KEY_PATH="/etc/ims/backup-encryption-key.gpg"

# Source the health check script to use its functions
source "${SCRIPT_DIR}/health-check.sh"

# Display script usage information
usage() {
    echo "Usage: $0 [options]"
    echo
    echo "Comprehensive backup script for the Inventory Management System (IMS)"
    echo
    echo "Options:"
    echo "  -e, --environment ENV       Target environment (dev, staging, prod)"
    echo "                              Default: ${DEFAULT_ENVIRONMENT}"
    echo "  -c, --components LIST       Comma-separated list of components to backup"
    echo "                              (postgresql,timescaledb,cassandra,redis,config,all)"
    echo "                              Default: all"
    echo "  -d, --database DB           Specific database to backup (for PostgreSQL component)"
    echo "                              Default: all"
    echo "  -k, --keyspace KEYSPACE     Specific keyspace to backup (for Cassandra component)"
    echo "                              Default: all"
    echo "  -l, --local-only            Store backups locally only, do not upload to S3"
    echo "  -s, --s3-only               Upload backups to S3 only, do not keep local copies"
    echo "  -n, --no-encryption         Do not encrypt backup files"
    echo "  -f, --force                 Force backup even if system health check fails"
    echo "  -r, --retention-days DAYS   Number of days to retain backups"
    echo "                              Default: Use component-specific policy"
    echo "  --encryption-key FILE       Path to encryption key file"
    echo "                              Default: ${ENCRYPTION_KEY_PATH}"
    echo "  -h, --help                  Display this help message"
    echo
    echo "Examples:"
    echo "  $0 -e prod -c postgresql,cassandra"
    echo "  $0 -e staging -d ims_calculation -l"
    echo "  $0 -e dev -c all -r 14"
    echo
    echo "Environment Variables:"
    echo "  AWS_PROFILE                 AWS profile to use for authentication"
    echo "  KUBECONFIG                  Path to Kubernetes configuration file"
    echo "  BACKUP_ENCRYPTION_KEY       Path to GPG encryption key for backup encryption"
    echo "  BACKUP_NOTIFICATION_EMAIL   Email address for backup notifications"
    echo "  BACKUP_SLACK_WEBHOOK        Slack webhook URL for backup notifications"
    echo "  BACKUP_LOG_LEVEL            Log level for backup script"
    echo "  S3_BACKUP_BUCKET            S3 bucket name for backups"
    echo "  SECONDARY_REGION            Secondary AWS region for backup replication"
}

# Function to log messages to both console and log file
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local log_entry="[${timestamp}] [${level}] ${message}"
    
    # Print to stdout
    echo "${log_entry}"
    
    # Ensure log directory exists
    mkdir -p "$(dirname "${LOG_FILE}")"
    
    # Append to log file
    echo "${log_entry}" >> "${LOG_FILE}"
}

# Function to set up the backup environment
setup_environment() {
    local environment="$1"
    local result=0
    
    log "INFO" "Setting up backup environment for: ${environment}"
    
    # Validate environment
    case "${environment}" in
        dev|staging|prod)
            log "INFO" "Using valid environment: ${environment}"
            ;;
        *)
            log "ERROR" "Invalid environment: ${environment}. Must be one of: dev, staging, prod"
            return 1
            ;;
    esac
    
    # Create backup directories
    local backup_dir="${BACKUP_ROOT}/${environment}/${BACKUP_TIMESTAMP}"
    mkdir -p "${backup_dir}"
    mkdir -p "${backup_dir}/postgresql"
    mkdir -p "${backup_dir}/timescaledb"
    mkdir -p "${backup_dir}/cassandra"
    mkdir -p "${backup_dir}/redis"
    mkdir -p "${backup_dir}/config"
    
    log "INFO" "Created backup directories in ${backup_dir}"
    
    # Set environment-specific variables
    case "${environment}" in
        dev)
            export AWS_PROFILE="${AWS_PROFILE:-ims-dev}"
            export KUBECONFIG="${KUBECONFIG:-${HOME}/.kube/config-dev}"
            ;;
        staging)
            export AWS_PROFILE="${AWS_PROFILE:-ims-staging}"
            export KUBECONFIG="${KUBECONFIG:-${HOME}/.kube/config-staging}"
            ;;
        prod)
            export AWS_PROFILE="${AWS_PROFILE:-ims-prod}"
            export KUBECONFIG="${KUBECONFIG:-${HOME}/.kube/config-prod}"
            ;;
    esac
    
    # Configure kubectl context for the environment
    if ! kubectl config use-context "ims-${environment}" > /dev/null 2>&1; then
        log "WARNING" "Failed to set kubectl context to ims-${environment}. Using current context."
    else
        log "INFO" "Set kubectl context to ims-${environment}"
    fi
    
    # Return success
    return $result
}

# Function to check if all required tools are installed
check_prerequisites() {
    local missing_tools=()
    
    log "INFO" "Checking prerequisites"
    
    # Check required tools
    if ! command -v aws > /dev/null 2>&1; then
        missing_tools+=("aws")
    fi
    
    if ! command -v kubectl > /dev/null 2>&1; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v pg_dump > /dev/null 2>&1; then
        missing_tools+=("pg_dump")
    fi
    
    if ! command -v nodetool > /dev/null 2>&1; then
        missing_tools+=("nodetool")
    fi
    
    if ! command -v redis-cli > /dev/null 2>&1; then
        missing_tools+=("redis-cli")
    fi
    
    if ! command -v gpg > /dev/null 2>&1; then
        missing_tools+=("gpg")
    fi
    
    # Report missing tools
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log "ERROR" "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    log "INFO" "All required tools are installed"
    return 0
}

# Function to verify system health before backup
verify_system_health() {
    local environment="$1"
    local result=0
    
    log "INFO" "Verifying system health for environment: ${environment}"
    
    # Check critical services
    local services=("api-gateway" "data-ingestion-service" "calculation-service" "position-service" "inventory-service")
    
    for service in "${services[@]}"; do
        if ! check_service_health "${service}" "http://${service}.ims-${environment}.svc.cluster.local:8080/health"; then
            log "WARNING" "Service ${service} is not healthy"
            result=1
        else
            log "INFO" "Service ${service} is healthy"
        fi
    done
    
    # Check database connectivity
    # These checks are simplified; health-check.sh would have more robust checks
    log "INFO" "Checking database connectivity"
    
    # Check if we can access the Kubernetes cluster
    if ! kubectl get ns > /dev/null 2>&1; then
        log "ERROR" "Cannot access Kubernetes cluster"
        return 1
    fi
    
    # Return health status
    if [ $result -ne 0 ]; then
        log "WARNING" "System health check detected issues. Use --force to proceed anyway."
    else
        log "INFO" "System health verification passed"
    fi
    
    return $result
}

# Function to back up PostgreSQL databases
backup_postgresql() {
    local environment="$1"
    local database_name="${2:-all}"
    local result=0
    local backup_dir="${BACKUP_ROOT}/${environment}/${BACKUP_TIMESTAMP}/postgresql"
    
    log "INFO" "Starting PostgreSQL backup for environment: ${environment}, database: ${database_name}"
    
    # Get list of PostgreSQL pods
    local postgres_pods=$(kubectl get pods -n "ims-${environment}" -l app=postgresql -o jsonpath="{.items[*].metadata.name}")
    
    if [ -z "${postgres_pods}" ]; then
        log "ERROR" "No PostgreSQL pods found in namespace ims-${environment}"
        return 1
    fi
    
    # Process each PostgreSQL pod or specific database
    for pod in $postgres_pods; do
        local pod_label=$(kubectl get pod ${pod} -n "ims-${environment}" -o jsonpath="{.metadata.labels.app\.kubernetes\.io/name}")
        
        # Skip if a specific database was requested and this pod doesn't match
        if [ "${database_name}" != "all" ] && [[ ! "${pod}" =~ ${database_name} ]]; then
            log "INFO" "Skipping pod ${pod} as it doesn't match requested database: ${database_name}"
            continue
        fi
        
        log "INFO" "Processing PostgreSQL pod: ${pod}"
        
        # Get list of databases in this pod
        local databases=$(kubectl exec -n "ims-${environment}" ${pod} -- psql -U postgres -t -c "SELECT datname FROM pg_database WHERE datname NOT IN ('template0', 'template1', 'postgres')" | grep -v "^\s*$")
        
        for db in $databases; do
            local db_backup_file="${backup_dir}/${db}_${BACKUP_TIMESTAMP}.dump"
            
            log "INFO" "Backing up database: ${db} from pod: ${pod}"
            
            # Execute pg_dump to create backup
            if ! kubectl exec -n "ims-${environment}" ${pod} -- pg_dump -U postgres -Fc -v -f "/tmp/${db}_${BACKUP_TIMESTAMP}.dump" ${db}; then
                log "ERROR" "Failed to create PostgreSQL backup for database: ${db}"
                result=1
                continue
            fi
            
            # Copy the backup file from the pod
            if ! kubectl cp "ims-${environment}/${pod}:/tmp/${db}_${BACKUP_TIMESTAMP}.dump" "${db_backup_file}"; then
                log "ERROR" "Failed to copy PostgreSQL backup from pod: ${pod}"
                result=1
                continue
            fi
            
            # Clean up temporary file in pod
            kubectl exec -n "ims-${environment}" ${pod} -- rm "/tmp/${db}_${BACKUP_TIMESTAMP}.dump"
            
            # WAL archive for point-in-time recovery (if pod supports it)
            if kubectl exec -n "ims-${environment}" ${pod} -- bash -c "test -d /var/lib/postgresql/data/pg_wal" > /dev/null 2>&1; then
                local wal_backup_file="${backup_dir}/${db}_${BACKUP_TIMESTAMP}_wal.tar.gz"
                
                log "INFO" "Creating WAL archive for database: ${db}"
                
                # Archive WAL files
                if ! kubectl exec -n "ims-${environment}" ${pod} -- bash -c "tar -czf /tmp/${db}_${BACKUP_TIMESTAMP}_wal.tar.gz -C /var/lib/postgresql/data pg_wal"; then
                    log "WARNING" "Failed to create WAL archive for database: ${db}"
                else
                    # Copy the WAL archive from the pod
                    if ! kubectl cp "ims-${environment}/${pod}:/tmp/${db}_${BACKUP_TIMESTAMP}_wal.tar.gz" "${wal_backup_file}"; then
                        log "WARNING" "Failed to copy WAL archive from pod: ${pod}"
                    else
                        log "INFO" "WAL archive created for database: ${db}"
                    fi
                    
                    # Clean up temporary file in pod
                    kubectl exec -n "ims-${environment}" ${pod} -- rm "/tmp/${db}_${BACKUP_TIMESTAMP}_wal.tar.gz"
                fi
            fi
            
            # Compress backup file (if not already compressed)
            if ! compress_backup "${db_backup_file}" "${db_backup_file}.gz"; then
                log "WARNING" "Failed to compress PostgreSQL backup: ${db_backup_file}"
            else
                # Remove original file after successful compression
                rm "${db_backup_file}"
                db_backup_file="${db_backup_file}.gz"
            fi
            
            # Encrypt backup file (if encryption is enabled)
            if [ "${NO_ENCRYPTION:-false}" != "true" ]; then
                if ! encrypt_backup "${db_backup_file}" "${db_backup_file}.gpg"; then
                    log "WARNING" "Failed to encrypt PostgreSQL backup: ${db_backup_file}"
                else
                    # Remove original file after successful encryption
                    rm "${db_backup_file}"
                    db_backup_file="${db_backup_file}.gpg"
                fi
            fi
            
            # Generate checksum
            if ! generate_checksum "${db_backup_file}"; then
                log "WARNING" "Failed to generate checksum for: ${db_backup_file}"
            fi
            
            # Verify backup integrity
            if ! verify_backup "${db_backup_file}" "${db_backup_file}.sha256"; then
                log "ERROR" "Backup verification failed for: ${db_backup_file}"
                result=1
            else
                log "INFO" "Backup verification passed for: ${db_backup_file}"
            fi
            
            log "INFO" "PostgreSQL backup completed for database: ${db}"
        done
    done
    
    if [ $result -eq 0 ]; then
        log "INFO" "PostgreSQL backup completed successfully"
    else
        log "ERROR" "PostgreSQL backup completed with errors"
    fi
    
    return $result
}

# Function to back up TimescaleDB time-series databases
backup_timescaledb() {
    local environment="$1"
    local result=0
    local backup_dir="${BACKUP_ROOT}/${environment}/${BACKUP_TIMESTAMP}/timescaledb"
    
    log "INFO" "Starting TimescaleDB backup for environment: ${environment}"
    
    # Get list of TimescaleDB pods
    local timescaledb_pods=$(kubectl get pods -n "ims-${environment}" -l app=timescaledb -o jsonpath="{.items[*].metadata.name}")
    
    if [ -z "${timescaledb_pods}" ]; then
        log "ERROR" "No TimescaleDB pods found in namespace ims-${environment}"
        return 1
    fi
    
    # Process each TimescaleDB pod
    for pod in $timescaledb_pods; do
        log "INFO" "Processing TimescaleDB pod: ${pod}"
        
        # Get list of databases in this pod
        local databases=$(kubectl exec -n "ims-${environment}" ${pod} -- psql -U postgres -t -c "SELECT datname FROM pg_database WHERE datname NOT IN ('template0', 'template1', 'postgres')" | grep -v "^\s*$")
        
        for db in $databases; do
            local db_backup_file="${backup_dir}/${db}_${BACKUP_TIMESTAMP}.dump"
            
            log "INFO" "Backing up TimescaleDB database: ${db} from pod: ${pod}"
            
            # Execute pg_dump with TimescaleDB-specific options
            if ! kubectl exec -n "ims-${environment}" ${pod} -- pg_dump -U postgres -Fc -v --no-owner --include-extension=timescaledb -f "/tmp/${db}_${BACKUP_TIMESTAMP}.dump" ${db}; then
                log "ERROR" "Failed to create TimescaleDB backup for database: ${db}"
                result=1
                continue
            fi
            
            # Copy the backup file from the pod
            if ! kubectl cp "ims-${environment}/${pod}:/tmp/${db}_${BACKUP_TIMESTAMP}.dump" "${db_backup_file}"; then
                log "ERROR" "Failed to copy TimescaleDB backup from pod: ${pod}"
                result=1
                continue
            fi
            
            # Clean up temporary file in pod
            kubectl exec -n "ims-${environment}" ${pod} -- rm "/tmp/${db}_${BACKUP_TIMESTAMP}.dump"
            
            # WAL archive for point-in-time recovery (if pod supports it)
            if kubectl exec -n "ims-${environment}" ${pod} -- bash -c "test -d /var/lib/postgresql/data/pg_wal" > /dev/null 2>&1; then
                local wal_backup_file="${backup_dir}/${db}_${BACKUP_TIMESTAMP}_wal.tar.gz"
                
                log "INFO" "Creating WAL archive for TimescaleDB database: ${db}"
                
                # Archive WAL files
                if ! kubectl exec -n "ims-${environment}" ${pod} -- bash -c "tar -czf /tmp/${db}_${BACKUP_TIMESTAMP}_wal.tar.gz -C /var/lib/postgresql/data pg_wal"; then
                    log "WARNING" "Failed to create WAL archive for TimescaleDB database: ${db}"
                else
                    # Copy the WAL archive from the pod
                    if ! kubectl cp "ims-${environment}/${pod}:/tmp/${db}_${BACKUP_TIMESTAMP}_wal.tar.gz" "${wal_backup_file}"; then
                        log "WARNING" "Failed to copy WAL archive from pod: ${pod}"
                    else
                        log "INFO" "WAL archive created for TimescaleDB database: ${db}"
                    fi
                    
                    # Clean up temporary file in pod
                    kubectl exec -n "ims-${environment}" ${pod} -- rm "/tmp/${db}_${BACKUP_TIMESTAMP}_wal.tar.gz"
                fi
            fi
            
            # Compress backup file (if not already compressed)
            if ! compress_backup "${db_backup_file}" "${db_backup_file}.gz"; then
                log "WARNING" "Failed to compress TimescaleDB backup: ${db_backup_file}"
            else
                # Remove original file after successful compression
                rm "${db_backup_file}"
                db_backup_file="${db_backup_file}.gz"
            fi
            
            # Encrypt backup file (if encryption is enabled)
            if [ "${NO_ENCRYPTION:-false}" != "true" ]; then
                if ! encrypt_backup "${db_backup_file}" "${db_backup_file}.gpg"; then
                    log "WARNING" "Failed to encrypt TimescaleDB backup: ${db_backup_file}"
                else
                    # Remove original file after successful encryption
                    rm "${db_backup_file}"
                    db_backup_file="${db_backup_file}.gpg"
                fi
            fi
            
            # Generate checksum
            if ! generate_checksum "${db_backup_file}"; then
                log "WARNING" "Failed to generate checksum for: ${db_backup_file}"
            fi
            
            # Verify backup integrity
            if ! verify_backup "${db_backup_file}" "${db_backup_file}.sha256"; then
                log "ERROR" "Backup verification failed for: ${db_backup_file}"
                result=1
            else
                log "INFO" "Backup verification passed for: ${db_backup_file}"
            fi
            
            log "INFO" "TimescaleDB backup completed for database: ${db}"
        done
    done
    
    if [ $result -eq 0 ]; then
        log "INFO" "TimescaleDB backup completed successfully"
    else
        log "ERROR" "TimescaleDB backup completed with errors"
    fi
    
    return $result
}

# Function to back up Cassandra keyspaces
backup_cassandra() {
    local environment="$1"
    local keyspace_name="${2:-all}"
    local result=0
    local backup_dir="${BACKUP_ROOT}/${environment}/${BACKUP_TIMESTAMP}/cassandra"
    
    log "INFO" "Starting Cassandra backup for environment: ${environment}, keyspace: ${keyspace_name}"
    
    # Get list of Cassandra pods
    local cassandra_pods=$(kubectl get pods -n "ims-${environment}" -l app=cassandra -o jsonpath="{.items[*].metadata.name}")
    
    if [ -z "${cassandra_pods}" ]; then
        log "ERROR" "No Cassandra pods found in namespace ims-${environment}"
        return 1
    fi
    
    # Select first Cassandra pod for keyspace listing (assumes all nodes have same keyspaces)
    local cassandra_pod=$(echo "${cassandra_pods}" | head -n1 | awk '{print $1}')
    
    # Get list of keyspaces
    local keyspaces=""
    if [ "${keyspace_name}" != "all" ]; then
        keyspaces="${keyspace_name}"
    else
        keyspaces=$(kubectl exec -n "ims-${environment}" ${cassandra_pod} -- cqlsh -e "DESCRIBE KEYSPACES;" | grep -v "system\|system_schema\|system_auth\|system_distributed\|system_traces")
    fi
    
    if [ -z "${keyspaces}" ]; then
        log "ERROR" "No keyspaces found to backup in Cassandra"
        return 1
    fi
    
    # Process each keyspace
    for keyspace in $keyspaces; do
        log "INFO" "Backing up Cassandra keyspace: ${keyspace}"
        
        local keyspace_backup_dir="${backup_dir}/${keyspace}"
        mkdir -p "${keyspace_backup_dir}"
        
        # Create snapshot with current timestamp as name
        log "INFO" "Creating snapshot for keyspace: ${keyspace}"
        
        if ! kubectl exec -n "ims-${environment}" ${cassandra_pod} -- nodetool snapshot -t "backup_${BACKUP_TIMESTAMP}" "${keyspace}"; then
            log "ERROR" "Failed to create snapshot for keyspace: ${keyspace}"
            result=1
            continue
        fi
        
        # Process each Cassandra pod for this keyspace
        for pod in $cassandra_pods; do
            local pod_backup_dir="${keyspace_backup_dir}/$(kubectl get pod ${pod} -n "ims-${environment}" -o jsonpath="{.status.podIP}")"
            mkdir -p "${pod_backup_dir}"
            
            log "INFO" "Copying snapshot data from pod: ${pod}"
            
            # Find snapshot files for this keyspace
            local snapshot_dirs=$(kubectl exec -n "ims-${environment}" ${pod} -- find /var/lib/cassandra/data/${keyspace} -name "snapshots" -type d)
            
            for snapshot_dir in $snapshot_dirs; do
                # Get table name from path
                local table_dir=$(dirname "${snapshot_dir}")
                local table_name=$(basename "${table_dir}")
                
                # Create table directory in backup
                mkdir -p "${pod_backup_dir}/${table_name}"
                
                # Copy snapshot files
                if ! kubectl exec -n "ims-${environment}" ${pod} -- tar -czf "/tmp/${table_name}_snapshot.tar.gz" -C "${snapshot_dir}/backup_${BACKUP_TIMESTAMP}" .; then
                    log "ERROR" "Failed to create snapshot archive for table: ${table_name} on pod: ${pod}"
                    result=1
                    continue
                fi
                
                # Copy the snapshot archive from the pod
                if ! kubectl cp "ims-${environment}/${pod}:/tmp/${table_name}_snapshot.tar.gz" "${pod_backup_dir}/${table_name}/snapshot.tar.gz"; then
                    log "ERROR" "Failed to copy snapshot archive from pod: ${pod}"
                    result=1
                    continue
                fi
                
                # Clean up temporary file in pod
                kubectl exec -n "ims-${environment}" ${pod} -- rm "/tmp/${table_name}_snapshot.tar.gz"
                
                # Encrypt backup file (if encryption is enabled)
                if [ "${NO_ENCRYPTION:-false}" != "true" ]; then
                    if ! encrypt_backup "${pod_backup_dir}/${table_name}/snapshot.tar.gz" "${pod_backup_dir}/${table_name}/snapshot.tar.gz.gpg"; then
                        log "WARNING" "Failed to encrypt snapshot for table: ${table_name}"
                    else
                        # Remove original file after successful encryption
                        rm "${pod_backup_dir}/${table_name}/snapshot.tar.gz"
                    fi
                fi
            done
        done
        
        # Create schema dump for the keyspace
        log "INFO" "Creating schema dump for keyspace: ${keyspace}"
        
        if ! kubectl exec -n "ims-${environment}" ${cassandra_pod} -- cqlsh -e "DESCRIBE KEYSPACE ${keyspace};" > "${keyspace_backup_dir}/schema.cql"; then
            log "ERROR" "Failed to create schema dump for keyspace: ${keyspace}"
            result=1
        else
            # Encrypt schema file (if encryption is enabled)
            if [ "${NO_ENCRYPTION:-false}" != "true" ]; then
                if ! encrypt_backup "${keyspace_backup_dir}/schema.cql" "${keyspace_backup_dir}/schema.cql.gpg"; then
                    log "WARNING" "Failed to encrypt schema file for keyspace: ${keyspace}"
                else
                    # Remove original file after successful encryption
                    rm "${keyspace_backup_dir}/schema.cql"
                fi
            fi
        fi
        
        # Create compressed archive of the entire keyspace backup
        log "INFO" "Creating compressed archive for keyspace: ${keyspace}"
        
        if ! tar -czf "${backup_dir}/${keyspace}_${BACKUP_TIMESTAMP}.tar.gz" -C "${backup_dir}" "${keyspace}"; then
            log "ERROR" "Failed to create compressed archive for keyspace: ${keyspace}"
            result=1
        else
            # Remove directory after successful compression
            rm -rf "${keyspace_backup_dir}"
            
            # Generate checksum for the archive
            if ! generate_checksum "${backup_dir}/${keyspace}_${BACKUP_TIMESTAMP}.tar.gz"; then
                log "WARNING" "Failed to generate checksum for keyspace archive: ${keyspace}"
            fi
            
            # Verify backup integrity
            if ! verify_backup "${backup_dir}/${keyspace}_${BACKUP_TIMESTAMP}.tar.gz" "${backup_dir}/${keyspace}_${BACKUP_TIMESTAMP}.tar.gz.sha256"; then
                log "ERROR" "Backup verification failed for keyspace archive: ${keyspace}"
                result=1
            else
                log "INFO" "Backup verification passed for keyspace archive: ${keyspace}"
            fi
        fi
        
        # Clear snapshot to free space
        log "INFO" "Clearing snapshot for keyspace: ${keyspace}"
        
        if ! kubectl exec -n "ims-${environment}" ${cassandra_pod} -- nodetool clearsnapshot -t "backup_${BACKUP_TIMESTAMP}" "${keyspace}"; then
            log "WARNING" "Failed to clear snapshot for keyspace: ${keyspace}"
        fi
        
        log "INFO" "Cassandra backup completed for keyspace: ${keyspace}"
    done
    
    if [ $result -eq 0 ]; then
        log "INFO" "Cassandra backup completed successfully"
    else
        log "ERROR" "Cassandra backup completed with errors"
    fi
    
    return $result
}

# Function to back up Redis data
backup_redis() {
    local environment="$1"
    local result=0
    local backup_dir="${BACKUP_ROOT}/${environment}/${BACKUP_TIMESTAMP}/redis"
    
    log "INFO" "Starting Redis backup for environment: ${environment}"
    
    # Get list of Redis pods
    local redis_pods=$(kubectl get pods -n "ims-${environment}" -l app=redis -o jsonpath="{.items[*].metadata.name}")
    
    if [ -z "${redis_pods}" ]; then
        log "ERROR" "No Redis pods found in namespace ims-${environment}"
        return 1
    fi
    
    # Process each Redis pod
    for pod in $redis_pods; do
        local pod_label=$(kubectl get pod ${pod} -n "ims-${environment}" -o jsonpath="{.metadata.labels.app\.kubernetes\.io/name}")
        local redis_backup_file="${backup_dir}/${pod}_${BACKUP_TIMESTAMP}.rdb"
        
        log "INFO" "Processing Redis pod: ${pod}"
        
        # Execute SAVE command to create RDB file
        log "INFO" "Executing SAVE command on Redis pod: ${pod}"
        
        if ! kubectl exec -n "ims-${environment}" ${pod} -- redis-cli SAVE; then
            log "ERROR" "Failed to execute SAVE command on Redis pod: ${pod}"
            result=1
            continue
        fi
        
        # Find path to RDB file
        local rdb_path=$(kubectl exec -n "ims-${environment}" ${pod} -- redis-cli CONFIG GET dir | grep -A1 "dir" | tail -n1)
        local rdb_filename=$(kubectl exec -n "ims-${environment}" ${pod} -- redis-cli CONFIG GET dbfilename | grep -A1 "dbfilename" | tail -n1)
        local full_rdb_path="${rdb_path}/${rdb_filename}"
        
        log "INFO" "RDB file path: ${full_rdb_path}"
        
        # Copy RDB file from pod
        if ! kubectl cp "ims-${environment}/${pod}:${full_rdb_path}" "${redis_backup_file}"; then
            log "ERROR" "Failed to copy RDB file from pod: ${pod}"
            result=1
            continue
        fi
        
        # Compress backup file
        if ! compress_backup "${redis_backup_file}" "${redis_backup_file}.gz"; then
            log "WARNING" "Failed to compress Redis backup: ${redis_backup_file}"
        else
            # Remove original file after successful compression
            rm "${redis_backup_file}"
            redis_backup_file="${redis_backup_file}.gz"
        fi
        
        # Encrypt backup file (if encryption is enabled)
        if [ "${NO_ENCRYPTION:-false}" != "true" ]; then
            if ! encrypt_backup "${redis_backup_file}" "${redis_backup_file}.gpg"; then
                log "WARNING" "Failed to encrypt Redis backup: ${redis_backup_file}"
            else
                # Remove original file after successful encryption
                rm "${redis_backup_file}"
                redis_backup_file="${redis_backup_file}.gpg"
            fi
        fi
        
        # Generate checksum
        if ! generate_checksum "${redis_backup_file}"; then
            log "WARNING" "Failed to generate checksum for: ${redis_backup_file}"
        fi
        
        # Verify backup integrity
        if ! verify_backup "${redis_backup_file}" "${redis_backup_file}.sha256"; then
            log "ERROR" "Backup verification failed for: ${redis_backup_file}"
            result=1
        else
            log "INFO" "Backup verification passed for: ${redis_backup_file}"
        fi
        
        log "INFO" "Redis backup completed for pod: ${pod}"
    done
    
    if [ $result -eq 0 ]; then
        log "INFO" "Redis backup completed successfully"
    else
        log "ERROR" "Redis backup completed with errors"
    fi
    
    return $result
}

# Function to back up Kubernetes configuration resources
backup_config() {
    local environment="$1"
    local resource_type="${2:-all}"
    local result=0
    local backup_dir="${BACKUP_ROOT}/${environment}/${BACKUP_TIMESTAMP}/config"
    
    log "INFO" "Starting Kubernetes configuration backup for environment: ${environment}, resource type: ${resource_type}"
    
    # Define resource types to backup
    local resource_types=()
    
    if [ "${resource_type}" == "all" ]; then
        resource_types=("ConfigMap" "Secret" "Deployment" "Service" "HorizontalPodAutoscaler")
    else
        resource_types=("${resource_type}")
    fi
    
    # Backup each resource type
    for res_type in "${resource_types[@]}"; do
        local type_backup_file="${backup_dir}/${res_type}_${BACKUP_TIMESTAMP}.yaml"
        
        log "INFO" "Backing up ${res_type} resources"
        
        # Check if we have resources of this type with the ims label
        if ! kubectl get ${res_type} -n "ims-${environment}" -l app=ims --no-headers 2>/dev/null | grep -q .; then
            log "WARNING" "No ${res_type} resources found with app=ims label in namespace ims-${environment}"
            continue
        fi
        
        # Export resources as YAML
        if ! kubectl get ${res_type} -n "ims-${environment}" -l app=ims -o yaml > "${type_backup_file}"; then
            log "ERROR" "Failed to backup ${res_type} resources"
            result=1
            continue
        fi
        
        # Compress backup file
        if ! compress_backup "${type_backup_file}" "${type_backup_file}.gz"; then
            log "WARNING" "Failed to compress ${res_type} backup: ${type_backup_file}"
        else
            # Remove original file after successful compression
            rm "${type_backup_file}"
            type_backup_file="${type_backup_file}.gz"
        fi
        
        # Encrypt backup file (if encryption is enabled)
        if [ "${NO_ENCRYPTION:-false}" != "true" ]; then
            if ! encrypt_backup "${type_backup_file}" "${type_backup_file}.gpg"; then
                log "WARNING" "Failed to encrypt ${res_type} backup: ${type_backup_file}"
            else
                # Remove original file after successful encryption
                rm "${type_backup_file}"
                type_backup_file="${type_backup_file}.gpg"
            fi
        fi
        
        # Generate checksum
        if ! generate_checksum "${type_backup_file}"; then
            log "WARNING" "Failed to generate checksum for: ${type_backup_file}"
        fi
        
        # Verify backup integrity
        if ! verify_backup "${type_backup_file}" "${type_backup_file}.sha256"; then
            log "ERROR" "Backup verification failed for: ${type_backup_file}"
            result=1
        else
            log "INFO" "Backup verification passed for: ${type_backup_file}"
        fi
        
        log "INFO" "Kubernetes ${res_type} backup completed"
    done
    
    if [ $result -eq 0 ]; then
        log "INFO" "Kubernetes configuration backup completed successfully"
    else
        log "ERROR" "Kubernetes configuration backup completed with errors"
    fi
    
    return $result
}

# Function to compress backup files
compress_backup() {
    local input_file="$1"
    local output_file="$2"
    
    log "INFO" "Compressing file: ${input_file} to ${output_file}"
    
    # Use gzip for compression
    if ! gzip -c "${input_file}" > "${output_file}"; then
        log "ERROR" "Compression failed for file: ${input_file}"
        return 1
    fi
    
    # Verify compression was successful
    if [ ! -f "${output_file}" ]; then
        log "ERROR" "Compressed file not found: ${output_file}"
        return 1
    fi
    
    log "INFO" "Compression successful: ${output_file}"
    return 0
}

# Function to encrypt backup files
encrypt_backup() {
    local input_file="$1"
    local output_file="$2"
    
    log "INFO" "Encrypting file: ${input_file} to ${output_file}"
    
    # Check if encryption key exists
    local encryption_key="${BACKUP_ENCRYPTION_KEY:-${ENCRYPTION_KEY_PATH}}"
    
    if [ ! -f "${encryption_key}" ]; then
        log "ERROR" "Encryption key not found: ${encryption_key}"
        return 1
    fi
    
    # Encrypt file using GPG
    if ! gpg --batch --yes --trust-model always --recipient-file "${encryption_key}" --output "${output_file}" --encrypt "${input_file}"; then
        log "ERROR" "Encryption failed for file: ${input_file}"
        return 1
    fi
    
    # Verify encryption was successful
    if [ ! -f "${output_file}" ]; then
        log "ERROR" "Encrypted file not found: ${output_file}"
        return 1
    fi
    
    log "INFO" "Encryption successful: ${output_file}"
    return 0
}

# Function to generate checksums for backup files
generate_checksum() {
    local file_path="$1"
    
    log "INFO" "Generating checksum for file: ${file_path}"
    
    # Generate SHA256 checksum
    if ! sha256sum "${file_path}" > "${file_path}.sha256"; then
        log "ERROR" "Failed to generate checksum for file: ${file_path}"
        return 1
    fi
    
    log "INFO" "Checksum generated: ${file_path}.sha256"
    
    # Return generated checksum
    cat "${file_path}.sha256" | awk '{print $1}'
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    local checksum_file="$2"
    
    log "INFO" "Verifying backup integrity: ${backup_file}"
    
    # Check if files exist
    if [ ! -f "${backup_file}" ]; then
        log "ERROR" "Backup file not found: ${backup_file}"
        return 1
    fi
    
    if [ ! -f "${checksum_file}" ]; then
        log "ERROR" "Checksum file not found: ${checksum_file}"
        return 1
    fi
    
    # Verify checksum
    if ! sha256sum -c "${checksum_file}"; then
        log "ERROR" "Checksum verification failed for file: ${backup_file}"
        return 1
    fi
    
    log "INFO" "Checksum verification passed for file: ${backup_file}"
    
    # If encrypted, verify file can be decrypted (simple test without extracting the whole file)
    if [[ "${backup_file}" == *.gpg ]]; then
        log "INFO" "Testing decryption for file: ${backup_file}"
        
        # Attempt to list the encrypted file content
        if ! gpg --batch --quiet --list-packets "${backup_file}" > /dev/null 2>&1; then
            log "ERROR" "Decryption test failed for file: ${backup_file}"
            return 1
        fi
        
        log "INFO" "Decryption test passed for file: ${backup_file}"
    fi
    
    # If compressed, verify file can be decompressed (simple test without extracting the whole file)
    if [[ "${backup_file}" == *.gz && "${backup_file}" != *.tar.gz ]]; then
        log "INFO" "Testing decompression for file: ${backup_file}"
        
        # Attempt to test the gzip file
        if ! gzip -t "${backup_file}"; then
            log "ERROR" "Decompression test failed for file: ${backup_file}"
            return 1
        fi
        
        log "INFO" "Decompression test passed for file: ${backup_file}"
    elif [[ "${backup_file}" == *.tar.gz ]]; then
        log "INFO" "Testing archive integrity for file: ${backup_file}"
        
        # Attempt to test the tar.gz file
        if ! tar -tzf "${backup_file}" > /dev/null 2>&1; then
            log "ERROR" "Archive integrity test failed for file: ${backup_file}"
            return 1
        fi
        
        log "INFO" "Archive integrity test passed for file: ${backup_file}"
    fi
    
    log "INFO" "Backup verification passed for file: ${backup_file}"
    return 0
}

# Function to upload backup files to S3
upload_to_s3() {
    local environment="$1"
    local local_path="$2"
    local s3_path="$3"
    
    # Determine S3 bucket name based on environment
    local s3_bucket="${S3_BACKUP_BUCKET:-${S3_BUCKET_PREFIX}-${environment}}"
    
    log "INFO" "Uploading backup to S3: ${local_path} -> s3://${s3_bucket}/${s3_path}"
    
    # Upload file to S3 with appropriate metadata
    if ! aws s3 cp "${local_path}" "s3://${s3_bucket}/${s3_path}" \
        --metadata "environment=${environment},timestamp=${BACKUP_TIMESTAMP},source=${local_path}"; then
        log "ERROR" "Failed to upload backup to S3: ${local_path}"
        return 1
    fi
    
    # Verify upload was successful
    if ! aws s3api head-object --bucket "${s3_bucket}" --key "${s3_path}" > /dev/null 2>&1; then
        log "ERROR" "Failed to verify S3 upload: s3://${s3_bucket}/${s3_path}"
        return 1
    fi
    
    # Replicate to secondary region if configured
    if [ -n "${SECONDARY_REGION:-}" ]; then
        local secondary_bucket="${s3_bucket}-${SECONDARY_REGION}"
        
        log "INFO" "Replicating backup to secondary region: s3://${secondary_bucket}/${s3_path}"
        
        # Create bucket in secondary region if it doesn't exist
        if ! aws s3api head-bucket --bucket "${secondary_bucket}" --region "${SECONDARY_REGION}" > /dev/null 2>&1; then
            log "INFO" "Creating bucket in secondary region: ${secondary_bucket}"
            
            if ! aws s3 mb "s3://${secondary_bucket}" --region "${SECONDARY_REGION}"; then
                log "ERROR" "Failed to create bucket in secondary region: ${secondary_bucket}"
            fi
        fi
        
        # Copy object to secondary region
        if ! aws s3 cp "s3://${s3_bucket}/${s3_path}" "s3://${secondary_bucket}/${s3_path}" --source-region "$(aws configure get region)" --region "${SECONDARY_REGION}"; then
            log "ERROR" "Failed to replicate backup to secondary region: s3://${secondary_bucket}/${s3_path}"
        else
            log "INFO" "Backup replicated to secondary region: s3://${secondary_bucket}/${s3_path}"
        fi
    fi
    
    log "INFO" "Backup successfully uploaded to S3: s3://${s3_bucket}/${s3_path}"
    return 0
}

# Function to clean up old backup files based on retention policy
cleanup_old_backups() {
    local environment="$1"
    local component="$2"
    
    # Determine retention period based on environment and component
    local retention_days=7  # Default retention period
    
    case "${environment}" in
        dev)
            case "${component}" in
                postgresql|timescaledb|config) retention_days=7 ;;
                cassandra) 
                    if [[ "${component}" == *"ims_audit"* ]]; then
                        retention_days=30
                    elif [[ "${component}" == *"ims_analytics"* ]]; then
                        retention_days=3
                    else
                        retention_days=7
                    fi
                    ;;
                redis) retention_days=1 ;;
            esac
            ;;
        staging)
            case "${component}" in
                postgresql|timescaledb|config) retention_days=14 ;;
                cassandra) 
                    if [[ "${component}" == *"ims_audit"* ]]; then
                        retention_days=90
                    elif [[ "${component}" == *"ims_analytics"* ]]; then
                        retention_days=7
                    else
                        retention_days=14
                    fi
                    ;;
                redis) retention_days=3 ;;
            esac
            ;;
        prod)
            case "${component}" in
                postgresql|timescaledb|config) retention_days=30 ;;
                cassandra) 
                    if [[ "${component}" == *"ims_audit"* ]]; then
                        retention_days=365
                    elif [[ "${component}" == *"ims_analytics"* ]]; then
                        retention_days=14
                    else
                        retention_days=30
                    fi
                    ;;
                redis) retention_days=7 ;;
            esac
            ;;
    esac
    
    # Override with command line parameter if provided
    if [ -n "${RETENTION_DAYS:-}" ] && [ "${RETENTION_DAYS}" -gt 0 ]; then
        retention_days="${RETENTION_DAYS}"
    fi
    
    log "INFO" "Cleaning up old backups for ${component} in ${environment} environment (retention: ${retention_days} days)"
    
    # Find backup files older than retention period
    local cutoff_date=$(date -d "${retention_days} days ago" +%Y%m%d)
    local backup_dir="${BACKUP_ROOT}/${environment}"
    
    if [ ! -d "${backup_dir}" ]; then
        log "WARNING" "Backup directory not found: ${backup_dir}"
        return 0
    fi
    
    # Find old backup directories (based on timestamp in directory name)
    for old_backup_dir in $(find "${backup_dir}" -maxdepth 1 -type d -name "[0-9]*" | sort); do
        local dir_date=$(basename "${old_backup_dir}" | cut -c1-8)
        
        if [[ "${dir_date}" < "${cutoff_date}" ]]; then
            log "INFO" "Found old backup directory: ${old_backup_dir} (date: ${dir_date})"
            
            # Check if component directory exists
            if [ -d "${old_backup_dir}/${component}" ]; then
                # Check if backups are in S3 before deleting local files
                if [ "${LOCAL_ONLY:-false}" != "true" ]; then
                    local s3_bucket="${S3_BACKUP_BUCKET:-${S3_BUCKET_PREFIX}-${environment}}"
                    local s3_path="$(basename "${old_backup_dir}")/${component}/"
                    
                    if aws s3 ls "s3://${s3_bucket}/${s3_path}" > /dev/null 2>&1; then
                        log "INFO" "Deleting local backup directory: ${old_backup_dir}/${component}"
                        rm -rf "${old_backup_dir}/${component}"
                    else
                        log "WARNING" "S3 backup not found for ${old_backup_dir}/${component}, keeping local copy"
                    fi
                else
                    log "INFO" "Deleting local backup directory: ${old_backup_dir}/${component}"
                    rm -rf "${old_backup_dir}/${component}"
                fi
            fi
            
            # Check if backup directory is now empty and can be removed
            if [ -z "$(ls -A "${old_backup_dir}" 2>/dev/null)" ]; then
                log "INFO" "Removing empty backup directory: ${old_backup_dir}"
                rmdir "${old_backup_dir}"
            fi
        fi
    done
    
    # If uploading to S3, set lifecycle policy to expire old objects
    if [ "${LOCAL_ONLY:-false}" != "true" ]; then
        local s3_bucket="${S3_BACKUP_BUCKET:-${S3_BUCKET_PREFIX}-${environment}}"
        
        # Check if bucket exists
        if aws s3api head-bucket --bucket "${s3_bucket}" > /dev/null 2>&1; then
            log "INFO" "Setting S3 lifecycle policy for bucket: ${s3_bucket}"
            
            # Create lifecycle policy JSON
            local lifecycle_policy='{
                "Rules": [
                    {
                        "ID": "'"${component}-expiration-rule"'",
                        "Status": "Enabled",
                        "Prefix": "'"${component}/"'",
                        "Expiration": {
                            "Days": '"${retention_days}"'
                        }
                    }
                ]
            }'
            
            # Apply lifecycle policy
            if ! aws s3api put-bucket-lifecycle-configuration --bucket "${s3_bucket}" --lifecycle-configuration "${lifecycle_policy}"; then
                log "WARNING" "Failed to set S3 lifecycle policy for bucket: ${s3_bucket}"
            else
                log "INFO" "S3 lifecycle policy set for bucket: ${s3_bucket}"
            fi
        else
            log "WARNING" "S3 bucket not found: ${s3_bucket}"
        fi
    fi
    
    log "INFO" "Cleanup completed for ${component} in ${environment} environment"
    return 0
}

# Function to send backup completion notification
send_notification() {
    local environment="$1"
    local status="$2"
    local message="$3"
    
    log "INFO" "Sending backup completion notification for ${environment} environment (status: ${status})"
    
    # Determine notification recipients based on environment
    local email_recipients="${BACKUP_NOTIFICATION_EMAIL:-ops@example.com}"
    local slack_webhook="${BACKUP_SLACK_WEBHOOK:-}"
    
    # Format notification message
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local hostname=$(hostname)
    local subject="IMS Backup ${status} - ${environment} - ${timestamp}"
    local body="IMS Backup Status: ${status}
Environment: ${environment}
Timestamp: ${timestamp}
Hostname: ${hostname}

${message}

Backup Location: ${BACKUP_ROOT}/${environment}/${BACKUP_TIMESTAMP}
"

    # Send email notification
    if [ -n "${email_recipients}" ]; then
        log "INFO" "Sending email notification to: ${email_recipients}"
        
        if ! echo "${body}" | mail -s "${subject}" "${email_recipients}"; then
            log "WARNING" "Failed to send email notification"
        fi
    fi
    
    # Send Slack notification if configured
    if [ -n "${slack_webhook}" ]; then
        log "INFO" "Sending Slack notification"
        
        local color="good"
        if [ "${status}" != "Success" ]; then
            color="danger"
        fi
        
        local slack_payload='{
            "attachments": [
                {
                    "color": "'"${color}"'",
                    "title": "'"${subject}"'",
                    "text": "'"${body//\"/\\\"}"'",
                    "fields": [
                        {
                            "title": "Environment",
                            "value": "'"${environment}"'",
                            "short": true
                        },
                        {
                            "title": "Status",
                            "value": "'"${status}"'",
                            "short": true
                        }
                    ]
                }
            ]
        }'
        
        if ! curl -s -X POST -H 'Content-type: application/json' --data "${slack_payload}" "${slack_webhook}" > /dev/null; then
            log "WARNING" "Failed to send Slack notification"
        fi
    fi
    
    log "INFO" "Backup notification sent"
    return 0
}

# Main function
main() {
    local environment="${DEFAULT_ENVIRONMENT}"
    local components="all"
    local database="all"
    local keyspace="all"
    local local_only=false
    local s3_only=false
    local no_encryption=false
    local force=false
    local retention_days=""
    local encryption_key="${ENCRYPTION_KEY_PATH}"
    local result=0
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--environment)
                environment="$2"
                shift 2
                ;;
            -c|--components)
                components="$2"
                shift 2
                ;;
            -d|--database)
                database="$2"
                shift 2
                ;;
            -k|--keyspace)
                keyspace="$2"
                shift 2
                ;;
            -l|--local-only)
                local_only=true
                shift
                ;;
            -s|--s3-only)
                s3_only=true
                shift
                ;;
            -n|--no-encryption)
                no_encryption=true
                shift
                ;;
            -f|--force)
                force=true
                shift
                ;;
            -r|--retention-days)
                retention_days="$2"
                shift 2
                ;;
            --encryption-key)
                encryption_key="$2"
                shift 2
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
    
    # Set variables for use in functions
    export LOCAL_ONLY="${local_only}"
    export S3_ONLY="${s3_only}"
    export NO_ENCRYPTION="${no_encryption}"
    export FORCE="${force}"
    export RETENTION_DAYS="${retention_days}"
    export BACKUP_ENCRYPTION_KEY="${encryption_key}"
    
    # Setup logging
    log "INFO" "Starting IMS backup for environment: ${environment}"
    log "INFO" "Components to backup: ${components}"
    
    # Check prerequisites
    if ! check_prerequisites; then
        log "ERROR" "Prerequisite check failed. Aborting backup."
        exit 1
    fi
    
    # Set up environment
    if ! setup_environment "${environment}"; then
        log "ERROR" "Environment setup failed. Aborting backup."
        exit 1
    fi
    
    # Verify system health
    if ! verify_system_health "${environment}" && [ "${force}" != "true" ]; then
        log "ERROR" "System health verification failed. Use --force to proceed anyway. Aborting backup."
        exit 1
    fi
    
    # Create backup summary message
    backup_summary="Backup Summary:
=============================
"
    
    # Perform backup of specified components
    IFS=',' read -ra component_array <<< "${components}"
    for component in "${component_array[@]}"; do
        case "${component}" in
            postgresql|all)
                log "INFO" "Starting PostgreSQL backup"
                if backup_postgresql "${environment}" "${database}"; then
                    log "INFO" "PostgreSQL backup completed successfully"
                    backup_summary+="PostgreSQL: Success
"
                else
                    log "ERROR" "PostgreSQL backup failed"
                    backup_summary+="PostgreSQL: Failed
"
                    result=1
                fi
                ;;
            timescaledb|all)
                log "INFO" "Starting TimescaleDB backup"
                if backup_timescaledb "${environment}"; then
                    log "INFO" "TimescaleDB backup completed successfully"
                    backup_summary+="TimescaleDB: Success
"
                else
                    log "ERROR" "TimescaleDB backup failed"
                    backup_summary+="TimescaleDB: Failed
"
                    result=1
                fi
                ;;
            cassandra|all)
                log "INFO" "Starting Cassandra backup"
                if backup_cassandra "${environment}" "${keyspace}"; then
                    log "INFO" "Cassandra backup completed successfully"
                    backup_summary+="Cassandra: Success
"
                else
                    log "ERROR" "Cassandra backup failed"
                    backup_summary+="Cassandra: Failed
"
                    result=1
                fi
                ;;
            redis|all)
                log "INFO" "Starting Redis backup"
                if backup_redis "${environment}"; then
                    log "INFO" "Redis backup completed successfully"
                    backup_summary+="Redis: Success
"
                else
                    log "ERROR" "Redis backup failed"
                    backup_summary+="Redis: Failed
"
                    result=1
                fi
                ;;
            config|all)
                log "INFO" "Starting Kubernetes configuration backup"
                if backup_config "${environment}"; then
                    log "INFO" "Kubernetes configuration backup completed successfully"
                    backup_summary+="Kubernetes Config: Success
"
                else
                    log "ERROR" "Kubernetes configuration backup failed"
                    backup_summary+="Kubernetes Config: Failed
"
                    result=1
                fi
                ;;
            *)
                log "WARNING" "Unknown component: ${component}. Skipping."
                ;;
        esac
    done
    
    # Upload backups to S3 if configured
    if [ "${local_only}" != "true" ]; then
        log "INFO" "Uploading backups to S3"
        
        backup_summary+="
S3 Upload:
"
        
        # Upload each component directory
        for component in "${component_array[@]}"; do
            case "${component}" in
                postgresql|timescaledb|cassandra|redis|config|all)
                    # Handle 'all' component
                    if [ "${component}" == "all" ]; then
                        for comp in postgresql timescaledb cassandra redis config; do
                            local s3_path="${BACKUP_TIMESTAMP}/${comp}/"
                            local local_path="${BACKUP_ROOT}/${environment}/${BACKUP_TIMESTAMP}/${comp}"
                            
                            if [ -d "${local_path}" ] && [ -n "$(ls -A "${local_path}" 2>/dev/null)" ]; then
                                if upload_to_s3 "${environment}" "${local_path}" "${s3_path}"; then
                                    log "INFO" "Successfully uploaded ${comp} backups to S3"
                                    backup_summary+="  - ${comp}: Success
"
                                    # Remove local files if s3_only is set
                                    if [ "${s3_only}" == "true" ]; then
                                        log "INFO" "Removing local backup files for ${comp}"
                                        rm -rf "${local_path}"
                                    fi
                                else
                                    log "ERROR" "Failed to upload ${comp} backups to S3"
                                    backup_summary+="  - ${comp}: Failed
"
                                    result=1
                                fi
                            else
                                log "WARNING" "No backup files found for ${comp}"
                                backup_summary+="  - ${comp}: No files found
"
                            fi
                        done
                    else
                        # Process individual component
                        local s3_path="${BACKUP_TIMESTAMP}/${component}/"
                        local local_path="${BACKUP_ROOT}/${environment}/${BACKUP_TIMESTAMP}/${component}"
                        
                        if [ -d "${local_path}" ] && [ -n "$(ls -A "${local_path}" 2>/dev/null)" ]; then
                            if upload_to_s3 "${environment}" "${local_path}" "${s3_path}"; then
                                log "INFO" "Successfully uploaded ${component} backups to S3"
                                backup_summary+="  - ${component}: Success
"
                                # Remove local files if s3_only is set
                                if [ "${s3_only}" == "true" ]; then
                                    log "INFO" "Removing local backup files for ${component}"
                                    rm -rf "${local_path}"
                                fi
                            else
                                log "ERROR" "Failed to upload ${component} backups to S3"
                                backup_summary+="  - ${component}: Failed
"
                                result=1
                            fi
                        else
                            log "WARNING" "No backup files found for ${component}"
                            backup_summary+="  - ${component}: No files found
"
                        fi
                    fi
                    ;;
                *)
                    log "WARNING" "Unknown component: ${component}. Skipping S3 upload."
                    ;;
            esac
        done
    else
        backup_summary+="
S3 Upload: Skipped (--local-only)
"
    fi
    
    # Clean up old backups based on retention policy
    log "INFO" "Cleaning up old backups"
    
    backup_summary+="
Cleanup:
"
    
    for component in "${component_array[@]}"; do
        case "${component}" in
            postgresql|timescaledb|cassandra|redis|config|all)
                # Handle 'all' component
                if [ "${component}" == "all" ]; then
                    for comp in postgresql timescaledb cassandra redis config; do
                        if cleanup_old_backups "${environment}" "${comp}"; then
                            log "INFO" "Successfully cleaned up old ${comp} backups"
                            backup_summary+="  - ${comp}: Success
"
                        else
                            log "WARNING" "Failed to clean up old ${comp} backups"
                            backup_summary+="  - ${comp}: Failed
"
                        fi
                    done
                else
                    # Process individual component
                    if cleanup_old_backups "${environment}" "${component}"; then
                        log "INFO" "Successfully cleaned up old ${component} backups"
                        backup_summary+="  - ${component}: Success
"
                    else
                        log "WARNING" "Failed to clean up old ${component} backups"
                        backup_summary+="  - ${component}: Failed
"
                    fi
                fi
                ;;
            *)
                log "WARNING" "Unknown component: ${component}. Skipping cleanup."
                ;;
        esac
    done
    
    # Send notification of backup completion
    if [ $result -eq 0 ]; then
        log "INFO" "Backup completed successfully"
        backup_summary+="
Overall Status: Success
"
        send_notification "${environment}" "Success" "${backup_summary}"
    else
        log "ERROR" "Backup completed with errors"
        backup_summary+="
Overall Status: Failed
"
        send_notification "${environment}" "Failed" "${backup_summary}"
    fi
    
    log "INFO" "Backup process completed"
    return $result
}

# Run main function with all arguments
main "$@"
exit $?