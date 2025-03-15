package com.ims.common.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.time.DayOfWeek;
import java.time.format.DateTimeFormatter;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Test class for DateUtil utility that verifies date manipulation, formatting, parsing, 
 * and market-specific settlement calculations for the Inventory Management System.
 */
public class DateUtilTest {

    @BeforeEach
    void setUp() {
        // Setup code if needed
    }

    @Test
    @DisplayName("Should return current date")
    void testGetCurrentDate() {
        LocalDate currentDate = DateUtil.getCurrentDate();
        LocalDate expectedDate = LocalDate.now();
        
        assertEquals(expectedDate, currentDate);
    }

    @Test
    @DisplayName("Should return current date time")
    void testGetCurrentDateTime() {
        LocalDateTime currentDateTime = DateUtil.getCurrentDateTime();
        LocalDateTime expectedDateTime = LocalDateTime.now();
        
        // Since there might be a small difference in milliseconds between the two calls,
        // we'll check that they're on the same day and within a small time difference
        assertEquals(expectedDateTime.toLocalDate(), currentDateTime.toLocalDate());
        assertTrue(Math.abs(expectedDateTime.getHour() - currentDateTime.getHour()) <= 1);
    }

    @Test
    @DisplayName("Should return current date time in specified zone")
    void testGetCurrentDateTimeInZone() {
        ZoneId zoneId = ZoneId.of("America/New_York");
        ZonedDateTime currentDateTime = DateUtil.getCurrentDateTimeInZone(zoneId);
        ZonedDateTime expectedDateTime = ZonedDateTime.now(zoneId);
        
        assertEquals(expectedDateTime.toLocalDate(), currentDateTime.toLocalDate());
        assertEquals(zoneId, currentDateTime.getZone());
    }

    @Test
    @DisplayName("Should return current date time in market zone")
    void testGetCurrentDateTimeInMarket() {
        String marketCode = "US";
        ZonedDateTime currentDateTime = DateUtil.getCurrentDateTimeInMarket(marketCode);
        
        assertEquals(ZoneId.of("America/New_York"), currentDateTime.getZone());
    }

    @Test
    @DisplayName("Should format date correctly")
    void testFormatDate() {
        LocalDate date = LocalDate.of(2023, 6, 15);
        String formattedDate = DateUtil.formatDate(date);
        
        assertEquals("2023-06-15", formattedDate);
    }

    @Test
    @DisplayName("Should format date with custom formatter")
    void testFormatDateWithFormatter() {
        LocalDate date = LocalDate.of(2023, 6, 15);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/dd/yyyy");
        String formattedDate = DateUtil.formatDate(date, formatter);
        
        assertEquals("06/15/2023", formattedDate);
    }

    @Test
    @DisplayName("Should format date time correctly")
    void testFormatDateTime() {
        LocalDateTime dateTime = LocalDateTime.of(2023, 6, 15, 10, 30, 0);
        String formattedDateTime = DateUtil.formatDateTime(dateTime);
        
        assertEquals("2023-06-15T10:30:00", formattedDateTime);
    }

    @Test
    @DisplayName("Should format date time with custom formatter")
    void testFormatDateTimeWithFormatter() {
        LocalDateTime dateTime = LocalDateTime.of(2023, 6, 15, 10, 30, 0);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm");
        String formattedDateTime = DateUtil.formatDateTime(dateTime, formatter);
        
        assertEquals("06/15/2023 10:30", formattedDateTime);
    }

    @Test
    @DisplayName("Should parse date string correctly")
    void testParseDate() {
        String dateString = "2023-06-15";
        LocalDate parsedDate = DateUtil.parseDate(dateString);
        
        assertEquals(LocalDate.of(2023, 6, 15), parsedDate);
    }

    @Test
    @DisplayName("Should parse date string with custom formatter")
    void testParseDateWithFormatter() {
        String dateString = "06/15/2023";
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/dd/yyyy");
        LocalDate parsedDate = DateUtil.parseDate(dateString, formatter);
        
        assertEquals(LocalDate.of(2023, 6, 15), parsedDate);
    }

