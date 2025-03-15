package com.ims.workflow.publisher;

import com.ims.common.event.WorkflowEvent;
import com.ims.common.event.LocateEvent;
import com.ims.common.event.InventoryEvent;
import com.ims.workflow.model.LocateRequest;
import com.ims.workflow.model.OrderValidation;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.CompletableFuture;

/**
 * Service class responsible for publishing workflow-related events to Kafka topics in the Inventory Management System.
 * This publisher handles events for workflow state transitions, locate approvals/rejections, and short sell validations,
 * ensuring reliable delivery with appropriate routing.
 * 
 * Supports the following requirements:
 * - F-301: Locate Approval Workflow
 * - F-302: Short Sell Approval Workflow
 * - F-505: Message Delivery Guarantees
 * - Event-Driven Architecture for loose coupling between services
 */
@Service
@Slf4j
public class WorkflowEventPublisher {

    private final KafkaTemplate<String, WorkflowEvent> workflowEventKafkaTemplate;
    private final KafkaTemplate<String, LocateEvent> locateEventKafkaTemplate;
    private final KafkaTemplate<String, InventoryEvent> inventoryEventKafkaTemplate;
    
    private final String workflowEventsTopic;
    private final String locateEventsTopic;
    private final String inventoryEventsTopic;
    
    /**
     * Constructor with dependency injection for Kafka templates and topic names
     *
     * @param workflowEventKafkaTemplate Template for sending workflow events
     * @param locateEventKafkaTemplate Template for sending locate events
     * @param inventoryEventKafkaTemplate Template for sending inventory events
     * @param workflowEventsTopic Topic name for workflow events
     * @param locateEventsTopic Topic name for locate events
     * @param inventoryEventsTopic Topic name for inventory events
     */
    @Autowired
    public WorkflowEventPublisher(
            KafkaTemplate<String, WorkflowEvent> workflowEventKafkaTemplate,
            KafkaTemplate<String, LocateEvent> locateEventKafkaTemplate,
            KafkaTemplate<String, InventoryEvent> inventoryEventKafkaTemplate,
            @Value("${kafka.topic.workflow.events}") String workflowEventsTopic,
            @Value("${kafka.topic.locate.events}") String locateEventsTopic,
            @Value("${kafka.topic.inventory.events}") String inventoryEventsTopic) {
        this.workflowEventKafkaTemplate = workflowEventKafkaTemplate;
        this.locateEventKafkaTemplate = locateEventKafkaTemplate;
        this.inventoryEventKafkaTemplate = inventoryEventKafkaTemplate;
        this.workflowEventsTopic = workflowEventsTopic;
        this.locateEventsTopic = locateEventsTopic;
        this.inventoryEventsTopic = inventoryEventsTopic;
    }
    
    /**
     * Publishes a workflow event to the workflow events topic
     * 
     * @param event The workflow event to publish
     * @return A future that completes when the send operation is done
     */
    public CompletableFuture<SendResult<String, WorkflowEvent>> publishWorkflowEvent(WorkflowEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("Event cannot be null");
        }
        
        if (!event.isValid()) {
            throw new IllegalArgumentException("Invalid workflow event: " + event);
        }
        
        log.info("Publishing workflow event: type={}, workflowId={}, status={}", 
                event.getEventType(), event.getWorkflowId(), event.getStatus());
        
