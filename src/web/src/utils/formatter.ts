/**
 * Utility functions for formatting various data types (numbers, currencies, percentages, dates, etc.)
 * in the Inventory Management System frontend. This file provides standardized formatting operations
 * to ensure consistent data presentation throughout the application's user interface.
 */

import numeral from 'numeral'; // numeral ^2.0.6
import {
  formatDate,
  DISPLAY_DATE_FORMAT,
  DISPLAY_DATE_TIME_FORMAT,
  DISPLAY_TIME_FORMAT
} from './date';
import {
  roundNumber,
  formatWithCommas,
  QUANTITY_DECIMAL_PLACES,
  PERCENTAGE_DECIMAL_PLACES,
  PRICE_DECIMAL_PLACES,
  RATE_DECIMAL_PLACES
} from './number';

// Default currency code
export const DEFAULT_CURRENCY = 'USD';

// Map of currency codes to their symbols
export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  HKD: 'HK$',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥'
};

// Map of currency codes to their decimal place requirements
export const CURRENCY_DECIMAL_PLACES = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  HKD: 2,
  SGD: 2,
  AUD: 2,
  CAD: 2,
  CHF: 2,
  CNY: 2
};

/**
 * Formats a number with the specified number of decimal places and thousands separators
 * @param value - The number to format
 * @param decimalPlaces - The number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(value: number | string | null | undefined, decimalPlaces: number): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return '';
  }
  
  const roundedValue = roundNumber(parsedValue, decimalPlaces);
  
  if (decimalPlaces === 0) {
    return formatWithCommas(roundedValue);
  }
  
  return numeral(roundedValue).format(`0,0.${'0'.repeat(decimalPlaces)}`);
}

/**
 * Formats a quantity value with appropriate decimal places and thousands separators
 * @param value - The quantity value to format
 * @returns Formatted quantity string
 */
export function formatQuantity(value: number | string | null | undefined): string {
  return formatNumber(value, QUANTITY_DECIMAL_PLACES);
}

/**
 * Formats a number as a percentage with the specified number of decimal places
 * @param value - The number to format as percentage (e.g., 0.75 for 75%)
 * @param decimalPlaces - The number of decimal places
 * @returns Formatted percentage string with % symbol
 */
export function formatPercentage(value: number | string | null | undefined, decimalPlaces: number): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return '';
  }
  
  // Convert to percentage (multiply by 100)
  const percentageValue = parsedValue * 100;
  const roundedValue = roundNumber(percentageValue, decimalPlaces);
  
  if (decimalPlaces === 0) {
    return `${formatWithCommas(roundedValue)}%`;
  }
  
  return `${numeral(roundedValue).format(`0,0.${'0'.repeat(decimalPlaces)}`)}%`;
}

/**
 * Formats a number as a percentage with standard decimal places
 * @param value - The number to format as percentage
 * @returns Formatted percentage string with % symbol
 */
export function formatStandardPercentage(value: number | string | null | undefined): string {
  return formatPercentage(value, PERCENTAGE_DECIMAL_PLACES);
}

/**
 * Formats a price value with appropriate decimal places and thousands separators
 * @param value - The price value to format
 * @returns Formatted price string
 */
export function formatPrice(value: number | string | null | undefined): string {
  return formatNumber(value, PRICE_DECIMAL_PLACES);
}

/**
 * Formats a rate value (e.g., interest rate, borrow rate) with appropriate decimal places
 * @param value - The rate value to format
 * @returns Formatted rate string
 */
export function formatRate(value: number | string | null | undefined): string {
  return formatNumber(value, RATE_DECIMAL_PLACES);
}

/**
 * Formats a number as a currency with the specified currency symbol and decimal places
 * @param value - The number to format as currency
 * @param currencyCode - The currency code (e.g., 'USD', 'EUR')
 * @returns Formatted currency string with symbol
 */
export function formatCurrency(value: number | string | null | undefined, currencyCode: string = DEFAULT_CURRENCY): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return '';
  }
  
  const symbol = CURRENCY_SYMBOLS[currencyCode as keyof typeof CURRENCY_SYMBOLS] || CURRENCY_SYMBOLS[DEFAULT_CURRENCY];
  const decimalPlaces = CURRENCY_DECIMAL_PLACES[currencyCode as keyof typeof CURRENCY_DECIMAL_PLACES] || CURRENCY_DECIMAL_PLACES[DEFAULT_CURRENCY];
  
  const formattedValue = formatNumber(parsedValue, decimalPlaces);
  return `${symbol}${formattedValue}`;
}

/**
 * Formats a large currency value in a shortened form (K, M, B, T)
 * @param value - The number to format as currency
 * @param currencyCode - The currency code (e.g., 'USD', 'EUR')
 * @returns Formatted short currency string (e.g., $1.2M)
 */
export function formatShortCurrency(value: number | string | null | undefined, currencyCode: string = DEFAULT_CURRENCY): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return '';
  }
  
  const symbol = CURRENCY_SYMBOLS[currencyCode as keyof typeof CURRENCY_SYMBOLS] || CURRENCY_SYMBOLS[DEFAULT_CURRENCY];
  
  let format = '0.0a';
  if (Math.abs(parsedValue) < 1000) {
    format = '0,0';
  }
  
  return `${symbol}${numeral(parsedValue).format(format)}`;
}

