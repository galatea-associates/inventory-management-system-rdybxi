import React, { useCallback } from 'react';
import styled from '@emotion/styled';
import { ReloadOutlined } from '@ant-design/icons';
import Button from '../common/Button';
import Tooltip from '../common/Tooltip';

/**
 * Props interface for the RefreshButton component
 */
export interface RefreshButtonProps {
  /** Callback function triggered when refresh button is clicked */
  onRefresh: () => void | Promise<void>;
  /** Whether the button is in loading state */
  isLoading?: boolean;
  /** Props to pass to the underlying Button component */
  buttonProps?: Partial<typeof Button extends React.ComponentType<infer P> ? P : never>;
  /** Props to pass to the Tooltip component */
  tooltipProps?: Partial<typeof Tooltip extends React.ComponentType<infer P> ? P : never>;
  /** Button content */
  children?: React.ReactNode;
}

/**
 * A button component that provides data refresh functionality for the Inventory Management System.
 * 
 * Used in data grids, dashboards, and other data visualization components to allow users to manually
 * refresh data from the server.
 */
const RefreshButton = React.memo(({
  onRefresh,
  isLoading = false,
  buttonProps = {
    variant: 'outlined',
    size: 'medium',
    color: 'primary'
  },
  tooltipProps = {
    title: 'Refresh data',
    placement: 'top'
  },
  children = 'Refresh'
}: RefreshButtonProps) => {
  /**
   * Handles the refresh button click event
   */
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      try {
        onRefresh();
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }
  }, [onRefresh]);

  return (
    <Tooltip {...tooltipProps}>
      <Button
        onClick={handleRefresh}
        loading={isLoading}
        startIcon={<ReloadOutlined />}
        aria-label="Refresh data"
        {...buttonProps}
      >
        {children}
      </Button>
    </Tooltip>
  );
});

RefreshButton.displayName = 'RefreshButton';

export default RefreshButton;