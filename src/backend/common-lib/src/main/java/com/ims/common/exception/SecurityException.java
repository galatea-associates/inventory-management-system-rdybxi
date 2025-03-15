package com.ims.common.exception;

import lombok.Getter;
import java.util.UUID;

/**
 * Exception thrown when security violations occur in the Inventory Management System.
 * This includes unauthorized access attempts, authentication failures, insufficient permissions,
 * or other security policy violations.
 */
@Getter
public class SecurityException extends BaseException {

    /**
     * Error code for security-related exceptions.
     */
    private static final String ERROR_CODE_SECURITY = "SECURITY_ERROR";

    /**
     * The type of security violation that occurred.
     * Examples: "AUTHENTICATION_FAILURE", "AUTHORIZATION_FAILURE", "TOKEN_EXPIRED"
     */
    private final String violationType;

    /**
     * The ID of the user who attempted the operation that caused the security exception.
     */
    private final String userId;

    /**
     * The name of the resource that was being accessed when the security exception occurred.
     */
    private final String resourceName;

    /**
     * The permission that would have been required to access the resource.
     */
    private final String requiredPermission;

    /**
     * Constructs a new SecurityException with the specified violation type and message.
     *
     * @param violationType The type of security violation
     * @param message The error message
     */
    public SecurityException(String violationType, String message) {
        super(ERROR_CODE_SECURITY, message);
        this.violationType = violationType;
        this.userId = null;
        this.resourceName = null;
        this.requiredPermission = null;
    }

    /**
     * Constructs a new SecurityException with the specified violation type, message, and cause.
     *
     * @param violationType The type of security violation
     * @param message The error message
     * @param cause The cause of this exception
     */
    public SecurityException(String violationType, String message, Throwable cause) {
        super(ERROR_CODE_SECURITY, message, cause);
        this.violationType = violationType;
        this.userId = null;
        this.resourceName = null;
        this.requiredPermission = null;
    }

    /**
     * Constructs a new SecurityException with the specified violation type, user ID, and message.
     *
     * @param violationType The type of security violation
     * @param userId The ID of the user who attempted the operation
     * @param message The error message
     */
    public SecurityException(String violationType, String userId, String message) {
        super(ERROR_CODE_SECURITY, message);
        this.violationType = violationType;
        this.userId = userId;
        this.resourceName = null;
        this.requiredPermission = null;
    }

    /**
     * Constructs a new SecurityException with the specified violation type, user ID, message, and cause.
     *
     * @param violationType The type of security violation
     * @param userId The ID of the user who attempted the operation
     * @param message The error message
     * @param cause The cause of this exception
     */
    public SecurityException(String violationType, String userId, String message, Throwable cause) {
        super(ERROR_CODE_SECURITY, message, cause);
        this.violationType = violationType;
        this.userId = userId;
        this.resourceName = null;
        this.requiredPermission = null;
    }

    /**
     * Constructs a new SecurityException with the specified violation type, user ID, resource name,
     * required permission, and message.
     *
     * @param violationType The type of security violation
     * @param userId The ID of the user who attempted the operation
     * @param resourceName The name of the resource being accessed
     * @param requiredPermission The permission required to access the resource
     * @param message The error message
     */
    public SecurityException(String violationType, String userId, String resourceName,
                            String requiredPermission, String message) {
        super(ERROR_CODE_SECURITY, message);
        this.violationType = violationType;
        this.userId = userId;
        this.resourceName = resourceName;
        this.requiredPermission = requiredPermission;
    }

    /**
     * Constructs a new SecurityException with the specified violation type, user ID, resource name,
     * required permission, message, and cause.
     *
     * @param violationType The type of security violation
     * @param userId The ID of the user who attempted the operation
     * @param resourceName The name of the resource being accessed
     * @param requiredPermission The permission required to access the resource
     * @param message The error message
     * @param cause The cause of this exception
     */
    public SecurityException(String violationType, String userId, String resourceName,
                            String requiredPermission, String message, Throwable cause) {
        super(ERROR_CODE_SECURITY, message, cause);
        this.violationType = violationType;
        this.userId = userId;
        this.resourceName = resourceName;
        this.requiredPermission = requiredPermission;
    }

