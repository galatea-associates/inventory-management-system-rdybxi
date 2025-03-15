package com.ims.monitoring.controller;

import com.ims.monitoring.model.Alert;
import com.ims.monitoring.model.HealthStatus;
import com.ims.monitoring.model.ServiceStatus;
import com.ims.monitoring.service.AlertService;
import com.ims.monitoring.service.HealthCheckService;
import com.ims.monitoring.service.MetricsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST controller responsible for exposing health check endpoints for the Inventory Management System.
 * Provides comprehensive health monitoring capabilities including liveness, readiness, and deep health
 * checks to ensure the system meets its high availability requirements (99.999% uptime during 24x6 
 * operational hours).
 */
@RestController
@RequestMapping("/api/health")
@Slf4j
public class HealthController {

    @Autowired
    private HealthCheckService healthCheckService;
    
    @Autowired
    private AlertService alertService;
    
    @Autowired
    private MetricsService metricsService;

    /**
     * Retrieves the current health status of the entire system
     *
     * @return HTTP response containing the current health status
     */
    @GetMapping("/system")
    public ResponseEntity<HealthStatus> getSystemHealth() {
        log.debug("Request received for system health status");
        
        // Record start time for performance measurement
        long startTime = System.nanoTime();
        
        // Get the current health status
        HealthStatus healthStatus = healthCheckService.getHealthStatus();
        
        // If we don't have a health status yet, perform a health check
        if (healthStatus == null) {
            healthStatus = healthCheckService.performSystemHealthCheck();
        }
        
        // Record end time and calculate duration
        long endTime = System.nanoTime();
        long durationNanos = endTime - startTime;
        
        // Record timing metric
        metricsService.recordTimingMetric("health.controller.system.time", durationNanos, "monitoring");
        
        return ResponseEntity.ok(healthStatus);
    }

    /**
     * Performs a new health check of the entire system
     *
     * @return HTTP response containing the new health status
     */
    @GetMapping("/check")
    public ResponseEntity<HealthStatus> performHealthCheck() {
        log.debug("Request received for new health check");
        
        // Record start time for performance measurement
        long startTime = System.nanoTime();
        
        // Perform a new health check
        HealthStatus healthStatus = healthCheckService.performSystemHealthCheck();
        
        // Record end time and calculate duration
        long endTime = System.nanoTime();
        long durationNanos = endTime - startTime;
        
        // Record timing metric
        metricsService.recordTimingMetric("health.controller.check.time", durationNanos, "monitoring");
        
        return ResponseEntity.ok(healthStatus);
    }

