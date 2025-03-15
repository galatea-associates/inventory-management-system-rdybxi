/**
 * Component Styles
 * 
 * This file provides reusable styling functions for UI components of the Inventory Management System.
 * Each function returns CSS properties to be used with styled components or emotion's css prop.
 * These styles ensure consistent visual styling across the application while supporting
 * variants, sizes, colors, and states for each component.
 */

import { css } from '@emotion/react'; // @emotion/react ^11.10.6
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions
} from './variables';
import {
  flexCenter,
  flexBetween,
  flexColumn,
  buttonBase,
  focusVisible,
  respondTo
} from './mixins';
import {
  getThemeColor,
  createVariantStyles,
  createSizeStyles,
  createColorStyles,
  createStateStyles
} from './utils';

/**
 * Button component styles
 * Returns CSS properties for buttons with variants, sizes, and colors
 */
export const buttonStyles = (props: {
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  fullWidth?: boolean;
  disabled?: boolean;
}) => {
  const {
    variant = 'contained',
    size = 'medium',
    color = 'primary',
    fullWidth = false,
    disabled = false
  } = props;

  // Define variant styles
  const variantStyles = {
    contained: {
      backgroundColor: getThemeColor(color),
      color: getThemeColor(color, 'contrastText'),
      boxShadow: shadows[2],
      '&:hover': {
        backgroundColor: getThemeColor(color, 'dark'),
        boxShadow: shadows[4]
      },
      '&:active': {
        boxShadow: shadows[8]
      },
      '&:disabled': {
        backgroundColor: colors.grey[300],
        color: colors.grey[500],
        boxShadow: 'none'
      }
    },
    outlined: {
      backgroundColor: 'transparent',
      color: getThemeColor(color),
      border: `1px solid ${getThemeColor(color)}`,
      '&:hover': {
        backgroundColor: getThemeColor(color, 'main', 0.04)
      },
      '&:active': {
        backgroundColor: getThemeColor(color, 'main', 0.12)
      },
      '&:disabled': {
        color: colors.grey[500],
        borderColor: colors.grey[300]
      }
    },
    text: {
      backgroundColor: 'transparent',
      color: getThemeColor(color),
      '&:hover': {
        backgroundColor: getThemeColor(color, 'main', 0.04)
      },
      '&:active': {
        backgroundColor: getThemeColor(color, 'main', 0.12)
      },
      '&:disabled': {
        color: colors.grey[500]
      }
    }
  };

  // Define size styles
  const sizeStyles = {
    small: {
      padding: `${spacing.xs}px ${spacing.sm}px`,
      fontSize: typography.fontSizes.sm,
      lineHeight: typography.lineHeights.sm,
      minHeight: '32px'
    },
    medium: {
      padding: `${spacing.sm}px ${spacing.md}px`,
      fontSize: typography.fontSizes.md,
      lineHeight: typography.lineHeights.md,
      minHeight: '40px'
    },
    large: {
      padding: `${spacing.md}px ${spacing.md}px`,
      fontSize: typography.fontSizes.lg,
      lineHeight: typography.lineHeights.lg,
      minHeight: '48px'
    }
  };

  return css`
    ${buttonBase()}
    font-family: ${typography.fontFamily};
    font-weight: ${typography.fontWeights.medium};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-radius: ${borderRadius.md}px;
    transition: background-color ${transitions.duration.short}ms ${transitions.easing.easeInOut},
                box-shadow ${transitions.duration.short}ms ${transitions.easing.easeInOut},
                border ${transitions.duration.short}ms ${transitions.easing.easeInOut};
    ${createVariantStyles(variant, variantStyles)}
    ${createSizeStyles(size, sizeStyles)}
    ${fullWidth && 'width: 100%;'}
    ${focusVisible()}
    
    /* Icon alignment */
    svg {
      margin-right: ${spacing.xs}px;
      font-size: 1.25em;
    }
    
    /* Responsive adjustments */
    ${respondTo('xs')(css`
      padding: ${spacing.xs}px ${spacing.sm}px;
    `)}
  `;
};

/**
 * Card component styles
 * Returns CSS properties for cards with variants and elevations
 */
export const cardStyles = (props: {
  variant?: 'outlined' | 'elevated' | 'flat';
  elevation?: number;
  padding?: 'none' | 'small' | 'medium' | 'large';
}) => {
  const {
    variant = 'elevated',
    elevation = 1,
    padding = 'medium'
  } = props;

  // Define variant styles
  const variantStyles = {
    elevated: {
      backgroundColor: colors.background.paper,
      boxShadow: shadows[elevation] || shadows[1]
    },
    outlined: {
      backgroundColor: colors.background.paper,
      border: `1px solid ${colors.grey[300]}`,
      boxShadow: 'none'
    },
    flat: {
      backgroundColor: colors.background.paper,
      boxShadow: 'none'
    }
  };

  // Define padding styles
  const paddingStyles = {
    none: {
      padding: 0
    },
    small: {
      padding: spacing.sm
    },
    medium: {
      padding: spacing.md
    },
    large: {
      padding: spacing.lg
    }
  };

  return css`
    position: relative;
    border-radius: ${borderRadius.md}px;
    overflow: hidden;
    transition: box-shadow ${transitions.duration.short}ms ${transitions.easing.easeInOut};
    ${createVariantStyles(variant, variantStyles)}
    ${createVariantStyles(padding, paddingStyles)}
    
    /* Responsive adjustments */
    ${respondTo('xs')(css`
      border-radius: ${borderRadius.sm}px;
    `)}
    
    ${respondTo('md')(css`
      border-radius: ${borderRadius.md}px;
    `)}
  `;
};

/**
 * Input component styles
 * Returns CSS properties for input fields with variants, sizes, and states
 */