        try {
            String key = event.getRoutingKey();
            CompletableFuture<SendResult<String, WorkflowEvent>> future = 
                    workflowEventKafkaTemplate.send(workflowEventsTopic, key, event);
            
            handleSendResult(future, "workflow");
            return future;
        } catch (Exception e) {
            log.error("Error publishing workflow event: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to publish workflow event", e);
        }
    }
    
    /**
     * Publishes a locate event to the locate events topic
     * 
     * @param event The locate event to publish
     * @return A future that completes when the send operation is done
     */
    public CompletableFuture<SendResult<String, LocateEvent>> publishLocateEvent(LocateEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("Event cannot be null");
        }
        
        if (!event.isValid()) {
            throw new IllegalArgumentException("Invalid locate event: " + event);
        }
        
        log.info("Publishing locate event: type={}, locateId={}, status={}", 
                event.getEventType(), event.getLocateId(), event.getStatus());
        
        try {
            String key = event.getRoutingKey();
            CompletableFuture<SendResult<String, LocateEvent>> future = 
                    locateEventKafkaTemplate.send(locateEventsTopic, key, event);
            
            handleSendResult(future, "locate");
            return future;
        } catch (Exception e) {
            log.error("Error publishing locate event: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to publish locate event", e);
        }
    }
    
    /**
     * Publishes an inventory event to the inventory events topic
     * 
     * @param event The inventory event to publish
     * @return A future that completes when the send operation is done
     */
    public CompletableFuture<SendResult<String, InventoryEvent>> publishInventoryEvent(InventoryEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("Event cannot be null");
        }
        
        if (!event.isValid()) {
            throw new IllegalArgumentException("Invalid inventory event: " + event);
        }
        
        log.info("Publishing inventory event: type={}, securityId={}, calculationType={}", 
                event.getEventType(), event.getSecurityIdentifier(), event.getCalculationType());
        
        try {
            String key = event.getRoutingKey();
            CompletableFuture<SendResult<String, InventoryEvent>> future = 
                    inventoryEventKafkaTemplate.send(inventoryEventsTopic, key, event);
            
            handleSendResult(future, "inventory");
            return future;
        } catch (Exception e) {
            log.error("Error publishing inventory event: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to publish inventory event", e);
        }
    }
    
    /**
     * Publishes a locate request event based on a LocateRequest entity
     * 
     * @param locateRequest The locate request entity
     * @return A future that completes when the send operation is done
     */
    public CompletableFuture<SendResult<String, LocateEvent>> publishLocateRequestEvent(LocateRequest locateRequest) {
        if (locateRequest == null) {
            throw new IllegalArgumentException("Locate request cannot be null");
        }
        
        LocateEvent event = locateRequest.toLocateEvent();
        return publishLocateEvent(event);
    }
    
    /**
     * Publishes a locate approval event and related inventory update
     * 
     * @param approvalEvent The locate approval event
     * @return A future that completes when the send operation is done
     */
    public CompletableFuture<SendResult<String, LocateEvent>> publishLocateApprovalEvent(LocateEvent approvalEvent) {
        if (approvalEvent == null || !approvalEvent.isLocateApproval()) {
            throw new IllegalArgumentException("Invalid locate approval event");
        }
        
        // First publish the locate approval event
        CompletableFuture<SendResult<String, LocateEvent>> locateFuture = publishLocateEvent(approvalEvent);
        
        // If the approval has a decrement quantity, publish an inventory update
        if (approvalEvent.getDecrementQuantity() != null && 
                approvalEvent.getDecrementQuantity().compareTo(java.math.BigDecimal.ZERO) > 0) {
            
            // Convert locate event to inventory event for updating availability
            InventoryEvent inventoryEvent = approvalEvent.toInventoryEvent();
            publishInventoryEvent(inventoryEvent);
        }
        
        return locateFuture;
    }
    
    /**
     * Converts and publishes a workflow event as a locate event
     * 
     * @param workflowEvent The workflow event
     * @return A future that completes when the send operation is done
     */
    public CompletableFuture<SendResult<String, LocateEvent>> publishWorkflowToLocateEvent(WorkflowEvent workflowEvent) {
        if (workflowEvent == null || !workflowEvent.isLocateWorkflow()) {
            throw new IllegalArgumentException("Invalid locate workflow event");
        }
        
        LocateEvent locateEvent = workflowEvent.toLocateEvent();
        return publishLocateEvent(locateEvent);
    }
    
    /**
     * Generic method to handle the result of a Kafka send operation
     * 
     * @param future The CompletableFuture returned from the Kafka send operation
     * @param eventType The type of event being sent
     */
    private void handleSendResult(CompletableFuture<SendResult<String, ?>> future, String eventType) {
        future.whenComplete((result, ex) -> {
            if (ex == null) {
                log.debug("Successfully sent {} event to topic={}, partition={}, offset={}", 
                        eventType, result.getRecordMetadata().topic(),
                        result.getRecordMetadata().partition(), 
                        result.getRecordMetadata().offset());
            } else {
                log.error("Failed to send {} event: {}", eventType, ex.getMessage(), ex);
            }
        });
    }
}