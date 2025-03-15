# Contract Testing

This directory contains contract tests for the Inventory Management System (IMS). Contract tests validate that API providers and consumers adhere to the agreed-upon contracts, ensuring reliable integration between services.

## Overview

The IMS uses the Pact framework for contract testing, implementing a consumer-driven contract testing approach. This ensures that service providers fulfill the expectations of their consumers, reducing integration issues and enabling independent service evolution.

## Directory Structure

```
./contract/
├── pact/
│   ├── consumer/         # Consumer-side contract tests
│   │   ├── webConsumerTests.ts
│   │   ├── dataIngestionConsumerTests.ts
│   │   ├── calculationConsumerTests.ts
│   │   └── workflowConsumerTests.ts
│   ├── provider/         # Provider-side contract tests
│   │   ├── dataIngestionProviderTests.ts
│   │   ├── calculationProviderTests.ts
│   │   ├── workflowProviderTests.ts
│   │   └── apiGatewayProviderTests.ts
│   ├── pacts/            # Generated pact files
│   └── jest.config.ts    # Jest configuration for contract tests
└── README.md            # This file
```

## Test Approach

The contract testing approach follows these principles:

1. **Consumer-Driven**: Consumers define their expectations of provider APIs
2. **Bidirectional Verification**: Both consumers and providers verify the contracts
3. **Automated**: Tests run as part of the CI/CD pipeline
4. **Performance Aware**: Critical endpoints include performance validation

### Consumer Tests

Consumer tests define the expectations that consumers have of provider APIs. These tests:

- Define the expected request/response format
- Generate pact files that document these expectations
- Verify that the consumer code correctly interacts with the provider API
- Include performance expectations for critical endpoints (e.g., short sell validation)

### Provider Tests

Provider tests verify that the provider implementation fulfills the contracts defined by consumers. These tests:

- Verify the provider against pact files from consumers
- Set up provider states for different test scenarios
- Ensure backward compatibility when evolving APIs
- Validate that performance requirements are met

## Key Service Contracts

The IMS implements contract tests for the following key service interactions:

### Web UI to API Gateway

Validates that the web frontend correctly interacts with backend APIs for:
- Reference data retrieval
- Position and inventory data access
- Locate request submission and management
- Short sell order validation
- Calculation rule management
- Authentication and user management

### Data Ingestion Service

Validates contracts for:
- Reference data ingestion (batch and real-time)
- Market data ingestion
- Trade data processing
- Contract data handling

### Calculation Service

Validates contracts for:
- Position calculation
- Inventory availability calculation
- Client and aggregation unit limit calculation
- Calculation rule application

### Workflow Service

Validates contracts for:
- Locate request processing
- Short sell order validation
- Workflow rule management

## Performance Requirements

Contract tests for performance-critical endpoints include validation against defined SLAs:

- Short sell validation: < 150ms response time
- API responses: < 500ms for standard endpoints

These thresholds are defined in the `PERFORMANCE_THRESHOLDS` constants and validated during contract testing.

## Running Tests

To run the contract tests:

```bash
# Run all contract tests
npm run test:contract

# Run only consumer tests
npm run test:contract:consumer

# Run only provider tests
npm run test:contract:provider
```

## Pact Broker Integration

In CI/CD environments, the tests integrate with a Pact Broker to share contracts between services:

1. Consumer CI builds run consumer tests and publish pacts to the broker
2. Provider CI builds verify against the latest pacts from the broker
3. Deployment is only allowed if all contract verifications pass

## Adding New Contracts

To add a new contract test:

1. For consumers:
   - Create a new test file in the `consumer` directory
   - Define the expected interactions with the provider
   - Run the tests to generate pact files

2. For providers:
   - Create a new test file in the `provider` directory
   - Implement provider state handlers for test scenarios
   - Verify against the pact files from consumers

## Best Practices

When writing contract tests:

1. Focus on the contract, not implementation details
2. Use flexible matching for fields that may change
3. Include only the fields that the consumer actually uses
4. Define clear provider states for different scenarios
5. Validate performance for critical endpoints
6. Keep pact files in version control for tracking changes

## Related Documentation

- [Pact Documentation](https://docs.pact.io/)
- [Contract Testing Strategy](../../docs/testing/contract-testing-strategy.md)
- [API Specifications](../../docs/api/api-specifications.md)