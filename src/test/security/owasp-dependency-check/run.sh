#!/bin/bash
#
# OWASP Dependency Check Execution Script
# 
# This script runs OWASP Dependency Check to scan project dependencies for
# known security vulnerabilities. It provides a unified interface for
# running dependency checks across different project components,
# configuring scan parameters, and generating comprehensive vulnerability reports.
#
# Version: 1.0.0
# Date: 2023-12-15

# Script directory and project paths
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(realpath "${SCRIPT_DIR}/../../../..")
SUPPRESSIONS_FILE="${SCRIPT_DIR}/suppressions.xml"

# Default values
DEFAULT_PROJECT_PATH="${PROJECT_ROOT}/src"
DEFAULT_OUTPUT_DIR="${PROJECT_ROOT}/build/reports/dependency-check"
DEFAULT_SEVERITY="MEDIUM"
DEFAULT_FORMAT="HTML"

# Generate timestamp for unique report directories
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Display usage information
usage() {
    cat << EOF
NAME
    $(basename "$0") - OWASP Dependency Check Execution Script

DESCRIPTION
    Scans project dependencies for known security vulnerabilities using
    OWASP Dependency Check and generates comprehensive reports.

USAGE
    $(basename "$0") [OPTIONS]

OPTIONS
    -p, --project-path PATH  Path to the project to scan (default: ${DEFAULT_PROJECT_PATH})
    -o, --output-dir DIR     Directory to store scan results (default: ${DEFAULT_OUTPUT_DIR})
    -s, --suppressions FILE  Path to suppressions XML file (default: ${SUPPRESSIONS_FILE})
    -t, --threshold LEVEL    Severity threshold for reporting (LOW, MEDIUM, HIGH, CRITICAL) (default: ${DEFAULT_SEVERITY})
    -f, --format FORMAT      Report format(s) (HTML, XML, CSV, JSON, JUNIT, SARIF, ALL) (default: ${DEFAULT_FORMAT})
    -h, --help               Display this help message and exit

EXAMPLES
    # Scan backend code with default settings
    $(basename "$0") -p src/backend

    # Scan frontend code with HTML and JSON reports
    $(basename "$0") -p src/web -f HTML,JSON

    # Scan entire project with high severity threshold
    $(basename "$0") -p \${PROJECT_ROOT} -t HIGH

    # Scan with custom suppressions file
    $(basename "$0") -p src/backend -s custom-suppressions.xml

EXIT CODES
    0  Scan completed successfully with no vulnerabilities above threshold
    1  Scan completed but vulnerabilities above threshold were found
    2  Scan failed to complete due to configuration or execution error
EOF
}

# Check if required dependencies are installed
check_dependencies() {
    local missing_deps=0

    # Check for dependency-check
    if ! command -v dependency-check.sh &> /dev/null && ! command -v dependency-check &> /dev/null; then
        echo "ERROR: OWASP Dependency Check is not installed or not in PATH."
        echo "       Please install it from https://jeremylong.github.io/DependencyCheck/"
        missing_deps=1
    fi

    # Check for jq (used for JSON processing)
    if ! command -v jq &> /dev/null; then
        echo "ERROR: jq is not installed or not in PATH."
        echo "       Please install it using your package manager (apt, brew, etc.)"
        missing_deps=1
    fi

    if [ $missing_deps -eq 1 ]; then
        return 1
    fi
    return 0
}

# Create necessary directories for scan execution and results
setup_directories() {
    local output_dir="$1"
    
    # Create output directory if it doesn't exist
    mkdir -p "${output_dir}"
    mkdir -p "${output_dir}/data"
    
    echo "Directories set up at: ${output_dir}"
    return 0
}

