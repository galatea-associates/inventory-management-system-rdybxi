package com.ims.common.exception;

import lombok.Getter; // lombok 1.18.26
import java.util.UUID; // JDK 17

/**
 * Exception thrown when service-level failures occur in the Inventory Management System.
 * This exception provides context about which service failed, what operation was being performed,
 * and whether the operation can be retried.
 */
@Getter
public class ServiceException extends BaseException {

    private static final String ERROR_CODE_SERVICE = "SERVICE_ERROR";
    
    private final String serviceName;
    private final String operation;
    private final boolean retryable;
    
    /**
     * Constructor with service name and message.
     *
     * @param serviceName The name of the service where the exception occurred
     * @param message     The error message
     */
    public ServiceException(String serviceName, String message) {
        super(ERROR_CODE_SERVICE, message);
        this.serviceName = serviceName;
        this.operation = null;
        this.retryable = false;
    }

    /**
     * Constructor with service name, message, and cause.
     *
     * @param serviceName The name of the service where the exception occurred
     * @param message     The error message
     * @param cause       The cause of this exception
     */
    public ServiceException(String serviceName, String message, Throwable cause) {
        super(ERROR_CODE_SERVICE, message, cause);
        this.serviceName = serviceName;
        this.operation = null;
        this.retryable = false;
    }

    /**
     * Constructor with service name, operation, and message.
     *
     * @param serviceName The name of the service where the exception occurred
     * @param operation   The operation that was being performed
     * @param message     The error message
     */
    public ServiceException(String serviceName, String operation, String message) {
        super(ERROR_CODE_SERVICE, message);
        this.serviceName = serviceName;
        this.operation = operation;
        this.retryable = false;
    }

    /**
     * Constructor with service name, operation, message, and cause.
     *
     * @param serviceName The name of the service where the exception occurred
     * @param operation   The operation that was being performed
     * @param message     The error message
     * @param cause       The cause of this exception
     */
    public ServiceException(String serviceName, String operation, String message, Throwable cause) {
        super(ERROR_CODE_SERVICE, message, cause);
        this.serviceName = serviceName;
        this.operation = operation;
        this.retryable = false;
    }

    /**
     * Constructor with service name, operation, message, retryable flag, and cause.
     *
     * @param serviceName The name of the service where the exception occurred
     * @param operation   The operation that was being performed
     * @param message     The error message
     * @param retryable   Whether the operation can be retried
     * @param cause       The cause of this exception
     */
    public ServiceException(String serviceName, String operation, String message, boolean retryable, Throwable cause) {
        super(ERROR_CODE_SERVICE, message, cause);
        this.serviceName = serviceName;
        this.operation = operation;
        this.retryable = retryable;
    }

    /**
     * Constructor with service name, operation, message, details, retryable flag, cause, and correlation ID.
     *
     * @param serviceName  The name of the service where the exception occurred
     * @param operation    The operation that was being performed
     * @param message      The error message
     * @param details      Additional details about the error
     * @param retryable    Whether the operation can be retried
     * @param cause        The cause of this exception
     * @param correlationId The correlation ID for tracing
     */
    public ServiceException(String serviceName, String operation, String message, String details, 
                            boolean retryable, Throwable cause, UUID correlationId) {
        // Use details as an additional arg for message formatting
        super(ERROR_CODE_SERVICE, message, cause, details);
        this.serviceName = serviceName;
        this.operation = operation;
        this.retryable = retryable;
        // Note: correlationId is handled by BaseException
    }

    /**
     * Creates a new exception with the specified service name.
     *
     * @param serviceName The new service name
     * @return A new exception with the specified service name
     */
    public ServiceException withServiceName(String serviceName) {
        return new ServiceException(
            serviceName,
            this.operation,
            this.getMessage(),
            this.getErrorMessage(),
            this.retryable,
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Creates a new exception with the specified operation.
     *
     * @param operation The new operation
     * @return A new exception with the specified operation
     */
    public ServiceException withOperation(String operation) {
        return new ServiceException(
            this.serviceName,
            operation,
            this.getMessage(),
            this.getErrorMessage(),
            this.retryable,
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Creates a new exception with the specified retryable flag.
     *
     * @param retryable The new retryable flag
     * @return A new exception with the specified retryable flag
     */
    public ServiceException withRetryable(boolean retryable) {
        return new ServiceException(
            this.serviceName,
            this.operation,
            this.getMessage(),
            this.getErrorMessage(),
            retryable,
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Creates a new exception with the specified correlation ID.
     *
     * @param correlationId The new correlation ID
     * @return A new exception with the specified correlation ID
     */
    public ServiceException withCorrelationId(UUID correlationId) {
        return new ServiceException(
            this.serviceName,
            this.operation,
            this.getMessage(),
            this.getErrorMessage(),
            this.retryable,
            this.getCause(),
            correlationId
        );
    }

    /**
     * Creates a new exception with the specified details.
     *
     * @param details The new details
     * @return A new exception with the specified details
     */
    public ServiceException withDetails(String details) {
        return new ServiceException(
            this.serviceName,
            this.operation,
            this.getMessage(),
            details,
            this.retryable,
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Checks if this exception represents a retryable error.
     *
     * @return True if the error is retryable, false otherwise
     */
    public boolean isRetryable() {
        return retryable;
    }
}