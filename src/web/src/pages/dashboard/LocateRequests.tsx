# src/web/src/pages/dashboard/LocateRequests.tsx
```typescript
import React, { useState, useEffect, useMemo, useCallback } from 'react'; // React, { useState, useEffect, useMemo, useCallback } ^18.2.0
import styled from '@emotion/styled'; // styled ^11.11.0
import { Box, Typography, Button, Divider, Chip } from '@mui/material'; // { Box, Typography, Button, Divider, Chip } ^5.13
import { useNavigate } from 'react-router-dom'; // { useNavigate } ^6.11
import Card from '../../components/common/Card';
import DataGrid from '../../components/data/DataGrid';
import Loader from '../../components/common/Loader';
import { useApiQuery } from '../../hooks/useApi';
import { getLocateSummary, getLocatesByStatus } from '../../api/locate';
import { LocateRequest } from '../../types/models';
import { formatDate } from '../../utils/date';
import { formatNumber } from '../../utils/number';

// LD1: Define interface for the LocateRequests component props
interface LocateRequestsProps {
  businessDate: string;
  refreshInterval: number;
}

// LD1: Define interface for the LocateSummary data
interface LocateSummary {
  pending: number;
  approved: number;
  rejected: number;
  autoApproved: number;
  autoRejected: number;
  total: number;
}

// LD1: Styled Card component for consistent styling
const StyledCard = styled(Card)`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

// LD1: Styled Box for the card header
const CardHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme => theme.spacing(2)};
  border-bottom: 1px solid ${theme => theme.palette.divider};
`;

// LD1: Styled Typography for the card title
const CardTitle = styled(Typography)`
  font-weight: 500;
`;

// LD1: Styled Box for the card content
const CardContent = styled(Box)`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

// LD1: Styled Box for the summary container
const SummaryContainer = styled(Box)`
  display: flex;
  justify-content: space-around;
  padding: ${theme => theme.spacing(2)};
`;

// LD1: Styled Box for individual summary items
const SummaryItem = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

// LD1: Styled Typography for the summary value
const SummaryValue = styled(Typography)`
  font-size: 1.5rem;
  font-weight: 500;
  color: ${theme => theme.palette.primary.main};
`;

// LD1: Styled Typography for the summary label
const SummaryLabel = styled(Typography)`
  font-size: 0.75rem;
  color: ${theme => theme.palette.text.secondary};
`;

// LD1: Styled Box for the grid container
const GridContainer = styled(Box)`
  flex: 1;
  overflow: hidden;
  padding: 0 ${theme => theme.spacing(2)};
`;

// LD1: Styled Box for the card footer
const CardFooter = styled(Box)`
  display: flex;
  justify-content: center;
  padding: ${theme => theme.spacing(1, 2, 2)};
`;

// LD1: Styled Chip for status display
const StatusChip = styled(Chip)`
  font-size: 0.75rem;
`;

// LD1: Dashboard widget component that displays locate request summary and pending requests
const LocateRequests: React.FC<LocateRequestsProps> = ({ businessDate, refreshInterval }) => {
  // LD1: Set up navigation hook for routing to the locate management page
  const navigate = useNavigate();

  // LD1: Fetch locate summary data using useApiQuery and getLocateSummary
  const { data: locateSummary, loading: loadingSummary } = useApiQuery<LocateSummary>(
    '/api/v1/locates/summary',
    { businessDate },
    {},
    { autoNotifyError: false }
  );

  // LD1: Fetch pending locate requests using useApiQuery and getLocatesByStatus
  const { data: pendingLocates, loading: loadingPending } = useApiQuery<LocateRequest[]>(
    '/api/v1/locates',
    { status: 'Pending', size: 5 },
    {},
    { autoNotifyError: false }
  );

  // LD1: Define grid columns for the pending locate requests table
  const columns = useMemo(() => [
    { field: 'id', headerName: 'ID' },
    { field: 'securityId', headerName: 'Security' },
    { field: 'clientId', headerName: 'Client' },
    { field: 'requestedQuantity', headerName: 'Quantity' },
    { field: 'status', headerName: 'Status' },
  ], []);

  // LD1: Handle view all button click to navigate to the locate management page
  const handleViewAll = useCallback(() => {
    navigate('/locates');
  }, [navigate]);

  // LD1: Handle locate request row click to navigate to the specific locate detail
  const handleRowClick = useCallback((locate: LocateRequest) => {
    navigate(`/locates/${locate.id}`);
  }, [navigate]);

  // LD1: Render Card component with title and summary statistics
  return (
    <StyledCard>
      <CardHeader>
        <CardTitle>Locate Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <SummaryContainer>
          <SummaryItem>
            <SummaryValue>{formatNumber(locateSummary?.pending)}</SummaryValue>
            <SummaryLabel>Pending</SummaryLabel>
          </SummaryItem>
          <SummaryItem>
            <SummaryValue>{formatNumber(locateSummary?.autoApproved)}</SummaryValue>
            <SummaryLabel>Auto-Approved</SummaryLabel>
          </SummaryItem>
          <SummaryItem>
            <SummaryValue>{formatNumber(locateSummary?.total)}</SummaryValue>
            <SummaryLabel>Total</SummaryLabel>
          </SummaryItem>
        </SummaryContainer>
        <GridContainer>
          {/* LD1: Render DataGrid with pending locate requests if available */}
          {pendingLocates && pendingLocates.length > 0 ? (
            <DataGrid
              data={pendingLocates}
              columns={columns}
              loading={loadingPending}
              error={null}
              onRowClick={handleRowClick}
              pagination={false}
              showToolbar={false}
            />
          ) : (
            // LD1: Show loading indicator when data is being fetched
            loadingSummary || loadingPending ? (
              <Loader />
            ) : (
              // LD1: Show error message if data fetching fails
              <Typography variant="body2" color="textSecondary" align="center">
                No pending locate requests
              </Typography>
            )
          )}
        </GridContainer>
      </CardContent>
      <CardFooter>
        {/* LD1: Render View All button to navigate to the full locate management page */}
        <Button variant="outlined" onClick={handleViewAll}>
          View All
        </Button>
      </CardFooter>
    </StyledCard>
  );
};

export default LocateRequests;