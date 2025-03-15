#!/bin/bash
#
# deploy.sh - Deployment script for the Inventory Management System (IMS)
#
# This script automates the deployment of the IMS application to different environments
# (development, staging, production). It handles environment-specific configurations,
# performs pre-deployment validation, executes the deployment using Helm/ArgoCD,
# and conducts post-deployment verification.
#
# Dependencies:
# - kubectl (latest) - Kubernetes command-line tool for interacting with the cluster
# - helm (v3) - Kubernetes package manager for deploying the IMS application
# - argocd (latest) - ArgoCD command-line tool for GitOps-based deployments
# - aws (latest) - AWS command-line interface for ECR and other AWS services
#
# Usage: ./deploy.sh [options]
#   Options:
#     -e, --environment ENV    Target environment (dev, staging, prod) (default: dev)
#     -v, --version VER        Version to deploy (e.g., 1.0.0, latest) (default: latest)
#     -m, --method METHOD      Deployment method (helm, argocd) (default: argocd)
#     -d, --dry-run            Perform a dry run without making changes (default: false)
#     -f, --force              Force deployment even if validation fails (default: false)
#     -s, --skip-tests         Skip smoke tests after deployment (default: false)
#     -n, --notify             Send notification after deployment completion (default: true)
#     -h, --help               Display this help information
#
# Return codes:
#   0 - Deployment successful
#   1 - General error
#   2 - Validation failure
#   3 - Deployment failure
#   4 - Verification failure

# Enable error handling
set -e
set -o pipefail

# Trap signals for clean exit
trap 'echo "Deployment interrupted. Exiting..."; exit 1' INT TERM

# Script directory and paths
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/../.." && pwd)
LOG_FILE="${PROJECT_ROOT}/logs/deploy_$(date +%Y%m%d_%H%M%S).log"

# Default values
DEFAULT_ENVIRONMENT="dev"
HELM_CHART_PATH="${PROJECT_ROOT}/infrastructure/kubernetes/helm/ims"
ARGOCD_APP_PATH="${PROJECT_ROOT}/infrastructure/ci/argocd/applications"

# Environment-specific settings
declare -A DEPLOYMENT_TIMEOUT
DEPLOYMENT_TIMEOUT[dev]=300
DEPLOYMENT_TIMEOUT[staging]=600
DEPLOYMENT_TIMEOUT[prod]=1200

declare -A NAMESPACE
NAMESPACE[dev]="ims-dev"
NAMESPACE[staging]="ims-staging"
NAMESPACE[prod]="ims-production"

# Source health-check.sh to use check_service_health function
if [[ -f "${SCRIPT_DIR}/health-check.sh" ]]; then
    source "${SCRIPT_DIR}/health-check.sh"
else
    echo "WARNING: Health check script not found at ${SCRIPT_DIR}/health-check.sh"
fi

# Function to display script usage
usage() {
    echo "Usage: $(basename "$0") [options]"
    echo ""
    echo "Deploy the Inventory Management System (IMS) to the specified environment."
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Target environment (dev, staging, prod) (default: dev)"
    echo "  -v, --version VER        Version to deploy (e.g., 1.0.0, latest) (default: latest)"
    echo "  -m, --method METHOD      Deployment method (helm, argocd) (default: argocd)"
    echo "  -d, --dry-run            Perform a dry run without making changes (default: false)"
    echo "  -f, --force              Force deployment even if validation fails (default: false)"
    echo "  -s, --skip-tests         Skip smoke tests after deployment (default: false)"
    echo "  -n, --notify             Send notification after deployment completion (default: true)"
    echo "  -h, --help               Display this help information"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0") -e dev -v latest                  # Deploy latest version to dev environment"
    echo "  $(basename "$0") -e staging -v 1.2.3 -m helm       # Deploy version 1.2.3 to staging using Helm"
    echo "  $(basename "$0") -e prod -v 2.0.0 -d               # Dry run of version 2.0.0 to production"
}

# Function to log messages
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Ensure logs directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Format the message
    local formatted_message="[${timestamp}] [${level}] ${message}"
    
    # Log to console and file
    echo "$formatted_message"
    echo "$formatted_message" >> "$LOG_FILE"
}

