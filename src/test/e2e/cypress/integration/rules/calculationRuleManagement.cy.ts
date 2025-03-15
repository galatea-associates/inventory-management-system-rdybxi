import { RULE_TYPES, RULE_STATUSES, MARKETS } from '../../../common/constants';

describe('Calculation Rule Management', () => {
  beforeEach(() => {
    // Login as operations user who has permission to manage calculation rules
    cy.loginByRole('OPERATIONS');
    
    // Navigate to the Rules page
    cy.visit('/rules');
    
    // Intercept API calls
    cy.interceptApi('GET', '**/api/v1/rules*', 'getRules');
    
    // Wait for page to load
    cy.getByDataTestId('rules-page-title').should('be.visible');
    cy.wait('@getRules');
  });

  it('should display the calculation rules page with correct title and create button', () => {
    cy.getByDataTestId('rules-page-title').should('contain', 'Calculation Rules');
    cy.getByDataTestId('create-rule-button').should('be.visible');
    cy.getByDataTestId('rule-list-grid').should('be.visible');
  });

  it('should display calculation rules in the data grid', () => {
    // Wait for the rules data to load
    cy.waitForTableLoad('[data-testid="rule-list-grid"]');
    
    // Verify the grid has data
    cy.get('[data-testid="rule-list-grid"] .ag-center-cols-container .ag-row').should('have.length.greaterThan', 0);
    
    // Verify the grid has the expected columns
    cy.get('[data-testid="rule-list-grid"] .ag-header-cell').should('contain', 'Name');
    cy.get('[data-testid="rule-list-grid"] .ag-header-cell').should('contain', 'Type');
    cy.get('[data-testid="rule-list-grid"] .ag-header-cell').should('contain', 'Market');
    cy.get('[data-testid="rule-list-grid"] .ag-header-cell').should('contain', 'Status');
    cy.get('[data-testid="rule-list-grid"] .ag-header-cell').should('contain', 'Effective Date');
    cy.get('[data-testid="rule-list-grid"] .ag-header-cell').should('contain', 'Version');
  });

  it('should filter calculation rules', () => {
    // Intercept the filtered API call
    cy.interceptApi('GET', '**/api/v1/rules?name=Global*', 'getFilteredRules');
    
    // Open the filter panel
    cy.getByDataTestId('filter-button').click();
    
    // Enter a rule name
    cy.getByDataTestId('name-filter').type('Global');
    
    // Select a rule type
    cy.selectByLabel('[data-testid="rule-type-filter"]', RULE_TYPES.FOR_LOAN_AVAILABILITY);
    
    // Select a market
    cy.selectByLabel('[data-testid="market-filter"]', MARKETS.GLOBAL);
    
    // Apply filters
    cy.getByDataTestId('apply-filters-button').click();
    
    // Wait for the filtered results
    cy.wait('@getFilteredRules');
    
    // Verify filtered rules are shown
    cy.get('[data-testid="rule-list-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      cy.wrap($row).find('[col-id="name"]').should('contain', 'Global');
    });
  });

  it('should display rule details when a rule is selected', () => {
    // Intercept the rule detail API call
    cy.interceptApi('GET', '**/api/v1/rules/*', 'getRuleDetail');
    
    // Wait for the rules data to load
    cy.waitForTableLoad('[data-testid="rule-list-grid"]');
    
    // Click on the first rule
    cy.get('[data-testid="rule-list-grid"] .ag-center-cols-container .ag-row').first().click();
    
    // Wait for the rule detail to load
    cy.wait('@getRuleDetail');
    
    // Verify the detail view is displayed
    cy.getByDataTestId('rule-detail-view').should('be.visible');
    
    // Verify the detail view shows the correct rule information
    cy.getByDataTestId('rule-detail-name').should('be.visible');
    cy.getByDataTestId('rule-detail-type').should('be.visible');
    cy.getByDataTestId('rule-detail-market').should('be.visible');
    cy.getByDataTestId('rule-detail-status').should('be.visible');
    
    // Verify tabs for different sections
    cy.getByDataTestId('rule-detail-tabs').should('be.visible');
    cy.getByDataTestId('tab-basic-info').should('be.visible');
    cy.getByDataTestId('tab-criteria').should('be.visible');
    cy.getByDataTestId('tab-conditions').should('be.visible');
    cy.getByDataTestId('tab-actions').should('be.visible');
  });

  it('should navigate back to rule list from detail view', () => {
    // Wait for the rules data to load
    cy.waitForTableLoad('[data-testid="rule-list-grid"]');
    
    // Click on the first rule
    cy.get('[data-testid="rule-list-grid"] .ag-center-cols-container .ag-row').first().click();
    
    // Verify the detail view is displayed
    cy.getByDataTestId('rule-detail-view').should('be.visible');
    
    // Click the back button
    cy.getByDataTestId('back-to-list-button').click();
    
    // Verify we're back to the list view
    cy.getByDataTestId('rule-list-grid').should('be.visible');
    cy.getByDataTestId('create-rule-button').should('be.visible');
  });

  it('should create a new calculation rule', () => {
    // Intercept API calls for reference data
    cy.interceptApi('GET', '**/api/v1/rules/types', 'getRuleTypes');
    cy.interceptApi('GET', '**/api/v1/rules/statuses', 'getRuleStatuses');
    cy.interceptApi('GET', '**/api/v1/rules/markets', 'getMarkets');
    cy.interceptApi('GET', '**/api/v1/rules/inclusion-criteria*', 'getInclusionCriteria');
    cy.interceptApi('GET', '**/api/v1/rules/exclusion-criteria*', 'getExclusionCriteria');
    
    // Intercept the create rule API call
    cy.interceptApi('POST', '**/api/v1/rules', 'createRule');
    
    // Click the create rule button
    cy.getByDataTestId('create-rule-button').click();
    
    // Verify the rule editor is displayed
    cy.getByDataTestId('rule-editor-view').should('be.visible');
    
    // Wait for reference data to load
    cy.wait(['@getRuleTypes', '@getRuleStatuses', '@getMarkets']);
    
    // Fill in basic information
    cy.getByDataTestId('rule-name-input').type('Test Rule');
    cy.getByDataTestId('rule-description-input').type('This is a test rule created by Cypress');
    cy.selectByLabel('[data-testid="rule-type-select"]', RULE_TYPES.FOR_LOAN_AVAILABILITY);
    cy.selectByLabel('[data-testid="rule-market-select"]', MARKETS.GLOBAL);
    cy.getByDataTestId('rule-priority-input').clear().type('10');
    cy.getByDataTestId('rule-effective-date-input').type('2023-01-01');
    cy.getByDataTestId('rule-expiry-date-input').type('2023-12-31');
    
    // Wait for criteria options to load after selecting rule type
    cy.wait(['@getInclusionCriteria', '@getExclusionCriteria']);
    
    // Navigate to criteria tab
    cy.getByDataTestId('tab-criteria').click();
    
    // Select inclusion criteria
    cy.getByDataTestId('inclusion-long-positions').check();
    cy.getByDataTestId('inclusion-hypothecatable-assets').check();
    
    // Select exclusion criteria
    cy.getByDataTestId('exclusion-slab-lending').check();
    
    // Navigate to conditions tab
    cy.getByDataTestId('tab-conditions').click();
    
    // Add a condition
    cy.getByDataTestId('add-condition-button').click();
    cy.selectByLabel('[data-testid="condition-attribute-0"]', 'securityType');
    cy.selectByLabel('[data-testid="condition-operator-0"]', 'equals');
    cy.getByDataTestId('condition-value-0').type('EQUITY');
    
    // Navigate to actions tab
    cy.getByDataTestId('tab-actions').click();
    
    // Add an action
    cy.getByDataTestId('add-action-button').click();
    cy.selectByLabel('[data-testid="action-type-0"]', 'includeInCalculation');
    cy.getByDataTestId('action-parameters-0').type('{}');
    
    // Save the rule
    cy.getByDataTestId('save-rule-button').click();
    
    // Wait for the create API call
    cy.wait('@createRule').its('request.body').should('include', {
      name: 'Test Rule',
      description: 'This is a test rule created by Cypress',
      ruleType: RULE_TYPES.FOR_LOAN_AVAILABILITY,
      market: MARKETS.GLOBAL
    });
    
    // Verify success notification
    cy.verifyToastMessage('Rule created successfully', 'success');
    
    // Verify we're taken to the detail view of the new rule
    cy.getByDataTestId('rule-detail-view').should('be.visible');
    cy.getByDataTestId('rule-detail-name').should('contain', 'Test Rule');
  });

  it('should edit an existing calculation rule', () => {
    // Intercept the rule detail API call
    cy.interceptApi('GET', '**/api/v1/rules/*', 'getRuleDetail');
    
    // Intercept the update rule API call
    cy.interceptApi('PUT', '**/api/v1/rules/*', 'updateRule');
    
    // Wait for the rules data to load
    cy.waitForTableLoad('[data-testid="rule-list-grid"]');
    
    // Click on the first rule
    cy.get('[data-testid="rule-list-grid"] .ag-center-cols-container .ag-row').first().click();
    
    // Wait for the rule detail to load
    cy.wait('@getRuleDetail');
    
    // Click the edit button
    cy.getByDataTestId('edit-rule-button').click();
    
    // Modify the rule name and description
    cy.getByDataTestId('rule-name-input').clear().type('Updated Rule Name');
    cy.getByDataTestId('rule-description-input').clear().type('Updated rule description');
    
    // Save the changes
    cy.getByDataTestId('save-rule-button').click();
    
    // Wait for the update API call
    cy.wait('@updateRule').its('request.body').should('include', {
      name: 'Updated Rule Name',
      description: 'Updated rule description'
    });
    
    // Verify success notification
    cy.verifyToastMessage('Rule updated successfully', 'success');
    
    // Verify the changes are reflected in the detail view
    cy.getByDataTestId('rule-detail-name').should('contain', 'Updated Rule Name');
    cy.getByDataTestId('rule-detail-description').should('contain', 'Updated rule description');
  });

  it('should test a calculation rule', () => {
    // Intercept the rule detail API call
    cy.interceptApi('GET', '**/api/v1/rules/*', 'getRuleDetail');
    
    // Intercept the test rule API call
    cy.interceptApi('POST', '**/api/v1/rules/*/test', 'testRule');
    
    // Wait for the rules data to load
    cy.waitForTableLoad('[data-testid="rule-list-grid"]');
    
    // Click on the first rule
    cy.get('[data-testid="rule-list-grid"] .ag-center-cols-container .ag-row').first().click();
    
    // Wait for the rule detail to load
    cy.wait('@getRuleDetail');
    
    // Click the test button
    cy.getByDataTestId('test-rule-button').click();
    
    // Wait for the test API call
    cy.wait('@testRule');
    
    // Verify the test results modal is displayed
    cy.getByDataTestId('test-results-modal').should('be.visible');
    cy.getByDataTestId('test-result-status').should('be.visible');
    
    // Close the test results modal
    cy.getByDataTestId('close-test-results-button').click();
    cy.getByDataTestId('test-results-modal').should('not.exist');
  });

  it('should publish a calculation rule', () => {
    // Intercept API calls
    cy.interceptApi('GET', '**/api/v1/rules*', 'getRules');
    cy.interceptApi('GET', '**/api/v1/rules/*', 'getRuleDetail');
    cy.interceptApi('PUT', '**/api/v1/rules/*/publish', 'publishRule');
    
    // Wait for the rules data to load
    cy.waitForTableLoad('[data-testid="rule-list-grid"]');
    
    // Find and click on a rule with DRAFT status
    cy.get('[data-testid="rule-list-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      const statusText = $row.find('[col-id="status"]').text();
      if (statusText.includes('DRAFT')) {
        cy.wrap($row).click();
        return false; // Break the each loop
      }
    });
    
    // Wait for the rule detail to load
    cy.wait('@getRuleDetail');
    
    // Click the publish button (only proceed if we found a draft rule)
    cy.getByDataTestId('publish-rule-button').then($btn => {
      if ($btn.length > 0 && !$btn.prop('disabled')) {
        cy.wrap($btn).click();
        
        // Confirm the publish action
        cy.getByDataTestId('confirm-publish-button').click();
        
        // Wait for the publish API call
        cy.wait('@publishRule');
        
        // Verify success notification
        cy.verifyToastMessage('Rule published successfully', 'success');
        
        // Verify the status is updated to ACTIVE
        cy.getByDataTestId('rule-detail-status').should('contain', 'ACTIVE');
      } else {
        cy.log('No draft rules available to publish - skipping test');
      }
    });
  });

  it('should revert a calculation rule to a previous version', () => {
    // Intercept API calls
    cy.interceptApi('GET', '**/api/v1/rules*', 'getRules');
    cy.interceptApi('GET', '**/api/v1/rules/*', 'getRuleDetail');
    cy.interceptApi('PUT', '**/api/v1/rules/*/revert', 'revertRule');
    
    // Wait for the rules data to load
    cy.waitForTableLoad('[data-testid="rule-list-grid"]');
    
    // Find and click on a rule with version > 1
    cy.get('[data-testid="rule-list-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      const versionText = $row.find('[col-id="version"]').text();
      if (parseInt(versionText) > 1) {
        cy.wrap($row).click();
        return false; // Break the each loop
      }
    });
    
    // Wait for the rule detail to load
    cy.wait('@getRuleDetail');
    
    // Click the revert button (only proceed if we found a rule with version > 1)
    cy.getByDataTestId('revert-rule-button').then($btn => {
      if ($btn.length > 0 && !$btn.prop('disabled')) {
        cy.wrap($btn).click();
        
        // Select a previous version
        cy.getByDataTestId('version-select').select('1');
        
        // Confirm the revert action
        cy.getByDataTestId('confirm-revert-button').click();
        
        // Wait for the revert API call
        cy.wait('@revertRule');
        
        // Verify success notification
        cy.verifyToastMessage('Rule reverted successfully', 'success');
      } else {
        cy.log('No rules with version > 1 available to revert - skipping test');
      }
    });
  });

  it('should validate required fields in rule creation form', () => {
    // Intercept API calls for reference data
    cy.interceptApi('GET', '**/api/v1/rules/types', 'getRuleTypes');
    cy.interceptApi('GET', '**/api/v1/rules/statuses', 'getRuleStatuses');
    cy.interceptApi('GET', '**/api/v1/rules/markets', 'getMarkets');
    
    // Click the create rule button
    cy.getByDataTestId('create-rule-button').click();
    
    // Verify the rule editor is displayed
    cy.getByDataTestId('rule-editor-view').should('be.visible');
    
    // Wait for reference data to load
    cy.wait(['@getRuleTypes', '@getRuleStatuses', '@getMarkets']);
    
    // Try to save without filling required fields
    cy.getByDataTestId('save-rule-button').click();
    
    // Verify error messages for required fields
    cy.getByDataTestId('rule-name-error').should('be.visible');
    cy.getByDataTestId('rule-type-error').should('be.visible');
    cy.getByDataTestId('rule-market-error').should('be.visible');
    
    // Fill in required fields
    cy.getByDataTestId('rule-name-input').type('Test Rule');
    cy.selectByLabel('[data-testid="rule-type-select"]', RULE_TYPES.FOR_LOAN_AVAILABILITY);
    cy.selectByLabel('[data-testid="rule-market-select"]', MARKETS.GLOBAL);
    
    // Verify error messages are gone
    cy.getByDataTestId('rule-name-error').should('not.exist');
    cy.getByDataTestId('rule-type-error').should('not.exist');
    cy.getByDataTestId('rule-market-error').should('not.exist');
  });

  it('should cancel rule creation and return to rule list', () => {
    // Intercept API calls for reference data
    cy.interceptApi('GET', '**/api/v1/rules/types', 'getRuleTypes');
    cy.interceptApi('GET', '**/api/v1/rules/statuses', 'getRuleStatuses');
    cy.interceptApi('GET', '**/api/v1/rules/markets', 'getMarkets');
    
    // Intercept the create rule API call to verify it's not called
    cy.interceptApi('POST', '**/api/v1/rules', 'createRule');
    
    // Click the create rule button
    cy.getByDataTestId('create-rule-button').click();
    
    // Verify the rule editor is displayed
    cy.getByDataTestId('rule-editor-view').should('be.visible');
    
    // Wait for reference data to load
    cy.wait(['@getRuleTypes', '@getRuleStatuses', '@getMarkets']);
    
    // Fill in some data
    cy.getByDataTestId('rule-name-input').type('Test Rule');
    cy.getByDataTestId('rule-description-input').type('This rule will be canceled');
    
    // Click the cancel button
    cy.getByDataTestId('cancel-button').click();
    
    // Verify we're back to the list view
    cy.getByDataTestId('rule-list-grid').should('be.visible');
    cy.getByDataTestId('create-rule-button').should('be.visible');
    
    // Verify the create API was not called
    cy.get('@createRule.all').should('have.length', 0);
  });

  it('should sort calculation rules by different columns', () => {
    // Wait for the rules data to load
    cy.waitForTableLoad('[data-testid="rule-list-grid"]');
    
    // Sort by name
    cy.get('[data-testid="rule-list-grid"] .ag-header-cell[col-id="name"]').click();
    
    // Verify sorting works (check that names are in ascending order)
    let previousName = '';
    cy.get('[data-testid="rule-list-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      const nameText = $row.find('[col-id="name"]').text();
      expect(nameText >= previousName).to.be.true;
      previousName = nameText;
    });
    
    // Sort by market
    cy.get('[data-testid="rule-list-grid"] .ag-header-cell[col-id="market"]').click();
    
    // Verify sorting works (check that markets are in ascending order)
    let previousMarket = '';
    cy.get('[data-testid="rule-list-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      const marketText = $row.find('[col-id="market"]').text();
      expect(marketText >= previousMarket).to.be.true;
      previousMarket = marketText;
    });
    
    // Sort by status
    cy.get('[data-testid="rule-list-grid"] .ag-header-cell[col-id="status"]').click();
    
    // Verify sorting works (check that statuses are in ascending order)
    let previousStatus = '';
    cy.get('[data-testid="rule-list-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      const statusText = $row.find('[col-id="status"]').text();
      expect(statusText >= previousStatus).to.be.true;
      previousStatus = statusText;
    });
  });
});