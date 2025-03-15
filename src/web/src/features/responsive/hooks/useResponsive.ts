import { useState, useEffect, useMemo } from 'react'; // react 18.2.0
import useDebounce from '../../../hooks/useDebounce';
import useEventListener from '../../../hooks/useEventListener';
import {
  getBreakpointFromWidth,
  isWidthUp,
  isWidthDown,
  isWidthBetween,
  BREAKPOINT_NAMES,
} from '../utils/breakpoints';

/**
 * Interface defining the current viewport dimensions
 */
export interface Viewport {
  width: number;
  height: number;
}

/**
 * Interface defining the return value of the useResponsive hook
 */
export interface ResponsiveUtils {
  viewport: Viewport;
  breakpoint: string;
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  isUpXs: boolean;
  isUpSm: boolean;
  isUpMd: boolean;
  isUpLg: boolean;
  isUpXl: boolean;
  isDownXs: boolean;
  isDownSm: boolean;
  isDownMd: boolean;
  isDownLg: boolean;
  isDownXl: boolean;
  isBetween: (lowerBreakpoint: string, upperBreakpoint: string) => boolean;
}

/**
 * A custom React hook that provides responsive design capabilities by tracking the current
 * viewport size and providing utility functions to adapt components based on screen dimensions.
 * 
 * This hook is a core part of the Inventory Management System's responsive design strategy,
 * allowing components to adapt to different screen sizes (desktop, laptop, tablet, mobile).
 * 
 * Features:
 * - Tracks current viewport width and height
 * - Identifies current breakpoint (xs, sm, md, lg, xl)
 * - Provides utility functions for checking breakpoint conditions
 * - Implements debouncing for efficient resize event handling
 * 
 * @param debounceDelay - Delay in milliseconds to debounce resize events (default: 200)
 * @returns An object containing current viewport information and responsive utility functions
 * 
 * @example
 * // Basic usage
 * const { breakpoint, isLg, isUpMd } = useResponsive();
 * 
 * @example
 * // With custom debounce delay
 * const responsive = useResponsive(300);
 * if (responsive.isDownSm) {
 *   // Show mobile layout
 * }
 */
const useResponsive = (debounceDelay = 200): ResponsiveUtils => {
  // Initialize state to track viewport dimensions
  const [viewport, setViewport] = useState<Viewport>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Function to get current window dimensions
  const getWindowDimensions = (): Viewport => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  };

  // Create a debounced handler for window resize
  const handleResize = () => {
    setViewport(getWindowDimensions());
  };

  const debouncedHandleResize = useDebounce(handleResize, debounceDelay);

  // Set up event listener for window resize
  useEventListener('resize', () => {
    debouncedHandleResize();
  });

  // Initial setup of viewport dimensions
  useEffect(() => {
    // Set initial dimensions on mount
    if (typeof window !== 'undefined') {
      setViewport(getWindowDimensions());
    }
  }, []);

  // Determine current breakpoint based on viewport width
  const breakpoint = useMemo(
    () => getBreakpointFromWidth(viewport.width),
    [viewport.width]
  );

  // Create responsive utility object with memoization to prevent unnecessary recalculations
  const responsiveUtils = useMemo((): ResponsiveUtils => {
    // Check if current width matches specific breakpoint
    const isBreakpoint = (name: string): boolean => breakpoint === name;

    // Check if current width is between two breakpoints
    const isBetween = (lowerBreakpoint: string, upperBreakpoint: string): boolean => 
      isWidthBetween(lowerBreakpoint, upperBreakpoint, viewport.width);

    return {
      viewport,
      breakpoint,
      // Current breakpoint checks
      isXs: isBreakpoint('xs'),
      isSm: isBreakpoint('sm'),
      isMd: isBreakpoint('md'),
      isLg: isBreakpoint('lg'),
      isXl: isBreakpoint('xl'),
      
      // "Up" breakpoint checks - width is >= breakpoint
      isUpXs: isWidthUp('xs', viewport.width),
      isUpSm: isWidthUp('sm', viewport.width),
      isUpMd: isWidthUp('md', viewport.width),
      isUpLg: isWidthUp('lg', viewport.width),
      isUpXl: isWidthUp('xl', viewport.width),
      
      // "Down" breakpoint checks - width is < breakpoint
      isDownXs: isWidthDown('xs', viewport.width),
      isDownSm: isWidthDown('sm', viewport.width),
      isDownMd: isWidthDown('md', viewport.width),
      isDownLg: isWidthDown('lg', viewport.width),
      isDownXl: isWidthDown('xl', viewport.width),
      
      // Function to check if width is between two breakpoints
      isBetween,
    };
  }, [viewport, breakpoint]);

  return responsiveUtils;
};

export default useResponsive;