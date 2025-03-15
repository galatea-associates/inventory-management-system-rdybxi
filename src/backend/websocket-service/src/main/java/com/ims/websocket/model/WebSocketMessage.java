package com.ims.websocket.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ims.common.event.BaseEvent;
import com.ims.common.event.InventoryEvent;
import com.ims.common.event.LocateEvent;
import com.ims.common.event.PositionEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Model class for WebSocket messages in the Inventory Management System.
 * Provides a standardized format for real-time communication between the server and clients.
 * This class supports various message types including position updates, inventory updates,
 * locate notifications, and system alerts to enable real-time data distribution.
 */
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class WebSocketMessage {

    /**
     * Unique identifier for this message
     */
    private String messageId;
    
    /**
     * Type of message (e.g., POSITION_UPDATE, INVENTORY_UPDATE, LOCATE_APPROVAL)
     */
    private String messageType;
    
    /**
     * Timestamp when the message was created
     */
    private LocalDateTime timestamp;
    
    /**
     * Correlation ID for distributed tracing and request tracking
     */
    private String correlationId;
    
    /**
     * Map containing the message payload data
     */
    private Map<String, Object> payload;

    /**
     * Creates a WebSocketMessage from a BaseEvent
     * 
     * @param event The event to convert
     * @param messageType The type of message to create
     * @return A WebSocketMessage containing the event data
     */
    public static WebSocketMessage fromEvent(BaseEvent event, String messageType) {
        if (event == null) {
            throw new IllegalArgumentException("Event cannot be null");
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("eventId", event.getEventId());
        payload.put("eventType", event.getEventType());
        
        return WebSocketMessage.builder()
                .messageId(UUID.randomUUID().toString())
                .messageType(messageType)
                .timestamp(event.getTimestamp() != null ? event.getTimestamp() : LocalDateTime.now())
                .correlationId(event.getCorrelationId())
                .payload(payload)
                .build();
    }

    /**
     * Creates a WebSocketMessage from a PositionEvent
     * 
     * @param event The position event to convert
     * @return A WebSocketMessage containing the position data
     */
    public static WebSocketMessage fromPositionEvent(PositionEvent event) {
        String messageType = event.isPositionUpdate() ? "POSITION_UPDATE" : 
                            event.isSettlementLadderUpdate() ? "SETTLEMENT_LADDER_UPDATE" : 
                            "POSITION_EVENT";
        
        WebSocketMessage message = fromEvent(event, messageType);
        
        // Add position-specific fields to the payload
        message.getPayload().put("bookId", event.getBookId());
        message.getPayload().put("securityId", event.getSecurityId());
        message.getPayload().put("businessDate", event.getBusinessDate());
        message.getPayload().put("contractualQty", event.getContractualQty());
        message.getPayload().put("settledQty", event.getSettledQty());
        
        // Add settlement ladder data if applicable
        if (event.isSettlementLadderUpdate()) {
            message.getPayload().put("sd0Deliver", event.getSd0Deliver());
            message.getPayload().put("sd0Receipt", event.getSd0Receipt());
            message.getPayload().put("sd1Deliver", event.getSd1Deliver());
            message.getPayload().put("sd1Receipt", event.getSd1Receipt());
            message.getPayload().put("sd2Deliver", event.getSd2Deliver());
            message.getPayload().put("sd2Receipt", event.getSd2Receipt());
            message.getPayload().put("sd3Deliver", event.getSd3Deliver());
            message.getPayload().put("sd3Receipt", event.getSd3Receipt());
            message.getPayload().put("sd4Deliver", event.getSd4Deliver());
            message.getPayload().put("sd4Receipt", event.getSd4Receipt());
        }
        
        return message;
    }

    /**
     * Creates a WebSocketMessage from an InventoryEvent
     * 
     * @param event The inventory event to convert
     * @return A WebSocketMessage containing the inventory data
     */
    public static WebSocketMessage fromInventoryEvent(InventoryEvent event) {
        String messageType = "INVENTORY_" + event.getCalculationType();
        
        WebSocketMessage message = fromEvent(event, messageType);
        
        // Add inventory-specific fields to the payload
        message.getPayload().put("securityId", event.getSecurityIdentifier());
        message.getPayload().put("market", event.getSecurityMarket());
        message.getPayload().put("calculationType", event.getCalculationType());
        message.getPayload().put("availableQuantity", event.getAvailableQuantity());
        message.getPayload().put("reservedQuantity", event.getReservedQuantity());
        message.getPayload().put("decrementQuantity", event.getDecrementQuantity());
        message.getPayload().put("temperature", event.getSecurityTemperature());
        message.getPayload().put("borrowRate", event.getBorrowRate());
        
        return message;
    }

    /**
     * Creates a WebSocketMessage from a LocateEvent
     * 
     * @param event The locate event to convert
     * @return A WebSocketMessage containing the locate data
     */
    public static WebSocketMessage fromLocateEvent(LocateEvent event) {
        String messageType;
        
        if (event.isLocateRequest()) {
            messageType = "LOCATE_REQUEST";
        } else if (event.isLocateApproval()) {
            messageType = "LOCATE_APPROVAL";
        } else if (event.isLocateRejection()) {
            messageType = "LOCATE_REJECTION";
        } else if (event.isLocateCancellation()) {
            messageType = "LOCATE_CANCELLATION";
        } else if (event.isLocateExpiry()) {
            messageType = "LOCATE_EXPIRY";
        } else {
            messageType = "LOCATE_EVENT";
        }
        
        WebSocketMessage message = fromEvent(event, messageType);
        
        // Add locate-specific fields to the payload
        message.getPayload().put("locateId", event.getLocateId());
        message.getPayload().put("securityId", event.getSecurityId());
        message.getPayload().put("clientId", event.getClientId());
        message.getPayload().put("requestorId", event.getRequestorId());
        message.getPayload().put("requestedQuantity", event.getRequestedQuantity());
        message.getPayload().put("approvedQuantity", event.getApprovedQuantity());
        message.getPayload().put("status", event.getStatus());
        message.getPayload().put("actionBy", event.getActionBy());
        message.getPayload().put("isAutomatic", event.getIsAutomatic());
        
        if (event.isRejected()) {
            message.getPayload().put("rejectionReason", event.getRejectionReason());
        }
        
        return message;
    }

    /**
     * Creates an error message to send to clients
     * 
     * @param errorCode The error code
     * @param errorMessage The error message
     * @return A WebSocketMessage containing error information
     */
    public static WebSocketMessage createErrorMessage(String errorCode, String errorMessage) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("errorCode", errorCode);
        payload.put("errorMessage", errorMessage);
        
        return WebSocketMessage.builder()
                .messageId(UUID.randomUUID().toString())
                .messageType("ERROR")
                .timestamp(LocalDateTime.now())
                .payload(payload)
                .build();
    }

    /**
     * Creates an acknowledgement message for client connections
     * 
     * @param sessionId The WebSocket session ID
     * @return A WebSocketMessage acknowledging connection
     */
    public static WebSocketMessage createAcknowledgementMessage(String sessionId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("sessionId", sessionId);
        payload.put("status", "CONNECTED");
        
        return WebSocketMessage.builder()
                .messageId(UUID.randomUUID().toString())
                .messageType("CONNECTION_ACK")
                .timestamp(LocalDateTime.now())
                .payload(payload)
                .build();
    }

    /**
     * Creates a subscription confirmation message
     * 
     * @param subscriptionType The type of subscription
     * @param subscriptionDetails Details about the subscription
     * @return A WebSocketMessage confirming subscription
     */
    public static WebSocketMessage createSubscriptionConfirmationMessage(
            String subscriptionType, Map<String, Object> subscriptionDetails) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("subscriptionType", subscriptionType);
        
        if (subscriptionDetails != null) {
            payload.putAll(subscriptionDetails);
        }
        
        return WebSocketMessage.builder()
                .messageId(UUID.randomUUID().toString())
                .messageType("SUBSCRIPTION_CONFIRMED")
                .timestamp(LocalDateTime.now())
                .payload(payload)
                .build();
    }

    /**
     * Creates a pong response to client ping messages
     * 
     * @return A WebSocketMessage with PONG type
     */
    public static WebSocketMessage createPongMessage() {
        return WebSocketMessage.builder()
                .messageId(UUID.randomUUID().toString())
                .messageType("PONG")
                .timestamp(LocalDateTime.now())
                .payload(new HashMap<>())
                .build();
    }

    /**
     * Checks if this message is a subscription request
     * 
     * @return True if this is a subscription message, false otherwise
     */
    public boolean isSubscribeMessage() {
        return messageType != null && messageType.startsWith("SUBSCRIBE_");
    }

    /**
     * Checks if this message is an unsubscription request
     * 
     * @return True if this is an unsubscription message, false otherwise
     */
    public boolean isUnsubscribeMessage() {
        return messageType != null && messageType.startsWith("UNSUBSCRIBE_");
    }

    /**
     * Checks if this message is a ping message
     * 
     * @return True if this is a ping message, false otherwise
     */
    public boolean isPingMessage() {
        return "PING".equals(messageType);
    }

    /**
     * Extracts the subscription type from a subscription message
     * 
     * @return The subscription type or null if not a subscription message
     */
    public String getSubscriptionType() {
        if (isSubscribeMessage() && messageType.length() > "SUBSCRIBE_".length()) {
            return messageType.substring("SUBSCRIBE_".length());
        }
        return null;
    }

    /**
     * Extracts the unsubscription type from an unsubscription message
     * 
     * @return The unsubscription type or null if not an unsubscription message
     */
    public String getUnsubscriptionType() {
        if (isUnsubscribeMessage() && messageType.length() > "UNSUBSCRIBE_".length()) {
            return messageType.substring("UNSUBSCRIBE_".length());
        }
        return null;
    }
}