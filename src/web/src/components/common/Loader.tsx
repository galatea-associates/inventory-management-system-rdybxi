import React from 'react'; // ^18.2.0
import styled from '@emotion/styled'; // ^11.10.6
import { flexCenter } from '../../styles/mixins';
import { colors } from '../../styles/variables';
import { respectedMotionPreferences } from '../../styles/animations';
import Spinner from './Spinner';

/**
 * Props for the Loader component
 */
export interface LoaderProps {
  /** 
   * Size of the loader: 'small', 'medium', 'large', or a custom numeric value 
   * @default 'medium'
   */
  size?: string;
  /** 
   * Color of the loader: 'primary', 'secondary', etc. or a custom color string 
   * @default 'primary'
   */
  color?: string;
  /** 
   * Whether to show the loader as an overlay on its container 
   * @default false
   */
  overlay?: boolean;
  /** 
   * Whether to show the loader full-screen 
   * @default false
   */
  fullScreen?: boolean;
  /** 
   * Optional text to display below the spinner 
   * @default ''
   */
  text?: string;
  /** 
   * Optional CSS class name 
   * @default ''
   */
  className?: string;
}

/**
 * Base container for the loader component
 */
const LoaderContainer = styled.div`
  ${flexCenter()};
  flex-direction: column;
`;

/**
 * Container for overlay variant of loader
 */
const OverlayLoader = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  ${flexCenter()};
  flex-direction: column;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 10;
`;

/**
 * Container for full-screen variant of loader
 */
const FullScreenLoader = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  ${flexCenter()};
  flex-direction: column;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 1500;
`;

/**
 * Text element for loader
 */
const LoaderText = styled.div`
  margin-top: 16px;
  color: ${colors.text.primary};
  font-size: 1rem;
`;

/**
 * A versatile loading indicator component that provides visual feedback 
 * during asynchronous operations with configurable size, appearance, and overlay capabilities.
 * 
 * @param {LoaderProps} props - The component props
 * @returns {JSX.Element} The rendered Loader component
 * 
 * @example
 * // Basic usage
 * <Loader />
 * 
 * // With text
 * <Loader text="Loading data..." />
 * 
 * // As an overlay
 * <Loader overlay />
 * 
 * // Full-screen loader
 * <Loader fullScreen text="Processing transaction..." />
 */
const Loader: React.FC<LoaderProps> = React.memo(({
  size = 'medium',
  color = 'primary',
  overlay = false,
  fullScreen = false,
  text = '',
  className = '',
}) => {
  // Render full-screen loader
  if (fullScreen) {
    return (
      <FullScreenLoader className={className} aria-live="polite" role="status">
        <Spinner size={size} color={color} />
        {text && <LoaderText>{text}</LoaderText>}
      </FullScreenLoader>
    );
  }

  // Render overlay loader
  if (overlay) {
    return (
      <OverlayLoader className={className} aria-live="polite" role="status">
        <Spinner size={size} color={color} />
        {text && <LoaderText>{text}</LoaderText>}
      </OverlayLoader>
    );
  }

  // Render standard loader
  return (
    <LoaderContainer className={className} aria-live="polite" role="status">
      <Spinner size={size} color={color} />
      {text && <LoaderText>{text}</LoaderText>}
    </LoaderContainer>
  );
});

// Add display name for debugging purposes
Loader.displayName = 'Loader';

export default Loader;