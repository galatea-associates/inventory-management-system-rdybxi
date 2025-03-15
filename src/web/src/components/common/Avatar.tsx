import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { Avatar as MuiAvatar, AvatarProps as MuiAvatarProps } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Typography from './Typography';
import { getThemeColor, getContrastColor } from '../../styles/utils';

/**
 * Props for the Avatar component, extending Material-UI's Avatar props
 * with additional customization options specific to the IMS design system.
 */
export interface AvatarProps extends Omit<MuiAvatarProps, 'variant'> {
  /** Image source URL for the avatar */
  src?: string;
  /** Alt text for the avatar image for screen readers */
  alt?: string;
  /** Size of the avatar: 'small' (24px), 'medium' (40px), or 'large' (56px) */
  size?: 'small' | 'medium' | 'large';
  /** Color of the avatar: primary, secondary, error, warning, info, success, or custom color */
  color?: string;
  /** Shape of the avatar: circular, rounded, or square */
  variant?: 'circular' | 'rounded' | 'square';
  /** Content to display inside avatar (string for initials or React element) */
  children?: React.ReactNode;
  /** Callback fired when avatar is clicked */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** Additional CSS class for custom styling */
  className?: string;
}

/**
 * Styled version of Material-UI's Avatar component with IMS design system styling
 */
const StyledAvatar = styled(MuiAvatar)<AvatarProps>(({ theme, size, color, variant, onClick }) => {
  // Size-specific styling
  const sizeStyles = {
    small: {
      width: 24,
      height: 24,
      fontSize: '0.75rem',
      '& .MuiSvgIcon-root': {
        fontSize: '1rem',
      },
    },
    medium: {
      width: 40,
      height: 40,
      fontSize: '1rem',
      '& .MuiSvgIcon-root': {
        fontSize: '1.5rem',
      },
    },
    large: {
      width: 56,
      height: 56,
      fontSize: '1.5rem',
      '& .MuiSvgIcon-root': {
        fontSize: '2rem',
      },
    },
  };

  // Variant-specific styling
  const variantStyles = {
    circular: {
      borderRadius: '50%',
    },
    rounded: {
      borderRadius: theme.shape.borderRadius * 2,
    },
    square: {
      borderRadius: 0,
    },
  };

  // Interactive states
  const interactiveStyles = onClick
    ? {
        cursor: 'pointer',
        transition: theme.transitions.create(['box-shadow', 'transform'], {
          duration: theme.transitions.duration.shortest,
        }),
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: theme.shadows[3],
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      }
    : {};

  // Responsive sizing
  const responsiveStyles = css`
    @media (max-width: ${theme.breakpoints.values.sm}px) {
      ${size === 'large' && {
        width: 48,
        height: 48,
        fontSize: '1.25rem',
      }}
    }
  `;

  return {
    ...(sizeStyles[size || 'medium']),
    ...(variantStyles[variant || 'circular']),
    ...interactiveStyles,
    ...responsiveStyles,
  };
});

/**
 * Extracts initials from a name string
 * 
 * @param name - The name to extract initials from
 * @returns Up to 2 uppercase letters representing the name's initials
 */
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 0) return '';
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Avatar component for the Inventory Management System
 * 
 * A customizable avatar that displays user profile images or initials with
 * consistent styling options. Supports different sizes, colors, and variants.
 * 
 * @example
 * // With image
 * <Avatar src="/path/to/image.jpg" alt="User Name" />
 * 
 * // With initials
 * <Avatar color="primary">John Doe</Avatar>
 * 
 * // With custom styling
 * <Avatar size="large" color="secondary" variant="rounded">JD</Avatar>
 */
const Avatar = React.memo(({
  src,
  alt = 'User avatar',
  size = 'medium',
  color = 'primary',
  variant = 'circular',
  children,
  onClick,
  className,
  ...otherProps
}: AvatarProps) => {
  const theme = useTheme();
  
  // Generate initials if children is a string and no image is provided
  let initials: string | null = null;
  if (!src && typeof children === 'string') {
    initials = getInitials(children);
  }
  
  // Get background color and text color based on the color prop
  const backgroundColor = getThemeColor(color);
  const textColor = getContrastColor(backgroundColor);
  
  return (
    <StyledAvatar
      src={src}
      alt={alt}
      size={size}
      color={color}
      variant={variant}
      onClick={onClick}
      className={className}
      sx={{
        bgcolor: backgroundColor,
        color: textColor,
      }}
      aria-label={!src && typeof children === 'string' ? children : alt}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...otherProps}
    >
      {!src && initials && (
        <Typography variant="body2" color={textColor} aria-hidden="true">
          {initials}
        </Typography>
      )}
      {!src && !initials && children}
    </StyledAvatar>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;