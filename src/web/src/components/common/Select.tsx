import React from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Select as MuiSelect, SelectProps, MenuItem, InputAdornment, FormControl as MuiFormControl } from '@mui/material'; // @mui/material 5.13
import { colors, spacing, typography } from '../../styles/variables';
import { focusVisible } from '../../styles/mixins';
import FormHelperText from './FormHelperText';
import FormControl from './FormControl';
import FormLabel from './FormLabel';
import FormError from './FormError';

/**
 * Interface for select option items
 */
export interface SelectOption {
  value: string | number;
  label: string | React.ReactNode;
  disabled?: boolean;
}

/**
 * Props specific to the custom Select component
 */
export interface CustomSelectProps {
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
  helperText?: string | React.ReactNode;
  error?: boolean | string;
  label?: string | React.ReactNode;
  fullWidth?: boolean;
  options?: SelectOption[];
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

/**
 * Styled version of Material-UI Select with custom styling
 */
export const StyledSelect = styled(MuiSelect)<SelectProps & CustomSelectProps>`
  font-family: ${typography.fontFamily};
  
  .MuiSelect-select {
    padding: ${props => 
      props.size === 'small' 
        ? `${spacing.xs}px ${spacing.sm}px` 
        : props.size === 'large' 
          ? `${spacing.md}px ${spacing.md}px` 
          : `${spacing.sm}px ${spacing.md}px`
    };
    
    font-size: ${props => 
      props.size === 'small' 
        ? typography.fontSizes.xs 
        : props.size === 'large' 
          ? typography.fontSizes.md 
          : typography.fontSizes.sm
    };
  }
  
  /* Error state for different variants */
  ${props => props.error && `
    &.MuiOutlinedInput-root {
      & .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.error.main};
      }
      
      &:hover .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.error.main};
      }
      
      &.Mui-focused .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.error.main};
        border-width: 2px;
      }
    }
    
    &.MuiFilledInput-root {
      border-bottom-color: ${colors.error.main};
      
      &:hover {
        border-bottom-color: ${colors.error.main};
      }
      
      &.Mui-focused {
        border-bottom-color: ${colors.error.main};
      }
    }
    
    &.MuiInput-root {
      border-bottom-color: ${colors.error.main};
      
      &:hover {
        border-bottom-color: ${colors.error.main};
      }
      
      &.Mui-focused {
        border-bottom-color: ${colors.error.main};
      }
    }
  `}
  
  /* Disabled state */
  &.Mui-disabled {
    cursor: not-allowed;
    
    &.MuiOutlinedInput-root {
      & .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.grey[200]};
      }
    }
    
    &.MuiFilledInput-root {
      background-color: ${colors.grey[100]};
    }
    
    &.MuiInput-root {
      border-bottom-style: dotted;
    }
  }
  
  /* Focus visible styling for keyboard navigation */
  ${focusVisible()}
  
  /* Full width styling */
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  
  /* Dropdown icon customization */
  .MuiSelect-icon {
    color: ${props => props.disabled ? colors.text.disabled : colors.text.secondary};
  }
  
  /* Menu customization */
  .MuiMenu-paper {
    margin-top: ${spacing.xs}px;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
`;

/**
 * Styled version of Material-UI MenuItem with custom styling
 */
const StyledMenuItem = styled(MenuItem)<{ disabled?: boolean }>`
  font-family: ${typography.fontFamily};
  font-size: ${typography.fontSizes.sm};
  padding: ${spacing.sm}px ${spacing.md}px;
  
  &:hover {
    background-color: ${colors.grey[100]};
  }
  
  &.Mui-selected {
    background-color: ${colors.primary.light}20;
    
    &:hover {
      background-color: ${colors.primary.light}30;
    }
  }
  
  &.Mui-disabled {
    color: ${colors.text.disabled};
    cursor: not-allowed;
  }
  
  /* Focus visible styling for keyboard navigation */
  ${focusVisible()}
`;

/**
 * Enhanced select component with custom styling and additional features.
 * 
 * This component extends Material-UI's Select with design system integration,
 * consistent styling, and improved accessibility features. It supports various
 * variants, sizes, and states (error, disabled) with proper styling and ARIA
 * attributes for accessibility.
 * 
 * @example
 * <Select
 *   label="Country"
 *   options={[
 *     { value: 'us', label: 'United States' },
 *     { value: 'ca', label: 'Canada' },
 *     { value: 'uk', label: 'United Kingdom' }
 *   ]}
 *   value={country}
 *   onChange={handleChange}
 *   helperText="Select your country"
 * />
 */
const Select = React.memo<SelectProps & CustomSelectProps>((props) => {
  const {
    variant = 'outlined',
    size = 'medium',
    error = false,
    helperText,
    label,
    fullWidth = false,
    required = false,
    disabled = false,
    options = [],
    startAdornment,
    endAdornment,
    id,
    children,
    ...rest
  } = props;

  // Generate unique ID for accessibility if not provided
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const helperTextId = helperText ? `${selectId}-helper-text` : undefined;
  const errorMessage = typeof error === 'string' ? error : '';
  const errorId = errorMessage ? `${selectId}-error` : undefined;
  
  return (
    <FormControl
      error={!!error}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
    >
      {label && (
        <FormLabel htmlFor={selectId}>{label}</FormLabel>
      )}
      
      <StyledSelect
        id={selectId}
        variant={variant}
        size={size === 'large' ? 'medium' as any : size}
        error={!!error}
        fullWidth={fullWidth}
        disabled={disabled}
        aria-describedby={helperTextId || errorId}
        startAdornment={startAdornment ? (
          <InputAdornment position="start">
            {startAdornment}
          </InputAdornment>
        ) : undefined}
        endAdornment={endAdornment ? (
          <InputAdornment position="end">
            {endAdornment}
          </InputAdornment>
        ) : undefined}
        {...rest}
      >
        {/* If children are provided, render them instead of options */}
        {children || options.map((option) => (
          <StyledMenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </StyledMenuItem>
        ))}
      </StyledSelect>
      
      {helperText && !errorMessage && (
        <FormHelperText id={helperTextId}>
          {helperText}
        </FormHelperText>
      )}
      
      {errorMessage && (
        <FormError id={errorId}>
          {errorMessage}
        </FormError>
      )}
    </FormControl>
  );
});

// Set display name for debugging
Select.displayName = 'Select';

// Default props
Select.defaultProps = {
  variant: 'outlined',
  size: 'medium',
  fullWidth: false,
  error: false,
  disabled: false,
  required: false,
  options: [],
  multiple: false,
};

export default Select;