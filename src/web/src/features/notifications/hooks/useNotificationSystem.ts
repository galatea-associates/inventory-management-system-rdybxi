import { useState, useEffect, useCallback, useMemo, useRef } from 'react'; // react ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // react-redux ^8.0.5
import { v4 as uuidv4 } from 'uuid'; // uuid ^9.0.0
import { Notification, NotificationsState } from '../../../types/state';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_SOURCES,
  NOTIFICATION_DURATIONS,
} from '../../../constants/notifications';
import { notificationService } from '../../../services/notification.service';
import { useWebSocketConnection } from '../../websocket/hooks/useWebSocketConnection';
import {
  selectAllNotifications,
  selectUnreadNotifications,
  selectUnreadCount,
} from '../../../state/notifications/notificationsSelectors';
import {
  addNotification,
  markAsRead,
  dismissNotification,
} from '../../../state/notifications/notificationsSlice';
import {
  formatNotificationTitle,
  formatNotificationMessage,
  getPriorityColor,
  sortNotificationsByPriority,
  groupNotificationsByDate,
} from '../utils/notificationFormatters';

/**
 * @interface NotificationSystemOptions
 * @description Configuration options for the notification system hook
 * @property {boolean?} enableDesktopNotifications - Enable desktop notifications
 * @property {boolean?} autoRequestPermission - Automatically request permission for desktop notifications
 */
interface NotificationSystemOptions {
  enableDesktopNotifications?: boolean;
  autoRequestPermission?: boolean;
}

/**
 * @interface NotificationFilters
 * @description Filters for notification filtering
 * @property {string?} searchTerm - Search term for filtering notifications
 * @property {string?} type - Notification type for filtering notifications
 * @property {string?} priority - Notification priority for filtering notifications
 * @property {boolean?} unreadOnly - Filter for unread notifications only
 */
interface NotificationFilters {
  searchTerm?: string;
  type?: string;
  priority?: string;
  unreadOnly?: boolean;
}

/**
 * @interface UseNotificationSystemResult
 * @description Return type of the useNotificationSystem hook
 * @property {Notification[]} notifications - Array of notifications
 * @property {Notification[]} unreadNotifications - Array of unread notifications
 * @property {number} unreadCount - Number of unread notifications
 * @property {Record<string, Notification[]>} groupedNotifications - Grouped notifications object
 * @property {function} showNotification - Function to show a notification
 * @property {function} showSuccess - Function to show a success notification
 * @property {function} showError - Function to show an error notification
 * @property {function} showWarning - Function to show a warning notification
 * @property {function} showInfo - Function to show an info notification
 * @property {function} handleAction - Function to handle notification actions
 * @property {function} markAllAsRead - Function to mark all notifications as read
 * @property {function} filterNotifications - Function to filter notifications
 * @property {function} clearAll - Function to clear all notifications
 * @property {boolean} isDesktopNotificationsEnabled - Whether desktop notifications are enabled
 */
interface UseNotificationSystemResult {
  notifications: Notification[];
  unreadNotifications: Notification[];
  unreadCount: number;
  groupedNotifications: Record<string, Notification[]>;
  showNotification: (type: string, title: string, message: string, options?: NotificationSystemOptions) => void;
  showSuccess: (title: string, message: string, options?: NotificationSystemOptions) => void;
  showError: (title: string, message: string, options?: NotificationSystemOptions) => void;
  showWarning: (title: string, message: string, options?: NotificationSystemOptions) => void;
  showInfo: (title: string, message: string, options?: NotificationSystemOptions) => void;
  handleAction: (actionType: string, notificationId: string) => void;
  markAllAsRead: () => void;
  filterNotifications: (notifications: Notification[], filters: NotificationFilters) => Notification[];
  clearAll: () => void;
  isDesktopNotificationsEnabled: boolean;
}

/**
 * Creates a notification object with proper formatting and defaults
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} options - Optional parameters
 * @returns {Notification} Formatted notification object
 */
const createNotification = (
  type: string,
  title: string,
  message: string,
  options: any = {}
): Notification => {
  const id = uuidv4();
  const { priority = NOTIFICATION_PRIORITIES.MEDIUM, link = null, relatedEntityType = null, relatedEntityId = null } = options;

  const formattedTitle = formatNotificationTitle({ type, title, message } as Notification);
  const formattedMessage = formatNotificationMessage({ type, title, message, relatedEntityType, relatedEntityId } as Notification);

  return {
    id,
    type,
    title: formattedTitle,
    message: formattedMessage,
    timestamp: new Date().toISOString(),
    isRead: false,
    priority,
    link,
    relatedEntityType,
    relatedEntityId,
  };
};

/**
 * Handles user actions on notifications (mark as read, dismiss, view details)
 * @param {string} actionType - Action type
 * @param {string} notificationId - Notification ID
 * @returns {void} No return value
 */
const handleNotificationAction = (actionType: string, notificationId: string): void => {
  switch (actionType) {
    case 'MARK_AS_READ':
      notificationService.markAsRead(notificationId);
      break;
    case 'DISMISS':
      notificationService.removeNotification(notificationId);
      break;
    case 'VIEW_DETAILS':
      // Navigate to the related entity if link exists
      const notification = notificationService.getNotificationById(notificationId);
      if (notification?.link) {
        window.location.href = notification.link;
      }
      break;
    default:
      console.warn(`Unknown action type: ${actionType}`);
  }
};

