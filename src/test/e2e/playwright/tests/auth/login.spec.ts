import { test, expect, Page } from '@playwright/test'; // v1.32.0
import { TEST_USERS, API_ENDPOINTS, PERFORMANCE_THRESHOLDS, ROUTES } from '../../../common/constants';

/**
 * Helper function to login a user with the given credentials
 * @param page - Playwright page object
 * @param username - Username to enter
 * @param password - Password to enter
 */
async function loginUser(page: Page, username: string, password: string): Promise<void> {
  // Fill the username field
  await page.fill('[data-testid="username-input"]', username);
  
  // Fill the password field
  await page.fill('[data-testid="password-input"]', password);
  
  // Click the login button
  await page.click('[data-testid="login-button"]');
  
  // Wait for the login request to complete
  await page.waitForResponse(response => 
    response.url().includes(API_ENDPOINTS.AUTH.LOGIN) && 
    (response.status() === 200 || response.status() === 401 || response.status() === 403)
  );
}

/**
 * Helper function to measure the performance of an operation
 * @param operation - Async function to measure
 * @returns The time taken in milliseconds
 */
async function measurePerformance(operation: Function): Promise<number> {
  const startTime = performance.now();
  await operation();
  const endTime = performance.now();
  return endTime - startTime;
}

// Test suite for authentication login functionality
test.describe('Authentication - Login', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page before each test
    await page.goto(ROUTES.LOGIN);
  });

  test('should display login form with all elements', async ({ page }) => {
    // Verify the page title is visible
    await expect(page.locator('h1')).toContainText('Login to IMS');
    
    // Verify the application logo is visible
    await expect(page.locator('[data-testid="app-logo"]')).toBeVisible();
    
    // Verify the welcome message is visible
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    
    // Verify the username field is visible with correct placeholder
    const usernameField = page.locator('[data-testid="username-input"]');
    await expect(usernameField).toBeVisible();
    await expect(usernameField).toHaveAttribute('placeholder', 'Username');
    
    // Verify the password field is visible with correct placeholder
    const passwordField = page.locator('[data-testid="password-input"]');
    await expect(passwordField).toBeVisible();
    await expect(passwordField).toHaveAttribute('placeholder', 'Password');
    
    // Verify the login button is visible with correct text
    const loginButton = page.locator('[data-testid="login-button"]');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toContainText('Login');
    
    // Verify the forgot password link is visible with correct text
    const forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
    await expect(forgotPasswordLink).toBeVisible();
    await expect(forgotPasswordLink).toContainText('Forgot Password?');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Get valid credentials from TEST_USERS.ADMIN
    const { username, password } = TEST_USERS.ADMIN;
    
    // Login with valid credentials
    await loginUser(page, username, password);
    
    // Verify user is redirected to the dashboard page
    await expect(page).toHaveURL(ROUTES.DASHBOARD);
    
    // Verify user menu shows the correct username
    await expect(page.locator('[data-testid="user-menu"]')).toContainText(username);
    
    // Verify local storage contains authentication token
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).not.toBeNull();
  });

  test('should show error message with invalid credentials', async ({ page }) => {
    // Login with invalid credentials
    await loginUser(page, 'invalid_user', 'invalid_password');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid username or password');
    
    // Verify user remains on the login page
    await expect(page).toHaveURL(ROUTES.LOGIN);
    
    // Verify no authentication token is stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });

  test('should lock account after multiple failed attempts', async ({ page }) => {
    // Get valid username but use invalid password
    const { username } = TEST_USERS.ADMIN;
    const invalidPassword = 'wrong_password';
    
    // Make multiple failed login attempts
    for (let i = 0; i < 5; i++) {
      await loginUser(page, username, invalidPassword);
      
      // If we're on the last attempt, we expect the account to be locked
      if (i === 4) {
        // Verify account locked error message is displayed
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Account locked');
      } else {
        // For earlier attempts, we just expect the invalid credentials message
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid username or password');
      }
    }
    
    // Verify user remains on the login page
    await expect(page).toHaveURL(ROUTES.LOGIN);
    
    // Verify no authentication token is stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });

  test('should redirect to MFA verification for MFA-enabled users', async ({ page }) => {
    // Get credentials for MFA-enabled user
    const { username, password } = TEST_USERS.MFA_USER;
    
    // Login with MFA-enabled user credentials
    await loginUser(page, username, password);
    
    // Verify user is redirected to the MFA verification page
    await expect(page).toHaveURL(ROUTES.MFA_VERIFICATION);
    
    // Verify MFA verification form is displayed
    await expect(page.locator('[data-testid="mfa-verification-form"]')).toBeVisible();
    
    // Verify no authentication token is stored yet (only after MFA verification)
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });

  test('should redirect to password change for expired passwords', async ({ page }) => {
    // Get credentials for user with expired password
    const { username, password } = TEST_USERS.EXPIRED_PASSWORD;
    
    // Login with expired password user credentials
    await loginUser(page, username, password);
    
    // Verify user is redirected to the password change page
    await expect(page).toHaveURL(ROUTES.CHANGE_PASSWORD);
    
    // Verify password change form is displayed
    await expect(page.locator('[data-testid="change-password-form"]')).toBeVisible();
    
    // Verify temporary authentication token is stored
    const token = await page.evaluate(() => localStorage.getItem('temp_auth_token'));
    expect(token).not.toBeNull();
  });

  test('should show appropriate error for disabled accounts', async ({ page }) => {
    // Get credentials for disabled user
    const { username, password } = TEST_USERS.DISABLED_USER;
    
    // Login with disabled user credentials
    await loginUser(page, username, password);
    
    // Verify account disabled error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Account disabled');
    
    // Verify user remains on the login page
    await expect(page).toHaveURL(ROUTES.LOGIN);
    
    // Verify no authentication token is stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });

  test('should show appropriate error for locked accounts', async ({ page }) => {
    // Get credentials for locked user
    const { username, password } = TEST_USERS.LOCKED_USER;
    
    // Login with locked user credentials
    await loginUser(page, username, password);
    
    // Verify account locked error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Account locked');
    
    // Verify user remains on the login page
    await expect(page).toHaveURL(ROUTES.LOGIN);
    
    // Verify no authentication token is stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    // Click the forgot password link
    await page.click('[data-testid="forgot-password-link"]');
    
    // Verify user is redirected to the forgot password page
    await expect(page).toHaveURL(ROUTES.FORGOT_PASSWORD);
    
    // Verify forgot password form is displayed
    await expect(page.locator('[data-testid="forgot-password-form"]')).toBeVisible();
  });

  test('should load login page within performance threshold', async ({ page }) => {
    // Measure time to load login page
    const loadTime = await measurePerformance(async () => {
      await page.goto(ROUTES.LOGIN, { waitUntil: 'networkidle' });
    });
    
    // Verify page load time is below the defined threshold
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
    console.log(`Login page load time: ${Math.round(loadTime)}ms (threshold: ${PERFORMANCE_THRESHOLDS.UI_RESPONSE}ms)`);
  });

  test('should complete login operation within performance threshold', async ({ page }) => {
    // Get valid credentials
    const { username, password } = TEST_USERS.ADMIN;
    
    // Measure login operation time
    const loginTime = await measurePerformance(async () => {
      await loginUser(page, username, password);
      // Wait for redirect to dashboard
      await page.waitForURL(ROUTES.DASHBOARD);
    });
    
    // Verify login operation time is below the defined threshold
    expect(loginTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
    console.log(`Login operation time: ${Math.round(loginTime)}ms (threshold: ${PERFORMANCE_THRESHOLDS.UI_RESPONSE}ms)`);
  });

  test('should show different navigation options based on user role', async ({ page }) => {
    // Test for Admin role
    await loginUser(page, TEST_USERS.ADMIN.username, TEST_USERS.ADMIN.password);
    await page.waitForURL(ROUTES.DASHBOARD);
    
    // Verify Admin sees all navigation options
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-positions"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-inventory"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-locates"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-workflows"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-analytics"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-settings"]')).toBeVisible();
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL(ROUTES.LOGIN);
    
    // Test for Trader role
    await loginUser(page, TEST_USERS.TRADER.username, TEST_USERS.TRADER.password);
    await page.waitForURL(ROUTES.DASHBOARD);
    
    // Verify Trader sees trading-related navigation options
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-positions"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-inventory"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-locates"]')).toBeVisible();
    
    // Verify Trader doesn't see admin options
    await expect(page.locator('[data-testid="nav-settings"]')).not.toBeVisible();
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL(ROUTES.LOGIN);
    
    // Test for Operations role
    await loginUser(page, TEST_USERS.OPERATIONS.username, TEST_USERS.OPERATIONS.password);
    await page.waitForURL(ROUTES.DASHBOARD);
    
    // Verify Operations user sees operations-related navigation options
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-workflows"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-locates"]')).toBeVisible();
    
    // Verify Operations user doesn't see trader-specific options
    await expect(page.locator('[data-testid="nav-analytics"]')).not.toBeVisible();
  });

  test('should maintain login state across page refreshes', async ({ page }) => {
    // Login with valid credentials
    await loginUser(page, TEST_USERS.ADMIN.username, TEST_USERS.ADMIN.password);
    
    // Verify successful login
    await expect(page).toHaveURL(ROUTES.DASHBOARD);
    
    // Refresh the page
    await page.reload();
    
    // Verify user remains logged in after page refresh
    await expect(page).toHaveURL(ROUTES.DASHBOARD);
    
    // Verify user information is still displayed
    await expect(page.locator('[data-testid="user-menu"]')).toContainText(TEST_USERS.ADMIN.username);
  });
});