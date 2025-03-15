import dayjs from 'dayjs'; // dayjs ^1.11.7
import utc from 'dayjs/plugin/utc'; // dayjs/plugin/utc ^1.11.7
import timezone from 'dayjs/plugin/timezone'; // dayjs/plugin/timezone ^1.11.7
import isBetween from 'dayjs/plugin/isBetween'; // dayjs/plugin/isBetween ^1.11.7
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'; // dayjs/plugin/isSameOrBefore ^1.11.7
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'; // dayjs/plugin/isSameOrAfter ^1.11.7
import customParseFormat from 'dayjs/plugin/customParseFormat'; // dayjs/plugin/customParseFormat ^1.11.7
import advancedFormat from 'dayjs/plugin/advancedFormat'; // dayjs/plugin/advancedFormat ^1.11.7

// Configure dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);

// Standard date format constants
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const TIME_FORMAT = 'HH:mm:ss';
export const DISPLAY_DATE_FORMAT = 'MMM DD, YYYY';
export const DISPLAY_DATE_TIME_FORMAT = 'MMM DD, YYYY HH:mm:ss';
export const DISPLAY_TIME_FORMAT = 'HH:mm:ss';

// Market-specific constants
const MARKET_TIMEZONES = {
  US: 'America/New_York',
  UK: 'Europe/London',
  JP: 'Asia/Tokyo',
  HK: 'Asia/Hong_Kong',
  SG: 'Asia/Singapore',
  AU: 'Australia/Sydney',
  DE: 'Europe/Berlin',
  FR: 'Europe/Paris',
  CH: 'Europe/Zurich',
  TW: 'Asia/Taipei'
};

const MARKET_SETTLEMENT_DAYS = {
  US: 2,
  UK: 2,
  JP: 2,
  HK: 2,
  SG: 2,
  AU: 2,
  DE: 2,
  FR: 2,
  CH: 2,
  TW: 2
};

const MARKET_CUTOFF_HOURS = {
  US: 16,
  UK: 16,
  JP: 15,
  HK: 16,
  SG: 16,
  AU: 16,
  DE: 16,
  FR: 16,
  CH: 16,
  TW: 13
};

const WEEKEND_DAYS = [0, 6]; // Sunday and Saturday

/**
 * Gets the current date
 * @returns The current date
 */
export function getCurrentDate(): Date {
  return new Date();
}

/**
 * Gets the current date as a formatted string
 * @param format - The format to use (defaults to DATE_FORMAT)
 * @returns The current date as a formatted string
 */
export function getCurrentDateString(format: string = DATE_FORMAT): string {
  return dayjs().format(format);
}

/**
 * Parses a date string into a Date object
 * @param dateString - The date string to parse
 * @param format - The format of the date string (defaults to DATE_FORMAT)
 * @returns The parsed Date object or null if invalid
 */
export function parseDate(
  dateString: string | Date | null | undefined,
  format: string = DATE_FORMAT
): Date | null {
  if (!dateString) {
    return null;
  }

  if (dateString instanceof Date) {
    return dateString;
  }

  const parsedDate = dayjs(dateString, format);
  return parsedDate.isValid() ? parsedDate.toDate() : null;
}

/**
 * Formats a date into a string using the specified format
 * @param date - The date to format
 * @param format - The format to use (defaults to DATE_FORMAT)
 * @returns The formatted date string or empty string if invalid
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: string = DATE_FORMAT
): string {
  if (!date) {
    return '';
  }

  return dayjs(date).format(format);
}

/**
 * Adds a specified number of days to a date
 * @param date - The base date
 * @param days - The number of days to add
 * @returns The resulting date after adding days or null if invalid
 */
export function addDaysToDate(
  date: Date | string | null | undefined,
  days: number
): Date | null {
  if (!date) {
    return null;
  }

  return dayjs(date).add(days, 'day').toDate();
}

/**
 * Adds a specified number of business days to a date, skipping weekends
 * @param date - The base date
 * @param days - The number of business days to add
 * @returns The resulting date after adding business days or null if invalid
 */
export function addBusinessDaysToDate(
  date: Date | string | null | undefined,
  days: number
): Date | null {
  if (!date) {
    return null;
  }

  if (days === 0) {
    return dayjs(date).toDate();
  }

  const dayjsDate = dayjs(date);
  let counter = 0;
  let result = dayjsDate;
  const increment = days > 0 ? 1 : -1;
  const absValue = Math.abs(days);

  while (counter < absValue) {
    result = result.add(increment, 'day');
    if (!WEEKEND_DAYS.includes(result.day())) {
      counter++;
    }
  }

  return result.toDate();
}

/**
 * Determines if a date falls on a weekend
 * @param date - The date to check
 * @returns True if the date is a weekend, false otherwise
 */
