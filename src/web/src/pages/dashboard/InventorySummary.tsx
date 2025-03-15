import React, { useState, useEffect, useMemo, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.11.0
import { Grid, Box, useTheme } from '@mui/material'; // @mui/material ^5.13
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'; // @mui/icons-material ^5.13
import MoneyOffIcon from '@mui/icons-material/MoneyOff'; // @mui/icons-material ^5.13
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceIcon'; // @mui/icons-material ^5.13
import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // @mui/icons-material ^5.13
import Card from '../../components/common/Card';
import Typography from '../../components/common/Typography';
import KPI from '../../components/data/KPI';
import PieChart from '../../components/data/PieChart';
import Loader from '../../components/common/Loader';
import { getInventorySummary, getInventoryByCategory } from '../../api/inventory';
import { formatCurrency, formatShortCurrency } from '../../utils/formatter';
import { useWebSocket } from '../../hooks/useWebSocket';

/**
 * Interface for InventorySummary component props
 */
export interface InventorySummaryProps {
  /** Business date for which to display inventory summary */
  businessDate: string;
  /** Interval in milliseconds to refresh data */
  refreshInterval?: number;
  /** Filters to apply to the inventory data */
  filters?: { market?: string; calculationType?: string };
}

/**
 * Interface for inventory summary data
 */
interface SummaryData {
  /** Total inventory value */
  totalInventory: number;
  /** Value of inventory available for loan */
  forLoan: number;
  /** Value of inventory available for pledge */
  forPledge: number;
  /** Value of hard-to-borrow inventory */
  htbValue: number;
}

/**
 * Interface for inventory category data
 */
interface CategoryData {
  /** Category name */
  category: string;
  /** Category value */
  value: number;
  /** Percentage of total inventory */
  percentage: number;
  /** 1-day change in value */
  change1D: number;
}

/**
 * Styled Card component for consistent styling
 */
const SummaryCard = styled(Card)`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

/**
 * Styled Typography component for the summary title
 */
const SummaryTitle = styled(Typography)`
  margin-bottom: ${theme => theme.spacing(2)};
  font-weight: 500;
`;

/**
 * Styled Box component for the chart container
 */
const ChartContainer = styled(Box)`
  height: 250px;
  margin-top: ${theme => theme.spacing(2)};
`;

/**
 * Styled Typography component for error messages
 */
const ErrorMessage = styled(Typography)`
  color: ${theme => theme.palette.error.main};
  margin-top: ${theme => theme.spacing(2)};
`;

/**
 * Component that displays a summary of inventory metrics and visualizations
 */
const InventorySummary: React.FC<InventorySummaryProps> = React.memo(({
  businessDate,
  refreshInterval = 60000,
  filters
}) => {
  // State variables for summary data, category data, loading, and error
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get current theme
  const theme = useTheme();

  /**
   * Fetches inventory summary data from the API
   */
  const fetchSummaryData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getInventorySummary(businessDate, filters);
      setSummaryData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory summary data.');
    } finally {
      setLoading(false);
    }
  }, [businessDate, filters]);

  /**
   * Fetches inventory data grouped by category from the API
   */
  const fetchCategoryData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getInventoryByCategory(businessDate, 'category', filters);
      setCategoryData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory category data.');
    } finally {
      setLoading(false);
    }
  }, [businessDate, filters]);

  // Fetch data on component mount and when dependencies change
  useEffect(() => {
    fetchSummaryData();
    fetchCategoryData();
  }, [fetchSummaryData, fetchCategoryData]);

  // Set up periodic data refresh
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchSummaryData();
        fetchCategoryData();
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [fetchSummaryData, fetchCategoryData, refreshInterval]);

  // Set up WebSocket subscription for real-time inventory updates
  const { sendMessage, addMessageHandler } = useWebSocket('topic/inventory');

  /**
   * Handles real-time inventory updates via WebSocket
   */
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'inventory.updated') {
      fetchSummaryData();
      fetchCategoryData();
    }
  }, [fetchSummaryData, fetchCategoryData]);

  // Add message handler for inventory updates
  useEffect(() => {
    addMessageHandler('inventory.updated', handleWebSocketMessage);

    return () => {
      // Clean up message handler on unmount
      // removeMessageHandler('inventory.updated', handleWebSocketMessage);
    };
  }, [addMessageHandler, handleWebSocketMessage]);

  /**
   * Processes category data for pie chart visualization
   */
  const processCategoryData = useCallback((categoryData: CategoryData[] | null) => {
    if (!categoryData) return [];

    return categoryData.map(item => ({
      name: item.category,
      value: item.value,
      percentage: item.percentage,
      change: item.change1D
    }));
  }, []);

  // Process category data for pie chart
  const pieChartData = useMemo(() => processCategoryData(categoryData), [categoryData, processCategoryData]);

  return (
    <SummaryCard>
      <SummaryTitle variant="h6">
        Inventory Summary
      </SummaryTitle>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KPI
            label="Total Inventory"
            value={summaryData?.totalInventory || 0}
            format="shortCurrency"
            currencyCode="USD"
            icon={<AttachMoneyIcon color="primary" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI
            label="For Loan"
            value={summaryData?.forLoan || 0}
            format="shortCurrency"
            currencyCode="USD"
            icon={<TrendingUpIcon color="success" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI
            label="For Pledge"
            value={summaryData?.forPledge || 0}
            format="shortCurrency"
            currencyCode="USD"
            icon={<AccountBalanceIcon color="secondary" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPI
            label="HTB Value"
            value={summaryData?.htbValue || 0}
            format="shortCurrency"
            currencyCode="USD"
            icon={<MoneyOffIcon color="error" />}
          />
        </Grid>
        <Grid item xs={12}>
          <ChartContainer title="Inventory by Category" height={300}>
            {loading ? (
              <Loader />
            ) : error ? (
              <ErrorMessage>{error}</ErrorMessage>
            ) : (
              <PieChart
                data={pieChartData}
                nameKey="name"
                valueKey="value"
                title="Inventory by Category"
              />
            )}
          </ChartContainer>
        </Grid>
      </Grid>
    </SummaryCard>
  );
});

InventorySummary.displayName = 'InventorySummary';

export default InventorySummary;