import React, { useState, useEffect, useCallback } from 'react'; // React, { useState, useEffect, useCallback } ^18.2.0
import styled from '@emotion/styled'; // styled components library for component styling @emotion/styled ^11.10.6
import { Box } from '@mui/material'; // Material-UI components for layout and basic styling @mui/material 5.13

import Page from '../../components/layout/Page'; // Import Page component for consistent page layout and structure
import Tabs from '../../components/common/Tabs'; // Import Tabs component for tabbed navigation
import Tab from '../../components/common/Tab'; // Import Tab component for individual tab items
import LocateQueue from './LocateQueue'; // Import LocateQueue component for displaying the queue of locate requests
import LocateApproval from './LocateApproval'; // Import LocateApproval component for the locate approval workflow
import LocateHistory from './LocateHistory'; // Import LocateHistory component for viewing historical locate requests
import { useDispatch, useSelector } from '../../state'; // Import Redux hooks for state management
import { setActiveLocateTab } from '../../state/ui/uiSlice'; // Import action to update the active locate tab in Redux state
import { selectActiveLocateTab } from '../../state/ui/uiSelectors'; // Import selector for the active locate tab from Redux state

// Styled container for the tabs
const TabContainer = styled(Box)`
  border-bottom: 1px solid;
  border-color: divider;
  margin-bottom: 16px;
`;

// Styled container for the tab content
const ContentContainer = styled(Box)`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

/**
 * Main component for the locate management page
 */
const Locates: React.FC = () => {
  // LD1: Initialize dispatch function from useDispatch hook
  const dispatch = useDispatch();

  // LD1: Get the active tab index from Redux state using useSelector and selectActiveLocateTab
  const activeTab = useSelector(selectActiveLocateTab);

  /**
   * Handler for tab selection changes
   */
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    // LD1: Dispatch setActiveLocateTab action with the new tab index value
    dispatch(setActiveLocateTab(newValue));
  }, [dispatch]);

  // LD1: Return a Page component with appropriate title and content
  return (
    <Page title="Locate Management">
      {/* LD1: Render Tabs component with the active tab value and change handler */}
      <TabContainer>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Locate Tabs">
          {/* LD1: Render Tab components for Queue, Approval, and History views */}
          <Tab label="Queue" />
          <Tab label="Approval" />
          <Tab label="History" />
        </Tabs>
      </TabContainer>

      {/* LD1: Render the active tab content based on the active tab index */}
      <ContentContainer>
        {/* LD1: Conditionally render LocateQueue, LocateApproval, or LocateHistory based on active tab */}
        {activeTab === 0 && <LocateQueue />}
        {activeTab === 1 && <LocateApproval />}
        {activeTab === 2 && <LocateHistory />}
      </ContentContainer>
    </Page>
  );
};

export default Locates;