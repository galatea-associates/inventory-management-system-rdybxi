import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Grid, Typography, Paper, Divider, CircularProgress } from '@mui/material'; // @mui/material ^5.13
import { useTheme } from '@mui/material/styles'; // @mui/material/styles
import AnalyticsFilters from './AnalyticsFilters';
import LineChart from '../../components/data/LineChart';
import BarChart from '../../components/data/BarChart';
import DataGrid from '../../components/data/DataGrid';
import { GridColumn, ColumnType } from '../../components/data/GridColumn';
import { filterPositions, getPositionSummary, getPositionTypes } from '../../api/position';
import { formatNumber, formatCurrency } from '../../utils/formatter';
import { formatDate, getCurrentBusinessDate, subtractDays } from '../../utils/date';

/**
 * Interface for position summary data
 */
interface PositionSummary {
  totalLong: number;
  totalShort: number;
  netPosition: number;
  securityCount: number;
}

/**
 * Interface for position analytics data
 */
interface PositionAnalyticsData {
  trendData: any[];
  distributionData: any[];
}

/**
 * Styled container for the analytics content
 */
const AnalyticsContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: theme.spacing(3);
  width: 100%;
  height: 100%;
  overflow: auto;
`;

/**
 * Styled container for summary cards
 */
const SummaryContainer = styled(Grid)`
  margin-bottom: theme.spacing(3);
`;

/**
 * Styled card for summary metrics
 */
const SummaryCard = styled(Paper)`
  padding: theme.spacing(2);
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

/**
 * Styled container for charts
 */
const ChartContainer = styled(Paper)`
  padding: theme.spacing(2);
  margin-bottom: theme.spacing(3);
  height: 400px;
`;

/**
 * Styled container for data grid
 */
const GridContainer = styled(Paper)`
  padding: theme.spacing(2);
  height: 500px;
`;

/**
 * Styled overlay for loading state
 */
const LoadingOverlay = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.7);
  zIndex: 1000;
`;

/**
 * Styled component for error messages
 */
const ErrorMessage = styled(Typography)`
  color: error.main;
  marginTop: theme.spacing(2);
  marginBottom: theme.spacing(2);
