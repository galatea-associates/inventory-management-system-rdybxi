import { createSelector } from 'reselect'; // v4.2
import { RootState, PositionsState, PositionFilters } from '../../types/state';
import { Position } from '../../types/models';

/**
 * Base selector that returns the positions slice of the Redux state
 */
export const selectPositionsState = (state: RootState): PositionsState => state.positions;

/**
 * Selector that returns the list of positions
 */
export const selectPositions = createSelector(
  [selectPositionsState],
  (positions) => positions.positions
);

/**
 * Selector that returns the currently selected position
 */
export const selectSelectedPosition = createSelector(
  [selectPositionsState],
  (positions) => positions.selectedPosition
);

/**
 * Selector that returns whether position data is currently loading
 */
export const selectPositionsLoading = createSelector(
  [selectPositionsState],
  (positions) => positions.isLoading
);

/**
 * Selector that returns any error related to position data
 */
export const selectPositionsError = createSelector(
  [selectPositionsState],
  (positions) => positions.error
);

/**
 * Selector that returns the current position filters
 */
export const selectPositionFilters = createSelector(
  [selectPositionsState],
  (positions) => positions.filters
);

/**
 * Selector that returns the pagination state for positions
 */
export const selectPositionPagination = createSelector(
  [selectPositionsState],
  (positions) => positions.pagination
);

/**
 * Selector that returns the position summary metrics
 */
export const selectPositionSummary = createSelector(
  [selectPositionsState],
  (positions) => positions.summary
);

/**
 * Selector factory that creates a selector to filter positions by security ID
 */
export const selectPositionsBySecurityId = (securityId: string) =>
  createSelector([selectPositions], (positions) =>
    positions.filter((position) => position.security.internalId === securityId)
  );

/**
 * Selector factory that creates a selector to filter positions by book ID
 */
export const selectPositionsByBookId = (bookId: string) =>
  createSelector([selectPositions], (positions) =>
    positions.filter((position) => position.bookId === bookId)
  );

/**
 * Selector factory that creates a selector to filter positions by counterparty ID
 */
export const selectPositionsByCounterpartyId = (counterpartyId: string) =>
  createSelector([selectPositions], (positions) =>
    positions.filter((position) => position.counterparty.counterpartyId === counterpartyId)
  );

/**
 * Selector factory that creates a selector to filter positions by aggregation unit ID
 */
export const selectPositionsByAggregationUnitId = (aggregationUnitId: string) =>
  createSelector([selectPositions], (positions) =>
    positions.filter((position) => position.aggregationUnit.aggregationUnitId === aggregationUnitId)
  );

/**
 * Selector factory that creates a selector to filter positions by business date
 */
export const selectPositionsByBusinessDate = (businessDate: string) =>
  createSelector([selectPositions], (positions) =>
    positions.filter((position) => position.businessDate === businessDate)
  );

/**
 * Selector factory that creates a selector to filter positions by position type
 */
export const selectPositionsByPositionType = (positionType: string) =>
  createSelector([selectPositions], (positions) =>
    positions.filter((position) => position.positionType === positionType)
  );

/**
 * Selector that returns positions with positive contractual quantity
 */
export const selectLongPositions = createSelector([selectPositions], (positions) =>
  positions.filter((position) => position.contractualQty > 0)
);

/**
 * Selector that returns positions with negative contractual quantity
 */
export const selectShortPositions = createSelector([selectPositions], (positions) =>
  positions.filter((position) => position.contractualQty < 0)
);

/**
 * Selector that returns positions that are hypothecatable
 */
export const selectHypothecatablePositions = createSelector([selectPositions], (positions) =>
  positions.filter((position) => position.isHypothecatable)
);

/**
 * Selector that returns positions that are reserved
 */
export const selectReservedPositions = createSelector([selectPositions], (positions) =>
  positions.filter((position) => position.isReserved)
);

/**
 * Selector that calculates the total market value of long positions
 */
export const selectTotalLongValue = createSelector([selectLongPositions], (positions) =>
  positions.reduce((sum, position) => sum + position.marketValue, 0)
);

