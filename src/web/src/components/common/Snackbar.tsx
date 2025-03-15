import React from 'react'; // v18.2.0
import styled from '@emotion/styled'; // v11.10.6
import { css } from '@emotion/react'; // v11.10.6
import { Snackbar as MuiSnackbar, SnackbarProps as MuiSnackbarProps } from '@mui/material'; // 5.13
import { useTheme } from '@mui/material/styles'; // 5.13
import { IconButton } from '@mui/material'; // 5.13
import { Close as CloseIcon } from '@mui/icons-material'; // 5.13

import Alert from './Alert';
import Typography from './Typography';
import { 
  fadeIn, 
  fadeOut, 
  slideIn, 
  slideOut, 
  respectedMotionPreferences 
} from '../../styles/animations';
import { spacing, zIndex } from '../../styles/variables';
import { ThemeTypes } from '../../types';

/**
 * Props for the Snackbar component
 * Extends MUI's SnackbarProps with additional custom properties
 */
export interface SnackbarProps extends Omit<MuiSnackbarProps, 'children'> {
  /** Content to display in the snackbar */
  message: React.ReactNode;
  /** Optional severity level for Alert-based snackbars */
  severity?: 'success' | 'error' | 'warning' | 'info';
  /** Animation type for snackbar entrance/exit */
  animation?: 'fade' | 'slide' | 'none';
  /** Direction for slide animations */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Optional title for Alert-based snackbars */
  title?: string;
  /** Disables auto-hiding of the snackbar when true */
  disableAutoHide?: boolean;
}

/**
 * Styled version of Material-UI Snackbar with custom styling
 */
const StyledSnackbar = styled(MuiSnackbar)<SnackbarProps>(({ theme }) => ({
  zIndex: zIndex.notification,
  position: 'fixed',
  '& .MuiSnackbarContent-root': {
    minWidth: '300px',
    maxWidth: '600px',
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[4],
    '@media (max-width: 600px)': {
      width: 'calc(100% - 32px)',
      maxWidth: 'none',
      margin: '0 16px'
    }
  },
  // Make sure snackbar appears above other UI elements
  '&.MuiSnackbar-root': {
    top: ({ anchorOrigin }) => anchorOrigin?.vertical === 'top' ? spacing.lg : undefined,
    bottom: ({ anchorOrigin }) => anchorOrigin?.vertical === 'bottom' ? spacing.lg : undefined,
  }
}));

/**
 * Styled container for snackbar content
 */
const SnackbarContent = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: `${spacing.xs}px ${spacing.md}px`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  '& > *:not(:last-child)': {
    marginRight: spacing.sm
  }
}));

/**
 * Styled close button for snackbar
 */
const CloseButton = styled(IconButton)(({ theme }) => ({
  marginLeft: 'auto',
  padding: spacing.xs,
  color: theme.palette.text.secondary,
  '&:hover': {
    color: theme.palette.text.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.04)'
  }
}));

/**
 * Determines the appropriate animation styles based on the animation type and direction
 * 
 * @param animationType - Type of animation to apply (fade, slide, or none)
 * @param direction - Direction for slide animations
 * @returns CSS properties for the specified animation
 */
const getAnimationStyles = (animationType: string, direction: string) => {
  // Map the animation type to the appropriate animation function
  switch(animationType) {
    case 'fade':
      return css`
        &.MuiSnackbar-root {
          &.MuiSnackbar-entered {
            ${respectedMotionPreferences(fadeIn(300))}
          }
          &.MuiSnackbar-exited {
            ${respectedMotionPreferences(fadeOut(200))}
          }
        }
      `;
    case 'slide':
      return css`
        &.MuiSnackbar-root {
          &.MuiSnackbar-entered {
            ${respectedMotionPreferences(slideIn(direction as 'up' | 'down' | 'left' | 'right', 20, 300))}
          }
          &.MuiSnackbar-exited {
            ${respectedMotionPreferences(slideOut(direction as 'up' | 'down' | 'left' | 'right', 20, 200))}
          }
        }
      `;
    case 'none':
    default:
      return css``;
  }
};

/**
 * Enhanced snackbar component with custom styling and animation options
 * 
 * This component extends Material-UI's Snackbar with additional styling, 
 * animation options, and integration with the Alert component for different
 * severity levels.
 * 
 * @example
 * // Basic usage
 * <Snackbar 
 *   open={open} 
 *   message="Operation successful" 
 *   onClose={handleClose} 
 * />
 * 
 * @example
 * // With severity for colored alert
 * <Snackbar 
 *   open={open} 
 *   message="Something went wrong" 
 *   severity="error"
 *   onClose={handleClose} 
 * />
 * 
 * @example
 * // With custom animation
 * <Snackbar 
 *   open={open} 
 *   message="File saved" 
 *   severity="success"
 *   animation="slide"
 *   direction="left"
 *   onClose={handleClose} 
 * />
 */
const Snackbar = React.memo(({
  open,
  message,
  severity,
  title,
  autoHideDuration = 5000,
  onClose,
  action,
  animation = 'slide',
  direction = 'up',
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
  disableAutoHide = false,
  ...otherProps
}: SnackbarProps) => {
  const theme = useTheme() as ThemeTypes.CustomTheme;
  
  // Handle close button if onClose is provided and action is not specified
  const closeButton = onClose && !action ? (
    <CloseButton
      aria-label="close"
      size="small"
      onClick={(e) => onClose(e, 'closeButton')}
    >
      <CloseIcon fontSize="small" />
    </CloseButton>
  ) : null;

  // Create actual autoHideDuration value based on disableAutoHide prop
  const actualAutoHideDuration = disableAutoHide ? null : autoHideDuration;

  // Get animation styles based on type and direction
  const animationStyles = getAnimationStyles(animation, direction);

  return (
    <StyledSnackbar
      open={open}
      autoHideDuration={actualAutoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      css={animationStyles}
      {...otherProps}
    >
      {severity ? (
        // If severity is provided, wrap message in Alert component
        <Alert 
          severity={severity}
          title={title}
          onClose={onClose ? (e) => onClose(e, 'closeButton') : undefined}
          action={action}
        >
          {typeof message === 'string' ? (
            <Typography variant="body2" color="inherit">
              {message}
            </Typography>
          ) : (
            message
          )}
        </Alert>
      ) : (
        // If no severity, use standard snackbar content
        <SnackbarContent>
          {typeof message === 'string' ? (
            <Typography variant="body2">{message}</Typography>
          ) : (
            message
          )}
          {action || closeButton}
        </SnackbarContent>
      )}
    </StyledSnackbar>
  );
});

Snackbar.displayName = 'Snackbar';

export default Snackbar;