/**
 * Container Component
 * 
 * A flexible container component that provides consistent layout and spacing for content
 * across the Inventory Management System UI. This component serves as a fundamental
 * building block for page layouts, ensuring proper padding, maximum width constraints,
 * and responsive behavior.
 * 
 * Features:
 * - Configurable maximum width (defaults to 1200px)
 * - Fluid width option for full-width containers
 * - Consistent padding with theme-based defaults
 * - Optional background color
 * - Responsive behavior across different screen sizes
 */

import React from 'react';
import styled from '@emotion/styled';
import { useTheme } from '@mui/material/styles';
import { container } from '../../styles/layouts';
import { CustomTheme } from '../../types/theme';

/**
 * Props for the Container component
 */
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the container should be fluid width (no max-width) */
  fluid?: boolean;
  /** The maximum width of the container */
  maxWidth?: string | number;
  /** The padding of the container */
  padding?: string | number;
  /** The background color of the container */
  background?: string;
  /** The content of the container */
  children: React.ReactNode;
}

/**
 * A styled div component with container-specific styling
 */
const StyledContainer = styled.div<ContainerProps>`
  ${props => container({
    fluid: props.fluid,
    maxWidth: props.maxWidth,
    padding: props.padding,
    background: props.background
  })}
`;

/**
 * A flexible container component that provides consistent layout and spacing
 */
const Container = React.memo<ContainerProps>((props) => {
  const theme = useTheme<CustomTheme>();
  const { fluid, maxWidth, padding, background, children, ...rest } = props;
  
  // Process padding value
  let paddingValue = padding || theme.spacing(3);
  if (typeof paddingValue === 'string') {
    // Try to parse the string to a number, removing any units
    const parsed = parseFloat(paddingValue);
    paddingValue = isNaN(parsed) ? theme.spacing(3) : parsed;
  }
  
  return (
    <StyledContainer
      fluid={fluid}
      maxWidth={maxWidth}
      padding={paddingValue}
      background={background}
      {...rest}
    >
      {children}
    </StyledContainer>
  );
});

Container.defaultProps = {
  fluid: false,
  maxWidth: '1200px'
};

export default Container;