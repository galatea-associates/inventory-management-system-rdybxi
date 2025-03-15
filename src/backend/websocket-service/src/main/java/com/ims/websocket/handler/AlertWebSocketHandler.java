package com.ims.websocket.handler;

import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Objects;

import com.ims.websocket.model.WebSocketMessage;
import com.ims.common.event.BaseEvent;

/**
 * WebSocket handler for system alerts in the Inventory Management System.
 * This handler manages WebSocket sessions for clients interested in real-time alerts,
 * processes alert events from Kafka, and broadcasts notifications to connected
 * clients based on their subscription preferences and alert severity levels.
 */
@Component
@Slf4j
public class AlertWebSocketHandler extends TextWebSocketHandler {
    
    // Map to store active WebSocket sessions
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    
    // Map to store alert subscriptions for each session
    private final Map<String, List<String>> subscriptions = new ConcurrentHashMap<>();
    
    // Map to store severity preferences for each session
    private final Map<String, String> severityPreferences = new ConcurrentHashMap<>();
    
    // ObjectMapper for JSON serialization/deserialization
    private final ObjectMapper objectMapper;

    /**
     * Constructor that initializes the WebSocket handler with required dependencies
     * 
     * @param objectMapper Jackson ObjectMapper for JSON processing
     */
    public AlertWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        log.info("AlertWebSocketHandler initialized");
    }

    /**
     * Handles new WebSocket connections from clients
     * 
     * @param session The new WebSocket session
     * @throws Exception if an error occurs during connection establishment
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        log.info("WebSocket connection established: {}", sessionId);
        
        // Store session
        sessions.put(sessionId, session);
        
        // Initialize empty subscription list
        subscriptions.put(sessionId, new ArrayList<>());
        
        // Set default severity preference to MEDIUM
        severityPreferences.put(sessionId, "MEDIUM");
        
        // Send connection acknowledgment message to client
        sendMessage(session, WebSocketMessage.createAcknowledgementMessage(sessionId));
    }

    /**
     * Handles WebSocket connection closures
     * 
     * @param session The closed WebSocket session
     * @param status The close status
     * @throws Exception if an error occurs during connection closure
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        String sessionId = session.getId();
        log.info("WebSocket connection closed: {} - {}", sessionId, status);
        
        // Remove session from maps
        sessions.remove(sessionId);
        subscriptions.remove(sessionId);
        severityPreferences.remove(sessionId);
        
        log.info("Current session count: {}", sessions.size());
    }

    /**
     * Processes incoming WebSocket messages from clients
     * 
     * @param session The WebSocket session
     * @param message The received text message
     * @throws Exception if an error occurs during message processing
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String sessionId = session.getId();
        log.debug("Received message from {}: {}", sessionId, message.getPayload());
        
        try {
            // Parse the message
            WebSocketMessage webSocketMessage = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);
            
            // Handle different message types
            if ("SUBSCRIBE_ALERT".equals(webSocketMessage.getMessageType())) {
                handleAlertSubscription(session, webSocketMessage);
            } else if ("UNSUBSCRIBE_ALERT".equals(webSocketMessage.getMessageType())) {
                handleAlertUnsubscription(session, webSocketMessage);
            } else if ("SET_ALERT_SEVERITY".equals(webSocketMessage.getMessageType())) {
                handleSeverityPreference(session, webSocketMessage);
            } else if ("PING".equals(webSocketMessage.getMessageType())) {
                sendMessage(session, WebSocketMessage.createPongMessage());
            } else {
                log.warn("Unsupported message type: {}", webSocketMessage.getMessageType());
            }
        } catch (Exception e) {
            log.error("Error processing message: {}", e.getMessage(), e);
            sendMessage(session, WebSocketMessage.createErrorMessage("MESSAGE_PROCESSING_ERROR", 
                    "Failed to process message: " + e.getMessage()));
        }
    }

    /**
     * Handles client subscription requests for alert notifications
     * 
     * @param session The WebSocket session
     * @param message The subscription message
     * @throws IOException if an error occurs during message sending
     */
    private void handleAlertSubscription(WebSocketSession session, WebSocketMessage message) throws IOException {
        String sessionId = session.getId();
        
        // Extract subscription criteria from message payload
        Map<String, Object> payload = message.getPayload();
        String category = payload.get("category") != null ? payload.get("category").toString() : null;
        String source = payload.get("source") != null ? payload.get("source").toString() : null;
        
        // Create subscription key based on criteria
        String subscriptionKey = createSubscriptionKey(category, source);
        
        // Add subscription key to session's subscriptions list
        List<String> sessionSubscriptions = subscriptions.get(sessionId);
        if (!sessionSubscriptions.contains(subscriptionKey)) {
            sessionSubscriptions.add(subscriptionKey);
            log.info("Added alert subscription for session {}: {}", sessionId, subscriptionKey);
        }
        
        // Create a Map with subscription details
        Map<String, Object> details = new HashMap<>();
        details.put("category", category);
        details.put("source", source);
        details.put("subscriptionKey", subscriptionKey);
        
        // Send subscription confirmation message to client
        sendMessage(session, WebSocketMessage.createSubscriptionConfirmationMessage("ALERT", details));
    }

    /**
     * Handles client unsubscription requests for alert notifications
     * 
     * @param session The WebSocket session
     * @param message The unsubscription message
     * @throws IOException if an error occurs during message sending
     */
    private void handleAlertUnsubscription(WebSocketSession session, WebSocketMessage message) throws IOException {
        String sessionId = session.getId();
        
        // Extract unsubscription criteria from message payload
        Map<String, Object> payload = message.getPayload();
        String category = payload.get("category") != null ? payload.get("category").toString() : null;
        String source = payload.get("source") != null ? payload.get("source").toString() : null;
        
        // Create subscription key based on criteria
        String subscriptionKey = createSubscriptionKey(category, source);
        
        // Remove subscription key from session's subscriptions list
        List<String> sessionSubscriptions = subscriptions.get(sessionId);
        if (sessionSubscriptions != null && sessionSubscriptions.contains(subscriptionKey)) {
            sessionSubscriptions.remove(subscriptionKey);
            log.info("Removed alert subscription for session {}: {}", sessionId, subscriptionKey);
        }
        
        // Create a Map with unsubscription details
        Map<String, Object> details = new HashMap<>();
        details.put("category", category);
        details.put("source", source);
        details.put("subscriptionKey", subscriptionKey);
        
        // Send unsubscription confirmation message to client
        sendMessage(session, WebSocketMessage.createSubscriptionConfirmationMessage("ALERT_UNSUBSCRIBE", details));
    }

    /**
     * Handles client requests to update alert severity preferences
     * 
     * @param session The WebSocket session
     * @param message The severity preference message
     * @throws IOException if an error occurs during message sending
     */
    private void handleSeverityPreference(WebSocketSession session, WebSocketMessage message) throws IOException {
        String sessionId = session.getId();
        
        // Extract severity preference from message payload
        Map<String, Object> payload = message.getPayload();
        String severity = payload.get("severity") != null ? payload.get("severity").toString() : "MEDIUM";
        
        // Validate severity level (CRITICAL, HIGH, MEDIUM, LOW)
        if (!severity.equals("CRITICAL") && !severity.equals("HIGH") && 
            !severity.equals("MEDIUM") && !severity.equals("LOW")) {
            log.warn("Invalid severity level: {}, defaulting to MEDIUM", severity);
            severity = "MEDIUM";
        }
        
        // Update severity preference for the session
        severityPreferences.put(sessionId, severity);
        log.info("Updated severity preference for session {}: {}", sessionId, severity);
        
        // Create a Map with updated preference details
        Map<String, Object> details = new HashMap<>();
        details.put("severity", severity);
        
        // Send preference update confirmation message to client
        sendMessage(session, WebSocketMessage.createSubscriptionConfirmationMessage("ALERT_SEVERITY", details));
    }

    /**
     * Processes alert events from Kafka and broadcasts to subscribed clients
     * 
     * @param event The alert event to process
     */
    public void handleAlertEvent(BaseEvent event) {
        log.debug("Handling alert event: {}", event);
        
        // If event is null or invalid, log warning and return
        if (event == null || !event.validate()) {
            log.warn("Invalid alert event received");
            return;
        }
        
        try {
            // Extract alert metadata from event payload
            Map<String, Object> payload = extractAlertPayload(event);
            
            String severity = Objects.toString(payload.get("severity"), "MEDIUM");
            String category = Objects.toString(payload.get("category"), "SYSTEM");
            String source = event.getSource();
            String message = Objects.toString(payload.get("message"), "System alert");
            
            // Create WebSocketMessage from the alert event with type 'ALERT'
            WebSocketMessage alertMessage = WebSocketMessage.fromEvent(event, "ALERT");
            
            // Add alert-specific fields to the payload if not present
            Map<String, Object> messagePayload = alertMessage.getPayload();
            if (!messagePayload.containsKey("severity")) messagePayload.put("severity", severity);
            if (!messagePayload.containsKey("category")) messagePayload.put("category", category);
            if (!messagePayload.containsKey("message")) messagePayload.put("message", message);
            
            // Create subscription keys for the alert event
            List<String> alertKeys = createSubscriptionKeys(category, source);
            
            int sentCount = 0;
            
            // For critical alerts, broadcast to all clients regardless of subscription
            if ("CRITICAL".equals(severity)) {
                sentCount = broadcastAlertToAll(alertMessage);
            } else {
                // For each session, check if subscribed to any relevant key
                for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
                    String sessionId = entry.getKey();
                    WebSocketSession clientSession = entry.getValue();
                    
                    // For each subscribed session, check if alert severity meets session's preference
                    if (isSubscribed(sessionId, alertKeys)) {
                        if (meetsPreference(sessionId, severity)) {
                            sendMessage(clientSession, alertMessage);
                            sentCount++;
                        }
                    }
                }
            }
            
            log.info("Alert broadcast to {} clients", sentCount);
        } catch (Exception e) {
            log.error("Error broadcasting alert: {}", e.getMessage(), e);
        }
    }

    /**
     * Broadcasts a critical alert to all connected clients regardless of subscription
     * 
     * @param message The alert message to broadcast
     * @return Number of clients the message was sent to
     */
    public int broadcastAlertToAll(WebSocketMessage message) {
        log.info("Broadcasting critical alert to all connected clients");
        int count = 0;
        
        // For each session in sessions map:
        for (WebSocketSession session : sessions.values()) {
            try {
                sendMessage(session, message);
                count++;
            } catch (IOException e) {
                log.error("Failed to send critical alert to session {}: {}", session.getId(), e.getMessage());
            }
        }
        
        log.info("Critical alert sent to {} clients", count);
        return count;
    }

    /**
     * Creates a subscription key based on alert criteria
     * 
     * @param category Alert category
     * @param source Alert source
     * @return Subscription key for the alert
     */
    private String createSubscriptionKey(String category, String source) {
        StringBuilder key = new StringBuilder();
        
        // If category is provided, append 'category:{category}'
        if (category != null && !category.isEmpty()) {
            key.append("category:").append(category);
        }
        
        // If source is provided, append 'source:{source}'
        if (source != null && !source.isEmpty()) {
            if (key.length() > 0) key.append(":");
            key.append("source:").append(source);
        }
        
        // If no criteria provided, return 'all'
        if (key.length() == 0) {
            return "all";
        }
        
        return key.toString();
    }

    /**
     * Creates all possible subscription keys for an alert event
     * 
     * @param category Alert category
     * @param source Alert source
     * @return List of subscription keys for the alert event
     */
    private List<String> createSubscriptionKeys(String category, String source) {
        List<String> keys = new ArrayList<>();
        
        // Add 'all' key (subscribers to all alerts)
        keys.add("all");
        
        // Add category-specific key (category:{category})
        if (category != null && !category.isEmpty()) {
            keys.add("category:" + category);
        }
        
        // Add source-specific key (source:{source})
        if (source != null && !source.isEmpty()) {
            keys.add("source:" + source);
        }
        
        // Add category+source key (category:{category}:source:{source})
        if (category != null && !category.isEmpty() && source != null && !source.isEmpty()) {
            keys.add("category:" + category + ":source:" + source);
        }
        
        return keys;
    }

    /**
     * Checks if a session is subscribed to a specific alert
     * 
     * @param sessionId The session ID
     * @param subscriptionKeys List of subscription keys to check
     * @return True if the session is subscribed, false otherwise
     */
    private boolean isSubscribed(String sessionId, List<String> subscriptionKeys) {
        // Get the session's subscriptions list
        List<String> sessionSubs = subscriptions.get(sessionId);
        
        // If the session has no subscriptions, return false
        if (sessionSubs == null || sessionSubs.isEmpty()) {
            return false;
        }
        
        // If the session is subscribed to 'all', return true
        if (sessionSubs.contains("all")) {
            return true;
        }
        
        // For each subscription key, check if the session is subscribed
        for (String key : subscriptionKeys) {
            if (sessionSubs.contains(key)) {
                return true;
            }
        }
        
        // If not subscribed to any key, return false
        return false;
    }

    /**
     * Checks if an alert severity meets a session's preference
     * 
     * @param sessionId The session ID
     * @param alertSeverity The alert severity level
     * @return True if the alert meets the preference, false otherwise
     */
    private boolean meetsPreference(String sessionId, String alertSeverity) {
        // Get the session's severity preference
        String preference = severityPreferences.get(sessionId);
        
        // If preference is null, use default 'MEDIUM'
        if (preference == null) {
            preference = "MEDIUM";
        }
        
        // If alertSeverity is 'CRITICAL', return true (always show critical alerts)
        if ("CRITICAL".equals(alertSeverity)) {
            return true;
        }
        
        // Compare alertSeverity with preference based on priority order
        int alertPriority = getSeverityPriority(alertSeverity);
        int preferencePriority = getSeverityPriority(preference);
        
        return alertPriority >= preferencePriority;
    }

    /**
     * Gets the numeric priority of a severity level
     * 
     * @param severity The severity level
     * @return Priority value (higher number = higher priority)
     */
    private int getSeverityPriority(String severity) {
        switch (severity) {
            case "CRITICAL": return 4;
            case "HIGH": return 3;
            case "MEDIUM": return 2;
            case "LOW": return 1;
            default: return 0;
        }
    }

    /**
     * Sends a WebSocket message to a specific client session
     * 
     * @param session The WebSocket session
     * @param message The message to send
     * @throws IOException if an error occurs during message sending
     */
    private void sendMessage(WebSocketSession session, WebSocketMessage message) throws IOException {
        if (session == null || message == null) {
            return;
        }
        
        // Convert WebSocketMessage to JSON string using objectMapper
        String payload = objectMapper.writeValueAsString(message);
        TextMessage textMessage = new TextMessage(payload);
        
        try {
            // If session is open, send the message
            if (session.isOpen()) {
                session.sendMessage(textMessage);
            } else {
                // If session is not open, log warning and remove session
                log.warn("Attempted to send message to closed session: {}", session.getId());
                sessions.remove(session.getId());
                subscriptions.remove(session.getId());
                severityPreferences.remove(session.getId());
            }
        } catch (IOException e) {
            // If IOException occurs, log error and remove session
            log.error("Failed to send message to session {}: {}", session.getId(), e.getMessage());
            sessions.remove(session.getId());
            subscriptions.remove(session.getId());
            severityPreferences.remove(session.getId());
            throw e;
        }
    }
    
    /**
     * Extracts alert information from an event
     * 
     * @param event The event to extract alert information from
     * @return Map containing alert metadata
     */
    private Map<String, Object> extractAlertPayload(BaseEvent event) {
        Map<String, Object> payload = new HashMap<>();
        
        // Try to extract data from eventType
        String eventType = event.getEventType();
        
        // Set severity based on event type naming conventions
        if (eventType.contains("CRITICAL")) payload.put("severity", "CRITICAL");
        else if (eventType.contains("HIGH")) payload.put("severity", "HIGH");
        else if (eventType.contains("MEDIUM")) payload.put("severity", "MEDIUM");
        else if (eventType.contains("LOW")) payload.put("severity", "LOW");
        else payload.put("severity", "MEDIUM");
        
        // Set category based on event type
        if (eventType.contains("DATA")) payload.put("category", "DATA");
        else if (eventType.contains("SECURITY")) payload.put("category", "SECURITY");
        else if (eventType.contains("PERFORMANCE")) payload.put("category", "PERFORMANCE");
        else if (eventType.contains("SYSTEM")) payload.put("category", "SYSTEM");
        else payload.put("category", "SYSTEM");
        
        // Set default message
        payload.put("message", "System alert: " + eventType);
        
        return payload;
    }
}