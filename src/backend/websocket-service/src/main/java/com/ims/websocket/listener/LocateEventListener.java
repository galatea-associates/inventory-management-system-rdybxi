package com.ims.websocket.listener;

import com.ims.common.event.LocateEvent;
import com.ims.websocket.handler.LocateWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

/**
 * Kafka listener for locate events in the Inventory Management System.
 * This class consumes locate events from Kafka and forwards them to the WebSocket handler
 * for real-time distribution to connected clients. It supports different types of locate
 * events including locate requests, approvals, rejections, cancellations, and expiries.
 * 
 * This component supports:
 * - Locate Management Interface (F-403) by providing real-time updates for locate requests and approvals
 * - Locate Approval Workflow (F-301) by processing locate request events
 * - Event-Driven Architecture through Kafka messaging
 * - High-Throughput Message Processing (F-501) for processing 300,000+ events per second
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class LocateEventListener {

    private final LocateWebSocketHandler locateWebSocketHandler;

    /**
     * Consumes locate events from Kafka and forwards them to the WebSocket handler.
     * 
     * @param event The locate event received from Kafka
     * @param key The message key
     * @param partition The partition from which the message was received
     * @param offset The offset in the partition
     */
    @KafkaListener(topics = "${kafka.locate-topic}", containerFactory = "locateEventKafkaListenerContainerFactory")
    public void consumeLocateEvent(
            @Payload LocateEvent event,
            @Header(KafkaHeaders.RECEIVED_KEY) String key,
            @Header(KafkaHeaders.RECEIVED_PARTITION) Integer partition,
            @Header(KafkaHeaders.RECEIVED_OFFSET) Long offset) {
        
        log.info("Received locate event with key: {}, partition: {}, offset: {}", 
                key, partition, offset);
        
        // Validate the event
        if (!event.isValid()) {
            log.warn("Received invalid locate event with ID: {}", event.getEventId());
            return;
        }
        
        // Determine event type and log appropriate message
        String eventType;
        if (event.isLocateRequest()) {
            eventType = "locate request";
            log.debug("Processing locate request for ID: {}", event.getLocateId());
        } else if (event.isLocateApproval()) {
            eventType = "locate approval";
            log.debug("Processing locate approval for ID: {}", event.getLocateId());
        } else if (event.isLocateRejection()) {
            eventType = "locate rejection";
            log.debug("Processing locate rejection for ID: {}", event.getLocateId());
        } else if (event.isLocateCancellation()) {
            eventType = "locate cancellation";
            log.debug("Processing locate cancellation for ID: {}", event.getLocateId());
        } else if (event.isLocateExpiry()) {
            eventType = "locate expiry";
            log.debug("Processing locate expiry for ID: {}", event.getLocateId());
        } else {
            eventType = "generic locate event";
            log.debug("Processing generic locate event for ID: {}", event.getLocateId());
        }
        
        try {
            // Forward to WebSocket handler
            locateWebSocketHandler.handleLocateEvent(event);
            
            log.info("Successfully processed {} for locate ID: {}", eventType, event.getLocateId());
        } catch (Exception e) {
            log.error("Error processing locate event: {}, error: {}", 
                    event.getLocateId(), e.getMessage(), e);
            // The exception is logged but not re-thrown to prevent message retry,
            // as retry might not help with WebSocket errors
        }
    }
}