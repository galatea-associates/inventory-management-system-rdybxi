/**
 * errorHandler.ts
 * Utility for standardized error handling in the Inventory Management System frontend.
 * Provides functions for processing errors, creating consistent error responses,
 * and integrating with the notification system to display user-friendly error messages.
 */

import axios, { AxiosError } from 'axios'; // axios 1.4.0
import { debug, info, warn, error } from './logger';
import { ErrorResponse, ValidationError } from '../types/api';

/**
 * Constants for categorizing error types
 */
export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Constants for HTTP status codes
 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Default error message for unknown errors
 */
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred. Please try again later.';

/**
 * Interface for detailed error information
 */
export interface ErrorDetails {
  /** Stack trace */
  stack?: string;
  /** Timestamp when the error occurred */
  timestamp: string;
  /** Browser information */
  browser: string;
  /** Operating system information */
  os: string;
  /** Original error object */
  originalError: any;
}

/**
 * Type guard to check if an error is an AxiosError
 * @param error - Error to check
 * @returns True if the error is an AxiosError
 */
export function isAxiosError(error: Error | unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/**
 * Determines the error type based on status code and error properties
 * @param status - HTTP status code
 * @param error - Original error object
 * @returns Error type from ERROR_TYPES
 */
export function getErrorType(status: number | undefined, error: Error | unknown): string {
  // Check for network errors (no status code)
  if (!status) {
    if (isAxiosError(error) && error.code === 'ECONNABORTED') {
      return ERROR_TYPES.TIMEOUT_ERROR;
    }
    return ERROR_TYPES.NETWORK_ERROR;
  }

  // Map HTTP status codes to error types
  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      return ERROR_TYPES.VALIDATION_ERROR;
    case HTTP_STATUS.UNAUTHORIZED:
      return ERROR_TYPES.AUTHENTICATION_ERROR;
    case HTTP_STATUS.FORBIDDEN:
      return ERROR_TYPES.AUTHORIZATION_ERROR;
    case HTTP_STATUS.NOT_FOUND:
      return ERROR_TYPES.NOT_FOUND_ERROR;
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
      return ERROR_TYPES.SERVER_ERROR;
    default:
      return ERROR_TYPES.API_ERROR;
  }
}

/**
 * Extracts or generates an appropriate error message
 * @param error - Original error object
 * @param errorType - Type of error from ERROR_TYPES
 * @returns User-friendly error message
 */
export function getErrorMessage(error: Error | unknown, errorType: string): string {
  // If error has a message property, use that
  if (error instanceof Error) {
    return error.message;
  }

  // If it's an Axios error with response data
  if (isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }

  // Generate default messages based on error type
  switch (errorType) {
    case ERROR_TYPES.NETWORK_ERROR:
      return 'Network connection error. Please check your internet connection.';
    case ERROR_TYPES.TIMEOUT_ERROR:
      return 'Request timed out. Please try again later.';
    case ERROR_TYPES.AUTHENTICATION_ERROR:
      return 'Authentication failed. Please log in again.';
    case ERROR_TYPES.AUTHORIZATION_ERROR:
      return 'You do not have permission to perform this action.';
    case ERROR_TYPES.NOT_FOUND_ERROR:
      return 'The requested resource was not found.';
    case ERROR_TYPES.SERVER_ERROR:
      return 'Server error. Please try again later.';
    case ERROR_TYPES.VALIDATION_ERROR:
      return 'Validation error. Please check your input.';
    case ERROR_TYPES.API_ERROR:
      return 'API error. Please try again later.';
    case ERROR_TYPES.UNKNOWN_ERROR:
    default:
      return DEFAULT_ERROR_MESSAGE;
  }
}

/**
 * Extracts validation errors from the error response
 * @param error - Original error object
 * @returns Array of validation errors
 */
