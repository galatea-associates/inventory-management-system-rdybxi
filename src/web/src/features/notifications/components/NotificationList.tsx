import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.11.0
import { css } from '@emotion/react'; // @emotion/react ^11.11.0
import { Box, Divider, List, ListSubheader } from '@mui/material'; // @mui/material 5.13
import NotificationItem from '../../../components/notifications/NotificationItem';
import Typography from '../../../components/common/Typography';
import Button from '../../../components/common/Button';
import { useNotificationSystem } from '../hooks/useNotificationSystem';
import { Notification } from '../../../types/state';
import { NOTIFICATION_ACTIONS } from '../../../constants/notifications';

/**
 * @interface NotificationListProps
 * @description Props for the NotificationList component
 * @property {Notification[] | Record<string, Notification[]>} notifications - The notifications to display. Can be an array or a grouped object.
 * @property {function} onAction - Callback function for notification actions
 * @property {string} emptyMessage - Message to display when there are no notifications
 * @property {string} className - Optional CSS class name for custom styling
 */
export interface NotificationListProps {
  notifications: Notification[] | Record<string, Notification[]>;
  onAction?: (action: string, notificationId: string) => void;
  emptyMessage?: string;
  className?: string;
}

/**
 * @styled_component StyledNotificationList
 * @description Styled container for the notification list
 */
const StyledNotificationList = styled(List)`
  padding: 0;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

/**
 * @styled_component NotificationGroup
 * @description Styled container for a group of notifications
 */
const NotificationGroup = styled(Box)`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 8px;
  gap: 8px;
`;

/**
 * @styled_component GroupHeader
 * @description Styled header for notification groups
 */
const GroupHeader = styled(ListSubheader)`
  position: sticky;
  top: 0;
  background-color: rgba(255, 255, 255, 0.8);
  font-weight: bold;
  font-size: 1rem;
  padding: 8px;
  border-bottom: 1px solid #eee;
  z-index: 1;
`;

/**
 * @styled_component EmptyState
 * @description Styled container for empty state message
 */
const EmptyState = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  margin: 16px;
  text-align: center;
  min-height: 100px;
`;

/**
 * @function NotificationList
 * @description Component that renders a list of notifications grouped by date
 * @param {NotificationListProps} props - Props for the NotificationList component
 * @returns {JSX.Element} Rendered notification list component
 */
const NotificationList: React.FC<NotificationListProps> = React.memo(({ notifications, onAction, emptyMessage = 'No notifications', className }) => {
  // Destructure props including notifications, onAction, emptyMessage, and className
  // Get notification functions from useNotificationSystem hook if notifications not provided
  const { handleAction: handleActionFromHook } = useNotificationSystem();

  // Group notifications by date using useMemo to optimize performance
  const groupedNotifications = useMemo(() => {
    if (Array.isArray(notifications)) {
      // If notifications is an array, group it by date
      const grouped: Record<string, Notification[]> = {};
      notifications.forEach(notification => {
        const date = new Date(notification.timestamp).toLocaleDateString();
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(notification);
      });
      return grouped;
    } else {
      // If notifications is already grouped, return it directly
      return notifications;
    }
  }, [notifications]);

  // Handle notification actions (mark as read, dismiss, view details)
  const handleNotificationAction = useCallback(
    (actionType: string, notificationId: string) => {
      if (onAction) {
        onAction(actionType, notificationId);
      } else {
        handleActionFromHook(actionType, notificationId);
      }
    },
    [onAction, handleActionFromHook]
  );

  // Render StyledNotificationList with appropriate styling
  return (
    <StyledNotificationList className={className} aria-label="Notifications">
      {Object.keys(groupedNotifications).length > 0 ? (
        Object.entries(groupedNotifications).map(([date, notifications]) => (
          <NotificationGroup key={date}>
            <GroupHeader component="div" aria-labelledby={`notification-group-header-${date}`}>
              <Typography variant="subtitle2" id={`notification-group-header-${date}`}>
                {date}
              </Typography>
            </GroupHeader>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onAction={handleNotificationAction}
              />
            ))}
            <Divider />
          </NotificationGroup>
        ))
      ) : (
        <EmptyState>
          <Typography variant="body2" color="textSecondary">
            {emptyMessage}
          </Typography>
        </EmptyState>
      )}
    </StyledNotificationList>
  );
});

export interface NotificationListProps {
  notifications: Notification[] | Record<string, Notification[]>;
  onAction?: (action: string, notificationId: string) => void;
  emptyMessage?: string;
  className?: string;
}
NotificationList.displayName = 'NotificationList';

export default NotificationList;