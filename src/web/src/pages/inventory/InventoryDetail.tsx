import React, { useState, useEffect, useMemo, useCallback } from 'react'; // react ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // react-redux ^8.0.5
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom ^6.10.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Grid, Box, Typography, Tabs, Tab } from '@mui/material'; // Material-UI components version 5.13

import Page from '../../components/layout/Page'; // Container component for consistent page layout
import DetailPanel from '../../components/data/DetailPanel'; // Component for displaying detailed information about the selected inventory
import SecurityInfo from '../../components/data/SecurityInfo'; // Component for displaying security information
import Button from '../../components/common/Button'; // Button component for actions
import LineChart from '../../components/data/LineChart'; // Component for displaying historical inventory data as a line chart
import DataGrid from '../../components/data/DataGrid'; // Component for displaying related inventory data in a grid
import { GridColumn } from '../../components/data/GridColumn'; // Type definition for grid column configuration
import ExportButton from '../../components/data/ExportButton'; // Button component for exporting data
import {
  selectSelectedInventory,
  selectInventoryLoading,
  selectInventoryError,
  selectInventoriesBySecurityId,
} from '../../state/inventory/inventorySelectors'; // Redux selectors for inventory state
import {
  fetchInventoryBySecurity,
  getInventoryBySecurityId,
} from '../../api/inventory'; // API functions for fetching inventory data
import { Inventory } from '../../types/models'; // Type definition for inventory data
import DateUtil from '../../utils/date'; // Utility for date formatting
import { formatCurrency, formatNumber } from '../../utils/formatter'; // Utility functions for formatting currency and number values

// Styled container for the detail page layout
const DetailContainer = styled(Box)`
  margin: 16px;
  padding: 16px;
  width: 100%;
  @media (min-width: 600px) {
    margin: 24px;
    padding: 24px;
  }
`;

// Styled container for the tabbed interface
const TabContainer = styled(Box)`
  margin: 16px;
  padding: 16px;
  width: 100%;
  background-color: #f5f5f5;
  border-radius: 8px;
  @media (min-width: 600px) {
    margin: 24px;
    padding: 24px;
  }
`;

// Styled container for tab content
const TabContent = styled(Box)`
  padding: 16px;
  min-height: 200px;
  background-color: #fff;
  @media (min-width: 600px) {
    padding: 24px;
  }
`;

// Styled container for detail sections
const SectionContainer = styled(Box)`
  margin: 16px;
  padding: 16px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  @media (min-width: 600px) {
    margin: 24px;
    padding: 24px;
  }
`;

// Styled container for chart components
const ChartContainer = styled(Box)`
  margin: 16px;
  padding: 16px;
  height: 300px;
  background-color: #fff;
  border-radius: 8px;
  @media (min-width: 600px) {
    margin: 24px;
    padding: 24px;
  }
`;

// Styled container for the data grid
const GridContainer = styled(Box)`
  margin: 16px;
  padding: 16px;
  min-height: 300px;
  background-color: #fff;
  border-radius: 8px;
  @media (min-width: 600px) {
    margin: 24px;
    padding: 24px;
  }
`;

// Styled container for action buttons
const ActionContainer = styled(Box)`
  margin: 16px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  @media (min-width: 600px) {
    margin: 24px;
    padding: 24px;
  }
`;

/**
 * Main component for the Inventory Detail page
 */
