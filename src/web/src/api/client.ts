/**
 * Core API Client Module
 * 
 * This module provides a centralized HTTP client implementation for the Inventory Management System
 * frontend, handling request/response standardization, authentication, error processing, and logging.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; // axios 1.4.0
import { ApiResponse, ErrorResponse } from '../types/api';
import { apiConfig, getApiUrl, getAuthHeader } from '../config/api';
import { handleError } from '../utils/errorHandler';
import { debug, info, error } from '../utils/logger';
import { getItem, setItem, removeItem } from '../utils/localStorage';

// Token storage key for authentication
const TOKEN_STORAGE_KEY = 'auth_token';

// Create axios instance with default configuration
const axiosInstance: AxiosInstance = axios.create(apiConfig);

/**
 * Request interceptor to add authentication headers and logging
 * 
 * @param config - The request configuration
 * @returns Modified request configuration
 */
const requestInterceptor = (config: AxiosRequestConfig): AxiosRequestConfig => {
  // Add authentication headers if not already present
  if (!config.headers?.Authorization) {
    const authHeaders = getAuthHeader();
    if (authHeaders.Authorization) {
      config.headers = {
        ...config.headers,
        ...authHeaders
      };
    }
  }

  // Add correlation ID for request tracing
  const correlationId = getCorrelationId();
  if (correlationId) {
    config.headers = {
      ...config.headers,
      'X-Correlation-ID': correlationId
    };
  }

  // Log the outgoing request
  debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
    headers: config.headers,
    params: config.params,
    data: config.data
  });

  return config;
};

/**
 * Response interceptor for successful responses
 * 
 * @param response - The API response
 * @returns The original response
 */
const responseInterceptor = (response: AxiosResponse): AxiosResponse => {
  // Log successful response
  debug(`API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
    data: response.data
  });

  return response;
};

/**
 * Error interceptor for handling failed requests
 * 
 * @param err - The error object
 * @returns Rejected promise with standardized error
 */
const errorInterceptor = (err: Error): Promise<never> => {
  // Process the error using our error handler utility
  const processedError = handleError(err);
  
  // Log the error with appropriate severity
  if (processedError.status >= 500) {
    error(`API Error: ${processedError.status} ${processedError.statusText}`, processedError);
  } else {
    info(`API Error: ${processedError.status} ${processedError.statusText}`, processedError);
  }
  
  // Return a rejected promise with the standardized error
  return Promise.reject(processedError);
};

// Add request and response interceptors
const requestInterceptorId = axiosInstance.interceptors.request.use(requestInterceptor);
const responseInterceptorId = axiosInstance.interceptors.response.use(responseInterceptor, errorInterceptor);

/**
 * Retrieves the authentication token from storage
 * 
 * @returns The stored authentication token or null if not found
 */
const getToken = (): string | null => {
  return getItem(TOKEN_STORAGE_KEY) as string | null;
};

/**
 * Sets the authentication token for all subsequent requests
 * 
 * @param token - The authentication token to set
 */
const setAuthToken = (token: string): void => {
  setItem(TOKEN_STORAGE_KEY, token);
  axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  debug('Auth token set for API requests');
};

/**
 * Removes the authentication token from request headers
 */
const clearAuthToken = (): void => {
  removeItem(TOKEN_STORAGE_KEY);
  delete axiosInstance.defaults.headers.common['Authorization'];
  debug('Auth token cleared from API requests');
};

/**
 * Generates or retrieves a correlation ID for request tracing
 * 
 * @returns Correlation ID for request tracing
 */
const getCorrelationId = (): string => {
  // Use existing correlation ID if available in the current context
  const existingId = (window as any).__correlationId;
  if (existingId) {
    return existingId;
  }
  
  // Generate a simple UUID v4-like identifier
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  
  // Store for future reference
  (window as any).__correlationId = uuid;
  
  return uuid;
};

/**
 * Performs a GET request to the specified endpoint
 * 
 * @param endpoint - API endpoint to call
 * @param params - URL parameters for the request
 * @param config - Additional axios request configuration
 * @returns Promise resolving to the response data
 */
async function get<T = any>(
  endpoint: string,
  params?: object,
  config?: AxiosRequestConfig
): Promise<T> {
  const url = getApiUrl(endpoint);
  const response = await axiosInstance.get<T>(url, {
    ...config,
    params
  });
  return response.data;
}

/**
 * Performs a POST request to the specified endpoint
 * 
 * @param endpoint - API endpoint to call
 * @param data - Request payload
 * @param config - Additional axios request configuration
 * @returns Promise resolving to the response data
 */
async function post<T = any>(
  endpoint: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const url = getApiUrl(endpoint);
  const response = await axiosInstance.post<T>(url, data, config);
  return response.data;
}

/**
 * Performs a PUT request to the specified endpoint
 * 
 * @param endpoint - API endpoint to call
 * @param data - Request payload
 * @param config - Additional axios request configuration
 * @returns Promise resolving to the response data
 */
async function put<T = any>(
  endpoint: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const url = getApiUrl(endpoint);
  const response = await axiosInstance.put<T>(url, data, config);
  return response.data;
}

/**
 * Performs a PATCH request to the specified endpoint
 * 
 * @param endpoint - API endpoint to call
 * @param data - Request payload
 * @param config - Additional axios request configuration
 * @returns Promise resolving to the response data
 */
async function patch<T = any>(
  endpoint: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const url = getApiUrl(endpoint);
  const response = await axiosInstance.patch<T>(url, data, config);
  return response.data;
}

/**
 * Performs a DELETE request to the specified endpoint
 * 
 * @param endpoint - API endpoint to call
 * @param config - Additional axios request configuration
 * @returns Promise resolving to the response data
 */
async function deleteRequest<T = any>(
  endpoint: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const url = getApiUrl(endpoint);
  const response = await axiosInstance.delete<T>(url, config);
  return response.data;
}

/**
 * Performs a custom request with the specified configuration
 * 
 * @param config - Custom axios request configuration
 * @returns Promise resolving to the response data
 */
async function request<T = any>(config: AxiosRequestConfig): Promise<T> {
  // If URL is provided, ensure it's a full URL
  if (config.url && !config.url.startsWith('http')) {
    config.url = getApiUrl(config.url);
  }
  
  const response = await axiosInstance.request<T>(config);
  return response.data;
}

// Export all API client functions
export {
  axiosInstance,
  setAuthToken,
  clearAuthToken,
  getToken,
  get,
  post,
  put,
  patch,
  deleteRequest as delete, // Export as 'delete' for API naming consistency
  request
};