    @Test
    @DisplayName("Should parse date time string correctly")
    void testParseDateTime() {
        String dateTimeString = "2023-06-15T10:30:00";
        LocalDateTime parsedDateTime = DateUtil.parseDateTime(dateTimeString);
        
        assertEquals(LocalDateTime.of(2023, 6, 15, 10, 30, 0), parsedDateTime);
    }

    @Test
    @DisplayName("Should parse date time string with custom formatter")
    void testParseDateTimeWithFormatter() {
        String dateTimeString = "06/15/2023 10:30";
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm");
        LocalDateTime parsedDateTime = DateUtil.parseDateTime(dateTimeString, formatter);
        
        assertEquals(LocalDateTime.of(2023, 6, 15, 10, 30, 0), parsedDateTime);
    }

    @ParameterizedTest
    @MethodSource("addBusinessDaysTestCases")
    @DisplayName("Should add business days correctly")
    void testAddBusinessDays(LocalDate startDate, int days, LocalDate expectedDate) {
        LocalDate result = DateUtil.addBusinessDays(startDate, days);
        assertEquals(expectedDate, result);
    }

    static Stream<Arguments> addBusinessDaysTestCases() {
        return Stream.of(
            // Monday + 1 day = Tuesday
            Arguments.of(LocalDate.of(2023, 6, 12), 1, LocalDate.of(2023, 6, 13)),
            
            // Friday + 1 day = Monday (skips weekend)
            Arguments.of(LocalDate.of(2023, 6, 16), 1, LocalDate.of(2023, 6, 19)),
            
            // Wednesday + 3 days = Monday (includes weekend)
            Arguments.of(LocalDate.of(2023, 6, 14), 3, LocalDate.of(2023, 6, 19)),
            
            // Wednesday - 1 day = Tuesday (negative days)
            Arguments.of(LocalDate.of(2023, 6, 14), -1, LocalDate.of(2023, 6, 13)),
            
            // Monday - 3 days = Wednesday of previous week (negative days with weekend)
            Arguments.of(LocalDate.of(2023, 6, 19), -3, LocalDate.of(2023, 6, 14))
        );
    }

    @ParameterizedTest
    @MethodSource("settlementDateTestCases")
    @DisplayName("Should calculate settlement date correctly")
    void testCalculateSettlementDate(LocalDate tradeDate, int settlementDays, LocalDate expectedDate) {
        LocalDate result = DateUtil.calculateSettlementDate(tradeDate, settlementDays);
        assertEquals(expectedDate, result);
    }

    static Stream<Arguments> settlementDateTestCases() {
        return Stream.of(
            // Monday + 2 days = Wednesday
            Arguments.of(LocalDate.of(2023, 6, 12), 2, LocalDate.of(2023, 6, 14)),
            
            // Thursday + 2 days = Monday (skips weekend)
            Arguments.of(LocalDate.of(2023, 6, 15), 2, LocalDate.of(2023, 6, 19)),
            
            // Friday + 3 days = Wednesday (includes weekend)
            Arguments.of(LocalDate.of(2023, 6, 16), 3, LocalDate.of(2023, 6, 21))
        );
    }

