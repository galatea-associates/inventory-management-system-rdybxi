import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // react-redux ^8.0.5
import { useNavigate } from 'react-router-dom'; // react-router-dom ^6.8.1
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Grid, Box, Typography, Button, Tabs, Tab } from '@mui/material'; // @mui/material ^5.13

import Page from '../../components/layout/Page';
import DataGrid from '../../components/data/DataGrid';
import { GridColumn } from '../../components/data/GridColumn';
import InventoryFilters from './InventoryFilters';
import CategoryChart from './CategoryChart';
import CategoryTable from './CategoryTable';
import TopSecurities from './TopSecurities';
import { 
  fetchInventory, 
  fetchFilteredInventory,
  fetchInventorySummary,
  fetchTopSecurities,
  setInventoryFilters 
} from '../../state/inventory/inventorySlice';
import { 
  selectInventories, 
  selectInventoryLoading, 
  selectInventoryError, 
  selectInventoryFilters,
  selectInventorySummary 
} from '../../state/inventory/inventorySelectors';
import DateUtil from '../../utils/date';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatter';
import { InventoryFilters as InventoryFiltersType } from '../../types/state';
import { Inventory } from '../../types/models';

// Styled components for layout and styling
const DashboardContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const FilterContainer = styled(Box)`
  margin-bottom: 16px;
  padding: 16px;
  backgroundColor: background.paper;
  borderRadius: 4px;
  boxShadow: 1;
`;

const TabContainer = styled(Box)`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backgroundColor: background.paper;
  borderRadius: 4px;
  boxShadow: 1;
`;

const TabContent = styled(Box)`
  flex: 1;
  padding: 16px;
  overflow: auto;
`;

const ChartContainer = styled(Box)`
  height: 300px;
  marginBottom: 16px;
  backgroundColor: background.paper;
  borderRadius: 4px;
  boxShadow: 1;
`;

const GridContainer = styled(Box)`
  height: calc(100% - 48px);
  width: 100%;
`;

/**
 * Main component for the Inventory Dashboard page
 */
