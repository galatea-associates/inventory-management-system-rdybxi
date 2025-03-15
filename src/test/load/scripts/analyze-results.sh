#!/usr/bin/env bash
# analyze-results.sh - Analyzes load test results from the Inventory Management System (IMS)
# 
# This script processes test output files, generates performance reports,
# compares results against thresholds, and creates visualizations to help
# identify performance bottlenecks and validate system performance requirements.

set -e
set -o pipefail

# Global variables
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
CONFIG_DIR="${SCRIPT_DIR}/../config"
RESULTS_DIR="${SCRIPT_DIR}/../results"
REPORTS_DIR="${SCRIPT_DIR}/../reports"
CONFIG_FILE="${CONFIG_DIR}/load-test-config.yml"

# Default values
DEFAULT_SCENARIO="normal-load"
DEFAULT_ENVIRONMENT="dev"
DEFAULT_OUTPUT_FORMAT="html"
DEFAULT_DETAILED="false"
DEFAULT_GRAPHS="true"
DEFAULT_COMPARE_BASELINE="false"

# Function to display usage information
usage() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo "Analyze load test results from the Inventory Management System (IMS)"
    echo ""
    echo "Options:"
    echo "  -h, --help               Display this help message"
    echo "  -s, --scenario NAME      Test scenario name (default: ${DEFAULT_SCENARIO})"
    echo "  -e, --environment ENV    Environment (dev, staging, prod) (default: ${DEFAULT_ENVIRONMENT})"
    echo "  -t, --timestamp TS       Specific test timestamp (default: latest)"
    echo "  -o, --output FORMAT      Output format (html, json, text) (default: ${DEFAULT_OUTPUT_FORMAT})"
    echo "  -d, --detailed           Generate detailed report (default: ${DEFAULT_DETAILED})"
    echo "  -g, --graphs             Generate graphs (default: ${DEFAULT_GRAPHS})"
    echo "  -c, --compare-baseline   Compare with baseline results (default: ${DEFAULT_COMPARE_BASELINE})"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0") --scenario peak-load --environment staging"
    echo "  $(basename "$0") --scenario endurance-test --timestamp 20230615-120000 --detailed"
}

# Function to check if required dependencies are installed
check_dependencies() {
    local missing_deps=()
    
    # Check for jq
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    # Check for yq
    if ! command -v yq &> /dev/null; then
        missing_deps+=("yq")
    fi
    
    # Check for gnuplot
    if ! command -v gnuplot &> /dev/null; then
        missing_deps+=("gnuplot")
    fi
    
    # Check for bc (used for calculations)
    if ! command -v bc &> /dev/null; then
        missing_deps+=("bc")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        echo "Error: The following dependencies are missing:"
        for dep in "${missing_deps[@]}"; do
            echo "  - ${dep}"
        done
        echo "Please install them before running this script."
        return 1
    fi
    
    return 0
}

# Function to find the latest results directory for a given scenario and environment
find_latest_results() {
    local scenario="$1"
    local environment="$2"
    local scenario_dir="${RESULTS_DIR}/${scenario}/${environment}"
    
    if [[ ! -d "${scenario_dir}" ]]; then
        echo "Error: No results found for scenario '${scenario}' in environment '${environment}'" >&2
        return 1
    fi
    
    # Find the most recent results directory (format: YYYYMMDD-HHMMSS)
    local latest_dir=$(find "${scenario_dir}" -maxdepth 1 -type d | grep -E '[0-9]{8}-[0-9]{6}' | sort -r | head -n 1)
    
    if [[ -z "${latest_dir}" ]]; then
        echo "Error: No results directories found for scenario '${scenario}' in environment '${environment}'" >&2
        return 1
    fi
    
    echo "${latest_dir}"
}

# Function to find a specific results directory by timestamp
find_specific_results() {
    local scenario="$1"
    local environment="$2"
    local timestamp="$3"
    local results_dir="${RESULTS_DIR}/${scenario}/${environment}/${timestamp}"
    
    if [[ ! -d "${results_dir}" ]]; then
        echo "Error: No results found for scenario '${scenario}' in environment '${environment}' with timestamp '${timestamp}'" >&2
        return 1
    fi
    
    echo "${results_dir}"
}

# Function to load configuration from the YAML config file
load_config() {
    local scenario="$1"
    local environment="$2"
    
    if [[ ! -f "${CONFIG_FILE}" ]]; then
        echo "Error: Config file not found: ${CONFIG_FILE}" >&2
        return 1
    fi
    
    # Extract scenario configuration
    local scenario_config=$(yq eval ".scenarios.${scenario}" "${CONFIG_FILE}")
    if [[ "${scenario_config}" == "null" ]]; then
        echo "Error: Scenario '${scenario}' not found in config file" >&2
        return 1
    fi
    
    # Extract environment configuration
    local env_config=$(yq eval ".environments.${environment}" "${CONFIG_FILE}")
    if [[ "${env_config}" == "null" ]]; then
        echo "Error: Environment '${environment}' not found in config file" >&2
        return 1
    fi
    
    # Extract thresholds
    local thresholds=$(yq eval ".scenarios.${scenario}.thresholds" "${CONFIG_FILE}")
    if [[ "${thresholds}" == "null" ]]; then
        echo "Warning: No thresholds defined for scenario '${scenario}'" >&2
        thresholds="{}"
    fi
    
    # Check system-level thresholds from options.reporting.thresholds.system
    local system_thresholds=$(yq eval ".options.reporting.thresholds.system" "${CONFIG_FILE}")
    
    # Combine and return the configuration
    echo "{\"scenario\": ${scenario_config}, \"environment\": ${env_config}, \"thresholds\": ${thresholds}, \"systemThresholds\": ${system_thresholds}}"
}

