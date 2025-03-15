// Import Cypress and Testing Library for Cypress
import 'cypress';
import '@testing-library/cypress';

// Import test user credentials and API endpoints
import { TEST_USERS, API_ENDPOINTS } from '../../common/constants';

// Define performance thresholds for UI operations (in milliseconds)
const UI_PERFORMANCE_THRESHOLD = 3000; // 3 seconds for UI operations

// Interface for locate request form data
interface LocateRequestData {
  security: string;
  quantity: number;
  locateType: string;
  client?: string;
  notes?: string;
}

// Extend Cypress.Chainable interface to include our custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<Element>;
      loginByRole(role: string): Chainable<Element>;
      loginByApi(username: string, password: string): Chainable<Cypress.Response<any>>;
      logout(): Chainable<Element>;
      getByDataTestId(testId: string): Chainable<JQuery<HTMLElement>>;
      selectByLabel(selector: string, label: string): Chainable<Element>;
      waitForTableLoad(tableSelector: string): Chainable<Element>;
      fillLocateRequestForm(locateData: LocateRequestData): Chainable<Element>;
      verifyToastMessage(message: string, type?: string): Chainable<Element>;
      interceptApi(method: string, endpoint: string, alias: string): Chainable<null>;
      checkPerformance(operation: string, actionFn: Function): Chainable<number>;
    }
  }
}

/**
 * Custom command to login with specified credentials
 */
Cypress.Commands.add('login', (username: string, password: string) => {
  // Visit the login page if not already there
  cy.url().then((url) => {
    if (!url.includes('/login')) {
      cy.visit('/login');
    }
  });

  // Type username into the username field
  cy.get('[data-testid=username-input]').type(username);
  
  // Type password into the password field
  cy.get('[data-testid=password-input]').type(password, { log: false });
  
  // Click the login button
  cy.get('[data-testid=login-button]').click();

  // Wait for authentication API call to complete
  cy.intercept('POST', API_ENDPOINTS.AUTH.LOGIN).as('loginRequest');
  cy.wait('@loginRequest');

  // Verify successful redirect to dashboard
  cy.url().should('include', '/dashboard');
  
  return cy.get('[data-testid=dashboard-container]');
});

/**
 * Custom command to login with predefined role credentials
 */
Cypress.Commands.add('loginByRole', (role: string) => {
  const roleMap: Record<string, any> = {
    ADMIN: TEST_USERS.ADMIN,
    TRADER: TEST_USERS.TRADER,
    OPERATIONS: TEST_USERS.OPERATIONS,
    COMPLIANCE: TEST_USERS.COMPLIANCE
  };

  const user = roleMap[role];
  if (!user) {
    throw new Error(`Unknown role: ${role}. Available roles are: ADMIN, TRADER, OPERATIONS, COMPLIANCE`);
  }

  // Call the login command with the appropriate username and password
  cy.login(user.username, user.password);

  // Verify navigation items specific to the role are visible
  switch (role) {
    case 'ADMIN':
      cy.getByDataTestId('admin-settings-link').should('be.visible');
      break;
    case 'TRADER':
      cy.getByDataTestId('positions-link').should('be.visible');
      cy.getByDataTestId('locates-link').should('be.visible');
      break;
    case 'OPERATIONS':
      cy.getByDataTestId('inventory-link').should('be.visible');
      break;
    case 'COMPLIANCE':
      cy.getByDataTestId('exception-management-link').should('be.visible');
      break;
  }
  
  return cy.get('body');
});

/**
 * Custom command to login via API call directly (bypassing UI)
 */
Cypress.Commands.add('loginByApi', (username: string, password: string) => {
  // Make a direct API request to the login endpoint
  return cy.request({
    method: 'POST',
    url: API_ENDPOINTS.AUTH.LOGIN,
    body: {
      username,
      password
    }
  }).then((response) => {
    // Store the authentication token in local storage
    window.localStorage.setItem('auth_token', response.body.token);
    
    // Set cookies for authenticated session
    cy.setCookie('auth_session', response.body.sessionId);
    
    // Return the API response for chaining
    return cy.wrap(response);
  });
});