    /**
     * Retrieves the health status of a specific service
     *
     * @param serviceId Unique identifier for the service
     * @return HTTP response containing the service health status
     */
    @GetMapping("/service/{serviceId}")
    public ResponseEntity<ServiceStatus> getServiceHealth(@PathVariable String serviceId) {
        log.debug("Request received for service health status: {}", serviceId);
        
        // Record start time for performance measurement
        long startTime = System.nanoTime();
        
        // Get the service status
        ServiceStatus serviceStatus = healthCheckService.getServiceStatus(serviceId);
        
        // If service status is not found, return 404
        if (serviceStatus == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Record end time and calculate duration
        long endTime = System.nanoTime();
        long durationNanos = endTime - startTime;
        
        // Record timing metric
        metricsService.recordTimingMetric("health.controller.service.time", durationNanos, "monitoring");
        
        return ResponseEntity.ok(serviceStatus);
    }

    /**
     * Retrieves a simple status indicator for the system (UP, DOWN, or DEGRADED)
     *
     * @return HTTP response containing the system status
     */
    @GetMapping("/status")
    public ResponseEntity<String> getSystemHealthStatus() {
        log.debug("Request received for system status");
        
        // Get the current health status
        HealthStatus healthStatus = healthCheckService.getHealthStatus();
        
        // If we don't have a health status yet, perform a health check
        if (healthStatus == null) {
            healthStatus = healthCheckService.performSystemHealthCheck();
        }
        
        return ResponseEntity.ok(healthStatus.getStatus());
    }

    /**
     * Checks if the system is healthy (status is UP)
     *
     * @return HTTP response containing true if system is healthy, false otherwise
     */
    @GetMapping("/up")
    public ResponseEntity<Boolean> isSystemUp() {
        log.debug("Request received for system up check");
        
        boolean isUp = healthCheckService.isSystemHealthy();
        
        return ResponseEntity.ok(isUp);
    }

    /**
     * Checks if all critical services are healthy
     *
     * @return HTTP response containing true if all critical services are healthy, false otherwise
     */
    @GetMapping("/critical")
    public ResponseEntity<Boolean> areCriticalServicesUp() {
        log.debug("Request received for critical services check");
        
        boolean criticalServicesUp = healthCheckService.areCriticalServicesHealthy();
        
        return ResponseEntity.ok(criticalServicesUp);
    }

    /**
     * Retrieves the current system availability percentage
     *
     * @return HTTP response containing the system availability percentage
     */
    @GetMapping("/availability")
    public ResponseEntity<Double> getSystemAvailability() {
        log.debug("Request received for system availability");
        
        double availability = healthCheckService.getSystemAvailability();
        
        return ResponseEntity.ok(availability);
    }

    /**
     * Retrieves the availability percentage of a specific service over a time period
     *
     * @param serviceId Unique identifier for the service
     * @param hours Time period in hours to calculate availability for
     * @return HTTP response containing the service availability percentage
     */
    @GetMapping("/service/{serviceId}/availability")
    public ResponseEntity<Double> getServiceAvailability(
            @PathVariable String serviceId,
            @RequestParam(required = false) Integer hours) {
        
        log.debug("Request received for service availability: {}, hours: {}", serviceId, hours);
        
        // Default to 24 hours if not specified
        if (hours == null) {
            hours = 24;
        }
        
        Duration duration = Duration.ofHours(hours);
        double availability = healthCheckService.calculateServiceAvailability(serviceId, duration);
        
        return ResponseEntity.ok(availability);
    }

    /**
     * Retrieves the system availability percentage over a time period
     *
     * @param hours Time period in hours to calculate availability for
     * @return HTTP response containing the system availability percentage
     */
    @GetMapping("/availability/history")
    public ResponseEntity<Double> getSystemAvailabilityHistory(
            @RequestParam(required = false) Integer hours) {
        
        log.debug("Request received for system availability history, hours: {}", hours);
        
        // Default to 24 hours if not specified
        if (hours == null) {
            hours = 24;
        }
        
        Duration duration = Duration.ofHours(hours);
        double availability = healthCheckService.calculateSystemAvailability(duration);
        
        return ResponseEntity.ok(availability);
    }

    /**
     * Retrieves the health history of a specific service
     *
     * @param serviceId Unique identifier for the service
     * @param limit Maximum number of history entries to return
     * @return HTTP response containing the service health history
     */
    @GetMapping("/service/{serviceId}/history")
    public ResponseEntity<List<ServiceStatus>> getServiceHealthHistory(
            @PathVariable String serviceId,
            @RequestParam(required = false) Integer limit) {
        
        log.debug("Request received for service health history: {}, limit: {}", serviceId, limit);
        
        // Default to 10 entries if not specified
        if (limit == null) {
            limit = 10;
        }
        
        List<ServiceStatus> history = healthCheckService.getServiceHealthHistory(serviceId, limit);
        
        if (history.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(history);
    }

    /**
     * Retrieves the system health history
     *
     * @param limit Maximum number of history entries to return
     * @return HTTP response containing the system health history
     */
    @GetMapping("/system/history")
    public ResponseEntity<List<HealthStatus>> getSystemHealthHistory(
            @RequestParam(required = false) Integer limit) {
        
        log.debug("Request received for system health history, limit: {}", limit);
        
        // Default to 10 entries if not specified
        if (limit == null) {
            limit = 10;
        }
        
        List<HealthStatus> history = healthCheckService.getSystemHealthHistory(limit);
        
        if (history.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(history);
    }

    /**
     * Creates alerts based on the current health status
     *
     * @return HTTP response containing alert creation results
     */
    @GetMapping("/alerts")
    public ResponseEntity<Map<String, Object>> createAlertsFromHealthCheck() {
        log.debug("Request received to create alerts from health check");
        
        // Get the current health status
        HealthStatus healthStatus = healthCheckService.getHealthStatus();
        
        // If we don't have a health status yet, perform a health check
        if (healthStatus == null) {
            healthStatus = healthCheckService.performSystemHealthCheck();
        }
        
        List<Alert> alerts = alertService.createAlertFromHealthCheck(healthStatus);
        
        Map<String, Object> result = new HashMap<>();
        result.put("alertsCreated", alerts.size());
        result.put("timestamp", LocalDateTime.now());
        
        return ResponseEntity.ok(result);
    }

    /**
     * Retrieves active alerts related to health checks
     *
     * @return HTTP response containing active health alerts
     */
    @GetMapping("/active-alerts")
    public ResponseEntity<List<Alert>> getActiveHealthAlerts() {
        log.debug("Request received for active health alerts");
        
        List<Alert> allAlerts = alertService.getActiveAlerts(null);
        
        // Filter alerts to those with source 'Health Check'
        List<Alert> healthAlerts = allAlerts.stream()
                .filter(alert -> "Health Check".equals(alert.getSource()))
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(healthAlerts);
    }

    /**
     * Performs a basic liveness check to determine if the system is running
     *
     * @return HTTP response containing liveness status
     */
    @GetMapping("/liveness")
    public ResponseEntity<Health> liveness() {
        log.debug("Liveness check requested");
        
        // Record start time for performance measurement
        long startTime = System.nanoTime();
        
        Health health = healthCheckService.performLivenessCheck();
        
        // Record end time and calculate duration
        long endTime = System.nanoTime();
        long durationNanos = endTime - startTime;
        
        // Record timing metric
        metricsService.recordTimingMetric("health.controller.liveness.time", durationNanos, "monitoring");
        
        // Return appropriate HTTP status based on health status
        if (health.getStatus().equals(Status.UP)) {
            return ResponseEntity.ok(health);
        } else {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(health);
        }
    }

    /**
     * Performs a readiness check to determine if the system is ready to handle requests
     *
     * @return HTTP response containing readiness status
     */
    @GetMapping("/readiness")
    public ResponseEntity<Health> readiness() {
        log.debug("Readiness check requested");
        
        // Record start time for performance measurement
        long startTime = System.nanoTime();
        
        Health health = healthCheckService.performReadinessCheck();
        
        // Record end time and calculate duration
        long endTime = System.nanoTime();
        long durationNanos = endTime - startTime;
        
        // Record timing metric
        metricsService.recordTimingMetric("health.controller.readiness.time", durationNanos, "monitoring");
        
        // Return appropriate HTTP status based on health status
        if (health.getStatus().equals(Status.UP)) {
            return ResponseEntity.ok(health);
        } else {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(health);
        }
    }

    /**
     * Performs a comprehensive health check including all components and dependencies
     *
     * @return HTTP response containing detailed health information
     */
    @GetMapping("/deep")
    public ResponseEntity<Health> deepHealthCheck() {
        log.debug("Deep health check requested");
        
        // Record start time for performance measurement
        long startTime = System.nanoTime();
        
        Health health = healthCheckService.performDeepHealthCheck();
        
        // Record end time and calculate duration
        long endTime = System.nanoTime();
        long durationNanos = endTime - startTime;
        
        // Record timing metric
        metricsService.recordTimingMetric("health.controller.deep.time", durationNanos, "monitoring");
        
        // Return appropriate HTTP status based on health status
        if (health.getStatus().equals(Status.UP)) {
            return ResponseEntity.ok(health);
        } else if (health.getStatus().getCode().equals("DEGRADED")) {
            // For degraded status, return 200 but with degraded health info
            return ResponseEntity.ok(health);
        } else {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(health);
        }
    }

    /**
     * Provides a summary of the system health status with key metrics
     *
     * @return HTTP response containing health summary
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getHealthSummary() {
        log.debug("Health summary requested");
        
        // Get the current health status
        HealthStatus healthStatus = healthCheckService.getHealthStatus();
        
        // If we don't have a health status yet, perform a health check
        if (healthStatus == null) {
            healthStatus = healthCheckService.performSystemHealthCheck();
        }
        
        // Create a summary map
        Map<String, Object> summary = new HashMap<>();
        
        // Add overall status
        summary.put("status", healthStatus.getStatus());
        summary.put("message", healthStatus.getMessage());
        
        // Add service counts
        int totalServices = healthStatus.getServiceCount();
        int healthyServices = healthStatus.getHealthyServiceCount();
        int degradedServices = (int) healthStatus.getServices().stream()
                .filter(s -> "DEGRADED".equals(s.getStatus()))
                .count();
        int downServices = (int) healthStatus.getServices().stream()
                .filter(s -> "DOWN".equals(s.getStatus()))
                .count();
        
        Map<String, Integer> serviceCounts = new HashMap<>();
        serviceCounts.put("total", totalServices);
        serviceCounts.put("healthy", healthyServices);
        serviceCounts.put("degraded", degradedServices);
        serviceCounts.put("down", downServices);
        summary.put("services", serviceCounts);
        
        // Add critical service status
        boolean criticalServicesUp = healthCheckService.areCriticalServicesHealthy();
        summary.put("criticalServicesUp", criticalServicesUp);
        
        // Add dependency status
        int totalDependencies = healthStatus.getDependencyCount();
        int healthyDependencies = healthStatus.getHealthyDependencyCount();
        
        Map<String, Integer> dependencyCounts = new HashMap<>();
        dependencyCounts.put("total", totalDependencies);
        dependencyCounts.put("healthy", healthyDependencies);
        summary.put("dependencies", dependencyCounts);
        
        // Add system availability
        double availability = healthCheckService.getSystemAvailability();
        summary.put("availability", availability);
        
        // Add uptime
        summary.put("uptime", healthStatus.getUptime());
        summary.put("timestamp", healthStatus.getTimestamp());
        
        return ResponseEntity.ok(summary);
    }
}