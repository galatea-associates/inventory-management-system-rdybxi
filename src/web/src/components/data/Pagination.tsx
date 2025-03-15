import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import Box from '@mui/material/Box'; // @mui/material 5.13
import Typography from '@mui/material/Typography'; // @mui/material 5.13
import IconButton from '@mui/material/IconButton'; // @mui/material 5.13
import FirstPageIcon from '@mui/icons-material/FirstPage'; // @mui/icons-material 5.13
import LastPageIcon from '@mui/icons-material/LastPage'; // @mui/icons-material 5.13
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'; // @mui/icons-material 5.13
import ChevronRightIcon from '@mui/icons-material/ChevronRight'; // @mui/icons-material 5.13

import Select from '../common/Select';
import Button from '../common/Button';
import { colors, spacing } from '../../styles/variables';
import { useResponsive } from '../../features/responsive/hooks/useResponsive';

/**
 * Props for the Pagination component
 */
export interface PaginationProps {
  /** Current page number (starting from 1) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Available options for page size selector */
  pageSizeOptions: number[];
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (pageSize: number) => void;
  /** Whether to show page size selector */
  showPageSizeSelector?: boolean;
  /** Whether to show pagination information */
  showPageInfo?: boolean;
  /** Whether to use compact mode (for small screens) */
  compact?: boolean;
  /** Additional CSS class */
  className?: string;
}

const PaginationContainer = styled(Box)<{ compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${props => props.compact ? spacing.xs : spacing.sm}px ${props => props.compact ? spacing.sm : spacing.md}px;
  border-top: 1px solid ${colors.grey[200]};
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: ${props => props.compact ? spacing.xs : spacing.sm}px;
  }
`;

const PageSizeContainer = styled(Box)<{ compact?: boolean }>`
  display: flex;
  align-items: center;
  margin-right: ${spacing.md}px;
  
  @media (max-width: 768px) {
    margin-right: 0;
    order: 1;
    flex-basis: 100%;
    margin-bottom: ${props => props.compact ? spacing.xs : spacing.sm}px;
  }
`;

const PageInfoContainer = styled(Box)<{ compact?: boolean }>`
  flex-grow: 1;
  text-align: center;
  
  @media (max-width: 768px) {
    text-align: left;
    order: 3;
    flex-basis: 50%;
    font-size: ${props => props.compact ? '0.75rem' : 'inherit'};
  }
`;

const NavigationContainer = styled(Box)<{ compact?: boolean }>`
  display: flex;
  align-items: center;
  margin-left: ${spacing.md}px;
  
  @media (max-width: 768px) {
    margin-left: 0;
    order: 2;
    justify-content: flex-end;
    flex-basis: 50%;
  }
