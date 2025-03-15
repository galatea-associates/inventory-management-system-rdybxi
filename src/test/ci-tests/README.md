# Inventory Management System - CI/CD Test Framework

This directory contains test configurations and utilities for validating the Inventory Management System (IMS) through Continuous Integration and Continuous Deployment (CI/CD) pipelines. The framework supports multiple CI/CD platforms including Jenkins, GitHub Actions, and GitLab CI.

## CI/CD Platform Support

The IMS CI/CD test framework supports the following platforms:

1. **Jenkins**: Enterprise-grade automation server with extensive plugin ecosystem
2. **GitHub Actions**: Integrated CI/CD with the source code management
3. **GitLab CI**: Integrated CI/CD with the source code management

Each platform has a dedicated directory with platform-specific configurations and test utilities.

## Directory Structure

- `jenkins/`: Jenkins pipeline configurations and test utilities
  - `Jenkinsfile.test`: Test pipeline configuration for Jenkins
  - `scripts/`: Helper scripts for Jenkins pipelines

- `github/`: GitHub Actions configurations and test utilities
  - `github-actions-test.yml`: Test workflow configuration for GitHub Actions
  - `scripts/`: Helper scripts for GitHub Actions workflows

- `gitlab/`: GitLab CI configurations and test utilities
  - `gitlab-ci.test.yml`: Test pipeline configuration for GitLab CI
  - `scripts/`: Helper scripts for GitLab CI pipelines

- `common/`: Common test utilities and configurations shared across platforms
  - `scripts/`: Common helper scripts
  - `templates/`: Common configuration templates

## Pipeline Stages

The CI/CD test pipelines include the following stages:

1. **Build**: Compiles the application code
   - Build backend services using Gradle
   - Build frontend application using npm
   - Generate build artifacts

2. **Unit Tests**: Runs unit tests for all components
   - Run backend unit tests using Gradle
   - Run frontend unit tests using Jest
   - Collect and publish test results
   - Generate code coverage reports

3. **Integration Tests**: Runs integration tests to validate component interactions
   - Set up integration test environment
   - Run integration tests using Gradle and Jest
   - Collect and publish test results

4. **End-to-End Tests**: Runs end-to-end tests to validate complete workflows
   - Set up E2E test environment
   - Run E2E tests using Cypress or Playwright
   - Collect and publish test results
   - Capture screenshots and videos of test execution

5. **Performance Tests**: Runs performance tests to validate system performance
   - Set up performance test environment
   - Run performance tests using k6, Gatling, or JMeter
   - Collect and publish performance metrics
   - Validate performance against thresholds

6. **Security Tests**: Runs security scans to identify vulnerabilities
   - Run dependency vulnerability scans
   - Run SAST (Static Application Security Testing)
   - Run DAST (Dynamic Application Security Testing)
   - Collect and publish security reports

## Pipeline Triggers

The CI/CD test pipelines can be triggered by the following events:

1. **Push Events**: Triggered when code is pushed to specific branches
   - `main`: Production branch
   - `develop`: Development branch
   - `feature/*`: Feature branches
   - `release/*`: Release branches
   - `hotfix/*`: Hotfix branches

2. **Pull Request Events**: Triggered when pull requests are created or updated
   - Pull requests to `main`
   - Pull requests to `develop`

3. **Tag Events**: Triggered when tags are created
   - Tags matching `v*` (version tags)

4. **Schedule Events**: Triggered on a schedule
   - Nightly builds
   - Weekly security scans

5. **Manual Events**: Triggered manually by users
   - On-demand performance tests
   - On-demand security scans

## Pipeline Parameters

The CI/CD test pipelines support the following parameters:

1. **RUN_PERFORMANCE_TESTS**: Flag to control execution of performance tests
   - Type: Boolean
   - Default: `false`

2. **RUN_SECURITY_TESTS**: Flag to control execution of security tests
   - Type: Boolean
   - Default: `false`

