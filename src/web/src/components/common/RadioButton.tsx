import React from 'react';
import styled from '@emotion/styled';
import {
  Radio,
  RadioProps,
  RadioGroup,
  RadioGroupProps,
  FormControlLabel,
  FormControlLabelProps
} from '@mui/material'; // @mui/material 5.13
import { colors, spacing } from '../../styles/variables';
import { focusVisible } from '../../styles/mixins';
import FormControl from './FormControl';
import FormLabel from './FormLabel';
import FormHelperText from './FormHelperText';
import FormError from './FormError';
import FormGroup from './FormGroup';

/**
 * Interface defining the structure of radio options
 */
export interface RadioOption {
  /**
   * The value of the radio option
   */
  value: string;
  /**
   * The label text to display for the radio option
   */
  label: string;
  /**
   * Whether the radio option is disabled
   */
  disabled?: boolean;
}

/**
 * Props for the RadioButton component
 */
export interface RadioButtonProps extends Omit<RadioGroupProps, 'onChange'> {
  /**
   * Unique identifier for the radio button group
   */
  id?: string;
  /**
   * Name attribute for the radio button group
   */
  name?: string;
  /**
   * Label text to display for the radio button group
   */
  label?: string;
  /**
   * Current selected value
   */
  value?: string;
  /**
   * Array of radio options to display
   */
  options: RadioOption[];
  /**
   * Handler called when the selected value changes
   */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>, value: string) => void;
  /**
   * Error message or flag to indicate validation error
   */
  error?: string | boolean;
  /**
   * Helper text to display below the radio group
   */
  helperText?: string;
  /**
   * Whether the radio group is required
   */
  required?: boolean;
  /**
   * Whether the radio group is disabled
   */
  disabled?: boolean;
  /**
   * Whether to display radio options in a row
   */
  row?: boolean;
}

/**
 * Styled version of Material-UI Radio with custom styling
 */
export const StyledRadio = styled(Radio)<RadioProps & { error?: boolean }>`
  color: ${props => props.error ? colors.error.main : colors.grey[400]};
  
  &.Mui-checked {
    color: ${props => props.error ? colors.error.main : colors.primary.main};
  }
  
  &.Mui-disabled {
    color: ${colors.text.disabled};
  }
  
  /* Ensure proper size and alignment */
  padding: ${spacing.xs}px;
  
  /* Add focus visible styling for keyboard navigation */
  ${focusVisible()}
`;

/**
 * Styled version of Material-UI RadioGroup with custom styling
 */
const StyledRadioGroup = styled(RadioGroup)<RadioGroupProps>`
  margin: ${spacing.xs}px 0;
  
  /* Apply appropriate spacing between radio options */
  & .MuiFormControlLabel-root {
    margin-right: ${props => props.row ? spacing.md : 0}px;
    margin-bottom: ${props => props.row ? 0 : spacing.xs}px;
  }
`;

/**
 * Enhanced radio button component with custom styling and additional features.
 * Extends Material-UI's Radio with design system integration, consistent styling,
 * and improved accessibility features.
 */
const RadioButton = React.memo<RadioButtonProps>((props) => {
  const {
    id,
    name,
    label,
    value,
    options = [],
    onChange,
    error,
    helperText,
    required = false,
    disabled = false,
    row = false,
    ...rest
  } = props;

  // Generate a unique ID if not provided
  const radioGroupId = id || `radio-group-${name || Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${radioGroupId}-error`;
  const helperId = `${radioGroupId}-helper`;

  // Handle onChange to call the provided handler
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(event, event.target.value);
    }
  };

  // Determine if we have an error message or just an error flag
  const errorMessage = typeof error === 'string' ? error : '';
  const hasError = !!error;

  return (
    <FormControl
      error={hasError}
      disabled={disabled}
      required={required}
      fullWidth
    >
      {label && (
        <FormLabel
          htmlFor={radioGroupId}
          required={required}
          error={hasError}
          disabled={disabled}
        >
          {label}
        </FormLabel>
      )}
      
      <StyledRadioGroup
        id={radioGroupId}
        name={name}
        value={value}
        onChange={handleChange}
        row={row}
        aria-describedby={`${helperText ? helperId : ''} ${hasError ? errorId : ''}`}
        {...rest}
      >
        <FormGroup row={row} spacing={row ? "comfortable" : "normal"}>
          {options.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              disabled={disabled || option.disabled}
              control={<StyledRadio error={hasError} />}
              label={option.label}
            />
          ))}
        </FormGroup>
      </StyledRadioGroup>
      
      {helperText && !hasError && (
        <FormHelperText id={helperId} disabled={disabled}>
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

// Default props
RadioButton.defaultProps = {
  required: false,
  disabled: false,
  row: false,
  options: []
};

export default RadioButton;