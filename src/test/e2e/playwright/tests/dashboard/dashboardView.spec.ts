import { test, expect, Page } from '@playwright/test'; // v1.32.0
import { TEST_USERS, PERFORMANCE_THRESHOLDS, ROUTES } from '../../../common/constants';
import { loginUser } from '../auth/login.spec';

/**
 * Helper function to navigate to the dashboard and ensure it's loaded
 * @param page - Playwright page object
 */
async function navigateToDashboard(page: Page): Promise<void> {
  // Login with test user credentials
  await loginUser(page, TEST_USERS.TRADER.username, TEST_USERS.TRADER.password);
  
  // Navigate to dashboard route
  await page.goto(ROUTES.DASHBOARD);
  
  // Wait for dashboard components to be visible
  await page.waitForSelector('[data-testid="dashboard-container"]');
  
  // Verify dashboard title is present
  await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
}

/**
 * Helper function to measure dashboard load time
 * @param page - Playwright page object
 * @returns Promise that resolves to load time in milliseconds
 */
async function measureDashboardLoadTime(page: Page): Promise<number> {
  // Start performance measurement
  const startTime = performance.now();
  
  // Navigate to dashboard
  await page.goto(ROUTES.LOGIN);
  await loginUser(page, TEST_USERS.TRADER.username, TEST_USERS.TRADER.password);
  await page.waitForURL(ROUTES.DASHBOARD);
  
  // Wait for all dashboard components to be visible
  await Promise.all([
    page.waitForSelector('[data-testid="system-status-component"]'),
    page.waitForSelector('[data-testid="inventory-summary-component"]'),
    page.waitForSelector('[data-testid="locate-requests-component"]'),
    page.waitForSelector('[data-testid="recent-activity-component"]'),
    page.waitForSelector('[data-testid="alerts-component"]')
  ]);
  
  // End performance measurement
  const endTime = performance.now();
  
  // Calculate and return load time
  return endTime - startTime;
}

