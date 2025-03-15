/**
 * Theme Constants
 * 
 * This file defines theme-related constants for the Inventory Management System (IMS) UI.
 * It centralizes theme configuration to ensure consistent styling throughout the application.
 */

import { ThemeMode, ThemeConfig } from '../types/theme';
import { colors } from '../styles/variables';

/**
 * Theme mode constants
 */
export const THEME_MODES = {
  LIGHT: ThemeMode.LIGHT,
  DARK: ThemeMode.DARK,
};

/**
 * Default theme configuration
 * Used when no user preferences are set
 */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  mode: ThemeMode.LIGHT,
  primaryColor: colors.primary.main,
  secondaryColor: colors.secondary.main,
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  borderRadius: 8,
  highContrastMode: false,
};

/**
 * LocalStorage key for persisting user theme preferences
 */
export const THEME_STORAGE_KEY = 'ims-theme-preferences';

/**
 * Color palette constants
 * Defines the color scheme for the application
 */
export const COLORS = {
  PRIMARY: {
    LIGHT: colors.primary.light,
    MAIN: colors.primary.main,
    DARK: colors.primary.dark,
    CONTRAST_TEXT: colors.primary.contrastText,
  },
  SECONDARY: {
    LIGHT: colors.secondary.light,
    MAIN: colors.secondary.main,
    DARK: colors.secondary.dark,
    CONTRAST_TEXT: colors.secondary.contrastText,
  },
  SUCCESS: {
    LIGHT: colors.success.light,
    MAIN: colors.success.main,
    DARK: colors.success.dark,
    CONTRAST_TEXT: colors.success.contrastText,
  },
  ERROR: {
    LIGHT: colors.error.light,
    MAIN: colors.error.main,
    DARK: colors.error.dark,
    CONTRAST_TEXT: colors.error.contrastText,
  },
  WARNING: {
    LIGHT: colors.warning.light,
    MAIN: colors.warning.main,
    DARK: colors.warning.dark,
    CONTRAST_TEXT: colors.warning.contrastText,
  },
  INFO: {
    LIGHT: colors.info.light,
    MAIN: colors.info.main,
    DARK: colors.info.dark,
    CONTRAST_TEXT: colors.info.contrastText,
  },
  GREY: {
    50: colors.grey[50],
    100: colors.grey[100],
    200: colors.grey[200],
    300: colors.grey[300],
    400: colors.grey[400],
    500: colors.grey[500],
    600: colors.grey[600],
    700: colors.grey[700],
    800: colors.grey[800],
    900: colors.grey[900],
    A100: colors.grey.A100,
    A200: colors.grey.A200,
    A400: colors.grey.A400,
    A700: colors.grey.A700,
  },
  BACKGROUND: {
    DEFAULT: colors.background.default,
    PAPER: colors.background.paper,
    SECONDARY: colors.background.secondary,
  },
  TEXT: {
    PRIMARY: colors.text.primary,
    SECONDARY: colors.text.secondary,
    DISABLED: colors.text.disabled,
    HINT: colors.text.hint,
  },
};

/**
 * Typography constants
 * Defines font family, weights, and sizes
 */
export const TYPOGRAPHY = {
  FONT_FAMILY: '"Roboto", "Helvetica", "Arial", sans-serif',
  FONT_WEIGHTS: {
    LIGHT: 300,
    REGULAR: 400,
    MEDIUM: 500,
    BOLD: 700,
  },
  FONT_SIZES: {
    XS: '0.75rem',    // 12px
    SM: '0.875rem',   // 14px
    MD: '1rem',       // 16px
    LG: '1.25rem',    // 20px
    XL: '1.5rem',     // 24px
    XXL: '2rem',      // 32px
    XXXL: '3rem',     // 48px
  },
};

/**
 * Spacing constants
 * Based on an 8px grid system
 */
export const SPACING = {
  UNIT: 8, // Base unit in pixels
  SIZES: {
    XS: 4,    // 4px
    SM: 8,    // 8px
    MD: 16,   // 16px
    LG: 24,   // 24px
    XL: 32,   // 32px
  },
};

/**
 * Breakpoint constants for responsive design
 * Values in pixels
 */
export const BREAKPOINTS = {
  XS: 0,      // Mobile small
  SM: 600,    // Mobile large
  MD: 960,    // Tablet
  LG: 1280,   // Desktop
  XL: 1920,   // Large desktop
};

/**
 * Shadow constants for elevation effects
 * Array index represents elevation level
 */
