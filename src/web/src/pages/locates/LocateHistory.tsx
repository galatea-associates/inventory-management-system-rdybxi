import React, { useState, useEffect, useCallback, useMemo } from 'react'; // React, { useState, useEffect, useCallback, useMemo } ^18.2.0
import styled from '@emotion/styled'; // styled components library for component styling @emotion/styled ^11.10.6
import { Box } from '@mui/material'; // Material UI components for layout and basic styling @mui/material 5.13
import DataGrid from '../../components/data/DataGrid'; // High-performance grid component for displaying locate history data
import { GridColumn, ColumnType } from '../../components/data/GridColumn'; // Type definition for grid columns
import LocateDetail from './LocateDetail'; // Component for displaying detailed information about a selected locate request
import LocateFilters from './LocateFilters'; // Component for filtering locate requests
import StatusIndicator from '../../components/data/StatusIndicator'; // Component for displaying status indicators
import { useDispatch, useSelector } from '../../state'; // Redux hooks for state management
import { RootState } from '../../types/state'; // Type definition for Redux state
import { LocateRequest } from '../../types/models'; // Type definition for locate request data
import { 
  selectLocates, 
  selectLocatesLoading, 
  selectLocatesError,
  selectLocatePagination
} from '../../state/locates/locatesSelectors'; // Redux selectors for locate data
import { 
  fetchLocates, 
  setSelectedLocate, 
  clearSelectedLocate,
  setLocateFilters,
  setLocatePagination,
  filterLocateRequests
} from '../../state/locates/locatesSlice'; // Redux actions and thunks for locate data management
import { formatDate, formatNumber } from '../../utils/formatter'; // Utility functions for formatting data

// Styled container for the locate history component
const HistoryContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
`;

// Styled container for the filters section
const FilterContainer = styled(Box)`
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 4;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
`;

// Styled container for the data grid
const GridContainer = styled(Box)`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

// Styled container for the detail panel
const DetailContainer = styled(Box)`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 400px;
  z-index: 10;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  overflow: auto;
`;

/**
 * Main component for displaying locate request history
 */
const LocateHistory: React.FC = () => {
  // Initialize dispatch function from useDispatch hook
  const dispatch = useDispatch();

  // Get locate requests, loading state, error state, and pagination from Redux store
  const locates = useSelector(selectLocates);
  const loading = useSelector(selectLocatesLoading);
  const error = useSelector(selectLocatesError);
  const pagination = useSelector(selectLocatePagination);

  // Set up state for selected locate request
  const [selectedLocate, setSelectedLocateState] = useState<LocateRequest | null>(null);

  // Set up state for detail panel visibility
  const [showDetail, setShowDetail] = useState<boolean>(false);

  // Define grid columns for locate history data
  const columns: GridColumn[] = useMemo(() => [
    { field: 'requestId', headerName: 'Request ID', type: ColumnType.STRING },
    { field: 'security.description', headerName: 'Security', type: ColumnType.STRING },
    { field: 'client.name', headerName: 'Client', type: ColumnType.STRING },
    { field: 'requestedQuantity', headerName: 'Quantity', type: ColumnType.NUMBER, valueFormatter: (params) => formatNumber(params.value, 0) },
    { field: 'status', headerName: 'Status', type: ColumnType.STATUS, cellRenderer: 'statusCellRenderer' },
    { field: 'requestTimestamp', headerName: 'Request Time', type: ColumnType.DATETIME, valueFormatter: (params) => formatDate(params.value, 'MM/DD/YYYY HH:mm') },
  ], []);

  // Load locate history data on component mount
  useEffect(() => {
    dispatch(fetchLocates({ page: pagination.page, size: pagination.pageSize, sort: pagination.sort }));
  }, [dispatch, pagination.page, pagination.pageSize, pagination.sort]);

  // Handle row selection to show locate details
  const handleRowSelect = useCallback((locate: LocateRequest) => {
    dispatch(setSelectedLocate(locate));
    setSelectedLocateState(locate);
    setShowDetail(true);
  }, [dispatch]);

  // Handle filter changes to update locate filters
  const handleFilterChange = useCallback((filters: any) => {
    dispatch(setLocateFilters(filters));
    dispatch(filterLocateRequests({ filters, pagination: { page: 0, pageSize: 10, totalElements: 0, totalPages: 0, sort: ['requestTimestamp,desc'] } }));
  }, [dispatch]);

  // Handle pagination changes to update page number and size
  const handlePageChange = useCallback((page: number) => {
    dispatch(setLocatePagination({ page }));
    dispatch(fetchLocates({ page, size: pagination.pageSize, sort: pagination.sort }));
  }, [dispatch, pagination.pageSize, pagination.sort]);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    dispatch(setLocatePagination({ pageSize }));
    dispatch(fetchLocates({ page: 0, size: pageSize, sort: pagination.sort }));
  }, [dispatch, pagination.sort]);

  // Handle sort changes to update sort order
  const handleSortChange = useCallback((sortModel: any) => {
    const sortParams = sortModel.map((item: any) => `${item.colId},${item.sort}`);
    dispatch(fetchLocates({ page: 0, size: pagination.pageSize, sort: sortParams }));
  }, [dispatch, pagination.pageSize]);

  // Handle refresh to reload locate history data
  const handleRefresh = useCallback(() => {
    dispatch(fetchLocates({ page: pagination.page, size: pagination.pageSize, sort: pagination.sort }));
  }, [dispatch, pagination.page, pagination.pageSize, pagination.sort]);

  const handleDetailClose = useCallback(() => {
    setShowDetail(false);
    dispatch(clearSelectedLocate());
    setSelectedLocateState(null);
  }, [dispatch]);

  return (
    <HistoryContainer>
      <FilterContainer>
        <LocateFilters onFilterChange={handleFilterChange} />
      </FilterContainer>
      <GridContainer>
        <DataGrid
          data={locates}
          columns={columns}
          loading={loading}
          error={error}
          onRowClick={handleRowSelect}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          onRefresh={handleRefresh}
          detailPanel={false}
          pagination
          paginationPageSize={pagination.pageSize}
          paginationPageSizeOptions={[10, 25, 50, 100]}
          autoSizeColumns
          rowSelection='single'
          clearSelectionOnDetailClose
        />
      </GridContainer>
      {showDetail && selectedLocate && (
        <DetailContainer>
          <LocateDetail 
            onApprove={() => {}}
            onReject={() => {}}
          />
        </DetailContainer>
      )}
    </HistoryContainer>
  );
};

export default LocateHistory;