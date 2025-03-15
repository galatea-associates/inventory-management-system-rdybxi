import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react'; // v11.10.6
import { useTheme } from '@mui/material/styles'; // v5.13
import { getThemeColor } from '../../styles/utils';
import Typography from './Typography';
import { formatPercentage } from '../../utils/formatter';

/**
 * Props for the ProgressBar component
 */
export interface ProgressBarProps {
  /**
   * The progress value (0-100)
   * @default 0
   */
  value: number;
  /**
   * The variant of the progress bar
   * @default 'linear'
   */
  variant?: 'linear' | 'rounded' | 'indeterminate';
  /**
   * The size of the progress bar
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * The color of the progress bar
   * @default 'primary'
   */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  /**
   * Whether to show the percentage label
   * @default false
   */
  showLabel?: boolean;
  /**
   * The position of the label
   * @default 'right'
   */
  labelPosition?: 'top' | 'right' | 'bottom' | 'left' | 'inside';
  /**
   * Additional class name for the progress bar
   */
  className?: string;
  /**
   * Props for the label Typography component
   */
  labelProps?: React.ComponentProps<typeof Typography>;
}

/**
 * Styled container for the progress bar
 */
const ProgressBarContainer = styled.div<{
  variant: string;
  size: string;
}>(({ variant, size }) => {
  // Base styles for the container
  const baseStyles = css`
    width: 100%;
    background-color: ${getThemeColor('grey.200')};
    overflow: hidden;
    position: relative;
  `;

  // Variant-specific styles
  const variantStyles = {
    linear: css`
      border-radius: 4px;
    `,
    rounded: css`
      border-radius: 100px;
    `,
    indeterminate: css`
      border-radius: 4px;
    `,
  };

  // Size-specific styles
  const sizeStyles = {
    small: css`
      height: 4px;
    `,
    medium: css`
      height: 8px;
    `,
    large: css`
      height: 12px;
    `,
  };

  return css`
    ${baseStyles}
    ${variantStyles[variant as keyof typeof variantStyles] || variantStyles.linear}
    ${sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.medium}
  `;
});

/**
 * Styled indicator that shows the progress amount
 */
const ProgressIndicator = styled.div<{
  value: number;
  variant: string;
  color: string;
}>(({ value, variant, color }) => {
  // Get the appropriate color from theme
  const progressColor = getThemeColor(color, 'main');

  // Base styles for the indicator
  const baseStyles = css`
    height: 100%;
    background-color: ${progressColor};
  `;

  // Variant-specific styles
  const variantStyles = {
    linear: css`
      width: ${value}%;
      transition: width 0.4s ease;
    `,
    rounded: css`
      width: ${value}%;
      border-radius: 100px;
      transition: width 0.4s ease;
    `,
    indeterminate: css`
      width: 30%;
      position: absolute;
      animation: progress-indeterminate 1.5s infinite ease-in-out;

      @keyframes progress-indeterminate {
        0% {
          left: -30%;
        }
        100% {
          left: 100%;
        }
      }
    `,
  };

  return css`
    ${baseStyles}
    ${variantStyles[variant as keyof typeof variantStyles] || variantStyles.linear}
  `;
});

/**
 * Styled container for the progress label
 */
const LabelContainer = styled.div<{
  labelPosition: string;
}>(({ labelPosition }) => {
  // Position-specific styles
  const positionStyles = {
    top: css`
      margin-bottom: 8px;
      align-self: flex-start;
    `,
    right: css`
      margin-left: 12px;
    `,
    bottom: css`
      margin-top: 8px;
      align-self: flex-start;
    `,
    left: css`
      margin-right: 12px;
    `,
    inside: css`
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
    `,
  };

  return css`
    display: inline-flex;
    align-items: center;
    ${positionStyles[labelPosition as keyof typeof positionStyles] || positionStyles.right}
  `;
});

/**
 * ProgressBar component displays a progress indicator with customizable appearance
 * 
 * This component visualizes progress or completion status with support for different
 * variants, sizes, colors, and label positions. It is designed to be consistent with
 * the application's design system and includes proper accessibility attributes.
 * 
 * @example
 * // Basic usage
 * <ProgressBar value={75} />
 * 
 * // With label
 * <ProgressBar value={75} showLabel labelPosition="right" />
 * 
 * // Different variants and colors
 * <ProgressBar value={75} variant="rounded" color="secondary" />
 * <ProgressBar variant="indeterminate" color="primary" />
 * 
 * // Different sizes
 * <ProgressBar value={75} size="small" />
 * <ProgressBar value={75} size="large" />
 */
const ProgressBar = React.memo(({
  value = 0,
  variant = 'linear',
  size = 'medium',
  color = 'primary',
  showLabel = false,
  labelPosition = 'right',
  className,
  labelProps,
}: ProgressBarProps) => {
  const theme = useTheme();
  
  // Normalize value to be between 0 and 100
  const normalizedValue = Math.max(0, Math.min(100, value));
  
  // Format the percentage for display
  const formattedValue = formatPercentage(normalizedValue / 100, 0);
  
  // Determine if label is vertical (top/bottom) for layout
  const isVerticalLabel = labelPosition === 'top' || labelPosition === 'bottom';
  
  // Determine if label is inside the progress bar for contrast
  const isInsideLabel = labelPosition === 'inside';
  
  // Handle label rendering
  const renderLabel = () => {
    if (!showLabel) return null;
    
    return (
      <LabelContainer labelPosition={labelPosition}>
        <Typography
          variant="body2"
          color={isInsideLabel ? 'common.white' : undefined}
          {...labelProps}
        >
          {formattedValue}
        </Typography>
      </LabelContainer>
    );
  };
  
  // Set container styles based on label position
  const containerStyle = {
    display: 'flex',
    flexDirection: isVerticalLabel ? 'column' : 'row',
    alignItems: isVerticalLabel ? 'flex-start' : 'center',
    width: '100%',
  } as React.CSSProperties;
  
  return (
    <div className={className} style={containerStyle}>
      {/* Render label before progress bar if position is left or top */}
      {showLabel && labelPosition === 'left' && renderLabel()}
      {showLabel && labelPosition === 'top' && renderLabel()}
      
      {/* Progress bar container with indicator */}
      <div style={{ position: 'relative', width: '100%' }}>
        <ProgressBarContainer
          variant={variant}
          size={size}
          role="progressbar"
          aria-valuenow={variant === 'indeterminate' ? undefined : normalizedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${formattedValue}`}
        >
          <ProgressIndicator
            value={normalizedValue}
            variant={variant}
            color={color}
          />
        </ProgressBarContainer>
        
        {/* Render label inside progress bar if position is inside */}
        {showLabel && labelPosition === 'inside' && renderLabel()}
      </div>
      
      {/* Render label after progress bar if position is right or bottom */}
      {showLabel && labelPosition === 'right' && renderLabel()}
      {showLabel && labelPosition === 'bottom' && renderLabel()}
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;