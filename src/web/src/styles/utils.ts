/**
 * Style Utilities
 * 
 * This file provides utility functions for consistent styling across
 * the Inventory Management System UI. These utilities help maintain
 * visual consistency, implement responsive design patterns, and ensure
 * accessibility compliance.
 */

import { css } from '@emotion/react'; // v11.10.6
import { colors } from './variables';

/**
 * Gets a color from the theme color palette with optional opacity
 * @param colorName Name of the color in the theme (e.g., "primary", "error")
 * @param variant Variant of the color (e.g., "main", "light", "dark")
 * @param opacity Optional opacity value between 0 and 1
 * @returns CSS color value with optional opacity
 */
export const getThemeColor = (
  colorName: string,
  variant: string = 'main',
  opacity?: number
): string => {
  // Split the colorName if it contains a dot notation (e.g., "grey.500")
  const parts = colorName.split('.');
  
  let color: any = colors;
  
  // Navigate through the color object
  for (const part of parts) {
    if (color && color[part]) {
      color = color[part];
    } else {
      // If the color doesn't exist, return a fallback
      return colors.grey[500];
    }
  }
  
  // If we have a nested object (like primary with main, light, etc.)
  if (typeof color === 'object' && color !== null && variant in color) {
    color = color[variant];
  }
  
  // If color is still an object after trying to get the variant, use a fallback
  if (typeof color === 'object' && color !== null) {
    return colors.grey[500];
  }
  
  // Apply opacity if specified
  if (opacity !== undefined && color.startsWith('#')) {
    return hexToRgba(color, opacity);
  }
  
  return color;
};

/**
 * Converts a hex color code to rgba format with specified opacity
 * @param hex Hex color code (e.g., "#FFFFFF" or "#FFF")
 * @param opacity Opacity value between 0 and 1
 * @returns RGBA color string
 */
export const hexToRgba = (hex: string, opacity: number = 1): string => {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  if (!result) {
    return hex; // Return the original hex if it's not a valid hex color
  }

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Converts RGB values to a hex color code
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @returns Hex color code
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (c: number): string => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Lightens a color by a specified percentage
 * @param color Color to lighten (hex, rgb, or rgba)
 * @param percent Percentage to lighten (0-100)
 * @returns Lightened color
 */
export const lightenColor = (color: string, percent: number): string => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const rgb = hexToRgba(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!rgb) return color;
    
    const r = parseInt(rgb[1], 10);
    const g = parseInt(rgb[2], 10);
    const b = parseInt(rgb[3], 10);
    const amount = percent / 100;
    
    const newR = Math.round(r + (255 - r) * amount);
    const newG = Math.round(g + (255 - g) * amount);
    const newB = Math.round(b + (255 - b) * amount);
    
    return rgbToHex(newR, newG, newB);
  }
  
  // Handle rgb/rgba colors
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
    
    const amount = percent / 100;
    
    const newR = Math.round(r + (255 - r) * amount);
    const newG = Math.round(g + (255 - g) * amount);
    const newB = Math.round(b + (255 - b) * amount);
    
    return a < 1 
      ? `rgba(${newR}, ${newG}, ${newB}, ${a})`
      : `rgb(${newR}, ${newG}, ${newB})`;
  }
  
  // Return original color if format not recognized
  return color;
};

/**
 * Darkens a color by a specified percentage
 * @param color Color to darken (hex, rgb, or rgba)
 * @param percent Percentage to darken (0-100)
 * @returns Darkened color
 */
export const darkenColor = (color: string, percent: number): string => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const rgb = hexToRgba(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!rgb) return color;
    
    const r = parseInt(rgb[1], 10);
    const g = parseInt(rgb[2], 10);
    const b = parseInt(rgb[3], 10);
    const amount = percent / 100;
    
    const newR = Math.round(r * (1 - amount));
    const newG = Math.round(g * (1 - amount));
    const newB = Math.round(b * (1 - amount));
    
    return rgbToHex(newR, newG, newB);
  }
  
  // Handle rgb/rgba colors
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
    
    const amount = percent / 100;
    
    const newR = Math.round(r * (1 - amount));
    const newG = Math.round(g * (1 - amount));
    const newB = Math.round(b * (1 - amount));
    
    return a < 1 
      ? `rgba(${newR}, ${newG}, ${newB}, ${a})`
      : `rgb(${newR}, ${newG}, ${newB})`;
  }
  
  // Return original color if format not recognized
  return color;
};

/**
 * Returns a contrasting color (light or dark) based on the background color
 * Uses WCAG recommended contrast calculation
 * @param backgroundColor Background color to calculate contrast against
 * @returns Contrasting color (white or black)
 */