`;

/**
 * Calculates the range of items being displayed on the current page
 */
function calculatePageRange(page: number, pageSize: number, totalItems: number) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return { start, end };
}

/**
 * A pagination component for navigating through large datasets.
 * 
 * This component provides controls for changing pages and page size, with
 * accessibility features and responsive design.
 * 
 * @example
 * <Pagination
 *   page={1}
 *   pageSize={10}
 *   totalItems={100}
 *   pageSizeOptions={[10, 25, 50, 100]}
 *   onPageChange={handlePageChange}
 *   onPageSizeChange={handlePageSizeChange}
 * />
 */
const Pagination = React.memo<PaginationProps>((props) => {
  const {
    page,
    pageSize,
    totalItems,
    pageSizeOptions,
    onPageChange,
    onPageSizeChange,
    showPageSizeSelector,
    showPageInfo,
    compact,
    className,
  } = props;

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  // Get responsive breakpoint information
  const responsive = useResponsive();
  
  // Determine which elements to show based on screen size
  const showCompactView = compact || responsive.isDownSm;

  // Calculate the range of items being displayed
  const { start, end } = useMemo(() => 
    calculatePageRange(page, pageSize, totalItems), 
    [page, pageSize, totalItems]
  );

  // Handle page navigation
  const handlePageChange = (newPage: number) => {
    // Ensure page is within valid range
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      onPageChange(newPage);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(event.target.value, 10);
    
    // Calculate the first item index of the current page
    const firstItemIndex = (page - 1) * pageSize + 1;
    
    // Calculate what page this item would be on with the new page size
    const newPage = Math.max(1, Math.ceil(firstItemIndex / newSize));
    
    // Update the page size and potentially the page
    onPageSizeChange(newSize);
    if (newPage !== page) {
      onPageChange(newPage);
    }
  };

  // Create page size options for the dropdown
  const pageSizeItems = useMemo(() => 
    pageSizeOptions.map(size => ({
      value: size,
      label: `${size}`
    })), 
    [pageSizeOptions]
  );

  // Generate a unique ID prefix for accessibility
  const paginationId = useMemo(() => 
    `pagination-${Math.random().toString(36).substr(2, 9)}`, 
    []
  );
  
  const pageInfoId = `${paginationId}-info`;

  return (
    <PaginationContainer 
      compact={showCompactView} 
      className={className}
      role="navigation"
      aria-label="Pagination navigation"
    >
      {showPageSizeSelector && (
        <PageSizeContainer compact={showCompactView}>
          <Typography 
            variant="body2" 
            component="label"
            htmlFor={`${paginationId}-page-size`}
            sx={{ 
              mr: 1, 
              display: { xs: showCompactView ? 'none' : 'block', sm: 'block' } 
            }}
          >
            Items per page:
          </Typography>
          <Select
            id={`${paginationId}-page-size`}
            value={String(pageSize)}
            onChange={handlePageSizeChange}
            options={pageSizeItems}
            size={showCompactView ? 'small' : 'medium'}
            aria-label="Items per page"
          />
        </PageSizeContainer>
      )}

      {showPageInfo && (
        <PageInfoContainer compact={showCompactView}>
          <Typography 
            variant={showCompactView ? 'caption' : 'body2'}
            id={pageInfoId}
            color={totalItems === 0 ? 'text.disabled' : 'text.primary'}
          >
            {totalItems === 0 ? 'No items to display' : `Showing ${start}-${end} of ${totalItems}`}
          </Typography>
        </PageInfoContainer>
      )}

      <NavigationContainer 
        compact={showCompactView}
        aria-labelledby={pageInfoId}
      >
        <IconButton
          onClick={() => handlePageChange(1)}
          disabled={page === 1 || totalItems === 0}
          size={showCompactView ? 'small' : 'medium'}
          aria-label="First page"
          aria-disabled={page === 1 || totalItems === 0}
        >
          <FirstPageIcon fontSize={showCompactView ? 'small' : 'medium'} />
        </IconButton>
        
        <IconButton
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1 || totalItems === 0}
          size={showCompactView ? 'small' : 'medium'}
          aria-label="Previous page"
          aria-disabled={page === 1 || totalItems === 0}
        >
          <ChevronLeftIcon fontSize={showCompactView ? 'small' : 'medium'} />
        </IconButton>
        
        <Typography 
          variant={showCompactView ? 'caption' : 'body2'} 
          component="span" 
          sx={{ 
            mx: showCompactView ? 0.5 : 1, 
            userSelect: 'none' 
          }}
          aria-live="polite"
          aria-current="page"
        >
          {page} / {totalPages}
        </Typography>
        
        <IconButton
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages || totalItems === 0}
          size={showCompactView ? 'small' : 'medium'}
          aria-label="Next page"
          aria-disabled={page >= totalPages || totalItems === 0}
        >
          <ChevronRightIcon fontSize={showCompactView ? 'small' : 'medium'} />
        </IconButton>
        
        <IconButton
          onClick={() => handlePageChange(totalPages)}
          disabled={page >= totalPages || totalItems === 0}
          size={showCompactView ? 'small' : 'medium'}
          aria-label="Last page"
          aria-disabled={page >= totalPages || totalItems === 0}
        >
          <LastPageIcon fontSize={showCompactView ? 'small' : 'medium'} />
        </IconButton>
      </NavigationContainer>
    </PaginationContainer>
  );
});

// Default props
Pagination.defaultProps = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  pageSizeOptions: [10, 25, 50, 100],
  showPageSizeSelector: true,
  showPageInfo: true,
  compact: false,
};

Pagination.displayName = 'Pagination';

export default Pagination;