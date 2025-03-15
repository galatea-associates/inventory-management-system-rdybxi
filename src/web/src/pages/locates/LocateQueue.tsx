import React, { useState, useEffect, useCallback, useMemo } from 'react'; // React, { useState, useEffect, useCallback, useMemo } ^18.2.0
import styled from '@emotion/styled'; // styled components library for component styling @emotion/styled ^11.10.6
import { useDispatch, useSelector } from '../../state'; // Redux hooks for accessing and updating state react-redux ^8.0.5
import { DataGrid } from '../../components/data/DataGrid'; // Import DataGrid component for standardized data display
import { GridColumn } from '../../components/data/GridColumn'; // Import GridColumn type definition for column configuration
import LocateDetail from './LocateDetail'; // Import LocateDetail component for displaying detailed locate information
import LocateFilters from './LocateFilters'; // Import LocateFilters component for filtering locate requests
import { LocateRequest } from '../../types/models'; // Import LocateRequest type definition for locate data
import { LocateFilters as LocateFiltersType } from '../../types/state'; // Import LocateFilters type definition for filter state
import { // Import Redux actions and thunks for locate management
  filterLocateRequests,
  setSelectedLocate,
  clearSelectedLocate,
  fetchLocates,
  approveLocate,
  rejectLocate
} from '../../state/locates/locatesSlice';
import { // Import Redux selectors for locate state
  selectLocates,
  selectSelectedLocate,
  selectLocatesLoading,
  selectLocatesError,
  selectLocateFilters,
  selectLocatePagination
} from '../../state/locates/locatesSelectors';
import { formatDate, formatNumber } from '../../utils/formatter'; // Utility functions for formatting data
import StatusIndicator from '../../components/data/StatusIndicator'; // Component for displaying locate status

interface LocateQueueProps {
  onApprove: (approvalData: any) => void;
  onReject: (rejectionData: any) => void;
  className?: string;
}

// Styled container for the locate queue
const QueueContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 16px;
`;

// Styled container for the data grid
const GridContainer = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
`;

// Styled container for the detail panel
const DetailContainer = styled.div`
  width: 400px;
  border-left: 1px solid;
  border-color: divider;
  overflow: auto;
`;

// Styled container for the filters
const FiltersContainer = styled.div`
  padding: 16px;
  background-color: background.paper;
  border-radius: 4px;
`;

/**
 * Main component for displaying and managing locate requests
 */
const LocateQueue: React.FC<LocateQueueProps> = ({ onApprove, onReject, className }) => {
  // LD1: Set up Redux hooks for state access and dispatch
  const dispatch = useDispatch();

  // LD1: Get locate requests, selected locate, loading state, error state, filters, and pagination from Redux state
  const locates = useSelector(selectLocates);
  const selectedLocate = useSelector(selectSelectedLocate);
  const loading = useSelector(selectLocatesLoading);
  const error = useSelector(selectLocatesError);
  const filters = useSelector(selectLocateFilters);
  const pagination = useSelector(selectLocatePagination);

  // LD1: Set up local state for detail panel visibility
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  // LD1: Define grid columns for the locate requests table
  const locateColumns: GridColumn[] = useMemo(() => [
    { field: 'requestTimestamp', headerName: 'Time', width: 150, valueFormatter: ({ value }) => formatDate(value, 'shortTime') },
    { field: 'client.name', headerName: 'Client', width: 200 },
    { field: 'security.description', headerName: 'Security', width: 250 },
    { field: 'requestedQuantity', headerName: 'Quantity', width: 120, valueFormatter: ({ value }) => formatNumber(value, 0) },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      cellRenderer: ({ value }) => {
        let statusType = 'default';
        switch (value) {
          case 'PENDING':
            statusType = 'warning';
            break;
          case 'APPROVED':
            statusType = 'success';
            break;
          case 'REJECTED':
            statusType = 'error';
            break;
          default:
            statusType = 'default';
        }
        return <StatusIndicator status={statusType} label={value} />;
      }
    }
  ], []);

  // LD1: Handle row selection to show locate details
  const handleRowSelect = useCallback((locate: LocateRequest) => {
    dispatch(setSelectedLocate(locate));
    setShowDetailPanel(true);
  }, [dispatch]);

  // LD1: Handle locate approval
  const handleApprove = useCallback((approvalData: any) => {
    if (selectedLocate) {
      dispatch(approveLocate({ locateId: selectedLocate.id, approvalData }));
      setShowDetailPanel(false);
    }
  }, [dispatch, selectedLocate]);

  // LD1: Handle locate rejection
  const handleReject = useCallback((rejectionData: any) => {
    if (selectedLocate) {
      dispatch(rejectLocate({ locateId: selectedLocate.id, rejectionData }));
      setShowDetailPanel(false);
    }
  }, [dispatch, selectedLocate]);

  // LD1: Handle filter changes
  const handleFilterChange = useCallback((filters: LocateFiltersType) => {
    dispatch(filterLocateRequests({ filters, pagination: { page: 0, pageSize: 10, totalElements: 0, totalPages: 0, sort: ['requestTimestamp,desc'] } }));
  }, [dispatch]);

  // LD1: Handle pagination changes
  const handlePageChange = useCallback((page: number) => {
    dispatch(filterLocateRequests({ filters, pagination: { ...pagination, page: page - 1 } }));
  }, [dispatch, filters, pagination]);

  // LD1: Handle pagination page size changes
  const handlePageSizeChange = useCallback((pageSize: number) => {
    dispatch(filterLocateRequests({ filters, pagination: { ...pagination, pageSize, page: 0 } }));
  }, [dispatch, filters, pagination]);

  // LD1: Handle refresh to reload locate data
  const handleRefresh = useCallback(async () => {
    dispatch(fetchLocates({ page: pagination.page, size: pagination.pageSize, sort: pagination.sort }));
  }, [dispatch, pagination.page, pagination.pageSize, pagination.sort]);

  // LD1: Load initial locate data on component mount
  useEffect(() => {
    dispatch(fetchLocates({ page: pagination.page, size: pagination.pageSize, sort: pagination.sort }));
  }, [dispatch, pagination.page, pagination.pageSize, pagination.sort]);

  // LD1: Render the component with filters, data grid, and detail panel
  return (
    <QueueContainer className={className}>
      <GridContainer>
        <DataGrid
          data={locates}
          columns={locateColumns}
          loading={loading}
          error={error}
          onRowClick={handleRowSelect}
          pagination
          paginationPageSize={pagination.pageSize}
          paginationPageSizeOptions={[10, 20, 50, 100]}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          detailPanel
        />
      </GridContainer>
      {showDetailPanel && selectedLocate && (
        <DetailContainer>
          <LocateDetail
            onApprove={onApprove}
            onReject={onReject}
          />
        </DetailContainer>
      )}
    </QueueContainer>
  );
};

export default LocateQueue;