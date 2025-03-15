import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { Portal } from '@mui/material'; // v5.13
import { tooltipStyles } from '../../styles/components';
import { useClickOutside } from '../../hooks/useClickOutside';
import Typography from './Typography';

/**
 * Props for the Tooltip component
 */
export interface TooltipProps {
  /** The element that triggers the tooltip */
  children: React.ReactNode;
  /** Content to display in the tooltip */
  title: string | React.ReactNode;
  /** Position of the tooltip relative to the trigger element */
  placement?: 'top' | 'right' | 'bottom' | 'left';
  /** Size of the tooltip */
  size?: 'small' | 'medium' | 'large';
  /** Color scheme of the tooltip */
  color?: 'dark' | 'light' | 'primary' | 'error';
  /** How the tooltip is triggered */
  trigger?: 'hover' | 'focus' | 'click';
  /** Whether the tooltip is open (for controlled component usage) */
  open?: boolean;
  /** Callback fired when the tooltip requests to be closed */
  onClose?: () => void;
  /** Whether to display the tooltip arrow */
  arrow?: boolean;
  /** Delay in ms before showing the tooltip */
  enterDelay?: number;
  /** Delay in ms before hiding the tooltip */
  leaveDelay?: number;
}

/**
 * Styled component for the tooltip content
 */
const StyledTooltipContent = styled.div<{
  placement: string;
  size: string;
  color: string;
}>`
  ${({ placement, size, color }) => tooltipStyles({ placement, size, color })}
`;

/**
 * Container for the tooltip trigger element
 */
const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
`;

/**
 * A customizable tooltip component that displays informational text when hovering over
 * or focusing on an element. Supports different placements, sizes, colors, and trigger methods.
 * 
 * @example
 * // Simple usage
 * <Tooltip title="Help text">
 *   <Button>Hover me</Button>
 * </Tooltip>
 * 
 * @example
 * // Advanced usage
 * <Tooltip 
 *   title="Click to learn more" 
 *   placement="bottom" 
 *   color="primary"
 *   trigger="click"
 *   enterDelay={300}
 * >
 *   <IconButton>
 *     <InfoIcon />
 *   </IconButton>
 * </Tooltip>
 */
const Tooltip = React.memo(({
  children,
  title,
  placement = 'top',
  size = 'medium',
  color = 'dark',
  trigger = 'hover',
  open,
  onClose,
  arrow = true,
  enterDelay = 100,
  leaveDelay = 0,
  ...otherProps
}: TooltipProps) => {
  // State for managing tooltip visibility (for uncontrolled usage)
  const [isVisible, setIsVisible] = useState(false);
  
  // Determine if component is controlled or uncontrolled
  const isControlled = open !== undefined;
  const shouldShow = isControlled ? open : isVisible;
  
  // Refs for the tooltip container and content elements
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Refs for delay timers
  const enterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // State for tooltip position
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  // Handle click outside for click-triggered tooltips
  useClickOutside(tooltipRef, () => {
    if (trigger === 'click' && shouldShow) {
      handleClose();
    }
  });
  
  // Calculate tooltip position based on trigger element
  const calculatePosition = () => {
    if (!containerRef.current || !tooltipRef.current) return;
    
    const triggerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let top = 0;
    let left = 0;
    
    // Calculate position based on placement
    switch (placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.right + 8;
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.left - tooltipRect.width - 8;
        break;
    }
    
    // Ensure tooltip stays within viewport
    const padding = 10;
    if (left < padding) left = padding;
    if (top < padding) top = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding;
    }
    
    setPosition({ top, left });
  };
  
  // Handle showing the tooltip
  const handleShow = () => {
    // Clear any existing timers
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    
    // Show tooltip after delay or immediately
    if (enterDelay > 0) {
      enterTimerRef.current = setTimeout(() => {
        if (!isControlled) setIsVisible(true);
      }, enterDelay);
    } else {
      if (!isControlled) setIsVisible(true);
    }
  };
  
  // Handle hiding the tooltip
  const handleHide = () => {
    // Clear any existing timers
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    
    // Hide tooltip after delay or immediately
    if (leaveDelay > 0) {
      leaveTimerRef.current = setTimeout(() => {
        handleClose();
      }, leaveDelay);
    } else {
      handleClose();
    }
  };
  
  // Unified close handler for both controlled and uncontrolled modes
  const handleClose = () => {
    if (!isControlled) setIsVisible(false);
    if (onClose) onClose();
  };
  
  // Toggle visibility for click-triggered tooltips
  const handleClick = () => {
    if (trigger === 'click') {
      if (shouldShow) {
        handleHide();
      } else {
        handleShow();
      }
    }
  };
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);
  
  // Handle position calculation when tooltip becomes visible
  useEffect(() => {
    if (shouldShow) {
      calculatePosition();
      
      // Recalculate on window resize
      const handleResize = () => calculatePosition();
      window.addEventListener('resize', handleResize);
      
      // Clean up event listener
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [shouldShow, placement]);
  
  // Set up event handlers based on trigger type
  const eventHandlers = (() => {
    if (trigger === 'hover') {
      return {
        onMouseEnter: handleShow,
        onMouseLeave: handleHide,
      };
    } else if (trigger === 'focus') {
      return {
        onFocus: handleShow,
        onBlur: handleHide,
      };
    } else if (trigger === 'click') {
      return {
        onClick: handleClick,
      };
    }
    return {};
  })();
  
  return (
    <TooltipContainer ref={containerRef} {...eventHandlers} {...otherProps}>
      {children}
      
      {shouldShow && (
        <Portal>
          <StyledTooltipContent
            ref={tooltipRef}
            placement={placement}
            size={size}
            color={color}
            className={`tooltip ${shouldShow ? 'visible' : ''}`}
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 1500,
            }}
            role="tooltip"
            aria-live="polite"
          >
            {typeof title === 'string' ? (
              <Typography variant="body2" color="inherit">
                {title}
              </Typography>
            ) : (
              title
            )}
          </StyledTooltipContent>
        </Portal>
      )}
    </TooltipContainer>
  );
});

Tooltip.displayName = 'Tooltip';

export default Tooltip;