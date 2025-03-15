package com.ims.gateway.handler;

import com.ims.common.exception.BaseException;
import com.ims.common.exception.ValidationException;
import com.ims.common.exception.NotFoundException;
import com.ims.common.exception.ServiceException;
import com.ims.common.exception.SecurityException;

import org.springframework.boot.autoconfigure.web.WebProperties;
import org.springframework.boot.autoconfigure.web.reactive.error.AbstractErrorWebExceptionHandler;
import org.springframework.boot.web.reactive.error.ErrorAttributes;
import org.springframework.context.ApplicationContext;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerCodecConfigurer;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.server.RequestPredicates;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.RouterFunctions;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import org.springframework.web.server.ResponseStatusException;

import reactor.core.publisher.Mono;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.HashMap;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Global error handler for the API Gateway that intercepts exceptions and transforms them into
 * standardized API error responses with appropriate HTTP status codes.
 */
@Component
@Order(-2) // High precedence to ensure this handler runs before other error handlers
@Slf4j
public class ErrorHandler extends AbstractErrorWebExceptionHandler {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;
    private static final String DEFAULT_ERROR_CODE = "SYSTEM_ERROR";
    private static final String DEFAULT_ERROR_MESSAGE = "An unexpected error occurred";
    
    private final ErrorAttributes errorAttributes;

    /**
     * Constructs a new ErrorHandler with required dependencies.
     *
     * @param errorAttributes the error attributes to use
     * @param applicationContext the current application context
     * @param serverCodecConfigurer the server codec configurer
     * @param webProperties the web properties
     */
    public ErrorHandler(ErrorAttributes errorAttributes,
                       ApplicationContext applicationContext,
                       ServerCodecConfigurer serverCodecConfigurer,
                       WebProperties webProperties) {
        super(errorAttributes, webProperties.getResources(), applicationContext);
        super.setMessageWriters(serverCodecConfigurer.getWriters());
        super.setMessageReaders(serverCodecConfigurer.getReaders());
        this.errorAttributes = errorAttributes;
    }

    /**
     * Creates a routing function to handle exceptions.
     *
     * @param errorAttributes the error attributes to use
     * @return a router function that handles all error responses
     */
    @Override
    protected RouterFunction<ServerResponse> getRoutingFunction(ErrorAttributes errorAttributes) {
        return RouterFunctions.route(RequestPredicates.all(), this::renderErrorResponse);
    }

    /**
     * Renders an error response for the given request.
     *
     * @param request the server request
     * @return the error response
     */
    private Mono<ServerResponse> renderErrorResponse(ServerRequest request) {
        Map<String, Object> errorAttributesMap = getErrorAttributes(request);
        Throwable error = errorAttributes.getError(request);
        HttpStatus httpStatus = getHttpStatus(error);
        
        // Log the error with appropriate severity based on status code
        logError(httpStatus, error, errorAttributesMap);
        
        return ServerResponse
                .status(httpStatus)
                .contentType(MediaType.APPLICATION_JSON)
                .body(BodyInserters.fromValue(errorAttributesMap));
    }

    /**
     * Extracts error attributes from the request and exception.
     *
     * @param request the server request
     * @return map of error attributes for the response
     */
    private Map<String, Object> getErrorAttributes(ServerRequest request) {
        Throwable error = errorAttributes.getError(request);
        Map<String, Object> errorAttributesMap = new HashMap<>();
        
        // Add common attributes
        errorAttributesMap.put("timestamp", LocalDateTime.now().format(ISO_FORMATTER));
        errorAttributesMap.put("path", request.path());
        
        // Handle different exception types
        if (error instanceof ValidationException) {
            handleValidationException((ValidationException) error, errorAttributesMap);
        } else if (error instanceof NotFoundException) {
            handleNotFoundException((NotFoundException) error, errorAttributesMap);
        } else if (error instanceof SecurityException) {
            handleSecurityException((SecurityException) error, errorAttributesMap);
        } else if (error instanceof ServiceException) {
            handleServiceException((ServiceException) error, errorAttributesMap);
        } else if (error instanceof BaseException) {
            handleBaseException((BaseException) error, errorAttributesMap);
        } else {
            handleGenericException(error, errorAttributesMap);
        }
        
        return errorAttributesMap;
    }

    /**
     * Determines the appropriate HTTP status code for the exception.
     *
     * @param error the throwable
     * @return the HTTP status code
     */
    private HttpStatus getHttpStatus(Throwable error) {
        if (error instanceof ResponseStatusException) {
            return ((ResponseStatusException) error).getStatus();
        } else if (error instanceof ValidationException) {
            return HttpStatus.BAD_REQUEST;
        } else if (error instanceof NotFoundException) {
            return HttpStatus.NOT_FOUND;
        } else if (error instanceof SecurityException) {
            SecurityException securityException = (SecurityException) error;
            if (securityException.isAuthenticationFailure()) {
                return HttpStatus.UNAUTHORIZED;
            } else if (securityException.isAuthorizationFailure()) {
                return HttpStatus.FORBIDDEN;
            }
            return HttpStatus.FORBIDDEN;
        } else if (error instanceof ServiceException) {
            return HttpStatus.SERVICE_UNAVAILABLE;
        } else {
            return HttpStatus.INTERNAL_SERVER_ERROR;
        }
    }

