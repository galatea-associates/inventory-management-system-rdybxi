import React, { useState, useEffect, useMemo, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Grid, Paper, Typography, Divider, useTheme } from '@mui/material'; // @mui/material ^5.13
import AnalyticsFilters, { AnalyticsFiltersProps } from './AnalyticsFilters';
import LineChart from '../../components/data/LineChart';
import BarChart from '../../components/data/BarChart';
import PieChart from '../../components/data/PieChart';
import ChartContainer from '../../components/data/ChartContainer';
import KPI from '../../components/data/KPI';
import {
  getExceptionStats,
  getExceptionTypes,
  getExceptionSeverities,
  getExceptionStatuses,
  getExceptions
} from '../../api/exception';
import { formatNumber, formatPercentage } from '../../utils/formatter';
import { getCurrentBusinessDate, formatDate, subtractDays, addDays } from '../../utils/date';
import useDebounce from '../../hooks/useDebounce';

// LD1: Define the ExceptionFilters interface for exception analytics filter state
interface ExceptionFilters {
  dateRange: any;
  exceptionType: string | null;
  severity: string | null;
  service: string | null;
  status: string | null;
}

// LD1: Define the ExceptionSummary interface for exception summary data
interface ExceptionSummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
}

// LD1: Define the DistributionData interface for exception distribution data
interface DistributionData {
  name: string;
  value: number;
  percentage: number;
}

