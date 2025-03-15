package com.ims.monitoring.service;

import com.ims.monitoring.model.Alert;
import com.ims.monitoring.model.ServiceStatus;
import com.ims.monitoring.model.HealthStatus;
import com.ims.monitoring.service.HealthCheckService;
import com.ims.monitoring.service.MetricsService;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service responsible for managing alerts in the Inventory Management System.
 * Handles alert creation, processing, routing, escalation, and lifecycle management
 * to ensure timely notification and resolution of system issues.
 */
@Service
@Slf4j
public class AlertService {

    private static final String ALERT_STATUS_ACTIVE = "ACTIVE";
    private static final String ALERT_STATUS_ACKNOWLEDGED = "ACKNOWLEDGED";
    private static final String ALERT_STATUS_RESOLVED = "RESOLVED";
    private static final String ALERT_SEVERITY_CRITICAL = "CRITICAL";
    private static final String ALERT_SEVERITY_HIGH = "HIGH";
    private static final String ALERT_SEVERITY_MEDIUM = "MEDIUM";
    private static final String ALERT_SEVERITY_LOW = "LOW";
    private static final int ESCALATION_INTERVAL_CRITICAL_MINUTES = 15;
    private static final int ESCALATION_INTERVAL_HIGH_MINUTES = 30;
    private static final int ESCALATION_INTERVAL_MEDIUM_MINUTES = 120;
    private static final int MAX_ESCALATION_LEVEL = 3;

    @Autowired
    private HealthCheckService healthCheckService;
    
    @Autowired
    private MetricsService metricsService;
    
    // In a real implementation, this would be autowired
    // @Autowired
    // private AlertRepository alertRepository;
    
    // For demonstration purposes, using an in-memory list
    private final List<Alert> alerts = new ArrayList<>();

    /**
     * Creates a new alert in the system
     *
     * @param alert The alert to create
     * @return The created alert with generated ID and timestamp
     */
    public Alert createAlert(Alert alert) {
        if (alert == null) {
            throw new IllegalArgumentException("Alert cannot be null");
        }
        
        // Generate alertId if not provided
        if (alert.getAlertId() == null || alert.getAlertId().isEmpty()) {
            alert.setAlertId(UUID.randomUUID().toString());
        }
        
        // Set timestamp if not provided
        if (alert.getTimestamp() == null) {
            alert.setTimestamp(LocalDateTime.now());
        }
        
        // Set status if not provided
        if (alert.getStatus() == null || alert.getStatus().isEmpty()) {
            alert.setStatus(ALERT_STATUS_ACTIVE);
        }
        
        // Validate required fields
        if (alert.getTitle() == null || alert.getTitle().isEmpty()) {
            throw new IllegalArgumentException("Alert title is required");
        }
        
        if (alert.getDescription() == null || alert.getDescription().isEmpty()) {
            throw new IllegalArgumentException("Alert description is required");
        }
        
        if (alert.getSeverity() == null || alert.getSeverity().isEmpty()) {
            throw new IllegalArgumentException("Alert severity is required");
        }
        
        // Set default values for optional fields if not provided
        if (alert.getContext() == null) {
            alert.setContext(new HashMap<>());
        }
        
        if (alert.getNotificationChannels() == null) {
            alert.setNotificationChannels(new ArrayList<>());
        }
        
        if (alert.getEscalationLevel() == null) {
            alert.setEscalationLevel(0);
        }
        
        if (alert.getOccurrenceCount() == null) {
            alert.setOccurrenceCount(1);
        }
        
        if (alert.getRequiresAcknowledgement() == null) {
            alert.setRequiresAcknowledgement(true);
        }
        
        // Save the alert to the repository
        // In a real implementation:
        // alert = alertRepository.save(alert);
        alerts.add(alert);
        
        log.info("Alert created with ID: {}, severity: {}", alert.getAlertId(), alert.getSeverity());
        
        // Publish alert creation event to notification channels
        publishAlertEvent(alert, "CREATED");
        
        return alert;
    }