/**
 * Filters notifications based on search term, type, priority, and read status
 * @param {Notification[]} notifications - Array of notifications
 * @param {object} filters - Filters object
 * @returns {Notification[]} Filtered notifications
 */
const filterNotifications = (notifications: Notification[], filters: NotificationFilters): Notification[] => {
  let filtered = [...notifications];

  if (filters.searchTerm) {
    const searchTermLower = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(
      (notification) =>
        notification.title.toLowerCase().includes(searchTermLower) ||
        notification.message.toLowerCase().includes(searchTermLower)
    );
  }

  if (filters.type) {
    filtered = filtered.filter((notification) => notification.type === filters.type);
  }

  if (filters.priority) {
    filtered = filtered.filter((notification) => notification.priority === filters.priority);
  }

  if (filters.unreadOnly) {
    filtered = filtered.filter((notification) => !notification.isRead);
  }

  return filtered;
};

/**
 * Groups notifications by date and priority for organized display
 * @param {Notification[]} notifications - Array of notifications
 * @returns {object} Grouped notifications object
 */
const groupNotifications = (notifications: Notification[]): Record<string, Notification[]> => {
  const sortedNotifications = sortNotificationsByPriority(notifications);
  return groupNotificationsByDate(sortedNotifications);
};

/**
 * Custom hook that provides enhanced notification functionality with real-time updates, formatting, and grouping
 * @param {object} options - Optional configuration options
 * @returns {object} Object containing notification state and functions
 */
export const useNotificationSystem = (options: NotificationSystemOptions = {}): UseNotificationSystemResult => {
  // Initialize Redux dispatch and selectors for notification state
  const dispatch = useDispatch();
  const notifications = useSelector(selectAllNotifications);
  const unreadNotifications = useSelector(selectUnreadNotifications);
  const unreadCount = useSelector(selectUnreadCount);

  // Set up local state for notification groups and filtered notifications
  const [groupedNotifications, setGroupedNotifications] = useState<Record<string, Notification[]>>({});
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>(notifications);

  // Initialize WebSocket connection for real-time notifications
  const { connected: wsConnected } = useWebSocketConnection('notifications');

  // Set up effect to initialize notification service on mount
  useEffect(() => {
    notificationService.initialize();
    return () => {
      notificationService.shutdown();
    };
  }, []);

  // Create function to show a notification with specified type, message, and options
  const showNotification = useCallback(
    (type: string, title: string, message: string, options: NotificationSystemOptions = {}) => {
      const notification = createNotification(type, title, message, options);
      dispatch(addNotification(notification));
    },
    [dispatch]
  );

  // Create specialized functions for different notification types (success, error, warning, info)
  const showSuccess = useCallback(
    (title: string, message: string, options?: NotificationSystemOptions) => {
      showNotification(NOTIFICATION_TYPES.SUCCESS, title, message, options);
    },
    [showNotification]
  );

  const showError = useCallback(
    (title: string, message: string, options?: NotificationSystemOptions) => {
      showNotification(NOTIFICATION_TYPES.ERROR, title, message, options);
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string, options?: NotificationSystemOptions) => {
      showNotification(NOTIFICATION_TYPES.WARNING, title, message, options);
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string, options?: NotificationSystemOptions) => {
      showNotification(NOTIFICATION_TYPES.INFO, title, message, options);
    },
    [showNotification]
  );

  // Create function to handle notification actions (mark as read, dismiss, view details)
  const handleAction = useCallback(
    (actionType: string, notificationId: string) => {
      handleNotificationAction(actionType, notificationId);
    },
    []
  );

  // Create function to mark all notifications as read
  const markAllAsRead = useCallback(() => {
    dispatch(markAllAsRead());
  }, [dispatch]);

  // Create function to filter and sort notifications based on criteria
  const filterNotificationsFn = useCallback(
    (notifications: Notification[], filters: NotificationFilters) => {
      return filterNotifications(notifications, filters);
    },
    []
  );

  // Create function to clear all notifications
  const clearAll = useCallback(() => {
    dispatch(dismissNotification);
  }, [dispatch]);

  // Set up effect to update notification groups when notifications change
  useEffect(() => {
    const grouped = groupNotifications(notifications);
    setGroupedNotifications(grouped);
  }, [notifications]);

  // Set up effect to handle WebSocket notification events
  useEffect(() => {
    // Handle WebSocket notification events
  }, [wsConnected, dispatch]);

  // Set up effect to request desktop notification permission if enabled
  useEffect(() => {
    if (options.enableDesktopNotifications && options.autoRequestPermission) {
      Notification.requestPermission().then((permission) => {
        console.log('Notification permission:', permission);
      });
    }
  }, [options.enableDesktopNotifications, options.autoRequestPermission]);

  // Return notification state and functions
  return {
    notifications,
    unreadNotifications,
    unreadCount,
    groupedNotifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    handleAction,
    markAllAsRead,
    filterNotifications: filterNotificationsFn,
    clearAll,
    isDesktopNotificationsEnabled: !!options.enableDesktopNotifications,
  };
};