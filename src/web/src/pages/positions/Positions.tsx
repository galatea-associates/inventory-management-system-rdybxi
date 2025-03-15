import React, { useState, useEffect, useCallback } from 'react'; // React v18.2.0 - Core React library for component creation
import { useDispatch, useSelector } from 'react-redux'; // react-redux ^8.0.5 - Redux hooks for dispatching actions and selecting state
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6 - Styled components library for component styling
import { Box, Grid, Paper, Button } from '@mui/material'; // Material-UI components for layout and styling version 5.13
import RefreshIcon from '@mui/icons-material/Refresh'; // Material-UI icon for refresh button

import Page from '../../components/layout/Page'; // Layout component for consistent page structure
import PositionFilters from './PositionFilters'; // Component for filtering position data
import PositionTable from './PositionTable'; // Component for displaying position data in a table
import PositionSummary from './PositionSummary'; // Component for displaying position summary metrics
import SettlementLadder from './SettlementLadder'; // Component for visualizing settlement ladder data
import {
  fetchFilteredPositions,
  fetchPositionSummary,
  clearSelectedPosition,
} from '../../state/positions/positionsSlice'; // Redux actions for fetching and managing position data
import {
  selectPositionsLoading,
  selectPositionsError,
  selectPositionFilters,
  selectPositionPagination,
} from '../../state/positions/positionsSelectors'; // Redux selectors for accessing position state

/**
 * Styled container for the page content
 */
const PageContent = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

/**
 * Styled container for the position summary
 */
const SummaryContainer = styled(Paper)`
  padding: 16px;
  borderRadius: 4px;
  boxShadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
`;

/**
 * Styled container for the position table
 */
const TableContainer = styled(Paper)`
  flex: 1;
  display: flex;
  flex-direction: column;
  borderRadius: 4px;
  boxShadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`;

/**
 * Styled container for the settlement ladder
 */
const SettlementContainer = styled(Paper)`
  padding: 16px;
  borderRadius: 4px;
  boxShadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
  height: 300px;
`;

/**
 * Styled button for page actions
 */
const ActionButton = styled(Button)`
  margin-left: 8px;
`;

/**
 * Main component for the Positions page that displays position data with filtering, summary, and detailed information
 */
const Positions = React.memo(() => {
  // LD1: Initialize Redux dispatch and selector hooks
  const dispatch = useDispatch();
  const loading = useSelector(selectPositionsLoading);
  const error = useSelector(selectPositionsError);
  const filters = useSelector(selectPositionFilters);
  const pagination = useSelector(selectPositionPagination);

  // LD1: Initialize state for real-time updates toggle
  const [enableRealTimeUpdates, setEnableRealTimeUpdates] = useState(false);

  // LD1: Define useEffect to load initial position data on component mount
  useEffect(() => {
    dispatch(fetchFilteredPositions({ filters, pagination }));
    dispatch(fetchPositionSummary({ filters }));
  }, [dispatch, filters, pagination]);

  // LD1: Define handler for refreshing position data
  const handleRefresh = useCallback(() => {
    dispatch(fetchFilteredPositions({ filters, pagination }));
    dispatch(fetchPositionSummary({ filters }));
  }, [dispatch, filters, pagination]);

  // LD1: Define handler for toggling real-time updates
  const handleToggleRealTimeUpdates = useCallback(() => {
    setEnableRealTimeUpdates((prev) => !prev);
    if (!enableRealTimeUpdates) {
      handleRefresh();
    }
  }, [enableRealTimeUpdates, handleRefresh]);

  // LD1: Define handler for clearing selected position
  const handleClearSelectedPosition = useCallback(() => {
    dispatch(clearSelectedPosition());
  }, [dispatch]);

  // LD1: Return Page component with appropriate title and actions
  return (
    <Page
      title="Positions"
      actions={
        <>
          <ActionButton
            variant="outlined"
            onClick={handleToggleRealTimeUpdates}
          >
            {enableRealTimeUpdates ? 'Disable Real-time Updates' : 'Enable Real-time Updates'}
          </ActionButton>
          <ActionButton
            variant="contained"
            onClick={handleRefresh}
            disabled={loading}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </ActionButton>
        </>
      }
    >
      <PageContent>
        {/* LD1: Render PositionFilters component for filtering positions */}
        <PositionFilters />

        {/* LD1: Render PositionSummary component for displaying summary metrics */}
        <SummaryContainer>
          <PositionSummary />
        </SummaryContainer>

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            {/* LD1: Render PositionTable component for displaying position data */}
            <TableContainer>
              <PositionTable
                enableRealTimeUpdates={enableRealTimeUpdates}
                showDetailPanel={true}
              />
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={4}>
            {/* LD1: Render SettlementLadder component for visualizing settlement projections */}
            <SettlementContainer>
              <SettlementLadder
                securityId=""
                bookId=""
                height="300px"
                loading={loading}
                error={error}
              />
            </SettlementContainer>
          </Grid>
        </Grid>
      </PageContent>
    </Page>
  );
});

Positions.displayName = 'Positions';

export default Positions;