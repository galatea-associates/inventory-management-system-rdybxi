/**
 * Authentication Middleware
 * 
 * Redux middleware for handling authentication-related actions in the Inventory Management System.
 * This middleware intercepts Redux actions to manage token refresh, session validation,
 * and authentication state synchronization across the application.
 */

import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux'; // redux ^4.2.1
import { refreshToken } from '../services/auth.service';
import { isTokenExpired, getToken, getRemainingTokenTime } from '../utils/security';
import { debug, info, error } from '../utils/logger';
import { RootState } from '../types/state';

// Time threshold for refreshing token (5 minutes in milliseconds)
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;

// Actions that should be excluded from token validation to prevent circular dependencies
const EXCLUDED_ACTIONS = [
  'auth/login/pending',
  'auth/login/fulfilled',
  'auth/login/rejected',
  'auth/logout/pending',
  'auth/logout/fulfilled',
  'auth/logout/rejected',
  'auth/refreshToken/pending',
  'auth/refreshToken/fulfilled',
  'auth/refreshToken/rejected',
  'auth/verifyMfa/pending',
  'auth/verifyMfa/fulfilled',
  'auth/verifyMfa/rejected'
];

/**
 * Determines if an action should be excluded from token validation
 * 
 * @param action - Action to check
 * @returns True if the action should be excluded from token validation
 */
const shouldExcludeAction = (action: AnyAction): boolean => {
  return EXCLUDED_ACTIONS.includes(action.type);
};

/**
 * Checks if the current token is about to expire and refreshes it if needed
 * 
 * @param api - Redux middleware API
 * @returns Promise that resolves when token check is complete
 */
const checkTokenExpiration = async (api: MiddlewareAPI<Dispatch, RootState>): Promise<void> => {
  const token = getToken();
  if (!token) {
    return;
  }
  
  const remainingTime = getRemainingTokenTime();
  if (remainingTime !== null && remainingTime * 1000 < TOKEN_REFRESH_THRESHOLD) {
    debug('Auth middleware: Token is about to expire, attempting to refresh');
    try {
      await refreshToken();
      info('Auth middleware: Token refreshed successfully');
    } catch (err) {
      error('Auth middleware: Failed to refresh token', err);
      // Note: We don't throw here to prevent disrupting the application flow
      // The failed refresh will be handled by subsequent requests or expiration
    }
  }
};

/**
 * Creates a Redux middleware for handling authentication-related actions
 * 
 * @returns Redux middleware function for authentication handling
 */
export const createAuthMiddleware = (): Middleware => {
  return (api: MiddlewareAPI<Dispatch, RootState>) => 
    (next: Dispatch) => 
    async (action: AnyAction) => {
      // Skip token validation for excluded actions
      if (shouldExcludeAction(action)) {
        debug(`Auth middleware: Skipping token validation for excluded action: ${action.type}`);
        return next(action);
      }
      
      // Get the current authentication state
      const state = api.getState();
      const { isAuthenticated, token } = state.auth;
      
      // If not authenticated, don't perform token checks
      if (!isAuthenticated || !token) {
        return next(action);
      }
      
      // Check if token is expired, and logout if it is
      if (isTokenExpired()) {
        info('Auth middleware: Token is expired, logging out user');
        // Dispatch logout action
        api.dispatch({ type: 'auth/logout/pending' });
        return next(action);
      }
      
      // Check if token is about to expire and refresh if needed
      await checkTokenExpiration(api);
      
      // Continue with the action
      return next(action);
    };
};

// Create and export the middleware instance for direct use in store configuration
export const authMiddleware = createAuthMiddleware();