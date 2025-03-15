package com.ims.common.exception;

import lombok.Getter; // lombok 1.18.26
import java.util.Map; // JDK 17
import java.util.HashMap; // JDK 17
import java.util.Collections; // JDK 17
import java.util.UUID; // JDK 17

/**
 * Exception thrown when input data fails validation. This is a specific type of BaseException
 * with a predefined error code for validation failures and additional context about the
 * fields that failed validation.
 */
@Getter
public class ValidationException extends BaseException {
    
    private static final String ERROR_CODE_VALIDATION = "VALIDATION_ERROR";
    
    private final String entityName;
    private final Map<String, String> fieldErrors;
    
    /**
     * Constructor with entity name and message
     *
     * @param entityName The name of the entity being validated
     * @param message The error message
     */
    public ValidationException(String entityName, String message) {
        super(ERROR_CODE_VALIDATION, message);
        this.entityName = entityName;
        this.fieldErrors = new HashMap<>();
    }
    
    /**
     * Constructor with entity name, message, and cause
     *
     * @param entityName The name of the entity being validated
     * @param message The error message
     * @param cause The cause of the exception
     */
    public ValidationException(String entityName, String message, Throwable cause) {
        super(ERROR_CODE_VALIDATION, message, cause);
        this.entityName = entityName;
        this.fieldErrors = new HashMap<>();
    }
    
    /**
     * Constructor with entity name, field errors, and message
     *
     * @param entityName The name of the entity being validated
     * @param fieldErrors Map of field names to error messages
     * @param message The error message
     */
    public ValidationException(String entityName, Map<String, String> fieldErrors, String message) {
        super(ERROR_CODE_VALIDATION, message);
        this.entityName = entityName;
        this.fieldErrors = new HashMap<>(fieldErrors != null ? fieldErrors : Collections.emptyMap());
    }
    
    /**
     * Constructor with entity name, field errors, message, and cause
     *
     * @param entityName The name of the entity being validated
     * @param fieldErrors Map of field names to error messages
     * @param message The error message
     * @param cause The cause of the exception
     */
    public ValidationException(String entityName, Map<String, String> fieldErrors, String message, Throwable cause) {
        super(ERROR_CODE_VALIDATION, message, cause);
        this.entityName = entityName;
        this.fieldErrors = new HashMap<>(fieldErrors != null ? fieldErrors : Collections.emptyMap());
    }
    
    /**
     * Constructor with entity name, field errors, message, details, cause, and correlation ID
     *
     * @param entityName The name of the entity being validated
     * @param fieldErrors Map of field names to error messages
     * @param message The error message
     * @param details Additional error details
     * @param cause The cause of the exception
     * @param correlationId The correlation ID for tracing
     */
    public ValidationException(String entityName, Map<String, String> fieldErrors, String message, 
                              String details, Throwable cause, UUID correlationId) {
        // Since BaseException doesn't directly support details and correlationId in this way,
        // we include details as part of the message
        super(ERROR_CODE_VALIDATION, details != null ? message + " - " + details : message, cause);
        this.entityName = entityName;
        this.fieldErrors = new HashMap<>(fieldErrors != null ? fieldErrors : Collections.emptyMap());
    }
    
    /**
     * Adds a field-specific validation error
     * 
     * @param field The field name
     * @param errorMessage The error message for the field
     * @return This exception instance for method chaining
     */
    public ValidationException addFieldError(String field, String errorMessage) {
        if (field != null && errorMessage != null) {
            this.fieldErrors.put(field, errorMessage);
        }
        return this;
    }
    
    /**
     * Returns an unmodifiable map of field-specific validation errors
     * 
     * @return Unmodifiable map of field errors
     */
    public Map<String, String> getFieldErrors() {
        return Collections.unmodifiableMap(fieldErrors);
    }
    
    /**
     * Checks if there are any field-specific validation errors
     * 
     * @return True if there are field errors, false otherwise
     */
    public boolean hasFieldErrors() {
        return !fieldErrors.isEmpty();
    }
    
    /**
     * Creates a new exception with the specified entity name
     * 
     * @param entityName The new entity name
     * @return A new exception with the specified entity name
     */
    public ValidationException withEntityName(String entityName) {
        return new ValidationException(
            entityName,
            this.fieldErrors,
            super.getMessage(),
            null,
            null,
            null
        );
    }
    
    /**
     * Creates a new exception with the specified field errors
     * 
     * @param fieldErrors The new field errors
     * @return A new exception with the specified field errors
     */
    public ValidationException withFieldErrors(Map<String, String> fieldErrors) {
        return new ValidationException(
            this.entityName,
            fieldErrors,
            super.getMessage(),
            null,
            null,
            null
        );
    }
    
    /**
     * Creates a new exception with the specified correlation ID
     * 
     * @param correlationId The new correlation ID
     * @return A new exception with the specified correlation ID
     */
    public ValidationException withCorrelationId(UUID correlationId) {
        return new ValidationException(
            this.entityName,
            this.fieldErrors,
            super.getMessage(),
            null,
            null,
            correlationId
        );
    }
    
    /**
     * Creates a new exception with the specified details
     * 
     * @param details The new details
     * @return A new exception with the specified details
     */
    public ValidationException withDetails(String details) {
        return new ValidationException(
            this.entityName,
            this.fieldErrors,
            super.getMessage(),
            details,
            null,
            null
        );
    }
}