# Inventory Management System - End-to-End Testing

This directory contains the end-to-end (E2E) test suite for the Inventory Management System (IMS). The E2E tests validate complete business workflows from data ingestion through calculation to user interface display, ensuring that all system components work together correctly.

## Testing Frameworks

The IMS E2E testing strategy employs two complementary frameworks to ensure comprehensive coverage and cross-browser validation:

### Cypress

Cypress is used as the primary E2E testing framework for its developer-friendly experience, time-travel debugging capabilities, and robust handling of asynchronous operations. Cypress tests are located in the `cypress/` directory.

### Playwright

Playwright is used as a secondary E2E framework to ensure cross-browser compatibility and to leverage its advanced capabilities for testing complex scenarios. Playwright tests are located in the `playwright/` directory.

## Directory Structure

```
├── cypress/
│   ├── fixtures/         # Test data files
│   ├── integration/      # Test files organized by feature
│   │   ├── auth/         # Authentication tests
│   │   ├── dashboard/    # Dashboard tests
│   │   ├── positions/    # Position view tests
│   │   ├── inventory/    # Inventory tests
│   │   ├── locates/      # Locate management tests
│   │   ├── exceptions/   # Exception management tests
│   │   └── rules/        # Calculation rule tests
│   ├── support/          # Support files and commands
│   ├── screenshots/      # Test failure screenshots
│   └── videos/           # Test execution recordings
├── playwright/
│   ├── tests/            # Test files organized by feature
│   │   ├── auth/         # Authentication tests
│   │   ├── dashboard/    # Dashboard tests
│   │   ├── positions/    # Position view tests
│   │   ├── inventory/    # Inventory tests
│   │   ├── locates/      # Locate management tests
│   │   ├── exceptions/   # Exception management tests
│   │   └── rules/        # Calculation rule tests
│   ├── setup/            # Setup and teardown scripts
│   └── test-results/     # Test results and artifacts
├── cypress.config.ts     # Cypress configuration
├── playwright.config.ts  # Playwright configuration
└── README.md             # This documentation file
```

## Key Test Scenarios

The E2E test suite covers the following key business workflows:

### Locate Approval Workflow

Tests the complete flow from locate request submission to approval/rejection, including:
- Auto-approval based on rules
- Manual approval process
- Inventory validation
- Locate request queuing
- Approval/rejection notifications

### Short Sell Validation

Verifies the short sell approval process meets the 150ms SLA, including:
- Client limit validation
- Aggregation unit limit validation
- Order validation against limits
- Performance measurement
- Error handling for insufficient limits

### Position Calculation

Validates that position calculations correctly reflect all input data, including:
- Start-of-day position loading
- Intraday trade updates
- Settlement ladder projections
- Corporate action handling
- Position aggregation and filtering

### Inventory Dashboard

Tests the inventory dashboard functionality, including:
- Inventory category visualization
- Filtering and aggregation
- Real-time updates
- Export functionality
- Drill-down to detailed views

### Exception Management

Validates the exception management workflow, including:
- Exception queue display
- Exception filtering and sorting
- Exception detail view
- Exception resolution workflow
- Exception reporting

### Calculation Rule Management

Tests the calculation rule management functionality, including:
- Rule creation and editing
- Rule validation
- Rule versioning
- Rule deployment
- Rule testing

## Setup and Configuration

### Prerequisites

- Node.js 18+
- npm 8+
- Chrome, Firefox, and Edge browsers installed
- Access to test environments

### Installation

```bash
# Install dependencies
npm install

# Install browsers for Playwright (if not already installed)
npx playwright install
```

### Configuration

Both Cypress and Playwright are configured to run against the IMS web application. The configuration files (`cypress.config.ts` and `playwright.config.ts`) contain settings for:

- Base URL for the application
- Viewport dimensions
- Browser configurations
- Timeout settings
- Screenshot and video recording options
- Reporting options

Environment-specific configurations are managed through environment variables or separate configuration files for different environments (dev, staging, production).

## Running Tests

### Cypress Tests

```bash
# Run all Cypress tests in headless mode
npm run test:e2e:cypress

# Run specific Cypress tests
npm run test:e2e:cypress -- --spec "cypress/integration/dashboard/*.cy.ts"

# Open Cypress Test Runner for interactive testing
npm run cypress:open
```

### Playwright Tests

```bash
# Run all Playwright tests
npm run test:e2e:playwright

# Run specific Playwright tests
npm run test:e2e:playwright -- tests/dashboard/

# Run tests in specific browsers
npm run test:e2e:playwright -- --project=chromium
npm run test:e2e:playwright -- --project=firefox
npm run test:e2e:playwright -- --project=webkit

# Run tests in debug mode
npm run test:e2e:playwright -- --debug
```

### Running Against Different Environments

```bash
# Run against development environment
npm run test:e2e -- --env=dev

# Run against staging environment
npm run test:e2e -- --env=staging

# Run against production environment (limited tests)
npm run test:e2e:prod
```

## Test Implementation Guidelines

### Page Object Pattern

Both Cypress and Playwright tests use the Page Object pattern to encapsulate page structure and behavior. Page objects are located in the `support/pages` directory for Cypress and `tests/pages` directory for Playwright.

