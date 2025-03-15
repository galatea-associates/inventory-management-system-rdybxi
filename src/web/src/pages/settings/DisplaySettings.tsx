import React, { useState, useEffect, useCallback, ReactElement } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Grid } from '@mui/material'; // Material-UI Box component for layout containers version 5.13

import Page from '../../components/layout/Page'; // Import Page component for consistent layout structure
import Card from '../../components/common/Card'; // Import Card component for grouping related settings
import Typography from '../../components/common/Typography'; // Import Typography component for text elements
import Switch from '../../components/common/Switch'; // Import Switch component for toggling theme settings
import Select from '../../components/common/Select'; // Import Select component for dropdown options
import { useTheme } from '../../contexts/ThemeContext'; // Import custom hook for accessing and modifying theme settings
import { ThemeMode } from '../../types/theme'; // Import theme mode enum for type safety
import { BORDER_RADIUS, COLORS, TYPOGRAPHY } from '../../constants/theme'; // Import theme constants for available options

/**
 * Interface for font family select options
 */
interface FontFamilyOption {
  value: string;
  label: string;
}

/**
 * Interface for color select options
 */
interface ColorOption {
  value: string;
  label: string;
  color: string;
}

/**
 * Interface for border radius select options
 */
interface BorderRadiusOption {
  value: string;
  label: string;
}

/**
 * Global font family options for the select component
 */
