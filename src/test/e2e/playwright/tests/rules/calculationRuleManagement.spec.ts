import { test, expect, Page } from '@playwright/test';
import { CALCULATION_TYPES, TEST_TIMEOUTS, PERFORMANCE_THRESHOLDS } from '../../../common/constants';
import { loadTestData } from '../../../common/testUtils';

/**
 * Helper function to login as an admin user before testing rule management
 */
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="username-input"]', 'admin');
  await page.fill('[data-testid="password-input"]', 'admin123');
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login and redirect to dashboard
  await page.waitForURL('/dashboard');
}

/**
 * Helper function to navigate to the calculation rules page
 */
async function navigateToRulesPage(page: Page): Promise<void> {
  await page.click('[data-testid="sidebar-rules"]');
  await page.waitForURL('**/rules');
  await expect(page.locator('h1:has-text("Calculation Rules")')).toBeVisible();
}

/**
 * Helper function to create a test calculation rule
 */
async function createTestRule(page: Page, ruleData: any): Promise<string> {
  await page.click('[data-testid="create-rule-button"]');
  await page.waitForSelector('[data-testid="rule-form"]');
  
  await fillRuleBasicInfo(page, ruleData);
  
  if (ruleData.criteria) {
    await selectRuleCriteria(page, ruleData.criteria);
  }
  
  if (ruleData.conditions && ruleData.conditions.length > 0) {
    await addRuleConditions(page, ruleData.conditions);
  }
  
  if (ruleData.actions && ruleData.actions.length > 0) {
    await addRuleActions(page, ruleData.actions);
  }
  
  await page.click('[data-testid="save-button"]');
  await page.waitForSelector('[data-testid="rule-detail-view"]');
  
  return ruleData.name;
}

/**
 * Helper function to fill in the basic information for a rule
 */
async function fillRuleBasicInfo(page: Page, ruleData: any): Promise<void> {
  await page.fill('[data-testid="rule-name-input"]', ruleData.name);
  await page.fill('[data-testid="rule-description-input"]', ruleData.description);
  
  // Select rule type
  await page.click('[data-testid="rule-type-select"]');
  await page.click(`[data-value="${ruleData.type}"]`);
  
  // Select market
  await page.click('[data-testid="rule-market-select"]');
  await page.click(`[data-value="${ruleData.market}"]`);
  
  // Set priority
  await page.fill('[data-testid="rule-priority-input"]', ruleData.priority.toString());
  
  // Set effective date
  await page.fill('[data-testid="effective-date-input"]', ruleData.effectiveDate);
  
  // Set expiry date if provided
  if (ruleData.expiryDate) {
    await page.fill('[data-testid="expiry-date-input"]', ruleData.expiryDate);
  }
}

/**
 * Helper function to select inclusion and exclusion criteria for a rule
 */
async function selectRuleCriteria(page: Page, criteria: any): Promise<void> {
  // Click on the Criteria tab
  await page.click('[data-testid="criteria-tab"]');
  
  // Select inclusion criteria
  if (criteria.include && criteria.include.length > 0) {
    for (const item of criteria.include) {
      await page.check(`[data-testid="include-${item}"]`);
    }
  }
  
  // Select exclusion criteria
  if (criteria.exclude && criteria.exclude.length > 0) {
    for (const item of criteria.exclude) {
      await page.check(`[data-testid="exclude-${item}"]`);
    }
  }
}

/**
 * Helper function to add conditions to a rule
 */
async function addRuleConditions(page: Page, conditions: any[]): Promise<void> {
  // Click on the Conditions tab
  await page.click('[data-testid="conditions-tab"]');
  
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    
    // Click the Add Condition button
    await page.click('[data-testid="add-condition-button"]');
    
    // Fill in the condition details
    await page.click(`[data-testid="condition-${i}-attribute-select"]`);
    await page.click(`[data-value="${condition.attribute}"]`);
    
    await page.click(`[data-testid="condition-${i}-operator-select"]`);
    await page.click(`[data-value="${condition.operator}"]`);
    
    await page.fill(`[data-testid="condition-${i}-value-input"]`, condition.value);
    
    // Select logical operator if not the last condition
    if (i < conditions.length - 1) {
      await page.click(`[data-testid="condition-${i}-logical-select"]`);
      await page.click(`[data-value="${condition.logical || 'AND'}"]`);
    }
  }
}

