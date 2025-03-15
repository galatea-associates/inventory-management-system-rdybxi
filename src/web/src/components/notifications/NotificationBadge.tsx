# src/web/src/components/notifications/NotificationBadge.tsx
```typescript
import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.11.0
import { Notifications as NotificationsIcon } from '@mui/icons-material'; // @mui/icons-material 5.13
import { Tooltip, IconButton } from '@mui/material'; // @mui/material 5.13
import Badge from '../common/Badge';
import NotificationCenter from './NotificationCenter';
import { useNotification } from '../../hooks/useNotification';
import { NOTIFICATION_PRIORITIES } from '../../constants/notifications';

/**
 * @interface NotificationBadgeProps
 * @description Props for the NotificationBadge component
 * @property {string} className - Optional CSS class name for custom styling
 */
export interface NotificationBadgeProps {
  className?: string;
}

/**
 * @styled_component StyledBadge
 * @description Styled badge component with custom styling
 */
const StyledBadge = styled(Badge)`
  /* Apply custom styling for the badge */
  /* Apply animation for new notifications */
  /* Apply hover state styling */
`;

/**
 * @styled_component NotificationIconButton
 * @description Styled icon button for the notification badge
 */
const NotificationIconButton = styled(IconButton)`
  /* Apply padding and sizing */
  /* Apply focus state styling */
  /* Apply hover state styling */
  /* Apply active state styling */
`;

/**
 * @function NotificationBadge
 * @description Component that displays a badge with unread notification count and toggles the notification center
 * @param {NotificationBadgeProps} props - Props for the NotificationBadge component
 * @returns {JSX.Element} Rendered notification badge component
 */
export const NotificationBadge: React.FC<NotificationBadgeProps> = React.memo(({ className }) => {
  // LD1: Destructure props including className and any other props
  // IE1: Get notifications and unread count from useNotification hook
  const { notifications, unreadNotifications } = useNotification();

  // LD1: Initialize state for notification center visibility
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // LD1: Create handler for toggling notification center visibility
  const handleToggleNotificationCenter = useCallback(() => {
    setIsNotificationCenterOpen((prev) => !prev);
  }, []);

  // LD1: Create handler for closing notification center
  const handleCloseNotificationCenter = useCallback(() => {
    setIsNotificationCenterOpen(false);
  }, []);

  // LD1: Determine badge color based on presence of critical notifications
  const badgeColor = notifications.some(notification => notification.priority === NOTIFICATION_PRIORITIES.CRITICAL) ? 'error' : 'primary';

  // LD1: Render IconButton with Badge showing unread count
  // LD1: Apply appropriate ARIA attributes for accessibility
  return (
    <>
      <Tooltip title="Notifications">
        <NotificationIconButton
          aria-label="open notifications"
          aria-owns={isNotificationCenterOpen ? 'notification-menu' : undefined}
          aria-haspopup="true"
          onClick={handleToggleNotificationCenter}
          className={className}
        >
          <StyledBadge badgeContent={unreadNotifications.length} color={badgeColor}>
            <NotificationsIcon />
          </StyledBadge>
        </NotificationIconButton>
      </Tooltip>

      {/* LD1: Render NotificationCenter component when visible */}
      {isNotificationCenterOpen && (
        <NotificationCenter
          isOpen={isNotificationCenterOpen}
          onClose={handleCloseNotificationCenter}
        />
      )}
    </>
  );
});

NotificationBadge.displayName = 'NotificationBadge';

export default NotificationBadge;