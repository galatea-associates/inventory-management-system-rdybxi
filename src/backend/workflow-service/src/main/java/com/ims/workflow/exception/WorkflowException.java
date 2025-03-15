package com.ims.workflow.exception;

import com.ims.common.exception.ServiceException;
import lombok.Getter; // lombok 1.18.26
import java.util.UUID; // Java 17

/**
 * Exception thrown when workflow-specific errors occur in the Inventory Management System.
 * This exception provides additional context about the workflow type, step, and ID
 * where the error occurred.
 */
@Getter
public class WorkflowException extends ServiceException {

    private static final String ERROR_CODE_WORKFLOW = "WORKFLOW_ERROR";
    
    private final String workflowType;
    private final String workflowStep;
    private final String workflowId;
    
    /**
     * Constructor with workflow type and message.
     *
     * @param workflowType The type of workflow where the exception occurred
     * @param message      The error message
     */
    public WorkflowException(String workflowType, String message) {
        super(ERROR_CODE_WORKFLOW, "workflow-service", message);
        this.workflowType = workflowType;
        this.workflowStep = null;
        this.workflowId = null;
    }

    /**
     * Constructor with workflow type, message, and cause.
     *
     * @param workflowType The type of workflow where the exception occurred
     * @param message      The error message
     * @param cause        The cause of this exception
     */
    public WorkflowException(String workflowType, String message, Throwable cause) {
        super(ERROR_CODE_WORKFLOW, "workflow-service", message, cause);
        this.workflowType = workflowType;
        this.workflowStep = null;
        this.workflowId = null;
    }

    /**
     * Constructor with workflow type, workflow step, and message.
     *
     * @param workflowType The type of workflow where the exception occurred
     * @param workflowStep The workflow step where the exception occurred
     * @param message      The error message
     */
    public WorkflowException(String workflowType, String workflowStep, String message) {
        super(ERROR_CODE_WORKFLOW, "workflow-service", message);
        this.workflowType = workflowType;
        this.workflowStep = workflowStep;
        this.workflowId = null;
    }

    /**
     * Constructor with workflow type, workflow step, message, and cause.
     *
     * @param workflowType The type of workflow where the exception occurred
     * @param workflowStep The workflow step where the exception occurred
     * @param message      The error message
     * @param cause        The cause of this exception
     */
    public WorkflowException(String workflowType, String workflowStep, String message, Throwable cause) {
        super(ERROR_CODE_WORKFLOW, "workflow-service", message, cause);
        this.workflowType = workflowType;
        this.workflowStep = workflowStep;
        this.workflowId = null;
    }

    /**
     * Constructor with workflow type, workflow step, workflow ID, message, and cause.
     *
     * @param workflowType The type of workflow where the exception occurred
     * @param workflowStep The workflow step where the exception occurred
     * @param workflowId   The ID of the workflow instance where the exception occurred
     * @param message      The error message
     * @param cause        The cause of this exception
     */
    public WorkflowException(String workflowType, String workflowStep, String workflowId, String message, Throwable cause) {
        super(ERROR_CODE_WORKFLOW, "workflow-service", message, cause);
        this.workflowType = workflowType;
        this.workflowStep = workflowStep;
        this.workflowId = workflowId;
    }

    /**
     * Constructor with workflow type, workflow step, workflow ID, message, details, retryable flag, cause, and correlation ID.
     *
     * @param workflowType  The type of workflow where the exception occurred
     * @param workflowStep  The workflow step where the exception occurred
     * @param workflowId    The ID of the workflow instance where the exception occurred
     * @param message       The error message
     * @param details       Additional details about the error
     * @param retryable     Whether the operation can be retried
     * @param cause         The cause of this exception
     * @param correlationId The correlation ID for tracing
     */
    public WorkflowException(String workflowType, String workflowStep, String workflowId, String message, String details, 
                            boolean retryable, Throwable cause, UUID correlationId) {
        super(ERROR_CODE_WORKFLOW, "workflow-service", "workflow-operation", message, details, retryable, cause, correlationId);
        this.workflowType = workflowType;
        this.workflowStep = workflowStep;
        this.workflowId = workflowId;
    }

    /**
     * Creates a new exception with the specified workflow type.
     *
     * @param workflowType The new workflow type
     * @return A new exception with the specified workflow type
     */
    public WorkflowException withWorkflowType(String workflowType) {
        return new WorkflowException(
            workflowType,
            this.workflowStep,
            this.workflowId,
            this.getMessage(),
            this.getErrorMessage(),
            this.isRetryable(),
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Creates a new exception with the specified workflow step.
     *
     * @param workflowStep The new workflow step
     * @return A new exception with the specified workflow step
     */
    public WorkflowException withWorkflowStep(String workflowStep) {
        return new WorkflowException(
            this.workflowType,
            workflowStep,
            this.workflowId,
            this.getMessage(),
            this.getErrorMessage(),
            this.isRetryable(),
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Creates a new exception with the specified workflow ID.
     *
     * @param workflowId The new workflow ID
     * @return A new exception with the specified workflow ID
     */
    public WorkflowException withWorkflowId(String workflowId) {
        return new WorkflowException(
            this.workflowType,
            this.workflowStep,
            workflowId,
            this.getMessage(),
            this.getErrorMessage(),
            this.isRetryable(),
            this.getCause(),
            UUID.fromString(this.getCorrelationId())
        );
    }

    /**
     * Static factory method to create a locate workflow exception.
     *
     * @param step    The workflow step where the exception occurred
     * @param message The error message
     * @return A new exception for locate workflow errors
     */
    public static WorkflowException locateWorkflowError(String step, String message) {
        return new WorkflowException("LOCATE", step, message);
    }

    /**
     * Static factory method to create a short sell workflow exception.
     *
     * @param step    The workflow step where the exception occurred
     * @param message The error message
     * @return A new exception for short sell workflow errors
     */
    public static WorkflowException shortSellWorkflowError(String step, String message) {
        return new WorkflowException("SHORT_SELL", step, message);
    }
}