    /**
     * Constructs a new SecurityException with all properties specified.
     * Note: The details parameter is passed as an argument for message formatting,
     * and the correlationId parameter is used to maintain API compatibility but is not
     * directly set in the BaseException as it generates its own correlation ID.
     *
     * @param violationType The type of security violation
     * @param userId The ID of the user who attempted the operation
     * @param resourceName The name of the resource being accessed
     * @param requiredPermission The permission required to access the resource
     * @param message The error message
     * @param details Additional error details (passed as an argument to message formatting)
     * @param cause The cause of this exception
     * @param correlationId The correlation ID for tracing (not directly used)
     */
    public SecurityException(String violationType, String userId, String resourceName,
                            String requiredPermission, String message, String details,
                            Throwable cause, UUID correlationId) {
        // Pass details as an argument for message formatting in the parent class
        super(ERROR_CODE_SECURITY, message, cause, details);
        this.violationType = violationType;
        this.userId = userId;
        this.resourceName = resourceName;
        this.requiredPermission = requiredPermission;
        // Note: correlationId cannot be directly set in BaseException
    }

    /**
     * Creates a new SecurityException with the specified violation type.
     *
     * @param violationType The new violation type
     * @return A new SecurityException with the updated violation type
     */
    public SecurityException withViolationType(String violationType) {
        return new SecurityException(
            violationType,
            this.userId,
            this.resourceName,
            this.requiredPermission,
            this.getErrorMessage(),
            null,
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Creates a new SecurityException with the specified user ID.
     *
     * @param userId The new user ID
     * @return A new SecurityException with the updated user ID
     */
    public SecurityException withUserId(String userId) {
        return new SecurityException(
            this.violationType,
            userId,
            this.resourceName,
            this.requiredPermission,
            this.getErrorMessage(),
            null,
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Creates a new SecurityException with the specified resource name.
     *
     * @param resourceName The new resource name
     * @return A new SecurityException with the updated resource name
     */
    public SecurityException withResourceName(String resourceName) {
        return new SecurityException(
            this.violationType,
            this.userId,
            resourceName,
            this.requiredPermission,
            this.getErrorMessage(),
            null,
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Creates a new SecurityException with the specified required permission.
     *
     * @param requiredPermission The new required permission
     * @return A new SecurityException with the updated required permission
     */
    public SecurityException withRequiredPermission(String requiredPermission) {
        return new SecurityException(
            this.violationType,
            this.userId,
            this.resourceName,
            requiredPermission,
            this.getErrorMessage(),
            null,
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Creates a new SecurityException with the specified correlation ID.
     * Note: The correlation ID cannot be directly set in BaseException,
     * so this method has limited effectiveness.
     *
     * @param correlationId The new correlation ID
     * @return A new SecurityException with the updated correlation ID
     */
    public SecurityException withCorrelationId(UUID correlationId) {
        return new SecurityException(
            this.violationType,
            this.userId,
            this.resourceName,
            this.requiredPermission,
            this.getErrorMessage(),
            null,
            this.getCause(),
            correlationId
        );
    }

    /**
     * Creates a new SecurityException with the specified details.
     *
     * @param details The new details
     * @return A new SecurityException with the updated details
     */
    public SecurityException withDetails(String details) {
        return new SecurityException(
            this.violationType,
            this.userId,
            this.resourceName,
            this.requiredPermission,
            this.getErrorMessage(),
            details,
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Checks if this exception represents an authentication failure.
     *
     * @return true if the violation type is related to authentication failure
     */
    public boolean isAuthenticationFailure() {
        return violationType != null && violationType.startsWith("AUTHENTICATION");
    }

    /**
     * Checks if this exception represents an authorization failure.
     *
     * @return true if the violation type is related to authorization failure
     */
    public boolean isAuthorizationFailure() {
        return violationType != null && violationType.startsWith("AUTHORIZATION");
    }
}