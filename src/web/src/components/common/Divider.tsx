import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react'; // v11.10.6
import { useTheme } from '@mui/material/styles'; // 5.13
import { colors, spacing } from '../../styles/variables';
import Typography from './Typography';

/**
 * Props for the Divider component
 */
export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The orientation of the divider
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';
  
  /**
   * The visual style of the divider line
   * @default 'solid'
   */
  variant?: 'solid' | 'dashed' | 'dotted';
  
  /**
   * The color of the divider. Can be a theme color (e.g., 'primary.main') or a custom color
   * @default 'grey.300'
   */
  color?: string;
  
  /**
   * The thickness of the divider in pixels
   * @default 1
   */
  thickness?: number;
  
  /**
   * The spacing around the divider. Can be a number (px) or a predefined spacing key ('xs', 'sm', 'md', 'lg', 'xl')
   * @default 'md'
   */
  spacing?: number | string;
  
  /**
   * The alignment of the text when the divider has children
   * @default 'center'
   */
  textAlign?: 'left' | 'center' | 'right';
  
  /**
   * The content to render within the divider (typically text)
   */
  children?: React.ReactNode;
  
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Styled div element for the divider with custom styling
 */
const StyledDivider = styled.div<{
  orientation: string;
  variant: string;
  color: string;
  thickness: number;
  spacingValue: string;
  hasChildren: boolean;
}>`
  background: none;
  border: none;
  box-sizing: border-box;
  
  ${({ orientation, variant, color, thickness, spacingValue, hasChildren }) => {
    // Vertical divider
    if (orientation === 'vertical') {
      return css`
        display: inline-block;
        width: ${thickness}px;
        height: auto;
        min-height: 1em;
        border-left: ${thickness}px ${variant} ${color};
        margin: 0 ${spacingValue};
        vertical-align: middle;
      `;
    }
    
    // Horizontal divider without children
    if (!hasChildren) {
      return css`
        display: block;
        width: 100%;
        border-top: ${thickness}px ${variant} ${color};
        margin: ${spacingValue} 0;
      `;
    }
    
    // For horizontal divider with children, styling is handled in the DividerContainer
    return css`
      display: none;
    `;
  }}
`;

/**
 * Container for dividers with text content
 */
const DividerContainer = styled.div<{
  textAlign: string;
  color: string;
  thickness: number;
  variant: string;
  spacingValue: string;
}>`
  display: flex;
  align-items: center;
  width: 100%;
  margin: ${({ spacingValue }) => `${spacingValue} 0`};
  
  &::before,
  &::after {
    content: '';
    border-top: ${({ thickness, variant, color }) => 
      `${thickness}px ${variant} ${color}`};
  }
  
  ${({ textAlign }) => {
    switch (textAlign) {
      case 'left':
        return css`
          &::before {
            width: ${spacing.md}px;
          }
          &::after {
            flex: 1;
          }
        `;
      case 'right':
        return css`
          &::before {
            flex: 1;
          }
          &::after {
            width: ${spacing.md}px;
          }
        `;
      default: // center
        return css`
          &::before,
          &::after {
            flex: 1;
          }
        `;
    }
  }}
`;

/**
 * Container for text content within dividers
 */
const DividerText = styled.div`
  padding: 0 ${spacing.md}px;
  white-space: nowrap;
  flex-shrink: 0;
`;

/**
 * Divider component for the Inventory Management System
 * 
 * This component provides visual separation between content sections with
 * support for horizontal and vertical orientations, different variants,
 * and customizable styling options.
 * 
 * @example
 * // Simple horizontal divider
 * <Divider />
 * 
 * // Vertical divider
 * <Divider orientation="vertical" />
 * 
 * // Divider with text
 * <Divider>Section Title</Divider>
 * 
 * // Custom styled divider
 * <Divider color="primary.main" thickness={2} variant="dashed" />
 */
const Divider = React.memo(({
  orientation = 'horizontal',
  variant = 'solid',
  color = 'grey.300',
  thickness = 1,
  spacing = 'md',
  textAlign = 'center',
  children,
  className,
  ...otherProps
}: DividerProps) => {
  const theme = useTheme();
  
  // Process spacing value
  const getSpacingValue = (spacingProp: number | string): string => {
    if (typeof spacingProp === 'number') {
      return `${spacingProp}px`;
    }
    
    // If string with units is provided, use it directly
    if (typeof spacingProp === 'string' && /[a-z%]+$/.test(spacingProp)) {
      return spacingProp;
    }
    
    // If a spacing key is provided (xs, sm, md, lg, xl)
    const spacingMap: Record<string, number> = {
      'xs': spacing.xs,
      'sm': spacing.sm,
      'md': spacing.md,
      'lg': spacing.lg,
      'xl': spacing.xl
    };
    
    return `${spacingMap[spacingProp as string] || spacing.md}px`;
  };
  
  // Process color value
  const getColorValue = (colorProp: string): string => {
    if (colorProp.includes('.')) {
      const [colorGroup, colorShade] = colorProp.split('.');
      
      // Try to get color from theme
      if (theme.palette?.[colorGroup]?.[colorShade]) {
        return theme.palette[colorGroup][colorShade];
      }
      
      // Try to get color from our colors object
      if (colors?.[colorGroup]?.[colorShade]) {
        return colors[colorGroup][colorShade];
      }
      
      // Fallback
      return colors.grey[300];
    }
    
    return colorProp;
  };
  
  const spacingValue = getSpacingValue(spacing);
  const colorValue = getColorValue(color);
  
  // For dividers with text content (only supported for horizontal dividers)
  if (children && orientation === 'horizontal') {
    return (
      <DividerContainer
        className={className}
        textAlign={textAlign}
        color={colorValue}
        thickness={thickness}
        variant={variant}
        spacingValue={spacingValue}
        role="separator"
        aria-orientation={orientation}
        {...otherProps}
      >
        <DividerText>
          {typeof children === 'string' ? (
            <Typography variant="body2" color="text.secondary">
              {children}
            </Typography>
          ) : (
            children
          )}
        </DividerText>
      </DividerContainer>
    );
  }
  
  // For dividers without text or vertical dividers
  return (
    <StyledDivider
      orientation={orientation}
      variant={variant}
      color={colorValue}
      thickness={thickness}
      spacingValue={spacingValue}
      hasChildren={!!children}
      className={className}
      role="separator"
      aria-orientation={orientation}
      {...otherProps}
    />
  );
});

Divider.displayName = 'Divider';

export default Divider;