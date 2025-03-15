/**
 * API client module for locate-related operations in the Inventory Management System frontend.
 * This file provides functions for submitting, retrieving, approving, and rejecting locate requests,
 * as well as filtering and analyzing locate data to support the locate management features of the application.
 */

import { get, post, put } from './client';
import { LOCATE_ENDPOINTS } from '../constants/api';
import { LocateRequest, LocateApproval, LocateRejection } from '../types/models';
import { 
  ApiResponse,
  PaginatedResponse,
  FilterParams,
  PaginationParams,
  LocateRequestPayload,
  LocateApprovalPayload,
  LocateRejectionPayload 
} from '../types/api';
import { fetchWithCache, invalidateCache } from '../utils/api';

/**
 * Retrieves a paginated list of locate requests with optional filtering
 * 
 * @param params - Optional pagination parameters
 * @returns Promise resolving to paginated locate request data
 */
export async function getLocates(
  params?: { page?: number; size?: number; sort?: string[] }
): Promise<ApiResponse<PaginatedResponse<LocateRequest>>> {
  return get<ApiResponse<PaginatedResponse<LocateRequest>>>(LOCATE_ENDPOINTS.LOCATES, params);
}

/**
 * Retrieves a specific locate request by its ID
 * 
 * @param locateId - ID of the locate request to retrieve
 * @returns Promise resolving to the locate request data
 */
export async function getLocateById(
  locateId: string
): Promise<ApiResponse<LocateRequest>> {
  const endpoint = LOCATE_ENDPOINTS.LOCATE_BY_ID(locateId);
  return get<ApiResponse<LocateRequest>>(endpoint);
}

/**
 * Filters locate requests based on various criteria
 * 
 * @param filterParams - Filter parameters
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to filtered locate request data
 */