# Function to set up the deployment environment
setup_environment() {
    local environment="$1"
    
    log "INFO" "Setting up environment: $environment"
    
    # Validate environment parameter
    if [[ ! "$environment" =~ ^(dev|staging|prod)$ ]]; then
        log "ERROR" "Invalid environment specified: $environment. Must be one of: dev, staging, prod"
        return 1
    fi
    
    # Set environment-specific variables
    local namespace="${NAMESPACE[$environment]}"
    local timeout="${DEPLOYMENT_TIMEOUT[$environment]}"
    
    log "INFO" "Using namespace: $namespace, timeout: $timeout seconds"
    
    # Configure kubectl context for the environment
    local context
    case "$environment" in
        dev)
            context="ims-dev-context"
            ;;
        staging)
            context="ims-staging-context"
            ;;
        prod)
            context="ims-prod-context"
            ;;
    esac
    
    log "INFO" "Switching kubectl context to: $context"
    if ! kubectl config use-context "$context" > /dev/null 2>&1; then
        log "ERROR" "Failed to switch kubectl context to: $context"
        return 1
    fi
    
    # Configure AWS credentials if using ECR
    if [[ -n "$DOCKER_REGISTRY" && "$DOCKER_REGISTRY" == *"amazonaws.com"* ]]; then
        local aws_profile="ims-${environment}"
        
        log "INFO" "Configuring AWS credentials with profile: $aws_profile"
        export AWS_PROFILE="$aws_profile"
        
        # Verify we can access ECR
        if ! aws ecr get-login-password --region $(aws configure get region) | docker login --username AWS --password-stdin "$DOCKER_REGISTRY" > /dev/null 2>&1; then
            log "ERROR" "Failed to authenticate with AWS ECR"
            return 1
        fi
    fi
    
    # Verify cluster connectivity
    log "INFO" "Verifying connection to Kubernetes cluster"
    if ! kubectl get nodes > /dev/null 2>&1; then
        log "ERROR" "Failed to connect to Kubernetes cluster"
        return 1
    fi
    
    log "INFO" "Environment setup completed successfully"
    return 0
}

# Function to check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites"
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log "ERROR" "kubectl not found. Please install kubectl."
        return 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log "ERROR" "helm not found. Please install Helm v3."
        return 1
    fi
    
    # Check if argocd CLI is installed if using argocd method
    if [[ "$DEPLOYMENT_METHOD" == "argocd" ]]; then
        if ! command -v argocd &> /dev/null; then
            log "ERROR" "argocd CLI not found. Please install ArgoCD CLI."
            return 1
        fi
    fi
    
    # Check if aws CLI is installed if using ECR
    if [[ -n "$DOCKER_REGISTRY" && "$DOCKER_REGISTRY" == *"amazonaws.com"* ]]; then
        if ! command -v aws &> /dev/null; then
            log "ERROR" "aws CLI not found. Please install AWS CLI."
            return 1
        fi
    fi
    
    # Verify required environment variables
    if [[ -z "$KUBECONFIG" ]]; then
        log "WARNING" "KUBECONFIG environment variable not set. Using default: ~/.kube/config"
    fi
    
    log "INFO" "All prerequisites satisfied"
    return 0
}

# Function to validate deployment configuration
validate_deployment_config() {
    local environment="$1"
    
    log "INFO" "Validating deployment configuration for environment: $environment"
    
    # Validate Helm chart structure
    if [[ ! -d "$HELM_CHART_PATH" ]]; then
        log "ERROR" "Helm chart directory not found: $HELM_CHART_PATH"
        return 1
    fi
    
    # Ensure Chart.yaml exists
    if [[ ! -f "$HELM_CHART_PATH/Chart.yaml" ]]; then
        log "ERROR" "Chart.yaml not found in Helm chart directory"
        return 1
    fi
    
    # Validate values file for the specified environment
    local values_file="$HELM_CHART_PATH/values-${environment}.yaml"
    if [[ ! -f "$values_file" ]]; then
        log "ERROR" "Values file not found for environment $environment: $values_file"
        return 1
    fi
    
    # Validate ArgoCD application definition if using ArgoCD
    if [[ "$DEPLOYMENT_METHOD" == "argocd" ]]; then
        local argocd_app_file="$ARGOCD_APP_PATH/ims-${environment}.yaml"
        if [[ ! -f "$argocd_app_file" ]]; then
            log "ERROR" "ArgoCD application file not found: $argocd_app_file"
            return 1
        fi
    fi
    
    # Run helm lint to check for issues
    log "INFO" "Running helm lint on chart"
    if ! helm lint "$HELM_CHART_PATH" -f "$values_file" > /dev/null; then
        log "ERROR" "Helm chart validation failed"
        return 1
    fi
    
    # Validate Kubernetes resources with kubectl dry-run
    log "INFO" "Validating Kubernetes resources with dry run"
    
    # Use helm template to generate manifests and pipe to kubectl
    if ! helm template "ims-$environment" "$HELM_CHART_PATH" -f "$values_file" --set version="$VERSION" | kubectl apply --dry-run=client -f - > /dev/null; then
        log "ERROR" "Kubernetes resource validation failed"
        return 1
    fi
    
    log "INFO" "Deployment configuration validation completed successfully"
    return 0
}

