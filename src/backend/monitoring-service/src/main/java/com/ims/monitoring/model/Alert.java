package com.ims.monitoring.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.ims.common.model.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Represents a system alert in the Inventory Management System.
 * Alerts are generated for system health issues, performance degradation,
 * threshold breaches, and other monitored events that require attention.
 */
@Entity
@Table(name = "alerts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Alert extends BaseEntity {

    private String alertId;
    private String title;
    private String description;
    private String severity;
    private String status;
    private String source;
    private String category;
    private LocalDateTime timestamp;
    private ServiceStatus affectedService;
    private Map<String, Object> context;
    private String acknowledgedBy;
    private LocalDateTime acknowledgedAt;
    private String resolvedBy;
    private LocalDateTime resolvedAt;
    private Integer escalationLevel;
    private LocalDateTime lastEscalatedAt;
    private List<String> notificationChannels;
    private List<String> relatedAlertIds;
    private String runbookUrl;
    private Long thresholdValue;
    private Long actualValue;
    private String metricName;
    private Integer occurrenceCount;
    private Boolean requiresAcknowledgement;

    /**
     * Determines if the alert is currently active
     *
     * @return True if the alert status is 'ACTIVE' or 'ACKNOWLEDGED', false otherwise
     */
    public boolean isActive() {
        return "ACTIVE".equals(status) || "ACKNOWLEDGED".equals(status);
    }

    /**
     * Determines if the alert has been acknowledged
     *
     * @return True if the alert status is 'ACKNOWLEDGED', false otherwise
     */
    public boolean isAcknowledged() {
        return "ACKNOWLEDGED".equals(status);
    }

    /**
     * Determines if the alert has been resolved
     *
     * @return True if the alert status is 'RESOLVED', false otherwise
     */
    public boolean isResolved() {
        return "RESOLVED".equals(status);
    }

    /**
     * Determines if the alert has critical severity
     *
     * @return True if the alert severity is 'CRITICAL', false otherwise
     */
    public boolean isCritical() {
        return "CRITICAL".equals(severity);
    }

    /**
     * Determines if the alert has high severity
     *
     * @return True if the alert severity is 'HIGH', false otherwise
     */
    public boolean isHigh() {
        return "HIGH".equals(severity);
    }

    /**
     * Determines if the alert has medium severity
     *
     * @return True if the alert severity is 'MEDIUM', false otherwise
     */
    public boolean isMedium() {
        return "MEDIUM".equals(severity);
    }

    /**
     * Determines if the alert has low severity
     *
     * @return True if the alert severity is 'LOW', false otherwise
     */
    public boolean isLow() {
        return "LOW".equals(severity);
    }

    /**
     * Calculates the duration since the alert was created
     *
     * @return Duration in seconds since alert creation
     */
    public long getDurationSinceCreation() {
        if (timestamp == null) {
            return 0L;
        }
        return Duration.between(timestamp, LocalDateTime.now()).getSeconds();
    }

    /**
     * Calculates the time taken to acknowledge the alert
     *
     * @return Duration in seconds between creation and acknowledgement, or -1 if not acknowledged
     */
    public long getTimeToAcknowledgement() {
        if (timestamp == null || acknowledgedAt == null) {
            return -1L;
        }
        return Duration.between(timestamp, acknowledgedAt).getSeconds();
    }

    /**
     * Calculates the time taken to resolve the alert
     *
     * @return Duration in seconds between creation and resolution, or -1 if not resolved
     */
    public long getTimeToResolution() {
        if (timestamp == null || resolvedAt == null) {
            return -1L;
        }
        return Duration.between(timestamp, resolvedAt).getSeconds();
    }

    /**
     * Adds a notification channel to the alert
     *
     * @param channel Channel to add
     */
    public void addNotificationChannel(String channel) {
        if (notificationChannels == null) {
            notificationChannels = new ArrayList<>();
        }
        if (!notificationChannels.contains(channel)) {
            notificationChannels.add(channel);
        }
    }

    /**
     * Adds a related alert ID to the alert
     *
     * @param relatedAlertId Related alert ID to add
     */
    public void addRelatedAlertId(String relatedAlertId) {
        if (relatedAlertIds == null) {
            relatedAlertIds = new ArrayList<>();
        }
        if (!relatedAlertIds.contains(relatedAlertId)) {
            relatedAlertIds.add(relatedAlertId);
        }
    }

    /**
     * Adds a context value to the alert
     *
     * @param key Key for the context value
     * @param value Value to store
     */
    public void addContextValue(String key, Object value) {
        if (context == null) {
            context = new HashMap<>();
        }
        context.put(key, value);
    }

    /**
     * Gets a context value from the alert
     *
     * @param key Key for the context value
     * @return Value associated with the key, or null if not found
     */
    public Object getContextValue(String key) {
        if (context == null) {
            return null;
        }
        return context.get(key);
    }

    /**
     * Increments the occurrence count of the alert
     */
    public void incrementOccurrenceCount() {
        if (occurrenceCount == null) {
            occurrenceCount = 1;
        } else {
            occurrenceCount++;
        }
    }

    /**
     * Increments the escalation level of the alert
     */
    public void incrementEscalationLevel() {
        if (escalationLevel == null) {
            escalationLevel = 1;
        } else {
            escalationLevel++;
        }
        lastEscalatedAt = LocalDateTime.now();
    }

    /**
     * Gets the numeric severity level of the alert
     *
     * @return Numeric severity level (1-4, where 1 is most severe)
     */
    public int getSeverityLevel() {
        if ("CRITICAL".equals(severity)) {
            return 1;
        } else if ("HIGH".equals(severity)) {
            return 2;
        } else if ("MEDIUM".equals(severity)) {
            return 3;
        } else if ("LOW".equals(severity)) {
            return 4;
        } else {
            return 5; // Unknown severity
        }
    }

    /**
     * Calculates the percentage by which a threshold was breached
     *
     * @return Percentage of threshold breach, or 0 if not applicable
     */
    public double getThresholdBreachPercentage() {
        if (thresholdValue == null || actualValue == null || thresholdValue == 0) {
            return 0.0;
        }
        return ((double)(actualValue - thresholdValue) / thresholdValue) * 100.0;
    }
}