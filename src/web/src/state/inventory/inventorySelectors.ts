import { createSelector } from 'reselect'; // version 4.2
import { RootState, InventoryState, InventoryFilters, InventorySummary, TopSecurityItem } from '../../types/state';
import { Inventory } from '../../types/models';

/**
 * Base selector that returns the inventory slice of the Redux state
 */
export const selectInventoryState = (state: RootState): InventoryState => state.inventory;

/**
 * Selector that returns the list of inventories
 */
export const selectInventories = createSelector(
  [selectInventoryState],
  (inventory) => inventory.inventories
);

/**
 * Selector that returns the currently selected inventory
 */
export const selectSelectedInventory = createSelector(
  [selectInventoryState],
  (inventory) => inventory.selectedInventory
);

/**
 * Selector that returns whether inventory data is currently loading
 */
export const selectInventoryLoading = createSelector(
  [selectInventoryState],
  (inventory) => inventory.isLoading
);

/**
 * Selector that returns any error related to inventory data
 */
export const selectInventoryError = createSelector(
  [selectInventoryState],
  (inventory) => inventory.error
);

/**
 * Selector that returns the current inventory filters
 */
export const selectInventoryFilters = createSelector(
  [selectInventoryState],
  (inventory) => inventory.filters
);

/**
 * Selector that returns the pagination state for inventories
 */
export const selectInventoryPagination = createSelector(
  [selectInventoryState],
  (inventory) => inventory.pagination
);

/**
 * Selector that returns the inventory summary metrics
 */
export const selectInventorySummary = createSelector(
  [selectInventoryState],
  (inventory) => inventory.summary
);

/**
 * Selector that returns the top securities by availability
 */
export const selectTopSecurities = createSelector(
  [selectInventoryState],
  (inventory) => inventory.topSecurities
);

/**
 * Selector factory that creates a selector to filter inventories by security ID
 */
export const selectInventoriesBySecurityId = (securityId: string) =>
  createSelector(
    [selectInventories],
    (inventories) => inventories.filter((inventory) => inventory.security.internalId === securityId)
  );

/**
 * Selector factory that creates a selector to filter inventories by counterparty ID
 */
export const selectInventoriesByCounterpartyId = (counterpartyId: string) =>
  createSelector(
    [selectInventories],
    (inventories) => inventories.filter((inventory) => inventory.counterparty.counterpartyId === counterpartyId)
  );

/**
 * Selector factory that creates a selector to filter inventories by aggregation unit ID
 */
export const selectInventoriesByAggregationUnitId = (aggregationUnitId: string) =>
  createSelector(
    [selectInventories],
    (inventories) => inventories.filter((inventory) => inventory.aggregationUnit.aggregationUnitId === aggregationUnitId)
  );

/**
 * Selector factory that creates a selector to filter inventories by business date
 */
export const selectInventoriesByBusinessDate = (businessDate: string) =>
  createSelector(
    [selectInventories],
    (inventories) => inventories.filter((inventory) => inventory.businessDate === businessDate)
  );

/**
 * Selector factory that creates a selector to filter inventories by calculation type
 */
export const selectInventoriesByCalculationType = (calculationType: string) =>
  createSelector(
    [selectInventories],
    (inventories) => inventories.filter((inventory) => inventory.calculationType === calculationType)
  );

/**
 * Selector that returns inventories with 'FOR_LOAN' calculation type
 */
export const selectForLoanInventories = createSelector(
  [selectInventories],
  (inventories) => inventories.filter((inventory) => inventory.calculationType === 'FOR_LOAN')
);

/**
 * Selector that returns inventories with 'FOR_PLEDGE' calculation type
 */
export const selectForPledgeInventories = createSelector(
  [selectInventories],
  (inventories) => inventories.filter((inventory) => inventory.calculationType === 'FOR_PLEDGE')
);

/**
 * Selector factory that creates a selector to filter inventories by market
 */
export const selectInventoriesByMarket = (market: string) =>
  createSelector(
    [selectInventories],
    (inventories) => inventories.filter((inventory) => inventory.market === market)
  );

/**
 * Selector factory that creates a selector to filter inventories by security temperature
 */
export const selectInventoriesBySecurityTemperature = (securityTemperature: string) =>
  createSelector(
    [selectInventories],
    (inventories) => inventories.filter((inventory) => inventory.securityTemperature === securityTemperature)
  );

/**
 * Selector that returns inventories with 'HARD_TO_BORROW' security temperature
 */
export const selectHardToBorrowInventories = createSelector(
  [selectInventories],
  (inventories) => inventories.filter((inventory) => inventory.securityTemperature === 'HARD_TO_BORROW')
);

/**
 * Selector that returns inventories with 'GENERAL_COLLATERAL' security temperature
 */
export const selectGeneralCollateralInventories = createSelector(
  [selectInventories],
  (inventories) => inventories.filter((inventory) => inventory.securityTemperature === 'GENERAL_COLLATERAL')
);

