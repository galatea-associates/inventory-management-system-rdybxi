import React from 'react';
import styled from '@emotion/styled';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import { Home as HomeIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import useBreakpoint from '../../hooks/useBreakpoint';
import { ROUTES } from '../../constants/routes';

/**
 * Interface for breadcrumb item data
 */
export interface BreadcrumbItem {
  /** Display text for the breadcrumb */
  label: string;
  /** Route path for navigation */
  path: string;
}

/**
 * Props for the Breadcrumbs component
 */
export interface BreadcrumbsProps {
  /** Optional custom breadcrumb items */
  items?: BreadcrumbItem[];
  /** Optional CSS class name */
  className?: string;
  /** Flag to show/hide home icon */
  showHomeIcon?: boolean;
}

/**
 * Styled MuiBreadcrumbs component with custom styling
 */
const StyledBreadcrumbs = styled(MuiBreadcrumbs)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1),
  '.MuiBreadcrumbs-separator': {
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
  },
}));

/**
 * Styled Link component for breadcrumb items
 */
const BreadcrumbLink = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  color: theme.palette.text.secondary,
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
    color: theme.palette.primary.main,
  },
}));

/**
 * Styled wrapper for the home icon
 */
const HomeIconWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginRight: theme.spacing(0.5),
}));

/**
 * Styled Typography for the current page
 */
const CurrentPageText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
}));

/**
 * Styled span for visually hidden text (accessible to screen readers)
 */
const VisuallyHidden = styled('span')({
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  width: '1px',
  whiteSpace: 'nowrap',
});

/**
 * Mapping of route paths to human-readable labels
 */
const ROUTE_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'positions': 'Positions',
  'inventory': 'Inventory',
  'locates': 'Locates',
  'exceptions': 'Exceptions',
  'rules': 'Rules',
  'analytics': 'Analytics',
  'settings': 'Settings',
};

/**
 * Generates breadcrumb items based on the current path
 * 
 * @param pathname - Current URL path
 * @returns Array of breadcrumb items with label and path
 */
function getBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  // Split the pathname into segments and filter out empty segments
  const segments = pathname.split('/').filter(segment => segment);
  
  // Initialize breadcrumbs with Home item
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: ROUTES.ROOT },
  ];
  
  // Build up the breadcrumb items based on path segments
  let currentPath = '';
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    
    // Try to get a human-readable label from our mapping
    const label = ROUTE_LABELS[segment] || segment;
    
    // Add this segment to breadcrumbs
    breadcrumbs.push({
      label,
      path: currentPath,
    });
  });
  
  return breadcrumbs;
}

/**
 * Component that renders breadcrumb navigation
 * 
 * This component displays breadcrumb navigation showing the current location
 * within the application hierarchy and providing clickable links to navigate
 * to parent routes. It adapts to different screen sizes and follows
 * accessibility standards.
 * 
 * @param props - Component props
 * @returns Rendered breadcrumbs component
 */
const Breadcrumbs = React.memo(({ 
  items, 
  className,
  showHomeIcon = true,
  ...rest 
}: BreadcrumbsProps): JSX.Element => {
  const location = useLocation();
  const breakpoint = useBreakpoint();
  
  // Generate breadcrumb items from current path if not provided
  const breadcrumbItems = items || getBreadcrumbsFromPath(location.pathname);
  
  // Determine if we should show mobile view
  const isMobileView = breakpoint.isDownSm;
  
  return (
    <StyledBreadcrumbs
      separator={<NavigateNextIcon fontSize="small" />}
      aria-label="breadcrumb navigation"
      className={className}
      {...rest}
    >
      {/* Home icon always shown */}
      {showHomeIcon && (
        <BreadcrumbLink
          component={RouterLink}
          to={ROUTES.ROOT}
          aria-label="Navigate to home page"
        >
          <HomeIconWrapper>
            <HomeIcon fontSize="small" />
          </HomeIconWrapper>
          <VisuallyHidden>Home</VisuallyHidden>
        </BreadcrumbLink>
      )}
      
      {isMobileView ? (
        // Mobile view: show only current page
        breadcrumbItems.length > 1 && (
          <CurrentPageText aria-current="page">
            {breadcrumbItems[breadcrumbItems.length - 1].label}
          </CurrentPageText>
        )
      ) : (
        // Desktop view: show all breadcrumbs
        breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          return isLast ? (
            <CurrentPageText key={item.path} aria-current="page">
              {item.label}
            </CurrentPageText>
          ) : (
            <BreadcrumbLink
              key={item.path}
              component={RouterLink}
              to={item.path}
            >
              {item.label}
            </BreadcrumbLink>
          );
        })
      )}
    </StyledBreadcrumbs>
  );
});

export default Breadcrumbs;