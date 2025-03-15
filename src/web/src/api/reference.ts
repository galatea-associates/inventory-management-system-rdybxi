/**
 * API client module for reference data operations in the Inventory Management System frontend.
 * Provides functions for retrieving and managing reference data including securities,
 * counterparties, aggregation units, and index compositions.
 */

import { get, post, put, deleteRequest } from './client';
import { PaginatedResponse, PaginationParams, FilterParams, SortParams } from '../types/api';
import { 
  Security, 
  SecurityIdentifier, 
  Counterparty, 
  CounterpartyIdentifier, 
  AggregationUnit, 
  IndexComposition 
} from '../types/models';

// Base URL for reference data API
const BASE_URL = '/api/v1/reference';

/**
 * Retrieves a paginated list of securities with optional filtering and sorting
 * @param pagination - Pagination parameters
 * @param filters - Filter parameters
 * @param sort - Sort parameters
 * @returns Promise resolving to paginated security data
 */
export async function getSecurities(
  pagination?: PaginationParams,
  filters?: FilterParams,
  sort?: SortParams
): Promise<PaginatedResponse<Security>> {
  // Construct query parameters from pagination, filters, and sort
  const queryParams = {
    ...pagination,
    ...filters,
    ...sort
  };
  
  return get<PaginatedResponse<Security>>(`${BASE_URL}/securities`, queryParams);
}

/**
 * Retrieves a single security by its ID
 * @param id - ID of the security to retrieve
 * @returns Promise resolving to the security data
 */
export async function getSecurity(id: string): Promise<Security> {
  return get<Security>(`${BASE_URL}/securities/${id}`);
}

/**
 * Searches for securities based on a search term
 * @param searchTerm - Term to search for
 * @param limit - Maximum number of results to return
 * @returns Promise resolving to an array of matching securities
 */
export async function searchSecurities(
  searchTerm: string,
  limit: number = 10
): Promise<Security[]> {
  return get<Security[]>(`${BASE_URL}/securities/search`, { searchTerm, limit });
}

/**
 * Retrieves a security by its external identifier (e.g., ISIN, CUSIP)
 * @param identifierType - Type of identifier (e.g., ISIN, CUSIP)
 * @param identifierValue - Value of the identifier
 * @returns Promise resolving to the security data
 */
export async function getSecurityByIdentifier(
  identifierType: string,
  identifierValue: string
): Promise<Security> {
  return get<Security>(`${BASE_URL}/securities/identifier`, { identifierType, identifierValue });
}

/**
 * Retrieves the composition of an index or basket product
 * @param indexId - ID of the index or basket security
 * @param date - Optional date for historical compositions
 * @returns Promise resolving to the index composition data
 */
export async function getIndexComposition(
  indexId: string,
  date?: string
): Promise<IndexComposition[]> {
  const params = date ? { date } : {};
  return get<IndexComposition[]>(`${BASE_URL}/securities/${indexId}/composition`, params);
}

/**
 * Retrieves a paginated list of counterparties with optional filtering and sorting
 * @param pagination - Pagination parameters
 * @param filters - Filter parameters
 * @param sort - Sort parameters
 * @returns Promise resolving to paginated counterparty data
 */
export async function getCounterparties(
  pagination?: PaginationParams,
  filters?: FilterParams,
  sort?: SortParams
): Promise<PaginatedResponse<Counterparty>> {
  // Construct query parameters from pagination, filters, and sort
  const queryParams = {
    ...pagination,
    ...filters,
    ...sort
  };
  
  return get<PaginatedResponse<Counterparty>>(`${BASE_URL}/counterparties`, queryParams);
}

/**
 * Retrieves a single counterparty by its ID
 * @param id - ID of the counterparty to retrieve
 * @returns Promise resolving to the counterparty data
 */
export async function getCounterparty(id: string): Promise<Counterparty> {
  return get<Counterparty>(`${BASE_URL}/counterparties/${id}`);
}

/**
 * Searches for counterparties based on a search term
 * @param searchTerm - Term to search for
 * @param limit - Maximum number of results to return
 * @returns Promise resolving to an array of matching counterparties
 */
export async function searchCounterparties(
  searchTerm: string,
  limit: number = 10
): Promise<Counterparty[]> {
  return get<Counterparty[]>(`${BASE_URL}/counterparties/search`, { searchTerm, limit });
}

/**
 * Retrieves a counterparty by its external identifier
 * @param identifierType - Type of identifier
 * @param identifierValue - Value of the identifier
 * @returns Promise resolving to the counterparty data
 */
export async function getCounterpartyByIdentifier(
  identifierType: string,
  identifierValue: string
): Promise<Counterparty> {
  return get<Counterparty>(`${BASE_URL}/counterparties/identifier`, { identifierType, identifierValue });
}

/**
 * Retrieves a paginated list of aggregation units with optional filtering and sorting
 * @param pagination - Pagination parameters
 * @param filters - Filter parameters
 * @param sort - Sort parameters
 * @returns Promise resolving to paginated aggregation unit data
 */
export async function getAggregationUnits(
  pagination?: PaginationParams,
  filters?: FilterParams,
  sort?: SortParams
): Promise<PaginatedResponse<AggregationUnit>> {
  // Construct query parameters from pagination, filters, and sort
  const queryParams = {
    ...pagination,
    ...filters,
    ...sort
  };
  
  return get<PaginatedResponse<AggregationUnit>>(`${BASE_URL}/aggregation-units`, queryParams);
}

/**
 * Retrieves a single aggregation unit by its ID
 * @param id - ID of the aggregation unit to retrieve
 * @returns Promise resolving to the aggregation unit data
 */
export async function getAggregationUnit(id: string): Promise<AggregationUnit> {
  return get<AggregationUnit>(`${BASE_URL}/aggregation-units/${id}`);
}

/**
 * Retrieves aggregation units for a specific market
 * @param market - Market code
 * @returns Promise resolving to an array of aggregation units for the market
 */
export async function getAggregationUnitsByMarket(market: string): Promise<AggregationUnit[]> {
  return get<AggregationUnit[]>(`${BASE_URL}/aggregation-units/market/${market}`);
}

/**
 * Retrieves the list of available security types
 * @returns Promise resolving to an array of security types
 */
export async function getSecurityTypes(): Promise<string[]> {
  return get<string[]>(`${BASE_URL}/security-types`);
}

/**
 * Retrieves the list of available markets
 * @returns Promise resolving to an array of markets
 */
export async function getMarkets(): Promise<string[]> {
  return get<string[]>(`${BASE_URL}/markets`);
}

/**
 * Retrieves the list of available counterparty types
 * @returns Promise resolving to an array of counterparty types
 */
export async function getCounterpartyTypes(): Promise<string[]> {
  return get<string[]>(`${BASE_URL}/counterparty-types`);
}

/**
 * Retrieves the list of available aggregation unit types
 * @returns Promise resolving to an array of aggregation unit types
 */
export async function getAggregationUnitTypes(): Promise<string[]> {
  return get<string[]>(`${BASE_URL}/aggregation-unit-types`);
}