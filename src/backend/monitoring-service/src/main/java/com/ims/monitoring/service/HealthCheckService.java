package com.ims.monitoring.service;

import com.ims.monitoring.model.HealthStatus;
import com.ims.monitoring.model.ServiceStatus;
import com.ims.monitoring.model.Alert;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.web.client.RestTemplate;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

/**
 * Service responsible for performing health checks on the Inventory Management System
 * components and dependencies. Provides comprehensive health monitoring capabilities
 * including liveness, readiness, and deep health checks to ensure the system meets its
 * high availability requirements.
 */
@Service
@Slf4j
public class HealthCheckService {

    private static final String STATUS_UP = "UP";
    private static final String STATUS_DOWN = "DOWN";
    private static final String STATUS_DEGRADED = "DEGRADED";
    private static final String STATUS_UNKNOWN = "UNKNOWN";
    private static final int HEALTH_CHECK_TIMEOUT_MS = 5000;
    private static final int MAX_ERROR_COUNT = 3;
    private static final String ALERT_SEVERITY_CRITICAL = "CRITICAL";
    private static final String ALERT_SEVERITY_HIGH = "HIGH";
    private static final String ALERT_SEVERITY_MEDIUM = "MEDIUM";
    private static final String ALERT_SEVERITY_LOW = "LOW";
    private static final String ALERT_SOURCE_HEALTH_CHECK = "Health Check";

    @Autowired
    private MetricsService metricsService;
    
