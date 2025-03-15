import React, { createContext, useState, useContext, useEffect, useMemo } from 'react'; // react version ^18.2.0
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'; // @mui/material version 5.13

import { ThemeContextType, ThemeConfig, CustomTheme } from '../types/theme';
import { 
  createThemeFromConfig, 
  toggleThemeMode, 
  toggleHighContrastMode, 
  getDefaultThemeConfig, 
  getStoredThemeConfig,
  storeThemeConfig 
} from '../config/theme';
import useLocalStorage from '../hooks/useLocalStorage';
import { THEME_STORAGE_KEY } from '../constants/theme';

/**
 * Creates the theme context with default values
 * @returns Theme context with default values
 */
const createThemeContext = (): React.Context<ThemeContextType> => {
  const defaultConfig = getDefaultThemeConfig();
  const defaultTheme = createThemeFromConfig(defaultConfig);
  
  return createContext<ThemeContextType>({
    theme: defaultTheme,
    themeConfig: defaultConfig,
    setThemeConfig: () => {},
    toggleThemeMode: () => {},
    toggleHighContrastMode: () => {}
  });
};

// Create the theme context
const ThemeContext = createThemeContext();

/**
 * Provider component that manages theme state and provides theme context to the application
 * @param children - Child components to be wrapped by the ThemeProvider
 * @returns Theme provider component with children
 */
const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  // Initialize theme configuration from localStorage or use default
  const [themeConfig, setThemeConfig] = useLocalStorage<ThemeConfig>(
    THEME_STORAGE_KEY,
    getDefaultThemeConfig()
  );
  
  // Create theme object from configuration
  const theme = useMemo(() => {
    return createThemeFromConfig(themeConfig);
  }, [themeConfig]);
  
  // Handle partial theme configuration updates
  const handleSetThemeConfig = (config: Partial<ThemeConfig>) => {
    setThemeConfig(prevConfig => ({
      ...prevConfig,
      ...config
    }));
  };
  
  // Toggle between light and dark theme modes
  const handleToggleThemeMode = () => {
    setThemeConfig(prevConfig => toggleThemeMode(prevConfig));
  };
  
  // Toggle high contrast mode for accessibility
  const handleToggleHighContrastMode = () => {
    setThemeConfig(prevConfig => toggleHighContrastMode(prevConfig));
  };
  
  // Create context value with memoization to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    theme,
    themeConfig,
    setThemeConfig: handleSetThemeConfig,
    toggleThemeMode: handleToggleThemeMode,
    toggleHighContrastMode: handleToggleHighContrastMode
  }), [theme, themeConfig]);
  
  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook to access the theme context
 * @returns Theme context value
 * @throws Error if used outside of ThemeProvider
 */
const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export { ThemeContext, ThemeProvider, useTheme };