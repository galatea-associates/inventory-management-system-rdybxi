import React from 'react';
import styled from '@emotion/styled';
import { Alert as MuiAlert, AlertProps } from '@mui/material';
import AlertTitle from '@mui/material/AlertTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from './Typography';
import { getThemeColor, conditionalStyle, createColorStyles, createVariantStyles } from '../../styles/utils';
import { colors, spacing, borderRadius } from '../../styles/variables';

/**
 * Props specific to the custom Alert component
 */
export interface CustomAlertProps {
  /** Optional title for the alert */
  title?: string;
  /** Function to call when the close button is clicked */
  onClose?: () => void;
  /** Style variant of the alert */
  variant?: 'standard' | 'outlined' | 'filled';
}

/**
 * Creates styles for alert components with different variants and severities
 */
const alertStyles = (
  variant = 'standard',
  severity = 'info',
  outlined = false,
  filled = false
) => {
  // Base styles for all alerts
  const baseStyles = {
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    width: 'auto',
    boxSizing: 'border-box',
    marginBottom: spacing.md,
  };

  // Create color styles based on severity
  const colorStyles = createColorStyles(severity, {
    success: {
      backgroundColor: filled 
        ? getThemeColor('success', 'main')
        : outlined 
          ? 'transparent' 
          : getThemeColor('success', 'light', 0.2),
      color: filled 
        ? getThemeColor('success', 'contrastText')
        : getThemeColor('success', 'main'),
      borderColor: getThemeColor('success', 'main'),
    },
    error: {
      backgroundColor: filled 
        ? getThemeColor('error', 'main')
        : outlined 
          ? 'transparent' 
          : getThemeColor('error', 'light', 0.2),
      color: filled 
        ? getThemeColor('error', 'contrastText')
        : getThemeColor('error', 'main'),
      borderColor: getThemeColor('error', 'main'),
    },
    warning: {
      backgroundColor: filled 
        ? getThemeColor('warning', 'main')
        : outlined 
          ? 'transparent' 
          : getThemeColor('warning', 'light', 0.2),
      color: filled 
        ? getThemeColor('warning', 'contrastText')
        : getThemeColor('warning', 'main'),
      borderColor: getThemeColor('warning', 'main'),
    },
    info: {
      backgroundColor: filled 
        ? getThemeColor('info', 'main')
        : outlined 
          ? 'transparent' 
          : getThemeColor('info', 'light', 0.2),
      color: filled 
        ? getThemeColor('info', 'contrastText')
        : getThemeColor('info', 'main'),
      borderColor: getThemeColor('info', 'main'),
    },
  });

  // Create variant-specific styles
  const variantStyles = createVariantStyles(variant, {
    standard: {},
    outlined: {
      border: `1px solid ${colorStyles.borderColor}`,
    },
    filled: {
      boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)',
    },
  });

  // Responsive styles
  const responsiveStyles = {
    '@media (max-width: 600px)': {
      padding: `${spacing.xs}px ${spacing.sm}px`,
    },
  };

  // Styles for alert components
  const componentStyles = {
    '& .MuiAlert-icon': {
      padding: 0,
      marginRight: spacing.sm,
      fontSize: '1.25rem',
      opacity: 0.9,
      alignItems: 'center',
      display: 'flex',
      color: 'inherit',
    },
    '& .MuiAlert-message': {
      padding: 0,
      flexGrow: 1,
    },
    '& .MuiAlert-action': {
      padding: 0,
      marginRight: -spacing.xs,
      marginLeft: 'auto',
      alignItems: 'center',
      display: 'flex',
    },
    '& .MuiAlertTitle-root': {
      fontWeight: 'bold',
      marginBottom: spacing.xs,
      fontSize: '0.875rem',
    },
  };

  return {
    ...baseStyles,
    ...colorStyles,
    ...variantStyles,
    ...responsiveStyles,
    ...componentStyles,
    ...conditionalStyle(outlined, {
      backgroundColor: 'transparent',
    }),
    ...conditionalStyle(filled, {
      fontWeight: 500,
    }),
  };
};

/**
 * Styled version of Material-UI Alert with custom styling
 */
export const StyledAlert = styled(MuiAlert)<AlertProps & { outlined?: boolean; filled?: boolean }>(
  ({ variant = 'standard', severity = 'info', outlined = false, filled = false }) => 
    alertStyles(variant, severity, outlined, filled)
);

/**
 * Enhanced alert component with custom styling and additional features
 * 
 * This component extends Material-UI's Alert with additional styling, variants,
 * and accessibility features to match the application's design system. It provides
 * contextual feedback messages for typical user actions with support for different
 * severity levels and visual styles.
 *
 * @example
 * // Basic usage
 * <Alert severity="success">Operation successful!</Alert>
 *
 * // With title and close button
 * <Alert 
 *   severity="warning" 
 *   title="Warning" 
 *   onClose={() => setOpen(false)}
 * >
 *   This action cannot be undone.
 * </Alert>
 *
 * // With different variant
 * <Alert 
 *   severity="info"
 *   variant="outlined"
 *   title="Information"
 * >
 *   Your session will expire in 10 minutes.
 * </Alert>
 */
const Alert = React.memo((props: AlertProps & CustomAlertProps) => {
  const {
    severity = 'info',
    variant = 'standard',
    title,
    action,
    onClose,
    children,
    ...rest
  } = props;

  // Determine if the alert is outlined or filled based on variant
  const outlined = variant === 'outlined';
  const filled = variant === 'filled';

  // Handle close button if onClose is provided and action is not specified
  const closeButton = onClose && !action ? (
    <IconButton
      aria-label="close"
      color="inherit"
      size="small"
      onClick={onClose}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  ) : null;

  return (
    <StyledAlert
      severity={severity}
      variant={variant}
      outlined={outlined}
      filled={filled}
      action={action || closeButton}
      role="alert"
      {...rest}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {typeof children === 'string' ? (
        <Typography variant="body2" color="inherit">
          {children}
        </Typography>
      ) : (
        children
      )}
    </StyledAlert>
  );
});

Alert.displayName = 'Alert';

export default Alert;