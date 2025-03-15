import { formatDistanceToNow } from 'date-fns'; // date-fns ^2.30.0
import { Notification } from '../../../types/state';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../../../constants/notifications';
import { formatDate } from '../../../utils/date';

/**
 * Formats a notification timestamp as a relative time string
 * @param timestamp The timestamp to format
 * @returns Formatted relative time string (e.g., '5 minutes ago')
 */
export function formatNotificationTimestamp(timestamp: string): string {
  if (!timestamp) {
    return '';
  }
  
  try {
    return `${formatDistanceToNow(new Date(timestamp))} ago`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
}

/**
 * Formats a notification title based on its type and source
 * @param notification The notification object
 * @returns Formatted notification title
 */
export function formatNotificationTitle(notification: Notification): string {
  if (!notification) {
    return '';
  }
  
  // If title is already defined, return it
  if (notification.title) {
    return notification.title;
  }
  
  // Generate default title based on notification type
  switch (notification.type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return 'Success';
    case NOTIFICATION_TYPES.ERROR:
      return 'Error';
    case NOTIFICATION_TYPES.WARNING:
      return 'Warning';
    case NOTIFICATION_TYPES.INFO:
      return 'Information';
    default:
      return 'Notification';
  }
}

/**
 * Formats a notification message with entity details if available
 * @param notification The notification object
 * @returns Formatted notification message
 */
export function formatNotificationMessage(notification: Notification): string {
  if (!notification || !notification.message) {
    return '';
  }
  
  // If no related entity, just return the message
  if (!notification.relatedEntityType || !notification.relatedEntityId) {
    return notification.message;
  }
  
  // Format message with entity information
  return `${notification.message} (${notification.relatedEntityType}: ${notification.relatedEntityId})`;
}

/**
 * Gets a human-readable label for a notification priority
 * @param priority The priority value
 * @returns Human-readable priority label
 */
export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case NOTIFICATION_PRIORITIES.CRITICAL:
      return 'Critical';
    case NOTIFICATION_PRIORITIES.HIGH:
      return 'High';
    case NOTIFICATION_PRIORITIES.MEDIUM:
      return 'Medium';
    case NOTIFICATION_PRIORITIES.LOW:
      return 'Low';
    default:
      return 'Normal';
  }
}

/**
 * Gets a human-readable label for a notification type
 * @param type The notification type
 * @returns Human-readable type label
 */
export function getTypeLabel(type: string): string {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return 'Success';
    case NOTIFICATION_TYPES.ERROR:
      return 'Error';
    case NOTIFICATION_TYPES.WARNING:
      return 'Warning';
    case NOTIFICATION_TYPES.INFO:
      return 'Information';
    default:
      return 'Information';
  }
}

/**
 * Truncates a notification message to a specified length with ellipsis
 * @param message The message to truncate
 * @param maxLength The maximum length
 * @returns Truncated message with ellipsis if needed
 */
export function truncateMessage(message: string, maxLength: number): string {
  if (!message || message.length <= maxLength) {
    return message || '';
  }
  
  return `${message.substring(0, maxLength)}...`;
}

/**
 * Gets the appropriate color code for a notification priority
 * @param priority The priority value
 * @returns CSS color code for the priority
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case NOTIFICATION_PRIORITIES.CRITICAL:
      return '#d32f2f'; // red
    case NOTIFICATION_PRIORITIES.HIGH:
      return '#ed6c02'; // orange
    case NOTIFICATION_PRIORITIES.MEDIUM:
      return '#0288d1'; // blue
    case NOTIFICATION_PRIORITIES.LOW:
      return '#2e7d32'; // green
    default:
      return '#757575'; // gray
  }
}

/**
 * Sorts an array of notifications by priority (highest to lowest) and then by timestamp (newest first)
 * @param notifications The array of notifications to sort
 * @returns Sorted array of notifications
 */
export function sortNotificationsByPriority(notifications: Notification[]): Notification[] {
  if (!notifications || !Array.isArray(notifications)) {
    return [];
  }
  
  // Define priority order
  const priorityOrder = {
    [NOTIFICATION_PRIORITIES.CRITICAL]: 0,
    [NOTIFICATION_PRIORITIES.HIGH]: 1,
    [NOTIFICATION_PRIORITIES.MEDIUM]: 2,
    [NOTIFICATION_PRIORITIES.LOW]: 3
  };
  
  // Sort by priority (highest first) and then by timestamp (newest first)
  return [...notifications].sort((a, b) => {
    const priorityA = priorityOrder[a.priority] || 99;
    const priorityB = priorityOrder[b.priority] || 99;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // If priorities are equal, sort by timestamp (newest first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Groups notifications by date (Today, Yesterday, This Week, Earlier)
 * @param notifications The array of notifications to group
 * @returns Object with date groups as keys and notification arrays as values
 */
export function groupNotificationsByDate(notifications: Notification[]): Record<string, Notification[]> {
  if (!notifications || !Array.isArray(notifications)) {
    return {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: []
    };
  }
  
  const result = {
    today: [] as Notification[],
    yesterday: [] as Notification[],
    thisWeek: [] as Notification[],
    earlier: [] as Notification[]
  };
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  
  notifications.forEach(notification => {
    const notificationDate = new Date(notification.timestamp);
    const notificationDay = new Date(
      notificationDate.getFullYear(),
      notificationDate.getMonth(),
      notificationDate.getDate()
    );
    
    if (notificationDay.getTime() === today.getTime()) {
      result.today.push(notification);
    } else if (notificationDay.getTime() === yesterday.getTime()) {
      result.yesterday.push(notification);
    } else if (notificationDay >= oneWeekAgo) {
      result.thisWeek.push(notification);
    } else {
      result.earlier.push(notification);
    }
  });
  
  return result;
}