import React from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, useTheme } from '@mui/material'; // @mui/material ^5.13
import Card from '../common/Card';
import Loader from '../common/Loader';
import Alert from '../common/Alert';
import Typography from '../common/Typography';

/**
 * Props for the ChartContainer component
 */
export interface ChartContainerProps {
  /**
   * The title of the chart
   */
  title: string;
  /**
   * Whether the chart is in a loading state
   * @default false
   */
  loading?: boolean;
  /**
   * Any error that occurred during chart data loading
   * @default null
   */
  error?: Error | string | null;
  /**
   * Whether the chart has no data to display
   * @default false
   */
  isEmpty?: boolean;
  /**
   * The height of the chart container
   * @default '300px'
   */
  height?: number | string;
  /**
   * Message to display when the chart is empty
   * @default 'No data available'
   */
  emptyMessage?: string;
  /**
   * The chart component to render
   */
  children?: React.ReactNode;
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Styled component for the chart wrapper
 */
export const ChartWrapper = styled(Box)<{ height?: number | string }>`
  position: relative;
  width: 100%;
  height: ${props => props.height || '300px'};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

/**
 * Styled component for the chart title area
 */
const ChartTitle = styled(Box)`
  padding: ${props => props.theme.spacing(2)};
  padding-bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

/**
 * Styled component for the chart content area
 */
const ChartContent = styled(Box)`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing(2)};
`;

/**
 * Styled component for the empty state container
 */
const EmptyStateContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: ${props => props.theme.spacing(3)};
  color: ${props => props.theme.palette.text.secondary};
  text-align: center;
`;

/**
 * A container component for chart visualizations with loading, error, and empty states.
 * This component provides consistent styling, handling of loading states, error display,
 * and empty state messaging for all chart types.
 *
 * @param {ChartContainerProps} props - The component props
 * @returns {JSX.Element} - The rendered chart container with appropriate content based on state
 */
const ChartContainer = React.memo<ChartContainerProps>(({
  title,
  loading = false,
  error = null,
  isEmpty = false,
  height = '300px',
  emptyMessage = 'No data available',
  children,
  className,
  ...rest
}) => {
  const theme = useTheme();

  // Determine content to display based on state
  let content;
  
  if (loading) {
    content = (
      <ChartContent>
        <Loader size="medium" />
      </ChartContent>
    );
  } else if (error) {
    content = (
      <ChartContent>
        <Alert 
          severity="error" 
          title="Chart Data Error"
        >
          {error instanceof Error ? error.message : error}
        </Alert>
      </ChartContent>
    );
  } else if (isEmpty) {
    content = (
      <EmptyStateContainer>
        <Typography variant="body1" color="textSecondary">
          {emptyMessage}
        </Typography>
      </EmptyStateContainer>
    );
  } else {
    content = children;
  }

  return (
    <Card className={className} {...rest}>
      <ChartWrapper 
        height={height}
        role="region"
        aria-label={`Chart: ${title}`}
      >
        <ChartTitle>
          <Typography variant="h6">{title}</Typography>
        </ChartTitle>
        {content}
      </ChartWrapper>
    </Card>
  );
});

// Set display name for debugging
ChartContainer.displayName = 'ChartContainer';

export default ChartContainer;