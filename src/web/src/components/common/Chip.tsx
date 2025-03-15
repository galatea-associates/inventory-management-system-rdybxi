import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { Chip as MuiChip, ChipProps as MuiChipProps } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Cancel as CancelIcon, Done as DoneIcon } from '@mui/icons-material';
import Typography from './Typography';
import Avatar from './Avatar';
import { getThemeColor, createColorStyles, createSizeStyles, createVariantStyles } from '../../styles/utils';
import { borderRadius, spacing } from '../../styles/variables';

/**
 * Props for the Chip component, extending Material-UI's Chip props
 * with additional customization options specific to the IMS design system.
 */
export interface ChipProps extends Omit<MuiChipProps, 'variant'> {
  /** The content of the chip. */
  label?: React.ReactNode;
  /** The color of the chip: primary, secondary, error, etc. or any theme color */
  color?: string;
  /** The size of the chip: 'small', 'medium', or 'large' */
  size?: string;
  /** The variant of the chip: 'filled', 'outlined', or 'rounded' */
  variant?: string;
  /** Avatar element at the start of the chip */
  avatar?: React.ReactNode;
  /** Icon element at the start of the chip */
  icon?: React.ReactNode;
  /** Icon element to be displayed at the end of the chip */
  deleteIcon?: React.ReactNode;
  /** Callback function fired when the delete icon is clicked */
  onDelete?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Callback function fired when the chip is clicked */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** If true, the chip will be disabled */
  disabled?: boolean;
  /** If true, the chip will appear clickable, and will raise when pressed */
  clickable?: boolean;
  /** Additional class name for the chip */
  className?: string;
}

/**
 * Styled version of Material-UI's Chip component with IMS design system styling
 */