    /**
     * Handles ValidationException by adding validation-specific details to error attributes.
     *
     * @param ex the validation exception
     * @param errorAttributes map of error attributes to update
     */
    private void handleValidationException(ValidationException ex, Map<String, Object> errorAttributes) {
        errorAttributes.put("errorCode", ex.getErrorCode());
        errorAttributes.put("errorMessage", ex.getErrorMessage());
        errorAttributes.put("correlationId", ex.getCorrelationId());
        errorAttributes.put("entityName", ex.getEntityName());
        errorAttributes.put("fieldErrors", ex.getFieldErrors());
    }

    /**
     * Handles NotFoundException by adding not-found-specific details to error attributes.
     *
     * @param ex the not found exception
     * @param errorAttributes map of error attributes to update
     */
    private void handleNotFoundException(NotFoundException ex, Map<String, Object> errorAttributes) {
        errorAttributes.put("errorCode", ex.getErrorCode());
        errorAttributes.put("errorMessage", ex.getErrorMessage());
        errorAttributes.put("correlationId", ex.getCorrelationId());
        errorAttributes.put("resourceType", ex.getResourceType());
        errorAttributes.put("resourceId", ex.getResourceId());
    }

    /**
     * Handles SecurityException by adding security-specific details to error attributes.
     *
     * @param ex the security exception
     * @param errorAttributes map of error attributes to update
     */
    private void handleSecurityException(SecurityException ex, Map<String, Object> errorAttributes) {
        errorAttributes.put("errorCode", ex.getErrorCode());
        errorAttributes.put("errorMessage", ex.getErrorMessage());
        errorAttributes.put("correlationId", ex.getCorrelationId());
        errorAttributes.put("violationType", ex.getViolationType());
        
        if (ex.getUserId() != null) {
            errorAttributes.put("userId", ex.getUserId());
        }
        
        if (ex.getResourceName() != null) {
            errorAttributes.put("resourceName", ex.getResourceName());
        }
        
        if (ex.getRequiredPermission() != null) {
            errorAttributes.put("requiredPermission", ex.getRequiredPermission());
        }
    }

    /**
     * Handles ServiceException by adding service-specific details to error attributes.
     *
     * @param ex the service exception
     * @param errorAttributes map of error attributes to update
     */
    private void handleServiceException(ServiceException ex, Map<String, Object> errorAttributes) {
        errorAttributes.put("errorCode", ex.getErrorCode());
        errorAttributes.put("errorMessage", ex.getErrorMessage());
        errorAttributes.put("correlationId", ex.getCorrelationId());
        errorAttributes.put("serviceName", ex.getServiceName());
        
        if (ex.getOperation() != null) {
            errorAttributes.put("operation", ex.getOperation());
        }
        
        errorAttributes.put("retryable", ex.isRetryable());
    }

    /**
     * Handles BaseException by adding standard details to error attributes.
     *
     * @param ex the base exception
     * @param errorAttributes map of error attributes to update
     */
    private void handleBaseException(BaseException ex, Map<String, Object> errorAttributes) {
        errorAttributes.put("errorCode", ex.getErrorCode());
        errorAttributes.put("errorMessage", ex.getErrorMessage());
        errorAttributes.put("correlationId", ex.getCorrelationId());
    }

    /**
     * Handles generic exceptions by adding default error details.
     *
     * @param ex the throwable
     * @param errorAttributes map of error attributes to update
     */
    private void handleGenericException(Throwable ex, Map<String, Object> errorAttributes) {
        errorAttributes.put("errorCode", DEFAULT_ERROR_CODE);
        errorAttributes.put("errorMessage", ex.getMessage() != null ? ex.getMessage() : DEFAULT_ERROR_MESSAGE);
        errorAttributes.put("correlationId", UUID.randomUUID().toString());
        errorAttributes.put("exceptionType", ex.getClass().getName());
    }

    /**
     * Logs the error with appropriate severity based on HTTP status.
     *
     * @param status the HTTP status
     * @param error the throwable
     * @param errorAttributes the error attributes map
     */
    private void logError(HttpStatus status, Throwable error, Map<String, Object> errorAttributes) {
        String correlationId = errorAttributes.getOrDefault("correlationId", "unknown").toString();
        String path = errorAttributes.getOrDefault("path", "unknown").toString();
        
        if (status.is5xxServerError()) {
            log.error("Server error: {} on path {} with correlationId {}: {}", 
                    status, path, correlationId, error.getMessage(), error);
        } else if (status.is4xxClientError()) {
            log.warn("Client error: {} on path {} with correlationId {}: {}", 
                    status, path, correlationId, error.getMessage());
        } else {
            log.info("Error: {} on path {} with correlationId {}: {}", 
                    status, path, correlationId, error.getMessage());
        }
    }
}