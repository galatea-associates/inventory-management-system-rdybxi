/**
 * Style Variables
 * 
 * This file defines the core style variables for the Inventory Management System UI.
 * It serves as the foundation for the application's design system, providing standardized
 * values for colors, typography, spacing, breakpoints, shadows, transitions, z-indices,
 * border radii, and accessibility features.
 */

/**
 * Color Palette
 * 
 * Defines the color scheme for the application, including primary, secondary,
 * and semantic colors. These colors are designed to meet accessibility standards
 * with appropriate contrast ratios.
 */
export const colors = {
  primary: {
    main: '#1976d2', // Primary blue
    light: '#4791db',
    dark: '#115293',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#607d8b', // Blue grey
    light: '#8eacbb',
    dark: '#34515e',
    contrastText: '#ffffff',
  },
  error: {
    main: '#d32f2f', // Red
    light: '#ef5350',
    dark: '#c62828',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#ed6c02', // Orange
    light: '#ff9800',
    dark: '#e65100',
    contrastText: '#ffffff',
  },
  info: {
    main: '#0288d1', // Light blue
    light: '#03a9f4',
    dark: '#01579b',
    contrastText: '#ffffff',
  },
  success: {
    main: '#2e7d32', // Green
    light: '#4caf50',
    dark: '#1b5e20',
    contrastText: '#ffffff',
  },
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    A100: '#d5d5d5',
    A200: '#aaaaaa',
    A400: '#303030',
    A700: '#616161',
  },
  background: {
    default: '#ffffff',
    paper: '#ffffff',
    secondary: '#f5f5f5',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
    hint: 'rgba(0, 0, 0, 0.38)',
  },
  common: {
    black: '#000000',
    white: '#ffffff',
    transparent: 'transparent',
  },
};

/**
 * Typography
 * 
 * Defines the typographic elements including font family, weights, sizes,
 * line heights, and letter spacings to ensure consistent text styling.
 */
export const typography = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  fontWeights: {
    light: 300,
    regular: 400,
    medium: 500,
    bold: 700,
  },
  fontSizes: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    md: '1rem',        // 16px
    lg: '1.25rem',     // 20px
    xl: '1.5rem',      // 24px
    xxl: '2rem',       // 32px
    xxxl: '3rem',      // 48px
  },
  lineHeights: {
    xs: 1.1,
    sm: 1.25,
    md: 1.5,
    lg: 1.75,
    xl: 2,
  },
  letterSpacings: {
    tight: '-0.05em',
    normal: '0',
    wide: '0.05em',
  },
};

/**
 * Spacing
 * 
 * Defines spacing values used for margins, paddings, and layout spacing.
 * Based on an 8px grid system for consistency.
 */
export const spacing = {
  unit: 8, // Base unit in pixels
  xs: 4,   // 4px - Extra small spacing
  sm: 8,   // 8px - Small spacing
  md: 16,  // 16px - Medium spacing
  lg: 24,  // 24px - Large spacing
  xl: 32,  // 32px - Extra large spacing
};

/**
 * Breakpoints
 * 
 * Defines screen size thresholds for responsive design.
 * Values are in pixels and represent minimum widths.
 */
export const breakpoints = {
  xs: 0,      // Mobile small
  sm: 600,    // Mobile large
  md: 960,    // Tablet
  lg: 1280,   // Desktop
  xl: 1920,   // Large desktop
};

/**
 * Shadows
 * 
 * Defines shadow values for different elevation levels.
 * Array index represents the elevation level.
 */
export const shadows = [
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
 * Transitions
 * 
 * Defines transition timing and easing functions for animations.
 */
export const transitions = {
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
};

/**
 * Z-Index
 * 
 * Defines z-index values to control the stacking order of overlapping elements.
 */
export const zIndex = {
  drawer: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  header: 1100,
  notification: 1600,
};

/**
 * Border Radius
 * 
 * Defines border radius values for consistent component shapes and corners.
 */
export const borderRadius = {
  xs: 2,     // 2px
  sm: 4,     // 4px
  md: 8,     // 8px
  lg: 12,    // 12px
  xl: 16,    // 16px
  circle: '50%',
};

/**
 * Accessibility
 * 
 * Defines accessibility-related variables for focus indicators and high contrast mode.
 * These values ensure the UI meets WCAG 2.1 AA standards.
 */
export const accessibility = {
  focusOutline: '2px solid',
  focusColor: colors.primary.main,
  highContrastOutline: '3px solid',
  highContrastFocusColor: '#ffffff',
};