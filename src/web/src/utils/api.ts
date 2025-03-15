/**
 * Utility module providing enhanced API functionality for the Inventory Management System frontend.
 * This file extends the core API client with additional utility functions for common API operations,
 * request formatting, response handling, and specialized API interactions.
 */

import { AxiosRequestConfig } from 'axios'; // axios ^1.4.0
import {
  ApiResponse,
  ErrorResponse,
  PaginatedResponse,
  PaginationParams,
  FilterParams,
  SortParams
} from '../types/api';
import {
  get,
  post,
  put,
  patch,
  delete as httpDelete
} from '../api/client';
import { handleError } from './errorHandler';
import { debug, info, error } from './logger';
import {
  AUTH_ENDPOINTS,
  REFERENCE_ENDPOINTS,
  POSITION_ENDPOINTS,
  INVENTORY_ENDPOINTS,
  LOCATE_ENDPOINTS,
  ORDER_ENDPOINTS,
  RULE_ENDPOINTS
} from '../constants/api';

// Cache for API responses to reduce redundant requests
const API_CACHE = new Map<string, { data: any; timestamp: number }>();

// Default cache time-to-live: 1 minute
const CACHE_TTL = 60000;

// Delay for batched requests
const REQUEST_BATCH_DELAY = 50;

/**
 * Fetches paginated data from an API endpoint with support for filtering and sorting
 * 
 * @template T - Type of the items in the paginated response
 * @param endpoint - API endpoint to fetch data from
 * @param paginationParams - Pagination parameters (page, size, sort)
 * @param filterParams - Filter parameters
 * @param sortParams - Sort parameters
 * @param config - Additional Axios request configuration
 * @returns Promise resolving to paginated response
 */
export async function fetchWithPagination<T>(
  endpoint: string,
  paginationParams: PaginationParams,
  filterParams?: FilterParams,
  sortParams?: SortParams,
  config?: AxiosRequestConfig
): Promise<PaginatedResponse<T>> {
  try {
    // Combine pagination, filter, and sort parameters
    const params = {
      ...paginationParams,
      ...(filterParams?.filters || {}),
      ...(sortParams ? { sortBy: sortParams.sortBy, sortDirection: sortParams.sortDirection } : {})
    };

    debug('Fetching paginated data', { endpoint, params });
    const response = await get<PaginatedResponse<T>>(endpoint, params, config);
    return response;
  } catch (err) {
    // Handle error and re-throw
    error('Error fetching paginated data', { endpoint, error: err });
    throw handleError(err);
  }
}

/**
 * Fetches data from an API endpoint with caching support
 * 
 * @template T - Type of the response data
 * @param endpoint - API endpoint to fetch data from
 * @param params - Request parameters
 * @param cacheTtl - Cache time-to-live in milliseconds (default: 60000)
 * @param config - Additional Axios request configuration
 * @returns Promise resolving to the response data
 */
export async function fetchWithCache<T>(
  endpoint: string,
  params?: object,
  cacheTtl: number = CACHE_TTL,
  config?: AxiosRequestConfig
): Promise<T> {
  // Generate cache key from endpoint and params
  const cacheKey = `${endpoint}${params ? JSON.stringify(params) : ''}`;
  
  // Check cache
  const now = Date.now();
  const cachedResponse = API_CACHE.get(cacheKey);
  
  // If cache hit and not expired, return cached data
  if (cachedResponse && (now - cachedResponse.timestamp < cacheTtl)) {
    debug('Cache hit', { endpoint, params });
    return cachedResponse.data as T;
  }
  
  // Cache miss or expired, fetch fresh data
  debug('Cache miss or expired', { endpoint, params });
  try {
    const response = await get<T>(endpoint, params, config);
    
    // Store in cache
    API_CACHE.set(cacheKey, {
      data: response,
      timestamp: now
    });
    
    return response;
  } catch (err) {
    error('Error fetching data with cache', { endpoint, params, error: err });
    throw handleError(err);
  }
}

/**
 * Invalidates cached data for a specific endpoint or all endpoints
 * 
 * @param endpoint - Optional endpoint to invalidate (if omitted, invalidates all cached data)
 */
export function invalidateCache(endpoint?: string): void {
  if (endpoint) {
    // Invalidate specific endpoint - delete any cache keys that start with the endpoint
    debug('Invalidating cache for endpoint', { endpoint });
    
    for (const key of API_CACHE.keys()) {
      if (key.startsWith(endpoint)) {
        API_CACHE.delete(key);
      }
    }
  } else {
    // Invalidate all cache
    debug('Invalidating entire cache');
    API_CACHE.clear();
  }
}

