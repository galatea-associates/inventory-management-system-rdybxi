import { useState, useEffect, useCallback, useMemo, useRef } from 'react'; // react ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // react-redux ^8.0.5
import { v4 as uuidv4 } from 'uuid'; // uuid ^9.0.0
import { Notification, NotificationFilters } from '../types/state';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_SOURCES,
  NOTIFICATION_DURATIONS,
  NOTIFICATION_STORAGE_KEY,
  NOTIFICATION_WEBSOCKET_EVENTS,
  NOTIFICATION_MAX_AGE
} from '../constants/notifications';
import { NotificationService } from '../services/notification.service';
import { fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead, dismissNotification, addNotification, addLocalNotification, updateNotification, removeNotification } from '../state/notifications/notificationsSlice';
import { debug, info, warn, error } from '../utils/logger';

/**
 * @interface NotificationOptions
 * @description Options for creating notifications
 * @property {string?} priority - Notification priority
 * @property {string?} source - Notification source
 * @property {string?} link - Notification link
 * @property {Record<string, any>?} data - Additional data
 * @property {number?} autoHideDuration - Auto hide duration
 * @property {boolean?} persist - Persist notification
 */
interface NotificationOptions {
  priority?: string;
  source?: string;
  link?: string;
  data?: Record<string, any>;
  autoHideDuration?: number;
  persist?: boolean;
}

/**
 * @interface UseNotificationResult
 * @description Return type of the useNotification hook
 * @property {Notification[]} notifications - Array of notifications
 * @property {Notification[]} unreadNotifications - Array of unread notifications
 * @property {boolean} isLoading - Loading state
 * @property {string | null} error - Error message
 * @property {function} fetchNotifications - Function to fetch notifications
 * @property {function} fetchUnreadCount - Function to fetch unread notification count
 * @property {function} showNotification - Function to show a notification
 * @property {function} showSuccess - Function to show a success notification
 * @property {function} showError - Function to show an error notification
 * @property {function} showWarning - Function to show a warning notification
 * @property {function} showInfo - Function to show an info notification
 * @property {function} dismissNotification - Function to dismiss a notification
 * @property {function} markAsRead - Function to mark a notification as read
 * @property {function} markAllAsRead - Function to mark all notifications as read
 * @property {function} getNotificationById - Function to get a notification by ID
 * @property {function} clearAll - Function to clear all notifications
 */
interface UseNotificationResult {
  notifications: Notification[];
  unreadNotifications: Notification[];
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => void;
  fetchUnreadCount: () => void;
  showNotification: (type: string, title: string, message: string, options?: NotificationOptions) => void;
  showSuccess: (title: string, message: string, options?: NotificationOptions) => void;
  showError: (title: string, message: string, options?: NotificationOptions) => void;
  showWarning: (title: string, message: string, options?: NotificationOptions) => void;
  showInfo: (title: string, message: string, options?: NotificationOptions) => void;
  dismissNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getNotificationById: (id: string) => Notification | undefined;
  clearAll: () => void;
}

/**
 * Retrieves notifications from local storage
 * @returns {Notification[]} Array of notifications from local storage
 */
export const getLocalNotifications = (): Notification[] => {
  try {
    // Retrieve notifications from local storage using NOTIFICATION_STORAGE_KEY
    const storedNotifications = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (storedNotifications) {
      // Parse the JSON string into an array of notifications
      return JSON.parse(storedNotifications) as Notification[];
    }
  } catch (err) {
    error('Failed to load notifications from local storage:', err);
  }
  // Return the parsed notifications or an empty array if none exist or parsing fails
  return [];
};

/**
 * Saves notifications to local storage
 * @param {Notification[]} notifications
 * @returns {void} No return value
 */
export const saveLocalNotifications = (notifications: Notification[]): void => {
  try {
    // Convert the notifications array to a JSON string
    const notificationsJson = JSON.stringify(notifications);
    // Save the JSON string to local storage using NOTIFICATION_STORAGE_KEY
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, notificationsJson);
  } catch (err) {
    error('Failed to save notifications to local storage:', err);
  }
};

/**
 * Creates a notification stored only in local storage
 * @param {object} { type: string; title: string; message: string; priority?: string; source?: string; link?: string; data?: Record<string, any> }
 * @returns {Notification} The created local notification
 */
