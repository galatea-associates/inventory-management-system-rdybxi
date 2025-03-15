/**
 * Notification Constants
 * 
 * This file defines all notification-related constants used throughout the Inventory Management System.
 * These constants ensure consistent handling of notifications across the application.
 */

/**
 * Types of notifications that can be displayed in the system
 */
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Priority levels for notifications to indicate their importance
 */
export const NOTIFICATION_PRIORITIES = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Actions that can be performed on notifications
 */
export const NOTIFICATION_ACTIONS = {
  MARK_AS_READ: 'mark_as_read',
  DISMISS: 'dismiss',
  VIEW_DETAILS: 'view_details'
};

/**
 * Icon names for different notification types and priorities
 * These correspond to the Material-UI icon names
 */
export const NOTIFICATION_ICONS = {
  SUCCESS: 'check_circle',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  CRITICAL: 'priority_high'
};

/**
 * Sources from which notifications can originate
 */
export const NOTIFICATION_SOURCES = {
  SYSTEM: 'system',
  USER: 'user',
  POSITION: 'position',
  INVENTORY: 'inventory',
  LOCATE: 'locate',
  ORDER: 'order',
  EXCEPTION: 'exception'
};

/**
 * Display durations for toast notifications in milliseconds
 */
export const NOTIFICATION_DURATIONS = {
  SHORT: 3000,  // 3 seconds
  MEDIUM: 5000, // 5 seconds
  LONG: 8000,   // 8 seconds
  PERSISTENT: null // Stays until dismissed
};

/**
 * Local storage key for storing notifications
 */
export const NOTIFICATION_STORAGE_KEY = 'ims_notifications';

/**
 * Maximum age (in milliseconds) for notifications before they are automatically cleaned up
 * Default: 7 days
 */
export const NOTIFICATION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * WebSocket event types for real-time notification updates
 */
export const NOTIFICATION_WEBSOCKET_EVENTS = {
  NEW_NOTIFICATION: 'notification.new',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_DISMISSED: 'notification.dismissed',
  ALL_NOTIFICATIONS_READ: 'notification.all_read'
};