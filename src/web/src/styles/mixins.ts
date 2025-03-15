/**
 * Styling Mixins
 * 
 * This file provides reusable CSS mixins for the Inventory Management System UI.
 * These mixins help maintain consistency across components and reduce code duplication.
 */

import { css } from '@emotion/react'; // @emotion/react ^11.10.6
import { breakpoints, accessibility } from './variables';

/**
 * Creates a flexbox container with centered items.
 */
export const flexCenter = () => css`
  display: flex;
  align-items: center;
  justify-content: center;
`;

/**
 * Creates a flexbox container with space-between alignment.
 */
export const flexBetween = () => css`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

/**
 * Creates a flexbox container with column direction.
 */
export const flexColumn = () => css`
  display: flex;
  flex-direction: column;
`;

/**
 * Creates a flexbox container with column direction and centered items.
 */
export const flexColumnCenter = () => css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

/**
 * Creates a media query for responsive styling at different breakpoints.
 * @param breakpoint - The breakpoint name (xs, sm, md, lg, xl)
 */
export const respondTo = (breakpoint: string) => {
  const breakpointValue = breakpoints[breakpoint as keyof typeof breakpoints];
  
  return (styles: ReturnType<typeof css>) => css`
    @media (min-width: ${breakpointValue}px) {
      ${styles}
    }
  `;
};

/**
 * Hides the scrollbar while maintaining scroll functionality.
 */
export const hideScrollbar = () => css`
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
`;

/**
 * Truncates text with an ellipsis when it overflows.
 * @param lines - Number of lines to display before truncating (default: 1)
 */
export const truncateText = (lines: number = 1) => {
  if (lines === 1) {
    return css`
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
  }
  
  return css`
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: ${lines};
    overflow: hidden;
  `;
};

/**
 * Provides base styles for buttons.
 */
export const buttonBase = () => css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  outline: 0;
  border: none;
  cursor: pointer;
  user-select: none;
  vertical-align: middle;
  text-decoration: none;
  background-color: transparent;
  padding: 6px 16px;
  border-radius: 4px;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
              box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
              border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
              color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  
  &:disabled {
    cursor: default;
    pointer-events: none;
    opacity: 0.6;
  }
`;

/**
 * Provides focus styles for keyboard navigation.
 */
export const focusVisible = () => css`
  &:focus-visible {
    outline: ${accessibility.focusOutline} ${accessibility.focusColor};
    outline-offset: 2px;
  }
`;

/**
 * Hides content visually while keeping it accessible to screen readers.
 */
export const visuallyHidden = () => css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/**
 * Resets browser default button styling.
 */
export const resetButton = () => css`
  appearance: none;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  cursor: pointer;
  
  &:focus {
    outline: none;
  }
`;

/**
 * Resets browser default list styling.
 */
export const resetList = () => css`
  list-style: none;
  margin: 0;
  padding: 0;
`;

/**
 * Creates consistent box shadow styling.
 * @param level - Shadow elevation level (0-24)
 */
export const boxShadow = (level: number = 1) => css`
  box-shadow: ${level >= 0 && level < 25 
    ? `0px ${level}px ${level * 2}px rgba(0, 0, 0, ${0.1 + (level * 0.01)})`
    : '0px 1px 3px rgba(0, 0, 0, 0.12)'};
`;

/**
 * Creates consistent transition styling.
 * @param properties - CSS properties to transition (default: "all")
 * @param duration - Transition duration (default: "0.3s")
 * @param easing - Transition timing function (default: "ease")
 */
export const transition = (
  properties: string = 'all',
  duration: string = '0.3s',
  easing: string = 'ease'
) => css`
  transition: ${properties} ${duration} ${easing};
`;

/**
 * Creates a CSS grid layout with specified columns and gap.
 * @param columns - Number of grid columns (default: 1)
 * @param gap - Grid gap size (default: "1rem")
 */
export const gridLayout = (columns: number = 1, gap: string = '1rem') => css`
  display: grid;
  grid-template-columns: repeat(${columns}, 1fr);
  gap: ${gap};
`;

/**
 * Positions an element to fill its containing block.
 */
export const absoluteFill = () => css`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;