# Function to backup current state before deployment
backup_current_state() {
    local environment="$1"
    local namespace="${NAMESPACE[$environment]}"
    
    log "INFO" "Creating backup of current deployment state for environment: $environment"
    
    # Create backup directory
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_dir="${PROJECT_ROOT}/backups/${environment}_${timestamp}"
    mkdir -p "$backup_dir"
    
    # Export current Kubernetes resources
    log "INFO" "Exporting current Kubernetes resources"
    kubectl get all -n "$namespace" -o yaml > "$backup_dir/resources.yaml" || true
    
    # Save Helm release history if the release exists
    log "INFO" "Saving Helm release history"
    if helm status "ims-$environment" -n "$namespace" &> /dev/null; then
        helm history "ims-$environment" -n "$namespace" > "$backup_dir/helm_history.txt" || true
        helm get all "ims-$environment" -n "$namespace" > "$backup_dir/helm_release.yaml" || true
    else
        log "INFO" "No existing Helm release found. Skipping Helm history backup."
    fi
    
    # Save ArgoCD application state if using ArgoCD
    if [[ "$DEPLOYMENT_METHOD" == "argocd" ]]; then
        log "INFO" "Saving ArgoCD application state"
        if argocd app get "ims-$environment" &> /dev/null; then
            argocd app get "ims-$environment" -o yaml > "$backup_dir/argocd_app.yaml" || true
        else
            log "INFO" "No existing ArgoCD application found. Skipping ArgoCD backup."
        fi
    fi
    
    # Create backup metadata file
    cat > "$backup_dir/metadata.txt" << EOF
Environment: $environment
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
User: $(whoami)
Version: $VERSION
EOF
    
    log "INFO" "Backup completed successfully: $backup_dir"
    echo "$backup_dir"  # Return backup directory path
    return 0
}

# Function to deploy using Helm
deploy_with_helm() {
    local environment="$1"
    local version="$2"
    local dry_run="$3"
    local namespace="${NAMESPACE[$environment]}"
    local timeout="${DEPLOYMENT_TIMEOUT[$environment]}"
    
    log "INFO" "Deploying IMS version $version to $environment environment using Helm"
    
    # Determine values file
    local values_file="$HELM_CHART_PATH/values-${environment}.yaml"
    
    # Set additional Helm parameters based on environment
    local helm_params=()
    
    # Configure deployment strategy based on environment
    case "$environment" in
        dev)
            # Simple rolling update for dev
            helm_params+=(--set "deploymentStrategy.type=RollingUpdate")
            helm_params+=(--set "deploymentStrategy.rollingUpdate.maxSurge=25%")
            helm_params+=(--set "deploymentStrategy.rollingUpdate.maxUnavailable=25%")
            ;;
        staging)
            # More conservative rolling update for staging
            helm_params+=(--set "deploymentStrategy.type=RollingUpdate")
            helm_params+=(--set "deploymentStrategy.rollingUpdate.maxSurge=25%")
            helm_params+=(--set "deploymentStrategy.rollingUpdate.maxUnavailable=0")
            ;;
        prod)
            # Blue-Green deployment for production
            helm_params+=(--set "deploymentStrategy.type=BlueGreen")
            helm_params+=(--set "deploymentStrategy.blueGreen.activeService=ims-prod")
            helm_params+=(--set "deploymentStrategy.blueGreen.previewService=ims-prod-preview")
            helm_params+=(--set "deploymentStrategy.blueGreen.autoPromote=false")
            ;;
    esac
    
    # Set version
    helm_params+=(--set "image.tag=$version")
    
    # Set timeout
    helm_params+=(--timeout "${timeout}s")
    
    # Add namespace
    helm_params+=(--namespace "$namespace")
    
    # Dry run if requested
    if [[ "$dry_run" == "true" ]]; then
        helm_params+=(--dry-run)
        log "INFO" "Performing dry run deployment"
    fi
    
    # Execute helm upgrade --install
    log "INFO" "Executing Helm deployment"
    if ! helm upgrade --install "ims-$environment" \
         "$HELM_CHART_PATH" \
         -f "$values_file" \
         "${helm_params[@]}" \
         --create-namespace \
         --wait; then
        log "ERROR" "Helm deployment failed"
        return 1
    fi
    
    log "INFO" "Helm deployment completed successfully"
    return 0
}

