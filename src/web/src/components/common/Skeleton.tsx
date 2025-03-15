import React from 'react';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/react';
import { Skeleton as MuiSkeleton } from '@mui/material'; // version 5.13
import { useTheme } from '@mui/material/styles'; // version 5.13
import { colors } from '../../styles/variables';
import { respectedMotionPreferences } from '../../styles/animations';

/**
 * Props interface for the Skeleton component
 */
export interface SkeletonProps extends Omit<React.ComponentProps<typeof MuiSkeleton>, 'variant' | 'animation'> {
  /** The shape of the skeleton */
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  /** Width of the skeleton. If a number is provided, it is assumed to be in px */
  width?: string | number;
  /** Height of the skeleton. If a number is provided, it is assumed to be in px */
  height?: string | number;
  /** Animation effect to use */
  animation?: 'pulse' | 'wave' | 'none';
  /** Content to render inside the skeleton */
  children?: React.ReactNode;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Animation for the pulse effect
 */
const pulseAnimation = keyframes`
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.6;
  }
`;

/**
 * Animation for the wave effect
 */
const waveAnimation = keyframes`
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

/**
 * Styled skeleton component that extends Material UI's skeleton
 * with custom styling and animations
 */
const StyledSkeleton = styled(MuiSkeleton)<{
  animation?: string;
  variant?: string;
  width?: string | number;
  height?: string | number;
}>(({ theme, animation, variant, width, height }) => css`
  /* Base styling for all variants */
  background-color: ${theme.palette.mode === 'light'
    ? colors.grey[200]
    : colors.grey[800]};
  margin: 0;
  
  /* Variant-specific styling */
  ${variant === 'text' && css`
    border-radius: ${theme.shape.borderRadius}px;
    height: ${height || '1.2em'};
    width: ${width || '100%'};
  `}
  
  ${variant === 'rectangular' && css`
    border-radius: 0;
    height: ${height || '100%'};
    width: ${width || '100%'};
  `}
  
  ${variant === 'circular' && css`
    border-radius: 50%;
    height: ${height || '40px'};
    width: ${width || '40px'};
  `}
  
  ${variant === 'rounded' && css`
    border-radius: ${theme.shape.borderRadius}px;
    height: ${height || '40px'};
    width: ${width || '100%'};
  `}
  
  /* Animation styles */
  ${animation === 'pulse' && respectedMotionPreferences(css`
    animation: ${pulseAnimation} 1.5s ease-in-out 0.5s infinite;
  `)}
  
  ${animation === 'wave' && respectedMotionPreferences(css`
    overflow: hidden;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, 
        transparent, 
        ${theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)'}, 
        transparent
      );
      animation: ${waveAnimation} 1.6s linear 0.5s infinite;
    }
  `)}
`);

/**
 * Skeleton component that provides a placeholder while content is loading
 * 
 * @example
 * // Basic usage
 * <Skeleton />
 * 
 * @example
 * // Rectangular skeleton with custom dimensions
 * <Skeleton variant="rectangular" width={210} height={118} />
 * 
 * @example
 * // Circular skeleton with wave animation
 * <Skeleton variant="circular" width={40} height={40} animation="wave" />
 */
const Skeleton = React.memo<SkeletonProps>((props) => {
  const {
    variant = 'text',
    width = 'auto',
    height = 'auto',
    animation = 'pulse',
    children,
    className = '',
    ...rest
  } = props;

  const theme = useTheme();

  return (
    <StyledSkeleton
      variant={variant as any}
      width={width}
      height={height}
      animation={animation as any}
      className={className}
      aria-busy="true"
      aria-label="Loading content"
      data-testid="skeleton-loading"
      {...rest}
    >
      {children}
    </StyledSkeleton>
  );
});

Skeleton.displayName = 'Skeleton';

export default Skeleton;