#!/usr/bin/env bash
# run-load-tests.sh - Executes load tests for the Inventory Management System (IMS).
#
# This script configures and runs various load test scenarios using k6 to
# validate the system's ability to handle high throughput and meet strict
# latency requirements under different load conditions.

set -e
set -o pipefail

# Global variables
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
CONFIG_DIR="${SCRIPT_DIR}/../config"
SCENARIOS_DIR="${SCRIPT_DIR}/../scenarios"
RESULTS_DIR="${SCRIPT_DIR}/../results"
DATA_DIR="${SCRIPT_DIR}/../data"
CONFIG_FILE="${CONFIG_DIR}/load-test-config.yml"
DEFAULT_SCENARIO="normal-load"
DEFAULT_ENVIRONMENT="dev"
DEFAULT_OUTPUT_FORMAT="json"
DEFAULT_SUMMARY="true"
DEFAULT_DETAILED="false"
DEFAULT_THRESHOLDS="true"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")

# Function to display script usage information
usage() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo "Executes load tests for the Inventory Management System (IMS)"
    echo ""
    echo "Options:"
    echo "  -h, --help               Display this help message"
    echo "  -s, --scenario NAME      Test scenario name (default: ${DEFAULT_SCENARIO})"
    echo "  -e, --environment ENV    Environment (dev, staging, prod) (default: ${DEFAULT_ENVIRONMENT})"
    echo "  -o, --output FORMAT      Output format (html, json, text) (default: ${DEFAULT_OUTPUT_FORMAT})"
    echo "  -u, --summary            Generate summary report (default: ${DEFAULT_SUMMARY})"
    echo "  -d, --detailed           Generate detailed report (default: ${DEFAULT_DETAILED})"
    echo "  -t, --thresholds         Validate thresholds (default: ${DEFAULT_THRESHOLDS})"
    echo ""
    echo "Available test scenarios:"
    ls ${SCENARIOS_DIR}/*.js | sed "s:.*/::" | sed "s:.js$::"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0") --scenario peak-load --environment staging"
    echo "  $(basename "$0") --scenario endurance-test --output html --detailed"
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

# Function to load configuration from the YAML config file
load_config() {
    local scenario="$1"
    local environment="$2"

    if [[ ! -f "${CONFIG_FILE}" ]]; then
        echo "Error: Config file not found: ${CONFIG_FILE}"
        return 1
    fi

    # Extract scenario configuration
    local scenario_config=$(yq eval ".scenarios.${scenario}" "${CONFIG_FILE}")
    if [[ "${scenario_config}" == "null" ]]; then
        echo "Error: Scenario '${scenario}' not found in config file"
        return 1
    fi

    # Extract environment configuration
    local env_config=$(yq eval ".environments.${environment}" "${CONFIG_FILE}")
    if [[ "${env_config}" == "null" ]]; then
        echo "Error: Environment '${environment}' not found in config file"
        return 1
    fi

    echo "Scenario Config: ${scenario_config}"
    echo "Environment Config: ${env_config}"
}

# Function to validate that the specified scenario exists
validate_scenario() {
    local scenario="$1"

    if [[ ! -f "${SCENARIOS_DIR}/${scenario}.js" ]]; then
        echo "Error: Scenario script not found: ${SCENARIOS_DIR}/${scenario}.js"
        return 1
    fi

    # Check if scenario is defined in the configuration file
    local scenario_config=$(yq eval ".scenarios.${scenario}" "${CONFIG_FILE}")
    if [[ "${scenario_config}" == "null" ]]; then
        echo "Error: Scenario '${scenario}' not found in config file"
        return 1
    fi

    return 0
}

# Function to validate that the specified environment is configured
validate_environment() {
    local environment="$1"

    # Check if environment is defined in the configuration file
    local env_config=$(yq eval ".environments.${environment}" "${CONFIG_FILE}")
    if [[ "${env_config}" == "null" ]]; then
        echo "Error: Environment '${environment}' not found in config file"
        return 1
    fi

    # Check if required environment variables are set
    # (Add more checks as needed)

    return 0
}

# Function to prepare test data for the load test
prepare_test_data() {
    local scenario="$1"
    local environment="$2"

    # Check if test data file exists
    if [[ ! -f "${DATA_DIR}/test-data.json" ]]; then
        echo "Error: Test data file not found: ${DATA_DIR}/test-data.json"
        return 1
    fi

    # Extract scenario-specific test data subset if needed
    # (Implementation depends on the structure of your test data)

    # Apply environment-specific transformations if needed
    # (Implementation depends on your requirements)

    echo "${DATA_DIR}/test-data.json"
}

