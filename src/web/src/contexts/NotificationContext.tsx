import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'; // react 18.2.0
import { Notification } from '../types/state';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_SOURCES,
  NOTIFICATION_DURATIONS,
  NOTIFICATION_WEBSOCKET_EVENTS
} from '../constants/notifications';
import { notificationService } from '../services/notification.service';
import { useWebSocket } from '../hooks/useWebSocket';
import { webSocketService } from '../services/websocket.service';
import { debug, info, warn, error } from '../utils/logger';

/**
 * Type definition for the notification context value
 */
interface NotificationContextType {
  /**
   * Array of all notifications in the system
   */
  notifications: Notification[];
  
  /**
   * Number of unread notifications
   */
  unreadCount: number;
  
  /**
   * Adds a new notification to the system
   */
  addNotification: (params: AddNotificationParams) => Notification;
  
  /**
   * Removes a notification by its ID
   */
  removeNotification: (id: string) => boolean;
  
  /**
   * Marks a notification as read
   */
  markAsRead: (id: string) => Notification | undefined;
  
  /**
   * Marks all notifications as read
   */
  markAllAsRead: () => void;
  
  /**
   * Clears all notifications
   */
  clearAll: () => void;
  
  /**
   * Requests permission for desktop notifications
   */
  requestDesktopPermission: () => Promise<boolean>;
}

/**
 * Parameters for adding a new notification
 */
interface AddNotificationParams {
  /**
   * Type of notification (success, error, warning, info)
   */
  type: string;
  
  /**
   * Title of the notification
   */
  title: string;
  
  /**
   * Message content of the notification
   */
  message: string;
  
  /**
   * Priority level (critical, high, medium, low)
   */
  priority?: string;
  
  /**
   * Source of the notification
   */
  source?: string;
  
  /**
   * Optional URL to navigate to when notification is clicked
   */
  link?: string;
  
  /**
   * Additional data associated with the notification
   */
  data?: Record<string, any>;
}

/**
 * Props for the NotificationProvider component
 */
interface NotificationProviderProps {
  children: ReactNode;
}

// Create the notification context with null default value
const NotificationContext = createContext<NotificationContextType | null>(null);

/**
 * Provider component for notification functionality throughout the application
 */
