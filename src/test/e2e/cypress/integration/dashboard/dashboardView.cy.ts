// Import test user credentials for different roles
import { TEST_USERS } from '../../../common/constants';
// Import API endpoint paths for dashboard data
import { API_ENDPOINTS } from '../../../common/constants';
// Import performance threshold values for UI operations
import { PERFORMANCE_THRESHOLDS } from '../../../common/constants';

/**
 * Test suite for the Dashboard view of the Inventory Management System.
 * Tests the dashboard components, data loading, real-time updates, and interactive features.
 */
describe('Dashboard View', () => {
  beforeEach(() => {
    // Login as trader user
    cy.loginByRole(TEST_USERS.TRADER);
    
    // Intercept API calls for dashboard data
    // Note: Using patterns for monitoring endpoints that might not be in constants.ts
    cy.intercept('GET', '**/api/v1/monitoring/system-status').as('getSystemStatus');
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}`).as('getInventoryForLoan');
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_PLEDGE}`).as('getInventoryForPledge');
    cy.intercept('GET', `${API_ENDPOINTS.LOCATE.LOCATES}*`).as('getLocates');
    cy.intercept('GET', '**/api/v1/monitoring/recent-activity').as('getRecentActivity');
    cy.intercept('GET', '**/api/v1/monitoring/alerts').as('getAlerts');
    
    // Visit dashboard page
    cy.visit('/dashboard');
    
    // Wait for API calls to complete
    cy.wait([
      '@getSystemStatus',
      '@getInventoryForLoan', 
      '@getInventoryForPledge',
      '@getLocates',
      '@getRecentActivity',
      '@getAlerts'
    ]);
  });
  
  /**
   * Verifies that the dashboard loads correctly with all required components.
   */
  it('should load dashboard with all components', () => {
    // Verify all components are visible
    cy.get('[data-testid="system-status"]').should('be.visible');
    cy.get('[data-testid="inventory-summary"]').should('be.visible');
    cy.get('[data-testid="locate-requests"]').should('be.visible');
    cy.get('[data-testid="recent-activity"]').should('be.visible');
    cy.get('[data-testid="alerts"]').should('be.visible');
    
    // Verify welcome message contains user's name
    cy.get('[data-testid="welcome-message"]')
      .should('contain', TEST_USERS.TRADER.displayName);
  });
  
  /**
   * Verifies that the System Status component displays correct information.
   */
  it('should display correct system status information', () => {
    // Verify system status indicator shows correct status
    cy.get('[data-testid="system-status-indicator"]')
      .should('exist')
      .and('have.attr', 'data-status')
      .and('match', /(UP|DOWN|DEGRADED)/);
    
    // Verify availability percentage is displayed
    cy.get('[data-testid="system-availability-percentage"]')
      .should('exist')
      .invoke('text')
      .should('match', /\d+\.\d+%/);
    
    // Verify key metrics are displayed
    cy.get('[data-testid="system-key-metrics"]').should('exist');
    cy.get('[data-testid="uptime-metric"]').should('exist');
    cy.get('[data-testid="memory-usage-metric"]').should('exist');
    cy.get('[data-testid="system-load-metric"]').should('exist');
    
    // Verify critical service statuses are displayed
    cy.get('[data-testid="critical-services-status"]').should('exist');
    cy.get('[data-testid="critical-services-status"] [data-testid="service-item"]')
      .should('have.length.greaterThan', 0);
  });
  
  /**
   * Verifies that the Inventory Summary component displays correct information.
   */
  it('should display correct inventory summary information', () => {
    // Verify inventory metrics are displayed
    cy.get('[data-testid="total-inventory-value"]')
      .should('exist')
      .invoke('text')
      .should('match', /\$[\d,]+[MBT]?/);
    
    cy.get('[data-testid="for-loan-availability"]')
      .should('exist')
      .invoke('text')
      .should('match', /\$[\d,]+[MBT]?/);
    
    cy.get('[data-testid="for-pledge-availability"]')
      .should('exist')
      .invoke('text')
      .should('match', /\$[\d,]+[MBT]?/);
    
    cy.get('[data-testid="htb-value"]')
      .should('exist')
      .invoke('text')
      .should('match', /\$[\d,]+[MBT]?/);
    
    // Verify inventory category chart is rendered
    cy.get('[data-testid="inventory-category-chart"]')
      .should('exist')
      .find('svg')
      .should('exist');
  });
  
  /**
   * Verifies that the Locate Requests component displays correct information.
   */
  it('should display correct locate requests information', () => {
    // Verify locate request metrics are displayed
    cy.get('[data-testid="pending-locate-count"]')
      .should('exist')
      .invoke('text')
      .should('match', /\d+/);
    
    cy.get('[data-testid="today-locate-count"]')
      .should('exist')
      .invoke('text')
      .should('match', /\d+/);
    
    cy.get('[data-testid="locate-approval-rate"]')
      .should('exist')
      .invoke('text')
      .should('match', /\d+%/);
    
    // Verify locate requests list is populated
    cy.get('[data-testid="recent-locate-requests-list"]')
      .should('exist')
      .find('[data-testid="locate-request-item"]')
      .should('have.length.greaterThan', 0);
  });
  
  /**
   * Verifies that the Recent Activity component displays correct information.
   */
  it('should display correct recent activity information', () => {
    // Verify recent activity list is populated
    cy.get('[data-testid="recent-activity-list"]').should('exist');
    
    // Verify activity items have required elements
    cy.get('[data-testid="recent-activity-list"] [data-testid="activity-item"]')
      .should('have.length.greaterThan', 0)
      .first()
      .within(() => {
        cy.get('[data-testid="activity-timestamp"]').should('exist');
        cy.get('[data-testid="activity-description"]').should('exist');
        cy.get('[data-testid="activity-status"]').should('exist');
      });
  });
  
  /**
   * Verifies that the Alerts component displays correct information.
   */
  it('should display correct alerts information', () => {
    // Verify alert counts are displayed
    cy.get('[data-testid="critical-alerts-count"]')
      .should('exist')
      .invoke('text')
      .should('match', /\d+/);
    
    cy.get('[data-testid="high-alerts-count"]')
      .should('exist')
      .invoke('text')
      .should('match', /\d+/);
    
    // Verify alerts list is populated
    cy.get('[data-testid="alerts-list"]').should('exist');
    
    // Verify alert items have required elements
    cy.get('[data-testid="alerts-list"] [data-testid="alert-item"]')
      .should('have.length.greaterThan', 0)
      .first()
      .within(() => {
        cy.get('[data-testid="alert-severity"]').should('exist');
        cy.get('[data-testid="alert-description"]').should('exist');
        cy.get('[data-testid="alert-time"]').should('exist');
      });
  });
  
  /**
   * Verifies that dashboard components refresh data when their refresh buttons are clicked.
   */
  it('should refresh data when refresh button is clicked', () => {
    // Click refresh for system status and verify API call
    cy.get('[data-testid="system-status"] [data-testid="refresh-button"]').click();
    cy.wait('@getSystemStatus');
    
    // Click refresh for inventory summary and verify API call
    cy.get('[data-testid="inventory-summary"] [data-testid="refresh-button"]').click();
    cy.wait(['@getInventoryForLoan', '@getInventoryForPledge']);
    
    // Verify data is updated
    cy.get('[data-testid="system-status"] [data-testid="last-updated"]')
      .invoke('text')
      .should('include', 'just now');
    
    cy.get('[data-testid="inventory-summary"] [data-testid="last-updated"]')
      .invoke('text')
      .should('include', 'just now');
  });
  
  /**
   * Verifies that clicking on dashboard components navigates to their detailed views.
   */
  it('should navigate to detailed views when clicking on components', () => {
    // System status view all
    cy.get('[data-testid="system-status"] [data-testid="view-all-button"]').click();
    cy.url().should('include', '/monitoring');
    cy.go('back');
    
    // Inventory summary view all
    cy.get('[data-testid="inventory-summary"] [data-testid="view-all-button"]').click();
    cy.url().should('include', '/inventory');
    cy.go('back');
    
    // Locate requests view all
    cy.get('[data-testid="locate-requests"] [data-testid="view-all-button"]').click();
    cy.url().should('include', '/locates');
  });
  
  /**
   * Verifies that the dashboard loads within the defined performance threshold.
   */
  it('should load dashboard within performance threshold', () => {
    // Reset page to measure load time
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        win.performance.mark('start-load');
      },
      onLoad(win) {
        win.performance.mark('end-load');
        win.performance.measure('page-load', 'start-load', 'end-load');
      }
    });
    
    // Get the measurement and verify it's below threshold
    cy.window().then((win) => {
      const measure = win.performance.getEntriesByName('page-load')[0];
      expect(measure.duration).to.be.lessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
    });
  });
  
  /**
   * Verifies that the dashboard layout adapts correctly to different screen sizes.
   */
  it('should adapt layout for different screen sizes', () => {
    // Test desktop layout (1920x1080)
    cy.viewport(1920, 1080);
    cy.get('[data-testid="dashboard-container"]').should('have.class', 'desktop-layout');
    cy.get('[data-testid="dashboard-grid"]').should('have.css', 'grid-template-columns')
      .and('contain', 'repeat');
    
    // Test laptop layout (1366x768)
    cy.viewport(1366, 768);
    cy.get('[data-testid="dashboard-container"]').should('have.class', 'laptop-layout');
    cy.get('[data-testid="dashboard-grid"]').should('have.css', 'grid-template-columns')
      .and('contain', 'repeat');
    
    // Test tablet layout (768x1024)
    cy.viewport(768, 1024);
    cy.get('[data-testid="dashboard-container"]').should('have.class', 'tablet-layout');
    
    // Test mobile layout (375x667)
    cy.viewport(375, 667);
    cy.get('[data-testid="dashboard-container"]').should('have.class', 'mobile-layout');
    cy.get('[data-testid="dashboard-grid"]').should('have.css', 'grid-template-columns')
      .and('not.contain', 'repeat');
  });
  
  /**
   * Verifies that different user roles see appropriate dashboard components.
   */
  it('should show different dashboard components based on user role', () => {
    // Verify trader components
    cy.get('[data-testid="trader-specific-component"]').should('be.visible');
    
    // Logout and login as operations user
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    cy.loginByRole(TEST_USERS.OPERATIONS);
    cy.visit('/dashboard');
    
    // Wait for API calls to complete for operations user
    cy.wait([
      '@getSystemStatus',
      '@getInventoryForLoan', 
      '@getInventoryForPledge',
      '@getLocates',
      '@getRecentActivity',
      '@getAlerts'
    ]);
    
    // Verify operations components
    cy.get('[data-testid="operations-specific-component"]').should('be.visible');
    cy.get('[data-testid="trader-specific-component"]').should('not.exist');
  });
  
  /**
   * Verifies that dashboard components handle API errors gracefully.
   */
  it('should handle API errors gracefully', () => {
    // Force system status API to error
    cy.intercept('GET', '**/api/v1/monitoring/system-status', {
      statusCode: 500,
      body: { error: 'Internal Server Error' }
    }).as('getSystemStatusError');
    
    // Force inventory summary API to error
    cy.intercept('GET', `${API_ENDPOINTS.INVENTORY.FOR_LOAN}`, {
      statusCode: 500,
      body: { error: 'Internal Server Error' }
    }).as('getInventoryError');
    
    // Reload page and check error states
    cy.visit('/dashboard');
    
    // Verify error states and retry options
    cy.get('[data-testid="system-status"] [data-testid="error-state"]').should('be.visible');
    cy.get('[data-testid="system-status"] [data-testid="retry-button"]').should('be.visible');
    
    cy.get('[data-testid="inventory-summary"] [data-testid="error-state"]').should('be.visible');
    cy.get('[data-testid="inventory-summary"] [data-testid="retry-button"]').should('be.visible');
    
    // Verify other components still load
    cy.get('[data-testid="locate-requests"]').should('be.visible');
    cy.get('[data-testid="recent-activity"]').should('be.visible');
    
    // Test retry functionality
    cy.intercept('GET', '**/api/v1/monitoring/system-status', {
      statusCode: 200,
      body: { status: 'UP', availability: '99.999%' }
    }).as('getSystemStatusRetry');
    
    cy.get('[data-testid="system-status"] [data-testid="retry-button"]').click();
    cy.wait('@getSystemStatusRetry');
    cy.get('[data-testid="system-status"] [data-testid="error-state"]').should('not.exist');
    cy.get('[data-testid="system-status-indicator"]').should('be.visible');
  });
});