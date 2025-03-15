package com.ims.common.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ims.common.util.CorrelationIdUtil;
import com.ims.common.util.DateUtil;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Base class for all events in the Inventory Management System. Provides common attributes
 * and functionality for event-driven communication between microservices.
 * 
 * This class supports:
 * - Event-driven architecture requirements with immutable events
 * - High-throughput message processing (300,000+ events per second)
 * - Message delivery guarantees with at-least-once semantics
 * - Distributed tracing with correlation IDs
 */
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@JsonIgnoreProperties(ignoreUnknown = true)
public class BaseEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * Unique identifier for this event instance
     */
    private String eventId;
    
    /**
     * Type of the event, used for routing and processing
     */
    private String eventType;
    
    /**
     * Timestamp when the event was created
     */
    private LocalDateTime timestamp;
    
    /**
     * Correlation ID for distributed tracing across services
     */
    private String correlationId;
    
    /**
     * Source system or service that generated the event
     */
    private String source;
    
    /**
     * Version of the event, useful for event sourcing and evolution
     */
    private Integer version;

    /**
     * Constructor that initializes a new event with the specified event type and source
     *
     * @param eventType The type of the event
     * @param source The source system or service that generated the event
     */
    public BaseEvent(String eventType, String source) {
        this.eventId = UUID.randomUUID().toString();
        this.eventType = eventType;
        this.timestamp = DateUtil.getCurrentDateTime();
        this.correlationId = CorrelationIdUtil.getOrCreateCorrelationId();
        this.source = source;
        this.version = 1;
    }

    /**
     * Validates the event data before processing
     *
     * @return True if the event is valid, false otherwise
     */
    protected boolean validate() {
        return eventId != null && !eventId.isEmpty() &&
               eventType != null && !eventType.isEmpty() &&
               timestamp != null &&
               source != null && !source.isEmpty();
    }

    /**
     * Public method to check if the event is valid
     *
     * @return True if the event is valid, false otherwise
     */
    public boolean isValid() {
        return validate();
    }

    /**
     * Copies the base properties from this event to another event.
     * Useful for creating chain of related events while maintaining context.
     *
     * @param target The target event to copy properties to
     */
    public void copyBaseProperties(BaseEvent target) {
        target.correlationId = this.correlationId;
        target.source = this.source;
        target.timestamp = DateUtil.getCurrentDateTime();
        target.version = this.version + 1;
    }
}