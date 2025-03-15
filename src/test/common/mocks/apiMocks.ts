import { faker } from '@faker-js/faker'; // v8.0.2
import axios, { AxiosInstance } from 'axios'; // ^1.4.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.5
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import dayjs from 'dayjs'; // v1.11.9

import { API_ENDPOINTS, MOCK_DELAYS } from '../constants';
import * as mockData from '../mockData';
import { createMockHttpClient } from '../testUtils';
import { ApiResponse, PaginatedResponse } from '../../web/src/types/api';

/**
 * Creates a standardized API response wrapper for mock data
 * @param data Any data to be wrapped in the API response
 * @param status HTTP status code for the response (default: 200)
 * @param message Optional message for the response
 * @returns A standardized API response object
 */
export function createApiResponseWrapper<T>(data: T, status: number = 200, message: string = 'Success'): ApiResponse<T> {
  const timestamp = new Date().toISOString(); // Create a timestamp for the response
  const correlationId = uuidv4(); // Generate a correlation ID for the response

  return {
    data,
    status,
    statusText: message,
    headers: {
      'content-type': 'application/json'
    },
    config: {},
    request: {},
  };
}

/**
 * Creates a standardized paginated response wrapper for mock data
 * @param content Array of items for the current page
 * @param page Current page number (0-based)
 * @param size Number of items per page
 * @param totalElements Total number of items across all pages
 * @returns A standardized paginated response object
 */
export function createPaginatedResponseWrapper<T>(content: T[], page: number, size: number, totalElements: number): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalElements / size); // Calculate totalPages based on totalElements and size
  const first = page === 0; // Determine if this is the first page (page === 0)
  const last = page === totalPages - 1; // Determine if this is the last page (page === totalPages - 1)
  const empty = content.length === 0; // Determine if the content is empty (content.length === 0)

  return {
    content,
    totalElements,
    totalPages,
    size,
    number: page,
    first,
    last,
    empty
  };
}

/**
 * Creates a mock implementation for API GET requests
 * @param endpoint API endpoint path
 * @param responseData Data to be returned in the API response
 * @param status HTTP status code for the response (default: 200)
 * @param isPaginated Whether the response should be paginated (default: false)
 * @param delay Delay in milliseconds before resolving the Promise (default: MOCK_DELAYS.API_RESPONSE)
 * @returns A Jest mock function for API GET requests
 */
export function mockApiGet(
  endpoint: string,
  responseData: any,
  status: number = 200,
  isPaginated: boolean = false,
  delay: number = MOCK_DELAYS.API_RESPONSE
): jest.Mock {
  const mockFn = jest.fn(); // Create a Jest mock function

  mockFn.mockImplementation(() => {
    // If responseData is a function, use it as a custom handler
    const response = typeof responseData === 'function'
      ? responseData()
      : isPaginated
        ? createPaginatedResponseWrapper(responseData.content, responseData.page, responseData.size, responseData.totalElements)
        : createApiResponseWrapper(responseData, status); // Otherwise, wrap the response data in the appropriate wrapper (paginated or standard)

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(response);
      }, delay); // Configure the mock to return a Promise that resolves after the specified delay
    });
  });

  return mockFn; // Return the configured mock function
}

/**
 * Creates a mock implementation for API POST requests
 * @param endpoint API endpoint path
 * @param responseData Data to be returned in the API response
 * @param status HTTP status code for the response (default: 201)
 * @param delay Delay in milliseconds before resolving the Promise (default: MOCK_DELAYS.API_RESPONSE)
 * @returns A Jest mock function for API POST requests
 */
export function mockApiPost(
  endpoint: string,
  responseData: any,
  status: number = 201,
  delay: number = MOCK_DELAYS.API_RESPONSE
): jest.Mock {
  const mockFn = jest.fn(); // Create a Jest mock function

  mockFn.mockImplementation((data) => {
    // If responseData is a function, use it as a custom handler
    const response = typeof responseData === 'function'
      ? responseData(data)
      : createApiResponseWrapper(responseData, status); // Otherwise, wrap the response data in the standard API response wrapper

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(response);
      }, delay); // Configure the mock to return a Promise that resolves after the specified delay
    });
  });

  return mockFn; // Return the configured mock function
}

