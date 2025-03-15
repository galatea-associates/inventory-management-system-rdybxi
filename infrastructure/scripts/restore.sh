#!/bin/bash
#
# restore.sh - Comprehensive restore script for the Inventory Management System (IMS)
#
# This script automates the process of restoring system components from backups.
# It supports restoring PostgreSQL databases, TimescaleDB time-series data,
# Cassandra keyspaces, Redis caches, and Kubernetes configuration resources.
# It implements verification, decryption, and validation to ensure restore integrity
# and supports both local storage and cloud-based (S3) backup sources.
#
# Dependencies:
# - aws-cli (latest) - AWS command-line interface for S3 storage operations
# - kubectl (latest) - Kubernetes command-line tool for accessing database pods
# - pg_restore (15+) - PostgreSQL restore utility
# - nodetool (4.1+) - Cassandra administration tool for restoring snapshots
# - redis-cli (7.0+) - Redis command-line interface for restore operations
#
# Usage: ./restore.sh [options]
#   Options:
#     -e, --environment ENV       Target environment (dev, staging, prod) (default: dev)
#     -c, --components COMPS      Comma-separated list of components to restore
#                                 (postgresql,timescaledb,cassandra,redis,config,all) (default: all)
#     -d, --database DB           Specific database to restore (for PostgreSQL component) (default: all)
#     -k, --keyspace KS           Specific keyspace to restore (for Cassandra component) (default: all)
#     -t, --timestamp TS          Backup timestamp to restore from (format: YYYYMMDD_HHMMSS) (default: latest)
#     -s, --source SRC            Backup source (local, s3) (default: s3)
#     -l, --list-backups          List available backups and exit
#     -p, --point-in-time TIME    Point-in-time to restore to (format: YYYY-MM-DD HH:MM:SS) (default: latest)
#     -f, --force                 Force restore even if it would overwrite existing data
#     -n, --no-verification       Skip post-restore verification
#     -k, --encryption-key FILE   Path to encryption key file (default: /etc/ims/backup-encryption-key.gpg)
#     -h, --help                  Display this help message
#
# Environment Variables:
#   AWS_PROFILE                   AWS profile to use for authentication (default: ims-{environment})
#   KUBECONFIG                    Path to Kubernetes configuration file (default: ${HOME}/.kube/config)
#   BACKUP_ENCRYPTION_KEY         Path to GPG encryption key for backup decryption
#   RESTORE_NOTIFICATION_EMAIL    Email address for restore notifications (default: ops@example.com)
#   RESTORE_SLACK_WEBHOOK         Slack webhook URL for restore notifications
#   RESTORE_LOG_LEVEL             Log level for restore script (default: INFO)
#   S3_BACKUP_BUCKET              S3 bucket name for backups (default: ims-backups-{environment})
#
# Returns:
#   0 if restore is successful, non-zero otherwise

# Enable error handling
set -e
set -o pipefail

# Source health-check.sh script for the check_service_health function
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
source "${SCRIPT_DIR}/health-check.sh"

# Global variables
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/../.." && pwd)
LOG_FILE="${PROJECT_ROOT}/logs/restore_$(date +%Y%m%d_%H%M%S).log"
DEFAULT_ENVIRONMENT="dev"
RESTORE_ROOT="${PROJECT_ROOT}/restores"
RESTORE_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
S3_BUCKET_PREFIX="ims-backups"
ENCRYPTION_KEY_PATH="/etc/ims/backup-encryption-key.gpg"

# Function to display usage information
usage() {
    echo "Usage: $0 [options]"
    echo
    echo "Comprehensive restore script for the Inventory Management System (IMS)"
    echo
    echo "Options:"
    echo "  -e, --environment ENV       Target environment (dev, staging, prod) (default: ${DEFAULT_ENVIRONMENT})"
    echo "  -c, --components COMPS      Comma-separated list of components to restore"
    echo "                              (postgresql,timescaledb,cassandra,redis,config,all) (default: all)"
    echo "  -d, --database DB           Specific database to restore (for PostgreSQL component) (default: all)"
    echo "  -k, --keyspace KS           Specific keyspace to restore (for Cassandra component) (default: all)"
    echo "  -t, --timestamp TS          Backup timestamp to restore from (format: YYYYMMDD_HHMMSS) (default: latest)"
    echo "  -s, --source SRC            Backup source (local, s3) (default: s3)"
    echo "  -l, --list-backups          List available backups and exit"
    echo "  -p, --point-in-time TIME    Point-in-time to restore to (format: YYYY-MM-DD HH:MM:SS) (default: latest)"
    echo "  -f, --force                 Force restore even if it would overwrite existing data"
    echo "  -n, --no-verification       Skip post-restore verification"
    echo "  -k, --encryption-key FILE   Path to encryption key file (default: ${ENCRYPTION_KEY_PATH})"
    echo "  -h, --help                  Display this help message"
    echo
    echo "Examples:"
    echo "  List available backups:"
    echo "    $0 --list-backups --environment staging --source s3"
    echo
    echo "  Restore all components from the latest backup:"
    echo "    $0 --environment prod"
    echo
    echo "  Restore specific PostgreSQL database from a specific backup:"
    echo "    $0 --environment dev --components postgresql --database ims_calculation --timestamp 20230615_120000"
    echo
    echo "  Restore to a specific point in time:"
    echo "    $0 --environment prod --point-in-time \"2023-06-15 13:45:00\""
}

# Function to log messages to both console and log file
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local log_entry="[${timestamp}] [${level}] ${message}"
    
    echo "${log_entry}"
    
    # Ensure the log directory exists
    mkdir -p "$(dirname "${LOG_FILE}")"
    
    # Append to log file
    echo "${log_entry}" >> "${LOG_FILE}"
}

# Function to set up the environment
setup_environment() {
    local environment="$1"
    local result=0
    
    log "INFO" "Setting up environment: ${environment}"
    
    # Validate environment parameter
    if [[ "${environment}" != "dev" && "${environment}" != "staging" && "${environment}" != "prod" ]]; then
        log "ERROR" "Invalid environment: ${environment}. Must be one of: dev, staging, prod"
        return 1
    fi
    
    # Set environment-specific variables
    case "${environment}" in
        "dev")
            S3_BUCKET="${S3_BUCKET_PREFIX}-dev"
            ;;
        "staging")
            S3_BUCKET="${S3_BUCKET_PREFIX}-staging"
            ;;
        "prod")
            S3_BUCKET="${S3_BUCKET_PREFIX}-prod"
            ;;
    esac
    
    # Create necessary restore directories
    RESTORE_DIR="${RESTORE_ROOT}/${environment}/${RESTORE_TIMESTAMP}"
    mkdir -p "${RESTORE_DIR}"
    log "INFO" "Created restore directory: ${RESTORE_DIR}"
    
    # Configure AWS credentials for the environment if needed
    if [[ -z "${AWS_PROFILE}" ]]; then
        export AWS_PROFILE="ims-${environment}"
        log "INFO" "Using AWS profile: ${AWS_PROFILE}"
    else
        log "INFO" "Using provided AWS profile: ${AWS_PROFILE}"
    fi
    
    # Configure kubectl context for the environment if needed
    kubectl config use-context "ims-${environment}" >/dev/null 2>&1
    if [[ $? -ne 0 ]]; then
        log "WARNING" "Failed to set kubectl context to ims-${environment}. Continuing with current context."
        result=1
    else
        log "INFO" "Kubernetes context set to: ims-${environment}"
    fi
    
    return ${result}
}

# Function to check prerequisites
check_prerequisites() {
    local result=0
    
    log "INFO" "Checking prerequisites"
    
    # Check for required tools
    commands=("aws" "kubectl" "pg_restore" "nodetool" "redis-cli" "gpg")
    
    for cmd in "${commands[@]}"; do
        if ! command -v "${cmd}" &>/dev/null; then
            log "ERROR" "Required command not found: ${cmd}"
            result=1
        else
            version=""
            
            case "${cmd}" in
                "aws")
                    version=$(aws --version 2>&1 | head -n 1)
                    ;;
                "kubectl")
                    version=$(kubectl version --client --short 2>&1 | head -n 1)
                    ;;
                "pg_restore")
                    version=$(pg_restore --version 2>&1 | head -n 1)
                    ;;
                "nodetool")
                    version=$(nodetool version 2>&1 | head -n 1 || echo "nodetool (version unknown)")
                    ;;
                "redis-cli")
                    version=$(redis-cli --version 2>&1 | head -n 1)
                    ;;
                "gpg")
                    version=$(gpg --version 2>&1 | head -n 1)
                    ;;
            esac
            
            log "INFO" "Found ${cmd}: ${version}"
        fi
    done
    
    return ${result}
}

