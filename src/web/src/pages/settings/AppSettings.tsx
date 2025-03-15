import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Grid } from '@mui/material'; // @mui/material 5.13
import Card from '../../components/common/Card';
import Typography from '../../components/common/Typography';
import FormControl from '../../components/common/FormControl';
import Select from '../../components/common/Select';
import Switch from '../../components/common/Switch';
import { useNotification } from '../../hooks/useNotification';
import { getUserPreferences, updateUserPreferences } from '../../api/user';

/**
 * @interface AppPreferences
 * @description Interface for application preferences
 */
interface AppPreferences {
  dateFormat: string;
  numberFormat: string;
  timezone: string;
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number;
  confirmOnDelete: boolean;
  showTutorialTips: boolean;
  defaultView: string;
  itemsPerPage: number;
}

/**
 * @interface SelectOption
 * @description Interface for select options
 */
interface SelectOption {
  value: string | number;
  label: string;
}

/**
 * @styled SettingsSection
 * @description Styled container for each settings section
 */
const SettingsSection = styled(Card)`
  margin-bottom: 24px;
  padding: 24px;
`;

/**
 * @styled SectionTitle
 * @description Styled component for section titles
 */
const SectionTitle = styled(Typography)`
  margin-bottom: 16px;
  font-weight: 500;
`;

/**
 * @styled SettingRow
 * @description Styled container for individual settings
 */
const SettingRow = styled(Box)`
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
`;

/**
 * @styled ButtonContainer
 * @description Styled container for action buttons
 */
const ButtonContainer = styled(Box)`
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
`;

/**
 * @constant DATE_FORMAT_OPTIONS
 * @type {SelectOption[]}
 * @description Options for date format selection
 */
const DATE_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

/**
 * @constant NUMBER_FORMAT_OPTIONS
 * @type {SelectOption[]}
 * @description Options for number format selection
 */
const NUMBER_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'en-US', label: 'US (1,234.56)' },
  { value: 'en-GB', label: 'UK (1,234.56)' },
  { value: 'de-DE', label: 'German (1.234,56)' },
  { value: 'fr-FR', label: 'French (1 234,56)' },
  { value: 'ja-JP', label: 'Japanese (1,234.56)' },
];

/**
 * @constant TIMEZONE_OPTIONS
 * @type {SelectOption[]}
 * @description Options for timezone selection
 */
const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
];

/**
 * @constant DEFAULT_VIEW_OPTIONS
 * @type {SelectOption[]}
 * @description Options for default view selection
 */
const DEFAULT_VIEW_OPTIONS: SelectOption[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'positions', label: 'Positions' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'locates', label: 'Locates' },
];

/**
 * @constant ITEMS_PER_PAGE_OPTIONS
 * @type {SelectOption[]}
 * @description Options for items per page selection
 */
const ITEMS_PER_PAGE_OPTIONS: SelectOption[] = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

/**
 * @function AppSettings
 * @description Main component for application settings configuration
 */
