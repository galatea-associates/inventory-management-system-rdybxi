import { defineConfig, devices } from '@playwright/test';
import { TEST_TIMEOUTS, PERFORMANCE_THRESHOLDS } from '../../common/constants';

/**
 * Helper function to determine the base URL based on environment
 * @returns The base URL for the application under test
 */
function getBaseUrl(): string {
  // Use environment variable if set
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  
  // Use environment-specific URLs
  switch (process.env.NODE_ENV) {
    case 'production':
      return 'https://ims.example.com';
    case 'staging':
      return 'https://staging.ims.example.com';
    case 'development':
      return 'https://dev.ims.example.com';
    default:
      // Default to localhost for local development
      return 'http://localhost:3000';
  }
}

/**
 * Playwright configuration for end-to-end testing in the Inventory Management System.
 * This configuration supports testing across multiple browsers and device types,
 * with appropriate settings for both local development and CI environments.
 */
export default defineConfig({
  // Directory where test files are located
  testDir: './tests',
  
  // Pattern to match test files
  testMatch: '**/*.spec.ts',
  
  // Global timeout for tests (1 minute)
  timeout: TEST_TIMEOUTS.E2E,
  
  // Timeout for individual expect statements (30 seconds)
  expect: {
    timeout: TEST_TIMEOUTS.E2E / 2,
  },
  
  // Run all tests in parallel for better efficiency
  fullyParallel: true,
  
  // Prohibit using .only in CI environment to ensure all tests run
  forbidOnly: !!process.env.CI,
  
  // Retry policy: retry twice in CI, no retries in development
  retries: {
    runMode: process.env.CI ? 2 : 0,
    testMode: 0, // No retries during interactive development
  },
  
  // Number of workers for parallel execution
  // Use 3/4 of available CPUs in CI or default to automatic in local development
  workers: process.env.CI ? Math.ceil(require('os').cpus().length * 0.75) : undefined,
  
  // Reporters for test results
  reporter: [
    ['html', { open: 'never' }], // HTML reporter, don't open automatically
    ['junit', { outputFile: 'test-results/junit-report.xml' }], // JUnit XML for CI integration
    ['list'] // Console reporter for immediate feedback
  ],
  
  // Global test configuration
  use: {
    // Base URL for all tests
    baseURL: getBaseUrl(),
    
    // Trace collection on first retry to help diagnose flaky tests
    trace: 'on-first-retry',
    
    // Screenshot on test failure for debugging
    screenshot: 'only-on-failure',
    
    // Video recording on test failure for debugging complex interactions
    video: 'retain-on-failure',
    
    // Timeout for actions (clicks, fills, etc.) - 30 seconds
    actionTimeout: TEST_TIMEOUTS.E2E / 2,
    
    // Timeout for navigations - 60 seconds
    navigationTimeout: TEST_TIMEOUTS.E2E,
    
    // Test performance against UI response threshold
    testIdAttribute: 'data-testid',
  },
  
  // Different browser and device configurations for cross-browser testing
  projects: [
    // Desktop Chrome (primary browser)
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          // Arguments for stable execution in CI environments
          args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage']
        }
      },
    },
    // Desktop Firefox
    {
      name: 'firefox',
      use: {
        browserName: 'firefox',
        viewport: { width: 1280, height: 720 },
      },
    },
    // Desktop Safari
    {
      name: 'webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 1280, height: 720 },
      },
    },
    // Mobile Chrome (Pixel 5)
    {
      name: 'mobile-chrome',
      use: {
        browserName: 'chromium',
        ...devices['Pixel 5'],
      },
    },
    // Mobile Safari (iPhone 12)
    {
      name: 'mobile-safari',
      use: {
        browserName: 'webkit',
        ...devices['iPhone 12'],
      },
    },
    // Tablet (iPad Pro)
    {
      name: 'tablet',
      use: {
        browserName: 'chromium',
        ...devices['iPad Pro 11'],
      },
    },
  ],
  
  // Directory for test artifacts (screenshots, videos, traces)
  outputDir: 'test-results',
  
  // Web server configuration for local testing
  webServer: {
    command: 'npm run start:test', // Command to start the application for testing
    url: getBaseUrl(), // URL to wait for before starting tests
    reuseExistingServer: true, // Reuse already running server if available
    timeout: TEST_TIMEOUTS.E2E * 2, // Allow extra time for server startup
  },
});