    @Test
    @DisplayName("Should calculate market-specific settlement dates")
    void testCalculateMarketSettlementDate() {
        LocalDate tradeDate = LocalDate.of(2023, 6, 15); // Thursday
        
        // Testing US market with T+2 settlement
        try (MockedStatic<DateUtil> mockedDateUtil = mockStatic(DateUtil.class, CALLS_REAL_METHODS)) {
            // Mock isBeforeMarketCutoff to return true (before cutoff)
            mockedDateUtil.when(() -> DateUtil.isBeforeMarketCutoff("US")).thenReturn(true);
            
            // Call the real method for calculateMarketSettlementDate
            mockedDateUtil.when(() -> DateUtil.calculateMarketSettlementDate(tradeDate, "US"))
                        .thenCallRealMethod();
            
            LocalDate usSettlementDate = DateUtil.calculateMarketSettlementDate(tradeDate, "US");
            assertEquals(LocalDate.of(2023, 6, 19), usSettlementDate); // Monday (T+2)
        }
        
        // Testing Japan market with T+2 settlement before cutoff
        try (MockedStatic<DateUtil> mockedDateUtil = mockStatic(DateUtil.class, CALLS_REAL_METHODS)) {
            mockedDateUtil.when(() -> DateUtil.isBeforeMarketCutoff("JP")).thenReturn(true);
            mockedDateUtil.when(() -> DateUtil.calculateMarketSettlementDate(tradeDate, "JP"))
                        .thenCallRealMethod();
            
            LocalDate jpSettlementDate = DateUtil.calculateMarketSettlementDate(tradeDate, "JP");
            assertEquals(LocalDate.of(2023, 6, 19), jpSettlementDate); // Monday (T+2)
        }
        
        // Testing Japan market with T+3 settlement after cutoff
        try (MockedStatic<DateUtil> mockedDateUtil = mockStatic(DateUtil.class, CALLS_REAL_METHODS)) {
            mockedDateUtil.when(() -> DateUtil.isBeforeMarketCutoff("JP")).thenReturn(false);
            mockedDateUtil.when(() -> DateUtil.calculateMarketSettlementDate(tradeDate, "JP"))
                        .thenCallRealMethod();
            
            LocalDate jpSettlementDateAfterCutoff = DateUtil.calculateMarketSettlementDate(tradeDate, "JP");
            assertEquals(LocalDate.of(2023, 6, 20), jpSettlementDateAfterCutoff); // Tuesday (T+3)
        }
        
        // Testing Taiwan market
        try (MockedStatic<DateUtil> mockedDateUtil = mockStatic(DateUtil.class, CALLS_REAL_METHODS)) {
            mockedDateUtil.when(() -> DateUtil.isBeforeMarketCutoff("TW")).thenReturn(true);
            mockedDateUtil.when(() -> DateUtil.calculateMarketSettlementDate(tradeDate, "TW"))
                        .thenCallRealMethod();
            
            LocalDate twSettlementDate = DateUtil.calculateMarketSettlementDate(tradeDate, "TW");
            assertEquals(LocalDate.of(2023, 6, 19), twSettlementDate); // Monday (T+2)
        }
    }

    @ParameterizedTest
    @MethodSource("settlementDayTestCases")
    @DisplayName("Should calculate settlement day correctly")
    void testCalculateSettlementDay(LocalDate businessDate, LocalDate date, int expectedDay) {
        int result = DateUtil.calculateSettlementDay(businessDate, date);
        assertEquals(expectedDay, result);
    }

    static Stream<Arguments> settlementDayTestCases() {
        LocalDate businessDate = LocalDate.of(2023, 6, 15); // Thursday
        return Stream.of(
            // Same day = SD0
            Arguments.of(businessDate, businessDate, 0),
            
            // Next business day = SD1
            Arguments.of(businessDate, LocalDate.of(2023, 6, 16), 1),
            
            // Next Monday = SD2 (skips weekend)
            Arguments.of(businessDate, LocalDate.of(2023, 6, 19), 2),
            
            // Next Tuesday = SD3
            Arguments.of(businessDate, LocalDate.of(2023, 6, 20), 3),
            
            // Next Wednesday = SD4
            Arguments.of(businessDate, LocalDate.of(2023, 6, 21), 4),
            
            // Next Thursday = Outside window
            Arguments.of(businessDate, LocalDate.of(2023, 6, 22), -1),
            
            // Previous day = Outside window
            Arguments.of(businessDate, LocalDate.of(2023, 6, 14), -1)
        );
    }

    @ParameterizedTest
    @CsvSource({
        "2023-06-12, true",  // Monday
        "2023-06-13, true",  // Tuesday
        "2023-06-14, true",  // Wednesday
        "2023-06-15, true",  // Thursday
        "2023-06-16, true",  // Friday
        "2023-06-17, false", // Saturday
        "2023-06-18, false"  // Sunday
    })
    @DisplayName("Should identify business days correctly")
    void testIsBusinessDay(String dateString, boolean expected) {
        LocalDate date = LocalDate.parse(dateString);
        boolean result = DateUtil.isBusinessDay(date);
        assertEquals(expected, result);
    }