/**
 * Helper function to add actions to a rule
 */
async function addRuleActions(page: Page, actions: any[]): Promise<void> {
  // Click on the Actions tab
  await page.click('[data-testid="actions-tab"]');
  
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    
    // Click the Add Action button
    await page.click('[data-testid="add-action-button"]');
    
    // Fill in the action details
    await page.click(`[data-testid="action-${i}-type-select"]`);
    await page.click(`[data-value="${action.type}"]`);
    
    await page.fill(`[data-testid="action-${i}-parameters-input"]`, action.parameters);
  }
}

/**
 * Helper function to measure page load time
 */
async function measurePageLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  const endTime = Date.now();
  return endTime - startTime;
}

test.describe('Calculation Rule Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display calculation rules page with all elements', async ({ page }) => {
    await navigateToRulesPage(page);
    
    // Verify page title
    await expect(page.locator('h1:has-text("Calculation Rules")')).toBeVisible();
    
    // Verify filter section
    await expect(page.locator('[data-testid="rule-filters"]')).toBeVisible();
    await expect(page.locator('[data-testid="calculation-type-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="market-filter"]')).toBeVisible();
    
    // Verify rule list
    await expect(page.locator('[data-testid="rules-table"]')).toBeVisible();
    await expect(page.locator('th:has-text("Rule Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Type")')).toBeVisible();
    await expect(page.locator('th:has-text("Market")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Version")')).toBeVisible();
    
    // Verify create rule button
    await expect(page.locator('[data-testid="create-rule-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-rule-button"]')).toBeEnabled();
  });

  test('should create a new calculation rule successfully', async ({ page }) => {
    await navigateToRulesPage(page);
    
    // Load test data
    const testRuleData = {
      name: `Test Rule ${Date.now()}`,
      description: 'This is a test rule for E2E testing',
      type: CALCULATION_TYPES.FOR_LOAN,
      market: 'Global',
      priority: 100,
      effectiveDate: '2023-06-15',
      criteria: {
        include: ['LONG_POSITIONS', 'HYPOTHECATABLE_ASSETS', 'REPO_PLEDGED_ASSETS'],
        exclude: ['SLAB_LENDING', 'PAY_TO_HOLDS']
      },
      conditions: [
        {
          attribute: 'securityType',
          operator: 'EQUALS',
          value: 'EQUITY',
          logical: 'AND'
        },
        {
          attribute: 'market',
          operator: 'EQUALS',
          value: 'US'
        }
      ],
      actions: [
        {
          type: 'INCLUDE_IN_CALCULATION',
          parameters: 'quantity * 1.0'
        }
      ]
    };
    
    // Create the rule
    const ruleName = await createTestRule(page, testRuleData);
    
    // Verify success message
    await expect(page.locator('.MuiAlert-standardSuccess')).toBeVisible();
    
    // Verify rule detail view shows the correct data
    await expect(page.locator(`[data-testid="rule-name-value"]:has-text("${ruleName}")`)).toBeVisible();
    await expect(page.locator(`[data-testid="rule-type-value"]:has-text("${testRuleData.type}")`)).toBeVisible();
    await expect(page.locator(`[data-testid="rule-market-value"]:has-text("${testRuleData.market}")`)).toBeVisible();
    
    // Go back to list view and verify the rule appears in the list
    await page.click('[data-testid="back-to-list-button"]');
    await expect(page.locator(`tr:has-text("${ruleName}")`)).toBeVisible();
  });

  test('should validate required fields when creating a rule', async ({ page }) => {
    await navigateToRulesPage(page);
    
    // Click create rule button
    await page.click('[data-testid="create-rule-button"]');
    await page.waitForSelector('[data-testid="rule-form"]');
    
    // Try to save without filling required fields
    await page.click('[data-testid="save-button"]');
    
    // Verify validation error messages
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Type is required')).toBeVisible();
    await expect(page.locator('text=Market is required')).toBeVisible();
    await expect(page.locator('text=Effective date is required')).toBeVisible();
    
    // Verify form is still in edit mode
    await expect(page.locator('[data-testid="rule-form"]')).toBeVisible();
  });

  test('should filter rules by type and market', async ({ page }) => {
    // Create test rules with different types and markets
    await navigateToRulesPage(page);
    
    // Create FOR_LOAN rule for Global market
    await createTestRule(page, {
      name: `Loan Rule Global ${Date.now()}`,
      description: 'Test for loan rule for global market',
      type: CALCULATION_TYPES.FOR_LOAN,
      market: 'Global',
      priority: 100,
      effectiveDate: '2023-06-15'
    });
    
    // Go back to list view
    await page.click('[data-testid="back-to-list-button"]');
    
    // Create FOR_PLEDGE rule for Japan market
    await createTestRule(page, {
      name: `Pledge Rule Japan ${Date.now()}`,
      description: 'Test for pledge rule for Japan market',
      type: CALCULATION_TYPES.FOR_PLEDGE,
      market: 'Japan',
      priority: 100,
      effectiveDate: '2023-06-15'
    });
    
    // Go back to list view
    await page.click('[data-testid="back-to-list-button"]');
    
    // Filter by FOR_LOAN type
    await page.click('[data-testid="calculation-type-filter"]');
    await page.click(`[data-value="${CALCULATION_TYPES.FOR_LOAN}"]`);
    
    // Verify only FOR_LOAN rules are visible
    await expect(page.locator(`tr:has-text("${CALCULATION_TYPES.FOR_LOAN}")`)).toBeVisible();
    await expect(page.locator(`tr:has-text("${CALCULATION_TYPES.FOR_PLEDGE}")`)).not.toBeVisible();
    
    // Clear type filter
    await page.click('[data-testid="clear-type-filter"]');
    
    // Filter by Japan market
    await page.click('[data-testid="market-filter"]');
    await page.click('[data-value="Japan"]');
    
    // Verify only Japan market rules are visible
    await expect(page.locator('tr:has-text("Japan")')).toBeVisible();
    await expect(page.locator('tr:has-text("Global")')).not.toBeVisible();
    
    // Verify filter indicators show active filters
    await expect(page.locator('[data-testid="active-filter-market"]')).toBeVisible();
  });

  test('should view rule details', async ({ page }) => {
    await navigateToRulesPage(page);
    
    // Create test rule
    const testRuleData = {
      name: `Detail Test Rule ${Date.now()}`,
      description: 'Rule for testing detail view',
      type: CALCULATION_TYPES.FOR_LOAN,
      market: 'Global',
      priority: 100,
      effectiveDate: '2023-06-15',
      criteria: {
        include: ['LONG_POSITIONS'],
        exclude: ['SLAB_LENDING']
      }
    };
    
    await createTestRule(page, testRuleData);
    
    // Go back to list view
    await page.click('[data-testid="back-to-list-button"]');
    
    // Click on the rule in the list
    await page.click(`tr:has-text("${testRuleData.name}")`);
    
    // Verify rule detail view is displayed
    await expect(page.locator('[data-testid="rule-detail-view"]')).toBeVisible();
    
    // Verify rule data matches the created rule
    await expect(page.locator(`[data-testid="rule-name-value"]:has-text("${testRuleData.name}")`)).toBeVisible();
    await expect(page.locator(`[data-testid="rule-description-value"]:has-text("${testRuleData.description}")`)).toBeVisible();
    await expect(page.locator(`[data-testid="rule-type-value"]:has-text("${testRuleData.type}")`)).toBeVisible();
    await expect(page.locator(`[data-testid="rule-market-value"]:has-text("${testRuleData.market}")`)).toBeVisible();
    
    // Verify criteria section is visible
    await page.click('[data-testid="criteria-tab"]');
    await expect(page.locator('text=LONG_POSITIONS')).toBeVisible();
    await expect(page.locator('text=SLAB_LENDING')).toBeVisible();
  });

  test('should edit an existing rule', async ({ page }) => {
    await navigateToRulesPage(page);
    
    // Create test rule
    const testRuleData = {
      name: `Edit Test Rule ${Date.now()}`,
      description: 'Rule for testing edit functionality',
      type: CALCULATION_TYPES.FOR_LOAN,
      market: 'Global',
      priority: 100,
      effectiveDate: '2023-06-15'
    };
    
    await createTestRule(page, testRuleData);
    
    // Click edit button
    await page.click('[data-testid="edit-button"]');
    
    // Modify rule data
    const updatedDescription = 'Updated description for testing';
    await page.fill('[data-testid="rule-description-input"]', updatedDescription);
    
    // Change priority
    await page.fill('[data-testid="rule-priority-input"]', '200');
    
    // Save changes
    await page.click('[data-testid="save-button"]');
    
    // Verify success message
    await expect(page.locator('.MuiAlert-standardSuccess')).toBeVisible();
    
    // Verify rule detail view shows updated data
    await expect(page.locator(`[data-testid="rule-description-value"]:has-text("${updatedDescription}")`)).toBeVisible();
    await expect(page.locator('[data-testid="rule-priority-value"]:has-text("200")')).toBeVisible();
    
    // Go back to list view
    await page.click('[data-testid="back-to-list-button"]');
    
    // Verify changes are reflected in the rule list
    await expect(page.locator(`tr:has-text("${testRuleData.name}")`)).toBeVisible();
  });

  test('should test a rule with sample data', async ({ page }) => {
    await navigateToRulesPage(page);
    
    // Create test rule
    const testRuleData = {
      name: `Test Execution Rule ${Date.now()}`,
      description: 'Rule for testing execution',
      type: CALCULATION_TYPES.FOR_LOAN,
      market: 'Global',
      priority: 100,
      effectiveDate: '2023-06-15',
      criteria: {
        include: ['LONG_POSITIONS'],
        exclude: []
      },
      conditions: [
        {
          attribute: 'securityType',
          operator: 'EQUALS',
          value: 'EQUITY'
        }
      ],
      actions: [
        {
          type: 'INCLUDE_IN_CALCULATION',
          parameters: 'quantity * 1.0'
        }
      ]
    };
    
    await createTestRule(page, testRuleData);
    
    // Click test button
    await page.click('[data-testid="test-button"]');
    
    // Verify test results modal is displayed
    await expect(page.locator('[data-testid="test-results-modal"]')).toBeVisible();
    
    // Verify test results show expected outcome
    await expect(page.locator('[data-testid="test-results-status"]:has-text("Success")')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="close-test-modal"]');
  });

  test('should publish a draft rule', async ({ page }) => {
    await navigateToRulesPage(page);
    
    // Create test rule with draft status
    const testRuleData = {
      name: `Draft Rule ${Date.now()}`,
      description: 'Rule for testing publication',
      type: CALCULATION_TYPES.FOR_LOAN,
      market: 'Global',
      priority: 100,
      effectiveDate: '2023-06-15',
      status: 'DRAFT'
    };
    
    await createTestRule(page, testRuleData);
    
    // Verify rule has draft status
    await expect(page.locator('[data-testid="rule-status-value"]:has-text("Draft")')).toBeVisible();
    
    // Click publish button
    await page.click('[data-testid="publish-button"]');
    
    // Confirm publication
    await page.click('[data-testid="confirm-publish-button"]');
    
    // Verify success message
    await expect(page.locator('.MuiAlert-standardSuccess')).toBeVisible();
    
    // Verify rule status changes to Active
    await expect(page.locator('[data-testid="rule-status-value"]:has-text("Active")')).toBeVisible();
    
    // Verify publish button is no longer available
    await expect(page.locator('[data-testid="publish-button"]')).not.toBeVisible();
    
    // Go back to list view
    await page.click('[data-testid="back-to-list-button"]');
    
    // Verify rule list shows updated status
    await expect(page.locator(`tr:has-text("${testRuleData.name}") td:has-text("Active")`)).toBeVisible();
  });

  test('should revert a rule to a previous version', async ({ page }) => {
    await navigateToRulesPage(page);
    
    // Create test rule
    const testRuleData = {
      name: `Version Test Rule ${Date.now()}`,
      description: 'Original description',
      type: CALCULATION_TYPES.FOR_LOAN,
      market: 'Global',
      priority: 100,
      effectiveDate: '2023-06-15'
    };
    
    await createTestRule(page, testRuleData);
    
    // Edit the rule to create a new version
    await page.click('[data-testid="edit-button"]');
    await page.fill('[data-testid="rule-description-input"]', 'Updated description');
    await page.click('[data-testid="save-button"]');
    
    // Verify success message
    await expect(page.locator('.MuiAlert-standardSuccess')).toBeVisible();
    
    // Verify version number is updated
    await expect(page.locator('[data-testid="rule-version-value"]:has-text("2.0")')).toBeVisible();
    
    // Click version history button
    await page.click('[data-testid="version-history-button"]');
    
    // Verify version history modal is displayed
    await expect(page.locator('[data-testid="version-history-modal"]')).toBeVisible();
    
    // Select previous version
    await page.click('[data-testid="version-1.0-row"]');
    await page.click('[data-testid="revert-button"]');
    
    // Confirm reversion
    await page.click('[data-testid="confirm-revert-button"]');
    
    // Verify success message
    await expect(page.locator('.MuiAlert-standardSuccess')).toBeVisible();
    
    // Verify rule data reverts to previous version
    await expect(page.locator('[data-testid="rule-description-value"]:has-text("Original description")')).toBeVisible();
    
    // Verify version number is updated
    await expect(page.locator('[data-testid="rule-version-value"]:has-text("3.0")')).toBeVisible();
  });

  test('should load rules page within performance threshold', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Measure time to load rules page
    const loadTime = await measurePageLoadTime(page, '/rules');
    
    // Compare with performance threshold
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
  });

  test('should complete rule creation within performance threshold', async ({ page }) => {
    await navigateToRulesPage(page);
    
    // Prepare test rule data
    const testRuleData = {
      name: `Performance Test Rule ${Date.now()}`,
      description: 'Rule for testing performance',
      type: CALCULATION_TYPES.FOR_LOAN,
      market: 'Global',
      priority: 100,
      effectiveDate: '2023-06-15'
    };
    
    // Measure time for rule creation
    const startTime = Date.now();
    
    await page.click('[data-testid="create-rule-button"]');
    await fillRuleBasicInfo(page, testRuleData);
    await page.click('[data-testid="save-button"]');
    await page.waitForSelector('[data-testid="rule-detail-view"]');
    
    const endTime = Date.now();
    const creationTime = endTime - startTime;
    
    // Compare with performance threshold
    expect(creationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
  });

  test('should handle large rule lists with pagination', async ({ page }) => {
    await navigateToRulesPage(page);
    
    // Create a test rule to ensure some data exists
    await createTestRule(page, {
      name: `Pagination Test Rule ${Date.now()}`,
      description: 'Rule for testing pagination',
      type: CALCULATION_TYPES.FOR_LOAN,
      market: 'Global',
      priority: 100,
      effectiveDate: '2023-06-15'
    });
    
    // Go back to list view
    await page.click('[data-testid="back-to-list-button"]');
    
    // Verify pagination controls exist
    await expect(page.locator('[data-testid="pagination-controls"]')).toBeVisible();
    
    // Change page size
    await page.click('[data-testid="page-size-select"]');
    await page.click('[data-value="10"]');
    
    // Verify page size is updated
    await expect(page.locator('[data-testid="page-size-select"]')).toContainText('10');
  });

  test('should sort rules by different columns', async ({ page }) => {
    await navigateToRulesPage(page);
    
    // Create a test rule to ensure some data exists
    await createTestRule(page, {
      name: `Sorting Test Rule ${Date.now()}`,
      description: 'Rule for testing sorting',
      type: CALCULATION_TYPES.FOR_LOAN,
      market: 'Global',
      priority: 100,
      effectiveDate: '2023-06-15'
    });
    
    // Go back to list view
    await page.click('[data-testid="back-to-list-button"]');
    
    // Click on Rule Name column header to sort
    await page.click('th:has-text("Rule Name")');
    
    // Verify sort indicator is visible
    await expect(page.locator('[data-testid="sort-indicator"]')).toBeVisible();
    
    // Click again to reverse sort order
    await page.click('th:has-text("Rule Name")');
    
    // Verify sort indicator changes direction
    await expect(page.locator('[data-testid="sort-indicator-desc"]')).toBeVisible();
    
    // Sort by Type column
    await page.click('th:has-text("Type")');
    
    // Verify sort indicator moves to Type column
    await expect(page.locator('th:has-text("Type") [data-testid="sort-indicator"]')).toBeVisible();
  });
});