    /**
     * Creates an alert based on health check results
     *
     * @param healthStatus The health status to generate alerts from
     * @return List of alerts created from health check issues
     */
    public List<Alert> createAlertFromHealthCheck(HealthStatus healthStatus) {
        if (healthStatus == null) {
            throw new IllegalArgumentException("Health status cannot be null");
        }
        
        // Generate alert candidates from health check
        List<Alert> alertCandidates = healthCheckService.generateHealthCheckAlerts(healthStatus);
        List<Alert> createdAlerts = new ArrayList<>();
        
        for (Alert alertCandidate : alertCandidates) {
            // Check if a similar active alert already exists
            Alert existingAlert = findSimilarActiveAlert(alertCandidate);
            
            if (existingAlert != null) {
                // Update the existing alert (increment occurrence count)
                existingAlert.incrementOccurrenceCount();
                existingAlert.setLastModifiedAt(LocalDateTime.now());
                
                // Add any new context information
                if (alertCandidate.getContext() != null) {
                    alertCandidate.getContext().forEach(existingAlert::addContextValue);
                }
                
                // In a real implementation:
                // alertRepository.save(existingAlert);
                
                createdAlerts.add(existingAlert);
            } else {
                // Create a new alert
                Alert newAlert = createAlert(alertCandidate);
                createdAlerts.add(newAlert);
            }
        }
        
        log.info("Created/updated {} alerts from health check", createdAlerts.size());
        
        return createdAlerts;
    }

    /**
     * Creates alerts based on metric threshold breaches
     *
     * @return List of alerts created from metric threshold breaches
     */
    @Scheduled(fixedRateString = "${monitoring.alerts.threshold-check-rate:60000}")
    public List<Alert> createAlertFromMetricThreshold() {
        // Get metric threshold breaches
        List<Map<String, Object>> thresholdBreaches = metricsService.checkThresholds();
        List<Alert> createdAlerts = new ArrayList<>();
        
        for (Map<String, Object> breach : thresholdBreaches) {
            String metricName = (String) breach.get("metricName");
            Object thresholdValue = breach.get("threshold");
            Object actualValue = breach.get("value");
            String severity = (String) breach.getOrDefault("severity", ALERT_SEVERITY_MEDIUM);
            
            // Create alert for threshold breach
            Alert alertCandidate = Alert.builder()
                .title("Metric Threshold Breach: " + metricName)
                .description("Metric " + metricName + " has breached threshold. " +
                             "Threshold: " + thresholdValue + ", Actual: " + actualValue)
                .severity(severity)
                .source("Metric Threshold")
                .category("Performance")
                .timestamp(LocalDateTime.now())
                .status(ALERT_STATUS_ACTIVE)
                .build();
            
            // Add threshold details to context
            Map<String, Object> context = new HashMap<>();
            context.put("metricName", metricName);
            context.put("threshold", thresholdValue);
            context.put("actual", actualValue);
            alertCandidate.setContext(context);
            
            // Set threshold and actual values for alert
            if (thresholdValue instanceof Number) {
                alertCandidate.setThresholdValue(((Number) thresholdValue).longValue());
            }
            
            if (actualValue instanceof Number) {
                alertCandidate.setActualValue(((Number) actualValue).longValue());
            }
            
            // Check if a similar active alert already exists
            Alert existingAlert = findSimilarActiveAlert(alertCandidate);
            
            if (existingAlert != null) {
                // Update existing alert (increment occurrence count)
                existingAlert.incrementOccurrenceCount();
                existingAlert.setLastModifiedAt(LocalDateTime.now());
                existingAlert.setActualValue(alertCandidate.getActualValue());
                
                // In a real implementation:
                // alertRepository.save(existingAlert);
                
                createdAlerts.add(existingAlert);
            } else {
                // Create new alert
                Alert newAlert = createAlert(alertCandidate);
                createdAlerts.add(newAlert);
            }
        }
        
        log.info("Created/updated {} alerts from metric threshold breaches", createdAlerts.size());
        
        return createdAlerts;
    }