export const inputStyles = (props: {
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium' | 'large';
  state?: 'default' | 'focused' | 'error' | 'disabled';
  fullWidth?: boolean;
}) => {
  const {
    variant = 'outlined',
    size = 'medium',
    state = 'default',
    fullWidth = false
  } = props;

  // Define variant styles
  const variantStyles = {
    outlined: {
      backgroundColor: colors.background.default,
      border: `1px solid ${colors.grey[400]}`,
      borderRadius: borderRadius.sm,
      padding: `${spacing.sm}px ${spacing.md}px`,
      '&:hover:not(:disabled)': {
        borderColor: colors.grey[600]
      },
      '&:focus-within': {
        borderColor: getThemeColor('primary'),
        boxShadow: `0 0 0 2px ${getThemeColor('primary', 'main', 0.2)}`
      }
    },
    filled: {
      backgroundColor: colors.grey[100],
      border: `1px solid transparent`,
      borderBottomColor: colors.grey[400],
      borderRadius: `${borderRadius.sm}px ${borderRadius.sm}px 0 0`,
      padding: `${spacing.sm}px ${spacing.md}px`,
      '&:hover:not(:disabled)': {
        backgroundColor: colors.grey[200]
      },
      '&:focus-within': {
        backgroundColor: colors.grey[50],
        borderBottomColor: getThemeColor('primary'),
        boxShadow: `0 1px 0 0 ${getThemeColor('primary')}`
      }
    },
    standard: {
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: `1px solid ${colors.grey[400]}`,
      borderRadius: 0,
      padding: `${spacing.sm}px 0`,
      '&:hover:not(:disabled)': {
        borderBottomColor: colors.grey[600]
      },
      '&:focus-within': {
        borderBottomColor: getThemeColor('primary'),
        boxShadow: `0 1px 0 0 ${getThemeColor('primary')}`
      }
    }
  };

  // Define size styles
  const sizeStyles = {
    small: {
      fontSize: typography.fontSizes.sm,
      padding: variant === 'standard' ? `${spacing.xs}px 0` :
               variant === 'filled' ? `${spacing.xs}px ${spacing.sm}px` :
               `${spacing.xs}px ${spacing.sm}px`
    },
    medium: {
      fontSize: typography.fontSizes.md,
      padding: variant === 'standard' ? `${spacing.sm}px 0` :
               variant === 'filled' ? `${spacing.sm}px ${spacing.md}px` :
               `${spacing.sm}px ${spacing.md}px`
    },
    large: {
      fontSize: typography.fontSizes.lg,
      padding: variant === 'standard' ? `${spacing.md}px 0` :
               variant === 'filled' ? `${spacing.md}px ${spacing.md}px` :
               `${spacing.md}px ${spacing.md}px`
    }
  };

  // Define state styles
  const stateStyles = {
    default: {},
    focused: {
      borderColor: getThemeColor('primary'),
      boxShadow: variant === 'standard' ?
                 `0 1px 0 0 ${getThemeColor('primary')}` :
                 `0 0 0 2px ${getThemeColor('primary', 'main', 0.2)}`
    },
    error: {
      borderColor: `${getThemeColor('error')} !important`,
      boxShadow: variant === 'standard' ?
                 `0 1px 0 0 ${getThemeColor('error')} !important` :
                 `0 0 0 2px ${getThemeColor('error', 'main', 0.2)} !important`
    },
    disabled: {
      backgroundColor: colors.grey[100],
      borderColor: colors.grey[300],
      color: colors.text.disabled,
      cursor: 'not-allowed'
    }
  };

  return css`
    position: relative;
    display: inline-flex;
    flex-direction: column;
    font-family: ${typography.fontFamily};
    font-size: ${typography.fontSizes.md};
    line-height: ${typography.lineHeights.md};
    transition: all ${transitions.duration.short}ms ${transitions.easing.easeInOut};
    width: ${fullWidth ? '100%' : 'auto'};
    
    ${createVariantStyles(variant, variantStyles)}
    ${createSizeStyles(size, sizeStyles)}
    ${createVariantStyles(state, stateStyles)}
    
    input, textarea, select {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      background: none;
      color: ${colors.text.primary};
      border: none;
      outline: none;
      padding: 0;
      width: 100%;
      
      &::placeholder {
        color: ${colors.text.hint};
      }
      
      &:disabled {
        color: ${colors.text.disabled};
        cursor: not-allowed;
      }
    }
    
    /* Label styles */
    label {
      font-size: ${size === 'small' ? typography.fontSizes.xs : typography.fontSizes.sm};
      color: ${colors.text.secondary};
      margin-bottom: ${spacing.xs}px;
      
      ${state === 'focused' && `color: ${getThemeColor('primary')};`}
      ${state === 'error' && `color: ${getThemeColor('error')};`}
      ${state === 'disabled' && `color: ${colors.text.disabled};`}
    }
    
    /* Helper text */
    .helper-text {
      font-size: ${typography.fontSizes.xs};
      margin-top: ${spacing.xs}px;
      color: ${colors.text.secondary};
      
      ${state === 'error' && `color: ${getThemeColor('error')};`}
    }
    
    ${focusVisible()}
  `;
};

/**
 * Select component styles
 * Extends input styles with select-specific styling
 */
export const selectStyles = (props: {
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium' | 'large';
  state?: 'default' | 'focused' | 'error' | 'disabled';
  fullWidth?: boolean;
}) => {
  const baseStyles = inputStyles(props);

  return css`
    ${baseStyles}
    
    /* Select-specific styles */
    position: relative;
    
    .select-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    select {
      appearance: none;
      padding-right: 32px; /* Space for the dropdown icon */
    }
    
    /* Dropdown indicator */
    &::after {
      content: '';
      position: absolute;
      right: ${props.variant === 'standard' ? '0' : spacing.md + 'px'};
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid ${props.state === 'disabled' ? colors.text.disabled : colors.text.secondary};
      pointer-events: none;
    }
    
    /* Dropdown menu styling */
    .select-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      z-index: 2;
      background-color: ${colors.background.paper};
      border-radius: ${borderRadius.sm}px;
      box-shadow: ${shadows[3]};
      max-height: 300px;
      overflow-y: auto;
      
      .select-option {
        padding: ${spacing.sm}px ${spacing.md}px;
        cursor: pointer;
        
        &:hover {
          background-color: ${colors.grey[100]};
        }
        
        &.selected {
          background-color: ${getThemeColor('primary', 'main', 0.1)};
          color: ${getThemeColor('primary')};
        }
      }
    }
  `;
};

/**
 * Checkbox component styles
 * Returns CSS properties for checkbox with different sizes and states
 */