# Function to list available backups for a component
list_available_backups() {
    local environment="$1"
    local component="$2"
    local source="$3"
    
    log "INFO" "Listing available backups for ${component} in ${environment} environment from ${source}"
    
    local backups=()
    
    if [[ "${source}" == "local" ]]; then
        # List backups from local storage
        local backup_dir="${RESTORE_ROOT}/${environment}/backups/${component}"
        
        if [[ ! -d "${backup_dir}" ]]; then
            log "WARNING" "No local backup directory found at ${backup_dir}"
            return 0
        fi
        
        # List directories by timestamp
        backups=($(find "${backup_dir}" -maxdepth 1 -type d -name "20*" -exec basename {} \; | sort -r))
    elif [[ "${source}" == "s3" ]]; then
        # List backups from S3
        local s3_path="s3://${S3_BUCKET}/${environment}/backups/${component}/"
        
        # Check if the S3 path exists
        if ! aws s3 ls "${s3_path}" &>/dev/null; then
            log "WARNING" "No S3 backup path found at ${s3_path}"
            return 0
        fi
        
        # List directories by timestamp
        backups=($(aws s3 ls "${s3_path}" | grep PRE | grep -o "[0-9]\{8\}_[0-9]\{6\}" | sort -r))
    else
        log "ERROR" "Invalid backup source: ${source}. Must be one of: local, s3"
        return 1
    fi
    
    # Display available backups
    if [[ ${#backups[@]} -eq 0 ]]; then
        log "INFO" "No backups found for ${component} in ${environment} environment from ${source}"
    else
        log "INFO" "Available backups for ${component} in ${environment} environment from ${source}:"
        for backup in "${backups[@]}"; do
            echo "  ${backup}"
        done
    fi
    
    # Return array of backups
    echo "${backups[@]}"
}

# Function to download backup from S3 if needed
download_backup() {
    local environment="$1"
    local component="$2"
    local backup_timestamp="$3"
    local destination_dir="$4"
    
    local s3_path="s3://${S3_BUCKET}/${environment}/backups/${component}/${backup_timestamp}/"
    
    log "INFO" "Downloading backup from ${s3_path} to ${destination_dir}"
    
    # Create destination directory if it doesn't exist
    mkdir -p "${destination_dir}"
    
    # Download from S3
    if ! aws s3 sync "${s3_path}" "${destination_dir}" --quiet; then
        log "ERROR" "Failed to download backup from ${s3_path}"
        return 1
    fi
    
    # Verify downloaded files
    if [[ ! -d "${destination_dir}" || -z "$(ls -A "${destination_dir}")" ]]; then
        log "ERROR" "No files downloaded from ${s3_path}"
        return 1
    fi
    
    log "INFO" "Successfully downloaded backup from ${s3_path}"
    return 0
}

# Function to decrypt backup files
decrypt_backup() {
    local input_file="$1"
    local output_file="$2"
    
    log "INFO" "Decrypting file: ${input_file} to ${output_file}"
    
    # Check if encryption key exists
    if [[ ! -f "${ENCRYPTION_KEY_PATH}" ]]; then
        log "ERROR" "Encryption key not found at ${ENCRYPTION_KEY_PATH}"
        return 1
    fi
    
    # Decrypt file using GPG
    if ! gpg --quiet --batch --yes --decrypt --passphrase-file "${ENCRYPTION_KEY_PATH}" -o "${output_file}" "${input_file}"; then
        log "ERROR" "Failed to decrypt file: ${input_file}"
        return 1
    fi
    
    # Verify decryption was successful
    if [[ ! -f "${output_file}" ]]; then
        log "ERROR" "Decryption failed, output file not created: ${output_file}"
        return 1
    fi
    
    log "INFO" "Successfully decrypted file: ${input_file}"
    return 0
}

# Function to decompress backup files
decompress_backup() {
    local input_file="$1"
    local output_file="$2"
    
    log "INFO" "Decompressing file: ${input_file} to ${output_file}"
    
    # Determine compression method based on file extension
    if [[ "${input_file}" == *.gz ]]; then
        # Decompress gzip file
        if ! gunzip -c "${input_file}" > "${output_file}"; then
            log "ERROR" "Failed to decompress gzip file: ${input_file}"
            return 1
        fi
    elif [[ "${input_file}" == *.bz2 ]]; then
        # Decompress bzip2 file
        if ! bunzip2 -c "${input_file}" > "${output_file}"; then
            log "ERROR" "Failed to decompress bzip2 file: ${input_file}"
            return 1
        fi
    elif [[ "${input_file}" == *.xz ]]; then
        # Decompress xz file
        if ! xz -d -c "${input_file}" > "${output_file}"; then
            log "ERROR" "Failed to decompress xz file: ${input_file}"
            return 1
        fi
    elif [[ "${input_file}" == *.tar.gz || "${input_file}" == *.tgz ]]; then
        # Extract tar.gz file
        if ! tar -xzf "${input_file}" -C "$(dirname "${output_file}")"; then
            log "ERROR" "Failed to extract tar.gz file: ${input_file}"
            return 1
        fi
    elif [[ "${input_file}" == *.tar.bz2 || "${input_file}" == *.tbz2 ]]; then
        # Extract tar.bz2 file
        if ! tar -xjf "${input_file}" -C "$(dirname "${output_file}")"; then
            log "ERROR" "Failed to extract tar.bz2 file: ${input_file}"
            return 1
        fi
    elif [[ "${input_file}" == *.tar.xz ]]; then
        # Extract tar.xz file
        if ! tar -xJf "${input_file}" -C "$(dirname "${output_file}")"; then
            log "ERROR" "Failed to extract tar.xz file: ${input_file}"
            return 1
        fi
    elif [[ "${input_file}" == *.tar ]]; then
        # Extract tar file
        if ! tar -xf "${input_file}" -C "$(dirname "${output_file}")"; then
            log "ERROR" "Failed to extract tar file: ${input_file}"
            return 1
        fi
    elif [[ "${input_file}" == *.zip ]]; then
        # Extract zip file
        if ! unzip -q "${input_file}" -d "$(dirname "${output_file}")"; then
            log "ERROR" "Failed to extract zip file: ${input_file}"
            return 1
        fi
    else
        log "ERROR" "Unsupported compression format for file: ${input_file}"
        return 1
    fi
    
    # Verify decompression was successful
    if [[ "${input_file}" == *.tar* || "${input_file}" == *.tgz || "${input_file}" == *.tbz2 || "${input_file}" == *.zip ]]; then
        # For archive formats, just check if extraction directory has files
        if [[ -z "$(ls -A "$(dirname "${output_file}")")" ]]; then
            log "ERROR" "Decompression failed, no files extracted from: ${input_file}"
            return 1
        fi
    else
        # For single files, check if output file exists
        if [[ ! -f "${output_file}" ]]; then
            log "ERROR" "Decompression failed, output file not created: ${output_file}"
            return 1
        fi
    fi
    
    log "INFO" "Successfully decompressed file: ${input_file}"
    return 0
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    local checksum_file="$2"
    
    log "INFO" "Verifying integrity of backup file: ${backup_file}"
    
    # Check if both files exist
    if [[ ! -f "${backup_file}" ]]; then
        log "ERROR" "Backup file not found: ${backup_file}"
        return 1
    fi
    
    if [[ ! -f "${checksum_file}" ]]; then
        log "WARNING" "Checksum file not found: ${checksum_file}, skipping verification"
        return 0
    fi
    
    # Calculate checksum of backup file
    local calculated_checksum=""
    local stored_checksum=""
    
    # Determine checksum type by examining the checksum file
    if grep -q "^MD5" "${checksum_file}" 2>/dev/null; then
        calculated_checksum=$(md5sum "${backup_file}" | awk '{print $1}')
        stored_checksum=$(grep "^MD5" "${checksum_file}" | awk '{print $2}')
    elif grep -q "^SHA1" "${checksum_file}" 2>/dev/null; then
        calculated_checksum=$(sha1sum "${backup_file}" | awk '{print $1}')
        stored_checksum=$(grep "^SHA1" "${checksum_file}" | awk '{print $2}')
    elif grep -q "^SHA256" "${checksum_file}" 2>/dev/null; then
        calculated_checksum=$(sha256sum "${backup_file}" | awk '{print $1}')
        stored_checksum=$(grep "^SHA256" "${checksum_file}" | awk '{print $2}')
    else
        # Default to MD5 if the format is not recognized
        calculated_checksum=$(md5sum "${backup_file}" | awk '{print $1}')
        stored_checksum=$(cat "${checksum_file}")
    fi
    
    # Compare checksums
    if [[ "${calculated_checksum}" != "${stored_checksum}" ]]; then
        log "ERROR" "Checksum verification failed for ${backup_file}"
        log "ERROR" "Expected: ${stored_checksum}, Calculated: ${calculated_checksum}"
        return 1
    fi
    
    log "INFO" "Checksum verification successful for ${backup_file}"
    return 0
}

# Function to prepare for restore operation
prepare_restore() {
    local environment="$1"
    local component="$2"
    local backup_timestamp="$3"
    local source="$4"
    
    log "INFO" "Preparing to restore ${component} from ${backup_timestamp} backup in ${environment} environment from ${source}"
    
    # Create temporary restore directory
    local temp_dir="${RESTORE_DIR}/${component}"
    mkdir -p "${temp_dir}"
    
    # Get the backup files
    if [[ "${source}" == "s3" ]]; then
        # Download backup from S3
        if ! download_backup "${environment}" "${component}" "${backup_timestamp}" "${temp_dir}"; then
            log "ERROR" "Failed to download backup for ${component}"
            return 1
        fi
    else
        # Copy backup from local storage
        local backup_dir="${RESTORE_ROOT}/${environment}/backups/${component}/${backup_timestamp}"
        
        if [[ ! -d "${backup_dir}" ]]; then
            log "ERROR" "Local backup directory not found: ${backup_dir}"
            return 1
        fi
        
        log "INFO" "Copying local backup from ${backup_dir} to ${temp_dir}"
        cp -r "${backup_dir}"/* "${temp_dir}"/
    fi
    
    # Check for encrypted files and decrypt them
    log "INFO" "Checking for encrypted files in ${temp_dir}"
    find "${temp_dir}" -name "*.gpg" -type f | while read -r encrypted_file; do
        local decrypted_file="${encrypted_file%.gpg}"
        
        if ! decrypt_backup "${encrypted_file}" "${decrypted_file}"; then
            log "ERROR" "Failed to decrypt file: ${encrypted_file}"
            return 1
        fi
        
        # Remove the encrypted file after successful decryption
        rm "${encrypted_file}"
    done
    
    # Check for compressed files and decompress them
    log "INFO" "Checking for compressed files in ${temp_dir}"
    find "${temp_dir}" -name "*.gz" -o -name "*.bz2" -o -name "*.xz" -o -name "*.tar.gz" -o -name "*.tgz" -o -name "*.tar.bz2" -o -name "*.tbz2" -o -name "*.tar.xz" -o -name "*.tar" -o -name "*.zip" -type f | while read -r compressed_file; do
        local decompressed_file="${compressed_file%.*}"
        
        # Handle special cases for tar archives
        if [[ "${compressed_file}" == *.tar.gz || "${compressed_file}" == *.tgz ]]; then
            decompressed_file="${compressed_file%.tar.gz}"
            [[ "${compressed_file}" == *.tgz ]] && decompressed_file="${compressed_file%.tgz}"
        elif [[ "${compressed_file}" == *.tar.bz2 || "${compressed_file}" == *.tbz2 ]]; then
            decompressed_file="${compressed_file%.tar.bz2}"
            [[ "${compressed_file}" == *.tbz2 ]] && decompressed_file="${compressed_file%.tbz2}"
        elif [[ "${compressed_file}" == *.tar.xz ]]; then
            decompressed_file="${compressed_file%.tar.xz}"
        fi
        
        if ! decompress_backup "${compressed_file}" "${decompressed_file}"; then
            log "ERROR" "Failed to decompress file: ${compressed_file}"
            return 1
        fi
        
        # Remove the compressed file after successful decompression
        rm "${compressed_file}"
    done
    
    # Verify backup integrity using checksums if available
    log "INFO" "Verifying backup integrity"
    find "${temp_dir}" -name "*.md5" -o -name "*.sha1" -o -name "*.sha256" -type f | while read -r checksum_file; do
        local backup_file="${checksum_file%.*}"
        
        if [[ -f "${backup_file}" ]]; then
            if ! verify_backup "${backup_file}" "${checksum_file}"; then
                log "ERROR" "Backup verification failed for ${backup_file}"
                return 1
            fi
        fi
    done
    
    log "INFO" "Restore preparation completed successfully"
    echo "${temp_dir}"
}

# Function to restore PostgreSQL databases
restore_postgresql() {
    local environment="$1"
    local database_name="$2"
    local backup_path="$3"
    
    log "INFO" "Restoring PostgreSQL database(s) in ${environment} environment: ${database_name}"
    
    # Identify PostgreSQL pods in the cluster
    local pg_pods=$(kubectl get pods -n "ims-${environment}" -l app=ims-postgresql -o jsonpath='{.items[*].metadata.name}')
    
    if [[ -z "${pg_pods}" ]]; then
        log "ERROR" "No PostgreSQL pods found in namespace ims-${environment}"
        return 1
    fi
    
    log "INFO" "Found PostgreSQL pods: ${pg_pods}"
    
    # Select the first pod for restoration
    local pg_pod=$(echo "${pg_pods}" | awk '{print $1}')
    
    # Get list of databases to restore
    local databases=()
    
    if [[ "${database_name}" == "all" ]]; then
        # Find all database backup files
        for db_file in "${backup_path}"/*.sql "${backup_path}"/*.dump "${backup_path}"/*.custom; do
            if [[ -f "${db_file}" ]]; then
                local db_name=$(basename "${db_file}" | sed -E 's/\.(sql|dump|custom)$//')
                databases+=("${db_name}")
            fi
        done
    else
        # Restore specific database
        databases=("${database_name}")
    fi
    
    if [[ ${#databases[@]} -eq 0 ]]; then
        log "ERROR" "No database backup files found in ${backup_path}"
        return 1
    fi
    
    log "INFO" "Databases to restore: ${databases[*]}"
    
    # Restore each database
    local result=0
    
    for db in "${databases[@]}"; do
        log "INFO" "Restoring database: ${db}"
        
        # Find the backup file for this database
        local backup_file=""
        
        for ext in "custom" "dump" "sql"; do
            if [[ -f "${backup_path}/${db}.${ext}" ]]; then
                backup_file="${backup_path}/${db}.${ext}"
                break
            fi
        done
        
        if [[ -z "${backup_file}" ]]; then
            log "ERROR" "No backup file found for database ${db}"
            result=1
            continue
        fi
        
        log "INFO" "Using backup file: ${backup_file}"
        
        # Check if database exists, create if needed
        if ! kubectl exec "${pg_pod}" -n "ims-${environment}" -- psql -U postgres -lqt | grep -qw "${db}"; then
            log "INFO" "Database ${db} does not exist, creating it"
            if ! kubectl exec "${pg_pod}" -n "ims-${environment}" -- psql -U postgres -c "CREATE DATABASE ${db}"; then
                log "ERROR" "Failed to create database ${db}"
                result=1
                continue
            fi
        fi
        
        # Stop dependent services to prevent writes during restore
        log "INFO" "Stopping dependent services for database ${db}"
        
        case "${db}" in
            "ims_ingestion")
                kubectl scale deployment ims-data-ingestion-service -n "ims-${environment}" --replicas=0 || true
                ;;
            "ims_calculation")
                kubectl scale deployment ims-calculation-service -n "ims-${environment}" --replicas=0 || true
                ;;
            "ims_workflow")
                kubectl scale deployment ims-workflow-service -n "ims-${environment}" --replicas=0 || true
                ;;
            "ims_auth")
                kubectl scale deployment ims-auth-service -n "ims-${environment}" --replicas=0 || true
                ;;
        esac
        
        # Wait for services to stop
        sleep 10
        
        # Execute restore based on file extension
        local restore_cmd=""
        local restore_options="--clean --if-exists --no-owner --no-privileges"
        
        if [[ "${backup_file}" == *.custom ]]; then
            # Custom format backup (created with pg_dump -Fc)
            restore_cmd="pg_restore ${restore_options} -U postgres -d ${db}"
        elif [[ "${backup_file}" == *.dump ]]; then
            # Plain SQL dump with custom format
            restore_cmd="pg_restore ${restore_options} -U postgres -d ${db}"
        elif [[ "${backup_file}" == *.sql ]]; then
            # Plain SQL dump
            restore_cmd="psql -U postgres -d ${db} -f -"
        else
            log "ERROR" "Unsupported backup file format: ${backup_file}"
            result=1
            continue
        fi
        
        log "INFO" "Executing restore command: ${restore_cmd}"
        
        # Copy backup file to the pod
        local pod_backup_file="/tmp/$(basename "${backup_file}")"
        if ! kubectl cp "${backup_file}" "${pg_pod}:${pod_backup_file}" -n "ims-${environment}"; then
            log "ERROR" "Failed to copy backup file to pod"
            result=1
            continue
        fi
        
        # Execute restore command
        if [[ "${backup_file}" == *.sql ]]; then
            if ! kubectl exec "${pg_pod}" -n "ims-${environment}" -- ${restore_cmd} < "${pod_backup_file}"; then
                log "ERROR" "Failed to restore database ${db} from SQL file"
                result=1
            fi
        else
            if ! kubectl exec "${pg_pod}" -n "ims-${environment}" -- ${restore_cmd} "${pod_backup_file}"; then
                log "ERROR" "Failed to restore database ${db} from dump file"
                result=1
            fi
        fi
        
        # Apply WAL archives for point-in-time recovery if available
        if [[ -d "${backup_path}/wal_archive" ]]; then
            log "INFO" "WAL archives found, applying for point-in-time recovery"
            
            # Copy WAL archives to the pod
            if ! kubectl cp "${backup_path}/wal_archive" "${pg_pod}:/tmp/wal_archive" -n "ims-${environment}"; then
                log "ERROR" "Failed to copy WAL archives to pod"
                result=1
            else
                # Apply WAL archives (this would be specific to your PostgreSQL setup)
                # For example, you might need to configure recovery.conf and restart PostgreSQL
                log "WARNING" "Point-in-time recovery from WAL archives requires manual intervention"
                log "WARNING" "WAL archives have been copied to ${pg_pod}:/tmp/wal_archive"
            fi
        fi
        
        # Clean up temporary file in pod
        kubectl exec "${pg_pod}" -n "ims-${environment}" -- rm -f "${pod_backup_file}" || true
        
        # Verify restore integrity with a simple query
        log "INFO" "Verifying restore integrity for database ${db}"
        if ! kubectl exec "${pg_pod}" -n "ims-${environment}" -- psql -U postgres -d "${db}" -c "SELECT 1"; then
            log "ERROR" "Restore verification failed for database ${db}"
            result=1
        else
            log "INFO" "Restore verification successful for database ${db}"
        fi
        
        # Restart dependent services
        log "INFO" "Restarting dependent services for database ${db}"
        
        case "${db}" in
            "ims_ingestion")
                kubectl scale deployment ims-data-ingestion-service -n "ims-${environment}" --replicas=1 || true
                ;;
            "ims_calculation")
                kubectl scale deployment ims-calculation-service -n "ims-${environment}" --replicas=1 || true
                ;;
            "ims_workflow")
                kubectl scale deployment ims-workflow-service -n "ims-${environment}" --replicas=1 || true
                ;;
            "ims_auth")
                kubectl scale deployment ims-auth-service -n "ims-${environment}" --replicas=1 || true
                ;;
        esac
    done
    
    return ${result}
}

# Function to restore TimescaleDB time-series databases
restore_timescaledb() {
    local environment="$1"
    local backup_path="$2"
    
    log "INFO" "Restoring TimescaleDB in ${environment} environment"
    
    # Identify TimescaleDB pods in the cluster
    local tsdb_pods=$(kubectl get pods -n "ims-${environment}" -l app=ims-timescaledb -o jsonpath='{.items[*].metadata.name}')
    
    if [[ -z "${tsdb_pods}" ]]; then
        log "ERROR" "No TimescaleDB pods found in namespace ims-${environment}"
        return 1
    fi
    
    log "INFO" "Found TimescaleDB pods: ${tsdb_pods}"
    
    # Select the first pod for restoration
    local tsdb_pod=$(echo "${tsdb_pods}" | awk '{print $1}')
    
    # Find TimescaleDB backup files
    local backup_files=()
    for file in "${backup_path}"/*.sql "${backup_path}"/*.dump "${backup_path}"/*.custom; do
        if [[ -f "${file}" ]]; then
            backup_files+=("${file}")
        fi
    done
    
    if [[ ${#backup_files[@]} -eq 0 ]]; then
        log "ERROR" "No TimescaleDB backup files found in ${backup_path}"
        return 1
    fi
    
    log "INFO" "TimescaleDB backup files found: ${backup_files[*]}"
    
    # Stop dependent services to prevent writes during restore
    log "INFO" "Stopping dependent services for TimescaleDB"
    kubectl scale deployment ims-market-data-service -n "ims-${environment}" --replicas=0 || true
    
    # Wait for services to stop
    sleep 10
    
    # Restore each backup file
    local result=0
    
    for backup_file in "${backup_files[@]}"; do
        local db_name=$(basename "${backup_file}" | sed -E 's/\.(sql|dump|custom)$//')
        
        log "INFO" "Restoring TimescaleDB database: ${db_name}"
        
        # Check if database exists, create if needed
        if ! kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- psql -U postgres -lqt | grep -qw "${db_name}"; then
            log "INFO" "Database ${db_name} does not exist, creating it"
            if ! kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- psql -U postgres -c "CREATE DATABASE ${db_name}"; then
                log "ERROR" "Failed to create database ${db_name}"
                result=1
                continue
            fi
            
            # Enable TimescaleDB extension
            log "INFO" "Enabling TimescaleDB extension in database ${db_name}"
            if ! kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- psql -U postgres -d "${db_name}" -c "CREATE EXTENSION IF NOT EXISTS timescaledb"; then
                log "ERROR" "Failed to enable TimescaleDB extension in database ${db_name}"
                result=1
                continue
            fi
        fi
        
        # Execute restore based on file extension
        local restore_cmd=""
        local restore_options="--clean --if-exists --no-owner --no-privileges"
        
        if [[ "${backup_file}" == *.custom ]]; then
            # Custom format backup (created with pg_dump -Fc)
            restore_cmd="pg_restore ${restore_options} -U postgres -d ${db_name}"
        elif [[ "${backup_file}" == *.dump ]]; then
            # Plain SQL dump with custom format
            restore_cmd="pg_restore ${restore_options} -U postgres -d ${db_name}"
        elif [[ "${backup_file}" == *.sql ]]; then
            # Plain SQL dump
            restore_cmd="psql -U postgres -d ${db_name} -f -"
        else
            log "ERROR" "Unsupported backup file format: ${backup_file}"
            result=1
            continue
        fi
        
        log "INFO" "Executing restore command: ${restore_cmd}"
        
        # Copy backup file to the pod
        local pod_backup_file="/tmp/$(basename "${backup_file}")"
        if ! kubectl cp "${backup_file}" "${tsdb_pod}:${pod_backup_file}" -n "ims-${environment}"; then
            log "ERROR" "Failed to copy backup file to pod"
            result=1
            continue
        fi
        
        # Execute restore command
        if [[ "${backup_file}" == *.sql ]]; then
            if ! kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- ${restore_cmd} < "${pod_backup_file}"; then
                log "ERROR" "Failed to restore database ${db_name} from SQL file"
                result=1
            fi
        else
            if ! kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- ${restore_cmd} "${pod_backup_file}"; then
                log "ERROR" "Failed to restore database ${db_name} from dump file"
                result=1
            fi
        fi
        
        # Clean up temporary file in pod
        kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- rm -f "${pod_backup_file}" || true
        
        # Verify TimescaleDB extension and hypertables
        log "INFO" "Verifying TimescaleDB extension and hypertables in database ${db_name}"
        if ! kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- psql -U postgres -d "${db_name}" -c "SELECT extname FROM pg_extension WHERE extname='timescaledb';" | grep -q "timescaledb"; then
            log "ERROR" "TimescaleDB extension not found in database ${db_name}"
            result=1
        else
            log "INFO" "TimescaleDB extension verified in database ${db_name}"
            
            # Check for hypertables
            local hypertable_count=$(kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- psql -U postgres -d "${db_name}" -c "SELECT count(*) FROM timescaledb_information.hypertables;" -t | tr -d ' ')
            log "INFO" "Found ${hypertable_count} hypertables in database ${db_name}"
        fi
    done
    
    # Apply WAL archives for point-in-time recovery if available
    if [[ -d "${backup_path}/wal_archive" ]]; then
        log "INFO" "WAL archives found, applying for point-in-time recovery"
        
        # Copy WAL archives to the pod
        if ! kubectl cp "${backup_path}/wal_archive" "${tsdb_pod}:/tmp/wal_archive" -n "ims-${environment}"; then
            log "ERROR" "Failed to copy WAL archives to pod"
            result=1
        else
            # Apply WAL archives (this would be specific to your TimescaleDB setup)
            # For example, you might need to configure recovery.conf and restart TimescaleDB
            log "WARNING" "Point-in-time recovery from WAL archives requires manual intervention"
            log "WARNING" "WAL archives have been copied to ${tsdb_pod}:/tmp/wal_archive"
        fi
    fi
    
    # Restart dependent services
    log "INFO" "Restarting dependent services for TimescaleDB"
    kubectl scale deployment ims-market-data-service -n "ims-${environment}" --replicas=1 || true
    
    return ${result}
}

# Function to restore Cassandra keyspaces
restore_cassandra() {
    local environment="$1"
    local keyspace_name="$2"
    local backup_path="$3"
    
    log "INFO" "Restoring Cassandra keyspace(s) in ${environment} environment: ${keyspace_name}"
    
    # Identify Cassandra pods in the cluster
    local cassandra_pods=$(kubectl get pods -n "ims-${environment}" -l app=ims-cassandra -o jsonpath='{.items[*].metadata.name}')
    
    if [[ -z "${cassandra_pods}" ]]; then
        log "ERROR" "No Cassandra pods found in namespace ims-${environment}"
        return 1
    fi
    
    log "INFO" "Found Cassandra pods: ${cassandra_pods}"
    
    # Get list of keyspaces to restore
    local keyspaces=()
    
    if [[ "${keyspace_name}" == "all" ]]; then
        # Find all keyspace backup directories
        for ks_dir in "${backup_path}"/*/ ; do
            if [[ -d "${ks_dir}" ]]; then
                local ks_name=$(basename "${ks_dir}")
                keyspaces+=("${ks_name}")
            fi
        done
    else
        # Restore specific keyspace
        keyspaces=("${keyspace_name}")
    fi
    
    if [[ ${#keyspaces[@]} -eq 0 ]]; then
        log "ERROR" "No keyspace backup directories found in ${backup_path}"
        return 1
    fi
    
    log "INFO" "Keyspaces to restore: ${keyspaces[*]}"
    
    # Restore each keyspace
    local result=0
    
    for keyspace in "${keyspaces[@]}"; do
        log "INFO" "Restoring keyspace: ${keyspace}"
        
        # Find the backup directory for this keyspace
        local keyspace_backup_dir="${backup_path}/${keyspace}"
        
        if [[ ! -d "${keyspace_backup_dir}" ]]; then
            log "ERROR" "No backup directory found for keyspace ${keyspace}"
            result=1
            continue
        fi
        
        # Check if schema file exists
        local schema_file="${keyspace_backup_dir}/schema.cql"
        
        if [[ ! -f "${schema_file}" ]]; then
            log "ERROR" "Schema file not found for keyspace ${keyspace}: ${schema_file}"
            result=1
            continue
        fi
        
        # Stop dependent services to prevent writes during restore
        log "INFO" "Stopping dependent services for keyspace ${keyspace}"
        
        case "${keyspace}" in
            "ims_inventory")
                kubectl scale deployment ims-position-service -n "ims-${environment}" --replicas=0 || true
                kubectl scale deployment ims-inventory-service -n "ims-${environment}" --replicas=0 || true
                ;;
            "ims_analytics")
                kubectl scale deployment ims-analytics-service -n "ims-${environment}" --replicas=0 || true
                ;;
        esac
        
        # Wait for services to stop
        sleep 10
        
        # Restore schema first
        log "INFO" "Restoring schema for keyspace ${keyspace}"
        
        # Select the first pod for schema restoration
        local primary_pod=$(echo "${cassandra_pods}" | awk '{print $1}')
        
        # Copy schema file to the pod
        if ! kubectl cp "${schema_file}" "${primary_pod}:/tmp/schema.cql" -n "ims-${environment}"; then
            log "ERROR" "Failed to copy schema file to pod"
            result=1
            continue
        fi
        
        # Execute schema restoration
        if ! kubectl exec "${primary_pod}" -n "ims-${environment}" -- cqlsh -f /tmp/schema.cql; then
            log "ERROR" "Failed to restore schema for keyspace ${keyspace}"
            result=1
            continue
        fi
        
        # Truncate existing tables if they exist
        log "INFO" "Truncating existing tables in keyspace ${keyspace}"
        
        # Get list of tables in the keyspace
        local tables=$(kubectl exec "${primary_pod}" -n "ims-${environment}" -- cqlsh -e "DESCRIBE TABLES FROM ${keyspace};" | grep -v "^$" | tr -d ' ')
        
        for table in ${tables}; do
            log "INFO" "Truncating table ${keyspace}.${table}"
            if ! kubectl exec "${primary_pod}" -n "ims-${environment}" -- cqlsh -e "TRUNCATE TABLE ${keyspace}.${table};"; then
                log "WARNING" "Failed to truncate table ${keyspace}.${table}"
                # Continue despite errors
            fi
        done
        
        # Find snapshot directories
        local snapshot_dirs=()
        for dir in "${keyspace_backup_dir}"/*/snapshots/* ; do
            if [[ -d "${dir}" ]]; then
                snapshot_dirs+=("${dir}")
            fi
        done
        
        if [[ ${#snapshot_dirs[@]} -eq 0 ]]; then
            log "ERROR" "No snapshot directories found for keyspace ${keyspace}"
            result=1
            continue
        fi
        
        log "INFO" "Found ${#snapshot_dirs[@]} snapshot directories for keyspace ${keyspace}"
        
        # Restore data files for each Cassandra pod
        for pod in ${cassandra_pods}; do
            log "INFO" "Restoring data files to pod ${pod}"
            
            # Get Cassandra data directory
            local data_dir=$(kubectl exec "${pod}" -n "ims-${environment}" -- sh -c 'echo $CASSANDRA_DATA')
            
            if [[ -z "${data_dir}" ]]; then
                data_dir="/var/lib/cassandra/data"
                log "WARNING" "Using default Cassandra data directory: ${data_dir}"
            else
                log "INFO" "Using Cassandra data directory: ${data_dir}"
            fi
            
            # Create temporary directory for data files
            kubectl exec "${pod}" -n "ims-${environment}" -- mkdir -p /tmp/cassandra_restore
            
            # Copy snapshot directories to the pod
            for snapshot_dir in "${snapshot_dirs[@]}"; do
                local cf_name=$(basename "$(dirname "$(dirname "${snapshot_dir}")")")
                log "INFO" "Copying snapshot for column family ${cf_name} to pod ${pod}"
                
                # Create directory for this column family
                kubectl exec "${pod}" -n "ims-${environment}" -- mkdir -p "/tmp/cassandra_restore/${keyspace}/${cf_name}"
                
                # Find all files in the snapshot directory
                find "${snapshot_dir}" -type f -name "*.db" | while read -r file; do
                    local base_name=$(basename "${file}")
                    kubectl cp "${file}" "${pod}:/tmp/cassandra_restore/${keyspace}/${cf_name}/${base_name}" -n "ims-${environment}"
                done
            done
            
            # Move files to Cassandra data directory
            log "INFO" "Moving restored files to Cassandra data directory"
            kubectl exec "${pod}" -n "ims-${environment}" -- sh -c "for cf in \$(ls /tmp/cassandra_restore/${keyspace}/); do mkdir -p ${data_dir}/${keyspace}/\${cf}; cp /tmp/cassandra_restore/${keyspace}/\${cf}/* ${data_dir}/${keyspace}/\${cf}/; done"
            
            # Refresh system keyspace (to recognize new files)
            log "INFO" "Refreshing system keyspace on pod ${pod}"
            kubectl exec "${pod}" -n "ims-${environment}" -- nodetool refresh -- "${keyspace}"
            
            # Clean up temporary files
            kubectl exec "${pod}" -n "ims-${environment}" -- rm -rf /tmp/cassandra_restore
            kubectl exec "${pod}" -n "ims-${environment}" -- rm -f /tmp/schema.cql
        done
        
        # Verify restore integrity
        log "INFO" "Verifying restore integrity for keyspace ${keyspace}"
        if ! kubectl exec "${primary_pod}" -n "ims-${environment}" -- cqlsh -e "SELECT count(*) FROM system_schema.keyspaces WHERE keyspace_name = '${keyspace}';" | grep -q "1"; then
            log "ERROR" "Restore verification failed for keyspace ${keyspace}"
            result=1
        else
            log "INFO" "Restore verification successful for keyspace ${keyspace}"
            
            # Check if tables have data
            for table in ${tables}; do
                local count=$(kubectl exec "${primary_pod}" -n "ims-${environment}" -- cqlsh -e "SELECT count(*) FROM ${keyspace}.${table} LIMIT 1;" | grep -o "[0-9]*" | head -1)
                log "INFO" "Table ${keyspace}.${table} has approximately ${count} rows"
            done
        fi
        
        # Restart dependent services
        log "INFO" "Restarting dependent services for keyspace ${keyspace}"
        
        case "${keyspace}" in
            "ims_inventory")
                kubectl scale deployment ims-position-service -n "ims-${environment}" --replicas=1 || true
                kubectl scale deployment ims-inventory-service -n "ims-${environment}" --replicas=1 || true
                ;;
            "ims_analytics")
                kubectl scale deployment ims-analytics-service -n "ims-${environment}" --replicas=1 || true
                ;;
        esac
    done
    
    return ${result}
}

# Function to restore Redis data
restore_redis() {
    local environment="$1"
    local backup_path="$2"
    
    log "INFO" "Restoring Redis data in ${environment} environment"
    
    # Identify Redis pods in the cluster
    local redis_pods=$(kubectl get pods -n "ims-${environment}" -l app=ims-redis -o jsonpath='{.items[*].metadata.name}')
    
    if [[ -z "${redis_pods}" ]]; then
        log "ERROR" "No Redis pods found in namespace ims-${environment}"
        return 1
    fi
    
    log "INFO" "Found Redis pods: ${redis_pods}"
    
    # Find Redis RDB backup files
    local rdb_files=()
    for file in "${backup_path}"/*.rdb; do
        if [[ -f "${file}" ]]; then
            rdb_files+=("${file}")
        fi
    done
    
    if [[ ${#rdb_files[@]} -eq 0 ]]; then
        log "ERROR" "No Redis RDB backup files found in ${backup_path}"
        return 1
    fi
    
    log "INFO" "Redis RDB backup files found: ${rdb_files[*]}"
    
    # Stop dependent services to prevent writes during restore
    log "INFO" "Stopping dependent services for Redis"
    kubectl scale deployment ims-api-gateway -n "ims-${environment}" --replicas=0 || true
    kubectl scale deployment ims-websocket-service -n "ims-${environment}" --replicas=0 || true
    
    # Wait for services to stop
    sleep 10
    
    # Restore each Redis instance
    local result=0
    
    for pod in ${redis_pods}; do
        log "INFO" "Restoring Redis data to pod ${pod}"
        
        # Get Redis configuration to find data directory
        local redis_dir=$(kubectl exec "${pod}" -n "ims-${environment}" -- sh -c 'redis-cli config get dir | grep -v dir')
        
        if [[ -z "${redis_dir}" ]]; then
            redis_dir="/data"
            log "WARNING" "Using default Redis data directory: ${redis_dir}"
        else
            log "INFO" "Using Redis data directory: ${redis_dir}"
        fi
        
        # Select the first RDB file for now (we could extend this to handle multiple Redis instances)
        local rdb_file="${rdb_files[0]}"
        local rdb_filename=$(basename "${rdb_file}")
        
        # Stop Redis server
        log "INFO" "Stopping Redis server on pod ${pod}"
        if ! kubectl exec "${pod}" -n "ims-${environment}" -- sh -c "redis-cli shutdown"; then
            log "WARNING" "Failed to shutdown Redis gracefully, will try to continue anyway"
            # Let's wait a moment for Redis to shutdown even if the command failed
            sleep 5
        else
            # Wait for Redis to shutdown
            sleep 5
        fi
        
        # Copy RDB file to the pod
        log "INFO" "Copying RDB file to pod ${pod}"
        if ! kubectl cp "${rdb_file}" "${pod}:${redis_dir}/${rdb_filename}" -n "ims-${environment}"; then
            log "ERROR" "Failed to copy RDB file to pod"
            result=1
            continue
        fi
        
        # Rename RDB file to dump.rdb if necessary
        if [[ "${rdb_filename}" != "dump.rdb" ]]; then
            log "INFO" "Renaming ${rdb_filename} to dump.rdb"
            if ! kubectl exec "${pod}" -n "ims-${environment}" -- sh -c "mv ${redis_dir}/${rdb_filename} ${redis_dir}/dump.rdb"; then
                log "ERROR" "Failed to rename RDB file"
                result=1
                continue
            fi
        fi
        
        # Start Redis server
        log "INFO" "Starting Redis server on pod ${pod}"
        if ! kubectl exec "${pod}" -n "ims-${environment}" -- sh -c "redis-server --daemonize yes"; then
            log "ERROR" "Failed to start Redis server"
            result=1
            continue
        fi
        
        # Wait for Redis to start
        sleep 5
        
        # Verify Redis data integrity
        log "INFO" "Verifying Redis data integrity on pod ${pod}"
        if ! kubectl exec "${pod}" -n "ims-${environment}" -- redis-cli ping | grep -q "PONG"; then
            log "ERROR" "Redis server is not responding"
            result=1
        else
            log "INFO" "Redis server is responding"
            
            # Get key count
            local key_count=$(kubectl exec "${pod}" -n "ims-${environment}" -- redis-cli dbsize)
            log "INFO" "Redis database has ${key_count} keys"
            
            if [[ "${key_count}" -eq 0 ]]; then
                log "WARNING" "Redis database is empty after restore"
            fi
        fi
    done
    
    # Restart dependent services
    log "INFO" "Restarting dependent services for Redis"
    kubectl scale deployment ims-api-gateway -n "ims-${environment}" --replicas=1 || true
    kubectl scale deployment ims-websocket-service -n "ims-${environment}" --replicas=1 || true
    
    return ${result}
}

# Function to restore Kubernetes configuration resources
restore_config() {
    local environment="$1"
    local resource_type="$2"
    local backup_path="$3"
    
    log "INFO" "Restoring Kubernetes configuration resources in ${environment} environment: ${resource_type}"
    
    # Find configuration backup files
    local config_files=()
    
    if [[ "${resource_type}" == "all" ]]; then
        # Find all YAML configuration files
        for file in "${backup_path}"/*.yaml "${backup_path}"/*.yml; do
            if [[ -f "${file}" ]]; then
                config_files+=("${file}")
            fi
        done
    else
        # Find configuration files for specific resource type
        for file in "${backup_path}/${resource_type}"*.yaml "${backup_path}/${resource_type}"*.yml; do
            if [[ -f "${file}" ]]; then
                config_files+=("${file}")
            fi
        done
    fi
    
    if [[ ${#config_files[@]} -eq 0 ]]; then
        log "ERROR" "No configuration backup files found in ${backup_path}"
        return 1
    fi
    
    log "INFO" "Configuration files found: ${config_files[*]}"
    
    # Apply configuration files
    local result=0
    
    for config_file in "${config_files[@]}"; do
        local file_name=$(basename "${config_file}")
        log "INFO" "Applying configuration file: ${file_name}"
        
        # Apply YAML configuration using kubectl apply
        if ! kubectl apply -f "${config_file}" -n "ims-${environment}"; then
            log "ERROR" "Failed to apply configuration file: ${file_name}"
            result=1
            continue
        fi
        
        log "INFO" "Successfully applied configuration file: ${file_name}"
    done
    
    # Verify resources were created successfully
    log "INFO" "Verifying resource creation"
    
    # Wait a moment for resources to be created
    sleep 5
    
    for config_file in "${config_files[@]}"; do
        # Extract resource kind and name from the YAML file
        local kind=$(grep -E "^kind:" "${config_file}" | head -1 | awk '{print $2}')
        local name=$(grep -E "^  name:" "${config_file}" | head -1 | awk '{print $2}')
        
        if [[ -n "${kind}" && -n "${name}" ]]; then
            log "INFO" "Verifying ${kind} ${name}"
            
            if ! kubectl get "${kind}" "${name}" -n "ims-${environment}" &>/dev/null; then
                log "ERROR" "Resource ${kind} ${name} not found after applying configuration"
                result=1
            else
                log "INFO" "Resource ${kind} ${name} created successfully"
            fi
        else
            log "WARNING" "Could not extract resource kind and name from ${config_file}"
        fi
    done
    
    # Restart affected pods if necessary
    if [[ "${resource_type}" == "ConfigMap" || "${resource_type}" == "Secret" || "${resource_type}" == "all" ]]; then
        log "INFO" "Configuration resources updated, restarting affected pods"
        
        # Find deployments referencing affected ConfigMaps or Secrets
        local deployments=$(kubectl get deployments -n "ims-${environment}" -l app=ims -o jsonpath='{.items[*].metadata.name}')
        
        for deployment in ${deployments}; do
            log "INFO" "Restarting deployment: ${deployment}"
            kubectl rollout restart deployment "${deployment}" -n "ims-${environment}" || {
                log "WARNING" "Failed to restart deployment: ${deployment}"
                # Continue despite errors
            }
        done
    fi
    
    return ${result}
}

# Function to verify restore was successful
verify_restore() {
    local environment="$1"
    local component="$2"
    
    log "INFO" "Verifying restore for ${component} in ${environment} environment"
    
    local result=0
    
    case "${component}" in
        "postgresql")
            # Verify PostgreSQL restore
            log "INFO" "Verifying PostgreSQL restore"
            
            # Get PostgreSQL pod
            local pg_pod=$(kubectl get pods -n "ims-${environment}" -l app=ims-postgresql -o jsonpath='{.items[0].metadata.name}')
            
            if [[ -z "${pg_pod}" ]]; then
                log "ERROR" "No PostgreSQL pod found in namespace ims-${environment}"
                return 1
            fi
            
            # Run test queries on each database
            local databases=("ims_ingestion" "ims_calculation" "ims_workflow" "ims_auth")
            
            for db in "${databases[@]}"; do
                log "INFO" "Verifying database: ${db}"
                
                # Check if database exists
                if ! kubectl exec "${pg_pod}" -n "ims-${environment}" -- psql -U postgres -lqt | grep -qw "${db}"; then
                    log "WARNING" "Database ${db} does not exist, skipping verification"
                    continue
                fi
                
                # Run a simple query
                if ! kubectl exec "${pg_pod}" -n "ims-${environment}" -- psql -U postgres -d "${db}" -c "SELECT 1"; then
                    log "ERROR" "Failed to run query on database ${db}"
                    result=1
                else
                    log "INFO" "Successfully ran query on database ${db}"
                    
                    # Get table count
                    local table_count=$(kubectl exec "${pg_pod}" -n "ims-${environment}" -- psql -U postgres -d "${db}" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" -t | tr -d ' ')
                    log "INFO" "Database ${db} has ${table_count} tables"
                    
                    if [[ "${table_count}" -eq 0 ]]; then
                        log "WARNING" "Database ${db} has no tables, possible restore issue"
                        result=1
                    fi
                fi
            done
            ;;
            
        "timescaledb")
            # Verify TimescaleDB restore
            log "INFO" "Verifying TimescaleDB restore"
            
            # Get TimescaleDB pod
            local tsdb_pod=$(kubectl get pods -n "ims-${environment}" -l app=ims-timescaledb -o jsonpath='{.items[0].metadata.name}')
            
            if [[ -z "${tsdb_pod}" ]]; then
                log "ERROR" "No TimescaleDB pod found in namespace ims-${environment}"
                return 1
            fi
            
            # Verify ims_timeseries database
            local db="ims_timeseries"
            
            # Check if database exists
            if ! kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- psql -U postgres -lqt | grep -qw "${db}"; then
                log "ERROR" "Database ${db} does not exist"
                return 1
            fi
            
            # Verify TimescaleDB extension
            if ! kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- psql -U postgres -d "${db}" -c "SELECT extname FROM pg_extension WHERE extname='timescaledb';" | grep -q "timescaledb"; then
                log "ERROR" "TimescaleDB extension not found in database ${db}"
                result=1
            else
                log "INFO" "TimescaleDB extension verified in database ${db}"
                
                # Check for hypertables
                local hypertable_count=$(kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- psql -U postgres -d "${db}" -c "SELECT count(*) FROM timescaledb_information.hypertables;" -t | tr -d ' ')
                log "INFO" "Found ${hypertable_count} hypertables in database ${db}"
                
                if [[ "${hypertable_count}" -eq 0 ]]; then
                    log "WARNING" "No hypertables found in database ${db}, possible restore issue"
                    result=1
                else
                    # Check for data in hypertables
                    local hypertables=$(kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- psql -U postgres -d "${db}" -c "SELECT hypertable_name FROM timescaledb_information.hypertables;" -t | tr -d ' ')
                    
                    for hypertable in ${hypertables}; do
                        local count=$(kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- psql -U postgres -d "${db}" -c "SELECT count(*) FROM ${hypertable} LIMIT 1;" -t | tr -d ' ')
                        log "INFO" "Hypertable ${hypertable} has approximately ${count} rows"
                    done
                fi
            fi
            ;;
            
        "cassandra")
            # Verify Cassandra restore
            log "INFO" "Verifying Cassandra restore"
            
            # Get Cassandra pod
            local cassandra_pod=$(kubectl get pods -n "ims-${environment}" -l app=ims-cassandra -o jsonpath='{.items[0].metadata.name}')
            
            if [[ -z "${cassandra_pod}" ]]; then
                log "ERROR" "No Cassandra pod found in namespace ims-${environment}"
                return 1
            fi
            
            # Verify keyspaces
            local keyspaces=("ims_inventory" "ims_analytics" "ims_audit")
            
            for keyspace in "${keyspaces[@]}"; do
                log "INFO" "Verifying keyspace: ${keyspace}"
                
                # Check if keyspace exists
                if ! kubectl exec "${cassandra_pod}" -n "ims-${environment}" -- cqlsh -e "DESCRIBE KEYSPACE ${keyspace};" &>/dev/null; then
                    log "WARNING" "Keyspace ${keyspace} does not exist, skipping verification"
                    continue
                fi
                
                # Get table count
                local tables=$(kubectl exec "${cassandra_pod}" -n "ims-${environment}" -- cqlsh -e "DESCRIBE TABLES FROM ${keyspace};" | grep -v "^$" | tr -d ' ')
                local table_count=$(echo "${tables}" | wc -l)
                
                log "INFO" "Keyspace ${keyspace} has ${table_count} tables"
                
                if [[ "${table_count}" -eq 0 ]]; then
                    log "WARNING" "Keyspace ${keyspace} has no tables, possible restore issue"
                    result=1
                else
                    # Check for data in tables
                    for table in ${tables}; do
                        local count=$(kubectl exec "${cassandra_pod}" -n "ims-${environment}" -- cqlsh -e "SELECT count(*) FROM ${keyspace}.${table} LIMIT 1;" | grep -o "[0-9]*" | head -1)
                        log "INFO" "Table ${keyspace}.${table} has approximately ${count} rows"
                    done
                fi
            done
            ;;
            
        "redis")
            # Verify Redis restore
            log "INFO" "Verifying Redis restore"
            
            # Get Redis pod
            local redis_pod=$(kubectl get pods -n "ims-${environment}" -l app=ims-redis -o jsonpath='{.items[0].metadata.name}')
            
            if [[ -z "${redis_pod}" ]]; then
                log "ERROR" "No Redis pod found in namespace ims-${environment}"
                return 1
            fi
            
            # Check Redis connectivity
            if ! kubectl exec "${redis_pod}" -n "ims-${environment}" -- redis-cli ping | grep -q "PONG"; then
                log "ERROR" "Redis is not responding"
                result=1
            else
                log "INFO" "Redis is responding"
                
                # Get key count
                local key_count=$(kubectl exec "${redis_pod}" -n "ims-${environment}" -- redis-cli dbsize)
                log "INFO" "Redis database has ${key_count} keys"
                
                if [[ "${key_count}" -eq 0 ]]; then
                    log "WARNING" "Redis database is empty, possible restore issue"
                    result=1
                else
                    # Get sample keys
                    local keys=$(kubectl exec "${redis_pod}" -n "ims-${environment}" -- redis-cli --scan --count 5)
                    log "INFO" "Sample Redis keys: ${keys}"
                fi
            fi
            ;;
            
        "config")
            # Verify Kubernetes config restore
            log "INFO" "Verifying Kubernetes configuration restore"
            
            # Check for common resource types
            local resource_types=("ConfigMap" "Secret" "Deployment" "Service" "HorizontalPodAutoscaler")
            
            for resource_type in "${resource_types[@]}"; do
                log "INFO" "Checking for ${resource_type} resources"
                
                local resources=$(kubectl get "${resource_type}" -n "ims-${environment}" -l app=ims -o jsonpath='{.items[*].metadata.name}')
                
                if [[ -z "${resources}" ]]; then
                    log "WARNING" "No ${resource_type} resources found with label app=ims"
                    continue
                fi
                
                local resource_count=$(echo "${resources}" | wc -w)
                log "INFO" "Found ${resource_count} ${resource_type} resources"
                
                # For deployments, check if they're running
                if [[ "${resource_type}" == "Deployment" ]]; then
                    for deployment in ${resources}; do
                        local replicas=$(kubectl get deployment "${deployment}" -n "ims-${environment}" -o jsonpath='{.status.readyReplicas}')
                        log "INFO" "Deployment ${deployment} has ${replicas} ready replicas"
                        
                        if [[ -z "${replicas}" || "${replicas}" -eq 0 ]]; then
                            log "WARNING" "Deployment ${deployment} has no ready replicas"
                            result=1
                        fi
                    done
                fi
            done
            ;;
            
        *)
            log "ERROR" "Unknown component: ${component}"
            result=1
            ;;
    esac
    
    if [[ "${result}" -eq 0 ]]; then
        log "INFO" "Verification successful for ${component} in ${environment} environment"
    else
        log "ERROR" "Verification failed for ${component} in ${environment} environment"
    fi
    
    return ${result}
}

# Function to perform system health check after restore
system_health_check() {
    local environment="$1"
    
    log "INFO" "Performing system health check for ${environment} environment"
    
    local result=0
    
    # Wait for services to be fully ready
    log "INFO" "Waiting for services to be ready"
    sleep 30
    
    # Define critical services to check
    local services=(
        "ims-api-gateway:http://ims-api-gateway.ims-${environment}.svc.cluster.local:8080/health"
        "ims-data-ingestion-service:http://ims-data-ingestion-service.ims-${environment}.svc.cluster.local:8080/health"
        "ims-calculation-service:http://ims-calculation-service.ims-${environment}.svc.cluster.local:8080/health"
        "ims-position-service:http://ims-position-service.ims-${environment}.svc.cluster.local:8080/health"
        "ims-inventory-service:http://ims-inventory-service.ims-${environment}.svc.cluster.local:8080/health"
        "ims-workflow-service:http://ims-workflow-service.ims-${environment}.svc.cluster.local:8080/health"
        "ims-market-data-service:http://ims-market-data-service.ims-${environment}.svc.cluster.local:8080/health"
    )
    
    # Check each service
    for service_info in "${services[@]}"; do
        local service_name=$(echo "${service_info}" | cut -d: -f1)
        local health_endpoint=$(echo "${service_info}" | cut -d: -f2-)
        
        log "INFO" "Checking health of service: ${service_name}"
        
        if ! check_service_health "${service_name}" "${health_endpoint}"; then
            log "ERROR" "Health check failed for service: ${service_name}"
            result=1
        fi
    done
    
    # Verify database connectivity
    log "INFO" "Verifying database connectivity"
    
    # PostgreSQL check
    local pg_pod=$(kubectl get pods -n "ims-${environment}" -l app=ims-postgresql -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [[ -n "${pg_pod}" ]]; then
        if ! kubectl exec "${pg_pod}" -n "ims-${environment}" -- psql -U postgres -c "SELECT 1" &>/dev/null; then
            log "ERROR" "PostgreSQL connectivity check failed"
            result=1
        else
            log "INFO" "PostgreSQL connectivity verified"
        fi
    else
        log "WARNING" "No PostgreSQL pod found, skipping connectivity check"
    fi
    
    # TimescaleDB check
    local tsdb_pod=$(kubectl get pods -n "ims-${environment}" -l app=ims-timescaledb -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [[ -n "${tsdb_pod}" ]]; then
        if ! kubectl exec "${tsdb_pod}" -n "ims-${environment}" -- psql -U postgres -c "SELECT 1" &>/dev/null; then
            log "ERROR" "TimescaleDB connectivity check failed"
            result=1
        else
            log "INFO" "TimescaleDB connectivity verified"
        fi
    else
        log "WARNING" "No TimescaleDB pod found, skipping connectivity check"
    fi
    
    # Cassandra check
    local cassandra_pod=$(kubectl get pods -n "ims-${environment}" -l app=ims-cassandra -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [[ -n "${cassandra_pod}" ]]; then
        if ! kubectl exec "${cassandra_pod}" -n "ims-${environment}" -- cqlsh -e "SELECT key FROM system.local" &>/dev/null; then
            log "ERROR" "Cassandra connectivity check failed"
            result=1
        else
            log "INFO" "Cassandra connectivity verified"
        fi
    else
        log "WARNING" "No Cassandra pod found, skipping connectivity check"
    fi
    
    # Redis check
    local redis_pod=$(kubectl get pods -n "ims-${environment}" -l app=ims-redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [[ -n "${redis_pod}" ]]; then
        if ! kubectl exec "${redis_pod}" -n "ims-${environment}" -- redis-cli ping | grep -q "PONG"; then
            log "ERROR" "Redis connectivity check failed"
            result=1
        else
            log "INFO" "Redis connectivity verified"
        fi
    else
        log "WARNING" "No Redis pod found, skipping connectivity check"
    fi
    
    log "INFO" "System health check completed with status: $([[ ${result} -eq 0 ]] && echo "HEALTHY" || echo "UNHEALTHY")"
    
    return ${result}
}

# Function to send restore completion notification
send_notification() {
    local environment="$1"
    local status="$2"
    local message="$3"
    
    log "INFO" "Sending restore completion notification for ${environment} environment: ${status}"
    
    # Determine notification recipients based on environment
    local recipients=""
    
    case "${environment}" in
        "dev")
            recipients="${RESTORE_NOTIFICATION_EMAIL:-dev-team@example.com}"
            ;;
        "staging")
            recipients="${RESTORE_NOTIFICATION_EMAIL:-ops@example.com,qa-team@example.com}"
            ;;
        "prod")
            recipients="${RESTORE_NOTIFICATION_EMAIL:-ops@example.com,oncall@example.com}"
            ;;
    esac
    
    # Format notification message
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local hostname=$(hostname)
    local user=$(whoami)
    local notification_subject="IMS Restore ${status} - ${environment} - ${timestamp}"
    local notification_body="
Restore Status: ${status}
Environment: ${environment}
Timestamp: ${timestamp}
Executed by: ${user}@${hostname}
Log file: ${LOG_FILE}

${message}
"
    
    # Send email notification
    if [[ -n "${recipients}" ]]; then
        log "INFO" "Sending email notification to ${recipients}"
        echo "${notification_body}" | mail -s "${notification_subject}" "${recipients}" || {
            log "WARNING" "Failed to send email notification"
        }
    fi
    
    # Send Slack notification if configured
    if [[ -n "${RESTORE_SLACK_WEBHOOK}" ]]; then
        log "INFO" "Sending Slack notification"
        
        local slack_message="
*IMS Restore ${status} - ${environment}*
Environment: ${environment}
Timestamp: ${timestamp}
Executed by: ${user}@${hostname}
Status: ${status}

${message}
"
        
        local slack_payload="{\"text\":\"${slack_message}\"}"
        
        curl -s -X POST -H 'Content-type: application/json' --data "${slack_payload}" "${RESTORE_SLACK_WEBHOOK}" > /dev/null || {
            log "WARNING" "Failed to send Slack notification"
        }
    fi
    
    log "INFO" "Notification sent"
    return 0
}

# Function to clean up temporary files after restore
cleanup() {
    local temp_dir="$1"
    
    log "INFO" "Cleaning up temporary files: ${temp_dir}"
    
    # Remove temporary directory if it exists
    if [[ -d "${temp_dir}" ]]; then
        rm -rf "${temp_dir}"
    fi
    
    log "INFO" "Cleanup completed"
    return 0
}

# Main function
main() {
    local environment="${DEFAULT_ENVIRONMENT}"
    local components="all"
    local database="all"
    local keyspace="all"
    local timestamp="latest"
    local source="s3"
    local list_backups=false
    local point_in_time=""
    local force=false
    local no_verification=false
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
            -t|--timestamp)
                timestamp="$2"
                shift 2
                ;;
            -s|--source)
                source="$2"
                shift 2
                ;;
            -l|--list-backups)
                list_backups=true
                shift
                ;;
            -p|--point-in-time)
                point_in_time="$2"
                shift 2
                ;;
            -f|--force)
                force=true
                shift
                ;;
            -n|--no-verification)
                no_verification=true
                shift
                ;;
            -k|--encryption-key)
                ENCRYPTION_KEY_PATH="$2"
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
    
    log "INFO" "Starting restore process"
    log "INFO" "Environment: ${environment}"
    log "INFO" "Components: ${components}"
    log "INFO" "Database: ${database}"
    log "INFO" "Keyspace: ${keyspace}"
    log "INFO" "Timestamp: ${timestamp}"
    log "INFO" "Source: ${source}"
    log "INFO" "List Backups: ${list_backups}"
    log "INFO" "Point in Time: ${point_in_time}"
    log "INFO" "Force: ${force}"
    log "INFO" "No Verification: ${no_verification}"
    
    # Check prerequisites
    if ! check_prerequisites; then
        log "ERROR" "Prerequisites check failed"
        exit 1
    fi
    
    # Setup environment
    if ! setup_environment "${environment}"; then
        log "ERROR" "Environment setup failed"
        exit 1
    fi
    
    # Parse components list
    IFS=',' read -ra component_array <<< "${components}"
    
    # If --list-backups is specified, list available backups and exit
    if [[ "${list_backups}" == true ]]; then
        for component in "${component_array[@]}"; do
            list_available_backups "${environment}" "${component}" "${source}"
        done
        exit 0
    fi
    
    # Get latest backup timestamp if not specified
    if [[ "${timestamp}" == "latest" ]]; then
        # Pick one component to get the latest timestamp
        local chosen_component="${component_array[0]}"
        if [[ "${chosen_component}" == "all" ]]; then
            chosen_component="postgresql"  # Default to postgresql for getting timestamp
        fi
        
        local backups=$(list_available_backups "${environment}" "${chosen_component}" "${source}")
        
        if [[ -z "${backups}" ]]; then
            log "ERROR" "No backups found for ${chosen_component} in ${environment} environment from ${source}"
            exit 1
        fi
        
        timestamp=$(echo "${backups}" | head -1)
        log "INFO" "Using latest backup timestamp: ${timestamp}"
    fi
    
    # Track temporary directories for cleanup
    declare -a temp_dirs
    
    # Perform restore for each component
    for component in "${component_array[@]}"; do
        # If component is "all", restore all components
        if [[ "${component}" == "all" ]]; then
            component_array=("postgresql" "timescaledb" "cassandra" "redis" "config")
            break
        fi
    done
    
    # Now process each component
    for component in "${component_array[@]}"; do
        log "INFO" "Processing component: ${component}"
        
        # Prepare for restore
        local temp_dir=$(prepare_restore "${environment}" "${component}" "${timestamp}" "${source}")
        
        if [[ -z "${temp_dir}" ]]; then
            log "ERROR" "Failed to prepare restore for ${component}"
            result=1
            continue
        fi
        
        temp_dirs+=("${temp_dir}")
        
        # Perform restore based on component type
        case "${component}" in
            "postgresql")
                if ! restore_postgresql "${environment}" "${database}" "${temp_dir}"; then
                    log "ERROR" "Failed to restore PostgreSQL database(s)"
                    result=1
                fi
                ;;
                
            "timescaledb")
                if ! restore_timescaledb "${environment}" "${temp_dir}"; then
                    log "ERROR" "Failed to restore TimescaleDB"
                    result=1
                fi
                ;;
                
            "cassandra")
                if ! restore_cassandra "${environment}" "${keyspace}" "${temp_dir}"; then
                    log "ERROR" "Failed to restore Cassandra keyspace(s)"
                    result=1
                fi
                ;;
                
            "redis")
                if ! restore_redis "${environment}" "${temp_dir}"; then
                    log "ERROR" "Failed to restore Redis data"
                    result=1
                fi
                ;;
                
            "config")
                if ! restore_config "${environment}" "all" "${temp_dir}"; then
                    log "ERROR" "Failed to restore Kubernetes configuration"
                    result=1
                fi
                ;;
                
            *)
                log "ERROR" "Unknown component: ${component}"
                result=1
                ;;
        esac
        
        # Verify restore if not skipped
        if [[ "${no_verification}" != true ]]; then
            if ! verify_restore "${environment}" "${component}"; then
                log "ERROR" "Restore verification failed for ${component}"
                result=1
            fi
        fi
    done
    
    # Perform system health check
    if ! system_health_check "${environment}"; then
        log "ERROR" "System health check failed"
        result=1
    fi
    
    # Send notification of restore completion
    if [[ "${result}" -eq 0 ]]; then
        send_notification "${environment}" "SUCCESS" "Restore completed successfully for components: ${components}"
    else
        send_notification "${environment}" "FAILURE" "Restore failed for one or more components. Check logs for details."
    fi
    
    # Cleanup temporary files
    for temp_dir in "${temp_dirs[@]}"; do
        cleanup "${temp_dir}"
    done
    
    if [[ "${result}" -eq 0 ]]; then
        log "INFO" "Restore process completed successfully"
    else
        log "ERROR" "Restore process completed with errors"
    fi
    
    return ${result}
}

# Trap signals to ensure clean exit
trap 'log "ERROR" "Received signal to terminate"; send_notification "${DEFAULT_ENVIRONMENT}" "ABORTED" "Restore process was aborted"; exit 1' SIGINT SIGTERM

# Execute main function
main "$@"
exit $?