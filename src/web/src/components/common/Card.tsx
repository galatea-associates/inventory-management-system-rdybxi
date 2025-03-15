import React from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { cardStyles } from '../../styles/components';
import { getThemeColor, conditionalStyle } from '../../styles/utils';
import { boxShadow, focusVisible } from '../../styles/mixins';
import Paper from './Paper';

/**
 * Props for the Card component
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The variant of the card component.
   * @default 'elevation'
   */
  variant?: 'elevation' | 'outlined' | 'flat';
  
  /**
   * The elevation level of the card component, affecting shadow depth.
   * @default 1
   */
  elevation?: number;
  
  /**
   * If true, the card will have interactive styling with hover effects.
   * @default false
   */
  interactive?: boolean;
  
  /**
   * Handler for click events when the card is interactive.
   */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  
  /**
   * The content of the card component.
   */
  children?: React.ReactNode;
}

/**
 * Styled card component with card-specific styling
 */
export const StyledCard = styled(Paper)<CardProps>`
  ${props => cardStyles({
    variant: props.variant === 'elevation' ? 'elevated' : props.variant,
    elevation: props.elevation,
  })}
`;

/**
 * A customizable card component for containing content with consistent styling,
 * elevation, and interactive states. Extends the Paper component with card-specific
 * styling and behavior.
 */
const Card = React.memo<CardProps>((props) => {
  const {
    variant = 'elevation',
    elevation = 1,
    interactive = false,
    onClick,
    children,
    ...other
  } = props;

  return (
    <StyledCard
      variant={variant}
      elevation={elevation}
      interactive={interactive}
      onClick={interactive ? onClick : undefined}
      {...other}
    >
      {children}
    </StyledCard>
  );
});

// Display name for debugging
Card.displayName = 'Card';

export default Card;