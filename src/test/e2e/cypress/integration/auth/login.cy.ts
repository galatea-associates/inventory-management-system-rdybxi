import { TEST_USERS } from '../../../common/constants';
import { API_ENDPOINTS } from '../../../common/constants';
import { PERFORMANCE_THRESHOLDS } from '../../../common/constants';

describe('Login Page', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login');
    
    // Intercept the authentication API calls
    cy.intercept('POST', `${API_ENDPOINTS.AUTH.LOGIN}`).as('loginRequest');
    
    // Clear local storage and cookies to ensure clean state
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should display login form with all elements', () => {
    // Verify page title and logo
    cy.get('[data-testid="login-logo"]').should('be.visible');
    cy.get('[data-testid="login-title"]').should('be.visible')
      .and('contain', 'Inventory Management System');
    
    // Verify form elements
    cy.get('[data-testid="username-input"]').should('be.visible')
      .and('have.attr', 'placeholder', 'Username');
    cy.get('[data-testid="password-input"]').should('be.visible')
      .and('have.attr', 'placeholder', 'Password');
    cy.get('[data-testid="login-button"]').should('be.visible')
      .and('contain', 'Sign in');
    cy.get('[data-testid="forgot-password-link"]').should('be.visible')
      .and('contain', 'Forgot password?');
  });

  it('should login successfully with valid credentials', () => {
    // Start performance measurement
    cy.window().then((win) => {
      win.performance.mark('login-start');
    });
    
    // Enter valid credentials
    cy.get('[data-testid="username-input"]').type(TEST_USERS.ADMIN.username);
    cy.get('[data-testid="password-input"]').type(TEST_USERS.ADMIN.password);
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for the API call to complete
    cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);
    
    // Verify successful login
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-menu"]').should('contain', TEST_USERS.ADMIN.username);
    
    // End performance measurement
    cy.window().then((win) => {
      win.performance.mark('login-end');
      win.performance.measure('login-duration', 'login-start', 'login-end');
      const measures = win.performance.getEntriesByName('login-duration');
      expect(measures[0].duration).to.be.lessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
    });
    
    // Verify that the auth token is stored
    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.not.be.null;
    });
  });

  it('should show error message with invalid credentials', () => {
    // Enter invalid credentials
    cy.get('[data-testid="username-input"]').type('invaliduser');
    cy.get('[data-testid="password-input"]').type('invalidpassword');
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for the API call to complete
    cy.wait('@loginRequest');
    
    // Verify error message is displayed
    cy.get('[data-testid="login-error"]').should('be.visible')
      .and('contain', 'Invalid username or password');
    
    // Verify user remains on login page
    cy.url().should('include', '/login');
    
    // Verify no auth token is stored
    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.be.null;
    });
  });

  it('should lock account after multiple failed attempts', () => {
    // Intercept login attempts to simulate increasing lockout attempts
    cy.intercept('POST', `${API_ENDPOINTS.AUTH.LOGIN}`, (req) => {
      if (req.body.username === TEST_USERS.ADMIN.username && req.body.password !== TEST_USERS.ADMIN.password) {
        req.reply((res) => {
          const failedAttempts = parseInt(res.headers['x-failed-attempts'] || '0') + 1;
          
          if (failedAttempts >= 5) {
            res.statusCode = 401;
            res.body = { error: 'Account locked due to multiple failed attempts' };
          } else {
            res.headers['x-failed-attempts'] = failedAttempts.toString();
            res.statusCode = 401;
            res.body = { error: 'Invalid username or password' };
          }
        });
      }
    }).as('failedLoginAttempt');
    
    // Attempt multiple failed logins
    for (let i = 0; i < 5; i++) {
      cy.get('[data-testid="username-input"]').clear().type(TEST_USERS.ADMIN.username);
      cy.get('[data-testid="password-input"]').clear().type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@failedLoginAttempt');
    }
    
    // Verify account locked error message
    cy.get('[data-testid="login-error"]').should('be.visible')
      .and('contain', 'Account locked');
      
    // Verify user remains on login page
    cy.url().should('include', '/login');
  });

  it('should redirect to MFA verification for MFA-enabled users', () => {
    // Intercept login for MFA-enabled user
    cy.intercept('POST', `${API_ENDPOINTS.AUTH.LOGIN}`, (req) => {
      if (req.body.username === TEST_USERS.TRADER.username && req.body.password === TEST_USERS.TRADER.password) {
        req.reply({
          statusCode: 200,
          body: {
            requiresMfa: true,
            tempToken: 'mfa-verification-token'
          }
        });
      }
    }).as('mfaLoginRequest');
    
    // Enter credentials for MFA-enabled user
    cy.get('[data-testid="username-input"]').type(TEST_USERS.TRADER.username);
    cy.get('[data-testid="password-input"]').type(TEST_USERS.TRADER.password);
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for the API call to complete
    cy.wait('@mfaLoginRequest');
    
    // Verify redirect to MFA verification page
    cy.url().should('include', '/mfa-verification');
    cy.get('[data-testid="mfa-code-input"]').should('be.visible');
    
    // Verify temporary token is stored but no auth token yet
    cy.window().then((win) => {
      expect(win.localStorage.getItem('tempToken')).to.equal('mfa-verification-token');
      expect(win.localStorage.getItem('authToken')).to.be.null;
    });
  });

  it('should redirect to password change for expired passwords', () => {
    // Intercept login for user with expired password
    cy.intercept('POST', `${API_ENDPOINTS.AUTH.LOGIN}`, (req) => {
      if (req.body.username === TEST_USERS.EXPIRED_PASSWORD.username && 
          req.body.password === TEST_USERS.EXPIRED_PASSWORD.password) {
        req.reply({
          statusCode: 200,
          body: {
            passwordExpired: true,
            tempToken: 'password-change-token'
          }
        });
      }
    }).as('expiredPasswordRequest');
    
    // Enter credentials for user with expired password
    cy.get('[data-testid="username-input"]').type(TEST_USERS.EXPIRED_PASSWORD.username);
    cy.get('[data-testid="password-input"]').type(TEST_USERS.EXPIRED_PASSWORD.password);
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for the API call to complete
    cy.wait('@expiredPasswordRequest');
    
    // Verify redirect to password change page
    cy.url().should('include', '/password-change');
    cy.get('[data-testid="new-password-input"]').should('be.visible');
    
    // Verify temporary token is stored
    cy.window().then((win) => {
      expect(win.localStorage.getItem('tempToken')).to.equal('password-change-token');
    });
  });

  it('should show appropriate error for disabled accounts', () => {
    // Intercept login for disabled user
    cy.intercept('POST', `${API_ENDPOINTS.AUTH.LOGIN}`, (req) => {
      if (req.body.username === TEST_USERS.DISABLED_USER.username && 
          req.body.password === TEST_USERS.DISABLED_USER.password) {
        req.reply({
          statusCode: 401,
          body: {
            error: 'Account disabled. Please contact your administrator.'
          }
        });
      }
    }).as('disabledAccountRequest');
    
    // Enter credentials for disabled user
    cy.get('[data-testid="username-input"]').type(TEST_USERS.DISABLED_USER.username);
    cy.get('[data-testid="password-input"]').type(TEST_USERS.DISABLED_USER.password);
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for the API call to complete
    cy.wait('@disabledAccountRequest');
    
    // Verify account disabled error message
    cy.get('[data-testid="login-error"]').should('be.visible')
      .and('contain', 'Account disabled');
      
    // Verify user remains on login page
    cy.url().should('include', '/login');
  });

  it('should show appropriate error for locked accounts', () => {
    // Intercept login for locked user
    cy.intercept('POST', `${API_ENDPOINTS.AUTH.LOGIN}`, (req) => {
      if (req.body.username === TEST_USERS.LOCKED_USER.username && 
          req.body.password === TEST_USERS.LOCKED_USER.password) {
        req.reply({
          statusCode: 401,
          body: {
            error: 'Account locked due to multiple failed attempts. Please contact your administrator.'
          }
        });
      }
    }).as('lockedAccountRequest');
    
    // Enter credentials for locked user
    cy.get('[data-testid="username-input"]').type(TEST_USERS.LOCKED_USER.username);
    cy.get('[data-testid="password-input"]').type(TEST_USERS.LOCKED_USER.password);
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for the API call to complete
    cy.wait('@lockedAccountRequest');
    
    // Verify account locked error message
    cy.get('[data-testid="login-error"]').should('be.visible')
      .and('contain', 'Account locked');
      
    // Verify user remains on login page
    cy.url().should('include', '/login');
  });

  it('should navigate to forgot password page', () => {
    // Click on forgot password link
    cy.get('[data-testid="forgot-password-link"]').click();
    
    // Verify navigation to forgot password page
    cy.url().should('include', '/forgot-password');
    cy.get('[data-testid="forgot-password-form"]').should('be.visible');
  });

  it('should load login page within performance threshold', () => {
    // Get performance metrics
    cy.window().then((win) => {
      const performanceEntries = win.performance.getEntriesByType('navigation');
      const navigationEntry = performanceEntries[0];
      expect(navigationEntry.loadEventEnd).to.be.lessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
    });
  });

  it('should complete login operation within performance threshold', () => {
    // Start performance measurement
    cy.window().then((win) => {
      win.performance.mark('login-start');
    });
    
    // Perform login
    cy.get('[data-testid="username-input"]').type(TEST_USERS.ADMIN.username);
    cy.get('[data-testid="password-input"]').type(TEST_USERS.ADMIN.password);
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for login to complete and redirect
    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard').then(() => {
      // End performance measurement
      cy.window().then((win) => {
        win.performance.mark('login-end');
        win.performance.measure('login-operation', 'login-start', 'login-end');
        const loginMeasure = win.performance.getEntriesByName('login-operation')[0];
        expect(loginMeasure.duration).to.be.lessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
      });
    });
  });

  it('should show different navigation options based on user role', () => {
    // Test for ADMIN role
    cy.intercept('POST', `${API_ENDPOINTS.AUTH.LOGIN}`, (req) => {
      if (req.body.username === TEST_USERS.ADMIN.username && 
          req.body.password === TEST_USERS.ADMIN.password) {
        req.reply({
          statusCode: 200,
          body: {
            token: 'admin-auth-token',
            user: {
              username: TEST_USERS.ADMIN.username,
              role: 'ADMIN'
            }
          }
        });
      }
    }).as('adminLogin');
    
    // Login as admin
    cy.get('[data-testid="username-input"]').clear().type(TEST_USERS.ADMIN.username);
    cy.get('[data-testid="password-input"]').clear().type(TEST_USERS.ADMIN.password);
    cy.get('[data-testid="login-button"]').click();
    cy.wait('@adminLogin');
    
    // Verify admin navigation options
    cy.get('[data-testid="nav-item-dashboard"]').should('be.visible');
    cy.get('[data-testid="nav-item-positions"]').should('be.visible');
    cy.get('[data-testid="nav-item-inventory"]').should('be.visible');
    cy.get('[data-testid="nav-item-locates"]').should('be.visible');
    cy.get('[data-testid="nav-item-workflows"]').should('be.visible');
    cy.get('[data-testid="nav-item-analytics"]').should('be.visible');
    cy.get('[data-testid="nav-item-settings"]').should('be.visible');
    
    // Logout
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    // Test for TRADER role
    cy.intercept('POST', `${API_ENDPOINTS.AUTH.LOGIN}`, (req) => {
      if (req.body.username === TEST_USERS.TRADER.username && 
          req.body.password === TEST_USERS.TRADER.password) {
        // For simplicity, we'll bypass MFA in this test
        req.reply({
          statusCode: 200,
          body: {
            token: 'trader-auth-token',
            user: {
              username: TEST_USERS.TRADER.username,
              role: 'TRADER'
            }
          }
        });
      }
    }).as('traderLogin');
    
    // Login as trader
    cy.get('[data-testid="username-input"]').clear().type(TEST_USERS.TRADER.username);
    cy.get('[data-testid="password-input"]').clear().type(TEST_USERS.TRADER.password);
    cy.get('[data-testid="login-button"]').click();
    cy.wait('@traderLogin');
    
    // Verify trader navigation options (should have limited options)
    cy.get('[data-testid="nav-item-dashboard"]').should('be.visible');
    cy.get('[data-testid="nav-item-positions"]').should('be.visible');
    cy.get('[data-testid="nav-item-inventory"]').should('be.visible');
    cy.get('[data-testid="nav-item-locates"]').should('be.visible');
    cy.get('[data-testid="nav-item-settings"]').should('not.exist');
    cy.get('[data-testid="nav-item-workflows"]').should('not.exist');
    cy.get('[data-testid="nav-item-analytics"]').should('not.exist');
    
    // Logout
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    // Test for OPERATIONS role
    cy.intercept('POST', `${API_ENDPOINTS.AUTH.LOGIN}`, (req) => {
      if (req.body.username === TEST_USERS.OPERATIONS.username && 
          req.body.password === TEST_USERS.OPERATIONS.password) {
        req.reply({
          statusCode: 200,
          body: {
            token: 'operations-auth-token',
            user: {
              username: TEST_USERS.OPERATIONS.username,
              role: 'OPERATIONS'
            }
          }
        });
      }
    }).as('operationsLogin');
    
    // Login as operations user
    cy.get('[data-testid="username-input"]').clear().type(TEST_USERS.OPERATIONS.username);
    cy.get('[data-testid="password-input"]').clear().type(TEST_USERS.OPERATIONS.password);
    cy.get('[data-testid="login-button"]').click();
    cy.wait('@operationsLogin');
    
    // Verify operations navigation options (different from trader)
    cy.get('[data-testid="nav-item-dashboard"]').should('be.visible');
    cy.get('[data-testid="nav-item-positions"]').should('be.visible');
    cy.get('[data-testid="nav-item-inventory"]').should('be.visible');
    cy.get('[data-testid="nav-item-workflows"]').should('be.visible');
    cy.get('[data-testid="nav-item-locates"]').should('be.visible');
    cy.get('[data-testid="nav-item-analytics"]').should('not.exist');
    cy.get('[data-testid="nav-item-settings"]').should('not.exist');
  });
});