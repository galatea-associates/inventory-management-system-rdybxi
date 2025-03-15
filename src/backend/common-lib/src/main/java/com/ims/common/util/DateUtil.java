package com.ims.common.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.time.DayOfWeek;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.Map;

/**
 * Utility class providing date manipulation and conversion functions for the Inventory Management System.
 * Handles business date calculations, settlement date projections, and date formatting across different
 * time zones and markets.
 * 
 * This class supports:
 * - Settlement ladder projection for T+0 through T+4 days
 * - Market-specific settlement rules including cut-off times
 * - Standardized date/time format handling across the system
 */
public class DateUtil {

    private static final Map<String, ZoneId> MARKET_ZONES = new HashMap<>();
    private static final Map<String, Integer> MARKET_SETTLEMENT_DAYS = new HashMap<>();
    private static final Map<String, Integer> MARKET_CUTOFF_HOURS = new HashMap<>();
    
    private static final DateTimeFormatter ISO_DATE_FORMATTER = DateTimeFormatter.ISO_DATE; // yyyy-MM-dd
    private static final DateTimeFormatter ISO_DATE_TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME; // yyyy-MM-dd'T'HH:mm:ss
    
    static {
        // Initialize market time zones
        MARKET_ZONES.put("US", ZoneId.of("America/New_York"));
        MARKET_ZONES.put("CA", ZoneId.of("America/Toronto"));
        MARKET_ZONES.put("GB", ZoneId.of("Europe/London"));
        MARKET_ZONES.put("DE", ZoneId.of("Europe/Berlin"));
        MARKET_ZONES.put("FR", ZoneId.of("Europe/Paris"));
        MARKET_ZONES.put("CH", ZoneId.of("Europe/Zurich"));
        MARKET_ZONES.put("JP", ZoneId.of("Asia/Tokyo"));
        MARKET_ZONES.put("HK", ZoneId.of("Asia/Hong_Kong"));
        MARKET_ZONES.put("SG", ZoneId.of("Asia/Singapore"));
        MARKET_ZONES.put("AU", ZoneId.of("Australia/Sydney"));
        MARKET_ZONES.put("TW", ZoneId.of("Asia/Taipei"));
        
        // Initialize standard settlement days (typically T+2 for most markets)
        MARKET_SETTLEMENT_DAYS.put("US", 2);
        MARKET_SETTLEMENT_DAYS.put("CA", 2);
        MARKET_SETTLEMENT_DAYS.put("GB", 2);
        MARKET_SETTLEMENT_DAYS.put("DE", 2);
        MARKET_SETTLEMENT_DAYS.put("FR", 2);
        MARKET_SETTLEMENT_DAYS.put("CH", 2);
        MARKET_SETTLEMENT_DAYS.put("JP", 2);
        MARKET_SETTLEMENT_DAYS.put("HK", 2);
        MARKET_SETTLEMENT_DAYS.put("SG", 2);
        MARKET_SETTLEMENT_DAYS.put("AU", 2);
        MARKET_SETTLEMENT_DAYS.put("TW", 2);
        
        // Initialize market cutoff hours (in market's local time)
        MARKET_CUTOFF_HOURS.put("US", 16); // 4:00 PM EST
        MARKET_CUTOFF_HOURS.put("CA", 16); // 4:00 PM EDT
        MARKET_CUTOFF_HOURS.put("GB", 16); // 4:00 PM GMT
        MARKET_CUTOFF_HOURS.put("DE", 16); // 4:00 PM CET
        MARKET_CUTOFF_HOURS.put("FR", 16); // 4:00 PM CET
        MARKET_CUTOFF_HOURS.put("CH", 16); // 4:00 PM CET
        MARKET_CUTOFF_HOURS.put("JP", 15); // 3:00 PM JST
        MARKET_CUTOFF_HOURS.put("HK", 16); // 4:00 PM HKT
        MARKET_CUTOFF_HOURS.put("SG", 16); // 4:00 PM SGT
        MARKET_CUTOFF_HOURS.put("AU", 16); // 4:00 PM AEST
        MARKET_CUTOFF_HOURS.put("TW", 13); // 1:00 PM CST
    }
    
    /**
     * Gets the current date.
     * 
     * @return The current date
     */
    public static LocalDate getCurrentDate() {
        return LocalDate.now();
    }
    
    /**
     * Gets the current date and time.
     * 
     * @return The current date and time
     */
    public static LocalDateTime getCurrentDateTime() {
        return LocalDateTime.now();
    }
    
    /**
     * Gets the current date and time in the specified time zone.
     * 
     * @param zoneId The time zone ID
     * @return The current date and time in the specified zone
     */
    public static ZonedDateTime getCurrentDateTimeInZone(ZoneId zoneId) {
        return ZonedDateTime.now(zoneId);
    }
    