# Function to execute a k6 load test with the specified parameters
run_k6_test() {
    local scenario="$1"
    local environment="$2"
    local output_format="$3"
    local results_dir="$4"
    local config="$5"

    # Construct k6 command with appropriate parameters
    local k6_command="k6 run \
        --out ${output_format}=${results_dir}/results.${output_format} \
        ${SCENARIOS_DIR}/${scenario}.js"

    # Set environment variables for the test
    export K6_SCENARIO="${scenario}"
    export K6_ENVIRONMENT="${environment}"

    # Execute k6 with the scenario script
    echo "Running k6 test: ${k6_command}"
    eval "${k6_command}" > "${results_dir}/logs/k6.log" 2>&1
    local exit_code=$?

    echo "k6 test completed with exit code: ${exit_code}"
    return ${exit_code}
}

# Function to generate a summary of the test results
generate_summary() {
    local scenario="$1"
    local environment="$2"
    local results_dir="$3"

    # Parse the test results from the output files
    # (Implementation depends on the output format)

    # Extract key metrics (response times, throughput, error rates)
    # (Implementation depends on the output format)

    # Compare results against thresholds
    # (Implementation depends on the output format)

    # Generate a summary report
    # (Implementation depends on the output format)

    # Print the summary to the console
    echo "Generating summary report for scenario '${scenario}' in environment '${environment}'"
}

# Function to call the analyze-results.sh script to perform detailed analysis
analyze_results() {
    local scenario="$1"
    local environment="$2"
    local results_dir="$3"
    local detailed="$4"

    # Construct the analyze-results.sh command with appropriate parameters
    local analyze_command="${SCRIPT_DIR}/analyze-results.sh \
        --scenario \"${scenario}\" \
        --environment \"${environment}\" \
        --output \"json\" \
        --detailed \"${detailed}\""

    # Execute the analyze-results.sh script
    echo "Running analyze-results.sh: ${analyze_command}"
    eval "${analyze_command}"

    local exit_code=$?
    echo "analyze-results.sh completed with exit code: ${exit_code}"
    return ${exit_code}
}

# Main function to process arguments and execute the load test
main() {
    # Parse command line arguments
    local scenario="${DEFAULT_SCENARIO}"
    local environment="${DEFAULT_ENVIRONMENT}"
    local output_format="${DEFAULT_OUTPUT_FORMAT}"
    local generate_summary="${DEFAULT_SUMMARY}"
    local generate_detailed="${DEFAULT_DETAILED}"
    local validate_thresholds="${DEFAULT_THRESHOLDS}"

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
            -o|--output)
                output_format="$2"
                shift 2
                ;;
            -u|--summary)
                generate_summary="true"
                shift
                ;;
            -d|--detailed)
                generate_detailed="true"
                shift
                ;;
            -t|--thresholds)
                validate_thresholds="true"
                shift
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

    # Validate scenario and environment
    if ! validate_scenario "${scenario}"; then
        exit 1
    fi

    if ! validate_environment "${environment}"; then
        exit 1
    fi

    # Load configuration
    load_config "${scenario}" "${environment}"

    # Setup directories
    local results_dir=$(setup_directories "${scenario}" "${environment}")
    if [[ -z "${results_dir}" ]]; then
        exit 1
    fi

    # Prepare test data
    local test_data=$(prepare_test_data "${scenario}" "${environment}")
    if [[ -z "${test_data}" ]]; then
        exit 1
    fi

    # Run the k6 test
    if ! run_k6_test "${scenario}" "${environment}" "${output_format}" "${results_dir}" "${config}"; then
        echo "k6 test failed. See logs for details."
        exit 1
    fi

    # Generate summary if requested
    if [[ "${generate_summary}" == "true" ]]; then
        generate_summary "${scenario}" "${environment}" "${results_dir}"
    fi

    # Analyze results if requested
    if analyze_results "${scenario}" "${environment}" "${results_dir}" "${generate_detailed}"; then
        echo "Results analyzed successfully."
    else
        echo "Results analysis failed. See logs for details."
    fi

    echo "Load tests completed."
    exit 0
}

# Run the main function with all arguments
main "$@"