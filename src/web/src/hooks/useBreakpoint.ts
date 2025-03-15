import { useState, useEffect, useMemo } from 'react'; // react 18.2.0
import useDebounce from './useDebounce';
import { 
  getBreakpointFromWidth, 
  isWidthUp, 
  isWidthDown, 
  isWidthBetween,
  BREAKPOINT_NAMES 
} from '../features/responsive/utils/breakpoints';

/**
 * Interface defining the return value of the useBreakpoint hook
 */
export interface BreakpointUtils {
  width: number;
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
  isBetween: (start: string, end: string) => boolean;
}

/**
 * A custom React hook that provides the current breakpoint based on window width
 * and utility functions for responsive design.
 * 
 * This hook enables components to adapt their behavior and appearance based on
 * the current screen size, supporting the responsive design requirements of the
 * Inventory Management System.
 * 
 * @returns An object containing current breakpoint information and utility functions
 */
export function useBreakpoint(): BreakpointUtils {
  // Initialize with window width or 0 if window is not available (SSR)
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );
  
  // Debounce the width updates to prevent excessive re-renders
  // Using a 300ms delay provides a good balance between responsiveness and performance
  const debouncedWidth = useDebounce(width, 300);
  
  useEffect(() => {
    // Skip if window is not available (SSR)
    if (typeof window === 'undefined') return;
    
    // Handler for window resize events
    const handleResize = () => {
      setWidth(window.innerWidth);
    };
    
    // Initialize with current width
    handleResize();
    
    // Add event listener for resize events
    window.addEventListener('resize', handleResize);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Calculate breakpoint utils based on debounced width
  // Using useMemo to prevent unnecessary recalculations
  const breakpointUtils = useMemo((): BreakpointUtils => {
    const currentBreakpoint = getBreakpointFromWidth(debouncedWidth);
    
    // Create utility functions for checking breakpoints
    return {
      width: debouncedWidth,
      breakpoint: currentBreakpoint,
      
      // Exact breakpoint matches
      isXs: currentBreakpoint === 'xs',
      isSm: currentBreakpoint === 'sm',
      isMd: currentBreakpoint === 'md',
      isLg: currentBreakpoint === 'lg',
      isXl: currentBreakpoint === 'xl',
      
      // "At or above" breakpoint matches
      isUpXs: isWidthUp('xs', debouncedWidth),
      isUpSm: isWidthUp('sm', debouncedWidth),
      isUpMd: isWidthUp('md', debouncedWidth),
      isUpLg: isWidthUp('lg', debouncedWidth),
      isUpXl: isWidthUp('xl', debouncedWidth),
      
      // "Below" breakpoint matches
      isDownXs: isWidthDown('xs', debouncedWidth),
      isDownSm: isWidthDown('sm', debouncedWidth),
      isDownMd: isWidthDown('md', debouncedWidth),
      isDownLg: isWidthDown('lg', debouncedWidth),
      isDownXl: isWidthDown('xl', debouncedWidth),
      
      // Between breakpoints
      isBetween: (start: string, end: string) => isWidthBetween(start, end, debouncedWidth)
    };
  }, [debouncedWidth]);
  
  return breakpointUtils;
}

export default useBreakpoint;