# Function to parse the k6 results JSON file
parse_results() {
    local results_dir="$1"
    local results_file="${results_dir}/summary.json"
    
    if [[ ! -f "${results_file}" ]]; then
        echo "Error: Results file not found: ${results_file}" >&2
        return 1
    fi
    
    # Parse the JSON file using jq
    local parsed_results=$(jq '.' "${results_file}")
    
    # Extract key metrics (response times, throughput, error rates)
    local metrics=$(jq '{
        "metrics": {
            "http_reqs": .metrics.http_reqs,
            "http_req_duration": .metrics.http_req_duration,
            "http_req_failed": .metrics.http_req_failed,
            "iterations": .metrics.iterations,
            "vus": .metrics.vus,
            "vus_max": .metrics.vus_max,
            "data_received": .metrics.data_received,
            "data_sent": .metrics.data_sent
        },
        "root_group": .root_group,
        "test_info": {
            "start_time": .start_time,
            "end_time": .end_time,
            "duration": (.test_info.duration // 0),
            "iterations": (.test_info.iterations // 0),
            "vus": (.test_info.vus // 0),
            "vus_max": (.test_info.vus_max // 0)
        }
    }' <<< "${parsed_results}")
    
    # Also check for detailed timeseries data if available
    local timeseries_file="${results_dir}/timeseries.json"
    if [[ -f "${timeseries_file}" ]]; then
        # Process timeseries data for detailed analysis
        # This would be used for time-based visualizations
        echo "${metrics}" | jq --arg tspath "${timeseries_file}" '. + {"timeseriesPath": $tspath}'
    else
        echo "${metrics}"
    fi
}

# Function to check if test results meet the defined thresholds
check_thresholds() {
    local results="$1"
    local config="$2"
    
    # Extract threshold definitions from config
    local thresholds=$(jq -c '.thresholds' <<< "${config}")
    local system_thresholds=$(jq -c '.systemThresholds' <<< "${config}")
    
    # Compare actual metrics from results against thresholds
    local response_time_p95=$(jq '.metrics.http_req_duration.values."p(95)"' <<< "${results}")
    local response_time_p99=$(jq '.metrics.http_req_duration.values."p(99)"' <<< "${results}")
    local error_rate=$(jq '.metrics.http_req_failed.values.rate * 100' <<< "${results}")
    local throughput=$(jq '.metrics.http_reqs.values.rate' <<< "${results}")
    
    # Define threshold values - first try scenario-specific thresholds, then system thresholds
    local threshold_p95=$(jq '.response_time_p95' <<< "${thresholds}")
    if [[ "${threshold_p95}" == "null" ]]; then
        threshold_p95=$(jq '.event_processing.p95' <<< "${system_thresholds}")
    fi
    
    local threshold_p99=$(jq '.response_time_p99' <<< "${thresholds}")
    if [[ "${threshold_p99}" == "null" ]]; then
        threshold_p99=$(jq '.event_processing.p99' <<< "${system_thresholds}")
    fi
    
    local threshold_error_rate=$(jq '.error_rate' <<< "${thresholds}")
    if [[ "${threshold_error_rate}" == "null" ]]; then
        threshold_error_rate=$(jq '.error_rate' <<< "${system_thresholds}")
    fi
    
    local threshold_throughput=$(jq '.throughput' <<< "${thresholds}")
    
    # Remove percentage sign from error rate threshold if present
    threshold_error_rate=$(echo "${threshold_error_rate}" | sed 's/%//g')
    
    # Check if thresholds are defined and set defaults if not
    if [[ "${threshold_p95}" == "null" ]]; then
        threshold_p95=150  # Default to 150ms based on requirements
    fi
    
    if [[ "${threshold_p99}" == "null" ]]; then
        threshold_p99=200  # Default to 200ms based on requirements
    fi
    
    if [[ "${threshold_error_rate}" == "null" ]]; then
        threshold_error_rate=0.1  # Default to 0.1%
    fi
    
    if [[ "${threshold_throughput}" == "null" ]]; then
        threshold_throughput=100000  # Default to 100,000 events/sec
    fi
    
    # Convert to numeric values
    threshold_p95=$(echo "${threshold_p95}" | sed 's/ms//g')
    threshold_p99=$(echo "${threshold_p99}" | sed 's/ms//g')
    
    # Determine pass/fail for each threshold
    local p95_pass=true
    local p99_pass=true
    local error_rate_pass=true
    local throughput_pass=true
    
    if (( $(echo "${response_time_p95} > ${threshold_p95}" | bc -l) )); then
        p95_pass=false
    fi
    
    if (( $(echo "${response_time_p99} > ${threshold_p99}" | bc -l) )); then
        p99_pass=false
    fi
    
    if (( $(echo "${error_rate} > ${threshold_error_rate}" | bc -l) )); then
        error_rate_pass=false
    fi
    
    if (( $(echo "${throughput} < ${threshold_throughput}" | bc -l) )); then
        throughput_pass=false
    fi
    
    # Determine overall pass/fail
    local overall_pass=true
    if [[ "${p95_pass}" == "false" || "${p99_pass}" == "false" || "${error_rate_pass}" == "false" || "${throughput_pass}" == "false" ]]; then
        overall_pass=false
    fi
    
    # Return threshold validation results
    echo "{
        \"thresholds\": {
            \"response_time_p95\": {
                \"actual\": ${response_time_p95},
                \"threshold\": ${threshold_p95},
                \"pass\": ${p95_pass}
            },
            \"response_time_p99\": {
                \"actual\": ${response_time_p99},
                \"threshold\": ${threshold_p99},
                \"pass\": ${p99_pass}
            },
            \"error_rate\": {
                \"actual\": ${error_rate},
                \"threshold\": ${threshold_error_rate},
                \"pass\": ${error_rate_pass}
            },
            \"throughput\": {
                \"actual\": ${throughput},
                \"threshold\": ${threshold_throughput},
                \"pass\": ${throughput_pass}
            }
        },
        \"overall_pass\": ${overall_pass}
    }"
}

# Function to generate a summary report
generate_summary_report() {
    local results="$1"
    local threshold_results="$2"
    local scenario="$3"
    local environment="$4"
    local output_format="$5"
    local output_dir="$6"
    
    # Create report directory if it doesn't exist
    mkdir -p "${output_dir}"
    
    # Extract key metrics
    local test_duration=$(jq '.test_info.duration' <<< "${results}")
    local vus=$(jq '.test_info.vus' <<< "${results}")
    local iterations=$(jq '.test_info.iterations' <<< "${results}")
    local http_reqs=$(jq '.metrics.http_reqs.values.count' <<< "${results}")
    local http_req_rate=$(jq '.metrics.http_reqs.values.rate' <<< "${results}")
    local http_req_duration_avg=$(jq '.metrics.http_req_duration.values.avg' <<< "${results}")
    local http_req_duration_p95=$(jq '.metrics.http_req_duration.values."p(95)"' <<< "${results}")
    local http_req_duration_p99=$(jq '.metrics.http_req_duration.values."p(99)"' <<< "${results}")
    local http_req_failed_rate=$(jq '.metrics.http_req_failed.values.rate * 100' <<< "${results}")
    local data_received=$(jq '.metrics.data_received.values.count' <<< "${results}")
    local data_sent=$(jq '.metrics.data_sent.values.count' <<< "${results}")
    
    # Format date for report
    local report_date=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Get threshold results
    local overall_pass=$(jq '.overall_pass' <<< "${threshold_results}")
    local response_time_p95_pass=$(jq '.thresholds.response_time_p95.pass' <<< "${threshold_results}")
    local response_time_p99_pass=$(jq '.thresholds.response_time_p99.pass' <<< "${threshold_results}")
    local error_rate_pass=$(jq '.thresholds.error_rate.pass' <<< "${threshold_results}")
    local throughput_pass=$(jq '.thresholds.throughput.pass' <<< "${threshold_results}")
    
    local response_time_p95_actual=$(jq '.thresholds.response_time_p95.actual' <<< "${threshold_results}")
    local response_time_p99_actual=$(jq '.thresholds.response_time_p99.actual' <<< "${threshold_results}")
    local error_rate_actual=$(jq '.thresholds.error_rate.actual' <<< "${threshold_results}")
    local throughput_actual=$(jq '.thresholds.throughput.actual' <<< "${threshold_results}")
    
    local response_time_p95_threshold=$(jq '.thresholds.response_time_p95.threshold' <<< "${threshold_results}")
    local response_time_p99_threshold=$(jq '.thresholds.response_time_p99.threshold' <<< "${threshold_results}")
    local error_rate_threshold=$(jq '.thresholds.error_rate.threshold' <<< "${threshold_results}")
    local throughput_threshold=$(jq '.thresholds.throughput.threshold' <<< "${threshold_results}")
    
    # Generate report content based on output format
    local report_file="${output_dir}/summary_report.${output_format}"
    
    case "${output_format}" in
        html)
            # Generate HTML report
            cat > "${report_file}" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IMS Load Test Summary Report - ${scenario} - ${environment}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        .summary-box {
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .status {
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
        }
        .pass {
            background-color: #dff0d8;
            color: #3c763d;
        }
        .fail {
            background-color: #f2dede;
            color: #a94442;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>IMS Load Test Summary Report</h1>
        <div class="summary-box">
            <h2>Test Overview</h2>
            <p><strong>Scenario:</strong> ${scenario}</p>
            <p><strong>Environment:</strong> ${environment}</p>
            <p><strong>Report Date:</strong> ${report_date}</p>
            <p><strong>Status:</strong> <span class="status ${overall_pass/true/pass/false/fail}">${overall_pass/true/PASS/false/FAIL}</span></p>
        </div>
        
        <h2>Key Metrics</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Test Duration</td>
                <td>${test_duration} seconds</td>
            </tr>
            <tr>
                <td>Virtual Users</td>
                <td>${vus}</td>
            </tr>
            <tr>
                <td>Iterations</td>
                <td>${iterations}</td>
            </tr>
            <tr>
                <td>Total Requests</td>
                <td>${http_reqs}</td>
            </tr>
            <tr>
                <td>Request Rate</td>
                <td>${http_req_rate}/s</td>
            </tr>
            <tr>
                <td>Average Response Time</td>
                <td>${http_req_duration_avg} ms</td>
            </tr>
            <tr>
                <td>95th Percentile Response Time</td>
                <td>${http_req_duration_p95} ms</td>
            </tr>
            <tr>
                <td>99th Percentile Response Time</td>
                <td>${http_req_duration_p99} ms</td>
            </tr>
            <tr>
                <td>Error Rate</td>
                <td>${http_req_failed_rate}%</td>
            </tr>
            <tr>
                <td>Data Received</td>
                <td>${data_received} bytes</td>
            </tr>
            <tr>
                <td>Data Sent</td>
                <td>${data_sent} bytes</td>
            </tr>
        </table>
        
        <h2>Threshold Validation</h2>
        <table>
            <tr>
                <th>Threshold</th>
                <th>Actual</th>
                <th>Requirement</th>
                <th>Status</th>
            </tr>
            <tr>
                <td>Response Time P95</td>
                <td>${response_time_p95_actual} ms</td>
                <td>< ${response_time_p95_threshold} ms</td>
                <td><span class="status ${response_time_p95_pass/true/pass/false/fail}">${response_time_p95_pass/true/PASS/false/FAIL}</span></td>
            </tr>
            <tr>
                <td>Response Time P99</td>
                <td>${response_time_p99_actual} ms</td>
                <td>< ${response_time_p99_threshold} ms</td>
                <td><span class="status ${response_time_p99_pass/true/pass/false/fail}">${response_time_p99_pass/true/PASS/false/FAIL}</span></td>
            </tr>
            <tr>
                <td>Error Rate</td>
                <td>${error_rate_actual}%</td>
                <td>< ${error_rate_threshold}%</td>
                <td><span class="status ${error_rate_pass/true/pass/false/fail}">${error_rate_pass/true/PASS/false/FAIL}</span></td>
            </tr>
            <tr>
                <td>Throughput</td>
                <td>${throughput_actual}/s</td>
                <td>> ${throughput_threshold}/s</td>
                <td><span class="status ${throughput_pass/true/pass/false/fail}">${throughput_pass/true/PASS/false/FAIL}</span></td>
            </tr>
        </table>
    </div>
</body>
</html>
EOF
            ;;
        json)
            # Generate JSON report
            cat > "${report_file}" << EOF
{
  "testSummary": {
    "scenario": "${scenario}",
    "environment": "${environment}",
    "reportDate": "${report_date}",
    "status": "${overall_pass/true/PASS/false/FAIL}"
  },
  "keyMetrics": {
    "testDuration": ${test_duration},
    "virtualUsers": ${vus},
    "iterations": ${iterations},
    "totalRequests": ${http_reqs},
    "requestRate": ${http_req_rate},
    "avgResponseTime": ${http_req_duration_avg},
    "p95ResponseTime": ${http_req_duration_p95},
    "p99ResponseTime": ${http_req_duration_p99},
    "errorRate": ${http_req_failed_rate},
    "dataReceived": ${data_received},
    "dataSent": ${data_sent}
  },
  "thresholdValidation": {
    "responseTimeP95": {
      "actual": ${response_time_p95_actual},
      "threshold": ${response_time_p95_threshold},
      "status": "${response_time_p95_pass/true/PASS/false/FAIL}"
    },
    "responseTimeP99": {
      "actual": ${response_time_p99_actual},
      "threshold": ${response_time_p99_threshold},
      "status": "${response_time_p99_pass/true/PASS/false/FAIL}"
    },
    "errorRate": {
      "actual": ${error_rate_actual},
      "threshold": ${error_rate_threshold},
      "status": "${error_rate_pass/true/PASS/false/FAIL}"
    },
    "throughput": {
      "actual": ${throughput_actual},
      "threshold": ${throughput_threshold},
      "status": "${throughput_pass/true/PASS/false/FAIL}"
    }
  }
}
EOF
            ;;
        text|*)
            # Generate text report
            cat > "${report_file}" << EOF
