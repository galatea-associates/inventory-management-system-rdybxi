#!/bin/bash
#
# health-check.sh - Comprehensive health check script for the IMS (Inventory Management System)
#
# This script performs health checks on all components of the IMS including:
# - Microservices (via health endpoints)
# - Databases (PostgreSQL, Cassandra, Redis, TimescaleDB)
# - Message brokers (Kafka)
# - Kubernetes resources
# - End-to-end system functionality
#
# It logs all check results and sends alerts for any failures to ensure
# the 99.999% uptime SLA requirement is met during 24x6 operational hours.
#
# Dependencies:
# - curl (latest) - for making HTTP requests to health endpoints
# - jq (latest) - for parsing JSON responses
# - kubectl (latest) - for checking Kubernetes resources
#
# Usage: ./health-check.sh [options]
#   Options:
#     -e, --environment ENV    Specify environment (default: production)
#     -c, --config FILE        Specify config file (default: ../config/health-check-config.json)
#     -l, --log FILE           Specify log file (default: /var/log/ims/health-check.log)
#     -t, --timeout SECONDS    Specify timeout in seconds (default: 5)
#     -a, --alert              Send alerts for failures (default: true)
#     -h, --help               Display this help message
#
# Returns:
#   0 if all checks pass, non-zero otherwise

# Enable error handling
set -e
set -o pipefail

# Define constants and global variables
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CONFIG_FILE="${SCRIPT_DIR}/../config/health-check-config.json"
LOG_FILE="/var/log/ims/health-check.log"
ENVIRONMENT="${ENVIRONMENT:-production}"
TIMEOUT=5
SEND_ALERTS=true
EXIT_CODE=0

# Function to log messages
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local log_entry="[${timestamp}] [${level}] $message"
    
    echo "$log_entry"
    echo "$log_entry" >> "$LOG_FILE"
}

# Function to check service health via HTTP endpoint
check_service_health() {
    local service_name="$1"
    local health_endpoint="$2"
    local result=0
    
    log_message "INFO" "Checking health of service: $service_name at $health_endpoint"
    
    local http_response=$(curl -s -o /tmp/health_response.json -w "%{http_code}" -m "$TIMEOUT" "$health_endpoint")
    
    if [[ "$http_response" -eq 200 ]]; then
        if [[ -f "/tmp/health_response.json" ]]; then
            local status=$(jq -r '.status' /tmp/health_response.json 2>/dev/null || echo "unknown")
            
            if [[ "$status" == "UP" || "$status" == "up" || "$status" == "healthy" ]]; then
                log_message "INFO" "Service $service_name is healthy"
            else
                log_message "ERROR" "Service $service_name reported unhealthy status: $status"
                result=1
            fi
        else
            log_message "INFO" "Service $service_name is responding but no JSON response found"
        fi
    else
        log_message "ERROR" "Service $service_name is unhealthy. HTTP status: $http_response"
        result=1
    fi
    
    rm -f /tmp/health_response.json
    return $result
}