    /**
     * Gets the current date and time in the market's time zone.
     * 
     * @param marketCode The market code (e.g., "US", "JP", "GB")
     * @return The current date and time in the market's time zone
     */
    public static ZonedDateTime getCurrentDateTimeInMarket(String marketCode) {
        ZoneId zoneId = MARKET_ZONES.getOrDefault(marketCode, ZoneId.systemDefault());
        return ZonedDateTime.now(zoneId);
    }
    
    /**
     * Formats a date using the specified formatter.
     * 
     * @param date The date to format
     * @param formatter The formatter to use
     * @return The formatted date string
     */
    public static String formatDate(LocalDate date, DateTimeFormatter formatter) {
        if (date == null) {
            return null;
        }
        return date.format(formatter);
    }
    
    /**
     * Formats a date using the ISO date formatter (yyyy-MM-dd).
     * 
     * @param date The date to format
     * @return The formatted date string
     */
    public static String formatDate(LocalDate date) {
        return formatDate(date, ISO_DATE_FORMATTER);
    }
    
    /**
     * Formats a date-time using the specified formatter.
     * 
     * @param dateTime The date-time to format
     * @param formatter The formatter to use
     * @return The formatted date-time string
     */
    public static String formatDateTime(LocalDateTime dateTime, DateTimeFormatter formatter) {
        if (dateTime == null) {
            return null;
        }
        return dateTime.format(formatter);
    }
    
    /**
     * Formats a date-time using the ISO date-time formatter (yyyy-MM-dd'T'HH:mm:ss).
     * 
     * @param dateTime The date-time to format
     * @return The formatted date-time string
     */
    public static String formatDateTime(LocalDateTime dateTime) {
        return formatDateTime(dateTime, ISO_DATE_TIME_FORMATTER);
    }
    
    /**
     * Parses a date string using the specified formatter.
     * 
     * @param dateString The date string to parse
     * @param formatter The formatter to use
     * @return The parsed date
     */
    public static LocalDate parseDate(String dateString, DateTimeFormatter formatter) {
        if (dateString == null || dateString.trim().isEmpty()) {
            return null;
        }
        return LocalDate.parse(dateString, formatter);
    }
    
    /**
     * Parses a date string using the ISO date formatter (yyyy-MM-dd).
     * 
     * @param dateString The date string to parse
     * @return The parsed date
     */
    public static LocalDate parseDate(String dateString) {
        return parseDate(dateString, ISO_DATE_FORMATTER);
    }
    
    /**
     * Parses a date-time string using the specified formatter.
     * 
     * @param dateTimeString The date-time string to parse
     * @param formatter The formatter to use
     * @return The parsed date-time
     */
    public static LocalDateTime parseDateTime(String dateTimeString, DateTimeFormatter formatter) {
        if (dateTimeString == null || dateTimeString.trim().isEmpty()) {
            return null;
        }
        return LocalDateTime.parse(dateTimeString, formatter);
    }
    
    /**
     * Parses a date-time string using the ISO date-time formatter (yyyy-MM-dd'T'HH:mm:ss).
     * 
     * @param dateTimeString The date-time string to parse
     * @return The parsed date-time
     */
    public static LocalDateTime parseDateTime(String dateTimeString) {
        return parseDateTime(dateTimeString, ISO_DATE_TIME_FORMATTER);
    }
    
    /**
     * Adds a number of business days to a date, skipping weekends.
     * 
     * @param date The starting date
     * @param days The number of business days to add (can be negative)
     * @return The resulting date after adding business days
     */
    public static LocalDate addBusinessDays(LocalDate date, int days) {
        if (date == null) {
            return null;
        }
        
        if (days == 0) {
            return date;
        }
        
        int addedDays = 0;
        LocalDate result = date;
        
        while (addedDays < Math.abs(days)) {
            result = result.plusDays(days > 0 ? 1 : -1);
            if (isBusinessDay(result)) {
                addedDays++;
            }
        }
        
        return result;
    }
    
    /**
     * Calculates the settlement date based on the trade date and number of settlement days.
     * 
     * @param tradeDate The trade date
     * @param settlementDays The number of settlement days
     * @return The calculated settlement date
     */
    public static LocalDate calculateSettlementDate(LocalDate tradeDate, int settlementDays) {
        if (tradeDate == null) {
            return null;
        }
        
        return addBusinessDays(tradeDate, settlementDays);
    }
    