    @ParameterizedTest
    @CsvSource({
        "2023-06-12, false", // Monday
        "2023-06-13, false", // Tuesday
        "2023-06-14, false", // Wednesday
        "2023-06-15, false", // Thursday
        "2023-06-16, false", // Friday
        "2023-06-17, true",  // Saturday
        "2023-06-18, true"   // Sunday
    })
    @DisplayName("Should identify weekends correctly")
    void testIsWeekend(String dateString, boolean expected) {
        LocalDate date = LocalDate.parse(dateString);
        boolean result = DateUtil.isWeekend(date);
        assertEquals(expected, result);
    }

    @ParameterizedTest
    @CsvSource({
        "2023-06-01, 2023-06-10, 9",
        "2023-06-10, 2023-06-01, -9",
        "2023-06-01, 2023-06-01, 0"
    })
    @DisplayName("Should calculate days between dates correctly")
    void testDaysBetween(String startDateString, String endDateString, long expected) {
        LocalDate startDate = LocalDate.parse(startDateString);
        LocalDate endDate = LocalDate.parse(endDateString);
        long result = DateUtil.daysBetween(startDate, endDate);
        assertEquals(expected, result);
    }

    @ParameterizedTest
    @MethodSource("businessDaysBetweenTestCases")
    @DisplayName("Should calculate business days between dates correctly")
    void testBusinessDaysBetween(LocalDate startDate, LocalDate endDate, long expectedDays) {
        long result = DateUtil.businessDaysBetween(startDate, endDate);
        assertEquals(expectedDays, result);
    }

    static Stream<Arguments> businessDaysBetweenTestCases() {
        return Stream.of(
            // Monday to Friday = 4 business days
            Arguments.of(LocalDate.of(2023, 6, 12), LocalDate.of(2023, 6, 16), 4),
            
            // Monday to next Monday = 5 business days (skips weekend)
            Arguments.of(LocalDate.of(2023, 6, 12), LocalDate.of(2023, 6, 19), 5),
            
            // Friday to Monday = 1 business day (skips weekend)
            Arguments.of(LocalDate.of(2023, 6, 16), LocalDate.of(2023, 6, 19), 1),
            
            // Monday to previous Friday = -1 business day (negative days)
            Arguments.of(LocalDate.of(2023, 6, 19), LocalDate.of(2023, 6, 16), -1),
            
            // Same day = 0 business days
            Arguments.of(LocalDate.of(2023, 6, 15), LocalDate.of(2023, 6, 15), 0)
        );
    }

    @ParameterizedTest
    @CsvSource({
        "0, 2023-06-15", // SD0 = same day (Thursday)
        "1, 2023-06-16", // SD1 = Friday
        "2, 2023-06-19", // SD2 = Monday
        "3, 2023-06-20", // SD3 = Tuesday
        "4, 2023-06-21"  // SD4 = Wednesday
    })
    @DisplayName("Should get settlement date for day correctly")
    void testGetSettlementDateForDay(int settlementDay, String expectedDateString) {
        LocalDate businessDate = LocalDate.of(2023, 6, 15); // Thursday
        LocalDate expectedDate = LocalDate.parse(expectedDateString);
        LocalDate result = DateUtil.getSettlementDateForDay(businessDate, settlementDay);
        assertEquals(expectedDate, result);
    }

    @Test
    @DisplayName("Should throw exception for invalid settlement day")
    void testGetSettlementDateForDayInvalidInput() {
        LocalDate businessDate = LocalDate.of(2023, 6, 15);
        
        assertThrows(IllegalArgumentException.class, () -> {
            DateUtil.getSettlementDateForDay(businessDate, -1);
        });
        
        assertThrows(IllegalArgumentException.class, () -> {
            DateUtil.getSettlementDateForDay(businessDate, 5);
        });
    }

