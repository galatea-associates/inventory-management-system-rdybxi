import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit
import { Notification, Alert } from '../../types/models';
import { NotificationsState } from '../../types/state';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES, NOTIFICATION_STORAGE_KEY, NOTIFICATION_MAX_AGE } from '../../constants/notifications';
import { client } from '../../api';

/**
 * Async thunk for fetching user notifications from the API
 * @returns Promise resolving to an array of notifications
 */
export const fetchNotifications = createAsyncThunk<Notification[]>(
  'notifications/fetchNotifications',
  async () => {
    try {
      // Make API call to get notifications
      const notifications = await client.get<Notification[]>('/notifications');
      return notifications;
    } catch (error: any) {
      // Handle errors by rejecting with error message
      return Promise.reject(error.message);
    }
  }
);

/**
 * Async thunk for fetching system alerts from the API
 * @returns Promise resolving to an array of system alerts
 */
export const fetchAlerts = createAsyncThunk<Alert[]>(
  'notifications/fetchAlerts',
  async () => {
    try {
      // Make API call to get alerts
      const alerts = await client.get<Alert[]>('/alerts');
      return alerts;
    } catch (error: any) {
      // Handle errors by rejecting with error message
      return Promise.reject(error.message);
    }
  }
);

/**
 * Async thunk for marking a notification as read
 * @param notificationId 
 * @returns Promise resolving to the notification ID
 */
export const markNotificationAsRead = createAsyncThunk<string, string>(
  'notifications/markNotificationAsRead',
  async (notificationId: string) => {
    try {
      // Make API call to mark notification as read
      await client.put(`/notifications/${notificationId}/read`);
      return notificationId;
    } catch (error: any) {
      // Handle errors by rejecting with error message
      return Promise.reject(error.message);
    }
  }
);

/**
 * Async thunk for marking all notifications as read
 * @returns Promise resolving when all notifications are marked as read
 */
export const markAllNotificationsAsRead = createAsyncThunk<void>(
  'notifications/markAllNotificationsAsRead',
  async () => {
    try {
      // Make API call to mark all notifications as read
      await client.put('/notifications/read-all');
      return;
    } catch (error: any) {
      // Handle errors by rejecting with error message
      return Promise.reject(error.message);
    }
  }
);

/**
 * Async thunk for dismissing a notification
 * @param notificationId 
 * @returns Promise resolving to the notification ID
 */
export const dismissNotification = createAsyncThunk<string, string>(
  'notifications/dismissNotification',
  async (notificationId: string) => {
    try {
      // Make API call to dismiss notification
      await client.put(`/notifications/${notificationId}/dismiss`);
      return notificationId;
    } catch (error: any) {
      // Handle errors by rejecting with error message
      return Promise.reject(error.message);
    }
  }
);

/**
 * Helper function to load notifications from local storage
 * @returns Array of notifications from local storage
 */
const loadStoredNotifications = (): Notification[] => {
  try {
    // Retrieve notifications from localStorage
    const storedNotifications = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (storedNotifications) {
      // Parse the JSON string to an array of notifications
      const notifications: Notification[] = JSON.parse(storedNotifications);

      // Filter out expired notifications based on NOTIFICATION_MAX_AGE
      const validNotifications = notifications.filter(notification => {
        const notificationAge = new Date().getTime() - new Date(notification.timestamp).getTime();
        return notificationAge <= NOTIFICATION_MAX_AGE;
      });

      return validNotifications;
    }
  } catch (error) {
    console.error("Error loading notifications from local storage:", error);
  }
  // Return an empty array if none found
  return [];
};

/**
 * Helper function to save notifications to local storage
 * @param notifications 
 */
const saveNotificationsToStorage = (notifications: Notification[]): void => {
  try {
    // Convert notifications array to JSON string
    const notificationsString = JSON.stringify(notifications);
    // Save to localStorage
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, notificationsString);
  } catch (error) {
    console.error("Error saving notifications to local storage:", error);
  }
};

// Initial state for the notifications slice
const initialState: NotificationsState = {
  notifications: loadStoredNotifications(),
  unreadCount: 0,
  isLoading: false,
  error: null,
  alerts: [],
};

// Redux slice for notifications state management
export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      // Add the new notification to the state
      state.notifications.push(action.payload);
      // Increment the unread count
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
      // Save notifications to local storage
      saveNotificationsToStorage(state.notifications);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      // Remove the notification from the state
      state.notifications = state.notifications.filter(notification => notification.id !== action.payload);
      // Recalculate the unread count
      state.unreadCount = state.notifications.filter(notification => !notification.isRead).length;
      // Save notifications to local storage
      saveNotificationsToStorage(state.notifications);
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      // Mark the notification as read
      const notification = state.notifications.find(notification => notification.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        // Decrement the unread count
        state.unreadCount -= 1;
        // Save notifications to local storage
        saveNotificationsToStorage(state.notifications);
      }
    },
    markAllAsRead: (state) => {
      // Mark all notifications as read
      state.notifications.forEach(notification => {
        notification.isRead = true;
      });
      // Reset the unread count
      state.unreadCount = 0;
      // Save notifications to local storage
      saveNotificationsToStorage(state.notifications);
    },
    clearNotifications: (state) => {
      // Clear all notifications from the state
      state.notifications = [];
      // Reset the unread count
      state.unreadCount = 0;
      // Clear notifications from local storage
      localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
    },
    addAlert: (state, action: PayloadAction<Alert>) => {
      // Add the new alert to the state
      state.alerts.push(action.payload);
    },
    removeAlert: (state, action: PayloadAction<string>) => {
      // Remove the alert from the state
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
    },
    clearAlerts: (state) => {
      // Clear all alerts from the state
      state.alerts = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<Notification[]>) => {
        state.isLoading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter(notification => !notification.isRead).length;
        saveNotificationsToStorage(state.notifications);
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch notifications';
      })
      .addCase(fetchAlerts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action: PayloadAction<Alert[]>) => {
        state.isLoading = false;
        state.alerts = action.payload;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch alerts';
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action: PayloadAction<string>) => {
        const notification = state.notifications.find(notification => notification.id === action.payload);
        if (notification) {
          notification.isRead = true;
          state.unreadCount -= 1;
          saveNotificationsToStorage(state.notifications);
        }
      })
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map(notification => ({ ...notification, isRead: true }));
        state.unreadCount = 0;
        saveNotificationsToStorage(state.notifications);
      })
      .addCase(dismissNotification.fulfilled, (state, action: PayloadAction<string>) => {
        state.notifications = state.notifications.filter(notification => notification.id !== action.payload);
        state.unreadCount = state.notifications.filter(notification => !notification.isRead).length;
        saveNotificationsToStorage(state.notifications);
      });
  },
});

// Action creators for notification state management
export const {
  addNotification,
  removeNotification,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  addAlert,
  removeAlert,
  clearAlerts
} = notificationsSlice.actions;

// Async thunks for notification API interactions
export const {
  fetchNotifications,
  fetchAlerts,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification
} = {
    fetchNotifications,
    fetchAlerts,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    dismissNotification
};

// Default export of the notifications reducer
export default notificationsSlice.reducer;