package com.ims.monitoring.model;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Represents the overall health status of the Inventory Management System, including
 * service statuses, dependencies, metrics, and availability information.
 * This model provides a comprehensive view of system health for monitoring and alerting purposes,
 * supporting the high availability (99.999% uptime) requirements of the platform.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class HealthStatus {
    
    /**
     * Overall system status (UP, DOWN, DEGRADED)
     */
    private String status;
    
    /**
     * System version
     */
    private String version;
    
    /**
     * Environment name (DEV, TEST, STAGING, PRODUCTION)
     */
    private String environment;
    
    /**
     * Timestamp when this status was recorded
     */
    private LocalDateTime timestamp;
    
    /**
     * List of individual service statuses within the system
     */
    private List<ServiceStatus> services;
    
    /**
     * Status of system dependencies (key: dependency name, value: status)
     */
    private Map<String, String> dependencies;
    
    /**
     * System-wide metrics (key: metric name, value: metric value)
     */
    private Map<String, Object> metrics;
    
    /**
     * System uptime in milliseconds
     */
    private Long uptime;
    
    /**
     * System CPU load (0.0-1.0 per core)
     */
    private Double systemLoad;
    
    /**
     * Available memory in bytes
     */
    private Long availableMemory;
    
    /**
     * Total memory in bytes
     */
    private Long totalMemory;
    
    /**
     * Number of active threads
     */
    private Integer activeThreads;
    
    /**
     * Additional system status message or description
     */
    private String message;
    
    /**
     * Determines if the system is healthy based on status
     *
     * @return true if the system status is 'UP', false otherwise
     */
    public boolean isHealthy() {
        return "UP".equals(status);
    }
    
    /**
     * Determines if any critical service is down
     *
     * @return true if any critical service has status other than 'UP', false otherwise
     */
    public boolean hasCriticalServiceDown() {
        if (services == null || services.isEmpty()) {
            return false;
        }
        
        return services.stream()
                .anyMatch(service -> Boolean.TRUE.equals(service.getIsCritical()) && !service.isHealthy());
    }
    
    /**
     * Calculates the overall system availability percentage
     *
     * @return percentage of available services (0-100)
     */
    public double getOverallAvailability() {
        if (services == null || services.isEmpty()) {
            return 0.0;
        }
        
        int totalServices = services.size();
        long upServices = services.stream()
                .filter(ServiceStatus::isHealthy)
                .count();
        
        return ((double) upServices / totalServices) * 100.0;
    }
    
    /**
     * Calculates the availability percentage of critical services
     *
     * @return percentage of available critical services (0-100)
     */
    public double getCriticalServiceAvailability() {
        if (services == null || services.isEmpty()) {
            return 0.0;
        }
        
        long totalCriticalServices = services.stream()
                .filter(service -> Boolean.TRUE.equals(service.getIsCritical()))
                .count();
        
        if (totalCriticalServices == 0) {
            return 100.0; // No critical services means 100% availability by default
        }
        
        long upCriticalServices = services.stream()
                .filter(service -> Boolean.TRUE.equals(service.getIsCritical()) && service.isHealthy())
                .count();
        
        return ((double) upCriticalServices / totalCriticalServices) * 100.0;
    }
    
    /**
     * Calculates the memory utilization percentage
     *
     * @return percentage of memory used (0-100)
     */
    public double getMemoryUtilizationPercentage() {
        if (availableMemory == null || totalMemory == null || totalMemory == 0) {
            return 0.0;
        }
        
        long usedMemory = totalMemory - availableMemory;
        return ((double) usedMemory / totalMemory) * 100.0;
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
     * Gets the total number of services being monitored
     *
     * @return number of services
     */
    public int getServiceCount() {
        return services == null ? 0 : services.size();
    }
    
    /**
     * Gets the number of healthy services
     *
     * @return number of healthy services
     */
    public int getHealthyServiceCount() {
        if (services == null) {
            return 0;
        }
        
        return (int) services.stream()
                .filter(ServiceStatus::isHealthy)
                .count();
    }
    
    /**
     * Gets the total number of dependencies being monitored
     *
     * @return number of dependencies
     */
    public int getDependencyCount() {
        return dependencies == null ? 0 : dependencies.size();
    }
    
    /**
     * Gets the number of healthy dependencies
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
}