/**
 * Custom command to logout the current user
 */
Cypress.Commands.add('logout', () => {
  // Click on user menu in header
  cy.getByDataTestId('user-menu').click();
  
  // Click on logout option
  cy.getByDataTestId('logout-option').click();
  
  // Verify redirect to login page
  cy.url().should('include', '/login');
  
  // Verify session is terminated
  cy.getCookie('auth_session').should('not.exist');
  
  return cy.get('[data-testid=login-container]');
});

/**
 * Custom command to select elements by data-testid attribute
 */
Cypress.Commands.add('getByDataTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

/**
 * Custom command to select an option in a dropdown by its label text
 */
Cypress.Commands.add('selectByLabel', (selector: string, label: string) => {
  cy.get(selector).click();
  cy.get('.MuiMenuItem-root').contains(label).click();
  
  // Verify the option was selected correctly
  cy.get(selector).should('contain.text', label);
  
  return cy.get(selector);
});

/**
 * Custom command to wait for a data table to finish loading
 */
Cypress.Commands.add('waitForTableLoad', (tableSelector: string) => {
  // Check if loading indicator is present
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid=table-loading-indicator]').length > 0) {
      // Wait for loading indicator to disappear
      cy.get('[data-testid=table-loading-indicator]').should('not.exist');
    }
  });
  
  // Verify table is visible and contains rows
  return cy.get(tableSelector)
    .should('be.visible')
    .find('tbody tr')
    .should('have.length.at.least', 1);
});

/**
 * Custom command to fill out a locate request form
 */
Cypress.Commands.add('fillLocateRequestForm', (locateData: LocateRequestData) => {
  // Select security from dropdown
  cy.selectByLabel('[data-testid=security-input]', locateData.security);
  
  // Enter quantity
  cy.getByDataTestId('quantity-input').clear().type(locateData.quantity.toString());
  
  // Select locate type
  cy.selectByLabel('[data-testid=locate-type-input]', locateData.locateType);
  
  // Select client if provided
  if (locateData.client) {
    cy.selectByLabel('[data-testid=client-input]', locateData.client);
  }
  
  // Add any additional notes if provided
  if (locateData.notes) {
    cy.getByDataTestId('notes-input').type(locateData.notes);
  }
  
  // Return the form element for chaining
  return cy.getByDataTestId('locate-request-form');
});

/**
 * Custom command to verify a toast notification message
 */
Cypress.Commands.add('verifyToastMessage', (message: string, type?: string) => {
  // Wait for toast notification to appear
  cy.get('.Toastify__toast').should('be.visible');
  
  // Verify the message text matches expected message
  cy.get('.Toastify__toast-body').should('contain.text', message);
  
  // Verify the toast type (success, error, warning, info) if specified
  if (type) {
    cy.get('.Toastify__toast').should('have.class', `Toastify__toast--${type}`);
  }
  
  // Return the toast element for chaining
  return cy.get('.Toastify__toast');
});

/**
 * Custom command to intercept API calls with consistent naming
 */
Cypress.Commands.add('interceptApi', (method: string, endpoint: string, alias: string) => {
  // Set up Cypress intercept for the specified method and endpoint
  return cy.intercept(method, endpoint).as(alias);
});

/**
 * Custom command to check if UI operations meet performance requirements
 */
Cypress.Commands.add('checkPerformance', (operation: string, actionFn: Function) => {
  // Record start time
  const start = Date.now();
  
  // Execute the provided action function
  return actionFn().then(() => {
    // Record end time and calculate duration
    const duration = Date.now() - start;
    
    // Assert that duration is below the threshold
    expect(duration).to.be.at.most(
      UI_PERFORMANCE_THRESHOLD,
      `${operation} took too long (${duration}ms)`
    );
    
    // Log performance result
    cy.log(`${operation} completed in ${duration}ms`);
    
    // Return the duration for chaining
    return cy.wrap(duration);
  });
});