# Function to deploy using ArgoCD
deploy_with_argocd() {
    local environment="$1"
    local version="$2"
    
    log "INFO" "Deploying IMS version $version to $environment environment using ArgoCD"
    
    # Determine ArgoCD application file
    local argocd_app_file="$ARGOCD_APP_PATH/ims-${environment}.yaml"
    
    # Login to ArgoCD if needed
    if [[ -n "$ARGOCD_SERVER" && -n "$ARGOCD_AUTH_TOKEN" ]]; then
        log "INFO" "Logging in to ArgoCD server"
        if ! argocd login "$ARGOCD_SERVER" --auth-token "$ARGOCD_AUTH_TOKEN" --grpc-web; then
            log "ERROR" "Failed to log in to ArgoCD server"
            return 1
        fi
    fi
    
    # Update version in application file (uses temporary file to avoid sed inconsistencies)
    log "INFO" "Updating version in ArgoCD application manifest"
    local temp_app_file="/tmp/ims-${environment}-${version}.yaml"
    cat "$argocd_app_file" | sed "s/targetRevision: .*/targetRevision: $version/" > "$temp_app_file"
    
    # Apply ArgoCD application manifest
    log "INFO" "Applying ArgoCD application manifest"
    if ! kubectl apply -f "$temp_app_file"; then
        log "ERROR" "Failed to apply ArgoCD application manifest"
        rm -f "$temp_app_file"
        return 1
    fi
    
    # Clean up temporary file
    rm -f "$temp_app_file"
    
    # Trigger sync operation
    log "INFO" "Triggering ArgoCD sync operation"
    if ! argocd app sync "ims-$environment" --timeout "${DEPLOYMENT_TIMEOUT[$environment]}"; then
        log "ERROR" "ArgoCD sync operation failed"
        return 1
    fi
    
    # Wait for sync to complete and verify health
    log "INFO" "Waiting for ArgoCD sync to complete and application to become healthy"
    if ! argocd app wait "ims-$environment" --health --timeout "${DEPLOYMENT_TIMEOUT[$environment]}"; then
        log "ERROR" "ArgoCD application failed to become healthy"
        return 1
    fi
    
    log "INFO" "ArgoCD deployment completed successfully"
    return 0
}