    /**
     * Retrieves an alert by its ID
     *
     * @param alertId The ID of the alert to retrieve
     * @return The alert with the specified ID, or null if not found
     */
    public Alert getAlert(String alertId) {
        if (alertId == null || alertId.isEmpty()) {
            return null;
        }
        
        // In a real implementation:
        // return alertRepository.findByAlertId(alertId).orElse(null);
        
        return alerts.stream()
            .filter(a -> alertId.equals(a.getAlertId()))
            .findFirst()
            .orElse(null);
    }

    /**
     * Retrieves alerts with optional filtering and pagination
     *
     * @param severity Filter by severity
     * @param status Filter by status
     * @param category Filter by category
     * @param startTime Filter by timestamp >= startTime
     * @param endTime Filter by timestamp <= endTime
     * @param pageable Pagination parameters
     * @return Page of alerts matching the filter criteria
     */
    public Page<Alert> getAlerts(String severity, String status, String category,
                                 LocalDateTime startTime, LocalDateTime endTime,
                                 Pageable pageable) {
        // In a real implementation, this would use the repository with a specification
        // Specification<Alert> spec = Specification.where(null);
        // if (severity != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("severity"), severity));
        // if (status != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        // if (category != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category));
        // if (startTime != null) spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("timestamp"), startTime));
        // if (endTime != null) spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("timestamp"), endTime));
        // return alertRepository.findAll(spec, pageable);
        
        // Simplified in-memory implementation
        List<Alert> filteredAlerts = alerts.stream()
            .filter(a -> severity == null || severity.equals(a.getSeverity()))
            .filter(a -> status == null || status.equals(a.getStatus()))
            .filter(a -> category == null || category.equals(a.getCategory()))
            .filter(a -> startTime == null || a.getTimestamp() == null || !a.getTimestamp().isBefore(startTime))
            .filter(a -> endTime == null || a.getTimestamp() == null || !a.getTimestamp().isAfter(endTime))
            .collect(Collectors.toList());
        
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filteredAlerts.size());
        
        List<Alert> pageContent = start < end ? filteredAlerts.subList(start, end) : new ArrayList<>();
        
