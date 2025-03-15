/**
 * Utility functions for number formatting, manipulation, and validation in the Inventory Management System frontend.
 * This file provides standardized number operations to ensure consistent numerical data
 * presentation and calculation throughout the application.
 */

import numeral from 'numeral'; // v2.0.6 - Advanced number formatting library

// Constants for standard decimal places
export const QUANTITY_DECIMAL_PLACES = 0;
export const PERCENTAGE_DECIMAL_PLACES = 2;
export const PRICE_DECIMAL_PLACES = 4;
export const RATE_DECIMAL_PLACES = 4;
export const CURRENCY_DECIMAL_PLACES = 2;

// Colors for position values
export const POSITION_COLORS = {
  positive: '#4caf50',
  negative: '#f44336',
  neutral: '#9e9e9e'
};

/**
 * Rounds a number to the specified number of decimal places
 * @param value - The number to round
 * @param decimalPlaces - The number of decimal places to round to
 * @returns The rounded number
 */
export function roundNumber(value: number | string | null | undefined, decimalPlaces: number): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return 0;
  }
  
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(parsedValue * multiplier) / multiplier;
}

/**
 * Formats a number with thousands separators (commas)
 * @param value - The number to format
 * @returns Formatted number string with commas
 */
export function formatWithCommas(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return '';
  }
  
  return numeral(parsedValue).format('0,0');
}

/**
 * Formats a number with the specified precision (decimal places)
 * @param value - The number to format
 * @param decimalPlaces - The number of decimal places to include
 * @returns Formatted number string with specified precision
 */
export function formatWithPrecision(value: number | string | null | undefined, decimalPlaces: number): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return '';
  }
  
  const roundedValue = roundNumber(parsedValue, decimalPlaces);
  return numeral(roundedValue).format(`0,0.${'0'.repeat(decimalPlaces)}`);
}

/**
 * Formats a number with thousands separators and specified decimal places
 * @param value - The number to format
 * @param decimalPlaces - The number of decimal places to include
 * @returns Formatted number string with commas and decimal places
 */
export function formatNumberWithCommas(value: number | string | null | undefined, decimalPlaces: number): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return '';
  }
  
  const roundedValue = roundNumber(parsedValue, decimalPlaces);
  
  if (decimalPlaces === 0) {
    return numeral(roundedValue).format('0,0');
  }
  
  return numeral(roundedValue).format(`0,0.${'0'.repeat(decimalPlaces)}`);
}

/**
 * Formats a quantity value with appropriate decimal places and thousands separators
 * @param value - The quantity value to format
 * @returns Formatted quantity string
 */
export function formatQuantity(value: number | string | null | undefined): string {
  return formatNumberWithCommas(value, QUANTITY_DECIMAL_PLACES);
}

/**
 * Formats a number as a percentage with the specified decimal places
 * @param value - The number to format as percentage (e.g., 0.75 for 75%)
 * @param decimalPlaces - The number of decimal places to include
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
    return `${numeral(roundedValue).format('0,0')}%`;
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
  return formatNumberWithCommas(value, PRICE_DECIMAL_PLACES);
}

/**
 * Formats a rate value (e.g., interest rate, borrow rate) with appropriate decimal places
 * @param value - The rate value to format
 * @returns Formatted rate string
 */
export function formatRate(value: number | string | null | undefined): string {
  return formatNumberWithCommas(value, RATE_DECIMAL_PLACES);
}

/**
 * Formats a number as a currency with the specified currency symbol
 * @param value - The number to format as currency
 * @param currencySymbol - The currency symbol to use (defaults to $)
 * @returns Formatted currency string with symbol
 */
export function formatCurrency(value: number | string | null | undefined, currencySymbol: string = '$'): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return '';
  }
  
  const formattedValue = formatNumberWithCommas(parsedValue, CURRENCY_DECIMAL_PLACES);
  return `${currencySymbol}${formattedValue}`;
}

