#!/bin/bash

# Inventory Management System (IMS) Monitoring Validation Script
# This script validates Prometheus rules, Grafana dashboards, and monitoring configurations 
# to ensure they meet the IMS requirements before deployment.
# 
# Dependencies:
# - jq (latest): JSON parsing and validation
# - yq (latest): YAML parsing and validation
# - curl (latest): Making HTTP requests to monitoring services

# Global variables
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROMETHEUS_RULES_FILE="${SCRIPT_DIR}/../prometheus/test-rules.yml"
GRAFANA_DASHBOARDS_FILE="${SCRIPT_DIR}/../grafana/test-dashboards.json"
PROMETHEUS_URL=${PROMETHEUS_URL:-http://localhost:9090}
GRAFANA_URL=${GRAFANA_URL:-http://localhost:3000}
LOG_FILE="/tmp/validate-monitoring.log"
EXIT_CODE=0

# Function to log messages
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    echo "[$timestamp] [$level] $message"
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Function to validate Prometheus rules
validate_prometheus_rules() {
    log_message "INFO" "Validating Prometheus rules at $PROMETHEUS_RULES_FILE"
    
    # Check if file exists
    if [ ! -f "$PROMETHEUS_RULES_FILE" ]; then
        log_message "ERROR" "Prometheus rules file not found: $PROMETHEUS_RULES_FILE"
        return 1
    fi
    
    # Check for yq command
    if ! command -v yq &> /dev/null; then
        log_message "ERROR" "yq command not found. Please install yq"
        return 1
    fi
    
    # Validate YAML syntax
    if ! yq eval '.' "$PROMETHEUS_RULES_FILE" > /dev/null 2>&1; then
        log_message "ERROR" "Invalid YAML syntax in Prometheus rules file"
        return 1
    fi
    
    # Check for required rule groups
    local rule_groups=$(yq eval '.groups[].name' "$PROMETHEUS_RULES_FILE")
    local required_groups=("test_system_alerts" "test_application_alerts" "test_business_process_alerts")
    local missing_groups=()
    
    for group in "${required_groups[@]}"; do
        if ! echo "$rule_groups" | grep -q "$group"; then
            missing_groups+=("$group")
        fi
    done
    
    if [ ${#missing_groups[@]} -gt 0 ]; then
        log_message "ERROR" "Missing required rule groups: ${missing_groups[*]}"
        return 1
    fi
    
    # Validate alert rules
    local alert_rules_count=$(yq eval '.groups[] | select(.name=="test_system_alerts" or .name=="test_application_alerts" or .name=="test_business_process_alerts") | .rules[] | select(has("alert")) | length' "$PROMETHEUS_RULES_FILE" | wc -l)
    
    if [ "$alert_rules_count" -eq 0 ]; then
        log_message "ERROR" "No alert rules found in required rule groups"
        return 1
    fi
    
    # Check for missing required fields in alert rules
    local missing_fields=$(yq eval '.groups[] | select(.name=="test_system_alerts" or .name=="test_application_alerts" or .name=="test_business_process_alerts") | .rules[] | select(has("alert")) | select(has("expr") | not or has("for") | not or has("labels") | not or has("annotations") | not) | .alert' "$PROMETHEUS_RULES_FILE")
    
    if [ -n "$missing_fields" ]; then
        log_message "ERROR" "Alert rules missing required fields: $missing_fields"
        return 1
    fi
    
    # Validate recording rules
    local recording_rules_count=$(yq eval '.groups[] | select(.name=="test_system_metrics" or .name=="test_application_metrics" or .name=="test_business_metrics" or .name=="test_sla_metrics") | .rules[] | select(has("record")) | length' "$PROMETHEUS_RULES_FILE" | wc -l)
    
    if [ "$recording_rules_count" -eq 0 ]; then
        log_message "ERROR" "No recording rules found in metrics rule groups"
        return 1
    fi
    
    # Check for missing required fields in recording rules
    local missing_fields=$(yq eval '.groups[] | select(.name=="test_system_metrics" or .name=="test_application_metrics" or .name=="test_business_metrics" or .name=="test_sla_metrics") | .rules[] | select(has("record")) | select(has("expr") | not) | .record' "$PROMETHEUS_RULES_FILE")
    
    if [ -n "$missing_fields" ]; then
        log_message "ERROR" "Recording rules missing required fields: $missing_fields"
        return 1
    fi
    
    # Find business process alerts related to short sell validation
    local short_sell_rules=$(yq eval '.groups[] | select(.name=="test_business_process_alerts") | .rules[] | select(.alert | test(".*[Ss]hort.*[Ss]ell.*|.*[Ss]hort.*[Vv]alidation.*")) | .alert' "$PROMETHEUS_RULES_FILE")
    
    if [ -z "$short_sell_rules" ]; then
        log_message "ERROR" "No short sell validation alert rules found"
        return 1
    else
        # Check the thresholds in these rules
        for rule in $short_sell_rules; do
            local expr=$(yq eval ".groups[] | select(.name==\"test_business_process_alerts\") | .rules[] | select(.alert == \"$rule\") | .expr" "$PROMETHEUS_RULES_FILE")
            local threshold=$(echo "$expr" | grep -o "[0-9.]\+" | head -1)
            
            if [ -n "$threshold" ]; then
                log_message "INFO" "Short sell validation rule $rule has threshold: $threshold"
                
                # Check if the threshold is in seconds (needs conversion to ms)
                if echo "$expr" | grep -q "seconds"; then
                    # Convert to milliseconds
                    if command -v bc &> /dev/null; then
                        threshold=$(echo "$threshold * 1000" | bc)
                    else
                        threshold=$(echo "$threshold" | awk '{printf "%.0f", $1 * 1000}')
                    fi
                    log_message "INFO" "Converted to milliseconds: $threshold"
                fi
                
                # Compare with SLA (150ms for short sell validation)
                if [ -n "$threshold" ] && [ $(echo "$threshold > 150" | bc 2>/dev/null || echo 1) -eq 1 ]; then
                    log_message "ERROR" "Short sell validation threshold ($threshold ms) exceeds SLA requirement (150 ms)"
                    return 1
                fi
            fi
        done
    fi
    
    # Find business process alerts related to event processing
    local event_processing_rules=$(yq eval '.groups[] | select(.name=="test_business_process_alerts") | .rules[] | select(.alert | test(".*[Ee]vent.*[Pp]rocessing.*|.*[Pp]rocessing.*[Ll]atency.*")) | .alert' "$PROMETHEUS_RULES_FILE")
    
    if [ -z "$event_processing_rules" ]; then
        log_message "ERROR" "No event processing latency alert rules found"
        return 1
    else
        # Check the thresholds in these rules
        for rule in $event_processing_rules; do
            local expr=$(yq eval ".groups[] | select(.name==\"test_business_process_alerts\") | .rules[] | select(.alert == \"$rule\") | .expr" "$PROMETHEUS_RULES_FILE")
            local threshold=$(echo "$expr" | grep -o "[0-9.]\+" | head -1)
            
            if [ -n "$threshold" ]; then
                log_message "INFO" "Event processing rule $rule has threshold: $threshold"
                
                # Check if the threshold is in seconds (needs conversion to ms)
                if echo "$expr" | grep -q "seconds"; then
                    # Convert to milliseconds
                    if command -v bc &> /dev/null; then
                        threshold=$(echo "$threshold * 1000" | bc)
                    else
                        threshold=$(echo "$threshold" | awk '{printf "%.0f", $1 * 1000}')
                    fi
                    log_message "INFO" "Converted to milliseconds: $threshold"
                fi
                
                # Compare with SLA (200ms for event processing)
                if [ -n "$threshold" ] && [ $(echo "$threshold > 200" | bc 2>/dev/null || echo 1) -eq 1 ]; then
                    log_message "ERROR" "Event processing latency threshold ($threshold ms) exceeds SLA requirement (200 ms)"
                    return 1
                fi
            fi
        done
    fi
    
    # Verify alert severity levels
    local critical_alerts=$(yq eval '.groups[].rules[] | select(.alert != null) | select(.labels.severity == "critical") | .alert' "$PROMETHEUS_RULES_FILE")
    
    if [ -z "$critical_alerts" ]; then
        log_message "WARN" "No critical severity alerts found"
    fi
    
    # Verify alert notification channels (through annotations)
    local missing_runbooks=$(yq eval '.groups[].rules[] | select(.alert != null) | select(.annotations.runbook_url == null) | .alert' "$PROMETHEUS_RULES_FILE")
    
    if [ -n "$missing_runbooks" ]; then
        log_message "WARN" "Some alerts are missing runbook URLs: $missing_runbooks"
    fi
    
    log_message "INFO" "Prometheus rules validation passed successfully"
    return 0
}

# Function to validate Grafana dashboards
validate_grafana_dashboards() {
    log_message "INFO" "Validating Grafana dashboards at $GRAFANA_DASHBOARDS_FILE"
    
    # Check if file exists
    if [ ! -f "$GRAFANA_DASHBOARDS_FILE" ]; then
        log_message "ERROR" "Grafana dashboards file not found: $GRAFANA_DASHBOARDS_FILE"
        return 1
    fi
    
    # Check for jq command
    if ! command -v jq &> /dev/null; then
        log_message "ERROR" "jq command not found. Please install jq"
        return 1
    fi
    
    # Validate JSON syntax
    if ! jq '.' "$GRAFANA_DASHBOARDS_FILE" > /dev/null 2>&1; then
        log_message "ERROR" "Invalid JSON syntax in Grafana dashboards file"
        return 1
    fi
    
    # Check for required dashboards
    local dashboard_count=$(jq '.dashboards | length' "$GRAFANA_DASHBOARDS_FILE")
    
    if [ "$dashboard_count" -lt 3 ]; then
        log_message "ERROR" "Insufficient number of dashboards found. Expected at least 3, found $dashboard_count"
        return 1
    fi
    
    # Check for required dashboard UIDs
    local required_dashboards=("test-system-overview" "test-calculation-performance" "test-data-ingestion")
    local missing_dashboards=()
    
    for dashboard in "${required_dashboards[@]}"; do
        if ! jq -e ".dashboards[] | select(.uid == \"$dashboard\")" "$GRAFANA_DASHBOARDS_FILE" > /dev/null; then
            missing_dashboards+=("$dashboard")
        fi
    done
    
    if [ ${#missing_dashboards[@]} -gt 0 ]; then
        log_message "ERROR" "Missing required dashboards: ${missing_dashboards[*]}"
        return 1
    fi
    
    # Verify each dashboard has required structure
    for dashboard in "${required_dashboards[@]}"; do
        # Check for title
        if ! jq -e ".dashboards[] | select(.uid == \"$dashboard\") | .title" "$GRAFANA_DASHBOARDS_FILE" > /dev/null; then
            log_message "ERROR" "Dashboard $dashboard is missing title"
            return 1
        fi
        
        # Check for panels
        local panel_count=$(jq ".dashboards[] | select(.uid == \"$dashboard\") | .panels | length" "$GRAFANA_DASHBOARDS_FILE")
        
        if [ "$panel_count" -lt 1 ]; then
            log_message "ERROR" "Dashboard $dashboard has no panels"
            return 1
        fi
        
        # Check each panel has required fields
        local panels_without_title=$(jq -r ".dashboards[] | select(.uid == \"$dashboard\") | .panels[] | select(.title == null) | @json" "$GRAFANA_DASHBOARDS_FILE")
        
        if [ -n "$panels_without_title" ]; then
            log_message "ERROR" "Dashboard $dashboard has panels without titles"
            return 1
        fi
        
        local panels_without_type=$(jq -r ".dashboards[] | select(.uid == \"$dashboard\") | .panels[] | select(.type == null) | @json" "$GRAFANA_DASHBOARDS_FILE")
        
        if [ -n "$panels_without_type" ]; then
            log_message "ERROR" "Dashboard $dashboard has panels without types"
            return 1
        fi
        
        local panels_without_datasource=$(jq -r ".dashboards[] | select(.uid == \"$dashboard\") | .panels[] | select(.datasource == null) | @json" "$GRAFANA_DASHBOARDS_FILE")
        
        if [ -n "$panels_without_datasource" ]; then
            log_message "ERROR" "Dashboard $dashboard has panels without datasource"
            return 1
        fi
        
        local panels_without_targets=$(jq -r ".dashboards[] | select(.uid == \"$dashboard\") | .panels[] | select(.targets == null or .targets | length == 0) | @json" "$GRAFANA_DASHBOARDS_FILE")
        
        if [ -n "$panels_without_targets" ]; then
            log_message "ERROR" "Dashboard $dashboard has panels without targets"
            return 1
        fi
    done
    
    # Check system overview dashboard has SLA panels
    local sla_panels=$(jq -r '.dashboards[] | select(.uid == "test-system-overview") | .panels[] | select(.title | contains("SLA")) | @json' "$GRAFANA_DASHBOARDS_FILE")
    
    if [ -z "$sla_panels" ]; then
        log_message "ERROR" "System overview dashboard is missing SLA compliance panels"
        return 1
    fi
    
    # Check calculation performance dashboard has latency metrics
    local latency_panels=$(jq -r '.dashboards[] | select(.uid == "test-calculation-performance") | .panels[] | select(.title | contains("Latency")) | @json' "$GRAFANA_DASHBOARDS_FILE")
    
    if [ -z "$latency_panels" ]; then
        log_message "ERROR" "Calculation performance dashboard is missing latency metrics panels"
        return 1
    fi
    
    log_message "INFO" "Grafana dashboards validation passed successfully"
    return 0
}

# Function to validate Prometheus connectivity
validate_prometheus_connectivity() {
    log_message "INFO" "Validating connectivity to Prometheus at $PROMETHEUS_URL"
    
    # Check for curl command
    if ! command -v curl &> /dev/null; then
        log_message "ERROR" "curl command not found. Please install curl"
        return 1
    fi
    
    # Check if Prometheus URL is accessible
    if ! curl -s -o /dev/null -w "%{http_code}" "$PROMETHEUS_URL/-/healthy" | grep -q "200"; then
        log_message "ERROR" "Prometheus is not accessible at $PROMETHEUS_URL"
        return 1
    fi
    
    # Query Prometheus API to verify it's responding
    local api_response=$(curl -s "$PROMETHEUS_URL/api/v1/status/buildinfo")
    
    if ! echo "$api_response" | jq -e '.status == "success"' > /dev/null; then
        log_message "ERROR" "Prometheus API is not responding properly"
        return 1
    fi
    
    # Check if Prometheus is scraping targets
    local targets_response=$(curl -s "$PROMETHEUS_URL/api/v1/targets")
    
    if ! echo "$targets_response" | jq -e '.status == "success"' > /dev/null; then
        log_message "ERROR" "Failed to query Prometheus targets"
        return 1
    fi
    
    local active_targets=$(echo "$targets_response" | jq '.data.activeTargets | length')
    
    if [ "$active_targets" -eq 0 ]; then
        log_message "ERROR" "Prometheus has no active targets"
        return 1
    fi
    
    # Verify alert rules are loaded
    local rules_response=$(curl -s "$PROMETHEUS_URL/api/v1/rules")
    
    if ! echo "$rules_response" | jq -e '.status == "success"' > /dev/null; then
        log_message "ERROR" "Failed to query Prometheus rules"
        return 1
    fi
    
    local rules_count=$(echo "$rules_response" | jq '.data.groups | map(.rules | length) | add')
    
    if [ "$rules_count" -eq 0 ]; then
        log_message "ERROR" "Prometheus has no rules loaded"
        return 1
    fi
    
    log_message "INFO" "Prometheus connectivity validation passed successfully"
    return 0
}

# Function to validate Grafana connectivity
validate_grafana_connectivity() {
    log_message "INFO" "Validating connectivity to Grafana at $GRAFANA_URL"
    
    # Check for curl command
    if ! command -v curl &> /dev/null; then
        log_message "ERROR" "curl command not found. Please install curl"
        return 1
    fi
    
    # Check if Grafana URL is accessible
    if ! curl -s -o /dev/null -w "%{http_code}" "$GRAFANA_URL/api/health" | grep -q "200"; then
        log_message "ERROR" "Grafana is not accessible at $GRAFANA_URL"
        return 1
    fi
    
    # Query Grafana API to verify it's responding
    local api_response=$(curl -s "$GRAFANA_URL/api/health")
    
    if ! echo "$api_response" | jq -e '.database == "ok"' > /dev/null; then
        log_message "ERROR" "Grafana API is not responding properly"
        return 1
    fi
    
    # Check if Prometheus data source is configured (requires API key)
    if [ -n "$GRAFANA_API_KEY" ]; then
        local datasource_response=$(curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" "$GRAFANA_URL/api/datasources")
        
        if ! echo "$datasource_response" | jq -e '.[] | select(.name == "prometheus")' > /dev/null; then
            log_message "ERROR" "Prometheus data source is not configured in Grafana"
            return 1
        fi
    else
        log_message "WARN" "GRAFANA_API_KEY not set. Skipping data source check"
    fi
    
    # Verify dashboards are loaded (if we have an API key)
    if [ -n "$GRAFANA_API_KEY" ]; then
        local dashboards_response=$(curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" "$GRAFANA_URL/api/search?type=dash-db")
        
        if ! echo "$dashboards_response" | jq -e 'length > 0' > /dev/null; then
            log_message "ERROR" "No dashboards found in Grafana"
            return 1
        fi
        
        # Check for required dashboards
        local required_dashboards=("Test System Overview" "Test Calculation Performance" "Test Data Ingestion")
        local missing_dashboards=()
        
        for dashboard in "${required_dashboards[@]}"; do
            if ! echo "$dashboards_response" | jq -e ".[] | select(.title == \"$dashboard\")" > /dev/null; then
                missing_dashboards+=("$dashboard")
            fi
        done
        
        if [ ${#missing_dashboards[@]} -gt 0 ]; then
            log_message "ERROR" "Missing required dashboards in Grafana: ${missing_dashboards[*]}"
            return 1
        fi
    else
        log_message "WARN" "GRAFANA_API_KEY not set. Skipping dashboards check"
    fi
    
    log_message "INFO" "Grafana connectivity validation passed successfully"
    return 0
}

# Function to validate metrics coverage
validate_metrics_coverage() {
    log_message "INFO" "Validating metrics coverage in Prometheus"
    
    # Check for curl command
    if ! command -v curl &> /dev/null; then
        log_message "ERROR" "curl command not found. Please install curl"
        return 1
    fi
    
    # Check for system metrics
    local system_metrics=("test_ims_system_cpu_utilization_percent" "test_ims_system_memory_utilization_percent" "test_ims_system_health_status")
    local missing_system_metrics=()
    
    for metric in "${system_metrics[@]}"; do
        local query_response=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$metric")
        
        if ! echo "$query_response" | jq -e '.status == "success" and .data.result | length > 0' > /dev/null; then
            missing_system_metrics+=("$metric")
        fi
    done
    
    if [ ${#missing_system_metrics[@]} -gt 0 ]; then
        log_message "ERROR" "Missing system metrics: ${missing_system_metrics[*]}"
        return 1
    fi
    
    # Check for application metrics
    local app_metrics=("test_ims_application_request_rate" "test_ims_application_response_time_ms" "test_ims_application_error_rate_percent")
    local missing_app_metrics=()
    
    for metric in "${app_metrics[@]}"; do
        local query_response=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$metric")
        
        if ! echo "$query_response" | jq -e '.status == "success" and .data.result | length > 0' > /dev/null; then
            missing_app_metrics+=("$metric")
        fi
    done
    
    if [ ${#missing_app_metrics[@]} -gt 0 ]; then
        log_message "ERROR" "Missing application metrics: ${missing_app_metrics[*]}"
        return 1
    fi
    
    # Check for business metrics
    local business_metrics=("test_ims_business_events_per_second" "test_ims_business_event_processing_latency_ms" "test_ims_business_short_sell_validation_time_ms")
    local missing_business_metrics=()
    
    for metric in "${business_metrics[@]}"; do
        local query_response=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$metric")
        
        if ! echo "$query_response" | jq -e '.status == "success" and .data.result | length > 0' > /dev/null; then
            missing_business_metrics+=("$metric")
        fi
    done
    
    if [ ${#missing_business_metrics[@]} -gt 0 ]; then
        log_message "ERROR" "Missing business metrics: ${missing_business_metrics[*]}"
        return 1
    fi
    
    # Check for SLA metrics
    local sla_metrics=("test_ims_sla_compliance_percent")
    local missing_sla_metrics=()
    
    for metric in "${sla_metrics[@]}"; do
        local query_response=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$metric")
        
        if ! echo "$query_response" | jq -e '.status == "success" and .data.result | length > 0' > /dev/null; then
            missing_sla_metrics+=("$metric")
        fi
    done
    
    if [ ${#missing_sla_metrics[@]} -gt 0 ]; then
        log_message "ERROR" "Missing SLA metrics: ${missing_sla_metrics[*]}"
        return 1
    fi
    
    # Verify metrics have recent data points
    local stale_metrics=()
    local current_time=$(date +%s)
    local time_threshold=$((current_time - 300)) # Last 5 minutes
    
    for metric in "${system_metrics[@]}" "${app_metrics[@]}" "${business_metrics[@]}" "${sla_metrics[@]}"; do
        local query_response=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$metric")
        local last_timestamp=$(echo "$query_response" | jq -r '.data.result[0].value[0]')
        
        if [ -n "$last_timestamp" ] && [ "$last_timestamp" -lt "$time_threshold" ]; then
            stale_metrics+=("$metric")
        fi
    done
    
    if [ ${#stale_metrics[@]} -gt 0 ]; then
        log_message "WARN" "Some metrics have stale data: ${stale_metrics[*]}"
    fi
    
    log_message "INFO" "Metrics coverage validation passed successfully"
    return 0
}

# Function to validate alert thresholds
validate_alert_thresholds() {
    log_message "INFO" "Validating alert thresholds in Prometheus rules"
    
    # Check if file exists
    if [ ! -f "$PROMETHEUS_RULES_FILE" ]; then
        log_message "ERROR" "Prometheus rules file not found: $PROMETHEUS_RULES_FILE"
        return 1
    fi
    
    # Check for yq command
    if ! command -v yq &> /dev/null; then
        log_message "ERROR" "yq command not found. Please install yq"
        return 1
    fi
    
    # Define SLA requirements from technical specification
    local event_processing_sla_ms=200
    local short_sell_validation_sla_ms=150
    local ui_dashboard_load_sla_ms=3000
    
    # Find business process alerts
    local business_alerts=$(yq eval '.groups[] | select(.name=="test_business_process_alerts") | .rules[] | select(has("alert")) | .alert' "$PROMETHEUS_RULES_FILE")
    
    if [ -z "$business_alerts" ]; then
        log_message "ERROR" "No business process alerts found"
        return 1
    fi
    
    # Look for event processing and short sell alerts
    local event_processing_found=false
    local short_sell_found=false
    
    for alert in $business_alerts; do
        # Check if alert relates to event processing latency
        if echo "$alert" | grep -qi "event\|processing\|latency"; then
            event_processing_found=true
            log_message "INFO" "Found event processing alert: $alert"
            
            # Get the expression and threshold
            local expr=$(yq eval ".groups[].rules[] | select(.alert == \"$alert\") | .expr" "$PROMETHEUS_RULES_FILE")
            local threshold=$(echo "$expr" | grep -o "[0-9.]\+" | head -1)
            
            if [ -n "$threshold" ]; then
                log_message "INFO" "Event processing threshold: $threshold"
                
                # Check unit (seconds vs milliseconds)
                if echo "$expr" | grep -qi "seconds"; then
                    # Convert to milliseconds
                    if command -v bc &> /dev/null; then
                        threshold=$(echo "$threshold * 1000" | bc)
                    else
                        threshold=$(echo "$threshold" | awk '{printf "%.0f", $1 * 1000}')
                    fi
                    log_message "INFO" "Converted to milliseconds: $threshold"
                fi
                
                # Compare with SLA
                if (( $(echo "$threshold > $event_processing_sla_ms" | bc -l 2>/dev/null || echo 1) )); then
                    log_message "ERROR" "Event processing threshold ($threshold ms) exceeds SLA requirement ($event_processing_sla_ms ms)"
                    return 1
                fi
            fi
        fi
        
        # Check if alert relates to short sell validation
        if echo "$alert" | grep -qi "short\|sell\|validation"; then
            short_sell_found=true
            log_message "INFO" "Found short sell alert: $alert"
            
            # Get the expression and threshold
            local expr=$(yq eval ".groups[].rules[] | select(.alert == \"$alert\") | .expr" "$PROMETHEUS_RULES_FILE")
            local threshold=$(echo "$expr" | grep -o "[0-9.]\+" | head -1)
            
            if [ -n "$threshold" ]; then
                log_message "INFO" "Short sell threshold: $threshold"
                
                # Check unit (seconds vs milliseconds)
                if echo "$expr" | grep -qi "seconds"; then
                    # Convert to milliseconds
                    if command -v bc &> /dev/null; then
                        threshold=$(echo "$threshold * 1000" | bc)
                    else
                        threshold=$(echo "$threshold" | awk '{printf "%.0f", $1 * 1000}')
                    fi
                    log_message "INFO" "Converted to milliseconds: $threshold"
                fi
                
                # Compare with SLA
                if (( $(echo "$threshold > $short_sell_validation_sla_ms" | bc -l 2>/dev/null || echo 1) )); then
                    log_message "ERROR" "Short sell threshold ($threshold ms) exceeds SLA requirement ($short_sell_validation_sla_ms ms)"
                    return 1
                fi
            fi
        fi
    done
    
    # Check if we found the required alerts
    if [ "$event_processing_found" != "true" ]; then
        log_message "ERROR" "No event processing latency alerts found"
        return 1
    fi
    
    if [ "$short_sell_found" != "true" ]; then
        log_message "ERROR" "No short sell validation alerts found"
        return 1
    fi
    
    # Verify alert severity levels
    local critical_alerts=$(yq eval '.groups[].rules[] | select(.alert != null) | select(.labels.severity == "critical") | .alert' "$PROMETHEUS_RULES_FILE")
    
    if [ -z "$critical_alerts" ]; then
        log_message "WARN" "No critical severity alerts found"
    fi
    
    # Verify alert notification channels (through annotations)
    local missing_runbooks=$(yq eval '.groups[].rules[] | select(.alert != null) | select(.annotations.runbook_url == null) | .alert' "$PROMETHEUS_RULES_FILE")
    
    if [ -n "$missing_runbooks" ]; then
        log_message "WARN" "Some alerts are missing runbook URLs: $missing_runbooks"
    fi
    
    log_message "INFO" "Alert thresholds validation passed successfully"
    return 0
}

# Function to validate dashboard metrics
validate_dashboard_metrics() {
    log_message "INFO" "Validating dashboard metrics in Grafana dashboards"
    
    # Check if file exists
    if [ ! -f "$GRAFANA_DASHBOARDS_FILE" ]; then
        log_message "ERROR" "Grafana dashboards file not found: $GRAFANA_DASHBOARDS_FILE"
        return 1
    fi
    
    # Check for jq command
    if ! command -v jq &> /dev/null; then
        log_message "ERROR" "jq command not found. Please install jq"
        return 1
    fi
    
    # Extract metrics used in dashboard panels
    local dashboard_metrics=$(jq -r '.dashboards[].panels[].targets[].expr | select(. != null)' "$GRAFANA_DASHBOARDS_FILE" | sort | uniq)
    
    if [ -z "$dashboard_metrics" ]; then
        log_message "ERROR" "No metrics found in dashboard panels"
        return 1
    fi
    
    # Verify metrics exist in Prometheus (if connectivity check not skipped)
    if [ "${SKIP_PROMETHEUS_CHECK}" != "true" ] && [ "${SKIP_CONNECTIVITY_CHECK}" != "true" ]; then
        # Check for curl command
        if ! command -v curl &> /dev/null; then
            log_message "ERROR" "curl command not found. Please install curl"
            return 1
        fi
        
        local missing_metrics=()
        
        for metric in $dashboard_metrics; do
            # Extract the metric name from the expression
            local metric_name=$(echo "$metric" | grep -o 'test_ims_[a-zA-Z_]*' | head -1)
            
            if [ -n "$metric_name" ]; then
                local query_response=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=count($metric_name)")
                
                if ! echo "$query_response" | jq -e '.status == "success"' > /dev/null; then
                    missing_metrics+=("$metric_name")
                fi
            fi
        done
        
        if [ ${#missing_metrics[@]} -gt 0 ]; then
            log_message "ERROR" "Some dashboard metrics are missing in Prometheus: ${missing_metrics[*]}"
            return 1
        fi
    fi
    
    # Check that panels use appropriate visualization types
    
    # Check time series data is using appropriate visualizations
    local timeseries_panels=$(jq -r '.dashboards[].panels[] | select(.targets[].expr | test("rate|[Oo]ver_time")) | select(.type != "timeseries" and .type != "graph" and .type != "heatmap") | .title' "$GRAFANA_DASHBOARDS_FILE")
    
    if [ -n "$timeseries_panels" ]; then
        log_message "WARN" "Some time series data is not using appropriate visualization types: $timeseries_panels"
    fi
    
    # Check that single stats are using appropriate visualizations
    local stat_panels=$(jq -r '.dashboards[].panels[] | select(.targets | length == 1) | select(.targets[].expr | test("^[^{]*$")) | select(.type != "stat" and .type != "gauge" and .type != "singlestat") | .title' "$GRAFANA_DASHBOARDS_FILE")
    
    if [ -n "$stat_panels" ]; then
        log_message "WARN" "Some single stat metrics are not using appropriate visualization types: $stat_panels"
    fi
    
    # Verify dashboard organization follows requirements
    # Check system overview dashboard
    local system_dashboard=$(jq -r '.dashboards[] | select(.title == "Test System Overview")' "$GRAFANA_DASHBOARDS_FILE")
    
    if [ -z "$system_dashboard" ]; then
        log_message "ERROR" "System overview dashboard not found"
        return 1
    fi
    
    local system_dashboard_panels=$(echo "$system_dashboard" | jq -r '.panels[].title')
    local required_system_panels=("System Status" "Resource Utilization" "SLA Compliance")
    local missing_system_panels=()
    
    for panel in "${required_system_panels[@]}"; do
        if ! echo "$system_dashboard_panels" | grep -qi "$panel"; then
            missing_system_panels+=("$panel")
        fi
    done
    
    if [ ${#missing_system_panels[@]} -gt 0 ]; then
        log_message "ERROR" "System overview dashboard is missing required panels: ${missing_system_panels[*]}"
        return 1
    fi
    
    # Check calculation performance dashboard
    local calc_dashboard=$(jq -r '.dashboards[] | select(.title == "Test Calculation Performance")' "$GRAFANA_DASHBOARDS_FILE")
    
    if [ -z "$calc_dashboard" ]; then
        log_message "ERROR" "Calculation performance dashboard not found"
        return 1
    fi
    
    local calc_dashboard_panels=$(echo "$calc_dashboard" | jq -r '.panels[].title')
    local required_calc_panels=("Calculation Latency" "Calculation Rate" "SLA Compliance")
    local missing_calc_panels=()
    
    for panel in "${required_calc_panels[@]}"; do
        if ! echo "$calc_dashboard_panels" | grep -qi "$panel"; then
            missing_calc_panels+=("$panel")
        fi
    done
    
    if [ ${#missing_calc_panels[@]} -gt 0 ]; then
        log_message "ERROR" "Calculation performance dashboard is missing required panels: ${missing_calc_panels[*]}"
        return 1
    fi
    
    log_message "INFO" "Dashboard metrics validation passed successfully"
    return 0
}

# Function to generate validation report
generate_validation_report() {
    local report_file="/tmp/monitoring-validation-report-$(date +%Y%m%d-%H%M%S).txt"
    
    log_message "INFO" "Generating validation report at $report_file"
    
    # Create report header
    cat << EOF > "$report_file"
======================================================
IMS Monitoring Infrastructure Validation Report
======================================================
Generated on: $(date)
Environment: ${ENVIRONMENT:-Test}

Summary:
EOF
    
    # Add summary based on exit code
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ All validation checks passed successfully" >> "$report_file"
    else
        echo "❌ Some validation checks failed (see details below)" >> "$report_file"
    fi
    
    # Add validation details
    cat << EOF >> "$report_file"

------------------------------------------------------
Validation Details:
------------------------------------------------------

1. Prometheus Rules Validation:
EOF
    
    if validate_prometheus_rules >/dev/null 2>&1; then
        echo "   ✅ Prometheus rules validation passed" >> "$report_file"
    else
        echo "   ❌ Prometheus rules validation failed" >> "$report_file"
        echo "      - Check log file for details: $LOG_FILE" >> "$report_file"
    fi
    
    cat << EOF >> "$report_file"

2. Grafana Dashboards Validation:
EOF
    
    if validate_grafana_dashboards >/dev/null 2>&1; then
        echo "   ✅ Grafana dashboards validation passed" >> "$report_file"
    else
        echo "   ❌ Grafana dashboards validation failed" >> "$report_file"
        echo "      - Check log file for details: $LOG_FILE" >> "$report_file"
    fi
    
    if [ "${SKIP_CONNECTIVITY_CHECK}" != "true" ]; then
        cat << EOF >> "$report_file"

3. Prometheus Connectivity Validation:
EOF
        
        if validate_prometheus_connectivity >/dev/null 2>&1; then
            echo "   ✅ Prometheus connectivity validation passed" >> "$report_file"
        else
            echo "   ❌ Prometheus connectivity validation failed" >> "$report_file"
            echo "      - Check log file for details: $LOG_FILE" >> "$report_file"
        fi
        
        cat << EOF >> "$report_file"

4. Grafana Connectivity Validation:
EOF
        
        if validate_grafana_connectivity >/dev/null 2>&1; then
            echo "   ✅ Grafana connectivity validation passed" >> "$report_file"
        else
            echo "   ❌ Grafana connectivity validation failed" >> "$report_file"
            echo "      - Check log file for details: $LOG_FILE" >> "$report_file"
        fi
    fi
    
    if [ "${SKIP_METRICS_CHECK}" != "true" ] && [ "${SKIP_CONNECTIVITY_CHECK}" != "true" ]; then
        cat << EOF >> "$report_file"

5. Metrics Coverage Validation:
EOF
        
        if validate_metrics_coverage >/dev/null 2>&1; then
            echo "   ✅ Metrics coverage validation passed" >> "$report_file"
        else
            echo "   ❌ Metrics coverage validation failed" >> "$report_file"
            echo "      - Check log file for details: $LOG_FILE" >> "$report_file"
        fi
    fi
    
    if [ "${SKIP_ALERT_CHECK}" != "true" ]; then
        cat << EOF >> "$report_file"

6. Alert Thresholds Validation:
EOF
        
        if validate_alert_thresholds >/dev/null 2>&1; then
            echo "   ✅ Alert thresholds validation passed" >> "$report_file"
        else
            echo "   ❌ Alert thresholds validation failed" >> "$report_file"
            echo "      - Check log file for details: $LOG_FILE" >> "$report_file"
        fi
    fi
    
    if [ "${SKIP_DASHBOARD_CHECK}" != "true" ]; then
        cat << EOF >> "$report_file"

7. Dashboard Metrics Validation:
EOF
        
        if validate_dashboard_metrics >/dev/null 2>&1; then
            echo "   ✅ Dashboard metrics validation passed" >> "$report_file"
        else
            echo "   ❌ Dashboard metrics validation failed" >> "$report_file"
            echo "      - Check log file for details: $LOG_FILE" >> "$report_file"
        fi
    fi
    
    # Add recommendations if any checks failed
    if [ $EXIT_CODE -ne 0 ]; then
        cat << EOF >> "$report_file"

------------------------------------------------------
Recommendations:
------------------------------------------------------

1. Review the detailed log file at: $LOG_FILE
2. Fix any validation issues highlighted above
3. Ensure all SLA thresholds match the technical specification requirements:
   - Event processing latency: 200ms
   - Short sell validation time: 150ms
   - UI dashboard load time: 3s
4. Run this validation script again to verify fixes
EOF
    fi
    
    # Add configuration details
    cat << EOF >> "$report_file"

------------------------------------------------------
Configuration Details:
------------------------------------------------------

Prometheus Rules File: $PROMETHEUS_RULES_FILE
Grafana Dashboards File: $GRAFANA_DASHBOARDS_FILE
Prometheus URL: $PROMETHEUS_URL
Grafana URL: $GRAFANA_URL
EOF
    
    log_message "INFO" "Validation report generated: $report_file"
    echo "$report_file"
}

# Main function
main() {
    # Initialize script
    echo > "$LOG_FILE"
    log_message "INFO" "Starting monitoring infrastructure validation"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-connectivity)
                SKIP_CONNECTIVITY_CHECK=true
                ;;
            --skip-metrics)
                SKIP_METRICS_CHECK=true
                ;;
            --skip-alerts)
                SKIP_ALERT_CHECK=true
                ;;
            --skip-dashboards)
                SKIP_DASHBOARD_CHECK=true
                ;;
            --prometheus-url)
                PROMETHEUS_URL=$2
                shift
                ;;
            --grafana-url)
                GRAFANA_URL=$2
                shift
                ;;
            --prometheus-rules)
                PROMETHEUS_RULES_FILE=$2
                shift
                ;;
            --grafana-dashboards)
                GRAFANA_DASHBOARDS_FILE=$2
                shift
                ;;
            --environment)
                ENVIRONMENT=$2
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-connectivity      Skip connectivity checks to Prometheus and Grafana"
                echo "  --skip-metrics           Skip metrics coverage validation"
                echo "  --skip-alerts            Skip alert thresholds validation"
                echo "  --skip-dashboards        Skip dashboard metrics validation"
                echo "  --prometheus-url URL     Set Prometheus URL (default: http://localhost:9090)"
                echo "  --grafana-url URL        Set Grafana URL (default: http://localhost:3000)"
                echo "  --prometheus-rules FILE  Set path to Prometheus rules file"
                echo "  --grafana-dashboards FILE Set path to Grafana dashboards file"
                echo "  --environment ENV        Set environment name (default: Test)"
                echo "  --help                   Show this help message"
                exit 0
                ;;
            *)
                log_message "ERROR" "Unknown option: $1"
                exit 1
                ;;
        esac
        shift
    done
    
    # Validate Prometheus rules
    if ! validate_prometheus_rules; then
        log_message "ERROR" "Prometheus rules validation failed"
        EXIT_CODE=1
    fi
    
    # Validate Grafana dashboards
    if ! validate_grafana_dashboards; then
        log_message "ERROR" "Grafana dashboards validation failed"
        EXIT_CODE=1
    fi
    
    # Check connectivity if not skipped
    if [ "${SKIP_CONNECTIVITY_CHECK}" != "true" ]; then
        # Validate Prometheus connectivity
        if ! validate_prometheus_connectivity; then
            log_message "ERROR" "Prometheus connectivity validation failed"
            EXIT_CODE=1
        fi
        
        # Validate Grafana connectivity
        if ! validate_grafana_connectivity; then
            log_message "ERROR" "Grafana connectivity validation failed"
            EXIT_CODE=1
        fi
    else
        log_message "INFO" "Skipping connectivity checks"
    fi
    
    # Check metrics if not skipped
    if [ "${SKIP_METRICS_CHECK}" != "true" ] && [ "${SKIP_CONNECTIVITY_CHECK}" != "true" ]; then
        # Validate metrics coverage
        if ! validate_metrics_coverage; then
            log_message "ERROR" "Metrics coverage validation failed"
            EXIT_CODE=1
        fi
    else
        log_message "INFO" "Skipping metrics coverage validation"
    fi
    
    # Check alert thresholds if not skipped
    if [ "${SKIP_ALERT_CHECK}" != "true" ]; then
        # Validate alert thresholds
        if ! validate_alert_thresholds; then
            log_message "ERROR" "Alert thresholds validation failed"
            EXIT_CODE=1
        fi
    else
        log_message "INFO" "Skipping alert thresholds validation"
    fi
    
    # Check dashboard metrics if not skipped
    if [ "${SKIP_DASHBOARD_CHECK}" != "true" ]; then
        # Validate dashboard metrics
        if ! validate_dashboard_metrics; then
            log_message "ERROR" "Dashboard metrics validation failed"
            EXIT_CODE=1
        fi
    else
        log_message "INFO" "Skipping dashboard metrics validation"
    fi
    
    # Generate validation report
    local report_file=$(generate_validation_report)
    
    # Output final status
    if [ $EXIT_CODE -eq 0 ]; then
        log_message "INFO" "All validation checks passed successfully"
        log_message "INFO" "Report generated: $report_file"
    else
        log_message "ERROR" "Some validation checks failed"
        log_message "ERROR" "See report for details: $report_file"
    fi
    
    return $EXIT_CODE
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
    exit $EXIT_CODE
fi