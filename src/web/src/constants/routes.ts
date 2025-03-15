/**
 * Route constants for the Inventory Management System web application.
 * This file contains all route path strings used throughout the application
 * to ensure consistency and maintainability.
 */

/**
 * Main route paths for primary navigation items in the application.
 */
export const ROUTES = {
  /**
   * Root path of the application.
   */
  ROOT: '/',

  /**
   * Dashboard page that shows system overview, alerts, and summaries.
   */
  DASHBOARD: '/dashboard',

  /**
   * Positions page for viewing and managing position data.
   */
  POSITIONS: '/positions',

  /**
   * Inventory page for viewing inventory availability and status.
   */
  INVENTORY: '/inventory',

  /**
   * Locate management page for handling locate requests.
   */
  LOCATES: '/locates',

  /**
   * Exception management dashboard for viewing and resolving system exceptions.
   */
  EXCEPTIONS: '/exceptions',

  /**
   * Calculation rule management for configuring calculation rules.
   */
  RULES: '/rules',

  /**
   * Analytics page for advanced reporting and data visualization.
   */
  ANALYTICS: '/analytics',

  /**
   * Settings page for user preferences and system configuration.
   */
  SETTINGS: '/settings'
};

/**
 * Authentication-related route paths for login and password management.
 */
export const AUTH_ROUTES = {
  /**
   * Login page for user authentication.
   */
  LOGIN: '/auth/login',

  /**
   * Forgot password page for password recovery.
   */
  FORGOT_PASSWORD: '/auth/forgot-password',

  /**
   * Reset password page for setting a new password.
   */
  RESET_PASSWORD: '/auth/reset-password'
};

/**
 * Error page route paths for handling various error conditions.
 */
export const ERROR_ROUTES = {
  /**
   * 404 Not Found error page.
   */
  NOT_FOUND: '/error/not-found',

  /**
   * 401/403 Unauthorized/Forbidden error page.
   */
  UNAUTHORIZED: '/error/unauthorized',

  /**
   * 500 Server Error page.
   */
  SERVER_ERROR: '/error/server-error'
};

/**
 * Nested route paths for detail views with parameters.
 * These routes are typically used in conjunction with the main routes.
 */
export const NESTED_ROUTES = {
  /**
   * Detail view for a specific position. Parameter: positionId
   */
  POSITION_DETAIL: '/positions/:positionId',

  /**
   * Detail view for specific inventory. Parameter: securityId
   */
  INVENTORY_DETAIL: '/inventory/:securityId',

  /**
   * Detail view for a specific locate request. Parameter: locateId
   */
  LOCATE_DETAIL: '/locates/:locateId',

  /**
   * Detail view for a specific exception. Parameter: exceptionId
   */
  EXCEPTION_DETAIL: '/exceptions/:exceptionId',

  /**
   * Detail view for a specific calculation rule. Parameter: ruleId
   */
  RULE_DETAIL: '/rules/:ruleId',

  /**
   * Editor for creating or editing a calculation rule. Parameter: ruleId (optional)
   */
  RULE_EDITOR: '/rules/editor/:ruleId?'
};