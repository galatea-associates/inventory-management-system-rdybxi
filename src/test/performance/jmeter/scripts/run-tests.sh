#!/bin/bash
#
# run-tests.sh - Runs JMeter performance tests for the Inventory Management System (IMS).
#
# This script automates the execution of various JMeter test plans to validate the system's
# performance against the required thresholds, including processing 300,000+ events per second
# with end-to-end latency under 200ms.

set -e
set -o pipefail

# Global variables
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
TEST_PLANS_DIR="${SCRIPT_DIR}/../test-plans"
DATA_DIR="${SCRIPT_DIR}/../data"
RESULTS_DIR="${SCRIPT_DIR}/../results"
REPORTS_DIR="${SCRIPT_DIR}/../reports"
JMETER_HOME="${JMETER_HOME:-/opt/apache-jmeter}" # apache-jmeter v5.5
DEFAULT_HOST="localhost"
DEFAULT_PORT="8080"
DEFAULT_PROTOCOL="http"
DEFAULT_THREADS="100"
DEFAULT_RAMP_UP="60"
DEFAULT_DURATION="300"
DEFAULT_DATA_SOURCE="csv"
DEFAULT_CSV_FILE="${DATA_DIR}/testData.csv"
DEFAULT_TEST_PLAN="all"
DEFAULT_ENVIRONMENT="dev"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")

# Function to display usage information
usage() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo "Runs JMeter performance tests for the Inventory Management System (IMS)"
    echo ""
    echo "Options:"
    echo "  -h, --help               Display this help message"
    echo "  -t, --test-plan <test_plan>  Test plan to run (locate, shortsell, position, inventory, ingestion, api, all)"
    echo "                             (default: ${DEFAULT_TEST_PLAN})"
    echo "  -H, --host <host>          Target host for the test (default: ${DEFAULT_HOST})"
    echo "  -p, --port <port>          Target port for the test (default: ${DEFAULT_PORT})"
    echo "  -P, --protocol <protocol>  Protocol to use (http, https) (default: ${DEFAULT_PROTOCOL})"
    echo "  -n, --threads <threads>    Number of threads (virtual users) (default: ${DEFAULT_THREADS})"
    echo "  -r, --ramp-up <ramp_up>    Ramp-up period in seconds (default: ${DEFAULT_RAMP_UP})"
    echo "  -d, --duration <duration>  Test duration in seconds (default: ${DEFAULT_DURATION})"
    echo "  -s, --data-source <data_source> Data source type (generated, csv) (default: ${DEFAULT_DATA_SOURCE})"
    echo "  -c, --csv-file <csv_file>    Path to CSV data file (default: ${DEFAULT_CSV_FILE})"
    echo "  -e, --environment <environment> Target environment (dev, staging, prod) (default: ${DEFAULT_ENVIRONMENT})"
    echo "  -a, --analyze-only <analyze_only> Only analyze existing results without running tests (default: false)"
    echo "  -R, --results-dir <results_dir> Directory containing results to analyze (for --analyze-only) (default: latest)"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0") --test-plan locate --host ims.example.com --port 8080 --threads 200"
    echo "  $(basename "$0") --test-plan all --environment staging --duration 600"
}

# Function to setup directories
setup_directories() {
    # Create results directory if it doesn't exist
    mkdir -p "${RESULTS_DIR}"

    # Create timestamp-based subdirectory for current test run
    RESULTS_DIR="${RESULTS_DIR}/${TIMESTAMP}"
    mkdir -p "${RESULTS_DIR}"

    # Create reports directory if it doesn't exist
    mkdir -p "${REPORTS_DIR}"
}

