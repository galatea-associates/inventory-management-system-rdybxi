# src/web/src/components/notifications/NotificationCenter.tsx
```typescript
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.11.0
import { css } from '@emotion/react'; // @emotion/react ^11.11.0
import { Box, Paper, Drawer, Divider, IconButton, Badge, Tooltip } from '@mui/material'; // @mui/material 5.13
import { Close, MarkEmailRead, Delete, FilterList, Refresh, NotificationsOff } from '@mui/icons-material'; // @mui/icons-material 5.13
import NotificationItem from './NotificationItem';
import Button from '../common/Button';
import Typography from '../common/Typography';
import Tabs from '../common/Tabs';
import Tab from '../common/Tab';
import SearchInput from '../common/SearchInput';
import { useNotification } from '../../hooks/useNotification';
import { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES, NOTIFICATION_ACTIONS } from '../../constants/notifications';
import { Notification } from '../../types/state';

/**
 * @interface NotificationCenterProps
 * @description Props for the NotificationCenter component
 * @property {boolean} isOpen - Whether the notification center is open
 * @property {function} onClose - Callback function to close the notification center
 * @property {string} className - Optional CSS class name for custom styling
 */
export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * @interface NotificationTabOption
 * @description Option for notification filtering tabs
 * @property {string} id - Unique identifier for the tab
 * @property {string} label - Display label for the tab
 * @property {function} filter - Function to filter notifications based on the tab
 */
interface NotificationTabOption {
  id: string;
  label: string;
  filter: (notification: Notification) => boolean;
}

/**
 * @styled_component StyledDrawer
 * @description Styled drawer component for the notification center
 */
const StyledDrawer = styled(Drawer)`
  /* Set width for desktop and mobile */
  width: 320px;
  flex-shrink: 0;

  /* Apply z-index for proper layering */
  z-index: 1200;

  /* Apply background color */
  background-color: #fff;

  /* Apply box-shadow */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  /* Apply responsive styles for different screen sizes */
  @media (max-width: 600px) {
    width: 100%;
  }
`;

/**
 * @styled_component NotificationHeader
 * @description Styled header for the notification center
 */
const NotificationHeader = styled(Box)`
  /* Display as flex with space-between alignment */
  display: flex;
  justify-content: space-between;
  align-items: center;

  /* Apply padding and margin */
  padding: 16px;
  margin-bottom: 8px;

  /* Apply border-bottom */
  border-bottom: 1px solid #e0e0e0;

  /* Apply background color */
  background-color: #f5f5f5;
`;

/**
 * @styled_component NotificationTitle
 * @description Styled title for the notification center header
 */
const NotificationTitle = styled(Box)`
  /* Display as flex with center alignment */
  display: flex;
  align-items: center;

  /* Apply font weight and size */
  font-weight: bold;
  font-size: 1.2rem;

  /* Apply gap between icon and text */
  gap: 8px;
`;

/**
 * @styled_component NotificationContent
 * @description Styled content area for the notification list
 */
const NotificationContent = styled(Box)`
  /* Apply padding */
  padding: 16px;

  /* Apply max-height with overflow */
  max-height: calc(100vh - 200px);
  overflow-y: auto;

  /* Apply flex-grow for filling available space */
  flex-grow: 1;
`;

/**
 * @styled_component NotificationList
 * @description Styled list container for notifications
 */
const NotificationList = styled(Box)`
  /* Display as flex with column direction */
  display: flex;
  flex-direction: column;

  /* Apply gap between notification items */
  gap: 8px;

  /* Apply padding */
  padding: 0;

  /* Apply overflow for scrolling */
  overflow-y: auto;
`;

/**
 * @styled_component NotificationFilters
 * @description Styled container for notification filters
 */
const NotificationFilters = styled(Box)`
  /* Display as flex with column direction */
  display: flex;
  flex-direction: column;

  /* Apply padding */
  padding: 16px;

  /* Apply border-bottom */
  border-bottom: 1px solid #e0e0e0;

  /* Apply background color */
  background-color: #f5f5f5;
`;

/**
 * @styled_component NotificationActions
 * @description Styled container for notification actions
 */
const NotificationActions = styled(Box)`
  /* Display as flex with space-between alignment */
  display: flex;
  justify-content: space-between;
  align-items: center;

  /* Apply padding */
  padding: 16px;

  /* Apply border-top */
  border-top: 1px solid #e0e0e0;

  /* Apply background color */
  background-color: #f5f5f5;
`;

/**
 * @styled_component EmptyState
 * @description Styled container for empty state message
 */
const EmptyState = styled(Box)`
  /* Display as flex with column direction and center alignment */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* Apply padding and margin */
  padding: 32px;
  margin: 32px;

  /* Apply text alignment */
  text-align: center;

  /* Apply min-height to fill space */
  min-height: 200px;