# Function to verify deployment
verify_deployment() {
    local environment="$1"
    local namespace="${NAMESPACE[$environment]}"
    
    log "INFO" "Verifying deployment for environment: $environment"
    
    # Check deployment status
    log "INFO" "Checking deployment status"
    local deployments=$(kubectl get deployments -n "$namespace" -o jsonpath='{.items[*].metadata.name}')
    
    for deployment in $deployments; do
        # Skip deployments not related to IMS
        if [[ ! "$deployment" =~ ^ims- ]]; then
            continue
        fi
        
        log "INFO" "Checking deployment: $deployment"
        
        # Check if deployment is available
        local available=$(kubectl get deployment "$deployment" -n "$namespace" -o jsonpath='{.status.availableReplicas}')
        local desired=$(kubectl get deployment "$deployment" -n "$namespace" -o jsonpath='{.status.replicas}')
        
        if [[ -z "$available" || "$available" -lt "$desired" ]]; then
            log "ERROR" "Deployment $deployment is not fully available. Available: $available, Desired: $desired"
            return 1
        fi
    done
    
    # Verify pod readiness
    log "INFO" "Verifying pod readiness"
    local pods=$(kubectl get pods -n "$namespace" -l app=ims -o jsonpath='{.items[*].metadata.name}')
    
    for pod in $pods; do
        log "INFO" "Checking pod: $pod"
        
        # Check if pod is running
        local phase=$(kubectl get pod "$pod" -n "$namespace" -o jsonpath='{.status.phase}')
        if [[ "$phase" != "Running" ]]; then
            log "ERROR" "Pod $pod is not running. Phase: $phase"
            return 1
        fi
        
        # Check if all containers are ready
        local ready=$(kubectl get pod "$pod" -n "$namespace" -o jsonpath='{.status.containerStatuses[*].ready}' | grep -v false | wc -l)
        local containers=$(kubectl get pod "$pod" -n "$namespace" -o jsonpath='{.status.containerStatuses[*].name}' | wc -w)
        
        if [[ "$ready" -lt "$containers" ]]; then
            log "ERROR" "Pod $pod has containers that are not ready. Ready: $ready, Total: $containers"
            return 1
        fi
    done
    
    # Check service endpoints
    log "INFO" "Checking service endpoints"
    local services=$(kubectl get services -n "$namespace" -l app=ims -o jsonpath='{.items[*].metadata.name}')
    
    for service in $services; do
        log "INFO" "Checking service: $service"
        
        # Skip if this is a headless service
        local cluster_ip=$(kubectl get service "$service" -n "$namespace" -o jsonpath='{.spec.clusterIP}')
        if [[ "$cluster_ip" == "None" ]]; then
            log "INFO" "Service $service is headless. Skipping endpoint check."
            continue
        fi
        
        # Check if service has endpoints
        local endpoints=$(kubectl get endpoints "$service" -n "$namespace" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null)
        if [[ -z "$endpoints" ]]; then
            log "ERROR" "Service $service has no endpoints"
            return 1
        fi
    done
    
    # Run health checks for each service if health-check.sh is available
    if command -v check_service_health &> /dev/null; then
        log "INFO" "Running health checks for services"
        local services=$(kubectl get services -n "$namespace" -l app=ims -o jsonpath='{.items[*].metadata.name}')
        
        for service in $services; do
            # Skip services that don't expose health endpoints
            if [[ ! "$service" =~ api|service ]]; then
                continue
            fi
            
            # Get service URL (use port-forward if needed)
            local service_url
            if [[ "$environment" == "dev" ]]; then
                # Setup port-forward for the service
                local port=8080
                kubectl port-forward "svc/$service" "$port:80" -n "$namespace" &> /dev/null &
                local pf_pid=$!
                sleep 2  # Allow port-forward to establish
                service_url="http://localhost:$port/health"
                
                # Check service health
                log "INFO" "Checking health of service: $service at $service_url"
                if ! check_service_health "$service" "$service_url"; then
                    log "ERROR" "Health check failed for service: $service"
                    kill $pf_pid
                    return 1
                fi
                
                # Kill port-forward
                kill $pf_pid
            else
                # In staging and prod, use ingress or load balancer
                if [[ "$service" =~ api-gateway ]]; then
                    service_url="https://ims-${environment}.example.com/health"
                else
                    service_url="https://ims-${environment}.example.com/services/$service/health"
                fi
                
                # Check service health
                log "INFO" "Checking health of service: $service at $service_url"
                if ! check_service_health "$service" "$service_url"; then
                    log "ERROR" "Health check failed for service: $service"
                    return 1
                fi
            fi
        done
    else
        log "WARNING" "check_service_health function not available. Skipping health checks."
    fi
    
    # Verify database migrations
    log "INFO" "Verifying database migrations"
    # This is a simplified check - in a real scenario we would verify specific migration state
    local migration_pod=$(kubectl get pods -n "$namespace" -l app=ims,component=migrations -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [[ -n "$migration_pod" ]]; then
        local migration_status=$(kubectl get pod "$migration_pod" -n "$namespace" -o jsonpath='{.status.phase}')
        if [[ "$migration_status" != "Succeeded" ]]; then
            log "ERROR" "Database migration pod $migration_pod did not complete successfully. Status: $migration_status"
            return 1
        fi
    else
        log "INFO" "No dedicated migration pod found. Assuming migrations run as part of application startup."
    fi
    
    log "INFO" "Deployment verification completed successfully"
    return 0
}

# Function to run smoke tests
run_smoke_tests() {
    local environment="$1"
    local namespace="${NAMESPACE[$environment]}"
    
    log "INFO" "Running smoke tests for environment: $environment"
    
    # Determine test suite based on environment
    local test_suite="basic"
    if [[ "$environment" == "staging" || "$environment" == "prod" ]]; then
        test_suite="extended"
    fi
    
    log "INFO" "Using test suite: $test_suite"
    
    # Execute API smoke tests
    log "INFO" "Executing API smoke tests"
    
    # Determine API endpoint
    local api_endpoint
    if [[ "$environment" == "dev" ]]; then
        # For dev, port-forward to access the API
        local port=8081
        kubectl port-forward "svc/ims-api-gateway" "$port:80" -n "$namespace" &> /dev/null &
        local pf_pid=$!
        sleep 2  # Allow port-forward to establish
        api_endpoint="http://localhost:$port"
        
        # Run tests
        if ! "${PROJECT_ROOT}/tests/smoke-tests.sh" --endpoint "$api_endpoint" --suite "$test_suite"; then
            log "ERROR" "Smoke tests failed"
            kill $pf_pid
            return 1
        fi
        
        # Kill port-forward
        kill $pf_pid
    else
        # For staging and prod, use the actual endpoint
        api_endpoint="https://ims-${environment}.example.com"
        
        # Run tests
        if ! "${PROJECT_ROOT}/tests/smoke-tests.sh" --endpoint "$api_endpoint" --suite "$test_suite"; then
            log "ERROR" "Smoke tests failed"
            return 1
        fi
    fi
    
    log "INFO" "Smoke tests completed successfully"
    return 0
}

# Function to rollback deployment
rollback_deployment() {
    local environment="$1"
    local backup_dir="$2"
    local namespace="${NAMESPACE[$environment]}"
    
    log "INFO" "Rolling back deployment for environment: $environment"
    
    # Determine rollback strategy based on deployment method
    if [[ "$DEPLOYMENT_METHOD" == "helm" ]]; then
        log "INFO" "Rolling back Helm release"
        
        # Get previous revision
        local current_revision=$(helm history "ims-$environment" -n "$namespace" | grep DEPLOYED | awk '{print $1}')
        local previous_revision=$((current_revision - 1))
        
        if [[ "$previous_revision" -lt 1 ]]; then
            log "ERROR" "No previous revision found for rollback"
            return 1
        fi
        
        log "INFO" "Rolling back to revision $previous_revision"
        if ! helm rollback "ims-$environment" "$previous_revision" -n "$namespace" --wait --timeout "${DEPLOYMENT_TIMEOUT[$environment]}s"; then
            log "ERROR" "Helm rollback failed"
            return 1
        fi
    elif [[ "$DEPLOYMENT_METHOD" == "argocd" ]]; then
        log "INFO" "Rolling back ArgoCD application"
        
        # Check if we have backup of ArgoCD application
        if [[ -f "$backup_dir/argocd_app.yaml" ]]; then
            log "INFO" "Restoring ArgoCD application from backup"
            if ! kubectl apply -f "$backup_dir/argocd_app.yaml"; then
                log "ERROR" "Failed to restore ArgoCD application from backup"
                return 1
            fi
            
            # Trigger sync to previous version
            log "INFO" "Triggering sync to previous version"
            if ! argocd app sync "ims-$environment" --timeout "${DEPLOYMENT_TIMEOUT[$environment]}"; then
                log "ERROR" "ArgoCD sync operation failed during rollback"
                return 1
            fi
            
            # Wait for sync to complete and verify health
            log "INFO" "Waiting for ArgoCD sync to complete and application to become healthy"
            if ! argocd app wait "ims-$environment" --health --timeout "${DEPLOYMENT_TIMEOUT[$environment]}"; then
                log "ERROR" "ArgoCD application failed to become healthy after rollback"
                return 1
            fi
        else
            log "ERROR" "No ArgoCD application backup found for rollback"
            return 1
        fi
    else
        log "ERROR" "Unknown deployment method for rollback: $DEPLOYMENT_METHOD"
        return 1
    fi
    
    log "INFO" "Verifying rollback"
    if ! verify_deployment "$environment"; then
        log "ERROR" "Verification failed after rollback"
        return 1
    fi
    
    log "INFO" "Rollback completed successfully"
    return 0
}

# Function to update deployment registry
update_deployment_registry() {
    local environment="$1"
    local version="$2"
    local status="$3"
    
    log "INFO" "Updating deployment registry for environment: $environment, version: $version, status: $status"
    
    # Create registry directory if it doesn't exist
    local registry_dir="${PROJECT_ROOT}/deployment-registry"
    mkdir -p "$registry_dir"
    
    # Create deployment record
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local record_file="${registry_dir}/${environment}_${version//./}_$(date '+%Y%m%d%H%M%S').json"
    
    cat > "$record_file" << EOF
{
  "environment": "$environment",
  "version": "$version",
  "timestamp": "$timestamp",
  "status": "$status",
  "user": "$(whoami)",
  "method": "$DEPLOYMENT_METHOD",
  "log_file": "$LOG_FILE"
}
EOF
    
    # Update deployment history
    local history_file="${registry_dir}/history.csv"
    if [[ ! -f "$history_file" ]]; then
        echo "timestamp,environment,version,status,user,method" > "$history_file"
    fi
    
    echo "\"$timestamp\",\"$environment\",\"$version\",\"$status\",\"$(whoami)\",\"$DEPLOYMENT_METHOD\"" >> "$history_file"
    
    # Copy deployment logs
    if [[ -f "$LOG_FILE" ]]; then
        mkdir -p "${registry_dir}/logs"
        cp "$LOG_FILE" "${registry_dir}/logs/$(basename "$record_file" .json).log"
    fi
    
    log "INFO" "Deployment registry updated successfully"
    return 0
}

# Function to send deployment notification
send_notification() {
    local environment="$1"
    local status="$2"
    local message="$3"
    
    log "INFO" "Sending deployment notification for environment: $environment, status: $status"
    
    # Determine notification recipients
    local recipients
    case "$environment" in
        dev)
            recipients="dev-team@example.com"
            ;;
        staging)
            recipients="dev-team@example.com,qa-team@example.com"
            ;;
        prod)
            recipients="dev-team@example.com,qa-team@example.com,ops-team@example.com"
            ;;
    esac
    
    # Use environment variable if set
    if [[ -n "$DEPLOYMENT_NOTIFICATION_EMAIL" ]]; then
        recipients="$DEPLOYMENT_NOTIFICATION_EMAIL"
    fi
    
    # Format notification message
    local subject="IMS Deployment: $environment - $status"
    local body="