export function isWeekendDay(date: Date | string | null | undefined): boolean {
  if (!date) {
    return false;
  }

  const dayOfWeek = dayjs(date).day();
  return WEEKEND_DAYS.includes(dayOfWeek);
}

/**
 * Determines if a date is a business day (not a weekend)
 * @param date - The date to check
 * @returns True if the date is a business day, false otherwise
 */
export function isBusinessDay(date: Date | string | null | undefined): boolean {
  return !isWeekendDay(date);
}

/**
 * Calculates the settlement date based on the trade date and number of settlement days
 * @param tradeDate - The trade date
 * @param settlementDays - The number of settlement days
 * @returns The calculated settlement date or null if invalid
 */
export function calculateSettlementDate(
  tradeDate: Date | string | null | undefined,
  settlementDays: number
): Date | null {
  if (!tradeDate) {
    return null;
  }

  return addBusinessDaysToDate(tradeDate, settlementDays);
}

/**
 * Calculates the settlement date based on the trade date and market-specific rules
 * @param tradeDate - The trade date
 * @param marketCode - The market code (e.g., 'US', 'JP')
 * @returns The calculated settlement date for the market or null if invalid
 */
export function calculateMarketSettlementDate(
  tradeDate: Date | string | null | undefined,
  marketCode: string
): Date | null {
  if (!tradeDate) {
    return null;
  }

  // Get standard settlement days for the market
  let settlementDays = MARKET_SETTLEMENT_DAYS[marketCode as keyof typeof MARKET_SETTLEMENT_DAYS] || 2;

  // Japan-specific settlement rules
  if (marketCode === 'JP') {
    const tradeDateObj = dayjs(tradeDate);
    
    // Check if the trade date is a business day
    if (isBusinessDay(tradeDateObj.toDate())) {
      // If trade is before cutoff, standard T+2 settlement
      if (isBeforeMarketCutoff('JP')) {
        settlementDays = 2;
      } else {
        // If trade is after cutoff, settlement is T+3 (extra day)
        settlementDays = 3;
      }
    } else {
      // If trade date is not a business day, use standard settlement days
      settlementDays = 2;
    }
    
    // Handle quanto settlements with special T+2 requirements
    // This would require additional parameters to identify quanto settlements
    // For demonstration, we'll use standard settlement days
  }

  // Taiwan-specific settlement rules
  if (marketCode === 'TW') {
    // Taiwan has a 1:30 PM cutoff time (13:00)
    // If after cutoff, standard T+2 settlement
    if (!isBeforeMarketCutoff('TW')) {
      settlementDays = 2;
    } else {
      // If before cutoff, still using T+2 as default
      // This could be adjusted based on specific security types
      settlementDays = 2;
    }
  }

  return calculateSettlementDate(tradeDate, settlementDays);
}

/**
 * Determines the settlement day (SD0-SD4) for a date relative to the business date
 * @param businessDate - The current business date
 * @param date - The date to check
 * @returns The settlement day (0-4), or -1 if outside the settlement window
 */
export function calculateSettlementDay(
  businessDate: Date | string | null | undefined,
  date: Date | string | null | undefined
): number {
  if (!businessDate || !date) {
    return -1;
  }

  const days = businessDaysBetween(businessDate, date);
  
  if (days >= 0 && days <= 4) {
    return days;
  }
  
  return -1;
}

/**
 * Gets the settlement date for a specific settlement day (SD0-SD4)
 * @param businessDate - The current business date
 * @param settlementDay - The settlement day (0-4)
 * @returns The settlement date for the specified day or null if invalid
 */
export function getSettlementDateForDay(
  businessDate: Date | string | null | undefined,
  settlementDay: number
): Date | null {
  if (!businessDate || settlementDay < 0 || settlementDay > 4) {
    return null;
  }

  return addBusinessDaysToDate(businessDate, settlementDay);
}

/**
 * Determines if a date is within the settlement window (SD0-SD4) relative to the business date
 * @param businessDate - The current business date
 * @param date - The date to check
 * @returns True if the date is within the settlement window, false otherwise
 */
export function isWithinSettlementWindow(
  businessDate: Date | string | null | undefined,
  date: Date | string | null | undefined
): boolean {
  const settlementDay = calculateSettlementDay(businessDate, date);
  return settlementDay >= 0 && settlementDay <= 4;
}

/**
 * Calculates the number of days between two dates
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns The number of days between the dates or 0 if invalid
 */
export function daysBetween(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): number {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = dayjs(startDate);
  const end = dayjs(endDate);
  return Math.abs(end.diff(start, 'day'));
}

