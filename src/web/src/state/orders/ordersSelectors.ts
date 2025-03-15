import { createSelector } from 'reselect'; // v4.2
import { RootState, OrdersState, OrderFilters, OrderValidationResult, PaginationState } from '../../types/state';
import { Order } from '../../types/models';

/**
 * Base selector that returns the orders slice of the Redux state
 */
export const selectOrdersState = (state: RootState): OrdersState => state.orders;

/**
 * Selector that returns the list of orders
 */
export const selectOrders = createSelector(
  [selectOrdersState],
  (orders): Order[] => orders.orders
);

/**
 * Selector that returns the currently selected order
 */
export const selectSelectedOrder = createSelector(
  [selectOrdersState],
  (orders): Order | null => orders.selectedOrder
);

/**
 * Selector that returns whether order data is currently loading
 */
export const selectOrdersLoading = createSelector(
  [selectOrdersState],
  (orders): boolean => orders.isLoading
);

/**
 * Selector that returns whether an order is currently being submitted or validated
 */
export const selectOrdersSubmitting = createSelector(
  [selectOrdersState],
  (orders): boolean => orders.isSubmitting
);

/**
 * Selector that returns any error related to order data
 */
export const selectOrdersError = createSelector(
  [selectOrdersState],
  (orders): string | null => orders.error
);

/**
 * Selector that returns the current order filters
 */
export const selectOrderFilters = createSelector(
  [selectOrdersState],
  (orders): OrderFilters => orders.filters
);

/**
 * Selector that returns the pagination state for orders
 */
export const selectOrderPagination = createSelector(
  [selectOrdersState],
  (orders): PaginationState => orders.pagination
);

/**
 * Selector that returns the current order validation result
 */
export const selectOrderValidationResult = createSelector(
  [selectOrdersState],
  (orders): OrderValidationResult | null => orders.validationResult
);

/**
 * Selector factory that creates a selector to filter orders by security ID
 */
export const selectOrdersBySecurityId = (securityId: string) => 
  createSelector(
    [selectOrders],
    (orders): Order[] => orders.filter(order => order.security.internalId === securityId)
  );

/**
 * Selector factory that creates a selector to filter orders by buyer counterparty ID
 */
export const selectOrdersByBuyerCounterpartyId = (counterpartyId: string) => 
  createSelector(
    [selectOrders],
    (orders): Order[] => orders.filter(order => order.buyerCounterparty.counterpartyId === counterpartyId)
  );

/**
 * Selector factory that creates a selector to filter orders by seller counterparty ID
 */
export const selectOrdersBySellerCounterpartyId = (counterpartyId: string) => 
  createSelector(
    [selectOrders],
    (orders): Order[] => orders.filter(order => order.sellerCounterparty.counterpartyId === counterpartyId)
  );

/**
 * Selector factory that creates a selector to filter orders by book ID
 */
export const selectOrdersByBookId = (bookId: string) => 
  createSelector(
    [selectOrders],
    (orders): Order[] => orders.filter(order => order.bookId === bookId)
  );

/**
 * Selector factory that creates a selector to filter orders by side (buy/sell)
 */
export const selectOrdersBySide = (side: string) => 
  createSelector(
    [selectOrders],
    (orders): Order[] => orders.filter(order => order.side === side)
  );

/**
 * Selector factory that creates a selector to filter orders by order type
 */
export const selectOrdersByType = (orderType: string) => 
  createSelector(
    [selectOrders],
    (orders): Order[] => orders.filter(order => order.orderType === orderType)
  );

/**
 * Selector factory that creates a selector to filter orders by status
 */
export const selectOrdersByStatus = (status: string) => 
  createSelector(
    [selectOrders],
    (orders): Order[] => orders.filter(order => order.status === status)
  );

/**
 * Selector factory that creates a selector to filter orders by date range
 */
export const selectOrdersByDateRange = (startDate: string, endDate: string) => 
  createSelector(
    [selectOrders],
    (orders): Order[] => orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return orderDate >= start && orderDate <= end;
    })
  );

/**
 * Selector that returns all short sell orders
 */
export const selectShortSellOrders = createSelector(
  [selectOrders],
  (orders): Order[] => orders.filter(order => order.side === 'SELL' && order.orderType === 'SHORT_SELL')
);

/**
 * Selector that returns all long sell orders
 */
export const selectLongSellOrders = createSelector(
  [selectOrders],
  (orders): Order[] => orders.filter(order => order.side === 'SELL' && order.orderType === 'LONG_SELL')
);

/**
 * Selector that returns all buy orders
 */
export const selectBuyOrders = createSelector(
  [selectOrders],
  (orders): Order[] => orders.filter(order => order.side === 'BUY')
);

/**
 * Selector that returns all pending orders
 */
export const selectPendingOrders = createSelector(
  [selectOrders],
  (orders): Order[] => orders.filter(order => order.status === 'PENDING')
);

/**
 * Selector that returns all executed orders
 */
export const selectExecutedOrders = createSelector(
  [selectOrders],
  (orders): Order[] => orders.filter(order => order.status === 'EXECUTED')
);

/**
 * Selector that returns all cancelled orders
 */
export const selectCancelledOrders = createSelector(
  [selectOrders],
  (orders): Order[] => orders.filter(order => order.status === 'CANCELLED')
);

/**
 * Selector that returns all rejected orders
 */
export const selectRejectedOrders = createSelector(
  [selectOrders],
  (orders): Order[] => orders.filter(order => order.status === 'REJECTED')
);

/**
 * Selector that returns orders filtered by the current filter criteria
 */
export const selectFilteredOrders = createSelector(
  [selectOrders, selectOrderFilters],
  (orders, filters): Order[] => {
    return orders.filter(order => {
      // Apply each filter criterion if it exists in the filters object
      if (filters.securityId && order.security.internalId !== filters.securityId) {
        return false;
      }
      if (filters.buyerCounterpartyId && order.buyerCounterparty.counterpartyId !== filters.buyerCounterpartyId) {
        return false;
      }
      if (filters.sellerCounterpartyId && order.sellerCounterparty.counterpartyId !== filters.sellerCounterpartyId) {
        return false;
      }
      if (filters.side && order.side !== filters.side) {
        return false;
      }
      if (filters.orderType && order.orderType !== filters.orderType) {
        return false;
      }
      if (filters.status && order.status !== filters.status) {
        return false;
      }
      if (filters.bookId && order.bookId !== filters.bookId) {
        return false;
      }
      if (filters.fromDate && filters.toDate) {
        const orderDate = new Date(order.orderDate);
        const fromDate = new Date(filters.fromDate);
        const toDate = new Date(filters.toDate);
        if (orderDate < fromDate || orderDate > toDate) {
          return false;
        }
      }
      return true;
    });
  }
);

/**
 * Selector that returns orders with validation issues
 */
export const selectOrdersWithValidationIssues = createSelector(
  [selectOrders],
  (orders): Order[] => orders.filter(
    order => order.validation && order.validation.status !== 'APPROVED'
  )
);

/**
 * Selector factory that creates a selector to find an order by ID
 */
export const selectOrderById = (orderId: string) => 
  createSelector(
    [selectOrders],
    (orders): Order | undefined => orders.find(order => order.orderId === orderId)
  );