        return new org.springframework.data.domain.PageImpl<>(pageContent, pageable, filteredAlerts.size());
    }

    /**
     * Retrieves all active alerts (status is ACTIVE or ACKNOWLEDGED)
     *
     * @param severity Optional filter by severity
     * @return List of active alerts, optionally filtered by severity
     */
    public List<Alert> getActiveAlerts(String severity) {
        // In a real implementation:
        // List<String> statuses = Arrays.asList(ALERT_STATUS_ACTIVE, ALERT_STATUS_ACKNOWLEDGED);
        // if (severity != null) {
        //     return alertRepository.findByStatusInAndSeverity(statuses, severity);
        // } else {
        //     return alertRepository.findByStatusIn(statuses);
        // }
        
        return alerts.stream()
            .filter(a -> a.isActive())
            .filter(a -> severity == null || severity.equals(a.getSeverity()))
            .collect(Collectors.toList());
    }

    /**
     * Retrieves alerts for a specific service
     *
     * @param serviceId ID of the service
     * @param includeResolved Whether to include resolved alerts
     * @return List of alerts for the specified service
     */
    public List<Alert> getAlertsByService(String serviceId, Boolean includeResolved) {
        if (serviceId == null || serviceId.isEmpty()) {
            return new ArrayList<>();
        }
        
        // In a real implementation:
        // if (includeResolved) {
        //     return alertRepository.findByAffectedServiceServiceId(serviceId);
        // } else {
        //     return alertRepository.findByAffectedServiceServiceIdAndStatusIn(
        //         serviceId, Arrays.asList(ALERT_STATUS_ACTIVE, ALERT_STATUS_ACKNOWLEDGED));
        // }
        
        return alerts.stream()
            .filter(a -> a.getAffectedService() != null && 
                          serviceId.equals(a.getAffectedService().getServiceId()))
            .filter(a -> includeResolved || a.isActive())
            .collect(Collectors.toList());
    }

    /**
     * Acknowledges an alert, updating its status and acknowledgement information
     *
     * @param alertId ID of the alert to acknowledge
     * @param acknowledgedBy User who acknowledged the alert
     * @return The updated alert, or null if not found
     */
    public Alert acknowledgeAlert(String alertId, String acknowledgedBy) {
        if (alertId == null || alertId.isEmpty()) {
            throw new IllegalArgumentException("Alert ID cannot be null or empty");
        }
        
        if (acknowledgedBy == null || acknowledgedBy.isEmpty()) {
            throw new IllegalArgumentException("Acknowledged by cannot be null or empty");
        }
        
        Alert alert = getAlert(alertId);
        
        if (alert == null) {
            return null;
        }
        
        if (alert.isResolved()) {
            log.warn("Cannot acknowledge alert {} as it is already resolved", alertId);
            return alert;
        }
        
        alert.setStatus(ALERT_STATUS_ACKNOWLEDGED);
        alert.setAcknowledgedBy(acknowledgedBy);
        alert.setAcknowledgedAt(LocalDateTime.now());
        alert.setLastModifiedAt(LocalDateTime.now());
        
        // In a real implementation:
        // alertRepository.save(alert);
        
        log.info("Alert {} acknowledged by {}", alertId, acknowledgedBy);
        
        // Publish alert update event
        publishAlertEvent(alert, "ACKNOWLEDGED");
        
        return alert;
    }

    /**
     * Resolves an alert, updating its status and resolution information
     *
     * @param alertId ID of the alert to resolve
     * @param resolvedBy User who resolved the alert
     * @param resolutionNotes Optional notes about the resolution
     * @return The updated alert, or null if not found
     */
    public Alert resolveAlert(String alertId, String resolvedBy, String resolutionNotes) {
        if (alertId == null || alertId.isEmpty()) {
            throw new IllegalArgumentException("Alert ID cannot be null or empty");
        }
        
        if (resolvedBy == null || resolvedBy.isEmpty()) {
            throw new IllegalArgumentException("Resolved by cannot be null or empty");
        }
        
        Alert alert = getAlert(alertId);
        
        if (alert == null) {
            return null;
        }
        
        if (alert.isResolved()) {
            log.warn("Cannot resolve alert {} as it is already resolved", alertId);
            return alert;
        }
        
        alert.setStatus(ALERT_STATUS_RESOLVED);
        alert.setResolvedBy(resolvedBy);
        alert.setResolvedAt(LocalDateTime.now());
        alert.setLastModifiedAt(LocalDateTime.now());
        
        // Add resolution notes to context if provided
        if (resolutionNotes != null && !resolutionNotes.isEmpty()) {
            if (alert.getContext() == null) {
                alert.setContext(new HashMap<>());
            }
            alert.addContextValue("resolutionNotes", resolutionNotes);
        }
        
        // In a real implementation:
        // alertRepository.save(alert);
        
        log.info("Alert {} resolved by {}", alertId, resolvedBy);
        
        // Publish alert update event
        publishAlertEvent(alert, "RESOLVED");
        
        return alert;
    }

    /**
     * Resolves multiple alerts matching the provided criteria
     *
     * @param category Optional category filter
     * @param source Optional source filter
     * @param affectedService Optional affected service filter
     * @param resolvedBy User who resolved the alerts
     * @param resolutionNotes Optional notes about the resolution
     * @return Number of alerts resolved
     */
    public int bulkResolveAlerts(String category, String source, ServiceStatus affectedService,
                               String resolvedBy, String resolutionNotes) {
        if (resolvedBy == null || resolvedBy.isEmpty()) {
            throw new IllegalArgumentException("Resolved by cannot be null or empty");
        }
        
        // In a real implementation, this would use the repository with a specification
        // Specification<Alert> spec = Specification.where((root, query, cb) -> 
        //     cb.or(cb.equal(root.get("status"), ALERT_STATUS_ACTIVE), 
        //           cb.equal(root.get("status"), ALERT_STATUS_ACKNOWLEDGED)));
        // if (category != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category));
        // if (source != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("source"), source));
        // if (affectedService != null) spec = spec.and((root, query, cb) -> 
        //     cb.equal(root.get("affectedService").get("serviceId"), affectedService.getServiceId()));
        // List<Alert> alertsToResolve = alertRepository.findAll(spec);
        
        List<Alert> alertsToResolve = alerts.stream()
            .filter(a -> a.isActive())
            .filter(a -> category == null || category.equals(a.getCategory()))
            .filter(a -> source == null || source.equals(a.getSource()))
            .filter(a -> affectedService == null || 
                         (a.getAffectedService() != null && 
                          affectedService.getServiceId().equals(a.getAffectedService().getServiceId())))
            .collect(Collectors.toList());
        
        LocalDateTime now = LocalDateTime.now();
        
        for (Alert alert : alertsToResolve) {
            alert.setStatus(ALERT_STATUS_RESOLVED);
            alert.setResolvedBy(resolvedBy);
            alert.setResolvedAt(now);
            alert.setLastModifiedAt(now);
            
            // Add resolution notes to context if provided
            if (resolutionNotes != null && !resolutionNotes.isEmpty()) {
                if (alert.getContext() == null) {
                    alert.setContext(new HashMap<>());
                }
                alert.addContextValue("resolutionNotes", resolutionNotes);
            }
            
            // In a real implementation:
            // alertRepository.save(alert);
            
            // Publish alert update event
            publishAlertEvent(alert, "RESOLVED");
        }
        
        log.info("Bulk resolved {} alerts with criteria: category={}, source={}, service={}, resolvedBy={}",
                alertsToResolve.size(), category, source, 
                affectedService != null ? affectedService.getServiceId() : "null", 
                resolvedBy);
        
        return alertsToResolve.size();
    }

    /**
     * Processes alert escalations based on severity and time since last escalation
     */
    @Scheduled(fixedRateString = "${monitoring.alerts.escalation-check-rate:300000}")
    public void processAlertEscalations() {
        // Get all active alerts
        List<Alert> activeAlerts = getActiveAlerts(null);
        LocalDateTime now = LocalDateTime.now();
        
        for (Alert alert : activeAlerts) {
            boolean shouldEscalate = false;
            LocalDateTime lastEscalated = alert.getLastEscalatedAt();
            
            // Check if escalation is needed based on severity and time since last escalation
            if (ALERT_SEVERITY_CRITICAL.equals(alert.getSeverity())) {
                // Escalate critical alerts every ESCALATION_INTERVAL_CRITICAL_MINUTES
                if (lastEscalated == null || 
                    Duration.between(lastEscalated, now).toMinutes() >= ESCALATION_INTERVAL_CRITICAL_MINUTES) {
                    shouldEscalate = true;
                }
            } else if (ALERT_SEVERITY_HIGH.equals(alert.getSeverity())) {
                // Escalate high alerts every ESCALATION_INTERVAL_HIGH_MINUTES
                if (lastEscalated == null || 
                    Duration.between(lastEscalated, now).toMinutes() >= ESCALATION_INTERVAL_HIGH_MINUTES) {
                    shouldEscalate = true;
                }
            } else if (ALERT_SEVERITY_MEDIUM.equals(alert.getSeverity())) {
                // Escalate medium alerts every ESCALATION_INTERVAL_MEDIUM_MINUTES
                if (lastEscalated == null || 
                    Duration.between(lastEscalated, now).toMinutes() >= ESCALATION_INTERVAL_MEDIUM_MINUTES) {
                    shouldEscalate = true;
                }
            }
            // Low severity alerts are not automatically escalated
            
            // Perform escalation if needed and if below max escalation level
            if (shouldEscalate && (alert.getEscalationLevel() == null || 
                                  alert.getEscalationLevel() < MAX_ESCALATION_LEVEL)) {
                // Increment escalation level
                alert.incrementEscalationLevel();
                alert.setLastModifiedAt(now);
                
                // In a real implementation:
                // alertRepository.save(alert);
                
                log.info("Escalated alert {} to level {}", alert.getAlertId(), alert.getEscalationLevel());
                
                // Publish escalation event to appropriate notification channels
                publishAlertEvent(alert, "ESCALATED");
            }
        }
    }

    /**
     * Archives or deletes old resolved alerts based on retention policy
     */
    @Scheduled(fixedRateString = "${monitoring.alerts.cleanup-rate:86400000}")
    public void cleanupResolvedAlerts() {
        // Get retention period from configuration (default 90 days)
        int retentionDays = 90;
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionDays);
        
        // Find resolved alerts older than the cutoff date
        // In a real implementation:
        // List<Alert> oldAlerts = alertRepository.findByStatusAndResolvedAtBefore(
        //     ALERT_STATUS_RESOLVED, cutoffDate);
        
        List<Alert> oldAlerts = alerts.stream()
            .filter(a -> ALERT_STATUS_RESOLVED.equals(a.getStatus()))
            .filter(a -> a.getResolvedAt() != null && a.getResolvedAt().isBefore(cutoffDate))
            .collect(Collectors.toList());
        
        // Archive alerts if archiving is enabled
        boolean archivingEnabled = true; // In a real implementation, this would be configurable
        
        if (archivingEnabled) {
            // Archive the alerts to long-term storage
            archiveAlerts(oldAlerts);
            
            // Delete the archived alerts from the active repository
            // In a real implementation:
            // alertRepository.deleteAll(oldAlerts);
            alerts.removeAll(oldAlerts);
        } else {
            // Delete the old alerts directly
            // In a real implementation:
            // alertRepository.deleteAll(oldAlerts);
            alerts.removeAll(oldAlerts);
        }
        
        log.info("Cleaned up {} resolved alerts older than {} days", oldAlerts.size(), retentionDays);
    }

    /**
     * Calculates statistics about alerts in the system
     *
     * @param startTime Optional start time for the statistics period
     * @param endTime Optional end time for the statistics period
     * @return Map of alert statistics
     */
    public Map<String, Object> getAlertStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        // If startTime is not provided, default to 24 hours ago
        if (startTime == null) {
            startTime = LocalDateTime.now().minusHours(24);
        }
        
        // If endTime is not provided, default to now
        if (endTime == null) {
            endTime = LocalDateTime.now();
        }
        
        // Get alerts within the time range
        // In a real implementation:
        // List<Alert> alertsInRange = alertRepository.findByTimestampBetween(startTime, endTime);
        
        List<Alert> alertsInRange = alerts.stream()
            .filter(a -> a.getTimestamp() != null && 
                         !a.getTimestamp().isBefore(startTime) && 
                         !a.getTimestamp().isAfter(endTime))
            .collect(Collectors.toList());
        
        // Calculate statistics
        Map<String, Object> statistics = new HashMap<>();
        
        // Total alert count
        statistics.put("totalCount", alertsInRange.size());
        
        // Count by severity
        Map<String, Long> countBySeverity = alertsInRange.stream()
            .collect(Collectors.groupingBy(
                a -> a.getSeverity() != null ? a.getSeverity() : "UNKNOWN",
                Collectors.counting()
            ));
        statistics.put("countBySeverity", countBySeverity);
        
        // Count by status
        Map<String, Long> countByStatus = alertsInRange.stream()
            .collect(Collectors.groupingBy(
                a -> a.getStatus() != null ? a.getStatus() : "UNKNOWN",
                Collectors.counting()
            ));
        statistics.put("countByStatus", countByStatus);
        
        // Count by category
        Map<String, Long> countByCategory = alertsInRange.stream()
            .collect(Collectors.groupingBy(
                a -> a.getCategory() != null ? a.getCategory() : "UNKNOWN",
                Collectors.counting()
            ));
        statistics.put("countByCategory", countByCategory);
        
        // Count by source
        Map<String, Long> countBySource = alertsInRange.stream()
            .collect(Collectors.groupingBy(
                a -> a.getSource() != null ? a.getSource() : "UNKNOWN",
                Collectors.counting()
            ));
        statistics.put("countBySource", countBySource);
        
        // Average time to acknowledgement
        double avgTimeToAcknowledgement = alertsInRange.stream()
            .filter(a -> a.getAcknowledgedAt() != null)
            .mapToLong(Alert::getTimeToAcknowledgement)
            .filter(t -> t >= 0)
            .average()
            .orElse(0);
        statistics.put("avgTimeToAcknowledgementSeconds", avgTimeToAcknowledgement);
        
        // Average time to resolution
        double avgTimeToResolution = alertsInRange.stream()
            .filter(a -> a.getResolvedAt() != null)
            .mapToLong(Alert::getTimeToResolution)
            .filter(t -> t >= 0)
            .average()
            .orElse(0);
        statistics.put("avgTimeToResolutionSeconds", avgTimeToResolution);
        
        // Alert rate (alerts per hour)
        long hours = Duration.between(startTime, endTime).toHours();
        hours = hours > 0 ? hours : 1; // Avoid division by zero
        double alertRate = (double) alertsInRange.size() / hours;
        statistics.put("alertRatePerHour", alertRate);
        
        // Add time range to the statistics
        statistics.put("startTime", startTime);
        statistics.put("endTime", endTime);
        
        return statistics;
    }

    /**
     * Adds context information to an existing alert
     *
     * @param alertId ID of the alert
     * @param key Context key
     * @param value Context value
     * @return The updated alert, or null if not found
     */
    public Alert addAlertContext(String alertId, String key, Object value) {
        if (alertId == null || alertId.isEmpty() || key == null || value == null) {
            return null;
        }
        
        Alert alert = getAlert(alertId);
        
        if (alert == null) {
            return null;
        }
        
        // Add the context value
        alert.addContextValue(key, value);
        alert.setLastModifiedAt(LocalDateTime.now());
        
        // In a real implementation:
        // alertRepository.save(alert);
        
        return alert;
    }

    /**
     * Adds a related alert ID to an existing alert
     *
     * @param alertId ID of the alert
     * @param relatedAlertId ID of the related alert
     * @return The updated alert, or null if not found
     */
    public Alert addRelatedAlert(String alertId, String relatedAlertId) {
        if (alertId == null || alertId.isEmpty() || relatedAlertId == null || relatedAlertId.isEmpty()) {
            return null;
        }
        
        Alert alert = getAlert(alertId);
        
        if (alert == null) {
            return null;
        }
        
        // Add the related alert ID
        alert.addRelatedAlertId(relatedAlertId);
        alert.setLastModifiedAt(LocalDateTime.now());
        
        // In a real implementation:
        // alertRepository.save(alert);
        
        return alert;
    }

    /**
     * Adds a notification channel to an existing alert
     *
     * @param alertId ID of the alert
     * @param channel Notification channel
     * @return The updated alert, or null if not found
     */
    public Alert addNotificationChannel(String alertId, String channel) {
        if (alertId == null || alertId.isEmpty() || channel == null || channel.isEmpty()) {
            return null;
        }
        
        Alert alert = getAlert(alertId);
        
        if (alert == null) {
            return null;
        }
        
        // Add the notification channel
        alert.addNotificationChannel(channel);
        alert.setLastModifiedAt(LocalDateTime.now());
        
        // In a real implementation:
        // alertRepository.save(alert);
        
        return alert;
    }

    /**
     * Retrieves alerts created within a specific time range
     *
     * @param startTime Start of the time range
     * @param endTime End of the time range
     * @param pageable Pagination parameters
     * @return Page of alerts within the time range
     */
    public Page<Alert> getAlertsByTimeRange(LocalDateTime startTime, LocalDateTime endTime, Pageable pageable) {
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("Start time and end time cannot be null");
        }
        
        // In a real implementation:
        // return alertRepository.findByTimestampBetween(startTime, endTime, pageable);
        
        List<Alert> filteredAlerts = alerts.stream()
            .filter(a -> a.getTimestamp() != null && 
                         !a.getTimestamp().isBefore(startTime) && 
                         !a.getTimestamp().isAfter(endTime))
            .collect(Collectors.toList());
        
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filteredAlerts.size());
        
        List<Alert> pageContent = start < end ? filteredAlerts.subList(start, end) : new ArrayList<>();
        
        return new org.springframework.data.domain.PageImpl<>(pageContent, pageable, filteredAlerts.size());
    }

    /**
     * Counts alerts matching the provided criteria
     *
     * @param severity Optional filter by severity
     * @param status Optional filter by status
     * @param category Optional filter by category
     * @param startTime Optional filter by timestamp >= startTime
     * @param endTime Optional filter by timestamp <= endTime
     * @return Count of matching alerts
     */
    public long getAlertCount(String severity, String status, String category,
                              LocalDateTime startTime, LocalDateTime endTime) {
        // In a real implementation, this would use the repository
        // Specification<Alert> spec = Specification.where(null);
        // if (severity != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("severity"), severity));
        // if (status != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        // if (category != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category));
        // if (startTime != null) spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("timestamp"), startTime));
        // if (endTime != null) spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("timestamp"), endTime));
        // return alertRepository.count(spec);
        
        return alerts.stream()
            .filter(a -> severity == null || severity.equals(a.getSeverity()))
            .filter(a -> status == null || status.equals(a.getStatus()))
            .filter(a -> category == null || category.equals(a.getCategory()))
            .filter(a -> startTime == null || a.getTimestamp() == null || !a.getTimestamp().isBefore(startTime))
            .filter(a -> endTime == null || a.getTimestamp() == null || !a.getTimestamp().isAfter(endTime))
            .count();
    }

    /**
     * Finds an active alert that is similar to the provided alert
     *
     * @param alert Alert to compare with
     * @return Similar active alert, or null if none found
     */
    private Alert findSimilarActiveAlert(Alert alert) {
        if (alert == null) {
            return null;
        }
        
        return getActiveAlerts(null).stream()
            .filter(a -> isSimilarAlert(a, alert))
            .findFirst()
            .orElse(null);
    }

    /**
     * Determines if two alerts are similar based on key attributes
     *
     * @param alert1 First alert
     * @param alert2 Second alert
     * @return True if the alerts are similar, false otherwise
     */
    private boolean isSimilarAlert(Alert alert1, Alert alert2) {
        if (alert1 == null || alert2 == null) {
            return false;
        }
        
        // Check if title is the same
        boolean titleMatch = alert1.getTitle() != null && 
                             alert1.getTitle().equals(alert2.getTitle());
        
        // Check if category is the same
        boolean categoryMatch = alert1.getCategory() != null && 
                                alert1.getCategory().equals(alert2.getCategory());
        
        // Check if source is the same
        boolean sourceMatch = alert1.getSource() != null && 
                              alert1.getSource().equals(alert2.getSource());
        
        // Check if affected service is the same
        boolean serviceMatch = true; // Default to true if both are null
        if (alert1.getAffectedService() != null && alert2.getAffectedService() != null) {
            serviceMatch = alert1.getAffectedService().getServiceId() != null && 
                           alert1.getAffectedService().getServiceId().equals(
                               alert2.getAffectedService().getServiceId());
        } else if ((alert1.getAffectedService() == null && alert2.getAffectedService() != null) ||
                   (alert1.getAffectedService() != null && alert2.getAffectedService() == null)) {
            serviceMatch = false;
        }
        
        // Alerts are similar if title matches and at least one other attribute matches
        return titleMatch && (categoryMatch || sourceMatch || serviceMatch);
    }

    /**
     * Archives alerts to long-term storage
     *
     * @param alerts Alerts to archive
     */
    private void archiveAlerts(List<Alert> alerts) {
        // In a real implementation, this would archive the alerts to a long-term storage system
        // such as a data warehouse, object storage, or an archive database
        log.info("Archived {} alerts to long-term storage", alerts.size());
    }

    /**
     * Publishes an alert event to notification channels
     *
     * @param alert Alert that changed
     * @param eventType Type of event (CREATED, UPDATED, ACKNOWLEDGED, RESOLVED, ESCALATED)
     */
    private void publishAlertEvent(Alert alert, String eventType) {
        // In a real implementation, this would publish the event to appropriate notification channels
        // such as email, SMS, Slack, PagerDuty, or a message broker for other services to consume
        log.debug("Alert event published: {} - Alert ID: {}, Severity: {}", 
                 eventType, alert.getAlertId(), alert.getSeverity());
    }
}