    @Autowired(required = false)
    private DiscoveryClient discoveryClient;
    
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofMillis(HEALTH_CHECK_TIMEOUT_MS))
            .build();
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    // Cache for the latest health status
    private HealthStatus latestHealthStatus;
    
    // Cache for service statuses
    private final Map<String, ServiceStatus> serviceStatusCache = new ConcurrentHashMap<>();
    
    // Cache for dependency statuses
    private final Map<String, String> dependencyStatusCache = new ConcurrentHashMap<>();
    
    // Registry of services to monitor
    private final Map<String, Map<String, Object>> serviceRegistry = new ConcurrentHashMap<>();
    
    // Registry of dependencies to monitor
    private final Map<String, String> dependencyRegistry = new ConcurrentHashMap<>();
    
    // History of service statuses
    private final Map<String, List<ServiceStatus>> serviceStatusHistory = new ConcurrentHashMap<>();
    
    // History of system health statuses
    private final List<HealthStatus> systemHealthHistory = new ArrayList<>();
    
    // Error counters for services
    private final Map<String, Integer> serviceErrorCounts = new ConcurrentHashMap<>();

    /**
     * Performs a comprehensive health check of the entire system
     *
     * @return The current health status of the system
     */
    @Scheduled(fixedRateString = "${monitoring.health-check.rate:60000}")
    public HealthStatus performSystemHealthCheck() {
        log.debug("Starting system health check");
        long startTime = System.nanoTime();
        
        // Create a new health status object
        HealthStatus healthStatus = HealthStatus.builder()
                .timestamp(LocalDateTime.now())
                .build();
        
        // Set system version and environment info
        healthStatus.setVersion(System.getProperty("ims.version", "unknown"));
        healthStatus.setEnvironment(System.getProperty("ims.environment", "unknown"));
        
        // Get system metrics
        Map<String, Object> systemMetrics = metricsService.getSystemMetrics();
        
        // Check all registered services
        List<ServiceStatus> serviceStatuses = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : serviceRegistry.entrySet()) {
            String serviceId = entry.getKey();
            Map<String, Object> serviceDetails = entry.getValue();
            
            String serviceName = (String) serviceDetails.get("serviceName");
            String endpoint = (String) serviceDetails.get("endpoint");
            Boolean isCritical = (Boolean) serviceDetails.get("isCritical");
            
            ServiceStatus serviceStatus = checkServiceHealth(serviceId, serviceName, endpoint, isCritical);
            serviceStatuses.add(serviceStatus);
        }
        healthStatus.setServices(serviceStatuses);
        
        // Check all registered dependencies
        Map<String, String> dependencyStatuses = new HashMap<>();
        for (Map.Entry<String, String> entry : dependencyRegistry.entrySet()) {
            String dependencyName = entry.getKey();
            String endpoint = entry.getValue();
            
            String status = checkDependencyHealth(dependencyName, endpoint);
            dependencyStatuses.put(dependencyName, status);
        }
        healthStatus.setDependencies(dependencyStatuses);
        
        // Determine overall system status
        if (serviceStatuses.stream().anyMatch(s -> Boolean.TRUE.equals(s.getIsCritical()) && STATUS_DOWN.equals(s.getStatus()))) {
            // If any critical service is down, system is DOWN
            healthStatus.setStatus(STATUS_DOWN);
            healthStatus.setMessage("Critical service(s) unavailable");
        } else if (serviceStatuses.stream().anyMatch(s -> STATUS_DOWN.equals(s.getStatus())) 
                || dependencyStatuses.values().stream().anyMatch(STATUS_DOWN::equals)) {
            // If any service or dependency is down, system is DEGRADED
            healthStatus.setStatus(STATUS_DEGRADED);
            healthStatus.setMessage("One or more components unavailable");
        } else if (serviceStatuses.stream().anyMatch(s -> STATUS_DEGRADED.equals(s.getStatus()))
                || dependencyStatuses.values().stream().anyMatch(STATUS_DEGRADED::equals)) {
            // If any service or dependency is degraded, system is DEGRADED
            healthStatus.setStatus(STATUS_DEGRADED);
            healthStatus.setMessage("One or more components degraded");
        } else {
            // All services and dependencies are UP
            healthStatus.setStatus(STATUS_UP);
            healthStatus.setMessage("All components operational");
        }
        
        // Set system metrics
        healthStatus.setMetrics(systemMetrics);
        
        // Calculate and set uptime
        healthStatus.setUptime(java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime());
        
        // System load and memory info from metrics
        if (systemMetrics != null) {
            Object systemLoad = systemMetrics.get("system.cpu.loadAverage");
            if (systemLoad instanceof Number) {
                healthStatus.setSystemLoad(((Number) systemLoad).doubleValue());
            }
            
            Object availableMemory = systemMetrics.get("system.memory.free");
            if (availableMemory instanceof Number) {
                healthStatus.setAvailableMemory(((Number) availableMemory).longValue());
            }
            
            Object totalMemory = systemMetrics.get("system.memory.total");
            if (totalMemory instanceof Number) {
                healthStatus.setTotalMemory(((Number) totalMemory).longValue());
            }
            
            Object activeThreads = systemMetrics.get("jvm.threads.count");
            if (activeThreads instanceof Number) {
                healthStatus.setActiveThreads(((Number) activeThreads).intValue());
            }
        }
        
        // Store the health status
        this.latestHealthStatus = healthStatus;
        
        // Add to health history
        systemHealthHistory.add(0, healthStatus); // Add to beginning of list
        if (systemHealthHistory.size() > 100) { // Limit history size
            systemHealthHistory.remove(systemHealthHistory.size() - 1);
        }
        
        long endTime = System.nanoTime();
        long durationMs = (endTime - startTime) / 1_000_000; // Convert to milliseconds
        
        // Record timing metric
        metricsService.recordTimingMetric("system.health.check.time", endTime - startTime, "monitoring");
        
        log.debug("System health check completed with status {} in {}ms", healthStatus.getStatus(), durationMs);
        
        return healthStatus;
    }

    /**
     * Checks the health of a specific service
     *
     * @param serviceId Unique identifier for the service
     * @param serviceName Display name of the service
     * @param endpoint Health check endpoint URL
     * @param isCritical Whether this is a critical service
     * @return The health status of the service
     */
    public ServiceStatus checkServiceHealth(String serviceId, String serviceName, String endpoint, Boolean isCritical) {
        log.debug("Checking health of service: {}", serviceName);
        long startTime = System.nanoTime();
        
        ServiceStatus serviceStatus = ServiceStatus.builder()
                .serviceId(serviceId)
                .serviceName(serviceName)
                .timestamp(LocalDateTime.now())
                .isCritical(isCritical)
                .endpoint(endpoint)
                .build();
        
        try {
            // Create HTTP request
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(java.time.Duration.ofMillis(HEALTH_CHECK_TIMEOUT_MS))
                    .GET()
                    .build();
            
            // Execute request
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            // Check response
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                String responseBody = response.body();
                
                // Parse response body - this would normally use a JSON parser
                if (responseBody.contains("UP")) {
                    serviceStatus.setStatus(STATUS_UP);
                    serviceStatus.setMessage("Service is healthy");
                    serviceErrorCounts.put(serviceId, 0); // Reset error count
                    serviceStatus.setLastSuccessfulCheck(LocalDateTime.now());
                } else if (responseBody.contains("DOWN")) {
                    serviceStatus.setStatus(STATUS_DOWN);
                    serviceStatus.setMessage("Service reports DOWN status");
                    incrementErrorCount(serviceId);
                } else if (responseBody.contains("DEGRADED") || responseBody.contains("WARN")) {
                    serviceStatus.setStatus(STATUS_DEGRADED);
                    serviceStatus.setMessage("Service reports DEGRADED status");
                    // Don't increment error count for degraded, but don't reset either
                } else {
                    serviceStatus.setStatus(STATUS_UP); // Default to UP if we can reach it
                    serviceStatus.setMessage("Service responded but status unclear");
                    serviceErrorCounts.put(serviceId, 0); // Reset error count
                    serviceStatus.setLastSuccessfulCheck(LocalDateTime.now());
                }
                
                // Extract version if available
                if (responseBody.contains("version")) {
                    // Simple extraction - real implementation would use JSON parsing
                    int versionIndex = responseBody.indexOf("version");
                    if (versionIndex > 0) {
                        String versionSubstring = responseBody.substring(versionIndex);
                        // This is a very naive extraction, real code would use JSON parsing
                        String version = versionSubstring.split("\"")[2];
                        serviceStatus.setVersion(version);
                    }
                }
            } else {
                // HTTP error response
                serviceStatus.setStatus(STATUS_DOWN);
                serviceStatus.setMessage("Service returned HTTP " + response.statusCode());
                incrementErrorCount(serviceId);
            }
            
            // Calculate response time
            long responseTime = (System.nanoTime() - startTime) / 1_000_000; // Convert to milliseconds
            serviceStatus.setResponseTime(responseTime);
            
        } catch (Exception e) {
            // Request failed
            serviceStatus.setStatus(STATUS_DOWN);
            serviceStatus.setMessage("Error connecting to service: " + e.getMessage());
            incrementErrorCount(serviceId);
        }
        
        // Set error count on status
        serviceStatus.setErrorCount(serviceErrorCounts.getOrDefault(serviceId, 0));
        
        // Store the service status
        serviceStatusCache.put(serviceId, serviceStatus);
        
        // Add to service history
        List<ServiceStatus> history = serviceStatusHistory.computeIfAbsent(serviceId, k -> new ArrayList<>());
        history.add(0, serviceStatus); // Add to beginning of list
        if (history.size() > 100) { // Limit history size
            history.remove(history.size() - 1);
        }
        
        long endTime = System.nanoTime();
        long durationMs = (endTime - startTime) / 1_000_000; // Convert to milliseconds
        
        // Record timing metric
        metricsService.recordTimingMetric("service.health.check.time", endTime - startTime, "monitoring");
        
        log.debug("Health check for service {} completed with status {} in {}ms", serviceName, serviceStatus.getStatus(), durationMs);
        
        return serviceStatus;
    }

    /**
     * Checks the health of a specific dependency
     *
     * @param dependencyName Name of the dependency
     * @param endpoint Health check endpoint for the dependency
     * @return Status of the dependency (UP, DOWN, or DEGRADED)
     */
    public String checkDependencyHealth(String dependencyName, String endpoint) {
        log.debug("Checking health of dependency: {}", dependencyName);
        long startTime = System.nanoTime();
        
        String status;
        
        try {
            // Create HTTP request
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(java.time.Duration.ofMillis(HEALTH_CHECK_TIMEOUT_MS))
                    .GET()
                    .build();
            
            // Execute request
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            // Check response
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                String responseBody = response.body();
                
                // Parse response body - this would normally use a JSON parser
                if (responseBody.contains("UP")) {
                    status = STATUS_UP;
                } else if (responseBody.contains("DOWN")) {
                    status = STATUS_DOWN;
                } else if (responseBody.contains("DEGRADED") || responseBody.contains("WARN")) {
                    status = STATUS_DEGRADED;
                } else {
                    status = STATUS_UP; // Default to UP if we can reach it
                }
            } else {
                // HTTP error response
                status = STATUS_DOWN;
            }
            
        } catch (Exception e) {
            // Request failed
            status = STATUS_DOWN;
            log.warn("Error checking dependency {}: {}", dependencyName, e.getMessage());
        }
        
        // Store the dependency status
        dependencyStatusCache.put(dependencyName, status);
        
        long endTime = System.nanoTime();
        long durationMs = (endTime - startTime) / 1_000_000; // Convert to milliseconds
        
        // Record timing metric
        metricsService.recordTimingMetric("dependency.health.check.time", endTime - startTime, "monitoring");
        
        log.debug("Health check for dependency {} completed with status {} in {}ms", dependencyName, status, durationMs);
        
        return status;
    }

    /**
     * Retrieves the current health status of the system
     *
     * @return The current health status of the system
     */
    public HealthStatus getHealthStatus() {
        // If we don't have a health status yet or it's stale, perform a health check
        if (latestHealthStatus == null || 
                Duration.between(latestHealthStatus.getTimestamp(), LocalDateTime.now()).toMinutes() > 5) {
            return performSystemHealthCheck();
        }
        
        return latestHealthStatus;
    }

    /**
     * Retrieves the health status of a specific service
     *
     * @param serviceId Unique identifier for the service
     * @return The health status of the service, or null if not found
     */
    public ServiceStatus getServiceStatus(String serviceId) {
        if (serviceId == null || serviceId.isEmpty()) {
            return null;
        }
        
        return serviceStatusCache.get(serviceId);
    }

    /**
     * Retrieves the health status of a specific dependency
     *
     * @param dependencyName Name of the dependency
     * @return Status of the dependency, or UNKNOWN if not found
     */
    public String getDependencyStatus(String dependencyName) {
        if (dependencyName == null || dependencyName.isEmpty()) {
            return STATUS_UNKNOWN;
        }
        
        return dependencyStatusCache.getOrDefault(dependencyName, STATUS_UNKNOWN);
    }

    /**
     * Determines if the overall system is healthy
     *
     * @return True if the system status is UP, false otherwise
     */
    public boolean isSystemHealthy() {
        HealthStatus healthStatus = getHealthStatus();
        return STATUS_UP.equals(healthStatus.getStatus());
    }

    /**
     * Determines if all critical services are healthy
     *
     * @return True if all critical services have status UP, false otherwise
     */
    public boolean areCriticalServicesHealthy() {
        HealthStatus healthStatus = getHealthStatus();
        
        if (healthStatus == null || healthStatus.getServices() == null) {
            return false;
        }
        
        return healthStatus.getServices().stream()
                .filter(service -> Boolean.TRUE.equals(service.getIsCritical()))
                .allMatch(service -> STATUS_UP.equals(service.getStatus()));
    }

    /**
     * Calculates the overall system availability percentage
     *
     * @return Percentage of available services (0-100)
     */
    public double getSystemAvailability() {
        HealthStatus healthStatus = getHealthStatus();
        
        if (healthStatus == null || healthStatus.getServices() == null || healthStatus.getServices().isEmpty()) {
            return 0.0;
        }
        
        long availableServices = healthStatus.getServices().stream()
                .filter(service -> STATUS_UP.equals(service.getStatus()))
                .count();
        
        return (double) availableServices / healthStatus.getServices().size() * 100.0;
    }

    /**
     * Performs a basic liveness check to determine if the system is running
     *
     * @return Spring Boot Health object indicating liveness status
     */
    public Health performLivenessCheck() {
        log.debug("Performing liveness check");
        
        // For liveness, we only check if the application is running
        // We don't check dependencies or complex conditions
        boolean isAlive = true;
        Health.Builder builder;
        
        if (isAlive) {
            builder = Health.up();
        } else {
            builder = Health.down();
        }
        
        return builder
                .withDetail("timestamp", LocalDateTime.now().toString())
                .build();
    }

    /**
     * Performs a readiness check to determine if the system is ready to handle requests
     *
     * @return Spring Boot Health object indicating readiness status
     */
    public Health performReadinessCheck() {
        log.debug("Performing readiness check");
        
        // For readiness, we check if all required services and dependencies are available
        HealthStatus healthStatus = getHealthStatus();
        boolean isReady = true;
        String message = "System is ready";
        
        if (healthStatus == null) {
            isReady = false;
            message = "Health status not available";
        } else {
            // Check if any critical service is down
            boolean anyCriticalServiceDown = healthStatus.getServices().stream()
                    .anyMatch(service -> Boolean.TRUE.equals(service.getIsCritical()) 
                            && STATUS_DOWN.equals(service.getStatus()));
            
            if (anyCriticalServiceDown) {
                isReady = false;
                message = "Critical service(s) unavailable";
            }
            
            // Check critical dependencies
            // This assumes we know which dependencies are critical - for simplicity, checking all
            boolean anyCriticalDependencyDown = healthStatus.getDependencies().values().stream()
                    .anyMatch(STATUS_DOWN::equals);
            
            if (anyCriticalDependencyDown) {
                isReady = false;
                message = "Critical dependency unavailable";
            }
        }
        
        Health.Builder builder;
        if (isReady) {
            builder = Health.up();
        } else {
            builder = Health.down().withDetail("reason", message);
        }
        
        // Add details about services and dependencies
        if (healthStatus != null) {
            builder.withDetail("services", summarizeServicesStatus(healthStatus.getServices()));
            builder.withDetail("dependencies", healthStatus.getDependencies());
        }
        
        return builder
                .withDetail("timestamp", LocalDateTime.now().toString())
                .build();
    }

    /**
     * Performs a comprehensive health check including all components and dependencies
     *
     * @return Spring Boot Health object with detailed health information
     */
    public Health performDeepHealthCheck() {
        log.debug("Performing deep health check");
        
        // Perform a full system health check
        HealthStatus healthStatus = performSystemHealthCheck();
        
        // Build health response
        Health.Builder builder;
        if (STATUS_UP.equals(healthStatus.getStatus())) {
            builder = Health.up();
        } else if (STATUS_DEGRADED.equals(healthStatus.getStatus())) {
            builder = Health.status(new Status("DEGRADED", healthStatus.getMessage()));
        } else {
            builder = Health.down();
        }
        
        // Add detailed information
        builder.withDetail("status", healthStatus.getStatus())
               .withDetail("version", healthStatus.getVersion())
               .withDetail("environment", healthStatus.getEnvironment())
               .withDetail("timestamp", healthStatus.getTimestamp().toString())
               .withDetail("message", healthStatus.getMessage())
               .withDetail("uptime", healthStatus.getUptime())
               .withDetail("systemLoad", healthStatus.getSystemLoad())
               .withDetail("memoryUtilization", healthStatus.getMemoryUtilizationPercentage())
               .withDetail("services", createServiceDetailsMap(healthStatus.getServices()))
               .withDetail("dependencies", healthStatus.getDependencies())
               .withDetail("metrics", healthStatus.getMetrics());
        
        return builder.build();
    }
    
    /**
     * Creates an alert object from health check results without dependency on AlertService
     * 
     * @param title Alert title
     * @param description Alert description
     * @param severity Alert severity
     * @param affectedService Affected service, if applicable
     * @param context Additional context for the alert
     * @return Alert object
     */
    public Alert createHealthCheckAlert(String title, String description, String severity, 
                                       ServiceStatus affectedService, Map<String, Object> context) {
        String alertId = UUID.randomUUID().toString();
        
        // Determine category based on context or affected service
        String category = "System";
        if (affectedService != null) {
            category = "Service";
        } else if (context != null && context.containsKey("category")) {
            category = context.get("category").toString();
        }
        
        return Alert.builder()
                .alertId(alertId)
                .title(title)
                .description(description)
                .severity(severity)
                .status("ACTIVE")
                .source(ALERT_SOURCE_HEALTH_CHECK)
                .category(category)
                .timestamp(LocalDateTime.now())
                .affectedService(affectedService)
                .context(context)
                .requiresAcknowledgement(true)
                .build();
    }

    /**
     * Generates alerts based on health check results
     *
     * @param healthStatus Current health status
     * @return List of alerts generated from health check issues
     */
    public List<Alert> generateHealthCheckAlerts(HealthStatus healthStatus) {
        List<Alert> alerts = new ArrayList<>();
        
        if (healthStatus == null) {
            return alerts;
        }
        
        // Check overall system health
        if (!STATUS_UP.equals(healthStatus.getStatus())) {
            String severity;
            if (STATUS_DOWN.equals(healthStatus.getStatus())) {
                severity = ALERT_SEVERITY_CRITICAL;
            } else {
                severity = ALERT_SEVERITY_HIGH;
            }
            
            Map<String, Object> context = new HashMap<>();
            context.put("category", "System");
            context.put("status", healthStatus.getStatus());
            
            Alert systemAlert = createHealthCheckAlert(
                    "System Health Issue Detected",
                    "The system is reporting " + healthStatus.getStatus() + " status: " + healthStatus.getMessage(),
                    severity,
                    null,
                    context
            );
            
            alerts.add(systemAlert);
        }
        
        // Check services
        if (healthStatus.getServices() != null) {
            for (ServiceStatus service : healthStatus.getServices()) {
                if (STATUS_DOWN.equals(service.getStatus())) {
                    // Critical service down is CRITICAL severity, non-critical is HIGH
                    String severity = Boolean.TRUE.equals(service.getIsCritical()) 
                            ? ALERT_SEVERITY_CRITICAL : ALERT_SEVERITY_HIGH;
                    
                    Map<String, Object> context = new HashMap<>();
                    context.put("category", "Service");
                    context.put("status", service.getStatus());
                    context.put("errorCount", service.getErrorCount());
                    
                    Alert serviceAlert = createHealthCheckAlert(
                            "Service Down: " + service.getServiceName(),
                            "Service " + service.getServiceName() + " is reporting DOWN status: " + service.getMessage(),
                            severity,
                            service,
                            context
                    );
                    
                    alerts.add(serviceAlert);
                } else if (STATUS_DEGRADED.equals(service.getStatus())) {
                    // Degraded service is MEDIUM severity or HIGH if critical
                    String severity = Boolean.TRUE.equals(service.getIsCritical()) 
                            ? ALERT_SEVERITY_HIGH : ALERT_SEVERITY_MEDIUM;
                    
                    Map<String, Object> context = new HashMap<>();
                    context.put("category", "Service");
                    context.put("status", service.getStatus());
                    
                    Alert serviceAlert = createHealthCheckAlert(
                            "Service Degraded: " + service.getServiceName(),
                            "Service " + service.getServiceName() + " is reporting DEGRADED status: " + service.getMessage(),
                            severity,
                            service,
                            context
                    );
                    
                    alerts.add(serviceAlert);
                }
            }
        }
        
        // Check dependencies
        if (healthStatus.getDependencies() != null) {
            for (Map.Entry<String, String> entry : healthStatus.getDependencies().entrySet()) {
                String dependencyName = entry.getKey();
                String status = entry.getValue();
                
                if (STATUS_DOWN.equals(status)) {
                    Map<String, Object> context = new HashMap<>();
                    context.put("category", "Dependency");
                    context.put("status", status);
                    
                    Alert dependencyAlert = createHealthCheckAlert(
                            "Dependency Down: " + dependencyName,
                            "Dependency " + dependencyName + " is reporting DOWN status",
                            ALERT_SEVERITY_HIGH,
                            null,
                            context
                    );
                    
                    alerts.add(dependencyAlert);
                } else if (STATUS_DEGRADED.equals(status)) {
                    Map<String, Object> context = new HashMap<>();
                    context.put("category", "Dependency");
                    context.put("status", status);
                    
                    Alert dependencyAlert = createHealthCheckAlert(
                            "Dependency Degraded: " + dependencyName,
                            "Dependency " + dependencyName + " is reporting DEGRADED status",
                            ALERT_SEVERITY_MEDIUM,
                            null,
                            context
                    );
                    
                    alerts.add(dependencyAlert);
                }
            }
        }
        
        return alerts;
    }

    /**
     * Registers a service for health monitoring
     *
     * @param serviceId Unique identifier for the service
     * @param serviceName Display name of the service
     * @param endpoint Health check endpoint URL
     * @param isCritical Whether this is a critical service
     */
    public void registerService(String serviceId, String serviceName, String endpoint, Boolean isCritical) {
        if (serviceId == null || serviceName == null || endpoint == null) {
            log.warn("Cannot register service with null ID, name, or endpoint");
            return;
        }
        
        Map<String, Object> serviceDetails = new HashMap<>();
        serviceDetails.put("serviceName", serviceName);
        serviceDetails.put("endpoint", endpoint);
        serviceDetails.put("isCritical", isCritical != null ? isCritical : false);
        
        serviceRegistry.put(serviceId, serviceDetails);
        log.info("Registered service: {} ({}), endpoint: {}, critical: {}", 
                serviceName, serviceId, endpoint, isCritical);
        
        // Perform an initial health check for this service
        checkServiceHealth(serviceId, serviceName, endpoint, isCritical);
    }

    /**
     * Registers a dependency for health monitoring
     *
     * @param dependencyName Name of the dependency
     * @param endpoint Health check endpoint for the dependency
     */
    public void registerDependency(String dependencyName, String endpoint) {
        if (dependencyName == null || endpoint == null) {
            log.warn("Cannot register dependency with null name or endpoint");
            return;
        }
        
        dependencyRegistry.put(dependencyName, endpoint);
        log.info("Registered dependency: {}, endpoint: {}", dependencyName, endpoint);
        
        // Perform an initial health check for this dependency
        checkDependencyHealth(dependencyName, endpoint);
    }

    /**
     * Discovers services using Spring Cloud Discovery Client
     */
    @Scheduled(fixedRateString = "${monitoring.service-discovery.rate:300000}")
    public void discoverServices() {
        if (discoveryClient == null) {
            log.debug("Service discovery skipped - DiscoveryClient not available");
            return;
        }
        
        log.debug("Starting service discovery");
        
        List<String> services = discoveryClient.getServices();
        log.debug("Discovered {} services", services.size());
        
        for (String serviceId : services) {
            discoveryClient.getInstances(serviceId).forEach(instance -> {
                String serviceName = instance.getServiceId();
                
                // Construct health endpoint - this assumes Spring Boot Actuator health endpoint
                String healthEndpoint = instance.getUri() + "/actuator/health";
                
                // Assume service is non-critical by default
                // In a real implementation, critical services would be identified through configuration
                Boolean isCritical = false;
                
                // Register the service
                registerService(serviceId + "-" + instance.getInstanceId(), serviceName, healthEndpoint, isCritical);
            });
        }
        
        log.debug("Service discovery completed, found {} service instances", services.size());
    }

    /**
     * Retrieves the health history of a specific service
     *
     * @param serviceId Unique identifier for the service
     * @param limit Maximum number of history entries to return
     * @return List of historical service status entries
     */
    public List<ServiceStatus> getServiceHealthHistory(String serviceId, int limit) {
        if (serviceId == null || serviceId.isEmpty()) {
            return new ArrayList<>();
        }
        
        if (limit <= 0) {
            limit = 100; // Default limit
        }
        
        List<ServiceStatus> history = serviceStatusHistory.getOrDefault(serviceId, new ArrayList<>());
        
        // Return at most 'limit' entries
        return history.stream().limit(limit).collect(Collectors.toList());
    }

    /**
     * Retrieves the system health history
     *
     * @param limit Maximum number of history entries to return
     * @return List of historical system health status entries
     */
    public List<HealthStatus> getSystemHealthHistory(int limit) {
        if (limit <= 0) {
            limit = 100; // Default limit
        }
        
        // Return at most 'limit' entries
        return systemHealthHistory.stream().limit(limit).collect(Collectors.toList());
    }

    /**
     * Calculates the availability percentage of a service over a time period
     *
     * @param serviceId Unique identifier for the service
     * @param timeWindow Time window for calculating availability
     * @return Percentage of time the service was available (0-100)
     */
    public double calculateServiceAvailability(String serviceId, Duration timeWindow) {
        if (serviceId == null || serviceId.isEmpty()) {
            return 0.0;
        }
        
        if (timeWindow == null) {
            timeWindow = Duration.ofHours(24); // Default to 24 hours
        }
        
        List<ServiceStatus> history = getServiceHealthHistory(serviceId, Integer.MAX_VALUE);
        
        if (history.isEmpty()) {
            return 0.0;
        }
        
        // Get history entries within time window
        LocalDateTime cutoff = LocalDateTime.now().minus(timeWindow);
        List<ServiceStatus> relevantHistory = history.stream()
                .filter(status -> status.getTimestamp().isAfter(cutoff))
                .collect(Collectors.toList());
        
        if (relevantHistory.isEmpty()) {
            return 0.0;
        }
        
        // Count UP statuses
        long upCount = relevantHistory.stream()
                .filter(status -> STATUS_UP.equals(status.getStatus()))
                .count();
        
        return (double) upCount / relevantHistory.size() * 100.0;
    }

    /**
     * Calculates the overall system availability percentage over a time period
     *
     * @param timeWindow Time window for calculating availability
     * @return Percentage of time the system was available (0-100)
     */
    public double calculateSystemAvailability(Duration timeWindow) {
        if (timeWindow == null) {
            timeWindow = Duration.ofHours(24); // Default to 24 hours
        }
        
        List<HealthStatus> history = getSystemHealthHistory(Integer.MAX_VALUE);
        
        if (history.isEmpty()) {
            return 0.0;
        }
        
        // Get history entries within time window
        LocalDateTime cutoff = LocalDateTime.now().minus(timeWindow);
        List<HealthStatus> relevantHistory = history.stream()
                .filter(status -> status.getTimestamp().isAfter(cutoff))
                .collect(Collectors.toList());
        
        if (relevantHistory.isEmpty()) {
            return 0.0;
        }
        
        // Count UP statuses
        long upCount = relevantHistory.stream()
                .filter(status -> STATUS_UP.equals(status.getStatus()))
                .count();
        
        return (double) upCount / relevantHistory.size() * 100.0;
    }
    
    /**
     * Removes old health history data to prevent memory issues
     */
    @Scheduled(fixedRateString = "${monitoring.health-history.cleanup-rate:3600000}")
    public void cleanupHealthHistory() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusDays(7); // Keep 7 days of history
        int totalRemoved = 0;
        
        // Clean up system health history
        int originalSystemSize = systemHealthHistory.size();
        systemHealthHistory.removeIf(status -> status.getTimestamp().isBefore(cutoffTime));
        totalRemoved += originalSystemSize - systemHealthHistory.size();
        
        // Clean up service health history
        for (String serviceId : serviceStatusHistory.keySet()) {
            List<ServiceStatus> history = serviceStatusHistory.get(serviceId);
            int originalSize = history.size();
            history.removeIf(status -> status.getTimestamp().isBefore(cutoffTime));
            totalRemoved += originalSize - history.size();
        }
        
        log.debug("Cleaned up health history: removed {} entries older than {}", totalRemoved, cutoffTime);
    }
    
    // Helper methods
    
    /**
     * Increments the error count for a service
     */
    private void incrementErrorCount(String serviceId) {
        int currentCount = serviceErrorCounts.getOrDefault(serviceId, 0);
        serviceErrorCounts.put(serviceId, currentCount + 1);
    }
    
    /**
     * Creates a map summarizing service statuses
     */
    private Map<String, Object> summarizeServicesStatus(List<ServiceStatus> services) {
        if (services == null || services.isEmpty()) {
            return new HashMap<>();
        }
        
        Map<String, Object> summary = new HashMap<>();
        
        long upCount = services.stream()
                .filter(service -> STATUS_UP.equals(service.getStatus()))
                .count();
        
        long degradedCount = services.stream()
                .filter(service -> STATUS_DEGRADED.equals(service.getStatus()))
                .count();
        
        long downCount = services.stream()
                .filter(service -> STATUS_DOWN.equals(service.getStatus()))
                .count();
        
        summary.put("total", services.size());
        summary.put("up", upCount);
        summary.put("degraded", degradedCount);
        summary.put("down", downCount);
        
        return summary;
    }
    
    /**
     * Creates a map with detailed service information for health checks
     */
    private Map<String, Object> createServiceDetailsMap(List<ServiceStatus> services) {
        Map<String, Object> serviceDetails = new HashMap<>();
        
        if (services == null || services.isEmpty()) {
            return serviceDetails;
        }
        
        for (ServiceStatus service : services) {
            Map<String, Object> details = new HashMap<>();
            details.put("status", service.getStatus());
            details.put("name", service.getServiceName());
            details.put("isCritical", service.getIsCritical());
            details.put("responseTime", service.getResponseTime());
            details.put("message", service.getMessage());
            details.put("version", service.getVersion());
            details.put("errorCount", service.getErrorCount());
            
            serviceDetails.put(service.getServiceId(), details);
        }
        
        return serviceDetails;
    }
}