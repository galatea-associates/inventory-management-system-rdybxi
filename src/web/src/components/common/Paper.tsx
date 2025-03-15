import React from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { paperStyles } from '../../styles/components';
import { getThemeColor, conditionalStyle } from '../../styles/utils';
import { boxShadow, focusVisible } from '../../styles/mixins';

/**
 * Props for the Paper component
 */
export interface PaperProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The variant of the paper component.
   * @default 'elevation'
   */
  variant?: 'elevation' | 'outlined';
  
  /**
   * The elevation level of the paper component, affecting shadow depth.
   * @default 1
   */
  elevation?: number;
  
  /**
   * If true, rounded corners are disabled.
   * @default false
   */
  square?: boolean;
  
  /**
   * If true, the paper will have interactive styling with hover effects.
   * @default false
   */
  interactive?: boolean;
  
  /**
   * Handler for click events.
   */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  
  /**
   * The content of the paper component.
   */
  children?: React.ReactNode;
}

/**
 * Styled div component with paper-specific styling
 */
export const StyledPaper = styled('div')<PaperProps>`
  ${props => paperStyles(props)}
`;

/**
 * A foundational surface component that provides a base for containing content
 * with customizable elevation, border radius, and styling. This component serves
 * as the building block for many other components like cards, dialogs, and menus.
 */
const Paper = React.memo<PaperProps>((props) => {
  const {
    variant = 'elevation',
    elevation = 1,
    square = false,
    interactive = false,
    onClick,
    children,
    ...other
  } = props;

  // Add accessibility attributes for interactive papers
  const accessibilityProps = interactive ? {
    role: 'button',
    tabIndex: 0,
    'aria-disabled': other.disabled ? true : undefined
  } : {};

  return (
    <StyledPaper
      variant={variant}
      elevation={elevation}
      square={square}
      interactive={interactive}
      onClick={interactive ? onClick : undefined}
      {...accessibilityProps}
      {...other}
    >
      {children}
    </StyledPaper>
  );
});

// Display name for debugging
Paper.displayName = 'Paper';

export default Paper;