# Execute OWASP Dependency Check with specified parameters
run_dependency_check() {
    local project_path="$1"
    local output_dir="$2"
    local severity="$3"
    local format="$4"
    local suppressions_file="$5"
    local exit_code=0
    
    echo "Starting dependency check scan..."
    echo "Project path: ${project_path}"
    echo "Output directory: ${output_dir}"
    echo "Severity threshold: ${severity}"
    echo "Report format: ${format}"
    echo "Suppressions file: ${suppressions_file}"
    
    # Determine the command to run (dependency-check.sh or dependency-check)
    local cmd="dependency-check.sh"
    if ! command -v dependency-check.sh &> /dev/null; then
        cmd="dependency-check"
    fi
    
    # Build command with appropriate options
    local cmd_options=(
        "--project" "IMS-Dependency-Scan"
        "--scan" "${project_path}"
        "--out" "${output_dir}"
        "--failOnCVSS" "$([[ "${severity}" == "LOW" ]] && echo "1" || [[ "${severity}" == "MEDIUM" ]] && echo "4" || [[ "${severity}" == "HIGH" ]] && echo "7" || echo "9")"
    )
    
    # Add suppressions file if it exists
    if [ -n "${suppressions_file}" ] && [ -f "${suppressions_file}" ]; then
        cmd_options+=("--suppression" "${suppressions_file}")
    fi
    
    # Add formats
    IFS=',' read -ra FORMATS <<< "${format}"
    for i in "${FORMATS[@]}"; do
        if [[ "${i}" == "ALL" ]]; then
            cmd_options+=("--format" "ALL")
            break
        else
            cmd_options+=("--format" "${i}")
        fi
    done
    
    # Add additional options for better reports
    cmd_options+=(
        "--prettyPrint"
        "--enableExperimental"
    )
    
    # Execute dependency-check
    echo "Executing: ${cmd} ${cmd_options[*]}"
    "${cmd}" "${cmd_options[@]}"
    exit_code=$?
    
    echo "Dependency check scan completed with exit code: ${exit_code}"
    return ${exit_code}
}

# Analyze scan results to identify critical vulnerabilities
analyze_results() {
    local output_dir="$1"
    local severity="$2"
    local json_report="${output_dir}/dependency-check-report.json"
    local threshold=0
    local status=0
    
    # Set numeric threshold based on severity
    case "${severity}" in
        "LOW")
            threshold=1
            ;;
        "MEDIUM")
            threshold=4
            ;;
        "HIGH")
            threshold=7
            ;;
        "CRITICAL")
            threshold=9
            ;;
        *)
            threshold=4  # Default to MEDIUM
            ;;
    esac
    
    echo "Analyzing scan results..."
    
    # Check if JSON report exists
    if [ ! -f "${json_report}" ]; then
        echo "ERROR: JSON report not found at ${json_report}"
        echo "Cannot analyze results. Make sure to include JSON format in the scan."
        return 2
    fi
    
    # Use jq to extract vulnerability information
    echo "Counting vulnerabilities by severity..."
    
    # Extract vulnerability counts by severity
    local low_count=$(jq '.dependencies[] | select(.vulnerabilities != null) | .vulnerabilities[] | select(.cvssv3 != null and .cvssv3.baseScore >= 0.1 and .cvssv3.baseScore < 4) | .name' "${json_report}" | wc -l)
    local medium_count=$(jq '.dependencies[] | select(.vulnerabilities != null) | .vulnerabilities[] | select(.cvssv3 != null and .cvssv3.baseScore >= 4 and .cvssv3.baseScore < 7) | .name' "${json_report}" | wc -l)
    local high_count=$(jq '.dependencies[] | select(.vulnerabilities != null) | .vulnerabilities[] | select(.cvssv3 != null and .cvssv3.baseScore >= 7 and .cvssv3.baseScore < 9) | .name' "${json_report}" | wc -l)
    local critical_count=$(jq '.dependencies[] | select(.vulnerabilities != null) | .vulnerabilities[] | select(.cvssv3 != null and .cvssv3.baseScore >= 9) | .name' "${json_report}" | wc -l)
    
    # Output counts
    echo "Vulnerability summary:"
    echo "  Critical: ${critical_count}"
    echo "  High:     ${high_count}"
    echo "  Medium:   ${medium_count}"
    echo "  Low:      ${low_count}"
    
    # Determine if any vulnerabilities exceed the threshold
    if [ "${severity}" == "CRITICAL" ] && [ ${critical_count} -gt 0 ]; then
        echo "FAIL: Found ${critical_count} Critical vulnerabilities"
        status=1
    elif [ "${severity}" == "HIGH" ] && [ $((high_count + critical_count)) -gt 0 ]; then
        echo "FAIL: Found $((high_count + critical_count)) High or Critical vulnerabilities"
        status=1
    elif [ "${severity}" == "MEDIUM" ] && [ $((medium_count + high_count + critical_count)) -gt 0 ]; then
        echo "FAIL: Found $((medium_count + high_count + critical_count)) Medium, High, or Critical vulnerabilities"
        status=1
    elif [ "${severity}" == "LOW" ] && [ $((low_count + medium_count + high_count + critical_count)) -gt 0 ]; then
        echo "FAIL: Found $((low_count + medium_count + high_count + critical_count)) Low, Medium, High, or Critical vulnerabilities"
        status=1
    else
        echo "PASS: No vulnerabilities found above the ${severity} threshold"
        status=0
    fi
    
    return ${status}
}

