import React, { useState, useEffect, useCallback, useMemo } from 'react'; // React, { useState, useEffect, useCallback, useMemo } ^18.2.0
import styled from '@emotion/styled'; // styled components library for component styling @emotion/styled ^11.10.6
import { Box, Paper, Typography, Divider, Grid } from '@mui/material'; // Material-UI components for layout and UI elements @mui/material 5.13
import { useDispatch, useSelector } from '../../state'; // Redux hooks for state management
import { RootState } from '../../types/state'; // Type definition for Redux state
import { LocateRequest, LocateApproval, LocateRejection } from '../../types/models'; // Type definitions for locate-related data models
import { approveLocate, rejectLocate, fetchLocates, filterLocateRequests, setSelectedLocate, clearSelectedLocate } from '../../state/locates/locatesSlice'; // Redux actions for locate management
import { selectPendingLocates, selectSelectedLocate, selectLocatesLoading, selectLocateFilters, selectLocatePagination } from '../../state/locates/locatesSelectors'; // Redux selectors for locate state
import LocateFilters from './LocateFilters'; // Component for filtering locate requests
import LocateDetail from './LocateDetail'; // Component for displaying and managing locate request details
import DataGrid from '../../components/data/DataGrid'; // Grid component for displaying locate requests
import { GridColumn } from '../../components/data/GridColumn'; // Type definition for grid columns
import StatusIndicator from '../../components/data/StatusIndicator'; // Component for displaying status indicators
import ExportButton from '../../components/data/ExportButton'; // Component for exporting locate data
import RefreshButton from '../../components/data/RefreshButton'; // Component for refreshing locate data
import { formatDate, formatNumber } from '../../utils/formatter'; // Utility functions for formatting data

// Styled container for the locate approval component
const ApprovalContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 16px;
`;

// Styled container for the data grid
const GridContainer = styled(Box)`
  flex: 1;
  overflow: hidden;
  display: flex;
`;

// Styled container for the detail panel
const DetailContainer = styled(Box)`
  width: 400px;
  border-left: 1px solid;
  border-color: divider;
  overflow: auto;
`;

// Styled container for the filters
const FiltersContainer = styled(Paper)`
  padding: 16px;
  background-color: background.paper;
  border-radius: 4px;
`;

// Styled container for the header section
const HeaderContainer = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

// Styled component for the header title
const HeaderTitle = styled(Typography)`
  font-weight: 500;
  font-size: 18px;
`;

// Styled container for header action buttons
const HeaderActions = styled(Box)`
  display: flex;
  gap: 8px;
`;

// Styled container for the empty state message
const EmptyState = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
`;

// Styled container for the loading state
const LoadingContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

/**
 * Main component for the locate approval workflow
 */
const LocateApproval: React.FC = () => {
  // Initialize dispatch function from useDispatch hook
  const dispatch = useDispatch();

  // Get pending locate requests, selected locate, loading state, filters, and pagination from Redux store
  const pendingLocates = useSelector(selectPendingLocates);
  const selectedLocate = useSelector(selectSelectedLocate);
  const loading = useSelector(selectLocatesLoading);
  const filters = useSelector(selectLocateFilters);
  const pagination = useSelector(selectLocatePagination);

  // Set up state for detail panel visibility
  const [showDetail, setShowDetail] = useState(false);

  // Define grid columns for the locate requests table
  const locateColumns: GridColumn[] = useMemo(() => {
    return [
      { field: 'requestTimestamp', headerName: 'Time', width: 150, valueFormatter: (params) => formatDate(params.value, 'MM/DD/YYYY HH:mm:ss') },
      { field: 'client.name', headerName: 'Client', width: 200 },
      { field: 'security.description', headerName: 'Security', width: 250 },
      { field: 'requestedQuantity', headerName: 'Quantity', width: 120, valueFormatter: (params) => formatNumber(params.value, 0) },
      { field: 'locateType', headerName: 'Type', width: 100 },
      { 
        field: 'status', 
        headerName: 'Status', 
        width: 120, 
        cellRenderer: (params: any) => {
          const statusType = getStatusType(params.value);
          return <StatusIndicator status={statusType} label={params.value} />;
        }
      },
    ];
  }, []);

  // Handle row selection to show locate details
  const handleRowSelect = useCallback((locate: LocateRequest) => {
    dispatch(setSelectedLocate(locate));
    setShowDetail(true);
  }, [dispatch]);

  // Handle locate approval
  const handleApprove = useCallback((approvalData: LocateApproval) => {
    if (selectedLocate) {
      dispatch(approveLocate({ locateId: selectedLocate.id, approvalData }));
      setShowDetail(false);
      dispatch(fetchLocates());
    }
  }, [dispatch, selectedLocate]);

  // Handle locate rejection
  const handleReject = useCallback((rejectionData: LocateRejection) => {
    if (selectedLocate) {
      dispatch(rejectLocate({ locateId: selectedLocate.id, rejectionData }));
      setShowDetail(false);
      dispatch(fetchLocates());
    }
  }, [dispatch, selectedLocate]);

  // Handle filter changes
  const handleFilterChange = useCallback((filters: LocateFilters) => {
    dispatch(filterLocateRequests({ filters, pagination: { page: 0, pageSize: 10, totalElements: 0, totalPages: 0, sort: ['requestTimestamp,desc'] } }));
  }, [dispatch]);

  // Handle pagination changes
  const handlePageChange = useCallback((page: number) => {
    dispatch(filterLocateRequests({ filters, pagination: { ...pagination, page } }));
  }, [dispatch, filters, pagination]);

  // Handle pagination page size changes
  const handlePageSizeChange = useCallback((pageSize: number) => {
    dispatch(filterLocateRequests({ filters, pagination: { ...pagination, pageSize, page: 0 } }));
  }, [dispatch, filters, pagination]);

  // Handle refresh to reload locate data
  const handleRefresh = useCallback(async () => {
    dispatch(fetchLocates());
  }, [dispatch]);

  // Load pending locate requests on component mount
  useEffect(() => {
    dispatch(fetchLocates());
  }, [dispatch]);

  // Helper function to convert locate status to StatusIndicator type
  const getStatusType = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'EXPIRED':
        return 'info';
      case 'CANCELLED':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <ApprovalContainer>
      <HeaderContainer>
        <HeaderTitle>Locate Approval</HeaderTitle>
        <HeaderActions>
          <ExportButton data={pendingLocates} dataType="locates" filename="locate_requests" />
          <RefreshButton onRefresh={handleRefresh} isLoading={loading} />
        </HeaderActions>
      </HeaderContainer>
      <FiltersContainer>
        <LocateFilters onFilterChange={handleFilterChange} />
      </FiltersContainer>
      <GridContainer>
        {loading ? (
          <LoadingContainer>
            <Typography>Loading Locates...</Typography>
          </LoadingContainer>
        ) : pendingLocates.length > 0 ? (
          <DataGrid
            data={pendingLocates}
            columns={locateColumns}
            rowSelection="single"
            onRowClick={handleRowSelect}
          />
        ) : (
          <EmptyState>
            <Typography variant="h6">No Pending Locates</Typography>
            <Typography variant="body2">There are no locate requests awaiting approval.</Typography>
          </EmptyState>
        )}
      </GridContainer>
      {showDetail && selectedLocate && (
        <DetailContainer>
          <LocateDetail onApprove={handleApprove} onReject={handleReject} />
        </DetailContainer>
      )}
    </ApprovalContainer>
  );
};

export default LocateApproval;