import React, { useState, useCallback, useMemo } from 'react'; // react ^18.2.0
import { useSelector } from 'react-redux'; // react-redux ^8.0.5
import { Box, Typography, MenuItem, Select, FormControl, InputLabel } from '@mui/material'; // @mui/material 5.13
import DataGrid from '../../components/data/DataGrid';
import { GridColumn } from '../../components/data/GridColumn';
import { useApiQuery } from '../../hooks/useApi';
import { getInventoryByCategory } from '../../api/inventory';
import { selectInventoryFilters } from '../../state/inventory/inventorySelectors';
import { formatCurrency, formatPercentage } from '../../utils/formatter';
import { styled } from '@emotion/styled';

/**
 * Interface for category data from the API
 */
interface CategoryData {
  category: string;
  value: number;
  percentage: number;
  change1D: number;
  change1W: number;
}

/**
 * Props for the CategoryTable component
 */
interface CategoryTableProps {
  businessDate: string;
  title: string;
  groupBy?: string;
  showGroupBySelector?: boolean;
  height?: number | string;
  onCategorySelect?: (category: string) => void;
  filters?: object;
}

/**
 * Styled container for the category table
 */
const TableContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: ${(props: { height?: number | string }) => props.height || '400px'};
  width: 100%;
  overflow: hidden;
  background-color: ${({ theme }) => theme.palette.background.paper};
  border-radius: 4px;
  box-shadow: 1;
`;

/**
 * Styled container for the table header with title and controls
 */
const HeaderContainer = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid;
  border-color: divider;
`;

/**
 * Styled container for the groupBy selector
 */
const GroupByContainer = styled(FormControl)`
  min-width: 120px;
  margin-left: 16px;
`;

/**
 * Styled component for trend indicators
 */
const TrendIndicator = styled(Typography)`
  display: flex;
  align-items: center;
  fontWeight: bold;
  color: props => props.color;
`;

/**
 * Component that displays inventory data categorized by different grouping criteria in a tabular format
 */
const CategoryTable: React.FC<CategoryTableProps> = React.memo(({
  businessDate,
  title,
  groupBy = 'market',
  showGroupBySelector = true,
  height = 400,
  onCategorySelect,
  filters
}) => {
  // LD1: Set up state for the selected groupBy option if not provided in props
  const [selectedGroupBy, setSelectedGroupBy] = useState<string>(groupBy);

  // LD1: Get inventory filters from Redux store using useSelector
  const inventoryFilters = useSelector(selectInventoryFilters);

  // LD1: Use useApiQuery hook to fetch inventory data grouped by the selected category
  const { data: categoryData, loading, error } = useApiQuery<CategoryData[]>(
    '/api/v1/inventory/by-category',
    {
      businessDate,
      groupBy: selectedGroupBy,
      ...filters,
      ...inventoryFilters
    }
  );

  // LD1: Define column definitions for the data grid
  const columnDefinitions = useMemo<GridColumn[]>(() => getColumnDefinitions(), []);

  // LD1: Handle row click to trigger onCategorySelect callback if provided
  const handleRowClick = useCallback((rowData: CategoryData) => {
    if (onCategorySelect) {
      onCategorySelect(rowData.category);
    }
  }, [onCategorySelect]);

  // LD1: Handle groupBy change to update the category grouping
  const handleGroupByChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedGroupBy(event.target.value);
  }, []);

  // LD1: Render a Box container with title and groupBy selector
  return (
    <TableContainer height={height}>
      <HeaderContainer>
        <Typography variant="h6">{title}</Typography>
        {showGroupBySelector && (
          <GroupByContainer>
            <InputLabel id="group-by-label">Group By</InputLabel>
            <Select
              labelId="group-by-label"
              value={selectedGroupBy}
              onChange={handleGroupByChange}
            >
              <MenuItem value="market">Market</MenuItem>
              <MenuItem value="securityTemperature">Security Temperature</MenuItem>
              <MenuItem value="calculationType">Calculation Type</MenuItem>
            </Select>
          </GroupByContainer>
        )}
      </HeaderContainer>

      {/* LD1: Render DataGrid component with the category data */}
      <DataGrid
        data={categoryData || []}
        columns={columnDefinitions}
        loading={loading}
        error={error}
        onRowClick={handleRowClick}
      />
    </TableContainer>
  );
});

/**
 * Creates column definitions for the category data grid
 */
const getColumnDefinitions = (): GridColumn[] => {
  // LD1: Define category column with text renderer
  const categoryColumn: GridColumn = {
    field: 'category',
    headerName: 'Category',
    flex: 1,
  };

  // LD1: Define value column with currency formatter
  const valueColumn: GridColumn = {
    field: 'value',
    headerName: 'Value',
    width: 150,
    valueFormatter: (params) => formatCurrency(params.value),
  };

  // LD1: Define percentage column with percentage formatter
  const percentageColumn: GridColumn = {
    field: 'percentage',
    headerName: '% of Total',
    width: 120,
    valueFormatter: (params) => formatPercentage(params.value, 2),
  };

  // LD1: Define 1-day change column with percentage formatter and trend indicator
  const change1DColumn: GridColumn = {
    field: 'change1D',
    headerName: '1D Change',
    width: 120,
    valueFormatter: (params) => formatPercentage(params.value, 2),
    cellRenderer: (params) => renderTrendIndicator(params.value),
  };

  // LD1: Define 1-week change column with percentage formatter and trend indicator
  const change1WColumn: GridColumn = {
    field: 'change1W',
    headerName: '1W Change',
    width: 120,
    valueFormatter: (params) => formatPercentage(params.value, 2),
    cellRenderer: (params) => renderTrendIndicator(params.value),
  };

  // LD1: Return array of column definitions
  return [categoryColumn, valueColumn, percentageColumn, change1DColumn, change1WColumn];
};

/**
 * Handles row click in the category data grid
 */
const handleRowClick = (rowData: CategoryData): void => {
  // LD1: Check if onCategorySelect callback is provided
  // LD1: If provided, call onCategorySelect with the category from the clicked row
  // LD1: Otherwise, do nothing
};

/**
 * Handles change of the groupBy selector
 */
const handleGroupByChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
  // LD1: Extract the new groupBy value from the event
  // LD1: Update the groupBy state with the new value
};

/**
 * Renders a visual indicator for positive or negative trends
 */
const renderTrendIndicator = (value: number): JSX.Element => {
  // LD1: Determine color based on value (green for positive, red for negative, gray for zero)
  let color = '#9e9e9e'; // Gray
  if (value > 0) {
    color = '#4caf50'; // Green
  } else if (value < 0) {
    color = '#f44336'; // Red
  }

  // LD1: Determine icon based on value (up arrow for positive, down arrow for negative, horizontal line for zero)
  let icon = '━'; // Horizontal line
  if (value > 0) {
    icon = '▲'; // Up arrow
  } else if (value < 0) {
    icon = '▼'; // Down arrow
  }

  // LD1: Return Typography component with appropriate color and icon
  return (
    <TrendIndicator color={color}>
      {icon}
    </TrendIndicator>
  );
};

export default CategoryTable;