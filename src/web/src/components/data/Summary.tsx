import React from 'react';
import Box from '@mui/material/Box';
import SummaryItem, { SummaryItemProps } from './SummaryItem';
import { styled } from '../../styles/utils';
import { gridLayout, respondTo } from '../../styles/mixins';

/**
 * Props for the Summary component
 */
export interface SummaryProps {
  /**
   * Array of summary items to display
   */
  items: Array<SummaryItemProps>;
  
  /**
   * Number of columns in the grid
   * @default 4
   */
  columns?: number;
  
  /**
   * Spacing between items in pixels
   * @default 16
   */
  spacing?: number;
  
  /**
   * Additional CSS class name
   */
  className?: string;
  
  /**
   * Optional ID for the component
   */
  id?: string;
}

/**
 * Styled container for the summary grid
 */
export const SummaryContainer = styled(Box)`
  display: grid;
  grid-template-columns: repeat(var(--columns, 4), 1fr);
  gap: var(--spacing, 16px);
  width: 100%;
  margin-bottom: 24px;
  
  ${respondTo('sm')(css`
    grid-template-columns: repeat(2, 1fr);
  `)}
  
  ${respondTo('xs')(css`
    grid-template-columns: 1fr;
  `)}
`;

/**
 * A component that displays a collection of summary items in a responsive grid layout.
 * Used to present key metrics and data points in dashboards, position views, and
 * inventory screens throughout the Inventory Management System.
 * 
 * The grid automatically adapts to different screen sizes:
 * - 4 columns (or specified number) on large screens
 * - 2 columns on medium screens
 * - 1 column on small screens
 */
const Summary = React.memo<SummaryProps>(({
  items,
  columns = 4,
  spacing = 16,
  className,
  id,
  ...rest
}) => {
  // If no items are provided, don't render anything
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <SummaryContainer
      className={className}
      id={id}
      style={{ 
        '--columns': columns, 
        '--spacing': `${spacing}px` 
      } as React.CSSProperties}
      {...rest}
    >
      {items.map((item, index) => (
        <SummaryItem 
          key={`summary-item-${index}`}
          {...item}
        />
      ))}
    </SummaryContainer>
  );
});

// Set display name for debugging
Summary.displayName = 'Summary';

export default Summary;