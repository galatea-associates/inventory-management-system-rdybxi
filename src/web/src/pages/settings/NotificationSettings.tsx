import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Grid, Divider, Button } from '@mui/material'; // @mui/material 5.13
import Card from '../../components/common/Card';
import Typography from '../../components/common/Typography';
import Switch from '../../components/common/Switch';
import useNotification from '../../hooks/useNotification';
import useLocalStorage from '../../hooks/useLocalStorage';
import { notificationService } from '../../services/notification.service';
import { NOTIFICATION_SOURCES } from '../../constants/notifications';
import { NotificationPreferences } from '../../types/state';

interface NotificationSettingsProps {
  // No props are defined for this component
}

/**
 * Styled Card component for notification settings sections
 */
const SettingsCard = styled(Card)`
  margin-bottom: 24px;
  width: 100%;
`;

/**
 * Styled Box component for grouping related settings
 */
const SettingsSection = styled(Box)`
  padding: 16px 24px;
`;

/**
 * Styled Typography component for section titles
 */
const SectionTitle = styled(Typography)`
  margin-bottom: 16px;
  font-weight: 500;
`;

/**
 * Styled Box component for individual setting items
 */
const SettingItem = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

/**
 * Styled Typography component for setting labels
 */
const SettingLabel = styled(Typography)`
  font-weight: 400;
`;

/**
 * Styled button for requesting notification permissions
 */
const PermissionButton = styled(Button)`
  margin-top: 8px;
`;

/**
 * Component for managing notification preferences
 */
const NotificationSettings: React.FC<NotificationSettingsProps> = () => {
  // Initialize notification preferences state from local storage
  const [preferences, setPreferences] = useLocalStorage<NotificationPreferences>(
    'notificationPreferences',
    {
      email: true,
      inApp: true,
      desktop: false,
      locateApprovals: true,
      exceptions: true,
      systemAlerts: true,
    }
  );

  // Initialize desktop notification permission state
  const [desktopPermission, setDesktopPermission] = useState(Notification.permission);

  // Initialize loading state for permission requests
  const [isLoading, setIsLoading] = useState(false);

  // Access the showNotification function from the useNotification hook
  const { showNotification } = useNotification();

  // Create handlers for toggling notification preferences
  const handleTogglePreference = useCallback(
    (key: keyof NotificationPreferences, event: React.ChangeEvent<HTMLInputElement>) => {
      setPreferences({
        ...preferences,
        [key]: event.target.checked,
      });
    },
    [preferences, setPreferences]
  );

  // Create handler for requesting desktop notification permission
  const handleRequestDesktopPermission = useCallback(async () => {
    setIsLoading(true);
    try {
      const permission = await notificationService.requestDesktopNotificationPermission();
      setDesktopPermission(permission ? 'granted' : 'denied');
      if (permission) {
        showNotification(
          'success',
          'Desktop Notifications Enabled',
          'You will now receive desktop notifications for important events.'
        );
      } else {
        showNotification(
          'warning',
          'Desktop Notifications Denied',
          'You have denied permission for desktop notifications. You can change this in your browser settings.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setDesktopPermission, showNotification, notificationService]);

  // Load initial notification preferences on component mount
  useEffect(() => {
    // No specific action needed on mount, preferences are loaded by useLocalStorage
  }, []);

  // Save notification preferences to local storage when they change
  useEffect(() => {
    // The setPreferences function from useLocalStorage handles saving to local storage
  }, [preferences, setPreferences]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <SettingsCard>
          <SettingsSection>
            <SectionTitle variant="h6">Delivery Method</SectionTitle>
            <SettingItem>
              <SettingLabel>In-App Notifications</SettingLabel>
              <Switch
                checked={preferences.inApp}
                onChange={(event) => handleTogglePreference('inApp', event)}
                name="inApp"
              />
            </SettingItem>
            <SettingItem>
              <SettingLabel>Email Notifications</SettingLabel>
              <Switch
                checked={preferences.email}
                onChange={(event) => handleTogglePreference('email', event)}
                name="email"
              />
            </SettingItem>
            <SettingItem>
              <SettingLabel>Desktop Notifications</SettingLabel>
              <Switch
                checked={preferences.desktop}
                onChange={(event) => handleTogglePreference('desktop', event)}
                name="desktop"
                disabled={desktopPermission !== 'granted'}
              />
            </SettingItem>
            {desktopPermission !== 'granted' && (
              <PermissionButton
                variant="contained"
                color="primary"
                onClick={handleRequestDesktopPermission}
                disabled={isLoading}
              >
                {isLoading ? 'Requesting...' : 'Request Permission'}
              </PermissionButton>
            )}
            {desktopPermission === 'denied' && (
              <Typography variant="body2" color="error">
                Desktop notifications are disabled in your browser settings.
              </Typography>
            )}
          </SettingsSection>
          <Divider />
          <SettingsSection>
            <SectionTitle variant="h6">Notification Type</SectionTitle>
            <SettingItem>
              <SettingLabel>Locate Approvals</SettingLabel>
              <Switch
                checked={preferences.locateApprovals}
                onChange={(event) => handleTogglePreference('locateApprovals', event)}
                name="locateApprovals"
              />
            </SettingItem>
            <SettingItem>
              <SettingLabel>Exceptions</SettingLabel>
              <Switch
                checked={preferences.exceptions}
                onChange={(event) => handleTogglePreference('exceptions', event)}
                name="exceptions"
              />
            </SettingItem>
            <SettingItem>
              <SettingLabel>System Alerts</SettingLabel>
              <Switch
                checked={preferences.systemAlerts}
                onChange={(event) => handleTogglePreference('systemAlerts', event)}
                name="systemAlerts"
              />
            </SettingItem>
          </SettingsSection>
        </SettingsCard>
      </Grid>
    </Grid>
  );
};

export default NotificationSettings;