/**
 * Creates a mock implementation for API PUT requests
 * @param endpoint API endpoint path
 * @param responseData Data to be returned in the API response
 * @param status HTTP status code for the response (default: 200)
 * @param delay Delay in milliseconds before resolving the Promise (default: MOCK_DELAYS.API_RESPONSE)
 * @returns A Jest mock function for API PUT requests
 */
export function mockApiPut(
  endpoint: string,
  responseData: any,
  status: number = 200,
  delay: number = MOCK_DELAYS.API_RESPONSE
): jest.Mock {
  const mockFn = jest.fn(); // Create a Jest mock function

  mockFn.mockImplementation((data) => {
    // If responseData is a function, use it as a custom handler
    const response = typeof responseData === 'function'
      ? responseData(data)
      : createApiResponseWrapper(responseData, status); // Otherwise, wrap the response data in the standard API response wrapper

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(response);
      }, delay); // Configure the mock to return a Promise that resolves after the specified delay
    });
  });

  return mockFn; // Return the configured mock function
}

/**
 * Creates a mock implementation for API DELETE requests
 * @param endpoint API endpoint path
 * @param responseData Data to be returned in the API response
 * @param status HTTP status code for the response (default: 204)
 * @param delay Delay in milliseconds before resolving the Promise (default: MOCK_DELAYS.API_RESPONSE)
 * @returns A Jest mock function for API DELETE requests
 */
export function mockApiDelete(
  endpoint: string,
  responseData: any,
  status: number = 204,
  delay: number = MOCK_DELAYS.API_RESPONSE
): jest.Mock {
  const mockFn = jest.fn(); // Create a Jest mock function

  mockFn.mockImplementation(() => {
    // If responseData is a function, use it as a custom handler
    const response = typeof responseData === 'function'
      ? responseData()
      : createApiResponseWrapper(responseData, status); // Otherwise, wrap the response data in the standard API response wrapper

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(response);
      }, delay); // Configure the mock to return a Promise that resolves after the specified delay
    });
  });

  return mockFn; // Return the configured mock function
}

/**
 * Creates a mock implementation that simulates an API error
 * @param status HTTP status code for the error
 * @param message Error message
 * @param error Error code
 * @param delay Delay in milliseconds before rejecting the Promise (default: MOCK_DELAYS.API_RESPONSE)
 * @returns A Jest mock function that throws an error
 */
export function mockApiError(
  status: number,
  message: string,
  error: string,
  delay: number = MOCK_DELAYS.API_RESPONSE
): jest.Mock {
  const mockFn = jest.fn(); // Create a Jest mock function

  mockFn.mockImplementation(() => {
    const errorResponse = {
      status,
      statusText: 'Error',
      message,
      code: error,
      errors: [],
      timestamp: new Date().toISOString(),
      path: '/mock-path',
      correlationId: uuidv4(),
      isNetworkError: false,
      isTimeout: false
    }; // Create an error response object with status, message, error, timestamp, and path

    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(errorResponse);
      }, delay); // Configure the mock to return a Promise that rejects with the error after the specified delay
    });
  });

  return mockFn; // Return the configured mock function
}

/**
 * Creates a mock API client with predefined responses for common endpoints
 * @param customResponses Optional object to override default mock responses
 * @returns Mock API client with get, post, put, delete methods
 */
export function createMockApiClient(customResponses: Record<string, any> = {}) {
  const defaultMockResponses = {
    [API_ENDPOINTS.REFERENCE_DATA.SECURITIES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, mockData.securities),
    [API_ENDPOINTS.POSITION.POSITIONS]: mockApiGet(API_ENDPOINTS.POSITION.POSITIONS, mockData.positions),
    [API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTIES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTIES, mockData.counterparties),
    [API_ENDPOINTS.LOCATE.LOCATES]: mockApiGet(API_ENDPOINTS.LOCATE.LOCATES, mockData.locates),
  }; // Create default mock responses for common endpoints

  const mergedResponses = { ...defaultMockResponses, ...customResponses }; // Merge default responses with any custom responses provided
  const mockHttpClient = createMockHttpClient(mergedResponses); // Create a mock HTTP client using createMockHttpClient

  return mockHttpClient; // Return the configured mock client
}

/**
 * Creates mock implementations for security-related API endpoints
 * @param customResponses Optional object to override default mock responses
 * @returns Object containing mock functions for security API endpoints
 */