export const checkboxStyles = (props: {
  size?: 'small' | 'medium' | 'large';
  state?: 'default' | 'checked' | 'indeterminate' | 'disabled';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}) => {
  const {
    size = 'medium',
    state = 'default',
    color = 'primary'
  } = props;

  // Define size styles
  const sizeStyles = {
    small: {
      width: '16px',
      height: '16px'
    },
    medium: {
      width: '20px',
      height: '20px'
    },
    large: {
      width: '24px',
      height: '24px'
    }
  };

  // Define state styles
  const isChecked = state === 'checked' || state === 'indeterminate';
  const isDisabled = state === 'disabled';

  return css`
    position: relative;
    display: inline-flex;
    align-items: center;
    
    .checkbox-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      
      &:focus + .checkbox-control {
        box-shadow: 0 0 0 2px ${getThemeColor(color, 'main', 0.2)};
      }
      
      &:disabled + .checkbox-control {
        border-color: ${colors.grey[300]};
        background-color: ${colors.grey[100]};
        cursor: not-allowed;
      }
      
      &:checked + .checkbox-control,
      &:indeterminate + .checkbox-control {
        background-color: ${isDisabled ? colors.grey[300] : getThemeColor(color)};
        border-color: ${isDisabled ? colors.grey[300] : getThemeColor(color)};
        
        &::after {
          opacity: 1;
        }
      }
    }
    
    .checkbox-control {
      ${createSizeStyles(size, sizeStyles)}
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 2px solid ${isDisabled ? colors.grey[300] : colors.grey[500]};
      border-radius: ${borderRadius.xs}px;
      background-color: ${isChecked && !isDisabled ? getThemeColor(color) : 'transparent'};
      transition: all ${transitions.duration.short}ms ${transitions.easing.easeInOut};
      cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
      
      &::after {
        content: '';
        display: block;
        opacity: 0;
        transition: opacity ${transitions.duration.shortest}ms ${transitions.easing.easeInOut};
        
        /* Checkmark or indeterminate indicator */
        ${state === 'checked' && `
          width: 40%;
          height: 60%;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg) translate(-10%, -10%);
        `}
        
        ${state === 'indeterminate' && `
          width: 50%;
          height: 2px;
          background-color: white;
        `}
      }
    }
    
    /* Label styling */
    .checkbox-label {
      margin-left: ${spacing.sm}px;
      font-family: ${typography.fontFamily};
      font-size: ${typography.fontSizes.md};
      color: ${isDisabled ? colors.text.disabled : colors.text.primary};
      user-select: none;
    }
    
    ${focusVisible()}
  `;
};

/**
 * Radio component styles
 * Returns CSS properties for radio buttons with different sizes and states
 */
export const radioStyles = (props: {
  size?: 'small' | 'medium' | 'large';
  state?: 'default' | 'checked' | 'disabled';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}) => {
  const {
    size = 'medium',
    state = 'default',
    color = 'primary'
  } = props;

  // Define size styles
  const sizeStyles = {
    small: {
      width: '16px',
      height: '16px',
      '&::after': {
        width: '8px',
        height: '8px'
      }
    },
    medium: {
      width: '20px',
      height: '20px',
      '&::after': {
        width: '10px',
        height: '10px'
      }
    },
    large: {
      width: '24px',
      height: '24px',
      '&::after': {
        width: '12px',
        height: '12px'
      }
    }
  };

  // Define state styles
  const isChecked = state === 'checked';
  const isDisabled = state === 'disabled';

  return css`
    position: relative;
    display: inline-flex;
    align-items: center;
    
    .radio-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      
      &:focus + .radio-control {
        box-shadow: 0 0 0 2px ${getThemeColor(color, 'main', 0.2)};
      }
      
      &:disabled + .radio-control {
        border-color: ${colors.grey[300]};
        background-color: ${colors.grey[100]};
        cursor: not-allowed;
        
        &::after {
          background-color: ${colors.grey[400]};
        }
      }
      
      &:checked + .radio-control::after {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    .radio-control {
      ${createSizeStyles(size, sizeStyles)}
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 2px solid ${isDisabled ? colors.grey[300] : isChecked ? getThemeColor(color) : colors.grey[500]};
      border-radius: 50%;
      background-color: transparent;
      transition: all ${transitions.duration.short}ms ${transitions.easing.easeInOut};
      cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
      
      &::after {
        content: '';
        display: block;
        border-radius: 50%;
        background-color: ${isDisabled ? colors.grey[400] : getThemeColor(color)};
        opacity: ${isChecked ? 1 : 0};
        transform: ${isChecked ? 'scale(1)' : 'scale(0)'};
        transition: opacity ${transitions.duration.shortest}ms ${transitions.easing.easeInOut},
                    transform ${transitions.duration.shorter}ms ${transitions.easing.easeInOut};
      }
    }
    
    /* Label styling */
    .radio-label {
      margin-left: ${spacing.sm}px;
      font-family: ${typography.fontFamily};
      font-size: ${typography.fontSizes.md};
      color: ${isDisabled ? colors.text.disabled : colors.text.primary};
      user-select: none;
    }
    
    ${focusVisible()}
  `;
};

/**
 * Table component styles
 * Returns CSS properties for tables with different variants and densities
 */