    /**
     * Calculates the settlement date based on the trade date and market-specific rules.
     * 
     * @param tradeDate The trade date
     * @param marketCode The market code (e.g., "US", "JP", "TW")
     * @return The calculated settlement date for the market
     */
    public static LocalDate calculateMarketSettlementDate(LocalDate tradeDate, String marketCode) {
        if (tradeDate == null || marketCode == null) {
            return null;
        }
        
        int settlementDays = MARKET_SETTLEMENT_DAYS.getOrDefault(marketCode, 2);
        
        // Japan-specific rules
        if ("JP".equals(marketCode)) {
            // If after Japanese market cut-off time, add one more day
            if (!isBeforeMarketCutoff(marketCode)) {
                settlementDays++;
            }
            
            // Handle Quanto settlements for Japan (T+1 settle as T+2)
            // This is simplified; in a real system would need to check if security is Quanto
        }
        
        // Taiwan-specific rules - simplified example
        if ("TW".equals(marketCode)) {
            // Taiwan-specific settlement rules would go here
            // E.g., handling borrowed shares that cannot be re-lent
        }
        
        return calculateSettlementDate(tradeDate, settlementDays);
    }
    
    /**
     * Determines the settlement day (SD0-SD4) for a date relative to the business date.
     * 
     * @param businessDate The business date
     * @param date The date to determine settlement day for
     * @return The settlement day (0-4), or -1 if outside the settlement window
     */
    public static int calculateSettlementDay(LocalDate businessDate, LocalDate date) {
        if (businessDate == null || date == null) {
            return -1;
        }
        
        long businessDays = businessDaysBetween(businessDate, date);
        
        if (businessDays >= 0 && businessDays <= 4) {
            return (int) businessDays;
        }
        
        return -1; // Outside settlement window
    }
    
    /**
     * Determines if a date is a business day (not a weekend).
     * 
     * @param date The date to check
     * @return True if the date is a business day, false otherwise
     */
    public static boolean isBusinessDay(LocalDate date) {
        if (date == null) {
            return false;
        }
        
        return !isWeekend(date);
    }
    
    /**
     * Determines if a date falls on a weekend.
     * 
     * @param date The date to check
     * @return True if the date is a weekend, false otherwise
     */
    public static boolean isWeekend(LocalDate date) {
        if (date == null) {
            return false;
        }
        
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        return dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY;
    }
    
    /**
     * Calculates the number of days between two dates.
     * 
     * @param startDate The start date
     * @param endDate The end date
     * @return The number of days between the dates
     */
    public static long daysBetween(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            return 0;
        }
        
        return ChronoUnit.DAYS.between(startDate, endDate);
    }
    
    /**
     * Calculates the number of business days between two dates.
     * 
     * @param startDate The start date
     * @param endDate The end date
     * @return The number of business days between the dates
     */
    public static long businessDaysBetween(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            return 0;
        }
        
        long businessDays = 0;
        boolean countingForward = !endDate.isBefore(startDate);
        
        LocalDate currentDate = startDate;
        
        while (!currentDate.equals(endDate)) {
            currentDate = currentDate.plusDays(countingForward ? 1 : -1);
            
            if (isBusinessDay(currentDate)) {
                businessDays += countingForward ? 1 : -1;
            }
        }
        
        return businessDays;
    }
    
    /**
     * Gets the settlement date for a specific settlement day (SD0-SD4).
     * 
     * @param businessDate The business date
     * @param settlementDay The settlement day (0-4)
     * @return The settlement date for the specified day
     * @throws IllegalArgumentException if settlementDay is not between 0 and 4
     */
    public static LocalDate getSettlementDateForDay(LocalDate businessDate, int settlementDay) {
        if (businessDate == null) {
            return null;
        }
        
        if (settlementDay < 0 || settlementDay > 4) {
            throw new IllegalArgumentException("Settlement day must be between 0 and 4");
        }
        
        return addBusinessDays(businessDate, settlementDay);
    }
    
    /**
     * Determines if a date is within the settlement window (SD0-SD4) relative to the business date.
     * 
     * @param businessDate The business date
     * @param date The date to check
     * @return True if the date is within the settlement window, false otherwise
     */
    public static boolean isWithinSettlementWindow(LocalDate businessDate, LocalDate date) {
        if (businessDate == null || date == null) {
            return false;
        }
        
        int settlementDay = calculateSettlementDay(businessDate, date);
        return settlementDay >= 0 && settlementDay <= 4;
    }
    
    /**
     * Determines if the current time is before the market cut-off time.
     * 
     * @param marketCode The market code (e.g., "US", "JP")
     * @return True if the current time is before the market cut-off, false otherwise
     */
    public static boolean isBeforeMarketCutoff(String marketCode) {
        if (marketCode == null) {
            return false;
        }
        
        ZoneId zoneId = MARKET_ZONES.getOrDefault(marketCode, ZoneId.systemDefault());
        ZonedDateTime currentTime = ZonedDateTime.now(zoneId);
        int cutoffHour = MARKET_CUTOFF_HOURS.getOrDefault(marketCode, 16);
        
        return currentTime.getHour() < cutoffHour;
    }
}