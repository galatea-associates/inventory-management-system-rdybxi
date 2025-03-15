/**
 * Error Service
 * 
 * Provides centralized error handling for the Inventory Management System frontend.
 * This service processes errors, displays user-friendly notifications, logs errors
 * for monitoring, and provides extensibility for custom error handling.
 */

import { AxiosError } from 'axios'; // axios ^1.4.0
import { handleError, ERROR_TYPES, getErrorMessage } from '../utils/errorHandler';
import { debug, info, warn, error } from '../utils/logger';
import { ErrorResponse, ValidationError } from '../types/api';
import { notificationService } from './notification.service';

// Default notification settings for error messages
const ERROR_NOTIFICATION_DEFAULTS = {
  title: 'Error',
  priority: 'high',
  source: 'system',
  autoClose: true,
  duration: 5000
};

/**
 * Service class for handling errors in the application
 */
export class ErrorService {
  private errorHandlers: Map<string, Function>;
  private initialized: boolean;

  constructor() {
    // Initialize errorHandlers map
    this.errorHandlers = new Map<string, Function>();
    // Set initialized flag to false
    this.initialized = false;
  }

  /**
   * Initializes the error service
   */
  public initialize(): void {
    // If already initialized, return immediately
    if (this.initialized) {
      debug('Error service already initialized');
      return;
    }

    // Register default error handlers for common error types
    this.registerDefaultHandlers();
    
    // Set initialized flag to true
    this.initialized = true;
    
    info('Error service initialized');
  }

  /**
   * Shuts down the error service
   */
  public shutdown(): void {
    // If not initialized, return immediately
    if (!this.initialized) {
      return;
    }

    // Clear all error handlers
    this.errorHandlers.clear();
    
    // Set initialized flag to false
    this.initialized = false;
    
    info('Error service shutdown');
  }

  /**
   * Processes an error and applies appropriate handling
   * @param err - Error to process
   * @param context - Additional context for the error
   * @returns Standardized error response
   */
  public handleError(err: Error | unknown, context: string = ''): ErrorResponse {
    // Process the error using handleError utility
    const errorResponse = handleError(err);
    
    // Log the error with context information
    error(`${context ? context + ': ' : ''}${errorResponse.message}`, errorResponse);
    
    // Apply appropriate error handler based on error type
    const handler = this.getErrorHandler(errorResponse.code);
    
    if (handler) {
      handler(errorResponse);
    } else {
      // If no specific handler found, use the unknown error handler
      this.handleUnknownError(errorResponse);
    }
    
    // Return the standardized error response
    return errorResponse;
  }

  /**
   * Registers a custom error handler for a specific error type
   * @param errorType - Error type to handle
   * @param handler - Handler function
   */
  public registerErrorHandler(errorType: string, handler: Function): void {
    // Validate that errorType is valid
    if (!Object.values(ERROR_TYPES).includes(errorType as any)) {
      warn(`Invalid error type: ${errorType}. Valid types are: ${Object.values(ERROR_TYPES).join(', ')}`);
      return;
    }
    
    // Add handler to errorHandlers map with errorType as key
    this.errorHandlers.set(errorType, handler);
    
    debug(`Registered error handler for type: ${errorType}`);
  }

  /**
   * Removes a custom error handler for a specific error type
   * @param errorType - Error type to remove handler for
   * @returns True if handler was removed, false otherwise
   */
  public unregisterErrorHandler(errorType: string): boolean {
    // Check if handler exists for the specified errorType
    if (this.errorHandlers.has(errorType)) {
      // If exists, remove it and return true
      this.errorHandlers.delete(errorType);
      debug(`Unregistered error handler for type: ${errorType}`);
      return true;
    }
    
    // Otherwise return false
    debug(`No handler found to unregister for type: ${errorType}`);
    return false;
  }

  /**
   * Retrieves the error handler for a specific error type
   * @param errorType - Error type to get handler for
   * @returns The error handler function if found, undefined otherwise
   */
  public getErrorHandler(errorType: string): Function | undefined {
    // Return the handler from errorHandlers map for the specified errorType
    return this.errorHandlers.get(errorType);
  }

  /**
   * Displays an error notification to the user
   * @param errorResponse - Error response to display
   * @param options - Additional notification options
   */
  public showErrorNotification(errorResponse: ErrorResponse, options: object = {}): void {
    // Merge default notification options with provided options
    const notificationOptions = {
      ...ERROR_NOTIFICATION_DEFAULTS,
      ...options
    };
    
    // Extract error message from errorResponse
    const message = errorResponse.message || 'An unexpected error occurred';
    
    // Create notification with error message and options
    notificationService.addNotification({
      type: 'error',
      title: notificationOptions.title,
      message,
      priority: notificationOptions.priority,
      source: notificationOptions.source,
      data: {
        errorCode: errorResponse.code,
        correlationId: errorResponse.correlationId,
        entityType: 'error',
        entityId: errorResponse.correlationId || undefined
      }
    });
    
    debug('Displayed error notification', { errorCode: errorResponse.code, message });
  }

  /**
   * Default handler for network errors
   * @param errorResponse - Error response to handle
   */
  private handleNetworkError(errorResponse: ErrorResponse): void {
    // Show error notification with network error message
    this.showErrorNotification(errorResponse, {
      title: 'Network Error',
      autoClose: true,
      duration: 8000
    });
    
    // Log network error
    warn('Network connectivity issue detected', errorResponse);
  }

