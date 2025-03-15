import { test, expect, Page } from '@playwright/test';
import { TEST_USERS, ROUTES, LOCATE_STATUS, PERFORMANCE_THRESHOLDS } from '../../../common/constants';

/**
 * Helper function to navigate to the locates page and ensure it's loaded
 */
async function navigateToLocatesPage(page: Page): Promise<void> {
  await page.goto(ROUTES.LOCATES);
  await page.waitForSelector('h1:has-text("Locate Management")');
  await page.waitForSelector('[data-testid="locate-queue"]');
  await page.waitForSelector('[data-testid="locate-tabs"]');
}

/**
 * Helper function to select a locate request from the queue
 */
async function selectLocateRequest(page: Page, requestId: string): Promise<void> {
  await page.click(`[data-testid="locate-row-${requestId}"]`);
  await page.waitForSelector('[data-testid="locate-detail-panel"]');
  await expect(page.locator('[data-testid="locate-detail-request-id"]')).toContainText(requestId);
}

/**
 * Helper function to approve a locate request
 */
async function approveLocateRequest(page: Page, approvalData: {
  approvedQuantity?: string,
  decrementQuantity?: string,
  expiryDate?: string,
  comments?: string
}): Promise<void> {
  await page.click('[data-testid="approve-tab"]');
  
  if (approvalData.approvedQuantity) {
    await page.fill('[data-testid="approved-quantity-input"]', approvalData.approvedQuantity);
  }
  
  if (approvalData.decrementQuantity) {
    await page.fill('[data-testid="decrement-quantity-input"]', approvalData.decrementQuantity);
  }
  
  if (approvalData.expiryDate) {
    await page.fill('[data-testid="expiry-date-input"]', approvalData.expiryDate);
  }
  
  if (approvalData.comments) {
    await page.fill('[data-testid="approval-comments-input"]', approvalData.comments);
  }
  
  await page.click('[data-testid="approve-button"]');
  await page.waitForSelector('[data-testid="approval-confirmation-message"]');
  await expect(page.locator('[data-testid="locate-status"]')).toContainText(LOCATE_STATUS.APPROVED);
}

/**
 * Helper function to reject a locate request
 */
async function rejectLocateRequest(page: Page, rejectionData: {
  reason?: string,
  comments?: string
}): Promise<void> {
  await page.click('[data-testid="reject-tab"]');
  
  if (rejectionData.reason) {
    await page.selectOption('[data-testid="rejection-reason-select"]', rejectionData.reason);
  }
  
  if (rejectionData.comments) {
    await page.fill('[data-testid="rejection-comments-input"]', rejectionData.comments);
  }
  
  await page.click('[data-testid="reject-button"]');
  await page.waitForSelector('[data-testid="rejection-confirmation-message"]');
  await expect(page.locator('[data-testid="locate-status"]')).toContainText(LOCATE_STATUS.REJECTED);
}

