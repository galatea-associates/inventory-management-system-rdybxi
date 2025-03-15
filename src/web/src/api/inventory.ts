/**
 * API client module for inventory-related operations in the Inventory Management System frontend.
 * This file provides functions for retrieving and filtering inventory data, availability calculations,
 * and inventory summaries to support the inventory visualization and analysis features of the application.
 */

import { get, post } from './client';
import { INVENTORY_ENDPOINTS } from '../constants/api';
import { Inventory } from '../types/models';
import { 
  ApiResponse, 
  PaginatedResponse, 
  FilterParams, 
  PaginationParams 
} from '../types/api';
import { fetchWithCache } from '../utils/api';

/**
 * Retrieves a paginated list of inventory data for a specific business date
 * 
 * @param businessDate - The business date for which to retrieve inventory data (ISO format)
 * @param params - Pagination parameters (page, size, sort)
 * @returns Promise resolving to paginated inventory data
 */
export async function getInventory(
  businessDate: string,
  params: { page?: number; size?: number; sort?: string[] } = {}
): Promise<ApiResponse<PaginatedResponse<Inventory>>> {
  const queryParams = {
    businessDate,
    ...params
  };
  
  return get<ApiResponse<PaginatedResponse<Inventory>>>(
    INVENTORY_ENDPOINTS.INVENTORY,
    queryParams
  );
}

/**
 * Retrieves inventory data for a specific security and business date
 * 
 * @param securityId - The ID of the security
 * @param businessDate - The business date for which to retrieve data (ISO format)
 * @param calculationType - The calculation type (e.g., "FOR_LOAN", "FOR_PLEDGE")
 * @returns Promise resolving to inventory data for the security
 */
export async function getInventoryBySecurityId(
  securityId: string,
  businessDate: string,
  calculationType: string
): Promise<ApiResponse<Inventory>> {
  const endpoint = INVENTORY_ENDPOINTS.INVENTORY_BY_SECURITY.replace('{securityId}', securityId);
  
  return get<ApiResponse<Inventory>>(
    endpoint,
    { businessDate, calculationType }
  );
}

/**
 * Filters inventory data based on various criteria
 * 
 * @param filterParams - Filter criteria
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to filtered inventory data
 */