const StyledChip = styled(MuiChip)<ChipProps>(({ theme, size, color, variant, disabled, clickable, onClick }) => {
  // Size-specific styling
  const sizeStyles = {
    small: {
      height: 24,
      padding: `0 ${spacing.sm}px`,
      '& .MuiChip-label': {
        padding: `0 ${spacing.xs}px`,
        fontSize: '0.75rem',
      },
      '& .MuiChip-avatar': {
        width: 16,
        height: 16,
        margin: `0 ${spacing.xs}px 0 -${spacing.xs}px`,
      },
      '& .MuiChip-icon': {
        fontSize: '1rem',
        margin: `0 ${spacing.xs}px 0 -${spacing.xs}px`,
      },
      '& .MuiChip-deleteIcon': {
        width: 16,
        height: 16,
        margin: `0 -${spacing.xs}px 0 ${spacing.xs}px`,
      },
    },
    medium: {
      height: 32,
      padding: `0 ${spacing.md}px`,
      '& .MuiChip-label': {
        padding: `0 ${spacing.sm}px`,
        fontSize: '0.875rem',
      },
      '& .MuiChip-avatar': {
        width: 24,
        height: 24,
        margin: `0 ${spacing.sm}px 0 -${spacing.xs}px`,
      },
      '& .MuiChip-icon': {
        fontSize: '1.25rem',
        margin: `0 ${spacing.sm}px 0 -${spacing.xs}px`,
      },
      '& .MuiChip-deleteIcon': {
        width: 20,
        height: 20,
        margin: `0 -${spacing.xs}px 0 ${spacing.sm}px`,
      },
    },
    large: {
      height: 40,
      padding: `0 ${spacing.lg}px`,
      '& .MuiChip-label': {
        padding: `0 ${spacing.md}px`,
        fontSize: '1rem',
      },
      '& .MuiChip-avatar': {
        width: 32,
        height: 32,
        margin: `0 ${spacing.md}px 0 -${spacing.sm}px`,
      },
      '& .MuiChip-icon': {
        fontSize: '1.5rem',
        margin: `0 ${spacing.md}px 0 -${spacing.sm}px`,
      },
      '& .MuiChip-deleteIcon': {
        width: 24,
        height: 24,
        margin: `0 -${spacing.sm}px 0 ${spacing.md}px`,
      },
    },
  };

  // Variant-specific styling
  const variantStyles = {
    filled: {
      backgroundColor: getThemeColor(color || 'primary'),
      color: getThemeColor(color || 'primary', 'contrastText'),
      border: 'none',
      borderRadius: borderRadius.md,
      '&:hover': {
        backgroundColor: getThemeColor(color || 'primary', 'dark'),
      },
    },
    outlined: {
      backgroundColor: 'transparent',
      color: getThemeColor(color || 'primary'),
      border: `1px solid ${getThemeColor(color || 'primary')}`,
      borderRadius: borderRadius.md,
      '&:hover': {
        backgroundColor: getThemeColor(color || 'primary', 'main', 0.04),
      },
    },
    rounded: {
      backgroundColor: getThemeColor(color || 'primary', 'light', 0.2),
      color: getThemeColor(color || 'primary', 'dark'),
      border: 'none',
      borderRadius: 16,
      '&:hover': {
        backgroundColor: getThemeColor(color || 'primary', 'light', 0.3),
      },
    },
  };

  // Base styles
  const baseStyles = {
    fontWeight: 500,
    textTransform: 'none',
    transition: theme.transitions.create(['background-color', 'box-shadow', 'transform']),
  };

  // Disabled styles
  const disabledStyles = disabled ? {
    opacity: 0.5,
    pointerEvents: 'none',
  } : {};

  // Clickable styles
  const clickableStyles = (clickable || onClick) ? {
    cursor: 'pointer',
    userSelect: 'none',
    '&:hover': {
      boxShadow: theme.shadows[1],
    },
    '&:focus': {
      outline: `2px solid ${getThemeColor(color || 'primary', 'light')}`,
      outlineOffset: 2,
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  } : {};

  return {
    ...baseStyles,
    ...createSizeStyles(size || 'medium', sizeStyles),
    ...createVariantStyles(variant || 'filled', variantStyles),
    ...disabledStyles,
    ...clickableStyles,
  };
});

/**
 * Chip component for the Inventory Management System
 * 
 * Displays compact elements like tags, filters, or selections with consistent styling
 * and behavior. Supports different sizes, colors, and variants.
 * 
 * @example
 * // Basic usage
 * <Chip label="Tag" />
 * 
 * // With custom styling
 * <Chip 
 *   label="Priority" 
 *   color="error" 
 *   variant="outlined" 
 *   size="small" 
 * />
 * 
 * // With avatar
 * <Chip
 *   avatar={<Avatar>JD</Avatar>}
 *   label="John Doe"
 *   color="primary"
 *   variant="filled"
 * />
 * 
 * // With delete functionality
 * <Chip
 *   label="Removable"
 *   onDelete={() => console.log('Deleted')}
 * />
 */
const Chip = React.memo((props: ChipProps) => {
  const {
    label,
    color = 'primary',
    size = 'medium',
    variant = 'filled',
    avatar,
    icon,
    deleteIcon,
    onDelete,
    onClick,
    disabled = false,
    clickable = false,
    className,
    ...otherProps
  } = props;

  const theme = useTheme();

  // Default delete icon based on theme
  const defaultDeleteIcon = onDelete ? (
    <CancelIcon fontSize="small" />
  ) : undefined;

  // Handle keyboard accessibility for clickable chips
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <StyledChip
      label={
        typeof label === 'string' ? (
          <Typography variant={size === 'small' ? 'caption' : 'body2'} color="inherit">
            {label}
          </Typography>
        ) : (
          label
        )
      }
      color={color}
      size={size}
      variant={variant}
      avatar={avatar}
      icon={icon}
      deleteIcon={deleteIcon || defaultDeleteIcon}
      onDelete={onDelete}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      disabled={disabled}
      clickable={clickable || !!onClick}
      className={className}
      aria-disabled={disabled}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      {...otherProps}
    />
  );
});

Chip.displayName = 'Chip';

export default Chip;