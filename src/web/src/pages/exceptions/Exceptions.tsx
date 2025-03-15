import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled 11.10.6
import { Box, Drawer, useTheme, useMediaQuery } from '@mui/material'; // @mui/material 5.13
import { useDispatch, useSelector } from 'react-redux'; // react-redux 8.0.5

import Page from '../../components/layout/Page';
import ExceptionFilters from './ExceptionFilters';
import ExceptionQueue from './ExceptionQueue';
import ExceptionDetail from './ExceptionDetail';
import { fetchExceptions, setExceptionFilters, resetExceptionFilters, setExceptionPagination, clearSelectedException } from '../../state/exceptions/exceptionsSlice';
import { selectExceptionFilters, selectSelectedException, selectExceptionsPagination } from '../../state/exceptions/exceptionsSelectors';
import RefreshButton from '../../components/data/RefreshButton';
import useBreakpoint from '../../hooks/useBreakpoint';

/**
 * Styled container for the exceptions page
 */
const StyledExceptionsPage = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
`;

/**
 * Styled container for the main content area
 */
const ContentContainer = styled(Box)`
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
  height: 100%;
`;

/**
 * Styled container for the exception queue
 */
const MainContent = styled(Box)`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
`;

/**
 * Styled container for the exception detail panel
 */
const DetailPanel = styled(Box)<{ open: boolean }>`
  width: 400px;
  border-left: 1px solid theme.palette.divider;
  height: 100%;
  display: ${props => props.open ? 'block' : 'none'};
`;

/**
 * Styled drawer for mobile exception detail view
 */
const MobileDrawer = styled(Drawer)`
  & .MuiDrawer-paper {
    width: 85%;
    maxWidth: 400px;
  }
`;

/**
 * Styled container for page action buttons
 */
const ActionContainer = styled(Box)`
  display: flex;
  gap: theme.spacing(1);
`;

/**
 * Main component for the Exception Management Dashboard
 */
const Exceptions: React.FC = React.memo(() => {
  // LD1: Initialize Redux hooks for accessing and updating state
  const dispatch = useDispatch();

  // LD1: Get the current breakpoint using useBreakpoint hook to determine responsive behavior
  const breakpoint = useBreakpoint();

  // LD1: Initialize state for detail drawer open status
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  // LD1: Get current exception filters, pagination, and selected exception from Redux state
  const filters = useSelector(selectExceptionFilters);
  const pagination = useSelector(selectExceptionsPagination);
  const selectedException = useSelector(selectSelectedException);

  // LD1: Create handler function for refreshing exception data
  const handleRefresh = useCallback(async (): Promise<void> => {
    dispatch(fetchExceptions({
      page: pagination.page,
      size: pagination.pageSize,
      sort: pagination.sort.join(','),
      filters: filters as any
    }));
  }, [dispatch, pagination.page, pagination.pageSize, pagination.sort, filters]);

  // LD1: Create handler function for filter changes
  const handleFilterChange = useCallback((id: string, value: any): void => {
    dispatch(setExceptionFilters({ [id]: value }));
    dispatch(setExceptionPagination({ page: 0 })); // Reset pagination to first page if filters change
  }, [dispatch]);

  // LD1: Create handler function for applying filters
  const handleApplyFilters = useCallback((values: Record<string, any>): void => {
    dispatch(setExceptionFilters(values));
    dispatch(setExceptionPagination({ page: 0 })); // Reset pagination to first page
    handleRefresh(); // Fetch exceptions with updated filters
  }, [dispatch, handleRefresh]);

  // LD1: Create handler function for resetting filters
  const handleResetFilters = useCallback((): void => {
    dispatch(resetExceptionFilters());
    dispatch(setExceptionPagination({ page: 0 })); // Reset pagination to first page
    handleRefresh(); // Fetch exceptions with reset filters
  }, [dispatch, handleRefresh]);

  // LD1: Create handler function for selecting an exception
  const handleExceptionSelect = useCallback((exception: any): void => {
    setDetailDrawerOpen(true); // Set detail drawer open state to true
    // Exception is already selected through the ExceptionQueue component
  }, []);

  // LD1: Create handler function for closing the detail drawer
  const handleDetailClose = useCallback((): void => {
    setDetailDrawerOpen(false); // Set detail drawer open state to false
    dispatch(clearSelectedException()); // Dispatch clearSelectedException action to clear the selected exception
  }, [dispatch]);

  // LD1: Implement useEffect to fetch exceptions on component mount
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  // LD1: Determine if current view is mobile based on breakpoint
  const isMobile = breakpoint.isDownSm;

  // LD1: Render Page component with appropriate title and actions
  return (
    <Page
      title="Exception Management"
      actions={
        <ActionContainer>
          <RefreshButton onRefresh={handleRefresh} />
        </ActionContainer>
      }
    >
      <StyledExceptionsPage>
        <ExceptionFilters
          values={filters}
          onChange={handleFilterChange}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />
        <ContentContainer>
          <MainContent>
            <ExceptionQueue onExceptionSelect={handleExceptionSelect} />
          </MainContent>
          {/* LD1: Render ExceptionDetail component in a drawer for mobile or side panel for desktop */}
          {isMobile ? (
            <MobileDrawer
              open={detailDrawerOpen}
              onClose={handleDetailClose}
              anchor="right"
            >
              <ExceptionDetail
                exception={selectedException}
                onClose={handleDetailClose}
                onUpdate={() => {}} // TODO: Implement onUpdate
                width="100%"
                height="100%"
              />
            </MobileDrawer>
          ) : (
            <DetailPanel
              open={detailDrawerOpen}
              data={selectedException}
              onClose={handleDetailClose}
              onAction={() => {}} // TODO: Implement onAction
              type="exception"
            />
          )}
        </ContentContainer>
      </StyledExceptionsPage>
    </Page>
  );
});

Exceptions.displayName = 'Exceptions';

export default Exceptions;