/**
 * Formats a date string using the standard display format
 * @param dateString - The date string to format
 * @returns Formatted date string
 */
export function formatDateString(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, DISPLAY_DATE_FORMAT);
}

/**
 * Formats a date string with time using the standard display format
 * @param dateTimeString - The date and time string to format
 * @returns Formatted date and time string
 */
export function formatDateTimeString(dateTimeString: string | Date | null | undefined): string {
  return formatDate(dateTimeString, DISPLAY_DATE_TIME_FORMAT);
}

/**
 * Formats a time string using the standard display format
 * @param timeString - The time string to format
 * @returns Formatted time string
 */
export function formatTimeString(timeString: string | Date | null | undefined): string {
  return formatDate(timeString, DISPLAY_TIME_FORMAT);
}

/**
 * Formats a position value with appropriate sign, decimal places, and thousands separators
 * @param value - The position value to format
 * @returns Formatted position value string with sign
 */
export function formatPositionValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return '';
  }
  
  const formattedValue = formatNumber(parsedValue, QUANTITY_DECIMAL_PLACES);
  
  if (parsedValue > 0) {
    return `+${formattedValue}`;
  }
  
  return formattedValue;
}

/**
 * Formats a position value and returns an object with the formatted value and a color indicator
 * @param value - The position value to format
 * @returns Object containing formatted value and color indicator
 */
export function formatPositionValueWithColor(value: number | string | null | undefined): { value: string, color: string } {
  const formattedValue = formatPositionValue(value);
  
  if (value === null || value === undefined || value === '') {
    return { value: '', color: '#9e9e9e' }; // Neutral color
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return { value: formattedValue, color: '#9e9e9e' }; // Neutral color
  }
  
  if (parsedValue > 0) {
    return { value: formattedValue, color: '#4caf50' }; // Green for positive
  } else if (parsedValue < 0) {
    return { value: formattedValue, color: '#f44336' }; // Red for negative
  } else {
    return { value: formattedValue, color: '#9e9e9e' }; // Neutral for zero
  }
}

/**
 * Formats a security identifier based on its type
 * @param identifier - The security identifier
 * @param identifierType - The type of identifier (e.g., 'CUSIP', 'ISIN', 'SEDOL')
 * @returns Formatted security identifier
 */
export function formatSecurityIdentifier(identifier: string | null | undefined, identifierType: string): string {
  if (identifier === null || identifier === undefined || identifier === '') {
    return '';
  }
  
  // Apply formatting rules based on identifier type
  switch (identifierType.toUpperCase()) {
    case 'CUSIP':
      // CUSIPs are 9 characters, display as is
      return identifier;
    case 'ISIN':
      // ISINs are 12 characters, display as is
      return identifier;
    case 'SEDOL':
      // SEDOLs are 7 characters, display as is
      return identifier;
    case 'RIC':
      // Reuters Instrument Codes, display as is
      return identifier;
    case 'BLOOMBERG':
      // Bloomberg tickers, display as is
      return identifier;
    default:
      return identifier;
  }
}

/**
 * Truncates text to the specified length and adds ellipsis if needed
 * @param text - The text to truncate
 * @param maxLength - The maximum length to allow
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (text === null || text === undefined || text === '') {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Formats a phone number string into a standardized format
 * @param phoneNumber - The phone number to format
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string | null | undefined): string {
  if (phoneNumber === null || phoneNumber === undefined || phoneNumber === '') {
    return '';
  }
  
  // Remove all non-numeric characters
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // US phone number format: (XXX) XXX-XXXX
  if (cleanNumber.length === 10) {
    return `(${cleanNumber.substring(0, 3)}) ${cleanNumber.substring(3, 6)}-${cleanNumber.substring(6, 10)}`;
  }
  
  // International format with country code: +X XXX XXX-XXXX
  if (cleanNumber.length > 10) {
    const countryCode = cleanNumber.substring(0, cleanNumber.length - 10);
    const areaCode = cleanNumber.substring(cleanNumber.length - 10, cleanNumber.length - 7);
    const prefix = cleanNumber.substring(cleanNumber.length - 7, cleanNumber.length - 4);
    const lineNumber = cleanNumber.substring(cleanNumber.length - 4);
    return `+${countryCode} ${areaCode} ${prefix}-${lineNumber}`;
  }
  
  // For shorter numbers or other formats, return as is with hyphen separators
  if (cleanNumber.length > 7) {
    return `${cleanNumber.substring(0, 3)}-${cleanNumber.substring(3, 6)}-${cleanNumber.substring(6)}`;
  } else if (cleanNumber.length > 3) {
    return `${cleanNumber.substring(0, 3)}-${cleanNumber.substring(3)}`;
  } else {
    return cleanNumber;
  }
}

/**
 * Formats an email address to lowercase and validates basic format
 * @param email - The email address to format
 * @returns Formatted email address
 */
export function formatEmail(email: string | null | undefined): string {
  if (email === null || email === undefined || email === '') {
    return '';
  }
  
  // Convert to lowercase
  const lowercaseEmail = email.toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(lowercaseEmail)) {
    return lowercaseEmail; // Return as is if it doesn't match basic pattern
  }
  
  return lowercaseEmail;
}