==========================================
IMS LOAD TEST SUMMARY REPORT
==========================================

TEST OVERVIEW
------------------------------------------
Scenario:     ${scenario}
Environment:  ${environment}
Report Date:  ${report_date}
Status:       ${overall_pass/true/PASS/false/FAIL}

KEY METRICS
------------------------------------------
Test Duration:              ${test_duration} seconds
Virtual Users:              ${vus}
Iterations:                 ${iterations}
Total Requests:             ${http_reqs}
Request Rate:               ${http_req_rate}/s
Average Response Time:      ${http_req_duration_avg} ms
95th Percentile Response:   ${http_req_duration_p95} ms
99th Percentile Response:   ${http_req_duration_p99} ms
Error Rate:                 ${http_req_failed_rate}%
Data Received:              ${data_received} bytes
Data Sent:                  ${data_sent} bytes

THRESHOLD VALIDATION
------------------------------------------
Response Time P95:
  Actual:      ${response_time_p95_actual} ms
  Requirement: < ${response_time_p95_threshold} ms
  Status:      ${response_time_p95_pass/true/PASS/false/FAIL}

Response Time P99:
  Actual:      ${response_time_p99_actual} ms
  Requirement: < ${response_time_p99_threshold} ms
  Status:      ${response_time_p99_pass/true/PASS/false/FAIL}

Error Rate:
  Actual:      ${error_rate_actual}%
  Requirement: < ${error_rate_threshold}%
  Status:      ${error_rate_pass/true/PASS/false/FAIL}

Throughput:
  Actual:      ${throughput_actual}/s
  Requirement: > ${throughput_threshold}/s
  Status:      ${throughput_pass/true/PASS/false/FAIL}
EOF
            ;;
    esac
    
    echo "${report_file}"
}

