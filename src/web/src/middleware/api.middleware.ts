/**
 * API Middleware
 * 
 * Redux middleware for handling API-related actions in the Inventory Management System frontend.
 * This middleware intercepts API request actions, manages request lifecycle, handles authentication,
 * tracks request status, and standardizes error handling across the application.
 */

import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux'; // redux 4.2.1
import axios, { AxiosError, AxiosRequestConfig } from 'axios'; // axios 1.4.0
import { 
  get, 
  post, 
  put, 
  patch, 
  delete as deleteRequest, 
  request, 
  setAuthToken, 
  clearAuthToken 
} from '../api/client';
import { handleError, ERROR_TYPES } from '../utils/errorHandler';
import { debug, info, error } from '../utils/logger';
import { API_TIMEOUT } from '../constants/api';
import { ErrorResponse } from '../types/api';
import { RootState } from '../types/state';

/**
 * Action type constants for API-related Redux actions
 */
export const API_ACTION_TYPES = {
  API_REQUEST: 'API_REQUEST',
  API_SUCCESS: 'API_SUCCESS',
  API_FAILURE: 'API_FAILURE'
};

/**
 * Constants for API request methods
 */
export const API_METHODS = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete'
};

/**
 * Interface for API request action
 */
export interface ApiRequestAction {
  type: string;
  payload: {
    method: string;
    endpoint: string;
    data?: any;
    config?: AxiosRequestConfig;
  };
  meta?: {
    requestId?: string;
    trackProgress?: boolean;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (response: any) => void;
    onFailure?: (error: ErrorResponse) => void;
  };
}

/**
 * Interface for API success action
 */
export interface ApiSuccessAction {
  type: string;
  payload: {
    response: any;
    originalRequest: {
      method: string;
      endpoint: string;
      data?: any;
    };
  };
  meta: {
    requestId: string;
    trackProgress?: boolean;
    successMessage?: string;
  };
}

/**
 * Interface for API failure action
 */
export interface ApiFailureAction {
  type: string;
  payload: ErrorResponse;
  error: boolean;
  meta: {
    requestId: string;
    trackProgress?: boolean;
    errorMessage?: string;
    originalRequest: {
      method: string;
      endpoint: string;
      data?: any;
    };
  };
}

/**
 * Creates a Redux middleware for handling API requests
 * @returns Redux middleware function for API request handling
 */
export function createApiMiddleware(): Middleware {
  return (api: MiddlewareAPI<Dispatch, RootState>) => (next: Dispatch) => (action: AnyAction) => {
    // Pass non-API requests to the next middleware
    if (action.type !== API_ACTION_TYPES.API_REQUEST) {
      return next(action);
    }
    
    // Extract API request details
    const { method, endpoint, data, config = {} } = action.payload;
    const requestId = getRequestId(action);
    
    // Log API request
    debug(`API Request: ${method.toUpperCase()} ${endpoint}`, { 
      requestId,
      requestData: data,
      requestConfig: config 
    });
    
    // Pass action to next middleware
    next(action);
    
    // Add default timeout if not specified
    if (!config.timeout) {
      config.timeout = API_TIMEOUT;
    }
    
    // Execute the API request
    return executeApiRequest(method, endpoint, data, config)
      .then(response => {
        handleApiSuccess(api, action, response);
        
        // If onSuccess callback is provided, call it
        if (typeof action.meta?.onSuccess === 'function') {
          action.meta.onSuccess(response);
        }
        
        return response;
      })
      .catch(err => {
        const errorResponse = handleApiError(api, action, err);
        
        // If onFailure callback is provided, call it
        if (typeof action.meta?.onFailure === 'function') {
          action.meta.onFailure(errorResponse);
        }
        
        return Promise.reject(errorResponse);
      });
  };
}

/**
 * Executes an API request based on the specified method
 * @param method - HTTP method to use (GET, POST, etc.)
 * @param endpoint - API endpoint to call
 * @param data - Request data (body for POST/PUT/PATCH, params for GET)
 * @param config - Additional Axios request configuration
 * @returns Promise resolving to the API response data
 */
