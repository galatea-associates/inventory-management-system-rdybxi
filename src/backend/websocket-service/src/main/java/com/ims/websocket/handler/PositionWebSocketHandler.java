package com.ims.websocket.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ims.common.event.PositionEvent;
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
 * WebSocket handler for position data in the Inventory Management System.
 * This handler manages WebSocket sessions for clients interested in position updates,
 * processes position events from Kafka, and broadcasts position changes to connected clients in real-time.
 * It supports filtering by book, security, and other criteria to provide targeted position updates.
 */
@Component
@Slf4j
public class PositionWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, List<String>> subscriptions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    /**
     * Initializes the WebSocket handler with required dependencies
     *
     * @param objectMapper JSON serialization/deserialization component
     */
    public PositionWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        log.info("PositionWebSocketHandler initialized");
    }

    /**
     * Handles new WebSocket connections from clients
     *
     * @param session The new WebSocket session
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String sessionId = session.getId();
        log.info("WebSocket connection established: {}", sessionId);
        sessions.put(sessionId, session);
        subscriptions.put(sessionId, new ArrayList<>());
        
        // Send connection acknowledgment to the client
        WebSocketMessage acknowledgement = WebSocketMessage.createAcknowledgementMessage(sessionId);
        sendMessage(session, acknowledgement);
    }

    /**
     * Handles WebSocket connection closures
     *
     * @param session The WebSocket session being closed
     * @param status The close status
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String sessionId = session.getId();
        log.info("WebSocket connection closed: {} with status: {}", sessionId, status);
        
        // Remove the session and its subscriptions
        sessions.remove(sessionId);
        subscriptions.remove(sessionId);
        
        log.info("Current session count: {}", sessions.size());
    }

    /**
     * Processes incoming WebSocket messages from clients
     *
     * @param session The WebSocket session
     * @param message The incoming message
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String sessionId = session.getId();
        log.info("Received message from client {}: {}", sessionId, message.getPayload());
        
        try {
            WebSocketMessage webSocketMessage = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);
            
            if ("SUBSCRIBE_POSITION".equals(webSocketMessage.getMessageType())) {
                handlePositionSubscription(session, webSocketMessage);
            } else if ("UNSUBSCRIBE_POSITION".equals(webSocketMessage.getMessageType())) {
                handlePositionUnsubscription(session, webSocketMessage);
            } else if ("PING".equals(webSocketMessage.getMessageType())) {
                // Respond to client ping with a pong message
                sendMessage(session, WebSocketMessage.createPongMessage());
            } else {
                log.warn("Unsupported message type: {}", webSocketMessage.getMessageType());
            }
        } catch (IOException e) {
            log.error("Error parsing message from client {}: {}", sessionId, e.getMessage(), e);
            sendMessage(session, WebSocketMessage.createErrorMessage("MESSAGE_PARSING_ERROR", e.getMessage()));
        } catch (Exception e) {
            log.error("Error processing message from client {}: {}", sessionId, e.getMessage(), e);
            sendMessage(session, WebSocketMessage.createErrorMessage("MESSAGE_PROCESSING_ERROR", e.getMessage()));
        }
    }

    /**
     * Handles client subscription requests for position updates
     *
     * @param session The WebSocket session
     * @param message The subscription message
     */
    private void handlePositionSubscription(WebSocketSession session, WebSocketMessage message) {
        String sessionId = session.getId();
        Map<String, Object> payload = message.getPayload();
        
        // Extract subscription criteria from the message
        String bookId = payload.get("bookId") != null ? payload.get("bookId").toString() : null;
        String securityId = payload.get("securityId") != null ? payload.get("securityId").toString() : null;
        LocalDate businessDate = payload.get("businessDate") != null ? 
                LocalDate.parse(payload.get("businessDate").toString()) : null;
        
        // Create subscription key based on criteria
        String subscriptionKey = createSubscriptionKey(bookId, securityId, businessDate);
        
        // Add the subscription
        List<String> sessionSubscriptions = subscriptions.get(sessionId);
        if (sessionSubscriptions != null && !sessionSubscriptions.contains(subscriptionKey)) {
            sessionSubscriptions.add(subscriptionKey);
            log.info("Added subscription {} for session {}", subscriptionKey, sessionId);
        }
        
        // Create subscription details for the confirmation message
        Map<String, Object> subscriptionDetails = new HashMap<>();
        if (bookId != null) subscriptionDetails.put("bookId", bookId);
        if (securityId != null) subscriptionDetails.put("securityId", securityId);
        if (businessDate != null) subscriptionDetails.put("businessDate", businessDate);
        
        // Send confirmation message
        WebSocketMessage confirmation = WebSocketMessage.createSubscriptionConfirmationMessage(
                "POSITION", subscriptionDetails);
        sendMessage(session, confirmation);
    }

    /**
     * Handles client unsubscription requests for position updates
     *
     * @param session The WebSocket session
     * @param message The unsubscription message
     */
    private void handlePositionUnsubscription(WebSocketSession session, WebSocketMessage message) {
        String sessionId = session.getId();
        Map<String, Object> payload = message.getPayload();
        
        // Extract unsubscription criteria from the message
        String bookId = payload.get("bookId") != null ? payload.get("bookId").toString() : null;
        String securityId = payload.get("securityId") != null ? payload.get("securityId").toString() : null;
        LocalDate businessDate = payload.get("businessDate") != null ? 
                LocalDate.parse(payload.get("businessDate").toString()) : null;
        
        // Create subscription key based on criteria
        String subscriptionKey = createSubscriptionKey(bookId, securityId, businessDate);
        
        // Remove the subscription
        List<String> sessionSubscriptions = subscriptions.get(sessionId);
        if (sessionSubscriptions != null) {
            sessionSubscriptions.remove(subscriptionKey);
            log.info("Removed subscription {} for session {}", subscriptionKey, sessionId);
        }
        
        // Create unsubscription details for the confirmation message
        Map<String, Object> unsubscriptionDetails = new HashMap<>();
        if (bookId != null) unsubscriptionDetails.put("bookId", bookId);
        if (securityId != null) unsubscriptionDetails.put("securityId", securityId);
        if (businessDate != null) unsubscriptionDetails.put("businessDate", businessDate);
        
        // Send confirmation message
        WebSocketMessage confirmation = WebSocketMessage.createSubscriptionConfirmationMessage(
                "POSITION_UNSUBSCRIBED", unsubscriptionDetails);
        sendMessage(session, confirmation);
    }

    /**
     * Processes position events from Kafka and broadcasts to subscribed clients
     *
     * @param event The position event to process
     */
    public void handlePositionEvent(PositionEvent event) {
        log.info("Received position event: {}", event);
        
        // Validate the event
        if (event == null || !event.validate()) {
            log.warn("Invalid position event received");
            return;
        }
        
        // Create WebSocketMessage from the position event
        WebSocketMessage webSocketMessage = WebSocketMessage.fromPositionEvent(event);
        
        // Create subscription keys for the position event
        List<String> subscriptionKeys = createSubscriptionKeys(event);
        
        // Broadcast the message to subscribed clients
        int clientsNotified = broadcastPositionUpdate(webSocketMessage, subscriptionKeys);
        log.info("Position update sent to {} clients", clientsNotified);
    }

    /**
     * Creates a subscription key based on position criteria
     *
     * @param bookId The book ID
     * @param securityId The security ID
     * @param businessDate The business date
     * @return Subscription key for the position
     */
    private String createSubscriptionKey(String bookId, String securityId, LocalDate businessDate) {
        StringBuilder key = new StringBuilder();
        
        if (bookId != null && !bookId.isEmpty()) {
            key.append("book:").append(bookId);
        }
        
        if (securityId != null && !securityId.isEmpty()) {
            if (key.length() > 0) key.append(":");
            key.append("security:").append(securityId);
        }
        
        if (businessDate != null) {
            if (key.length() > 0) key.append(":");
            key.append("date:").append(businessDate);
        }
        
        // If no criteria provided, subscribe to all positions
        if (key.length() == 0) {
            return "all";
        }
        
        return key.toString();
    }

    /**
     * Creates all possible subscription keys for a position event
     *
     * @param event The position event
     * @return List of subscription keys for the position event
     */
    private List<String> createSubscriptionKeys(PositionEvent event) {
        List<String> keys = new ArrayList<>();
        
        // Add the "all" key for clients subscribed to all positions
        keys.add("all");
        
        // Add individual keys
        if (event.getBookId() != null) {
            keys.add("book:" + event.getBookId());
        }
        
        if (event.getSecurityId() != null) {
            keys.add("security:" + event.getSecurityId());
        }
        
        if (event.getBusinessDate() != null) {
            keys.add("date:" + event.getBusinessDate());
        }
        
        // Add combination keys
        if (event.getBookId() != null && event.getSecurityId() != null) {
            keys.add("book:" + event.getBookId() + ":security:" + event.getSecurityId());
        }
        
        if (event.getBookId() != null && event.getBusinessDate() != null) {
            keys.add("book:" + event.getBookId() + ":date:" + event.getBusinessDate());
        }
        
        if (event.getSecurityId() != null && event.getBusinessDate() != null) {
            keys.add("security:" + event.getSecurityId() + ":date:" + event.getBusinessDate());
        }
        
        if (event.getBookId() != null && event.getSecurityId() != null && event.getBusinessDate() != null) {
            keys.add("book:" + event.getBookId() + ":security:" + event.getSecurityId() + ":date:" + event.getBusinessDate());
        }
        
        return keys;
    }

    /**
     * Checks if a session is subscribed to a specific position
     *
     * @param sessionId The session ID
     * @param subscriptionKeys The list of subscription keys to check
     * @return True if the session is subscribed, false otherwise
     */
    private boolean isSubscribed(String sessionId, List<String> subscriptionKeys) {
        List<String> sessionSubscriptions = subscriptions.get(sessionId);
        if (sessionSubscriptions == null || sessionSubscriptions.isEmpty()) {
            return false;
        }
        
        // If subscribed to all positions
        if (sessionSubscriptions.contains("all")) {
            return true;
        }
        
        // Check if subscribed to any of the keys
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
     * @param session The WebSocket session
     * @param message The message to send
     */
    private void sendMessage(WebSocketSession session, WebSocketMessage message) {
        try {
            String jsonMessage = objectMapper.writeValueAsString(message);
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(jsonMessage));
            } else {
                log.warn("Session {} is no longer open, removing", session.getId());
                sessions.remove(session.getId());
                subscriptions.remove(session.getId());
            }
        } catch (IOException e) {
            log.error("Error sending message to client {}: {}", session.getId(), e.getMessage(), e);
            // Remove the session if it's no longer open
            sessions.remove(session.getId());
            subscriptions.remove(session.getId());
        }
    }

    /**
     * Broadcasts a position update to all subscribed sessions
     *
     * @param message The message to broadcast
     * @param subscriptionKeys The list of subscription keys to match
     * @return Number of clients the message was sent to
     */
    private int broadcastPositionUpdate(WebSocketMessage message, List<String> subscriptionKeys) {
        int clientCount = 0;
        
        for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
            String sessionId = entry.getKey();
            WebSocketSession session = entry.getValue();
            
            if (isSubscribed(sessionId, subscriptionKeys)) {
                if (session.isOpen()) {
                    sendMessage(session, message);
                    clientCount++;
                } else {
                    log.warn("Session {} is no longer open, removing", sessionId);
                    sessions.remove(sessionId);
                    subscriptions.remove(sessionId);
                }
            }
        }
        
        return clientCount;
    }
}