const AppSettings: React.FC = () => {
  /**
   * @state preferences
   * @type {AppPreferences}
   * @initial_value
   * @purpose Store application preferences state
   */
  const [preferences, setPreferences] = useState<AppPreferences>({
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'en-US',
    timezone: 'America/New_York',
    autoRefreshEnabled: true,
    autoRefreshInterval: 60,
    confirmOnDelete: true,
    showTutorialTips: true,
    defaultView: 'dashboard',
    itemsPerPage: 25,
  });

  /**
   * @state loading
   * @type {boolean}
   * @initial_value false
   * @purpose Track loading state during API operations
   */
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * @hook useNotification
   * @description Get notification functions from useNotification hook
   */
  const { showSuccess, showError } = useNotification();

  /**
   * @callback fetchPreferences
   * @description Fetches user preferences from the API
   */
  const fetchPreferences = useCallback(async () => {
    /** @step Set loading state to true */
    setLoading(true);
    try {
      /** @step Call getUserPreferences API function */
      const userPreferences = await getUserPreferences();
      /** @step Update preferences state with fetched data */
      setPreferences(userPreferences);
    } catch (err: any) {
      /** @step Handle any errors with error notifications */
      showError('Error', 'Failed to load preferences');
    } finally {
      /** @step Set loading state to false regardless of outcome */
      setLoading(false);
    }
  }, [getUserPreferences, showError, setPreferences]);

  /**
   * @callback handleSavePreferences
   * @description Saves updated preferences to the API
   */
  const handleSavePreferences = useCallback(async () => {
    /** @step Set loading state to true */
    setLoading(true);
    try {
      /** @step Call updateUserPreferences API function with current preferences state */
      await updateUserPreferences(preferences);
      /** @step Show success notification on successful update */
      showSuccess('Success', 'Preferences updated successfully');
    } catch (err: any) {
      /** @step Handle any errors with error notifications */
      showError('Error', 'Failed to update preferences');
    } finally {
      /** @step Set loading state to false regardless of outcome */
      setLoading(false);
    }
  }, [preferences, updateUserPreferences, showSuccess, showError, setLoading]);

  /**
   * @callback handleChange
   * @description Handles changes to form controls
   * @param {string} name
   * @param {any} value
   */
  const handleChange = useCallback((name: string, value: any) => {
    /** @step Update preferences state with new value for the specified setting */
    setPreferences(prev => ({ ...prev, [name]: value }));
  }, [setPreferences]);

  /**
   * @hook useEffect
   * @description Fetch user preferences on component mount
   */
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  /**
   * @returns {JSX.Element} Rendered application settings page
   */
  return (
    <Box>
      <SettingsSection>
        <SectionTitle variant="h5">General Settings</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <SettingRow>
              <FormControl fullWidth>
                <Select
                  label="Date Format"
                  value={preferences.dateFormat}
                  onChange={e => handleChange('dateFormat', e.target.value)}
                  options={DATE_FORMAT_OPTIONS}
                />
              </FormControl>
            </SettingRow>
          </Grid>
          <Grid item xs={12} md={6}>
            <SettingRow>
              <FormControl fullWidth>
                <Select
                  label="Number Format"
                  value={preferences.numberFormat}
                  onChange={e => handleChange('numberFormat', e.target.value)}
                  options={NUMBER_FORMAT_OPTIONS}
                />
              </FormControl>
            </SettingRow>
          </Grid>
          <Grid item xs={12} md={6}>
            <SettingRow>
              <FormControl fullWidth>
                <Select
                  label="Timezone"
                  value={preferences.timezone}
                  onChange={e => handleChange('timezone', e.target.value)}
                  options={TIMEZONE_OPTIONS}
                />
              </FormControl>
            </SettingRow>
          </Grid>
        </Grid>
      </SettingsSection>

      <SettingsSection>
        <SectionTitle variant="h5">Data Management</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <SettingRow>
              <FormControl fullWidth>
                <Switch
                  label="Confirm on Delete"
                  checked={preferences.confirmOnDelete}
                  onChange={e => handleChange('confirmOnDelete', e.target.checked)}
                />
              </FormControl>
            </SettingRow>
          </Grid>
        </Grid>
      </SettingsSection>

      <SettingsSection>
        <SectionTitle variant="h5">Performance</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <SettingRow>
              <FormControl fullWidth>
                <Switch
                  label="Auto Refresh Enabled"
                  checked={preferences.autoRefreshEnabled}
                  onChange={e => handleChange('autoRefreshEnabled', e.target.checked)}
                />
              </FormControl>
            </SettingRow>
          </Grid>
          <Grid item xs={12} md={6}>
            <SettingRow>
              <FormControl fullWidth>
                <Select
                  label="Auto Refresh Interval (seconds)"
                  value={preferences.autoRefreshInterval}
                  onChange={e => handleChange('autoRefreshInterval', Number(e.target.value))}
                  options={[
                    { value: 30, label: '30' },
                    { value: 60, label: '60' },
                    { value: 120, label: '120' },
                    { value: 300, label: '300' },
                  ]}
                />
              </FormControl>
            </SettingRow>
          </Grid>
        </Grid>
      </SettingsSection>

      <SettingsSection>
        <SectionTitle variant="h5">Default Values</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <SettingRow>
              <FormControl fullWidth>
                <Select
                  label="Default View"
                  value={preferences.defaultView}
                  onChange={e => handleChange('defaultView', String(e.target.value))}
                  options={DEFAULT_VIEW_OPTIONS}
                />
              </FormControl>
            </SettingRow>
          </Grid>
           <Grid item xs={12} md={6}>
            <SettingRow>
              <FormControl fullWidth>
                <Select
                  label="Items Per Page"
                  value={preferences.itemsPerPage}
                  onChange={e => handleChange('itemsPerPage', Number(e.target.value))}
                  options={ITEMS_PER_PAGE_OPTIONS}
                />
              </FormControl>
            </SettingRow>
          </Grid>
          <Grid item xs={12} md={6}>
            <SettingRow>
              <FormControl fullWidth>
                <Switch
                  label="Show Tutorial Tips"
                  checked={preferences.showTutorialTips}
                  onChange={e => handleChange('showTutorialTips', e.target.checked)}
                />
              </FormControl>
            </SettingRow>
          </Grid>
        </Grid>
      </SettingsSection>

      <ButtonContainer>
        <button onClick={handleSavePreferences} disabled={loading}>
          Save
        </button>
      </ButtonContainer>
    </Box>
  );
};

export default AppSettings;