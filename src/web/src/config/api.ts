/**
 * API Configuration Module
 * 
 * This module provides configuration for API communication in the Inventory Management System.
 * It includes environment-specific settings, URL construction, authentication header generation,
 * and WebSocket URL management for real-time data streams.
 */

import { API_BASE_URL, API_VERSION, API_TIMEOUT, WEBSOCKET_BASE_URL } from '../constants/api';

/**
 * Default API configuration object with standard settings for all environments
 */
export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  validateStatus: function(status: number) { 
    return status >= 200 && status < 300; 
  }
};

/**
 * Returns environment-specific API configuration based on current environment
 * 
 * @returns Environment-specific configuration object with customized settings
 */
export function getEnvironmentConfig() {
  const environment = process.env.NODE_ENV || 'development';
  
  switch (environment) {
    case 'development':
      return {
        ...apiConfig,
        // Development environment has longer timeouts and more lenient error handling
        // to facilitate debugging and development workflow
        timeout: 60000, // 60 seconds for development
        validateStatus: function(status: number) {
          return status >= 200 && status < 500; // More lenient status validation for development
        }
      };
    
    case 'staging':
      return {
        ...apiConfig,
        // Staging environment mimics production but with additional retry logic
        // and slightly more verbose error responses
        retry: 3,
        retryDelay: 1000, // 1 second between retries
        timeout: 30000 // 30 seconds for staging
      };
    
    case 'production':
      return {
        ...apiConfig,
        // Production environment prioritizes performance and reliability
        // with optimized timeouts and retry strategy
        timeout: 20000, // 20 seconds for production
        retry: 2,
        retryDelay: 500 // 500ms between retries
      };
    
    default:
      return apiConfig;
  }
}

/**
 * Constructs a full API URL for a given endpoint
 * 
 * @param endpoint - The API endpoint path
 * @returns Complete API URL with base URL, version, and endpoint combined
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  return `${API_BASE_URL}/api/${API_VERSION}/${cleanEndpoint}`;
}

/**
 * Generates authentication headers for API requests
 * 
 * @returns Authentication headers object with Bearer token if available
 */
export function getAuthHeader(): Record<string, string> {
  // Try to get token from localStorage first, then sessionStorage as fallback
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }
  
  return {};
}

/**
 * Constructs a WebSocket URL for a given topic
 * 
 * @param topic - The WebSocket topic to subscribe to
 * @returns Complete WebSocket URL for real-time data streaming
 */
export function getWebSocketUrl(topic: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanTopic = topic.startsWith('/') ? topic.substring(1) : topic;
  
  return `${WEBSOCKET_BASE_URL}/${cleanTopic}`;
}