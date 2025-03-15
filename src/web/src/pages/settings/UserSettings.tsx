import React, { useState, useEffect } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Tabs, Tab, Box } from '@mui/material'; // Material-UI components for tabbed interface version 5.13
import { useNavigate, useLocation } from 'react-router-dom'; // React Router hooks for navigation and location information version ^6.8.1
import Page from '../../components/layout/Page'; // Container component for page layout with consistent styling
import Card from '../../components/common/Card'; // Container component for settings sections
import Typography from '../../components/common/Typography'; // Text component for headings and descriptions
import UserProfile from '../../components/auth/UserProfile'; // Component for displaying and editing user profile information
import ChangePasswordForm from '../../components/auth/ChangePasswordForm'; // Form component for changing user password
import NotificationSettings from './NotificationSettings'; // Component for managing notification settings
import DisplaySettings from './DisplaySettings'; // Component for managing display and theme settings
import AppSettings from './AppSettings'; // Component for managing application-wide settings
import { useAuth } from '../../hooks/useAuth'; // Custom hook for authentication functionality

// Styled container for the settings page content
const SettingsContainer = styled(Box)`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
`;

// Styled container for the tabs navigation
const TabsContainer = styled(Box)`
  border-bottom: 1px solid;
  border-color: theme => theme.palette.divider;
  margin-bottom: 24px;
`;

// Styled container for the active tab content
const TabContent = styled(Box)`
  padding: 16px 0;
  min-height: 400px;
`;

// Styled container for security settings section
const SecuritySection = styled(Card)`
  margin-bottom: 24px;
  padding: 24px;
`;

// Styled component for section titles
const SectionTitle = styled(Typography)`
  margin-bottom: 16px;
  font-weight: 500;
`;

/**
 * Main component for the user settings page with tabbed navigation
 */
const UserSettings: React.FC = () => {
  // Get current user data from useAuth hook
  const { user } = useAuth();

  // Get current location and navigation function from React Router
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize state for active tab based on URL hash or default to 'profile'
  const [activeTab, setActiveTab] = useState<string>(() => {
    const hash = location.hash.substring(1); // Remove the '#'
    return hash || 'profile'; // Default to 'profile' if no hash
  });

  // Handle tab change to update active tab and URL hash
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    navigate(`#${newValue}`, { replace: true }); // Update URL hash
  };

  return (
    <Page title="Settings">
      <SettingsContainer>
        <TabsContainer>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="user settings tabs"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Profile" value="profile" />
            <Tab label="Security" value="security" />
            <Tab label="Notifications" value="notifications" />
            <Tab label="Display" value="display" />
            <Tab label="Application" value="application" />
          </Tabs>
        </TabsContainer>

        <TabContent>
          {activeTab === 'profile' && (
            <UserProfile />
          )}

          {activeTab === 'security' && (
            <SecuritySection>
              <SectionTitle variant="h6">Change Password</SectionTitle>
              <ChangePasswordForm onSuccess={() => {}} onCancel={() => setActiveTab('profile')} />
            </SecuritySection>
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings />
          )}

          {activeTab === 'display' && (
            <DisplaySettings />
          )}

          {activeTab === 'application' && (
            <AppSettings />
          )}
        </TabContent>
      </SettingsContainer>
    </Page>
  );
};

export default UserSettings;