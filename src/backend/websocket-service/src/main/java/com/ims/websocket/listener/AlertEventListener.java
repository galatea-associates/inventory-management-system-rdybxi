package com.ims.websocket.listener;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.HashMap;

import com.ims.common.event.BaseEvent;
import com.ims.websocket.handler.AlertWebSocketHandler;
import com.ims.websocket.model.WebSocketMessage;

/**
 * Kafka listener for system alerts in the Inventory Management System.
 * This class consumes alert events from Kafka and forwards them to connected WebSocket clients
 * through the AlertWebSocketHandler. It supports various alert types including system alerts,
 * data validation alerts, and business rule violations.
 */
@Component
@Slf4j
public class AlertEventListener {

    private final AlertWebSocketHandler alertWebSocketHandler;
    private final ObjectMapper objectMapper;

    /**
     * Initializes the alert event listener with required dependencies
     * 
     * @param alertWebSocketHandler Handler for WebSocket alerts
     * @param objectMapper JSON object mapper for serialization/deserialization
     */
    public AlertEventListener(AlertWebSocketHandler alertWebSocketHandler, ObjectMapper objectMapper) {
        this.alertWebSocketHandler = alertWebSocketHandler;
        this.objectMapper = objectMapper;
        log.info("AlertEventListener initialized");
    }

    /**
     * Consumes alert events from the alert Kafka topic and forwards them to WebSocket clients
     * 
     * @param event The alert event payload
     * @param key The message key
     * @param partition The Kafka partition
     * @param offset The message offset
     */
    @KafkaListener(topics = "${kafka.alert-topic}", containerFactory = "baseEventKafkaListenerContainerFactory")
    public void consumeAlertEvents(
            @Payload BaseEvent event,
            @Header(KafkaHeaders.RECEIVED_MESSAGE_KEY) String key,
            @Header(KafkaHeaders.RECEIVED_PARTITION) Integer partition,
            @Header(KafkaHeaders.OFFSET) Long offset) {
        
        log.info("Received alert event with key: {}, partition: {}, offset: {}", key, partition, offset);
        
        // If event is null or invalid, log warning and return
        if (event == null || !event.validate()) {
            log.warn("Invalid alert event received");
            return;
        }
        
        try {
            // Extract alert metadata from event
            Map<String, Object> alertMetadata = extractAlertMetadata(event);
            
            // Critical alerts are broadcast to all connected clients
            if (isCriticalAlert(alertMetadata)) {
                WebSocketMessage alertMessage = createAlertMessage(event, alertMetadata);
                alertWebSocketHandler.broadcastAlertToAll(alertMessage);
                log.info("Critical alert broadcast to all connected clients");
            } else {
                // All other alerts are processed by the handler which routes based on subscriptions
                alertWebSocketHandler.handleAlertEvent(event);
                log.info("Alert event forwarded to handler for targeted distribution");
            }
            
            log.debug("Alert event processed successfully: {}", event.getEventType());
        } catch (Exception e) {
            log.error("Error processing alert event: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Extracts alert metadata from the event payload
     * 
     * @param event The alert event
     * @return Map containing alert metadata
     */
    private Map<String, Object> extractAlertMetadata(BaseEvent event) {
        Map<String, Object> metadata = new HashMap<>();
        
        try {
            // Try to cast event.getPayload() to Map<String, Object>
            Map<String, Object> payload = new HashMap<>();
            
            // Extract severity or use default based on event type
            String severity = "MEDIUM";
            if (event.getEventType().contains("CRITICAL")) {
                severity = "CRITICAL";
            } else if (event.getEventType().contains("HIGH")) {
                severity = "HIGH";
            } else if (event.getEventType().contains("LOW")) {
                severity = "LOW";
            }
            metadata.put("severity", severity);
            
            // Extract category or use default based on event type
            String category = "SYSTEM";
            if (event.getEventType().contains("DATA")) {
                category = "DATA";
            } else if (event.getEventType().contains("SECURITY")) {
                category = "SECURITY";
            } else if (event.getEventType().contains("PERFORMANCE")) {
                category = "PERFORMANCE";
            }
            metadata.put("category", category);
            
            // Extract message or use default
            String message = event.getEventType();
            metadata.put("message", message);
            
            // Extract source or use default
            String source = event.getSource();
            metadata.put("source", source);
            
        } catch (Exception e) {
            // If payload extraction fails, set default values
            metadata.put("severity", "MEDIUM");
            metadata.put("category", "SYSTEM");
            metadata.put("message", event.getEventType());
            metadata.put("source", event.getSource());
            log.warn("Could not extract alert metadata from event, using defaults: {}", e.getMessage());
        }
        
        return metadata;
    }
    
    /**
     * Determines if an alert is critical based on its severity
     * 
     * @param alertMetadata The alert metadata
     * @return True if the alert is critical, false otherwise
     */
    private boolean isCriticalAlert(Map<String, Object> alertMetadata) {
        String severity = (String) alertMetadata.get("severity");
        return "CRITICAL".equals(severity);
    }
    
    /**
     * Creates a WebSocket message for an alert event
     * 
     * @param event The alert event
     * @param alertMetadata The alert metadata
     * @return A WebSocket message containing the alert data
     */
    private WebSocketMessage createAlertMessage(BaseEvent event, Map<String, Object> alertMetadata) {
        WebSocketMessage message = WebSocketMessage.fromEvent(event, "ALERT");
        
        // Add all entries from alertMetadata to the message payload
        message.getPayload().putAll(alertMetadata);
        
        return message;
    }
}