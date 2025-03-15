package com.ims.calculation.exception;

import com.ims.common.exception.BaseException;
import com.ims.common.model.Security;
import lombok.Getter; // lombok 1.18.26
import java.time.LocalDate; // JDK 17
import java.util.UUID; // JDK 17

/**
 * Exception class for handling calculation-specific errors in the Inventory Management System.
 * This exception is thrown when calculation operations fail due to data issues, rule violations,
 * or processing errors in position and inventory calculations.
 */
@Getter
public class CalculationException extends BaseException {
    
    private static final String ERROR_CODE_CALCULATION = "CALCULATION_ERROR";
    
    private final String calculationType;
    private final Security security;
    private final LocalDate businessDate;
    private final boolean retryable;
    
    /**
     * Constructor with calculation type and message
     *
     * @param calculationType the type of calculation that failed
     * @param message the error message
     */
    public CalculationException(String calculationType, String message) {
        super(ERROR_CODE_CALCULATION, message);
        this.calculationType = calculationType;
        this.security = null;
        this.businessDate = null;
        this.retryable = false;
    }
    
    /**
     * Constructor with calculation type, message, and cause
     *
     * @param calculationType the type of calculation that failed
     * @param message the error message
     * @param cause the cause of the exception
     */
    public CalculationException(String calculationType, String message, Throwable cause) {
        super(ERROR_CODE_CALCULATION, message, cause);
        this.calculationType = calculationType;
        this.security = null;
        this.businessDate = null;
        this.retryable = false;
    }
    
    /**
     * Constructor with calculation type, security, business date, message, and cause
     *
     * @param calculationType the type of calculation that failed
     * @param security the security involved in the calculation
     * @param businessDate the business date for the calculation
     * @param message the error message
     * @param cause the cause of the exception
     */
    public CalculationException(String calculationType, Security security, LocalDate businessDate, String message, Throwable cause) {
        super(ERROR_CODE_CALCULATION, message, cause);
        this.calculationType = calculationType;
        this.security = security;
        this.businessDate = businessDate;
        this.retryable = false;
    }
    
    /**
     * Constructor with calculation type, security, business date, message, retryable flag, and cause
     *
     * @param calculationType the type of calculation that failed
     * @param security the security involved in the calculation
     * @param businessDate the business date for the calculation
     * @param message the error message
     * @param retryable whether the operation can be retried
     * @param cause the cause of the exception
     */
    public CalculationException(String calculationType, Security security, LocalDate businessDate, String message, boolean retryable, Throwable cause) {
        super(ERROR_CODE_CALCULATION, message, cause);
        this.calculationType = calculationType;
        this.security = security;
        this.businessDate = businessDate;
        this.retryable = retryable;
    }
    
    /**
     * Constructor with calculation type, security, business date, message, details, retryable flag, cause, and correlation ID
     *
     * @param calculationType the type of calculation that failed
     * @param security the security involved in the calculation
     * @param businessDate the business date for the calculation
     * @param message the error message
     * @param details additional error details
     * @param retryable whether the operation can be retried
     * @param cause the cause of the exception
     * @param correlationId the correlation ID for distributed tracing
     */
    public CalculationException(String calculationType, Security security, LocalDate businessDate, String message, String details, boolean retryable, Throwable cause, UUID correlationId) {
        super(ERROR_CODE_CALCULATION, message + (details != null ? ": " + details : ""), cause);
        this.calculationType = calculationType;
        this.security = security;
        this.businessDate = businessDate;
        this.retryable = retryable;
        // Note: correlationId is handled internally by BaseException
    }
    
    /**
     * Factory method to create an exception for position calculation errors
     *
     * @param security the security involved in the calculation
     * @param businessDate the business date for the calculation
     * @param message the error message
     * @return a new exception for position calculation errors
     */
    public static CalculationException forPositionCalculation(Security security, LocalDate businessDate, String message) {
        return new CalculationException("POSITION", security, businessDate, message, false, null);
    }
    
    /**
     * Factory method to create an exception for position calculation errors with cause
     *
     * @param security the security involved in the calculation
     * @param businessDate the business date for the calculation
     * @param message the error message
     * @param cause the cause of the exception
     * @return a new exception for position calculation errors
     */
    public static CalculationException forPositionCalculation(Security security, LocalDate businessDate, String message, Throwable cause) {
        return new CalculationException("POSITION", security, businessDate, message, false, cause);
    }
    
    /**
     * Factory method to create an exception for inventory calculation errors
     *
     * @param security the security involved in the calculation
     * @param businessDate the business date for the calculation
     * @param message the error message
     * @return a new exception for inventory calculation errors
     */
    public static CalculationException forInventoryCalculation(Security security, LocalDate businessDate, String message) {
        return new CalculationException("INVENTORY", security, businessDate, message, false, null);
    }
    
    /**
     * Factory method to create an exception for inventory calculation errors with cause
     *
     * @param security the security involved in the calculation
     * @param businessDate the business date for the calculation
     * @param message the error message
     * @param cause the cause of the exception
     * @return a new exception for inventory calculation errors
     */
    public static CalculationException forInventoryCalculation(Security security, LocalDate businessDate, String message, Throwable cause) {
        return new CalculationException("INVENTORY", security, businessDate, message, false, cause);
    }
    
    /**
     * Factory method to create an exception for calculation rule errors
     *
     * @param ruleId the ID of the rule that failed
     * @param message the error message
     * @return a new exception for calculation rule errors
     */
    public static CalculationException forRuleCalculation(String ruleId, String message) {
        return new CalculationException("RULE", null, null, message + " (Rule ID: " + ruleId + ")", false, null);
    }
    
    /**
     * Creates a new exception with the specified calculation type
     *
     * @param calculationType the new calculation type
     * @return a new exception with the specified calculation type
     */
    public CalculationException withCalculationType(String calculationType) {
        return new CalculationException(calculationType, this.security, this.businessDate, this.getMessage(), this.retryable, this.getCause());
    }
    
    /**
     * Creates a new exception with the specified security
     *
     * @param security the new security
     * @return a new exception with the specified security
     */
    public CalculationException withSecurity(Security security) {
        return new CalculationException(this.calculationType, security, this.businessDate, this.getMessage(), this.retryable, this.getCause());
    }
    
    /**
     * Creates a new exception with the specified business date
     *
     * @param businessDate the new business date
     * @return a new exception with the specified business date
     */
    public CalculationException withBusinessDate(LocalDate businessDate) {
        return new CalculationException(this.calculationType, this.security, businessDate, this.getMessage(), this.retryable, this.getCause());
    }
    
    /**
     * Creates a new exception with the specified retryable flag
     *
     * @param retryable the new retryable flag
     * @return a new exception with the specified retryable flag
     */
    public CalculationException withRetryable(boolean retryable) {
        return new CalculationException(this.calculationType, this.security, this.businessDate, this.getMessage(), retryable, this.getCause());
    }
    
    /**
     * Creates a new exception with the specified correlation ID.
     * Note: BaseException handles correlation IDs internally, so this method
     * creates a new exception with the same properties but may not set the
     * correlation ID as expected.
     *
     * @param correlationId the new correlation ID
     * @return a new exception with the specified correlation ID
     */
    public CalculationException withCorrelationId(UUID correlationId) {
        // Note: BaseException doesn't allow setting correlationId directly
        return new CalculationException(this.calculationType, this.security, this.businessDate, this.getMessage(), this.retryable, this.getCause());
    }
    
    /**
     * Checks if this exception represents a retryable error
     *
     * @return true if the error is retryable, false otherwise
     */
    public boolean isRetryable() {
        return retryable;
    }
}