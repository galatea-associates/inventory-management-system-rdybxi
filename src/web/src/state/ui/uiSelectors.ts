import { createSelector } from '@reduxjs/toolkit';
import { RootState, UIState, UserPreferences } from '../../types/state';

/**
 * Base selector that returns the entire UI state slice
 */
export const selectUIState = (state: RootState): UIState => state.ui;

/**
 * Selector for the current theme setting
 */
export const selectTheme = (state: RootState): string => state.ui.theme;

/**
 * Selector for the sidebar open state
 */
export const selectSidebarOpen = (state: RootState): boolean => state.ui.sidebarOpen;

/**
 * Selector for the currently active modal
 */
export const selectActiveModal = (state: RootState): string | null => state.ui.activeModal;

/**
 * Selector for the data associated with the active modal
 */
export const selectModalData = (state: RootState): any => state.ui.modalData;

/**
 * Selector for all user preferences
 */
export const selectUserPreferences = (state: RootState): UserPreferences => state.ui.preferences;

/**
 * Memoized selector for the user's language preference
 * Uses createSelector for performance optimization to prevent unnecessary re-renders
 */
export const selectLanguage = createSelector(
  selectUserPreferences,
  (userPreferences) => userPreferences.language
);

/**
 * Memoized selector for the user's date format preference
 * Uses createSelector for performance optimization
 */
export const selectDateFormat = createSelector(
  selectUserPreferences,
  (userPreferences) => userPreferences.defaultDateFormat
);

/**
 * Memoized selector for the user's time format preference
 * Uses createSelector for performance optimization
 */
export const selectTimeFormat = createSelector(
  selectUserPreferences,
  (userPreferences) => userPreferences.defaultTimeFormat
);

/**
 * Memoized selector for the user's number format preference
 * Uses createSelector for performance optimization
 */
export const selectNumberFormat = createSelector(
  selectUserPreferences,
  (userPreferences) => userPreferences.defaultCurrency // Using defaultCurrency as number format
);

/**
 * Memoized selector for the user's default page size preference
 * Uses createSelector for performance optimization
 */
export const selectDefaultPageSize = createSelector(
  selectUserPreferences,
  (userPreferences) => userPreferences.defaultPageSize
);

/**
 * Memoized selector for the user's dashboard layout configuration
 * Uses createSelector for performance optimization
 */
export const selectDashboardLayout = createSelector(
  selectUserPreferences,
  (userPreferences) => userPreferences.dashboardLayout
);

/**
 * Memoized selector factory for a specific table configuration
 * Returns a function that accepts the state and returns the configuration for the specified table
 * 
 * @param tableId - The ID of the table to get configuration for
 * @returns A selector function that returns the table configuration
 */
export const selectTableConfiguration = (tableId: string) => (state: RootState) => {
  const userPreferences = selectUserPreferences(state);
  return (userPreferences as any).tableConfigurations?.[tableId] || {};
};

/**
 * Selector for the current system status
 */
export const selectSystemStatus = (state: RootState) => state.ui.systemStatus;

/**
 * Selector for recent activity items
 */
export const selectRecentActivity = (state: RootState) => state.ui.recentActivity;

/**
 * Selector for the current confirmation dialog state
 * Note: This accesses a field not defined in the current UIState interface
 */
export const selectConfirmDialog = (state: RootState) => (state.ui as any).confirmDialog;