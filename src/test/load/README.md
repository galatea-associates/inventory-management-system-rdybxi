# IMS Load Testing Framework

This directory contains the load testing framework for the Inventory Management System (IMS). The framework is designed to validate that the system meets its critical performance requirements under various load conditions, including processing 300,000+ events per second with end-to-end latency under 200ms, and completing short sell approval workflows in under 150ms.

## Load Testing Overview

Load testing is a critical component of the IMS testing strategy, focused on validating the system's behavior under different load conditions. Unlike the performance tests in the `performance/` directory which focus on component-level benchmarking, these load tests simulate real-world usage patterns at scale to validate end-to-end system performance and stability.

## Test Scenarios

The load testing framework includes the following key test scenarios:

### Normal Load

Simulates typical business day activity with moderate user concurrency and transaction volumes. This scenario validates that the system performs optimally under expected daily conditions.

Key characteristics:
- 500 concurrent users
- 100,000 events per second
- 30-minute test duration with 5-minute ramp-up/down periods
- Response time thresholds: P99 < 200ms, P95 < 150ms, P50 < 100ms

### Peak Load

Simulates high-volume periods such as market open/close with increased user concurrency and transaction rates. This scenario validates that the system can handle expected peak loads without degradation.

Key characteristics:
- 1,000 concurrent users
- 300,000 events per second
- 15-minute test duration with 3-minute ramp-up/down periods
- Response time thresholds: P99 < 200ms, P95 < 150ms, P50 < 100ms

### Stress Test

Pushes the system beyond expected peak loads to identify breaking points and degradation patterns. This scenario helps establish the system's maximum capacity and behavior under extreme conditions.

Key characteristics:
- 1,500 concurrent users
- 500,000 events per second
- 10-minute test duration with 2-minute ramp-up/down periods
- Response time thresholds: P99 < 300ms, P95 < 200ms, P50 < 150ms

### Endurance Test

Runs sustained load over extended periods to identify memory leaks, resource exhaustion, or performance degradation over time. This scenario validates the system's stability for long-running operations.

Key characteristics:
- 500 concurrent users
- 150,000 events per second
- 4-hour test duration with 10-minute ramp-up/down periods
- Response time thresholds: P99 < 200ms, P95 < 150ms, P50 < 100ms

### Spike Test

Simulates sudden increases in load to test system resilience and recovery capabilities. This scenario validates how the system handles unexpected load spikes, such as those that might occur during market events.

Key characteristics:
- Baseline: 300 concurrent users, 100,000 events per second
- Spike: 1,200 concurrent users, 400,000 events per second
- 30-minute test duration with spike intervals every 5 minutes
- Response time thresholds: P99 < 250ms, P95 < 200ms, P50 < 150ms

## Directory Structure

The load testing framework is organized as follows:

```
load/
├── config/                  # Configuration files
│   └── load-test-config.yml # Main configuration file
├── data/                    # Test data
│   └── test-data.json       # Test data for load tests
├── results/                 # Test results output directory
├── reports/                 # Generated reports directory
├── scenarios/               # Test scenario implementations
│   ├── normal-load.js       # Normal load scenario
│   ├── peak-load.js         # Peak load scenario
│   ├── stress-test.js       # Stress test scenario
│   ├── endurance-test.js    # Endurance test scenario
│   └── spike-test.js        # Spike test scenario
├── scripts/                 # Helper scripts
│   ├── run-load-tests.sh    # Script to run load tests
│   └── analyze-results.sh   # Script to analyze results
└── README.md                # This documentation file
```

## Test Components

The load tests target the following system components:

### Data Ingestion

Tests the data ingestion pipeline's ability to handle high volumes of incoming data, including reference data, market data, trade data, and contract data.

Endpoints tested:
- `/api/v1/ingestion/reference`
- `/api/v1/ingestion/market`
- `/api/v1/ingestion/trade`
- `/api/v1/ingestion/contract`

Performance thresholds:
- Response time: P99 < 300ms, P95 < 200ms, P50 < 100ms
- Error rate: < 1%

### Calculation Engine

Tests the calculation engine's ability to process position data, settlement ladders, inventory availability, and limits at scale.

Endpoints tested:
- `/api/v1/calculation/position`
- `/api/v1/calculation/settlement`
- `/api/v1/calculation/inventory`
- `/api/v1/calculation/limit`

Performance thresholds:
- Response time: P99 < 200ms, P95 < 150ms, P50 < 100ms
- Error rate: < 1%

### Workflow Services

Tests the workflow services' ability to process locate requests and short sell validations efficiently.

Endpoints tested:
- `/api/v1/workflow/locate`
- `/api/v1/workflow/shortsell`

Performance thresholds:
- Locate: P99 < 200ms, P95 < 150ms, P50 < 100ms
- Short Sell: P99 < 150ms, P95 < 100ms, P50 < 50ms
- Error rate: < 1% for locate, < 0.5% for short sell

