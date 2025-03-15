// ***********************************************************
// This is the main support file for Cypress end-to-end tests.
// It is processed and loaded automatically before test files.
// ***********************************************************

// Import Cypress and support libraries
import 'cypress';
import '@cypress/code-coverage/support';
import '@testing-library/cypress';

// Import custom commands
import './commands';

// Import performance thresholds
import { PERFORMANCE_THRESHOLDS } from '../../../common/constants';

// Configure code coverage collection
// This enables collection of code coverage data during e2e tests
// which will be aggregated with unit test coverage

// Set up global test hooks
beforeEach(() => {
  // Preserve cookies between tests to maintain authentication state
  Cypress.Cookies.preserveOnce('auth_session', 'sessionid', 'connect.sid');
  
  // Clear localStorage except for authentication tokens
  cy.window().then((win) => {
    const authToken = win.localStorage.getItem('auth_token');
    win.localStorage.clear();
    if (authToken) {
      win.localStorage.setItem('auth_token', authToken);
    }
  });
  
  // Set viewport size to ensure consistent UI testing
  cy.viewport(1280, 720);
  
  // Configure performance monitoring for UI operations
  Cypress.env('performanceMonitoring', {
    enabled: true,
    threshold: PERFORMANCE_THRESHOLDS.UI_RESPONSE, // 3 seconds for UI operations
    logResults: true
  });
});

afterEach(() => {
  // Check for console errors during test execution
  // This helps catch runtime errors in the application
  cy.window().then((win) => {
    // If there are any error logs, the test should fail
    if (Cypress.env('failOnConsoleError') !== false) {
      expect(win.console.error).to.have.callCount(0);
    }
  });
  
  // Log performance metrics if enabled
  if (Cypress.env('performanceMonitoring')?.enabled && 
      Cypress.env('performanceMonitoring')?.logResults) {
    cy.task('logPerformanceMetrics', Cypress.env('currentTestPerformance') || {}).catch(() => {
      // Ignore errors if task doesn't exist
    });
  }
  
  // Reset performance metrics for next test
  Cypress.env('currentTestPerformance', {});
});

// Register error handler to capture uncaught exceptions
Cypress.on('uncaught:exception', (err) => {
  // Log the error for debugging
  console.error('Uncaught exception:', err);
  
  // Return false to prevent the error from failing the test
  // Change this behavior by setting failOnUncaughtError to true
  return !Cypress.env('failOnUncaughtError');
});

// Register before:screenshot event to handle any UI state preparation before screenshots
Cypress.on('before:screenshot', () => {
  // Hide any application toast messages that might obscure the UI
  cy.get('.Toastify__toast', { timeout: 1000 })
    .then($toasts => {
      if ($toasts.length) {
        cy.get('.Toastify__close-button').click({ multiple: true });
      }
    })
    .catch(() => {
      // Ignore errors if no toasts exist
    });
});