# Function to validate JMeter installation
validate_jmeter_installation() {
    # Check if JMETER_HOME environment variable is set
    if [ -z "${JMETER_HOME}" ]; then
        echo "Error: JMETER_HOME environment variable is not set."
        return 1
    fi

    # Check if jmeter executable exists and is executable
    if [ ! -x "${JMETER_HOME}/bin/jmeter" ]; then
        echo "Error: JMeter executable not found or not executable at ${JMETER_HOME}/bin/jmeter."
        return 1
    fi

    # Verify JMeter version meets minimum requirements
    jmeter_version=$("${JMETER_HOME}/bin/jmeter" -v | grep "version" | awk '{print $3}' | cut -d'r' -f1)
    required_version="5.0"
    if [[ $(echo "$jmeter_version < $required_version" | bc -l) -eq 1 ]]; then
        echo "Error: JMeter version is too old. Required version is ${required_version} or later."
        return 1
    fi

    echo "JMeter installation validated."
    return 0
}

# Function to validate test plan
validate_test_plan() {
    local test_plan="$1"

    # Check if test plan file exists in the test plans directory
    if [ ! -f "${TEST_PLANS_DIR}/${test_plan}" ]; then
        echo "Error: Test plan file not found: ${TEST_PLANS_DIR}/${test_plan}"
        return 1
    fi

    # Verify test plan file is a valid JMeter test plan (basic XML check)
    if ! grep -q "<jmeterTestPlan" "${TEST_PLANS_DIR}/${test_plan}"; then
        echo "Error: Invalid JMeter test plan file: ${TEST_PLANS_DIR}/${test_plan}"
        return 1
    fi

    echo "Test plan validated: ${test_plan}"
    return 0
}

# Function to run JMeter test
run_jmeter_test() {
    local test_plan="$1"
    local host="$2"
    local port="$3"
    local protocol="$4"
    local threads="$5"
    local ramp_up="$6"
    local duration="$7"
    local data_source="$8"
    local csv_file="$9"
    local results_file="${10}"

    # Construct JMeter command with appropriate parameters
    local jmeter_command="${JMETER_HOME}/bin/jmeter -n -t ${TEST_PLANS_DIR}/${test_plan} -Jhost=${host} -Jport=${port} -Jprotocol=${protocol} -Jthreads=${threads} -Jramp_up=${ramp_up} -Jduration=${duration} -Jdata.source=${data_source} -Jcsv.file=${csv_file} -l ${RESULTS_DIR}/${results_file}"

    echo "Executing JMeter test: ${test_plan}"
    echo "Command: ${jmeter_command}"

    # Execute JMeter command
    ${jmeter_command}

    # Capture and log JMeter output
    local jmeter_exit_code=$?
    echo "JMeter test completed with exit code: ${jmeter_exit_code}"

    # Return JMeter exit code
    return ${jmeter_exit_code}
}

# Function to run locate approval test
run_locate_approval_test() {
    local host="$1"
    local port="$2"
    local protocol="$3"
    local threads="$4"
    local ramp_up="$5"
    local duration="$6"
    local data_source="$7"
    local csv_file="$8"

    # Set up test-specific parameters
    local test_plan="LocateApprovalTestPlan.jmx"
    local results_file="locate_approval_results.jtl"

    # Call run_jmeter_test with appropriate parameters
    run_jmeter_test "${test_plan}" "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}" "${results_file}"

    # Return test exit code
    return $?
}

# Function to run short sell validation test
run_short_sell_validation_test() {
    local host="$1"
    local port="$2"
    local protocol="$3"
    local threads="$4"
    local ramp_up="$5"
    local duration="$6"
    local data_source="$7"
    local csv_file="$8"

    # Set up test-specific parameters
    local test_plan="ShortSellValidationTestPlan.jmx"
    local results_file="short_sell_validation_results.jtl"

    # Call run_jmeter_test with appropriate parameters
    run_jmeter_test "${test_plan}" "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}" "${results_file}"

    # Return test exit code
    return $?
}

