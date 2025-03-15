package com.ims.websocket.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ims.common.event.LocateEvent;
import com.ims.websocket.model.WebSocketMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket handler for locate-related events in the Inventory Management System.
 * This handler manages WebSocket sessions for clients interested in locate data,
 * processes locate events from Kafka, and broadcasts locate updates to connected
 * clients in real-time. It supports filtering locate events by security, client, 
 * and status to provide targeted updates to UI clients.
 * 
 * This component supports:
 * - Real-time updates for locate requests and approvals (F-403)
 * - WebSocket communication for UI clients (Technical Specifications/6.3.1)
 * - Integration with the Locate Approval Workflow (F-301)
 * - Event-driven architecture principles (Technical Specifications/6.3.2)
 */
@Component
@Slf4j
public class LocateWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, List<LocateSubscription>> subscriptions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    /**
     * Constructs a LocateWebSocketHandler with the required dependencies.
     * 
     * @param objectMapper JSON mapper for serializing/deserializing messages
     */
    public LocateWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Handles new WebSocket connections from clients.
     * 
     * @param session The WebSocket session for the new connection
     * @throws Exception If an error occurs during connection establishment
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        log.info("WebSocket connection established for locate events: {}", sessionId);
        
        // Store the session
        sessions.put(sessionId, session);
        
        // Initialize an empty subscription list for this session
        subscriptions.put(sessionId, new ArrayList<>());
        
        // Send acknowledgment message to client
        sendMessage(session, WebSocketMessage.createAcknowledgementMessage(sessionId));
    }

    /**
     * Handles WebSocket disconnections.
     * 
     * @param session The WebSocket session that is closing
     * @param status The close status
     * @throws Exception If an error occurs during disconnect handling
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = session.getId();
        log.info("WebSocket connection closed for locate events: {} with status: {}", sessionId, status);
        
        // Remove session and subscriptions
        sessions.remove(sessionId);
        subscriptions.remove(sessionId);
    }

    /**
     * Processes incoming WebSocket messages from clients.
     * 
     * @param session The client's WebSocket session
     * @param message The message received from the client
     * @throws Exception If an error occurs during message handling
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.debug("Received WebSocket message from client {}: {}", session.getId(), payload);
        
        try {
            // Parse the message
            WebSocketMessage webSocketMessage = objectMapper.readValue(payload, WebSocketMessage.class);
            
            // Handle different message types
            if (webSocketMessage.isSubscribeMessage() && "LOCATE".equals(webSocketMessage.getSubscriptionType())) {
                handleLocateSubscription(session, webSocketMessage);
            } else if (webSocketMessage.isUnsubscribeMessage() && "LOCATE".equals(webSocketMessage.getUnsubscriptionType())) {
                handleLocateUnsubscription(session, webSocketMessage);
            } else if (webSocketMessage.isPingMessage()) {
                // Respond to ping messages with a pong
                sendMessage(session, WebSocketMessage.createPongMessage());
            } else {
                log.warn("Received unsupported message type: {}", webSocketMessage.getMessageType());
            }
        } catch (Exception e) {
            log.error("Error processing WebSocket message: {}", e.getMessage(), e);
            sendMessage(session, WebSocketMessage.createErrorMessage("PROCESSING_ERROR", "Error processing the message: " + e.getMessage()));
        }
    }

    /**
     * Handles client subscription requests for locate updates.
     * 
     * @param session The client's WebSocket session
     * @param message The subscription message
     * @throws IOException If an error occurs while responding to the client
     */
    private void handleLocateSubscription(WebSocketSession session, WebSocketMessage message) throws IOException {
        String sessionId = session.getId();
        Map<String, Object> payload = message.getPayload();
        
        // Extract subscription criteria
        String securityId = payload != null ? (String) payload.get("securityId") : null;
        String clientId = payload != null ? (String) payload.get("clientId") : null;
        String status = payload != null ? (String) payload.get("status") : null;
        
        // Create subscription
        LocateSubscription subscription = new LocateSubscription(securityId, clientId, status);
        
        // Add subscription
        List<LocateSubscription> sessionSubscriptions = subscriptions.get(sessionId);
        if (sessionSubscriptions == null) {
            sessionSubscriptions = new ArrayList<>();
            subscriptions.put(sessionId, sessionSubscriptions);
        }
        sessionSubscriptions.add(subscription);
        
        log.info("Added locate subscription for session {}: {}", sessionId, subscription);
        
        // Confirm subscription to client
        Map<String, Object> subscriptionDetails = new HashMap<>();
        if (securityId != null) subscriptionDetails.put("securityId", securityId);
        if (clientId != null) subscriptionDetails.put("clientId", clientId);
        if (status != null) subscriptionDetails.put("status", status);
        if (subscription.allLocates) subscriptionDetails.put("allLocates", true);
        
        sendMessage(session, WebSocketMessage.createSubscriptionConfirmationMessage("LOCATE", subscriptionDetails));
    }

    /**
     * Handles client unsubscription requests for locate updates.
     * 
     * @param session The client's WebSocket session
     * @param message The unsubscription message
     * @throws IOException If an error occurs while responding to the client
     */
    private void handleLocateUnsubscription(WebSocketSession session, WebSocketMessage message) throws IOException {
        String sessionId = session.getId();
        Map<String, Object> payload = message.getPayload();
        
        // Extract unsubscription criteria
        String securityId = payload != null ? (String) payload.get("securityId") : null;
        String clientId = payload != null ? (String) payload.get("clientId") : null;
        String status = payload != null ? (String) payload.get("status") : null;
        
        // Create subscription to match against (for removal)
        LocateSubscription subscriptionToRemove = new LocateSubscription(securityId, clientId, status);
        
        // Remove matching subscriptions
        List<LocateSubscription> sessionSubscriptions = subscriptions.get(sessionId);
        if (sessionSubscriptions != null) {
            sessionSubscriptions.removeIf(sub -> sub.equals(subscriptionToRemove));
            log.info("Removed locate subscription for session {}: {}", sessionId, subscriptionToRemove);
        }
        
        // Confirm unsubscription to client
        Map<String, Object> unsubscriptionDetails = new HashMap<>();
        if (securityId != null) unsubscriptionDetails.put("securityId", securityId);
        if (clientId != null) unsubscriptionDetails.put("clientId", clientId);
        if (status != null) unsubscriptionDetails.put("status", status);
        
        sendMessage(session, WebSocketMessage.createSubscriptionConfirmationMessage("UNSUBSCRIBE_LOCATE", unsubscriptionDetails));
    }

    /**
     * Processes locate events and broadcasts to subscribed clients.
     * This method is called by the Kafka event handler/consumer service when
     * a new locate event is received.
     * 
     * @param event The locate event to process
     */
    public void handleLocateEvent(LocateEvent event) {
        log.info("Received locate event: {}", event.getLocateId());
        
        // Validate event
        if (event == null || !event.isValid()) {
            log.warn("Received invalid locate event");
            return;
        }
        
        // Create message from event
        WebSocketMessage message = WebSocketMessage.fromLocateEvent(event);
        
        // Send to all subscribed sessions
        for (String sessionId : sessions.keySet()) {
            if (isSubscribed(sessionId, event)) {
                WebSocketSession session = sessions.get(sessionId);
                try {
                    sendMessage(session, message);
                } catch (Exception e) {
                    log.error("Error sending locate event to session {}: {}", sessionId, e.getMessage(), e);
                }
            }
        }
    }

    /**
     * Checks if a session is subscribed to a specific locate event.
     * 
     * @param sessionId The session ID to check
     * @param event The locate event to check against subscriptions
     * @return True if the session is subscribed to the event, false otherwise
     */
    private boolean isSubscribed(String sessionId, LocateEvent event) {
        List<LocateSubscription> sessionSubscriptions = subscriptions.get(sessionId);
        if (sessionSubscriptions == null || sessionSubscriptions.isEmpty()) {
            return false;
        }
        
        // Check if any subscription matches this event
        for (LocateSubscription subscription : sessionSubscriptions) {
            if (matchesSubscription(subscription, event)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Checks if a locate event matches a subscription's criteria.
     * 
     * @param subscription The subscription to check against
     * @param event The locate event to check
     * @return True if the event matches the subscription criteria, false otherwise
     */
    private boolean matchesSubscription(LocateSubscription subscription, LocateEvent event) {
        // If subscription is for all locates, always match
        if (subscription.allLocates) {
            return true;
        }
        
        // Check security ID match if specified
        if (subscription.securityId != null && !subscription.securityId.isEmpty() 
                && !subscription.securityId.equals(event.getSecurityId())) {
            return false;
        }
        
        // Check client ID match if specified
        if (subscription.clientId != null && !subscription.clientId.isEmpty() 
                && !subscription.clientId.equals(event.getClientId())) {
            return false;
        }
        
        // Check status match if specified
        if (subscription.status != null && !subscription.status.isEmpty() 
                && !subscription.status.equals(event.getStatus())) {
            return false;
        }
        
        // All specified criteria match
        return true;
    }

    /**
     * Sends a WebSocket message to a client session.
     * 
     * @param session The client's WebSocket session
     * @param message The message to send
     * @throws IOException If an error occurs while sending the message
     */
    private void sendMessage(WebSocketSession session, WebSocketMessage message) throws IOException {
        if (session == null || message == null) {
            return;
        }
        
        String json = objectMapper.writeValueAsString(message);
        TextMessage textMessage = new TextMessage(json);
        
        if (session.isOpen()) {
            try {
                session.sendMessage(textMessage);
            } catch (IOException e) {
                log.error("Failed to send message to session {}: {}", session.getId(), e.getMessage());
                sessions.remove(session.getId());
                subscriptions.remove(session.getId());
                throw e;
            }
        } else {
            log.warn("Attempted to send message to closed session: {}", session.getId());
            sessions.remove(session.getId());
            subscriptions.remove(session.getId());
        }
    }

    /**
     * Broadcasts a locate event to all connected sessions regardless of subscription.
     * This is useful for system-wide notifications or critical updates.
     * 
     * @param event The locate event to broadcast
     */
    public void broadcastLocateToAll(LocateEvent event) {
        log.info("Broadcasting locate event to all sessions: {}", event.getLocateId());
        
        WebSocketMessage message = WebSocketMessage.fromLocateEvent(event);
        
        for (WebSocketSession session : sessions.values()) {
            try {
                sendMessage(session, message);
            } catch (Exception e) {
                log.error("Error broadcasting locate event: {}", e.getMessage(), e);
            }
        }
    }

    /**
     * Inner class representing a client's subscription to locate events.
     * Subscriptions can be filtered by security ID, client ID, and status.
     */
    private static class LocateSubscription {
        private final String securityId;
        private final String clientId;
        private final String status;
        private final boolean allLocates;

        /**
         * Creates a new locate subscription with specified criteria.
         * If all criteria are null or empty, the subscription will match all locate events.
         * 
         * @param securityId The security ID to filter by, or null for all securities
         * @param clientId The client ID to filter by, or null for all clients
         * @param status The status to filter by, or null for all statuses
         */
        public LocateSubscription(String securityId, String clientId, String status) {
            this.securityId = securityId;
            this.clientId = clientId;
            this.status = status;
            this.allLocates = (securityId == null || securityId.isEmpty()) && 
                              (clientId == null || clientId.isEmpty()) && 
                              (status == null || status.isEmpty());
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            
            LocateSubscription that = (LocateSubscription) obj;
            
            if (allLocates != that.allLocates) return false;
            if (securityId != null ? !securityId.equals(that.securityId) : that.securityId != null) return false;
            if (clientId != null ? !clientId.equals(that.clientId) : that.clientId != null) return false;
            return status != null ? status.equals(that.status) : that.status == null;
        }

        @Override
        public int hashCode() {
            int result = securityId != null ? securityId.hashCode() : 0;
            result = 31 * result + (clientId != null ? clientId.hashCode() : 0);
            result = 31 * result + (status != null ? status.hashCode() : 0);
            result = 31 * result + (allLocates ? 1 : 0);
            return result;
        }

        @Override
        public String toString() {
            return "LocateSubscription{" +
                    "securityId='" + securityId + '\'' +
                    ", clientId='" + clientId + '\'' +
                    ", status='" + status + '\'' +
                    ", allLocates=" + allLocates +
                    '}';
        }
    }
}