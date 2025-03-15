/**
 * Layout Styles
 * 
 * Defines reusable layout styles and functions for the Inventory Management System UI.
 * This file provides standardized layout patterns that can be applied consistently across 
 * components to ensure visual coherence and responsive behavior throughout the application.
 */

import { css } from '@emotion/react'; // @emotion/react ^11.10.6
import { spacing, breakpoints } from './variables';
import { respondTo, flexColumn, flexBetween } from './mixins';

/**
 * Creates a container layout with configurable max width, padding, and background
 */
export const container = ({ 
  fluid = false, 
  maxWidth = '1200px', 
  padding = spacing.md, 
  background = 'transparent' 
} = {}) => css`
  width: 100%;
  margin: 0 auto;
  max-width: ${fluid ? '100%' : maxWidth};
  padding: 0 ${padding}px;
  background: ${background};

  ${respondTo('sm')(`
    padding: 0 ${spacing.md}px;
  `)}

  ${respondTo('md')(`
    padding: 0 ${spacing.lg}px;
  `)}

  ${respondTo('lg')(`
    padding: 0 ${spacing.xl}px;
  `)}
`;

/**
 * Creates a standard page layout with proper spacing and structure
 */
export const pageLayout = () => css`
  ${flexColumn()}
  min-height: 100vh;
  width: 100%;
  padding: ${spacing.md}px;
  
  ${respondTo('sm')(`
    padding: ${spacing.md}px;
  `)}
  
  ${respondTo('md')(`
    padding: ${spacing.lg}px;
  `)}
  
  ${respondTo('lg')(`
    padding: ${spacing.xl}px;
  `)}
`;

/**
 * Creates styles for the sidebar component with responsive behavior
 */
export const sidebarLayout = ({ isOpen = true, isMobile = false } = {}) => css`
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: ${isOpen ? '240px' : '64px'};
  background-color: #ffffff;
  z-index: 1100;
  box-shadow: 1px 0 5px rgba(0, 0, 0, 0.1);
  transition: width 0.3s ease, transform 0.3s ease;
  
  ${isMobile && css`
    transform: translateX(${isOpen ? '0' : '-100%'});
    width: 240px;
  `}
`;

/**
 * Creates styles for the application header with responsive behavior
 */
export const headerLayout = () => css`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 64px;
  ${flexBetween()}
  padding: 0 ${spacing.md}px;
  background-color: #ffffff;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
  z-index: 1100;
  
  ${respondTo('sm')(`
    padding: 0 ${spacing.md}px;
  `)}
  
  ${respondTo('md')(`
    padding: 0 ${spacing.lg}px;
  `)}
  
  ${respondTo('lg')(`
    padding: 0 ${spacing.xl}px;
  `)}
`;

/**
 * Creates styles for the main content area with responsive behavior
 */
export const contentLayout = ({ sidebarOpen = true, isMobile = false } = {}) => css`
  flex: 1;
  overflow: auto;
  margin-top: 64px;
  margin-left: ${isMobile ? '0' : (sidebarOpen ? '240px' : '64px')};
  transition: margin-left 0.3s ease;
  padding: ${spacing.md}px;
  
  ${respondTo('sm')(`
    padding: ${spacing.md}px;
  `)}
  
  ${respondTo('md')(`
    padding: ${spacing.lg}px;
  `)}
  
  ${respondTo('lg')(`
    padding: ${spacing.xl}px;
  `)}
`;

/**
 * Creates a responsive grid layout with configurable columns
 */
export const gridLayout = ({ columns = 12, gap = spacing.md } = {}) => css`
  display: grid;
  grid-template-columns: repeat(${columns}, 1fr);
  gap: ${gap}px;
  
  ${respondTo('xs')(`
    grid-template-columns: repeat(1, 1fr);
  `)}
  
  ${respondTo('sm')(`
    grid-template-columns: repeat(2, 1fr);
  `)}
  
  ${respondTo('md')(`
    grid-template-columns: repeat(${Math.min(columns, 6)}, 1fr);
  `)}
  
  ${respondTo('lg')(`
    grid-template-columns: repeat(${columns}, 1fr);
  `)}
`;

/**
 * Creates styles for a card component with consistent spacing and elevation
 */
export const cardLayout = () => css`
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  padding: ${spacing.md}px;
  
  ${respondTo('sm')(`
    padding: ${spacing.md}px;
  `)}
  
  ${respondTo('md')(`
    padding: ${spacing.lg}px;
  `)}
`;

/**
 * Creates a layout for dashboard screens with grid of widgets
 */
export const dashboardLayout = () => css`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: ${spacing.md}px;
  padding: ${spacing.md}px;
  
  ${respondTo('sm')(`
    grid-template-columns: repeat(2, 1fr);
    gap: ${spacing.md}px;
  `)}
  
  ${respondTo('md')(`
    grid-template-columns: repeat(3, 1fr);
    gap: ${spacing.lg}px;
  `)}
  
  ${respondTo('lg')(`
    grid-template-columns: repeat(4, 1fr);
    gap: ${spacing.lg}px;
  `)}
`;

/**
 * Creates a layout for form components with consistent spacing
 */
export const formLayout = () => css`
  ${flexColumn()}
  width: 100%;
  
  & > * + * {
    margin-top: ${spacing.md}px;
  }
  
  ${respondTo('md')(`
    & > * + * {
      margin-top: ${spacing.lg}px;
    }
  `)}
`;

/**
 * Creates a layout for table components with proper spacing and structure
 */
export const tableLayout = () => css`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: ${spacing.sm}px ${spacing.md}px;
    border-bottom: 1px solid #e0e0e0;
    text-align: left;
  }
  
  thead th {
    background-color: #f5f5f5;
    font-weight: 500;
  }
  
  ${respondTo('sm')(`
    th, td {
      padding: ${spacing.sm}px ${spacing.md}px;
    }
  `)}
  
  ${respondTo('md')(`
    th, td {
      padding: ${spacing.md}px ${spacing.lg}px;
    }
  `)}
`;