3. **TEST_ENVIRONMENT**: Target environment for tests
   - Type: String
   - Default: `dev`
   - Options: `dev`, `staging`, `prod`

4. **PARALLEL_WORKERS**: Number of parallel test workers
   - Type: Integer
   - Default: `4`

## Quality Gates

The CI/CD test pipelines enforce the following quality gates:

1. **Code Coverage**: Minimum code coverage requirements
   - 85% line coverage overall
   - 100% for calculation components

2. **Test Success Rate**: 100% pass rate for all tests

3. **Performance Thresholds**:
   - Event processing: <200ms (P99)
   - Short sell approval: <150ms (P99)
   - UI response: <3s (P95)

4. **Security Vulnerabilities**: Zero high or critical vulnerabilities

Failure to meet these quality gates will cause the pipeline to fail, preventing deployment of substandard code.

## Environment Configuration

The CI/CD test pipelines support the following environments:

1. **Development**: For testing feature branches
   - Isolated test environment
   - Synthetic test data
   - Mocked external dependencies

2. **Staging**: For testing release candidates
   - Production-like environment
   - Anonymized production data
   - Simulated external dependencies

3. **Production**: For validating production deployments
   - Production environment
   - Limited testing scope
   - Synthetic transactions only

## Test Reporting

The CI/CD test pipelines generate the following reports:

1. **JUnit Reports**: Standard test result format for CI integration
   - Backend test results
   - Frontend test results
   - Integration test results
   - E2E test results

2. **Coverage Reports**: Code coverage reports
   - JaCoCo for Java code
   - Istanbul for JavaScript code

3. **Performance Reports**: Performance test results
   - k6 reports
   - Gatling reports
   - JMeter reports

4. **Security Reports**: Security scan results
   - OWASP Dependency Check reports
   - SonarQube security reports
   - OWASP ZAP reports

These reports are published as pipeline artifacts and can be viewed in the CI/CD platform's UI.

## Pipeline Customization

The CI/CD test pipelines can be customized in the following ways:

1. **Environment Variables**: Set environment variables to control pipeline behavior
   - `GRADLE_OPTS`: Gradle options
   - `NODE_ENV`: Node.js environment
   - `TEST_RESULTS_DIR`: Directory for test results

2. **Pipeline Parameters**: Set parameters to control pipeline execution
   - See the Pipeline Parameters section for available parameters

3. **Configuration Files**: Modify configuration files to customize pipeline behavior
   - `.jenkins/config.json`: Jenkins pipeline configuration
   - `.github/workflows/config.json`: GitHub Actions configuration
   - `.gitlab-ci/config.json`: GitLab CI configuration

## Best Practices

When working with the CI/CD test pipelines, follow these best practices:

1. **Pipeline Efficiency**:
   - Use caching to speed up builds
   - Parallelize tests where possible
   - Use incremental builds

2. **Test Reliability**:
   - Ensure tests are idempotent
   - Avoid dependencies between tests
   - Handle test data cleanup

3. **Security**:
   - Secure sensitive data using secrets management
   - Scan dependencies for vulnerabilities
   - Validate inputs to prevent injection attacks

4. **Monitoring**:
   - Monitor pipeline performance
   - Track test success rates
   - Analyze test coverage trends

## Troubleshooting

Common issues and their solutions:

1. **Pipeline Failures**:
   - Check build logs for error messages
   - Verify environment configuration
   - Check for resource constraints

2. **Test Failures**:
   - Check test logs for failure details
   - Verify test data is available
   - Check for environment-specific issues

3. **Performance Issues**:
   - Check for resource contention
   - Verify test environment sizing
   - Check for network latency

4. **Security Scan Issues**:
   - Check for false positives
   - Verify security scan configuration
   - Check for outdated dependencies

## References

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI Documentation](https://docs.gitlab.com/ee/ci/)
- [IMS Test Strategy](../../docs/test-strategy.md)
- [IMS CI/CD Strategy](../../docs/ci-cd-strategy.md)