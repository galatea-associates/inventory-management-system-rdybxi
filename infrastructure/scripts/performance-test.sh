#!/usr/bin/env bash
# performance-test.sh - Executes performance tests for the Inventory Management System (IMS).
#
# This script provides a unified interface to run various performance test scenarios
# using k6 and other tools to validate the system's ability to meet strict
# performance requirements, including processing 300,000+ events per second with
# end-to-end latency under 200ms and short sell approval workflows completing in under 150ms.

set -e
set -o pipefail

# Define global variables
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PERFORMANCE_DIR="${SCRIPT_DIR}/../src/test/performance"
LOAD_DIR="${SCRIPT_DIR}/../src/test/load"
K6_DIR="${PERFORMANCE_DIR}/k6"
RESULTS_DIR="${SCRIPT_DIR}/../test-results/performance"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
DEFAULT_ENVIRONMENT="dev"
DEFAULT_SCENARIO="all"
DEFAULT_LOAD_LEVEL="normal"
DEFAULT_OUTPUT_FORMAT="json"
PERFORMANCE_THRESHOLD_EVENT_PROCESSING="200" # milliseconds
PERFORMANCE_THRESHOLD_SHORT_SELL="150" # milliseconds
PERFORMANCE_THRESHOLD_UI_RESPONSE="3000" # milliseconds

# Function to display script usage information
usage() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo "Executes performance tests for the Inventory Management System (IMS)"
    echo ""
    echo "Options:"
    echo "  -h, --help               Display this help message"
    echo "  -e, --environment ENV    Environment (dev, staging, prod) (default: ${DEFAULT_ENVIRONMENT})"
    echo "  -s, --scenario NAME      Test scenario name (default: ${DEFAULT_SCENARIO})"
    echo "  -l, --load-level LEVEL   Load level (normal, peak, stress, endurance, spike) (default: ${DEFAULT_LOAD_LEVEL})"
    echo "  -o, --output FORMAT      Output format (json, html) (default: ${DEFAULT_OUTPUT_FORMAT})"
    echo ""
    echo "Available test scenarios:"
    ls "${K6_DIR}/scenarios"/*.js | sed "s:.*/::" | sed "s:.js$::"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0") -e staging -s shortSellValidation"
    echo "  $(basename "$0") --environment prod --scenario all --load-level peak"
}

