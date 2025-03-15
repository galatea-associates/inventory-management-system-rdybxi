import { test, expect } from '@playwright/test';
import { TEST_USERS, PERFORMANCE_THRESHOLDS } from '../../../common/constants';
import { loadTestData } from '../../../common/testUtils';

// Load mock test data for exceptions
const mockExceptionList = loadTestData('./src/test/fixtures/exceptions/exceptionList.json');
const mockExceptionDetail = loadTestData('./src/test/fixtures/exceptions/exceptionDetail.json');
const mockExceptionStats = loadTestData('./src/test/fixtures/exceptions/exceptionStats.json');

/**
 * Helper function to log in as a specific user
 * @param page Playwright page object
 * @param userType Type of user to log in as (e.g., 'operations', 'compliance')
 * @returns Promise that resolves when login is complete
 */
async function loginAsUser(page, userType) {
  await page.goto('/login');
  const user = TEST_USERS[userType];
  await page.fill('[data-testid="username-input"]', user.username);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
}

/**
 * Helper function to navigate to the exceptions page
 * @param page Playwright page object
 * @returns Promise that resolves when navigation is complete
 */
async function navigateToExceptionsPage(page) {
  await page.click('[data-testid="sidebar-exceptions"]');
  await page.waitForSelector('[data-testid="exception-management-title"]');
  await expect(page.locator('[data-testid="exception-management-title"]')).toHaveText('Exception Management');
}

/**
 * Helper function to select a filter option
 * @param page Playwright page object
 * @param filterName Name of the filter (e.g., 'type', 'severity', 'status')
 * @param filterValue Value to select for the filter
 * @returns Promise that resolves when filter is applied
 */
async function selectExceptionFilter(page, filterName, filterValue) {
  await page.click(`[data-testid="filter-${filterName}"]`);
  await page.click(`[data-testid="filter-option-${filterValue}"]`);
  await page.waitForResponse(response => 
    response.url().includes('/api/v1/exceptions') && response.status() === 200
  );
}

/**
 * Helper function to select a date range filter option
 * @param page Playwright page object
 * @param dateRangeOption Date range option to select (e.g., 'Last 24 Hours', 'Last 7 Days')
 * @returns Promise that resolves when date range filter is applied
 */
async function selectDateRangeFilter(page, dateRangeOption) {
  await page.click('[data-testid="filter-date-range"]');
  await page.click(`[data-testid="date-option-${dateRangeOption}"]`);
  await page.waitForResponse(response => 
    response.url().includes('/api/v1/exceptions') && response.status() === 200
  );
}

/**
 * Helper function to select an exception from the queue
 * @param page Playwright page object
 * @param rowIndex Index of the exception to select (default: 0 for first row)
 * @returns Promise that resolves when exception is selected
 */
async function selectException(page, rowIndex = 0) {
  await page.click(`[data-testid="exception-row-${rowIndex}"]`);
  await page.waitForSelector('[data-testid="exception-detail-panel"]');
}

/**
 * Helper function to acknowledge an exception
 * @param page Playwright page object
 * @param comments Acknowledgment comments
 * @returns Promise that resolves when exception is acknowledged
 */
async function acknowledgeException(page, comments) {
  await page.click('[data-testid="acknowledge-button"]');
  await page.fill('[data-testid="acknowledgment-comments"]', comments);
  await page.click('[data-testid="submit-button"]');
  await page.waitForSelector('[data-testid="notification-success"]');
}

/**
 * Helper function to resolve an exception
 * @param page Playwright page object
 * @param resolutionNotes Notes about the resolution
 * @param resolutionAction Action taken to resolve the exception
 * @returns Promise that resolves when exception is resolved
 */
async function resolveException(page, resolutionNotes, resolutionAction) {
  await page.click('[data-testid="resolve-button"]');
  await page.fill('[data-testid="resolution-notes"]', resolutionNotes);
  await page.fill('[data-testid="resolution-action"]', resolutionAction);
  await page.click('[data-testid="submit-button"]');
  await page.waitForSelector('[data-testid="notification-success"]');
}

/**
 * Helper function to assign an exception to a user
 * @param page Playwright page object
 * @param assigneeId ID of the user to assign the exception to
 * @param notes Assignment notes
 * @returns Promise that resolves when exception is assigned
 */
async function assignException(page, assigneeId, notes) {
  await page.click('[data-testid="assign-button"]');
  await page.selectOption('[data-testid="assignee-select"]', assigneeId);
  await page.fill('[data-testid="assignment-notes"]', notes);
  await page.click('[data-testid="submit-button"]');
  await page.waitForSelector('[data-testid="notification-success"]');
}

