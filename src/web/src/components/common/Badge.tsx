import React from 'react';
import styled from '@emotion/styled';
import { Badge as MuiBadge, BadgeProps } from '@mui/material';
import { colors, spacing, borderRadius } from '../../styles/variables';
import { getThemeColor, getContrastColor, createVariantStyles, createSizeStyles } from '../../styles/utils';
import Typography from './Typography';

/**
 * Props specific to the custom Badge component
 */
export interface CustomBadgeProps {
  /**
   * The visual style variant of the badge
   * @default 'filled'
   */
  variant?: 'filled' | 'outlined' | 'subtle';
  
  /**
   * The size of the badge
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * The color scheme of the badge
   * @default 'default'
   */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default';
}

/**
 * Props for the styled badge component
 */
interface StyledBadgeProps {
  variant?: 'filled' | 'outlined' | 'subtle';
  size?: 'small' | 'medium' | 'large';
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Determines the background and text colors for the badge based on the variant and color props
 */
const getBadgeColors = (variant: string, color: string) => {
  const themeColor = getThemeColor(color === 'default' ? 'grey.500' : color);
  
  switch (variant) {
    case 'filled':
      return {
        backgroundColor: themeColor,
        textColor: getContrastColor(themeColor)
      };
    case 'outlined':
      return {
        backgroundColor: 'transparent',
        textColor: themeColor
      };
    case 'subtle':
      return {
        backgroundColor: getThemeColor(color === 'default' ? 'grey.100' : `${color}.light`, undefined, 0.2),
        textColor: themeColor
      };
    default:
      return {
        backgroundColor: themeColor,
        textColor: getContrastColor(themeColor)
      };
  }
};

/**
 * Styled version of Material-UI Badge with custom styling
 */
export const StyledBadge = styled(MuiBadge)<StyledBadgeProps>(
  ({ variant, size, backgroundColor, textColor }) => {
    // Size-specific styles
    const sizeStyles = createSizeStyles(size || 'medium', {
      small: {
        '& .MuiBadge-badge': {
          minWidth: spacing.sm * 2,
          height: spacing.sm * 2,
          padding: `0 ${spacing.xs}px`,
          fontSize: '0.65rem',
          borderRadius: borderRadius.sm,
        }
      },
      medium: {
        '& .MuiBadge-badge': {
          minWidth: spacing.md * 1.25,
          height: spacing.md * 1.25,
          padding: `0 ${spacing.xs}px`,
          fontSize: '0.75rem',
          borderRadius: borderRadius.md,
        }
      },
      large: {
        '& .MuiBadge-badge': {
          minWidth: spacing.md * 1.5,
          height: spacing.md * 1.5,
          padding: `0 ${spacing.sm}px`,
          fontSize: '0.875rem',
          borderRadius: borderRadius.md,
        }
      }
    });

    // Variant-specific styles
    const variantStyles = createVariantStyles(variant || 'filled', {
      filled: {
        '& .MuiBadge-badge': {
          backgroundColor,
          color: textColor,
        }
      },
      outlined: {
        '& .MuiBadge-badge': {
          backgroundColor,
          color: textColor,
          border: `1px solid ${textColor}`,
        }
      },
      subtle: {
        '& .MuiBadge-badge': {
          backgroundColor,
          color: textColor,
        }
      }
    });

    return {
      // Common styles for all badges
      '& .MuiBadge-badge': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        
        // Focus styles for accessibility
        '&:focus': {
          outline: 'none',
          boxShadow: `0 0 0 2px ${colors.primary.light}`,
        },
      },
      
      ...sizeStyles,
      ...variantStyles,
    };
  }
);

/**
 * Enhanced badge component with custom styling and additional features
 * 
 * A customizable Badge component for the Inventory Management System UI that displays 
 * a small indicator or counter attached to another element. It can be used to show 
 * notification counts, status indicators, or highlight elements requiring attention.
 * 
 * @example
 * // Basic usage
 * <Badge badgeContent={4}>
 *   <NotificationsIcon />
 * </Badge>
 * 
 * // With custom styling
 * <Badge 
 *   badgeContent="New" 
 *   color="success" 
 *   variant="outlined"
 *   size="large"
 * >
 *   <MenuItem>Menu Item</MenuItem>
 * </Badge>
 */
const Badge = React.memo<Omit<BadgeProps, 'variant' | 'color'> & CustomBadgeProps>((props) => {
  const {
    variant = 'filled',
    size = 'medium',
    color = 'default',
    badgeContent,
    children,
    overlap = 'rectangular',
    anchorOrigin = {
      vertical: 'top',
      horizontal: 'right',
    },
    ...otherProps
  } = props;

  // Get badge colors based on variant and color
  const { backgroundColor, textColor } = getBadgeColors(variant, color);

  // Format badge content with Typography if it's a string or number
  const formattedBadgeContent = React.useMemo(() => {
    if (typeof badgeContent === 'string' || typeof badgeContent === 'number') {
      return (
        <Typography 
          variant="caption" 
          color="inherit"
          component="span"
        >
          {badgeContent}
        </Typography>
      );
    }
    return badgeContent;
  }, [badgeContent]);

  return (
    <StyledBadge
      backgroundColor={backgroundColor}
      textColor={textColor}
      variant={variant}
      size={size}
      badgeContent={formattedBadgeContent}
      overlap={overlap}
      anchorOrigin={anchorOrigin}
      // Enhance accessibility with appropriate ARIA attributes
      aria-label={typeof badgeContent === 'number' ? `${badgeContent} notifications` : undefined}
      {...otherProps}
    >
      {children}
    </StyledBadge>
  );
});

Badge.displayName = 'Badge';

export default Badge;