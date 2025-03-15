import { keyframes, css } from '@emotion/react';
import { transitions } from './variables';

/**
 * Keyframe Definitions
 * These define the animation sequences that can be applied to elements
 */

/**
 * Fade in animation from transparent to fully visible
 */
export const fadeInKeyframes = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

/**
 * Fade out animation from fully visible to transparent
 */
export const fadeOutKeyframes = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

/**
 * Slide in animation from the left side
 */
export const slideInLeftKeyframes = keyframes`
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
`;

/**
 * Slide in animation from the right side
 */
export const slideInRightKeyframes = keyframes`
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
`;

/**
 * Slide in animation from the top
 */
export const slideInTopKeyframes = keyframes`
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
`;

/**
 * Slide in animation from the bottom
 */
export const slideInBottomKeyframes = keyframes`
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
`;

/**
 * Slide out animation to the left side
 */
export const slideOutLeftKeyframes = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
`;

/**
 * Slide out animation to the right side
 */
export const slideOutRightKeyframes = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
`;

/**
 * Slide out animation to the top
 */
export const slideOutTopKeyframes = keyframes`
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-100%);
  }
`;

/**
 * Slide out animation to the bottom
 */
export const slideOutBottomKeyframes = keyframes`
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
`;

/**
 * Rotation animation (clockwise)
 */
export const rotateKeyframes = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

/**
 * Pulse animation that scales an element up and down
 */
export const pulseKeyframes = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

/**
 * Bounce animation that moves an element up and down
 */
export const bounceKeyframes = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
`;

/**
 * Shake animation for error states or attention-grabbing
 */
export const shakeKeyframes = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-5px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(5px);
  }
`;

/**
 * Expand animation for accordions and expandable panels
 */
export const expandKeyframes = keyframes`
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 1000px;
    opacity: 1;
  }
`;

/**
 * Collapse animation for accordions and expandable panels
 */
export const collapseKeyframes = keyframes`
  from {
    max-height: 1000px;
    opacity: 1;
  }
  to {
    max-height: 0;
    opacity: 0;
  }
`;

/**
 * Animation Utility Functions
 * These functions create ready-to-use animations with customizable parameters
 */

/**
 * Creates a fade-in animation with configurable duration and easing
 * 
 * @param duration - Animation duration in milliseconds
 * @param easing - CSS easing function
 * @returns CSS properties for fade-in animation
 */
export const fadeIn = (
  duration: number = transitions.duration.standard,
  easing: string = transitions.easing.easeInOut
) => css`
  animation: ${fadeInKeyframes} ${duration}ms ${easing};
  animation-fill-mode: forwards;
`;

/**
 * Creates a fade-out animation with configurable duration and easing
 * 
 * @param duration - Animation duration in milliseconds
 * @param easing - CSS easing function
 * @returns CSS properties for fade-out animation
 */
export const fadeOut = (
  duration: number = transitions.duration.standard,
  easing: string = transitions.easing.easeInOut
) => css`
  animation: ${fadeOutKeyframes} ${duration}ms ${easing};
  animation-fill-mode: forwards;
`;

/**
 * Creates a slide-in animation from a specified direction
 * 
 * @param direction - Direction from which to slide in ('left', 'right', 'top', 'bottom')
 * @param distance - Distance in pixels for custom slide amount (for partial slides)
 * @param duration - Animation duration in milliseconds
 * @param easing - CSS easing function
 * @returns CSS properties for slide-in animation
 */
export const slideIn = (
  direction: 'left' | 'right' | 'top' | 'bottom' = 'left',
  distance: number = 20,
  duration: number = transitions.duration.standard,
  easing: string = transitions.easing.easeOut
) => {
  let keyframeAnimation;
  let transform;

  switch (direction) {
    case 'left':
      keyframeAnimation = slideInLeftKeyframes;
      transform = `translateX(-${distance}px)`;
      break;
    case 'right':
      keyframeAnimation = slideInRightKeyframes;
      transform = `translateX(${distance}px)`;
      break;
    case 'top':
      keyframeAnimation = slideInTopKeyframes;
      transform = `translateY(-${distance}px)`;
      break;
    case 'bottom':
      keyframeAnimation = slideInBottomKeyframes;
      transform = `translateY(${distance}px)`;
      break;
    default:
      keyframeAnimation = slideInLeftKeyframes;
      transform = `translateX(-${distance}px)`;
  }

  return css`
    animation: ${keyframeAnimation} ${duration}ms ${easing};
    animation-fill-mode: forwards;
    transform: ${transform};
    will-change: transform;
  `;
};

/**
 * Creates a slide-out animation in a specified direction
 * 
 * @param direction - Direction to which to slide out ('left', 'right', 'top', 'bottom')
 * @param distance - Distance in pixels for custom slide amount (for partial slides)
 * @param duration - Animation duration in milliseconds
 * @param easing - CSS easing function
 * @returns CSS properties for slide-out animation
 */