# Function to check database health
check_database_health() {
    local db_type="$1"
    local connection_string="$2"
    local result=0
    
    log_message "INFO" "Checking health of $db_type database with connection: $connection_string"
    
    case "$db_type" in
        "postgresql"|"postgres")
            # Extract connection details from connection string
            # Example connection string: "postgresql://username:password@hostname:port/dbname"
            local db_host=$(echo "$connection_string" | sed -n 's/.*@\([^:]*\).*/\1/p')
            local db_port=$(echo "$connection_string" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            local db_name=$(echo "$connection_string" | sed -n 's/.*\/\([^?]*\).*/\1/p')
            local db_user=$(echo "$connection_string" | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
            local db_pass=$(echo "$connection_string" | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
            
            # Set PGPASSWORD environment variable for passwordless connection
            export PGPASSWORD="$db_pass"
            
            # Run a simple query to check connection
            if psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT 1" > /dev/null 2>&1; then
                log_message "INFO" "PostgreSQL database is healthy"
            else
                log_message "ERROR" "Failed to connect to PostgreSQL database"
                result=1
            fi
            
            # Unset password
            unset PGPASSWORD
            ;;
            
        "cassandra")
            # Extract connection details from connection string
            # Example connection string: "cassandra://username:password@hostname:port/keyspace"
            local db_host=$(echo "$connection_string" | sed -n 's/.*@\([^:]*\).*/\1/p')
            local db_port=$(echo "$connection_string" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            local db_keyspace=$(echo "$connection_string" | sed -n 's/.*\/\([^?]*\).*/\1/p')
            local db_user=$(echo "$connection_string" | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
            local db_pass=$(echo "$connection_string" | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
            
            # Run a simple query to check connection
            if cqlsh -u "$db_user" -p "$db_pass" "$db_host" "$db_port" -e "DESCRIBE KEYSPACES;" > /dev/null 2>&1; then
                log_message "INFO" "Cassandra database is healthy"
            else
                log_message "ERROR" "Failed to connect to Cassandra database"
                result=1
            fi
            ;;
            
        "redis")
            # Extract connection details from connection string
            # Example connection string: "redis://username:password@hostname:port/dbnum"
            local db_host=$(echo "$connection_string" | sed -n 's/.*@\([^:]*\).*/\1/p')
            local db_port=$(echo "$connection_string" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            local db_num=$(echo "$connection_string" | sed -n 's/.*\/\([^?]*\).*/\1/p')
            local db_pass=$(echo "$connection_string" | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
            
            # Run PING command to check connection
            if redis-cli -h "$db_host" -p "$db_port" -a "$db_pass" -n "$db_num" PING | grep -q "PONG"; then
                log_message "INFO" "Redis database is healthy"
            else
                log_message "ERROR" "Failed to connect to Redis database"
                result=1
            fi
            ;;
            
        "timescaledb")
            # Extract connection details from connection string (same as PostgreSQL)
            local db_host=$(echo "$connection_string" | sed -n 's/.*@\([^:]*\).*/\1/p')
            local db_port=$(echo "$connection_string" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            local db_name=$(echo "$connection_string" | sed -n 's/.*\/\([^?]*\).*/\1/p')
            local db_user=$(echo "$connection_string" | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
            local db_pass=$(echo "$connection_string" | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
            
            # Set PGPASSWORD environment variable for passwordless connection
            export PGPASSWORD="$db_pass"
            
            # Run a TimescaleDB-specific query to check connection and extension
            if psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT extname FROM pg_extension WHERE extname='timescaledb';" | grep -q "timescaledb"; then
                log_message "INFO" "TimescaleDB database is healthy"
            else
                log_message "ERROR" "Failed to connect to TimescaleDB database or extension not installed"
                result=1
            fi
            
            # Unset password
            unset PGPASSWORD
            ;;
            
        *)
            log_message "ERROR" "Unsupported database type: $db_type"
            result=1
            ;;
    esac
    
    return $result
}

# Function to check Kafka health
check_kafka_health() {
    local bootstrap_servers="$1"
    local result=0
    
    log_message "INFO" "Checking health of Kafka at $bootstrap_servers"
    
    # Check broker connectivity
    if kafka-broker-api-versions --bootstrap-server "$bootstrap_servers" --timeout "$TIMEOUT"000 > /dev/null 2>&1; then
        log_message "INFO" "Kafka brokers are reachable"
        
        # Check if critical topics exist
        if kafka-topics --list --bootstrap-server "$bootstrap_servers" > /tmp/kafka_topics.txt 2>/dev/null; then
            # Check for required topics - these should match the IMS requirements
            for topic in "market-data" "trade-data" "position-updates" "inventory-calculations" "locate-requests" "short-sell-approvals"; do
                if grep -q "^$topic$" /tmp/kafka_topics.txt; then
                    log_message "INFO" "Kafka topic $topic exists"
                else
                    log_message "WARNING" "Kafka topic $topic does not exist"
                    # Don't fail the check for missing topics, just warn
                fi
            done
        else
            log_message "ERROR" "Failed to list Kafka topics"
            result=1
        fi
        
        # Check consumer group lag for critical consumers
        if kafka-consumer-groups --bootstrap-server "$bootstrap_servers" --describe --all-groups > /tmp/consumer_lag.txt 2>/dev/null; then
            if grep -q "CURRENT-OFFSET.*LAG" /tmp/consumer_lag.txt; then
                # Check for any consumer with significant lag (e.g., > 1000 messages)
                if grep -E 'LAG[[:space:]]+[1-9][0-9]{3,}' /tmp/consumer_lag.txt; then
                    log_message "WARNING" "Some Kafka consumers have significant lag"
                    # Don't fail the check for lag, just warn
                else
                    log_message "INFO" "No significant consumer lag detected"
                fi
            else
                log_message "WARNING" "Could not parse consumer lag information"
            fi
        else
            log_message "WARNING" "Failed to check consumer group lag"
            # Don't fail the check for this, just warn
        fi
    else
        log_message "ERROR" "Failed to connect to Kafka brokers at $bootstrap_servers"
        result=1
    fi
    
    rm -f /tmp/kafka_topics.txt /tmp/consumer_lag.txt
    return $result
}

# Function to check Kubernetes resources
check_kubernetes_resources() {
    local namespace="$1"
    local result=0
    
    log_message "INFO" "Checking Kubernetes resources in namespace $namespace"
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_message "ERROR" "kubectl command not found"
        return 1
    fi
    
    # Check if we can access the Kubernetes cluster
    if ! kubectl get ns > /dev/null 2>&1; then
        log_message "ERROR" "Cannot access Kubernetes cluster"
        return 1
    fi
    
    # Check if the namespace exists
    if ! kubectl get ns "$namespace" > /dev/null 2>&1; then
        log_message "ERROR" "Namespace $namespace does not exist"
        return 1
    fi
    
    # Check pod status
    log_message "INFO" "Checking pod status in namespace $namespace"
    kubectl get pods -n "$namespace" -o json > /tmp/pods.json
    
    local total_pods=$(jq '.items | length' /tmp/pods.json)
    local running_pods=$(jq '.items[] | select(.status.phase=="Running") | .metadata.name' /tmp/pods.json | wc -l)
    local failed_pods=$(jq '.items[] | select(.status.phase=="Failed") | .metadata.name' /tmp/pods.json | wc -l)
    local pending_pods=$(jq '.items[] | select(.status.phase=="Pending") | .metadata.name' /tmp/pods.json | wc -l)
    
    log_message "INFO" "Total pods: $total_pods, Running: $running_pods, Failed: $failed_pods, Pending: $pending_pods"
    
    if [[ "$failed_pods" -gt 0 ]]; then
        log_message "ERROR" "There are $failed_pods failed pods in namespace $namespace"
        jq -r '.items[] | select(.status.phase=="Failed") | .metadata.name' /tmp/pods.json | while read pod; do
            log_message "ERROR" "Failed pod: $pod"
        done
        result=1
    fi
    
    if [[ "$pending_pods" -gt 0 ]]; then
        log_message "WARNING" "There are $pending_pods pending pods in namespace $namespace"
        jq -r '.items[] | select(.status.phase=="Pending") | .metadata.name' /tmp/pods.json | while read pod; do
            log_message "WARNING" "Pending pod: $pod"
        done
        # Don't fail the check for pending pods, just warn
    fi
    
    # Check deployment status
    log_message "INFO" "Checking deployment status in namespace $namespace"
    kubectl get deployments -n "$namespace" -o json > /tmp/deployments.json
    
    local total_deployments=$(jq '.items | length' /tmp/deployments.json)
    local unhealthy_deployments=0
    
    for ((i=0; i<$total_deployments; i++)); do
        local deployment=$(jq -r ".items[$i].metadata.name" /tmp/deployments.json)
        local desired=$(jq -r ".items[$i].status.replicas // 0" /tmp/deployments.json)
        local available=$(jq -r ".items[$i].status.availableReplicas // 0" /tmp/deployments.json)
        
        log_message "INFO" "Deployment $deployment: desired=$desired, available=$available"
        
        if [[ "$available" -lt "$desired" ]]; then
            log_message "ERROR" "Deployment $deployment is unhealthy: desired=$desired, available=$available"
            unhealthy_deployments=$((unhealthy_deployments + 1))
        fi
    done
    
    if [[ "$unhealthy_deployments" -gt 0 ]]; then
        log_message "ERROR" "There are $unhealthy_deployments unhealthy deployments in namespace $namespace"
        result=1
    else
        log_message "INFO" "All deployments in namespace $namespace are healthy"
    fi
    
    # Check service endpoints
    log_message "INFO" "Checking service endpoints in namespace $namespace"
    kubectl get services -n "$namespace" -o json > /tmp/services.json
    
    local total_services=$(jq '.items | length' /tmp/services.json)
    local services_without_endpoints=0
    
    for ((i=0; i<$total_services; i++)); do
        local service=$(jq -r ".items[$i].metadata.name" /tmp/services.json)
        local service_type=$(jq -r ".items[$i].spec.type" /tmp/services.json)
        
        # Skip ClusterIP services as they might be headless
        if [[ "$service_type" != "ClusterIP" ]]; then
            kubectl get endpoints "$service" -n "$namespace" -o json > /tmp/endpoints.json
            local addresses=$(jq '.subsets[].addresses | length' /tmp/endpoints.json 2>/dev/null || echo "0")
            
            if [[ "$addresses" -eq "0" ]]; then
                log_message "WARNING" "Service $service has no endpoints"
                services_without_endpoints=$((services_without_endpoints + 1))
                # Don't fail the check for this, just warn
            else
                log_message "INFO" "Service $service has $addresses endpoints"
            fi
        fi
    done
    
    if [[ "$services_without_endpoints" -gt 0 ]]; then
        log_message "WARNING" "There are $services_without_endpoints services without endpoints in namespace $namespace"
    else
        log_message "INFO" "All services in namespace $namespace have endpoints"
    fi
    
    rm -f /tmp/pods.json /tmp/deployments.json /tmp/services.json /tmp/endpoints.json
    return $result
}

# Function to perform end-to-end health check
check_end_to_end_health() {
    local api_gateway_url="$1"
    local result=0
    
    log_message "INFO" "Performing end-to-end health check"
    
    # Test a simple locate request flow
    # This is a synthetic transaction that simulates a real user workflow
    
    # Step 1: Create a test locate request
    log_message "INFO" "Creating test locate request"
    
    local request_payload='{
        "requestorId": "health-check-script",
        "clientId": "test-client",
        "securityId": "TEST:AAPL",
        "locateType": "short",
        "requestedQuantity": 100,
        "swapCashIndicator": "cash"
    }'
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "X-API-Key: health-check-key" \
        -d "$request_payload" \
        "${api_gateway_url}/api/v1/locates")
    
    if [[ -z "$response" ]]; then
        log_message "ERROR" "No response received for test locate request"
        return 1
    fi
    
    # Extract the request ID for later cleanup
    local request_id=$(echo "$response" | jq -r '.requestId // empty')
    
    if [[ -z "$request_id" ]]; then
        log_message "ERROR" "Failed to extract request ID from response"
        return 1
    fi
    
    log_message "INFO" "Test locate request created with ID: $request_id"
    
    # Step 2: Check locate request status
    # Wait for a few seconds to allow processing
    sleep 5
    
    log_message "INFO" "Checking status of test locate request"
    local status_response=$(curl -s -X GET \
        -H "X-API-Key: health-check-key" \
        "${api_gateway_url}/api/v1/locates/${request_id}")
    
    local status=$(echo "$status_response" | jq -r '.status // empty')
    
    if [[ -z "$status" ]]; then
        log_message "ERROR" "Failed to get status of test locate request"
        result=1
    elif [[ "$status" == "PENDING" || "$status" == "APPROVED" || "$status" == "REJECTED" ]]; then
        log_message "INFO" "Test locate request status: $status"
    else
        log_message "ERROR" "Unexpected status for test locate request: $status"
        result=1
    fi
    
    # Step 3: Clean up test data
    log_message "INFO" "Cleaning up test locate request"
    curl -s -X DELETE \
        -H "X-API-Key: health-check-key" \
        "${api_gateway_url}/api/v1/locates/${request_id}/test" > /dev/null
    
    if [[ "$result" -eq 0 ]]; then
        log_message "INFO" "End-to-end health check passed"
    else
        log_message "ERROR" "End-to-end health check failed"
    fi
    
    return $result
}

# Function to load configuration from file
load_configuration() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_message "ERROR" "Configuration file not found: $CONFIG_FILE"
        return 1
    fi
    
    log_message "INFO" "Loading configuration from $CONFIG_FILE"
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_message "ERROR" "jq command not found. Please install jq to parse JSON configuration."
        return 1
    fi
    
    # Load and parse the configuration file
    local config=$(cat "$CONFIG_FILE")
    
    # Extract environment-specific configuration
    local env_config=$(echo "$config" | jq -r --arg env "$ENVIRONMENT" '.environments[$env] // {}')
    
    if [[ "$env_config" == "{}" ]]; then
        log_message "WARNING" "No configuration found for environment: $ENVIRONMENT. Using defaults."
    fi
    
    # Extract services configuration
    SERVICES=$(echo "$env_config" | jq -r '.services // []')
    
    # Extract databases configuration
    DATABASES=$(echo "$env_config" | jq -r '.databases // []')
    
    # Extract Kafka configuration
    KAFKA_BOOTSTRAP_SERVERS=$(echo "$env_config" | jq -r '.kafka.bootstrapServers // ""')
    
    # Extract Kubernetes configuration
    K8S_NAMESPACE=$(echo "$env_config" | jq -r '.kubernetes.namespace // ""')
    
    # Extract API gateway URL for end-to-end tests
    API_GATEWAY_URL=$(echo "$env_config" | jq -r '.apiGateway.url // ""')
    
    # Extract alert configuration
    ALERT_ENDPOINTS=$(echo "$env_config" | jq -r '.alerts // {}')
    
    # Validate essential configuration
    if [[ -z "$SERVICES" || "$SERVICES" == "[]" ]]; then
        log_message "WARNING" "No services configured for health checks"
    fi
    
    if [[ -z "$KAFKA_BOOTSTRAP_SERVERS" ]]; then
        log_message "WARNING" "Kafka bootstrap servers not configured"
    fi
    
    if [[ -z "$K8S_NAMESPACE" ]]; then
        log_message "WARNING" "Kubernetes namespace not configured"
    fi
    
    log_message "INFO" "Configuration loaded successfully"
    return 0
}

# Function to send alerts
send_alerts() {
    local service_name="$1"
    local error_message="$2"
    
    if [[ "$SEND_ALERTS" != "true" ]]; then
        return 0
    fi
    
    log_message "INFO" "Sending alert for service: $service_name"
    
    # Determine alert severity based on service criticality
    local severity="high"
    
    # Critical services get higher severity
    case "$service_name" in
        "api-gateway"|"calculation-service"|"position-service"|"inventory-service"|"kafka"|"end-to-end")
            severity="critical"
            ;;
    esac
    
    # Format alert message
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local alert_message="[$severity] Health check failure for $service_name in $ENVIRONMENT environment at $timestamp: $error_message"
    
    # Send email alert if configured
    local email_endpoint=$(echo "$ALERT_ENDPOINTS" | jq -r '.email // ""')
    if [[ -n "$email_endpoint" ]]; then
        log_message "INFO" "Sending email alert to $email_endpoint"
        
        # Simple email via mail command (replace with your preferred method)
        echo "$alert_message" | mail -s "IMS Health Check Alert: $service_name" "$email_endpoint"
    fi
    
    # Send Slack alert if configured
    local slack_webhook=$(echo "$ALERT_ENDPOINTS" | jq -r '.slack // ""')
    if [[ -n "$slack_webhook" ]]; then
        log_message "INFO" "Sending Slack alert via webhook"
        
        local slack_payload="{\"text\":\"$alert_message\"}"
        curl -s -X POST -H 'Content-type: application/json' --data "$slack_payload" "$slack_webhook" > /dev/null
    fi
    
    # Send PagerDuty alert if configured and severity is critical
    local pagerduty_key=$(echo "$ALERT_ENDPOINTS" | jq -r '.pagerduty // ""')
    if [[ -n "$pagerduty_key" && "$severity" == "critical" ]]; then
        log_message "INFO" "Sending PagerDuty alert"
        
        local pd_payload="{
            \"service_key\": \"$pagerduty_key\",
            \"event_type\": \"trigger\",
            \"description\": \"$alert_message\",
            \"client\": \"IMS Health Check Script\",
            \"client_url\": \"$API_GATEWAY_URL/health\",
            \"details\": {
                \"service\": \"$service_name\",
                \"environment\": \"$ENVIRONMENT\",
                \"error\": \"$error_message\"
            }
        }"
        
        curl -s -X POST -H 'Content-type: application/json' --data "$pd_payload" "https://events.pagerduty.com/generic/2010-04-15/create_event.json" > /dev/null
    fi
    
    log_message "INFO" "Alert sent successfully"
    return 0
}