    @ParameterizedTest
    @MethodSource("settlementWindowTestCases")
    @DisplayName("Should determine if date is within settlement window")
    void testIsWithinSettlementWindow(LocalDate businessDate, LocalDate date, boolean expected) {
        boolean result = DateUtil.isWithinSettlementWindow(businessDate, date);
        assertEquals(expected, result);
    }

    static Stream<Arguments> settlementWindowTestCases() {
        LocalDate businessDate = LocalDate.of(2023, 6, 15); // Thursday
        return Stream.of(
            // Same day (SD0) = true
            Arguments.of(businessDate, businessDate, true),
            
            // Next business day (SD1) = true
            Arguments.of(businessDate, LocalDate.of(2023, 6, 16), true),
            
            // Next Monday (SD2) = true
            Arguments.of(businessDate, LocalDate.of(2023, 6, 19), true),
            
            // Next Tuesday (SD3) = true
            Arguments.of(businessDate, LocalDate.of(2023, 6, 20), true),
            
            // Next Wednesday (SD4) = true
            Arguments.of(businessDate, LocalDate.of(2023, 6, 21), true),
            
            // Next Thursday (outside window) = false
            Arguments.of(businessDate, LocalDate.of(2023, 6, 22), false),
            
            // Previous day (outside window) = false
            Arguments.of(businessDate, LocalDate.of(2023, 6, 14), false)
        );
    }

    @Test
    @DisplayName("Should determine if current time is before market cutoff")
    void testIsBeforeMarketCutoff() {
        // Testing US market before cutoff
        try (MockedStatic<ZonedDateTime> mockedDateTime = Mockito.mockStatic(ZonedDateTime.class)) {
            ZonedDateTime beforeCutoff = ZonedDateTime.of(
                LocalDateTime.of(2023, 6, 15, 10, 0), // 10:00 AM
                ZoneId.of("America/New_York")
            );
            
            mockedDateTime.when(() -> ZonedDateTime.now(any(ZoneId.class))).thenReturn(beforeCutoff);
            
            boolean result = DateUtil.isBeforeMarketCutoff("US");
            assertTrue(result);
        }
        
        // Testing US market after cutoff
        try (MockedStatic<ZonedDateTime> mockedDateTime = Mockito.mockStatic(ZonedDateTime.class)) {
            ZonedDateTime afterCutoff = ZonedDateTime.of(
                LocalDateTime.of(2023, 6, 15, 17, 0), // 5:00 PM
                ZoneId.of("America/New_York")
            );
            
            mockedDateTime.when(() -> ZonedDateTime.now(any(ZoneId.class))).thenReturn(afterCutoff);
            
            boolean result = DateUtil.isBeforeMarketCutoff("US");
            assertFalse(result);
        }
        
        // Testing JP market before cutoff
        try (MockedStatic<ZonedDateTime> mockedDateTime = Mockito.mockStatic(ZonedDateTime.class)) {
            ZonedDateTime beforeCutoff = ZonedDateTime.of(
                LocalDateTime.of(2023, 6, 15, 14, 0), // 2:00 PM
                ZoneId.of("Asia/Tokyo")
            );
            
            mockedDateTime.when(() -> ZonedDateTime.now(any(ZoneId.class))).thenReturn(beforeCutoff);
            
            boolean result = DateUtil.isBeforeMarketCutoff("JP");
            assertTrue(result);
        }
        
        // Testing JP market after cutoff
        try (MockedStatic<ZonedDateTime> mockedDateTime = Mockito.mockStatic(ZonedDateTime.class)) {
            ZonedDateTime afterCutoff = ZonedDateTime.of(
                LocalDateTime.of(2023, 6, 15, 16, 0), // 4:00 PM
                ZoneId.of("Asia/Tokyo")
            );
            
            mockedDateTime.when(() -> ZonedDateTime.now(any(ZoneId.class))).thenReturn(afterCutoff);
            
            boolean result = DateUtil.isBeforeMarketCutoff("JP");
            assertFalse(result);
        }
    }
}