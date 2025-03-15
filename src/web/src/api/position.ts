/**
 * Position API Client Module
 * 
 * This module provides functions for interacting with position-related endpoints
 * in the Inventory Management System API. It supports retrieving, filtering, and 
 * summarizing position data to support position visualization and analysis features.
 */

import { get, post } from './client';
import { POSITION_ENDPOINTS } from '../constants/api';
import { Position, SettlementLadder } from '../types/models';
import { ApiResponse, PaginatedResponse, FilterParams, PaginationParams } from '../types/api';

/**
 * Retrieves a paginated list of positions for a specific business date
 * 
 * @param businessDate - The business date for which to retrieve positions
 * @param params - Optional pagination parameters
 * @returns Promise resolving to paginated position data
 */
export async function getPositions(
  businessDate: string,
  params: { page?: number; size?: number; sort?: string[] } = {}
): Promise<PaginatedResponse<Position>> {
  const queryParams = {
    businessDate,
    ...params
  };
  
  return get<PaginatedResponse<Position>>(
    POSITION_ENDPOINTS.POSITIONS,
    queryParams
  );
}

/**
 * Retrieves a specific position by book ID, security ID, and business date
 * 
 * @param bookId - The book ID
 * @param securityId - The security ID
 * @param businessDate - The business date
 * @returns Promise resolving to position data
 */
export async function getPositionById(
  bookId: string,
  securityId: string,
  businessDate: string
): Promise<Position> {
  const endpoint = POSITION_ENDPOINTS.POSITION_BY_ID.replace('{bookId}', bookId).replace('{securityId}', securityId);
  
  return get<Position>(
    endpoint,
    { businessDate }
  );
}

/**
 * Filters positions based on various criteria
 * 
 * @param filterParams - Filter criteria
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to filtered position data
 */
export async function filterPositions(
  filterParams: FilterParams,
  paginationParams: PaginationParams
): Promise<PaginatedResponse<Position>> {
  const params = {
    ...filterParams,
    ...paginationParams
  };
  
  return post<PaginatedResponse<Position>>(
    POSITION_ENDPOINTS.POSITION_FILTER,
    params
  );
}

/**
 * Retrieves positions for a specific security and business date
 * 
 * @param securityId - The security ID
 * @param businessDate - The business date
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to security positions data
 */
export async function getPositionsBySecurity(
  securityId: string,
  businessDate: string,
  paginationParams: PaginationParams
): Promise<PaginatedResponse<Position>> {
  const filterParams: FilterParams = {
    filters: { securityId, businessDate }
  };
  
  return filterPositions(filterParams, paginationParams);
}

/**
 * Retrieves positions for a specific book and business date
 * 
 * @param bookId - The book ID
 * @param businessDate - The business date
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to book positions data
 */
export async function getPositionsByBook(
  bookId: string,
  businessDate: string,
  paginationParams: PaginationParams
): Promise<PaginatedResponse<Position>> {
  const filterParams: FilterParams = {
    filters: { bookId, businessDate }
  };
  
  return filterPositions(filterParams, paginationParams);
}

/**
 * Retrieves positions for a specific counterparty and business date
 * 
 * @param counterpartyId - The counterparty ID
 * @param businessDate - The business date
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to counterparty positions data
 */
export async function getPositionsByCounterparty(
  counterpartyId: string,
  businessDate: string,
  paginationParams: PaginationParams
): Promise<PaginatedResponse<Position>> {
  const filterParams: FilterParams = {
    filters: { counterpartyId, businessDate }
  };
  
  return filterPositions(filterParams, paginationParams);
}

/**
 * Retrieves positions for a specific aggregation unit and business date
 * 
 * @param aggregationUnitId - The aggregation unit ID
 * @param businessDate - The business date
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to aggregation unit positions data
 */
export async function getPositionsByAggregationUnit(
  aggregationUnitId: string,
  businessDate: string,
  paginationParams: PaginationParams
): Promise<PaginatedResponse<Position>> {
  const filterParams: FilterParams = {
    filters: { aggregationUnitId, businessDate }
  };
  
  return filterPositions(filterParams, paginationParams);
}

/**
 * Retrieves the settlement ladder for a specific position
 * 
 * @param bookId - The book ID
 * @param securityId - The security ID
 * @param businessDate - The business date
 * @returns Promise resolving to settlement ladder data
 */
export async function getSettlementLadder(
  bookId: string,
  securityId: string,
  businessDate: string
): Promise<SettlementLadder> {
  const endpoint = POSITION_ENDPOINTS.SETTLEMENT_LADDER.replace('{bookId}', bookId).replace('{securityId}', securityId);
  
  return get<SettlementLadder>(
    endpoint,
    { businessDate }
  );
}

/**
 * Retrieves a summary of position data for the given business date
 * 
 * @param businessDate - The business date
 * @param filters - Optional filters to apply to the summary
 * @returns Promise resolving to position summary data
 */
export async function getPositionSummary(
  businessDate: string,
  filters?: { securityId?: string; bookId?: string; counterpartyId?: string; aggregationUnitId?: string }
): Promise<{ totalLong: number; totalShort: number; netPosition: number; securityCount: number }> {
  const queryParams = {
    businessDate,
    ...filters
  };
  
  return get<{ totalLong: number; totalShort: number; netPosition: number; securityCount: number }>(
    POSITION_ENDPOINTS.POSITION_SUMMARY,
    queryParams
  );
}

/**
 * Triggers a recalculation of positions for a specific business date
 * 
 * @param businessDate - The business date
 * @param calculationStatus - The calculation status
 * @returns Promise resolving to recalculation result
 */
export async function recalculatePositions(
  businessDate: string,
  calculationStatus: string
): Promise<{ success: boolean; message: string; count: number }> {
  const requestBody = {
    businessDate,
    status: calculationStatus
  };
  
  return post<{ success: boolean; message: string; count: number }>(
    `${POSITION_ENDPOINTS.POSITIONS}/recalculate`,
    requestBody
  );
}

/**
 * Retrieves the list of available position types
 * 
 * @returns Promise resolving to list of position types
 */
export async function getPositionTypes(): Promise<string[]> {
  return get<string[]>('/api/v1/reference/position-types');
}

/**
 * Retrieves the list of available position statuses
 * 
 * @returns Promise resolving to list of position statuses
 */
export async function getPositionStatuses(): Promise<string[]> {
  return get<string[]>('/api/v1/reference/position-statuses');
}