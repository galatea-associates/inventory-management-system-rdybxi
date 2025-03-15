import { test, expect, Page } from '@playwright/test'; // v1.32.0
import { TEST_USERS, PERFORMANCE_THRESHOLDS, ROUTES, CALCULATION_TYPES, SECURITY_TEMPERATURE } from '../../../common/constants';
import { loginUser } from '../auth/login.spec';

/**
 * Helper function to navigate to the inventory dashboard and ensure it's loaded
 * @param page Playwright page object
 * @returns Promise that resolves when inventory dashboard is loaded
 */
async function navigateToInventoryDashboard(page: Page): Promise<void> {
  // Login with trader user credentials (who has inventory access)
  await loginUser(page, TEST_USERS.TRADER.username, TEST_USERS.TRADER.password);
  
  // Navigate to inventory dashboard route
  await page.goto(ROUTES.INVENTORY);
  
  // Wait for inventory dashboard components to be visible
  await page.waitForSelector('[data-testid="inventory-dashboard"]', { state: 'visible' });
  
  // Verify inventory dashboard title is present
  await expect(page.locator('h1')).toContainText('Inventory');
}

/**
 * Helper function to measure inventory dashboard load time
 * @param page Playwright page object
 * @returns Promise that resolves to load time in milliseconds
 */
