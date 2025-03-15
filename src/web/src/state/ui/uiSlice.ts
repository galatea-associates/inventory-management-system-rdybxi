import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.3
import { UIState, UserPreferences, SystemStatus, ActivityItem } from '../../types/state';

/**
 * Interface for confirmation dialog state
 */
interface ConfirmDialogState {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmButtonColor?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * Extended UI state interface with confirmation dialog support
 */
interface ExtendedUIState extends UIState {
  confirmDialog: ConfirmDialogState | null;
}

/**
 * Initial state for the UI slice
 */
const initialState: ExtendedUIState = {
  theme: 'system', // Default theme follows system preference
  sidebarOpen: true, // Sidebar is open by default
  activeModal: null,
  modalData: null,
  preferences: {
    defaultDateFormat: 'MM/DD/YYYY',
    defaultTimeFormat: 'h:mm A',
    defaultPageSize: 10,
    defaultCurrency: 'USD',
    dashboardLayout: {},
    language: 'en',
    notifications: {
      email: true,
      inApp: true,
      desktop: true,
      locateApprovals: true,
      exceptions: true,
      systemAlerts: true
    }
  },
  systemStatus: null,
  recentActivity: [],
  confirmDialog: null
};

/**
 * UI slice for managing UI-related state including theme, sidebar,
 * modals, user preferences, and system status
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Sets the application theme (light, dark, system)
     */
    setTheme: (state, action: PayloadAction<string>) => {
      state.theme = action.payload;
    },
    
    /**
     * Toggles the sidebar open/closed state
     */
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    
    /**
     * Sets the sidebar open state explicitly
     */
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    
    /**
     * Opens a modal with the specified ID
     */
    openModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
    },
    
    /**
     * Closes the currently active modal
     */
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },
    
    /**
     * Sets data associated with the active modal
     */
    setModalData: (state, action: PayloadAction<any>) => {
      state.modalData = action.payload;
    },
    
    /**
     * Updates user preferences with partial data
     */
    updateUserPreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload
      };
    },
    
    /**
     * Updates the system status information
     */
    setSystemStatus: (state, action: PayloadAction<SystemStatus | null>) => {
      state.systemStatus = action.payload;
    },
    
    /**
     * Adds an activity item to the recent activity list
     */
    addRecentActivity: (state, action: PayloadAction<ActivityItem>) => {
      // Add to the beginning of the array and limit to 10 items
      state.recentActivity = [action.payload, ...state.recentActivity.slice(0, 9)];
    },
    
    /**
     * Clears all recent activity items
     */
    clearRecentActivity: (state) => {
      state.recentActivity = [];
    },
    
    /**
     * Opens a confirmation dialog with specified options
     */
    openConfirmDialog: (state, action: PayloadAction<ConfirmDialogState>) => {
      state.confirmDialog = action.payload;
    },
    
    /**
     * Closes the confirmation dialog
     */
    closeConfirmDialog: (state) => {
      state.confirmDialog = null;
    }
  }
});

// Export actions for components to use
export const { 
  setTheme, 
  toggleSidebar, 
  setSidebarOpen, 
  openModal, 
  closeModal, 
  setModalData, 
  updateUserPreferences, 
  setSystemStatus, 
  addRecentActivity, 
  clearRecentActivity,
  openConfirmDialog,
  closeConfirmDialog
} = uiSlice.actions;

// Export reducer as default for use in the store
export default uiSlice.reducer;