/**
 * Selector that calculates the total market value of short positions
 */
export const selectTotalShortValue = createSelector([selectShortPositions], (positions) =>
  positions.reduce((sum, position) => sum + position.marketValue, 0)
);

/**
 * Selector that calculates the net market value of all positions
 */
export const selectNetPositionValue = createSelector(
  [selectTotalLongValue, selectTotalShortValue],
  (longValue, shortValue) => longValue - Math.abs(shortValue)
);

/**
 * Selector that groups positions by book ID and returns totals for each book
 */
export const selectPositionsByBook = createSelector([selectPositions], (positions) => {
  const byBook: Record<string, { count: number; value: number; netQuantity: number }> = {};
  
  positions.forEach((position) => {
    if (!byBook[position.bookId]) {
      byBook[position.bookId] = { count: 0, value: 0, netQuantity: 0 };
    }
    
    byBook[position.bookId].count += 1;
    byBook[position.bookId].value += position.marketValue;
    byBook[position.bookId].netQuantity += position.contractualQty;
  });
  
  return byBook;
});

/**
 * Selector that returns positions filtered by the current filter criteria
 */
export const selectFilteredPositions = createSelector(
  [selectPositions, selectPositionFilters],
  (positions, filters) => {
    return positions.filter((position) => {
      // Apply each filter criterion if it exists
      if (filters.securityId && position.security.internalId !== filters.securityId) {
        return false;
      }
      
      if (filters.bookId && position.bookId !== filters.bookId) {
        return false;
      }
      
      if (filters.counterpartyId && position.counterparty.counterpartyId !== filters.counterpartyId) {
        return false;
      }
      
      if (filters.aggregationUnitId && position.aggregationUnit.aggregationUnitId !== filters.aggregationUnitId) {
        return false;
      }
      
      if (filters.positionType && position.positionType !== filters.positionType) {
        return false;
      }
      
      if (filters.businessDate && position.businessDate !== filters.businessDate) {
        return false;
      }
      
      if (filters.isHypothecatable !== null && position.isHypothecatable !== filters.isHypothecatable) {
        return false;
      }
      
      if (filters.isReserved !== null && position.isReserved !== filters.isReserved) {
        return false;
      }
      
      return true;
    });
  }
);

/**
 * Selector that calculates the settlement ladder for the next 5 days
 */
export const selectSettlementLadder = createSelector([selectPositions], (positions) => {
  // Create a settlement ladder for the next 5 days
  const today = new Date();
  const settlementLadder = [];
  
  // Calculate totals for current day and next 4 days
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    let deliveries = 0;
    let receipts = 0;
    
    positions.forEach((position) => {
      // Sum the appropriate SD fields based on the day
      if (i === 0) {
        deliveries += position.sd0Deliver;
        receipts += position.sd0Receipt;
      } else if (i === 1) {
        deliveries += position.sd1Deliver;
        receipts += position.sd1Receipt;
      } else if (i === 2) {
        deliveries += position.sd2Deliver;
        receipts += position.sd2Receipt;
      } else if (i === 3) {
        deliveries += position.sd3Deliver;
        receipts += position.sd3Receipt;
      } else if (i === 4) {
        deliveries += position.sd4Deliver;
        receipts += position.sd4Receipt;
      }
    });
    
    const net = receipts - deliveries;
    // Calculate projected position as the sum of all settled quantities plus the net settlement for this day
    const projectedPosition = positions.reduce((sum, position) => 
      sum + position.settledQty, 0) + net;
    
    settlementLadder.push({
      date: dateStr,
      deliveries,
      receipts,
      net,
      projectedPosition
    });
  }
  
  return settlementLadder;
});

/**
 * Selector factory that creates a selector to return the top N securities by market value
 */
export const selectTopSecuritiesByValue = (limit: number) => 
  createSelector([selectPositions], (positions) => {
    return [...positions]
      .sort((a, b) => Math.abs(b.marketValue) - Math.abs(a.marketValue))
      .slice(0, limit);
  });