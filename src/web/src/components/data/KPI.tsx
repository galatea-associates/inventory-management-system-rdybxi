import React, { ReactNode } from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.11.0
import { Box, useTheme } from '@mui/material'; // @mui/material ^5.13
import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // @mui/icons-material ^5.13
import TrendingDownIcon from '@mui/icons-material/TrendingDown'; // @mui/icons-material ^5.13
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'; // @mui/icons-material ^5.13
import Card from '../common/Card';
import Typography from '../common/Typography';
import { formatCurrency, formatPercentage, formatShortCurrency } from '../../utils/formatter';

/**
 * Props for the KPI component
 */
export interface KPIProps {
  /** The label describing what this KPI represents */
  label: string;
  /** The value of the KPI metric */
  value: number | string;
  /** Optional icon to display with the KPI */
  icon?: ReactNode;
  /** Optional trend indicator ('up', 'down', 'flat') */
  trend?: string;
  /** Format to apply to the value ('number', 'currency', 'shortCurrency', 'percentage') */
  format?: string;
  /** Currency code for currency formatting (e.g., 'USD', 'EUR') */
  currencyCode?: string;
  /** Additional CSS class for custom styling */
  className?: string;
}

/**
 * Styled card container for the KPI
 */
const StyledCard = styled(Card)`
  padding: ${props => props.theme.spacing(2)};
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

/**
 * Styled label for the KPI
 */
const KPILabel = styled(Typography)`
  color: ${props => props.theme.palette.text.secondary};
  margin-bottom: ${props => props.theme.spacing(1)};
`;

/**
 * Styled value display for the KPI
 */
const KPIValue = styled(Typography)`
  font-weight: 600;
  font-size: 1.5rem;
  margin-bottom: ${props => props.theme.spacing(1)};
`;

/**
 * Container for the optional icon
 */
const IconContainer = styled(Box)`
  margin-bottom: ${props => props.theme.spacing(1)};
  display: flex;
  align-items: center;
`;

/**
 * Container for the trend indicator with dynamic color
 */
const TrendContainer = styled(Box)<{ color: string }>`
  display: flex;
  align-items: center;
  color: ${props => props.color};
`;

/**
 * Formats a value based on the specified format type
 * @param value The value to format
 * @param format The format type (number, currency, shortCurrency, percentage)
 * @param currencyCode The currency code for currency formatting
 * @returns Formatted value string
 */
const formatValue = (value: number | string, format: string = 'number', currencyCode: string = 'USD'): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  switch (format) {
    case 'currency':
      return formatCurrency(value, currencyCode);
    case 'shortCurrency':
      return formatShortCurrency(value, currencyCode);
    case 'percentage':
      return formatPercentage(value, 2);
    case 'number':
    default:
      // If string and not convertible to number, return as is
      if (typeof value === 'string' && isNaN(parseFloat(value))) {
        return value;
      }
      
      // Convert to number
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) {
        return '';
      }
      
      // Format number with thousands separators
      return numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};

/**
 * Key Performance Indicator component
 * 
 * Displays a metric with a label, value, and optional icon and trend indicator.
 * Used throughout the application to highlight important metrics in a visually
 * consistent way, particularly on dashboard and summary screens.
 */
const KPI = React.memo<KPIProps>(({
  label,
  value,
  icon,
  trend,
  format = 'number',
  currencyCode = 'USD',
  className
}) => {
  const theme = useTheme();
  
  // Format the value
  const formattedValue = formatValue(value, format, currencyCode);
  
  // Determine trend icon and color
  let trendIcon = null;
  let trendColor = '';
  
  if (trend) {
    if (trend === 'up') {
      trendIcon = <TrendingUpIcon fontSize="small" />;
      trendColor = theme.palette.success.main;
    } else if (trend === 'down') {
      trendIcon = <TrendingDownIcon fontSize="small" />;
      trendColor = theme.palette.error.main;
    } else {
      trendIcon = <TrendingFlatIcon fontSize="small" />;
      trendColor = theme.palette.grey[500];
    }
  }
  
  return (
    <StyledCard className={className}>
      {icon && <IconContainer>{icon}</IconContainer>}
      
      <KPILabel variant="body2">
        {label}
      </KPILabel>
      
      <KPIValue variant="h5">
        {formattedValue}
      </KPIValue>
      
      {trend && (
        <TrendContainer color={trendColor}>
          {trendIcon}
        </TrendContainer>
      )}
    </StyledCard>
  );
});

KPI.displayName = 'KPI';

export default KPI;