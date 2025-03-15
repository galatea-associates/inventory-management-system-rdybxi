package com.ims.common.util;

import java.util.UUID;  // Java 17
import org.slf4j.MDC;   // org.slf4j 1.7.36
import lombok.extern.slf4j.Slf4j;  // lombok 1.18.26

/**
 * Utility class for managing correlation IDs used for distributed tracing across microservices
 * in the Inventory Management System. Provides methods for generating, retrieving, and
 * propagating correlation IDs to ensure end-to-end request tracking.
 * 
 * This utility supports the distributed tracing framework by enabling trace propagation
 * across service boundaries and providing context for error handling and monitoring.
 */
@Slf4j
public class CorrelationIdUtil {

    /**
     * HTTP header name for correlation ID propagation between services
     */
    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    
    /**
     * MDC key for storing correlation ID in the logging context
     */
    public static final String CORRELATION_ID_MDC_KEY = "correlationId";
    
    /**
     * ThreadLocal storage for correlation IDs within the current thread
     */
    private static final ThreadLocal<String> CORRELATION_ID_CONTEXT = new ThreadLocal<>();
    
    /**
     * Generates a new unique correlation ID
     * 
     * @return A new unique correlation ID based on UUID
     */
    public static String generateCorrelationId() {
        return UUID.randomUUID().toString();
    }
    
    /**
     * Retrieves the current correlation ID from the thread context
     * 
     * @return The current correlation ID or null if not set
     */
    public static String getCorrelationId() {
        return CORRELATION_ID_CONTEXT.get();
    }
    
    /**
     * Sets the correlation ID in the current thread context and MDC
     * 
     * @param correlationId The correlation ID to set
     */
    public static void setCorrelationId(String correlationId) {
        CORRELATION_ID_CONTEXT.set(correlationId);
        MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
        log.debug("Correlation ID set: {}", correlationId);
    }
    
    /**
     * Clears the correlation ID from the current thread context and MDC
     */
    public static void clearCorrelationId() {
        String correlationId = CORRELATION_ID_CONTEXT.get();
        CORRELATION_ID_CONTEXT.remove();
        MDC.remove(CORRELATION_ID_MDC_KEY);
        log.debug("Correlation ID cleared: {}", correlationId);
    }
    
    /**
     * Gets the current correlation ID or creates a new one if not present
     * 
     * @return The existing or newly created correlation ID
     */
    public static String getOrCreateCorrelationId() {
        String correlationId = getCorrelationId();
        if (correlationId == null || correlationId.isEmpty()) {
            correlationId = generateCorrelationId();
            setCorrelationId(correlationId);
        }
        return correlationId;
    }
    
    /**
     * Executes a Runnable with a specific correlation ID and restores the previous ID afterward.
     * This is useful for background tasks that need to maintain the correlation context.
     * 
     * @param correlationId The correlation ID to use during execution
     * @param runnable The runnable to execute
     */
    public static void withCorrelationId(String correlationId, Runnable runnable) {
        String originalCorrelationId = getCorrelationId();
        try {
            setCorrelationId(correlationId);
            runnable.run();
        } finally {
            // Restore the original correlation ID
            if (originalCorrelationId != null) {
                setCorrelationId(originalCorrelationId);
            } else {
                clearCorrelationId();
            }
        }
    }
}