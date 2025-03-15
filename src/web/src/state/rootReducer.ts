import { combineReducers } from 'redux'; // redux ^4.2.1
import authReducer from './auth/authSlice';
import positionsReducer from './positions/positionsSlice';
import inventoryReducer from './inventory/inventorySlice';
import locatesReducer from './locates/locatesSlice';
import ordersReducer from './orders/ordersSlice';
import rulesReducer from './rules/rulesSlice';
import exceptionsReducer from './exceptions/exceptionsSlice';
import uiReducer from './ui/uiSlice';
import notificationsReducer from './notifications/notificationsSlice';

/**
 * Root reducer for the Inventory Management System frontend.
 * This file combines all feature-specific reducers into a single root reducer
 * using Redux's combineReducers utility. It serves as the central point
 * for state management, bringing together authentication, positions,
 * inventory, locates, orders, rules, exceptions, UI, and notifications state slices.
 * 
 * Requirements Addressed:
 * - State Management: Implements Redux for predictable state container for managing complex application state
 * - Component Architecture: Supports structured state management with clear separation of concerns through modular reducers
 * - Performance Optimization: Enables efficient state updates through modular reducer structure
 */

/**
 * Combined reducer created using Redux's combineReducers utility
 */
const rootReducer = combineReducers({
  /**
   * Manages authentication state including user session, tokens, and MFA
   */
  auth: authReducer,
  /**
   * Manages position data, filters, and calculations
   */
  positions: positionsReducer,
  /**
   * Manages inventory availability data and calculations
   */
  inventory: inventoryReducer,
  /**
   * Manages locate requests, approvals, and rejections
   */
  locates: locatesReducer,
  /**
   * Manages order data and validation
   */
  orders: ordersReducer,
  /**
   * Manages calculation rules for different markets
   */
  rules: rulesReducer,
  /**
   * Manages system exceptions and their resolution
   */
  exceptions: exceptionsReducer,
  /**
   * Manages UI state like theme, sidebar, and modals
   */
  ui: uiReducer,
  /**
   * Manages user notifications and system alerts
   */
  notifications: notificationsReducer,
});

/**
 * Export the combined root reducer as the default export
 */
export default rootReducer;