export const getContrastColor = (backgroundColor: string): string => {
  // Convert to RGB if it's a hex color
  let r: number, g: number, b: number;
  
  if (backgroundColor.startsWith('#')) {
    const rgb = hexToRgba(backgroundColor).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!rgb) return '#ffffff';
    
    r = parseInt(rgb[1], 10);
    g = parseInt(rgb[2], 10);
    b = parseInt(rgb[3], 10);
  } else {
    const rgbMatch = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbMatch) {
      r = parseInt(rgbMatch[1], 10);
      g = parseInt(rgbMatch[2], 10);
      b = parseInt(rgbMatch[3], 10);
    } else {
      // Default to black if color format not recognized
      return '#ffffff';
    }
  }
  
  // Calculate relative luminance using the formula from WCAG 2.0
  const sRGB = [r / 255, g / 255, b / 255];
  
  // Convert sRGB values to linear RGB
  const linearRGB = sRGB.map(val => {
    if (val <= 0.03928) {
      return val / 12.92;
    }
    return Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  // Calculate relative luminance
  const luminance = linearRGB[0] * 0.2126 + linearRGB[1] * 0.7152 + linearRGB[2] * 0.0722;
  
  // Return white for dark backgrounds, black for light backgrounds
  // Using the WCAG recommended threshold of 0.179
  return luminance > 0.179 ? '#000000' : '#ffffff';
};

/**
 * Creates CSS styles for different component variants
 * @param variant Component variant (e.g., "outlined", "contained")
 * @param variantStyles Object mapping variants to style objects
 * @returns CSS properties for the specified variant
 */
export const createVariantStyles = (
  variant: string, 
  variantStyles: Record<string, any>
): any => {
  return variantStyles[variant] || variantStyles.default || {};
};

/**
 * Creates CSS styles for different component sizes
 * @param size Component size (e.g., "small", "medium", "large")
 * @param sizeStyles Object mapping sizes to style objects
 * @returns CSS properties for the specified size
 */
export const createSizeStyles = (
  size: string, 
  sizeStyles: Record<string, any>
): any => {
  return sizeStyles[size] || sizeStyles.medium || {};
};

/**
 * Creates CSS styles for different component colors
 * @param color Component color (e.g., "primary", "secondary", "error")
 * @param colorStyles Object mapping colors to style objects
 * @returns CSS properties for the specified color
 */
export const createColorStyles = (
  color: string, 
  colorStyles: Record<string, any>
): any => {
  return colorStyles[color] || colorStyles.primary || {};
};

/**
 * Creates CSS styles for different component states (hover, active, disabled)
 * @param stateStyles Object with hover, active, and disabled style objects
 * @returns CSS properties for component states
 */
export const createStateStyles = (stateStyles: {
  hover?: any;
  active?: any;
  disabled?: any;
}): any => {
  return {
    ...(stateStyles.hover && { '&:hover': stateStyles.hover }),
    ...(stateStyles.active && { '&:active': stateStyles.active }),
    ...(stateStyles.disabled && { '&:disabled': stateStyles.disabled }),
  };
};

/**
 * Applies CSS styles conditionally based on a condition
 * @param condition Boolean condition to determine if styles should be applied
 * @param styles CSS properties to apply if condition is true
 * @returns CSS properties if condition is true, empty object otherwise
 */
export const conditionalStyle = (condition: boolean, styles: any): any => {
  return condition ? styles : {};
};

/**
 * Merges multiple style objects together
 * @param styleObjects Array of style objects to merge
 * @returns Merged CSS properties
 */
export const mergeStyles = (styleObjects: any[]): any => {
  return styleObjects.reduce((merged, current) => {
    if (!current) return merged;
    
    // Handle nested selectors and media queries
    Object.keys(current).forEach(key => {
      if (key.startsWith('&') || key.startsWith('@media')) {
        merged[key] = merged[key] 
          ? { ...merged[key], ...current[key] } 
          : current[key];
      } else {
        merged[key] = current[key];
      }
    });
    
    return merged;
  }, {});
};

/**
 * Creates responsive styles that change at different breakpoints
 * @param breakpointStyles Object mapping breakpoints to style objects
 * @returns CSS properties with media queries
 */
export const createResponsiveStyles = (breakpointStyles: {
  xs?: any;
  sm?: any;
  md?: any;
  lg?: any;
  xl?: any;
  default?: any;
}): any => {
  // Import breakpoints from variables
  const { breakpoints } = require('./variables');
  
  const styles = {
    // Apply base styles (either default or xs)
    ...(breakpointStyles.default || breakpointStyles.xs || {}),
    
    // Apply styles for sm breakpoint and above
    ...(breakpointStyles.sm && {
      [`@media (min-width: ${breakpoints.sm}px)`]: breakpointStyles.sm
    }),
    
    // Apply styles for md breakpoint and above
    ...(breakpointStyles.md && {
      [`@media (min-width: ${breakpoints.md}px)`]: breakpointStyles.md
    }),
    
    // Apply styles for lg breakpoint and above
    ...(breakpointStyles.lg && {
      [`@media (min-width: ${breakpoints.lg}px)`]: breakpointStyles.lg
    }),
    
    // Apply styles for xl breakpoint and above
    ...(breakpointStyles.xl && {
      [`@media (min-width: ${breakpoints.xl}px)`]: breakpointStyles.xl
    }),
  };
  
  return styles;
};

/**
 * Creates CSS for text truncation with ellipsis
 * @param lines Number of lines to show before truncation (default: 1)
 * @returns CSS properties for text truncation
 */
export const ellipsis = (lines: number = 1): any => {
  if (lines === 1) {
    return {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    };
  }
  
  return {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    // Fallback for browsers that don't support -webkit-line-clamp
    maxHeight: `${lines * 1.5}em`,
  };
};

/**
 * Creates CSS to visually hide an element while keeping it accessible to screen readers
 * Follows WCAG 2.1 recommendations for screen reader accessibility
 * @returns CSS properties for visually hidden elements
 */
export const visuallyHidden = (): any => {
  return {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  };
};

/**
 * Creates CSS for screen reader only content (alias for visuallyHidden)
 * @returns CSS properties for screen reader only content
 */
export const srOnly = (): any => visuallyHidden();