import React, { useState, useEffect, useMemo } from 'react'; // react ^18.x
import { useSelector } from 'react-redux'; // react-redux ^8.x
import { Box, MenuItem, Select, FormControl, InputLabel } from '@mui/material'; // @mui/material ^5.13
import PieChart from '../../components/data/PieChart';
import ChartContainer from '../../components/data/ChartContainer';
import { useApiQuery } from '../../hooks/useApi';
import { getInventoryByCategory } from '../../api/inventory';
import { selectInventoryFilters } from '../../state/inventory/inventorySelectors';
import { formatShortCurrency, formatPercentage } from '../../utils/formatter';

/**
 * @interface CategoryChartProps
 * @description Props for the CategoryChart component
 * @param {string} businessDate - The business date for which to display inventory data
 * @param {string} title - The title of the chart
 * @param {string} groupBy - The category to group inventory data by (optional, defaults to 'market')
 * @param {boolean} showGroupBySelector - Whether to show the group by selector (optional, defaults to true)
 * @param {(number | string)} height - The height of the chart (optional, defaults to 300)
 * @param {object} filters - Optional filters to apply to the inventory data
 */
interface CategoryChartProps {
  businessDate: string;
  title: string;
  groupBy?: string;
  showGroupBySelector?: boolean;
  height?: number | string;
  filters?: object;
}

/**
 * @interface CategoryData
 * @description Interface for category data from the API
 * @param {string} category - The category name
 * @param {number} value - The value for the category
 * @param {number} percentage - The percentage of the total for the category
 * @param {number} change1D - The change in value from the previous day
 * @param {number} change1W - The change in value from the previous week
 */
interface CategoryData {
  category: string;
  value: number;
  percentage: number;
  change1D: number;
  change1W: number;
}

/**
 * @interface ChartData
 * @description Interface for formatted chart data
 * @param {string} name - The name of the category
 * @param {number} value - The value for the category
 * @param {number} percentage - The percentage of the total for the category
 */
interface ChartData {
  name: string;
  value: number;
  percentage: number;
}

/**
 * @function CategoryChart
 * @description Component that displays inventory data categorized by different grouping criteria as a pie chart
 * @param {CategoryChartProps} props - The component props
 * @returns {JSX.Element} Rendered category chart component
 */
const CategoryChart = React.memo<CategoryChartProps>(({
  businessDate,
  height,
  title,
  groupBy: groupByProp,
  showGroupBySelector = true,
  filters,
}) => {
  // LD1: Set up state for the selected groupBy option if not provided in props
  const [groupBy, setGroupBy] = useState(groupByProp || 'market');

  // LD1: Get inventory filters from Redux store using useSelector
  const inventoryFilters = useSelector(selectInventoryFilters);

  // LD1: Use useApiQuery hook to fetch inventory data grouped by the selected category
  const { data, loading, error, refetch } = useApiQuery<CategoryData[]>(
    `${'/api/v1/inventory/by-category'}`,
    useMemo(() => ({
      businessDate,
      groupBy,
      ...filters,
      ...inventoryFilters,
    }), [businessDate, groupBy, filters, inventoryFilters])
  );

  // LD1: Format the API response data for the pie chart component
  const chartData = useMemo(() => {
    if (!data) return [];
    return formatChartData(data);
  }, [data]);

  // LD1: Define tooltip format function for displaying category name, value, and percentage
  const tooltipFormat = useCallback((data: any) => {
    return formatTooltip(data);
  }, []);

  // LD1: Render a ChartContainer with the PieChart component inside
  return (
    <ChartContainer title={title} loading={loading} error={error} isEmpty={!chartData || chartData.length === 0} height={height}>
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* LD1: Include a groupBy selector dropdown if showGroupBySelector is true */}
        {showGroupBySelector && (
          <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel id="group-by-label">Group By</InputLabel>
            <Select
              labelId="group-by-label"
              id="group-by-select"
              value={groupBy}
              label="Group By"
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <MenuItem value={'market'}>Market</MenuItem>
              <MenuItem value={'calculationType'}>Calculation Type</MenuItem>
              <MenuItem value={'securityTemperature'}>Security Temperature</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* LD1: Pass loading, error, and isEmpty states from the API query to the ChartContainer */}
        {/* LD1: Configure the PieChart with appropriate props for visualization */}
        {!loading && !error && chartData && chartData.length > 0 && (
          <PieChart
            data={chartData}
            nameKey="name"
            valueKey="value"
            tooltipFormat={tooltipFormat}
            showLabels={true}
            labelType="percentage"
          />
        )}
      </Box>
    </ChartContainer>
  );
});

/**
 * @function formatTooltip
 * @description Formats the tooltip content for the pie chart segments
 * @param {object} data - The data object containing category, value, and percentage
 * @returns {string} Formatted tooltip string with category, value, and percentage
 */
const formatTooltip = (data: any): string => {
  // LD1: Extract category, value, and percentage from the data object
  const { category, value, percentage } = data;

  // LD1: Format the value as currency using formatShortCurrency
  const formattedValue = formatShortCurrency(value);

  // LD1: Format the percentage using formatPercentage
  const formattedPercentage = formatPercentage(percentage);

  // LD1: Return a string combining the category name, formatted value, and percentage
  return `${category}: ${formattedValue} (${formattedPercentage})`;
};

/**
 * @function formatChartData
 * @description Transforms API response data into the format required by the PieChart component
 * @param {Array<{category: string, value: number, percentage: number, change1D: number, change1W: number}>} apiData - The API response data
 * @returns {Array<{name: string, value: number, percentage: number}>} Formatted data for the pie chart
 */
const formatChartData = (
  apiData: Array<{ category: string; value: number; percentage: number; change1D: number; change1W: number }>
): Array<{ name: string; value: number; percentage: number }> => {
  // LD1: Map over the API data array
  return apiData.map((item) => {
    // LD1: Transform each item to have name (from category), value, and percentage properties
    return {
      name: item.category,
      value: item.value,
      percentage: item.percentage,
    };
  });
};

export default CategoryChart;