export function mockSecurityApi(customResponses: Record<string, any> = {}) {
  const getSecurities = mockApiGet(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, {
    content: mockData.securities,
    page: 0,
    size: 10,
    totalElements: mockData.securities.length
  }, 200, true); // Create mock for getSecurities endpoint returning paginated securities

  const getSecurity = mockApiGet(API_ENDPOINTS.REFERENCE_DATA.SECURITY_BY_ID, (req) => {
    const securityId = req.url.split('/').pop();
    const security = mockData.securities.find(sec => sec.internalId === securityId);
    return security;
  }, 200, false); // Create mock for getSecurity endpoint returning a single security

  const searchSecurities = mockApiGet(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, (req) => {
    const searchTerm = req.params?.searchTerm?.toLowerCase() || '';
    const filteredSecurities = mockData.securities.filter(sec =>
      sec.issuer.toLowerCase().includes(searchTerm) || sec.description.toLowerCase().includes(searchTerm)
    );
    return {
      content: filteredSecurities,
      page: 0,
      size: 10,
      totalElements: filteredSecurities.length
    };
  }, 200, true); // Create mock for searchSecurities endpoint with filtering capability

  const securityApiMocks = {
    getSecurities,
    getSecurity,
    searchSecurities
  };

  return { ...securityApiMocks, ...customResponses }; // Merge with any custom responses provided
}

/**
 * Creates mock implementations for position-related API endpoints
 * @param customResponses Optional object to override default mock responses
 * @returns Object containing mock functions for position API endpoints
 */
export function mockPositionApi(customResponses: Record<string, any> = {}) {
  const getPositions = mockApiGet(API_ENDPOINTS.POSITION.POSITIONS, {
    content: mockData.positions,
    page: 0,
    size: 10,
    totalElements: mockData.positions.length
  }, 200, true); // Create mock for getPositions endpoint returning paginated positions

  const getPosition = mockApiGet(API_ENDPOINTS.POSITION.POSITIONS, (req) => {
    const positionId = req.url.split('/').pop();
    const position = mockData.positions.find(pos => pos.id === positionId);
    return position;
  }, 200, false); // Create mock for getPosition endpoint returning a single position

  const getPositionsByBook = mockApiGet(API_ENDPOINTS.POSITION.POSITIONS_BY_BOOK, (req) => {
    const bookId = req.url.split('/').pop();
    const filteredPositions = mockData.positions.filter(pos => pos.bookId === bookId);
    return {
      content: filteredPositions,
      page: 0,
      size: 10,
      totalElements: filteredPositions.length
    };
  }, 200, true); // Create mock for getPositionsByBook endpoint with filtering capability

  const getPositionsBySecurity = mockApiGet(API_ENDPOINTS.POSITION.POSITIONS_BY_SECURITY, (req) => {
    const securityId = req.url.split('/').pop();
    const filteredPositions = mockData.positions.filter(pos => pos.security.internalId === securityId);
    return {
      content: filteredPositions,
      page: 0,
      size: 10,
      totalElements: filteredPositions.length
    };
  }, 200, true); // Create mock for getPositionsBySecurity endpoint with filtering capability

  const positionApiMocks = {
    getPositions,
    getPosition,
    getPositionsByBook,
    getPositionsBySecurity
  };

  return { ...positionApiMocks, ...customResponses }; // Merge with any custom responses provided
}

/**
 * Creates mock implementations for inventory-related API endpoints
 * @param customResponses Optional object to override default mock responses
 * @returns Object containing mock functions for inventory API endpoints
 */
