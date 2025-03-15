import { breakpoints } from '../../styles/variables';

/**
 * Interface defining the structure of breakpoint values
 */
export interface Breakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

/**
 * Array of available breakpoint names (xs, sm, md, lg, xl)
 */
export const BREAKPOINT_NAMES = ['xs', 'sm', 'md', 'lg', 'xl'];

/**
 * Object mapping breakpoint names to their pixel values
 */
export const BREAKPOINT_VALUES: Breakpoints = {
  xs: breakpoints.xs, // 0px - Mobile small
  sm: breakpoints.sm, // 600px - Mobile large
  md: breakpoints.md, // 960px - Tablet
  lg: breakpoints.lg, // 1280px - Desktop
  xl: breakpoints.xl, // 1920px - Large desktop
};

/**
 * Gets the pixel value for a named breakpoint
 * 
 * @param breakpoint - The breakpoint name
 * @returns The pixel value for the breakpoint
 */
export function getBreakpointValue(breakpoint: string): number {
  return BREAKPOINT_VALUES[breakpoint as keyof Breakpoints] || 0;
}

/**
 * Determines the current breakpoint name based on window width
 * 
 * @param width - The current window width
 * @returns The current breakpoint name (xs, sm, md, lg, xl)
 */
export function getBreakpointFromWidth(width: number): string {
  if (width >= BREAKPOINT_VALUES.xl) {
    return 'xl';
  }
  if (width >= BREAKPOINT_VALUES.lg) {
    return 'lg';
  }
  if (width >= BREAKPOINT_VALUES.md) {
    return 'md';
  }
  if (width >= BREAKPOINT_VALUES.sm) {
    return 'sm';
  }
  return 'xs';
}

/**
 * Checks if the current width is greater than or equal to a specified breakpoint
 * 
 * @param breakpoint - The breakpoint to check against
 * @param width - The current window width
 * @returns True if width is greater than or equal to the breakpoint value
 */
export function isWidthUp(breakpoint: string, width: number): boolean {
  const breakpointValue = getBreakpointValue(breakpoint);
  return width >= breakpointValue;
}

/**
 * Checks if the current width is less than a specified breakpoint
 * 
 * @param breakpoint - The breakpoint to check against
 * @param width - The current window width
 * @returns True if width is less than the breakpoint value
 */
export function isWidthDown(breakpoint: string, width: number): boolean {
  const breakpointValue = getBreakpointValue(breakpoint);
  return width < breakpointValue;
}

/**
 * Checks if the current width is between two specified breakpoints
 * 
 * @param lowerBreakpoint - The lower bound breakpoint
 * @param upperBreakpoint - The upper bound breakpoint
 * @param width - The current window width
 * @returns True if width is between the lower and upper breakpoints
 */
export function isWidthBetween(
  lowerBreakpoint: string,
  upperBreakpoint: string,
  width: number
): boolean {
  const lowerBreakpointValue = getBreakpointValue(lowerBreakpoint);
  const upperBreakpointValue = getBreakpointValue(upperBreakpoint);
  
  return width >= lowerBreakpointValue && width < upperBreakpointValue;
}