import React, { useState, useRef, useCallback, useMemo, CSSProperties, MouseEvent } from 'react'; // React 18.2
import styled from '@emotion/styled'; // @emotion/styled 11.10.6
import { Box, Paper, Typography } from '@mui/material'; // @mui/material 5.13
import useResizeObserver from '@react-hook/resize-observer'; // @react-hook/resize-observer 1.2.6
import useVirtualizedList from '../hooks/useVirtualizedList';
import { calculateDynamicItemHeight } from '../utils/virtualizationHelpers';
import { GridColumn, ColumnType } from '../../components/data/GridColumn';
import Pagination from '../../components/data/Pagination';
import Loader from '../../components/common/Loader';

/**
 * Interface defining the props for the VirtualizedTable component
 */
export interface VirtualizedTableProps<T> {
  /** Array of data items to display in the table */
  data: T[];
  /** Array of column definitions for the table */
  columns: GridColumn[];
  /** Indicates whether the table is currently loading data */
  loading: boolean;
  /** Callback function to handle row clicks */
  onRowClick?: (item: T, index: number) => void;
  /** Callback function to handle column sorting */
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  /** Height of the table container (CSS value) */
  height?: string | number;
  /** Width of the table container (CSS value) */
  width?: string | number;
  /** Default height of each row in the table (pixels) */
  rowHeight?: number;
  /** Number of rows to render above and below the visible area */
  overscan?: number;
  /** Enables pagination for the table */
  pagination?: boolean;
  /** Number of items to display per page */
  pageSize?: number;
  /** Available options for the page size selector */
  pageSizeOptions?: number[];
  /** Default field to sort by */
  defaultSortField?: string;
  /** Default sort direction ('asc' or 'desc') */
  defaultSortDirection?: 'asc' | 'desc';
  /** Additional CSS class name for the table container */
  className?: string;
}

/**
 * Styled container for the virtualized table
 */
const TableContainer = styled(Paper)` // @mui/material 5.13
  display: flex;
  flex-direction: column;
  height: ${props => props.height || '600px'};
  width: ${props => props.width || '100%'};
  overflow: hidden;
  position: relative;
`;

/**
 * Styled header for the virtualized table
 */
const TableHeader = styled(Box)` // @mui/material 5.13
  display: flex;
  border-bottom: 1px solid;
  borderColor: divider;
  backgroundColor: background.paper;
  fontWeight: fontWeightBold;
`;

/**
 * Styled cell for table headers
 */
const HeaderCell = styled(Box)<{ sortable?: boolean; flex?: number; width?: number; minWidth?: number; maxWidth?: number }>` // @mui/material 5.13
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: ${props => props.sortable ? 'pointer' : 'default'};
  userSelect: none;
  position: relative;
  flex: ${props => props.flex || 'none'};
  width: ${props => props.width ? `${props.width}px` : 'auto'};
  minWidth: ${props => props.minWidth ? `${props.minWidth}px` : '50px'};
  maxWidth: ${props => props.maxWidth ? `${props.maxWidth}px` : 'none'};

  &:hover {
    backgroundColor: ${props => props.sortable ? 'action.hover' : 'inherit'};
  }
`;

/**
 * Styled sort indicator for sortable columns
 */
const SortIndicator = styled(Box)` // @mui/material 5.13
  margin-left: 4px;
  display: flex;
  align-items: center;
`;

/**
 * Styled content area for the virtualized rows
 */
const TableContent = styled(Box)` // @mui/material 5.13
  flexGrow: 1;
  overflow: auto;
  position: relative;
`;

/**
 * Styled row for the virtualized table
 */
const TableRow = styled(Box)<{ selected?: boolean }>` // @mui/material 5.13
  display: flex;
  border-bottom: 1px solid;
  borderColor: divider;
  backgroundColor: ${props => props.selected ? 'action.selected' : 'background.paper'};
  cursor: pointer;

  &:hover {
    backgroundColor: action.hover;
  }
`;

/**
 * Styled cell for the virtualized table
 */
const TableCell = styled(Box)<{ flex?: number; width?: number; minWidth?: number; maxWidth?: number }>` // @mui/material 5.13
  padding: 8px 16px;
  display: flex;
  align-items: center;
  overflow: hidden;
  textOverflow: ellipsis;
  whiteSpace: nowrap;
  flex: ${props => props.flex || 'none'};
  width: ${props => props.width ? `${props.width}px` : 'auto'};
  minWidth: ${props => props.minWidth ? `${props.minWidth}px` : '50px'};
  maxWidth: ${props => props.maxWidth ? `${props.maxWidth}px` : 'none'};
`;

/**
 * Styled container for the pagination component
 */
const PaginationContainer = styled(Box)` // @mui/material 5.13
  border-top: 1px solid;
  borderColor: divider;
  backgroundColor: background.paper;
`;

/**
 * Styled container for the loader component
 */
const LoaderContainer = styled(Box)` // @mui/material 5.13
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  backgroundColor: rgba(255, 255, 255, 0.7);
  zIndex: 10;
`;

/**
 * Styled container for empty state message
 */
const EmptyStateContainer = styled(Box)` // @mui/material 5.13
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 16px;
  color: text.secondary;
  textAlign: center;
`;

/**
 * Renders the table header with column headers and sort indicators
 */
