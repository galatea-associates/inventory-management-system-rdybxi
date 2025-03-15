/**
 * Core theme creation module for the Inventory Management System UI.
 * Provides functions to create and customize themes based on configuration options,
 * supporting both light and dark modes as well as accessibility features.
 */

import { createTheme, responsiveFontSizes } from '@mui/material/styles'; // @mui/material version 5.13
import merge from 'lodash/merge'; // lodash version ^4.17.21

import { 
  colors, 
  typography, 
  spacing, 
  breakpoints, 
  shadows, 
  transitions, 
  zIndex, 
  borderRadius, 
  accessibility 
} from './variables';

import { 
  ThemeMode, 
  ThemeConfig, 
  CustomTheme, 
  CustomThemeOptions 
} from '../types/theme';

import { 
  COLORS, 
  THEME_MODES 
} from '../constants/theme';

/**
 * Creates base theme options that are common to all themes
 * @param highContrastMode Whether high contrast mode is enabled
 * @returns Base theme options object
 */
const createBaseThemeOptions = (highContrastMode: boolean): CustomThemeOptions => {
  // Create base typography settings using typography variables
  const typographyOptions = {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeightLight: typography.fontWeights.light,
    fontWeightRegular: typography.fontWeights.regular,
    fontWeightMedium: typography.fontWeights.medium,
    fontWeightBold: typography.fontWeights.bold,
    h1: {
      fontSize: typography.fontSizes.xxxl,
      fontWeight: typography.fontWeights.bold,
      lineHeight: typography.lineHeights.xs,
    },
    h2: {
      fontSize: typography.fontSizes.xxl,
      fontWeight: typography.fontWeights.bold,
      lineHeight: typography.lineHeights.sm,
    },
    h3: {
      fontSize: typography.fontSizes.xl,
      fontWeight: typography.fontWeights.medium,
      lineHeight: typography.lineHeights.sm,
    },
    h4: {
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.medium,
      lineHeight: typography.lineHeights.md,
    },
    h5: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.medium,
      lineHeight: typography.lineHeights.md,
    },
    h6: {
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.medium,
      lineHeight: typography.lineHeights.md,
    },
    subtitle1: {
      fontSize: typography.fontSizes.md,
      lineHeight: typography.lineHeights.md,
    },
    subtitle2: {
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.medium,
      lineHeight: typography.lineHeights.md,
    },
    body1: {
      fontSize: typography.fontSizes.md,
      lineHeight: typography.lineHeights.md,
    },
    body2: {
      fontSize: typography.fontSizes.sm,
      lineHeight: typography.lineHeights.md,
    },
    button: {
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.medium,
      textTransform: 'none',
    },
    caption: {
      fontSize: typography.fontSizes.xs,
      lineHeight: typography.lineHeights.md,
    },
    overline: {
      fontSize: typography.fontSizes.xs,
      fontWeight: typography.fontWeights.medium,
      textTransform: 'uppercase',
      letterSpacing: typography.letterSpacings.wide,
      lineHeight: typography.lineHeights.md,
    },
  };

  // Create spacing function based on spacing unit
  const spacingFunction = (factor: number) => spacing.unit * factor;

  // Set up breakpoints based on breakpoint variables
  const breakpointsOptions = {
    values: {
      xs: breakpoints.xs,
      sm: breakpoints.sm,
      md: breakpoints.md,
      lg: breakpoints.lg,
      xl: breakpoints.xl,
    },
  };

  // Configure shape properties including border radius
  const shapeOptions = {
    borderRadius: borderRadius.md,
  };

  // Set up transitions using transition variables
  const transitionsOptions = {
    easing: {
      easeInOut: transitions.easing.easeInOut,
      easeOut: transitions.easing.easeOut,
      easeIn: transitions.easing.easeIn,
      sharp: transitions.easing.sharp,
    },
    duration: {
      shortest: transitions.duration.shortest,
      shorter: transitions.duration.shorter,
      short: transitions.duration.short,
      standard: transitions.duration.standard,
      complex: transitions.duration.complex,
      enteringScreen: transitions.duration.enteringScreen,
      leavingScreen: transitions.duration.leavingScreen,
    },
  };

  // Configure z-index values using zIndex variables
  const zIndexOptions = {
    mobileStepper: 1000,
    appBar: 1100,
    drawer: zIndex.drawer,
    modal: zIndex.modal,
    snackbar: 1400,
    tooltip: zIndex.tooltip,
    speedDial: 1050,
  };

  // Create base theme options
  const baseThemeOptions: CustomThemeOptions = {
    typography: typographyOptions,
    spacing: spacingFunction,
    breakpoints: breakpointsOptions,
    shape: shapeOptions,
    transitions: transitionsOptions,
    zIndex: zIndexOptions,
    shadows: shadows,
    palette: {} as CustomThemeOptions['palette'], // This will be filled by light/dark theme options
  };

  // Apply high contrast mode settings if enabled
  if (highContrastMode) {
    return applyHighContrastMode(baseThemeOptions);
  }

  return baseThemeOptions;
};

