import React from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers'; // @mui/x-date-pickers ^6.5.0
import { DatePickerProps as MuiDatePickerProps } from '@mui/x-date-pickers'; // @mui/x-date-pickers ^6.5.0
import { LocalizationProvider } from '@mui/x-date-pickers'; // @mui/x-date-pickers ^6.5.0
import { AdapterDateFns } from '@mui/x-date-pickers'; // @mui/x-date-pickers ^6.5.0
import TextField from '@mui/material/TextField'; // @mui/material ^5.13.0
import { colors, spacing, typography } from '../../styles/variables';
import { focusVisible, transition } from '../../styles/mixins';
import FormControl from './FormControl';
import FormLabel from './FormLabel';
import FormHelperText from './FormHelperText';
import FormError from './FormError';
import { formatDate, parseDate, isValidDate } from '../../utils/date';

/**
 * Extended props interface for the DatePicker component
 */
export interface DatePickerProps extends Omit<MuiDatePickerProps<Date>, 'renderInput'> {
  label?: string;
  helperText?: string;
  error?: string | boolean;
  minDate?: Date;
  maxDate?: Date;
  disablePast?: boolean;
  disableFuture?: boolean;
  shouldDisableDate?: (date: Date) => boolean;
}

/**
 * Styled version of Material-UI DatePicker
 */
export const StyledDatePicker = styled(MuiDatePicker)`
  .MuiPickersDay-root {
    &.Mui-selected {
      background-color: ${colors.primary.main};
      color: ${colors.common.white};
      
      &:hover, &:focus {
        background-color: ${colors.primary.dark};
      }
    }
  }
  
  .MuiPickersCalendarHeader-switchHeader {
    .MuiIconButton-root {
      color: ${colors.primary.main};
    }
  }
`;

/**
 * Styled TextField for the date input
 */
const StyledTextField = styled(TextField)`
  .MuiInputBase-root {
    font-family: ${typography.fontFamily};
    background-color: ${colors.background.default};
    
    &:hover {
      .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.primary.main};
      }
    }
    
    &.Mui-focused {
      .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.primary.main};
      }
      
      ${focusVisible()}
    }
    
    &.Mui-error {
      .MuiOutlinedInput-notchedOutline {
        border-color: ${colors.error.main};
      }
    }
    
    &.Mui-disabled {
      background-color: ${colors.grey[100]};
      opacity: 0.7;
    }
  }
  
  .MuiInputBase-input {
    padding: ${spacing.sm}px ${spacing.md}px;
    ${transition('all', '0.2s')};
  }
`;

/**
 * Enhanced date picker component with custom styling, validation, and accessibility features.
 * This component wraps Material-UI's DatePicker with additional functionality for the
 * Inventory Management System UI.
 */
const DatePicker = React.memo<DatePickerProps>((props) => {
  const {
    id,
    name,
    label,
    value,
    onChange,
    onBlur,
    error,
    helperText,
    required = false,
    disabled = false,
    fullWidth = false,
    inputFormat = 'MM/dd/yyyy',
    minDate,
    maxDate,
    disablePast,
    disableFuture,
    shouldDisableDate,
    ...rest
  } = props;
  
  // Generate unique IDs for accessibility
  const inputId = id || `date-${name || Math.random().toString(36).substring(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  
  // Determine error state and message
  const errorMessage = typeof error === 'string' ? error : '';
  const hasError = Boolean(error);
  
  // Helper strings for accessibility
  const describedBy = [
    helperText ? helperId : '',
    errorMessage ? errorId : ''
  ].filter(Boolean).join(' ') || undefined;
  
  return (
    <FormControl
      error={hasError}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
    >
      {label && (
        <FormLabel
          htmlFor={inputId}
          required={required}
          error={hasError}
        >
          {label}
        </FormLabel>
      )}
      
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <StyledDatePicker
          value={value}
          onChange={onChange}
          disabled={disabled}
          inputFormat={inputFormat}
          minDate={minDate}
          maxDate={maxDate}
          disablePast={disablePast}
          disableFuture={disableFuture}
          shouldDisableDate={shouldDisableDate}
          renderInput={(params) => (
            <StyledTextField
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
                'aria-describedby': describedBy,
              }}
            />
          )}
          {...rest}
        />
      </LocalizationProvider>
      
      {helperText && !errorMessage && (
        <FormHelperText id={helperId}>{helperText}</FormHelperText>
      )}
      
      {errorMessage && (
        <FormError id={errorId}>{errorMessage}</FormError>
      )}
    </FormControl>
  );
});

// Display name for debugging
DatePicker.displayName = 'DatePicker';

export default DatePicker;