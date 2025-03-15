import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box } from '@mui/material'; // @mui/material ^5.13
import Page from '../../components/layout/Page'; // src/web/src/components/layout/Page.tsx
import Tabs from '../../components/common/Tabs'; // src/web/src/components/common/Tabs.tsx
import Tab from '../../components/common/Tab'; // src/web/src/components/common/Tab.tsx
import InventoryAnalytics from './InventoryAnalytics'; // src/web/src/pages/analytics/InventoryAnalytics.tsx
import PositionAnalytics from './PositionAnalytics'; // src/web/src/pages/analytics/PositionAnalytics.tsx
import LocateAnalytics from './LocateAnalytics'; // src/web/src/pages/analytics/LocateAnalytics.tsx
import ExceptionAnalytics from './ExceptionAnalytics'; // src/web/src/pages/analytics/ExceptionAnalytics.tsx
import useLocalStorage from '../../hooks/useLocalStorage'; // src/web/src/hooks/useLocalStorage.ts

// LD1: Define the AnalyticsTabType interface for analytics tab values
interface AnalyticsTabType {
  string: 'inventory' | 'position' | 'locate' | 'exception';
}

// LD1: Styled container for the analytics content
const AnalyticsContainer = styled(Box)`
  width: 100%;
  height: 100%;
  display: flex;
  flexDirection: column;
`;

// LD1: Styled container for the tabs navigation
const TabsContainer = styled(Box)`
  marginBottom: theme.spacing(3);
  borderBottom: 1px solid;
  borderColor: theme.palette.divider;
`;

// LD1: Styled container for the analytics content
const ContentContainer = styled(Box)`
  flex: 1;
  overflow: auto;
  padding: theme.spacing(1);
`;

/**
 * Main component for the Analytics page
 */
const Analytics: React.FC = () => {
  // LD1: Initialize state for the selected tab using localStorage with 'inventory' as default
  const [selectedTab, setSelectedTab] = useLocalStorage<string>('analyticsSelectedTab', 'inventory');

  // LD1: Create a function to handle tab changes
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: string) => {
    // LD1: Update the selected tab state with the new value
    setSelectedTab(newValue);
    // LD1: Store the selected tab in localStorage for persistence
  }, [setSelectedTab]);

  return (
    // LD1: Render Page component with appropriate title
    <Page title="Analytics">
      {/* LD1: Render AnalyticsContainer to hold the tab navigation and content */}
      <AnalyticsContainer>
        {/* LD1: Render Tabs component for navigation between analytics types */}
        <TabsContainer>
          <Tabs value={selectedTab} onChange={handleTabChange} aria-label="analytics tabs">
            {/* LD1: Render Tab components for each analytics type (Inventory, Position, Locate, Exception) */}
            <Tab label="Inventory" value="inventory" />
            <Tab label="Position" value="position" />
            <Tab label="Locate" value="locate" />
            <Tab label="Exception" value="exception" />
          </Tabs>
        </TabsContainer>

        {/* LD1: Conditionally render the appropriate analytics component based on selected tab */}
        <ContentContainer>
          {/* LD1: For 'inventory' tab, render InventoryAnalytics component */}
          {selectedTab === 'inventory' && <InventoryAnalytics />}

          {/* LD1: For 'position' tab, render PositionAnalytics component */}
          {selectedTab === 'position' && <PositionAnalytics />}

          {/* LD1: For 'locate' tab, render LocateAnalytics component */}
          {selectedTab === 'locate' && <LocateAnalytics />}

          {/* LD1: For 'exception' tab, render ExceptionAnalytics component */}
          {selectedTab === 'exception' && <ExceptionAnalytics />}
        </ContentContainer>
      </AnalyticsContainer>
    </Page>
  );
};

export default Analytics;