const fontFamilyOptions: FontFamilyOption[] = [
  { value: 'Roboto, sans-serif', label: 'Roboto (Default)' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
];

/**
 * Global color options for the select component
 */
const colorOptions: ColorOption[] = [
  { value: '#1976d2', label: 'Blue (Default)', color: '#1976d2' },
  { value: '#2e7d32', label: 'Green', color: '#2e7d32' },
  { value: '#9c27b0', label: 'Purple', color: '#9c27b0' },
  { value: '#d32f2f', label: 'Red', color: '#d32f2f' },
  { value: '#ed6c02', label: 'Orange', color: '#ed6c02' },
];

/**
 * Global border radius options for the select component
 */
const borderRadiusOptions: BorderRadiusOption[] = [
  { value: '4', label: 'Small (4px)' },
  { value: '8', label: 'Medium (8px)' },
  { value: '12', label: 'Large (12px)' },
  { value: '16', label: 'Extra Large (16px)' },
];

/**
 * Styled container for the settings page content
 */
const SettingsContainer = styled(Box)`
  padding: ${props => props.theme.spacing(3)};
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing(3)};
`;

/**
 * Styled Card component for settings sections
 */
const SettingsCard = styled(Card)`
  padding: ${props => props.theme.spacing(3)};
  margin-bottom: ${props => props.theme.spacing(3)};
`;

/**
 * Styled container for individual setting items
 */
const SettingItem = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${props => props.theme.spacing(2, 0)};
  border-bottom: 1px solid;
  borderColor: ${props => props.theme.palette.divider};
`;

/**
 * Styled container for setting labels and descriptions
 */
const SettingLabel = styled(Box)`
  display: flex;
  flex-direction: column;
`;

/**
 * Component that renders the display settings page with theme customization options
 */
const DisplaySettings: React.FC = React.memo((): ReactElement => {
  // Access theme context using useTheme hook to get current theme configuration and setter functions
  const { themeConfig, toggleThemeMode, toggleHighContrastMode, setThemeConfig } = useTheme();

  // Create state variables for form values that reflect current theme settings
  const [themeMode, setThemeMode] = useState<ThemeMode>(themeConfig.mode);
  const [highContrast, setHighContrast] = useState<boolean>(themeConfig.highContrastMode);
  const [fontFamily, setFontFamily] = useState<string>(themeConfig.fontFamily);
  const [primaryColor, setPrimaryColor] = useState<string>(themeConfig.primaryColor);
  const [borderRadiusValue, setBorderRadiusValue] = useState<string>(themeConfig.borderRadius.toString());

  // Implement useEffect to update form state when theme context changes
  useEffect(() => {
    setThemeMode(themeConfig.mode);
    setHighContrast(themeConfig.highContrastMode);
    setFontFamily(themeConfig.fontFamily);
    setPrimaryColor(themeConfig.primaryColor);
    setBorderRadiusValue(themeConfig.borderRadius.toString());
  }, [themeConfig]);

  // Create handlers for theme mode toggle, high contrast mode toggle, and other setting changes
  const handleThemeModeChange = useCallback(() => {
    // Call toggleThemeMode function from theme context
    toggleThemeMode();
    // Update local state to reflect the change
    setThemeMode(themeConfig.mode === ThemeMode.LIGHT ? ThemeMode.DARK : ThemeMode.LIGHT);
  }, [themeConfig.mode, toggleThemeMode]);

  const handleHighContrastChange = useCallback(() => {
    // Call toggleHighContrastMode function from theme context
    toggleHighContrastMode();
    // Update local state to reflect the change
    setHighContrast(themeConfig.highContrastMode);
  }, [themeConfig.highContrastMode, toggleHighContrastMode]);

  const handleFontFamilyChange = useCallback((value: string) => {
    // Create updated theme config with new font family
    const updatedConfig = { ...themeConfig, fontFamily: value };
    // Call setThemeConfig function from theme context
    setThemeConfig(updatedConfig);
    // Update local state to reflect the change
    setFontFamily(value);
  }, [setThemeConfig, themeConfig]);

  const handlePrimaryColorChange = useCallback((value: string) => {
    // Create updated theme config with new primary color
    const updatedConfig = { ...themeConfig, primaryColor: value };
    // Call setThemeConfig function from theme context
    setThemeConfig(updatedConfig);
    // Update local state to reflect the change
    setPrimaryColor(value);
  }, [setThemeConfig, themeConfig]);

  const handleBorderRadiusChange = useCallback((value: string) => {
    // Create updated theme config with new border radius
    const updatedConfig = { ...themeConfig, borderRadius: parseInt(value, 10) };
    // Call setThemeConfig function from theme context
    setThemeConfig(updatedConfig);
    // Update local state to reflect the change
    setBorderRadiusValue(value);
  }, [setThemeConfig, themeConfig]);

  // Render Page component with appropriate title
  return (
    <Page title="Display Settings">
      {/* Organize settings in Card components with appropriate Typography labels */}
      <SettingsContainer>
        <SettingsCard>
          <Typography variant="h6">Theme</Typography>
          {/* Render theme mode section with Switch component for light/dark mode toggle */}
          <SettingItem>
            <SettingLabel>
              <Typography variant="body1">Dark Mode</Typography>
              <Typography variant="body2">Toggle between light and dark theme</Typography>
            </SettingLabel>
            <Switch
              checked={themeMode === ThemeMode.DARK}
              onChange={handleThemeModeChange}
              name="darkMode"
              id="darkModeSwitch"
            />
          </SettingItem>
        </SettingsCard>

        <SettingsCard>
          <Typography variant="h6">Accessibility</Typography>
          {/* Render accessibility section with Switch component for high contrast mode */}
          <SettingItem>
            <SettingLabel>
              <Typography variant="body1">High Contrast</Typography>
              <Typography variant="body2">Increase contrast for better readability</Typography>
            </SettingLabel>
            <Switch
              checked={highContrast}
              onChange={handleHighContrastChange}
              name="highContrast"
              id="highContrastSwitch"
            />
          </SettingItem>
        </SettingsCard>

        <SettingsCard>
          <Typography variant="h6">Appearance</Typography>
          {/* Render appearance section with Select components for font family, primary color, and border radius */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1">Font Family</Typography>
              <Select
                options={fontFamilyOptions}
                value={fontFamily}
                onChange={(e) => handleFontFamilyChange(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1">Primary Color</Typography>
              <Select
                options={colorOptions.map(option => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={primaryColor}
                onChange={(e) => handlePrimaryColorChange(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1">Border Radius</Typography>
              <Select
                options={borderRadiusOptions}
                value={borderRadiusValue}
                onChange={(e) => handleBorderRadiusChange(e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>
        </SettingsCard>
      </SettingsContainer>
    </Page>
  );
});

DisplaySettings.displayName = 'DisplaySettings';

export default DisplaySettings;