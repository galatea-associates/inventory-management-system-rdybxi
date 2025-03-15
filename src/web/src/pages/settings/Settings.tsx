import React, { useState, useEffect } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { useNavigate, useLocation, Navigate, Routes, Route } from 'react-router-dom'; // React Router components and hooks for navigation and routing version ^6.8.1
import { Box, Tabs, Tab } from '@mui/material'; // Material-UI Box, Tabs, and Tab components for layout containers version 5.13

import Page from '../../components/layout/Page'; // Import Page component for consistent layout structure
import UserSettings from './UserSettings'; // Import UserSettings component for user profile and security settings
import NotificationSettings from './NotificationSettings'; // Import NotificationSettings component for notification preferences
import DisplaySettings from './DisplaySettings'; // Import DisplaySettings component for theme and display preferences
import AppSettings from './AppSettings'; // Import AppSettings component for application-wide settings
import { ROUTES } from '../../router/routes'; // Import route constants for navigation
import useBreakpoint from '../../hooks/useBreakpoint'; // Import custom hook for responsive breakpoint detection

// Define the available settings tabs with their labels and paths
const TABS = [
  { label: 'User', value: 'user', path: '/settings/user' },
  { label: 'Notifications', value: 'notifications', path: '/settings/notifications' },
  { label: 'Display', value: 'display', path: '/settings/display' },
  { label: 'Application', value: 'application', path: '/settings/application' },
];

// Styled container for the settings page content
const SettingsContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

// Styled container for the tabs navigation
const TabsContainer = styled(Box)`
  border-bottom: 1px solid;
  borderColor: theme.palette.divider;
  marginBottom: theme.spacing(3);
`;

// Styled container for the route content
const ContentContainer = styled(Box)`
  flex: 1 1 auto;
  overflow: auto;
  padding: theme.spacing(0, 2);
  paddingBottom: theme.spacing(3);
`;

// Styled container for tabs on mobile devices
const MobileTabsContainer = styled(Box)`
  width: 100%;
  overflowX: auto;
  borderBottom: 1px solid;
  borderColor: theme.palette.divider;
  marginBottom: theme.spacing(2);
`;

/**
 * Main component that renders the settings page with nested routes for different settings categories
 */
const Settings: React.FC = () => {
  // Get current location and navigation function from React Router
  const location = useLocation();
  const navigate = useNavigate();

  // Get current breakpoint using useBreakpoint hook
  const breakpoint = useBreakpoint();

  // Initialize state for active tab based on current route
  const [activeTab, setActiveTab] = useState<number>(() => {
    const path = location.pathname;
    const tab = TABS.find(tab => path.startsWith(tab.path));
    return tab ? TABS.indexOf(tab) : 0;
  });

  /**
   * Handles tab selection changes and navigates to the corresponding route
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Determine the target route based on the selected tab index
    const targetRoute = TABS[newValue].path;

    // Navigate to the appropriate settings route
    navigate(targetRoute);

    // Update the active tab state
    setActiveTab(newValue);
  };

  // Create effect to update active tab when route changes
  useEffect(() => {
    const path = location.pathname;
    const tab = TABS.find(tab => path.startsWith(tab.path));
    setActiveTab(tab ? TABS.indexOf(tab) : 0);
  }, [location.pathname]);

  // Apply responsive styling based on current breakpoint
  const isMobile = breakpoint.isDownSm;

  // Render Page component with title 'Settings'
  return (
    <Page title="Settings">
      <SettingsContainer>
        {/* Render Tabs component for navigation between settings categories */}
        {isMobile ? (
          <MobileTabsContainer>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="settings navigation"
              variant="scrollable"
              scrollButtons="auto"
            >
              {/* Render Tab components for each settings category (User, Notifications, Display, Application) */}
              {TABS.map((tab, index) => (
                <Tab key={tab.value} label={tab.label} value={index} />
              ))}
            </Tabs>
          </MobileTabsContainer>
        ) : (
          <TabsContainer>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="settings navigation"
              indicatorColor="primary"
              textColor="primary"
            >
              {/* Render Tab components for each settings category (User, Notifications, Display, Application) */}
              {TABS.map((tab, index) => (
                <Tab key={tab.value} label={tab.label} value={index} />
              ))}
            </Tabs>
          </TabsContainer>
        )}

        {/* Render Routes component with nested routes for each settings category */}
        <ContentContainer>
          <Routes>
            {/* Render Route components for each settings page component */}
            <Route path={ROUTES.SETTINGS + '/user'} element={<UserSettings />} />
            <Route path={ROUTES.SETTINGS + '/notifications'} element={<NotificationSettings />} />
            <Route path={ROUTES.SETTINGS + '/display'} element={<DisplaySettings />} />
            <Route path={ROUTES.SETTINGS + '/application'} element={<AppSettings />} />

            {/* Include default redirect to user settings if no specific route is matched */}
            <Route path={ROUTES.SETTINGS} element={<Navigate to={ROUTES.SETTINGS + '/user'} />} />
          </Routes>
        </ContentContainer>
      </SettingsContainer>
    </Page>
  );
};

export default Settings;