/**
 * Batches multiple API requests and executes them concurrently
 * 
 * @param requestFunctions - Array of request functions to execute
 * @returns Promise resolving to an array of all response data
 */
export async function batchRequests<T>(
  requestFunctions: Array<() => Promise<any>>
): Promise<Array<T>> {
  debug('Batching requests', { count: requestFunctions.length });
  
  try {
    // Execute all requests concurrently
    const promises = requestFunctions.map(requestFn => requestFn());
    const results = await Promise.all(promises);
    
    return results;
  } catch (err) {
    error('Error in batch requests', { error: err });
    throw handleError(err);
  }
}

/**
 * Creates a debounced version of an API request function
 * 
 * @param requestFn - The request function to debounce
 * @param delay - Debounce delay in milliseconds (default: 300)
 * @returns Debounced function that returns a promise
 */
export function debouncedRequest<T>(
  requestFn: (...args: any[]) => Promise<T>,
  delay: number = 300
): (...args: any[]) => Promise<T> {
  let timeout: NodeJS.Timeout | null = null;
  let resolver: ((value: T) => void) | null = null;
  
  return (...args: any[]): Promise<T> => {
    // Clear previous timeout if it exists
    if (timeout) {
      clearTimeout(timeout);
    }
    
    // Create a new promise
    return new Promise<T>((resolve) => {
      // Store the resolver function
      resolver = resolve;
      
      // Set a timeout to execute the request
      timeout = setTimeout(async () => {
        try {
          const result = await requestFn(...args);
          if (resolver) {
            resolver(result);
          }
        } catch (err) {
          throw handleError(err);
        }
      }, delay);
    });
  };
}

/**
 * Executes an API request with automatic retry on failure
 * 
 * @template T - Type of the response data
 * @param requestFn - Function that returns a promise for the API request
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param retryDelay - Delay between retries in milliseconds (default: 1000)
 * @param shouldRetry - Function to determine if retry should be attempted based on the error (default: retry all errors)
 * @returns Promise resolving to the response data
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000,
  shouldRetry: (error: any) => boolean = () => true
): Promise<T> {
  let attempts = 0;
  
  const execute = async (): Promise<T> => {
    try {
      return await requestFn();
    } catch (err) {
      attempts++;
      
      // If max retries reached or should not retry, rethrow the error
      if (attempts >= maxRetries || !shouldRetry(err)) {
        error('Max retries reached or retry not applicable', { attempts, maxRetries, error: err });
        throw err;
      }
      
      // Log retry attempt
      info(`Retrying request (attempt ${attempts} of ${maxRetries})`, { retryDelay });
      
      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Retry
      return execute();
    }
  };
  
  return execute();
}

/**
 * Formats an object into URL query parameters
 * 
 * @param params - Object containing parameter key-value pairs
 * @returns Formatted query string starting with '?'
 */
export function formatQueryParams(params: object): string {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }
  
  const queryParams = Object.entries(params)
    // Filter out null and undefined values
    .filter(([_, value]) => value != null)
    // Format each parameter
    .map(([key, value]) => {
      // Handle arrays by joining with commas
      const formattedValue = Array.isArray(value) ? value.join(',') : value;
      return `${encodeURIComponent(key)}=${encodeURIComponent(formattedValue)}`;
    })
    .join('&');
  
  return queryParams ? `?${queryParams}` : '';
}

/**
 * Parses URL query parameters into an object
 * 
 * @param queryString - URL query string (with or without leading '?')
 * @returns Parsed parameters object
 */
export function parseQueryParams(queryString: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  
  // Remove leading ? if present
  const sanitizedQuery = queryString.startsWith('?') ? queryString.substring(1) : queryString;
  
  if (!sanitizedQuery) {
    return result;
  }
  
  // Split by & and process each parameter
  sanitizedQuery.split('&').forEach(param => {
    const [key, value] = param.split('=').map(decodeURIComponent);
    
    // Handle array parameters (ends with [])
    if (key.endsWith('[]')) {
      const arrayKey = key.slice(0, -2);
      if (!result[arrayKey]) {
        result[arrayKey] = [];
      }
      (result[arrayKey] as string[]).push(value);
    } else {
      result[key] = value;
    }
  });
  
  return result;
}

/**
 * Interface for authentication response
 */
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    email: string;
    roles: string[];
  };
}

/**
 * Authenticates a user and stores the authentication token
 * 
 * @param username - User's username or email
 * @param password - User's password
 * @returns Promise resolving to authentication response
 */