export const tableStyles = (props: {
  variant?: 'standard' | 'outlined' | 'striped';
  density?: 'compact' | 'standard' | 'comfortable';
  stickyHeader?: boolean;
}) => {
  const {
    variant = 'standard',
    density = 'standard',
    stickyHeader = false
  } = props;

  // Define variant styles
  const variantStyles = {
    standard: {
      'tbody tr': {
        borderBottom: `1px solid ${colors.grey[200]}`
      }
    },
    outlined: {
      border: `1px solid ${colors.grey[300]}`,
      'th, td': {
        border: `1px solid ${colors.grey[200]}`
      }
    },
    striped: {
      'tbody tr:nth-of-type(odd)': {
        backgroundColor: colors.grey[50]
      },
      'tbody tr': {
        borderBottom: `1px solid ${colors.grey[200]}`
      }
    }
  };

  // Define density styles
  const densityStyles = {
    compact: {
      'th, td': {
        padding: `${spacing.xs}px ${spacing.sm}px`
      }
    },
    standard: {
      'th, td': {
        padding: `${spacing.sm}px ${spacing.md}px`
      }
    },
    comfortable: {
      'th, td': {
        padding: `${spacing.md}px ${spacing.lg}px`
      }
    }
  };

  return css`
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-family: ${typography.fontFamily};
    
    th {
      font-weight: ${typography.fontWeights.medium};
      text-align: left;
      color: ${colors.text.primary};
      background-color: ${colors.background.secondary};
      position: ${stickyHeader ? 'sticky' : 'static'};
      top: ${stickyHeader ? '0' : 'auto'};
      z-index: ${stickyHeader ? '1' : 'auto'};
      
      /* Sort icons */
      .sort-icon {
        font-size: 1.2em;
        vertical-align: middle;
        margin-left: ${spacing.xs}px;
      }
    }
    
    td {
      color: ${colors.text.primary};
    }
    
    tbody tr {
      transition: background-color ${transitions.duration.shorter}ms ${transitions.easing.easeInOut};
      
      &:hover {
        background-color: ${colors.grey[100]};
      }
    }
    
    ${createVariantStyles(variant, variantStyles)}
    ${createVariantStyles(density, densityStyles)}
    
    /* Responsive styles */
    ${respondTo('xs')(css`
      /* On small screens, stack the header row */
      thead {
        display: none;
      }
      
      tbody tr {
        display: block;
        margin-bottom: ${spacing.md}px;
        border: 1px solid ${colors.grey[300]};
      }
      
      td {
        display: block;
        text-align: right;
        border-bottom: 1px solid ${colors.grey[200]};
        
        &:before {
          content: attr(data-label);
          float: left;
          font-weight: ${typography.fontWeights.medium};
        }
      }
    `)}
    
    ${respondTo('md')(css`
      /* Reset to normal table layout on medium and larger screens */
      thead {
        display: table-header-group;
      }
      
      tbody tr {
        display: table-row;
        margin-bottom: 0;
        border: none;
      }
      
      td {
        display: table-cell;
        text-align: left;
        border-bottom: none;
        
        &:before {
          content: none;
        }
      }
    `)}
  `;
};

/**
 * Modal component styles
 * Returns CSS properties for modal dialogs with different sizes
 */
export const modalStyles = (props: {
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  open?: boolean;
}) => {
  const {
    size = 'medium',
    open = false
  } = props;

  // Define size styles
  const sizeStyles = {
    small: {
      maxWidth: '400px',
      width: 'calc(100% - 64px)'
    },
    medium: {
      maxWidth: '600px',
      width: 'calc(100% - 64px)'
    },
    large: {
      maxWidth: '900px',
      width: 'calc(100% - 64px)'
    },
    fullscreen: {
      maxWidth: '100%',
      width: '100%',
      height: '100%',
      margin: 0,
      borderRadius: 0
    }
  };

  return css`
    /* Overlay */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1300;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: ${open ? 1 : 0};
      visibility: ${open ? 'visible' : 'hidden'};
      transition: opacity ${transitions.duration.enteringScreen}ms ${transitions.easing.easeInOut},
                  visibility ${transitions.duration.enteringScreen}ms ${transitions.easing.easeInOut};
    }
    
    /* Modal container */
    .modal-container {
      background-color: ${colors.background.paper};
      border-radius: ${borderRadius.md}px;
      box-shadow: ${shadows[24]};
      margin: ${spacing.lg}px;
      display: flex;
      flex-direction: column;
      max-height: calc(100% - ${spacing.lg * 2}px);
      ${createSizeStyles(size, sizeStyles)}
      transform: ${open ? 'translateY(0)' : 'translateY(-20px)'};
      opacity: ${open ? 1 : 0};
      transition: transform ${transitions.duration.enteringScreen}ms ${transitions.easing.easeOut},
                  opacity ${transitions.duration.enteringScreen}ms ${transitions.easing.easeOut};
    }
    
    /* Modal header */
    .modal-header {
      ${flexBetween()}
      padding: ${spacing.md}px ${spacing.lg}px;
      border-bottom: 1px solid ${colors.grey[200]};
      
      .modal-title {
        font-size: ${typography.fontSizes.lg};
        font-weight: ${typography.fontWeights.medium};
        margin: 0;
      }
      
      .close-button {
        background: none;
        border: none;
        cursor: pointer;
        color: ${colors.text.secondary};
        padding: ${spacing.xs}px;
        font-size: ${typography.fontSizes.lg};
        
        &:hover {
          color: ${colors.text.primary};
        }
        
        ${focusVisible()}
      }
    }
    
    /* Modal content */
    .modal-content {
      padding: ${spacing.lg}px;
      overflow-y: auto;
      flex: 1;
    }
    
    /* Modal footer */
    .modal-footer {
      padding: ${spacing.md}px ${spacing.lg}px;
      border-top: 1px solid ${colors.grey[200]};
      display: flex;
      justify-content: flex-end;
      gap: ${spacing.sm}px;
    }
    
    /* Responsive adjustments */
    ${respondTo('xs')(css`
      .modal-container {
        width: calc(100% - 32px);
        margin: ${spacing.md}px;
        max-height: calc(100% - ${spacing.md * 2}px);
      }
      
      .modal-header, .modal-content, .modal-footer {
        padding: ${spacing.md}px;
      }
    `)}
  `;
};

/**
 * Tooltip component styles
 * Returns CSS properties for tooltips with different placements
 */