export const slideOut = (
  direction: 'left' | 'right' | 'top' | 'bottom' = 'left',
  distance: number = 20,
  duration: number = transitions.duration.standard,
  easing: string = transitions.easing.easeIn
) => {
  let keyframeAnimation;
  
  switch (direction) {
    case 'left':
      keyframeAnimation = slideOutLeftKeyframes;
      break;
    case 'right':
      keyframeAnimation = slideOutRightKeyframes;
      break;
    case 'top':
      keyframeAnimation = slideOutTopKeyframes;
      break;
    case 'bottom':
      keyframeAnimation = slideOutBottomKeyframes;
      break;
    default:
      keyframeAnimation = slideOutLeftKeyframes;
  }

  return css`
    animation: ${keyframeAnimation} ${duration}ms ${easing};
    animation-fill-mode: forwards;
    will-change: transform;
  `;
};

/**
 * Creates a rotation animation with configurable duration, easing, and degrees
 * 
 * @param duration - Animation duration in milliseconds
 * @param easing - CSS easing function
 * @param degrees - Rotation degree amount (e.g., 360 for full rotation)
 * @returns CSS properties for rotation animation
 */
export const rotate = (
  duration: number = transitions.duration.standard,
  easing: string = transitions.easing.easeInOut,
  degrees: number = 360
) => {
  const customRotateKeyframes = keyframes`
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(${degrees}deg);
    }
  `;

  return css`
    animation: ${customRotateKeyframes} ${duration}ms ${easing} infinite;
    animation-fill-mode: forwards;
    transform-origin: center center;
    will-change: transform;
  `;
};

/**
 * Creates a pulsing animation that scales an element up and down
 * 
 * @param duration - Animation duration in milliseconds
 * @param easing - CSS easing function
 * @param scale - Maximum scale factor (e.g., 1.05 for 5% growth)
 * @returns CSS properties for pulse animation
 */
export const pulse = (
  duration: number = transitions.duration.standard,
  easing: string = transitions.easing.easeInOut,
  scale: number = 1.05
) => {
  const customPulseKeyframes = keyframes`
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(${scale});
    }
    100% {
      transform: scale(1);
    }
  `;

  return css`
    animation: ${customPulseKeyframes} ${duration}ms ${easing} infinite;
    animation-fill-mode: forwards;
    will-change: transform;
  `;
};

/**
 * Creates a bouncing animation for elements
 * 
 * @param duration - Animation duration in milliseconds
 * @param easing - CSS easing function
 * @param height - Maximum bounce height in pixels
 * @returns CSS properties for bounce animation
 */
export const bounce = (
  duration: number = transitions.duration.standard,
  easing: string = transitions.easing.easeOut,
  height: number = 10
) => {
  const customBounceKeyframes = keyframes`
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-${height}px);
    }
  `;

  return css`
    animation: ${customBounceKeyframes} ${duration}ms ${easing} infinite;
    animation-fill-mode: forwards;
    will-change: transform;
  `;
};

/**
 * Creates a shaking animation for error states or attention-grabbing
 * 
 * @param duration - Animation duration in milliseconds
 * @param easing - CSS easing function
 * @param distance - Maximum shake distance in pixels
 * @returns CSS properties for shake animation
 */
export const shake = (
  duration: number = 500,
  easing: string = transitions.easing.sharp,
  distance: number = 5
) => {
  const customShakeKeyframes = keyframes`
    0%, 100% {
      transform: translateX(0);
    }
    10%, 30%, 50%, 70%, 90% {
      transform: translateX(-${distance}px);
    }
    20%, 40%, 60%, 80% {
      transform: translateX(${distance}px);
    }
  `;

  return css`
    animation: ${customShakeKeyframes} ${duration}ms ${easing};
    animation-fill-mode: forwards;
    will-change: transform;
  `;
};

/**
 * Creates an expand/collapse animation for accordions and expandable panels
 * 
 * @param isExpanded - Whether the element is expanded
 * @param duration - Animation duration in milliseconds
 * @param easing - CSS easing function
 * @returns CSS properties for expand/collapse animation
 */
export const expandCollapse = (
  isExpanded: boolean,
  duration: number = transitions.duration.standard,
  easing: string = transitions.easing.easeInOut
) => {
  return isExpanded
    ? css`
        animation: ${expandKeyframes} ${duration}ms ${easing};
        animation-fill-mode: forwards;
        overflow: hidden;
      `
    : css`
        animation: ${collapseKeyframes} ${duration}ms ${easing};
        animation-fill-mode: forwards;
        overflow: hidden;
      `;
};

/**
 * Wraps animations to respect user's reduced motion preferences
 * 
 * @param animationStyles - The animation CSS to be applied if motion is allowed
 * @returns CSS properties that respect motion preferences
 */
export const respectedMotionPreferences = (animationStyles: any) => css`
  ${animationStyles}
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;