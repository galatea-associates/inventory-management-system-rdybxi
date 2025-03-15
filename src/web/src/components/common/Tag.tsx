/**
 * Tag Component for the Inventory Management System
 * 
 * A customizable tag component that displays compact labels with optional icons.
 * Supports different variants, sizes, and colors to represent various types of
 * information like categories, statuses, or attributes.
 */

import React from 'react';
import styled from '@emotion/styled';
import { colors, spacing, borderRadius } from '../../styles/variables';
import { flexCenter } from '../../styles/mixins';
import { getThemeColor, getContrastColor } from '../../styles/utils';
import Typography from './Typography';

/**
 * Props for the Tag component
 */
export interface TagProps {
  /** Style variant of the tag */
  variant?: 'filled' | 'outlined' | 'subtle';
  /** Size of the tag */
  size?: 'small' | 'medium' | 'large';
  /** Color scheme of the tag */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default';
  /** Label text to display */
  label: string;
  /** Optional icon to display before the label */
  icon?: React.ReactNode;
  /** Additional class name for custom styling */
  className?: string;
}

/**
 * Props for the styled tag component
 */
interface StyledTagProps {
  variant: 'filled' | 'outlined' | 'subtle';
  size: 'small' | 'medium' | 'large';
  backgroundColor: string;
  textColor: string;
}

/**
 * Determines the background and text colors for the tag based on the variant and color props
 */
const getTagColors = (variant: string, color: string) => {
  const baseColor = getThemeColor(color);
  
  switch (variant) {
    case 'filled':
      return {
        backgroundColor: baseColor,
        textColor: getContrastColor(baseColor)
      };
    case 'outlined':
      return {
        backgroundColor: 'transparent',
        textColor: baseColor
      };
    case 'subtle':
      return {
        backgroundColor: getThemeColor(color, 'light'),
        textColor: getThemeColor(color, 'dark')
      };
    default:
      return {
        backgroundColor: baseColor,
        textColor: getContrastColor(baseColor)
      };
  }
};

/**
 * Styled container for the tag component
 */
const StyledTag = styled.div<StyledTagProps>`
  ${flexCenter};
  display: inline-flex;
  border-radius: ${props => {
    switch (props.size) {
      case 'small':
        return `${borderRadius.xs}px`;
      case 'large':
        return `${borderRadius.md}px`;
      default:
        return `${borderRadius.sm}px`;
    }
  }};
  padding: ${props => {
    switch (props.size) {
      case 'small':
        return `${spacing.xs / 2}px ${spacing.sm}px`;
      case 'large':
        return `${spacing.sm}px ${spacing.md}px`;
      default:
        return `${spacing.xs}px ${spacing.sm}px`;
    }
  }};
  background-color: ${props => props.backgroundColor};
  color: ${props => props.textColor};
  ${props => props.variant === 'outlined' && `
    border: 1px solid ${props.textColor};
  `}
  font-size: ${props => {
    switch (props.size) {
      case 'small':
        return '0.75rem';
      case 'large':
        return '1rem';
      default:
        return '0.875rem';
    }
  }};
  transition: all 0.2s ease-in-out;
  
  &:focus {
    outline: 2px solid ${colors.primary.main};
    outline-offset: 2px;
  }
`;

/**
 * Styled container for tag content with icon and text
 */
const TagContent = styled.div`
  ${flexCenter};
  gap: ${spacing.xs}px;
`;

/**
 * Styled wrapper for tag icon
 */
const IconWrapper = styled.span`
  ${flexCenter};
  font-size: inherit;
  line-height: 1;
`;

/**
 * Tag component for displaying compact labels with optional icons
 */
const Tag = React.memo(({
  variant = 'filled',
  color = 'default',
  size = 'medium',
  label,
  icon,
  className,
  ...props
}: TagProps) => {
  // Get background and text colors based on variant and color
  const { backgroundColor, textColor } = getTagColors(variant, color);

  return (
    <StyledTag
      variant={variant as 'filled' | 'outlined' | 'subtle'}
      size={size as 'small' | 'medium' | 'large'}
      backgroundColor={backgroundColor}
      textColor={textColor}
      className={className}
      {...props}
    >
      <TagContent>
        {icon && <IconWrapper>{icon}</IconWrapper>}
        <Typography 
          variant={size === 'large' ? 'body2' : 'caption'}
          color="inherit"
        >
          {label}
        </Typography>
      </TagContent>
    </StyledTag>
  );
});

Tag.displayName = 'Tag';

export default Tag;