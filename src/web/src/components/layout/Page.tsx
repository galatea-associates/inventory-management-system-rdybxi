import React from 'react'; // react ^18.2.0
import { useSelector } from 'react-redux'; // react-redux ^8.0.5
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box } from '@mui/material'; // Material-UI Box component for layout container version 5.13

import Container from './Container'; // Import Container component for consistent layout and spacing
import ContentArea from './ContentArea'; // Import ContentArea component for the main content container
import PageHeader from './PageHeader'; // Import PageHeader component for the page title and actions
import { selectSidebarOpen } from '../../state/ui/uiSelectors'; // Import selector for sidebar open state from Redux store
import useBreakpoint from '../../hooks/useBreakpoint'; // Import custom hook for responsive breakpoint detection
import { pageLayout } from '../../styles/layouts'; // Import page layout styling function

/**
 * Interface for breadcrumb item data
 */
export interface BreadcrumbItem {
  label: string;
  path: string;
}

/**
 * Props for the Page component
 */
export interface PageProps {
  /** The main title of the page */
  title: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Optional action buttons or elements to display on the right side */
  actions?: React.ReactNode;
  /** Whether to show breadcrumb navigation */
  showBreadcrumbs?: boolean;
  /** Custom breadcrumb items for navigation */
  breadcrumbItems?: BreadcrumbItem[];
  /** The main content of the page */
  children: React.ReactNode;
  /** Optional class name for additional styling */
  className?: string;
}

/**
 * Styled container for the page component
 */
const PageContainer = styled(Box)`
  ${pageLayout()}
`;

/**
 * Styled container for the page content
 */
const ContentContainer = styled(Box)`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: auto;
`;

/**
 * A component that renders a standard page with header and content area
 */
const Page = React.memo<PageProps>(({
  title,
  subtitle,
  actions,
  children,
  showBreadcrumbs = true,
  breadcrumbItems,
  className,
  ...rest
}: PageProps): JSX.Element => {
  // Get the current breakpoint using useBreakpoint hook to determine responsive behavior
  const breakpoint = useBreakpoint();

  // Get the sidebar open state from Redux using useSelector and selectSidebarOpen
  const sidebarOpen = useSelector(selectSidebarOpen);

  // Determine if current view is mobile based on breakpoint
  const isMobile = breakpoint.isDownSm;

  // Return a PageContainer component with appropriate styling
  return (
    <PageContainer className={className} {...rest}>
      {/* Render PageHeader component with title, subtitle, actions, and breadcrumb props */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        showBreadcrumbs={showBreadcrumbs}
        breadcrumbItems={breadcrumbItems}
      />
      {/* Render ContentArea component with sidebar state and children */}
      <ContentArea sidebarOpen={sidebarOpen} isMobile={isMobile}>
        {children}
      </ContentArea>
    </PageContainer>
  );
});

Page.displayName = 'Page';

Page.defaultProps = {
  showBreadcrumbs: true,
};

export default Page;