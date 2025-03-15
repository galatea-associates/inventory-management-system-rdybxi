import React from 'react';
import styled from '@emotion/styled';
import { Tabs, TabsProps } from '@mui/material';
import { tabStyles } from '../../styles/components';
import { getThemeColor, conditionalStyle } from '../../styles/utils';
import { flexCenter } from '../../styles/mixins';

/**
 * Props specific to the custom Tabs component
 */
export interface CustomTabsProps {
  variant?: 'standard' | 'contained' | 'fullWidth';
  size?: 'small' | 'medium' | 'large';
}

/**
 * Styled version of Material-UI Tabs with custom styling
 */
export const StyledTabs = styled(Tabs)<TabsProps & CustomTabsProps>`
  ${(props) => tabStyles({
    variant: props.variant,
    orientation: props.orientation,
    size: props.size
  })}
`;

/**
 * Enhanced tabs component with custom styling and additional features.
 * Extends Material-UI Tabs with design system styles and accessibility features.
 */
const Tabs = React.memo((props: TabsProps & CustomTabsProps) => {
  const {
    children,
    value,
    onChange,
    orientation = 'horizontal',
    variant = 'standard',
    size = 'medium',
    ...otherProps
  } = props;

  return (
    <StyledTabs
      value={value}
      onChange={onChange}
      orientation={orientation}
      variant={variant}
      size={size}
      aria-orientation={orientation}
      {...otherProps}
    >
      {children}
    </StyledTabs>
  );
});

export default Tabs;