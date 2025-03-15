package com.ims.websocket.listener;

import com.ims.common.event.PositionEvent;
import com.ims.websocket.handler.PositionWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

/**
 * Kafka listener for position events in the Inventory Management System.
 * This class consumes position events from Kafka and forwards them to the WebSocket handler
 * for real-time distribution to connected clients. It supports different types of position
 * events including position updates and settlement ladder updates.
 * 
 * This component addresses the following requirements:
 * - Position Visualization (F-401)
 * - Real-time Position Updates (F-201)
 * - Event-Driven Architecture
 * - High-Throughput Message Processing (F-501)
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class PositionEventListener {

    private final PositionWebSocketHandler positionWebSocketHandler;

    /**
     * Consumes position events from Kafka and forwards them to the WebSocket handler.
     * Validates incoming events and logs appropriate information based on event type.
     *
     * @param event The position event from Kafka
     * @param key The Kafka message key
     * @param partition The Kafka partition
     * @param offset The Kafka offset
     */
    @KafkaListener(topics = "${kafka.position-topic}", containerFactory = "positionEventKafkaListenerContainerFactory")
    public void consumePositionEvent(
            @Payload PositionEvent event,
            @Header(KafkaHeaders.RECEIVED_KEY) String key,
            @Header(KafkaHeaders.RECEIVED_PARTITION) Integer partition,
            @Header(KafkaHeaders.OFFSET) Long offset) {
        
        log.info("Received position event with key: {}, partition: {}, offset: {}", key, partition, offset);
        
        // Validate the event
        if (!event.validate()) {
            log.warn("Invalid position event received: {}", event);
            return;
        }
        
        // Determine event type and log appropriate information
        String eventTypeDescription;
        if (event.isPositionUpdate()) {
            eventTypeDescription = "position update";
            log.info("Processing position update event for security: {}, book: {}, business date: {}", 
                    event.getSecurityId(), event.getBookId(), event.getBusinessDate());
        } else if (event.isSettlementLadderUpdate()) {
            eventTypeDescription = "settlement ladder update";
            log.info("Processing settlement ladder update event for security: {}, book: {}, business date: {}", 
                    event.getSecurityId(), event.getBookId(), event.getBusinessDate());
        } else {
            eventTypeDescription = "position event";
            log.info("Processing position event of type: {} for security: {}, book: {}", 
                    event.getEventType(), event.getSecurityId(), event.getBookId());
        }
        
        // Forward to WebSocket handler
        try {
            positionWebSocketHandler.handlePositionEvent(event);
            log.debug("Successfully forwarded {} event to WebSocket handler for security: {}, book: {}", 
                    eventTypeDescription, event.getSecurityId(), event.getBookId());
        } catch (Exception e) {
            log.error("Error forwarding {} event to WebSocket handler for security: {}, book: {}: {}", 
                    eventTypeDescription, event.getSecurityId(), event.getBookId(), e.getMessage(), e);
        }
    }
}