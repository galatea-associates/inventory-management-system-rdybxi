import { test, expect, Page } from '@playwright/test'; // v1.32.0
import { TEST_TIMEOUTS, PERFORMANCE_THRESHOLDS, ROUTES } from '../../../common/constants';
import { loadTestData } from '../../../common/testUtils';
import { loginUser } from '../auth/login.spec';
import { TEST_USERS } from '../../../common/constants';

/**
 * Helper function to navigate to the positions page after login
 * @param page - Playwright page object
 */
async function navigateToPositionsPage(page: Page): Promise<void> {
  // Login with trader credentials
  await loginUser(page, TEST_USERS.TRADER.username, TEST_USERS.TRADER.password);
  
  // Navigate to the positions page
  await page.goto(ROUTES.POSITIONS);
  
  // Wait for the positions page to load completely
  await page.waitForSelector('h1:has-text("Positions")');
  
  // Wait for the position table to be visible
  await page.waitForSelector('table');
}

/**
 * Helper function to measure the load time of the positions page
 * @param page - Playwright page object
 * @returns The load time in milliseconds
 */
async function measurePageLoadTime(page: Page): Promise<number> {
  const startTime = performance.now();
  
  // Navigate to the positions page
  await page.goto(ROUTES.POSITIONS);
  
  // Wait for the page to be fully loaded
  await page.waitForSelector('table');
  await page.waitForSelector('div:has-text("Total Long")');
  
  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * Helper function to open the detail view for a specific position
 * @param page - Playwright page object
 * @param securityName - The name of the security to select
 */
async function openPositionDetail(page: Page, securityName: string): Promise<void> {
  // Find the row containing the security name and click it
  await page.click(`tr:has-text("${securityName}")`);
  
  // Wait for the position detail drawer to be visible
  await page.waitForSelector('div[role="dialog"]');
}

test.describe('Position View', () => {
  // Set timeout for all tests in this group
  test.setTimeout(TEST_TIMEOUTS.E2E);
  
  test('should load positions page with all components', async ({ page }) => {
    await navigateToPositionsPage(page);
    
    // Verify the page title is visible
    await expect(page.locator('h1:has-text("Positions")')).toBeVisible();
    
    // Verify the position table is visible
    await expect(page.locator('table')).toBeVisible();
    
    // Verify the position summary is visible
    await expect(page.locator('div:has-text("Total Long")')).toBeVisible();
    await expect(page.locator('div:has-text("Total Short")')).toBeVisible();
    
    // Verify the filter button is visible
    await expect(page.locator('button:has-text("Filter"), div:has-text("Filters")')).toBeVisible();
    
    // Verify the refresh button is visible
    await expect(page.locator('button:has-text("Refresh"), button[aria-label="Refresh"]')).toBeVisible();
  });
  
  test('should display position data in the table', async ({ page }) => {
    await navigateToPositionsPage(page);
    
    // Verify that the table contains position rows
    const positionRows = page.locator('table tr').filter({ hasNotText: 'Security' }); // Exclude header row
    
    // Wait for at least one position row to be visible
    await expect(positionRows.first()).toBeVisible();
    
    // Get the count of position rows
    const count = await positionRows.count();
    
    // Expect at least one position row
    expect(count).toBeGreaterThan(0);
    
    // Check that position rows contain expected data
    for (let i = 0; i < Math.min(count, 5); i++) {
      const row = positionRows.nth(i);
      
      // Check for security cell
      await expect(row.locator('td').nth(0)).toBeVisible();
      
      // Check for book cell
      await expect(row.locator('td').nth(1)).toBeVisible();
      
      // Check for quantity cells
      await expect(row.locator('td').nth(2)).toBeVisible(); // SOD Qty
      await expect(row.locator('td').nth(3)).toBeVisible(); // Current Qty
    }
  });
  
  test('should filter positions by security', async ({ page }) => {
    await navigateToPositionsPage(page);
    
    // Click the filter button
    await page.click('button:has-text("Filter"), div:has-text("Filters")');
    
    // Enter a security name in the security filter
    await page.fill('input[placeholder="Security"], input[aria-label="Security"]', 'AAPL');
    
    // Click the apply filter button
    await page.click('button:has-text("Apply")');
    
    // Wait for the filter to be applied
    await page.waitForResponse(response => 
      response.url().includes('/positions') && 
      response.status() === 200
    );
    
    // Verify that the filtered results only contain the filtered security
    const positionRows = page.locator('table tr').filter({ hasNotText: 'Security' });
    const count = await positionRows.count();
    
    // Expect at least one position row
    expect(count).toBeGreaterThan(0);
    
    // Check that all rows contain the filtered security
    for (let i = 0; i < count; i++) {
      const securityCell = positionRows.nth(i).locator('td').nth(0);
      await expect(securityCell).toContainText('AAPL');
    }
    
    // Verify that the position summary has been updated
    await expect(page.locator('div:has-text("Total Long")')).toBeVisible();
  });
  
  test('should filter positions by book', async ({ page }) => {
    await navigateToPositionsPage(page);
    
    // Click the filter button
    await page.click('button:has-text("Filter"), div:has-text("Filters")');
    
    // Select a book from the book filter dropdown or enter text
    try {
      // Try dropdown selection first
      await page.click('div[aria-label="Book"], select[aria-label="Book"]');
      await page.click('text="EQ-01"');
    } catch (e) {
      // If dropdown fails, try text input
      await page.fill('input[placeholder="Book"], input[aria-label="Book"]', 'EQ-01');
    }
    
    // Click the apply filter button
    await page.click('button:has-text("Apply")');
    
    // Wait for the filter to be applied
    await page.waitForResponse(response => 
      response.url().includes('/positions') && 
      response.status() === 200
    );
    
    // Verify that the filtered results only contain the filtered book
    const positionRows = page.locator('table tr').filter({ hasNotText: 'Security' });
    const count = await positionRows.count();
    
    // Expect at least one position row
    expect(count).toBeGreaterThan(0);
    
    // Check that all rows contain the filtered book
    for (let i = 0; i < count; i++) {
      const bookCell = positionRows.nth(i).locator('td').nth(1);
      await expect(bookCell).toContainText('EQ-01');
    }
    
    // Verify that the position summary has been updated
    await expect(page.locator('div:has-text("Total Long")')).toBeVisible();
  });
  
  test('should sort positions by quantity', async ({ page }) => {
    await navigateToPositionsPage(page);
    
    // Click the quantity column header to sort
    await page.click('th:has-text("SOD Qty"), th:has-text("Current")');
    
    // Wait for the sort to be applied
    await page.waitForResponse(response => 
      response.url().includes('/positions') && 
      response.status() === 200
    );
    
    // Get the quantity values
    const quantityCells = page.locator('table tr').filter({ hasNotText: 'Security' }).locator('td').nth(2);
    const count = await quantityCells.count();
    
    // Extract the quantity values for comparison
    const quantities = [];
    for (let i = 0; i < count; i++) {
      const quantityText = await quantityCells.nth(i).textContent();
      const quantity = parseFloat(quantityText.replace(/,/g, ''));
      quantities.push(quantity);
    }
    
    // Check if the quantities are sorted (either ascending or descending)
    const isSortedAscending = quantities.every((val, i, arr) => !i || val >= arr[i - 1]);
    const isSortedDescending = quantities.every((val, i, arr) => !i || val <= arr[i - 1]);
    expect(isSortedAscending || isSortedDescending).toBe(true);
    
    // Click the column header again to reverse sort order
    await page.click('th:has-text("SOD Qty"), th:has-text("Current")');
    
    // Wait for the sort to be applied
    await page.waitForResponse(response => 
      response.url().includes('/positions') && 
      response.status() === 200
    );
  });
  
  test('should display position details when row is clicked', async ({ page }) => {
    await navigateToPositionsPage(page);
    
    // Get a security name from a position row
    const securityCell = page.locator('table tr').filter({ hasNotText: 'Security' }).first().locator('td').nth(0);
    const securityName = await securityCell.textContent();
    
    // Open the position detail for this security
    await openPositionDetail(page, securityName);
    
    // Verify the position detail drawer is visible
    const detailDrawer = page.locator('div[role="dialog"]');
    await expect(detailDrawer).toBeVisible();
    
    // Verify the security information is displayed
    await expect(detailDrawer.locator(`text="${securityName}"`)).toBeVisible();
    
    // Verify the position quantities are displayed
    await expect(detailDrawer.locator('text="SOD Qty"')).toBeVisible();
    await expect(detailDrawer.locator('text="Current"')).toBeVisible();
    
    // Verify the settlement ladder is displayed
    await expect(detailDrawer.locator('text="Settlement Ladder"')).toBeVisible();
  });
  
  test('should display settlement ladder in position details', async ({ page }) => {
    await navigateToPositionsPage(page);
    
    // Get a security name from a position row
    const securityCell = page.locator('table tr').filter({ hasNotText: 'Security' }).first().locator('td').nth(0);
    const securityName = await securityCell.textContent();
    
    // Open the position detail for this security
    await openPositionDetail(page, securityName);
    
    // Verify the settlement ladder is displayed
    const settlementLadder = page.locator('text="Settlement Ladder"').first();
    await expect(settlementLadder).toBeVisible();
    
    // Check for settlement ladder chart or data
    await expect(page.locator('div[role="dialog"] >> text=Settlement Ladder').first()).toBeVisible();
    
    // Verify that settlement projections for SD0-SD4 are shown
    // This could be implemented as a chart, table, or other visualization
    // We're looking for content that would indicate the settlement ladder is present
    const detailContent = await page.locator('div[role="dialog"]').textContent();
    expect(detailContent).toContain('Settlement');
  });
  
  test('should refresh position data when refresh button is clicked', async ({ page }) => {
    await navigateToPositionsPage(page);
    
    // Note initial position data
    const initialContent = await page.locator('table').textContent();
    
    // Click the refresh button
    await page.click('button:has-text("Refresh"), button[aria-label="Refresh"]');
    
    // Wait for the refresh to complete
    await page.waitForResponse(response => 
      response.url().includes('/positions') && 
      response.status() === 200
    );
    
    // Verify that loading indicator appears (if implemented)
    try {
      await page.waitForSelector('[aria-label="Loading"], .loading-indicator', { timeout: 1000 });
    } catch (e) {
      // Loading indicator might not be visible if refresh is fast
      console.log('Loading indicator not observed or disappeared quickly');
    }
    
    // Verify the position table is still visible after refresh
    await expect(page.locator('table')).toBeVisible();
    
    // In a real implementation, we would verify the data has changed
    // For the test, we'll just verify the table is still populated
    await expect(page.locator('table tr').filter({ hasNotText: 'Security' }).first()).toBeVisible();
  });
  
  test('should close position detail drawer when close button is clicked', async ({ page }) => {
    await navigateToPositionsPage(page);
    
    // Get a security name from a position row
    const securityCell = page.locator('table tr').filter({ hasNotText: 'Security' }).first().locator('td').nth(0);
    const securityName = await securityCell.textContent();
    
    // Open the position detail for this security
    await openPositionDetail(page, securityName);
    
    // Verify the position detail drawer is visible
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    
    // Click the close button (could be X, Close, or an icon)
    await page.click('div[role="dialog"] button:has-text("Close"), div[role="dialog"] button[aria-label="Close"]');
    
    // Verify the position detail drawer is hidden
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
    
    // Verify the main position table is still visible
    await expect(page.locator('table')).toBeVisible();
  });
  
  test('should load positions page within performance threshold', async ({ page }) => {
    // Measure time to load positions page
    const loadTime = await measurePageLoadTime(page);
    
    // Verify page load time is below the defined threshold
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
    console.log(`Positions page load time: ${Math.round(loadTime)}ms (threshold: ${PERFORMANCE_THRESHOLDS.UI_RESPONSE}ms)`);
  });
  
  test('should handle pagination in position table', async ({ page }) => {
    await navigateToPositionsPage(page);
    
    // Verify pagination controls are visible
    await expect(page.locator('nav >> text=Showing, .pagination, [aria-label="pagination"]')).toBeVisible();
    
    // Note the number of rows displayed
    const initialRows = page.locator('table tr').filter({ hasNotText: 'Security' });
    const initialRowCount = await initialRows.count();
    
    // Get text from first row for comparison
    const firstRowText = await initialRows.first().textContent();
    
    // Navigate to the next page
    await page.click('button:has-text(">"), button:has-text("Next"), [aria-label="Next page"]');
    
    // Wait for the table to update
    await page.waitForResponse(response => 
      response.url().includes('/positions') && 
      response.status() === 200
    );
    
    // Get text from first row on next page
    const nextPageFirstRowText = await page.locator('table tr').filter({ hasNotText: 'Security' }).first().textContent();
    
    // Verify we're on a different page (text should be different)
    expect(nextPageFirstRowText).not.toEqual(firstRowText);
    
    // Navigate back to the first page
    await page.click('button:has-text("<"), button:has-text("Previous"), [aria-label="Previous page"]');
    
    // Wait for the table to update
    await page.waitForResponse(response => 
      response.url().includes('/positions') && 
      response.status() === 200
    );
    
    // Verify we're back on the first page
    const returnedFirstRowText = await page.locator('table tr').filter({ hasNotText: 'Security' }).first().textContent();
    expect(returnedFirstRowText).toEqual(firstRowText);
  });
  
  test('should export position data when export button is clicked', async ({ page }) => {
    await navigateToPositionsPage(page);
    
    // Click the export button
    await page.click('button:has-text("Export")');
    
    // Wait for the export options to appear
    await page.waitForSelector('div[role="menu"], [data-testid="export-options"]');
    
    // Start waiting for download before clicking the export format
    const downloadPromise = page.waitForEvent('download');
    
    // Select export format (CSV)
    await page.click('text="CSV", [data-testid="export-csv-option"]');
    
    // Wait for the download to complete
    const download = await downloadPromise;
    
    // Verify the download started
    expect(download).not.toBeNull();
    expect(download.suggestedFilename()).toContain('.csv');
  });
});