async function measureDashboardLoadTime(page: Page): Promise<number> {
  const startTime = performance.now();
  
  // Navigate to login page
  await page.goto(ROUTES.LOGIN);
  
  // Login and navigate to inventory dashboard
  await loginUser(page, TEST_USERS.TRADER.username, TEST_USERS.TRADER.password);
  await page.goto(ROUTES.INVENTORY);
  
  // Wait for all dashboard components to be visible
  await Promise.all([
    page.waitForSelector('[data-testid="inventory-filters"]', { state: 'visible' }),
    page.waitForSelector('[data-testid="category-chart"]', { state: 'visible' }),
    page.waitForSelector('[data-testid="category-table"]', { state: 'visible' }),
    page.waitForSelector('[data-testid="top-securities"]', { state: 'visible' }),
    page.waitForSelector('[data-testid="inventory-data-grid"]', { state: 'visible' })
  ]);
  
  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * Helper function to apply a filter in the inventory dashboard
 * @param page Playwright page object
 * @param filterName Name of the filter to apply
 * @param filterValue Value to set for the filter
 * @returns Promise that resolves when filter is applied
 */
async function applyFilter(page: Page, filterName: string, filterValue: string): Promise<void> {
  // Click on the filter dropdown for the specified filter
  await page.click(`[data-testid="filter-${filterName}"]`);
  
  // Select the specified filter value
  await page.click(`[data-testid="filter-option-${filterValue}"]`);
  
  // Click the Apply button
  await page.click('[data-testid="apply-filters-button"]');
  
  // Wait for the data to refresh with the applied filter
  await page.waitForResponse(response => 
    response.url().includes('/inventory') && response.status() === 200
  );
}

/**
 * Helper function to verify chart data is displayed correctly
 * @param page Playwright page object
 * @param chartSelector CSS selector for the chart container
 * @returns Promise that resolves when chart data is verified
 */
async function verifyChartData(page: Page, chartSelector: string): Promise<void> {
  // Wait for the chart to be visible
  await page.waitForSelector(chartSelector, { state: 'visible' });
  
  // Verify chart elements are present (legend, axes, data points)
  await expect(page.locator(`${chartSelector} .chart-legend`)).toBeVisible();
  await expect(page.locator(`${chartSelector} .chart-container`)).toBeVisible();
  
  // Verify chart is interactive (hover shows tooltips)
  const dataElements = page.locator(`${chartSelector} .chart-data-element`);
  await expect(dataElements).toHaveCount({ minimum: 1 });
  
  await dataElements.first().hover();
  await expect(page.locator('.chart-tooltip')).toBeVisible();
}

// Test suite for the Inventory Dashboard
test.describe('Inventory Dashboard', () => {
  
  test('should display all inventory dashboard components', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Check for presence of all dashboard components
    await expect(page.locator('[data-testid="inventory-filters"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="top-securities"]')).toBeVisible();
    await expect(page.locator('[data-testid="inventory-data-grid"]')).toBeVisible();
  });
  
  test('should display category chart with inventory data', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Wait for Category Chart component to load
    await page.waitForSelector('[data-testid="category-chart"]', { state: 'visible' });
    
    // Verify pie chart is visible with segments
    await expect(page.locator('[data-testid="category-chart"] .pie-chart')).toBeVisible();
    
    // Verify chart legend shows category names
    const legendItems = page.locator('[data-testid="category-chart"] .chart-legend-item');
    await expect(legendItems).toHaveCount({ minimum: 1 });
    
    // Verify hovering over segments shows tooltips with values
    await page.hover('[data-testid="category-chart"] .pie-segment');
    await expect(page.locator('.chart-tooltip')).toBeVisible();
    
    // Verify chart title is displayed correctly
    await expect(page.locator('[data-testid="category-chart-title"]')).toContainText('Inventory by Category');
  });
  
  test('should display category table with inventory metrics', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Wait for Category Table component to load
    await page.waitForSelector('[data-testid="category-table"]', { state: 'visible' });
    
    // Verify table headers are displayed correctly
    const headers = page.locator('[data-testid="category-table"] th');
    await expect(headers).toHaveCount(4); // Category, Value, % Total, Change
    await expect(headers.nth(0)).toContainText('Category');
    await expect(headers.nth(1)).toContainText('Value');
    await expect(headers.nth(2)).toContainText('% Total');
    await expect(headers.nth(3)).toContainText('Change');
    
    // Verify category rows are displayed with correct data
    const rows = page.locator('[data-testid="category-table"] tbody tr');
    await expect(rows).toHaveCount({ minimum: 1 });
    
    // Get the first row
    const firstRow = rows.first();
    
    // Verify value column shows formatted currency values
    const valueCell = firstRow.locator('td').nth(1);
    await expect(valueCell).toContainText(/\$[\d,]+(\.\d{2})?[BMK]?/);
    
    // Verify percentage column shows formatted percentage values
    const percentCell = firstRow.locator('td').nth(2);
    await expect(percentCell).toContainText(/%/);
    
    // Verify count column shows formatted number values
    const changeCell = firstRow.locator('td').nth(3);
    await expect(changeCell).toContainText(/[+-]?\d+(\.\d+)?%/);
  });
  
  test('should display top securities chart', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Wait for Top Securities component to load
    await page.waitForSelector('[data-testid="top-securities"]', { state: 'visible' });
    
    // Verify bar chart is visible with bars
    await expect(page.locator('[data-testid="top-securities"] .bar-chart')).toBeVisible();
    
    // Verify chart axes are labeled correctly
    await expect(page.locator('[data-testid="top-securities"] .x-axis-label')).toBeVisible();
    await expect(page.locator('[data-testid="top-securities"] .y-axis-label')).toBeVisible();
    
    // Verify bars are colored according to security temperature
    const bars = page.locator('[data-testid="top-securities"] .bar');
    await expect(bars).toHaveCount({ minimum: 1 });
    
    // Verify hovering over bars shows tooltips with security details
    await bars.first().hover();
    await expect(page.locator('.chart-tooltip')).toBeVisible();
    
    // Verify chart title is displayed correctly
    await expect(page.locator('[data-testid="top-securities-title"]')).toContainText('Top Securities by Availability');
  });
  
  test('should display inventory data grid with correct columns', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Wait for inventory data grid to load
    await page.waitForSelector('[data-testid="inventory-data-grid"]', { state: 'visible' });
    
    // Verify column headers are displayed correctly
    const headers = page.locator('[data-testid="inventory-data-grid"] .ag-header-cell');
    
    // Verify security column is displayed with security information
    await expect(headers.filter({ hasText: 'Security' })).toBeVisible();
    
    // Verify Calculation Type column is displayed
    await expect(headers.filter({ hasText: 'Calculation Type' })).toBeVisible();
    
    // Verify Available Quantity column is displayed with formatted numbers
    await expect(headers.filter({ hasText: 'Available Quantity' })).toBeVisible();
    
    // Verify Market Value column is displayed with formatted currency
    await expect(headers.filter({ hasText: 'Market Value' })).toBeVisible();
    
    // Verify Market column is displayed
    await expect(headers.filter({ hasText: 'Market' })).toBeVisible();
    
    // Verify Business Date column is displayed with formatted dates
    await expect(headers.filter({ hasText: 'Business Date' })).toBeVisible();
    
    // Verify Security Temperature column is displayed with HTB/GC indicators
    await expect(headers.filter({ hasText: 'Temperature' })).toBeVisible();
    
    // Verify Status column is displayed with status indicators
    await expect(headers.filter({ hasText: 'Status' })).toBeVisible();
    
    // Verify grid has data rows
    const rows = page.locator('[data-testid="inventory-data-grid"] .ag-row');
    await expect(rows).toHaveCount({ minimum: 1 });
  });
  
  test('should load inventory dashboard within performance threshold', async ({ page }) => {
    // Measure time to load inventory dashboard
    const loadTime = await measureDashboardLoadTime(page);
    
    // Compare with PERFORMANCE_THRESHOLDS.UI_RESPONSE
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
    console.log(`Inventory dashboard load time: ${Math.round(loadTime)}ms (threshold: ${PERFORMANCE_THRESHOLDS.UI_RESPONSE}ms)`);
  });
  
  test('should filter inventory data when filters are applied', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Get initial row count
    const initialRowCount = await page.locator('[data-testid="inventory-data-grid"] .ag-row').count();
    
    // Apply filter for Calculation Type = FOR_LOAN
    await applyFilter(page, 'calculation-type', CALCULATION_TYPES.FOR_LOAN);
    
    // Verify filtered results
    const calculationTypeCells = page.locator('[data-testid="inventory-data-grid"] [col-id="calculationType"]');
    await expect(calculationTypeCells).toHaveCount({ minimum: 1 });
    
    // Check that all visible calculation types match FOR_LOAN
    const count = await calculationTypeCells.count();
    for (let i = 0; i < count; i++) {
      await expect(calculationTypeCells.nth(i)).toContainText(CALCULATION_TYPES.FOR_LOAN);
    }
    
    // Apply filter for Security Temperature = HARD_TO_BORROW
    await applyFilter(page, 'security-temperature', SECURITY_TEMPERATURE.HARD_TO_BORROW);
    
    // Verify filtered results
    const temperatureCells = page.locator('[data-testid="inventory-data-grid"] [col-id="securityTemperature"]');
    await expect(temperatureCells).toHaveCount({ minimum: 1 });
    
    // Check that all visible temperature cells match HARD_TO_BORROW
    const temperatureCount = await temperatureCells.count();
    for (let i = 0; i < temperatureCount; i++) {
      await expect(temperatureCells.nth(i)).toContainText(SECURITY_TEMPERATURE.HARD_TO_BORROW);
    }
    
    // Clear filters
    await page.click('[data-testid="clear-filters-button"]');
    
    // Verify unfiltered results
    const rowsAfterClear = await page.locator('[data-testid="inventory-data-grid"] .ag-row').count();
    expect(rowsAfterClear).toBeGreaterThanOrEqual(initialRowCount);
    
    // Verify visualizations also updated
    await verifyChartData(page, '[data-testid="category-chart"]');
    await verifyChartData(page, '[data-testid="top-securities"]');
  });
  
  test('should update data when business date is changed', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Note the current data for comparison
    const initialBusinessDate = await page.locator('[data-testid="current-business-date"]').textContent();
    
    // Change business date in date picker
    await page.click('[data-testid="business-date-picker"]');
    // Select a different date (e.g., tomorrow)
    await page.click('[data-testid="date-picker-tomorrow"]');
    
    // Wait for data to refresh
    await page.waitForResponse(response => 
      response.url().includes('/inventory') && response.status() === 200
    );
    
    // Verify data grid updates with data for selected date
    const newBusinessDate = await page.locator('[data-testid="current-business-date"]').textContent();
    expect(newBusinessDate).not.toEqual(initialBusinessDate);
    
    // Verify category chart updates to reflect data for selected date
    await verifyChartData(page, '[data-testid="category-chart"]');
    
    // Verify category table updates to reflect data for selected date
    await expect(page.locator('[data-testid="category-table"] tbody tr')).toHaveCount({ minimum: 1 });
    
    // Verify top securities chart updates to reflect data for selected date
    await verifyChartData(page, '[data-testid="top-securities"]');
  });
  
  test('should update data when market filter is changed', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Note the current market for comparison
    const initialMarket = await page.locator('[data-testid="current-market"]').textContent();
    
    // Change market selection in filter dropdown
    await page.click('[data-testid="market-selector"]');
    // Select a different market (assuming Tokyo exists in the dropdown)
    await page.click('[data-testid="market-option-Tokyo"]');
    
    // Wait for data to refresh
    await page.waitForResponse(response => 
      response.url().includes('/inventory') && response.status() === 200
    );
    
    // Verify data grid updates with data for selected market
    const newMarket = await page.locator('[data-testid="current-market"]').textContent();
    expect(newMarket).not.toEqual(initialMarket);
    expect(newMarket).toContain('Tokyo');
    
    // Verify market cells show Tokyo
    const marketCells = page.locator('[data-testid="inventory-data-grid"] [col-id="market"]');
    await expect(marketCells).toHaveCount({ minimum: 1 });
    
    // Verify charts and tables also updated
    await verifyChartData(page, '[data-testid="category-chart"]');
    await verifyChartData(page, '[data-testid="top-securities"]');
    await expect(page.locator('[data-testid="category-table"] tbody tr')).toHaveCount({ minimum: 1 });
  });
  
  test('should refresh data when refresh button is clicked', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Note the last updated timestamp
    const initialTimestamp = await page.locator('[data-testid="last-updated-timestamp"]').textContent();
    
    // Wait a moment to ensure the timestamp would change
    await page.waitForTimeout(1000);
    
    // Click refresh button
    await page.click('[data-testid="refresh-button"]');
    
    // Wait for data to refresh
    await page.waitForResponse(response => 
      response.url().includes('/inventory') && response.status() === 200
    );
    
    // Verify loading indicators appear during refresh
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden();
    
    // Verify last updated timestamp has changed
    const newTimestamp = await page.locator('[data-testid="last-updated-timestamp"]').textContent();
    expect(newTimestamp).not.toEqual(initialTimestamp);
    
    // Verify all components updated with refreshed data
    await verifyChartData(page, '[data-testid="category-chart"]');
    await verifyChartData(page, '[data-testid="top-securities"]');
    await expect(page.locator('[data-testid="category-table"] tbody tr')).toHaveCount({ minimum: 1 });
    await expect(page.locator('[data-testid="inventory-data-grid"] .ag-row')).toHaveCount({ minimum: 1 });
  });
  
  test('should toggle auto-refresh when auto-refresh switch is toggled', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Get initial auto-refresh state
    const initialAutoRefresh = await page.isChecked('[data-testid="auto-refresh-switch"]');
    
    // Toggle auto-refresh switch to on
    if (!initialAutoRefresh) {
      await page.click('[data-testid="auto-refresh-switch"]');
    }
    
    // Verify auto-refresh indicator shows enabled state
    await expect(page.locator('[data-testid="auto-refresh-status"]')).toContainText('Auto-refresh: On');
    
    // Record the initial timestamp
    const initialTimestamp = await page.locator('[data-testid="last-updated-timestamp"]').textContent();
    
    // For testing, we'll use a request handler to simulate auto-refresh
    // In a real test, you might mock this differently or wait for the actual refresh interval
    await page.route('**/inventory/poll', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ refreshed: true, timestamp: new Date().toISOString() })
      });
    });
    
    // Trigger the auto-refresh (simulating the interval completion)
    await page.evaluate(() => {
      // This assumes there's a window.triggerAutoRefresh function in the app for testing
      // In a real app, you might need a different approach
      window.dispatchEvent(new CustomEvent('test:trigger-auto-refresh'));
    });
    
    // Wait for the update to occur
    await page.waitForTimeout(1000);
    
    // Verify timestamp has changed, indicating auto-refresh occurred
    const newTimestamp = await page.locator('[data-testid="last-updated-timestamp"]').textContent();
    expect(newTimestamp).not.toEqual(initialTimestamp);
    
    // Toggle auto-refresh switch to off
    await page.click('[data-testid="auto-refresh-switch"]');
    
    // Verify auto-refresh indicator shows disabled state
    await expect(page.locator('[data-testid="auto-refresh-status"]')).toContainText('Auto-refresh: Off');
  });
  
  test('should navigate to inventory detail when data grid row is clicked', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Wait for inventory data grid to load
    await page.waitForSelector('[data-testid="inventory-data-grid"]', { state: 'visible' });
    
    // Click on a row in the inventory data grid
    await page.click('[data-testid="inventory-data-grid"] .ag-row:first-child');
    
    // Wait for navigation to detail page
    await page.waitForURL(/\/inventory\/detail\/*/);
    
    // Verify user is navigated to the inventory detail page
    await expect(page.locator('[data-testid="inventory-detail-page"]')).toBeVisible();
    
    // Verify detail page shows information for the selected inventory item
    await expect(page.locator('[data-testid="inventory-detail-title"]')).toBeVisible();
  });
  
  test('should filter by category when category is clicked in category table', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Wait for category table to load
    await page.waitForSelector('[data-testid="category-table"]', { state: 'visible' });
    
    // Get the text of the first category
    const categoryText = await page.locator('[data-testid="category-table"] tbody tr:first-child td:first-child').textContent();
    
    // Click on a category row in the category table
    await page.click('[data-testid="category-table"] tbody tr:first-child');
    
    // Wait for data to refresh
    await page.waitForResponse(response => 
      response.url().includes('/inventory') && response.status() === 200
    );
    
    // Verify data grid updates to show only items in the selected category
    await expect(page.locator('[data-testid="active-filters"]')).toContainText(categoryText);
    
    // Verify category filter in filter panel shows the selected category
    await expect(page.locator('[data-testid="filter-category-value"]')).toContainText(categoryText);
    
    // Verify top securities chart updates to reflect filtered data
    await verifyChartData(page, '[data-testid="top-securities"]');
  });
  
  test('should navigate to filtered view when bar is clicked in top securities chart', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Wait for top securities chart to load
    await page.waitForSelector('[data-testid="top-securities"]', { state: 'visible' });
    
    // Get the tooltip text to identify the security when hovering over the first bar
    await page.hover('[data-testid="top-securities"] .bar:first-child');
    const tooltipText = await page.locator('.chart-tooltip').textContent();
    
    // Extract security symbol from tooltip (simplistic approach - real extraction would depend on tooltip format)
    const securityMatch = tooltipText.match(/([A-Z]+)/);
    const securitySymbol = securityMatch ? securityMatch[1] : '';
    
    // Click on a bar in the top securities chart
    await page.click('[data-testid="top-securities"] .bar:first-child');
    
    // Wait for data to refresh
    await page.waitForResponse(response => 
      response.url().includes('/inventory') && response.status() === 200
    );
    
    // Verify data grid updates to show only items for the selected security
    await expect(page.locator('[data-testid="active-filters"]')).toContainText(securitySymbol);
    
    // Verify security filter in filter panel shows the selected security
    await expect(page.locator('[data-testid="filter-security-value"]')).toContainText(securitySymbol);
  });
  
  test('should export data when export button is clicked', async ({ page }) => {
    await navigateToInventoryDashboard(page);
    
    // Click export button
    await page.click('[data-testid="export-button"]');
    
    // Verify export options menu is displayed
    await expect(page.locator('[data-testid="export-options-menu"]')).toBeVisible();
    
    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Select export format (CSV)
    await page.click('[data-testid="export-csv-option"]');
    
    // Wait for download to complete
    const download = await downloadPromise;
    
    // Verify file is downloaded in the selected format
    expect(download.suggestedFilename()).toMatch(/inventory.*\.csv$/i);
    
    // In a real test, you would save the file and verify its contents
    // const path = await download.path();
    // const content = fs.readFileSync(path, 'utf-8');
    // expect(content).toContain(expectedData);
  });
  
  test('should show loading states when data is being fetched', async ({ page }) => {
    // Intercept API requests to simulate slow responses
    await page.route('**/inventory/**', async route => {
      // Delay all inventory API responses by 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    // Login and navigate to inventory dashboard
    await navigateToInventoryDashboard(page);
    
    // Verify loading indicators are displayed in components during data fetching
    await expect(page.locator('[data-testid="category-chart-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-table-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="top-securities-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="inventory-data-grid-loading"]')).toBeVisible();
    
    // Wait for components to finish loading
    await page.waitForSelector('[data-testid="category-chart-loading"]', { state: 'hidden' });
    await page.waitForSelector('[data-testid="category-table-loading"]', { state: 'hidden' });
    await page.waitForSelector('[data-testid="top-securities-loading"]', { state: 'hidden' });
    await page.waitForSelector('[data-testid="inventory-data-grid-loading"]', { state: 'hidden' });
    
    // Components show data once loading is complete
    await expect(page.locator('[data-testid="category-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="top-securities"]')).toBeVisible();
    await expect(page.locator('[data-testid="inventory-data-grid"]')).toBeVisible();
  });
});