// Test suite for dashboard view
test.describe('Dashboard View', () => {
  
  test('should display all dashboard components', async ({ page }) => {
    // Login and navigate to dashboard
    await navigateToDashboard(page);
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check for presence of all dashboard components
    await expect(page.locator('[data-testid="system-status-component"]')).toBeVisible();
    await expect(page.locator('[data-testid="inventory-summary-component"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-requests-component"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activity-component"]')).toBeVisible();
    await expect(page.locator('[data-testid="alerts-component"]')).toBeVisible();
  });
  
  test('should display correct system status information', async ({ page }) => {
    // Login and navigate to dashboard
    await navigateToDashboard(page);
    
    // Wait for System Status component to load
    await page.waitForSelector('[data-testid="system-status-component"]');
    
    // Check system status content
    const statusComponent = page.locator('[data-testid="system-status-component"]');
    
    // System status indicator is visible
    await expect(statusComponent.locator('[data-testid="status-indicator"]')).toBeVisible();
    
    // System availability percentage is displayed
    const availabilityText = await statusComponent.locator('[data-testid="availability-percentage"]').textContent();
    expect(availabilityText).toMatch(/\d+\.\d+%/); // Should match a percentage format
    
    // Key metrics are displayed
    await expect(statusComponent.locator('[data-testid="uptime-metric"]')).toBeVisible();
    await expect(statusComponent.locator('[data-testid="memory-usage-metric"]')).toBeVisible();
    
    // Service statuses are displayed
    await expect(statusComponent.locator('[data-testid="service-statuses"]')).toBeVisible();
  });
  
  test('should display inventory summary with metrics', async ({ page }) => {
    // Login and navigate to dashboard
    await navigateToDashboard(page);
    
    // Wait for Inventory Summary component to load
    await page.waitForSelector('[data-testid="inventory-summary-component"]');
    
    // Check inventory metrics
    const inventoryComponent = page.locator('[data-testid="inventory-summary-component"]');
    
    // Total Inventory value is displayed
    await expect(inventoryComponent.locator('[data-testid="total-inventory-value"]')).toBeVisible();
    
    // For Loan value is displayed
    await expect(inventoryComponent.locator('[data-testid="for-loan-value"]')).toBeVisible();
    
    // For Pledge value is displayed
    await expect(inventoryComponent.locator('[data-testid="for-pledge-value"]')).toBeVisible();
    
    // Hard To Borrow value is displayed
    await expect(inventoryComponent.locator('[data-testid="htb-value"]')).toBeVisible();
    
    // Inventory category chart is visible
    await expect(inventoryComponent.locator('[data-testid="inventory-chart"]')).toBeVisible();
  });
  
  test('should display pending locate requests', async ({ page }) => {
    // Login and navigate to dashboard
    await navigateToDashboard(page);
    
    // Wait for Locate Requests component to load
    await page.waitForSelector('[data-testid="locate-requests-component"]');
    
    // Check locate requests content
    const locateComponent = page.locator('[data-testid="locate-requests-component"]');
    
    // Locate requests summary statistics are displayed
    await expect(locateComponent.locator('[data-testid="pending-locates-count"]')).toBeVisible();
    await expect(locateComponent.locator('[data-testid="today-locates-count"]')).toBeVisible();
    
    // Pending locate requests are listed in a grid
    await expect(locateComponent.locator('[data-testid="locate-requests-grid"]')).toBeVisible();
    
    // "View All" button is present
    await expect(locateComponent.locator('[data-testid="view-all-locates-button"]')).toBeVisible();
  });
  
  test('should display recent activity timeline', async ({ page }) => {
    // Login and navigate to dashboard
    await navigateToDashboard(page);
    
    // Wait for Recent Activity component to load
    await page.waitForSelector('[data-testid="recent-activity-component"]');
    
    // Check recent activity content
    const activityComponent = page.locator('[data-testid="recent-activity-component"]');
    
    // Recent activity entries are displayed
    const activityEntries = activityComponent.locator('[data-testid="activity-entry"]');
    await expect(activityEntries).toHaveCount({ min: 1 });
    
    // Each entry shows time and description
    const firstEntry = activityEntries.first();
    await expect(firstEntry.locator('[data-testid="activity-time"]')).toBeVisible();
    await expect(firstEntry.locator('[data-testid="activity-description"]')).toBeVisible();
    
    // Activities are in chronological order
    // Verify the timestamps are in descending order (newest first)
    if (await activityEntries.count() >= 2) {
      const firstTime = await firstEntry.locator('[data-testid="activity-time"]').textContent();
      const secondTime = await activityEntries.nth(1).locator('[data-testid="activity-time"]').textContent();
      expect(new Date(firstTime || '')).toBeGreaterThan(new Date(secondTime || ''));
    }
  });
  
  test('should display system alerts', async ({ page }) => {
    // Login and navigate to dashboard
    await navigateToDashboard(page);
    
    // Wait for Alerts component to load
    await page.waitForSelector('[data-testid="alerts-component"]');
    
    // Check alerts content
    const alertsComponent = page.locator('[data-testid="alerts-component"]');
    
    // Alert entries are displayed with appropriate severity indicators
    const alertEntries = alertsComponent.locator('[data-testid="alert-entry"]');
    
    // Check if there are any alerts
    const count = await alertEntries.count();
    if (count > 0) {
      // Each alert shows title and description
      const firstAlert = alertEntries.first();
      await expect(firstAlert.locator('[data-testid="alert-severity"]')).toBeVisible();
      await expect(firstAlert.locator('[data-testid="alert-title"]')).toBeVisible();
      await expect(firstAlert.locator('[data-testid="alert-description"]')).toBeVisible();
    } else {
      // If no alerts, check for "No alerts" message
      await expect(alertsComponent.locator('[data-testid="no-alerts-message"]')).toBeVisible();
    }
  });
  
  test('should load dashboard within performance threshold', async ({ page }) => {
    // Measure time to load dashboard
    const loadTime = await measureDashboardLoadTime(page);
    
    // Compare with PERFORMANCE_THRESHOLDS.UI_RESPONSE
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
    console.log(`Dashboard load time: ${Math.round(loadTime)}ms (threshold: ${PERFORMANCE_THRESHOLDS.UI_RESPONSE}ms)`);
  });
  
  test('should refresh dashboard components when refresh button is clicked', async ({ page }) => {
    // Login and navigate to dashboard
    await navigateToDashboard(page);
    
    // Click refresh button on System Status component
    await page.click('[data-testid="system-status-refresh-button"]');
    
    // Wait for loading indicator and then for it to disappear
    await page.waitForSelector('[data-testid="system-status-loading-indicator"]');
    await page.waitForSelector('[data-testid="system-status-loading-indicator"]', { state: 'hidden' });
    
    // Click refresh button on Inventory Summary component
    await page.click('[data-testid="inventory-summary-refresh-button"]');
    
    // Wait for loading indicator and then for it to disappear
    await page.waitForSelector('[data-testid="inventory-summary-loading-indicator"]');
    await page.waitForSelector('[data-testid="inventory-summary-loading-indicator"]', { state: 'hidden' });
    
    // Click refresh button on Locate Requests component
    await page.click('[data-testid="locate-requests-refresh-button"]');
    
    // Wait for loading indicator and then for it to disappear
    await page.waitForSelector('[data-testid="locate-requests-loading-indicator"]');
    await page.waitForSelector('[data-testid="locate-requests-loading-indicator"]', { state: 'hidden' });
    
    // Verify components are still visible after refresh
    await expect(page.locator('[data-testid="system-status-component"]')).toBeVisible();
    await expect(page.locator('[data-testid="inventory-summary-component"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-requests-component"]')).toBeVisible();
  });
  
  test("should navigate to full locate management when 'View All' is clicked", async ({ page }) => {
    // Login and navigate to dashboard
    await navigateToDashboard(page);
    
    // Click 'View All' button in Locate Requests component
    await page.click('[data-testid="view-all-locates-button"]');
    
    // Verify navigation to locate management page
    await expect(page).toHaveURL(ROUTES.LOCATES);
    
    // Verify locate management page displays full list of locate requests
    await expect(page.locator('[data-testid="locate-management-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-requests-table"]')).toBeVisible();
  });
  
  test('should adapt layout for different screen sizes', async ({ page }) => {
    // Login and navigate to dashboard
    await navigateToDashboard(page);
    
    // Resize viewport to desktop size (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Verify desktop layout - multi-column grid
    const desktopGridColumns = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="dashboard-container"]');
      return container ? getComputedStyle(container).gridTemplateColumns.split(' ').length > 1 : false;
    });
    expect(desktopGridColumns).toBeTruthy();
    
    // Resize viewport to tablet size (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Verify tablet layout - fewer columns
    const tabletGridColumns = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="dashboard-container"]');
      return container ? getComputedStyle(container).gridTemplateColumns.split(' ').length <= 2 : false;
    });
    expect(tabletGridColumns).toBeTruthy();
    
    // Resize viewport to mobile size (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout - components are stacked
    const mobileGridColumns = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="dashboard-container"]');
      return container ? getComputedStyle(container).gridTemplateColumns.split(' ').length === 1 : false;
    });
    expect(mobileGridColumns).toBeTruthy();
  });
  
  test('should display welcome message with user name', async ({ page }) => {
    // Login with test user credentials
    await loginUser(page, TEST_USERS.TRADER.username, TEST_USERS.TRADER.password);
    
    // Navigate to dashboard
    await page.goto(ROUTES.DASHBOARD);
    
    // Verify welcome message is displayed
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    
    // Verify welcome message includes user's name
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(TEST_USERS.TRADER.username);
  });
  
  test('should show loading states when data is being fetched', async ({ page }) => {
    // Intercept API requests to simulate slow responses
    await page.route('**/api/v1/**', async (route) => {
      // Wait for 1 second to simulate slow response
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Continue with the original request
      await route.continue();
    });
    
    // Login and navigate to dashboard
    await loginUser(page, TEST_USERS.TRADER.username, TEST_USERS.TRADER.password);
    await page.goto(ROUTES.DASHBOARD);
    
    // Verify loading indicators are displayed during data fetching
    await expect(page.locator('[data-testid="system-status-loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="inventory-summary-loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-requests-loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activity-loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="alerts-loading-indicator"]')).toBeVisible();
    
    // Wait for loading to complete
    await page.waitForSelector('[data-testid="system-status-loading-indicator"]', { state: 'hidden' });
    
    // Verify components show data once loading is complete
    await expect(page.locator('[data-testid="system-status-component"]')).toBeVisible();
    await expect(page.locator('[data-testid="inventory-summary-component"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-requests-component"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activity-component"]')).toBeVisible();
    await expect(page.locator('[data-testid="alerts-component"]')).toBeVisible();
  });
});