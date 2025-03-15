import { ThemeMode, ThemeConfig, CustomTheme } from '../types/theme';
import { DEFAULT_THEME_CONFIG, THEME_MODES, THEME_STORAGE_KEY } from '../constants/theme';
import { createLightTheme, createDarkTheme, createThemeFromConfig } from '../styles/theme';

/**
 * Returns the default theme configuration
 * @returns The default theme configuration
 */
export const getDefaultThemeConfig = (): ThemeConfig => {
  return DEFAULT_THEME_CONFIG;
};

/**
 * Retrieves the stored theme configuration from localStorage if available
 * @returns The stored theme configuration or null if not found
 */
export const getStoredThemeConfig = (): ThemeConfig | null => {
  try {
    const storedConfig = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedConfig) {
      return JSON.parse(storedConfig) as ThemeConfig;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving stored theme config:', error);
    return null;
  }
};

/**
 * Stores the theme configuration in localStorage
 * @param config The theme configuration to store
 */
export const storeThemeConfig = (config: ThemeConfig): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error storing theme config:', error);
  }
};

/**
 * Creates a light theme configuration with optional overrides
 * @param overrides Optional overrides for the theme configuration
 * @returns A light theme configuration
 */
export const createLightThemeConfig = (overrides: Partial<ThemeConfig> = {}): ThemeConfig => {
  return {
    ...DEFAULT_THEME_CONFIG,
    mode: ThemeMode.LIGHT,
    ...overrides,
  };
};

/**
 * Creates a dark theme configuration with optional overrides
 * @param overrides Optional overrides for the theme configuration
 * @returns A dark theme configuration
 */
export const createDarkThemeConfig = (overrides: Partial<ThemeConfig> = {}): ThemeConfig => {
  return {
    ...DEFAULT_THEME_CONFIG,
    mode: ThemeMode.DARK,
    ...overrides,
  };
};

/**
 * Toggles between light and dark theme modes
 * @param currentConfig The current theme configuration
 * @returns A new theme configuration with toggled mode
 */
export const toggleThemeMode = (currentConfig: ThemeConfig): ThemeConfig => {
  return {
    ...currentConfig,
    mode: currentConfig.mode === ThemeMode.LIGHT ? ThemeMode.DARK : ThemeMode.LIGHT
  };
};

/**
 * Toggles high contrast mode in the theme configuration
 * @param currentConfig The current theme configuration
 * @returns A new theme configuration with toggled high contrast mode
 */
export const toggleHighContrastMode = (currentConfig: ThemeConfig): ThemeConfig => {
  return {
    ...currentConfig,
    highContrastMode: !currentConfig.highContrastMode
  };
};

// Re-export theme creation functions from styles/theme.ts
export { createThemeFromConfig, createLightTheme, createDarkTheme };