// LD1: Define the TrendData interface for exception trend data point
interface TrendData {
  date: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// LD1: Define the TopTypeData interface for top exception type data
interface TopTypeData {
  type: string;
  count: number;
  percentage: number;
}

// LD1: Styled container for the analytics page
const AnalyticsContainer = styled(Box)`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: theme.spacing(3);
`;

// LD1: Styled container for each analytics section
const SectionContainer = styled(Paper)`
  padding: theme.spacing(2);
  borderRadius: theme.shape.borderRadius;
  boxShadow: theme.shadows[1];
`;

// LD1: Styled component for section titles
const SectionTitle = styled(Typography)`
  fontWeight: 500;
  marginBottom: theme.spacing(2);
`;

// LD1: Styled grid container for charts
const ChartGrid = styled(Grid)`
  container: true;
  spacing: 3;
`;

// LD1: Main component for exception analytics visualization
const ExceptionAnalytics: React.FC = () => {
  // LD1: Initialize state for filters with default values
  const [filters, setFilters] = useState<ExceptionFilters>({
    dateRange: {
      startDate: subtractDays(getCurrentBusinessDate(), 30),
      endDate: getCurrentBusinessDate(),
    },
    exceptionType: null,
    severity: null,
    service: null,
    status: null,
  });

  // LD1: Initialize state for loading status of different data sections
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingDistribution, setLoadingDistribution] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingTopTypes, setLoadingTopTypes] = useState(false);

  // LD1: Initialize state for error handling
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [errorDistribution, setErrorDistribution] = useState<string | null>(null);
  const [errorTrends, setErrorTrends] = useState<string | null>(null);
  const [errorTopTypes, setErrorTopTypes] = useState<string | null>(null);

  // LD1: Initialize state for exception data (summary, distribution, trends, top types)
  const [summaryData, setSummaryData] = useState<ExceptionSummary | null>(null);
  const [distributionData, setDistributionData] = useState<DistributionData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [topTypesData, setTopTypesData] = useState<TopTypeData[]>([]);

  // LD1: Fetch exception types, severities, and statuses on component mount
  useEffect(() => {
    // LD1: Fetch exception types, severities, and statuses from the API
    // LD1: Update state with fetched data
  }, []);

  // LD1: Create debounced filter handler to prevent excessive API calls
  const debouncedFetchAllData = useDebounce(fetchAllData, 500);

  // LD1: Fetch exception summary data based on current filters
  const fetchExceptionSummary = useCallback(async (currentFilters: ExceptionFilters) => {
    setLoadingSummary(true);
    setErrorSummary(null);
    try {
      const { startDate, endDate } = currentFilters.dateRange;
      const data = await getExceptionStats({ startDate: formatDate(startDate), endDate: formatDate(endDate) });
      setSummaryData(data);
    } catch (error: any) {
      setErrorSummary(error.message || 'Failed to fetch exception summary data.');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // LD1: Fetch exception distribution data based on current filters
  const fetchExceptionDistribution = useCallback(async (currentFilters: ExceptionFilters) => {
    setLoadingDistribution(true);
    setErrorDistribution(null);
    try {
      const { startDate, endDate } = currentFilters.dateRange;
      const data = await getExceptionStats({ startDate: formatDate(startDate), endDate: formatDate(endDate) });
      const distribution = Object.entries(data?.byType || {}).map(([name, value]) => ({
        name,
        value,
        percentage: (value / data.total) * 100,
      }));
      setDistributionData(distribution);
    } catch (error: any) {
      setErrorDistribution(error.message || 'Failed to fetch exception distribution data.');
    } finally {
      setLoadingDistribution(false);
    }
  }, []);

  // LD1: Fetch exception trend data over time
  const fetchExceptionTrends = useCallback(async (currentFilters: ExceptionFilters) => {
    setLoadingTrends(true);
    setErrorTrends(null);
    try {
      const { startDate, endDate } = currentFilters.dateRange;
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);
      const dailyData: TrendData[] = [];

      while (currentDate <= endDateObj) {
        const dateString = formatDate(currentDate);
        const data = await getExceptionStats({ startDate: dateString, endDate: dateString });
        dailyData.push({
          date: dateString,
          total: data.total,
          critical: data.bySeverity?.critical || 0,
          high: data.bySeverity?.high || 0,
          medium: data.bySeverity?.medium || 0,
          low: data.bySeverity?.low || 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      setTrendData(dailyData);
    } catch (error: any) {
      setErrorTrends(error.message || 'Failed to fetch exception trend data.');
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  // LD1: Fetch top exception types data based on current filters
  const fetchTopExceptionTypes = useCallback(async (currentFilters: ExceptionFilters) => {
    setLoadingTopTypes(true);
    setErrorTopTypes(null);
    try {
      const { startDate, endDate, severity, status } = currentFilters;
      const data = await getExceptionStats({ startDate: formatDate(startDate), endDate: formatDate(endDate), severity, status });
      const topTypes = Object.entries(data?.byType || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({
          type,
          count,
          percentage: (count / data.total) * 100,
        }));
      setTopTypesData(topTypes);
    } catch (error: any) {
      setErrorTopTypes(error.message || 'Failed to fetch top exception types data.');
    } finally {
      setLoadingTopTypes(false);
    }
  }, []);

  // LD1: Handle filter changes from the AnalyticsFilters component
  const handleFilterChange = useCallback((newFilters: ExceptionFilters) => {
    setFilters(newFilters);
    debouncedFetchAllData(newFilters);
  }, [debouncedFetchAllData]);

  // LD1: Handle filter apply action
  const handleFilterApply = useCallback((appliedFilters: ExceptionFilters) => {
    setFilters(appliedFilters);
    fetchAllData(appliedFilters);
  }, []);

  // LD1: Fetch all exception analytics data
  const fetchAllData = useCallback(async (currentFilters: ExceptionFilters) => {
    await Promise.all([
      fetchExceptionSummary(currentFilters),
      fetchExceptionDistribution(currentFilters),
      fetchExceptionTrends(currentFilters),
      fetchTopExceptionTypes(currentFilters),
    ]);
  }, [fetchExceptionSummary, fetchExceptionDistribution, fetchExceptionTrends, fetchTopExceptionTypes]);

  // LD1: Format tooltip content for charts
  const formatTooltip = useCallback((dataPoint: any, chartType: string) => {
    switch (chartType) {
      case 'distribution':
        return `${dataPoint.name}: ${formatNumber(dataPoint.value, 0)} (${formatPercentage(dataPoint.percentage, 1)})`;
      case 'trend':
        return `${formatDate(dataPoint.date)}: ${formatNumber(dataPoint.total, 0)}`;
      case 'topTypes':
        return `${dataPoint.type}: ${formatNumber(dataPoint.count, 0)}`;
      default:
        return `${dataPoint.name}: ${formatNumber(dataPoint.value, 0)}`;
    }
  }, []);

  // LD1: Apply appropriate layout and styling for responsive design
  const theme = useTheme();

  return (
    <AnalyticsContainer>
      {/* LD1: Render the AnalyticsFilters component with appropriate props */}
      <AnalyticsFilters
        analyticsType="exception"
        filters={filters}
        onChange={handleFilterChange}
        onApply={handleFilterApply}
      />

      {/* LD1: Render the summary section with KPI components */}
      <SectionContainer>
        <SectionTitle variant="h6">Summary</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <KPI label="Total Exceptions" value={summaryData?.total || 0} loading={loadingSummary} />
          </Grid>
        </Grid>
      </SectionContainer>

      {/* LD1: Render the distribution section with PieChart components */}
      <SectionContainer>
        <SectionTitle variant="h6">Distribution by Type</SectionTitle>
        <ChartGrid container spacing={3}>
          <Grid item xs={12} md={6}>
            <PieChart
              title="By Type"
              data={distributionData}
              nameKey="name"
              valueKey="value"
              loading={loadingDistribution}
              error={errorDistribution}
              tooltipFormat={(d) => formatTooltip(d, 'distribution')}
            />
          </Grid>
        </ChartGrid>
      </SectionContainer>

      {/* LD1: Render the trends section with LineChart */}
      <SectionContainer>
        <SectionTitle variant="h6">Trends</SectionTitle>
        <LineChart
          title="Total Exceptions Over Time"
          data={trendData}
          xKey="date"
          yKey="total"
          loading={loadingTrends}
          error={errorTrends}
          tooltipFormat={(d) => formatTooltip(d, 'trend')}
        />
      </SectionContainer>

      {/* LD1: Render the top exception types section with BarChart */}
      <SectionContainer>
        <SectionTitle variant="h6">Top Exception Types</SectionTitle>
        <BarChart
          title="Top 5 Exception Types"
          data={topTypesData}
          xKey="type"
          yKey="count"
          loading={loadingTopTypes}
          error={errorTopTypes}
          tooltipFormat={(d) => formatTooltip(d, 'topTypes')}
        />
      </SectionContainer>
    </AnalyticsContainer>
  );
};

export default ExceptionAnalytics;