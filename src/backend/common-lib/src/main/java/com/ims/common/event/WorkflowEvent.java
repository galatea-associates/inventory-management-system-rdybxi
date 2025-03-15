package com.ims.common.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Event class representing workflow-related events in the Inventory Management System.
 * This class extends BaseEvent and is used to communicate workflow state transitions,
 * approvals, rejections, and other workflow-related events across microservices using
 * the event-driven architecture.
 *
 * It contains common workflow information and supports both locate approval
 * and short sell approval workflows.
 */
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
@SuperBuilder
@JsonIgnoreProperties(ignoreUnknown = true)
public class WorkflowEvent extends BaseEvent {

    /**
     * Unique identifier for the workflow
     */
    private String workflowId;
    
    /**
     * Type of workflow (e.g., LOCATE_APPROVAL, SHORT_SELL_APPROVAL)
     */
    private String workflowType;
    
    /**
     * Current step in the workflow
     */
    private String workflowStep;
    
    /**
     * Security identifier related to this workflow
     */
    private String securityId;
    
    /**
     * Client identifier related to this workflow
     */
    private String clientId;
    
    /**
     * Aggregation unit identifier related to this workflow
     */
    private String aggregationUnitId;
    
    /**
     * Identifier of the user or system that initiated the workflow
     */
    private String requestorId;
    
    /**
     * Current status of the workflow (e.g., PENDING, APPROVED, REJECTED)
     */
    private String status;
    
    /**
     * User or system that performed the last action on the workflow
     */
    private String actionBy;
    
    /**
     * Timestamp when the last action was performed
     */
    private LocalDateTime actionTimestamp;
    
    /**
     * Flag indicating if the workflow step was processed automatically
     */
    private Boolean isAutomatic;
    
    /**
     * Reason for rejection if the workflow was rejected
     */
    private String rejectionReason;
    
    /**
     * Processing time in milliseconds for performance monitoring
     */
    private Long processingTimeMs;

    /**
     * Constructor that initializes a new workflow event with the specified event type and source
     *
     * @param eventType The type of the event
     * @param source The source system or service that generated the event
     */
    public WorkflowEvent(String eventType, String source) {
        super(eventType, source);
        this.isAutomatic = false;
        this.actionTimestamp = LocalDateTime.now();
    }

    /**
     * Validates the event data before processing
     *
     * @return True if the event is valid, false otherwise
     */
    @Override
    protected boolean validate() {
        return super.validate() &&
               workflowId != null && !workflowId.isEmpty() &&
               workflowType != null && !workflowType.isEmpty() &&
               status != null && !status.isEmpty();
    }

    /**
     * Gets the routing key for this event based on workflow type and ID
     *
     * @return The routing key for this event
     */
    public String getRoutingKey() {
        return workflowType + "." + workflowId;
    }

    /**
     * Determines if this event is related to a locate approval workflow
     *
     * @return True if this is a locate workflow event, false otherwise
     */
    public boolean isLocateWorkflow() {
        return "LOCATE_APPROVAL".equals(workflowType);
    }

    /**
     * Determines if this event is related to a short sell approval workflow
     *
     * @return True if this is a short sell workflow event, false otherwise
     */
    public boolean isShortSellWorkflow() {
        return "SHORT_SELL_APPROVAL".equals(workflowType);
    }

    /**
     * Determines if this event represents a workflow start
     *
     * @return True if this is a workflow start event, false otherwise
     */
    public boolean isWorkflowStarted() {
        return "WORKFLOW_STARTED".equals(getEventType());
    }

    /**
     * Determines if this event represents a workflow completion
     *
     * @return True if this is a workflow completion event, false otherwise
     */
    public boolean isWorkflowCompleted() {
        return "WORKFLOW_COMPLETED".equals(getEventType());
    }

    /**
     * Determines if this event represents a workflow failure
     *
     * @return True if this is a workflow failure event, false otherwise
     */
    public boolean isWorkflowFailed() {
        return "WORKFLOW_FAILED".equals(getEventType());
    }

    /**
     * Determines if this event represents a workflow step start
     *
     * @return True if this is a step start event, false otherwise
     */
    public boolean isStepStarted() {
        return "STEP_STARTED".equals(getEventType());
    }

    /**
     * Determines if this event represents a workflow step completion
     *
     * @return True if this is a step completion event, false otherwise
     */
    public boolean isStepCompleted() {
        return "STEP_COMPLETED".equals(getEventType());
    }

    /**
     * Determines if this event represents a workflow step failure
     *
     * @return True if this is a step failure event, false otherwise
     */
    public boolean isStepFailed() {
        return "STEP_FAILED".equals(getEventType());
    }

    /**
     * Determines if this workflow event has approved status
     *
     * @return True if the workflow is approved, false otherwise
     */
    public boolean isApproved() {
        return "APPROVED".equals(status);
    }

    /**
     * Determines if this workflow event has rejected status
     *
     * @return True if the workflow is rejected, false otherwise
     */
    public boolean isRejected() {
        return "REJECTED".equals(status);
    }

    /**
     * Determines if this workflow event has pending status
     *
     * @return True if the workflow is pending, false otherwise
     */
    public boolean isPending() {
        return "PENDING".equals(status);
    }

    /**
     * Determines if this workflow event has in-progress status
     *
     * @return True if the workflow is in progress, false otherwise
     */
    public boolean isInProgress() {
        return "IN_PROGRESS".equals(status);
    }

    /**
     * Determines if this workflow event has cancelled status
     *
     * @return True if the workflow is cancelled, false otherwise
     */
    public boolean isCancelled() {
        return "CANCELLED".equals(status);
    }

    /**
     * Determines if the workflow was completed within the performance SLA
     *
     * @return True if the workflow was completed within the SLA, false otherwise
     */
    public boolean isWithinPerformanceSLA() {
        if (processingTimeMs == null) {
            return false;
        }
        
        // Short sell approval has a stricter SLA (150ms) than other workflows (200ms)
        if (isShortSellWorkflow()) {
            return processingTimeMs <= 150;
        } else {
            return processingTimeMs <= 200;
        }
    }

    /**
     * Converts this workflow event to a LocateEvent for locate-specific processing
     *
     * @return A LocateEvent populated with data from this workflow event
     */
    public LocateEvent toLocateEvent() {
        // This method assumes that there is a LocateEvent class in the system
        // The actual implementation would depend on the LocateEvent class structure
        
        LocateEvent locateEvent = new LocateEvent(getEventType(), getSource());
        // Copy common properties
        locateEvent.setLocateId(this.workflowId);
        locateEvent.setSecurityId(this.securityId);
        locateEvent.setClientId(this.clientId);
        locateEvent.setRequestorId(this.requestorId);
        locateEvent.setStatus(this.status);
        locateEvent.setActionBy(this.actionBy);
        locateEvent.setActionTimestamp(this.actionTimestamp);
        locateEvent.setIsAutomatic(this.isAutomatic);
        locateEvent.setRejectionReason(this.rejectionReason);
        
        return locateEvent;
    }
}