# Main function
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -c|--config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            -l|--log)
                LOG_FILE="$2"
                shift 2
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -a|--alert)
                SEND_ALERTS="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  -e, --environment ENV    Specify environment (default: production)"
                echo "  -c, --config FILE        Specify config file (default: ../config/health-check-config.json)"
                echo "  -l, --log FILE           Specify log file (default: /var/log/ims/health-check.log)"
                echo "  -t, --timeout SECONDS    Specify timeout in seconds (default: 5)"
                echo "  -a, --alert BOOL         Send alerts for failures (default: true)"
                echo "  -h, --help               Display this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Initialize log file if it doesn't exist
    if [[ ! -f "$LOG_FILE" ]]; then
        touch "$LOG_FILE"
        log_message "INFO" "Created new log file"
    fi
    
    log_message "INFO" "Starting health check for environment: $ENVIRONMENT"
    
    # Load configuration
    if ! load_configuration; then
        log_message "ERROR" "Failed to load configuration"
        exit 1
    fi
    
    # Check microservices health
    log_message "INFO" "Checking microservices health"
    
    echo "$SERVICES" | jq -c '.[]' | while read -r service; do
        service_name=$(echo "$service" | jq -r '.name')
        health_endpoint=$(echo "$service" | jq -r '.healthEndpoint')
        
        if ! check_service_health "$service_name" "$health_endpoint"; then
            log_message "ERROR" "Health check failed for service: $service_name"
            send_alerts "$service_name" "Health check failed for service endpoint: $health_endpoint"
            EXIT_CODE=1
        fi
    done
    
    # Check database health
    log_message "INFO" "Checking database health"
    
    echo "$DATABASES" | jq -c '.[]' | while read -r database; do
        db_name=$(echo "$database" | jq -r '.name')
        db_type=$(echo "$database" | jq -r '.type')
        connection_string=$(echo "$database" | jq -r '.connectionString')
        
        if ! check_database_health "$db_type" "$connection_string"; then
            log_message "ERROR" "Health check failed for database: $db_name"
            send_alerts "$db_name" "Health check failed for $db_type database"
            EXIT_CODE=1
        fi
    done
    
    # Check Kafka health
    if [[ -n "$KAFKA_BOOTSTRAP_SERVERS" ]]; then
        log_message "INFO" "Checking Kafka health"
        
        if ! check_kafka_health "$KAFKA_BOOTSTRAP_SERVERS"; then
            log_message "ERROR" "Health check failed for Kafka"
            send_alerts "kafka" "Health check failed for Kafka at $KAFKA_BOOTSTRAP_SERVERS"
            EXIT_CODE=1
        fi
    else
        log_message "WARNING" "Skipping Kafka health check: No bootstrap servers configured"
    fi
    
    # Check Kubernetes resources
    if [[ -n "$K8S_NAMESPACE" ]]; then
        log_message "INFO" "Checking Kubernetes resources"
        
        if ! check_kubernetes_resources "$K8S_NAMESPACE"; then
            log_message "ERROR" "Health check failed for Kubernetes resources"
            send_alerts "kubernetes" "Health check failed for Kubernetes resources in namespace $K8S_NAMESPACE"
            EXIT_CODE=1
        fi
    else
        log_message "WARNING" "Skipping Kubernetes resources check: No namespace configured"
    fi
    
    # Perform end-to-end health check
    if [[ -n "$API_GATEWAY_URL" ]]; then
        log_message "INFO" "Performing end-to-end health check"
        
        if ! check_end_to_end_health "$API_GATEWAY_URL"; then
            log_message "ERROR" "End-to-end health check failed"
            send_alerts "end-to-end" "End-to-end health check failed using API gateway: $API_GATEWAY_URL"
            EXIT_CODE=1
        fi
    else
        log_message "WARNING" "Skipping end-to-end health check: No API gateway URL configured"
    fi
    
    # Summarize results
    if [[ "$EXIT_CODE" -eq 0 ]]; then
        log_message "INFO" "All health checks passed"
    else
        log_message "ERROR" "One or more health checks failed"
    fi
    
    log_message "INFO" "Health check completed for environment: $ENVIRONMENT"
    
    return $EXIT_CODE
}

# Execute main function
main "$@"
exit $?