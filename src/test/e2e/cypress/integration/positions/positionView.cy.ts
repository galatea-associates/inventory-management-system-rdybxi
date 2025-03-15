import { TEST_USERS } from '../../../common/constants';
import { API_ENDPOINTS } from '../../../common/constants';

/**
 * End-to-end tests for the Position View screen in the Inventory Management System.
 * This suite validates the functionality, performance, and user interactions of the position view interface.
 */
describe('Position View Screen', () => {
  beforeEach(() => {
    // Intercept API calls to positions endpoint
    cy.interceptApi('GET', `**/api/v1${API_ENDPOINTS.POSITION.POSITIONS}*`, 'getPositions');
    cy.interceptApi('GET', `**/api/v1${API_ENDPOINTS.POSITION.POSITION_SUMMARY}*`, 'getPositionSummary');
    
    // Login as a trader user
    cy.loginByRole(TEST_USERS.TRADER);
    cy.visit('/positions');
  });

  it('should load the positions page successfully', () => {
    cy.wait('@getPositions');
    cy.getByDataTestId('positions-page').should('be.visible');
    cy.getByDataTestId('position-table').should('be.visible');
    cy.getByDataTestId('position-summary').should('be.visible');
    
    // Verify the page loads within the performance threshold (3s)
    cy.checkPerformance('page-load', 3000);
  });

  it('should display position data correctly in the table', () => {
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Verify the table headers include Security, Book, SOD Qty, Current, etc.
    cy.getByDataTestId('position-table').find('th').should('contain', 'Security');
    cy.getByDataTestId('position-table').find('th').should('contain', 'Book');
    cy.getByDataTestId('position-table').find('th').should('contain', 'SOD Qty');
    cy.getByDataTestId('position-table').find('th').should('contain', 'Current');
    
    // Verify the position table contains multiple rows
    cy.getByDataTestId('position-table').find('tbody tr').should('have.length.greaterThan', 0);
    
    // Verify the first row contains expected position data
    cy.getByDataTestId('position-table').find('tbody tr').eq(0).find('td').eq(0).should('not.be.empty');
    
    // Verify position values are formatted correctly (numbers, currencies)
    cy.getByDataTestId('position-table').find('tbody tr').eq(0).find('td').eq(2)
      .invoke('text')
      .should('match', /^[\d,\-\+]+$/);
  });

  it('should filter positions based on search criteria', () => {
    cy.wait('@getPositions');
    
    // Click on the filter button
    cy.getByDataTestId('filter-button').click();
    
    // Enter a security symbol in the security filter field
    cy.getByDataTestId('security-filter').type('AAPL');
    
    // Select a book from the book dropdown
    cy.getByDataTestId('book-filter').select('EQUITY-01');
    
    // Click apply filters button
    cy.getByDataTestId('apply-filters-button').click();
    
    // Wait for filtered positions API request to complete
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Verify the table shows only positions matching the filter criteria
    cy.getByDataTestId('position-table').find('tbody tr').eq(0).find('td').eq(0).should('contain', 'AAPL');
    cy.getByDataTestId('position-table').find('tbody tr').eq(0).find('td').eq(1).should('contain', 'EQUITY-01');
  });

  it('should display position details when a position is selected', () => {
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Click on the first position row in the table
    cy.getByDataTestId('position-table').find('tbody tr').eq(0).click();
    
    // Verify the position detail drawer opens
    cy.getByDataTestId('position-detail-drawer').should('be.visible');
    
    // Verify the detail drawer contains security information
    cy.getByDataTestId('position-detail-drawer').should('contain', 'Security');
    
    // Verify the detail drawer contains position quantities
    cy.getByDataTestId('position-detail-drawer').should('contain', 'Position');
    
    // Verify the detail drawer contains settlement ladder information
    cy.getByDataTestId('position-detail-drawer').should('contain', 'Settlement');
    
    // Verify the detail drawer contains position attributes
    cy.getByDataTestId('position-detail-drawer').should('contain', 'Attributes');
  });

  it('should display settlement ladder correctly', () => {
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Click on the first position row in the table
    cy.getByDataTestId('position-table').find('tbody tr').eq(0).click();
    
    // Verify the position detail drawer opens
    cy.getByDataTestId('position-detail-drawer').should('be.visible');
    
    // Verify the settlement ladder section is visible
    cy.getByDataTestId('settlement-ladder').should('be.visible');
    
    // Verify the settlement ladder shows SD0-SD4 projections
    cy.getByDataTestId('settlement-ladder').should('contain', 'SD0');
    cy.getByDataTestId('settlement-ladder').should('contain', 'SD1');
    cy.getByDataTestId('settlement-ladder').should('contain', 'SD2');
    cy.getByDataTestId('settlement-ladder').should('contain', 'SD3');
    cy.getByDataTestId('settlement-ladder').should('contain', 'SD4');
    
    // Verify delivery and receipt quantities are displayed correctly
    cy.getByDataTestId('settlement-ladder').should('contain', 'Deliver');
    cy.getByDataTestId('settlement-ladder').should('contain', 'Receipt');
  });

  it('should refresh position data when refresh button is clicked', () => {
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Click on the refresh button
    cy.getByDataTestId('refresh-button').click();
    
    // Verify a new positions API request is made
    cy.wait('@getPositions');
    
    // Verify the position table is updated with fresh data
    cy.waitForTableLoad('position-table');
    cy.getByDataTestId('position-table').should('be.visible');
  });

  it('should sort positions when column headers are clicked', () => {
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Store initial value of first row for comparison
    cy.getByDataTestId('position-table')
      .find('tbody tr')
      .eq(0)
      .find('td')
      .eq(3)
      .invoke('text')
      .as('initialValue');
    
    // Click on the 'Current' column header
    cy.getByDataTestId('position-table')
      .find('th')
      .contains('Current')
      .click();
    
    cy.waitForTableLoad('position-table');
    
    // Verify the positions are sorted by current position (ascending)
    cy.get('@initialValue').then(initialValue => {
      cy.getByDataTestId('position-table')
        .find('tbody tr')
        .eq(0)
        .find('td')
        .eq(3)
        .invoke('text')
        .should('not.be.empty');
    });
    
    // Click on the 'Current' column header again
    cy.getByDataTestId('position-table')
      .find('th')
      .contains('Current')
      .click();
    
    cy.waitForTableLoad('position-table');
    
    // Verify the positions are sorted by current position (descending)
    cy.get('@initialValue').then(initialValue => {
      cy.getByDataTestId('position-table')
        .find('tbody tr')
        .eq(0)
        .find('td')
        .eq(3)
        .invoke('text')
        .should('not.be.empty');
    });
    
    // Click on the 'Book' column header
    cy.getByDataTestId('position-table')
      .find('th')
      .contains('Book')
      .click();
    
    cy.waitForTableLoad('position-table');
  });

  it('should paginate through position data', () => {
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Store the current page data
    cy.getByDataTestId('position-table')
      .find('tbody tr')
      .eq(0)
      .find('td')
      .eq(0)
      .invoke('text')
      .as('firstPageData');
    
    // Verify pagination controls are visible
    cy.getByDataTestId('pagination-controls').should('be.visible');
    
    // Click on the next page button
    cy.getByDataTestId('pagination-controls')
      .contains('Next')
      .click();
    
    // Wait for the next page API request to complete
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Verify the data has changed to show the next page
    cy.get('@firstPageData').then(firstPageData => {
      cy.getByDataTestId('position-table')
        .find('tbody tr')
        .eq(0)
        .find('td')
        .eq(0)
        .invoke('text')
        .should('not.equal', firstPageData);
    });
    
    // Click on the previous page button
    cy.getByDataTestId('pagination-controls')
      .contains('Previous')
      .click();
    
    // Wait for the previous page API request to complete
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Verify the data has returned to the first page
    cy.get('@firstPageData').then(firstPageData => {
      cy.getByDataTestId('position-table')
        .find('tbody tr')
        .eq(0)
        .find('td')
        .eq(0)
        .invoke('text')
        .should('equal', firstPageData);
    });
  });

  it('should change page size when page size selector is changed', () => {
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Get initial row count
    cy.getByDataTestId('position-table')
      .find('tbody tr')
      .its('length')
      .as('initialRowCount');
    
    // Select a different page size from the page size dropdown
    cy.getByDataTestId('page-size-selector').select('25');
    
    // Wait for the positions API request with new page size to complete
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Verify the number of rows displayed matches the selected page size
    cy.get('@initialRowCount').then(initialRowCount => {
      cy.getByDataTestId('position-table')
        .find('tbody tr')
        .its('length')
        .should('not.equal', initialRowCount);
    });
  });

  it('should meet performance requirements for UI interactions', () => {
    cy.wait('@getPositions');
    cy.waitForTableLoad('position-table');
    
    // Measure time to open filter drawer
    cy.checkPerformance('filter-drawer-open', 1000, () => {
      cy.getByDataTestId('filter-button').click();
      cy.getByDataTestId('filter-drawer').should('be.visible');
    });
    
    // Measure time to apply filters
    cy.getByDataTestId('security-filter').type('AAPL');
    cy.checkPerformance('filter-apply', 3000, () => {
      cy.getByDataTestId('apply-filters-button').click();
      cy.wait('@getPositions');
      cy.waitForTableLoad('position-table');
    });
    
    // Measure time to open position details
    cy.checkPerformance('detail-drawer-open', 1000, () => {
      cy.getByDataTestId('position-table').find('tbody tr').eq(0).click();
      cy.getByDataTestId('position-detail-drawer').should('be.visible');
    });
  });
});