/**
 * Formats a large currency value in a shortened form (K, M, B, T)
 * @param value - The number to format as currency
 * @param currencySymbol - The currency symbol to use (defaults to $)
 * @returns Formatted short currency string (e.g., $1.2M)
 */
export function formatShortCurrency(value: number | string | null | undefined, currencySymbol: string = '$'): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return '';
  }
  
  let format = '0.0a';
  if (Math.abs(parsedValue) < 1000) {
    format = '0,0';
  }
  
  return `${currencySymbol}${numeral(parsedValue).format(format)}`;
}

/**
 * Formats a position value with appropriate sign, decimal places, and thousands separators
 * @param value - The position value to format
 * @param showSign - Whether to show explicit + sign for positive values
 * @returns Formatted position value string with sign
 */
export function formatPositionValue(value: number | string | null | undefined, showSign: boolean = false): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return '';
  }
  
  const formattedValue = formatNumberWithCommas(parsedValue, QUANTITY_DECIMAL_PLACES);
  
  if (showSign && parsedValue > 0) {
    return `+${formattedValue}`;
  }
  
  return formattedValue;
}

/**
 * Returns the appropriate color for a position value (positive, negative, or neutral)
 * @param value - The position value
 * @returns Color code for the position
 */
export function getPositionColor(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return POSITION_COLORS.neutral;
  }
  
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsedValue)) {
    return POSITION_COLORS.neutral;
  }
  
  if (parsedValue > 0) {
    return POSITION_COLORS.positive;
  } else if (parsedValue < 0) {
    return POSITION_COLORS.negative;
  } else {
    return POSITION_COLORS.neutral;
  }
}

/**
 * Formats a position value and returns an object with the formatted value and a color indicator
 * @param value - The position value to format
 * @param showSign - Whether to show explicit + sign for positive values
 * @returns Object containing formatted value and color indicator
 */
export function formatPositionValueWithColor(
  value: number | string | null | undefined, 
  showSign: boolean = false
): { value: string; color: string } {
  const formattedValue = formatPositionValue(value, showSign);
  const color = getPositionColor(value);
  
  return {
    value: formattedValue,
    color
  };
}

/**
 * Checks if a value is a valid number or can be converted to a number
 * @param value - The value to check
 * @returns True if the value is numeric, false otherwise
 */
export function isNumeric(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value === 'number') {
    return !isNaN(value) && isFinite(value);
  }
  
  if (typeof value === 'string') {
    if (value.trim() === '') {
      return false;
    }
    
    // Try to parse as number
    const parsedValue = parseFloat(value);
    return !isNaN(parsedValue) && isFinite(parsedValue);
  }
  
  return false;
}

/**
 * Parses a value to a number, returning a default value if parsing fails
 * @param value - The value to parse
 * @param defaultValue - The default value to return if parsing fails
 * @returns Parsed number or default value
 */
export function parseNumeric(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return defaultValue;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? defaultValue : value;
  }
  
  if (typeof value === 'string') {
    const parsedValue = parseFloat(value);
    return isNaN(parsedValue) || !isFinite(parsedValue) ? defaultValue : parsedValue;
  }
  
  return defaultValue;
}

/**
 * Clamps a number between minimum and maximum values
 * @param value - The number to clamp
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculates the percentage of a value relative to a total
 * @param value - The value to calculate percentage for
 * @param total - The total value
 * @returns Calculated percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) {
    return 0; // Avoid division by zero
  }
  
  return (value / total) * 100;
}

/**
 * Calculates the change between two values (absolute and percentage)
 * @param currentValue - The current value
 * @param previousValue - The previous value
 * @returns Object containing absolute and percentage change
 */
export function calculateChange(currentValue: number, previousValue: number): { absolute: number; percentage: number } {
  const absoluteChange = currentValue - previousValue;
  let percentageChange = 0;
  
  if (previousValue !== 0) {
    percentageChange = calculatePercentage(absoluteChange, previousValue);
  }
  
  return {
    absolute: absoluteChange,
    percentage: percentageChange
  };
}