export const SHADOWS = [
  'none',
  '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
  '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
  '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
  '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
  '0px 3px 5px -1px rgba(0,0,0,0.2),0px 5px 8px 0px rgba(0,0,0,0.14),0px 1px 14px 0px rgba(0,0,0,0.12)',
  '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)',
  '0px 4px 5px -2px rgba(0,0,0,0.2),0px 7px 10px 1px rgba(0,0,0,0.14),0px 2px 16px 1px rgba(0,0,0,0.12)',
  '0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12)',
  '0px 5px 6px -3px rgba(0,0,0,0.2),0px 9px 12px 1px rgba(0,0,0,0.14),0px 3px 16px 2px rgba(0,0,0,0.12)',
  '0px 6px 6px -3px rgba(0,0,0,0.2),0px 10px 14px 1px rgba(0,0,0,0.14),0px 4px 18px 3px rgba(0,0,0,0.12)',
  '0px 6px 7px -4px rgba(0,0,0,0.2),0px 11px 15px 1px rgba(0,0,0,0.14),0px 4px 20px 3px rgba(0,0,0,0.12)',
  '0px 7px 8px -4px rgba(0,0,0,0.2),0px 12px 17px 2px rgba(0,0,0,0.14),0px 5px 22px 4px rgba(0,0,0,0.12)',
  '0px 7px 8px -4px rgba(0,0,0,0.2),0px 13px 19px 2px rgba(0,0,0,0.14),0px 5px 24px 4px rgba(0,0,0,0.12)',
  '0px 7px 9px -4px rgba(0,0,0,0.2),0px 14px 21px 2px rgba(0,0,0,0.14),0px 5px 26px 4px rgba(0,0,0,0.12)',
  '0px 8px 9px -5px rgba(0,0,0,0.2),0px 15px 22px 2px rgba(0,0,0,0.14),0px 6px 28px 5px rgba(0,0,0,0.12)',
  '0px 8px 10px -5px rgba(0,0,0,0.2),0px 16px 24px 2px rgba(0,0,0,0.14),0px 6px 30px 5px rgba(0,0,0,0.12)',
  '0px 8px 11px -5px rgba(0,0,0,0.2),0px 17px 26px 2px rgba(0,0,0,0.14),0px 6px 32px 5px rgba(0,0,0,0.12)',
  '0px 9px 11px -5px rgba(0,0,0,0.2),0px 18px 28px 2px rgba(0,0,0,0.14),0px 7px 34px 6px rgba(0,0,0,0.12)',
  '0px 9px 12px -6px rgba(0,0,0,0.2),0px 19px 29px 2px rgba(0,0,0,0.14),0px 7px 36px 6px rgba(0,0,0,0.12)',
  '0px 10px 13px -6px rgba(0,0,0,0.2),0px 20px 31px 3px rgba(0,0,0,0.14),0px 8px 38px 7px rgba(0,0,0,0.12)',
  '0px 10px 13px -6px rgba(0,0,0,0.2),0px 21px 33px 3px rgba(0,0,0,0.14),0px 8px 40px 7px rgba(0,0,0,0.12)',
  '0px 10px 14px -6px rgba(0,0,0,0.2),0px 22px 35px 3px rgba(0,0,0,0.14),0px 8px 42px 7px rgba(0,0,0,0.12)',
  '0px 11px 14px -7px rgba(0,0,0,0.2),0px 23px 36px 3px rgba(0,0,0,0.14),0px 9px 44px 8px rgba(0,0,0,0.12)',
  '0px 11px 15px -7px rgba(0,0,0,0.2),0px 24px 38px 3px rgba(0,0,0,0.14),0px 9px 46px 8px rgba(0,0,0,0.12)',
];

/**
 * Transition constants for animations
 */
export const TRANSITIONS = {
  DURATION: {
    SHORTEST: 150,
    SHORTER: 200,
    SHORT: 250,
    STANDARD: 300,
    COMPLEX: 375,
    ENTERING_SCREEN: 225,
    LEAVING_SCREEN: 195,
  },
  EASING: {
    EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    EASE_OUT: 'cubic-bezier(0.0, 0, 0.2, 1)',
    EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
    SHARP: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
};

/**
 * Z-index constants for controlling element stacking
 */
export const Z_INDEX = {
  DRAWER: 1200,
  MODAL: 1300,
  POPOVER: 1400,
  TOOLTIP: 1500,
  HEADER: 1100,
  NOTIFICATION: 1600,
};

/**
 * Border radius constants for component shapes
 */
export const BORDER_RADIUS = {
  XS: 2,    // 2px
  SM: 4,    // 4px
  MD: 8,    // 8px
  LG: 12,   // 12px
  XL: 16,   // 16px
};

/**
 * Accessibility constants for focus indicators and high contrast mode
 */
export const ACCESSIBILITY = {
  FOCUS_OUTLINE: '2px solid',
  FOCUS_COLOR: colors.primary.main,
  HIGH_CONTRAST_OUTLINE: '3px solid',
};