IMS Deployment Notification

Environment: $environment
Version: $VERSION
Status: $status
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
Deployed by: $(whoami)
Deployment method: $DEPLOYMENT_METHOD

$message

For more details, please check the deployment log at:
$LOG_FILE
"
    
    # Send email notification
    if [[ -n "$recipients" ]]; then
        log "INFO" "Sending email notification to: $recipients"
        echo "$body" | mail -s "$subject" "$recipients" || true
    fi
    
    # Send Slack notification if webhook is configured
    if [[ -n "$DEPLOYMENT_SLACK_WEBHOOK" ]]; then
        log "INFO" "Sending Slack notification"
        
        local slack_message="{\"text\":\"*$subject*\n\`\`\`$body\`\`\`\"}"
        curl -s -X POST -H 'Content-type: application/json' --data "$slack_message" "$DEPLOYMENT_SLACK_WEBHOOK" || true
    fi
    
    # Update JIRA tickets if applicable
    if [[ "$status" == "SUCCESS" && -n "$JIRA_API_TOKEN" ]]; then
        log "INFO" "Updating JIRA tickets"
        
        # This is a placeholder - actual implementation would depend on your JIRA integration
        # "${PROJECT_ROOT}/scripts/update-jira.sh" --version "$VERSION" --environment "$environment" --status "Deployed"
    fi
    
    log "INFO" "Notifications sent successfully"
    return 0
}