export async function login(username: string, password: string): Promise<AuthResponse> {
  try {
    debug('Attempting login', { username });
    
    const response = await post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, { username, password });
    
    // Store token in localStorage for future requests
    localStorage.setItem('authToken', response.accessToken);
    
    info('Login successful', { username });
    return response;
  } catch (err) {
    error('Login failed', { username, error: err });
    throw handleError(err);
  }
}

/**
 * Logs out the current user and clears authentication data
 * 
 * @returns Promise resolving when logout is complete
 */
export async function logout(): Promise<void> {
  try {
    debug('Attempting logout');
    
    await post(AUTH_ENDPOINTS.LOGOUT);
    
    // Clear token and user data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Invalidate cache on logout
    invalidateCache();
    
    info('Logout successful');
  } catch (err) {
    // Even if the server request fails, clear local auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    error('Logout error', { error: err });
    throw handleError(err);
  }
}

/**
 * Interface for security data
 */
interface Security {
  id: string;
  internalId: string;
  securityType: string;
  issuer: string;
  issueDate?: string;
  maturityDate?: string;
  currency: string;
  status: string;
  market: string;
  identifiers: Array<{ type: string; value: string }>;
}

/**
 * Fetches securities data with optional filtering
 * 
 * @param filters - Filter criteria
 * @param pagination - Pagination parameters
 * @returns Promise resolving to paginated securities data
 */
export async function fetchSecurities(
  filters?: object,
  pagination: PaginationParams = { page: 0, size: 20, sort: 'internalId,asc' }
): Promise<PaginatedResponse<Security>> {
  try {
    return await fetchWithPagination<Security>(
      REFERENCE_ENDPOINTS.SECURITIES,
      pagination,
      filters ? { filters } : undefined
    );
  } catch (err) {
    error('Error fetching securities', { filters, pagination, error: err });
    throw handleError(err);
  }
}

/**
 * Interface for position data
 */
interface Position {
  id: string;
  bookId: string;
  securityId: string;
  businessDate: string;
  contractualQty: number;
  settledQty: number;
  sd0Deliver: number;
  sd0Receipt: number;
  sd1Deliver: number;
  sd1Receipt: number;
  sd2Deliver: number;
  sd2Receipt: number;
  sd3Deliver: number;
  sd3Receipt: number;
  sd4Deliver: number;
  sd4Receipt: number;
}

/**
 * Fetches position data with optional filtering
 * 
 * @param filters - Filter criteria
 * @param pagination - Pagination parameters
 * @returns Promise resolving to paginated position data
 */
export async function fetchPositions(
  filters?: object,
  pagination: PaginationParams = { page: 0, size: 20, sort: 'businessDate,desc' }
): Promise<PaginatedResponse<Position>> {
  try {
    return await fetchWithPagination<Position>(
      POSITION_ENDPOINTS.POSITIONS,
      pagination,
      filters ? { filters } : undefined
    );
  } catch (err) {
    error('Error fetching positions', { filters, pagination, error: err });
    throw handleError(err);
  }
}

/**
 * Interface for inventory data
 */
interface Inventory {
  securityId: string;
  calculationType: string;
  businessDate: string;
  quantity: number;
  category: string;
  marketValue: number;
  currency: string;
  lastUpdated: string;
}

/**
 * Fetches inventory data with optional filtering
 * 
 * @param filters - Filter criteria
 * @param pagination - Pagination parameters
 * @returns Promise resolving to paginated inventory data
 */
export async function fetchInventory(
  filters?: object,
  pagination: PaginationParams = { page: 0, size: 20, sort: 'lastUpdated,desc' }
): Promise<PaginatedResponse<Inventory>> {
  try {
    return await fetchWithPagination<Inventory>(
      INVENTORY_ENDPOINTS.INVENTORY,
      pagination,
      filters ? { filters } : undefined
    );
  } catch (err) {
    error('Error fetching inventory', { filters, pagination, error: err });
    throw handleError(err);
  }
}

/**
 * Interface for locate request data
 */
interface LocateRequest {
  id: string;
  requestorId: string;
  clientId: string;
  securityId: string;
  locateType: string;
  requestedQuantity: number;
  status: string;
  swapCashIndicator: string;
  requestTimestamp: string;
}

/**
 * Fetches locate request data with optional filtering
 * 
 * @param filters - Filter criteria
 * @param pagination - Pagination parameters
 * @returns Promise resolving to paginated locate request data
 */