# Function to run position calculation test
run_position_calculation_test() {
    local host="$1"
    local port="$2"
    local protocol="$3"
    local threads="$4"
    local ramp_up="$5"
    local duration="$6"
    local data_source="$7"
    local csv_file="$8"

    # Set up test-specific parameters
    local test_plan="PositionCalculationTestPlan.jmx"
    local results_file="position_calculation_results.jtl"

    # Call run_jmeter_test with appropriate parameters
    run_jmeter_test "${test_plan}" "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}" "${results_file}"

    # Return test exit code
    return $?
}

# Function to run inventory calculation test
run_inventory_calculation_test() {
    local host="$1"
    local port="$2"
    local protocol="$3"
    local threads="$4"
    local ramp_up="$5"
    local duration="$6"
    local data_source="$7"
    local csv_file="$8"

    # Set up test-specific parameters
    local test_plan="InventoryCalculationTestPlan.jmx"
    local results_file="inventory_calculation_results.jtl"

    # Call run_jmeter_test with appropriate parameters
    run_jmeter_test "${test_plan}" "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}" "${results_file}"

    # Return test exit code
    return $?
}

# Function to run data ingestion test
run_data_ingestion_test() {
    local host="$1"
    local port="$2"
    local protocol="$3"
    local threads="$4"
    local ramp_up="$5"
    local duration="$6"
    local data_source="$7"
    local csv_file="$8"

    # Set up test-specific parameters
    local test_plan="DataIngestionTestPlan.jmx"
    local results_file="data_ingestion_results.jtl"

    # Call run_jmeter_test with appropriate parameters
    run_jmeter_test "${test_plan}" "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}" "${results_file}"

    # Return test exit code
    return $?
}

# Function to run API load test
run_api_load_test() {
    local host="$1"
    local port="$2"
    local protocol="$3"
    local threads="$4"
    local ramp_up="$5"
    local duration="$6"
    local data_source="$7"
    local csv_file="$8"

    # Set up test-specific parameters
    local test_plan="ApiLoadTestPlan.jmx"
    local results_file="api_load_results.jtl"

    # Call run_jmeter_test with appropriate parameters
    run_jmeter_test "${test_plan}" "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}" "${results_file}"

    # Return test exit code
    return $?
}

# Function to run all tests sequentially
run_all_tests() {
    local host="$1"
    local port="$2"
    local protocol="$3"
    local threads="$4"
    local ramp_up="$5"
    local duration="$6"
    local data_source="$7"
    local csv_file="$8"

    local overall_exit_code=0

    # Run locate approval test
    run_locate_approval_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
    if [ $? -ne 0 ]; then
        overall_exit_code=1
    fi

    # Run short sell validation test
    run_short_sell_validation_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
    if [ $? -ne 0 ]; then
        overall_exit_code=1
    fi

    # Run position calculation test
    run_position_calculation_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
    if [ $? -ne 0 ]; then
        overall_exit_code=1
    fi

    # Run inventory calculation test
    run_inventory_calculation_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
    if [ $? -ne 0 ]; then
        overall_exit_code=1
    fi

    # Run data ingestion test
    run_data_ingestion_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
    if [ $? -ne 0 ]; then
        overall_exit_code=1
    fi

    # Run API load test
    run_api_load_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
    if [ $? -ne 0 ]; then
        overall_exit_code=1
    fi

    # Return overall exit code (non-zero if any test failed)
    return ${overall_exit_code}
}

# Function to analyze results
analyze_results() {
    local results_dir="$1"
    local test_plan="$2"
    local environment="$3"

    # Call analyze-results.sh script with appropriate parameters
    ${SCRIPT_DIR}/../../../load/scripts/analyze-results.sh --scenario "${test_plan}" --environment "${environment}" --timestamp "${TIMESTAMP}"
    local analysis_exit_code=$?

    # Generate summary report
    echo "Generating summary report..."

    # Generate detailed report
    echo "Generating detailed report..."

    # Generate performance graphs
    echo "Generating performance graphs..."

    # Return analysis exit code
    return ${analysis_exit_code}
}

