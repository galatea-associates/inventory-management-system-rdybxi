import React, { useState, useEffect, useMemo, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Grid, Paper, Typography, Divider, useTheme } from '@mui/material'; // @mui/material ^5.13
import AnalyticsFilters from './AnalyticsFilters';
import LineChart from '../../components/data/LineChart';
import BarChart from '../../components/data/BarChart';
import PieChart from '../../components/data/PieChart';
import ChartContainer from '../../components/data/ChartContainer';
import KPI from '../../components/data/KPI';
import { getInventorySummary, getInventoryByCategory, getTopSecurities, getCalculationTypes } from '../../api/inventory';
import { getMarkets } from '../../api/reference';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatter';
import { getCurrentBusinessDate, formatDate, subtractDays, addDays } from '../../utils/date';
import useDebounce from '../../hooks/useDebounce';

/**
 * Interface for inventory analytics filter state
 */
interface InventoryFilters {
  businessDate: string;
  calculationType: string;
  market: string;
  securityType: string;
  securityId: string;
  counterpartyId: string;
  aggregationUnitId: string;
  dateRange: any;
  groupBy: string;
}

/**
 * Interface for inventory summary data
 */
interface InventorySummary {
  totalInventory: number;
  forLoan: number;
  forPledge: number;
  htbValue: number;
}

/**
 * Interface for inventory category data
 */
interface CategoryData {
  category: string;
  value: number;
  percentage: number;
  change1D: number;
  change1W: number;
}

/**
 * Interface for inventory trend data point
 */
interface TrendData {
  date: string;
  totalInventory: number;
  forLoan: number;
  forPledge: number;
  htbValue: number;
}

/**
 * Interface for top security data
 */
interface TopSecurity {
  security: {
    id: string;
    internalId: string;
    description: string;
  };
  availableQuantity: number;
  marketValue: number;
}

/**
 * Styled container for the analytics page
 */
const AnalyticsContainer = styled(Box)`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: theme.spacing(3);
`;

/**
 * Styled container for each analytics section
 */
const SectionContainer = styled(Paper)`
  padding: theme.spacing(2);
  borderRadius: theme.shape.borderRadius;
  boxShadow: theme.shadows[1];
`;

/**
 * Styled component for section titles
 */
const SectionTitle = styled(Typography)`
  font-weight: 500;
  marginBottom: theme.spacing(2);
`;

/**
 * Styled grid container for charts
 */
const ChartGrid = styled(Grid)`
  container: true;
  spacing: 3;
`;

/**
 * Main component for inventory analytics visualization
 */
