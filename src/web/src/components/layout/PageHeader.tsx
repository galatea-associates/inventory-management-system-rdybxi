import React from 'react';
import styled from '@emotion/styled';
import { Box } from '@mui/material';
import Container from './Container';
import Breadcrumbs, { BreadcrumbItem } from './Breadcrumbs';
import PageTitle from '../common/PageTitle';
import { spacing } from '../../styles/variables';
import useBreakpoint from '../../hooks/useBreakpoint';

/**
 * Props for the PageHeader component
 */
export interface PageHeaderProps {
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
  /** Optional class name for additional styling */
  className?: string;
}

/**
 * Styled container for the page header component
 */
const HeaderContainer = styled(Box)`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${spacing.md}px;
  margin-bottom: ${spacing.md}px;
`;

/**
 * Styled container for the breadcrumbs navigation
 */
const BreadcrumbsContainer = styled(Box)<{ isMobile: boolean }>`
  margin-bottom: ${props => props.isMobile ? spacing.xs : spacing.sm}px;
`;

/**
 * A component that renders the header section of a page with title, breadcrumbs, and actions.
 * This component provides a consistent header structure across all pages of the application.
 */
const PageHeader = React.memo(({
  title,
  subtitle,
  actions,
  showBreadcrumbs = true,
  breadcrumbItems,
  className,
  ...rest
}: PageHeaderProps) => {
  // Get current breakpoint for responsive design
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint.isDownSm;
  
  return (
    <HeaderContainer className={className} {...rest}>
      {/* Render breadcrumbs if showBreadcrumbs is true */}
      {showBreadcrumbs && (
        <BreadcrumbsContainer isMobile={isMobile}>
          <Breadcrumbs 
            items={breadcrumbItems} 
            showHomeIcon={!isMobile}
          />
        </BreadcrumbsContainer>
      )}
      
      {/* Render page title with optional subtitle and actions */}
      <PageTitle 
        title={title} 
        subtitle={subtitle} 
        actions={actions} 
      />
    </HeaderContainer>
  );
});

PageHeader.displayName = 'PageHeader';

PageHeader.defaultProps = {
  showBreadcrumbs: true
};

export default PageHeader;