  /**
   * Default handler for timeout errors
   * @param errorResponse - Error response to handle
   */
  private handleTimeoutError(errorResponse: ErrorResponse): void {
    // Show error notification with timeout error message
    this.showErrorNotification(errorResponse, {
      title: 'Request Timeout',
      autoClose: true,
      duration: 8000
    });
    
    // Log timeout error
    warn('Request timeout detected', errorResponse);
  }

  /**
   * Default handler for authentication errors
   * @param errorResponse - Error response to handle
   */
  private handleAuthenticationError(errorResponse: ErrorResponse): void {
    // Show error notification with authentication error message
    this.showErrorNotification(errorResponse, {
      title: 'Authentication Error',
      autoClose: true,
      duration: 10000
    });
    
    // Trigger authentication flow (redirect to login)
    // This would typically dispatch an action to the auth store or redirect
    const loginUrl = '/login';
    if (window.location.pathname !== loginUrl) {
      debug(`Redirecting to login due to authentication error: ${errorResponse.message}`);
      // Save current location for redirect back after login
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      window.location.href = loginUrl;
    }
    
    // Log authentication error
    error('Authentication error', errorResponse);
  }

  /**
   * Default handler for authorization errors
   * @param errorResponse - Error response to handle
   */
  private handleAuthorizationError(errorResponse: ErrorResponse): void {
    // Show error notification with authorization error message
    this.showErrorNotification(errorResponse, {
      title: 'Permission Denied',
      autoClose: true,
      duration: 8000
    });
    
    // Log authorization error
    error('Authorization error', errorResponse);
  }

  /**
   * Default handler for validation errors
   * @param errorResponse - Error response to handle
   */
  private handleValidationError(errorResponse: ErrorResponse): void {
    // Extract validation errors from errorResponse
    const validationErrors = errorResponse.errors || [];
    
    // Create a more user-friendly message if there are validation errors
    let message = errorResponse.message;
    if (validationErrors.length > 0) {
      message += ' Please check the following fields: ' + 
        validationErrors.map(err => err.field).join(', ');
    }
    
    // Show error notification with validation error message
    this.showErrorNotification({
      ...errorResponse,
      message
    }, {
      title: 'Validation Error',
      autoClose: true,
      duration: 8000
    });
    
    // Return validation errors for form display
    // This could be used by the calling code to highlight invalid fields
    
    // Log validation error
    warn('Validation error', { errorResponse, validationErrors });
  }

  /**
   * Default handler for server errors
   * @param errorResponse - Error response to handle
   */
  private handleServerError(errorResponse: ErrorResponse): void {
    // Show error notification with server error message
    this.showErrorNotification(errorResponse, {
      title: 'Server Error',
      autoClose: true,
      duration: 10000
    });
    
    // Log server error with high severity
    error('Server error detected', errorResponse);
  }

  /**
   * Default handler for not found errors
   * @param errorResponse - Error response to handle
   */
  private handleNotFoundError(errorResponse: ErrorResponse): void {
    // Show error notification with not found error message
    this.showErrorNotification(errorResponse, {
      title: 'Resource Not Found',
      autoClose: true,
      duration: 8000
    });
    
    // Log not found error
    warn('Resource not found', errorResponse);
  }

  /**
   * Default handler for unknown errors
   * @param errorResponse - Error response to handle
   */
  private handleUnknownError(errorResponse: ErrorResponse): void {
    // Show error notification with generic error message
    this.showErrorNotification(errorResponse, {
      title: 'Unexpected Error',
      autoClose: true,
      duration: 10000
    });
    
    // Log unknown error with high severity
    error('Unexpected error', errorResponse);
  }

  /**
   * Registers default error handlers for common error types
   */
  private registerDefaultHandlers(): void {
    // Register handler for NETWORK_ERROR
    this.registerErrorHandler(ERROR_TYPES.NETWORK_ERROR, this.handleNetworkError.bind(this));
    
    // Register handler for TIMEOUT_ERROR
    this.registerErrorHandler(ERROR_TYPES.TIMEOUT_ERROR, this.handleTimeoutError.bind(this));
    
    // Register handler for AUTHENTICATION_ERROR
    this.registerErrorHandler(ERROR_TYPES.AUTHENTICATION_ERROR, this.handleAuthenticationError.bind(this));
    
    // Register handler for AUTHORIZATION_ERROR
    this.registerErrorHandler(ERROR_TYPES.AUTHORIZATION_ERROR, this.handleAuthorizationError.bind(this));
    
    // Register handler for VALIDATION_ERROR
    this.registerErrorHandler(ERROR_TYPES.VALIDATION_ERROR, this.handleValidationError.bind(this));
    
    // Register handler for SERVER_ERROR
    this.registerErrorHandler(ERROR_TYPES.SERVER_ERROR, this.handleServerError.bind(this));
    
    // Register handler for NOT_FOUND_ERROR
    this.registerErrorHandler(ERROR_TYPES.NOT_FOUND_ERROR, this.handleNotFoundError.bind(this));
    
    // Register handler for UNKNOWN_ERROR
    this.registerErrorHandler(ERROR_TYPES.UNKNOWN_ERROR, this.handleUnknownError.bind(this));
    
    debug('Registered default error handlers');
  }
}

// Create and export singleton instance
const errorService = new ErrorService();

// Export the singleton instance and class
export { errorService };
export { ErrorService };