# Function to check if required dependencies are installed
check_dependencies() {
    local missing_deps=()

    # Check for k6
    if ! command -v k6 &> /dev/null; then
        missing_deps+=("k6")
    fi

    # Check for jq
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi

    # Check for yq
    if ! command -v yq &> /dev/null; then
        missing_deps+=("yq")
    fi

    # Check for docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
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

# Function to setup the test environment
setup_environment() {
    local environment="$1"

    # Check if docker is running
    if ! docker info &> /dev/null; then
        echo "Error: Docker is not running. Please start Docker before running this script."
        return 1
    fi

    # Pull necessary docker images if not already present
    # (Add image pulling logic here if needed)

    # Start required services using docker-compose
    # (Add docker-compose logic here if needed)

    # Wait for services to be ready
    # (Add service readiness check logic here if needed)

    return 0
}

# Function to setup directories for test results
setup_directories() {
    local scenario="$1"
    local environment="$2"

    # Create results directory if it doesn't exist
    mkdir -p "${RESULTS_DIR}"

    # Create scenario-specific subdirectory
    mkdir -p "${RESULTS_DIR}/${scenario}"

    # Create environment-specific subdirectory
    mkdir -p "${RESULTS_DIR}/${scenario}/${environment}"

    # Create timestamp-based subdirectory
    mkdir -p "${RESULTS_DIR}/${scenario}/${environment}/${TIMESTAMP}"
    local results_dir="${RESULTS_DIR}/${scenario}/${environment}/${TIMESTAMP}"

    # Create logs subdirectory
    mkdir -p "${results_dir}/logs"

    echo "${results_dir}"
}

# Function to run a specific k6 performance test scenario
run_k6_test() {
    local scenario="$1"
    local environment="$2"
    local load_level="$3"
    local output_format="$4"
    local results_dir="$5"

    # Validate that the scenario script exists
    if [[ ! -f "${K6_DIR}/scenarios/${scenario}.js" ]]; then
        echo "Error: Scenario script not found: ${K6_DIR}/scenarios/${scenario}.js"
        return 1
    fi

    # Construct k6 command with appropriate parameters
    local k6_command="k6 run \
        --out ${output_format}=${results_dir}/results.${output_format} \
        ${K6_DIR}/scenarios/${scenario}.js"

    # Set environment variables for the test
    export ENV_TARGET="${environment}"
    export LOAD_LEVEL="${load_level}"

    # Execute k6 with the scenario script
    echo "Running k6 test: ${k6_command}"
    eval "${k6_command}" > "${results_dir}/logs/k6.log" 2>&1
    local exit_code=$?

    echo "k6 test completed with exit code: ${exit_code}"
    return ${exit_code}
}

# Function to run comprehensive load tests using the run-load-tests.sh script
run_load_tests() {
    local scenario="$1"
    local environment="$2"
    local load_level="$3"
    local output_format="$4"
    local results_dir="$5"

    # Make sure run-load-tests.sh is executable
    chmod +x "${LOAD_DIR}/scripts/run-load-tests.sh"

    # Construct the run-load-tests.sh command with appropriate parameters
    local load_command="${LOAD_DIR}/scripts/run-load-tests.sh \
        --scenario \"${scenario}\" \
        --environment \"${environment}\" \
        --load-level \"${load_level}\" \
        --output \"${output_format}\""

    # Execute the run-load-tests.sh script
    echo "Running load tests: ${load_command}"
    eval "${load_command}" > "${results_dir}/logs/load_tests.log" 2>&1
    local exit_code=$?

    echo "Load tests completed with exit code: ${exit_code}"
    return ${exit_code}
}

# Function to analyze test results and generate reports
analyze_results() {
    local scenario="$1"
    local environment="$2"
    local results_dir="$3"
    local detailed="$4"

    # Make sure analyze-results.sh is executable
    chmod +x "${LOAD_DIR}/scripts/analyze-results.sh"

    # Construct the analyze-results.sh command with appropriate parameters
    local analyze_command="${LOAD_DIR}/scripts/analyze-results.sh \
        --scenario \"${scenario}\" \
        --environment \"${environment}\" \
        --detailed \"${detailed}\" \
        --output \"json\""

    # Execute the analyze-results.sh script
    echo "Running analyze-results.sh: ${analyze_command}"
    eval "${analyze_command}" > "${results_dir}/logs/analyze_results.log" 2>&1
    local exit_code=$?

    echo "analyze-results.sh completed with exit code: ${exit_code}"
    return ${exit_code}
}

# Function to check if test results meet performance thresholds
check_performance_thresholds() {
    local results_file="$1"

    # Parse the results file using jq
    local event_processing_latency=$(jq '.thresholds."http_req_duration{operation:positionCalculation}".p99' "${results_file}" | sed 's/[^0-9.]*//g')
    local short_sell_latency=$(jq '.thresholds."http_req_duration{operation:validateShortSell}".p99' "${results_file}" | sed 's/[^0-9.]*//g')
    local ui_response_time=$(jq '.thresholds."http_req_duration".p95' "${results_file}" | sed 's/[^0-9.]*//g')

    # Compare metrics against defined thresholds
    local event_processing_pass=true
    if (( $(echo "$event_processing_latency > $PERFORMANCE_THRESHOLD_EVENT_PROCESSING" | bc -l) )); then
        event_processing_pass=false
    fi

    local short_sell_pass=true
    if (( $(echo "$short_sell_latency > $PERFORMANCE_THRESHOLD_SHORT_SELL" | bc -l) )); then
        short_sell_pass=false
    fi

    local ui_response_pass=true
    if (( $(echo "$ui_response_time > $PERFORMANCE_THRESHOLD_UI_RESPONSE" | bc -l) )); then
        ui_response_pass=false
    fi

    # Print pass/fail status for each threshold
    echo "Event Processing Latency: ${event_processing_latency}ms (Threshold: ${PERFORMANCE_THRESHOLD_EVENT_PROCESSING}ms) - ${event_processing_pass}"
    echo "Short Sell Validation Latency: ${short_sell_latency}ms (Threshold: ${PERFORMANCE_THRESHOLD_SHORT_SELL}ms) - ${short_sell_pass}"
    echo "UI Response Time: ${ui_response_time}ms (Threshold: ${PERFORMANCE_THRESHOLD_UI_RESPONSE}ms) - ${ui_response_pass}"

    # Return true if all thresholds are met, false otherwise
    if [[ "$event_processing_pass" == "true" && "$short_sell_pass" == "true" && "$ui_response_pass" == "true" ]]; then
        return 0
    else
        return 1
    fi
}

# Function to send notification with test results
send_notification() {
    local results_dir="$1"
    local threshold_passed="$2"

    # Generate summary of test results
    # (Add logic to generate summary of test results)

    # Determine notification message based on threshold_passed
    local message
    if [[ "$threshold_passed" == "true" ]]; then
        message="Performance tests PASSED"
    else
        message="Performance tests FAILED"
    fi

    # Send notification via configured channel (email, Slack, etc.)
    # (Add logic to send notification)

    # Include link to detailed results if available
    # (Add logic to include link to detailed results)

    echo "Sending notification: ${message}"
}

# Function to cleanup the test environment
cleanup_environment() {
    # Stop and remove docker containers
    # (Add docker cleanup logic here if needed)

    # Remove temporary files
    # (Add logic to remove temporary files)

    # Free up resources
    # (Add logic to free up resources)

    echo "Cleaning up test environment"
}

# Main function to process arguments and execute performance tests
main() {
    # Parse command line arguments
    local environment="${DEFAULT_ENVIRONMENT}"
    local scenario="${DEFAULT_SCENARIO}"
    local load_level="${DEFAULT_LOAD_LEVEL}"
    local output_format="${DEFAULT_OUTPUT_FORMAT}"

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                usage
                exit 0
                ;;
            -e|--environment)
                environment="$2"
                shift 2
                ;;
            -s|--scenario)
                scenario="$2"
                shift 2
                ;;
            -l|--load-level)
                load_level="$2"
                shift 2
                ;;
            -o|--output)
                output_format="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1" >&2
                usage
                exit 1
                ;;
        esac
    done

    # Check dependencies
    if ! check_dependencies; then
        exit 1
    fi

    # Setup test environment
    if ! setup_environment "${environment}"; then
        exit 1
    fi

    # Setup directories
    local results_dir=$(setup_directories "${scenario}" "${environment}")
    if [[ -z "${results_dir}" ]]; then
        exit 1
    fi

    # Run all test scenarios or a specific scenario
    if [[ "${scenario}" == "all" ]]; then
        # Run all test scenarios
        for scenario_file in "${K6_DIR}/scenarios/"*.js; do
            local scenario_name=$(basename "${scenario_file}" .js)
            echo "Running scenario: ${scenario_name}"
            run_k6_test "${scenario_name}" "${environment}" "${load_level}" "${output_format}" "${results_dir}"
            local k6_exit_code=$?
            if [[ ${k6_exit_code} -ne 0 ]]; then
                echo "Error: k6 test failed for scenario ${scenario_name}"
                exit 1
            fi
        done
    else
        # Run the specified scenario
        run_k6_test "${scenario}" "${environment}" "${load_level}" "${output_format}" "${results_dir}"
        local k6_exit_code=$?
        if [[ ${k6_exit_code} -ne 0 ]]; then
            echo "Error: k6 test failed for scenario ${scenario}"
            exit 1
        fi
    fi

    # Analyze results
    analyze_results "${scenario}" "${environment}" "${results_dir}" "true"
    local analyze_exit_code=$?
    if [[ ${analyze_exit_code} -ne 0 ]]; then
        echo "Error: analyze-results.sh failed"
        exit 1
    fi

    # Check performance thresholds
    local threshold_passed
    if check_performance_thresholds "${results_dir}/results.json"; then
        threshold_passed="true"
    else
        threshold_passed="false"
    fi

    # Send notification with results
    send_notification "${results_dir}" "${threshold_passed}"

    # Cleanup environment
    cleanup_environment

    # Return appropriate exit code based on test results
    if [[ "${threshold_passed}" == "true" ]]; then
        echo "Performance tests PASSED"
        exit 0
    else
        echo "Performance tests FAILED"
        exit 1
    fi
}

# Run the main function with all arguments
main "$@"