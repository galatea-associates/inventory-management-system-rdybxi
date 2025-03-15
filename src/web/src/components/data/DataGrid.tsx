import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import {
  ColDef,
  GridOptions,
  GridReadyEvent,
  RowSelectedEvent,
  CellClickedEvent,
  FilterChangedEvent,
  SortChangedEvent,
  GridApi,
  ColumnApi,
} from 'ag-grid-community'; // ag-grid-community 29.3
import { AgGridReact } from 'ag-grid-react'; // ag-grid-react 29.3
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Box, Paper, Typography } from '@mui/material'; // @mui/material 5.13

import {
  GridColumn,
  ColumnType,
  createColumnDef,
  getDefaultColDef,
} from './GridColumn';
import GridToolbar from './GridToolbar';
import Pagination from './Pagination';
import DetailPanel from './DetailPanel';
import Loader from '../common/Loader';
import useVirtualizedList from '../../features/data-virtualization/hooks/useVirtualizedList';
import useExportData from '../../features/data-export/hooks/useExportData';

/**
 * Props for the DataGrid component
 */
export interface DataGridProps<T> {
  /** Array of data items to display in the grid */
  data: T[];
  /** Array of column definitions for the grid */
  columns: GridColumn[];
  /** Whether the grid data is loading */
  loading: boolean;
  /** Error object if there was an error loading data */
  error: Error | null;
  /** Callback for handling row click events */
  onRowClick?: (data: T) => void;
  /** Callback for handling row selection events */
  onRowSelect?: (data: T) => void;
  /** Callback for handling cell click events */
  onCellClick?: (data: T, field: string, value: any) => void;
  /** Callback for handling filter change events */
  onFilterChange?: (filterModel: any) => void;
  /** Callback for handling sort change events */
  onSortChange?: (sortModel: any) => void;
  /** Callback for handling page change events */
  onPageChange?: (page: number) => void;
  /** Callback for handling page size change events */
  onPageSizeChange?: (pageSize: number) => void;
  /** Callback for handling export events */
  onExport?: (format: string, data: T[]) => void;
  /** Callback for handling refresh events */
  onRefresh?: () => void | Promise<void>;
  /** Callback for handling detail panel actions */
  onDetailAction?: (actionId: string, data: T) => void;
  /** Height of the grid container */
  height?: string | number;
  /** Width of the grid container */
  width?: string | number;
  /** Whether to enable pagination */
  pagination?: boolean;
  /** Initial page size for pagination */
  paginationPageSize?: number;
  /** Available page size options for pagination */
  paginationPageSizeOptions?: number[];
  /** Whether to enable detail panel */
  detailPanel?: boolean;
  /** Type of detail panel (e.g., 'position', 'inventory') */
  detailPanelType?: string;
  /** Row selection mode ('single' or 'multiple') */
  rowSelection?: 'single' | 'multiple';
  /** Whether to auto-size columns on grid ready */
  autoSizeColumns?: boolean;
  /** Initial sort model for the grid */
  defaultSortModel?: { colId: string; sort: string }[];
  /** Initial filter model for the grid */
  defaultFilterModel?: object;
  /** Available export formats */
  exportFormats?: string[];
  /** Whether to show the toolbar */
  showToolbar?: boolean;
  /** Whether to show the search input */
  showSearch?: boolean;
  /** Whether to show the filter button */
  showFilter?: boolean;
  /** Whether to show the column toggle button */
  showColumnToggle?: boolean;
  /** Whether to show the export button */
  showExport?: boolean;
  /** Whether to show the refresh button */
  showRefresh?: boolean;
  /** Whether to clear row selection when detail panel is closed */
  clearSelectionOnDetailClose?: boolean;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Model for grid sorting configuration
 */
interface SortModel {
  colId: string;
  sort: 'asc' | 'desc';
}

/**
 * Model for grid filtering configuration
 */
interface FilterModel {
  filterModel: Record<string, any>;
}

/**
 * Styled container for the data grid
 */
const GridContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: ${(props: { height?: string | number }) => props.height || '600px'};
  width: ${(props: { width?: string | number }) => props.width || '100%'};
  overflow: hidden;
  backgroundColor: ${({ theme }) => theme.palette.background.paper};
  borderRadius: 4px;
  boxShadow: 1;
`;

/**
 * Styled content area for the AG Grid component
 */
const GridContent = styled(Box)`
  flexGrow: 1;
  width: 100%;
  height: calc(100% - 56px);
  overflow: hidden;
  position: relative;
`;

/**
 * Styled AG Grid component with theme integration
 */
const StyledAgGridReact = styled(AgGridReact)`
  height: 100%;
  width: 100%;
  fontFamily: ${({ theme }) => theme.typography.fontFamily};
  fontSize: ${({ theme }) => theme.typography.fontSize};
`;

/**
 * Styled container for error messages
 */
const ErrorContainer = styled(Box)`
  display: flex;
  flexDirection: column;
  alignItems: center;
  justifyContent: center;
  height: 100%;
  padding: 16px;
  color: ${({ theme }) => theme.palette.error.main};
  textAlign: center;
`;

/**
 * Styled container for the loader component
 */
const LoaderContainer = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  alignItems: center;
  justifyContent: center;
  backgroundColor: rgba(255, 255, 255, 0.7);
  zIndex: 10;
`;

/**
 * Styled container for the pagination component
 */
const PaginationContainer = styled(Box)`
  borderTop: 1px solid;
  borderColor: divider;
  backgroundColor: ${({ theme }) => theme.palette.background.paper};
`;

/**
 * A high-performance data grid component for displaying and interacting with large datasets
 */
const DataGrid = React.memo(function DataGrid<T>(props: DataGridProps<T>): JSX.Element {
  // LD1: Destructure props including data, columns, loading, error, onRowClick, onRowSelect, onCellClick, onFilterChange, onSortChange, onPageChange, onPageSizeChange, onExport, onRefresh, and other configuration options
  const {
    data,
    columns,
    loading,
    error,
    onRowClick,
    onRowSelect,
    onCellClick,
    onFilterChange,
    onSortChange,
    onPageChange,
    onPageSizeChange,
    onExport,
    onRefresh,
    onDetailAction,
    height = '600px',
    width = '100%',
    pagination = false,
    paginationPageSize = 10,
    paginationPageSizeOptions = [10, 25, 50, 100],
    detailPanel = false,
    detailPanelType = '',
    rowSelection = 'single',
    autoSizeColumns = false,
    defaultSortModel = [],
    defaultFilterModel = {},
    exportFormats = ['xlsx', 'csv', 'pdf'],
    showToolbar = true,
    showSearch = true,
    showFilter = true,
    showColumnToggle = true,
    showExport = true,
    showRefresh = true,
    clearSelectionOnDetailClose = true,
    className,
  } = props;

  // LD1: Set up state for grid API and column API references
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [gridColumnApi, setGridColumnApi] = useState<ColumnApi | null>(null);

  // LD1: Set up state for pagination (current page and page size)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(paginationPageSize);

  // LD1: Set up state for selected row and detail panel visibility
  const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState<boolean>(false);

  // LD1: Set up state for sort model and filter model
  const [sortModel, setSortModel] = useState(defaultSortModel);
  const [filterModel, setFilterModel] = useState(defaultFilterModel);

  // LD1: Create memoized AG Grid column definitions from provided GridColumn configurations
  const columnDefs = useMemo(() => {
    return columns.map((column) => createColumnDef(column));
  }, [columns]);

  // LD1: Create memoized grid options with event handlers and configuration
  const gridOptions = useMemo<GridOptions>(() => ({
    columnDefs: columnDefs,
    defaultColDef: getDefaultColDef(),
    rowSelection: rowSelection,
    pagination: pagination,
    paginationPageSize: pageSize,
    suppressPaginationPanel: true,
    onGridReady: handleGridReady,
    onRowSelected: handleRowSelected,
    onCellClicked: handleCellClicked,
    onFilterChanged: handleFilterChanged,
    onSortChanged: handleSortChanged,
  }), [columnDefs, rowSelection, pagination, pageSize, handleGridReady, handleRowSelected, handleCellClicked, handleFilterChanged, handleSortChanged]);

  // LD1: Handle grid ready event to store API references
  const handleGridReady = useCallback((event: GridReadyEvent) => {
    setGridApi(event.api);
    setGridColumnApi(event.columnApi);

    // IE1: Apply initial sorting if provided
    if (defaultSortModel && defaultSortModel.length > 0) {
      event.api.applySorting(defaultSortModel);
    }

    // IE1: Apply initial filtering if provided
    if (defaultFilterModel && Object.keys(defaultFilterModel).length > 0) {
      event.api.setFilterModel(defaultFilterModel);
    }

    // IE1: Auto-size columns if autoSizeColumns is true
    if (autoSizeColumns) {
      const allColumnIds: string[] = [];
      event.columnApi.getColumns().forEach((column) => {
        allColumnIds.push(column.getId());
      });
      event.columnApi.autoSizeColumns(allColumnIds, false);
    }
  }, [autoSizeColumns, defaultSortModel, defaultFilterModel]);

  // LD1: Handle row selection events and update selected row state
  const handleRowSelected = useCallback((event: RowSelectedEvent<T>) => {
    // IE1: Check if a row is selected in the event
    if (event.node.isSelected()) {
      // IE1: Update selected row state with the selected row data
      setSelectedRow(event.data);
      // IE1: Show detail panel if detailPanel is enabled
      if (detailPanel) {
        setShowDetailPanel(true);
      }
      // IE1: Call onRowSelect callback if provided
      if (onRowSelect) {
        onRowSelect(event.data);
      }
    }
  }, [detailPanel, onRowSelect]);

  // LD1: Handle cell click events and propagate to parent component
  const handleCellClicked = useCallback((event: CellClickedEvent<T>) => {
    // IE1: Extract cell and row information from event
    const rowData = event.data;
    const field = event.colDef.field;
    const value = event.value;
    // IE1: Call onCellClick callback if provided
    if (onCellClick && rowData && field) {
      onCellClick(rowData, field, value);
    }
  }, [onCellClick]);

  // LD1: Handle filter change events and propagate to parent component
  const handleFilterChanged = useCallback((event: FilterChangedEvent) => {
    // IE1: Get current filter model from grid API
    const currentFilterModel = gridApi?.getFilterModel();
    // IE1: Update filter model state
    setFilterModel(currentFilterModel);
    // IE1: Call onFilterChange callback if provided
    if (onFilterChange) {
      onFilterChange(currentFilterModel);
    }
  }, [gridApi, onFilterChange]);

  // LD1: Handle sort change events and propagate to parent component
  const handleSortChanged = useCallback((event: SortChangedEvent) => {
    // IE1: Get current sort model from grid API
    const currentSortModel = gridApi?.getSortModel();
    // IE1: Update sort model state
    setSortModel(currentSortModel);
    // IE1: Call onSortChange callback if provided
    if (onSortChange) {
      onSortChange(currentSortModel);
    }
  }, [gridApi, onSortChange]);

  // LD1: Handle search input changes and filters the grid
  const handleSearch = useCallback((searchValue: string) => {
    // IE1: Apply quick filter to grid API with search value
    gridApi?.setQuickFilter(searchValue);
    // IE1: Update search value state
  }, [gridApi]);

  // LD1: Handle export functionality for the current grid data
  const handleExport = useCallback(async (format: string) => {
    // IE1: Get current grid data from grid API
    const currentData = data;
    // IE1: Call appropriate export function based on data type
    // IE1: Call onExport callback if provided
    if (onExport) {
      onExport(format, currentData);
    }
  }, [data, onExport]);

  // LD1: Handle refresh functionality and propagates to parent component
  const handleRefresh = useCallback(() => {
    // IE1: Call onRefresh callback if provided
    if (onRefresh) {
      onRefresh();
    }
    // IE1: Show loading state during refresh
  }, [onRefresh]);

  // LD1: Handle closing the detail panel
  const handleDetailPanelClose = useCallback(() => {
    // IE1: Hide detail panel
    setShowDetailPanel(false);
    // IE1: Clear selected row if clearSelectionOnDetailClose is true
    if (clearSelectionOnDetailClose) {
      setSelectedRow(null);
      gridApi?.deselectAll();
    }
  }, [clearSelectionOnDetailClose, gridApi]);

  // LD1: Handle actions from the detail panel
  const handleDetailPanelAction = useCallback((actionId: string, data: T) => {
    // IE1: Call onDetailAction callback if provided
    if (onDetailAction) {
      onDetailAction(actionId, data);
    }
  }, [onDetailAction]);

  // LD1: Render grid container with appropriate dimensions
  return (
    <GridContainer height={height} width={width} className={className}>
      {/* LD1: Render grid toolbar with search, filter, export, and refresh controls */}
      {showToolbar && (
        <GridToolbar
          onSearch={handleSearch}
          onFilter={() => {}} // TODO: Implement onFilter
          onExport={handleExport}
          onRefresh={handleRefresh}
          onColumnToggle={() => {}} // TODO: Implement onColumnToggle
          searchValue="" // TODO: Implement searchValue
          isLoading={loading}
          filterDefinitions={[]} // TODO: Implement filterDefinitions
          exportFormats={exportFormats}
          showSearch={showSearch}
          showFilter={showFilter}
          showColumnToggle={showColumnToggle}
          showExport={showExport}
          showRefresh={showRefresh}
        />
      )}

      <GridContent>
        {/* LD1: Render AG Grid component with configured options */}
        <StyledAgGridReact
          className="ag-theme-alpine"
          gridOptions={gridOptions}
          rowData={data}
        />

        {/* LD1: Handle loading state with Loader component */}
        {loading && (
          <LoaderContainer>
            <Loader />
          </LoaderContainer>
        )}

        {/* LD1: Handle error state with appropriate error message */}
        {error && (
          <ErrorContainer>
            <Typography variant="h6">Error</Typography>
            <Typography variant="body2">{error.message}</Typography>
          </ErrorContainer>
        )}
      </GridContent>

      {/* LD1: Render pagination component if enabled */}
      {pagination && (
        <PaginationContainer>
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            totalItems={data.length}
            pageSizeOptions={paginationPageSizeOptions}
            onPageChange={(page) => {
              setCurrentPage(page);
              onPageChange?.(page);
            }}
            onPageSizeChange={(pageSize) => {
              setPageSize(pageSize);
              onPageSizeChange?.(pageSize);
            }}
          />
        </PaginationContainer>
      )}

      {/* LD1: Render detail panel for selected row if enabled */}
      {detailPanel && selectedRow && (
        <DetailPanel
          data={selectedRow}
          type={detailPanelType}
          onClose={handleDetailPanelClose}
          onAction={handleDetailPanelAction}
        />
      )}
    </GridContainer>
  );
});

DataGrid.displayName = 'DataGrid';

// IE3: Export the DataGrid component for use throughout the application
export default DataGrid;

// IE3: Export the DataGridProps interface for use throughout the application
export interface DataGridProps<T> {
  /** Array of data items to display in the grid */
  data: T[];
  /** Array of column definitions for the grid */
  columns: GridColumn[];
  /** Whether the grid data is loading */
  loading: boolean;
  /** Error object if there was an error loading data */
  error: Error | null;
  /** Callback for handling row click events */
  onRowClick?: (data: T) => void;
  /** Callback for handling row selection events */
  onRowSelect?: (data: T) => void;
  /** Callback for handling cell click events */
  onCellClick?: (data: T, field: string, value: any) => void;
  /** Callback for handling filter change events */
  onFilterChange?: (filterModel: any) => void;
  /** Callback for handling sort change events */
  onSortChange?: (sortModel: any) => void;
  /** Callback for handling page change events */
  onPageChange?: (page: number) => void;
  /** Callback for handling page size change events */
  onPageSizeChange?: (pageSize: number) => void;
  /** Callback for handling export events */
  onExport?: (format: string, data: T[]) => void;
  /** Callback for handling refresh events */
  onRefresh?: () => void | Promise<void>;
  /** Callback for handling detail panel actions */
  onDetailAction?: (actionId: string, data: T) => void;
  /** Height of the grid container */
  height?: string | number;
  /** Width of the grid container */
  width?: string | number;
  /** Whether to enable pagination */
  pagination?: boolean;
  /** Initial page size for pagination */
  paginationPageSize?: number;
  /** Available page size options for pagination */
  paginationPageSizeOptions?: number[];
  /** Whether to enable detail panel */
  detailPanel?: boolean;
  /** Type of detail panel (e.g., 'position', 'inventory') */
  detailPanelType?: string;
  /** Row selection mode ('single' or 'multiple') */
  rowSelection?: 'single' | 'multiple';
  /** Whether to auto-size columns on grid ready */
  autoSizeColumns?: boolean;
  /** Initial sort model for the grid */
  defaultSortModel?: { colId: string; sort: string }[];
  /** Initial filter model for the grid */
  defaultFilterModel?: object;
  /** Available export formats */
  exportFormats?: string[];
  /** Whether to show the toolbar */
  showToolbar?: boolean;
  /** Whether to show the search input */
  showSearch?: boolean;
  /** Whether to show the filter button */
  showFilter?: boolean;
  /** Whether to show the column toggle button */
  showColumnToggle?: boolean;
  /** Whether to show the export button */
  showExport?: boolean;
  /** Whether to show the refresh button */
  showRefresh?: boolean;
  /** Whether to clear row selection when detail panel is closed */
  clearSelectionOnDetailClose?: boolean;
  /** Custom CSS class name */
  className?: string;
}