`;

/**
 * @function filterNotifications
 * @description Filters notifications based on search term and selected tab
 * @param {Notification[]} notifications - Array of notifications to filter
 * @param {string} searchTerm - Search term to filter notifications by
 * @param {string} selectedTab - Selected tab to filter notifications by
 * @returns {Notification[]} Filtered notifications
 */
const filterNotifications = (
  notifications: Notification[],
  searchTerm: string,
  selectedTab: string
): Notification[] => {
  // Filter notifications by search term if provided (matching title or message)
  let filteredNotifications = notifications;
  if (searchTerm) {
    filteredNotifications = notifications.filter(notification => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      return (
        notification.title.toLowerCase().includes(lowerSearchTerm) ||
        notification.message.toLowerCase().includes(lowerSearchTerm)
      );
    });
  }

  // Filter notifications by selected tab (All, Unread, Critical, etc.)
  if (selectedTab !== 'all') {
    filteredNotifications = filteredNotifications.filter(tabOptions.find(tab => tab.id === selectedTab)?.filter ?? (() => true));
  }

  // Return filtered notifications
  return filteredNotifications;
};

/**
 * @function NotificationCenter
 * @description Component that displays a notification center with filtering and action capabilities
 * @param {NotificationCenterProps} props - Props for the NotificationCenter component
 * @returns {JSX.Element} Rendered notification center component
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = React.memo(({ isOpen, onClose, className }) => {
  // Destructure props including isOpen, onClose, and className
  // Get notification data and functions from useNotification hook
  const {
    notifications,
    unreadNotifications,
    isLoading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    dismissNotification,
    markAsRead,
    markAllAsRead,
    getNotificationById,
    clearAll,
  } = useNotification();

  // Initialize state for search term, selected tab, and filter options
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  // Fetch notifications on component mount and when dependencies change
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Handle notification actions (mark as read, dismiss, view details)
  const handleNotificationAction = useCallback((action: string, notificationId: string) => {
    console.log(`Notification action: ${action} for notification ID: ${notificationId}`);
    // Implement action handling logic here (e.g., API calls, state updates)
  }, []);

  // Filter notifications based on search term and selected tab
  const filteredNotifications = useMemo(() => {
    return filterNotifications(notifications, searchTerm, selectedTab);
  }, [notifications, searchTerm, selectedTab]);

  // Handle tab change
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue);
  }, []);

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Render notification center drawer with header, filters, and notification list
  return (
    <StyledDrawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      className={className}
    >
      <NotificationHeader>
        <NotificationTitle>
          <Typography variant="h6">
            Notifications
          </Typography>
          {unreadNotifications.length > 0 && (
            <Badge badgeContent={unreadNotifications.length} color="primary" />
          )}
        </NotificationTitle>
        <IconButton onClick={onClose} aria-label="Close notifications">
          <Close />
        </IconButton>
      </NotificationHeader>
      <NotificationFilters>
        <Tabs value={selectedTab} onChange={handleTabChange} aria-label="notification filters">
          {tabOptions.map(option => (
            <Tab key={option.id} value={option.id} label={option.label} />
          ))}
        </Tabs>
        <SearchInput value={searchTerm} onChange={handleSearchChange} placeholder="Search notifications..." />
      </NotificationFilters>
      <NotificationContent>
        {isLoading ? (
          <Typography variant="body1">Loading notifications...</Typography>
        ) : error ? (
          <Typography variant="body1" color="error">Error: {error}</Typography>
        ) : filteredNotifications.length > 0 ? (
          <NotificationList>
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onAction={handleNotificationAction}
              />
            ))}
          </NotificationList>
        ) : (
          <EmptyState>
            <NotificationsOff sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography variant="body1" color="text.secondary">
              No notifications found.
            </Typography>
          </EmptyState>
        )}
      </NotificationContent>
      <NotificationActions>
        <Button onClick={markAllAsRead} disabled={notifications.length === 0} startIcon={<MarkEmailRead />}>
          Mark All as Read
        </Button>
        <Button onClick={clearAll} disabled={notifications.length === 0} startIcon={<Delete />} color="error">
          Clear All
        </Button>
      </NotificationActions>
    </StyledDrawer>
  );
});

NotificationCenter.displayName = 'NotificationCenter';

export default NotificationCenter;

/**
 * @interface NotificationTabOption
 * @description Option for notification filtering tabs
 * @property {string} id - Unique identifier for the tab
 * @property {string} label - Display label for the tab
 * @property {function} filter - Function to filter notifications based on the tab
 */
interface NotificationTabOption {
  id: string;
  label: string;
  filter: (notification: Notification) => boolean;
}

// Define tab options for filtering notifications
const tabOptions: NotificationTabOption[] = [
  {
    id: 'all',
    label: 'All',
    filter: () => true,
  },
  {
    id: 'unread',
    label: 'Unread',
    filter: (notification: Notification) => !notification.isRead,
  },
  {
    id: 'critical',
    label: 'Critical',
    filter: (notification: Notification) => notification.priority === NOTIFICATION_PRIORITIES.CRITICAL,
  },
  {
    id: 'high',
    label: 'High',
    filter: (notification: Notification) => notification.priority === NOTIFICATION_PRIORITIES.HIGH,
  },
  {
    id: 'medium',
    label: 'Medium',
    filter: (notification: Notification) => notification.priority === NOTIFICATION_PRIORITIES.MEDIUM,
  },
  {
    id: 'low',
    label: 'Low',
    filter: (notification: Notification) => notification.priority === NOTIFICATION_PRIORITIES.LOW,
  },
];