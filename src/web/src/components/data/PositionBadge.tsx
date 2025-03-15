import React from 'react';
import styled from '@emotion/styled';
import Badge from '../common/Badge';
import { colors } from '../../styles/variables';
import { getThemeColor } from '../../styles/utils';

/**
 * Props for the PositionBadge component
 */
interface PositionBadgeProps {
  /** Quantity of the position (positive for long, negative for short, zero for flat) */
  quantity: number;
  /** Type of position (standard, synthetic, etc.) */
  positionType?: string;
  /** Additional class name for styling */
  className?: string;
  /** Size of the badge */
  size?: 'small' | 'medium' | 'large';
  /** Visual style variant of the badge */
  variant?: 'filled' | 'outlined' | 'subtle';
}

/**
 * Determines the appropriate color based on position quantity and type
 * @param quantity Position quantity
 * @param positionType Type of position
 * @returns Color name (success, error, warning, or default)
 */
const getPositionStatusColor = (quantity: number, positionType = 'standard'): string => {
  // Special handling for synthetic positions or other types
  if (positionType === 'synthetic') {
    return quantity > 0 ? 'info' : quantity < 0 ? 'secondary' : 'warning';
  }

  // Standard position color logic
  if (quantity > 0) {
    return 'success'; // Green for long positions
  } else if (quantity < 0) {
    return 'error'; // Red for short positions
  } else {
    return 'warning'; // Yellow/Orange for flat positions
  }
};

/**
 * Generates the display text for the position status
 * @param quantity Position quantity
 * @param positionType Type of position
 * @returns Text representation of position status (LONG, SHORT, FLAT)
 */
const getPositionStatusText = (quantity: number, positionType = 'standard'): string => {
  // Special handling for synthetic positions or other types
  if (positionType === 'synthetic') {
    return quantity > 0 ? 'SYN-L' : quantity < 0 ? 'SYN-S' : 'SYN-F';
  }

  // Standard position text
  if (quantity > 0) {
    return 'LONG';
  } else if (quantity < 0) {
    return 'SHORT';
  } else {
    return 'FLAT';
  }
};

/**
 * Styled version of the Badge component with position-specific styling
 */
const StyledBadge = styled(Badge)`
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 60px;
  text-align: center;
`;

/**
 * Component that displays a badge indicating position status
 * 
 * A specialized badge component that visually represents position status with 
 * appropriate styling based on position quantity and type. It provides immediate
 * visual feedback about whether a position is long (positive), short (negative), 
 * or neutral (zero).
 *
 * @example
 * // Basic usage for a long position
 * <PositionBadge quantity={1000} />
 *
 * @example
 * // Short position with custom styling
 * <PositionBadge 
 *   quantity={-500} 
 *   variant="outlined" 
 *   size="medium" 
 * />
 *
 * @example
 * // Flat position (zero quantity)
 * <PositionBadge quantity={0} />
 *
 * @example
 * // Synthetic position
 * <PositionBadge quantity={1500} positionType="synthetic" />
 */
const PositionBadge = React.memo<PositionBadgeProps>(({
  quantity,
  positionType = 'standard',
  className,
  size = 'small',
  variant = 'filled',
  ...rest
}) => {
  // Determine the color based on quantity and position type
  const color = getPositionStatusColor(quantity, positionType);
  // Determine the display text based on quantity and position type
  const text = getPositionStatusText(quantity, positionType);
  
  return (
    <StyledBadge
      color={color}
      variant={variant}
      size={size}
      className={className}
      // Enhance accessibility with appropriate label
      aria-label={`Position status: ${text.toLowerCase()}`}
      {...rest}
    >
      {text}
    </StyledBadge>
  );
});

PositionBadge.displayName = 'PositionBadge';

export default PositionBadge;