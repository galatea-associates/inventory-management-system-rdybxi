import React, { useState, useEffect, useMemo, useCallback } from 'react'; // React v18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Grid, Divider } from '@mui/material'; // @mui/material ^5.13
import { AssessmentOutlined, AccessTimeOutlined, CheckCircleOutlineOutlined, CancelOutlined } from '@mui/icons-material'; // @mui/icons-material ^5.13
import AnalyticsFilters from './AnalyticsFilters'; // src/web/src/pages/analytics/AnalyticsFilters.tsx
import LineChart from '../../components/data/LineChart'; // src/web/src/components/data/LineChart.tsx
import BarChart from '../../components/data/BarChart'; // src/web/src/components/data/BarChart.tsx
import PieChart from '../../components/data/PieChart'; // src/web/src/components/data/PieChart.tsx
import KPI from '../../components/data/KPI'; // src/web/src/components/data/KPI.tsx
import DataGrid from '../../components/data/DataGrid'; // src/web/src/components/data/DataGrid.tsx
import Card from '../../components/common/Card'; // src/web/src/components/common/Card.tsx
import Typography from '../../components/common/Typography'; // src/web/src/components/common/Typography.tsx
import Loader from '../../components/common/Loader'; // src/web/src/components/common/Loader.tsx
import Alert from '../../components/common/Alert'; // src/web/src/components/common/Alert.tsx
import { getLocateHistory, getLocateStatistics } from '../../api/locate'; // src/web/src/api/locate.ts
import { formatDate, parseDate } from '../../utils/date'; // src/web/src/utils/date.ts
import { formatNumber, formatPercentage } from '../../utils/formatter'; // src/web/src/utils/formatter.ts

// Define styled components for layout and styling
const AnalyticsContainer = styled(Box)`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: theme.spacing(3);
`;

const ChartContainer = styled(Box)`
  width: 100%;
  height: 400px;
  marginBottom: theme.spacing(3);
`;

const KPIContainer = styled(Grid)`
  marginBottom: theme.spacing(3);
`;

const SectionTitle = styled(Typography)`
  marginBottom: theme.spacing(2);
  fontWeight: 500;
`;

const GridContainer = styled(Box)`
  height: 500px;
  width: 100%;
  marginTop: theme.spacing(3);
`;

// Define interfaces for data structures
interface LocateFilters {
  startDate: string;
  endDate: string;
  securityId: string;
  clientId: string;
  status: string;
}

interface LocateStatistics {
  totalRequests: number;
  approvalRate: number;
  autoApprovalRate: number;
  averageResponseTime: number;
  topSecurities: Array<{ securityId: string; count: number }>;
  statusCounts: object;
}

interface LocateHistoryItem {
  locateId: string;
  requestTimestamp: string;
  securityId: string;
  securityName: string;
  clientId: string;
  clientName: string;
  requestedQuantity: number;
  status: string;
  responseTime: number;
}

/**
 * Main component for locate request analytics
 */