/**
 * Selector that returns inventories from external sources
 */
export const selectExternalSourceInventories = createSelector(
  [selectInventories],
  (inventories) => inventories.filter((inventory) => inventory.isExternalSource)
);

/**
 * Selector that calculates the total market value of for-loan inventories
 */
export const selectTotalForLoanValue = createSelector(
  [selectForLoanInventories],
  (inventories) => inventories.reduce((sum, inventory) => sum + inventory.marketValue, 0)
);

/**
 * Selector that calculates the total market value of for-pledge inventories
 */
export const selectTotalForPledgeValue = createSelector(
  [selectForPledgeInventories],
  (inventories) => inventories.reduce((sum, inventory) => sum + inventory.marketValue, 0)
);

/**
 * Selector that calculates the total market value of hard-to-borrow inventories
 */
export const selectTotalHardToBorrowValue = createSelector(
  [selectHardToBorrowInventories],
  (inventories) => inventories.reduce((sum, inventory) => sum + inventory.marketValue, 0)
);

/**
 * Selector that groups inventories by market and returns totals for each market
 */
export const selectInventoriesByMarketGroup = createSelector(
  [selectInventories],
  (inventories) => {
    return inventories.reduce((grouped, inventory) => {
      const market = inventory.market;
      if (!grouped[market]) {
        grouped[market] = { count: 0, value: 0, availableQuantity: 0 };
      }
      grouped[market].count += 1;
      grouped[market].value += inventory.marketValue;
      grouped[market].availableQuantity += inventory.availableQuantity;
      return grouped;
    }, {} as Record<string, { count: number; value: number; availableQuantity: number }>);
  }
);

/**
 * Selector that groups inventories by calculation type and returns totals for each type
 */
export const selectInventoriesByCalculationTypeGroup = createSelector(
  [selectInventories],
  (inventories) => {
    return inventories.reduce((grouped, inventory) => {
      const calculationType = inventory.calculationType;
      if (!grouped[calculationType]) {
        grouped[calculationType] = { count: 0, value: 0, availableQuantity: 0 };
      }
      grouped[calculationType].count += 1;
      grouped[calculationType].value += inventory.marketValue;
      grouped[calculationType].availableQuantity += inventory.availableQuantity;
      return grouped;
    }, {} as Record<string, { count: number; value: number; availableQuantity: number }>);
  }
);

/**
 * Selector that groups inventories by security temperature and returns totals for each temperature
 */
export const selectInventoriesByTemperatureGroup = createSelector(
  [selectInventories],
  (inventories) => {
    return inventories.reduce((grouped, inventory) => {
      const temperature = inventory.securityTemperature;
      if (!grouped[temperature]) {
        grouped[temperature] = { count: 0, value: 0, availableQuantity: 0 };
      }
      grouped[temperature].count += 1;
      grouped[temperature].value += inventory.marketValue;
      grouped[temperature].availableQuantity += inventory.availableQuantity;
      return grouped;
    }, {} as Record<string, { count: number; value: number; availableQuantity: number }>);
  }
);

/**
 * Selector that returns inventories filtered by the current filter criteria
 */
export const selectFilteredInventories = createSelector(
  [selectInventories, selectInventoryFilters],
  (inventories, filters) => {
    return inventories.filter((inventory) => {
      // Apply each filter if it exists
      if (filters.securityId && inventory.security.internalId !== filters.securityId) return false;
      if (filters.counterpartyId && inventory.counterparty.counterpartyId !== filters.counterpartyId) return false;
      if (filters.aggregationUnitId && inventory.aggregationUnit.aggregationUnitId !== filters.aggregationUnitId) return false;
      if (filters.calculationType && inventory.calculationType !== filters.calculationType) return false;
      if (filters.businessDate && inventory.businessDate !== filters.businessDate) return false;
      if (filters.market && inventory.market !== filters.market) return false;
      if (filters.securityTemperature && inventory.securityTemperature !== filters.securityTemperature) return false;
      if (filters.isExternalSource !== null && inventory.isExternalSource !== filters.isExternalSource) return false;
      
      return true;
    });
  }
);

/**
 * Selector factory that creates a selector to return the top N securities by available quantity
 */
export const selectTopSecuritiesByAvailability = (limit: number) =>
  createSelector(
    [selectInventories],
    (inventories) => {
      // Sort by availableQuantity in descending order
      const sorted = [...inventories].sort((a, b) => b.availableQuantity - a.availableQuantity);
      
      // Group by security ID and take the highest availability for each security
      const securityMap = new Map<string, Inventory>();
      sorted.forEach(inventory => {
        const securityId = inventory.security.internalId;
        if (!securityMap.has(securityId) || securityMap.get(securityId)!.availableQuantity < inventory.availableQuantity) {
          securityMap.set(securityId, inventory);
        }
      });
      
      // Convert back to array and limit to N items
      return Array.from(securityMap.values()).slice(0, limit);
    }
  );