export async function filterLocates(
  filterParams: FilterParams,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<LocateRequest>>> {
  const params = {
    ...paginationParams,
    ...filterParams
  };
  return post<ApiResponse<PaginatedResponse<LocateRequest>>>(LOCATE_ENDPOINTS.LOCATE_FILTER, params);
}

/**
 * Retrieves locate requests filtered by status
 * 
 * @param status - Status to filter by
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to status-filtered locate request data
 */
export async function getLocatesByStatus(
  status: string,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<LocateRequest>>> {
  const filterParams: FilterParams = {
    filters: { status }
  };
  return filterLocates(filterParams, paginationParams);
}

/**
 * Retrieves locate requests for a specific security
 * 
 * @param securityId - ID of the security to filter by
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to security-filtered locate request data
 */
export async function getLocatesBySecurityId(
  securityId: string,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<LocateRequest>>> {
  const filterParams: FilterParams = {
    filters: { securityId }
  };
  return filterLocates(filterParams, paginationParams);
}

/**
 * Retrieves locate requests for a specific client
 * 
 * @param clientId - ID of the client to filter by
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to client-filtered locate request data
 */
export async function getLocatesByClientId(
  clientId: string,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<LocateRequest>>> {
  const filterParams: FilterParams = {
    filters: { clientId }
  };
  return filterLocates(filterParams, paginationParams);
}

/**
 * Retrieves locate requests within a specific date range
 * 
 * @param startDate - Start date for the range
 * @param endDate - End date for the range
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to date-filtered locate request data
 */
export async function getLocatesByDateRange(
  startDate: string,
  endDate: string,
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<LocateRequest>>> {
  const filterParams: FilterParams = {
    filters: { startDate, endDate }
  };
  return filterLocates(filterParams, paginationParams);
}

/**
 * Submits a new locate request
 * 
 * @param locateRequest - Locate request payload
 * @returns Promise resolving to the created locate request
 */
export async function submitLocateRequest(
  locateRequest: LocateRequestPayload
): Promise<ApiResponse<LocateRequest>> {
  return post<ApiResponse<LocateRequest>>(LOCATE_ENDPOINTS.LOCATES, locateRequest);
}

/**
 * Approves a locate request
 * 
 * @param locateId - ID of the locate request to approve
 * @param approvalData - Approval data
 * @returns Promise resolving to the locate approval data
 */
export async function approveLocateRequest(
  locateId: string,
  approvalData: LocateApprovalPayload
): Promise<ApiResponse<LocateApproval>> {
  const endpoint = LOCATE_ENDPOINTS.LOCATE_APPROVE(locateId);
  const response = await post<ApiResponse<LocateApproval>>(endpoint, approvalData);
  
  // Invalidate cache for locate endpoints to ensure fresh data
  invalidateCache(LOCATE_ENDPOINTS.LOCATES);
  
  return response;
}

/**
 * Rejects a locate request
 * 
 * @param locateId - ID of the locate request to reject
 * @param rejectionData - Rejection data
 * @returns Promise resolving to the locate rejection data
 */
export async function rejectLocateRequest(
  locateId: string,
  rejectionData: LocateRejectionPayload
): Promise<ApiResponse<LocateRejection>> {
  const endpoint = LOCATE_ENDPOINTS.LOCATE_REJECT(locateId);
  const response = await post<ApiResponse<LocateRejection>>(endpoint, rejectionData);
  
  // Invalidate cache for locate endpoints to ensure fresh data
  invalidateCache(LOCATE_ENDPOINTS.LOCATES);
  
  return response;
}

/**
 * Retrieves a summary of locate requests by status
 * 
 * @param businessDate - Business date for the summary
 * @returns Promise resolving to locate summary data
 */
export async function getLocateSummary(
  businessDate: string
): Promise<ApiResponse<{ pending: number; approved: number; rejected: number; autoApproved: number; autoRejected: number; total: number }>> {
  const params = { businessDate };
  return fetchWithCache<ApiResponse<{ 
    pending: number; 
    approved: number; 
    rejected: number; 
    autoApproved: number; 
    autoRejected: number; 
    total: number 
  }>>(LOCATE_ENDPOINTS.LOCATE_SUMMARY, params);
}

/**
 * Retrieves historical locate requests for analysis
 * 
 * @param startDate - Start date for historical data
 * @param endDate - End date for historical data
 * @param filters - Optional additional filters
 * @param paginationParams - Pagination parameters
 * @returns Promise resolving to historical locate request data
 */
export async function getLocateHistory(
  startDate: string,
  endDate: string,
  filters?: { securityId?: string; clientId?: string; status?: string },
  paginationParams: PaginationParams
): Promise<ApiResponse<PaginatedResponse<LocateRequest>>> {
  const filterParams: FilterParams = {
    filters: {
      startDate,
      endDate,
      ...filters
    }
  };
  return filterLocates(filterParams, paginationParams);
}

/**
 * Retrieves statistics about locate requests for a given period
 * 
 * @param startDate - Start date for statistics
 * @param endDate - End date for statistics
 * @param filters - Optional additional filters
 * @returns Promise resolving to locate statistics data
 */
export async function getLocateStatistics(
  startDate: string,
  endDate: string,
  filters?: { securityId?: string; clientId?: string }
): Promise<ApiResponse<{ 
  totalRequests: number; 
  approvalRate: number; 
  autoApprovalRate: number; 
  averageResponseTime: number; 
  topSecurities: Array<{ securityId: string; count: number }> 
}>> {
  const params = {
    startDate,
    endDate,
    ...filters
  };
  return get<ApiResponse<{
    totalRequests: number;
    approvalRate: number;
    autoApprovalRate: number;
    averageResponseTime: number;
    topSecurities: Array<{ securityId: string; count: number }>;
  }>>(`${LOCATE_ENDPOINTS.LOCATES}/statistics`, params);
}

/**
 * Updates an existing locate request (before approval/rejection)
 * 
 * @param locateId - ID of the locate request to update
 * @param updateData - Updated locate request data
 * @returns Promise resolving to the updated locate request
 */
export async function updateLocateRequest(
  locateId: string,
  updateData: LocateRequestPayload
): Promise<ApiResponse<LocateRequest>> {
  const endpoint = LOCATE_ENDPOINTS.LOCATE_BY_ID(locateId);
  return put<ApiResponse<LocateRequest>>(endpoint, updateData);
}