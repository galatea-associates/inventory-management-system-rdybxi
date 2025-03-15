import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux'; // redux ^4.2.1
import { errorService } from '../services/error.service';
import { handleError, ERROR_TYPES } from '../utils/errorHandler';
import { debug, error } from '../utils/logger';
import { notificationService } from '../services/notification.service';
import { ErrorResponse } from '../types/api';

// Flag to determine if we're in development environment for enhanced debugging
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

/**
 * Creates a Redux middleware for handling errors in actions
 * @returns Configured error handling middleware
 */
export function createErrorMiddleware(): Middleware {
  return ({ dispatch, getState }: MiddlewareAPI) => (next: Dispatch) => (action: AnyAction) => {
    // Check if the action is an error action
    if (isErrorAction(action)) {
      try {
        debug('Error action detected', { type: action.type });
        
        // Extract error from action
        const extractedError = extractErrorFromAction(action);
        
        // Get context information for the error
        const context = getErrorContext(action);
        
        // Process the error using errorService
        const errorResponse = errorService.handleError(extractedError, context);
        
        // Log the error with action context
        error(`Error in action ${action.type}:`, errorResponse);
        
        // Add additional debugging information in development mode
        if (IS_DEVELOPMENT) {
          debug('Error action details:', {
            action,
            extractedError,
            errorResponse
          });
        }
        
        // Determine if notification should be shown
        if (shouldShowNotification(action, errorResponse)) {
          errorService.showErrorNotification(errorResponse, {
            title: action.meta?.notificationTitle || 'Error',
            source: action.meta?.source || 'action',
            priority: action.meta?.priority || (errorResponse.code === ERROR_TYPES.AUTHENTICATION_ERROR ? 'high' : 'medium')
          });
        }
      } catch (e) {
        // Handle errors in the error handling itself
        error('Error in error middleware:', e);
        
        // Attempt to show a notification as a fallback
        try {
          notificationService.addNotification({
            type: 'error',
            title: 'System Error',
            message: 'An unexpected error occurred in the error handling system',
            priority: 'high',
            source: 'system'
          });
        } catch {
          // Last resort: log to console if even notification fails
          console.error('Critical error in error handling middleware:', e, action);
        }
      }
    }
    
    // Pass the action to the next middleware regardless of error handling
    return next(action);
  };
}

/**
 * Type guard to check if an action is an error action
 * @param action - Action to check
 * @returns True if the action is an error action
 */
function isErrorAction(action: AnyAction): boolean {
  // Check if action has an error property set to true
  if (action.error === true) {
    return true;
  }
  
  // Check if action.payload is an Error
  if (action.payload instanceof Error) {
    return true;
  }
  
  // Check if action.payload has error-like properties
  if (action.payload && typeof action.payload === 'object') {
    // Check for standard error response properties
    if ('status' in action.payload && 'message' in action.payload) {
      return true;
    }
    
    // Check for error property that might contain the actual error
    if ('error' in action.payload && action.payload.error) {
      return true;
    }
    
    // Check for common error properties
    if (('message' in action.payload && 'code' in action.payload) || 
        ('message' in action.payload && 'stack' in action.payload)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extracts error information from an action
 * @param action - Action to extract error from
 * @returns The extracted error
 */
function extractErrorFromAction(action: AnyAction): Error | ErrorResponse | unknown {
  const { payload } = action;
  
  // If payload is already an Error, return it directly
  if (payload instanceof Error) {
    return payload;
  }
  
  // If payload is an ErrorResponse, return it directly
  if (payload && typeof payload === 'object' && 'status' in payload && 'message' in payload) {
    return payload;
  }
  
  // If payload has an error property that is an Error, return that
  if (payload && typeof payload === 'object' && 'error' in payload) {
    if (payload.error instanceof Error) {
      return payload.error;
    } else if (payload.error && typeof payload.error === 'object') {
      return payload.error;
    }
  }
  
  // If payload has common error properties, return it as is
  if (payload && typeof payload === 'object' && ('message' in payload || 'code' in payload)) {
    return payload;
  }
  
  // If payload is a string, create a new Error with it as message
  if (typeof payload === 'string') {
    return new Error(payload);
  }
  
  // If all else fails, create a generic error
  return new Error(`Unknown error in ${action.type}`);
}

/**
 * Extracts context information from an error action
 * @param action - Action to extract context from
 * @returns Context information for the error
 */
function getErrorContext(action: AnyAction): string {
  // Start with the action type as base context
  let context = `Action: ${action.type}`;
  
  // If action has metadata with context, append that
  if (action.meta) {
    if (action.meta.context) {
      context += ` | Context: ${action.meta.context}`;
    }
    
    // Add additional context from other metadata if available
    if (action.meta.feature) {
      context += ` | Feature: ${action.meta.feature}`;
    }
    
    if (action.meta.entityId) {
      context += ` | Entity: ${action.meta.entityType || 'Unknown'}:${action.meta.entityId}`;
    }
  }
  
  return context;
}

/**
 * Determines if an error notification should be shown
 * @param action - Action that caused the error
 * @param errorResponse - Error response object
 * @returns True if notification should be shown
 */
function shouldShowNotification(action: AnyAction, errorResponse: ErrorResponse): boolean {
  // If action metadata explicitly specifies suppressNotification, respect that
  if (action.meta && action.meta.suppressNotification !== undefined) {
    return !action.meta.suppressNotification;
  }
  
  // Don't show notifications for network errors during background operations
  if (errorResponse.isNetworkError && action.meta?.background === true) {
    return false;
  }
  
  // Don't show notifications for validation errors in forms (handled by form components)
  if (errorResponse.code === ERROR_TYPES.VALIDATION_ERROR && action.meta?.form === true) {
    return false;
  }
  
  // Default to showing notification
  return true;
}

// Export a singleton instance of the middleware for direct use
export const errorMiddleware = createErrorMiddleware();