import { v4 as uuidv4 } from 'uuid'; // uuid 9.0.0
import { Notification } from '../types/state';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_SOURCES,
  NOTIFICATION_DURATIONS,
  NOTIFICATION_STORAGE_KEY,
  NOTIFICATION_WEBSOCKET_EVENTS,
  NOTIFICATION_MAX_AGE
} from '../constants/notifications';
import { webSocketService } from './websocket.service';
import { debug, info, warn, error } from '../utils/logger';

// Check if desktop notifications are supported
const DESKTOP_NOTIFICATION_ENABLED = typeof window !== 'undefined' && 'Notification' in window;

/**
 * Service class for managing notifications in the application
 */
class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Map<string, Function> = new Map();
  private initialized: boolean = false;
  private desktopNotificationsEnabled: boolean = DESKTOP_NOTIFICATION_ENABLED;
  private desktopPermissionRequested: boolean = false;

  constructor() {
    // Initialize notifications array
    this.notifications = [];
    // Initialize listeners map
    this.listeners = new Map();
    // Set initialized flag to false
    this.initialized = false;
    // Check if desktop notifications are supported
    this.desktopNotificationsEnabled = DESKTOP_NOTIFICATION_ENABLED;
    // Set desktop permission requested flag to false
    this.desktopPermissionRequested = false;
  }

  /**
   * Initializes the notification service and loads stored notifications
   */
  public initialize(): void {
    // If already initialized, return immediately
    if (this.initialized) {
      debug('Notification service already initialized');
      return;
    }

    // Set initialized flag to true
    this.initialized = true;

    // Load notifications from local storage
    this.loadNotifications();

    // Register WebSocket handlers for real-time notifications
    this.registerWebSocketHandlers();

    // Request desktop notification permission if supported
    if (this.desktopNotificationsEnabled) {
      this.requestDesktopNotificationPermission();
    }

    info('Notification service initialized');
  }

  /**
   * Shuts down the notification service and cleans up resources
   */
  public shutdown(): void {
    // If not initialized, return immediately
    if (!this.initialized) {
      return;
    }

    // Unregister WebSocket handlers
    this.unregisterWebSocketHandlers();

    // Clear all listeners
    this.listeners.clear();

    // Set initialized flag to false
    this.initialized = false;

    info('Notification service shutdown');
  }

  /**
   * Retrieves all notifications
   * @returns Array of notifications
   */
  public getNotifications(): Notification[] {
    // Return a copy of the notifications array
    return [...this.notifications];
  }

  /**
   * Retrieves unread notifications
   * @returns Array of unread notifications
   */
  public getUnreadNotifications(): Notification[] {
    // Filter notifications array for items where isRead is false
    return this.notifications.filter(notification => !notification.isRead);
  }

  /**
   * Retrieves a notification by its ID
   * @param id - Notification ID
   * @returns The notification if found, undefined otherwise
   */
  public getNotificationById(id: string): Notification | undefined {
    // Find notification in the notifications array by ID
    return this.notifications.find(notification => notification.id === id);
  }

  /**
   * Adds a new notification
   * @param params - Notification parameters
   * @returns The created notification
   */
  public addNotification(params: {
    type: string;
    title: string;
    message: string;
    priority?: string;
    source?: string;
    link?: string;
    data?: Record<string, any>;
  }): Notification {
    // Validate notification parameters
    if (!params.type || !params.title || !params.message) {
      throw new Error('Notification type, title, and message are required');
    }

    // Set default values for optional parameters
    const priority = params.priority || NOTIFICATION_PRIORITIES.MEDIUM;
    const source = params.source || NOTIFICATION_SOURCES.SYSTEM;

    // Generate a unique ID using uuidv4
    const id = uuidv4();

    // Create notification object with isRead set to false and current timestamp
    const notification: Notification = {
      id,
      type: params.type,
      title: params.title,
      message: params.message,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority,
      link: params.link || null,
      relatedEntityType: params.data?.entityType || null,
      relatedEntityId: params.data?.entityId || null,
    };

    // Add notification to the beginning of the notifications array
    this.notifications.unshift(notification);

    // Save notifications to local storage
    this.saveNotifications();

    // Notify listeners of the new notification
    this.notifyListeners('add', notification);

    // Show desktop notification if enabled
    this.showDesktopNotification(notification);

    // Return the created notification
    return notification;
  }

  /**
   * Updates an existing notification
   * @param id - Notification ID
   * @param updates - Partial notification object with updates
   * @returns The updated notification if found, undefined otherwise
   */
  public updateNotification(id: string, updates: Partial<Notification>): Notification | undefined {
    // Find notification in the notifications array by ID
    const index = this.notifications.findIndex(notification => notification.id === id);

    // If not found, return undefined
    if (index === -1) {
      return undefined;
    }

    // Update the notification with the provided updates
    const updatedNotification = {
      ...this.notifications[index],
      ...updates,
    };

    // Replace the old notification with the updated one
    this.notifications[index] = updatedNotification;

    // Save notifications to local storage
    this.saveNotifications();

    // Notify listeners of the updated notification
    this.notifyListeners('update', updatedNotification);

    // Return the updated notification
    return updatedNotification;
  }

  /**
   * Removes a notification by its ID
   * @param id - Notification ID
   * @returns True if notification was removed, false otherwise
   */
  public removeNotification(id: string): boolean {
    // Find index of notification in the notifications array by ID
    const index = this.notifications.findIndex(notification => notification.id === id);

    // If not found, return false
    if (index === -1) {
      return false;
    }

    // Get notification before removing it
    const notification = this.notifications[index];

    // Remove notification from the array
    this.notifications.splice(index, 1);

    // Save notifications to local storage
    this.saveNotifications();

    // Notify listeners of the removed notification
    this.notifyListeners('remove', notification);

    // Return true
    return true;
  }

  /**
   * Marks a notification as read
   * @param id - Notification ID
   * @returns The updated notification if found, undefined otherwise
   */
  public markAsRead(id: string): Notification | undefined {
    // Find notification in the notifications array by ID
    const notification = this.getNotificationById(id);

    // If not found, return undefined
    if (!notification) {
      return undefined;
    }

    // If already read, return the notification
    if (notification.isRead) {
      return notification;
    }

    // Update the notification with isRead set to true
    return this.updateNotification(id, { isRead: true });
  }

  /**
   * Marks all notifications as read
   */
  public markAllAsRead(): void {
    // Update all notifications to set isRead to true
    this.notifications = this.notifications.map(notification => ({
      ...notification,
      isRead: true,
    }));

    // Save notifications to local storage
    this.saveNotifications();

    // Notify listeners that all notifications are read
    this.notifyListeners('markAllAsRead', null);
  }

  /**
   * Removes all notifications
   */
  public clearAll(): void {
    // Clear the notifications array
    this.notifications = [];

    // Save empty array to local storage
    this.saveNotifications();

    // Notify listeners that all notifications are cleared
    this.notifyListeners('clearAll', null);
  }

  /**
   * Adds a listener for notification events
   * @param id - Listener ID
   * @param listener - Listener function
   */
  public addListener(id: string, listener: Function): void {
    // Add listener to the listeners map with the provided ID
    this.listeners.set(id, listener);
    debug(`Added notification listener: ${id}`);
  }

  /**
   * Removes a listener by its ID
   * @param id - Listener ID
   * @returns True if listener was removed, false otherwise
   */
  public removeListener(id: string): boolean {
    // Check if listener exists in the listeners map
    if (this.listeners.has(id)) {
      this.listeners.delete(id);
      debug(`Removed notification listener: ${id}`);
      return true;
    }
    
    // Otherwise return false
    return false;
  }

  /**
   * Notifies all listeners of a notification event
   * @param eventType - Type of event
   * @param data - Event data
   */
  private notifyListeners(eventType: string, data: any): void {
    // Iterate through all listeners in the map
    this.listeners.forEach((listener, id) => {
      try {
        // Call each listener with the event type and data
        listener(eventType, data);
      } catch (err) {
        // Handle any errors that occur during listener execution
        error(`Error in notification listener ${id}:`, err);
      }
    });
  }

  /**
   * Loads notifications from local storage
   */
  private loadNotifications(): void {
    try {
      // Retrieve notifications from local storage using NOTIFICATION_STORAGE_KEY
      const storedNotifications = localStorage.getItem(NOTIFICATION_STORAGE_KEY);

      if (storedNotifications) {
        // Parse the JSON string into an array of notifications
        const parsedNotifications = JSON.parse(storedNotifications) as Notification[];
        
        // Filter out expired notifications based on NOTIFICATION_MAX_AGE
        const now = new Date().getTime();
        const validNotifications = parsedNotifications.filter(notification => {
          const notificationTime = new Date(notification.timestamp).getTime();
          return now - notificationTime < NOTIFICATION_MAX_AGE;
        });
        
        // Set the notifications array to the loaded notifications
        this.notifications = validNotifications;
        
        debug(`Loaded ${this.notifications.length} notifications from local storage`);
      } else {
        debug('No stored notifications found in local storage');
      }
    } catch (err) {
      // Log error if loading fails
      error('Failed to load notifications from local storage:', err);
      // Initialize empty array
      this.notifications = [];
    }
  }

  /**
   * Saves notifications to local storage
   */
  private saveNotifications(): void {
    try {
      // Convert the notifications array to a JSON string
      const notificationsJson = JSON.stringify(this.notifications);
      
      // Save the JSON string to local storage using NOTIFICATION_STORAGE_KEY
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, notificationsJson);
      
      debug(`Saved ${this.notifications.length} notifications to local storage`);
    } catch (err) {
      // Log error if saving fails
      error('Failed to save notifications to local storage:', err);
    }
  }

  /**
   * Registers WebSocket handlers for real-time notifications
   */
  private registerWebSocketHandlers(): void {
    // Register handler for new notification events
    webSocketService.addMessageHandler(
      'notifications', 
      NOTIFICATION_WEBSOCKET_EVENTS.NEW_NOTIFICATION, 
      this.handleNewNotification.bind(this)
    );
    
    // Register handler for notification read events
    webSocketService.addMessageHandler(
      'notifications', 
      NOTIFICATION_WEBSOCKET_EVENTS.NOTIFICATION_READ, 
      this.handleNotificationRead.bind(this)
    );
    
    // Register handler for notification dismissed events
    webSocketService.addMessageHandler(
      'notifications', 
      NOTIFICATION_WEBSOCKET_EVENTS.NOTIFICATION_DISMISSED, 
      this.handleNotificationDismissed.bind(this)
    );
    
    // Register handler for all notifications read events
    webSocketService.addMessageHandler(
      'notifications', 
      NOTIFICATION_WEBSOCKET_EVENTS.ALL_NOTIFICATIONS_READ, 
      this.handleAllNotificationsRead.bind(this)
    );
    
    debug('Registered WebSocket handlers for notifications');
  }

  /**
   * Unregisters WebSocket handlers
   */
  private unregisterWebSocketHandlers(): void {
    // Unregister all notification-related WebSocket handlers
    webSocketService.removeMessageHandler(
      'notifications', 
      NOTIFICATION_WEBSOCKET_EVENTS.NEW_NOTIFICATION
    );
    
    webSocketService.removeMessageHandler(
      'notifications', 
      NOTIFICATION_WEBSOCKET_EVENTS.NOTIFICATION_READ
    );
    
    webSocketService.removeMessageHandler(
      'notifications', 
      NOTIFICATION_WEBSOCKET_EVENTS.NOTIFICATION_DISMISSED
    );
    
    webSocketService.removeMessageHandler(
      'notifications', 
      NOTIFICATION_WEBSOCKET_EVENTS.ALL_NOTIFICATIONS_READ
    );
    
    debug('Unregistered WebSocket handlers for notifications');
  }

  /**
   * Handles a new notification received via WebSocket
   * @param notification - Notification object
   */
  private handleNewNotification(notification: Notification): void {
    // Add the received notification to the notifications array
    this.notifications.unshift(notification);
    
    // Save notifications to local storage
    this.saveNotifications();
    
    // Notify listeners of the new notification
    this.notifyListeners('add', notification);
    
    // Show desktop notification if enabled
    this.showDesktopNotification(notification);
  }

  /**
   * Handles a notification read event received via WebSocket
   * @param data - Event data with notification ID
   */
  private handleNotificationRead(data: { id: string }): void {
    // Find notification in the notifications array by ID
    const notification = this.getNotificationById(data.id);
    
    // If found, mark it as read
    if (notification) {
      this.markAsRead(data.id);
    }
  }

  /**
   * Handles a notification dismissed event received via WebSocket
   * @param data - Event data with notification ID
   */
  private handleNotificationDismissed(data: { id: string }): void {
    // Find notification in the notifications array by ID
    const notification = this.getNotificationById(data.id);
    
    // If found, remove it from the array
    if (notification) {
      this.removeNotification(data.id);
    }
  }

  /**
   * Handles an all notifications read event received via WebSocket
   */
  private handleAllNotificationsRead(): void {
    // Mark all notifications as read
    this.markAllAsRead();
  }

  /**
   * Shows a desktop notification if enabled
   * @param notification - Notification to display
   */
  private showDesktopNotification(notification: Notification): void {
    // Check if desktop notifications are enabled and permission is granted
    if (
      this.desktopNotificationsEnabled &&
      Notification.permission === 'granted'
    ) {
      try {
        // Set notification icon based on type/priority
        let icon = '/assets/icons/notification.png';
        if (notification.type === NOTIFICATION_TYPES.ERROR || notification.priority === NOTIFICATION_PRIORITIES.CRITICAL) {
          icon = '/assets/icons/error.png';
        } else if (notification.type === NOTIFICATION_TYPES.WARNING) {
          icon = '/assets/icons/warning.png';
        } else if (notification.type === NOTIFICATION_TYPES.SUCCESS) {
          icon = '/assets/icons/success.png';
        }
        
        // Create a new browser Notification with title and options
        const desktopNotification = new Notification(notification.title, {
          body: notification.message,
          icon,
          tag: notification.id
        });
        
        // Add click handler to focus window and potentially navigate to related content
        desktopNotification.onclick = () => {
          // Focus the window
          window.focus();
          
          // If there's a link, navigate to it
          if (notification.link) {
            window.location.href = notification.link;
          }
          
          // Mark the notification as read
          this.markAsRead(notification.id);
          
          // Close the desktop notification
          desktopNotification.close();
        };
        
        debug('Displayed desktop notification', { id: notification.id });
      } catch (err) {
        error('Failed to show desktop notification:', err);
      }
    }
  }

  /**
   * Requests permission for desktop notifications
   * @returns Promise resolving to true if permission granted, false otherwise
   */
  public async requestDesktopNotificationPermission(): Promise<boolean> {
    // Check if desktop notifications are supported
    if (!this.desktopNotificationsEnabled) {
      return false;
    }
    
    // If already requested, return current permission status
    if (this.desktopPermissionRequested) {
      return Notification.permission === 'granted';
    }
    
    try {
      // Request permission from the browser
      const permission = await Notification.requestPermission();
      
      // Set permission requested flag to true
      this.desktopPermissionRequested = true;
      
      // Return true if permission granted, false otherwise
      const granted = permission === 'granted';
      debug(`Desktop notification permission ${granted ? 'granted' : 'denied'}`);
      return granted;
    } catch (err) {
      error('Error requesting notification permission:', err);
      return false;
    }
  }

  /**
   * Removes notifications older than the maximum age
   */
  private cleanupOldNotifications(): void {
    // Calculate the cutoff date based on NOTIFICATION_MAX_AGE
    const now = new Date().getTime();
    const cutoffDate = now - NOTIFICATION_MAX_AGE;
    
    // Get initial length
    const initialLength = this.notifications.length;
    
    // Filter out notifications older than the cutoff date
    this.notifications = this.notifications.filter(notification => {
      const notificationTime = new Date(notification.timestamp).getTime();
      return notificationTime >= cutoffDate;
    });
    
    // If any notifications were removed, save to local storage
    if (this.notifications.length < initialLength) {
      this.saveNotifications();
      debug(`Cleaned up ${initialLength - this.notifications.length} old notifications`);
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Export singleton instance and class
export { notificationService, NotificationService };