export const tooltipStyles = (props: {
  placement?: 'top' | 'right' | 'bottom' | 'left';
  color?: 'dark' | 'light' | 'primary' | 'error';
  size?: 'small' | 'medium' | 'large';
}) => {
  const {
    placement = 'top',
    color = 'dark',
    size = 'medium'
  } = props;

  // Define color styles
  const colorStyles = {
    dark: {
      backgroundColor: colors.grey[900],
      color: colors.common.white
    },
    light: {
      backgroundColor: colors.grey[100],
      color: colors.text.primary,
      boxShadow: shadows[1]
    },
    primary: {
      backgroundColor: getThemeColor('primary'),
      color: getThemeColor('primary', 'contrastText')
    },
    error: {
      backgroundColor: getThemeColor('error'),
      color: getThemeColor('error', 'contrastText')
    }
  };

  // Define size styles
  const sizeStyles = {
    small: {
      padding: `${spacing.xs}px ${spacing.sm}px`,
      fontSize: typography.fontSizes.xs
    },
    medium: {
      padding: `${spacing.sm}px ${spacing.md}px`,
      fontSize: typography.fontSizes.sm
    },
    large: {
      padding: `${spacing.md}px ${spacing.md}px`,
      fontSize: typography.fontSizes.md
    }
  };

  // Define placement styles
  const placementStyles = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px',
      
      '&::before': {
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        borderWidth: '5px 5px 0 5px',
        borderTopColor: 'inherit'
      }
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '8px',
      
      '&::before': {
        right: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: '5px 5px 5px 0',
        borderRightColor: 'inherit'
      }
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px',
      
      '&::before': {
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        borderWidth: '0 5px 5px 5px',
        borderBottomColor: 'inherit'
      }
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: '8px',
      
      '&::before': {
        left: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: '5px 0 5px 5px',
        borderLeftColor: 'inherit'
      }
    }
  };

  return css`
    position: absolute;
    z-index: 1500;
    border-radius: ${borderRadius.sm}px;
    pointer-events: none;
    white-space: nowrap;
    max-width: 300px;
    border-color: transparent;
    font-family: ${typography.fontFamily};
    font-weight: ${typography.fontWeights.regular};
    line-height: ${typography.lineHeights.md};
    opacity: 0;
    transform-origin: center;
    transition: opacity ${transitions.duration.shorter}ms ${transitions.easing.easeOut},
                transform ${transitions.duration.shorter}ms ${transitions.easing.easeOut};
    
    /* Arrow */
    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border-style: solid;
      border-color: transparent;
    }
    
    /* States */
    &.visible {
      opacity: 1;
    }
    
    ${createColorStyles(color, colorStyles)}
    ${createSizeStyles(size, sizeStyles)}
    ${createVariantStyles(placement, placementStyles)}
  `;
};

/**
 * Badge component styles
 * Returns CSS properties for badges with different variants and positions
 */
export const badgeStyles = (props: {
  variant?: 'standard' | 'dot';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  max?: number;
}) => {
  const {
    variant = 'standard',
    color = 'primary',
    position = 'top-right',
    max = 99
  } = props;

  // Define variant styles
  const variantStyles = {
    standard: {
      minWidth: '20px',
      height: '20px',
      padding: '0 6px',
      borderRadius: '10px',
      fontSize: typography.fontSizes.xs,
      fontWeight: typography.fontWeights.medium,
      lineHeight: '20px',
      textAlign: 'center',
      whiteSpace: 'nowrap'
    },
    dot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      padding: 0
    }
  };

  // Define position styles
  const positionStyles = {
    'top-right': {
      top: 0,
      right: 0,
      transform: 'translate(50%, -50%)'
    },
    'top-left': {
      top: 0,
      left: 0,
      transform: 'translate(-50%, -50%)'
    },
    'bottom-right': {
      bottom: 0,
      right: 0,
      transform: 'translate(50%, 50%)'
    },
    'bottom-left': {
      bottom: 0,
      left: 0,
      transform: 'translate(-50%, 50%)'
    }
  };

  return css`
    display: inline-flex;
    position: relative;
    
    .badge {
      position: absolute;
      ${createColorStyles(color, {
        primary: {
          backgroundColor: getThemeColor('primary'),
          color: getThemeColor('primary', 'contrastText')
        },
        secondary: {
          backgroundColor: getThemeColor('secondary'),
          color: getThemeColor('secondary', 'contrastText')
        },
        error: {
          backgroundColor: getThemeColor('error'),
          color: getThemeColor('error', 'contrastText')
        },
        warning: {
          backgroundColor: getThemeColor('warning'),
          color: getThemeColor('warning', 'contrastText')
        },
        success: {
          backgroundColor: getThemeColor('success'),
          color: getThemeColor('success', 'contrastText')
        },
        info: {
          backgroundColor: getThemeColor('info'),
          color: getThemeColor('info', 'contrastText')
        }
      })}
      ${createVariantStyles(variant, variantStyles)}
      ${createVariantStyles(position, positionStyles)}
      z-index: 1;
      
      /* Handle overflow for numbers */
      ${variant === 'standard' && `
        &.overflow {
          &::after {
            content: "+";
          }
        }
      `}
    }
    
    .badge-content {
      display: inline-flex;
    }
  `;
};

/**
 * Alert component styles
 * Returns CSS properties for alerts with different severities and variants
 */
export const alertStyles = (props: {
  severity?: 'info' | 'success' | 'warning' | 'error';
  variant?: 'standard' | 'outlined' | 'filled';
}) => {
  const {
    severity = 'info',
    variant = 'standard'
  } = props;

  // Define severity styles
  const severityStyles = {
    info: {
      color: getThemeColor('info', 'dark'),
      backgroundColor: getThemeColor('info', 'light', 0.1),
      borderColor: getThemeColor('info')
    },
    success: {
      color: getThemeColor('success', 'dark'),
      backgroundColor: getThemeColor('success', 'light', 0.1),
      borderColor: getThemeColor('success')
    },
    warning: {
      color: getThemeColor('warning', 'dark'),
      backgroundColor: getThemeColor('warning', 'light', 0.1),
      borderColor: getThemeColor('warning')
    },
    error: {
      color: getThemeColor('error', 'dark'),
      backgroundColor: getThemeColor('error', 'light', 0.1),
      borderColor: getThemeColor('error')
    }
  };

  // Define variant styles
  const variantStyles = {
    standard: {
      border: '1px solid transparent'
    },
    outlined: {
      backgroundColor: 'transparent',
      border: '1px solid'
    },
    filled: {
      info: {
        backgroundColor: getThemeColor('info'),
        color: getThemeColor('info', 'contrastText'),
        borderColor: getThemeColor('info')
      },
      success: {
        backgroundColor: getThemeColor('success'),
        color: getThemeColor('success', 'contrastText'),
        borderColor: getThemeColor('success')
      },
      warning: {
        backgroundColor: getThemeColor('warning'),
        color: getThemeColor('warning', 'contrastText'),
        borderColor: getThemeColor('warning')
      },
      error: {
        backgroundColor: getThemeColor('error'),
        color: getThemeColor('error', 'contrastText'),
        borderColor: getThemeColor('error')
      }
    }
  };

  return css`
    display: flex;
    padding: ${spacing.md}px;
    border-radius: ${borderRadius.md}px;
    font-family: ${typography.fontFamily};
    
    ${createVariantStyles(severity, severityStyles)}
    ${variant === 'filled' 
      ? createVariantStyles(severity, variantStyles.filled) 
      : createVariantStyles(variant, variantStyles)}
    
    .alert-icon {
      display: flex;
      align-items: flex-start;
      padding-right: ${spacing.md}px;
      font-size: 1.25em;
    }
    
    .alert-content {
      padding: 0;
      flex: 1;
    }
    
    .alert-title {
      font-size: ${typography.fontSizes.md};
      font-weight: ${typography.fontWeights.medium};
      margin: 0 0 ${spacing.xs}px 0;
    }
    
    .alert-message {
      font-size: ${typography.fontSizes.sm};
      margin: 0;
    }
    
    .alert-action {
      display: flex;
      align-items: center;
      margin-left: ${spacing.md}px;
      margin-right: -${spacing.sm}px;
      padding-left: ${spacing.md}px;
    }
    
    .alert-close {
      color: inherit;
      background: none;
      border: none;
      font-size: ${typography.fontSizes.md};
      cursor: pointer;
      padding: ${spacing.xs}px;
      margin: -${spacing.xs}px;
      
      &:hover {
        opacity: 0.7;
      }
      
      ${focusVisible()}
    }
    
    /* Responsive adjustments */
    ${respondTo('xs')(css`
      flex-direction: column;
      
      .alert-icon {
        padding-right: 0;
        padding-bottom: ${spacing.xs}px;
      }
      
      .alert-action {
        margin-left: 0;
        margin-top: ${spacing.sm}px;
      }
    `)}
    
    ${respondTo('sm')(css`
      flex-direction: row;
      
      .alert-icon {
        padding-right: ${spacing.md}px;
        padding-bottom: 0;
      }
      
      .alert-action {
        margin-left: ${spacing.md}px;
        margin-top: 0;
      }
    `)}
  `;
};

