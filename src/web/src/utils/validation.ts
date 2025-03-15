import { isValidDate, parseDate } from './date';
import { isNumeric as isNumber, parseNumeric as parseNumber } from './number';

// Regular expressions for validation
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
export const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
export const URL_REGEX = /^(https?:\/\/)?([a-z\d.-]+)\.[a-z.]{2,6}([/\w .-]*)*\/?$/;
export const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;
export const NUMERIC_REGEX = /^\d+$/;
export const SECURITY_ID_REGEX = /^[A-Z0-9]{6,12}$/;

/**
 * Checks if a value is not null, undefined, or empty string
 * @param value - The value to check
 * @returns True if the value is not empty, false otherwise
 */
export function isRequired(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return true;
}

/**
 * Validates that a value is not empty and returns an error message if it is
 * @param value - The value to validate
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateRequired(value: any, fieldName: string): string | null {
  if (!isRequired(value)) {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validates that a string is a valid email address
 * @param value - The string to validate
 * @returns True if the value is a valid email, false otherwise
 */
export function isEmail(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(value);
}

/**
 * Validates that a string is a valid email address and returns an error message if it is not
 * @param value - The string to validate
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateEmail(value: string, fieldName: string): string | null {
  if (!value) {
    return null; // Not required check
  }
  if (!isEmail(value)) {
    return `${fieldName} must be a valid email address`;
  }
  return null;
}

/**
 * Validates that a string meets password strength requirements
 * @param value - The string to validate
 * @returns True if the password meets strength requirements, false otherwise
 */
export function isStrongPassword(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return PASSWORD_REGEX.test(value);
}

/**
 * Validates that a string meets password strength requirements and returns an error message if it does not
 * @param value - The string to validate
 * @returns Error message or null if validation passes
 */
export function validatePassword(value: string): string | null {
  if (!value) {
    return null; // Not required check
  }
  if (!isStrongPassword(value)) {
    return 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
  }
  return null;
}

/**
 * Validates that two password strings match
 * @param password - The password string
 * @param confirmPassword - The confirmation password string
 * @returns Error message or null if validation passes
 */
