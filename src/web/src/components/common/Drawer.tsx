import React, { useEffect, useCallback, KeyboardEvent, useRef } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { Drawer as MuiDrawer, DrawerProps as MuiDrawerProps } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon } from '@mui/icons-material';

import Button from './Button';
import Typography from './Typography';
import Paper from './Paper';
import { drawerStyles } from '../../styles/components';
import { transition, flexColumn } from '../../styles/mixins';
import { ThemeTypes } from '../../types';

/**
 * Props for the Drawer component
 */
export interface DrawerProps extends Omit<MuiDrawerProps, 'anchor' | 'variant' | 'open' | 'onClose'> {
  /** Whether the drawer is open */
  open: boolean;
  /** Which edge the drawer should appear from */
  anchor?: 'left' | 'right' | 'top' | 'bottom';
  /** The variant of the drawer */
  variant?: 'temporary' | 'persistent' | 'permanent';
  /** Width of the drawer for left/right anchors */
  width?: number | string;
  /** Height of the drawer for top/bottom anchors */
  height?: number | string;
  /** Title to display in the drawer header */
  title?: string | React.ReactNode;
  /** Callback fired when the drawer should close */
  onClose?: () => void;
  /** Whether to close the drawer when clicking on the backdrop */
  closeOnBackdropClick?: boolean;
  /** Whether to close the drawer when pressing Escape */
  closeOnEscape?: boolean;
  /** Elevation shadow depth (0-24) */
  elevation?: number;
  /** CSS class name */
  className?: string;
  /** Drawer content */
  children?: React.ReactNode;
}

/**
 * Styled version of MuiDrawer with custom styling
 */
const StyledDrawer = styled(MuiDrawer)<{
  anchor: 'left' | 'right' | 'top' | 'bottom';
  variant: 'temporary' | 'persistent' | 'permanent';
  width: string | number;
  height: string | number;
  elevation: number;
}>`
  ${props => drawerStyles({
    anchor: props.anchor,
    variant: props.variant,
    open: props.open,
    width: props.width,
    height: props.height
  })};
  
  /* Customize the Paper component inside the drawer */
  .MuiDrawer-paper {
    width: ${props => 
      (props.anchor === 'left' || props.anchor === 'right') 
        ? (typeof props.width === 'number' ? `${props.width}px` : props.width)
        : '100%'};
    height: ${props => 
      (props.anchor === 'top' || props.anchor === 'bottom') 
        ? (typeof props.height === 'number' ? `${props.height}px` : props.height)
        : '100%'};
    box-shadow: ${props => props.theme.shadows[props.elevation]};
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
`;

/**
 * Header section of the drawer with title and close button
 */
const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px; /* md spacing */
  border-bottom: 1px solid ${props => props.theme.palette.divider};
  flex-shrink: 0;
  min-height: 64px;
  position: sticky;
  top: 0;
  background-color: ${props => props.theme.palette.background.paper};
  z-index: 1;
`;

/**
 * Content container for drawer children
 */
const DrawerContent = styled.div`
  ${flexColumn()};
  padding: 16px; /* md spacing */
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
`;

/**
 * Close button in the drawer header
 */
const CloseButton = styled(Button)`
  margin-left: 16px; /* md spacing */
  min-width: auto;
  padding: 8px; /* sm spacing */
`;

/**
 * A customizable drawer component that provides a sliding panel from any edge of the screen.
 * Extends Material-UI's Drawer with additional styling, variants, and accessibility features.
 */
const Drawer = React.memo<DrawerProps>((props) => {
  const {
    open,
    anchor = 'right',
    variant = 'temporary',
    width = 320,
    height = 320,
    title,
    onClose,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    elevation = 4,
    className,
    children,
    ...rest
  } = props;

  const theme = useTheme();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Save previous focus when drawer opens
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // Focus management for accessibility
  useEffect(() => {
    if (open && closeButtonRef.current) {
      // Focus the close button when drawer opens
      closeButtonRef.current.focus();
    } else if (!open && previousFocus.current) {
      // Restore focus when drawer closes
      previousFocus.current.focus();
    }
  }, [open]);

  // Handle Escape key press
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (closeOnEscape && open && event.key === 'Escape' && onClose) {
      onClose();
    }
  }, [closeOnEscape, open, onClose]);

  // Handle backdrop click - MUI's Drawer onClose is called when backdrop is clicked
  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdropClick && onClose) {
      onClose();
    }
  }, [closeOnBackdropClick, onClose]);

  return (
    <StyledDrawer
      open={open}
      anchor={anchor}
      variant={variant}
      width={width}
      height={height}
      elevation={elevation}
      className={className}
      onKeyDown={handleKeyDown}
      onClose={handleBackdropClick}
      // Accessibility attributes
      aria-labelledby={title ? 'drawer-title' : undefined}
      aria-modal={variant === 'temporary'}
      role={variant === 'temporary' ? 'dialog' : undefined}
      {...rest}
    >
      {title && (
        <DrawerHeader>
          <Typography 
            variant="h6"
            id="drawer-title"
          >
            {title}
          </Typography>
          {onClose && (
            <CloseButton
              ref={closeButtonRef}
              variant="text"
              color="default"
              aria-label="Close drawer"
              onClick={onClose}
              size="small"
            >
              <CloseIcon />
            </CloseButton>
          )}
        </DrawerHeader>
      )}
      <DrawerContent>
        {children}
      </DrawerContent>
    </StyledDrawer>
  );
});

Drawer.displayName = 'Drawer';

export default Drawer;