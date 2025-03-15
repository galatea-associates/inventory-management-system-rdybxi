import React from 'react'; // ^18.2.0
import useResponsive from '../hooks/useResponsive';

/**
 * Props for the ResponsiveWrapper component
 */
export interface ResponsiveWrapperProps {
  /**
   * The content to render if the condition is met
   */
  children: React.ReactNode;
  
  /**
   * The breakpoint to compare against (xs, sm, md, lg, xl)
   */
  breakpoint: string;
  
  /**
   * The type of comparison to make
   * - 'up': width >= breakpoint
   * - 'down': width < breakpoint
   * - 'only': width matches exactly the breakpoint
   * - 'between': width is between breakpoint and upperBreakpoint
   */
  comparison?: 'up' | 'down' | 'only' | 'between';
  
  /**
   * The upper breakpoint for 'between' comparison
   * Required when comparison is 'between'
   */
  upperBreakpoint?: string;
  
  /**
   * Content to render if the condition is not met
   * Defaults to null
   */
  fallback?: React.ReactNode;
}

/**
 * A component that conditionally renders children based on the current viewport size
 * and specified breakpoint constraints.
 * 
 * This component is part of the Inventory Management System's responsive design strategy,
 * allowing for adaptive UI layouts across different screen sizes (desktop, laptop, tablet, mobile).
 * 
 * @example
 * // Render content only on mobile (xs breakpoint)
 * <ResponsiveWrapper breakpoint="xs" comparison="only">
 *   <MobileContent />
 * </ResponsiveWrapper>
 * 
 * @example
 * // Render content on medium screens and larger
 * <ResponsiveWrapper breakpoint="md" comparison="up">
 *   <DesktopContent />
 * </ResponsiveWrapper>
 * 
 * @example
 * // Render different content based on screen size
 * <ResponsiveWrapper breakpoint="md" comparison="up" fallback={<MobileContent />}>
 *   <DesktopContent />
 * </ResponsiveWrapper>
 * 
 * @example
 * // Render content between small and large screens
 * <ResponsiveWrapper breakpoint="sm" comparison="between" upperBreakpoint="lg">
 *   <TabletContent />
 * </ResponsiveWrapper>
 */
const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({
  children,
  breakpoint,
  comparison = 'only',
  upperBreakpoint,
  fallback = null,
}) => {
  // Get current viewport information from the responsive hook
  const responsive = useResponsive();
  
  // Validate breakpoint value
  const validBreakpoints = ['xs', 'sm', 'md', 'lg', 'xl'];
  if (!validBreakpoints.includes(breakpoint)) {
    console.warn(`Invalid breakpoint: '${breakpoint}'. Expected one of: xs, sm, md, lg, xl`);
    return <>{fallback}</>;
  }
  
  // Validate upperBreakpoint if comparison is 'between'
  if (comparison === 'between') {
    if (!upperBreakpoint) {
      console.warn('upperBreakpoint is required when comparison is "between"');
      return <>{fallback}</>;
    }
    
    if (!validBreakpoints.includes(upperBreakpoint)) {
      console.warn(`Invalid upperBreakpoint: '${upperBreakpoint}'. Expected one of: xs, sm, md, lg, xl`);
      return <>{fallback}</>;
    }
  }
  
  // Determine if the content should be rendered based on the comparison type
  let shouldRender = false;
  
  switch (comparison) {
    case 'up':
      // Check if viewport width is greater than or equal to the specified breakpoint
      shouldRender = 
        (breakpoint === 'xs' && responsive.isUpXs) ||
        (breakpoint === 'sm' && responsive.isUpSm) ||
        (breakpoint === 'md' && responsive.isUpMd) ||
        (breakpoint === 'lg' && responsive.isUpLg) ||
        (breakpoint === 'xl' && responsive.isUpXl);
      break;
      
    case 'down':
      // Check if viewport width is less than the specified breakpoint
      shouldRender = 
        (breakpoint === 'xs' && responsive.isDownXs) ||
        (breakpoint === 'sm' && responsive.isDownSm) ||
        (breakpoint === 'md' && responsive.isDownMd) ||
        (breakpoint === 'lg' && responsive.isDownLg) ||
        (breakpoint === 'xl' && responsive.isDownXl);
      break;
      
    case 'only':
      // Check if viewport matches exactly the specified breakpoint
      shouldRender = 
        (breakpoint === 'xs' && responsive.isXs) ||
        (breakpoint === 'sm' && responsive.isSm) ||
        (breakpoint === 'md' && responsive.isMd) ||
        (breakpoint === 'lg' && responsive.isLg) ||
        (breakpoint === 'xl' && responsive.isXl);
      break;
      
    case 'between':
      // Check if viewport width is between the specified breakpoint and upperBreakpoint
      shouldRender = responsive.isBetween(breakpoint, upperBreakpoint!);
      break;
      
    default:
      shouldRender = false;
  }
  
  // Render children if the condition is met, otherwise render the fallback content
  return shouldRender ? <>{children}</> : <>{fallback}</>;
};

export default ResponsiveWrapper;