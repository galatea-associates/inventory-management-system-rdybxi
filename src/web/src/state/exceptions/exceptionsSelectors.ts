import { createSelector } from '@reduxjs/toolkit'; // v1.9.3
import { RootState, ExceptionsState, Exception, ExceptionFilters, PaginationState } from '../../types/state';

/**
 * Base selector that returns the exceptions slice from the root state
 */
export const selectExceptionsState = (state: RootState): ExceptionsState => state.exceptions;

/**
 * Selector that returns the list of exceptions
 */
export const selectExceptions = createSelector(
  [selectExceptionsState],
  (exceptionsState) => exceptionsState.exceptions
);

/**
 * Selector that returns the currently selected exception
 */
export const selectSelectedException = createSelector(
  [selectExceptionsState],
  (exceptionsState) => exceptionsState.selectedException
);

/**
 * Selector that returns the loading state for exceptions
 */
export const selectExceptionsLoading = createSelector(
  [selectExceptionsState],
  (exceptionsState) => exceptionsState.isLoading
);

/**
 * Selector that returns the submitting state for exceptions
 */
export const selectExceptionsSubmitting = createSelector(
  [selectExceptionsState],
  (exceptionsState) => exceptionsState.isSubmitting
);

/**
 * Selector that returns any error in the exceptions state
 */
export const selectExceptionsError = createSelector(
  [selectExceptionsState],
  (exceptionsState) => exceptionsState.error
);

/**
 * Selector that returns the current exception filters
 */
export const selectExceptionFilters = createSelector(
  [selectExceptionsState],
  (exceptionsState) => exceptionsState.filters
);

/**
 * Selector that returns the pagination state for exceptions
 */
export const selectExceptionsPagination = createSelector(
  [selectExceptionsState],
  (exceptionsState) => exceptionsState.pagination
);

/**
 * Selector that groups exceptions by their type
 */
export const selectExceptionsByType = createSelector(
  [selectExceptions],
  (exceptions) => {
    return exceptions.reduce<Record<string, Exception[]>>((grouped, exception) => {
      const type = exception.exceptionType;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(exception);
      return grouped;
    }, {});
  }
);

/**
 * Selector that groups exceptions by their severity
 */
export const selectExceptionsBySeverity = createSelector(
  [selectExceptions],
  (exceptions) => {
    return exceptions.reduce<Record<string, Exception[]>>((grouped, exception) => {
      const severity = exception.severity;
      if (!grouped[severity]) {
        grouped[severity] = [];
      }
      grouped[severity].push(exception);
      return grouped;
    }, {});
  }
);

/**
 * Selector that groups exceptions by their status
 */
export const selectExceptionsByStatus = createSelector(
  [selectExceptions],
  (exceptions) => {
    return exceptions.reduce<Record<string, Exception[]>>((grouped, exception) => {
      const status = exception.status;
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(exception);
      return grouped;
    }, {});
  }
);

/**
 * Selector that returns counts of exceptions by type, severity, and status
 */
export const selectExceptionCounts = createSelector(
  [selectExceptions],
  (exceptions) => {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    exceptions.forEach(exception => {
      // Count by type
      const type = exception.exceptionType;
      byType[type] = (byType[type] || 0) + 1;

      // Count by severity
      const severity = exception.severity;
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;

      // Count by status
      const status = exception.status;
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return { byType, bySeverity, byStatus };
  }
);

/**
 * Selector that returns exceptions filtered by the current filters
 */
export const selectFilteredExceptions = createSelector(
  [selectExceptions, selectExceptionFilters],
  (exceptions, filters) => {
    return exceptions.filter(exception => {
      // Check each filter criteria
      if (filters.exceptionType && exception.exceptionType !== filters.exceptionType) {
        return false;
      }
      
      if (filters.severity && exception.severity !== filters.severity) {
        return false;
      }
      
      if (filters.status && exception.status !== filters.status) {
        return false;
      }
      
      if (filters.assignedTo && exception.assignedTo !== filters.assignedTo) {
        return false;
      }
      
      if (filters.relatedEntityType && exception.relatedEntityType !== filters.relatedEntityType) {
        return false;
      }
      
      if (filters.relatedEntityId && exception.relatedEntityId !== filters.relatedEntityId) {
        return false;
      }
      
      // Date range filtering
      if (filters.fromDate || filters.toDate) {
        const exceptionDate = new Date(exception.timestamp).getTime();
        
        if (filters.fromDate) {
          const fromDate = new Date(filters.fromDate).getTime();
          if (exceptionDate < fromDate) {
            return false;
          }
        }
        
        if (filters.toDate) {
          const toDate = new Date(filters.toDate).getTime();
          if (exceptionDate > toDate) {
            return false;
          }
        }
      }
      
      return true;
    });
  }
);