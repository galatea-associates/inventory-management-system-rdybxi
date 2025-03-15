import { createSelector } from 'reselect'; // v4.2
import { RootState, LocatesState, LocateFilters } from '../../types/state';
import { LocateRequest } from '../../types/models';

// Base selector to get the locates slice of state
export const selectLocatesState = (state: RootState): LocatesState => state.locates;

// Select the locate requests array
export const selectLocates = createSelector(
  [selectLocatesState],
  (locates: LocatesState): LocateRequest[] => locates.locates
);

// Select the currently selected locate request
export const selectSelectedLocate = createSelector(
  [selectLocatesState],
  (locates: LocatesState): LocateRequest | null => locates.selectedLocate
);

// Select the loading state
export const selectLocatesLoading = createSelector(
  [selectLocatesState],
  (locates: LocatesState): boolean => locates.isLoading
);

// Select the submitting state
export const selectLocatesSubmitting = createSelector(
  [selectLocatesState],
  (locates: LocatesState): boolean => locates.isSubmitting
);

// Select the error state
export const selectLocatesError = createSelector(
  [selectLocatesState],
  (locates: LocatesState): string | null => locates.error
);

// Select the filters
export const selectLocateFilters = createSelector(
  [selectLocatesState],
  (locates: LocatesState): LocateFilters => locates.filters
);

// Select the pagination state
export const selectLocatePagination = createSelector(
  [selectLocatesState],
  (locates: LocatesState) => locates.pagination
);

// Select the summary metrics
export const selectLocateSummary = createSelector(
  [selectLocatesState],
  (locates: LocatesState) => locates.summary
);

// Factory function to create a selector that filters locates by security ID
export const selectLocatesBySecurityId = (securityId: string) =>
  createSelector([selectLocates], (locates: LocateRequest[]): LocateRequest[] =>
    locates.filter(locate => locate.security.internalId === securityId)
  );

// Factory function to create a selector that filters locates by requestor ID
export const selectLocatesByRequestorId = (requestorId: string) =>
  createSelector([selectLocates], (locates: LocateRequest[]): LocateRequest[] =>
    locates.filter(locate => locate.requestor.counterpartyId === requestorId)
  );

// Factory function to create a selector that filters locates by client ID
export const selectLocatesByClientId = (clientId: string) =>
  createSelector([selectLocates], (locates: LocateRequest[]): LocateRequest[] =>
    locates.filter(locate => locate.client.counterpartyId === clientId)
  );

// Factory function to create a selector that filters locates by aggregation unit ID
export const selectLocatesByAggregationUnitId = (aggregationUnitId: string) =>
  createSelector([selectLocates], (locates: LocateRequest[]): LocateRequest[] =>
    locates.filter(locate => locate.aggregationUnit.aggregationUnitId === aggregationUnitId)
  );

// Factory function to create a selector that filters locates by status
export const selectLocatesByStatus = (status: string) =>
  createSelector([selectLocates], (locates: LocateRequest[]): LocateRequest[] =>
    locates.filter(locate => locate.status === status)
  );

// Select pending locate requests
export const selectPendingLocates = createSelector(
  [selectLocates],
  (locates: LocateRequest[]): LocateRequest[] =>
    locates.filter(locate => locate.status === 'PENDING')
);

// Select approved locate requests
export const selectApprovedLocates = createSelector(
  [selectLocates],
  (locates: LocateRequest[]): LocateRequest[] =>
    locates.filter(locate => locate.status === 'APPROVED')
);

// Select rejected locate requests
export const selectRejectedLocates = createSelector(
  [selectLocates],
  (locates: LocateRequest[]): LocateRequest[] =>
    locates.filter(locate => locate.status === 'REJECTED')
);

// Factory function to create a selector that filters locates by date range
export const selectLocatesByDateRange = ({ fromDate, toDate }: { fromDate: string; toDate: string }) =>
  createSelector([selectLocates], (locates: LocateRequest[]): LocateRequest[] =>
    locates.filter(
      locate => 
        new Date(locate.requestTimestamp) >= new Date(fromDate) && 
        new Date(locate.requestTimestamp) <= new Date(toDate)
    )
  );

// Select locates filtered by the current filter criteria in state
export const selectFilteredLocates = createSelector(
  [selectLocates, selectLocateFilters],
  (locates: LocateRequest[], filters: LocateFilters): LocateRequest[] => {
    return locates.filter(locate => {
      // Start with all locates included
      let include = true;
      
      // Apply security filter if present
      if (filters.securityId && include) {
        include = locate.security.internalId === filters.securityId;
      }
      
      // Apply requestor filter if present
      if (filters.requestorId && include) {
        include = locate.requestor.counterpartyId === filters.requestorId;
      }
      
      // Apply client filter if present
      if (filters.clientId && include) {
        include = locate.client.counterpartyId === filters.clientId;
      }
      
      // Apply aggregation unit filter if present
      if (filters.aggregationUnitId && include) {
        include = locate.aggregationUnit.aggregationUnitId === filters.aggregationUnitId;
      }
      
      // Apply status filter if present
      if (filters.status && include) {
        include = locate.status === filters.status;
      }
      
      // Apply locate type filter if present
      if (filters.locateType && include) {
        include = locate.locateType === filters.locateType;
      }
      
      // Apply swap/cash indicator filter if present
      if (filters.swapCashIndicator && include) {
        include = locate.swapCashIndicator === filters.swapCashIndicator;
      }
      
      // Apply date range filter if present
      if (filters.fromDate && filters.toDate && include) {
        const requestDate = new Date(locate.requestTimestamp);
        const fromDate = new Date(filters.fromDate);
        const toDate = new Date(filters.toDate);
        include = requestDate >= fromDate && requestDate <= toDate;
      }
      
      return include;
    });
  }
);

// Select counts of locate requests grouped by status
export const selectLocateCountByStatus = createSelector(
  [selectLocates],
  (locates: LocateRequest[]): Record<string, number> => {
    return locates.reduce((counts, locate) => {
      const status = locate.status;
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }
);

// Select counts of locate requests grouped by security ID
export const selectLocateCountBySecurityId = createSelector(
  [selectLocates],
  (locates: LocateRequest[]): Record<string, number> => {
    return locates.reduce((counts, locate) => {
      const securityId = locate.security.internalId;
      counts[securityId] = (counts[securityId] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }
);

// Select counts of locate requests grouped by client ID
export const selectLocateCountByClientId = createSelector(
  [selectLocates],
  (locates: LocateRequest[]): Record<string, number> => {
    return locates.reduce((counts, locate) => {
      const clientId = locate.client.counterpartyId;
      counts[clientId] = (counts[clientId] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }
);

// Select the total requested quantity across all locate requests
export const selectTotalRequestedQuantity = createSelector(
  [selectLocates],
  (locates: LocateRequest[]): number => {
    return locates.reduce((total, locate) => {
      return total + locate.requestedQuantity;
    }, 0);
  }
);

// Select the total approved quantity across all approved locate requests
export const selectTotalApprovedQuantity = createSelector(
  [selectApprovedLocates],
  (locates: LocateRequest[]): number => {
    return locates.reduce((total, locate) => {
      return total + (locate.approval ? locate.approval.approvedQuantity : 0);
    }, 0);
  }
);