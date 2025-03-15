import React from 'react'; // ^18.2.0
import styled from '@emotion/styled'; // ^11.10.6
import { keyframes, css } from '@emotion/react'; // ^11.10.6
import { flexCenter } from '../../styles/mixins';
import { colors } from '../../styles/variables';
import { rotateKeyframes, respectedMotionPreferences } from '../../styles/animations';

/**
 * Props interface for the Spinner component
 */
export interface SpinnerProps {
  /** Size of the spinner: 'small', 'medium', 'large', or a custom numeric value in pixels */
  size?: string | number;
  /** Color of the spinner: 'primary', 'secondary', 'error', 'warning', 'info', 'success', or a custom color string */
  color?: string;
  /** Border thickness of the spinner in pixels */
  thickness?: number;
  /** Optional CSS class name for additional styling */
  className?: string;
}

/**
 * Props for the styled spinner container
 */
interface SpinnerContainerProps {
  dimension: number;
  spinnerColor: string;
  thickness: number;
}

/**
 * Styled container for the spinner with animation
 */
const SpinnerContainer = styled.div<SpinnerContainerProps>`
  ${flexCenter()};
  width: ${props => props.dimension}px;
  height: ${props => props.dimension}px;
  border-radius: 50%;
  border: ${props => props.thickness}px solid rgba(0, 0, 0, 0.1);
  border-top-color: ${props => props.spinnerColor};
  ${props => respectedMotionPreferences(css`
    animation: ${rotateKeyframes} 1s linear infinite;
  `)};
`;

/**
 * Spinner component for indicating loading states
 * 
 * @example
 * <Spinner />
 * <Spinner size="large" color="primary" />
 * <Spinner size={40} color="#FF5722" thickness={3} />
 */
const Spinner: React.FC<SpinnerProps> = React.memo(({
  size = 'medium',
  color = 'primary',
  thickness = 2,
  className = '',
}) => {
  // Determine spinner dimension based on size prop
  let dimension: number;
  if (typeof size === 'number') {
    dimension = size;
  } else {
    switch (size) {
      case 'small':
        dimension = 24;
        break;
      case 'large':
        dimension = 48;
        break;
      case 'medium':
      default:
        dimension = 36;
        break;
    }
  }

  // Determine spinner color based on color prop
  let spinnerColor: string;
  if (color in colors) {
    spinnerColor = colors[color as keyof typeof colors].main || colors.primary.main;
  } else if (color in colors.primary) {
    spinnerColor = colors.primary[color as keyof typeof colors.primary] || colors.primary.main;
  } else {
    spinnerColor = color; // Use the color string directly if not found in theme
  }

  return (
    <SpinnerContainer
      dimension={dimension}
      spinnerColor={spinnerColor}
      thickness={thickness}
      className={className}
      role="status"
      aria-label="Loading"
    />
  );
});

Spinner.displayName = 'Spinner';

export default Spinner;