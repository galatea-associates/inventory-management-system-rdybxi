/**
 * API client module for order-related operations in the Inventory Management System frontend.
 * Provides functions for retrieving, filtering, and validating orders, with a particular
 * focus on short sell order validation which must meet strict performance requirements (under 150ms).
 */

import { get, post, put } from './client'; // axios 1.4.0
import { ORDER_ENDPOINTS } from '../constants/api';
import { Order, OrderValidation, ClientLimit, AggregationUnitLimit } from '../types/models';
import { 
  ApiResponse, 
  PaginatedResponse, 
  FilterParams, 
  PaginationParams, 
  OrderValidationPayload 
} from '../types/api';
import { fetchWithCache, invalidateCache } from '../utils/api';

/**
 * Retrieves a paginated list of orders with optional filtering
 * 
 * @param params - Pagination and sorting parameters
 * @returns Promise resolving to paginated order data
 */
export async function getOrders(
  params?: { page?: number; size?: number; sort?: string[] }
): Promise<ApiResponse<PaginatedResponse<Order>>> {
  return get<ApiResponse<PaginatedResponse<Order>>>(ORDER_ENDPOINTS.ORDERS, params);
}

/**
 * Retrieves a specific order by its ID
 * 
 * @param orderId - The ID of the order to retrieve
 * @returns Promise resolving to the order data
 */
export async function getOrderById(
  orderId: string
): Promise<ApiResponse<Order>> {
  return get<ApiResponse<Order>>(ORDER_ENDPOINTS.ORDER_BY_ID(orderId));
}

/**
 * Filters orders based on various criteria
 * 
 * @param filterParams - Filter parameters for the query
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to filtered order data
 */
export async function filterOrders(
  filterParams: FilterParams,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<Order>>> {
  const params = {
    ...filterParams,
    ...paginationParams
  };
  return post<ApiResponse<PaginatedResponse<Order>>>(`${ORDER_ENDPOINTS.ORDERS}/filter`, params);
}

/**
 * Retrieves orders for a specific security
 * 
 * @param securityId - The ID of the security
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to security-filtered order data
 */
export async function getOrdersBySecurityId(
  securityId: string,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<Order>>> {
  const filterParams: FilterParams = {
    filters: {
      securityId
    }
  };
  return filterOrders(filterParams, paginationParams);
}

/**
 * Retrieves orders for a specific counterparty
 * 
 * @param counterpartyId - The ID of the counterparty
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to counterparty-filtered order data
 */
export async function getOrdersByCounterpartyId(
  counterpartyId: string,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<Order>>> {
  const filterParams: FilterParams = {
    filters: {
      counterpartyId
    }
  };
  return filterOrders(filterParams, paginationParams);
}

/**
 * Retrieves orders within a specific date range
 * 
 * @param startDate - Start date for filtering (ISO format)
 * @param endDate - End date for filtering (ISO format)
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to date-filtered order data
 */
export async function getOrdersByDateRange(
  startDate: string,
  endDate: string,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<Order>>> {
  const filterParams: FilterParams = {
    filters: {
      startDate,
      endDate
    }
  };
  return filterOrders(filterParams, paginationParams);
}

/**
 * Validates an order against client and aggregation unit limits
 * This function is optimized to support the 150ms SLA requirement for short sell validation
 * 
 * @param validationData - Data required for order validation
 * @returns Promise resolving to the order validation result
 */
export async function validateOrder(
  validationData: OrderValidationPayload
): Promise<ApiResponse<OrderValidation>> {
  return post<ApiResponse<OrderValidation>>(ORDER_ENDPOINTS.ORDER_VALIDATE, validationData);
}

/**
 * Validates an existing order by its ID
 * 
 * @param orderId - The ID of the order to validate
 * @param params - Parameters for validation
 * @returns Promise resolving to the order validation result
 */
export async function validateOrderById(
  orderId: string,
  params: {
    securityId: string;
    clientId: string;
    aggregationUnitId: string;
    orderType: string;
    quantity: number;
  }
): Promise<ApiResponse<OrderValidation>> {
  const endpoint = `${ORDER_ENDPOINTS.ORDER_VALIDATE}/${orderId}`;
  return post<ApiResponse<OrderValidation>>(endpoint, params);
}

/**
 * Retrieves the validation status for a specific order
 * 
 * @param orderId - The ID of the order to check
 * @returns Promise resolving to order validation status
 */
export async function getOrderValidationStatus(
  orderId: string
): Promise<ApiResponse<{
  orderId: string;
  status: string;
  approved: boolean;
  rejected: boolean;
  rejectionReason?: string;
  processingTime?: number;
}>> {
  return get<ApiResponse<any>>(`${ORDER_ENDPOINTS.ORDER_VALIDATE}/status/${orderId}`);
}

/**
 * Retrieves trading limits for a specific client
 * Uses caching to optimize performance for repeated requests
 * 
 * @param clientId - The ID of the client
 * @param businessDate - The business date for the limits
 * @param securityId - The ID of the security
 * @returns Promise resolving to client limit data
 */
export async function getClientLimits(
  clientId: string,
  businessDate: string,
  securityId: string
): Promise<ApiResponse<ClientLimit>> {
  const params = { businessDate, securityId };
  return fetchWithCache<ApiResponse<ClientLimit>>(`${ORDER_ENDPOINTS.CLIENT_LIMITS}/${clientId}`, params);
}

/**
 * Retrieves trading limits for a specific aggregation unit
 * Uses caching to optimize performance for repeated requests
 * 
 * @param aggregationUnitId - The ID of the aggregation unit
 * @param businessDate - The business date for the limits
 * @param securityId - The ID of the security
 * @returns Promise resolving to aggregation unit limit data
 */
export async function getAggregationUnitLimits(
  aggregationUnitId: string,
  businessDate: string,
  securityId: string
): Promise<ApiResponse<AggregationUnitLimit>> {
  const params = { businessDate, securityId };
  return fetchWithCache<ApiResponse<AggregationUnitLimit>>(`${ORDER_ENDPOINTS.AGGREGATION_UNIT_LIMITS}/${aggregationUnitId}`, params);
}

/**
 * Updates an existing order
 * 
 * @param orderId - The ID of the order to update
 * @param updateData - The new order data
 * @returns Promise resolving to the updated order
 */
export async function updateOrder(
  orderId: string,
  updateData: any
): Promise<ApiResponse<Order>> {
  const response = await put<ApiResponse<Order>>(ORDER_ENDPOINTS.ORDER_BY_ID(orderId), updateData);
  
  // Invalidate cache to ensure fresh data
  invalidateCache(ORDER_ENDPOINTS.ORDERS);
  
  return response;
}