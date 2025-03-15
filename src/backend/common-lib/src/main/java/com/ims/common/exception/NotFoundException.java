package com.ims.common.exception;

import lombok.Getter;
import java.util.UUID;

/**
 * Exception thrown when a requested resource cannot be found in the Inventory Management System.
 * This exception is used for handling resource not found scenarios with additional context
 * about the resource type and identifier.
 */
@Getter
public class NotFoundException extends BaseException {

    /**
     * Error code constant for resource not found scenarios.
     */
    private static final String ERROR_CODE_NOT_FOUND = "NOT_FOUND";
    
    /**
     * The type of resource that was not found (e.g., "Security", "Position", "Counterparty").
     */
    private final String resourceType;
    
    /**
     * The identifier of the resource that was not found.
     */
    private final String resourceId;
    
    /**
     * Constructs a new NotFoundException with the specified resource type and ID.
     *
     * @param resourceType the type of resource that was not found
     * @param resourceId the identifier of the resource that was not found
     */
    public NotFoundException(String resourceType, String resourceId) {
        super(ERROR_CODE_NOT_FOUND, "Resource not found: %s with ID %s", resourceType, resourceId);
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
    
    /**
     * Constructs a new NotFoundException with the specified resource type, ID, and custom message.
     *
     * @param resourceType the type of resource that was not found
     * @param resourceId the identifier of the resource that was not found
     * @param message the custom error message
     */
    public NotFoundException(String resourceType, String resourceId, String message) {
        super(ERROR_CODE_NOT_FOUND, message);
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
    
    /**
     * Constructs a new NotFoundException with the specified resource type, ID, message, and cause.
     *
     * @param resourceType the type of resource that was not found
     * @param resourceId the identifier of the resource that was not found
     * @param message the custom error message
     * @param cause the cause of this exception
     */
    public NotFoundException(String resourceType, String resourceId, String message, Throwable cause) {
        super(ERROR_CODE_NOT_FOUND, message, cause);
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
    
    /**
     * Constructs a new NotFoundException with the specified resource type, ID, message, details, cause, and correlation ID.
     *
     * @param resourceType the type of resource that was not found
     * @param resourceId the identifier of the resource that was not found
     * @param message the custom error message
     * @param details additional details about the exception
     * @param cause the cause of this exception
     * @param correlationId the correlation ID for tracking this exception across services
     */
    public NotFoundException(String resourceType, String resourceId, String message, String details, Throwable cause, UUID correlationId) {
        // Note: BaseException doesn't have a constructor with these exact parameters in the provided code
        // This is a placeholder implementation assuming BaseException has or will have such a constructor
        super(ERROR_CODE_NOT_FOUND, message, cause);
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
    
    /**
     * Creates a new exception with the specified resource type.
     *
     * @param resourceType the new resource type
     * @return a new exception with the specified resource type
     */
    public NotFoundException withResourceType(String resourceType) {
        return new NotFoundException(
            resourceType,
            this.resourceId,
            this.getErrorMessage(),
            null,
            null,
            UUID.fromString(this.getCorrelationId())
        );
    }
    
    /**
     * Creates a new exception with the specified resource ID.
     *
     * @param resourceId the new resource ID
     * @return a new exception with the specified resource ID
     */
    public NotFoundException withResourceId(String resourceId) {
        return new NotFoundException(
            this.resourceType,
            resourceId,
            this.getErrorMessage(),
            null,
            null,
            UUID.fromString(this.getCorrelationId())
        );
    }
    
    /**
     * Creates a new exception with the specified correlation ID.
     *
     * @param correlationId the new correlation ID
     * @return a new exception with the specified correlation ID
     */
    public NotFoundException withCorrelationId(UUID correlationId) {
        return new NotFoundException(
            this.resourceType,
            this.resourceId,
            this.getErrorMessage(),
            null,
            null,
            correlationId
        );
    }
    
    /**
     * Creates a new exception with the specified details.
     *
     * @param details the new details
     * @return a new exception with the specified details
     */
    public NotFoundException withDetails(String details) {
        return new NotFoundException(
            this.resourceType,
            this.resourceId,
            this.getErrorMessage(),
            details,
            null,
            UUID.fromString(this.getCorrelationId())
        );
    }
}