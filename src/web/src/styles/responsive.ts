/**
 * Responsive Design Utilities
 * 
 * This file provides a standardized approach to implementing responsive layouts
 * across different screen sizes, ensuring consistent user experience on desktop, 
 * laptop, tablet, and mobile devices.
 */

import { breakpoints } from './variables';
import { css } from '@emotion/react'; // @emotion/react version: ^11.10.6

// Extract keys from breakpoints for type safety and utility
export const BREAKPOINT_KEYS = Object.keys(breakpoints) as Array<keyof typeof breakpoints>;

type BreakpointKey = keyof typeof breakpoints;

/**
 * Creates a media query string for a specific breakpoint
 * @param breakpoint - The breakpoint key (xs, sm, md, lg, xl)
 * @param type - The media query type (min-width, max-width, etc.)
 * @returns A media query string
 */
export const mediaQuery = (breakpoint: BreakpointKey, type: string): string => {
  const value = breakpoints[breakpoint];
  
  if (value === undefined) {
    throw new Error(`Undefined breakpoint: ${breakpoint}`);
  }
  
  return `@media (${type}: ${value}px)`;
};

/**
 * Creates a min-width media query for screens larger than the specified breakpoint
 * @param breakpoint - The breakpoint key (xs, sm, md, lg, xl)
 * @returns A media query string for min-width
 */
export const up = (breakpoint: BreakpointKey): string => {
  return mediaQuery(breakpoint, 'min-width');
};

/**
 * Creates a max-width media query for screens smaller than the specified breakpoint
 * @param breakpoint - The breakpoint key (xs, sm, md, lg, xl)
 * @returns A media query string for max-width
 */
export const down = (breakpoint: BreakpointKey): string => {
  // Special case for xs breakpoint
  if (breakpoint === 'xs') {
    return '@media (max-width: 599.99px)';
  }
  
  const value = breakpoints[breakpoint];
  
  // Use 0.01px less to avoid overlap with the next breakpoint
  return `@media (max-width: ${value - 0.01}px)`;
};

/**
 * Creates a media query for screens between two specified breakpoints
 * @param minBreakpoint - The minimum breakpoint key (xs, sm, md, lg, xl)
 * @param maxBreakpoint - The maximum breakpoint key (xs, sm, md, lg, xl)
 * @returns A media query string for the range
 */
export const between = (minBreakpoint: BreakpointKey, maxBreakpoint: BreakpointKey): string => {
  const minValue = breakpoints[minBreakpoint];
  const maxValue = breakpoints[maxBreakpoint];
  
  if (minValue === undefined || maxValue === undefined) {
    throw new Error(`Undefined breakpoint: ${minValue === undefined ? minBreakpoint : maxBreakpoint}`);
  }
  
  if (minValue >= maxValue) {
    throw new Error(`Invalid breakpoint range: ${minBreakpoint} (${minValue}) is not smaller than ${maxBreakpoint} (${maxValue})`);
  }
  
  return `@media (min-width: ${minValue}px) and (max-width: ${maxValue - 0.01}px)`;
};

/**
 * Creates a media query for a specific breakpoint range
 * @param breakpoint - The breakpoint key (xs, sm, md, lg, xl)
 * @returns A media query string for the specific breakpoint
 */
export const only = (breakpoint: BreakpointKey): string => {
  const index = BREAKPOINT_KEYS.indexOf(breakpoint);
  
  if (index === -1) {
    throw new Error(`Undefined breakpoint: ${breakpoint}`);
  }
  
  const value = breakpoints[breakpoint];
  
  // If it's the last breakpoint, use only min-width
  if (index === BREAKPOINT_KEYS.length - 1) {
    return `@media (min-width: ${value}px)`;
  }
  
  // Otherwise, use a range between current and next breakpoint
  const nextBreakpoint = BREAKPOINT_KEYS[index + 1] as BreakpointKey;
  const nextValue = breakpoints[nextBreakpoint];
  
  return `@media (min-width: ${value}px) and (max-width: ${nextValue - 0.01}px)`;
};

/**
 * Higher-order function that creates a media query function for use with CSS-in-JS
 * @param queryFunction - A function that returns a media query string
 * @returns A function that accepts CSS properties and returns a media query
 */
export const createMediaQuery = (
  queryFunction: (breakpoint: BreakpointKey) => string
) => {
  return (breakpoint: BreakpointKey) => {
    return (styles: any) => css`
      ${queryFunction(breakpoint)} {
        ${styles}
      }
    `;
  };
};

// CSS-in-JS media query functions for easy use with Emotion
export const upMedia = createMediaQuery(up);
export const downMedia = createMediaQuery(down);

// For betweenMedia, we need a custom implementation since it takes two parameters
export const betweenMedia = (minBreakpoint: BreakpointKey, maxBreakpoint: BreakpointKey) => {
  return (styles: any) => css`
    ${between(minBreakpoint, maxBreakpoint)} {
      ${styles}
    }
  `;
};

export const onlyMedia = createMediaQuery(only);