/**
 * Chip component styles
 * Returns CSS properties for chips with different variants, sizes, and colors
 */
export const chipStyles = (props: {
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default';
  disabled?: boolean;
}) => {
  const {
    variant = 'filled',
    size = 'medium',
    color = 'default',
    disabled = false
  } = props;

  // Define variant styles
  const variantStyles = {
    filled: {
      backgroundColor: color === 'default' ? colors.grey[300] : getThemeColor(color, 'main', 0.2),
      color: color === 'default' ? colors.text.primary : getThemeColor(color),
      border: 'none',
      
      '&:hover': !disabled && {
        backgroundColor: color === 'default' ? colors.grey[400] : getThemeColor(color, 'main', 0.3)
      }
    },
    outlined: {
      backgroundColor: 'transparent',
      color: color === 'default' ? colors.text.primary : getThemeColor(color),
      border: `1px solid ${color === 'default' ? colors.grey[400] : getThemeColor(color)}`,
      
      '&:hover': !disabled && {
        backgroundColor: color === 'default' ? colors.grey[100] : getThemeColor(color, 'main', 0.1)
      }
    }
  };

  // Define size styles
  const sizeStyles = {
    small: {
      height: '24px',
      fontSize: typography.fontSizes.xs,
      padding: `0 ${spacing.sm}px`
    },
    medium: {
      height: '32px',
      fontSize: typography.fontSizes.sm,
      padding: `0 ${spacing.md}px`
    },
    large: {
      height: '40px',
      fontSize: typography.fontSizes.md,
      padding: `0 ${spacing.md}px`
    }
  };

  return css`
    display: inline-flex;
    align-items: center;
    border-radius: 16px;
    font-family: ${typography.fontFamily};
    font-weight: ${typography.fontWeights.regular};
    white-space: nowrap;
    cursor: ${disabled ? 'default' : 'pointer'};
    transition: all ${transitions.duration.shorter}ms ${transitions.easing.easeInOut};
    user-select: none;
    
    ${createVariantStyles(variant, variantStyles)}
    ${createSizeStyles(size, sizeStyles)}
    
    ${disabled && `
      opacity: 0.6;
      cursor: default;
      pointer-events: none;
    `}
    
    /* Avatar */
    .chip-avatar {
      display: flex;
      margin-left: -${spacing.xs}px;
      margin-right: ${spacing.xs}px;
      
      img {
        width: ${size === 'small' ? '16px' : size === 'medium' ? '24px' : '32px'};
        height: ${size === 'small' ? '16px' : size === 'medium' ? '24px' : '32px'};
        border-radius: 50%;
        object-fit: cover;
      }
    }
    
    /* Icon */
    .chip-icon {
      margin-left: -${spacing.xs / 2}px;
      margin-right: ${spacing.xs}px;
      font-size: ${size === 'small' ? '1em' : size === 'medium' ? '1.2em' : '1.4em'};
    }
    
    /* Label */
    .chip-label {
      display: flex;
      align-items: center;
      white-space: nowrap;
      padding-left: ${spacing.xs}px;
      padding-right: ${spacing.xs}px;
    }
    
    /* Delete icon */
    .chip-delete {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: -${spacing.xs / 2}px;
      margin-left: ${spacing.xs}px;
      font-size: ${size === 'small' ? '0.9em' : size === 'medium' ? '1em' : '1.1em'};
      color: currentColor;
      opacity: 0.7;
      
      &:hover {
        opacity: 1;
      }
    }
    
    ${focusVisible()}
  `;
};

/**
 * Tab component styles
 * Returns CSS properties for tabs with different variants and orientations
 */