### API Services

Tests the API gateway and GraphQL endpoints under load.

Endpoints tested:
- REST API endpoints under `/api/v1`
- GraphQL endpoint at `/graphql`

Performance thresholds:
- Response time: P99 < 500ms, P95 < 300ms, P50 < 100ms
- Error rate: < 1%

## Configuration

The load testing framework is configured through the `config/load-test-config.yml` file, which defines test parameters, thresholds, and environments. Key configuration sections include:

- **Environments**: Configuration for dev, staging, and production environments
- **Scenarios**: Configuration for different load test scenarios
- **Components**: Configuration for testing specific system components
- **Headers**: Common HTTP headers for requests
- **Options**: General test options including timeouts and reporting settings

Example configuration for a scenario:
```yaml
scenarios:
  normal-load:
    description: "Normal load test simulating typical business day activity"
    script: "../scenarios/normal-load.js"
    duration: 1800
    rampUp: 300
    rampDown: 300
    users: 500
    throughput: 100000
    thresholds:
      http_req_duration: ["p(99)<200", "p(95)<150", "p(50)<100"]
      http_req_failed: ["rate<0.01"]
      iteration_duration: ["p(99)<1000", "p(95)<800"]
    tags: ["normal", "baseline"]
```

## Running Load Tests

Load tests can be executed using the provided scripts:

### Prerequisites

- k6 installed (version 0.42.0 or later)
- jq and yq for result processing
- Sufficient system resources for load generation
- Access to the target environment

### Basic Usage

```bash
# Run a normal load test against the dev environment
./scripts/run-load-tests.sh --scenario normal-load --env dev

# Run a peak load test against staging
./scripts/run-load-tests.sh --scenario peak-load --env staging

# Run a stress test with custom parameters
./scripts/run-load-tests.sh --scenario stress-test --env dev --vus 2000 --duration 15m
```

### Command Line Options

```
Usage: run-load-tests.sh [options]

Options:
  --scenario SCENARIO    Test scenario to run (default: normal-load)
  --env ENVIRONMENT     Target environment (dev, staging, prod) (default: dev)
  --output FORMAT       Output format (json, csv, html) (default: json)
  --summary             Generate summary report (default: true)
  --detailed           Generate detailed report (default: false)
  --thresholds         Validate thresholds (default: true)
  --vus N               Number of virtual users (overrides scenario default)
  --duration TIME       Test duration (overrides scenario default)
  --ramp-up TIME        Ramp-up period (overrides scenario default)
  --help                Display this help message

Available scenarios:
  normal-load           Typical business day activity
  peak-load             Market open/close or high activity periods
  stress-test           Beyond expected peak load
  endurance-test        Sustained activity over extended period
  spike-test            Sudden market events with rapid load increases
```

### Environment Variables

The following environment variables can be used to configure the tests:

```
# Authentication credentials
ENV_DEV_USERNAME=dev-user
ENV_DEV_PASSWORD=dev-password
ENV_STAGING_USERNAME=staging-user
ENV_STAGING_PASSWORD=staging-password
ENV_PROD_USERNAME=prod-user
ENV_PROD_PASSWORD=prod-password

# Base URLs (override defaults)
BASE_URL_DEV=http://dev-api.ims.example.com
BASE_URL_STAGING=https://staging-api.ims.example.com
BASE_URL_PROD=https://api.ims.example.com

# WebSocket URLs
WS_URL_DEV=ws://dev-ws.ims.example.com
WS_URL_STAGING=wss://staging-ws.ims.example.com
WS_URL_PROD=wss://ws.ims.example.com
```

## Analyzing Results

After running load tests, results can be analyzed using the provided scripts:

### Basic Analysis

```bash
# Analyze the latest test results for a scenario
./scripts/analyze-results.sh --scenario normal-load --env dev

# Analyze specific test results with detailed reporting
./scripts/analyze-results.sh --scenario peak-load --env staging --timestamp 2023-06-15-093045 --detailed

# Compare results with baseline
./scripts/analyze-results.sh --scenario normal-load --env dev --compare-baseline
```

### Command Line Options

```
Usage: analyze-results.sh [options]

Options:
  --scenario SCENARIO    Test scenario to analyze (default: normal-load)
  --env ENVIRONMENT     Target environment (dev, staging, prod) (default: dev)
  --timestamp TIMESTAMP Test timestamp to analyze (default: latest)
  --output FORMAT       Output format (html, json, text) (default: html)
  --detailed            Generate detailed analysis (default: false)
  --graphs              Include performance graphs (default: true)
  --compare-baseline    Compare with baseline results (default: false)
  --config FILE         Custom threshold configuration file
  --help                Display this help message
```

### Generated Reports

The analysis script generates the following reports:

- **Summary Report**: High-level overview of test results with pass/fail status
- **Detailed Report**: In-depth analysis of performance metrics and bottlenecks
- **Performance Graphs**: Visualizations of response times, throughput, and error rates
- **JUnit Report**: XML report for CI/CD integration

