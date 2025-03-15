import React from 'react';
import styled from '@emotion/styled';
import { Tab as MuiTab, TabProps } from '@mui/material'; // v5.13
import { tabStyles } from '../../styles/components';
import { getThemeColor, conditionalStyle } from '../../styles/utils';
import { flexCenter } from '../../styles/mixins';

/**
 * Custom props specific to our Tab component that extend the base Material-UI TabProps
 */
export interface CustomTabProps {
  /**
   * Styling variant of the tab
   * - standard: Default style with indicator line
   * - contained: Tab with background color when selected
   * - fullWidth: Tab that expands to fill available width
   */
  variant?: 'standard' | 'contained' | 'fullWidth';
  
  /**
   * Size of the tab
   * - small: Compact size for dense UIs
   * - medium: Standard size for most interfaces
   * - large: Larger size for prominent tabs
   */
  size?: 'small' | 'medium' | 'large';
}

/**
 * Styled version of Material-UI Tab with custom styling based on our design system
 */
export const StyledTab = styled(MuiTab)<TabProps & CustomTabProps>`
  ${(props) => tabStyles({
    variant: props.variant,
    orientation: props.orientation,
    selected: props.selected,
    disabled: props.disabled
  })}
`;

/**
 * Enhanced Tab component with custom styling and additional features
 * Wraps Material-UI's Tab component with our design system styling
 */
export const Tab = React.memo<TabProps & CustomTabProps>(({
  variant = 'standard',
  size = 'medium',
  label,
  icon,
  disabled,
  ...props
}) => {
  return (
    <StyledTab
      variant={variant}
      size={size}
      label={label}
      icon={icon}
      disabled={disabled}
      aria-disabled={disabled}
      {...props}
    />
  );
});

export default Tab;