# Integration Testing Framework

This directory contains integration tests for the Inventory Management System (IMS). Integration tests validate the interactions between multiple system components, ensuring they work together correctly to fulfill business requirements.

## Test Architecture

The integration tests use Jest as the test runner and are written in TypeScript. Tests are organized by functional domain (data-ingestion, calculation, workflow, api) and focus on validating end-to-end flows across service boundaries.

## Test Environment

Integration tests run against a containerized environment that includes:

- Service containers for each microservice
- Database containers (PostgreSQL, TimescaleDB, Cassandra)
- Message broker (Kafka)
- Mock external services

The environment is automatically set up before tests run and torn down afterward using the global setup/teardown scripts.

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Access to the project's npm registry
- At least 8GB of RAM available for Docker

## Running Tests

### Running All Integration Tests

```bash
npm run test:integration
```

### Running Specific Test Suites

```bash
npm run test:integration -- -t "Reference Data Ingestion"
```

### Running Tests with Debugging

```bash
DEBUG=true npm run test:integration
```

## Test Structure

Integration tests are organized into the following directories:

- `data-ingestion/`: Tests for data ingestion services (reference data, market data, trade data)
- `calculation/`: Tests for calculation services (position, inventory, limits)
- `workflow/`: Tests for workflow services (locate approval, short sell approval)
- `api/`: Tests for API layer (REST, GraphQL, WebSocket)

Each test file follows the naming convention `*.integration.test.ts` or `*.test.ts`.

## Test Data Management

Test data is managed through fixture files located in `src/test/common/fixtures/`. These files contain JSON data that is loaded during test setup.

Key fixture files include:
- `securities.json`: Test security reference data
- `counterparties.json`: Test counterparty data
- `positions.json`: Test position data
- `locates.json`: Test locate request data
- `inventories.json`: Test inventory data

Tests should avoid modifying these fixture files directly and instead create derived test data as needed.

## Global Setup and Teardown

The integration test environment is set up and torn down using the following files:

- `setup/globalSetup.ts`: Runs before all tests to set up the environment
- `setup/globalTeardown.ts`: Runs after all tests to clean up the environment

These scripts handle:
- Starting required Docker containers
- Initializing test databases
- Setting up test data
- Configuring environment variables
- Cleaning up resources after tests complete

## Performance Validation

Integration tests include performance validation to ensure system components meet the performance requirements specified in the technical specifications:

- Event processing: <200ms end-to-end latency
- Short sell approval: <150ms response time
- Locate approval: <2s (P95)

Performance is measured using the `measureExecutionTime` utility and validated against thresholds defined in `src/test/common/constants.ts`.

## Writing New Integration Tests

When writing new integration tests:

1. Create a new test file in the appropriate directory
2. Import necessary test utilities and fixtures
3. Define test cases that validate end-to-end functionality
4. Use the provided helper functions for common operations
5. Ensure tests clean up after themselves
6. Include performance validation where appropriate

Example test structure:

```typescript
describe('Feature Integration Tests', () => {
  beforeAll(async () => {
    // Set up test prerequisites
  });

  afterAll(async () => {
    // Clean up test resources
  });

  it('should perform expected behavior', async () => {
    // Arrange: Set up test data
    // Act: Perform the operation being tested
    // Assert: Verify the expected outcome
  });
});
```

## Common Utilities

The integration tests use several utility functions from `src/test/common/testUtils.ts`:

- `loadTestData`: Loads test data from fixture files
- `waitForCondition`: Waits for an asynchronous condition to be met
- `measureExecutionTime`: Measures execution time of functions for performance testing
- `validatePerformance`: Validates function performance against thresholds
- `setupTestEnvironment`: Sets up the test environment for a specific test
- `cleanupTestEnvironment`: Cleans up the test environment after tests

Refer to the utility implementations for detailed usage information.

## Troubleshooting

### Common Issues

- **Tests timeout**: Increase the timeout value in `jest.config.ts` or for specific tests
- **Docker services fail to start**: Check Docker logs and ensure ports are available
- **Database connection errors**: Verify database containers are running and accessible
- **Kafka connection issues**: Check Kafka broker status and configuration

### Debugging

- Set `DEBUG=true` environment variable for verbose logging
- Use `console.log` statements (they will be captured in test output)
- Inspect Docker logs: `docker-compose logs -f [service]`
- Check test database state: `docker exec -it [db-container] psql -U [user] -d [database]`

## CI/CD Integration

Integration tests are run as part of the CI/CD pipeline:

- Pull requests: Basic integration test suite
- Merge to develop: Full integration test suite
- Release candidates: Full integration test suite with performance validation

Test results and performance metrics are published to the CI/CD dashboard and archived for trend analysis.