export async function fetchLocates(
  filters?: object,
  pagination: PaginationParams = { page: 0, size: 20, sort: 'requestTimestamp,desc' }
): Promise<PaginatedResponse<LocateRequest>> {
  try {
    return await fetchWithPagination<LocateRequest>(
      LOCATE_ENDPOINTS.LOCATES,
      pagination,
      filters ? { filters } : undefined
    );
  } catch (err) {
    error('Error fetching locates', { filters, pagination, error: err });
    throw handleError(err);
  }
}

/**
 * Interface for locate request payload
 */
interface LocateRequestPayload {
  securityId: string;
  clientId: string;
  aggregationUnitId: string;
  locateType: string;
  requestedQuantity: number;
  swapCashIndicator: string;
}

/**
 * Submits a new locate request
 * 
 * @param locateRequest - Locate request data
 * @returns Promise resolving to the created locate request
 */
export async function submitLocateRequest(
  locateRequest: LocateRequestPayload
): Promise<LocateRequest> {
  try {
    debug('Submitting locate request', { locateRequest });
    
    const response = await post<LocateRequest>(
      LOCATE_ENDPOINTS.LOCATES,
      locateRequest
    );
    
    info('Locate request submitted successfully', { locateId: response.id });
    return response;
  } catch (err) {
    error('Error submitting locate request', { locateRequest, error: err });
    throw handleError(err);
  }
}

/**
 * Interface for locate approval payload
 */
interface LocateApprovalPayload {
  approvedQuantity: number;
  decrementQuantity: number;
  expiryDate: string;
  comments?: string;
}

/**
 * Interface for locate approval response
 */
interface LocateApproval {
  id: string;
  locateId: string;
  approvedQuantity: number;
  decrementQuantity: number;
  approvalTimestamp: string;
  approvedBy: string;
  expiryDate: string;
  comments?: string;
}

/**
 * Approves a locate request
 * 
 * @param locateId - ID of the locate request to approve
 * @param approvalData - Approval data
 * @returns Promise resolving to the locate approval data
 */
export async function approveLocate(
  locateId: string,
  approvalData: LocateApprovalPayload
): Promise<LocateApproval> {
  try {
    debug('Approving locate request', { locateId, approvalData });
    
    const endpoint = LOCATE_ENDPOINTS.LOCATE_APPROVE(locateId);
    const response = await post<LocateApproval>(endpoint, approvalData);
    
    // Invalidate relevant caches
    invalidateCache(LOCATE_ENDPOINTS.LOCATES);
    invalidateCache(INVENTORY_ENDPOINTS.INVENTORY);
    
    info('Locate request approved successfully', { locateId, approvalId: response.id });
    return response;
  } catch (err) {
    error('Error approving locate request', { locateId, approvalData, error: err });
    throw handleError(err);
  }
}

/**
 * Interface for locate rejection payload
 */
interface LocateRejectionPayload {
  rejectionReason: string;
  comments?: string;
}

/**
 * Interface for locate rejection response
 */
interface LocateRejection {
  id: string;
  locateId: string;
  rejectionReason: string;
  rejectionTimestamp: string;
  rejectedBy: string;
  comments?: string;
}

/**
 * Rejects a locate request
 * 
 * @param locateId - ID of the locate request to reject
 * @param rejectionData - Rejection data
 * @returns Promise resolving to the locate rejection data
 */
export async function rejectLocate(
  locateId: string,
  rejectionData: LocateRejectionPayload
): Promise<LocateRejection> {
  try {
    debug('Rejecting locate request', { locateId, rejectionData });
    
    const endpoint = LOCATE_ENDPOINTS.LOCATE_REJECT(locateId);
    const response = await post<LocateRejection>(endpoint, rejectionData);
    
    // Invalidate locate cache
    invalidateCache(LOCATE_ENDPOINTS.LOCATES);
    
    info('Locate request rejected successfully', { locateId, rejectionId: response.id });
    return response;
  } catch (err) {
    error('Error rejecting locate request', { locateId, rejectionData, error: err });
    throw handleError(err);
  }
}

/**
 * Interface for order validation payload
 */
interface OrderValidationPayload {
  orderId: string;
  securityId: string;
  clientId: string;
  aggregationUnitId: string;
  orderType: string;
  quantity: number;
}

/**
 * Interface for order validation response
 */
interface OrderValidation {
  validationId: string;
  orderId: string;
  orderType: string;
  securityId: string;
  clientId: string;
  aggregationUnitId: string;
  quantity: number;
  validationTimestamp: string;
  status: string;
  rejectionReason?: string;
}

/**
 * Validates an order against trading limits
 * 
 * @param orderData - Order data to validate
 * @returns Promise resolving to the order validation result
 */