const InventoryDetail: React.FC = React.memo(() => {
  // LD1: Initialize dispatch function using useDispatch
  const dispatch = useDispatch();
  // LD1: Initialize navigate function using useNavigate
  const navigate = useNavigate();
  // LD1: Extract inventoryId from route parameters using useParams
  const { securityId } = useParams();
  // LD1: Use Redux selectors to get selected inventory, loading state, and error state
  const selectedInventory = useSelector(selectSelectedInventory);
  const inventoryLoading = useSelector(selectInventoryLoading);
  const inventoryError = useSelector(selectInventoryError);
  // LD1: Initialize state for active tab using useState
  const [activeTab, setActiveTab] = useState(0);
  // LD1: Initialize state for historical data using useState
  const [historicalData, setHistoricalData] = useState<Array<{ date: string; value: number }>>([]);
  // LD1: Create memoized column definitions for related inventories data grid
  const relatedInventoriesColumns = useMemo<GridColumn[]>(() => {
    return [
      { field: 'calculationType', headerName: 'Calculation Type' },
      { field: 'availableQuantity', headerName: 'Available Quantity', type: 'number' },
      { field: 'marketValue', headerName: 'Market Value', type: 'currency' },
      { field: 'market', headerName: 'Market' },
      { field: 'businessDate', headerName: 'Business Date', type: 'date' },
      { field: 'securityTemperature', headerName: 'Security Temperature' },
      { field: 'status', headerName: 'Status' },
    ];
  }, []);

  // LD1: Use Redux selector to get related inventories for the same security
  const relatedInventories = useSelector(selectInventoriesBySecurityId(securityId || ''));

  // LD1: Fetch inventory data on component mount if inventoryId is provided
  useEffect(() => {
    if (securityId) {
      dispatch(getInventoryBySecurityId(securityId, DateUtil.getCurrentDateString(), 'FOR_LOAN' as string));
    }
  }, [dispatch, securityId]);

  // LD1: Fetch related inventories for the same security
  useEffect(() => {
    if (securityId) {
      dispatch(fetchInventoryBySecurity(securityId, DateUtil.getCurrentDateString(), { page: 0, size: 10, sort: ['availableQuantity,desc'] }));
    }
  }, [dispatch, securityId]);

  // LD1: Fetch historical inventory data for trend analysis
  useEffect(() => {
    if (securityId) {
      // TODO: Implement fetchHistoricalData API call
      // For now, use mock data
      const mockData = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-02-01', value: 120 },
        { date: '2023-03-01', value: 150 },
        { date: '2023-04-01', value: 130 },
        { date: '2023-05-01', value: 160 },
      ];
      setHistoricalData(mockData);
    }
  }, [securityId]);

  // LD1: Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // LD1: Handle back button click to navigate to inventory list
  const handleBackClick = () => {
    navigate('/inventory');
  };

  // LD1: Handle export action to export inventory details
  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export clicked');
  };

  // LD1: Render Page component with appropriate title and back button
  return (
    <Page title="Inventory Detail" actions={<Button variant="outlined" onClick={handleBackClick}>Back</Button>}>
      {/* LD1: Render loading state if data is being fetched */}
      {inventoryLoading && <Typography>Loading...</Typography>}
      {/* LD1: Render error state if there was an error fetching data */}
      {inventoryError && <Typography color="error">{inventoryError}</Typography>}
      {/* LD1: Render inventory details using DetailPanel component */}
      {selectedInventory && (
        <DetailContainer>
          <DetailPanel data={selectedInventory} type="inventory" onClose={() => { }} />
          {/* LD1: Render tabs for different views (Overview, Historical, Related) */}
          <TabContainer>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="inventory detail tabs">
              <Tab label="Overview" />
              <Tab label="Historical" />
              <Tab label="Related" />
            </Tabs>
            {/* LD1: Render tab content based on active tab */}
            {activeTab === 0 && (
              <TabContent>
                {/* LD1: Render security information in Overview tab */}
                <SectionContainer>
                  <Typography variant="h6">Security Information</Typography>
                  <SecurityInfo security={selectedInventory.security} />
                </SectionContainer>
                {/* LD1: Render calculation details in Overview tab */}
                <SectionContainer>
                  <Typography variant="h6">Calculation Details</Typography>
                  <Typography>Calculation Type: {selectedInventory.calculationType}</Typography>
                  <Typography>Available Quantity: {selectedInventory.availableQuantity}</Typography>
                  <Typography>Market Value: {selectedInventory.marketValue}</Typography>
                </SectionContainer>
              </TabContent>
            )}
            {activeTab === 1 && (
              <TabContent>
                {/* LD1: Render historical data chart in Historical tab */}
                <ChartContainer title="Historical Inventory Data">
                  <LineChart data={historicalData} xKey="date" yKey="value" />
                </ChartContainer>
              </TabContent>
            )}
            {activeTab === 2 && (
              <TabContent>
                {/* LD1: Render related inventories grid in Related tab */}
                <GridContainer>
                  <DataGrid data={relatedInventories} columns={relatedInventoriesColumns} loading={inventoryLoading} error={inventoryError} />
                </GridContainer>
              </TabContent>
            )}
          </TabContainer>
        </DetailContainer>
      )}
    </Page>
  );
});

InventoryDetail.displayName = 'InventoryDetail';

export default InventoryDetail;