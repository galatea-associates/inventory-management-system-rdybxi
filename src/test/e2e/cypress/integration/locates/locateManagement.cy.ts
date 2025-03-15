import { LOCATE_STATUS, LOCATE_TYPES } from '../../../common/constants';

describe('Locate Management', () => {
  beforeEach(() => {
    // Login as operations user who has permission to approve/reject locates
    cy.loginByRole('OPERATIONS');
    
    // Navigate to the Locate Management page
    cy.visit('/locates');
    
    // Intercept API calls
    cy.interceptApi('GET', '**/api/v1/locates*', 'getLocates');
    
    // Wait for page to load
    cy.getByDataTestId('locate-management-title').should('be.visible');
    cy.wait('@getLocates');
  });

  it('should display the locate management page with tabs', () => {
    cy.getByDataTestId('locate-management-title').should('contain', 'Locate Management');
    cy.getByDataTestId('locate-tabs').should('be.visible');
    cy.getByDataTestId('tab-pending').should('be.visible');
    cy.getByDataTestId('tab-approved').should('be.visible');
    cy.getByDataTestId('tab-rejected').should('be.visible');
    
    // Verify the Pending tab is active by default
    cy.getByDataTestId('tab-pending').should('have.attr', 'aria-selected', 'true');
  });

  it('should display locate requests in the queue', () => {
    // Wait for the locate requests to load
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Verify the grid has data
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').should('have.length.greaterThan', 0);
    
    // Verify the grid has the expected columns
    cy.get('[data-testid="locate-queue-grid"] .ag-header-cell').should('contain', 'Security');
    cy.get('[data-testid="locate-queue-grid"] .ag-header-cell').should('contain', 'Client');
    cy.get('[data-testid="locate-queue-grid"] .ag-header-cell').should('contain', 'Quantity');
    cy.get('[data-testid="locate-queue-grid"] .ag-header-cell').should('contain', 'Request Time');
    cy.get('[data-testid="locate-queue-grid"] .ag-header-cell').should('contain', 'Status');
  });

  it('should filter locate requests by status', () => {
    // Intercept the filtered API call
    cy.interceptApi('GET', '**/api/v1/locates?status=PENDING*', 'getFilteredLocates');
    
    // Open the filter panel
    cy.getByDataTestId('filter-button').click();
    
    // Select PENDING status
    cy.selectByLabel('[data-testid="status-filter"]', 'PENDING');
    
    // Apply filters
    cy.getByDataTestId('apply-filters-button').click();
    
    // Wait for the filtered results
    cy.wait('@getFilteredLocates');
    
    // Verify only pending locates are shown
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      cy.wrap($row).find('[col-id="status"]').should('contain', 'PENDING');
    });
  });

  it('should display locate details when a locate is selected', () => {
    // Wait for the locate requests to load
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Click on the first locate request
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').first().click();
    
    // Verify the detail panel is displayed
    cy.getByDataTestId('locate-detail-panel').should('be.visible');
    
    // Verify the detail panel shows the correct locate information
    cy.getByDataTestId('locate-detail-security').should('be.visible');
    cy.getByDataTestId('locate-detail-client').should('be.visible');
    cy.getByDataTestId('locate-detail-quantity').should('be.visible');
    cy.getByDataTestId('locate-detail-request-time').should('be.visible');
    cy.getByDataTestId('locate-detail-status').should('be.visible');
  });

  it('should approve a pending locate request', () => {
    // Intercept the approve API call
    cy.interceptApi('PUT', '**/api/v1/locates/*/approve', 'approveLocate');
    
    // Navigate to the Pending tab
    cy.getByDataTestId('tab-pending').click();
    
    // Wait for the locate requests to load
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Click on the first pending locate request
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').first().click();
    
    // Click on the Approve tab
    cy.getByDataTestId('tab-approve').click();
    
    // Fill in the approval form
    cy.getByDataTestId('approved-quantity-input').clear().type('5000');
    cy.getByDataTestId('decrement-quantity-input').clear().type('5000');
    cy.getByDataTestId('expiry-date-input').type('2023-12-31');
    cy.getByDataTestId('approval-comments').type('Approved for testing');
    
    // Click the Approve button
    cy.getByDataTestId('approve-button').click();
    
    // Wait for the API call to complete
    cy.wait('@approveLocate');
    
    // Verify the success notification
    cy.verifyToastMessage('Locate request approved successfully', 'success');
    
    // Verify the locate status is updated
    cy.getByDataTestId('locate-detail-status').should('contain', 'APPROVED');
  });

  it('should reject a pending locate request', () => {
    // Intercept the reject API call
    cy.interceptApi('PUT', '**/api/v1/locates/*/reject', 'rejectLocate');
    
    // Navigate to the Pending tab
    cy.getByDataTestId('tab-pending').click();
    
    // Wait for the locate requests to load
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Click on the first pending locate request
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').first().click();
    
    // Click on the Reject tab
    cy.getByDataTestId('tab-reject').click();
    
    // Fill in the rejection form
    cy.selectByLabel('[data-testid="rejection-reason-select"]', 'INSUFFICIENT_INVENTORY');
    cy.getByDataTestId('rejection-comments').type('Rejected for testing');
    
    // Click the Reject button
    cy.getByDataTestId('reject-button').click();
    
    // Wait for the API call to complete
    cy.wait('@rejectLocate');
    
    // Verify the success notification
    cy.verifyToastMessage('Locate request rejected successfully', 'success');
    
    // Verify the locate status is updated
    cy.getByDataTestId('locate-detail-status').should('contain', 'REJECTED');
  });

  it('should navigate between tabs and display appropriate locates', () => {
    // Intercept API calls for different tabs
    cy.interceptApi('GET', '**/api/v1/locates?status=APPROVED*', 'getApprovedLocates');
    cy.interceptApi('GET', '**/api/v1/locates?status=REJECTED*', 'getRejectedLocates');
    
    // Verify the Pending tab shows pending locate requests
    cy.getByDataTestId('tab-pending').click();
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').should('have.length.greaterThan', 0);
    
    // Click on the Approved tab
    cy.getByDataTestId('tab-approved').click();
    cy.wait('@getApprovedLocates');
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Verify approved locates are displayed
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      cy.wrap($row).find('[col-id="status"]').should('contain', 'APPROVED');
    });
    
    // Click on the Rejected tab
    cy.getByDataTestId('tab-rejected').click();
    cy.wait('@getRejectedLocates');
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Verify rejected locates are displayed
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      cy.wrap($row).find('[col-id="status"]').should('contain', 'REJECTED');
    });
  });

  it('should search for locates by security or client', () => {
    // Intercept search API calls
    cy.interceptApi('GET', '**/api/v1/locates?search=AAPL*', 'searchBySecurity');
    cy.interceptApi('GET', '**/api/v1/locates?search=ABC%20Capital*', 'searchByClient');
    
    // Search by security
    cy.getByDataTestId('search-input').clear().type('AAPL{enter}');
    cy.wait('@searchBySecurity');
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Verify results contain the security
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').should('have.length.greaterThan', 0);
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      cy.wrap($row).find('[col-id="security"]').should('contain', 'AAPL');
    });
    
    // Clear search and search by client
    cy.getByDataTestId('search-input').clear().type('ABC Capital{enter}');
    cy.wait('@searchByClient');
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Verify results contain the client
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').should('have.length.greaterThan', 0);
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      cy.wrap($row).find('[col-id="client"]').should('contain', 'ABC Capital');
    });
  });

  it('should sort locate requests by different columns', () => {
    // Wait for the locate requests to load
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Sort by request time
    cy.get('[data-testid="locate-queue-grid"] .ag-header-cell[col-id="requestTimestamp"]').click();
    
    // Verify sorting works (check that dates are in ascending order)
    let previousDate = new Date(0); // Start with epoch time
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      const dateText = $row.find('[col-id="requestTimestamp"]').text();
      const currentDate = new Date(dateText);
      expect(currentDate.getTime()).to.be.at.least(previousDate.getTime());
      previousDate = currentDate;
    });
    
    // Sort by quantity
    cy.get('[data-testid="locate-queue-grid"] .ag-header-cell[col-id="requestedQuantity"]').click();
    
    // Verify sorting works (check that quantities are in ascending order)
    let previousQuantity = 0;
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').each(($row) => {
      const quantityText = $row.find('[col-id="requestedQuantity"]').text();
      const currentQuantity = parseInt(quantityText.replace(/,/g, ''), 10);
      expect(currentQuantity).to.be.at.least(previousQuantity);
      previousQuantity = currentQuantity;
    });
  });

  it('should disable approval/rejection for non-pending locates', () => {
    // Navigate to the Approved tab
    cy.getByDataTestId('tab-approved').click();
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Click on an approved locate
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').first().click();
    
    // Verify the Approve and Reject tabs are disabled
    cy.getByDataTestId('tab-approve').should('have.attr', 'aria-disabled', 'true');
    cy.getByDataTestId('tab-reject').should('have.attr', 'aria-disabled', 'true');
    
    // Navigate to the Rejected tab
    cy.getByDataTestId('tab-rejected').click();
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Click on a rejected locate
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').first().click();
    
    // Verify the Approve and Reject tabs are disabled
    cy.getByDataTestId('tab-approve').should('have.attr', 'aria-disabled', 'true');
    cy.getByDataTestId('tab-reject').should('have.attr', 'aria-disabled', 'true');
  });

  it('should validate required fields in approval form', () => {
    // Navigate to the Pending tab
    cy.getByDataTestId('tab-pending').click();
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Click on a pending locate
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').first().click();
    
    // Click on the Approve tab
    cy.getByDataTestId('tab-approve').click();
    
    // Clear the required fields
    cy.getByDataTestId('approved-quantity-input').clear();
    
    // Try to submit the form
    cy.getByDataTestId('approve-button').click();
    
    // Verify error message is displayed
    cy.getByDataTestId('approved-quantity-error').should('be.visible');
    
    // Fill in the required field
    cy.getByDataTestId('approved-quantity-input').type('5000');
    
    // Verify the error message is gone
    cy.getByDataTestId('approved-quantity-error').should('not.exist');
  });

  it('should validate required fields in rejection form', () => {
    // Navigate to the Pending tab
    cy.getByDataTestId('tab-pending').click();
    cy.waitForTableLoad('[data-testid="locate-queue-grid"]');
    
    // Click on a pending locate
    cy.get('[data-testid="locate-queue-grid"] .ag-center-cols-container .ag-row').first().click();
    
    // Click on the Reject tab
    cy.getByDataTestId('tab-reject').click();
    
    // Try to submit the form without selecting a reason
    cy.getByDataTestId('reject-button').click();
    
    // Verify error message is displayed
    cy.getByDataTestId('rejection-reason-error').should('be.visible');
    
    // Select a rejection reason
    cy.selectByLabel('[data-testid="rejection-reason-select"]', 'INSUFFICIENT_INVENTORY');
    
    // Verify the error message is gone
    cy.getByDataTestId('rejection-reason-error').should('not.exist');
  });
});