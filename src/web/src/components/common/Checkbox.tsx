import React from 'react';
import styled from '@emotion/styled';
import { Checkbox, CheckboxProps } from '@mui/material'; // @mui/material 5.13
import { FormControlLabel, FormControlLabelProps } from '@mui/material'; // @mui/material 5.13
import { colors, spacing } from '../../styles/variables';
import { focusVisible } from '../../styles/mixins';
import FormControl from './FormControl';
import FormLabel from './FormLabel';
import FormHelperText from './FormHelperText';
import FormError from './FormError';

/**
 * Props specific to the custom Checkbox component
 */
export interface CustomCheckboxProps {
  /** The label to display next to the checkbox */
  label?: string | React.ReactNode;
  /** Helper text to provide additional guidance */
  helperText?: string | React.ReactNode;
  /** Error message or flag indicating error state */
  error?: string | boolean;
}

/**
 * Styled version of Material-UI Checkbox with custom styling
 */
export const StyledCheckbox = styled(Checkbox)<CheckboxProps & { error?: string | boolean }>`
  padding: ${spacing.sm}px;
  
  /* Customize colors based on state */
  &.MuiCheckbox-root {
    color: ${props => props.error ? colors.error.main : colors.grey[300]};
    
    &.Mui-checked {
      color: ${props => props.error ? colors.error.main : colors.primary.main};
    }
    
    &.Mui-disabled {
      color: ${colors.grey[400]};
    }
  }
  
  /* Focus state styling for accessibility */
  ${focusVisible()}
  
  /* Customize ripple effect */
  .MuiTouchRipple-root {
    color: ${colors.primary.light};
  }
`;

/**
 * Styled version of Material-UI FormControlLabel with custom styling
 */
const StyledFormControlLabel = styled(FormControlLabel)<FormControlLabelProps & { error?: string | boolean }>`
  margin: 0;
  
  .MuiFormControlLabel-label {
    font-size: 0.875rem; // Using a fixed size since we're not importing typography
    color: ${props => 
      props.disabled 
        ? colors.text.disabled 
        : props.error 
          ? colors.error.main 
          : colors.text.primary
    };
  }
  
  /* Ensure proper alignment */
  align-items: flex-start;
  
  .MuiCheckbox-root {
    margin-top: -${spacing.xs}px;
  }
`;

/**
 * Enhanced checkbox component with custom styling and additional features.
 * Extends Material-UI's Checkbox with design system integration and improved accessibility.
 * 
 * @example
 * <Checkbox 
 *   label="Remember me"
 *   helperText="Save your login information for next time"
 *   checked={rememberMe}
 *   onChange={(e, checked) => setRememberMe(checked)}
 * />
 */
const Checkbox = React.memo<CheckboxProps & CustomCheckboxProps>((props) => {
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
  
  // Generate a unique ID if none provided
  const checkboxId = id || `checkbox-${name || Math.random().toString(36).substr(2, 9)}`;
  
  // Create IDs for associated elements
  const helperTextId = helperText ? `${checkboxId}-helper-text` : undefined;
  const errorId = error && typeof error === 'string' ? `${checkboxId}-error` : undefined;
  
  // Handle onChange with proper typing
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    if (onChange) {
      onChange(event, checked);
    }
  };
  
  // Determine describedby for accessibility
  const describedBy = [
    helperTextId, 
    errorId
  ].filter(Boolean).join(' ') || undefined;
  
  return (
    <FormControl error={!!error} disabled={disabled} required={required}>
      {label ? (
        <StyledFormControlLabel
          control={
            <StyledCheckbox
              checked={checked}
              onChange={handleChange}
              id={checkboxId}
              name={name}
              value={value}
              disabled={disabled}
              required={required}
              error={error}
              inputProps={{
                'aria-describedby': describedBy
              }}
              {...rest}
            />
          }
          label={label}
          error={error}
          disabled={disabled}
        />
      ) : (
        <StyledCheckbox
          checked={checked}
          onChange={handleChange}
          id={checkboxId}
          name={name}
          value={value}
          disabled={disabled}
          required={required}
          error={error}
          inputProps={{
            'aria-describedby': describedBy
          }}
          {...rest}
        />
      )}
      
      {helperText && (
        <FormHelperText id={helperTextId} disabled={disabled}>
          {helperText}
        </FormHelperText>
      )}
      
      {error && typeof error === 'string' && (
        <FormError id={errorId}>{error}</FormError>
      )}
    </FormControl>
  );
});

// Set display name for debugging
Checkbox.displayName = 'Checkbox';

// Set default props
Checkbox.defaultProps = {
  disabled: false,
  required: false,
  error: false,
  color: 'primary'
};

export default Checkbox;