`;

/**
 * Main component for position analytics visualization
 */
const PositionAnalytics: React.FC = () => {
  // LD1: Initialize state for filter values with default date range (last 30 days)
  const [filters, setFilters] = useState<Record<string, any>>({
    dateRange: {
      startDate: subtractDays(getCurrentBusinessDate(), 30),
      endDate: getCurrentBusinessDate(),
    },
  });

  // LD1: Initialize state for loading status of different data sections
  const [loading, setLoading] = useState({
    summary: false,
    positions: false,
    analytics: false,
  });

  // LD1: Initialize state for error messages
  const [error, setError] = useState({
    summary: null,
    positions: null,
    analytics: null,
  });

  // LD1: Initialize state for position data, summary data, and analytics data
  const [positionData, setPositionData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<PositionSummary | null>(null);
  const [analyticsData, setAnalyticsData] = useState<PositionAnalyticsData | null>(null);

  // LD1: Create a function to load position data based on current filters
  const loadPositionData = useCallback(async (filters: Record<string, any>) => {
    // LD1: Set loading state for position data to true
    setLoading((prev) => ({ ...prev, positions: true }));
    try {
      // LD1: Extract filter parameters from filters object
      const { dateRange, securityId, bookId, counterpartyId, aggregationUnitId, positionType } = filters;

      // LD1: Create filter params object for API call
      const filterParams = {
        businessDate: formatDate(dateRange?.endDate),
        securityId,
        bookId,
        counterpartyId,
        aggregationUnitId,
        positionType,
      };

      // LD1: Create pagination params object for API call
      const paginationParams = {
        page: 0,
        size: 100,
        sort: 'securityId,asc',
      };

      // LD1: Call filterPositions API with filter and pagination params
      const response = await filterPositions(filterParams, paginationParams);

      // LD1: Process and transform the response data
      setPositionData(response.content);
    } catch (e: any) {
      // LD1: Handle any errors during loading
      setError((prev) => ({ ...prev, positions: e }));
    } finally {
      // LD1: Set loading state for position data to false
      setLoading((prev) => ({ ...prev, positions: false }));
    }
  }, [filterPositions, formatDate]);

  // LD1: Create a function to load position summary data based on current filters
  const loadPositionSummary = useCallback(async (filters: Record<string, any>) => {
    // LD1: Set loading state for summary data to true
    setLoading((prev) => ({ ...prev, summary: true }));
    try {
      // LD1: Extract business date and other filter parameters
      const { dateRange, securityId, bookId, counterpartyId, aggregationUnitId } = filters;
      const businessDate = formatDate(dateRange?.endDate);

      // LD1: Call getPositionSummary API with business date and filters
      const response = await getPositionSummary(businessDate, {
        securityId,
        bookId,
        counterpartyId,
        aggregationUnitId,
      });

      // LD1: Update summary data state with response data
      setSummaryData(response);
    } catch (e: any) {
      // LD1: Handle any errors during loading
      setError((prev) => ({ ...prev, summary: e }));
    } finally {
      // LD1: Set loading state for summary data to false
      setLoading((prev) => ({ ...prev, summary: false }));
    }
  }, [getPositionSummary, formatDate]);

  // LD1: Create a function to load position analytics data based on current filters
  const loadPositionAnalytics = useCallback(async (filters: Record<string, any>) => {
    // LD1: Set loading state for analytics data to true
    setLoading((prev) => ({ ...prev, analytics: true }));
    try {
      // LD1: Extract filter parameters from filters object
      const { dateRange, securityId, bookId, counterpartyId, aggregationUnitId, positionType } = filters;

      // LD1: Create filter params object for API call
      const filterParams = {
        businessDate: formatDate(dateRange?.endDate),
        securityId,
        bookId,
        counterpartyId,
        aggregationUnitId,
        positionType,
      };

      // LD1: Call filterPositions API with appropriate parameters for trend data
      const trendResponse = await filterPositions(filterParams, { page: 0, size: 100, sort: 'businessDate,asc' });

      // LD1: Process and transform the response data for trend visualization
      const trendData = processPositionTrendData(trendResponse.content);

      // LD1: Call filterPositions API with appropriate parameters for distribution data
      const distributionResponse = await filterPositions(filterParams, { page: 0, size: 100, sort: 'marketValue,desc' });

      // LD1: Process and transform the response data for distribution visualization
      const distributionData = processPositionDistributionData(distributionResponse.content);

      // LD1: Update analytics data state with processed data
      setAnalyticsData({ trendData, distributionData });
    } catch (e: any) {
      // LD1: Handle any errors during loading
      setError((prev) => ({ ...prev, analytics: e }));
    } finally {
      // LD1: Set loading state for analytics data to false
      setLoading((prev) => ({ ...prev, analytics: false }));
    }
  }, [filterPositions, formatDate]);

  // LD1: Create a function to handle filter changes
  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters);
  }, []);

  // LD1: Create a function to handle filter application
  const handleFilterApply = useCallback((appliedFilters: Record<string, any>) => {
    setFilters(appliedFilters);
    loadPositionData(appliedFilters);
    loadPositionSummary(appliedFilters);
    loadPositionAnalytics(appliedFilters);
  }, [loadPositionData, loadPositionSummary, loadPositionAnalytics]);

  // LD1: Create a function to handle filter reset
  const handleFilterReset = useCallback(() => {
    setFilters({
      dateRange: {
        startDate: subtractDays(getCurrentBusinessDate(), 30),
        endDate: getCurrentBusinessDate(),
      },
    });
    loadPositionData({
      dateRange: {
        startDate: subtractDays(getCurrentBusinessDate(), 30),
        endDate: getCurrentBusinessDate(),
      },
    });
    loadPositionSummary({
      dateRange: {
        startDate: subtractDays(getCurrentBusinessDate(), 30),
        endDate: getCurrentBusinessDate(),
      },
    });
    loadPositionAnalytics({
      dateRange: {
        startDate: subtractDays(getCurrentBusinessDate(), 30),
        endDate: getCurrentBusinessDate(),
      },
    });
  }, [loadPositionData, loadPositionSummary, loadPositionAnalytics]);

  // LD1: Create grid column definitions for position data table
  const getPositionColumns = useCallback((): GridColumn[] => {
    return [
      { field: 'security.securityType', headerName: 'Security', type: ColumnType.SECURITY },
      { field: 'bookId', headerName: 'Book', type: ColumnType.STRING },
      { field: 'positionType', headerName: 'Position Type', type: ColumnType.STRING },
      { field: 'contractualQty', headerName: 'Quantity', type: ColumnType.QUANTITY },
      { field: 'marketValue', headerName: 'Value', type: ColumnType.CURRENCY },
      { field: 'businessDate', headerName: 'Date', type: ColumnType.DATE },
    ];
  }, []);

  // LD1: Create chart configurations for position trend chart
  const formatTooltip = useCallback((dataPoint: any) => {
    return `Date: ${formatDate(dataPoint.date, 'MMM DD, YYYY')}<br>Value: ${formatCurrency(dataPoint.value)}`;
  }, [formatDate, formatCurrency]);

  // LD1: Process position data for trend visualization
  const processPositionTrendData = useCallback((positionData: any[]) => {
    const groupedData = positionData.reduce((acc: any, curr: any) => {
      const date = formatDate(curr.businessDate, 'YYYY-MM-DD');
      if (!acc[date]) {
        acc[date] = { date, value: 0 };
      }
      acc[date].value += curr.marketValue;
      return acc;
    }, {});

    const trendData = Object.values(groupedData).sort((a: any, b: any) => (a.date > b.date ? 1 : -1));
    return trendData;
  }, [formatDate]);

  // LD1: Process position data for distribution visualization
  const processPositionDistributionData = useCallback((positionData: any[]) => {
    const groupedData = positionData.reduce((acc: any, curr: any) => {
      const securityType = curr.security.securityType;
      if (!acc[securityType]) {
        acc[securityType] = { securityType, value: 0 };
      }
      acc[securityType].value += curr.marketValue;
      return acc;
    }, {});

    const distributionData = Object.values(groupedData).sort((a: any, b: any) => b.value - a.value);
    return distributionData;
  }, []);

  // LD1: Load initial data on component mount
  useEffect(() => {
    loadPositionData(filters);
    loadPositionSummary(filters);
    loadPositionAnalytics(filters);
  }, [loadPositionData, loadPositionSummary, loadPositionAnalytics, filters]);

  // LD1: Get current theme
  const theme = useTheme();

  return (
    <AnalyticsContainer>
      {/* LD1: Render analytics filters component with current filters */}
      <AnalyticsFilters
        analyticsType="position"
        filters={filters}
        onChange={handleFilterChange}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
      />

      {/* LD1: Render summary cards for position metrics */}
      <SummaryContainer container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard>
            <Typography variant="h6">Total Long</Typography>
            <Typography variant="body1">{formatCurrency(summaryData?.totalLong)}</Typography>
          </SummaryCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard>
            <Typography variant="h6">Total Short</Typography>
            <Typography variant="body1">{formatCurrency(summaryData?.totalShort)}</Typography>
          </SummaryCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard>
            <Typography variant="h6">Net Position</Typography>
            <Typography variant="body1">{formatCurrency(summaryData?.netPosition)}</Typography>
          </SummaryCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard>
            <Typography variant="h6"># Securities</Typography>
            <Typography variant="body1">{formatNumber(summaryData?.securityCount, 0)}</Typography>
          </SummaryCard>
        </Grid>
      </SummaryContainer>

      {/* LD1: Render position trend chart using LineChart component */}
      <ChartContainer title="Position Trend" loading={loading.analytics} error={error.analytics} isEmpty={analyticsData?.trendData?.length === 0}>
        {analyticsData?.trendData && analyticsData?.trendData?.length > 0 && (
          <LineChart
            data={analyticsData.trendData}
            xKey="date"
            yKey="value"
            xAxisLabel="Date"
            yAxisLabel="Value"
            tooltipFormat={formatTooltip}
          />
        )}
      </ChartContainer>

      {/* LD1: Render position distribution chart using BarChart component */}
      <ChartContainer title="Position Distribution" loading={loading.analytics} error={error.analytics} isEmpty={analyticsData?.distributionData?.length === 0}>
        {analyticsData?.distributionData && analyticsData?.distributionData?.length > 0 && (
          <BarChart
            data={analyticsData.distributionData}
            xKey="securityType"
            yKey="value"
            xAxisLabel="Security Type"
            yAxisLabel="Value"
            barColor={theme.palette.secondary.main}
          />
        )}
      </ChartContainer>

      {/* LD1: Render position data table using DataGrid component */}
      <GridContainer>
        <DataGrid
          data={positionData}
          columns={getPositionColumns()}
          loading={loading.positions}
          error={error.positions}
        />
      </GridContainer>
    </AnalyticsContainer>
  );
};

export default PositionAnalytics;