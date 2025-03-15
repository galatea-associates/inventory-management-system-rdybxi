import React from 'react';
import Box from '@mui/material/Box';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import Card from '../common/Card';
import Typography from '../common/Typography';
import { styled } from '../../styles/utils';
import { flexColumn } from '../../styles/mixins';
import { getThemeColor } from '../../styles/utils';
import { formatNumber, formatPercentage, formatCurrency } from '../../utils/formatter';

/**
 * Props for the SummaryItem component
 */
export interface SummaryItemProps {
  /**
   * Label text for the summary item
   */
  label: string;
  
  /**
   * Value to display
   */
  value: string | number;
  
  /**
   * Optional change indicator (positive = upward trend, negative = downward trend)
   */
  change?: number;
  
  /**
   * Optional color to apply to the value display
   */
  color?: string;
  
  /**
   * Optional icon to display with the value
   */
  icon?: React.ReactNode;
  
  /**
   * Format for the value display (e.g., 'number', 'currency', 'percentage')
   */
  format?: string;
  
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Styled container for the summary item
 */
const SummaryItemContainer = styled(Card)`
  padding: 16px;
  height: 100%;
  ${flexColumn}
  gap: 8px;
`;

/**
 * Styled container for the label
 */
const LabelContainer = styled(Box)`
  margin-bottom: 4px;
`;

/**
 * Styled container for the value and icon
 */
const ValueContainer = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

/**
 * Styled container for the change indicator
 */
const ChangeContainer = styled(Box)`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 0.75rem;
`;

/**
 * Styled container for the icon
 */
const IconContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
`;

/**
 * Formats the value based on its type and the specified format
 * 
 * @param value - The value to format
 * @param format - The format to apply ('currency', 'percentage', or 'number')
 * @returns Formatted value string
 */
const formatValue = (value: string | number, format?: string): string => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  if (format === 'currency') {
    return formatCurrency(value);
  } else if (format === 'percentage') {
    return formatPercentage(value, 2);
  } else {
    return formatNumber(value, 2);
  }
};

/**
 * Determines the color for the change indicator based on the change value
 * 
 * @param change - The change value
 * @returns Color code for the change indicator
 */
const getChangeColor = (change?: number): string => {
  if (change === undefined) {
    return getThemeColor('text.primary');
  }
  
  if (change > 0) {
    return getThemeColor('success');
  } else if (change < 0) {
    return getThemeColor('error');
  } else {
    return getThemeColor('text.secondary');
  }
};

/**
 * A component that displays an individual summary item with label, value, and optional change indicator.
 * Used within the Summary component to present key metrics in dashboards, position views, and 
 * inventory screens throughout the Inventory Management System.
 */
const SummaryItem = React.memo<SummaryItemProps>(({
  label,
  value,
  change,
  color,
  icon,
  format,
  className,
  ...rest
}) => {
  // Format the value based on the specified format
  const formattedValue = formatValue(value, format);
  
  // Determine the color for the change indicator
  const changeColor = getChangeColor(change);
  
  // Determine the change indicator direction for accessibility
  const changeDirection = change ? (change > 0 ? 'increase' : 'decrease') : undefined;
  
  return (
    <SummaryItemContainer className={className} {...rest}>
      <LabelContainer>
        <Typography variant="caption" color="textSecondary">
          {label}
        </Typography>
      </LabelContainer>
      
      <ValueContainer>
        <Typography variant="h4" color={color || 'textPrimary'} fontWeight="medium">
          {formattedValue}
        </Typography>
        
        {icon && (
          <IconContainer>
            {icon}
          </IconContainer>
        )}
      </ValueContainer>
      
      {change !== undefined && (
        <ChangeContainer 
          style={{ color: changeColor }}
          aria-label={`${Math.abs(change * 100).toFixed(2)}% ${changeDirection}`}
        >
          {change > 0 ? (
            <TrendingUpIcon fontSize="small" aria-hidden="true" />
          ) : change < 0 ? (
            <TrendingDownIcon fontSize="small" aria-hidden="true" />
          ) : null}
          <Typography variant="caption" style={{ color: 'inherit' }}>
            {formatPercentage(Math.abs(change), 2)}
          </Typography>
        </ChangeContainer>
      )}
    </SummaryItemContainer>
  );
});

// Set display name for debugging
SummaryItem.displayName = 'SummaryItem';

export default SummaryItem;