export const tabStyles = (props: {
  variant?: 'standard' | 'contained' | 'fullWidth';
  orientation?: 'horizontal' | 'vertical';
  selected?: boolean;
  disabled?: boolean;
}) => {
  const {
    variant = 'standard',
    orientation = 'horizontal',
    selected = false,
    disabled = false
  } = props;

  // Define variant styles
  const variantStyles = {
    standard: {
      backgroundColor: 'transparent',
      color: selected ? getThemeColor('primary') : colors.text.primary,
      opacity: selected ? 1 : 0.7,
      
      '&:hover': !disabled && {
        opacity: 1,
        backgroundColor: colors.grey[100]
      }
    },
    contained: {
      backgroundColor: selected ? getThemeColor('primary') : 'transparent',
      color: selected ? getThemeColor('primary', 'contrastText') : colors.text.primary,
      
      '&:hover': !disabled && {
        backgroundColor: selected ? getThemeColor('primary', 'dark') : colors.grey[100]
      }
    },
    fullWidth: {
      flexBasis: 0,
      flexGrow: 1
    }
  };

  // Define orientation styles
  const orientationStyles = {
    horizontal: {
      borderBottom: selected && variant === 'standard' ? `2px solid ${getThemeColor('primary')}` : 'none'
    },
    vertical: {
      borderRight: selected && variant === 'standard' ? `2px solid ${getThemeColor('primary')}` : 'none'
    }
  };

  return css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: ${spacing.md}px;
    font-family: ${typography.fontFamily};
    font-size: ${typography.fontSizes.md};
    font-weight: ${typography.fontWeights.medium};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: ${disabled ? 'default' : 'pointer'};
    transition: all ${transitions.duration.shorter}ms ${transitions.easing.easeInOut};
    user-select: none;
    position: relative;
    white-space: nowrap;
    
    ${createVariantStyles(variant, variantStyles)}
    ${createVariantStyles(orientation, orientationStyles)}
    
    ${disabled && `
      opacity: 0.5;
      cursor: default;
      pointer-events: none;
    `}
    
    /* Tab icon */
    .tab-icon {
      margin-right: ${spacing.sm}px;
      font-size: 1.2em;
    }
    
    ${focusVisible()}
    
    /* Tab panels container */
    .tab-panels {
      display: ${orientation === 'horizontal' ? 'block' : 'flex'};
    }
    
    /* Tab panel */
    .tab-panel {
      display: ${selected ? 'block' : 'none'};
      padding: ${spacing.md}px;
    }
    
    /* Tabs container */
    &.tabs-container {
      display: flex;
      flex-direction: ${orientation === 'horizontal' ? 'row' : 'column'};
      border-bottom: ${orientation === 'horizontal' ? `1px solid ${colors.grey[300]}` : 'none'};
      border-right: ${orientation === 'vertical' ? `1px solid ${colors.grey[300]}` : 'none'};
    }
    
    /* Tab indicator (for standard variant) */
    .tab-indicator {
      position: absolute;
      ${orientation === 'horizontal' ? 'bottom: 0; left: 0; width: 100%; height: 2px;' : 'right: 0; top: 0; width: 2px; height: 100%;'}
      background-color: ${getThemeColor('primary')};
      transition: transform ${transitions.duration.complex}ms ${transitions.easing.easeInOut};
    }
    
    /* Responsive adjustments */
    ${respondTo('xs')(css`
      .tabs-container {
        flex-direction: column;
        border-right: none;
        border-bottom: ${`1px solid ${colors.grey[300]}`};
      }
      
      .tab-indicator {
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        right: auto;
        top: auto;
      }
    `)}
    
    ${respondTo('md')(css`
      .tabs-container {
        flex-direction: ${orientation === 'horizontal' ? 'row' : 'column'};
        border-bottom: ${orientation === 'horizontal' ? `1px solid ${colors.grey[300]}` : 'none'};
        border-right: ${orientation === 'vertical' ? `1px solid ${colors.grey[300]}` : 'none'};
      }
      
      .tab-indicator {
        ${orientation === 'horizontal' ? 'bottom: 0; left: 0; width: 100%; height: 2px;' : 'right: 0; top: 0; width: 2px; height: 100%;'}
      }
    `)}
  `;
};

/**
 * Accordion component styles
 * Returns CSS properties for accordions with different variants
 */
export const accordionStyles = (props: {
  variant?: 'outlined' | 'elevated';
  expanded?: boolean;
  disabled?: boolean;
}) => {
  const {
    variant = 'outlined',
    expanded = false,
    disabled = false
  } = props;

  // Define variant styles
  const variantStyles = {
    outlined: {
      border: `1px solid ${colors.grey[300]}`,
      boxShadow: 'none'
    },
    elevated: {
      border: 'none',
      boxShadow: expanded ? shadows[2] : shadows[1]
    }
  };

  return css`
    width: 100%;
    border-radius: ${expanded ? borderRadius.md : 0}px;
    margin: ${spacing.sm}px 0;
    transition: all ${transitions.duration.shorter}ms ${transitions.easing.easeInOut};
    overflow: hidden;
    font-family: ${typography.fontFamily};
    ${createVariantStyles(variant, variantStyles)}
    
    ${disabled && `
      opacity: 0.5;
      cursor: default;
      pointer-events: none;
    `}
    
    /* Accordion summary (header) */
    .accordion-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: ${spacing.md}px;
      cursor: ${disabled ? 'default' : 'pointer'};
      min-height: 48px;
      
      &:hover {
        background-color: ${disabled ? 'transparent' : colors.grey[50]};
      }
      
      .accordion-title {
        font-size: ${typography.fontSizes.md};
        font-weight: ${typography.fontWeights.medium};
        margin: 0;
      }
      
      .expand-icon {
        transition: transform ${transitions.duration.shorter}ms ${transitions.easing.easeInOut};
        transform: ${expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
        font-size: 1.2em;
      }
    }
    
    /* Accordion details (content) */
    .accordion-details {
      padding: ${spacing.md}px;
      border-top: ${expanded ? `1px solid ${colors.grey[200]}` : 'none'};
      display: ${expanded ? 'block' : 'none'};
    }
    
    ${focusVisible()}
  `;
};

/**
 * Drawer component styles
 * Returns CSS properties for drawers with different anchors and variants
 */
export const drawerStyles = (props: {
  anchor?: 'left' | 'right' | 'top' | 'bottom';
  variant?: 'temporary' | 'persistent' | 'permanent';
  open?: boolean;
  width?: number | string;
  height?: number | string;
}) => {
  const {
    anchor = 'left',
    variant = 'temporary',
    open = false,
    width = 256,
    height = 256
  } = props;

  // Define variant styles
  const variantStyles = {
    temporary: {
      position: 'fixed',
      zIndex: 1200,
      display: 'flex',
      flexDirection: 'column'
    },
    persistent: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    },
    permanent: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }
  };

  // Define anchor styles
  const anchorStyles = {
    left: {
      top: 0,
      left: 0,
      width: typeof width === 'number' ? `${width}px` : width,
      height: '100%',
      transform: open ? 'translateX(0)' : 'translateX(-100%)'
    },
    right: {
      top: 0,
      right: 0,
      width: typeof width === 'number' ? `${width}px` : width,
      height: '100%',
      transform: open ? 'translateX(0)' : 'translateX(100%)'
    },
    top: {
      top: 0,
      left: 0,
      width: '100%',
      height: typeof height === 'number' ? `${height}px` : height,
      transform: open ? 'translateY(0)' : 'translateY(-100%)'
    },
    bottom: {
      bottom: 0,
      left: 0,
      width: '100%',
      height: typeof height === 'number' ? `${height}px` : height,
      transform: open ? 'translateY(0)' : 'translateY(100%)'
    }
  };

  return css`
    background-color: ${colors.background.paper};
    box-shadow: ${shadows[16]};
    overflow-y: auto;
    transition: transform ${transitions.duration.standard}ms ${transitions.easing.easeInOut};
    
    ${createVariantStyles(variant, variantStyles)}
    ${createVariantStyles(anchor, anchorStyles)}
    
    /* Backdrop for temporary drawer */
    .drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1199;
      display: ${variant === 'temporary' && open ? 'block' : 'none'};
      opacity: ${open ? 1 : 0};
      transition: opacity ${transitions.duration.standard}ms ${transitions.easing.easeInOut};
    }
    
    /* Header and content sections */
    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: ${spacing.md}px;
      border-bottom: 1px solid ${colors.grey[200]};
      min-height: 64px;
      
      .drawer-title {
        font-size: ${typography.fontSizes.lg};
        font-weight: ${typography.fontWeights.medium};
        margin: 0;
      }
      
      .close-button {
        background: none;
        border: none;
        cursor: pointer;
        color: ${colors.text.secondary};
        padding: ${spacing.xs}px;
        font-size: ${typography.fontSizes.lg};
        
        &:hover {
          color: ${colors.text.primary};
        }
        
        ${focusVisible()}
      }
    }
    
    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: ${spacing.md}px;
    }
  `;
};

/**
 * Data Grid component styles
 * Returns CSS properties for data grids with different densities and features
 */
export const dataGridStyles = (props: {
  density?: 'compact' | 'standard' | 'comfortable';
  stickyHeader?: boolean;
  showBorders?: boolean;
  height?: string | number;
}) => {
  const {
    density = 'standard',
    stickyHeader = true,
    showBorders = false,
    height = '400px'
  } = props;

  // Base table styles
  const baseTableStyles = tableStyles({
    variant: showBorders ? 'outlined' : 'standard',
    density,
    stickyHeader
  });

  return css`
    ${baseTableStyles}
    
    display: flex;
    flex-direction: column;
    height: ${typeof height === 'number' ? `${height}px` : height};
    
    .data-grid-container {
      flex: 1;
      overflow: auto;
      border: ${showBorders ? `1px solid ${colors.grey[300]}` : 'none'};
      border-radius: ${borderRadius.md}px;
    }
    
    table {
      width: 100%;
      table-layout: fixed;
      
      th, td {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    
    .data-grid-header {
      display: flex;
      align-items: center;
      padding: ${spacing.sm}px ${spacing.md}px;
      border-bottom: 1px solid ${colors.grey[200]};
      background-color: ${colors.background.paper};
      
      .search-field {
        flex: 1;
        max-width: 300px;
        margin-right: ${spacing.md}px;
      }
      
      .data-grid-toolbar {
        display: flex;
        align-items: center;
        gap: ${spacing.sm}px;
      }
    }
    
    .data-grid-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: ${spacing.sm}px ${spacing.md}px;
      border-top: 1px solid ${colors.grey[200]};
      background-color: ${colors.background.paper};
      
      .rows-per-page {
        display: flex;
        align-items: center;
        
        span {
          margin-right: ${spacing.sm}px;
          font-size: ${typography.fontSizes.sm};
        }
        
        select {
          padding: ${spacing.xs}px;
          border-radius: ${borderRadius.sm}px;
          border: 1px solid ${colors.grey[300]};
          background-color: ${colors.background.paper};
        }
      }
      
      .pagination-controls {
        display: flex;
        align-items: center;
        
        .pagination-info {
          margin-right: ${spacing.md}px;
          font-size: ${typography.fontSizes.sm};
        }
        
        .pagination-buttons {
          display: flex;
          gap: ${spacing.xs}px;
          
          button {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: ${borderRadius.sm}px;
            border: 1px solid ${colors.grey[300]};
            background-color: ${colors.background.paper};
            cursor: pointer;
            
            &:hover {
              background-color: ${colors.grey[100]};
            }
            
            &:disabled {
              opacity: 0.5;
              cursor: default;
              pointer-events: none;
            }
            
            ${focusVisible()}
          }
        }
      }
    }
    
    /* Sort indicator */
    .sort-indicator {
      display: inline-block;
      margin-left: ${spacing.xs}px;
      vertical-align: middle;
    }
    
    /* Selection checkbox column */
    .selection-cell {
      width: 48px;
      padding: 0 !important;
      text-align: center;
    }
    
    /* Row hover effect */
    tbody tr:hover {
      background-color: ${colors.grey[100]};
    }
    
    /* Selected row */
    tbody tr.selected {
      background-color: ${getThemeColor('primary', 'main', 0.1)};
      
      &:hover {
        background-color: ${getThemeColor('primary', 'main', 0.15)};
      }
    }
    
    /* Cell editing */
    td.editing {
      padding: 0 !important;
      
      input {
        width: 100%;
        height: 100%;
        border: 2px solid ${getThemeColor('primary')};
        padding: inherit;
        outline: none;
      }
    }
    
    /* Responsive adjustments */
    ${respondTo('xs')(css`
      .search-field {
        max-width: 100%;
        margin-bottom: ${spacing.sm}px;
      }
      
      .data-grid-header,
      .data-grid-footer {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .pagination-controls {
        margin-top: ${spacing.sm}px;
        width: 100%;
        justify-content: space-between;
      }
    `)}
    
    ${respondTo('md')(css`
      .search-field {
        max-width: 300px;
        margin-bottom: 0;
      }
      
      .data-grid-header,
      .data-grid-footer {
        flex-direction: row;
        align-items: center;
      }
      
      .pagination-controls {
        margin-top: 0;
        width: auto;
        justify-content: flex-end;
      }
    `)}
  `;
};