# Generate a summary report of scan findings
generate_summary() {
    local output_dir="$1"
    local json_report="${output_dir}/dependency-check-report.json"
    local summary_file="${output_dir}/dependency-check-summary.txt"
    
    echo "Generating summary report..."
    
    # Check if JSON report exists
    if [ ! -f "${json_report}" ]; then
        echo "ERROR: JSON report not found at ${json_report}"
        echo "Cannot generate summary. Make sure to include JSON format in the scan."
        return 1
    fi
    
    # Extract key metrics
    local total_dependencies=$(jq '.dependencies | length' "${json_report}")
    local vulnerable_dependencies=$(jq '.dependencies[] | select(.vulnerabilities != null) | .fileName' "${json_report}" | sort -u | wc -l)
    local total_vulnerabilities=$(jq '.dependencies[] | select(.vulnerabilities != null) | .vulnerabilities | length' "${json_report}" | awk '{s+=$1} END {print s}')
    local scan_info=$(jq -r '.scanInfo.engineVersion + " (DB: " + .scanInfo.dataSource[0].timestamp + ")"' "${json_report}")
    
    # Write summary to file
    cat > "${summary_file}" << EOF
OWASP Dependency Check Summary
==============================
Scan Date: $(date)
Engine Version: ${scan_info}

Metrics:
  Total Dependencies: ${total_dependencies}
  Vulnerable Dependencies: ${vulnerable_dependencies}
  Total Vulnerabilities: ${total_vulnerabilities}

Vulnerability Breakdown:
  Critical: $(jq '.dependencies[] | select(.vulnerabilities != null) | .vulnerabilities[] | select(.cvssv3 != null and .cvssv3.baseScore >= 9) | .name' "${json_report}" | wc -l)
  High:     $(jq '.dependencies[] | select(.vulnerabilities != null) | .vulnerabilities[] | select(.cvssv3 != null and .cvssv3.baseScore >= 7 and .cvssv3.baseScore < 9) | .name' "${json_report}" | wc -l)
  Medium:   $(jq '.dependencies[] | select(.vulnerabilities != null) | .vulnerabilities[] | select(.cvssv3 != null and .cvssv3.baseScore >= 4 and .cvssv3.baseScore < 7) | .name' "${json_report}" | wc -l)
  Low:      $(jq '.dependencies[] | select(.vulnerabilities != null) | .vulnerabilities[] | select(.cvssv3 != null and .cvssv3.baseScore >= 0.1 and .cvssv3.baseScore < 4) | .name' "${json_report}" | wc -l)

Top Vulnerable Dependencies:
$(jq -r '.dependencies[] | select(.vulnerabilities != null) | .fileName + " (" + (.vulnerabilities | length | tostring) + " vulnerabilities)"' "${json_report}" | sort -t '(' -k 2 -nr | head -10)

Report Location:
  HTML Report: ${output_dir}/dependency-check-report.html
  JSON Report: ${json_report}
EOF
    
    echo "Summary report generated at: ${summary_file}"
    cat "${summary_file}"
    
    return 0
}

