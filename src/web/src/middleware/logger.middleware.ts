/**
 * Redux middleware for logging actions and state changes in the Inventory Management System frontend.
 * This middleware intercepts Redux actions, logs them with appropriate context, and tracks state
 * changes to support debugging, monitoring, and observability of the application.
 */

import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux'; // redux 4.2.1
import { debug, info, warn, error } from '../utils/logger';
import { RootState } from '../types/state';
import { API_ACTION_TYPES } from './api.middleware';

// Environment flags
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const IS_TEST = process.env.NODE_ENV === 'test';

// Configurable options with defaults
const ENABLE_ACTION_LOGGING = process.env.REACT_APP_ENABLE_ACTION_LOGGING === 'true' || IS_DEVELOPMENT;
const ENABLE_STATE_LOGGING = process.env.REACT_APP_ENABLE_STATE_LOGGING === 'true';
const EXCLUDED_ACTIONS = [/^@@redux/, /^@@INIT/];

/**
 * Interface for logger middleware options
 */
export interface LoggerOptions {
  /** Whether to log actions */
  enableActionLogging: boolean;
  /** Whether to log state changes */
  enableStateLogging: boolean;
  /** Patterns for actions to exclude from logging */
  excludedActions: RegExp[];
  /** Default log level */
  logLevel: string;
}

/**
 * Creates a Redux middleware for logging actions and state changes
 * @param options - Configuration options for the logger
 * @returns Configured logger middleware
 */
export function createLoggerMiddleware(options?: Partial<LoggerOptions>): Middleware {
  // Default options
  const defaultOptions: LoggerOptions = {
    enableActionLogging: ENABLE_ACTION_LOGGING,
    enableStateLogging: ENABLE_STATE_LOGGING,
    excludedActions: EXCLUDED_ACTIONS,
    logLevel: 'debug'
  };

  // Merge provided options with defaults
  const mergedOptions = { ...defaultOptions, ...options };

  return ({ getState }: MiddlewareAPI<Dispatch, RootState>) => 
    (next: Dispatch) => (action: AnyAction) => {
      // Skip logging if action shouldn't be logged
      if (!shouldLogAction(action)) {
        return next(action);
      }

      // Log the action
      logAction(action);

      // Get state before action
      const prevState = getState();

      // Call next middleware
      const result = next(action);

      // Get state after action
      const nextState = getState();

      // Log state change if enabled
      if (mergedOptions.enableStateLogging) {
        logStateDiff(prevState, nextState, action);
      }

      return result;
    };
}

/**
 * Determines if an action should be logged based on exclusion patterns
 * @param action - Action to check
 * @returns True if the action should be logged
 */
function shouldLogAction(action: AnyAction): boolean {
  // Skip if action logging is disabled
  if (!ENABLE_ACTION_LOGGING) {
    return false;
  }

  // Check against excluded action patterns
  if (EXCLUDED_ACTIONS.some(pattern => pattern.test(action.type))) {
    return false;
  }

  return true;
}

/**
 * Determines the appropriate log level for an action
 * @param action - Action to check
 * @returns Log level (debug, info, warn, error)
 */
function getLogLevel(action: AnyAction): string {
  // Check for error actions
  if (action.error === true) {
    return 'error';
  }

  // Check action type patterns
  if (/FAILURE|ERROR/i.test(action.type)) {
    return 'error';
  }
  
  if (/WARNING|WARN/i.test(action.type)) {
    return 'warn';
  }
  
  if (/SUCCESS/i.test(action.type)) {
    return 'info';
  }
  
  // Default level
  return 'debug';
}

/**
 * Logs an action with appropriate level and context
 * @param action - Action to log
 */
