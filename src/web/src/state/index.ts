import { rootReducer } from './rootReducer';
import { store, AppDispatch, useAppDispatch, useAppSelector } from './store';
import { createWebSocketMiddleware, WEBSOCKET_ACTIONS } from './websocket/websocketMiddleware';
import { RootState } from '../types/state';

/**
 * Central export file for Redux state management in the Inventory Management System frontend.
 * This file aggregates and re-exports all state-related components including the store, reducers,
 * selectors, and typed hooks for use throughout the application.
 * 
 * Requirements Addressed:
 * - State Management: Implements Redux for predictable state container for managing complex application state
 * - Type Safety: Leverages TypeScript's type system for improved developer experience and better maintainability
 * - Component Architecture: Supports structured state management with clear separation of concerns
 */

/**
 * Export the configured Redux store instance for application use
 */
export { store };

/**
 * Export the combined root reducer for testing and store configuration
 */
export { rootReducer };

/**
 * Export the root state type for type-safe state access
 */
export type { RootState };

/**
 * Export the dispatch function type for typed dispatching
 */
export type { AppDispatch };

/**
 * Export typed useDispatch hook for components
 */
export { useAppDispatch };

/**
 * Export typed useSelector hook for components
 */
export { useAppSelector };

/**
 * Export WebSocket middleware factory for custom WebSocket configurations
 */
export { createWebSocketMiddleware };

/**
 * Export WebSocket action types for dispatching WebSocket-related actions
 */
export { WEBSOCKET_ACTIONS };