function executeApiRequest(
  method: string, 
  endpoint: string, 
  data?: any, 
  config?: AxiosRequestConfig
): Promise<any> {
  switch (method) {
    case API_METHODS.GET:
      return get(endpoint, data, config);
    case API_METHODS.POST:
      return post(endpoint, data, config);
    case API_METHODS.PUT:
      return put(endpoint, data, config);
    case API_METHODS.PATCH:
      return patch(endpoint, data, config);
    case API_METHODS.DELETE:
      return deleteRequest(endpoint, config);
    default:
      return request({ ...config, method, url: endpoint, data });
  }
}

/**
 * Handles successful API responses
 * @param api - Redux middleware API
 * @param action - Original request action
 * @param response - API response data
 * @returns The response data
 */
function handleApiSuccess(
  api: MiddlewareAPI<Dispatch, RootState>,
  action: AnyAction,
  response: any
): any {
  const { method, endpoint, data } = action.payload;
  const requestId = getRequestId(action);
  
  // Log successful response
  info(`API Success: ${method.toUpperCase()} ${endpoint}`, { 
    requestId,
    responseData: response 
  });
  
  // Dispatch success action
  api.dispatch({
    type: API_ACTION_TYPES.API_SUCCESS,
    payload: {
      response,
      originalRequest: { method, endpoint, data }
    },
    meta: {
      requestId,
      trackProgress: shouldTrackProgress(action),
      successMessage: action.meta?.successMessage
    }
  });
  
  return response;
}

/**
 * Handles API request errors
 * @param api - Redux middleware API
 * @param action - Original request action
 * @param err - Error object
 * @returns Standardized error response
 */
function handleApiError(
  api: MiddlewareAPI<Dispatch, RootState>, 
  action: AnyAction, 
  err: Error | unknown
): ErrorResponse {
  const { method, endpoint, data } = action.payload;
  const requestId = getRequestId(action);
  
  // Process the error using our error handler
  const errorResponse = handleError(err);
  
  // Log the error
  error(`API Error: ${method.toUpperCase()} ${endpoint}`, { 
    requestId,
    errorResponse,
    originalError: err
  });
  
  // Dispatch failure action
  api.dispatch({
    type: API_ACTION_TYPES.API_FAILURE,
    payload: errorResponse,
    error: true,
    meta: {
      requestId,
      trackProgress: shouldTrackProgress(action),
      errorMessage: action.meta?.errorMessage,
      originalRequest: { method, endpoint, data }
    }
  });
  
  // Handle authentication errors
  if (errorResponse.status === 401) {
    handleAuthError(api, errorResponse);
  }
  
  return errorResponse;
}

/**
 * Handles authentication-related errors
 * @param api - Redux middleware API
 * @param errorResponse - Error response object
 */
function handleAuthError(
  api: MiddlewareAPI<Dispatch, RootState>,
  errorResponse: ErrorResponse
): void {
  // Clear auth token
  clearAuthToken();
  
  // Dispatch logout action
  api.dispatch({ type: 'AUTH_LOGOUT' });
  
  // Log authentication error
  error('Authentication failed. Token has been cleared.', errorResponse);
}

/**
 * Determines if request progress should be tracked
 * @param action - API request action
 * @returns True if progress should be tracked
 */
function shouldTrackProgress(action: AnyAction): boolean {
  // If trackProgress is explicitly set, use that value
  if (action.meta && action.meta.trackProgress !== undefined) {
    return action.meta.trackProgress;
  }
  
  // Default to true
  return true;
}

/**
 * Generates or retrieves a request ID for tracking
 * @param action - API request action
 * @returns Request ID for tracking
 */
function getRequestId(action: AnyAction): string {
  // Use existing request ID if provided
  if (action.meta?.requestId) {
    return action.meta.requestId;
  }
  
  // Generate a UUID v4-like identifier
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Create an instance of the API middleware
export const apiMiddleware = createApiMiddleware();