Example page object:
```typescript
// cypress/support/pages/DashboardPage.ts
export class DashboardPage {
  // Selectors
  private systemStatusSelector = '[data-testid="system-status"]';
  private inventorySummarySelector = '[data-testid="inventory-summary"]';
  private locateRequestsSelector = '[data-testid="locate-requests"]';
  
  // Actions
  visit() {
    cy.visit('/dashboard');
    this.waitForPageLoad();
    return this;
  }
  
  waitForPageLoad() {
    cy.get(this.systemStatusSelector).should('be.visible');
    cy.get(this.inventorySummarySelector).should('be.visible');
    cy.get(this.locateRequestsSelector).should('be.visible');
    return this;
  }
  
  // Assertions
  verifySystemStatus() {
    cy.get(this.systemStatusSelector).within(() => {
      cy.get('[data-testid="uptime"]').should('be.visible');
      cy.get('[data-testid="status-indicator"]').should('have.class', 'status-healthy');
    });
    return this;
  }
}
```

### Test Data Management

Test data is managed through fixture files located in the `cypress/fixtures` directory. Common test data includes:

- User credentials for different roles
- Security reference data
- Position data
- Inventory data
- Locate request data

Tests should use the provided utility functions to load and manipulate test data:

```typescript
// Load test data from fixture
const securities = loadTestData('securities.json');

// Generate random test data based on template
const locateRequest = generateRandomLocateRequest();
```

### API Mocking

Both Cypress and Playwright support API mocking to control test data and simulate various scenarios:

```typescript
// Cypress API mocking
cy.intercept('GET', '/api/inventory/summary', { fixture: 'inventorySummary.json' }).as('getInventorySummary');

// Playwright API mocking
await page.route('/api/inventory/summary', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(inventorySummaryData)
  });
});
```

### Performance Testing

E2E tests include performance validation for critical user interactions:

```typescript
// Measure and validate dashboard load time
const startTime = Date.now();
cy.visit('/dashboard');
cy.get('[data-testid="dashboard-loaded"]').should('be.visible').then(() => {
  const loadTime = Date.now() - startTime;
  expect(loadTime).to.be.lessThan(PERFORMANCE_THRESHOLDS.UI_LOAD);
});
```

### Accessibility Testing

E2E tests include accessibility validation using axe-core:

```typescript
// Cypress accessibility testing
cy.visit('/dashboard');
cy.injectAxe();
cy.checkA11y();

// Playwright accessibility testing
await page.goto('/dashboard');
const accessibilityScanResults = await page.accessibility.snapshot();
expect(accessibilityScanResults.violations).toHaveLength(0);
```

### Visual Testing

Visual regression testing is implemented for critical UI components:

```typescript
// Cypress visual testing
cy.get('[data-testid="inventory-summary"]').matchImageSnapshot('inventory-summary');

// Playwright visual testing
await expect(page.locator('[data-testid="inventory-summary"]')).toHaveScreenshot('inventory-summary.png');
```

## CI/CD Integration

The E2E tests are integrated into the CI/CD pipeline with the following workflow:

1. **Pull Request Validation**: Basic E2E tests for critical paths
2. **Merge to Develop**: Full E2E test suite in headless mode
3. **Release Candidate**: Full E2E test suite across all supported browsers
4. **Production Deployment**: Smoke tests for critical functionality

Test results and artifacts (screenshots, videos) are stored as build artifacts and are available for review in the CI/CD system.

## Best Practices

When developing E2E tests for the IMS, follow these best practices:

1. **Test Independence**: Each test should be independent and not rely on the state from other tests
2. **Realistic User Flows**: Tests should simulate realistic user interactions
3. **Appropriate Waiting**: Use explicit waiting for elements rather than arbitrary timeouts
4. **Resilient Selectors**: Use data-testid attributes for element selection
5. **Error Handling**: Include appropriate error handling and reporting
6. **Performance Awareness**: Be mindful of performance requirements in tests
7. **Cross-Browser Compatibility**: Ensure tests work across all supported browsers
8. **Maintainability**: Structure tests for easy maintenance and updates
9. **Documentation**: Document test purpose, requirements, and expected results
10. **Continuous Improvement**: Regularly review and improve test coverage and quality

## Troubleshooting

Common issues and their solutions:

1. **Flaky Tests**:
   - Use explicit waiting instead of implicit waits
   - Ensure proper isolation between tests
   - Add retry logic for network operations
   - Use stable selectors (data-testid attributes)

2. **Performance Issues**:
   - Reduce the number of unnecessary actions in tests
   - Use API shortcuts instead of UI interactions where appropriate
   - Optimize test data setup
   - Run tests in parallel when possible

3. **Browser Compatibility Issues**:
   - Use browser-agnostic selectors and interactions
   - Test explicitly in all supported browsers
   - Document browser-specific workarounds

4. **Test Environment Issues**:
   - Ensure consistent test data across environments
   - Verify environment configuration
   - Use environment-specific configuration files

For additional help, check the test logs, screenshots, and videos generated during test execution.

## References

- [Cypress Documentation](https://docs.cypress.io/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [IMS Technical Specifications](../../docs/technical-specifications.md)
- [IMS Test Strategy](../../docs/test-strategy.md)
- [IMS UI Component Library](../../web/src/components/README.md)