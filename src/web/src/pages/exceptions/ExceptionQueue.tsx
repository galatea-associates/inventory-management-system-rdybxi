import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Typography, Chip } from '@mui/material'; // @mui/material 5.13
import { format, formatDistance } from 'date-fns'; // date-fns 2.29.3
import { useDispatch, useSelector } from 'react-redux'; // react-redux 8.0.5

import DataGrid from '../../components/data/DataGrid';
import StatusIndicator from '../../components/data/StatusIndicator';
import { getExceptions } from '../../api/exception';
import { fetchExceptions, setExceptionPagination, selectException } from '../../state/exceptions/exceptionsSlice';
import { selectExceptions, selectExceptionsLoading, selectExceptionsError, selectExceptionFilters, selectExceptionsPagination } from '../../state/exceptions/exceptionsSelectors';
import { Alert } from '../../types/models';

/**
 * Type definition for exception queue properties
 */
export interface ExceptionQueueProps {
  /** Callback function to handle exception selection */
  onExceptionSelect?: (exception: Alert) => void;
  /** Height of the exception queue */
  height?: string;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Configuration for a data grid column
 */
interface GridColumn {
  field: string;
  headerName: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  valueFormatter?: (params: any) => string;
  cellRenderer?: React.ComponentType<any>;
}

/**
 * Styled container for the exception queue
 */
const StyledExceptionQueue = styled(Box)`
  width: 100%;
  height: ${props => props.height || '600px'};
  display: flex;
  flex-direction: column;
`;

/**
 * Styled component for severity indicators
 */
const SeverityIndicator = styled(Chip)`
  font-weight: bold;
  font-size: 0.75rem;
`;

/**
 * Styled component for status indicators
 */
const StatusIndicatorChip = styled(Chip)`
  font-weight: bold;
  font-size: 0.75rem;
`;

/**
 * Styled container for timestamp display
 */
const TimestampContainer = styled(Box)`
  display: flex;
  flex-direction: column;
`;

/**
 * Styled component for absolute timestamp
 */
const AbsoluteTime = styled(Typography)`
  font-size: 0.75rem;
  font-weight: bold;
`;

/**
 * Styled component for relative timestamp
 */
const RelativeTime = styled(Typography)`
  font-size: 0.75rem;
  color: text.secondary;
`;

/**
 * Helper function to format a timestamp with appropriate format
 * @param timestamp 
 * @returns Formatted date/time string
 */
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) {
    return '';
  }
  return format(new Date(timestamp), 'MMM dd, yyyy hh:mm:ss a');
};

/**
 * Helper function to format a timestamp as a relative time
 * @param timestamp 
 * @returns Relative time string (e.g., '5 minutes ago')
 */
const formatTimeDistance = (timestamp: string): string => {
  if (!timestamp) {
    return '';
  }
  return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
};

/**
 * Helper function to get the appropriate color for a severity level
 * @param severity 
 * @returns CSS color value
 */
const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'Critical':
      return 'error';
    case 'High':
      return 'warning';
    case 'Medium':
      return 'info';
    case 'Low':
      return 'success';
    default:
      return 'default';
  }
};

/**
 * Helper function to get the appropriate color for an exception status
 * @param status 
 * @returns CSS color value
 */
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Open':
      return 'error';
    case 'In Progress':
      return 'warning';
    case 'Acknowledged':
      return 'info';
    case 'Resolved':
      return 'success';
    default:
      return 'default';
  }
};

/**
 * Renderer function for severity column cells
 * @param params 
 * @returns Rendered severity indicator
 */
const renderSeverityCell = (params: any): JSX.Element => {
  const severity = params.value;
  const color = getSeverityColor(severity);
  return <StatusIndicator status={color} label={severity} />;
};

/**
 * Renderer function for status column cells
 * @param params 
 * @returns Rendered status indicator
 */