/**
 * Helper function to add a comment to an exception
 * @param page Playwright page object
 * @param comment Comment text to add
 * @returns Promise that resolves when comment is added
 */
async function addExceptionComment(page, comment) {
  await page.fill('[data-testid="comment-input"]', comment);
  await page.click('[data-testid="add-comment-button"]');
  await page.waitForSelector('[data-testid="notification-success"]');
}

/**
 * Helper function to refresh the exception list
 * @param page Playwright page object
 * @returns Promise that resolves when exception list is refreshed
 */
async function refreshExceptionList(page) {
  await page.click('[data-testid="refresh-button"]');
  await page.waitForResponse(response => 
    response.url().includes('/api/v1/exceptions') && response.status() === 200
  );
}

/**
 * Helper function to measure the time taken to load the exceptions page
 * @param page Playwright page object
 * @returns Promise that resolves to the load time in milliseconds
 */
async function measurePageLoadTime(page) {
  const startTime = Date.now();
  await navigateToExceptionsPage(page);
  await page.waitForSelector('[data-testid="exception-queue"]');
  await page.waitForSelector('[data-testid="exception-filters"]');
  const endTime = Date.now();
  return endTime - startTime;
}

// Test suite for the Exception Management screen
test.describe('Exception Management Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean session for each test
    await page.goto('/');
  });

  test.describe('Page Display and Components', () => {
    test('should display the exception management page with correct components', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      // Verify that all required components are visible
      await expect(page.locator('[data-testid="exception-filters"]')).toBeVisible();
      await expect(page.locator('[data-testid="exception-queue"]')).toBeVisible();
      await expect(page.locator('[data-testid="exception-detail-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="exception-statistics"]')).toBeVisible();
      
      // Verify filter components
      await expect(page.locator('[data-testid="filter-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-severity"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-date-range"]')).toBeVisible();
      
      // Verify queue components
      await expect(page.locator('[data-testid="exception-header-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="exception-header-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="exception-header-severity"]')).toBeVisible();
      await expect(page.locator('[data-testid="exception-header-desc"]')).toBeVisible();
    });
  });

  test.describe('Filtering Functionality', () => {
    test('should filter exceptions by type', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      await selectExceptionFilter(page, 'type', 'data');
      
      // Verify that only Data exceptions are displayed
      const visibleExceptions = await page.locator('[data-testid="exception-row"]').count();
      expect(visibleExceptions).toBeGreaterThan(0);
      
      // Check that all visible exceptions have the Data type
      for (let i = 0; i < visibleExceptions; i++) {
        const typeText = await page.locator(`[data-testid="exception-row-${i}"] [data-testid="exception-type"]`).textContent();
        expect(typeText.trim()).toBe('Data');
      }
    });

    test('should filter exceptions by severity', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      await selectExceptionFilter(page, 'severity', 'critical');
      
      // Verify that only Critical exceptions are displayed
      const visibleExceptions = await page.locator('[data-testid="exception-row"]').count();
      
      if (visibleExceptions > 0) {
        // Check that all visible exceptions have Critical severity
        for (let i = 0; i < visibleExceptions; i++) {
          const severityText = await page.locator(`[data-testid="exception-row-${i}"] [data-testid="exception-severity"]`).textContent();
          expect(severityText.trim()).toBe('Critical');
        }
      } else {
        // Verify empty state is shown
        await expect(page.locator('[data-testid="empty-state-message"]')).toBeVisible();
      }
    });

    test('should filter exceptions by status', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      await selectExceptionFilter(page, 'status', 'open');
      
      // Verify that only Open exceptions are displayed
      const visibleExceptions = await page.locator('[data-testid="exception-row"]').count();
      
      if (visibleExceptions > 0) {
        // Check that all visible exceptions have Open status
        for (let i = 0; i < visibleExceptions; i++) {
          const statusText = await page.locator(`[data-testid="exception-row-${i}"] [data-testid="exception-status"]`).textContent();
          expect(statusText.trim()).toBe('Open');
        }
      } else {
        // Verify empty state is shown
        await expect(page.locator('[data-testid="empty-state-message"]')).toBeVisible();
      }
    });

    test('should filter exceptions by date range', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      await selectDateRangeFilter(page, 'last-24-hours');
      
      // Verify that the date filter label is updated
      const filterLabel = await page.locator('[data-testid="date-filter-label"]').textContent();
      expect(filterLabel).toContain('Last 24 Hours');
      
      // Verify that exceptions are filtered - we can't easily verify dates in E2E tests
      // so we just check that the filter was applied
      await expect(page.locator('[data-testid="exception-row"]')).toBeVisible();
    });
  });

  test.describe('Exception Selection and Details', () => {
    test('should display exception details when selecting an exception', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      // Make sure there are exceptions to select
      const exceptionCount = await page.locator('[data-testid="exception-row"]').count();
      if (exceptionCount === 0) {
        test.skip("No exceptions available to select");
      }
      
      await selectException(page, 0);
      
      // Verify that the detail panel is populated with the correct information
      await expect(page.locator('[data-testid="exception-detail-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="exception-detail-severity"]')).toBeVisible();
      await expect(page.locator('[data-testid="exception-detail-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="exception-detail-timestamp"]')).toBeVisible();
      await expect(page.locator('[data-testid="exception-detail-description"]')).toBeVisible();
      
      // Verify that appropriate action buttons are displayed
      await expect(page.locator('[data-testid="exception-actions"]')).toBeVisible();
    });
  });

  test.describe('Exception Management Actions', () => {
    test('should acknowledge an exception', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      // Filter to show only open exceptions
      await selectExceptionFilter(page, 'status', 'open');
      
      // Skip test if no open exceptions are available
      const exceptionCount = await page.locator('[data-testid="exception-row"]').count();
      if (exceptionCount === 0) {
        test.skip("No open exceptions available to acknowledge");
        return;
      }
      
      // Select the first open exception
      await selectException(page, 0);
      
      // Check if the acknowledge button is available
      const acknowledgeButtonVisible = await page.locator('[data-testid="acknowledge-button"]').isVisible();
      if (!acknowledgeButtonVisible) {
        test.skip("Acknowledge button not available for this exception");
        return;
      }
      
      // Acknowledge the exception
      await acknowledgeException(page, 'Acknowledging this exception for testing purposes.');
      
      // Verify that the exception status is updated
      await expect(page.locator('[data-testid="exception-detail-status"]')).toHaveText('Acknowledged');
      await expect(page.locator('[data-testid="notification-success"]')).toBeVisible();
    });

    test('should resolve an exception', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      // Filter to show only acknowledged exceptions
      await selectExceptionFilter(page, 'status', 'acknowledged');
      
      // Skip test if no acknowledged exceptions are available
      const exceptionCount = await page.locator('[data-testid="exception-row"]').count();
      if (exceptionCount === 0) {
        test.skip("No acknowledged exceptions available to resolve");
        return;
      }
      
      // Select the first acknowledged exception
      await selectException(page, 0);
      
      // Check if the resolve button is available
      const resolveButtonVisible = await page.locator('[data-testid="resolve-button"]').isVisible();
      if (!resolveButtonVisible) {
        test.skip("Resolve button not available for this exception");
        return;
      }
      
      // Resolve the exception
      await resolveException(
        page, 
        'Resolution notes for testing purposes.', 
        'Data mapping conflict was resolved by selecting the Bloomberg identifier.'
      );
      
      // Verify that the exception status is updated
      await expect(page.locator('[data-testid="exception-detail-status"]')).toHaveText('Resolved');
      await expect(page.locator('[data-testid="notification-success"]')).toBeVisible();
    });

    test('should assign an exception to another user', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      // Skip test if no exceptions are available
      const exceptionCount = await page.locator('[data-testid="exception-row"]').count();
      if (exceptionCount === 0) {
        test.skip("No exceptions available to assign");
        return;
      }
      
      // Select an exception
      await selectException(page, 0);
      
      // Check if the assign button is available
      const assignButtonVisible = await page.locator('[data-testid="assign-button"]').isVisible();
      if (!assignButtonVisible) {
        test.skip("Assign button not available for this exception");
        return;
      }
      
      // Assign the exception to another user
      const assigneeId = 'user-123'; // This would be a real user ID in the application
      await assignException(page, assigneeId, 'Please review this exception.');
      
      // Verify that the assignment was successful
      await expect(page.locator('[data-testid="exception-detail-assignee"]')).toContainText('user-123');
      await expect(page.locator('[data-testid="notification-success"]')).toBeVisible();
    });

    test('should add a comment to an exception', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      // Skip test if no exceptions are available
      const exceptionCount = await page.locator('[data-testid="exception-row"]').count();
      if (exceptionCount === 0) {
        test.skip("No exceptions available to comment on");
        return;
      }
      
      // Select an exception
      await selectException(page, 0);
      
      // Add a comment
      const comment = 'This is a test comment added via automation.';
      await addExceptionComment(page, comment);
      
      // Verify that the comment appears in the comments section
      await expect(page.locator('[data-testid="exception-comments"]')).toContainText(comment);
      await expect(page.locator('[data-testid="notification-success"]')).toBeVisible();
    });
  });

  test.describe('Pagination and Refresh', () => {
    test('should paginate through exceptions', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      // Verify that pagination controls are visible
      const paginationVisible = await page.locator('[data-testid="pagination-controls"]').isVisible();
      if (!paginationVisible) {
        test.skip("Pagination controls not visible - not enough exceptions in the system");
        return;
      }
      
      // Check if there's a next page to go to
      const nextButtonDisabled = await page.locator('[data-testid="pagination-next"]').isDisabled();
      if (nextButtonDisabled) {
        test.skip("No next page available - not enough exceptions in the system");
        return;
      }
      
      // Get the text of the first exception on page 1
      const firstExceptionTextPage1 = await page.locator('[data-testid="exception-row-0"] [data-testid="exception-description"]').textContent();
      
      // Go to the next page
      await page.click('[data-testid="pagination-next"]');
      
      // Wait for the page to update
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/exceptions') && response.status() === 200
      );
      
      // Verify that we're on page 2
      await expect(page.locator('[data-testid="pagination-current-page"]')).toHaveText('2');
      
      // Get the text of the first exception on page 2
      const firstExceptionTextPage2 = await page.locator('[data-testid="exception-row-0"] [data-testid="exception-description"]').textContent();
      
      // Verify that the exceptions are different
      expect(firstExceptionTextPage1).not.toBe(firstExceptionTextPage2);
      
      // Go back to page 1
      await page.click('[data-testid="pagination-prev"]');
      
      // Wait for the page to update
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/exceptions') && response.status() === 200
      );
      
      // Verify that we're on page 1 again
      await expect(page.locator('[data-testid="pagination-current-page"]')).toHaveText('1');
    });

    test('should refresh the exception list', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      // Get the "last updated" timestamp before refresh
      const lastUpdatedBefore = await page.locator('[data-testid="last-updated-timestamp"]').textContent();
      
      // Wait a moment to ensure the timestamp will be different
      await page.waitForTimeout(1000);
      
      // Refresh the exception list
      await refreshExceptionList(page);
      
      // Get the "last updated" timestamp after refresh
      const lastUpdatedAfter = await page.locator('[data-testid="last-updated-timestamp"]').textContent();
      
      // Verify that the timestamp has changed
      expect(lastUpdatedBefore).not.toBe(lastUpdatedAfter);
    });

    test('should handle empty exception list gracefully', async ({ page }) => {
      await loginAsUser(page, 'operations');
      await navigateToExceptionsPage(page);
      
      // Apply a filter combination that results in no matches
      await selectExceptionFilter(page, 'type', 'system');
      await selectExceptionFilter(page, 'severity', 'critical');
      await selectExceptionFilter(page, 'status', 'resolved');
      await selectDateRangeFilter(page, 'today');
      
      // Verify that an empty state message is displayed
      await expect(page.locator('[data-testid="empty-state-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="empty-state-message"]')).toContainText('No exceptions found');
    });
  });

  test.describe('Performance and Permissions', () => {
    test('should meet performance requirements for loading exceptions', async ({ page }) => {
      await loginAsUser(page, 'operations');
      
      // Measure the time it takes to load the exceptions page
      const loadTime = await measurePageLoadTime(page);
      
      // Log the actual loading time for debugging
      console.log(`Exception page load time: ${loadTime}ms (threshold: ${PERFORMANCE_THRESHOLDS.UI_RESPONSE}ms)`);
      
      // Verify that the loading time is within the threshold
      expect(loadTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
    });

    test('should allow compliance users to view but not modify exceptions', async ({ page }) => {
      await loginAsUser(page, 'compliance');
      await navigateToExceptionsPage(page);
      
      // Verify that the exception list is visible
      await expect(page.locator('[data-testid="exception-queue"]')).toBeVisible();
      
      // Skip next checks if no exceptions are available
      const exceptionCount = await page.locator('[data-testid="exception-row"]').count();
      if (exceptionCount === 0) {
        test.skip("No exceptions available to test permissions on");
        return;
      }
      
      // Select an exception
      await selectException(page, 0);
      
      // Verify that the exception details are visible
      await expect(page.locator('[data-testid="exception-detail-panel"]')).toBeVisible();
      
      // Check if action buttons exist, they should be disabled for compliance users
      const acknowledgeButtonExists = await page.locator('[data-testid="acknowledge-button"]').count() > 0;
      if (acknowledgeButtonExists) {
        await expect(page.locator('[data-testid="acknowledge-button"]')).toBeDisabled();
      }
      
      const resolveButtonExists = await page.locator('[data-testid="resolve-button"]').count() > 0;
      if (resolveButtonExists) {
        await expect(page.locator('[data-testid="resolve-button"]')).toBeDisabled();
      }
      
      const assignButtonExists = await page.locator('[data-testid="assign-button"]').count() > 0;
      if (assignButtonExists) {
        await expect(page.locator('[data-testid="assign-button"]')).toBeDisabled();
      }
    });
  });
});