# Main function
main() {
    # Initialize variables
    local environment="$DEFAULT_ENVIRONMENT"
    local version="latest"
    local deployment_method="argocd"
    local dry_run="false"
    local force="false"
    local skip_tests="false"
    local notify="true"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--environment)
                environment="$2"
                shift 2
                ;;
            -v|--version)
                version="$2"
                shift 2
                ;;
            -m|--method)
                deployment_method="$2"
                shift 2
                ;;
            -d|--dry-run)
                dry_run="true"
                shift
                ;;
            -f|--force)
                force="true"
                shift
                ;;
            -s|--skip-tests)
                skip_tests="true"
                shift
                ;;
            -n|--notify)
                notify="$2"
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
    
    # Set global variables
    VERSION="$version"
    DEPLOYMENT_METHOD="$deployment_method"
    
    # Set up logging
    mkdir -p "$(dirname "$LOG_FILE")"
    log "INFO" "Starting deployment of IMS version $VERSION to $environment environment using $DEPLOYMENT_METHOD method"
    log "INFO" "Dry run: $dry_run, Force: $force, Skip tests: $skip_tests, Notify: $notify"
    
    # Check prerequisites
    log "INFO" "Checking prerequisites"
    if ! check_prerequisites; then
        log "ERROR" "Prerequisite check failed"
        if [[ "$notify" == "true" ]]; then
            send_notification "$environment" "FAILED" "Deployment failed during prerequisite check"
        fi
        exit 1
    fi
    
    # Set up environment
    log "INFO" "Setting up environment"
    if ! setup_environment "$environment"; then
        log "ERROR" "Environment setup failed"
        if [[ "$notify" == "true" ]]; then
            send_notification "$environment" "FAILED" "Deployment failed during environment setup"
        fi
        exit 1
    fi
    
    # Validate deployment configuration
    log "INFO" "Validating deployment configuration"
    if ! validate_deployment_config "$environment"; then
        log "ERROR" "Deployment configuration validation failed"
        
        if [[ "$force" != "true" ]]; then
            log "ERROR" "Deployment aborted due to validation failure. Use --force to override."
            if [[ "$notify" == "true" ]]; then
                send_notification "$environment" "FAILED" "Deployment failed during configuration validation"
            fi
            exit 2
        else
            log "WARNING" "Proceeding with deployment despite validation failure (--force was specified)"
        fi
    fi
    
    # Backup current state
    log "INFO" "Creating backup of current state"
    local backup_dir
    backup_dir=$(backup_current_state "$environment")
    if [[ $? -ne 0 ]]; then
        log "ERROR" "Failed to create backup of current state"
        if [[ "$notify" == "true" ]]; then
            send_notification "$environment" "FAILED" "Deployment failed during backup creation"
        fi
        exit 1
    fi
    
    # Deploy application
    log "INFO" "Deploying application"
    local deploy_success="true"
    
    if [[ "$deployment_method" == "helm" ]]; then
        if ! deploy_with_helm "$environment" "$version" "$dry_run"; then
            deploy_success="false"
        fi
    elif [[ "$deployment_method" == "argocd" ]]; then
        if ! deploy_with_argocd "$environment" "$version"; then
            deploy_success="false"
        fi
    else
        log "ERROR" "Unknown deployment method: $deployment_method"
        if [[ "$notify" == "true" ]]; then
            send_notification "$environment" "FAILED" "Deployment failed: Unknown deployment method: $deployment_method"
        fi
        exit 1
    fi
    
    if [[ "$deploy_success" != "true" ]]; then
        log "ERROR" "Deployment failed"
        
        log "INFO" "Attempting rollback"
        if ! rollback_deployment "$environment" "$backup_dir"; then
            log "ERROR" "Rollback failed"
        else
            log "INFO" "Rollback completed successfully"
        fi
        
        if [[ "$notify" == "true" ]]; then
            send_notification "$environment" "FAILED" "Deployment failed during application deployment. Rollback completed."
        fi
        
        update_deployment_registry "$environment" "$version" "FAILED"
        exit 3
    fi
    
    # Skip verification and testing if this is a dry run
    if [[ "$dry_run" == "true" ]]; then
        log "INFO" "Skipping verification and testing for dry run"
        
        if [[ "$notify" == "true" ]]; then
            send_notification "$environment" "DRY_RUN" "Dry run deployment completed successfully"
        fi
        
        update_deployment_registry "$environment" "$version" "DRY_RUN"
        exit 0
    fi
    
    # Verify deployment
    log "INFO" "Verifying deployment"
    if ! verify_deployment "$environment"; then
        log "ERROR" "Deployment verification failed"
        
        log "INFO" "Attempting rollback"
        if ! rollback_deployment "$environment" "$backup_dir"; then
            log "ERROR" "Rollback failed"
        else
            log "INFO" "Rollback completed successfully"
        fi
        
        if [[ "$notify" == "true" ]]; then
            send_notification "$environment" "FAILED" "Deployment failed during verification. Rollback completed."
        fi
        
        update_deployment_registry "$environment" "$version" "FAILED"
        exit 4
    fi
    
    # Run smoke tests if not skipped
    if [[ "$skip_tests" != "true" ]]; then
        log "INFO" "Running smoke tests"
        if ! run_smoke_tests "$environment"; then
            log "ERROR" "Smoke tests failed"
            
            # For staging and dev, we might continue despite test failures
            if [[ "$environment" == "prod" ]]; then
                log "ERROR" "Smoke tests failed in production environment. Attempting rollback."
                
                if ! rollback_deployment "$environment" "$backup_dir"; then
                    log "ERROR" "Rollback failed"
                else
                    log "INFO" "Rollback completed successfully"
                fi
                
                if [[ "$notify" == "true" ]]; then
                    send_notification "$environment" "FAILED" "Deployment failed during smoke tests. Rollback completed."
                fi
                
                update_deployment_registry "$environment" "$version" "FAILED"
                exit 4
            else
                log "WARNING" "Smoke tests failed in $environment environment. Proceeding with deployment."
            fi
        fi
    else
        log "INFO" "Skipping smoke tests as requested"
    fi
    
    # Update deployment registry
    log "INFO" "Updating deployment registry"
    if ! update_deployment_registry "$environment" "$version" "SUCCESS"; then
        log "WARNING" "Failed to update deployment registry"
    fi
    
    # Send notification if requested
    if [[ "$notify" == "true" ]]; then
        log "INFO" "Sending deployment completion notification"
        send_notification "$environment" "SUCCESS" "Deployment completed successfully"
    fi
    
    log "INFO" "Deployment process completed successfully"
    return 0
}

# Execute main function with all arguments
main "$@"
exit $?