import React from 'react';
import styled from '@emotion/styled';
import { TextField, TextFieldProps, InputAdornment } from '@mui/material';
import { colors, spacing, typography } from '../../styles/variables';
import { focusVisible, transition } from '../../styles/mixins';
import FormControl from './FormControl';
import FormLabel from './FormLabel';
import FormHelperText from './FormHelperText';
import FormError from './FormError';

/**
 * Props for the Input component
 * Extends Material-UI TextField props but omits variant and redefines error
 */
export interface InputProps extends Omit<TextFieldProps, 'variant' | 'error'> {
  label?: string;
  helperText?: string;
  error?: string | boolean;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

/**
 * Styled version of Material-UI TextField with custom styling
 */
export const StyledTextField = styled(TextField)<TextFieldProps & { error?: string | boolean }>`
  font-family: ${typography.fontFamily};
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  
  .MuiOutlinedInput-root {
    border-radius: ${spacing.sm}px;
    ${transition('all', '0.2s', 'ease-in-out')};
    
    ${props => props.error ? `
      .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.error.main};
        border-width: 2px;
      }
      
      &:hover .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.error.dark};
      }
      
      &.Mui-focused .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.error.main};
        border-width: 2px;
      }
    ` : `
      .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.grey[300]};
      }
      
      &:hover .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.grey[400]};
      }
      
      &.Mui-focused .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.primary.main};
        border-width: 2px;
      }
    `}
    
    ${props => props.disabled && `
      background-color: ${colors.grey[100]};
      
      .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.grey[200]};
      }
      
      .MuiInputBase-input {
        color: ${colors.text.disabled};
        cursor: not-allowed;
      }
    `}
  }
  
  .MuiInputBase-input {
    color: ${colors.text.primary};
    
    &::placeholder {
      color: ${colors.text.secondary};
      opacity: 0.7;
    }
    
    ${focusVisible()}
  }
  
  // Apply styling to input adornments
  .MuiInputAdornment-root {
    color: ${colors.text.secondary};
    margin-top: 0;
    
    .MuiSvgIcon-root {
      font-size: ${typography.fontSizes.md};
    }
  }
  
  // Adjust the height of the input
  .MuiInputBase-root {
    min-height: 40px;
  }
  
  // Adjust spacing for the helper text
  .MuiFormHelperText-root {
    margin-left: ${spacing.xs}px;
  }
`;

/**
 * Enhanced input component with custom styling, validation, and accessibility features.
 * Extends Material-UI's TextField with design system integration and improved user experience.
 */
const Input = React.memo<InputProps>((props) => {
  const {
    id,
    name,
    label,
    value,
    onChange,
    onBlur,
    error,
    helperText,
    required,
    disabled,
    fullWidth,
    type,
    placeholder,
    startAdornment,
    endAdornment,
    InputProps = {},
    ...rest
  } = props;

  // Generate a unique ID if not provided for accessibility
  const inputId = id || `input-${name || Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  // Set up appropriate ARIA attributes for accessibility
  const ariaProps = {
    'aria-invalid': !!error,
    'aria-required': required,
    'aria-describedby': helperText && !error ? helperId : error && typeof error === 'string' ? errorId : undefined,
  };

  return (
    <FormControl
      error={!!error}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
    >
      {label && (
        <FormLabel
          htmlFor={inputId}
          error={!!error}
          required={required}
          disabled={disabled}
        >
          {label}
        </FormLabel>
      )}
      
      <StyledTextField
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        error={!!error}
        disabled={disabled}
        fullWidth={true} // Always full width within the FormControl
        type={type}
        placeholder={placeholder}
        variant="outlined"
        margin="none"
        InputProps={{
          ...InputProps,
          startAdornment: startAdornment ? (
            <InputAdornment position="start">{startAdornment}</InputAdornment>
          ) : InputProps.startAdornment,
          endAdornment: endAdornment ? (
            <InputAdornment position="end">{endAdornment}</InputAdornment>
          ) : InputProps.endAdornment,
        }}
        {...ariaProps}
        {...rest}
      />
      
      {helperText && !error && (
        <FormHelperText id={helperId} disabled={disabled}>
          {helperText}
        </FormHelperText>
      )}
      
      {error && typeof error === 'string' && (
        <FormError id={errorId}>
          {error}
        </FormError>
      )}
    </FormControl>
  );
});

// Default props
Input.defaultProps = {
  fullWidth: false,
  required: false,
  disabled: false,
  type: 'text',
  variant: 'outlined',
  margin: 'normal',
};

export default Input;