export function extractValidationErrors(error: Error | unknown): ValidationError[] {
  const validationErrors: ValidationError[] = [];

  if (isAxiosError(error) && error.response?.data?.errors) {
    // Extract validation errors from the response data
    const errors = error.response.data.errors;
    if (Array.isArray(errors)) {
      return errors;
    }
  }

  return validationErrors;
}

/**
 * Formats validation errors into a user-friendly object
 * @param errors - Array of validation errors
 * @returns Object with field names as keys and error messages as values
 */
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  errors.forEach(error => {
    formattedErrors[error.field] = error.message;
  });

  return formattedErrors;
}

/**
 * Creates a detailed error object with additional information
 * @param error - Original error object
 * @param errorType - Type of error from ERROR_TYPES
 * @returns Detailed error information object
 */
function createErrorDetails(error: Error | unknown, errorType: string): ErrorDetails {
  const details: ErrorDetails = {
    timestamp: new Date().toISOString(),
    browser: navigator.userAgent,
    os: navigator.platform,
    originalError: error
  };

  // Add stack trace if available
  if (error instanceof Error) {
    details.stack = error.stack;
  }

  return details;
}

/**
 * Logs an error with appropriate context
 * @param errorResponse - Standardized error response
 * @param context - Additional context for the error
 */
function logError(errorResponse: ErrorResponse, context: string = 'General'): void {
  const logMessage = `${context} Error: ${errorResponse.message}`;
  
  // Log with appropriate severity based on error type
  switch (errorResponse.code) {
    case ERROR_TYPES.AUTHENTICATION_ERROR:
    case ERROR_TYPES.SERVER_ERROR:
      error(logMessage, errorResponse);
      break;
    case ERROR_TYPES.VALIDATION_ERROR:
    case ERROR_TYPES.NOT_FOUND_ERROR:
      warn(logMessage, errorResponse);
      break;
    default:
      info(logMessage, errorResponse);
  }
}

/**
 * Processes an error and returns a standardized error response
 * @param error - Error to process
 * @returns Standardized error response object
 */
export function handleError(error: Error | unknown): ErrorResponse {
  // Initialize default error response
  const errorResponse: ErrorResponse = {
    status: 0,
    statusText: '',
    message: DEFAULT_ERROR_MESSAGE,
    code: ERROR_TYPES.UNKNOWN_ERROR,
    errors: [],
    timestamp: new Date().toISOString(),
    path: '',
    correlationId: '',
    isNetworkError: false,
    isTimeout: false
  };

  if (isAxiosError(error)) {
    // Extract information from AxiosError
    const status = error.response?.status;
    const statusText = error.response?.statusText || '';
    const path = error.config?.url || '';
    
    // Determine error type based on status code
    const errorType = getErrorType(status, error);
    
    // Update error response with extracted information
    errorResponse.status = status || 0;
    errorResponse.statusText = statusText;
    errorResponse.code = errorType;
    errorResponse.message = getErrorMessage(error, errorType);
    errorResponse.path = path;
    
    // Set network error flag
    if (errorType === ERROR_TYPES.NETWORK_ERROR) {
      errorResponse.isNetworkError = true;
    }
    
    // Set timeout flag
    if (errorType === ERROR_TYPES.TIMEOUT_ERROR) {
      errorResponse.isTimeout = true;
    }
    
    // Extract validation errors if applicable
    if (errorType === ERROR_TYPES.VALIDATION_ERROR) {
      errorResponse.errors = extractValidationErrors(error);
    }
    
    // Try to extract correlation ID from response headers
    if (error.response?.headers && error.response.headers['x-correlation-id']) {
      errorResponse.correlationId = error.response.headers['x-correlation-id'];
    }
  } else if (error instanceof Error) {
    // Handle standard Error objects
    errorResponse.message = error.message;
    errorResponse.code = ERROR_TYPES.UNKNOWN_ERROR;
  }

  // Add detailed error information for debugging
  const errorDetails = createErrorDetails(error, errorResponse.code);
  debug('Error details', errorDetails);
  
  // Log the error with context
  logError(errorResponse, 'API');
  
  return errorResponse;
}