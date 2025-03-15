/**
 * API Type Definitions
 * 
 * This file contains TypeScript type definitions for API-related functionality
 * in the Inventory Management System frontend. It defines interfaces for API
 * requests, responses, and error handling to ensure type safety and consistency
 * across all API interactions.
 */

/**
 * Generic interface for successful API responses
 */
export interface ApiResponse<T> {
  /** The response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Request configuration */
  config: object;
  /** Original request object */
  request: object;
}

/**
 * Interface for standardized API error responses
 */
export interface ErrorResponse {
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** List of validation errors */
  errors: ValidationError[];
  /** Error timestamp */
  timestamp: string;
  /** Request path that generated the error */
  path: string;
  /** Correlation ID for tracking the request */
  correlationId: string;
  /** Whether this is a network error */
  isNetworkError: boolean;
  /** Whether this error was caused by a timeout */
  isTimeout: boolean;
}

/**
 * Interface for field-level validation errors
 */
export interface ValidationError {
  /** The field that failed validation */
  field: string;
  /** The validation error message */
  message: string;
  /** Error code for the validation failure */
  code: string;
  /** The value that was rejected */
  rejectedValue: any;
}

/**
 * Generic interface for paginated API responses
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  content: T[];
  /** Total number of items across all pages */
  totalElements: number;
  /** Total number of pages */
  totalPages: number;
  /** Number of items per page */
  size: number;
  /** Current page number (0-based) */
  number: number;
  /** Whether this is the first page */
  first: boolean;
  /** Whether this is the last page */
  last: boolean;
  /** Whether the result set is empty */
  empty: boolean;
}

/**
 * Interface for pagination request parameters
 */
export interface PaginationParams {
  /** Page number (0-based) */
  page: number;
  /** Number of items per page */
  size: number;
  /** Sorting criteria (format: property,asc|desc) */
  sort: string;
}

/**
 * Interface for filter request parameters
 */
export interface FilterParams {
  /** Key-value pairs of filter criteria */
  filters: Record<string, string | number | boolean | Array<string | number>>;
}

/**
 * Interface for sorting request parameters
 */
export interface SortParams {
  /** Property to sort by */
  sortBy: string;
  /** Sort direction */
  sortDirection: SortDirection;
}

/**
 * Enum for sort direction options
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Interface for date range filter parameters
 */
export interface DateRangeParams {
  /** Start date in ISO format */
  startDate: string;
  /** End date in ISO format */
  endDate: string;
}

/**
 * Enum for categorizing API error types
 */
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Interface for authentication request payload
 */
export interface AuthRequest {
  /** Username for authentication */
  username: string;
  /** Password for authentication */
  password: string;
}

/**
 * Interface for authentication response payload
 */
export interface AuthResponse {
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token */
  refreshToken: string;
  /** Type of token (e.g., "Bearer") */
  tokenType: string;
  /** Token expiration time in seconds */
  expiresIn: number;
  /** User information */
  user: UserInfo;
}

/**
 * Interface for user information in authentication response
 */
export interface UserInfo {
  /** User ID */
  id: string;
  /** Username */
  username: string;
  /** User email */
  email: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User's assigned roles */
  roles: string[];
  /** User's granted permissions */
  permissions: string[];
}

/**
 * Interface for refresh token request payload
 */
export interface RefreshTokenRequest {
  /** Refresh token */
  refreshToken: string;
}

/**
 * Interface for locate request payload
 */
export interface LocateRequestPayload {
  /** ID of the security to locate */
  securityId: string;
  /** ID of the client requesting the locate */
  clientId: string;
  /** ID of the aggregation unit */
  aggregationUnitId: string;
  /** Type of locate (e.g., "SHORT") */
  locateType: string;
  /** Requested quantity */
  requestedQuantity: number;
  /** Swap or cash indicator */
  swapCashIndicator: string;
}

/**
 * Interface for locate approval payload
 */
export interface LocateApprovalPayload {
  /** Approved quantity */
  approvedQuantity: number;
  /** Decrement quantity */
  decrementQuantity: number;
  /** Expiry date of the locate approval */
  expiryDate: string;
  /** Optional comments for the approval */
  comments: string;
}

/**
 * Interface for locate rejection payload
 */
export interface LocateRejectionPayload {
  /** Reason for rejection */
  rejectionReason: string;
  /** Optional comments for the rejection */
  comments: string;
}

/**
 * Interface for order validation payload
 */
export interface OrderValidationPayload {
  /** Order ID */
  orderId: string;
  /** ID of the security */
  securityId: string;
  /** ID of the client */
  clientId: string;
  /** ID of the aggregation unit */
  aggregationUnitId: string;
  /** Type of order (e.g., "LONG_SELL", "SHORT_SELL") */
  orderType: string;
  /** Order quantity */
  quantity: number;
}

/**
 * Interface for calculation rule condition
 */
interface RuleCondition {
  /** Condition attribute */
  attribute: string;
  /** Operator (e.g., "equals", "contains") */
  operator: string;
  /** Value to compare against */
  value: string;
  /** Logical operator to combine with other conditions */
  logicalOperator?: string;
}

/**
 * Interface for calculation rule action
 */
interface RuleAction {
  /** Action type */
  actionType: string;
  /** Action parameters */
  parameters: Record<string, string>;
}

/**
 * Interface for calculation rule payload
 */
export interface CalculationRulePayload {
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Type of rule */
  ruleType: string;
  /** Market this rule applies to */
  market: string;
  /** Rule priority */
  priority: number;
  /** Date when the rule becomes effective */
  effectiveDate: string;
  /** Date when the rule expires */
  expiryDate: string;
  /** Criteria for including items in calculation */
  inclusionCriteria: Record<string, boolean>;
  /** Criteria for excluding items from calculation */
  exclusionCriteria: Record<string, boolean>;
  /** Additional parameters for the rule */
  parameters: Record<string, string>;
  /** Rule conditions */
  conditions: RuleCondition[];
  /** Rule actions */
  actions: RuleAction[];
}

/**
 * Generic interface for WebSocket messages
 */
export interface WebSocketMessage<T> {
  /** Message type */
  type: string;
  /** Message payload */
  payload: T;
  /** Timestamp of when the message was created */
  timestamp: string;
  /** Correlation ID for tracking the message */
  correlationId: string;
}

/**
 * Interface for system health status response
 */
export interface HealthStatus {
  /** Overall system status */
  status: string;
  /** Status of individual components */
  components: Record<string, ComponentHealth>;
  /** Timestamp of the health check */
  timestamp: string;
}

/**
 * Interface for component health status
 */
export interface ComponentHealth {
  /** Component status (UP, DOWN, etc.) */
  status: string;
  /** Additional status details */
  details: Record<string, any>;
}