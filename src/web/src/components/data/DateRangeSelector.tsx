import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Grid } from '@mui/material'; // @mui/material ^5.13.0
import DatePicker from '../common/DatePicker';
import FormControl from '../common/FormControl';
import FormLabel from '../common/FormLabel';
import FormHelperText from '../common/FormHelperText';
import FormError from '../common/FormError';
import { formatDate, parseDate, isValidDate, isDateBefore, isDateAfter } from '../../utils/date';
import { colors, spacing } from '../../styles/variables';

/**
 * Interface representing a date range with start and end dates
 */
export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Props for the DateRangeSelector component
 */
export interface DateRangeSelectorProps {
  /** Unique identifier for the component */
  id?: string;
  /** Name attribute for form submission */
  name?: string;
  /** Label text for the component */
  label?: string;
  /** Current date range value */
  value: DateRange | null;
  /** Handler called when date range changes */
  onChange: (value: DateRange | null) => void;
  /** Handler called when component loses focus */
  onBlur?: React.FocusEventHandler;
  /** Error state or error message */
  error?: string | boolean;
  /** Helper text to display below the component */
  helperText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field should take up full width of container */
  fullWidth?: boolean;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Whether dates in the past should be disabled */
  disablePast?: boolean;
  /** Whether dates in the future should be disabled */
  disableFuture?: boolean;
  /** Custom function to determine if a date should be disabled */
  shouldDisableDate?: (date: Date) => boolean;
  /** Label for the start date field */
  startLabel?: string;
  /** Label for the end date field */
  endLabel?: string;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Styled container for the date range selector
 */
const StyledDateRangeContainer = styled(Box)`
  width: 100%;
`;

/**
 * Styled grid container for the date pickers
 */
const StyledGridContainer = styled(Grid)`
  width: 100%;
`;

/**
 * Styled grid item for individual date pickers
 */
const StyledGridItem = styled(Grid)`
  padding: ${spacing.xs}px;
`;

/**
 * Validates that the end date is not before the start date
 * 
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns Validation result object with isValid flag and optional error message
 */
const validateDateRange = (startDate: Date | null, endDate: Date | null) => {
  if (!startDate || !endDate) {
    return { isValid: true };
  }

  if (isDateBefore(endDate, startDate)) {
    return {
      isValid: false,
      errorMessage: 'End date cannot be before start date'
    };
  }

  return { isValid: true };
};

/**
 * Formats a date range object into a string representation
 * 
 * @param dateRange - The date range object to format
 * @param format - The date format to use
 * @returns Formatted date range string
 */
export const formatDateRange = (
  dateRange: DateRange | null | undefined,
  format: string = 'MM/dd/yyyy'
): string => {
  if (!dateRange) {
    return '';
  }

  const { startDate, endDate } = dateRange;
  const formattedStart = startDate ? formatDate(startDate, format) : '';
  const formattedEnd = endDate ? formatDate(endDate, format) : '';

  if (formattedStart && formattedEnd) {
    return `${formattedStart} - ${formattedEnd}`;
  } else if (formattedStart) {
    return `${formattedStart} -`;
  } else if (formattedEnd) {
    return `- ${formattedEnd}`;
  }

  return '';
};

/**
 * Parses a date range string into a DateRange object
 * 
 * @param dateRangeString - The string to parse
 * @param format - The date format to use
 * @returns Parsed DateRange object or null if invalid
 */
export const parseDateRange = (
  dateRangeString: string | null | undefined,
  format: string = 'MM/dd/yyyy'
): DateRange | null => {
  if (!dateRangeString) {
    return null;
  }

  const parts = dateRangeString.split('-').map(part => part.trim());
  
  if (parts.length !== 2) {
    return null;
  }

  const startDate = parts[0] ? parseDate(parts[0], format) : null;
  const endDate = parts[1] ? parseDate(parts[1], format) : null;

  if (!startDate && !endDate) {
    return null;
  }

  return { startDate, endDate };
};

/**
 * A specialized date range selection component for the Inventory Management System
 * that allows users to select a start and end date for filtering data.
 * 
 * This component supports position view, inventory dashboard, and other data filtering contexts.
 */
const DateRangeSelector = React.memo<DateRangeSelectorProps>((props) => {
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
    fullWidth = true,
    minDate,
    maxDate,
    disablePast,
    disableFuture,
    shouldDisableDate,
    startLabel = 'Start Date',
    endLabel = 'End Date',
    className,
    ...rest
  } = props;

  // State for start and end dates
  const [startDate, setStartDate] = useState<Date | null>(value?.startDate || null);
  const [endDate, setEndDate] = useState<Date | null>(value?.endDate || null);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Handle start date change
  const handleStartDateChange = useCallback((date: Date | null) => {
    setStartDate(date);
    const newValue = { startDate: date, endDate };
    
    // Validate dates
    const validation = validateDateRange(date, endDate);
    if (!validation.isValid) {
      setInternalError(validation.errorMessage);
    } else {
      setInternalError(null);
      onChange(newValue);
    }
  }, [endDate, onChange]);

  // Handle end date change
  const handleEndDateChange = useCallback((date: Date | null) => {
    setEndDate(date);
    const newValue = { startDate, endDate: date };
    
    // Validate dates
    const validation = validateDateRange(startDate, date);
    if (!validation.isValid) {
      setInternalError(validation.errorMessage);
    } else {
      setInternalError(null);
      onChange(newValue);
    }
  }, [startDate, onChange]);

  // Update internal state when value prop changes
  useEffect(() => {
    setStartDate(value?.startDate || null);
    setEndDate(value?.endDate || null);
    
    // Clear internal validation error when external value changes
    setInternalError(null);
  }, [value]);

  // Generate unique IDs for accessibility
  const componentId = id || `date-range-${name || Math.random().toString(36).substring(2, 9)}`;
  const startId = `${componentId}-start`;
  const endId = `${componentId}-end`;
  const errorId = `${componentId}-error`;
  const helperId = `${componentId}-helper`;

  // Determine error message (external or internal)
  const errorMessage = typeof error === 'string' 
    ? error 
    : internalError;

  // Determine if we have an error
  const hasError = Boolean(error) || Boolean(internalError);

  return (
    <FormControl
      error={hasError}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      className={className}
      {...rest}
    >
      {label && (
        <FormLabel
          htmlFor={startId}
          required={required}
          error={hasError}
        >
          {label}
        </FormLabel>
      )}

      <StyledDateRangeContainer>
        <StyledGridContainer container spacing={2}>
          {/* Start Date Picker */}
          <StyledGridItem item xs={12} sm={6} md={6}>
            <DatePicker
              id={startId}
              name={`${name ? `${name}-start` : 'start'}`}
              label={startLabel}
              value={startDate}
              onChange={handleStartDateChange}
              onBlur={onBlur}
              error={hasError}
              required={required}
              disabled={disabled}
              fullWidth={true}
              minDate={minDate}
              maxDate={maxDate}
              disablePast={disablePast}
              disableFuture={disableFuture}
              shouldDisableDate={shouldDisableDate}
            />
          </StyledGridItem>

          {/* End Date Picker */}
          <StyledGridItem item xs={12} sm={6} md={6}>
            <DatePicker
              id={endId}
              name={`${name ? `${name}-end` : 'end'}`}
              label={endLabel}
              value={endDate}
              onChange={handleEndDateChange}
              onBlur={onBlur}
              error={hasError}
              required={required}
              disabled={disabled}
              fullWidth={true}
              minDate={startDate || minDate}
              maxDate={maxDate}
              disablePast={disablePast}
              disableFuture={disableFuture}
              shouldDisableDate={shouldDisableDate}
            />
          </StyledGridItem>
        </StyledGridContainer>
      </StyledDateRangeContainer>

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
DateRangeSelector.displayName = 'DateRangeSelector';

// Default props
DateRangeSelector.defaultProps = {
  startLabel: 'Start Date',
  endLabel: 'End Date',
  fullWidth: true,
};

export default DateRangeSelector;