export function mockInventoryApi(customResponses: Record<string, any> = {}) {
  const getInventories = mockApiGet(API_ENDPOINTS.INVENTORY.FOR_LOAN, {
    content: mockData.inventories,
    page: 0,
    size: 10,
    totalElements: mockData.inventories.length
  }, 200, true); // Create mock for getInventories endpoint returning paginated inventories

  const getInventory = mockApiGet(API_ENDPOINTS.INVENTORY.FOR_LOAN, (req) => {
    const inventoryId = req.url.split('/').pop();
    const inventory = mockData.inventories.find(inv => inv.id === inventoryId);
    return inventory;
  }, 200, false); // Create mock for getInventory endpoint returning a single inventory

  const getInventoryBySecurity = mockApiGet(API_ENDPOINTS.INVENTORY.FOR_LOAN, (req) => {
    const securityId = req.url.split('/').pop();
    const filteredInventories = mockData.inventories.filter(inv => inv.security.internalId === securityId);
    return {
      content: filteredInventories,
      page: 0,
      size: 10,
      totalElements: filteredInventories.length
    };
  }, 200, true); // Create mock for getInventoryBySecurity endpoint with filtering capability

  const getInventoryByCalculationType = mockApiGet(API_ENDPOINTS.INVENTORY.FOR_LOAN, (req) => {
    const calculationType = req.url.split('/').pop();
    const filteredInventories = mockData.inventories.filter(inv => inv.calculationType === calculationType);
    return {
      content: filteredInventories,
      page: 0,
      size: 10,
      totalElements: filteredInventories.length
    };
  }, 200, true); // Create mock for getInventoryByCalculationType endpoint with filtering capability

  const inventoryApiMocks = {
    getInventories,
    getInventory,
    getInventoryBySecurity,
    getInventoryByCalculationType
  };

  return { ...inventoryApiMocks, ...customResponses }; // Merge with any custom responses provided
}

/**
 * Creates mock implementations for locate-related API endpoints
 * @param customResponses Optional object to override default mock responses
 * @returns Object containing mock functions for locate API endpoints
 */
export function mockLocateApi(customResponses: Record<string, any> = {}) {
  const getLocates = mockApiGet(API_ENDPOINTS.LOCATE.LOCATES, {
    content: mockData.locates,
    page: 0,
    size: 10,
    totalElements: mockData.locates.length
  }, 200, true); // Create mock for getLocates endpoint returning paginated locate requests

  const getLocate = mockApiGet(API_ENDPOINTS.LOCATE.LOCATE_BY_ID, (req) => {
    const locateId = req.url.split('/').pop();
    const locate = mockData.locates.find(loc => loc.id === parseInt(locateId, 10));
    return locate;
  }, 200, false); // Create mock for getLocate endpoint returning a single locate request

  const createLocate = mockApiPost(API_ENDPOINTS.LOCATE.LOCATES, {}, 201); // Create mock for createLocate endpoint for submitting locate requests
  const approveLocate = mockApiPut(API_ENDPOINTS.LOCATE.APPROVE_LOCATE, {}, 200); // Create mock for approveLocate endpoint for approving locate requests
  const rejectLocate = mockApiPut(API_ENDPOINTS.LOCATE.REJECT_LOCATE, {}, 200); // Create mock for rejectLocate endpoint for rejecting locate requests

  const locateApiMocks = {
    getLocates,
    getLocate,
    createLocate,
    approveLocate,
    rejectLocate
  };

  return { ...locateApiMocks, ...customResponses }; // Merge with any custom responses provided
}

/**
 * Creates mock implementations for order-related API endpoints
 * @param customResponses Optional object to override default mock responses
 * @returns Object containing mock functions for order API endpoints
 */
export function mockOrderApi(customResponses: Record<string, any> = {}) {
  const validateOrder = mockApiPost(API_ENDPOINTS.SHORT_SELL.VALIDATE_ORDER, {}, 200); // Create mock for validateOrder endpoint for validating orders against limits
  const getClientLimits = mockApiGet(API_ENDPOINTS.INVENTORY.CLIENT_LIMITS, {}, 200); // Create mock for getClientLimits endpoint for retrieving client limits
  const getAggregationUnitLimits = mockApiGet(API_ENDPOINTS.INVENTORY.AGGREGATION_UNIT_LIMITS, {}, 200); // Create mock for getAggregationUnitLimits endpoint for retrieving AU limits

  const orderApiMocks = {
    validateOrder,
    getClientLimits,
    getAggregationUnitLimits
  };

  return { ...orderApiMocks, ...customResponses }; // Merge with any custom responses provided
}

/**
 * Creates mock implementations for calculation rule-related API endpoints
 * @param customResponses Optional object to override default mock responses
 * @returns Object containing mock functions for rule API endpoints
 */
