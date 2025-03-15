# IMS Performance Testing Framework

This directory contains the performance testing framework for the Inventory Management System (IMS). The framework is designed to validate that the system meets its critical performance requirements, including processing 300,000+ events per second with end-to-end latency under 200ms, and completing short sell approval workflows in under 150ms.

## Performance Testing Tools

The IMS performance testing framework utilizes multiple tools to provide comprehensive coverage and validation of performance requirements:

### k6
Modern, developer-centric performance testing tool that supports JavaScript for test scripting. Used for component-level and API-level performance testing with a focus on developer workflows and CI/CD integration.

### Gatling
Scala-based load testing tool with powerful DSL for defining test scenarios. Used for simulation of complex user journeys and high-throughput testing with detailed reporting capabilities.

### JMeter
Java-based load testing tool with extensive plugin ecosystem. Used for complex test scenarios, distributed testing, and integration with existing enterprise testing infrastructure.

## Test Scenarios

The performance testing framework includes the following key test scenarios:

### Short Sell Validation
Tests the performance of the short sell approval workflow, which must complete within 150ms (P99). Validates client limit checks, aggregation unit limit checks, and the end-to-end validation process.

### Locate Approval
Tests the performance of the locate approval workflow, including auto-approval rules, inventory checks, and manual approval processes.

### Position Calculation
Tests the performance of position calculations, including start-of-day position loading, trade processing, and settlement ladder projections.

### Inventory Calculation
Tests the performance of inventory availability calculations, including for-loan availability, for-pledge availability, and limit calculations.

### Data Ingestion
Tests the performance of data ingestion pipelines, including reference data, market data, trade data, and contract data processing.

### API Load
Tests the performance of API endpoints under various load conditions, focusing on throughput and response time.

## Load Profiles

The framework supports multiple load profiles to simulate different operational conditions:

### Normal Load
Simulates typical business day activity with moderate user concurrency and transaction volumes.

### Peak Load
Simulates high-volume periods such as market open/close with increased user concurrency and transaction rates.

### Stress Test
Pushes the system beyond expected peak loads to identify breaking points and degradation patterns.

### Endurance Test
Runs sustained load over extended periods to identify memory leaks, resource exhaustion, or performance degradation over time.

### Spike Test
Simulates sudden increases in load to test system resilience and recovery capabilities.

## Directory Structure

The performance testing framework is organized as follows:

### k6/
Contains k6 test scripts and configuration
- config.js: Central configuration for k6 tests
- scenarios/: Test scenario implementations
- lib/: Helper functions and utilities
- data/: Test data for k6 tests

### gatling/
Contains Gatling simulations and resources
- simulations/: Scala simulation files
- resources/: Test data and request bodies
- results/: Output directory for test results

### jmeter/
Contains JMeter test plans and resources
- test-plans/: JMX test plan files
- data/: Test data for JMeter tests
- scripts/: Helper scripts for running tests
- results/: Output directory for test results

## Running Performance Tests

Instructions for running performance tests with each tool:

### Prerequisites
- Node.js 16+ (for k6)
- Java 11+ (for Gatling and JMeter)
- Scala 2.13+ (for Gatling)
- Docker (optional, for containerized test execution)

### Running k6 Tests
```bash
# Install k6
npm install -g k6

# Run a specific scenario
k6 run k6/scenarios/shortSellValidation.js

# Run with environment variables
k6 run -e ENV=staging -e USERS=100 k6/scenarios/shortSellValidation.js

# Run with output
k6 run --out json=results.json k6/scenarios/shortSellValidation.js
```

### Running Gatling Tests
```bash
# Navigate to the gatling directory
cd gatling

# Run a specific simulation
./bin/gatling.sh -s ShortSellValidationSimulation

# Run with system properties
./bin/gatling.sh -s ShortSellValidationSimulation -DbaseUrl=https://staging-api.ims.example.com -Dusers=100
```

### Running JMeter Tests
```bash
# Navigate to the jmeter directory
cd jmeter

# Run a specific test plan
./bin/jmeter -n -t test-plans/ShortSellValidationTestPlan.jmx -l results/results.jtl

# Run with properties
./bin/jmeter -n -t test-plans/ShortSellValidationTestPlan.jmx -Jhost=staging-api.ims.example.com -Jthreads=100 -l results/results.jtl
```

### Running with Docker
```bash
# Run k6 tests with Docker
docker run -i grafana/k6 run - <k6/scenarios/shortSellValidation.js

# Run Gatling tests with Docker
docker run -it --rm -v $(pwd)/gatling:/gatling denvazh/gatling -s ShortSellValidationSimulation

# Run JMeter tests with Docker
docker run --rm -v $(pwd)/jmeter:/jmeter justb4/jmeter -n -t /jmeter/test-plans/ShortSellValidationTestPlan.jmx -l /jmeter/results/results.jtl
```