export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  // State for notifications and unread count
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // Set up WebSocket connection for real-time notifications
  const { connected } = useWebSocket('topic/notifications', {
    autoConnect: true
  });

  /**
   * Initializes the notification service and sets up listeners
   */
  useEffect(() => {
    debug('Initializing notification service');
    
    // Initialize the notification service
    notificationService.initialize();
    
    // Fetch initial notifications
    const storedNotifications = notificationService.getNotifications();
    setNotifications(storedNotifications);
    
    // Calculate initial unread count
    const unreadNotifications = notificationService.getUnreadNotifications();
    setUnreadCount(unreadNotifications.length);
    
    // Add listener for notification changes
    notificationService.addListener('notificationContext', handleNotificationUpdate);
    
    // Cleanup function
    return () => {
      notificationService.removeListener('notificationContext');
      notificationService.shutdown();
    };
  }, []);

  /**
   * Sets up WebSocket message handlers for real-time notifications
   */
  useEffect(() => {
    if (connected) {
      debug('Setting up WebSocket handlers for notifications');
      
      // Register handler for new notification events
      webSocketService.addMessageHandler(
        'topic/notifications',
        NOTIFICATION_WEBSOCKET_EVENTS.NEW_NOTIFICATION,
        handleNewNotificationMessage
      );
      
      // Register handler for notification read events
      webSocketService.addMessageHandler(
        'topic/notifications',
        NOTIFICATION_WEBSOCKET_EVENTS.NOTIFICATION_READ,
        handleNotificationReadMessage
      );
      
      // Register handler for all notifications read events
      webSocketService.addMessageHandler(
        'topic/notifications',
        NOTIFICATION_WEBSOCKET_EVENTS.ALL_NOTIFICATIONS_READ,
        handleAllNotificationsReadMessage
      );
    }
    
    return () => {
      // Clean up WebSocket handlers when component unmounts or connection changes
      if (connected) {
        webSocketService.removeMessageHandler(
          'topic/notifications',
          NOTIFICATION_WEBSOCKET_EVENTS.NEW_NOTIFICATION
        );
        
        webSocketService.removeMessageHandler(
          'topic/notifications',
          NOTIFICATION_WEBSOCKET_EVENTS.NOTIFICATION_READ
        );
        
        webSocketService.removeMessageHandler(
          'topic/notifications',
          NOTIFICATION_WEBSOCKET_EVENTS.ALL_NOTIFICATIONS_READ
        );
      }
    };
  }, [connected]);

  /**
   * Handle notification updates from the notification service
   */
  const handleNotificationUpdate = useCallback((eventType: string, data: any) => {
    debug('Notification update received', { eventType });
    
    // Update state based on the event type
    switch (eventType) {
      case 'add':
        setNotifications(prevNotifications => [data, ...prevNotifications]);
        setUnreadCount(prevCount => prevCount + 1);
        break;
        
      case 'remove':
        setNotifications(prevNotifications => 
          prevNotifications.filter(notification => notification.id !== data.id)
        );
        if (!data.isRead) {
          setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        }
        break;
        
      case 'update':
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === data.id ? data : notification
          )
        );
        // If notification was marked as read, update unread count
        if (data.isRead) {
          setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        }
        break;
        
      case 'markAllAsRead':
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => ({
            ...notification,
            isRead: true
          }))
        );
        setUnreadCount(0);
        break;
        
      case 'clearAll':
        setNotifications([]);
        setUnreadCount(0);
        break;
        
      default:
        // Re-fetch all notifications when unknown event occurs
        const updatedNotifications = notificationService.getNotifications();
        setNotifications(updatedNotifications);
        
        const updatedUnreadNotifications = notificationService.getUnreadNotifications();
        setUnreadCount(updatedUnreadNotifications.length);
        break;
    }
  }, []);

  /**
   * Handle a new notification received via WebSocket
   */
  const handleNewNotificationMessage = useCallback((payload: any) => {
    debug('Received new notification via WebSocket', payload);
    
    // Convert payload to Notification format if needed
    const notification: Notification = {
      id: payload.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      timestamp: payload.timestamp || new Date().toISOString(),
      isRead: false,
      priority: payload.priority || NOTIFICATION_PRIORITIES.MEDIUM,
      link: payload.link || null,
      relatedEntityType: payload.relatedEntityType || null,
      relatedEntityId: payload.relatedEntityId || null
    };
    
    // Add the notification locally using the service
    notificationService.addNotification({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      link: notification.link,
      data: {
        entityType: notification.relatedEntityType,
        entityId: notification.relatedEntityId
      }
    });
  }, []);

  /**
   * Handle a notification read event received via WebSocket
   */
  const handleNotificationReadMessage = useCallback((payload: { id: string }) => {
    debug('Received notification read event via WebSocket', payload);
    
    // Mark the notification as read locally
    if (payload.id) {
      notificationService.markAsRead(payload.id);
    }
  }, []);

  /**
   * Handle an all notifications read event received via WebSocket
   */
  const handleAllNotificationsReadMessage = useCallback(() => {
    debug('Received all notifications read event via WebSocket');
    
    // Mark all notifications as read locally
    notificationService.markAllAsRead();
  }, []);

  /**
   * Adds a new notification
   */
  const addNotification = useCallback((params: AddNotificationParams): Notification => {
    debug('Adding notification', params);
    
    // Validate required parameters
    if (!params.type || !params.title || !params.message) {
      error('Invalid notification parameters', params);
      throw new Error('Notification type, title, and message are required');
    }
    
    // Add the notification using the service
    return notificationService.addNotification(params);
  }, []);

  /**
   * Removes a notification by its ID
   */
  const removeNotification = useCallback((id: string): boolean => {
    debug('Removing notification', { id });
    return notificationService.removeNotification(id);
  }, []);

  /**
   * Marks a notification as read
   */
  const markAsRead = useCallback((id: string): Notification | undefined => {
    debug('Marking notification as read', { id });
    return notificationService.markAsRead(id);
  }, []);

  /**
   * Marks all notifications as read
   */
  const markAllAsRead = useCallback((): void => {
    debug('Marking all notifications as read');
    notificationService.markAllAsRead();
  }, []);

  /**
   * Clears all notifications
   */
  const clearAll = useCallback((): void => {
    debug('Clearing all notifications');
    notificationService.clearAll();
  }, []);

  /**
   * Requests permission for desktop notifications
   */
  const requestDesktopPermission = useCallback(async (): Promise<boolean> => {
    debug('Requesting desktop notification permission');
    return await notificationService.requestDesktopNotificationPermission();
  }, []);

  // Create the context value object
  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestDesktopPermission
  };

  // Provide the context value to children
  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Custom hook for accessing notification functionality
 * @returns Notification context value with notifications and functions
 * @throws Error if used outside of NotificationProvider
 */
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
};