function logAction(action: AnyAction): void {
  const level = getLogLevel(action);
  const sanitizedAction = sanitizeAction(action);
  
  // Different formatting for API actions
  if (action.type === API_ACTION_TYPES.API_REQUEST) {
    const { method, endpoint } = action.payload;
    const message = `API Request: ${method.toUpperCase()} ${endpoint}`;
    
    switch (level) {
      case 'error': error(message, sanitizedAction); break;
      case 'warn': warn(message, sanitizedAction); break;
      case 'info': info(message, sanitizedAction); break;
      default: debug(message, sanitizedAction);
    }
  } 
  else if (action.type === API_ACTION_TYPES.API_SUCCESS) {
    const { originalRequest } = action.payload;
    const message = `API Success: ${originalRequest.method.toUpperCase()} ${originalRequest.endpoint}`;
    
    switch (level) {
      case 'error': error(message, sanitizedAction); break;
      case 'warn': warn(message, sanitizedAction); break;
      case 'info': info(message, sanitizedAction); break;
      default: debug(message, sanitizedAction);
    }
  }
  else if (action.type === API_ACTION_TYPES.API_FAILURE) {
    const { originalRequest } = action.meta;
    const message = `API Failure: ${originalRequest.method.toUpperCase()} ${originalRequest.endpoint}`;
    
    error(message, sanitizedAction);
  }
  // Regular action logging
  else {
    const message = `Action: ${action.type}`;
    
    switch (level) {
      case 'error': error(message, sanitizedAction); break;
      case 'warn': warn(message, sanitizedAction); break;
      case 'info': info(message, sanitizedAction); break;
      default: debug(message, sanitizedAction);
    }
  }
}

/**
 * Sanitizes an action by removing sensitive data
 * @param action - Action to sanitize
 * @returns Sanitized action object
 */
function sanitizeAction(action: AnyAction): object {
  // Create a deep copy of the action
  const sanitized = JSON.parse(JSON.stringify(action));
  
  // List of sensitive fields to redact
  const sensitiveFields = [
    'password', 
    'newPassword', 
    'confirmPassword',
    'token', 
    'refreshToken', 
    'accessToken',
    'authToken',
    'secret',
    'apiKey',
    'credentials'
  ];
  
  // Function to recursively sanitize objects
  const sanitizeObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      // Check if this key should be redacted
      if (sensitiveFields.includes(key)) {
        obj[key] = '[REDACTED]';
      } 
      // Recursively sanitize nested objects and arrays
      else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    });
  };
  
  // Start sanitization
  sanitizeObject(sanitized);
  
  return sanitized;
}

/**
 * Logs the difference between previous and next state
 * @param prevState - State before action
 * @param nextState - State after action
 * @param action - Action that caused the state change
 */
function logStateDiff(prevState: RootState, nextState: RootState, action: AnyAction): void {
  const diff = calculateStateDiff(prevState, nextState);
  
  if (Object.keys(diff).length > 0) {
    debug(`State change from action ${action.type}`, {
      action: action.type,
      diff: sanitizeState(diff)
    });
  }
}

/**
 * Calculates the difference between two state objects
 * @param prevState - Previous state
 * @param nextState - Next state
 * @returns Object containing changed state properties
 */
function calculateStateDiff(prevState: RootState, nextState: RootState): object {
  const diff: Record<string, any> = {};
  
  // Check all top-level state keys
  Object.keys(nextState).forEach(key => {
    if (prevState[key as keyof RootState] !== nextState[key as keyof RootState]) {
      diff[key] = nextState[key as keyof RootState];
    }
  });
  
  return diff;
}

/**
 * Sanitizes state by removing sensitive data
 * @param state - State to sanitize
 * @returns Sanitized state object
 */
function sanitizeState(state: any): object {
  // Create a deep copy
  const sanitized = JSON.parse(JSON.stringify(state));
  
  // List of sensitive fields to redact
  const sensitiveFields = [
    'password', 
    'token', 
    'refreshToken', 
    'accessToken',
    'authToken',
    'apiKey'
  ];
  
  // Function to recursively sanitize objects
  const sanitizeObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      // Check if this key should be redacted
      if (sensitiveFields.includes(key)) {
        obj[key] = '[REDACTED]';
      } 
      // Special handling for email fields
      else if (key === 'email' && typeof obj[key] === 'string') {
        const parts = obj[key].split('@');
        if (parts.length === 2) {
          obj[key] = `${parts[0]}@[REDACTED]`;
        }
      }
      // Recursively sanitize nested objects and arrays
      else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    });
  };
  
  // Start sanitization
  sanitizeObject(sanitized);
  
  return sanitized;
}

// Create an instance of the logger middleware with default configuration
export const loggerMiddleware = createLoggerMiddleware();