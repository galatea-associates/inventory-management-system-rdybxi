/**
 * Centralized constants for API-related configuration and endpoints in the Inventory Management System frontend.
 * This file defines base URLs, API versions, timeout settings, and endpoint paths for all backend services
 * to ensure consistency across API calls.
 */

// Base configuration constants
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';
export const API_VERSION = 'v1';
export const API_TIMEOUT = 30000; // 30 seconds default timeout
export const WEBSOCKET_BASE_URL = process.env.REACT_APP_WEBSOCKET_BASE_URL || 'ws://localhost:8085';

// Authentication endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: `/api/${API_VERSION}/auth/login`,
  LOGOUT: `/api/${API_VERSION}/auth/logout`,
  REFRESH_TOKEN: `/api/${API_VERSION}/auth/refresh-token`,
  CHANGE_PASSWORD: `/api/${API_VERSION}/auth/change-password`,
  FORGOT_PASSWORD: `/api/${API_VERSION}/auth/forgot-password`,
  RESET_PASSWORD: `/api/${API_VERSION}/auth/reset-password`,
};

// Reference data endpoints
export const REFERENCE_ENDPOINTS = {
  SECURITIES: `/api/${API_VERSION}/securities`,
  SECURITY_BY_ID: (id: string) => `/api/${API_VERSION}/securities/${id}`,
  COUNTERPARTIES: `/api/${API_VERSION}/counterparties`,
  COUNTERPARTY_BY_ID: (id: string) => `/api/${API_VERSION}/counterparties/${id}`,
  BOOKS: `/api/${API_VERSION}/books`,
  BOOK_BY_ID: (id: string) => `/api/${API_VERSION}/books/${id}`,
  AGGREGATION_UNITS: `/api/${API_VERSION}/aggregation-units`,
  AGGREGATION_UNIT_BY_ID: (id: string) => `/api/${API_VERSION}/aggregation-units/${id}`,
  INDEX_COMPOSITIONS: (id: string) => `/api/${API_VERSION}/indexes/${id}/composition`,
};

// Position-related endpoints
export const POSITION_ENDPOINTS = {
  POSITIONS: `/api/${API_VERSION}/positions`,
  POSITION_BY_ID: (id: string) => `/api/${API_VERSION}/positions/${id}`,
  POSITION_FILTER: `/api/${API_VERSION}/positions/filter`,
  POSITION_SUMMARY: `/api/${API_VERSION}/positions/summary`,
  SETTLEMENT_LADDER: `/api/${API_VERSION}/positions/settlement-ladder`,
};

// Inventory-related endpoints
export const INVENTORY_ENDPOINTS = {
  INVENTORY: `/api/${API_VERSION}/inventory`,
  INVENTORY_BY_SECURITY: (id: string) => `/api/${API_VERSION}/inventory/securities/${id}`,
  FOR_LOAN_AVAILABILITY: `/api/${API_VERSION}/inventory/for-loan`,
  FOR_PLEDGE_AVAILABILITY: `/api/${API_VERSION}/inventory/for-pledge`,
  OVERBORROW: `/api/${API_VERSION}/inventory/overborrows`,
  INVENTORY_SUMMARY: `/api/${API_VERSION}/inventory/summary`,
  TOP_SECURITIES: `/api/${API_VERSION}/inventory/top-securities`,
};

// Locate-related endpoints
export const LOCATE_ENDPOINTS = {
  LOCATES: `/api/${API_VERSION}/locates`,
  LOCATE_BY_ID: (id: string) => `/api/${API_VERSION}/locates/${id}`,
  LOCATE_FILTER: `/api/${API_VERSION}/locates/filter`,
  LOCATE_APPROVE: (id: string) => `/api/${API_VERSION}/locates/${id}/approve`,
  LOCATE_REJECT: (id: string) => `/api/${API_VERSION}/locates/${id}/reject`,
  LOCATE_SUMMARY: `/api/${API_VERSION}/locates/summary`,
};

// Order-related endpoints
export const ORDER_ENDPOINTS = {
  ORDERS: `/api/${API_VERSION}/orders`,
  ORDER_BY_ID: (id: string) => `/api/${API_VERSION}/orders/${id}`,
  ORDER_VALIDATE: `/api/${API_VERSION}/orders/validate`,
  CLIENT_LIMITS: (id: string) => `/api/${API_VERSION}/limits/client/${id}`,
  AGGREGATION_UNIT_LIMITS: (id: string) => `/api/${API_VERSION}/limits/aggregation-unit/${id}`,
};

// Calculation rule endpoints
export const RULE_ENDPOINTS = {
  RULES: `/api/${API_VERSION}/rules`,
  RULE_BY_ID: (id: string) => `/api/${API_VERSION}/rules/${id}`,
  RULE_FILTER: `/api/${API_VERSION}/rules/filter`,
  RULE_PUBLISH: (id: string) => `/api/${API_VERSION}/rules/${id}/publish`,
  RULE_TEST: (id: string) => `/api/${API_VERSION}/rules/${id}/test`,
};

// Exception management endpoints
export const EXCEPTION_ENDPOINTS = {
  EXCEPTIONS: `/api/${API_VERSION}/exceptions`,
  EXCEPTION_BY_ID: (id: string) => `/api/${API_VERSION}/exceptions/${id}`,
  EXCEPTION_FILTER: `/api/${API_VERSION}/exceptions/filter`,
  EXCEPTION_RESOLVE: (id: string) => `/api/${API_VERSION}/exceptions/${id}/resolve`,
  EXCEPTION_ASSIGN: (id: string) => `/api/${API_VERSION}/exceptions/${id}/assign`,
  EXCEPTION_ESCALATE: (id: string) => `/api/${API_VERSION}/exceptions/${id}/escalate`,
};

// User management endpoints
export const USER_ENDPOINTS = {
  USERS: `/api/${API_VERSION}/users`,
  USER_BY_ID: (id: string) => `/api/${API_VERSION}/users/${id}`,
  USER_PROFILE: `/api/${API_VERSION}/users/profile`,
  USER_PREFERENCES: `/api/${API_VERSION}/users/preferences`,
};

// System monitoring and configuration endpoints
export const SYSTEM_ENDPOINTS = {
  HEALTH: `/api/${API_VERSION}/system/health`,
  METRICS: `/api/${API_VERSION}/system/metrics`,
  INFO: `/api/${API_VERSION}/system/info`,
  CONFIG: `/api/${API_VERSION}/system/config`,
};

// WebSocket topic names for real-time data subscriptions
export const WEBSOCKET_TOPICS = {
  POSITIONS: `topic/positions`,
  INVENTORY: `topic/inventory`,
  LOCATES: `topic/locates`,
  ORDERS: `topic/orders`,
  EXCEPTIONS: `topic/exceptions`,
  ALERTS: `topic/alerts`,
};

// HTTP status code constants for API response handling
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};