/**
 * Calculates the number of business days between two dates
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns The number of business days between the dates or 0 if invalid
 */
export function businessDaysBetween(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): number {
  if (!startDate || !endDate) {
    return 0;
  }

  let start = dayjs(startDate).startOf('day');
  let end = dayjs(endDate).startOf('day');
  
  // Determine direction
  const isForward = end.isAfter(start);
  if (!isForward) {
    // Swap dates if endDate is before startDate to simplify logic
    const temp = start;
    start = end;
    end = temp;
  }

  let count = 0;
  let current = start;

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    // Count only business days
    if (!WEEKEND_DAYS.includes(current.day())) {
      count++;
    }
    current = current.add(1, 'day');
  }

  // Return negative count if we're going backward
  return isForward ? count : -count;
}

/**
 * Gets the current date and time in the market's time zone
 * @param marketCode - The market code (e.g., 'US', 'JP')
 * @returns The current date and time in the market's time zone
 */
export function getDateInMarketTimeZone(marketCode: string): Date {
  const timezone = MARKET_TIMEZONES[marketCode as keyof typeof MARKET_TIMEZONES] || 'UTC';
  return dayjs().tz(timezone).toDate();
}

/**
 * Determines if the current time is before the market cut-off time
 * @param marketCode - The market code (e.g., 'US', 'JP')
 * @returns True if the current time is before the market cut-off, false otherwise
 */
export function isBeforeMarketCutoff(marketCode: string): boolean {
  const marketTimezone = MARKET_TIMEZONES[marketCode as keyof typeof MARKET_TIMEZONES] || 'UTC';
  const cutoffHour = MARKET_CUTOFF_HOURS[marketCode as keyof typeof MARKET_CUTOFF_HOURS] || 16;
  
  // Get current time in the market's timezone
  const currentMarketTime = dayjs().tz(marketTimezone);
  
  // Check if current hour is before cutoff hour
  return currentMarketTime.hour() < cutoffHour;
}

/**
 * Gets the start of day for a given date
 * @param date - The date
 * @returns The start of day or null if invalid
 */
export function getStartOfDay(date: Date | string | null | undefined): Date | null {
  if (!date) {
    return null;
  }

  return dayjs(date).startOf('day').toDate();
}

/**
 * Gets the end of day for a given date
 * @param date - The date
 * @returns The end of day or null if invalid
 */
export function getEndOfDay(date: Date | string | null | undefined): Date | null {
  if (!date) {
    return null;
  }

  return dayjs(date).endOf('day').toDate();
}

/**
 * Gets the start of week for a given date
 * @param date - The date
 * @returns The start of week or null if invalid
 */
export function getStartOfWeek(date: Date | string | null | undefined): Date | null {
  if (!date) {
    return null;
  }

  return dayjs(date).startOf('week').toDate();
}

/**
 * Gets the end of week for a given date
 * @param date - The date
 * @returns The end of week or null if invalid
 */
export function getEndOfWeek(date: Date | string | null | undefined): Date | null {
  if (!date) {
    return null;
  }

  return dayjs(date).endOf('week').toDate();
}

/**
 * Gets the start of month for a given date
 * @param date - The date
 * @returns The start of month or null if invalid
 */
export function getStartOfMonth(date: Date | string | null | undefined): Date | null {
  if (!date) {
    return null;
  }

  return dayjs(date).startOf('month').toDate();
}

/**
 * Gets the end of month for a given date
 * @param date - The date
 * @returns The end of month or null if invalid
 */
export function getEndOfMonth(date: Date | string | null | undefined): Date | null {
  if (!date) {
    return null;
  }

  return dayjs(date).endOf('month').toDate();
}

/**
 * Determines if a date is before another date
 * @param date - The date to check
 * @param compareDate - The date to compare against
 * @returns True if date is before compareDate, false otherwise
 */
export function isDateBefore(
  date: Date | string | null | undefined,
  compareDate: Date | string | null | undefined
): boolean {
  if (!date || !compareDate) {
    return false;
  }

  return dayjs(date).isBefore(dayjs(compareDate));
}

/**
 * Determines if a date is after another date
 * @param date - The date to check
 * @param compareDate - The date to compare against
 * @returns True if date is after compareDate, false otherwise
 */
export function isDateAfter(
  date: Date | string | null | undefined,
  compareDate: Date | string | null | undefined
): boolean {
  if (!date || !compareDate) {
    return false;
  }

  return dayjs(date).isAfter(dayjs(compareDate));
}

/**
 * Determines if a value is a valid date
 * @param date - The value to check
 * @returns True if the value is a valid date, false otherwise
 */
export function isValidDate(date: any): boolean {
  if (!date) {
    return false;
  }

  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }

  return dayjs(date).isValid();
}