const renderStatusCell = (params: any): JSX.Element => {
  const status = params.value;
  const color = getStatusColor(status);
  return <StatusIndicator status={color} label={status} />;
};

/**
 * Renderer function for timestamp column cells
 * @param params 
 * @returns Rendered timestamp with absolute and relative time
 */
const renderTimestampCell = (params: any): JSX.Element => {
  const timestamp = params.value;
  const absoluteTime = formatTimestamp(timestamp);
  const relativeTime = formatTimeDistance(timestamp);

  return (
    <TimestampContainer>
      <AbsoluteTime>{absoluteTime}</AbsoluteTime>
      <RelativeTime>{relativeTime}</RelativeTime>
    </TimestampContainer>
  );
};

/**
 * Handler function for row selection events
 * @param exception 
 */
const handleRowSelect = (exception: Alert): void => {
  dispatch(selectException(exception));
  if (props.onExceptionSelect) {
    props.onExceptionSelect(exception);
  }
};

/**
 * Handler function for pagination page changes
 * @param page 
 */
const handlePageChange = (page: number): void => {
  dispatch(setExceptionPagination({ page }));
  fetchData();
};

/**
 * Handler function for pagination page size changes
 * @param pageSize 
 */
const handlePageSizeChange = (pageSize: number): void => {
  dispatch(setExceptionPagination({ pageSize, page: 0 }));
  fetchData();
};

/**
 * Handler function for sorting changes
 * @param sortModel 
 */
const handleSortChange = (sortModel: any): void => {
  const sortField = sortModel.length > 0 ? sortModel[0].colId : null;
  const sortDirection = sortModel.length > 0 ? sortModel[0].sort : null;
  const sort = sortField ? `${sortField},${sortDirection}` : '';
  dispatch(setExceptionPagination({ sort: [sort] }));
  fetchData();
};

/**
 * Handler function for refreshing exception data
 */
const handleRefresh = async (): Promise<void> => {
  await fetchData();
};

/**
 * A component that displays a queue of system exceptions in a data grid
 */
const ExceptionQueue: React.FC<ExceptionQueueProps> = React.memo((props) => {
  const { onExceptionSelect, height = '100%', className } = props;

  const dispatch = useDispatch();
  const exceptions = useSelector(selectExceptions);
  const loading = useSelector(selectExceptionsLoading);
  const error = useSelector(selectExceptionsError);
  const filters = useSelector(selectExceptionFilters);
  const pagination = useSelector(selectExceptionsPagination);

  const fetchData = useCallback(async () => {
    await dispatch(fetchExceptions({
      page: pagination.page,
      size: pagination.pageSize,
      sort: pagination.sort.join(','),
      filters: filters as any
    }));
  }, [dispatch, pagination.page, pagination.pageSize, pagination.sort, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: GridColumn[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 100, sortable: true, filterable: true },
    { field: 'exceptionType', headerName: 'Type', width: 150, sortable: true, filterable: true },
    { field: 'severity', headerName: 'Severity', width: 120, sortable: true, filterable: true, cellRenderer: renderSeverityCell },
    { field: 'message', headerName: 'Message', width: 300, sortable: false, filterable: true },
    { field: 'timestamp', headerName: 'Timestamp', width: 180, sortable: true, filterable: true, cellRenderer: renderTimestampCell },
    { field: 'status', headerName: 'Status', width: 120, sortable: true, filterable: true, cellRenderer: renderStatusCell },
  ], []);

  return (
    <StyledExceptionQueue height={height} className={className}>
      <DataGrid
        data={exceptions}
        columns={columns}
        loading={loading}
        error={error}
        onRowSelect={handleRowSelect}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSortChange={handleSortChange}
        onRefresh={handleRefresh}
        pagination
        paginationPageSize={pagination.pageSize}
        paginationPageSizeOptions={[10, 25, 50, 100]}
      />
    </StyledExceptionQueue>
  );
});

ExceptionQueue.displayName = 'ExceptionQueue';

export default ExceptionQueue;