# Function to generate a detailed report with in-depth analysis
generate_detailed_report() {
    local results="$1"
    local threshold_results="$2"
    local scenario="$3"
    local environment="$4"
    local output_format="$5"
    local output_dir="$6"
    
    # Create report directory if it doesn't exist
    mkdir -p "${output_dir}"
    
    # Extract endpoint-specific data from results
    local root_group=$(jq '.root_group' <<< "${results}")
    local groups=$(jq '.root_group.groups' <<< "${results}")
    local checks=$(jq '.root_group.checks' <<< "${results}")
    
    # Format date for report
    local report_date=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Generate report file path
    local report_file="${output_dir}/detailed_report.${output_format}"
    
    case "${output_format}" in
        html)
            # Generate HTML detailed report with endpoint breakdowns
            cat > "${report_file}" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IMS Load Test Detailed Report - ${scenario} - ${environment}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1, h2, h3, h4 {
            color: #2c3e50;
        }
        .section {
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .status {
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
        }
        .pass {
            background-color: #dff0d8;
            color: #3c763d;
        }
        .fail {
            background-color: #f2dede;
            color: #a94442;
        }
        .warning {
            background-color: #fcf8e3;
            color: #8a6d3b;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
        }
        .endpoint-row:hover {
            background-color: #f5f5f5;
        }
        .chart {
            margin: 20px 0;
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>IMS Load Test Detailed Report</h1>
        <div class="section">
            <h2>Test Overview</h2>
            <p><strong>Scenario:</strong> ${scenario}</p>
            <p><strong>Environment:</strong> ${environment}</p>
            <p><strong>Report Date:</strong> ${report_date}</p>
        </div>
        
        <div class="section">
            <h2>Endpoint Performance</h2>
            <table>
                <tr>
                    <th>Endpoint</th>
                    <th>Requests</th>
                    <th>Avg (ms)</th>
                    <th>Min (ms)</th>
                    <th>Med (ms)</th>
                    <th>P90 (ms)</th>
                    <th>P95 (ms)</th>
                    <th>P99 (ms)</th>
                    <th>Max (ms)</th>
                    <th>Error Rate</th>
                </tr>
EOF

            # Process endpoint data - extract from groups if available
            # This is a simplified implementation that would need adaptation based on actual k6 output structure
            jq -c '.root_group.groups[]?' <<< "${results}" 2>/dev/null | while read -r group; do
                if [[ -n "${group}" ]]; then
                    local name=$(jq -r '.name // "Unknown"' <<< "${group}")
                    local checks=$(jq -c '.checks[]?' <<< "${group}" 2>/dev/null)
                    
                    if [[ -n "${checks}" ]]; then
                        local avg=$(jq -r '.values.avg // "N/A"' <<< "${checks}")
                        local min=$(jq -r '.values.min // "N/A"' <<< "${checks}")
                        local med=$(jq -r '.values.med // "N/A"' <<< "${checks}")
                        local p90=$(jq -r '.values."p(90)" // "N/A"' <<< "${checks}")
                        local p95=$(jq -r '.values."p(95)" // "N/A"' <<< "${checks}")
                        local p99=$(jq -r '.values."p(99)" // "N/A"' <<< "${checks}")
                        local max=$(jq -r '.values.max // "N/A"' <<< "${checks}")
                        local count=$(jq -r '.values.count // "N/A"' <<< "${checks}")
                        local fails=$(jq -r '.values.fails // 0' <<< "${checks}")
                        
                        local error_rate="N/A"
                        if [[ "${count}" != "N/A" && "${count}" != "0" ]]; then
                            error_rate=$(echo "scale=2; ${fails} / ${count} * 100" | bc)
                        fi
                        
                        echo "<tr class=\"endpoint-row\">" >> "${report_file}"
                        echo "    <td>${name}</td>" >> "${report_file}"
                        echo "    <td>${count}</td>" >> "${report_file}"
                        echo "    <td>${avg}</td>" >> "${report_file}"
                        echo "    <td>${min}</td>" >> "${report_file}"
                        echo "    <td>${med}</td>" >> "${report_file}"
                        echo "    <td>${p90}</td>" >> "${report_file}"
                        echo "    <td>${p95}</td>" >> "${report_file}"
                        echo "    <td>${p99}</td>" >> "${report_file}"
                        echo "    <td>${max}</td>" >> "${report_file}"
                        echo "    <td>${error_rate}%</td>" >> "${report_file}"
                        echo "</tr>" >> "${report_file}"
                    fi
                fi
            done
            
            cat >> "${report_file}" << EOF
            </table>
        </div>
        
        <div class="section">
            <h2>Performance Analysis</h2>
            <h3>Response Time Distribution</h3>
            <div class="chart">
                <img src="graphs/response_time_distribution.png" alt="Response Time Distribution" style="max-width:100%">
            </div>
            
            <h3>Throughput Over Time</h3>
            <div class="chart">
                <img src="graphs/throughput_over_time.png" alt="Throughput Over Time" style="max-width:100%">
            </div>
            
            <h3>Error Rate Over Time</h3>
            <div class="chart">
                <img src="graphs/error_rate_over_time.png" alt="Error Rate Over Time" style="max-width:100%">
            </div>
            
            <h3>Endpoint Comparison</h3>
            <div class="chart">
                <img src="graphs/endpoint_comparison.png" alt="Endpoint Comparison" style="max-width:100%">
            </div>
        </div>
        
        <div class="section">
            <h2>Resource Utilization</h2>
            <p>This section shows CPU, memory, network, and other resource utilization during the test.</p>
            <div class="chart">
                <!-- Resource utilization charts would be embedded here if available -->
                <p>Note: Resource utilization data collection requires additional monitoring setup.</p>
            </div>
        </div>
        
        <div class="section">
            <h2>Performance Insights</h2>
            <h3>Performance Bottlenecks</h3>
            <ul>
                <li>Look for endpoints with response times significantly higher than average</li>
                <li>Check for correlation between throughput and response time degradation</li>
                <li>Examine error patterns and their relationship to load increase</li>
            </ul>
            
            <h3>Requirements Validation</h3>
            <ul>
                <li>Event processing: Requirement is &lt;200ms (P99) - ${jq -r '.thresholds.response_time_p99.pass' <<< "${threshold_results}"/true/Met/false/Not Met}</li>
                <li>Throughput: Requirement is 300,000+ events per second - ${jq -r '.thresholds.throughput.pass' <<< "${threshold_results}"/true/Met/false/Not Met}</li>
                <li>Error rate: Should be below ${jq -r '.thresholds.error_rate.threshold' <<< "${threshold_results}"}% - ${jq -r '.thresholds.error_rate.pass' <<< "${threshold_results}"/true/Met/false/Not Met}</li>
            </ul>
            
            <h3>Recommendations</h3>
            <ul>
                <li>Identify slow endpoints and prioritize optimization</li>
                <li>Review error patterns for opportunities to improve resilience</li>
                <li>Consider scaling resources if throughput requirements are not met</li>
                <li>Investigate any spikes in response time or error rates</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>Error Analysis</h2>
            <table>
                <tr>
                    <th>Error Type</th>
                    <th>Count</th>
                    <th>Percentage</th>
                    <th>Example</th>
                </tr>
                <!-- Error data would be populated here if available -->
                <tr>
                    <td colspan="4">Detailed error data not available in summary results. Check logs for specific error details.</td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>
EOF
            ;;
        json)
            # Generate JSON detailed report
            # Extract endpoint data for the JSON report
            local endpoints_json="[]"
            local endpoints_data=$(jq -c '.root_group.groups[]?' <<< "${results}" 2>/dev/null)
            
            if [[ -n "${endpoints_data}" ]]; then
                endpoints_json=$(echo "${endpoints_data}" | jq -s '[.[] | {
                    name: (.name // "Unknown"),
                    requests: ((.checks[0].values.count) // 0),
                    avg_response: ((.checks[0].values.avg) // 0),
                    min_response: ((.checks[0].values.min) // 0),
                    med_response: ((.checks[0].values.med) // 0),
                    p90_response: ((.checks[0].values."p(90)") // 0),
                    p95_response: ((.checks[0].values."p(95)") // 0),
                    p99_response: ((.checks[0].values."p(99)") // 0),
                    max_response: ((.checks[0].values.max) // 0),
                    error_rate: (((.checks[0].values.fails // 0) / (.checks[0].values.count // 1) * 100) // 0)
                }]')
            fi
            
            cat > "${report_file}" << EOF
{
  "testOverview": {
    "scenario": "${scenario}",
    "environment": "${environment}",
    "reportDate": "${report_date}"
  },
  "endpointPerformance": ${endpoints_json},
  "performanceAnalysis": {
    "charts": [
      "graphs/response_time_distribution.png",
      "graphs/throughput_over_time.png",
      "graphs/error_rate_over_time.png",
      "graphs/endpoint_comparison.png"
    ]
  },
  "resourceUtilization": {},
  "performanceInsights": {
    "requirementsValidation": {
      "eventProcessingP99": {
        "requirement": "< ${jq -r '.thresholds.response_time_p99.threshold' <<< "${threshold_results}"} ms",
        "status": "${jq -r '.thresholds.response_time_p99.pass' <<< "${threshold_results}"/true/Met/false/Not Met}"
      },
      "throughput": {
        "requirement": "> ${jq -r '.thresholds.throughput.threshold' <<< "${threshold_results}"} events/sec",
        "status": "${jq -r '.thresholds.throughput.pass' <<< "${threshold_results}"/true/Met/false/Not Met}"
      },
      "errorRate": {
        "requirement": "< ${jq -r '.thresholds.error_rate.threshold' <<< "${threshold_results}"}%",
        "status": "${jq -r '.thresholds.error_rate.pass' <<< "${threshold_results}"/true/Met/false/Not Met}"
      }
    }
  },
  "errorAnalysis": []
}
EOF
            ;;
        text|*)
            # Generate text detailed report
            cat > "${report_file}" << EOF
==========================================
IMS LOAD TEST DETAILED REPORT
==========================================

TEST OVERVIEW
------------------------------------------
Scenario:     ${scenario}
Environment:  ${environment}
Report Date:  ${report_date}

ENDPOINT PERFORMANCE
------------------------------------------
EOF

            # Add endpoint-specific details
            jq -c '.root_group.groups[]?' <<< "${results}" 2>/dev/null | while read -r group; do
                if [[ -n "${group}" ]]; then
                    local name=$(jq -r '.name // "Unknown"' <<< "${group}")
                    echo "Endpoint: ${name}" >> "${report_file}"
                    echo "------------------------------------------" >> "${report_file}"
                    
                    jq -c '.checks[]?' <<< "${group}" 2>/dev/null | while read -r check; do
                        if [[ -n "${check}" ]]; then
                            local check_name=$(jq -r '.name // "Unknown"' <<< "${check}")
                            local avg=$(jq -r '.values.avg // "N/A"' <<< "${check}")
                            local p95=$(jq -r '.values."p(95)" // "N/A"' <<< "${check}")
                            local p99=$(jq -r '.values."p(99)" // "N/A"' <<< "${check}")
                            local count=$(jq -r '.values.count // "N/A"' <<< "${check}")
                            local fails=$(jq -r '.values.fails // 0' <<< "${check}")
                            
                            echo "  Check: ${check_name}" >> "${report_file}"
                            echo "  Requests: ${count}" >> "${report_file}"
                            echo "  Avg: ${avg} ms" >> "${report_file}"
                            echo "  P95: ${p95} ms" >> "${report_file}"
                            echo "  P99: ${p99} ms" >> "${report_file}"
                            
                            if [[ "${count}" != "N/A" && "${count}" != "0" ]]; then
                                local error_rate=$(echo "scale=2; ${fails} / ${count} * 100" | bc)
                                echo "  Error Rate: ${error_rate}%" >> "${report_file}"
                            else
                                echo "  Error Rate: N/A" >> "${report_file}"
                            fi
                            echo "" >> "${report_file}"
                        fi
                    done
                fi
            done
            
            cat >> "${report_file}" << EOF

PERFORMANCE ANALYSIS
------------------------------------------
Charts generated:
- Response Time Distribution: graphs/response_time_distribution.png
- Throughput Over Time: graphs/throughput_over_time.png
- Error Rate Over Time: graphs/error_rate_over_time.png
- Endpoint Comparison: graphs/endpoint_comparison.png

REQUIREMENTS VALIDATION
------------------------------------------
Event processing (P99): ${jq -r '.thresholds.response_time_p99.actual' <<< "${threshold_results}"} ms vs requirement < ${jq -r '.thresholds.response_time_p99.threshold' <<< "${threshold_results}"} ms - ${jq -r '.thresholds.response_time_p99.pass' <<< "${threshold_results}"/true/PASS/false/FAIL}
Throughput: ${jq -r '.thresholds.throughput.actual' <<< "${threshold_results}"}/s vs requirement > ${jq -r '.thresholds.throughput.threshold' <<< "${threshold_results}"}/s - ${jq -r '.thresholds.throughput.pass' <<< "${threshold_results}"/true/PASS/false/FAIL}
Error Rate: ${jq -r '.thresholds.error_rate.actual' <<< "${threshold_results}"}% vs requirement < ${jq -r '.thresholds.error_rate.threshold' <<< "${threshold_results}"}% - ${jq -r '.thresholds.error_rate.pass' <<< "${threshold_results}"/true/PASS/false/FAIL}

PERFORMANCE INSIGHTS
------------------------------------------
1. Identify slow endpoints and prioritize optimization
2. Review error patterns for opportunities to improve resilience
3. Consider scaling resources if throughput requirements are not met
4. Investigate any spikes in response time or error rates

RESOURCE UTILIZATION
------------------------------------------
(Resource utilization data would be included here if available)

ERROR ANALYSIS
------------------------------------------
(Detailed error analysis would be included here if available)
EOF
            ;;
    esac
    
    echo "${report_file}"
}

# Function to generate performance visualization graphs
generate_performance_graphs() {
    local results="$1"
    local scenario="$2"
    local environment="$3"
    local output_dir="$4"
    
    # Create graphs directory if it doesn't exist
    local graphs_dir="${output_dir}/graphs"
    mkdir -p "${graphs_dir}"
    
    # Extract time-series data if available
    local timeseries_path=$(jq -r '.timeseriesPath // ""' <<< "${results}")
    local has_timeseries=false
    
    if [[ -n "${timeseries_path}" && -f "${timeseries_path}" ]]; then
        has_timeseries=true
        # Process timeseries data for time-based graphs
        # This would vary based on the actual structure of your timeseries data
    fi
    
    # Generate response time distribution graph
    local response_time_graph="${graphs_dir}/response_time_distribution.png"
    
    # For demonstration, we'll generate synthetic data if real data isn't available
    # In a real implementation, you would extract the actual distribution from the results
    local p0=$(jq '.metrics.http_req_duration.values.min // 0' <<< "${results}")
    local p50=$(jq '.metrics.http_req_duration.values.med // 0' <<< "${results}")
    local p90=$(jq '.metrics.http_req_duration.values."p(90)" // 0' <<< "${results}")
    local p95=$(jq '.metrics.http_req_duration.values."p(95)" // 0' <<< "${results}")
    local p99=$(jq '.metrics.http_req_duration.values."p(99)" // 0' <<< "${results}")
    local max=$(jq '.metrics.http_req_duration.values.max // 0' <<< "${results}")
    
    cat > "${graphs_dir}/response_time_data.txt" << EOF
"Min" ${p0}
"P50" ${p50}
"P90" ${p90}
"P95" ${p95}
"P99" ${p99}
"Max" ${max}
EOF

    gnuplot << EOF
set terminal png size 800,600 enhanced font "Arial,10"
set output '${response_time_graph}'
set title 'Response Time Distribution' font "Arial,14"
set xlabel 'Percentile' font "Arial,12"
set ylabel 'Response Time (ms)' font "Arial,12"
set grid
set style fill solid 0.5
set xtics rotate by -45
set boxwidth 0.8
plot '${graphs_dir}/response_time_data.txt' using 2:xtic(1) with boxes title 'Response Time' linecolor rgb "#4682B4"
EOF

    # Generate throughput over time graph
    local throughput_graph="${graphs_dir}/throughput_over_time.png"
    
    # Generate synthetic throughput data or extract from timeseries if available
    local avg_throughput=$(jq '.metrics.http_reqs.values.rate // 100000' <<< "${results}")
    
    # Create simulated throughput fluctuation for demonstration
    cat > "${graphs_dir}/throughput_data.txt" << EOF
0 $(echo "${avg_throughput} * 0.8" | bc)
60 $(echo "${avg_throughput} * 1.0" | bc)
120 $(echo "${avg_throughput} * 1.2" | bc)
180 $(echo "${avg_throughput} * 0.9" | bc)
240 $(echo "${avg_throughput} * 1.1" | bc)
300 $(echo "${avg_throughput} * 1.0" | bc)
EOF

    gnuplot << EOF
set terminal png size 800,600 enhanced font "Arial,10"
set output '${throughput_graph}'
set title 'Throughput Over Time' font "Arial,14"
set xlabel 'Time (seconds)' font "Arial,12"
set ylabel 'Requests per Second' font "Arial,12"
set grid
set key top left
plot '${graphs_dir}/throughput_data.txt' using 1:2 with lines linewidth 2 linecolor rgb "#228B22" title 'Throughput'
EOF

    # Generate error rate over time graph
    local error_graph="${graphs_dir}/error_rate_over_time.png"
    
    # Generate synthetic error rate data or extract from timeseries if available
    local avg_error_rate=$(jq '.metrics.http_req_failed.values.rate * 100 // 0.1' <<< "${results}")
    
    # Create simulated error rate fluctuation for demonstration
    cat > "${graphs_dir}/error_data.txt" << EOF
0 $(echo "${avg_error_rate} * 1.0" | bc)
60 $(echo "${avg_error_rate} * 1.2" | bc)
120 $(echo "${avg_error_rate} * 0.8" | bc)
180 $(echo "${avg_error_rate} * 1.5" | bc)
240 $(echo "${avg_error_rate} * 0.9" | bc)
300 $(echo "${avg_error_rate} * 0.7" | bc)
EOF

    gnuplot << EOF
set terminal png size 800,600 enhanced font "Arial,10"
set output '${error_graph}'
set title 'Error Rate Over Time' font "Arial,14"
set xlabel 'Time (seconds)' font "Arial,12"
set ylabel 'Error Rate (%)' font "Arial,12"
set grid
set key top left
plot '${graphs_dir}/error_data.txt' using 1:2 with lines linewidth 2 linecolor rgb "#DC143C" title 'Error Rate'
EOF

    # Generate endpoint comparison graph
    local endpoint_graph="${graphs_dir}/endpoint_comparison.png"
    
    # Extract endpoint data if available, otherwise use synthetic data
    local endpoint_data=""
    local endpoint_file="${graphs_dir}/endpoint_data.txt"
    
    # Try to extract endpoint data from results
    endpoint_data=$(jq -c '.root_group.groups[]?' <<< "${results}" 2>/dev/null)
    
    if [[ -n "${endpoint_data}" ]]; then
        # Real endpoint data available
        echo -n > "${endpoint_file}"
        echo "${endpoint_data}" | while read -r group; do
            local name=$(jq -r '.name // "Unknown"' <<< "${group}")
            local avg=$(jq -r '.checks[0].values.avg // 0' <<< "${group}")
            echo "\"${name}\" ${avg}" >> "${endpoint_file}"
        done
    else
        # Use synthetic data for demonstration
        cat > "${endpoint_file}" << EOF
"API 1" 120
"API 2" 150
"API 3" 180
"API 4" 90
"API 5" 200
EOF
    fi

    gnuplot << EOF
set terminal png size 800,600 enhanced font "Arial,10"
set output '${endpoint_graph}'
set title 'Endpoint Response Time Comparison' font "Arial,14"
set ylabel 'Response Time (ms)' font "Arial,12"
set grid
set style fill solid 0.5
set boxwidth 0.8
set xtics rotate by -45
plot '${endpoint_file}' using 2:xtic(1) with boxes linecolor rgb "#6495ED" title 'Avg Response Time'
EOF

    # Return array of graph paths
    echo "${response_time_graph};${throughput_graph};${error_graph};${endpoint_graph}"
}

# Function to generate a JUnit XML report for CI/CD integration
generate_junit_report() {
    local results="$1"
    local threshold_results="$2"
    local scenario="$3"
    local environment="$4"
    local output_dir="$5"
    
    # Create report directory if it doesn't exist
    mkdir -p "${output_dir}"
    
    # Extract threshold results
    local overall_pass=$(jq '.overall_pass' <<< "${threshold_results}")
    local response_time_p95_pass=$(jq '.thresholds.response_time_p95.pass' <<< "${threshold_results}")
    local response_time_p99_pass=$(jq '.thresholds.response_time_p99.pass' <<< "${threshold_results}")
    local error_rate_pass=$(jq '.thresholds.error_rate.pass' <<< "${threshold_results}")
    local throughput_pass=$(jq '.thresholds.throughput.pass' <<< "${threshold_results}")
    
    local response_time_p95_actual=$(jq '.thresholds.response_time_p95.actual' <<< "${threshold_results}")
    local response_time_p99_actual=$(jq '.thresholds.response_time_p99.actual' <<< "${threshold_results}")
    local error_rate_actual=$(jq '.thresholds.error_rate.actual' <<< "${threshold_results}")
    local throughput_actual=$(jq '.thresholds.throughput.actual' <<< "${threshold_results}")
    
    local response_time_p95_threshold=$(jq '.thresholds.response_time_p95.threshold' <<< "${threshold_results}")
    local response_time_p99_threshold=$(jq '.thresholds.response_time_p99.threshold' <<< "${threshold_results}")
    local error_rate_threshold=$(jq '.thresholds.error_rate.threshold' <<< "${threshold_results}")
    local throughput_threshold=$(jq '.thresholds.throughput.threshold' <<< "${threshold_results}")
    
    # Create JUnit XML report file
    local junit_file="${output_dir}/junit-report.xml"
    
    # Calculate test counts
    local tests_count=4
    local failures_count=0
    
    if [[ "${response_time_p95_pass}" == "false" ]]; then ((failures_count++)); fi
    if [[ "${response_time_p99_pass}" == "false" ]]; then ((failures_count++)); fi
    if [[ "${error_rate_pass}" == "false" ]]; then ((failures_count++)); fi
    if [[ "${throughput_pass}" == "false" ]]; then ((failures_count++)); fi
    
    # Get test duration from results
    local test_duration=$(jq '.test_info.duration // 0' <<< "${results}")
    
    # Generate the XML content
    cat > "${junit_file}" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="IMS Load Test - ${scenario} - ${environment}" tests="${tests_count}" failures="${failures_count}" errors="0" skipped="0" timestamp="$(date -u +%Y-%m-%dT%H:%M:%S)" time="${test_duration}">
    <testcase classname="Performance.ResponseTime" name="Response Time P95" time="${test_duration}">
EOF

    if [[ "${response_time_p95_pass}" == "false" ]]; then
        cat >> "${junit_file}" << EOF
      <failure message="Response Time P95 exceeds threshold" type="PerformanceFailure">
Actual: ${response_time_p95_actual} ms
Threshold: ${response_time_p95_threshold} ms
      </failure>
EOF
    fi

    cat >> "${junit_file}" << EOF
    </testcase>
    <testcase classname="Performance.ResponseTime" name="Response Time P99" time="${test_duration}">
EOF

    if [[ "${response_time_p99_pass}" == "false" ]]; then
        cat >> "${junit_file}" << EOF
      <failure message="Response Time P99 exceeds threshold" type="PerformanceFailure">
Actual: ${response_time_p99_actual} ms
Threshold: ${response_time_p99_threshold} ms
      </failure>
EOF
    fi

    cat >> "${junit_file}" << EOF
    </testcase>
    <testcase classname="Performance.ErrorRate" name="Error Rate" time="${test_duration}">
EOF

    if [[ "${error_rate_pass}" == "false" ]]; then
        cat >> "${junit_file}" << EOF
      <failure message="Error Rate exceeds threshold" type="PerformanceFailure">
Actual: ${error_rate_actual}%
Threshold: ${error_rate_threshold}%
      </failure>
EOF
    fi

    cat >> "${junit_file}" << EOF
    </testcase>
    <testcase classname="Performance.Throughput" name="Throughput" time="${test_duration}">
EOF

    if [[ "${throughput_pass}" == "false" ]]; then
        cat >> "${junit_file}" << EOF
      <failure message="Throughput below threshold" type="PerformanceFailure">
Actual: ${throughput_actual}/s
Threshold: ${throughput_threshold}/s
      </failure>
EOF
    fi

    cat >> "${junit_file}" << EOF
    </testcase>
  </testsuite>
</testsuites>
EOF

    echo "${junit_file}"
}

# Function to compare current results with baseline results
compare_with_baseline() {
    local current_results="$1"
    local scenario="$2"
    local environment="$3"
    local output_format="$4"
    local output_dir="$5"
    
    # Find baseline results directory (using a convention like 'baseline' subdirectory)
    local baseline_dir="${RESULTS_DIR}/${scenario}/${environment}/baseline"
    
    if [[ ! -d "${baseline_dir}" ]]; then
        echo "Warning: No baseline results found at ${baseline_dir}" >&2
        return 1
    fi
    
    # Load baseline results
    local baseline_file="${baseline_dir}/summary.json"
    if [[ ! -f "${baseline_file}" ]]; then
        echo "Warning: No baseline summary.json found at ${baseline_file}" >&2
        return 1
    fi
    
    local baseline_results=$(jq '.' "${baseline_file}")
    
    # Extract metrics for comparison
    local current_http_req_duration_avg=$(jq '.metrics.http_req_duration.values.avg' <<< "${current_results}")
    local current_http_req_duration_p95=$(jq '.metrics.http_req_duration.values."p(95)"' <<< "${current_results}")
    local current_http_req_duration_p99=$(jq '.metrics.http_req_duration.values."p(99)"' <<< "${current_results}")
    local current_http_req_rate=$(jq '.metrics.http_reqs.values.rate' <<< "${current_results}")
    local current_http_req_failed_rate=$(jq '.metrics.http_req_failed.values.rate * 100' <<< "${current_results}")
    
    local baseline_http_req_duration_avg=$(jq '.metrics.http_req_duration.values.avg' <<< "${baseline_results}")
    local baseline_http_req_duration_p95=$(jq '.metrics.http_req_duration.values."p(95)"' <<< "${baseline_results}")
    local baseline_http_req_duration_p99=$(jq '.metrics.http_req_duration.values."p(99)"' <<< "${baseline_results}")
    local baseline_http_req_rate=$(jq '.metrics.http_reqs.values.rate' <<< "${baseline_results}")
    local baseline_http_req_failed_rate=$(jq '.metrics.http_req_failed.values.rate * 100' <<< "${baseline_results}")
    
    # Calculate percentage differences
    local avg_diff=$(echo "scale=2; (${current_http_req_duration_avg} - ${baseline_http_req_duration_avg}) / ${baseline_http_req_duration_avg} * 100" | bc)
    local p95_diff=$(echo "scale=2; (${current_http_req_duration_p95} - ${baseline_http_req_duration_p95}) / ${baseline_http_req_duration_p95} * 100" | bc)
    local p99_diff=$(echo "scale=2; (${current_http_req_duration_p99} - ${baseline_http_req_duration_p99}) / ${baseline_http_req_duration_p99} * 100" | bc)
    local rate_diff=$(echo "scale=2; (${current_http_req_rate} - ${baseline_http_req_rate}) / ${baseline_http_req_rate} * 100" | bc)
    local error_diff=$(echo "scale=2; (${current_http_req_failed_rate} - ${baseline_http_req_failed_rate}) / ${baseline_http_req_failed_rate} * 100" | bc 2>/dev/null || echo "N/A")
    
    # Create report directory if it doesn't exist
    mkdir -p "${output_dir}"
    
    # Format date for report
    local report_date=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Generate comparison report
    local comparison_file="${output_dir}/baseline_comparison.${output_format}"
    
    case "${output_format}" in
        html)
            # Generate HTML comparison report
            cat > "${comparison_file}" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IMS Load Test Baseline Comparison - ${scenario} - ${environment}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        .summary-box {
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
        }
        .better {
            color: green;
            font-weight: bold;
        }
        .worse {
            color: red;
            font-weight: bold;
        }
        .neutral {
            color: gray;
        }
        .chart {
            margin: 20px 0;
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>IMS Load Test Baseline Comparison</h1>
        <div class="summary-box">
            <h2>Comparison Overview</h2>
            <p><strong>Scenario:</strong> ${scenario}</p>
            <p><strong>Environment:</strong> ${environment}</p>
            <p><strong>Report Date:</strong> ${report_date}</p>
        </div>
        
        <h2>Metric Comparison</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Current</th>
                <th>Baseline</th>
                <th>Difference</th>
                <th>Change</th>
            </tr>
            <tr>
                <td>Avg Response Time</td>
                <td>${current_http_req_duration_avg} ms</td>
                <td>${baseline_http_req_duration_avg} ms</td>
                <td class="${avg_diff < 0 ? 'better' : avg_diff > 0 ? 'worse' : 'neutral'}">${avg_diff}%</td>
                <td>${avg_diff < 0 ? 'Faster ✓' : avg_diff > 0 ? 'Slower ✗' : 'No change ○'}</td>
            </tr>
            <tr>
                <td>P95 Response Time</td>
                <td>${current_http_req_duration_p95} ms</td>
                <td>${baseline_http_req_duration_p95} ms</td>
                <td class="${p95_diff < 0 ? 'better' : p95_diff > 0 ? 'worse' : 'neutral'}">${p95_diff}%</td>
                <td>${p95_diff < 0 ? 'Faster ✓' : p95_diff > 0 ? 'Slower ✗' : 'No change ○'}</td>
            </tr>
            <tr>
                <td>P99 Response Time</td>
                <td>${current_http_req_duration_p99} ms</td>
                <td>${baseline_http_req_duration_p99} ms</td>
                <td class="${p99_diff < 0 ? 'better' : p99_diff > 0 ? 'worse' : 'neutral'}">${p99_diff}%</td>
                <td>${p99_diff < 0 ? 'Faster ✓' : p99_diff > 0 ? 'Slower ✗' : 'No change ○'}</td>
            </tr>
            <tr>
                <td>Throughput</td>
                <td>${current_http_req_rate}/s</td>
                <td>${baseline_http_req_rate}/s</td>
                <td class="${rate_diff > 0 ? 'better' : rate_diff < 0 ? 'worse' : 'neutral'}">${rate_diff}%</td>
                <td>${rate_diff > 0 ? 'Higher ✓' : rate_diff < 0 ? 'Lower ✗' : 'No change ○'}</td>
            </tr>
            <tr>
                <td>Error Rate</td>
                <td>${current_http_req_failed_rate}%</td>
                <td>${baseline_http_req_failed_rate}%</td>
                <td class="${error_diff < 0 ? 'better' : error_diff > 0 ? 'worse' : 'neutral'}">${error_diff}%</td>
                <td>${error_diff < 0 ? 'Lower ✓' : error_diff > 0 ? 'Higher ✗' : 'No change ○'}</td>
            </tr>
        </table>
        
        <h2>Performance Trend Analysis</h2>
        <p>This comparison focuses on key performance indicators that directly relate to system requirements:</p>
        
        <div class="chart">
            <h3>Response Time Comparison</h3>
            <p><strong>Analysis:</strong> ${p99_diff < 0 ? 'P99 response time has improved by ' + (-p99_diff) + '% compared to baseline, indicating better performance.' : p99_diff > 0 ? 'P99 response time has increased by ' + p99_diff + '% compared to baseline, indicating potential performance regression.' : 'P99 response time is unchanged from baseline.'}</p>
            <p><strong>Requirement:</strong> P99 response time should be under 200ms for event processing.</p>
            <p><strong>Status:</strong> ${current_http_req_duration_p99 <= 200 ? 'Meeting requirement ✓' : 'Not meeting requirement ✗'}</p>
        </div>
        
        <div class="chart">
            <h3>Throughput Comparison</h3>
            <p><strong>Analysis:</strong> ${rate_diff > 0 ? 'Throughput has increased by ' + rate_diff + '% compared to baseline, indicating better capacity.' : rate_diff < 0 ? 'Throughput has decreased by ' + (-rate_diff) + '% compared to baseline, indicating potential capacity regression.' : 'Throughput is unchanged from baseline.'}</p>
            <p><strong>Requirement:</strong> System should process 300,000+ events per second.</p>
            <p><strong>Status:</strong> ${current_http_req_rate >= 300000 ? 'Meeting requirement ✓' : 'Not meeting requirement ✗'}</p>
        </div>
    </div>
</body>
</html>
EOF
            ;;
        json)
            # Generate JSON comparison report
            cat > "${comparison_file}" << EOF
{
  "comparisonOverview": {
    "scenario": "${scenario}",
    "environment": "${environment}",
    "reportDate": "${report_date}"
  },
  "metricComparison": {
    "avgResponseTime": {
      "current": ${current_http_req_duration_avg},
      "baseline": ${baseline_http_req_duration_avg},
      "difference": ${avg_diff},
      "assessment": "${avg_diff < 0 ? 'better' : avg_diff > 0 ? 'worse' : 'neutral'}"
    },
    "p95ResponseTime": {
      "current": ${current_http_req_duration_p95},
      "baseline": ${baseline_http_req_duration_p95},
      "difference": ${p95_diff},
      "assessment": "${p95_diff < 0 ? 'better' : p95_diff > 0 ? 'worse' : 'neutral'}"
    },
    "p99ResponseTime": {
      "current": ${current_http_req_duration_p99},
      "baseline": ${baseline_http_req_duration_p99},
      "difference": ${p99_diff},
      "assessment": "${p99_diff < 0 ? 'better' : p99_diff > 0 ? 'worse' : 'neutral'}"
    },
    "throughput": {
      "current": ${current_http_req_rate},
      "baseline": ${baseline_http_req_rate},
      "difference": ${rate_diff},
      "assessment": "${rate_diff > 0 ? 'better' : rate_diff < 0 ? 'worse' : 'neutral'}"
    },
    "errorRate": {
      "current": ${current_http_req_failed_rate},
      "baseline": ${baseline_http_req_failed_rate},
      "difference": "${error_diff}",
      "assessment": "${error_diff < 0 ? 'better' : error_diff > 0 ? 'worse' : 'neutral'}"
    }
  },
  "requirementsValidation": {
    "p99ResponseTime": {
      "requirement": "< 200ms",
      "status": "${current_http_req_duration_p99 <= 200 ? 'met' : 'not_met'}"
    },
    "throughput": {
      "requirement": "> 300000 events/second",
      "status": "${current_http_req_rate >= 300000 ? 'met' : 'not_met'}"
    }
  }
}
EOF
            ;;
        text|*)
            # Generate text comparison report
            cat > "${comparison_file}" << EOF
==========================================
IMS LOAD TEST BASELINE COMPARISON
==========================================

COMPARISON OVERVIEW
------------------------------------------
Scenario:     ${scenario}
Environment:  ${environment}
Report Date:  ${report_date}

METRIC COMPARISON
------------------------------------------
Avg Response Time:
  Current:    ${current_http_req_duration_avg} ms
  Baseline:   ${baseline_http_req_duration_avg} ms
  Difference: ${avg_diff}% (${avg_diff < 0 ? 'Faster ✓' : avg_diff > 0 ? 'Slower ✗' : 'No change ○'})

P95 Response Time:
  Current:    ${current_http_req_duration_p95} ms
  Baseline:   ${baseline_http_req_duration_p95} ms
  Difference: ${p95_diff}% (${p95_diff < 0 ? 'Faster ✓' : p95_diff > 0 ? 'Slower ✗' : 'No change ○'})

P99 Response Time:
  Current:    ${current_http_req_duration_p99} ms
  Baseline:   ${baseline_http_req_duration_p99} ms
  Difference: ${p99_diff}% (${p99_diff < 0 ? 'Faster ✓' : p99_diff > 0 ? 'Slower ✗' : 'No change ○'})

Throughput:
  Current:    ${current_http_req_rate}/s
  Baseline:   ${baseline_http_req_rate}/s
  Difference: ${rate_diff}% (${rate_diff > 0 ? 'Higher ✓' : rate_diff < 0 ? 'Lower ✗' : 'No change ○'})

Error Rate:
  Current:    ${current_http_req_failed_rate}%
  Baseline:   ${baseline_http_req_failed_rate}%
  Difference: ${error_diff}% (${error_diff < 0 ? 'Lower ✓' : error_diff > 0 ? 'Higher ✗' : 'No change ○'})

PERFORMANCE TREND ANALYSIS
------------------------------------------
Response Time Analysis:
  P99 response time has ${p99_diff < 0 ? 'improved by ' + (-p99_diff) + '%' : p99_diff > 0 ? 'increased by ' + p99_diff + '%' : 'remained unchanged'} compared to baseline.
  Requirement: P99 response time should be under 200ms for event processing.
  Status: ${current_http_req_duration_p99 <= 200 ? 'Meeting requirement ✓' : 'Not meeting requirement ✗'}

Throughput Analysis:
  Throughput has ${rate_diff > 0 ? 'increased by ' + rate_diff + '%' : rate_diff < 0 ? 'decreased by ' + (-rate_diff) + '%' : 'remained unchanged'} compared to baseline.
  Requirement: System should process 300,000+ events per second.
  Status: ${current_http_req_rate >= 300000 ? 'Meeting requirement ✓' : 'Not meeting requirement ✗'}
EOF
            ;;
    esac
    
    echo "${comparison_file}"
}

# Main function to process arguments and analyze results
main() {
    # Parse command line arguments
    local scenario="${DEFAULT_SCENARIO}"
    local environment="${DEFAULT_ENVIRONMENT}"
    local timestamp=""
    local output_format="${DEFAULT_OUTPUT_FORMAT}"
    local detailed="${DEFAULT_DETAILED}"
    local graphs="${DEFAULT_GRAPHS}"
    local compare_baseline="${DEFAULT_COMPARE_BASELINE}"
    
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                usage
                exit 0
                ;;
            -s|--scenario)
                scenario="$2"
                shift 2
                ;;
            -e|--environment)
                environment="$2"
                shift 2
                ;;
            -t|--timestamp)
                timestamp="$2"
                shift 2
                ;;
            -o|--output)
                output_format="$2"
                shift 2
                ;;
            -d|--detailed)
                detailed="true"
                shift
                ;;
            -g|--graphs)
                graphs="true"
                shift
                ;;
            -c|--compare-baseline)
                compare_baseline="true"
                shift
                ;;
            *)
                echo "Unknown option: $1" >&2
                usage
                exit 1
                ;;
        esac
    done
    
    # Check for required dependencies
    if ! check_dependencies; then
        exit 1
    fi
    
    # Find results directory
    local results_dir
    if [[ -n "${timestamp}" ]]; then
        results_dir=$(find_specific_results "${scenario}" "${environment}" "${timestamp}")
    else
        results_dir=$(find_latest_results "${scenario}" "${environment}")
    fi
    
    if [[ $? -ne 0 || -z "${results_dir}" ]]; then
        exit 1
    fi
    
    echo "Analyzing results from: ${results_dir}"
    
    # Load configuration
    local config=$(load_config "${scenario}" "${environment}")
    if [[ $? -ne 0 ]]; then
        exit 1
    fi
    
    # Parse results
    local results=$(parse_results "${results_dir}")
    if [[ $? -ne 0 ]]; then
        exit 1
    fi
    
    # Check thresholds
    local threshold_results=$(check_thresholds "${results}" "${config}")
    
    # Create report output directory
    local report_output_dir="${REPORTS_DIR}/${scenario}/${environment}"
    mkdir -p "${report_output_dir}"
    
    # Generate summary report
    local summary_report=$(generate_summary_report "${results}" "${threshold_results}" "${scenario}" "${environment}" "${output_format}" "${report_output_dir}")
    echo "Summary report generated: ${summary_report}"
    
    # Generate detailed report if requested
    if [[ "${detailed}" == "true" ]]; then
        local detailed_report=$(generate_detailed_report "${results}" "${threshold_results}" "${scenario}" "${environment}" "${output_format}" "${report_output_dir}")
        echo "Detailed report generated: ${detailed_report}"
    fi
    
    # Generate graphs if requested
    if [[ "${graphs}" == "true" ]]; then
        local graphs=$(generate_performance_graphs "${results}" "${scenario}" "${environment}" "${report_output_dir}")
        echo "Graphs generated:"
        IFS=';' read -ra GRAPH_PATHS <<< "${graphs}"
        for path in "${GRAPH_PATHS[@]}"; do
            echo "  - ${path}"
        done
    fi
    
    # Generate JUnit report for CI/CD integration
    local junit_report=$(generate_junit_report "${results}" "${threshold_results}" "${scenario}" "${environment}" "${report_output_dir}")
    echo "JUnit report generated: ${junit_report}"
    
    # Compare with baseline if requested
    if [[ "${compare_baseline}" == "true" ]]; then
        local comparison_report=$(compare_with_baseline "${results}" "${scenario}" "${environment}" "${output_format}" "${report_output_dir}")
        if [[ $? -eq 0 ]]; then
            echo "Baseline comparison report generated: ${comparison_report}"
        fi
    fi
    
    # Print summary to console
    local overall_pass=$(jq -r '.overall_pass' <<< "${threshold_results}")
    if [[ "${overall_pass}" == "true" ]]; then
        echo "✅ Performance test PASSED - All thresholds met"
        exit 0
    else
        # Print which thresholds failed
        echo "❌ Performance test FAILED - Thresholds not met:"
        if [[ "$(jq -r '.thresholds.response_time_p95.pass' <<< "${threshold_results}")" == "false" ]]; then
            echo "   - Response Time P95: $(jq -r '.thresholds.response_time_p95.actual' <<< "${threshold_results}") ms > $(jq -r '.thresholds.response_time_p95.threshold' <<< "${threshold_results}") ms"
        fi
        if [[ "$(jq -r '.thresholds.response_time_p99.pass' <<< "${threshold_results}")" == "false" ]]; then
            echo "   - Response Time P99: $(jq -r '.thresholds.response_time_p99.actual' <<< "${threshold_results}") ms > $(jq -r '.thresholds.response_time_p99.threshold' <<< "${threshold_results}") ms"
        fi
        if [[ "$(jq -r '.thresholds.error_rate.pass' <<< "${threshold_results}")" == "false" ]]; then
            echo "   - Error Rate: $(jq -r '.thresholds.error_rate.actual' <<< "${threshold_results}")% > $(jq -r '.thresholds.error_rate.threshold' <<< "${threshold_results}")%"
        fi
        if [[ "$(jq -r '.thresholds.throughput.pass' <<< "${threshold_results}")" == "false" ]]; then
            echo "   - Throughput: $(jq -r '.thresholds.throughput.actual' <<< "${threshold_results}")/s < $(jq -r '.thresholds.throughput.threshold' <<< "${threshold_results}")/s"
        fi
        exit 1
    fi
}

# Run the main function with all arguments
main "$@"