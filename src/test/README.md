# Inventory Management System - Test Framework

This repository contains the comprehensive test suite for the Inventory Management System (IMS). The test framework is designed to validate the system's functionality, performance, security, and compliance with the specified requirements.

## Test Framework Overview

The IMS test framework employs a multi-layered testing approach to ensure comprehensive coverage across all system components. The framework includes unit tests, integration tests, end-to-end tests, performance tests, security tests, and specialized tests for data quality and compliance verification.

## Test Directory Structure

- `common/`: Common test utilities, fixtures, and helper functions
- `integration/`: Integration tests for service interactions
- `performance/`: Performance tests for validating system throughput and latency
- `e2e/`: End-to-end tests for validating complete user workflows
- `contract/`: Contract tests for validating API contracts
- `security/`: Security tests for validating system security controls
- `load/`: Load tests for validating system behavior under load
- `data-verification/`: Tests for validating data quality and integrity
- `api-tests/`: API-specific tests using Postman collections
- `ci-tests/`: Tests for CI/CD pipelines
- `monitoring/`: Tests for monitoring and alerting
- `chaos/`: Chaos testing for system resilience
- `kubernetes/`: Tests for Kubernetes deployments

## Test Types

### Unit Testing

Unit tests validate individual components in isolation. The IMS uses JUnit 5 for Java services, Jest for JavaScript/TypeScript, and ScalaTest for Scala components. Unit tests are located within each service's source code directory.

Key requirements:
- 85% line coverage for business logic
- 70% line coverage for infrastructure code
- 100% coverage for critical calculation components

### Integration Testing

Integration tests validate the interaction between system components. These tests focus on:

1. **Data Ingestion Pipelines**: Ensuring correct transformation and storage of reference data, market data, and trade data
2. **Calculation Workflows**: Verifying that calculation services correctly process events and produce expected results
3. **API Contracts**: Validating that APIs conform to their specifications and handle edge cases appropriately

Integration tests are located in the `integration/` directory and are organized by functional area.

### End-to-End Testing

End-to-end tests validate complete business workflows from data ingestion through calculation to user interface display. Key scenarios include:

1. **Locate Approval Workflow**: Testing the complete flow from locate request to approval/rejection
2. **Short Sell Validation**: Verifying the short sell approval process meets the 150ms SLA
3. **Position Calculation**: Validating that position calculations correctly reflect all input data
4. **Data Reconciliation**: Testing the weekly batch reconciliation process

E2E tests are implemented using Cypress and Playwright and are located in the `e2e/` directory.

### Performance Testing

Performance tests validate the system's ability to meet its performance requirements:

1. **Component-Level Performance Testing**: Microbenchmarking of critical calculation components
2. **Service-Level Load Testing**: Simulated load testing with realistic data volumes
3. **End-to-End Performance Testing**: Full system testing with simulated market data feeds
4. **Performance Regression Testing**: Automated performance tests in CI/CD pipeline

Performance tests are implemented using k6, Gatling, and JMeter and are located in the `performance/` directory.

Key performance requirements:
- Process 300,000+ events per second
- End-to-end latency under 200ms
- Short sell approval workflow under 150ms
- UI response under 3s (P95)

### Security Testing

Security tests validate the system's security controls and identify potential vulnerabilities:

1. **Static Application Security Testing (SAST)**: Automated code scanning for security vulnerabilities
2. **Dynamic Application Security Testing (DAST)**: Web application vulnerability scanning
3. **Infrastructure Security Testing**: Network security scanning and configuration review
4. **Manual Security Testing**: Penetration testing by security specialists

Security tests are located in the `security/` directory and are integrated into the CI/CD pipeline.

### Data Quality Testing

Data quality tests validate the accuracy and integrity of data processed by the system:

1. **Reference Data Validation**: Schema validation for all incoming data
2. **Calculation Validation**: Known-result testing with pre-calculated examples
3. **Data Integrity Testing**: Transaction integrity under failure conditions

Data quality tests are located in the `data-verification/` directory.

### Contract Testing

Contract tests validate that service APIs adhere to their contracts and that consumers and providers remain compatible:

1. **Consumer-Driven Contract Tests**: Verify that API consumers' expectations are met
2. **Provider Contract Tests**: Verify that API providers adhere to their contracts

Contract tests are implemented using Pact and are located in the `contract/` directory.

### Load Testing

Load tests validate the system's behavior under various load conditions:

1. **Normal Load**: Baseline performance under expected load
2. **Peak Load**: Performance under expected peak conditions
3. **Stress Testing**: Performance under extreme load conditions
4. **Endurance Testing**: Performance over extended periods
5. **Spike Testing**: Performance under sudden load increases

Load tests are located in the `load/` directory.

### Chaos Testing

Chaos tests validate the system's resilience to infrastructure and service failures:

1. **Network Failure**: Simulating network partitions and latency
2. **Service Failure**: Simulating service crashes and restarts
3. **Database Failure**: Simulating database failures and failovers
4. **Kafka Failure**: Simulating message broker failures
5. **Pod Failure**: Simulating Kubernetes pod failures

Chaos tests are implemented using Chaos Monkey and Litmus Chaos and are located in the `chaos/` directory.

## Test Environment Setup

The IMS test framework supports multiple test environments:

1. **Development**: Local development and testing environment
   - Docker Compose for local service dependencies
   - Mock external systems
   - Subset of test data

2. **Integration**: Shared test environment for integration testing
   - Dedicated test databases
   - Simulated external systems
   - Refreshed test data

