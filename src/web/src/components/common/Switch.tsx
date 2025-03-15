import React from 'react';
import styled from '@emotion/styled';
import { Switch as MuiSwitch, SwitchProps } from '@mui/material'; // @mui/material 5.13
import { FormControlLabel, FormControlLabelProps } from '@mui/material'; // @mui/material 5.13
import { colors, spacing } from '../../styles/variables';
import { focusVisible } from '../../styles/mixins';
import FormControl from './FormControl';
import FormLabel from './FormLabel';
import FormHelperText from './FormHelperText';
import FormError from './FormError';

/**
 * Props specific to the custom Switch component
 */
export interface CustomSwitchProps {
  /** Optional label for the switch */
  label?: string | React.ReactNode;
  /** Optional helper text to provide additional guidance */
  helperText?: string | React.ReactNode;
  /** Error state - can be boolean to indicate error or string with error message */
  error?: string | boolean;
}

/**
 * Styled version of Material-UI Switch with custom styling
 */
export const StyledSwitch = styled(MuiSwitch)<SwitchProps & { error?: string | boolean }>`
  /* Switch size and general styling */
  padding: ${spacing.xs}px;

  /* Track styling (the background of the switch) */
  & .MuiSwitch-track {
    background-color: ${({ checked, error }) => 
      error 
        ? colors.error.main 
        : checked 
          ? colors.primary.main 
          : colors.grey[300]};
    opacity: 1;
    border-radius: 16px;
    transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Thumb styling (the circular button) */
  & .MuiSwitch-thumb {
    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.1);
    background-color: ${colors.common.white};
    width: 20px;
    height: 20px;
    transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Disabled state */
  &.Mui-disabled {
    opacity: 0.4;
    
    & .MuiSwitch-track {
      background-color: ${colors.grey[400]};
    }
    
    & .MuiSwitch-thumb {
      background-color: ${colors.grey[100]};
    }
  }

  /* Focus styles for keyboard navigation */
  ${focusVisible()}
`;

/**
 * Styled version of Material-UI FormControlLabel with custom styling
 */
const StyledFormControlLabel = styled(FormControlLabel)<
  FormControlLabelProps & { error?: string | boolean }
>`
  margin: 0;
  padding: ${spacing.xs}px 0;
  
  /* Label typography */
  & .MuiFormControlLabel-label {
    font-size: 14px;
    color: ${({ error, disabled }) =>
      error
        ? colors.error.main
        : disabled
          ? colors.text.disabled
          : colors.text.primary};
  }
  
  /* Proper alignment */
  & .MuiSwitch-root {
    margin-right: ${spacing.sm}px;
  }
`;

/**
 * Enhanced switch component with custom styling and additional features.
 * This component extends Material-UI's Switch with consistent styling, accessibility features,
 * and integration with the application's design system.
 */
const Switch = React.memo<SwitchProps & CustomSwitchProps>((props) => {
  const {
    label,
    helperText,
    error,
    disabled = false,
    required = false,
    checked,
    onChange,
    id,
    name,
    value,
    ...rest
  } = props;
  
  // Generate unique id if not provided
  const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;
  
  // Helper text and error message IDs for aria-describedby
  const helperTextId = helperText ? `${switchId}-helper-text` : undefined;
  const errorId = error && typeof error === 'string' ? `${switchId}-error` : undefined;
  
  // Combine helper text and error IDs for aria-describedby
  const ariaDescribedBy = [
    helperTextId,
    errorId
  ].filter(Boolean).join(' ') || undefined;
  
  // Handle onChange with proper typing
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    if (onChange) {
      onChange(event, checked);
    }
  };
  
  return (
    <FormControl error={!!error} disabled={disabled} required={required}>
      {label ? (
        <StyledFormControlLabel
          label={label}
          error={error}
          disabled={disabled}
          control={
            <StyledSwitch
              checked={checked}
              onChange={handleChange}
              id={switchId}
              name={name}
              value={value}
              error={error}
              disabled={disabled}
              required={required}
              inputProps={{
                'aria-describedby': ariaDescribedBy
              }}
              {...rest}
            />
          }
        />
      ) : (
        <StyledSwitch
          checked={checked}
          onChange={handleChange}
          id={switchId}
          name={name}
          value={value}
          error={error}
          disabled={disabled}
          required={required}
          inputProps={{
            'aria-describedby': ariaDescribedBy
          }}
          {...rest}
        />
      )}
      
      {helperText && (
        <FormHelperText id={helperTextId} error={!!error} disabled={disabled}>
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
Switch.defaultProps = {
  disabled: false,
  required: false,
  error: false,
  color: 'primary'
};

export default Switch;