export function mockRuleApi(customResponses: Record<string, any> = {}) {
  const getRules = mockApiGet(API_ENDPOINTS.CALCULATION_RULE.RULES, {
    content: [],
    page: 0,
    size: 10,
    totalElements: 0
  }, 200, true); // Create mock for getRules endpoint returning paginated calculation rules

  const getRule = mockApiGet(API_ENDPOINTS.CALCULATION_RULE.RULE_BY_ID, {}, 200); // Create mock for getRule endpoint returning a single calculation rule
  const createRule = mockApiPost(API_ENDPOINTS.CALCULATION_RULE.RULES, {}, 201); // Create mock for createRule endpoint for creating calculation rules
  const updateRule = mockApiPut(API_ENDPOINTS.CALCULATION_RULE.RULE_BY_ID, {}, 200); // Create mock for updateRule endpoint for updating calculation rules
  const activateRule = mockApiPut(API_ENDPOINTS.CALCULATION_RULE.PUBLISH_RULE, {}, 200); // Create mock for activateRule endpoint for activating calculation rules
  const deactivateRule = mockApiDelete(API_ENDPOINTS.CALCULATION_RULE.RULE_BY_ID, {}, 204); // Create mock for deactivateRule endpoint for deactivating calculation rules

  const ruleApiMocks = {
    getRules,
    getRule,
    createRule,
    updateRule,
    activateRule,
    deactivateRule
  };

  return { ...ruleApiMocks, ...customResponses }; // Merge with any custom responses provided
}

/**
 * Creates mock implementations for authentication-related API endpoints
 * @param customResponses Optional object to override default mock responses
 * @returns Object containing mock functions for authentication API endpoints
 */
export function mockAuthApi(customResponses: Record<string, any> = {}) {
  const login = mockApiPost(API_ENDPOINTS.AUTH.LOGIN, {}, 200); // Create mock for login endpoint for user authentication
  const logout = mockApiPost(API_ENDPOINTS.AUTH.LOGOUT, {}, 200); // Create mock for logout endpoint for user logout
  const refreshToken = mockApiPost(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {}, 200); // Create mock for refreshToken endpoint for refreshing authentication tokens
  const getCurrentUser = mockApiGet(API_ENDPOINTS.AUTH.LOGIN, {}, 200); // Create mock for getCurrentUser endpoint for retrieving current user information

  const authApiMocks = {
    login,
    logout,
    refreshToken,
    getCurrentUser
  };

  return { ...authApiMocks, ...customResponses }; // Merge with any custom responses provided
}

/**
 * Sets up a mock adapter for Axios to intercept and mock HTTP requests
 * @param axiosInstance The Axios instance to mock
 * @param mockResponses An object containing mock responses for different endpoints
 * @returns Configured Axios mock adapter
 */
export function setupAxiosMock(
  axiosInstance: AxiosInstance,
  mockResponses: Record<string, any>
): AxiosMockAdapter {
  const adapter = new MockAdapter(axiosInstance, { delayResponse: MOCK_DELAYS.API_RESPONSE }); // Create a new AxiosMockAdapter instance for the provided Axios instance

  // Configure the adapter with default delay from MOCK_DELAYS.API_RESPONSE
  Object.entries(mockResponses).forEach(([endpoint, response]) => {
    if (typeof response === 'function') {
      adapter.onGet(endpoint).reply(config => response(config));
      adapter.onPost(endpoint).reply(config => response(config));
      adapter.onPut(endpoint).reply(config => response(config));
      adapter.onDelete(endpoint).reply(config => response(config));
    } else if (response.method === 'POST') {
      adapter.onPost(endpoint).reply(response.status || 200, response.data);
    } else if (response.method === 'PUT') {
      adapter.onPut(endpoint).reply(response.status || 200, response.data);
    } else if (response.method === 'DELETE') {
      adapter.onDelete(endpoint).reply(response.status || 204, response.data);
    } else {
      adapter.onGet(endpoint).reply(response.status || 200, response.data);
    }
  }); // For each endpoint in mockResponses, configure the appropriate HTTP method mock

  // Set up default handlers for any unmatched requests
  adapter.onAny().passThrough();

  return adapter; // Return the configured mock adapter
}

export const defaultMockResponses = {
  security: mockSecurityApi(),
  position: mockPositionApi(),
  inventory: mockInventoryApi(),
  locate: mockLocateApi(),
  order: mockOrderApi(),
  rule: mockRuleApi(),
  auth: mockAuthApi()
};