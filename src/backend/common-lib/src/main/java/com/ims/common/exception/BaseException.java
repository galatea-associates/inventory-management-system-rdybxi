package com.ims.common.exception;

import java.io.Serializable; // JDK 17
import java.util.UUID; // JDK 17
import java.time.LocalDateTime; // JDK 17

/**
 * Abstract base class for all custom exceptions in the Inventory Management System.
 * Provides common functionality for error handling, including error codes, messages,
 * and correlation IDs for tracing.
 */
public abstract class BaseException extends RuntimeException implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private final String errorCode;
    private final String errorMessage;
    private final String correlationId;
    private final LocalDateTime timestamp;
    private final String errorId;
    private final Object[] args;
    
    /**
     * Constructs a new BaseException with the specified error code, message, and
     * optional arguments for message formatting.
     *
     * @param errorCode The unique code identifying this error type
     * @param errorMessage The error message, potentially containing format specifiers
     * @param args Optional arguments for formatting the error message
     */
    public BaseException(String errorCode, String errorMessage, Object... args) {
        super(formatMessage(errorMessage, args));
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.args = args;
        this.errorId = UUID.randomUUID().toString();
        this.timestamp = LocalDateTime.now();
        this.correlationId = getCorrelationIdFromContext();
    }
    
    /**
     * Constructs a new BaseException with the specified error code, message, cause, and
     * optional arguments for message formatting.
     *
     * @param errorCode The unique code identifying this error type
     * @param errorMessage The error message, potentially containing format specifiers
     * @param cause The cause of this exception
     * @param args Optional arguments for formatting the error message
     */
    public BaseException(String errorCode, String errorMessage, Throwable cause, Object... args) {
        super(formatMessage(errorMessage, args), cause);
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.args = args;
        this.errorId = UUID.randomUUID().toString();
        this.timestamp = LocalDateTime.now();
        this.correlationId = getCorrelationIdFromContext();
    }
    
    /**
     * Returns the error code associated with this exception.
     *
     * @return The error code
     */
    public String getErrorCode() {
        return errorCode;
    }
    
    /**
     * Returns the error message associated with this exception.
     *
     * @return The error message
     */
    public String getErrorMessage() {
        return errorMessage;
    }
    
    /**
     * Returns the correlation ID for tracing this exception across services.
     *
     * @return The correlation ID
     */
    public String getCorrelationId() {
        return correlationId;
    }
    
    /**
     * Returns the timestamp when this exception was created.
     *
     * @return The timestamp
     */
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    /**
     * Returns the unique ID for this specific exception instance.
     *
     * @return The error ID
     */
    public String getErrorId() {
        return errorId;
    }
    
    /**
     * Returns the arguments used for formatting the error message.
     *
     * @return The formatting arguments
     */
    public Object[] getArgs() {
        return args;
    }
    
    /**
     * Formats the error message with the provided arguments.
     *
     * @param message The message template
     * @param args The arguments to format the message
     * @return The formatted message
     */
    private static String formatMessage(String message, Object[] args) {
        if (message == null) {
            return null;
        }
        
        if (args == null || args.length == 0) {
            return message;
        }
        
        try {
            return String.format(message, args);
        } catch (Exception e) {
            // If formatting fails, return the original message
            return message;
        }
    }
    
    /**
     * Attempts to retrieve the correlation ID from the current thread context.
     * If not available, generates a new one.
     *
     * @return The correlation ID
     */
    private String getCorrelationIdFromContext() {
        // In a real implementation, this would retrieve the correlation ID from
        // a thread-local variable, MDC, or other context mechanism.
        // For simplicity, we'll just generate a new one here
        return UUID.randomUUID().toString();
    }
}