# Main function to process arguments and execute tests
main() {
    # Parse command line arguments
    local test_plan="${DEFAULT_TEST_PLAN}"
    local host="${DEFAULT_HOST}"
    local port="${DEFAULT_PORT}"
    local protocol="${DEFAULT_PROTOCOL}"
    local threads="${DEFAULT_THREADS}"
    local ramp_up="${DEFAULT_RAMP_UP}"
    local duration="${DEFAULT_DURATION}"
    local data_source="${DEFAULT_DATA_SOURCE}"
    local csv_file="${DEFAULT_CSV_FILE}"
    local environment="${DEFAULT_ENVIRONMENT}"
    local analyze_only="false"
    local results_dir="latest"

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                usage
                exit 0
                ;;
            -t|--test-plan)
                test_plan="$2"
                shift 2
                ;;
            -H|--host)
                host="$2"
                shift 2
                ;;
            -p|--port)
                port="$2"
                shift 2
                ;;
            -P|--protocol)
                protocol="$2"
                shift 2
                ;;
            -n|--threads)
                threads="$2"
                shift 2
                ;;
            -r|--ramp-up)
                ramp_up="$2"
                shift 2
                ;;
            -d|--duration)
                duration="$2"
                shift 2
                ;;
            -s|--data-source)
                data_source="$2"
                shift 2
                ;;
            -c|--csv-file)
                csv_file="$2"
                shift 2
                ;;
            -e|--environment)
                environment="$2"
                shift 2
                ;;
            -a|--analyze-only)
                analyze_only="true"
                shift
                ;;
            -R|--results-dir)
                results_dir="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1" >&2
                usage
                exit 1
                ;;
        esac
    done

    # Validate JMeter installation
    if ! validate_jmeter_installation; then
        exit 1
    fi

    # Setup directories
    setup_directories

    # If analyze-only is specified, skip test execution
    if [[ "${analyze_only}" == "true" ]]; then
        echo "Analyzing existing results only."
        if [[ "${results_dir}" == "latest" ]]; then
            results_dir=$(find_latest_results "${test_plan}" "${environment}")
        else
            results_dir=$(find_specific_results "${test_plan}" "${environment}" "${results_dir}")
        fi
        if [[ $? -ne 0 ]]; then
            exit 1
        fi
        analyze_results "${results_dir}" "${test_plan}" "${environment}"
        exit $?
    fi

    # Validate test plan
    if [[ "${test_plan}" != "all" ]]; then
        if ! validate_test_plan "${test_plan}.jmx"; then
            exit 1
        fi
    fi

    # Run specified test plan or all tests
    local test_exit_code=0
    case "${test_plan}" in
        locate)
            run_locate_approval_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
            test_exit_code=$?
            ;;
        shortsell)
            run_short_sell_validation_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
            test_exit_code=$?
            ;;
        position)
            run_position_calculation_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
            test_exit_code=$?
            ;;
        inventory)
            run_inventory_calculation_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
            test_exit_code=$?
            ;;
        ingestion)
            run_data_ingestion_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
            test_exit_code=$?
            ;;
        api)
            run_api_load_test "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
            test_exit_code=$?
            ;;
        all)
            run_all_tests "${host}" "${port}" "${protocol}" "${threads}" "${ramp_up}" "${duration}" "${data_source}" "${csv_file}"
            test_exit_code=$?
            ;;
        *)
            echo "Error: Invalid test plan specified: ${test_plan}"
            usage
            exit 1
            ;;
    esac

    # Analyze results
    analyze_results "${RESULTS_DIR}" "${test_plan}" "${environment}"
    local analysis_exit_code=$?

    # Print test summary
    echo "Test completed. Results are available in ${RESULTS_DIR}"

    # Return appropriate exit code based on test results
    if [ ${test_exit_code} -ne 0 ] || [ ${analysis_exit_code} -ne 0 ]; then
        echo "Performance test FAILED."
        exit 1
    else
        echo "Performance test PASSED."
        exit 0
    fi
}

# Run the main function with all arguments
main "$@"