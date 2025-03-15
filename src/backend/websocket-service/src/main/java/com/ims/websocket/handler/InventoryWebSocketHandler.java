package com.ims.websocket.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ims.common.event.InventoryEvent;
import com.ims.websocket.model.WebSocketMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.ConcurrentHashMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * WebSocket handler for inventory data in the Inventory Management System.
 * This handler manages WebSocket sessions for clients interested in inventory updates,
 * processes inventory events from Kafka, and broadcasts inventory changes to connected
 * clients in real-time. It supports filtering by security, calculation type, and other
 * criteria to provide targeted inventory updates.
 */
@Component
@Slf4j
public class InventoryWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, List<String>> subscriptions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    /**
     * Initializes the WebSocket handler with required dependencies
     *
     * @param objectMapper JSON serialization/deserialization tool
     */
    public InventoryWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        log.info("InventoryWebSocketHandler initialized");
    }

    /**
     * Handles new WebSocket connections from clients
     *
     * @param session The newly established WebSocket session
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String sessionId = session.getId();
        log.info("WebSocket connection established: {}", sessionId);
        
        // Add session to active sessions map
        sessions.put(sessionId, session);
        // Initialize empty subscription list for this session
        subscriptions.put(sessionId, new ArrayList<>());
        
        // Send connection acknowledgement
        sendMessage(session, WebSocketMessage.createAcknowledgementMessage(sessionId));
    }

    /**
     * Handles WebSocket connection closures
     *
     * @param session The WebSocket session that is being closed
     * @param status The status indicating why the session was closed
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String sessionId = session.getId();
        log.info("WebSocket connection closed: {} with status: {}", sessionId, status);
        
        // Remove session from active sessions
        sessions.remove(sessionId);
        // Remove subscriptions for this session
        subscriptions.remove(sessionId);
        
        log.info("Current active sessions: {}", sessions.size());
    }

    /**
     * Processes incoming WebSocket messages from clients
     *
     * @param session The WebSocket session the message was received from
     * @param message The incoming message
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String sessionId = session.getId();
        log.info("Received message from {}: {}", sessionId, message.getPayload());
        
        try {
            // Parse the message payload as a WebSocketMessage object
            WebSocketMessage wsMessage = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);
            
            // Handle different message types
            if ("SUBSCRIBE_INVENTORY".equals(wsMessage.getMessageType())) {
                handleInventorySubscription(session, wsMessage);
            } else if ("UNSUBSCRIBE_INVENTORY".equals(wsMessage.getMessageType())) {
                handleInventoryUnsubscription(session, wsMessage);
            } else if ("PING".equals(wsMessage.getMessageType())) {
                // Respond to ping messages with a pong
                sendMessage(session, WebSocketMessage.createPongMessage());
            } else {
                log.warn("Unsupported message type: {}", wsMessage.getMessageType());
            }
        } catch (Exception e) {
            log.error("Error processing message: {}", e.getMessage(), e);
            try {
                sendMessage(session, WebSocketMessage.createErrorMessage("ERROR_PROCESSING", 
                        "Error processing message: " + e.getMessage()));
            } catch (Exception ex) {
                log.error("Error sending error message: {}", ex.getMessage(), ex);
            }
        }
    }

    /**
     * Handles client subscription requests for inventory updates
     *
     * @param session The WebSocket session of the client
     * @param message The subscription message from the client
     */
    private void handleInventorySubscription(WebSocketSession session, WebSocketMessage message) {
        String sessionId = session.getId();
        Map<String, Object> payload = message.getPayload();
        
        // Extract subscription criteria from the payload
        String securityId = payload != null ? (String) payload.get("securityId") : null;
        String calculationType = payload != null ? (String) payload.get("calculationType") : null;
        LocalDate businessDate = null;
        
        if (payload != null && payload.get("businessDate") != null) {
            if (payload.get("businessDate") instanceof String) {
                businessDate = LocalDate.parse((String) payload.get("businessDate"));
            }
        }
        
        // Create a subscription key based on the criteria
        String subscriptionKey = createSubscriptionKey(securityId, calculationType, businessDate);
        
        // Add the subscription to this session's subscriptions
        List<String> sessionSubscriptions = subscriptions.get(sessionId);
        if (sessionSubscriptions == null) {
            sessionSubscriptions = new ArrayList<>();
            subscriptions.put(sessionId, sessionSubscriptions);
        }
        
        if (!sessionSubscriptions.contains(subscriptionKey)) {
            sessionSubscriptions.add(subscriptionKey);
            log.info("Session {} subscribed to {}", sessionId, subscriptionKey);
        }
        
        // Create a response with subscription details
        Map<String, Object> subscriptionDetails = new HashMap<>();
        subscriptionDetails.put("securityId", securityId);
        subscriptionDetails.put("calculationType", calculationType);
        subscriptionDetails.put("businessDate", businessDate);
        subscriptionDetails.put("subscriptionKey", subscriptionKey);
        
        // Send subscription confirmation
        sendMessage(session, WebSocketMessage.createSubscriptionConfirmationMessage("INVENTORY", subscriptionDetails));
    }

    /**
     * Handles client unsubscription requests for inventory updates
     *
     * @param session The WebSocket session of the client
     * @param message The unsubscription message from the client
     */
    private void handleInventoryUnsubscription(WebSocketSession session, WebSocketMessage message) {
        String sessionId = session.getId();
        Map<String, Object> payload = message.getPayload();
        
        // Extract unsubscription criteria from the payload
        String securityId = payload != null ? (String) payload.get("securityId") : null;
        String calculationType = payload != null ? (String) payload.get("calculationType") : null;
        LocalDate businessDate = null;
        
        if (payload != null && payload.get("businessDate") != null) {
            if (payload.get("businessDate") instanceof String) {
                businessDate = LocalDate.parse((String) payload.get("businessDate"));
            }
        }
        
        // Create the subscription key
        String subscriptionKey = createSubscriptionKey(securityId, calculationType, businessDate);
        
        // Remove the subscription
        List<String> sessionSubscriptions = subscriptions.get(sessionId);
        if (sessionSubscriptions != null) {
            sessionSubscriptions.remove(subscriptionKey);
            log.info("Session {} unsubscribed from {}", sessionId, subscriptionKey);
        }
        
        // Create a response with unsubscription details
        Map<String, Object> unsubscriptionDetails = new HashMap<>();
        unsubscriptionDetails.put("securityId", securityId);
        unsubscriptionDetails.put("calculationType", calculationType);
        unsubscriptionDetails.put("businessDate", businessDate);
        unsubscriptionDetails.put("subscriptionKey", subscriptionKey);
        
        // Send unsubscription confirmation
        sendMessage(session, WebSocketMessage.createSubscriptionConfirmationMessage("INVENTORY_UNSUBSCRIBE", 
                unsubscriptionDetails));
    }

    /**
     * Processes inventory events from Kafka and broadcasts to subscribed clients
     *
     * @param event The inventory event to process and broadcast
     */
    public void handleInventoryEvent(InventoryEvent event) {
        log.info("Received inventory event: {}", event);
        
        if (event == null || !event.validate()) {
            log.warn("Invalid inventory event received");
            return;
        }
        
        // Determine the message type based on event type
        String messageType;
        if (event.isForLoanUpdate()) {
            messageType = "INVENTORY_FOR_LOAN";
        } else if (event.isForPledgeUpdate()) {
            messageType = "INVENTORY_FOR_PLEDGE";
        } else if (event.isShortSellUpdate()) {
            messageType = "INVENTORY_SHORT_SELL";
        } else if (event.isLocateUpdate()) {
            messageType = "INVENTORY_LOCATE";
        } else if (event.isOverborrow()) {
            messageType = "INVENTORY_OVERBORROW";
        } else {
            messageType = "INVENTORY_UPDATE";
        }
        
        // Create WebSocketMessage from the inventory event
        WebSocketMessage message = WebSocketMessage.fromInventoryEvent(event);
        
        // Create subscription keys for this event
        List<String> subscriptionKeys = createSubscriptionKeys(event);
        
        // Broadcast the message to all subscribed sessions
        int sentCount = broadcastInventoryUpdate(message, subscriptionKeys);
        
        log.info("Inventory update sent to {} clients", sentCount);
    }

    /**
     * Creates a subscription key based on inventory criteria
     *
     * @param securityId The security identifier
     * @param calculationType The calculation type
     * @param businessDate The business date
     * @return A subscription key for the inventory
     */
    private String createSubscriptionKey(String securityId, String calculationType, LocalDate businessDate) {
        StringBuilder sb = new StringBuilder();
        
        if (securityId != null && !securityId.isEmpty()) {
            sb.append("security:").append(securityId);
        }
        
        if (calculationType != null && !calculationType.isEmpty()) {
            if (sb.length() > 0) sb.append(":");
            sb.append("type:").append(calculationType);
        }
        
        if (businessDate != null) {
            if (sb.length() > 0) sb.append(":");
            sb.append("date:").append(businessDate);
        }
        
        // If no criteria specified, return "all" to indicate subscription to all updates
        if (sb.length() == 0) {
            return "all";
        }
        
        return sb.toString();
    }

    /**
     * Creates all possible subscription keys for an inventory event
     *
     * @param event The inventory event
     * @return List of subscription keys for the inventory event
     */
    private List<String> createSubscriptionKeys(InventoryEvent event) {
        List<String> keys = new ArrayList<>();
        
        // Add the "all" key for subscribers to all inventory updates
        keys.add("all");
        
        // Add security-specific key
        if (event.getSecurityIdentifier() != null && !event.getSecurityIdentifier().isEmpty()) {
            keys.add("security:" + event.getSecurityIdentifier());
        }
        
        // Add calculation type key
        if (event.getCalculationType() != null && !event.getCalculationType().isEmpty()) {
            keys.add("type:" + event.getCalculationType());
        }
        
        // Add business date key
        if (event.getBusinessDate() != null) {
            keys.add("date:" + event.getBusinessDate());
        }
        
        // Add combinations of criteria
        if (event.getSecurityIdentifier() != null && !event.getSecurityIdentifier().isEmpty() &&
            event.getCalculationType() != null && !event.getCalculationType().isEmpty()) {
            keys.add("security:" + event.getSecurityIdentifier() + ":type:" + event.getCalculationType());
        }
        
        if (event.getSecurityIdentifier() != null && !event.getSecurityIdentifier().isEmpty() &&
            event.getBusinessDate() != null) {
            keys.add("security:" + event.getSecurityIdentifier() + ":date:" + event.getBusinessDate());
        }
        
        if (event.getCalculationType() != null && !event.getCalculationType().isEmpty() &&
            event.getBusinessDate() != null) {
            keys.add("type:" + event.getCalculationType() + ":date:" + event.getBusinessDate());
        }
        
        if (event.getSecurityIdentifier() != null && !event.getSecurityIdentifier().isEmpty() &&
            event.getCalculationType() != null && !event.getCalculationType().isEmpty() &&
            event.getBusinessDate() != null) {
            keys.add("security:" + event.getSecurityIdentifier() + 
                    ":type:" + event.getCalculationType() + 
                    ":date:" + event.getBusinessDate());
        }
        
        return keys;
    }

    /**
     * Checks if a session is subscribed to a specific inventory update
     *
     * @param sessionId The session ID
     * @param subscriptionKeys The subscription keys to check against
     * @return True if the session is subscribed, false otherwise
     */
    private boolean isSubscribed(String sessionId, List<String> subscriptionKeys) {
        List<String> sessionSubscriptions = subscriptions.get(sessionId);
        
        if (sessionSubscriptions == null || sessionSubscriptions.isEmpty()) {
            return false;
        }
        
        // If subscribed to "all", match all events
        if (sessionSubscriptions.contains("all")) {
            return true;
        }
        
        // Check if any of the event's subscription keys match this session's subscriptions
        for (String key : subscriptionKeys) {
            if (sessionSubscriptions.contains(key)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Sends a WebSocket message to a specific client session
     *
     * @param session The WebSocket session to send to
     * @param message The message to send
     */
    private void sendMessage(WebSocketSession session, WebSocketMessage message) {
        try {
            String payload = objectMapper.writeValueAsString(message);
            TextMessage textMessage = new TextMessage(payload);
            
            if (session.isOpen()) {
                session.sendMessage(textMessage);
            } else {
                log.warn("Cannot send message to closed session: {}", session.getId());
                sessions.remove(session.getId());
                subscriptions.remove(session.getId());
            }
        } catch (IOException e) {
            log.error("Error sending message to session {}: {}", session.getId(), e.getMessage(), e);
            sessions.remove(session.getId());
            subscriptions.remove(session.getId());
        }
    }

    /**
     * Broadcasts an inventory update to all subscribed sessions
     *
     * @param message The WebSocket message to broadcast
     * @param subscriptionKeys The subscription keys to match against
     * @return Number of clients the message was sent to
     */
    private int broadcastInventoryUpdate(WebSocketMessage message, List<String> subscriptionKeys) {
        int clientCount = 0;
        
        for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
            String sessionId = entry.getKey();
            WebSocketSession session = entry.getValue();
            
            if (isSubscribed(sessionId, subscriptionKeys)) {
                sendMessage(session, message);
                clientCount++;
            }
        }
        
        return clientCount;
    }
}