import React from 'react';
import styled from '@emotion/styled';
import { TimePicker as MuiTimePicker } from '@mui/x-date-pickers'; // @mui/x-date-pickers ^6.5.0
import { TimePickerProps as MuiTimePickerProps } from '@mui/x-date-pickers'; // @mui/x-date-pickers ^6.5.0
import { LocalizationProvider } from '@mui/x-date-pickers'; // @mui/x-date-pickers ^6.5.0
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // @mui/x-date-pickers ^6.5.0
import TextField from '@mui/material/TextField'; // @mui/material ^5.13.0

import { colors, spacing, typography } from '../../styles/variables';
import { focusVisible, transition } from '../../styles/mixins';
import FormControl from './FormControl';
import FormLabel from './FormLabel';
import FormHelperText from './FormHelperText';
import FormError from './FormError';
import { formatDate, parseDate, isValidDate, TIME_FORMAT, DISPLAY_TIME_FORMAT } from '../../utils/date';

/**
 * Props for the TimePicker component
 */
export interface TimePickerProps extends Omit<MuiTimePickerProps<Date>, 'renderInput' | 'value' | 'onChange'> {
  /** Unique ID for the input field */
  id?: string;
  /** Name of the input field */
  name?: string;
  /** Label text */
  label?: string;
  /** Selected time value */
  value: Date | null;
  /** Callback when the time changes */
  onChange: (date: Date | null) => void;
  /** Callback when the input loses focus */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Error state or error message */
  error?: string | boolean;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field should take up full width of its container */
  fullWidth?: boolean;
  /** Minimum selectable time */
  minTime?: Date;
  /** Maximum selectable time */
  maxTime?: Date;
}

/**
 * Styled version of Material-UI TimePicker with custom styling
 */
export const StyledTimePicker = styled(MuiTimePicker)<{
  error?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}>`
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  
  ${props => props.error && `
    & .MuiInputBase-root {
      border-color: ${colors.error.main};
    }
  `}
  
  ${props => props.disabled && `
    opacity: 0.7;
    cursor: not-allowed;
    
    & .MuiInputBase-root {
      background-color: ${colors.grey[100]};
    }
  `}
  
  ${focusVisible()}
  
  ${transition('all', '0.3s', 'ease')}
  
  & .MuiInputBase-root {
    font-family: ${typography.fontFamily};
    font-size: ${typography.fontSizes.md};
    padding: ${spacing.xs}px ${spacing.sm}px;
    border-radius: ${spacing.xs}px;
    border: 1px solid ${colors.grey[300]};
    background-color: ${colors.common.white};
    
    &:hover {
      border-color: ${colors.grey[400]};
    }
    
    &.Mui-focused {
      border-color: ${colors.primary.main};
      box-shadow: 0 0 0 2px ${colors.primary.light}40;
    }
  }
  
  & .MuiInputBase-input {
    padding: ${spacing.xs}px ${spacing.sm}px;
  }
  
  & .MuiIconButton-root {
    color: ${colors.grey[600]};
    
    &:hover {
      color: ${colors.primary.main};
      background-color: ${colors.primary.light}20;
    }
  }
`;

/**
 * Enhanced time picker component with custom styling, validation, and accessibility features.
 * Extends Material-UI's TimePicker with design system integration for the Inventory Management System.
 * 
 * @example
 * <TimePicker
 *   label="Meeting Time"
 *   value={meetingTime}
 *   onChange={setMeetingTime}
 *   minTime={new Date(2023, 0, 1, 9, 0)} // 9:00 AM
 *   maxTime={new Date(2023, 0, 1, 17, 0)} // 5:00 PM
 *   helperText="Business hours only"
 * />
 */
const TimePicker = React.memo<TimePickerProps>((props) => {
  const {
    id,
    name,
    label,
    value,
    onChange,
    onBlur,
    error = false,
    helperText,
    required = false,
    disabled = false,
    fullWidth = false,
    minTime,
    maxTime,
    ampm = true,
    views = ['hours', 'minutes'],
    shouldDisableTime,
    ...rest
  } = props;

  // Generate a unique ID if not provided
  const inputId = id || `time-picker-${Math.random().toString(36).substr(2, 9)}`;
  
  // Handle error state
  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : '';
  
  return (
    <FormControl 
      error={hasError}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
    >
      {label && (
        <FormLabel htmlFor={inputId} required={required}>
          {label}
        </FormLabel>
      )}
      
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <StyledTimePicker
          value={value}
          onChange={(newValue) => {
            // Validate and format the time value using utilities from date.ts
            if (newValue && !isValidDate(newValue)) {
              return;
            }
            onChange(newValue);
          }}
          inputFormat={DISPLAY_TIME_FORMAT}
          ampm={ampm}
          views={views}
          minTime={minTime}
          maxTime={maxTime}
          shouldDisableTime={shouldDisableTime}
          disabled={disabled}
          error={hasError}
          fullWidth={fullWidth}
          renderInput={(params) => (
            <TextField
              {...params}
              id={inputId}
              name={name}
              fullWidth={fullWidth}
              error={hasError}
              onBlur={onBlur}
              inputProps={{
                ...params.inputProps,
                'aria-invalid': hasError,
                'aria-required': required,
                'aria-describedby': helperText ? `${inputId}-helper-text` : errorMessage ? `${inputId}-error` : undefined,
              }}
            />
          )}
          {...rest}
        />
      </LocalizationProvider>
      
      {helperText && !hasError && (
        <FormHelperText id={`${inputId}-helper-text`}>{helperText}</FormHelperText>
      )}
      
      {errorMessage && (
        <FormError id={`${inputId}-error`}>{errorMessage}</FormError>
      )}
    </FormControl>
  );
});

// Default props
TimePicker.defaultProps = {
  fullWidth: false,
  error: false,
  disabled: false,
  required: false,
  ampm: true,
  views: ['hours', 'minutes'],
};

export default TimePicker;