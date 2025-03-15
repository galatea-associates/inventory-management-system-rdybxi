/**
 * Exception Management API Client
 *
 * This module provides API client functions for retrieving, filtering, and managing system
 * exceptions in the Inventory Management System. It enables users to view, acknowledge,
 * resolve, assign, and escalate exceptions through the UI.
 */

import { get, post, put } from './client';
import { PaginationParams, FilterParams, DateRangeParams } from '../types/api';
import { Alert } from '../types/models';

// API endpoint for exceptions
const API_ENDPOINT = 'exceptions';

/**
 * Retrieves a paginated list of system exceptions with optional filtering
 *
 * @param params - Pagination, filter, and date range parameters
 * @returns Promise resolving to paginated exceptions data
 */
export async function getExceptions(
  params: PaginationParams & FilterParams & DateRangeParams
): Promise<{ content: Alert[], totalElements: number, totalPages: number }> {
  return get(API_ENDPOINT, params);
}

/**
 * Retrieves a specific exception by its ID
 *
 * @param id - The exception ID
 * @returns Promise resolving to the exception details
 */
export async function getExceptionById(id: string): Promise<Alert> {
  return get(`${API_ENDPOINT}/${id}`);
}

/**
 * Acknowledges an exception, updating its status to 'Acknowledged'
 *
 * @param id - The exception ID
 * @returns Promise resolving to the updated exception
 */
export async function acknowledgeException(id: string): Promise<Alert> {
  return put(`${API_ENDPOINT}/${id}/acknowledge`);
}

/**
 * Resolves an exception, updating its status to 'Resolved'
 *
 * @param id - The exception ID
 * @param data - Resolution data including notes
 * @returns Promise resolving to the updated exception
 */
export async function resolveException(
  id: string,
  data: { resolutionNotes: string }
): Promise<Alert> {
  return put(`${API_ENDPOINT}/${id}/resolve`, data);
}

/**
 * Assigns an exception to a specific user
 *
 * @param id - The exception ID
 * @param data - Assignment data including assignee ID
 * @returns Promise resolving to the updated exception
 */
export async function assignException(
  id: string,
  data: { assigneeId: string }
): Promise<Alert> {
  return put(`${API_ENDPOINT}/${id}/assign`, data);
}

/**
 * Escalates an exception, increasing its severity and optionally assigning to a new user
 *
 * @param id - The exception ID
 * @param data - Escalation data including new severity, optional assignee, and notes
 * @returns Promise resolving to the updated exception
 */
export async function escalateException(
  id: string,
  data: { newSeverity: string, assigneeId?: string, escalationNotes: string }
): Promise<Alert> {
  return put(`${API_ENDPOINT}/${id}/escalate`, data);
}

/**
 * Retrieves the list of available exception types
 *
 * @returns Promise resolving to array of exception types
 */
export async function getExceptionTypes(): Promise<string[]> {
  return get(`${API_ENDPOINT}/types`);
}

/**
 * Retrieves the list of available exception severity levels
 *
 * @returns Promise resolving to array of severity levels
 */
export async function getExceptionSeverities(): Promise<string[]> {
  return get(`${API_ENDPOINT}/severities`);
}

/**
 * Retrieves the list of available exception statuses
 *
 * @returns Promise resolving to array of exception statuses
 */
export async function getExceptionStatuses(): Promise<string[]> {
  return get(`${API_ENDPOINT}/statuses`);
}

/**
 * Retrieves statistics about exceptions, such as counts by type, severity, and status
 *
 * @param params - Date range parameters for filtering statistics
 * @returns Promise resolving to exception statistics
 */
export async function getExceptionStats(
  params: DateRangeParams
): Promise<{
  byType: Record<string, number>,
  bySeverity: Record<string, number>,
  byStatus: Record<string, number>,
  total: number
}> {
  return get(`${API_ENDPOINT}/stats`, params);
}

/**
 * Adds a comment to an exception
 *
 * @param id - The exception ID
 * @param data - Comment data
 * @returns Promise resolving to the updated exception
 */
export async function addExceptionComment(
  id: string,
  data: { comment: string }
): Promise<Alert> {
  return post(`${API_ENDPOINT}/${id}/comments`, data);
}