const InventoryAnalytics: React.FC = () => {
  // LD1: Initialize state for filters with default values
  const [filters, setFilters] = useState<InventoryFilters>({
    businessDate: getCurrentBusinessDate(),
    calculationType: '',
    market: '',
    securityType: '',
    securityId: '',
    counterpartyId: '',
    aggregationUnitId: '',
    dateRange: {
      startDate: subtractDays(getCurrentBusinessDate(), 30),
      endDate: getCurrentBusinessDate(),
    },
    groupBy: '',
  });

  // LD1: Initialize state for loading status of different data sections
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingTopSecurities, setLoadingTopSecurities] = useState(false);

  // LD1: Initialize state for error handling
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<string | null>(null);
  const [errorTrends, setErrorTrends] = useState<string | null>(null);
  const [errorTopSecurities, setErrorTopSecurities] = useState<string | null>(null);

  // LD1: Initialize state for inventory data (summary, categories, trends, top securities)
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [inventoryByCategory, setInventoryByCategory] = useState<CategoryData[]>([]);
  const [inventoryTrends, setInventoryTrends] = useState<TrendData[]>([]);
  const [topSecurities, setTopSecurities] = useState<TopSecurity[]>([]);

  // LD1: Initialize state for available calculation types and markets
  const [calculationTypes, setCalculationTypes] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);

  // LD1: Fetch calculation types and markets on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const calculationTypesResponse = await getCalculationTypes();
        setCalculationTypes(calculationTypesResponse.data);

        const marketsResponse = await getMarkets();
        setMarkets(marketsResponse.data);
      } catch (error: any) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchData();
  }, []);

  // LD1: Create debounced filter handler to prevent excessive API calls
  const debouncedFetch = useDebounce(() => {
    fetchAllData(filters);
  }, 500);

  // LD1: Fetch inventory summary data based on current filters
  const fetchInventorySummary = useCallback(async (filters: InventoryFilters) => {
    setLoadingSummary(true);
    setErrorSummary(null);
    try {
      const response = await getInventorySummary(filters.businessDate, {
        calculationType: filters.calculationType,
        market: filters.market,
      });
      setInventorySummary(response.data);
    } catch (error: any) {
      setErrorSummary(error.message);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // LD1: Fetch inventory by category data based on current filters
  const fetchInventoryByCategory = useCallback(async (filters: InventoryFilters) => {
    setLoadingCategory(true);
    setErrorCategory(null);
    try {
      const response = await getInventoryByCategory(filters.businessDate, filters.groupBy, {
        calculationType: filters.calculationType,
        market: filters.market,
      });
      setInventoryByCategory(response.data);
    } catch (error: any) {
      setErrorCategory(error.message);
    } finally {
      setLoadingCategory(false);
    }
  }, []);

  // LD1: Fetch inventory trend data based on current filters
  const fetchInventoryTrends = useCallback(async (filters: InventoryFilters) => {
    setLoadingTrends(true);
    setErrorTrends(null);
    try {
      const startDate = filters.dateRange.startDate;
      const endDate = filters.dateRange.endDate;

      if (!startDate || !endDate) {
        console.warn('Invalid date range');
        return;
      }

      const currentDate = new Date(startDate);
      const trendData: TrendData[] = [];

      while (currentDate <= endDate) {
        const dateString = formatDate(currentDate);
        try {
          const response = await getInventorySummary(dateString, {
            calculationType: filters.calculationType,
            market: filters.market,
          });
          trendData.push({
            date: dateString,
            totalInventory: response.data.totalInventory,
            forLoan: response.data.forLoan,
            forPledge: response.data.forPledge,
            htbValue: response.data.htbValue,
          });
        } catch (error: any) {
          console.error(`Error fetching trend data for ${dateString}:`, error);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      setInventoryTrends(trendData);
    } catch (error: any) {
      setErrorTrends(error.message);
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  // LD1: Fetch top securities data based on current filters
  const fetchTopSecurities = useCallback(async (filters: InventoryFilters) => {
    setLoadingTopSecurities(true);
    setErrorTopSecurities(null);
    try {
      const response = await getTopSecurities(filters.businessDate, filters.calculationType, 10, {
        market: filters.market,
      });
      setTopSecurities(response.data);
    } catch (error: any) {
      setErrorTopSecurities(error.message);
    } finally {
      setLoadingTopSecurities(false);
    }
  }, []);

  // LD1: Handle filter changes from the AnalyticsFilters component
  const handleFilterChange = useCallback((newFilters: InventoryFilters) => {
    setFilters(newFilters);
    debouncedFetch();
  }, [debouncedFetch]);

  // LD1: Handle filter apply action
  const handleFilterApply = useCallback((appliedFilters: InventoryFilters) => {
    setFilters(appliedFilters);
    fetchAllData(appliedFilters);
  }, []);

  // LD1: Fetch all data with new filters immediately (without debounce)
  const fetchAllData = useCallback(async (currentFilters: InventoryFilters) => {
    await Promise.all([
      fetchInventorySummary(currentFilters),
      fetchInventoryByCategory(currentFilters),
      fetchInventoryTrends(currentFilters),
      fetchTopSecurities(currentFilters),
    ]);
  }, [fetchInventorySummary, fetchInventoryByCategory, fetchInventoryTrends, fetchTopSecurities]);

  // LD1: Format tooltip content for charts
  const formatTooltip = useCallback((dataPoint: any, chartType: string) => {
    switch (chartType) {
      case 'category':
        return `${dataPoint.category}: ${formatCurrency(dataPoint.value)} (${formatPercentage(dataPoint.percentage, 1)})`;
      case 'trend':
        return `${formatDate(dataPoint.date)}: ${formatCurrency(dataPoint.totalInventory)}`;
      case 'topSecurities':
        return `${dataPoint.security.description}: ${formatNumber(dataPoint.availableQuantity, 0)}`;
      default:
        return '';
    }
  }, []);

  // LD1: Apply appropriate layout and styling for responsive design
  const theme = useTheme();

  return (
    <AnalyticsContainer>
      <AnalyticsFilters
        analyticsType="inventory"
        filters={filters}
        onChange={handleFilterChange}
        onApply={handleFilterApply}
      />

      <SectionContainer>
        <SectionTitle variant="h6">Inventory Summary</SectionTitle>
        <ChartGrid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <KPI
              label="Total Inventory"
              value={inventorySummary?.totalInventory || 0}
              format="shortCurrency"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPI
              label="For Loan"
              value={inventorySummary?.forLoan || 0}
              format="shortCurrency"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPI
              label="For Pledge"
              value={inventorySummary?.forPledge || 0}
              format="shortCurrency"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KPI
              label="HTB Value"
              value={inventorySummary?.htbValue || 0}
              format="shortCurrency"
            />
          </Grid>
        </ChartGrid>
      </SectionContainer>

      <SectionContainer>
        <SectionTitle variant="h6">Inventory by Category</SectionTitle>
        <PieChart
          data={inventoryByCategory}
          nameKey="category"
          valueKey="value"
          title="Inventory by Category"
          loading={loadingCategory}
          error={errorCategory}
          tooltipFormat={(d) => formatTooltip(d, 'category')}
        />
      </SectionContainer>

      <SectionContainer>
        <SectionTitle variant="h6">Inventory Trends</SectionTitle>
        <LineChart
          data={inventoryTrends}
          xKey="date"
          yKey="totalInventory"
          title="Inventory Trends"
          loading={loadingTrends}
          error={errorTrends}
          xAxisLabel="Date"
          yAxisLabel="Total Inventory"
          tooltipFormat={(d) => formatTooltip(d, 'trend')}
        />
      </SectionContainer>

      <SectionContainer>
        <SectionTitle variant="h6">Top Securities by Availability</SectionTitle>
        <BarChart
          data={topSecurities}
          xKey="security.description"
          yKey="availableQuantity"
          title="Top Securities by Availability"
          loading={loadingTopSecurities}
          error={errorTopSecurities}
          xAxisLabel="Security"
          yAxisLabel="Available Quantity"
          tooltipFormat={(d) => formatTooltip(d, 'topSecurities')}
        />
      </SectionContainer>
    </AnalyticsContainer>
  );
};

export default InventoryAnalytics;