const Inventory = React.memo(() => {
  // LD1: Initialize dispatch function using useDispatch
  const dispatch = useDispatch();

  // LD1: Initialize navigate function using useNavigate
  const navigate = useNavigate();

  // LD1: Set up state for active tab using useState
  const [activeTab, setActiveTab] = useState(0);

  // LD1: Set up state for business date using useState with current business date as default
  const [businessDate, setBusinessDate] = useState(DateUtil.getCurrentDateString());

  // LD1: Set up state for selected category using useState
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // LD1: Set up state for selected security using useState
  const [selectedSecurity, setSelectedSecurity] = useState<string | null>(null);

  // LD1: Use Redux selectors to get inventory data, loading state, error state, filters, and summary
  const inventories = useSelector(selectInventories);
  const inventoryLoading = useSelector(selectInventoryLoading);
  const inventoryError = useSelector(selectInventoryError);
  const inventoryFilters = useSelector(selectInventoryFilters);
  const inventorySummary = useSelector(selectInventorySummary);

  // LD1: Create memoized column definitions for inventory data grid
  const columnDefinitions = useMemo(() => getColumnDefinitions(), []);

  // LD1: Create memoized filter change handler
  const handleFilterChange = useCallback((filters: InventoryFiltersType) => {
    // IE1: Dispatch setInventoryFilters action with the new filters
    dispatch(setInventoryFilters(filters));
    // IE1: Reset selected category and security when filters change
    setSelectedCategory(null);
    setSelectedSecurity(null);
  }, [dispatch]);

  // LD1: Create memoized row click handler
  const handleRowClick = useCallback((inventory: Inventory) => {
    // IE1: Navigate to inventory detail page with the selected inventory ID
    navigate(`/inventory/${inventory.security.internalId}`);
  }, [navigate]);

  // LD1: Create memoized category select handler
  const handleCategorySelect = useCallback((category: string) => {
    // IE1: Update selected category state
    setSelectedCategory(category);
    // IE1: Update filters to include the selected category
    dispatch(setInventoryFilters({ market: category }));
    // IE1: Reset selected security
    setSelectedSecurity(null);
  }, [dispatch]);

  // LD1: Create memoized security select handler
  const handleSecuritySelect = useCallback((securityId: string) => {
    // IE1: Update selected security state
    setSelectedSecurity(securityId);
    // IE1: Update filters to include the selected security
    dispatch(setInventoryFilters({ securityId: securityId }));
    // IE1: Reset selected category
    setSelectedCategory(null);
  }, [dispatch]);

  // LD1: Create memoized refresh handler
  const handleRefresh = useCallback(() => {
    // IE1: Fetch fresh inventory data based on current filters and business date
    dispatch(fetchFilteredInventory({ filters: inventoryFilters, pagination: { page: 0, pageSize: 20, sort: ['marketValue,desc'] } }));
    // IE1: Fetch fresh inventory summary data
    dispatch(fetchInventorySummary({ businessDate: businessDate, filters: inventoryFilters }));
  }, [dispatch, inventoryFilters, businessDate]);

  // LD1: Create memoized tab change handler
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    // IE1: Update active tab state with the new value
    setActiveTab(newValue);
  }, []);

  // LD1: Fetch inventory data on component mount and when filters or business date change
  useEffect(() => {
    dispatch(fetchFilteredInventory({ filters: inventoryFilters, pagination: { page: 0, pageSize: 20, sort: ['marketValue,desc'] } }));
  }, [dispatch, inventoryFilters]);

  // LD1: Fetch inventory summary on component mount and when filters or business date change
  useEffect(() => {
    dispatch(fetchInventorySummary({ businessDate: businessDate, filters: inventoryFilters }));
  }, [dispatch, businessDate, inventoryFilters]);

  const renderDashboardTab = useCallback(() => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <CategoryChart
          businessDate={businessDate}
          title="Inventory by Category"
          groupBy="market"
          onCategorySelect={handleCategorySelect}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <CategoryTable
          businessDate={businessDate}
          title="Category Breakdown"
          groupBy="market"
          onCategorySelect={handleCategorySelect}
        />
      </Grid>
      <Grid item xs={12}>
        <TopSecurities
          businessDate={businessDate}
          calculationType="FOR_LOAN"
          limit={5}
          onSecurityClick={handleSecuritySelect}
        />
      </Grid>
    </Grid>
  ), [businessDate, handleCategorySelect, handleSecuritySelect]);

  const renderInventoryTab = useCallback(() => (
    <GridContainer>
      <DataGrid
        data={inventories}
        columns={columnDefinitions}
        loading={inventoryLoading}
        error={inventoryError}
        onRowClick={handleRowClick}
      />
    </GridContainer>
  ), [inventories, inventoryLoading, inventoryError, columnDefinitions, handleRowClick]);

  // LD1: Render Page component with appropriate title and actions
  return (
    <Page title="Inventory Dashboard">
      <InventoryFilters onFilterChange={handleFilterChange} />
      <TabContainer>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="inventory dashboard tabs">
          <Tab label="Dashboard" />
          <Tab label="Inventory" />
        </Tabs>
        <TabContent>
          {activeTab === 0 && renderDashboardTab()}
          {activeTab === 1 && renderInventoryTab()}
        </TabContent>
      </TabContainer>
    </Page>
  );
});

Inventory.displayName = 'Inventory';

export default Inventory;

/**
 * Creates column definitions for the inventory data grid
 */
const getColumnDefinitions = (): GridColumn[] => {
  // LD1: Define security column with custom renderer for security information
  const securityColumn: GridColumn = {
    field: 'security.description',
    headerName: 'Security',
  };

  // LD1: Define calculation type column with text renderer
  const calculationTypeColumn: GridColumn = {
    field: 'calculationType',
    headerName: 'Calculation Type',
  };

  // LD1: Define available quantity column with number formatter
  const availableQuantityColumn: GridColumn = {
    field: 'availableQuantity',
    headerName: 'Available Quantity',
    valueFormatter: (params) => formatNumber(params.value, 0),
  };

  // LD1: Define market value column with currency formatter
  const marketValueColumn: GridColumn = {
    field: 'marketValue',
    headerName: 'Market Value',
    valueFormatter: (params) => formatCurrency(params.value),
  };

  // LD1: Define market column with text renderer
  const marketColumn: GridColumn = {
    field: 'market',
    headerName: 'Market',
  };

  // LD1: Define business date column with date formatter
  const businessDateColumn: GridColumn = {
    field: 'businessDate',
    headerName: 'Business Date',
  };

  // LD1: Define security temperature column with custom renderer for HTB/GC status
  const securityTemperatureColumn: GridColumn = {
    field: 'securityTemperature',
    headerName: 'Security Temperature',
  };

  // LD1: Define status column with custom renderer for status indicators
  const statusColumn: GridColumn = {
    field: 'status',
    headerName: 'Status',
  };

  // LD1: Return array of column definitions
  return [
    securityColumn,
    calculationTypeColumn,
    availableQuantityColumn,
    marketValueColumn,
    marketColumn,
    businessDateColumn,
    securityTemperatureColumn,
    statusColumn,
  ];
};