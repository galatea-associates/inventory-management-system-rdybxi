import React, { useState, useEffect, useMemo } from 'react'; // React, { useState, useEffect, useMemo } ^18.2.0
import styled from '@emotion/styled'; // styled ^11.11.0
import { Grid, Box, Typography, Divider, useTheme } from '@mui/material'; // { Grid, Box, Typography, Divider, useTheme } 5.13
import { RefreshOutlined } from '@mui/icons-material'; // { RefreshOutlined } 5.13
import Page from '../../components/layout/Page';
import Container from '../../components/layout/Container';
import SystemStatus from './SystemStatus';
import InventorySummary from './InventorySummary';
import LocateRequests from './LocateRequests';
import RecentActivity from './RecentActivity';
import Alerts from './Alerts';
import useBreakpoint from '../../hooks/useBreakpoint';
import { formatDate } from '../../utils/date';

// LD1: Define interface for the GridLayout configuration
interface GridLayout {
  systemStatus: { xs: number; sm: number; md: number; lg: number };
  inventorySummary: { xs: number; sm: number; md: number; lg: number };
  locateRequests: { xs: number; sm: number; md: number; lg: number };
  alerts: { xs: number; sm: number; md: number; lg: number };
  recentActivity: { xs: number; sm: number; md: number; lg: number };
}

// LD1: Styled component for the main dashboard container
const DashboardContainer = styled(Box)`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

// LD1: Styled component for the dashboard header
const DashboardHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme => theme.spacing(3)};
`;

// LD1: Styled component for the refresh button
const RefreshButton = styled(Box)`
  display: flex;
  align-items: center;
  cursor: pointer;
  color: ${theme => theme.palette.primary.main};
  &:hover {
    opacity: 0.8;
  }
`;

// LD1: Styled component for the last updated text
const LastUpdatedText = styled(Typography)`
  color: ${theme => theme.palette.text.secondary};
  font-size: 0.75rem;
  margin-right: ${theme => theme.spacing(1)};
`;

// LD1: Styled component for the grid item
const GridItem = styled(Grid)`
  height: 100%;
`;

// LD1: Main dashboard component that displays system overview and key metrics
const Dashboard: React.FC = React.memo(() => {
  // LD1: Set up state for current business date (defaulting to today)
  const [businessDate, setBusinessDate] = useState<Date>(new Date());

  // LD1: Set up state for refresh interval (defaulting to 60 seconds)
  const [refreshInterval, setRefreshInterval] = useState<number>(60000);

  // LD1: Get current breakpoint using useBreakpoint hook for responsive layout
  const breakpoint = useBreakpoint();

  // LD1: Create a function to handle manual refresh of dashboard data
  const handleRefresh = () => {
    // LD1: Create a new Date object to trigger refresh in child components
    const newDate = new Date();
    // LD1: Update the refresh timestamp state
    setBusinessDate(newDate);
  };

  // LD1: Create a function to handle business date change
  const handleDateChange = (newDate: Date) => {
    // LD1: Update the business date state with the new date
    setBusinessDate(newDate);
    // LD1: Trigger refresh to load data for the new date
  };

  // LD1: Determine grid layout based on current breakpoint
  const getGridLayout = (breakpoint: string): GridLayout => {
    switch (breakpoint) {
      // LD1: For 'xs' (mobile): return single column layout
      case 'xs':
        return {
          systemStatus: { xs: 12, sm: 12, md: 12, lg: 12 },
          inventorySummary: { xs: 12, sm: 12, md: 12, lg: 12 },
          locateRequests: { xs: 12, sm: 12, md: 12, lg: 12 },
          alerts: { xs: 12, sm: 12, md: 12, lg: 12 },
          recentActivity: { xs: 12, sm: 12, md: 12, lg: 12 },
        };
      // LD1: For 'sm' (tablet): return two column layout
      case 'sm':
        return {
          systemStatus: { xs: 12, sm: 6, md: 6, lg: 6 },
          inventorySummary: { xs: 12, sm: 6, md: 6, lg: 6 },
          locateRequests: { xs: 12, sm: 6, md: 6, lg: 6 },
          alerts: { xs: 12, sm: 6, md: 6, lg: 6 },
          recentActivity: { xs: 12, sm: 12, md: 12, lg: 12 },
        };
      // LD1: For 'md' and larger (desktop): return three column layout
      case 'md':
      case 'lg':
      case 'xl':
      default:
        return {
          systemStatus: { xs: 12, sm: 6, md: 4, lg: 4 },
          inventorySummary: { xs: 12, sm: 6, md: 4, lg: 4 },
          locateRequests: { xs: 12, sm: 6, md: 4, lg: 4 },
          alerts: { xs: 12, sm: 6, md: 6, lg: 6 },
          recentActivity: { xs: 12, sm: 12, md: 6, lg: 6 },
        };
    }
  };

  // LD1: Include specific grid sizes for each dashboard component based on importance and content size
  const gridLayout = useMemo(() => getGridLayout(breakpoint.breakpoint), [breakpoint.breakpoint]);

  // LD1: Return Page component with appropriate title and actions
  return (
    <Page title="Dashboard">
      <DashboardContainer>
        <DashboardHeader>
          <Typography variant="h4">Dashboard</Typography>
          <RefreshButton onClick={handleRefresh}>
            <LastUpdatedText>Last Updated: {formatDate(businessDate, 'HH:mm:ss')}</LastUpdatedText>
            <RefreshOutlined />
          </RefreshButton>
        </DashboardHeader>
        {/* LD1: Render Container component with dashboard content */}
        <Container>
          {/* LD1: Render Grid container with responsive spacing */}
          <Grid container spacing={3}>
            {/* LD1: Render SystemStatus component in a grid item */}
            <GridItem item xs={gridLayout.systemStatus.xs} sm={gridLayout.systemStatus.sm} md={gridLayout.systemStatus.md} lg={gridLayout.systemStatus.lg}>
              <SystemStatus />
            </GridItem>
            {/* LD1: Render InventorySummary component in a grid item */}
            <GridItem item xs={gridLayout.inventorySummary.xs} sm={gridLayout.inventorySummary.sm} md={gridLayout.inventorySummary.md} lg={gridLayout.inventorySummary.lg}>
              <InventorySummary businessDate={formatDate(businessDate, 'YYYY-MM-DD')} refreshInterval={refreshInterval} />
            </GridItem>
            {/* LD1: Render LocateRequests component in a grid item */}
            <GridItem item xs={gridLayout.locateRequests.xs} sm={gridLayout.locateRequests.sm} md={gridLayout.locateRequests.md} lg={gridLayout.locateRequests.lg}>
              <LocateRequests businessDate={formatDate(businessDate, 'YYYY-MM-DD')} refreshInterval={refreshInterval} />
            </GridItem>
            {/* LD1: Render Alerts component in a grid item */}
            <GridItem item xs={gridLayout.alerts.xs} sm={gridLayout.alerts.sm} md={gridLayout.alerts.md} lg={gridLayout.alerts.lg}>
              <Alerts />
            </GridItem>
            {/* LD1: Render RecentActivity component in a grid item */}
            <GridItem item xs={gridLayout.recentActivity.xs} sm={gridLayout.recentActivity.sm} md={gridLayout.recentActivity.md} lg={gridLayout.recentActivity.lg}>
              <RecentActivity />
            </GridItem>
          </Grid>
        </Container>
      </DashboardContainer>
    </Page>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;