## Performance Thresholds

The IMS has strict performance requirements that must be validated through testing:

### System-Wide Thresholds
- Event Processing: <200ms end-to-end latency (P99)
- System Throughput: 300,000+ events per second
- Error Rate: <1% under normal load, <5% under stress conditions

### Component-Specific Thresholds
- Short Sell Approval: <150ms response time (P99)
- Locate Approval: <200ms response time (P99)
- Position Calculation: <200ms calculation time (P99)
- Inventory Calculation: <200ms calculation time (P99)
- Data Ingestion: <300ms processing time (P99)
- API Response: <500ms response time (P99)

## Analyzing Results

Guidance for analyzing performance test results:

### k6 Results
k6 provides built-in metrics and custom metrics that can be analyzed through:
- Console output with summary statistics
- JSON output for custom processing
- Integration with Grafana Cloud k6 for detailed analysis
- Custom dashboards via InfluxDB + Grafana integration

### Gatling Results
Gatling generates comprehensive HTML reports with:
- Response time distribution graphs
- Request count and error statistics
- Percentile breakdowns
- Active users over time charts

### JMeter Results
JMeter results can be analyzed through:
- JTL files for raw data
- HTML report generation
- Integration with tools like BlazeMeter for advanced analysis
- Custom dashboards via InfluxDB + Grafana integration

### Key Metrics to Analyze
When analyzing results, focus on these key metrics:
- Response Time Percentiles (P50, P95, P99)
- Throughput (requests per second)
- Error Rate
- Resource Utilization (CPU, memory, network)
- Correlation between load and response time
- Identification of bottlenecks

## Continuous Integration

The performance testing framework is integrated with CI/CD pipelines:

### Automated Testing
- Performance tests run automatically on schedule (nightly)
- Critical performance tests run on pull requests to main branches
- Full suite runs before production deployments

### Performance Regression Detection
- Historical results are stored and compared
- Alerts triggered when performance degrades beyond thresholds
- Trend analysis for early detection of gradual degradation

### CI Configuration
- Jenkins pipeline configuration in ../../.github/workflows/performance-test.yml
- Test selection based on changed components
- Parallel execution for faster feedback
- Detailed reporting and notification

## Best Practices

Recommended practices for effective performance testing:

### Test Data Management
- Use realistic test data that mimics production patterns
- Generate sufficient volume for meaningful results
- Consider data variability to avoid cache-friendly patterns
- Maintain test data versioning alongside test scripts

### Environment Considerations
- Test in environments that closely match production
- Document differences between test and production environments
- Consider scaling factors when interpreting results
- Monitor resource utilization during tests

### Test Design
- Focus on business-critical paths
- Include realistic think times and user behavior
- Test both average and peak conditions
- Include data volume growth projections in test scenarios

### Result Interpretation
- Look beyond averages to percentiles
- Correlate application metrics with infrastructure metrics
- Consider end-to-end user experience, not just component performance
- Analyze trends over time, not just point-in-time results

## Troubleshooting

Common issues and solutions when running performance tests:

### Resource Limitations
- Issue: Test client machine resources become bottleneck
- Solution: Distribute test load across multiple machines or use cloud-based load generation

### Network Constraints
- Issue: Network bandwidth or latency affects results
- Solution: Run tests from multiple locations, monitor network metrics, consider co-located test clients

### Test Data Issues
- Issue: Insufficient or unrealistic test data
- Solution: Enhance data generation, validate data distribution, ensure proper test data cleanup

### Environment Stability
- Issue: Inconsistent results between test runs
- Solution: Ensure clean environment before tests, monitor for external factors, implement warm-up periods

## References

Additional resources for performance testing:

### Tool Documentation
- [k6 Documentation](https://k6.io/docs/)
- [Gatling Documentation](https://gatling.io/docs/current/)
- [JMeter Documentation](https://jmeter.apache.org/usermanual/index.html)

### Internal Resources
- [IMS Performance Requirements](../../docs/requirements/performance.md)
- [System Architecture](../../docs/architecture/system-architecture.md)
- [Capacity Planning Guide](../../docs/operations/capacity-planning.md)

### Performance Testing Guides
- [Web Performance Testing Guide](https://web.dev/performance-measuring-tools/)
- [API Performance Testing Best Practices](https://www.apiscience.com/blog/api-performance-testing-best-practices/)
- [Financial Systems Performance Engineering](https://www.infoq.com/articles/performance-engineering-financial-systems/)