/**
 * Creates theme options for light mode
 * @param config Theme configuration
 * @returns Light theme options object
 */
const createLightThemeOptions = (config: ThemeConfig): CustomThemeOptions => {
  // Get base theme options using createBaseThemeOptions
  const baseOptions = createBaseThemeOptions(config.highContrastMode);

  // Create light palette using color variables
  const palette: CustomThemeOptions['palette'] = {
    mode: 'light',
    primary: {
      main: config.primaryColor || colors.primary.main,
      light: colors.primary.light,
      dark: colors.primary.dark,
      contrastText: colors.primary.contrastText,
    },
    secondary: {
      main: config.secondaryColor || colors.secondary.main,
      light: colors.secondary.light,
      dark: colors.secondary.dark,
      contrastText: colors.secondary.contrastText,
    },
    error: {
      main: colors.error.main,
      light: colors.error.light,
      dark: colors.error.dark,
      contrastText: colors.error.contrastText,
    },
    warning: {
      main: colors.warning.main,
      light: colors.warning.light,
      dark: colors.warning.dark,
      contrastText: colors.warning.contrastText,
    },
    info: {
      main: colors.info.main,
      light: colors.info.light,
      dark: colors.info.dark,
      contrastText: colors.info.contrastText,
    },
    success: {
      main: colors.success.main,
      light: colors.success.light,
      dark: colors.success.dark,
      contrastText: colors.success.contrastText,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      disabled: colors.text.disabled,
      hint: colors.text.hint,
    },
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
      darker: colors.grey[200],
      lighter: colors.grey[50],
    },
    divider: colors.grey[300],
    action: {
      active: 'rgba(0, 0, 0, 0.54)',
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
      focus: 'rgba(0, 0, 0, 0.12)',
    },
  };

  // Configure component overrides for light mode
  const components = {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: config.borderRadius || borderRadius.md,
          textTransform: 'none',
          fontWeight: typography.fontWeights.medium,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: shadows[2],
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: colors.primary.dark,
          },
        },
        outlinedPrimary: {
          borderColor: colors.primary.main,
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
          },
        },
        textPrimary: {
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: config.borderRadius || borderRadius.md,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: config.borderRadius || borderRadius.md,
          boxShadow: shadows[2],
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: config.borderRadius || borderRadius.md,
        },
        elevation1: {
          boxShadow: shadows[1],
        },
        elevation2: {
          boxShadow: shadows[2],
        },
        elevation3: {
          boxShadow: shadows[3],
        },
        elevation4: {
          boxShadow: shadows[4],
        },
        elevation6: {
          boxShadow: shadows[6],
        },
        elevation8: {
          boxShadow: shadows[8],
        },
        elevation12: {
          boxShadow: shadows[12],
        },
        elevation16: {
          boxShadow: shadows[16],
        },
        elevation24: {
          boxShadow: shadows[24],
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: shadows[3],
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.background.paper,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${colors.grey[300]}`,
        },
        head: {
          backgroundColor: colors.grey[100],
          color: colors.text.primary,
          fontWeight: typography.fontWeights.medium,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.sm,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: config.borderRadius || borderRadius.md,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: typography.fontWeights.medium,
        },
      },
    },
  };

  // Apply custom primary and secondary colors from config
  // Apply high contrast mode settings if enabled in config
  // Return the merged theme options
  return merge({}, baseOptions, {
    palette,
    components,
    shape: {
      borderRadius: config.borderRadius || borderRadius.md,
    },
    typography: {
      fontFamily: config.fontFamily || typography.fontFamily,
    },
  });
};

/**
 * Creates theme options for dark mode
 * @param config Theme configuration
 * @returns Dark theme options object
 */
const createDarkThemeOptions = (config: ThemeConfig): CustomThemeOptions => {
  // Get base theme options using createBaseThemeOptions
  const baseOptions = createBaseThemeOptions(config.highContrastMode);

  // Create dark palette using color variables
  const palette: CustomThemeOptions['palette'] = {
    mode: 'dark',
    primary: {
      main: config.primaryColor || colors.primary.main,
      light: colors.primary.light,
      dark: colors.primary.dark,
      contrastText: colors.primary.contrastText,
    },
    secondary: {
      main: config.secondaryColor || colors.secondary.main,
      light: colors.secondary.light,
      dark: colors.secondary.dark,
      contrastText: colors.secondary.contrastText,
    },
    error: {
      main: colors.error.light, // Lighter shade for dark mode
      light: colors.error.main,
      dark: colors.error.dark,
      contrastText: colors.error.contrastText,
    },
    warning: {
      main: colors.warning.light, // Lighter shade for dark mode
      light: colors.warning.main,
      dark: colors.warning.dark,
      contrastText: colors.warning.contrastText,
    },
    info: {
      main: colors.info.light, // Lighter shade for dark mode
      light: colors.info.main,
      dark: colors.info.dark,
      contrastText: colors.info.contrastText,
    },
    success: {
      main: colors.success.light, // Lighter shade for dark mode
      light: colors.success.main,
      dark: colors.success.dark,
      contrastText: colors.success.contrastText,
    },
    text: {
      primary: colors.common.white,
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)',
      hint: 'rgba(255, 255, 255, 0.5)',
    },
    background: {
      default: colors.grey[900],
      paper: colors.grey[800],
      darker: colors.grey.A400,
      lighter: colors.grey[700],
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      active: colors.common.white,
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
      disabled: 'rgba(255, 255, 255, 0.3)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
      focus: 'rgba(255, 255, 255, 0.12)',
    },
  };

  // Configure component overrides for dark mode
  const components = {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: config.borderRadius || borderRadius.md,
          textTransform: 'none',
          fontWeight: typography.fontWeights.medium,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: shadows[2],
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: colors.primary.light,
          },
        },
        outlinedPrimary: {
          borderColor: colors.primary.main,
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
          },
        },
        textPrimary: {
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: config.borderRadius || borderRadius.md,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: config.borderRadius || borderRadius.md,
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: config.borderRadius || borderRadius.md,
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.3),0px 1px 1px 0px rgba(0,0,0,0.24),0px 1px 3px 0px rgba(0,0,0,0.22)',
        },
        elevation2: {
          boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.3),0px 2px 2px 0px rgba(0,0,0,0.24),0px 1px 5px 0px rgba(0,0,0,0.22)',
        },
        elevation3: {
          boxShadow: '0px 3px 3px -2px rgba(0,0,0,0.3),0px 3px 4px 0px rgba(0,0,0,0.24),0px 1px 8px 0px rgba(0,0,0,0.22)',
        },
        elevation4: {
          boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.3),0px 4px 5px 0px rgba(0,0,0,0.24),0px 1px 10px 0px rgba(0,0,0,0.22)',
        },
        elevation6: {
          boxShadow: '0px 3px 5px -1px rgba(0,0,0,0.3),0px 6px 10px 0px rgba(0,0,0,0.24),0px 1px 18px 0px rgba(0,0,0,0.22)',
        },
        elevation8: {
          boxShadow: '0px 5px 5px -3px rgba(0,0,0,0.3),0px 8px 10px 1px rgba(0,0,0,0.24),0px 3px 14px 2px rgba(0,0,0,0.22)',
        },
        elevation12: {
          boxShadow: '0px 7px 8px -4px rgba(0,0,0,0.3),0px 12px 17px 2px rgba(0,0,0,0.24),0px 5px 22px 4px rgba(0,0,0,0.22)',
        },
        elevation16: {
          boxShadow: '0px 8px 10px -5px rgba(0,0,0,0.3),0px 16px 24px 2px rgba(0,0,0,0.24),0px 6px 30px 5px rgba(0,0,0,0.22)',
        },
        elevation24: {
          boxShadow: '0px 11px 15px -7px rgba(0,0,0,0.3),0px 24px 38px 3px rgba(0,0,0,0.24),0px 9px 46px 8px rgba(0,0,0,0.22)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.3),0px 4px 5px 0px rgba(0,0,0,0.24),0px 1px 10px 0px rgba(0,0,0,0.22)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.grey[800],
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        },
        head: {
          backgroundColor: colors.grey[900],
          color: colors.common.white,
          fontWeight: typography.fontWeights.medium,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.sm,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: config.borderRadius || borderRadius.md,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: typography.fontWeights.medium,
        },
      },
    },
  };

  // Apply custom primary and secondary colors from config
  // Apply high contrast mode settings if enabled in config
  // Return the merged theme options
  return merge({}, baseOptions, {
    palette,
    components,
    shape: {
      borderRadius: config.borderRadius || borderRadius.md,
    },
    typography: {
      fontFamily: config.fontFamily || typography.fontFamily,
    },
  });
};

/**
 * Creates a complete light theme
 * @param config Optional partial theme configuration
 * @returns Complete light theme object
 */
const createLightTheme = (config: Partial<ThemeConfig> = {}): CustomTheme => {
  // Create default light theme config if none provided
  const defaultConfig: ThemeConfig = {
    mode: ThemeMode.LIGHT,
    primaryColor: colors.primary.main,
    secondaryColor: colors.secondary.main,
    fontFamily: typography.fontFamily,
    borderRadius: borderRadius.md,
    highContrastMode: false,
  };

  // Merge with provided config
  const mergedConfig = { ...defaultConfig, ...config };

  // Generate light theme options using createLightThemeOptions
  const themeOptions = createLightThemeOptions(mergedConfig);

  // Create theme using Material-UI createTheme
  const theme = createTheme(themeOptions as any);

  // Apply responsive font sizes
  const responsiveTheme = responsiveFontSizes(theme);

  // Return the final theme object
  return responsiveTheme as unknown as CustomTheme;
};

/**
 * Creates a complete dark theme
 * @param config Optional partial theme configuration
 * @returns Complete dark theme object
 */
const createDarkTheme = (config: Partial<ThemeConfig> = {}): CustomTheme => {
  // Create default dark theme config if none provided
  const defaultConfig: ThemeConfig = {
    mode: ThemeMode.DARK,
    primaryColor: colors.primary.main,
    secondaryColor: colors.secondary.main,
    fontFamily: typography.fontFamily,
    borderRadius: borderRadius.md,
    highContrastMode: false,
  };

  // Merge with provided config
  const mergedConfig = { ...defaultConfig, ...config };

  // Generate dark theme options using createDarkThemeOptions
  const themeOptions = createDarkThemeOptions(mergedConfig);

  // Create theme using Material-UI createTheme
  const theme = createTheme(themeOptions as any);

  // Apply responsive font sizes
  const responsiveTheme = responsiveFontSizes(theme);

  // Return the final theme object
  return responsiveTheme as unknown as CustomTheme;
};

/**
 * Returns a theme based on the specified mode
 * @param mode The theme mode (light or dark)
 * @param config Optional partial theme configuration
 * @returns Theme object for the specified mode
 */
const getThemeByMode = (mode: ThemeMode, config: Partial<ThemeConfig> = {}): CustomTheme => {
  // Check the provided theme mode
  switch (mode) {
    case ThemeMode.LIGHT:
      return createLightTheme(config);
    case ThemeMode.DARK:
      return createDarkTheme(config);
    default:
      return createLightTheme(config);
  }
};

/**
 * Creates a theme based on the provided configuration
 * @param config The theme configuration
 * @returns Theme object based on the provided configuration
 */
const createThemeFromConfig = (config: ThemeConfig): CustomTheme => {
  // Get theme based on the mode in the config using getThemeByMode
  return getThemeByMode(config.mode, config);
};

/**
 * Applies high contrast mode settings to theme options
 * @param themeOptions The theme options to modify
 * @returns Theme options with high contrast settings applied
 */
const applyHighContrastMode = (themeOptions: CustomThemeOptions): CustomThemeOptions => {
  // Create a deep copy to avoid modifying the original object
  const modifiedOptions = merge({}, themeOptions);

  // Ensure palette exists
  if (!modifiedOptions.palette) {
    modifiedOptions.palette = {} as CustomThemeOptions['palette'];
  }

  // Enhance contrast for text colors
  if (modifiedOptions.palette) {
    if (modifiedOptions.palette.mode === 'light') {
      // Light theme high contrast modifications
      modifiedOptions.palette.text = {
        primary: colors.common.black,
        secondary: 'rgba(0, 0, 0, 0.8)',
        disabled: 'rgba(0, 0, 0, 0.5)',
        hint: 'rgba(0, 0, 0, 0.5)',
      };

      // Increase contrast for background colors
      modifiedOptions.palette.background = {
        ...modifiedOptions.palette.background,
        default: colors.common.white,
        paper: colors.common.white,
        darker: colors.grey[300],
        lighter: colors.grey[100],
      };
    } else {
      // Dark theme high contrast modifications
      modifiedOptions.palette.text = {
        primary: colors.common.white,
        secondary: 'rgba(255, 255, 255, 0.9)',
        disabled: 'rgba(255, 255, 255, 0.6)',
        hint: 'rgba(255, 255, 255, 0.6)',
      };

      // Increase contrast for background colors
      modifiedOptions.palette.background = {
        ...modifiedOptions.palette.background,
        default: colors.grey[900],
        paper: colors.common.black,
        darker: '#000000',
        lighter: colors.grey[800],
      };
    }

    // Increase contrast for primary and secondary colors
    modifiedOptions.palette.primary = {
      ...modifiedOptions.palette.primary,
      main: '#0052CC', // Higher contrast blue
      contrastText: colors.common.white,
    };

    modifiedOptions.palette.secondary = {
      ...modifiedOptions.palette.secondary,
      main: '#403294', // Higher contrast purple
      contrastText: colors.common.white,
    };

    // Increase contrast for dividers
    modifiedOptions.palette.divider = modifiedOptions.palette.mode === 'light' 
      ? colors.common.black 
      : colors.common.white;
  }

  // Add stronger focus indicators
  if (!modifiedOptions.components) {
    modifiedOptions.components = {};
  }

  // Apply focus styles to various components
  const focusStyles = {
    MuiButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `${accessibility.highContrastOutline} ${colors.primary.main}`,
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '3px',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `${accessibility.highContrastOutline} ${colors.primary.main}`,
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `${accessibility.highContrastOutline} ${colors.primary.main}`,
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `${accessibility.highContrastOutline} ${colors.primary.main}`,
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `${accessibility.highContrastOutline} ${colors.primary.main}`,
            outlineOffset: '2px',
          },
        },
      },
    },
  };

  // Merge focus styles with existing component overrides
  modifiedOptions.components = merge({}, modifiedOptions.components, focusStyles);

  // Return the modified theme options
  return modifiedOptions;
};

// Export the theme creation functions
export {
  createLightTheme,
  createDarkTheme,
  getThemeByMode,
  createThemeFromConfig,
};