# Main function that processes arguments and executes scan
main() {
    local project_path="${DEFAULT_PROJECT_PATH}"
    local output_dir="${DEFAULT_OUTPUT_DIR}"
    local severity="${DEFAULT_SEVERITY}"
    local format="${DEFAULT_FORMAT}"
    local suppressions_file="${SUPPRESSIONS_FILE}"
    local exit_code=0
    
    # Parse command line arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            -p|--project-path)
                project_path="$2"
                shift 2
                ;;
            -o|--output-dir)
                output_dir="$2"
                shift 2
                ;;
            -s|--suppressions)
                suppressions_file="$2"
                shift 2
                ;;
            -t|--threshold)
                severity="$2"
                shift 2
                ;;
            -f|--format)
                format="$2"
                shift 2
                ;;
            -h|--help)
                usage
                return 0
                ;;
            *)
                echo "ERROR: Unknown option: $1"
                usage
                return 2
                ;;
        esac
    done
    
    # Add timestamp to output directory
    output_dir="${output_dir}/${TIMESTAMP}"
    
    # Validate inputs
    if [ ! -d "${project_path}" ]; then
        echo "ERROR: Project path does not exist: ${project_path}"
        return 2
    fi
    
    if [ ! -f "${suppressions_file}" ]; then
        echo "WARNING: Suppressions file does not exist: ${suppressions_file}"
        echo "         Running without suppressions file."
        suppressions_file=""
    fi
    
    # Convert severity to uppercase
    severity=$(echo "${severity}" | tr '[:lower:]' '[:upper:]')
    if [[ ! "${severity}" =~ ^(LOW|MEDIUM|HIGH|CRITICAL)$ ]]; then
        echo "ERROR: Invalid severity threshold: ${severity}"
        echo "       Must be one of: LOW, MEDIUM, HIGH, CRITICAL"
        return 2
    fi
    
    # Convert format to uppercase
    format=$(echo "${format}" | tr '[:lower:]' '[:upper:]')
    if [[ ! "${format}" =~ ^(HTML|XML|CSV|JSON|JUNIT|SARIF|ALL)(,(HTML|XML|CSV|JSON|JUNIT|SARIF))*$ ]] && [[ "${format}" != "ALL" ]]; then
        echo "ERROR: Invalid format: ${format}"
        echo "       Must be one or more of: HTML, XML, CSV, JSON, JUNIT, SARIF, ALL (comma-separated)"
        return 2
    fi
    
    # Ensure JSON format is included for analysis
    if [[ "${format}" != "ALL" ]] && [[ ! "${format}" =~ (^|,)JSON(,|$) ]]; then
        format="${format},JSON"
        echo "Added JSON format for results analysis."
    fi
    
    # Check dependencies
    if ! check_dependencies; then
        echo "ERROR: Missing required dependencies. Please install them and try again."
        return 2
    fi
    
    # Setup directories
    if ! setup_directories "${output_dir}"; then
        echo "ERROR: Failed to set up directories."
        return 2
    fi
    
    # Run dependency check
    if ! run_dependency_check "${project_path}" "${output_dir}" "${severity}" "${format}" "${suppressions_file}"; then
        echo "WARNING: Dependency check exited with a non-zero status."
        # Continue with analysis anyway as we want to generate reports
    fi
    
    # Generate summary
    if ! generate_summary "${output_dir}"; then
        echo "WARNING: Failed to generate summary report."
        # Continue as this is not critical
    fi
    
    # Analyze results
    if ! analyze_results "${output_dir}" "${severity}"; then
        echo "FAIL: Vulnerabilities found above the ${severity} threshold."
        exit_code=1
    else
        echo "PASS: No vulnerabilities found above the ${severity} threshold."
        exit_code=0
    fi
    
    echo "Scan completed. Reports available at: ${output_dir}"
    return ${exit_code}
}

# Execute main function with all arguments
main "$@"
exit $?