test.describe('Locate Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(ROUTES.LOGIN);
    
    // Login as operations user
    await page.fill('[data-testid="username-input"]', TEST_USERS.OPERATIONS.username);
    await page.fill('[data-testid="password-input"]', TEST_USERS.OPERATIONS.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for login to complete
    await page.waitForNavigation();
  });

  test('should display locate management page with all elements', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Verify page elements
    await expect(page.locator('h1')).toContainText('Locate Management');
    await expect(page.locator('[data-testid="locate-tabs"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-queue"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
    
    // Verify tabs
    await expect(page.locator('[data-testid="pending-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="approved-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="rejected-tab"]')).toBeVisible();
    
    // Verify queue columns
    const columns = ['Time', 'Client', 'Security', 'Quantity', 'Type', 'Status'];
    for (const column of columns) {
      await expect(page.locator(`[data-testid="column-header-${column.toLowerCase()}"]`)).toBeVisible();
    }
  });

  test('should display pending locate requests in the queue', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Ensure pending tab is selected
    await page.click('[data-testid="pending-tab"]');
    
    // Verify pending locate requests are displayed
    await expect(page.locator('[data-testid="locate-queue"] tbody tr')).toHaveCount.greaterThan(0);
    
    // Verify status indicators show pending
    await expect(page.locator('[data-testid="locate-status"]').first()).toContainText(LOCATE_STATUS.PENDING);
    
    // Verify row contains expected columns
    const firstRow = page.locator('[data-testid="locate-queue"] tbody tr').first();
    await expect(firstRow.locator('[data-testid="locate-time"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="locate-client"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="locate-security"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="locate-quantity"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="locate-type"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="locate-status"]')).toBeVisible();
  });

  test('should display locate request details when a request is selected', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Get the first locate request ID
    const requestId = await page.locator('[data-testid="locate-queue"] tbody tr').first().getAttribute('data-request-id');
    
    // Select the locate request
    await selectLocateRequest(page, requestId);
    
    // Verify detail panel elements
    await expect(page.locator('[data-testid="locate-detail-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-detail-request-id"]')).toContainText(requestId);
    await expect(page.locator('[data-testid="locate-detail-security"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-detail-client"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-detail-requestor"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-detail-quantity"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-detail-timestamp"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-detail-status"]')).toBeVisible();
  });

  test('should allow approving a pending locate request', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Get the first pending locate request ID
    const requestId = await page.locator('[data-testid="locate-queue"] tbody tr').first().getAttribute('data-request-id');
    
    // Select the locate request
    await selectLocateRequest(page, requestId);
    
    // Approve the locate request
    await approveLocateRequest(page, {
      approvedQuantity: '5000',
      decrementQuantity: '5000',
      expiryDate: '2023-12-31',
      comments: 'Automated test approval'
    });
    
    // Verify request moved to approved tab
    await page.click('[data-testid="approved-tab"]');
    await expect(page.locator(`[data-testid="locate-row-${requestId}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="locate-row-${requestId}"] [data-testid="locate-status"]`)).toContainText(LOCATE_STATUS.APPROVED);
  });

  test('should allow rejecting a pending locate request', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Get the first pending locate request ID
    const requestId = await page.locator('[data-testid="locate-queue"] tbody tr').first().getAttribute('data-request-id');
    
    // Select the locate request
    await selectLocateRequest(page, requestId);
    
    // Reject the locate request
    await rejectLocateRequest(page, {
      reason: 'INSUFFICIENT_INVENTORY',
      comments: 'Automated test rejection'
    });
    
    // Verify request moved to rejected tab
    await page.click('[data-testid="rejected-tab"]');
    await expect(page.locator(`[data-testid="locate-row-${requestId}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="locate-row-${requestId}"] [data-testid="locate-status"]`)).toContainText(LOCATE_STATUS.REJECTED);
  });

  test('should validate required fields in the approval form', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Get the first pending locate request ID
    const requestId = await page.locator('[data-testid="locate-queue"] tbody tr').first().getAttribute('data-request-id');
    
    // Select the locate request
    await selectLocateRequest(page, requestId);
    
    // Go to approve tab
    await page.click('[data-testid="approve-tab"]');
    
    // Click approve without filling required fields
    await page.click('[data-testid="approve-button"]');
    
    // Verify validation errors
    await expect(page.locator('[data-testid="approved-quantity-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="decrement-quantity-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="expiry-date-error"]')).toBeVisible();
    
    // Verify locate still in pending status
    await expect(page.locator('[data-testid="locate-detail-status"]')).toContainText(LOCATE_STATUS.PENDING);
  });

  test('should validate required fields in the rejection form', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Get the first pending locate request ID
    const requestId = await page.locator('[data-testid="locate-queue"] tbody tr').first().getAttribute('data-request-id');
    
    // Select the locate request
    await selectLocateRequest(page, requestId);
    
    // Go to reject tab
    await page.click('[data-testid="reject-tab"]');
    
    // Click reject without selecting a reason
    await page.click('[data-testid="reject-button"]');
    
    // Verify validation errors
    await expect(page.locator('[data-testid="rejection-reason-error"]')).toBeVisible();
    
    // Verify locate still in pending status
    await expect(page.locator('[data-testid="locate-detail-status"]')).toContainText(LOCATE_STATUS.PENDING);
  });

  test('should filter locate requests by security', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Get security from first row
    const securityText = await page.locator('[data-testid="locate-queue"] tbody tr').first().locator('[data-testid="locate-security"]').textContent();
    
    // Apply security filter
    await page.click('[data-testid="filter-toggle"]');
    await page.fill('[data-testid="security-filter-input"]', securityText);
    await page.click('[data-testid="apply-filters-button"]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="locate-queue"] tbody tr')).toHaveCount.greaterThan(0);
    await expect(page.locator('[data-testid="locate-queue"] tbody tr').first().locator('[data-testid="locate-security"]')).toContainText(securityText);
    await expect(page.locator('[data-testid="active-filter-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="clear-filters-button"]')).toBeVisible();
  });

  test('should filter locate requests by client', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Get client from first row
    const clientText = await page.locator('[data-testid="locate-queue"] tbody tr').first().locator('[data-testid="locate-client"]').textContent();
    
    // Apply client filter
    await page.click('[data-testid="filter-toggle"]');
    await page.fill('[data-testid="client-filter-input"]', clientText);
    await page.click('[data-testid="apply-filters-button"]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="locate-queue"] tbody tr')).toHaveCount.greaterThan(0);
    await expect(page.locator('[data-testid="locate-queue"] tbody tr').first().locator('[data-testid="locate-client"]')).toContainText(clientText);
    await expect(page.locator('[data-testid="active-filter-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="clear-filters-button"]')).toBeVisible();
  });

  test('should filter locate requests by date range', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Apply date filter for today
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    await page.click('[data-testid="filter-toggle"]');
    await page.fill('[data-testid="date-from-input"]', today);
    await page.fill('[data-testid="date-to-input"]', today);
    await page.click('[data-testid="apply-filters-button"]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="locate-queue"] tbody tr')).toHaveCount.greaterThan(0);
    await expect(page.locator('[data-testid="active-filter-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="clear-filters-button"]')).toBeVisible();
  });

  test('should switch between tabs to view different locate statuses', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Switch to Approved tab
    await page.click('[data-testid="approved-tab"]');
    await expect(page.locator('[data-testid="approved-tab"]')).toHaveClass(/active/);
    const approvedCount = await page.locator('[data-testid="locate-queue"] tbody tr').count();
    
    // Verify statuses
    for (let i = 0; i < Math.min(approvedCount, 5); i++) {
      await expect(page.locator('[data-testid="locate-queue"] tbody tr').nth(i).locator('[data-testid="locate-status"]')).toContainText(LOCATE_STATUS.APPROVED);
    }
    
    // Switch to Rejected tab
    await page.click('[data-testid="rejected-tab"]');
    await expect(page.locator('[data-testid="rejected-tab"]')).toHaveClass(/active/);
    const rejectedCount = await page.locator('[data-testid="locate-queue"] tbody tr').count();
    
    // Verify statuses
    for (let i = 0; i < Math.min(rejectedCount, 5); i++) {
      await expect(page.locator('[data-testid="locate-queue"] tbody tr').nth(i).locator('[data-testid="locate-status"]')).toContainText(LOCATE_STATUS.REJECTED);
    }
    
    // Switch back to Pending tab
    await page.click('[data-testid="pending-tab"]');
    await expect(page.locator('[data-testid="pending-tab"]')).toHaveClass(/active/);
    const pendingCount = await page.locator('[data-testid="locate-queue"] tbody tr').count();
    
    // Verify statuses
    for (let i = 0; i < Math.min(pendingCount, 5); i++) {
      await expect(page.locator('[data-testid="locate-queue"] tbody tr').nth(i).locator('[data-testid="locate-status"]')).toContainText(LOCATE_STATUS.PENDING);
    }
  });

  test('should display appropriate message when no locate requests match filters', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Apply filter that won't match any locates
    await page.click('[data-testid="filter-toggle"]');
    await page.fill('[data-testid="security-filter-input"]', 'NO_MATCH_SECURITY_ZZZZZ');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Verify no data message
    await expect(page.locator('[data-testid="no-data-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-filter-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="clear-filters-button"]')).toBeVisible();
  });

  test('should clear filters when clear button is clicked', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Get the count before filtering
    const initialCount = await page.locator('[data-testid="locate-queue"] tbody tr').count();
    
    // Apply security filter
    await page.click('[data-testid="filter-toggle"]');
    await page.fill('[data-testid="security-filter-input"]', 'AAPL');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Verify filter applied
    await expect(page.locator('[data-testid="active-filter-indicator"]')).toBeVisible();
    
    // Clear filters
    await page.click('[data-testid="clear-filters-button"]');
    
    // Verify filters cleared and all data shown
    await expect(page.locator('[data-testid="active-filter-indicator"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="locate-queue"] tbody tr')).toHaveCount(initialCount);
  });

  test('should sort locate requests by column', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Click on request time column header to sort
    await page.click('[data-testid="column-header-time"]');
    
    // Verify sort indicator appears
    await expect(page.locator('[data-testid="column-header-time"] [data-testid="sort-indicator"]')).toBeVisible();
    
    // Get first time after first sort
    const firstSortTime = await page.locator('[data-testid="locate-queue"] tbody tr').first().locator('[data-testid="locate-time"]').textContent();
    
    // Click again to reverse sort
    await page.click('[data-testid="column-header-time"]');
    
    // Verify sort indicator shows reversed direction
    await expect(page.locator('[data-testid="column-header-time"] [data-testid="sort-indicator"]')).toBeVisible();
    
    // Get first time after second sort
    const secondSortTime = await page.locator('[data-testid="locate-queue"] tbody tr').first().locator('[data-testid="locate-time"]').textContent();
    
    // Verify times are different (sorting changed the order)
    expect(firstSortTime).not.toEqual(secondSortTime);
  });

  test('should paginate through locate requests', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Check if pagination exists (might not if there are few requests)
    const hasPagination = await page.locator('[data-testid="pagination-controls"]').isVisible();
    
    if (hasPagination) {
      // Get items from first page
      const firstPageFirstItem = await page.locator('[data-testid="locate-queue"] tbody tr').first().locator('[data-testid="locate-request-id"]').textContent();
      
      // Go to next page
      await page.click('[data-testid="next-page-button"]');
      
      // Get items from second page
      const secondPageFirstItem = await page.locator('[data-testid="locate-queue"] tbody tr').first().locator('[data-testid="locate-request-id"]').textContent();
      
      // Verify different items are shown
      expect(firstPageFirstItem).not.toEqual(secondPageFirstItem);
      
      // Go back to first page
      await page.click('[data-testid="previous-page-button"]');
      
      // Verify we're back to the first page
      const backToFirstItem = await page.locator('[data-testid="locate-queue"] tbody tr').first().locator('[data-testid="locate-request-id"]').textContent();
      expect(backToFirstItem).toEqual(firstPageFirstItem);
    } else {
      // Skip test or mark as passed if pagination doesn't exist
      test.skip(true, 'Pagination not available with current data set');
    }
  });

  test('should disable approval and rejection for non-pending locate requests', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Go to approved tab
    await page.click('[data-testid="approved-tab"]');
    
    // Get the first approved locate request ID
    const requestId = await page.locator('[data-testid="locate-queue"] tbody tr').first().getAttribute('data-request-id');
    
    // Select the locate request
    await selectLocateRequest(page, requestId);
    
    // Verify approval and rejection tabs are disabled or not visible
    await expect(page.locator('[data-testid="approve-tab"]')).toBeDisabled();
    await expect(page.locator('[data-testid="reject-tab"]')).toBeDisabled();
    
    // Verify read-only status
    await expect(page.locator('[data-testid="locate-detail-panel"]')).toHaveClass(/read-only/);
  });

  test('should restrict locate management access based on user role', async ({ page }) => {
    // Logout if already logged in
    await page.goto(ROUTES.LOGIN);
    
    // Login as trader user
    await page.fill('[data-testid="username-input"]', TEST_USERS.TRADER.username);
    await page.fill('[data-testid="password-input"]', TEST_USERS.TRADER.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for login to complete
    await page.waitForNavigation();
    
    // Navigate to locates page
    await navigateToLocatesPage(page);
    
    // Select a locate request
    const requestId = await page.locator('[data-testid="locate-queue"] tbody tr').first().getAttribute('data-request-id');
    await selectLocateRequest(page, requestId);
    
    // Verify trader cannot see approve/reject tabs
    await expect(page.locator('[data-testid="approve-tab"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="reject-tab"]')).not.toBeVisible();
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Login as operations user
    await page.fill('[data-testid="username-input"]', TEST_USERS.OPERATIONS.username);
    await page.fill('[data-testid="password-input"]', TEST_USERS.OPERATIONS.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for login to complete
    await page.waitForNavigation();
    
    // Navigate to locates page
    await navigateToLocatesPage(page);
    
    // Select a locate request
    await selectLocateRequest(page, requestId);
    
    // Verify operations user can see approve/reject tabs
    await expect(page.locator('[data-testid="approve-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="reject-tab"]')).toBeVisible();
  });

  test('should load locate management page within performance threshold', async ({ page }) => {
    // Record start time
    const startTime = Date.now();
    
    // Navigate to locates page
    await navigateToLocatesPage(page);
    
    // Record end time
    const endTime = Date.now();
    
    // Calculate load time
    const loadTime = endTime - startTime;
    
    // Verify load time is within threshold
    expect(loadTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
  });

  test('should complete locate approval operation within performance threshold', async ({ page }) => {
    await navigateToLocatesPage(page);
    
    // Get the first pending locate request ID
    const requestId = await page.locator('[data-testid="locate-queue"] tbody tr').first().getAttribute('data-request-id');
    
    // Select the locate request
    await selectLocateRequest(page, requestId);
    
    // Fill in approval form
    await page.click('[data-testid="approve-tab"]');
    await page.fill('[data-testid="approved-quantity-input"]', '5000');
    await page.fill('[data-testid="decrement-quantity-input"]', '5000');
    await page.fill('[data-testid="expiry-date-input"]', '2023-12-31');
    await page.fill('[data-testid="approval-comments-input"]', 'Performance test approval');
    
    // Record start time
    const startTime = Date.now();
    
    // Click approve button
    await page.click('[data-testid="approve-button"]');
    
    // Wait for approval confirmation
    await page.waitForSelector('[data-testid="approval-confirmation-message"]');
    
    // Record end time
    const endTime = Date.now();
    
    // Calculate operation time
    const operationTime = endTime - startTime;
    
    // Verify operation time is within threshold
    expect(operationTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.LOCATE_APPROVAL);
  });
});