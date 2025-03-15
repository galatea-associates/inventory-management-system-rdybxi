import React, { useState, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.11.0
import { css } from '@emotion/react'; // @emotion/react ^11.11.0
import { Box, Card, CardContent, CardActions, Divider, IconButton, Tooltip } from '@mui/material'; // @mui/material 5.13
import { MarkEmailRead, Delete, OpenInNew, AccessTime, Info, Warning, Error, CheckCircle } from '@mui/icons-material'; // @mui/icons-material 5.13
import { formatDistanceToNow } from 'date-fns'; // date-fns ^2.30.0
import Typography from '../common/Typography';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { useNotification } from '../../hooks/useNotification';
import { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES, NOTIFICATION_ACTIONS } from '../../constants/notifications';
import { Notification } from '../../types/state';

/**
 * @interface NotificationItemProps
 * @description Props for the NotificationItem component
 * @property {Notification} notification - The notification object to display
 * @property {function} onAction - Callback function for notification actions
 * @property {string} className - Optional CSS class name for custom styling
 */
interface NotificationItemProps {
  notification: Notification;
  onAction: (action: string, notificationId: string) => void;
  className?: string;
}

/**
 * @function getNotificationIcon
 * @description Returns the appropriate icon component based on notification type
 * @param {string} type - Notification type
 * @returns {ReactNode} Icon component for the notification type
 */
const getNotificationIcon = (type: string) => {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return CheckCircle;
    case NOTIFICATION_TYPES.ERROR:
      return Error;
    case NOTIFICATION_TYPES.WARNING:
      return Warning;
    case NOTIFICATION_TYPES.INFO:
      return Info;
    default:
      return Info;
  }
};

/**
 * @function getPriorityColor
 * @description Returns the appropriate color based on notification priority
 * @param {string} priority - Notification priority
 * @returns {string} Color value for the priority
 */
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case NOTIFICATION_PRIORITIES.CRITICAL:
      return 'error';
    case NOTIFICATION_PRIORITIES.HIGH:
      return 'warning';
    case NOTIFICATION_PRIORITIES.MEDIUM:
      return 'info';
    case NOTIFICATION_PRIORITIES.LOW:
      return 'default';
    default:
      return 'default';
  }
};

/**
 * @styled_component StyledNotificationItem
 * @description Styled container for the notification item
 */
const StyledNotificationItem = styled(Card)<{ isRead: boolean }>`
  margin: 8px;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease;
  background-color: ${props => (props.isRead ? '#f5f5f5' : '#fff')};

  &:hover {
    background-color: #e0e0e0;
  }

  &:focus-within {
    outline: 2px solid #2196f3;
  }
`;

/**
 * @styled_component NotificationHeader
 * @description Styled header section for the notification
 */
const NotificationHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  padding: 8px;
  margin-bottom: 4px;
  gap: 8px;
`;

/**
 * @styled_component NotificationTitle
 * @description Styled title container with icon
 */
const NotificationTitle = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 1rem;
`;

/**
 * @styled_component NotificationTime
 * @description Styled timestamp display
 */
const NotificationTime = styled(Box)`
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #757575;
  gap: 4px;
`;

/**
 * @styled_component NotificationContent
 * @description Styled content area for notification message
 */
const NotificationContent = styled(CardContent)`
  padding: 8px;
  max-height: 100px;
  overflow-y: auto;
  word-wrap: break-word;
`;

/**
 * @styled_component NotificationActions
 * @description Styled actions container for notification buttons
 */
const NotificationActions = styled(CardActions)`
  display: flex;
  justify-content: space-between;
  padding: 8px;
  gap: 8px;
`;

/**
 * @styled_component NotificationIcon
 * @description Styled icon for notification type
 */
const NotificationIcon = styled(Box)`
  color: ${props => props.color};
  font-size: 1.2rem;
  align-items: center;
`;

/**
 * @function NotificationItem
 * @description Component that renders an individual notification item with appropriate styling and actions
 * @param {NotificationItemProps} props - Props for the NotificationItem component
 * @returns {JSX.Element} Rendered notification item component
 */
const NotificationItem: React.FC<NotificationItemProps> = React.memo(({ notification, onAction, className }) => {
  const { markAsRead, dismissNotification } = useNotification();

  const {
    id,
    type,
    title,
    message,
    timestamp,
    isRead,
    priority,
    link
  } = notification;

  const relativeTime = useMemo(() => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  }, [timestamp]);

  const IconComponent = useMemo(() => getNotificationIcon(type), [type]);
  const priorityColor = useMemo(() => getPriorityColor(priority), [priority]);

  const handleMarkAsRead = useCallback(() => {
    markAsRead(id);
    onAction(NOTIFICATION_ACTIONS.MARK_AS_READ, id);
  }, [id, markAsRead, onAction]);

  const handleDismiss = useCallback(() => {
    dismissNotification(id);
    onAction(NOTIFICATION_ACTIONS.DISMISS, id);
  }, [id, dismissNotification, onAction]);

  const handleViewDetails = useCallback(() => {
    onAction(NOTIFICATION_ACTIONS.VIEW_DETAILS, id);
  }, [id, onAction]);

  return (
    <StyledNotificationItem isRead={isRead} className={className} aria-labelledby={`notification-title-${id}`} aria-describedby={`notification-content-${id}`}>
      <NotificationHeader>
        <NotificationTitle>
          <NotificationIcon color={priorityColor}>
            <IconComponent color={priorityColor} />
          </NotificationIcon>
          <Typography variant="subtitle1" id={`notification-title-${id}`}>{title}</Typography>
        </NotificationTitle>
        <NotificationTime>
          <AccessTime fontSize="small" />
          <Typography variant="caption">{relativeTime}</Typography>
        </NotificationTime>
      </NotificationHeader>
      <Divider />
      <NotificationContent id={`notification-content-${id}`}>
        <Typography variant="body2">{message}</Typography>
      </NotificationContent>
      <Divider />
      <NotificationActions>
        <Box>
          {!isRead && (
            <Tooltip title="Mark as Read">
              <IconButton aria-label="mark as read" onClick={handleMarkAsRead}>
                <MarkEmailRead />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Dismiss">
            <IconButton aria-label="dismiss" onClick={handleDismiss}>
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
        {link && (
          <Button
            size="small"
            color={priorityColor}
            startIcon={<OpenInNew />}
            onClick={handleViewDetails}
          >
            View Details
          </Button>
        )}
      </NotificationActions>
    </StyledNotificationItem>
  );
});

export interface NotificationItemProps {
    notification: Notification;
    onAction: (action: string, notificationId: string) => void;
    className?: string;
}
NotificationItem.displayName = 'NotificationItem';

export default NotificationItem;