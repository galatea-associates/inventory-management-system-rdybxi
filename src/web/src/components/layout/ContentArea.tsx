import React from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { useTheme } from '@mui/material/styles'; // @mui/material 5.13

import Paper from '../common/Paper';
import { contentLayout } from '../../styles/layouts';
import { spacing } from '../../styles/variables';
import { CustomTheme } from '../../types/theme';

/**
 * Props for the ContentArea component
 */
export interface ContentAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the sidebar is open */
  sidebarOpen?: boolean;
  /** Whether the application is in mobile view */
  isMobile?: boolean;
  /** Elevation level for the Paper component */
  elevation?: number;
  /** Content to render within the content area */
  children: React.ReactNode;
}

/**
 * Styled div component with content area specific styling
 */
const StyledContentArea = styled('div')<{ sidebarOpen?: boolean; isMobile?: boolean }>`
  ${props => contentLayout({ sidebarOpen: props.sidebarOpen, isMobile: props.isMobile })}
`;

/**
 * A component that represents the main content area of the application,
 * providing a consistent container for page content with appropriate styling,
 * spacing, and responsive behavior. This component is used within the Page component
 * to wrap the main content of each page in the Inventory Management System.
 */
const ContentArea = React.memo<ContentAreaProps>((props) => {
  const { children, sidebarOpen = true, isMobile = false, elevation = 0, ...other } = props;
  
  const theme = useTheme<CustomTheme>();
  
  return (
    <Paper elevation={elevation} {...other}>
      <StyledContentArea sidebarOpen={sidebarOpen} isMobile={isMobile}>
        {children}
      </StyledContentArea>
    </Paper>
  );
});

export default ContentArea;