3. **Staging**: Production-like environment for system validation
   - Full system deployment
   - Anonymized production data
   - Simulated external systems

4. **Production**: Live system with production data (limited testing)
   - Synthetic transactions
   - Monitoring validation
   - Canary deployments

## Test Data Management

The IMS test framework employs a comprehensive test data management strategy:

1. **Test Data Generation**: Creating realistic test data
   - Synthetic data generators for each data type
   - Anonymized production data
   - Market data simulators

2. **Test Data Storage**: Managing test datasets
   - Version-controlled test data
   - Containerized test databases
   - Data as code approach

3. **Test Data Refresh**: Keeping test data current
   - Automated refresh processes
   - Incremental updates for reference data
   - Daily market data updates

Test data fixtures are located in the `common/fixtures/` directory.

## Running Tests

### Prerequisites

- Node.js 18+
- Java 17 LTS
- Docker and Docker Compose
- Kubernetes CLI (kubectl)
- Access to test environments

### Common Test Commands

```bash
# Install test dependencies
npm install

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run security tests
npm run test:security

# Run all tests
npm test
```

### Environment-Specific Test Commands

```bash
# Run tests against development environment
npm test -- --env=dev

# Run tests against staging environment
npm test -- --env=staging

# Run tests against production environment (limited tests)
npm run test:prod
```

### CI/CD Integration

The test framework is integrated with the CI/CD pipeline:

1. **Pull Request Validation**: Unit tests, integration tests, security scans
2. **Merge to Develop**: Full test suite except performance and chaos tests
3. **Release Candidate**: Full test suite including performance and chaos tests
4. **Production Deployment**: Smoke tests and synthetic transactions

## Test Utilities

The IMS test framework provides several utilities to simplify test development:

1. **Test Data Utilities**: Functions for loading and manipulating test data
   - `loadTestData`: Load test data from fixture files
   - `generateRandomData`: Generate random test data based on templates

2. **API Testing Utilities**: Functions for testing APIs
   - `createMockAdapter`: Create mock API responses
   - `setupMockApi`: Set up common API mocks

3. **Performance Testing Utilities**: Functions for measuring performance
   - `measureExecutionTime`: Measure function execution time
   - `validatePerformance`: Validate performance against thresholds

4. **Validation Utilities**: Functions for validating test results
   - `compareObjects`: Compare objects with custom equality options
   - `waitForCondition`: Wait for a condition to be true with timeout

These utilities are located in the `common/` directory.

## Test Best Practices

When developing tests for the IMS, follow these best practices:

1. **Test Independence**: Each test should be independent and not rely on the state from other tests
2. **Test Data Management**: Use the provided utilities for test data management
3. **Mocking External Dependencies**: Mock external dependencies to ensure test reliability
4. **Performance Considerations**: Be mindful of performance requirements in tests
5. **Security Testing**: Include security validation in all relevant tests
6. **Test Documentation**: Document test purpose, requirements, and expected results
7. **Test Maintenance**: Keep tests up to date with system changes
8. **Test Coverage**: Ensure comprehensive coverage of requirements
9. **Test Automation**: Automate all tests that will be run repeatedly
10. **Test Reporting**: Use the provided reporting utilities for consistent reporting

## Quality Gates

The IMS test framework enforces several quality gates:

1. **Code Coverage**: Minimum code coverage requirements
   - 85% line coverage overall
   - 100% for calculation components

2. **Test Success Rate**: 100% pass rate for all tests

3. **Performance Thresholds**:
   - Event processing: <200ms (P99)
   - Short sell approval: <150ms (P99)
   - UI response: <3s (P95)

4. **Security Vulnerabilities**: Zero high or critical vulnerabilities

These quality gates are enforced in the CI/CD pipeline and must be passed for deployment to proceed.

## Test Reporting

The IMS test framework generates comprehensive test reports:

1. **JUnit XML Reports**: Standard test result format for CI integration
2. **HTML Reports**: Human-readable test reports
3. **Coverage Reports**: Code coverage reports
4. **Performance Reports**: Performance test results and trends
5. **Security Reports**: Security scan results

Reports are generated in the `reports/` directory and are also available in the CI/CD pipeline.

## Troubleshooting

Common issues and their solutions:

1. **Test Environment Issues**:
   - Check environment configuration in `.env` files
   - Verify Docker containers are running
   - Check network connectivity to test environments

2. **Test Data Issues**:
   - Verify test data fixtures are up to date
   - Check for data corruption in test databases
   - Ensure test data is properly isolated

3. **Performance Test Issues**:
   - Check for resource contention on test machines
   - Verify performance test configuration
   - Ensure test environment is properly sized

4. **Integration Test Issues**:
   - Check service dependencies are available
   - Verify API contracts are up to date
   - Check for network connectivity issues

For additional help, contact the test engineering team.

## Contributing

When contributing to the test framework:

1. Follow the established test patterns and conventions
2. Ensure tests are properly documented
3. Include appropriate assertions and validations
4. Verify tests work in all supported environments
5. Update test documentation as needed
6. Submit test changes with corresponding code changes
7. Include test results in pull requests

## References

- [Technical Specifications](../docs/technical-specifications.md)
- [API Documentation](../docs/api-docs.md)
- [System Architecture](../docs/architecture.md)
- [Test Strategy](../docs/test-strategy.md)
- [Performance Requirements](../docs/performance-requirements.md)
- [Security Requirements](../docs/security-requirements.md)