Reports are stored in the `reports/` directory, organized by scenario, environment, and timestamp.

### Key Metrics

When analyzing results, focus on these key metrics:

- **Response Time Percentiles**: P50, P95, P99 response times
- **Throughput**: Requests per second and events per second
- **Error Rate**: Percentage of failed requests
- **Resource Utilization**: CPU, memory, network usage
- **Saturation Points**: Where performance begins to degrade
- **Recovery Patterns**: How the system recovers from load spikes

## Test Data

The load testing framework uses realistic test data to simulate production-like conditions. Test data is stored in `data/test-data.json` and includes:

- **Securities**: Extended set of securities for load testing
- **Positions**: Extended set of positions for load testing
- **Counterparties**: Extended set of counterparties for load testing
- **Locates**: Extended set of locate requests for load testing
- **Orders**: Set of orders for load testing
- **Inventories**: Set of inventory availability records for load testing
- **Market Data**: Set of market data records for load testing
- **Reference Data**: Set of reference data updates for load testing
- **Scenarios**: Predefined test scenarios with specific data subsets

The test data is designed to be representative of real-world data volumes and patterns, with sufficient variety to avoid cache-friendly patterns that might skew results.

## CI/CD Integration

The load testing framework is integrated with CI/CD pipelines:

### Automated Testing

- Scheduled load tests run nightly against the development environment
- Critical load tests (normal and peak) run weekly against staging
- Full suite runs before production deployments
- Results are stored and compared to detect performance regressions

### Pipeline Configuration

The load tests are configured in the CI/CD pipeline at `.github/workflows/performance-test.yml` with the following stages:

1. **Setup**: Prepare the test environment and dependencies
2. **Test Execution**: Run the specified load tests
3. **Analysis**: Analyze test results and generate reports
4. **Validation**: Compare results against thresholds
5. **Notification**: Send notifications for test failures or performance regressions
6. **Archiving**: Store test results for historical comparison

### Quality Gates

Load test results are used as quality gates in the deployment pipeline:

- Normal load tests must pass for deployment to staging
- Peak load tests must pass for deployment to production
- Performance regressions beyond 10% trigger alerts and review
- Critical performance thresholds (short sell < 150ms, event processing < 200ms) must be met

## Best Practices

Recommended practices for effective load testing:

### Test Preparation

- Ensure the test environment is properly sized and configured
- Verify that test data is representative and sufficient
- Coordinate with other teams to avoid test conflicts
- Establish baseline performance before making changes

### Test Execution

- Start with lower load and gradually increase
- Monitor system resources during tests
- Capture detailed metrics for analysis
- Include appropriate think times and user behavior patterns
- Run tests long enough to identify performance degradation over time

### Result Analysis

- Look beyond averages to percentiles
- Correlate application metrics with infrastructure metrics
- Analyze trends over time, not just point-in-time results
- Identify bottlenecks and resource constraints
- Compare results across different test runs and environments

### Test Maintenance

- Keep test scenarios updated with system changes
- Regularly review and update test data
- Maintain historical results for trend analysis
- Document test configurations and environment details
- Periodically validate test scripts against production behavior

## Troubleshooting

Common issues and solutions when running load tests:

### Test Client Limitations

**Issue**: Test client machine becomes the bottleneck
**Solution**: 
- Distribute test load across multiple machines
- Use cloud-based load generation
- Optimize test scripts for efficiency
- Monitor test client resources during test execution

### Network Constraints

**Issue**: Network bandwidth or latency affects results
**Solution**: 
- Run tests from multiple locations
- Monitor network metrics during tests
- Consider co-located test clients
- Account for network overhead in result analysis

### Inconsistent Results

**Issue**: Results vary significantly between test runs
**Solution**: 
- Ensure clean environment before tests
- Implement warm-up periods
- Monitor for external factors affecting the environment
- Increase test duration for more stable results
- Run multiple iterations and analyze statistical significance

### Script Errors

**Issue**: Test scripts fail or produce errors
**Solution**: 
- Validate scripts in a controlled environment
- Implement proper error handling in scripts
- Check for environment-specific configuration issues
- Verify authentication and authorization setup
- Review script logs for detailed error information

## References

Additional resources for load testing:

### Internal Documentation

- [Technical Specifications](../../docs/technical-specifications.md)
- [Performance Requirements](../../docs/performance-requirements.md)
- [System Architecture](../../docs/architecture.md)
- [Test Strategy](../../docs/test-strategy.md)

### Tool Documentation

- [k6 Documentation](https://k6.io/docs/)
- [jq Manual](https://stedolan.github.io/jq/manual/)
- [yq Documentation](https://mikefarah.gitbook.io/yq/)

### Related Test Frameworks

- [Performance Testing Framework](../performance/README.md)
- [Integration Testing Framework](../integration/README.md)
- [Main Test Framework](../README.md)