export const createLocalNotification = ({ type, title, message, priority, source, link, data }: { type: string; title: string; message: string; priority?: string; source?: string; link?: string; data?: Record<string, any> }): Notification => {
  // Validate notification parameters
  if (!type || !title || !message) {
    throw new Error('Notification type, title, and message are required');
  }

  // Set default values for optional parameters
  const notificationPriority = priority || NOTIFICATION_PRIORITIES.MEDIUM;
  const notificationSource = source || NOTIFICATION_SOURCES.SYSTEM;

  // Generate a unique ID using uuidv4
  const id = uuidv4();

  // Create notification object with isRead set to false and current timestamp
  const notification: Notification = {
    id,
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    isRead: false,
    priority: notificationPriority,
    link: link || null,
    relatedEntityType: data?.entityType || null,
    relatedEntityId: data?.entityId || null,
  };

  // Return the created notification
  return notification;
};

/**
 * Removes notifications older than the maximum age
 */
const cleanupOldNotifications = (): void => {
  // Get existing notifications from local storage
  const notifications = getLocalNotifications();

  // Calculate the cutoff date based on NOTIFICATION_MAX_AGE
  const cutoffDate = Date.now() - NOTIFICATION_MAX_AGE;

  // Filter out notifications older than the cutoff date
  const filteredNotifications = notifications.filter(notification => {
    return new Date(notification.timestamp).getTime() >= cutoffDate;
  });

  // Save the filtered array to local storage
  saveLocalNotifications(filteredNotifications);
};

/**
 * Custom hook that provides notification functionality for the application
 */
export const useNotification = (): UseNotificationResult => {
  // Initialize notification service instance
  const notificationService = useMemo(() => new NotificationService(), []);

  // Get notification state from Redux store
  const notifications = useSelector((state: any) => state.notifications.notifications);
  const unreadCount = useSelector((state: any) => state.notifications.unreadCount);
  const isLoading = useSelector((state: any) => state.notifications.isLoading);
  const error = useSelector((state: any) => state.notifications.error);

  // Set up local state for notifications
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  // Redux dispatch
  const dispatch = useDispatch();

  // Create function to fetch notifications from server
  const fetchNotificationsFromServer = useCallback(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  // Create function to fetch unread notification count
  const fetchUnreadNotificationCount = useCallback(() => {
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  // Create function to mark a notification as read
  const markNotificationAsRead = useCallback((id: string) => {
    dispatch(markAsRead(id));
  }, [dispatch]);

  // Create function to mark all notifications as read
  const markAllNotificationsAsReadAction = useCallback(() => {
    dispatch(markAllAsRead());
  }, [dispatch]);

  // Create function to dismiss a notification
  const dismissNotificationAction = useCallback((id: string) => {
    dispatch(dismissNotification(id));
  }, [dispatch]);

  // Create function to show a notification with specified type and options
  const showNotification = useCallback((type: string, title: string, message: string, options: NotificationOptions = {}) => {
    const notification = createLocalNotification({ type, title, message, ...options });
    dispatch(addNotification(notification));
  }, [dispatch]);

  // Create specialized functions for different notification types (success, error, warning, info)
  const showSuccess = useCallback((title: string, message: string, options?: NotificationOptions) => {
    showNotification(NOTIFICATION_TYPES.SUCCESS, title, message, options);
  }, [showNotification]);

  const showError = useCallback((title: string, message: string, options?: NotificationOptions) => {
    showNotification(NOTIFICATION_TYPES.ERROR, title, message, options);
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string, options?: NotificationOptions) => {
    showNotification(NOTIFICATION_TYPES.WARNING, title, message, options);
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string, options?: NotificationOptions) => {
    showNotification(NOTIFICATION_TYPES.INFO, title, message, options);
  }, [showNotification]);

  // Create function to get a notification by ID
  const getNotificationById = useCallback((id: string): Notification | undefined => {
    return notifications.find(notification => notification.id === id);
  }, [notifications]);

  // Create function to clear all notifications
  const clearAllNotifications = useCallback(() => {
    dispatch(clearNotifications());
  }, [dispatch]);

  // Set up effect to load local notifications on mount
  useEffect(() => {
    const storedNotifications = getLocalNotifications();
    setLocalNotifications(storedNotifications);
  }, []);

  // Set up effect to clean up old notifications periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      cleanupOldNotifications();
    }, NOTIFICATION_MAX_AGE);

    return () => clearInterval(intervalId);
  }, []);

  // Return notification state and functions
  return {
    notifications,
    unreadNotifications: notifications.filter(notification => !notification.isRead),
    isLoading,
    error,
    fetchNotifications: fetchNotificationsFromServer,
    fetchUnreadCount: fetchUnreadNotificationCount,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissNotification: dismissNotificationAction,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsReadAction,
    getNotificationById,
    clearAll: clearAllNotifications,
  };
};