const LocateAnalytics: React.FC = React.memo(() => {
  // Initialize state for filters with default values
  const [filters, setFilters] = useState<LocateFilters>({
    startDate: formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // 30 days ago
    endDate: formatDate(new Date()), // Today
    securityId: '',
    clientId: '',
    status: '',
  });

  // Initialize state for loading status
  const [loading, setLoading] = useState(false);

  // Initialize state for error messages
  const [error, setError] = useState<string | null>(null);

  // Initialize state for locate history data
  const [locateHistory, setLocateHistory] = useState<LocateHistoryItem[]>([]);

  // Initialize state for locate statistics data
  const [statistics, setStatistics] = useState<LocateStatistics | null>(null);

  /**
   * Handles changes to filter values
   * @param filters - New filter values
   */
  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setError(null);
  };

  /**
   * Applies current filters and fetches data
   * @param filters - Filter values
   */
  const handleFilterApply = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Extract filter values
      const startDate = filters.startDate;
      const endDate = filters.endDate;
      const securityId = filters.securityId;
      const clientId = filters.clientId;
      const status = filters.status;

      // Fetch locate history data
      const historyResponse = await getLocateHistory(
        startDate,
        endDate,
        { securityId, clientId, status },
        { page: 0, size: 100, sort: ['requestTimestamp,desc'] }
      );
      setLocateHistory(historyResponse.data.content);

      // Fetch locate statistics data
      const statsResponse = await getLocateStatistics(startDate, endDate, {
        securityId,
        clientId,
      });
      setStatistics(statsResponse.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Resets filters to default values
   */
  const handleFilterReset = () => {
    setFilters({
      startDate: formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      endDate: formatDate(new Date()),
      securityId: '',
      clientId: '',
      status: '',
    });
    setError(null);
  };

  /**
   * Prepares time series data for line chart visualization
   * @param locateHistory - Locate history data
   * @returns Processed time series data
   */
  const prepareTimeSeriesData = (locateHistory: LocateHistoryItem[]) => {
    const groupedData = locateHistory.reduce((acc: any, item: LocateHistoryItem) => {
      const date = formatDate(item.requestTimestamp, 'YYYY-MM-DD');
      if (!acc[date]) {
        acc[date] = {};
      }
      if (!acc[date][item.status]) {
        acc[date][item.status] = 0;
      }
      acc[date][item.status]++;
      return acc;
    }, {});

    const timeSeriesData: any[] = [];
    for (const date in groupedData) {
      for (const status in groupedData[date]) {
        timeSeriesData.push({
          date,
          count: groupedData[date][status],
          status,
        });
      }
    }

    timeSeriesData.sort((a: any, b: any) => (parseDate(a.date) as any) - (parseDate(b.date) as any));
    return timeSeriesData;
  };

  /**
   * Prepares data for status distribution pie chart
   * @param statistics - Locate statistics data
   * @returns Processed status distribution data
   */
  const prepareStatusDistributionData = (statistics: LocateStatistics | null) => {
    if (!statistics || !statistics.statusCounts) {
      return [];
    }

    const statusData: any[] = [];
    for (const status in statistics.statusCounts) {
      statusData.push({
        status,
        count: statistics.statusCounts[status],
      });
    }
    return statusData;
  };

  /**
   * Prepares data for top securities bar chart
   * @param statistics - Locate statistics data
   * @returns Processed top securities data
   */
  const prepareTopSecuritiesData = (statistics: LocateStatistics | null) => {
    if (!statistics || !statistics.topSecurities) {
      return [];
    }

    const topSecuritiesData = statistics.topSecurities
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item) => ({
        security: item.securityId,
        count: item.count,
      }));
    return topSecuritiesData;
  };

  /**
   * Formats tooltip content for charts
   * @param data - Data point
   * @returns Formatted tooltip content
   */
  const formatTooltip = (data: any) => {
    if (data.date && data.count && data.status) {
      return `${data.date} - ${data.status}: ${data.count}`;
    }
    return `${data.security}: ${data.count}`;
  };

  // Process data for visualizations
  const timeSeriesData = useMemo(() => prepareTimeSeriesData(locateHistory), [locateHistory]);
  const statusDistributionData = useMemo(() => prepareStatusDistributionData(statistics), [statistics]);
  const topSecuritiesData = useMemo(() => prepareTopSecuritiesData(statistics)), [statistics];

  return (
    <AnalyticsContainer>
      <AnalyticsFilters
        analyticsType="locate"
        filters={filters}
        onChange={handleFilterChange}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
      />

      {loading && <Loader />}
      {error && <Alert severity="error">{error}</Alert>}

      <KPIContainer container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KPI
            label="Total Requests"
            value={statistics?.totalRequests || 0}
            icon={<AssessmentOutlined />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI
            label="Approval Rate"
            value={statistics?.approvalRate || 0}
            format="percentage"
            icon={<CheckCircleOutlineOutlined />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI
            label="Auto Approval Rate"
            value={statistics?.autoApprovalRate || 0}
            format="percentage"
            icon={<CheckCircleOutlineOutlined />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI
            label="Avg. Response Time"
            value={statistics?.averageResponseTime || 0}
            format="number"
            icon={<AccessTimeOutlined />}
          />
        </Grid>
      </KPIContainer>

      <ChartContainer title="Locate Request Trend" loading={loading} error={error} isEmpty={timeSeriesData.length === 0}>
        <LineChart
          data={timeSeriesData}
          xKey="date"
          yKey="count"
          xAxisLabel="Date"
          yAxisLabel="Count"
          tooltipFormat={formatTooltip}
        />
      </ChartContainer>

      <ChartContainer title="Locate Status Distribution" loading={loading} error={error} isEmpty={statusDistributionData.length === 0}>
        <PieChart
          data={statusDistributionData}
          nameKey="status"
          valueKey="count"
          tooltipFormat={formatTooltip}
        />
      </ChartContainer>

      <ChartContainer title="Top 10 Requested Securities" loading={loading} error={error} isEmpty={topSecuritiesData.length === 0}>
        <BarChart
          data={topSecuritiesData}
          xKey="security"
          yKey="count"
          xAxisLabel="Security"
          yAxisLabel="Request Count"
          tooltipFormat={formatTooltip}
        />
      </ChartContainer>

      <SectionTitle variant="h6">Locate Request History</SectionTitle>
      <GridContainer>
        <DataGrid
          data={locateHistory}
          columns={[
            { field: 'locateId', headerName: 'Locate ID' },
            { field: 'requestTimestamp', headerName: 'Request Time' },
            { field: 'securityId', headerName: 'Security ID' },
            { field: 'securityName', headerName: 'Security Name' },
            { field: 'clientId', headerName: 'Client ID' },
            { field: 'clientName', headerName: 'Client Name' },
            { field: 'requestedQuantity', headerName: 'Requested Quantity' },
            { field: 'status', headerName: 'Status' },
            { field: 'responseTime', headerName: 'Response Time' },
          ]}
          loading={loading}
          error={error}
        />
      </GridContainer>
    </AnalyticsContainer>
  );
});

export default LocateAnalytics;