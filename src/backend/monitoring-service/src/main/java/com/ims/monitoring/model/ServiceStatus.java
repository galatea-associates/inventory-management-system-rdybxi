package com.ims.monitoring.model;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Represents the health status of an individual service within the Inventory Management System.
 * Provides detailed information about a service's operational status, response time, dependencies,
 * and metrics for monitoring and alerting purposes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ServiceStatus {
    
    /**
     * Unique identifier for the service
     */
    private String serviceId;
    
    /**
     * Human-readable name of the service
     */
    private String serviceName;
    
    /**
     * Current operational status (UP, DOWN, DEGRADED)
     */
    private String status;
    
    /**
     * Timestamp when this status was recorded
     */
    private LocalDateTime timestamp;
    
    /**
     * Version of the service
     */
    private String version;
    
    /**
     * Hostname where the service is running
     */
    private String host;
    
    /**
     * Port number the service is listening on
     */
    private Integer port;
    
    /**
     * Flag indicating if this is a critical service
     */
    private Boolean isCritical;
    
    /**
     * Time in milliseconds taken to check the service health
     */
    private Long responseTime;
    
    /**
     * Additional details or error message
     */
    private String message;
    
    /**
     * Status of service dependencies (key: dependency name, value: status)
     */
    private Map<String, String> dependencies;
    
    /**
     * Service metrics (key: metric name, value: metric value)
     */
    private Map<String, Object> metrics;
    
    /**
     * Health check endpoint URL
     */
    private String endpoint;
    
    /**
     * Count of consecutive health check failures
     */
    private Integer errorCount;
    
    /**
     * Timestamp of the last successful health check
     */
    private LocalDateTime lastSuccessfulCheck;
    
    /**
     * Type of health check (LIVENESS, READINESS, DEPENDENCY)
     */
    private String healthCheckType;
    
    /**
     * Determines if the service is healthy based on status
     *
     * @return true if the service status is 'UP', false otherwise
     */
    public boolean isHealthy() {
        return "UP".equals(status);
    }
    
    /**
     * Determines if the service is in a degraded state
     *
     * @return true if the service status is 'DEGRADED', false otherwise
     */
    public boolean isDegraded() {
        return "DEGRADED".equals(status);
    }
    
    /**
     * Determines if the service is down
     *
     * @return true if the service status is 'DOWN', false otherwise
     */
    public boolean isDown() {
        return "DOWN".equals(status);
    }
    
    /**
     * Checks if any dependencies are reporting failure status
     *
     * @return true if any dependency has a status other than 'UP', false otherwise
     */
    public boolean hasDependencyFailure() {
        if (dependencies == null || dependencies.isEmpty()) {
            return false;
        }
        
        return dependencies.values().stream()
                .anyMatch(status -> !"UP".equals(status));
    }
    
    /**
     * Gets the response time in milliseconds
     *
     * @return response time in milliseconds, or 0 if not available
     */
    public long getResponseTimeInMillis() {
        return responseTime != null ? responseTime : 0L;
    }
    
    /**
     * Gets the total number of dependencies for this service
     *
     * @return number of dependencies
     */
    public int getDependencyCount() {
        return dependencies != null ? dependencies.size() : 0;
    }
    
    /**
     * Gets the number of healthy dependencies for this service
     *
     * @return number of healthy dependencies
     */
    public int getHealthyDependencyCount() {
        if (dependencies == null) {
            return 0;
        }
        
        return (int) dependencies.values().stream()
                .filter("UP"::equals)
                .count();
    }
    
    /**
     * Calculates the percentage of healthy dependencies
     *
     * @return percentage of healthy dependencies (0-100)
     */
    public double getDependencyHealthPercentage() {
        int totalCount = getDependencyCount();
        if (totalCount == 0) {
            return 100.0; // All healthy by default if no dependencies
        }
        
        int healthyCount = getHealthyDependencyCount();
        return ((double) healthyCount / totalCount) * 100.0;
    }
    
    /**
     * Gets a specific metric value by name
     *
     * @param metricName the name of the metric to retrieve
     * @return value of the specified metric, or null if not found
     */
    public Object getMetric(String metricName) {
        if (metrics == null) {
            return null;
        }
        
        return metrics.get(metricName);
    }
    
    /**
     * Calculates the time elapsed since the last successful health check
     *
     * @return time in seconds since last successful check, or -1 if never checked successfully
     */
    public long getTimeSinceLastSuccessfulCheck() {
        if (lastSuccessfulCheck == null) {
            return -1;
        }
        
        return Duration.between(lastSuccessfulCheck, LocalDateTime.now()).getSeconds();
    }
}