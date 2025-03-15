import { createSelector } from '@reduxjs/toolkit';
import { RootState, Notification, NotificationsState } from '../../types/state';
import { NOTIFICATION_PRIORITIES } from '../../constants/notifications';

/**
 * Base selector that returns the notifications slice from the Redux store
 */
export const selectNotificationsState = (state: RootState): NotificationsState => state.notifications;

/**
 * Selector that returns all notifications from the state
 */
export const selectAllNotifications = createSelector(
  [selectNotificationsState],
  (notificationsState): Notification[] => notificationsState.notifications
);

/**
 * Selector that returns only unread notifications
 */
export const selectUnreadNotifications = createSelector(
  [selectAllNotifications],
  (notifications): Notification[] => notifications.filter(notification => !notification.isRead)
);

/**
 * Selector that returns the count of unread notifications
 */
export const selectUnreadCount = createSelector(
  [selectNotificationsState],
  (notificationsState): number => notificationsState.unreadCount
);

/**
 * Selector factory that creates a selector for finding a notification by ID
 */
export const selectNotificationById = (notificationId: string) => 
  (state: RootState): Notification | undefined => {
    return selectAllNotifications(state).find(notification => notification.id === notificationId);
  };

/**
 * Selector that groups notifications by their priority level
 */
export const selectNotificationsByPriority = createSelector(
  [selectAllNotifications],
  (notifications): Record<string, Notification[]> => {
    const result: Record<string, Notification[]> = {
      [NOTIFICATION_PRIORITIES.CRITICAL]: [],
      [NOTIFICATION_PRIORITIES.HIGH]: [],
      [NOTIFICATION_PRIORITIES.MEDIUM]: [],
      [NOTIFICATION_PRIORITIES.LOW]: []
    };
    
    notifications.forEach(notification => {
      if (result[notification.priority]) {
        result[notification.priority].push(notification);
      }
    });
    
    return result;
  }
);

/**
 * Selector that returns only critical priority notifications
 */
export const selectCriticalNotifications = createSelector(
  [selectAllNotifications],
  (notifications): Notification[] => 
    notifications.filter(notification => notification.priority === NOTIFICATION_PRIORITIES.CRITICAL)
);

/**
 * Selector that returns only high priority notifications
 */
export const selectHighPriorityNotifications = createSelector(
  [selectAllNotifications],
  (notifications): Notification[] => 
    notifications.filter(notification => notification.priority === NOTIFICATION_PRIORITIES.HIGH)
);

/**
 * Selector that returns the loading state of notifications
 */
export const selectNotificationsLoading = createSelector(
  [selectNotificationsState],
  (notificationsState): boolean => notificationsState.isLoading
);

/**
 * Selector that returns any error in the notifications state
 */
export const selectNotificationsError = createSelector(
  [selectNotificationsState],
  (notificationsState): string | null => notificationsState.error
);

/**
 * Selector that returns the system alerts from the notifications state
 */
export const selectAlerts = createSelector(
  [selectNotificationsState],
  (notificationsState) => notificationsState.alerts
);

/**
 * Selector that returns the most recent notifications, limited by count
 */
export const selectRecentNotifications = createSelector(
  [selectAllNotifications, (_, count: number) => count],
  (notifications, count): Notification[] => {
    return [...notifications]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, count);
  }
);