import { TEST_USERS } from '../../../common/constants';
import { API_ENDPOINTS } from '../../../common/constants';
import { PERFORMANCE_THRESHOLDS } from '../../../common/constants';

describe('Inventory Dashboard', () => {
  beforeEach(() => {
    // Login as trader user
    cy.loginByRole(TEST_USERS.TRADER);

    // Intercept API requests
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}*`).as('getForLoanData');
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_PLEDGE}*`).as('getForPledgeData');
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.OVERBORROWS}*`).as('getOverborrowsData');
    cy.intercept('GET', `${API_ENDPOINTS.REFERENCE.SECURITIES}*`).as('getSecurities');
    
    // Visit the inventory dashboard page
    cy.visit('/inventory');
    
    // Wait for API calls to complete
    cy.wait(['@getForLoanData', '@getForPledgeData', '@getSecurities']);
  });

  it('should load inventory dashboard with all components', () => {
    // Verify page title
    cy.get('h1').should('contain', 'Inventory');
    
    // Verify date and market selectors
    cy.get('[data-testid="date-selector"]').should('be.visible');
    cy.get('[data-testid="market-selector"]').should('be.visible');
    
    // Verify refresh controls
    cy.get('[data-testid="refresh-controls"]').should('be.visible');
    cy.get('[data-testid="auto-refresh-checkbox"]').should('be.visible');
    cy.get('[data-testid="last-updated"]').should('be.visible');
    
    // Verify inventory visualization components
    cy.get('[data-testid="inventory-by-category-chart"]').should('be.visible');
    cy.get('[data-testid="category-table"]').should('be.visible');
    cy.get('[data-testid="top-securities-chart"]').should('be.visible');
    
    // Verify inventory data grid
    cy.get('[data-testid="inventory-data-grid"]').should('be.visible');
  });

  it('should display correct inventory summary information', () => {
    // Verify summary metrics
    cy.get('[data-testid="total-inventory-value"]').should('contain', '$');
    cy.get('[data-testid="for-loan-value"]').should('contain', '$');
    cy.get('[data-testid="for-pledge-value"]').should('contain', '$');
    cy.get('[data-testid="htb-value"]').should('contain', '$');
    
    // Verify category table has expected structure
    cy.get('[data-testid="category-table"] thead th').should('have.length', 4); // Category, Value, % Total, Change
    cy.get('[data-testid="category-table"] tbody tr').should('have.length.at.least', 4); // Long Pos, Hypothec, Pledged, External
    
    // Verify category chart displays data correctly
    cy.get('[data-testid="inventory-by-category-chart"]').within(() => {
      cy.get('.pie-segment').should('have.length.at.least', 4);
    });
    
    // Verify first row (Long Positions)
    cy.get('[data-testid="category-table"] tbody tr').first().within(() => {
      cy.get('td').eq(0).should('contain', 'Long Pos');
      cy.get('td').eq(1).should('contain', '$');
      cy.get('td').eq(2).should('contain', '%');
      cy.get('td').eq(3).should('contain', '%');
    });
    
    // Verify top securities chart has bars
    cy.get('[data-testid="top-securities-chart"] .bar').should('have.length.at.least', 1);
  });

  it('should filter inventory data correctly', () => {
    // Intercept the filtered data request
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}*`).as('getFilteredData');
    
    // Open filter panel if it's not already open
    cy.get('[data-testid="filter-panel-toggle"]').click();
    
    // Select a security filter
    cy.get('[data-testid="security-filter"]').click();
    cy.get('[data-testid="security-filter-dropdown"] .option').first().click();
    
    // Apply filters
    cy.get('[data-testid="apply-filters-button"]').click();
    
    // Wait for filtered data
    cy.wait('@getFilteredData');
    
    // Verify URL contains filter parameter
    cy.url().should('include', 'security=');
    
    // Verify selected security is displayed in filter pills
    cy.get('[data-testid="filter-pills"]').should('be.visible');
    cy.get('[data-testid="filter-pills"] .pill').should('have.length', 1);
    
    // Verify data grid is filtered
    cy.get('[data-testid="inventory-data-grid"] tbody tr').each(($row) => {
      cy.wrap($row).find('td').eq(1).invoke('text').then((text) => {
        cy.get('[data-testid="filter-pills"] .pill').first().invoke('text').should('include', text.trim());
      });
    });
  });

  it('should filter by multiple criteria', () => {
    // Intercept the filtered data request
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}*`).as('getFilteredData');
    
    // Open filter panel if it's not already open
    cy.get('[data-testid="filter-panel-toggle"]').click();
    
    // Select a security filter
    cy.get('[data-testid="security-filter"]').click();
    cy.get('[data-testid="security-filter-dropdown"] .option').first().click();
    
    // Select a book filter
    cy.get('[data-testid="book-filter"]').click();
    cy.get('[data-testid="book-filter-dropdown"] .option').first().click();
    
    // Select a position type filter
    cy.get('[data-testid="position-type-filter"]').within(() => {
      // Deselect Short positions
      cy.get('input[value="SHORT"]').uncheck();
    });
    
    // Apply filters
    cy.get('[data-testid="apply-filters-button"]').click();
    
    // Wait for filtered data
    cy.wait('@getFilteredData');
    
    // Verify URL contains all filter parameters
    cy.url().should('include', 'security=')
      .and('include', 'book=')
      .and('include', 'positionType=');
    
    // Verify filter pills show all selected filters
    cy.get('[data-testid="filter-pills"]').should('be.visible');
    cy.get('[data-testid="filter-pills"] .pill').should('have.length', 3);
    
    // Verify clear all button is visible
    cy.get('[data-testid="clear-all-filters"]').should('be.visible');
  });

  it('should clear filters correctly', () => {
    // First, set some filters
    cy.get('[data-testid="filter-panel-toggle"]').click();
    cy.get('[data-testid="security-filter"]').click();
    cy.get('[data-testid="security-filter-dropdown"] .option').first().click();
    cy.get('[data-testid="apply-filters-button"]').click();
    
    // Intercept the unfiltered data request
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}*`).as('getUnfilteredData');
    
    // Clear all filters
    cy.get('[data-testid="clear-all-filters"]').click();
    
    // Wait for unfiltered data
    cy.wait('@getUnfilteredData');
    
    // Verify URL no longer contains filter parameters
    cy.url().should('not.include', 'security=');
    
    // Verify filter pills are removed
    cy.get('[data-testid="filter-pills"] .pill').should('not.exist');
    
    // Verify filter inputs are reset
    cy.get('[data-testid="filter-panel-toggle"]').click();
    cy.get('[data-testid="security-filter"]').should('contain', 'All Securities');
  });

  it('should navigate to inventory detail when clicking on a row', () => {
    // Wait for inventory data grid to load
    cy.get('[data-testid="inventory-data-grid"]').should('be.visible');
    
    // Click on the first row
    cy.get('[data-testid="inventory-data-grid"] tbody tr').first().click();
    
    // Verify navigation to detail page
    cy.url().should('include', '/inventory/detail/');
    
    // Verify detail page loads with correct information
    cy.get('[data-testid="inventory-detail-header"]').should('be.visible');
    cy.get('[data-testid="inventory-detail-info"]').should('be.visible');
  });

  it('should update data when refresh button is clicked', () => {
    // Intercept refresh API calls
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}*`).as('refreshForLoanData');
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_PLEDGE}*`).as('refreshForPledgeData');
    
    // Get current last updated timestamp
    cy.get('[data-testid="last-updated"]').invoke('text').as('originalTimestamp');
    
    // Click refresh button
    cy.get('[data-testid="refresh-button"]').click();
    
    // Verify loading indicator is shown
    cy.get('[data-testid="loading-indicator"]').should('be.visible');
    
    // Wait for refresh API calls
    cy.wait(['@refreshForLoanData', '@refreshForPledgeData']);
    
    // Verify loading indicator is gone
    cy.get('[data-testid="loading-indicator"]').should('not.exist');
    
    // Verify last updated timestamp is updated
    cy.get('@originalTimestamp').then((originalText) => {
      cy.get('[data-testid="last-updated"]').should('not.have.text', originalText);
    });
  });

  it('should toggle auto-refresh correctly', () => {
    // Get initial state of auto-refresh checkbox
    cy.get('[data-testid="auto-refresh-checkbox"]').as('autoRefreshCheckbox');
    cy.get('@autoRefreshCheckbox').invoke('prop', 'checked').as('initialCheckedState');
    
    // Toggle auto-refresh
    cy.get('@autoRefreshCheckbox').click();
    
    // Verify checkbox state changed
    cy.get('@initialCheckedState').then((initialChecked) => {
      cy.get('@autoRefreshCheckbox').should(initialChecked ? 'not.be.checked' : 'be.checked');
    });
    
    // If turning on auto-refresh, wait for refresh cycle and then turn off
    cy.get('@autoRefreshCheckbox').invoke('prop', 'checked').then((isChecked) => {
      if (isChecked) {
        // Intercept refresh API call
        cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}*`).as('autoRefreshData');
        
        // Wait for auto-refresh to trigger (with timeout)
        cy.wait('@autoRefreshData', { timeout: 35000 }).then(() => {
          // Turn off auto-refresh
          cy.get('@autoRefreshCheckbox').click();
          cy.get('@autoRefreshCheckbox').should('not.be.checked');
        });
      }
    });
  });

  it('should filter by category when clicking on category chart segments', () => {
    // Intercept the filtered data request
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}*`).as('getFilteredData');
    
    // Get the text of the first category segment
    cy.get('[data-testid="inventory-by-category-chart"] .pie-segment').first()
      .invoke('attr', 'data-category').as('selectedCategory');
    
    // Click on the first segment
    cy.get('[data-testid="inventory-by-category-chart"] .pie-segment').first().click();
    
    // Wait for filtered data
    cy.wait('@getFilteredData');
    
    // Verify URL contains category filter
    cy.url().should('include', 'category=');
    
    // Verify filter pill shows the selected category
    cy.get('@selectedCategory').then((category) => {
      cy.get('[data-testid="filter-pills"] .pill').should('contain', category);
    });
    
    // Verify data grid is filtered by the selected category
    cy.get('[data-testid="inventory-data-grid"] tbody tr').should('have.length.at.least', 1);
  });

  it('should filter by security when clicking on top securities bars', () => {
    // Intercept the filtered data request
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}*`).as('getFilteredData');
    
    // Get the text of the first security bar
    cy.get('[data-testid="top-securities-chart"] .bar').first()
      .invoke('attr', 'data-security').as('selectedSecurity');
    
    // Click on the first bar
    cy.get('[data-testid="top-securities-chart"] .bar').first().click();
    
    // Wait for filtered data
    cy.wait('@getFilteredData');
    
    // Verify URL contains security filter
    cy.url().should('include', 'security=');
    
    // Verify filter pill shows the selected security
    cy.get('@selectedSecurity').then((security) => {
      cy.get('[data-testid="filter-pills"] .pill').should('contain', security);
    });
    
    // Verify data grid is filtered by the selected security
    cy.get('[data-testid="inventory-data-grid"] tbody tr').should('have.length.at.least', 1);
  });

  it('should export inventory data correctly', () => {
    // Click export button
    cy.get('[data-testid="export-button"]').click();
    
    // Verify export dialog is displayed
    cy.get('[data-testid="export-dialog"]').should('be.visible');
    
    // Select CSV format
    cy.get('[data-testid="export-format-csv"]').click();
    
    // Intercept export request
    cy.intercept('POST', '**/export*').as('exportRequest');
    
    // Click export button in dialog
    cy.get('[data-testid="export-confirm-button"]').click();
    
    // Wait for export request
    cy.wait('@exportRequest');
    
    // Verify export request was successful
    cy.get('@exportRequest').its('response.statusCode').should('eq', 200);
    
    // Verify export dialog is closed
    cy.get('[data-testid="export-dialog"]').should('not.exist');
  });

  it('should change business date correctly', () => {
    // Intercept date change API calls
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}*`).as('getDateData');
    
    // Open date selector
    cy.get('[data-testid="date-selector"]').click();
    
    // Select yesterday's date (first previous date available)
    cy.get('[data-testid="date-picker"] .previous-day').first().click();
    
    // Wait for date data
    cy.wait('@getDateData');
    
    // Verify URL contains date parameter
    cy.url().should('include', 'date=');
    
    // Verify date in selector is updated (no longer shows 'Today')
    cy.get('[data-testid="date-selector"]').should('not.contain', 'Today');
    
    // Verify data has been updated for the selected date
    cy.get('[data-testid="inventory-data-grid"]').should('be.visible');
  });

  it('should load inventory dashboard within performance threshold', () => {
    // Create a performance mark at the start
    cy.window().then((win) => {
      win.performance.mark('dashboard-start');
    });
    
    // Visit inventory page
    cy.visit('/inventory');
    
    // Wait for critical components to be visible
    cy.get('[data-testid="inventory-by-category-chart"]').should('be.visible');
    cy.get('[data-testid="category-table"]').should('be.visible');
    cy.get('[data-testid="top-securities-chart"]').should('be.visible');
    cy.get('[data-testid="inventory-data-grid"]').should('be.visible');
    
    // Measure time and verify against threshold
    cy.window().then((win) => {
      win.performance.mark('dashboard-end');
      win.performance.measure('dashboard-load', 'dashboard-start', 'dashboard-end');
      const measure = win.performance.getEntriesByName('dashboard-load')[0];
      expect(measure.duration).to.be.lessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
    });
  });

  it('should adapt layout for different screen sizes', () => {
    // Test desktop layout (1920x1080)
    cy.viewport(1920, 1080);
    cy.get('[data-testid="inventory-dashboard-layout"]').should('have.class', 'desktop-layout');
    
    // Verify multi-column layout for desktop
    cy.get('[data-testid="dashboard-multi-column"]').should('be.visible');
    
    // Test laptop layout (1366x768)
    cy.viewport(1366, 768);
    cy.get('[data-testid="inventory-dashboard-layout"]').should('have.class', 'laptop-layout');
    
    // Verify adjusted column widths for laptop
    cy.get('[data-testid="category-chart-container"]').invoke('width').should('be.lessThan', 800);
    
    // Test tablet layout (768x1024)
    cy.viewport(768, 1024);
    cy.get('[data-testid="inventory-dashboard-layout"]').should('have.class', 'tablet-layout');
    
    // Verify single column layout for tablet
    cy.get('[data-testid="dashboard-single-column"]').should('be.visible');
    
    // Verify components are stacked vertically in tablet view
    cy.get('[data-testid="top-securities-chart"]').then($topSecuritiesChart => {
      const topSecuritiesChartPosition = $topSecuritiesChart.position().top;
      
      cy.get('[data-testid="category-table"]').then($categoryTable => {
        const categoryTablePosition = $categoryTable.position().top;
        
        // Verify the vertical position difference
        expect(Math.abs(topSecuritiesChartPosition - categoryTablePosition)).to.be.greaterThan(100);
      });
    });
  });

  it('should show different dashboard components based on user role', () => {
    // Check components for trader role
    cy.get('[data-testid="trader-view-components"]').should('be.visible');
    cy.get('[data-testid="trading-metrics"]').should('be.visible');
    
    // Logout
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout"]').click();
    
    // Login as operations user
    cy.loginByRole(TEST_USERS.OPERATIONS);
    cy.visit('/inventory');
    
    // Wait for API calls to complete
    cy.wait(['@getForLoanData', '@getForPledgeData', '@getSecurities']);
    
    // Verify operations-specific components
    cy.get('[data-testid="operations-view-components"]').should('be.visible');
    cy.get('[data-testid="admin-controls"]').should('be.visible');
    
    // Verify operations users see additional metrics
    cy.get('[data-testid="reconciliation-metrics"]').should('be.visible');
    cy.get('[data-testid="inventory-exceptions"]').should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    // Intercept inventory data with error
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}*`, {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('getInventoryError');
    
    // Refresh page to trigger error
    cy.reload();
    
    // Verify error state is displayed
    cy.get('[data-testid="error-state"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('contain', 'Unable to load inventory data');
    
    // Verify retry button is available
    cy.get('[data-testid="retry-button"]').should('be.visible');
    
    // Intercept retry request with success
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}*`, { fixture: 'inventory/for-loan.json' }).as('getRetryData');
    
    // Click retry button
    cy.get('[data-testid="retry-button"]').click();
    
    // Wait for retry data
    cy.wait('@getRetryData');
    
    // Verify error state is gone and data is loaded
    cy.get('[data-testid="error-state"]').should('not.exist');
    cy.get('[data-testid="inventory-by-category-chart"]').should('be.visible');
    cy.get('[data-testid="inventory-data-grid"]').should('be.visible');
  });
});