const renderTableHeader = ({ columns, sortField, sortDirection, onSort }: { columns: GridColumn[]; sortField: string | null; sortDirection: string; onSort: (field: string) => void }): JSX.Element => {
  return (
    <TableHeader>
      {columns.map((column) => (
        <HeaderCell
          key={column.field}
          sortable={column.sortable}
          onClick={() => column.sortable && onSort(column.field)}
          flex={column.flex}
          width={column.width}
          minWidth={column.minWidth}
          maxWidth={column.maxWidth}
        >
          <Typography variant="subtitle2">
            {column.headerName}
          </Typography>
          {column.sortable && (
            <SortIndicator>
              {sortField === column.field && (
                <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
              )}
            </SortIndicator>
          )}
        </HeaderCell>
      ))}
    </TableHeader>
  );
};

/**
 * Renders a single row in the virtualized table
 */
const renderRow = <T extends any>({ item, index, columns, style, isSelected, onClick }: { item: T; index: number; columns: GridColumn[]; style: CSSProperties; isSelected: boolean; onClick: (item: T, index: number) => void }): JSX.Element => {
  return (
    <TableRow
      style={style}
      selected={isSelected}
      onClick={() => onClick(item, index)}
    >
      {columns.map((column) => (
        <TableCell
          key={`${index}-${column.field}`}
          flex={column.flex}
          width={column.width}
          minWidth={column.minWidth}
          maxWidth={column.maxWidth}
        >
          {formatCellContent(item[column.field], column)}
        </TableCell>
      ))}
    </TableRow>
  );
};

/**
 * Formats cell content based on column type and configuration
 */
const formatCellContent = (value: any, column: GridColumn): React.ReactNode => {
  if (value === null || value === undefined) {
    return '-';
  }

  if (column.valueFormatter) {
    return column.valueFormatter({ value });
  }

  return String(value);
};

/**
 * Sorts the data array based on sort field and direction
 */
const sortData = <T extends any>(data: T[], sortField: string | null, sortDirection: string): T[] => {
  if (!sortField) {
    return data;
  }

  const sortedData = [...data];

  sortedData.sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    let comparison = 0;

    if (aValue < bValue) {
      comparison = -1;
    } else if (aValue > bValue) {
      comparison = 1;
    }

    return sortDirection === 'asc' ? comparison : comparison * -1;
  });

  return sortedData;
};

/**
 * Paginates the data array based on current page and page size
 */
const paginateData = <T extends any>(data: T[], currentPage: number, pageSize: number): T[] => {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return data.slice(startIndex, endIndex);
};

/**
 * A high-performance table component that uses virtualization to efficiently render large datasets
 */
const VirtualizedTable = React.memo(function VirtualizedTable<T>(props: VirtualizedTableProps<T>): JSX.Element {
  const {
    data,
    columns,
    loading,
    onRowClick,
    onSort,
    height = '600px',
    width = '100%',
    rowHeight: defaultRowHeight = 40,
    overscan = 5,
    pagination = false,
    pageSize: defaultPageSize = 10,
    pageSizeOptions = [10, 25, 50, 100],
    defaultSortField = null,
    defaultSortDirection = 'asc',
    className = '',
  } = props;

  // Ref for the table container element
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // State for sorting
  const [sortField, setSortField] = useState<string | null>(defaultSortField);
  const [sortDirection, setSortDirection] = useState<string>(defaultSortDirection);

  // State for pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  // State for selected row
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  // Calculate the effective data to display based on sorting and pagination
  const sortedData = useMemo(() => sortData(data, sortField, sortDirection), [data, sortField, sortDirection]);
  const paginatedData = useMemo(() => paginateData(sortedData, currentPage, pageSize), [sortedData, currentPage, pageSize]);

  // Calculate optimal row height based on container size and data
  const rowHeight = useMemo(() => {
    if (!tableContainerRef.current) return defaultRowHeight;
    return calculateDynamicItemHeight(paginatedData, tableContainerRef.current.clientHeight, defaultRowHeight);
  }, [paginatedData, defaultRowHeight]);

  // Set up the virtualized list hook
  const {
    containerRef,
    containerStyle,
    getItemStyle,
    visibleItems,
    startIndex,
  } = useVirtualizedList<T>({
    data: paginatedData,
    itemHeight: rowHeight,
    overscan,
  });

  // Handle container resize events
  useResizeObserver(tableContainerRef, (entry) => {
    // Force update of row height when container resizes
  });

  // Implement row click handler
  const handleRowClick = useCallback((item: T, index: number) => {
    setSelectedRowIndex(index);
    onRowClick?.(item, index);
  }, [onRowClick]);

  // Implement sort handler
  const handleSort = useCallback((field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    onSort?.(field, sortDirection === 'asc' ? 'desc' : 'asc');
  }, [sortField, sortDirection, onSort]);

  // Implement pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page on page size change
  }, []);

  return (
    <TableContainer ref={tableContainerRef} height={height} width={width} className={className}>
      {loading && (
        <LoaderContainer>
          <Loader />
        </LoaderContainer>
      )}
      {columns && renderTableHeader({ columns, sortField, sortDirection, onSort: handleSort })}
      <TableContent ref={containerRef} style={{ ...containerStyle, minHeight: columns ? 'auto' : height }}>
        {paginatedData.length === 0 && !loading ? (
          <EmptyStateContainer>
            <Typography variant="body1">No data available.</Typography>
          </EmptyStateContainer>
        ) : (
          visibleItems.map((item, i) => {
            const rowIndex = startIndex + i;
            const isSelected = rowIndex === selectedRowIndex;
            return renderRow({
              item,
              index: rowIndex,
              columns,
              style: getItemStyle(rowIndex),
              isSelected,
              onClick: handleRowClick,
            });
          })
        )}
      </TableContent>
      {pagination && (
        <PaginationContainer>
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            totalItems={data.length}
            pageSizeOptions={pageSizeOptions}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </PaginationContainer>
      )}
    </TableContainer>
  );
});

export default VirtualizedTable;