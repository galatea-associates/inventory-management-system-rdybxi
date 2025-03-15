import React from 'react';
import styled from '@emotion/styled';
import { Box, useTheme } from '@mui/material'; // v5.13
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Pending as PendingIcon
} from '@mui/icons-material'; // v5.13
import Typography from '../common/Typography';
import { getThemeColor } from '../../styles/utils';
import { colors } from '../../styles/variables';

/**
 * Props for the StatusIndicator component
 */
export interface StatusIndicatorProps {
  /** The status type: success, warning, error, info, or pending */
  status: string;
  /** Optional label text to display next to the status indicator */
  label?: string;
  /** Size of the indicator: small, medium, or large */
  size?: string;
  /** Whether to show the icon instead of a dot */
  showIcon?: boolean;
  /** Additional class name for custom styling */
  className?: string;
}

/**
 * Determines the color for a given status type
 */
const getStatusColor = (status: string, theme: any): string => {
  switch (status) {
    case 'success':
      return getThemeColor('success');
    case 'error':
      return getThemeColor('error');
    case 'warning':
      return getThemeColor('warning');
    case 'info':
      return getThemeColor('info');
    case 'pending':
      return getThemeColor('grey.500');
    default:
      return getThemeColor('info');
  }
};

/**
 * Returns the appropriate icon component for a given status type
 */
const getStatusIcon = (status: string): React.ElementType => {
  switch (status) {
    case 'success':
      return CheckCircleIcon;
    case 'error':
      return ErrorIcon;
    case 'warning':
      return WarningIcon;
    case 'info':
      return InfoIcon;
    case 'pending':
      return PendingIcon;
    default:
      return InfoIcon;
  }
};

const StatusContainer = styled(Box)`
  display: flex;
  align-items: center;
  gap: ${theme => theme.spacing(1)};
`;

const StatusDot = styled(Box)<{ color: string; size: string }>`
  width: ${props => props.size === 'small' ? '8px' : props.size === 'large' ? '16px' : '12px'};
  height: ${props => props.size === 'small' ? '8px' : props.size === 'large' ? '16px' : '12px'};
  border-radius: 50%;
  background-color: ${props => props.color};
`;

const IconWrapper = styled(Box)<{ color: string }>`
  display: flex;
  align-items: center;
  color: ${props => props.color};
`;

/**
 * A versatile status indicator component that visually represents the state
 * of various entities in the Inventory Management System.
 * 
 * It displays different status types (success, warning, error, info, pending)
 * with appropriate colors and optional labels. This component is used throughout 
 * the application to provide consistent status visualization for system health,
 * processes, and data items.
 */
const StatusIndicator = React.memo(({
  status = 'info',
  label,
  size = 'medium',
  showIcon = true,
  className,
}: StatusIndicatorProps) => {
  const theme = useTheme();
  const color = getStatusColor(status, theme);
  const StatusIcon = getStatusIcon(status);
  
  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
  
  return (
    <StatusContainer 
      className={className} 
      role="status" 
      aria-label={`Status: ${status}${label ? ` - ${label}` : ''}`}
    >
      {showIcon ? (
        <IconWrapper color={color} aria-hidden="true">
          <StatusIcon style={{ fontSize: iconSize }} />
        </IconWrapper>
      ) : (
        <StatusDot color={color} size={size} aria-hidden="true" />
      )}
      {label && (
        <Typography 
          variant="body2" 
          color={color}
          fontWeight={500}
          fontSize={size === 'small' ? '0.75rem' : size === 'large' ? '1rem' : '0.875rem'}
        >
          {label}
        </Typography>
      )}
    </StatusContainer>
  );
});

StatusIndicator.displayName = 'StatusIndicator';

export default StatusIndicator;