export async function validateOrder(
  orderData: OrderValidationPayload
): Promise<OrderValidation> {
  try {
    debug('Validating order', { orderData });
    
    const response = await post<OrderValidation>(
      ORDER_ENDPOINTS.ORDER_VALIDATE,
      orderData
    );
    
    info('Order validation completed', { 
      orderId: orderData.orderId, 
      status: response.status 
    });
    
    return response;
  } catch (err) {
    error('Error validating order', { orderData, error: err });
    throw handleError(err);
  }
}

/**
 * Interface for calculation rule
 */
interface CalculationRule {
  id: string;
  name: string;
  description: string;
  ruleType: string;
  market: string;
  priority: number;
  effectiveDate: string;
  expiryDate: string;
  status: string;
  version: string;
  inclusionCriteria: Record<string, boolean>;
  exclusionCriteria: Record<string, boolean>;
  parameters: Record<string, string>;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

/**
 * Fetches calculation rules with optional filtering
 * 
 * @param filters - Filter criteria
 * @param pagination - Pagination parameters
 * @returns Promise resolving to paginated calculation rule data
 */
export async function fetchCalculationRules(
  filters?: object,
  pagination: PaginationParams = { page: 0, size: 20, sort: 'priority,asc' }
): Promise<PaginatedResponse<CalculationRule>> {
  try {
    return await fetchWithPagination<CalculationRule>(
      RULE_ENDPOINTS.RULES,
      pagination,
      filters ? { filters } : undefined
    );
  } catch (err) {
    error('Error fetching calculation rules', { filters, pagination, error: err });
    throw handleError(err);
  }
}

/**
 * Interface for calculation rule payload
 */
interface CalculationRulePayload {
  name: string;
  description: string;
  ruleType: string;
  market: string;
  priority: number;
  effectiveDate: string;
  expiryDate: string;
  inclusionCriteria: Record<string, boolean>;
  exclusionCriteria: Record<string, boolean>;
  parameters: Record<string, string>;
}

/**
 * Creates or updates a calculation rule
 * 
 * @param ruleData - Calculation rule data
 * @param ruleId - Optional rule ID for updates (if not provided, creates a new rule)
 * @returns Promise resolving to the saved calculation rule
 */
export async function saveCalculationRule(
  ruleData: CalculationRulePayload,
  ruleId?: string
): Promise<CalculationRule> {
  try {
    debug('Saving calculation rule', { ruleId, ruleData });
    
    let response: CalculationRule;
    
    if (ruleId) {
      // Update existing rule
      const endpoint = RULE_ENDPOINTS.RULE_BY_ID(ruleId);
      response = await put<CalculationRule>(endpoint, ruleData);
      info('Calculation rule updated', { ruleId: response.id });
    } else {
      // Create new rule
      response = await post<CalculationRule>(RULE_ENDPOINTS.RULES, ruleData);
      info('Calculation rule created', { ruleId: response.id });
    }
    
    // Invalidate rules cache
    invalidateCache(RULE_ENDPOINTS.RULES);
    
    return response;
  } catch (err) {
    error('Error saving calculation rule', { ruleId, ruleData, error: err });
    throw handleError(err);
  }
}

/**
 * Publishes a calculation rule to make it active
 * 
 * @param ruleId - ID of the rule to publish
 * @returns Promise resolving to the published calculation rule
 */
export async function publishCalculationRule(
  ruleId: string
): Promise<CalculationRule> {
  try {
    debug('Publishing calculation rule', { ruleId });
    
    const endpoint = RULE_ENDPOINTS.RULE_PUBLISH(ruleId);
    const response = await post<CalculationRule>(endpoint);
    
    // Invalidate rules cache
    invalidateCache(RULE_ENDPOINTS.RULES);
    
    info('Calculation rule published', { ruleId });
    return response;
  } catch (err) {
    error('Error publishing calculation rule', { ruleId, error: err });
    throw handleError(err);
  }
}

/**
 * Tests a calculation rule with sample data
 * 
 * @param ruleData - Calculation rule data
 * @param testData - Test data for rule evaluation
 * @returns Promise resolving to the test results
 */
export async function testCalculationRule(
  ruleData: CalculationRulePayload,
  testData?: object
): Promise<object> {
  try {
    debug('Testing calculation rule', { ruleData, testData });
    
    const response = await post<object>(
      RULE_ENDPOINTS.RULE_TEST,
      {
        rule: ruleData,
        testData: testData || {}
      }
    );
    
    return response;
  } catch (err) {
    error('Error testing calculation rule', { ruleData, testData, error: err });
    throw handleError(err);
  }
}