export async function filterInventory(
  filterParams: FilterParams,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<Inventory>>> {
  const params = {
    ...filterParams,
    ...paginationParams
  };
  
  return post<ApiResponse<PaginatedResponse<Inventory>>>(
    `${INVENTORY_ENDPOINTS.INVENTORY}/filter`,
    params
  );
}

/**
 * Retrieves inventory data for a specific security across all calculation types
 * 
 * @param securityId - The ID of the security
 * @param businessDate - The business date for which to retrieve data (ISO format)
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to security inventory data
 */
export async function getInventoryBySecurity(
  securityId: string,
  businessDate: string,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<Inventory>>> {
  const filters = {
    securityId,
    businessDate
  };
  
  return filterInventory({ filters }, paginationParams);
}

/**
 * Retrieves inventory data for a specific counterparty
 * 
 * @param counterpartyId - The ID of the counterparty
 * @param businessDate - The business date for which to retrieve data (ISO format)
 * @param calculationType - The calculation type (e.g., "FOR_LOAN", "FOR_PLEDGE")
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to counterparty inventory data
 */
export async function getInventoryByCounterparty(
  counterpartyId: string,
  businessDate: string,
  calculationType: string,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<Inventory>>> {
  const filters = {
    counterpartyId,
    businessDate,
    calculationType
  };
  
  return filterInventory({ filters }, paginationParams);
}

/**
 * Retrieves inventory data for a specific aggregation unit
 * 
 * @param aggregationUnitId - The ID of the aggregation unit
 * @param businessDate - The business date for which to retrieve data (ISO format)
 * @param calculationType - The calculation type (e.g., "FOR_LOAN", "FOR_PLEDGE")
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to aggregation unit inventory data
 */
export async function getInventoryByAggregationUnit(
  aggregationUnitId: string,
  businessDate: string,
  calculationType: string,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<Inventory>>> {
  const filters = {
    aggregationUnitId,
    businessDate,
    calculationType
  };
  
  return filterInventory({ filters }, paginationParams);
}

/**
 * Retrieves for-loan availability data for a specific business date
 * 
 * @param businessDate - The business date for which to retrieve data (ISO format)
 * @param filters - Optional filters (securityId, counterpartyId, aggregationUnitId, market)
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to for-loan availability data
 */
export async function getForLoanAvailability(
  businessDate: string,
  filters?: {
    securityId?: string;
    counterpartyId?: string;
    aggregationUnitId?: string;
    market?: string;
  },
  paginationParams: PaginationParams = { page: 0, size: 20, sort: 'marketValue,desc' }
): Promise<ApiResponse<PaginatedResponse<Inventory>>> {
  const queryParams = {
    businessDate,
    ...filters,
    ...paginationParams
  };
  
  return get<ApiResponse<PaginatedResponse<Inventory>>>(
    INVENTORY_ENDPOINTS.FOR_LOAN_AVAILABILITY,
    queryParams
  );
}

/**
 * Retrieves for-pledge availability data for a specific business date
 * 
 * @param businessDate - The business date for which to retrieve data (ISO format)
 * @param filters - Optional filters (securityId, counterpartyId, aggregationUnitId, market)
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to for-pledge availability data
 */
export async function getForPledgeAvailability(
  businessDate: string,
  filters?: {
    securityId?: string;
    counterpartyId?: string;
    aggregationUnitId?: string;
    market?: string;
  },
  paginationParams: PaginationParams = { page: 0, size: 20, sort: 'marketValue,desc' }
): Promise<ApiResponse<PaginatedResponse<Inventory>>> {
  const queryParams = {
    businessDate,
    ...filters,
    ...paginationParams
  };
  
  return get<ApiResponse<PaginatedResponse<Inventory>>>(
    INVENTORY_ENDPOINTS.FOR_PLEDGE_AVAILABILITY,
    queryParams
  );
}

/**
 * Retrieves overborrow data for a specific business date
 * 
 * @param businessDate - The business date for which to retrieve data (ISO format)
 * @param filters - Optional filters (securityId, counterpartyId, aggregationUnitId)
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to overborrow data
 */
export async function getOverborrows(
  businessDate: string,
  filters?: {
    securityId?: string;
    counterpartyId?: string;
    aggregationUnitId?: string;
  },
  paginationParams: PaginationParams = { page: 0, size: 20, sort: 'marketValue,desc' }
): Promise<ApiResponse<PaginatedResponse<Inventory>>> {
  const queryParams = {
    businessDate,
    ...filters,
    ...paginationParams
  };
  
  return get<ApiResponse<PaginatedResponse<Inventory>>>(
    INVENTORY_ENDPOINTS.OVERBORROW,
    queryParams
  );
}

/**
 * Retrieves a summary of inventory data for the given business date
 * 
 * @param businessDate - The business date for which to retrieve the summary (ISO format)
 * @param filters - Optional filters (calculationType, market)
 * @returns Promise resolving to inventory summary data
 */
export async function getInventorySummary(
  businessDate: string,
  filters?: {
    calculationType?: string;
    market?: string;
  }
): Promise<ApiResponse<{
  totalInventory: number;
  forLoan: number;
  forPledge: number;
  htbValue: number;
}>> {
  const queryParams = {
    businessDate,
    ...filters
  };
  
  // Use cached query for summary data that doesn't change frequently
  return fetchWithCache<ApiResponse<{
    totalInventory: number;
    forLoan: number;
    forPledge: number;
    htbValue: number;
  }>>(
    INVENTORY_ENDPOINTS.INVENTORY_SUMMARY,
    queryParams
  );
}

/**
 * Retrieves the top securities by availability for a specific business date and calculation type
 * 
 * @param businessDate - The business date for which to retrieve data (ISO format)
 * @param calculationType - The calculation type (e.g., "FOR_LOAN", "FOR_PLEDGE")
 * @param limit - Maximum number of securities to return
 * @param filters - Optional filters (market, securityTemperature)
 * @returns Promise resolving to top securities data
 */
export async function getTopSecurities(
  businessDate: string,
  calculationType: string,
  limit: number = 10,
  filters?: {
    market?: string;
    securityTemperature?: string;
  }
): Promise<ApiResponse<Array<{
  security: {
    id: string;
    internalId: string;
    description: string;
  };
  availableQuantity: number;
  marketValue: number;
}>>> {
  const queryParams = {
    businessDate,
    calculationType,
    limit,
    ...filters
  };
  
  return get<ApiResponse<Array<{
    security: {
      id: string;
      internalId: string;
      description: string;
    };
    availableQuantity: number;
    marketValue: number;
  }>>>(
    INVENTORY_ENDPOINTS.TOP_SECURITIES,
    queryParams
  );
}

/**
 * Retrieves inventory data grouped by category for a specific business date
 * 
 * @param businessDate - The business date for which to retrieve data (ISO format)
 * @param groupBy - The category to group by (e.g., "positionType", "market", "securityType")
 * @param filters - Optional filters (calculationType, market)
 * @returns Promise resolving to categorized inventory data
 */
export async function getInventoryByCategory(
  businessDate: string,
  groupBy: string,
  filters?: {
    calculationType?: string;
    market?: string;
  }
): Promise<ApiResponse<Array<{
  category: string;
  value: number;
  percentage: number;
  change1D: number;
  change1W: number;
}>>> {
  const queryParams = {
    businessDate,
    groupBy,
    ...filters
  };
  
  return get<ApiResponse<Array<{
    category: string;
    value: number;
    percentage: number;
    change1D: number;
    change1W: number;
  }>>>(
    `${INVENTORY_ENDPOINTS.INVENTORY}/by-category`,
    queryParams
  );
}

/**
 * Triggers a recalculation of inventory for a specific business date and calculation type
 * 
 * @param businessDate - The business date for which to recalculate inventory (ISO format)
 * @param calculationType - The calculation type to recalculate (e.g., "FOR_LOAN", "FOR_PLEDGE")
 * @returns Promise resolving to recalculation result
 */
export async function recalculateInventory(
  businessDate: string,
  calculationType: string
): Promise<ApiResponse<{
  success: boolean;
  message: string;
  count: number;
}>> {
  const payload = {
    businessDate,
    calculationType
  };
  
  return post<ApiResponse<{
    success: boolean;
    message: string;
    count: number;
  }>>(
    `${INVENTORY_ENDPOINTS.INVENTORY}/recalculate`,
    payload
  );
}

/**
 * Retrieves the list of available inventory calculation types
 * 
 * @returns Promise resolving to list of calculation types
 */
export async function getCalculationTypes(): Promise<ApiResponse<string[]>> {
  return get<ApiResponse<string[]>>(
    '/api/v1/reference/calculation-types'
  );
}

/**
 * Retrieves the list of available security temperature classifications
 * 
 * @returns Promise resolving to list of security temperatures
 */
export async function getSecurityTemperatures(): Promise<ApiResponse<string[]>> {
  return get<ApiResponse<string[]>>(
    '/api/v1/reference/security-temperatures'
  );
}