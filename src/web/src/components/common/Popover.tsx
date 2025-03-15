import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { Popper, Fade, Grow, Slide, PopperProps } from '@mui/material';
import { popoverStyles } from '../../styles/components';
import { getThemeColor, conditionalStyle } from '../../styles/utils';
import { fadeIn, fadeOut, slideIn } from '../../styles/animations';
import useClickOutside from '../../hooks/useClickOutside';
import Paper from './Paper';

/**
 * Props for the Popover component
 */
export interface PopoverProps {
  /** The anchor element to attach the popover to */
  anchorEl: HTMLElement | null;
  /** Whether the popover is open */
  open: boolean;
  /** Callback when the popover is closed */
  onClose: () => void;
  /** Content of the popover */
  children: React.ReactNode;
  /** Placement of the popover relative to the anchor element */
  placement?: string;
  /** Animation type (fade, grow, slide) */
  animation?: string;
  /** Elevation level for shadow depth */
  elevation?: number;
  /** Maximum width of the popover */
  maxWidth?: number | string;
  /** Maximum height of the popover */
  maxHeight?: number | string;
  /** If true, the popover will render in place without using portal */
  disablePortal?: boolean;
  /** If true, clicking outside won't close the popover */
  disableClickAway?: boolean;
  /** Custom keyboard event handler */
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

/**
 * Styled Paper component for the popover container
 */
export const StyledPopover = styled(Paper)<{
  elevation?: number;
  placement?: string;
}>`
  position: relative;
  z-index: ${({ theme }) => theme.zIndex?.popover || 1400};
  border-radius: ${({ theme }) => theme.borderRadius?.medium || '8px'};
  overflow: hidden;
  box-shadow: ${props => 
    props.theme?.shadows?.[props.elevation || 2] || 
    `0 ${props.elevation || 2}px ${(props.elevation || 2) * 2}px rgba(0, 0, 0, 0.2)`
  };
  background-color: ${() => getThemeColor('background.paper')};
`;

/**
 * Styled container for popover content
 */
export const PopoverContent = styled.div<{
  maxWidth?: number | string;
  maxHeight?: number | string;
}>`
  padding: ${({ theme }) => theme.spacing ? theme.spacing(2) : '16px'};
  max-width: ${props => props.maxWidth || '300px'};
  max-height: ${props => props.maxHeight || '500px'};
  overflow: auto;
`;

/**
 * Popover component provides a floating content container that can be anchored to any element.
 * It supports various positioning options, animations, and accessibility features.
 */
const Popover = React.memo<PopoverProps>((props) => {
  const {
    anchorEl,
    open,
    onClose,
    children,
    placement = 'bottom',
    animation = 'fade',
    elevation = 2,
    maxWidth = '300px',
    maxHeight = '500px',
    disablePortal = false,
    disableClickAway = false,
    onKeyDown,
    ...otherProps
  } = props;

  // Create a ref for the popover container
  const popoverRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close the popover
  useClickOutside(popoverRef, (event) => {
    if (!disableClickAway && open) {
      onClose();
    }
  });

  // Handle keyboard events for accessibility (Escape key to close)
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onKeyDown) {
      onKeyDown(event);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  // Configure positioning modifiers
  const modifiers = useMemo(() => [
    {
      name: 'offset',
      options: {
        offset: [0, 8], // 8px offset from the anchor element
      },
    },
    {
      name: 'preventOverflow',
      options: {
        boundary: 'viewport',
        padding: 8,
      },
    },
  ], []);

  // Select the appropriate transition component based on animation type
  const TransitionComponent = useMemo(() => {
    switch (animation) {
      case 'grow':
        return Grow;
      case 'slide':
        return Slide;
      case 'fade':
      default:
        return Fade;
    }
  }, [animation]);

  // Configure transition properties
  const transitionProps = useMemo(() => {
    const baseProps = {
      in: open,
      timeout: {
        enter: 225,
        exit: 195,
      },
    };

    if (animation === 'slide') {
      return {
        ...baseProps,
        direction: getSlideDirection(placement),
      };
    }

    return baseProps;
  }, [animation, open, placement]);

  // Helper to determine slide direction based on placement
  const getSlideDirection = (placement: string): 'left' | 'right' | 'up' | 'down' => {
    if (placement.startsWith('top')) return 'down';
    if (placement.startsWith('bottom')) return 'up';
    if (placement.startsWith('left')) return 'right';
    return 'left';
  };

  // Don't render anything if there's no anchor element
  if (!anchorEl) {
    return null;
  }

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement={placement as any}
      transition
      disablePortal={disablePortal}
      modifiers={modifiers}
      {...otherProps}
    >
      {({ TransitionProps }) => (
        <TransitionComponent {...TransitionProps} {...transitionProps}>
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="false"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            <StyledPopover elevation={elevation} placement={placement}>
              <PopoverContent maxWidth={maxWidth} maxHeight={maxHeight}>
                {children}
              </PopoverContent>
            </StyledPopover>
          </div>
        </TransitionComponent>
      )}
    </Popper>
  );
});

Popover.displayName = 'Popover';

export default Popover;