export function validatePasswordMatch(password: string, confirmPassword: string): string | null {
  if (!password || !confirmPassword) {
    return null;
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
}

/**
 * Validates that a string is a valid phone number
 * @param value - The string to validate
 * @returns True if the value is a valid phone number, false otherwise
 */
export function isPhoneNumber(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return PHONE_REGEX.test(value);
}

/**
 * Validates that a string is a valid phone number and returns an error message if it is not
 * @param value - The string to validate
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validatePhoneNumber(value: string, fieldName: string): string | null {
  if (!value) {
    return null; // Not required check
  }
  if (!isPhoneNumber(value)) {
    return `${fieldName} must be a valid phone number`;
  }
  return null;
}

/**
 * Validates that a string is a valid URL
 * @param value - The string to validate
 * @returns True if the value is a valid URL, false otherwise
 */
export function isUrl(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return URL_REGEX.test(value);
}

/**
 * Validates that a string is a valid URL and returns an error message if it is not
 * @param value - The string to validate
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateUrl(value: string, fieldName: string): string | null {
  if (!value) {
    return null; // Not required check
  }
  if (!isUrl(value)) {
    return `${fieldName} must be a valid URL`;
  }
  return null;
}

/**
 * Validates that a string contains only alphanumeric characters
 * @param value - The string to validate
 * @returns True if the value contains only alphanumeric characters, false otherwise
 */
export function isAlphanumeric(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return ALPHANUMERIC_REGEX.test(value);
}

/**
 * Validates that a string contains only alphanumeric characters and returns an error message if it does not
 * @param value - The string to validate
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateAlphanumeric(value: string, fieldName: string): string | null {
  if (!value) {
    return null; // Not required check
  }
  if (!isAlphanumeric(value)) {
    return `${fieldName} must contain only letters and numbers`;
  }
  return null;
}

/**
 * Validates that a string contains only numeric characters
 * @param value - The string to validate
 * @returns True if the value contains only numeric characters, false otherwise
 */
export function isNumeric(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return NUMERIC_REGEX.test(value);
}

/**
 * Validates that a string contains only numeric characters and returns an error message if it does not
 * @param value - The string to validate
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateNumeric(value: string, fieldName: string): string | null {
  if (!value) {
    return null; // Not required check
  }
  if (!isNumeric(value)) {
    return `${fieldName} must contain only numbers`;
  }
  return null;
}

/**
 * Validates that a string meets the minimum length requirement
 * @param value - The string to validate
 * @param minLength - The minimum length required
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateMinLength(value: string, minLength: number, fieldName: string): string | null {
  if (!value) {
    return null; // Not required check
  }
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return null;
}

/**
 * Validates that a string does not exceed the maximum length
 * @param value - The string to validate
 * @param maxLength - The maximum length allowed
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): string | null {
  if (!value) {
    return null; // Not required check
  }
  if (value.length > maxLength) {
    return `${fieldName} cannot exceed ${maxLength} characters`;
  }
  return null;
}

/**
 * Validates that a number meets the minimum value requirement
 * @param value - The number to validate
 * @param minValue - The minimum value required
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateMinValue(value: number | string, minValue: number, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return null; // Not required check
  }
  
  const numValue = typeof value === 'string' ? parseNumber(value) : value;
  
  if (numValue < minValue) {
    return `${fieldName} must be at least ${minValue}`;
  }
  return null;
}

/**
 * Validates that a number does not exceed the maximum value
 * @param value - The number to validate
 * @param maxValue - The maximum value allowed
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateMaxValue(value: number | string, maxValue: number, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return null; // Not required check
  }
  
  const numValue = typeof value === 'string' ? parseNumber(value) : value;
  
  if (numValue > maxValue) {
    return `${fieldName} cannot exceed ${maxValue}`;
  }
  return null;
}

/**
 * Validates that a string is a valid date in the specified format
 * @param value - The string to validate
 * @param format - The expected date format
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateDateFormat(value: string, format: string, fieldName: string): string | null {
  if (!value) {
    return null; // Not required check
  }
  
  const parsedDate = parseDate(value, format);
  
  if (!isValidDate(parsedDate)) {
    return `${fieldName} must be a valid date in ${format} format`;
  }
  return null;
}

/**
 * Validates that a date is within a specified range
 * @param value - The date to validate
 * @param minDate - The minimum date allowed (null for no minimum)
 * @param maxDate - The maximum date allowed (null for no maximum)
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateDateRange(
  value: string | Date,
  minDate: string | Date | null,
  maxDate: string | Date | null,
  fieldName: string
): string | null {
  if (!value) {
    return null; // Not required check
  }
  
  const date = value instanceof Date ? value : parseDate(value);
  
  if (!isValidDate(date)) {
    return `${fieldName} must be a valid date`;
  }
  
  if (minDate) {
    const minDateObj = minDate instanceof Date ? minDate : parseDate(minDate);
    if (isValidDate(minDateObj) && date < minDateObj) {
      return `${fieldName} must be on or after ${minDate instanceof Date ? minDate.toLocaleDateString() : minDate}`;
    }
  }
  
  if (maxDate) {
    const maxDateObj = maxDate instanceof Date ? maxDate : parseDate(maxDate);
    if (isValidDate(maxDateObj) && date > maxDateObj) {
      return `${fieldName} must be on or before ${maxDate instanceof Date ? maxDate.toLocaleDateString() : maxDate}`;
    }
  }
  
  return null;
}

/**
 * Validates that a string matches a specified regex pattern
 * @param value - The string to validate
 * @param pattern - The regex pattern to match against
 * @param fieldName - The name of the field being validated
 * @param errorMessage - Custom error message (optional)
 * @returns Error message or null if validation passes
 */
export function validatePattern(
  value: string,
  pattern: RegExp,
  fieldName: string,
  errorMessage?: string
): string | null {
  if (!value) {
    return null; // Not required check
  }
  
  if (!pattern.test(value)) {
    return errorMessage || `${fieldName} is in an invalid format`;
  }
  
  return null;
}

/**
 * Validates that a string is a valid security identifier
 * @param value - The string to validate
 * @returns Error message or null if validation passes
 */
export function validateSecurityId(value: string): string | null {
  if (!value) {
    return null; // Not required check
  }
  
  if (!SECURITY_ID_REGEX.test(value)) {
    return 'Security ID must be 6-12 alphanumeric characters in uppercase';
  }
  
  return null;
}

/**
 * Validates that a number is a valid quantity (non-negative integer)
 * @param value - The number to validate
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateQuantity(value: number | string, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return null; // Not required check
  }
  
  const numValue = typeof value === 'string' ? parseNumber(value) : value;
  
  if (!isNumber(numValue)) {
    return `${fieldName} must be a valid number`;
  }
  
  // Check if it's an integer
  if (!Number.isInteger(numValue)) {
    return `${fieldName} must be a whole number`;
  }
  
  // Check if it's non-negative
  if (numValue < 0) {
    return `${fieldName} must be a non-negative number`;
  }
  
  return null;
}

/**
 * Validates that a number is a valid price (positive number with up to 4 decimal places)
 * @param value - The number to validate
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validatePrice(value: number | string, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return null; // Not required check
  }
  
  const numValue = typeof value === 'string' ? parseNumber(value) : value;
  
  if (!isNumber(numValue)) {
    return `${fieldName} must be a valid number`;
  }
  
  // Check if it's positive
  if (numValue <= 0) {
    return `${fieldName} must be a positive number`;
  }
  
  // Check decimal places (maximum 4)
  const decimalPlaces = (numValue.toString().split('.')[1] || '').length;
  if (decimalPlaces > 4) {
    return `${fieldName} cannot have more than 4 decimal places`;
  }
  
  return null;
}

/**
 * Validates that a number is a valid rate (positive number with up to 6 decimal places)
 * @param value - The number to validate
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validateRate(value: number | string, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return null; // Not required check
  }
  
  const numValue = typeof value === 'string' ? parseNumber(value) : value;
  
  if (!isNumber(numValue)) {
    return `${fieldName} must be a valid number`;
  }
  
  // Check if it's positive
  if (numValue <= 0) {
    return `${fieldName} must be a positive number`;
  }
  
  // Check decimal places (maximum 6)
  const decimalPlaces = (numValue.toString().split('.')[1] || '').length;
  if (decimalPlaces > 6) {
    return `${fieldName} cannot have more than 6 decimal places`;
  }
  
  return null;
}

/**
 * Validates that a number is a valid percentage (between 0 and 100)
 * @param value - The number to validate
 * @param fieldName - The name of the field being validated
 * @returns Error message or null if validation passes
 */
export function validatePercentage(value: number | string, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return null; // Not required check
  }
  
  const numValue = typeof value === 'string' ? parseNumber(value) : value;
  
  if (!isNumber(numValue)) {
    return `${fieldName} must be a valid number`;
  }
  
  // Check if it's between 0 and 100
  if (numValue < 0 || numValue > 100) {
    return `${fieldName} must be between 0 and 100`;
  }
  
  return null;
}

/**
 * Validates a form object against a set of validation rules
 * @param formData - The form data to validate
 * @param validationRules - Object containing validation functions for each field
 * @returns Object with field names as keys and error messages as values
 */
export function validateForm(
  formData: Record<string, any>,
  validationRules: Record<string, (value: any) => string | null>
): Record<string, string | null> {
  const errors: Record<string, string | null> = {};
  
  // Apply validation rules to each field
  Object.keys(validationRules).forEach(field => {
    const validateField = validationRules[field];
    const value = formData[field];
    
    errors[field] = validateField(value);
  });
  
  return errors;
}

/**
 * Checks if a validation errors object contains any errors
 * @param errors - The validation errors object
 * @returns True if there are any errors, false otherwise
 */
export function hasErrors(errors: Record<string, string | null>): boolean {
  return Object.values(errors).some(error => error !== null);
}