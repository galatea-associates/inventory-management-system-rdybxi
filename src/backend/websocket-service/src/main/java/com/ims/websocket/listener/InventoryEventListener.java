package com.ims.websocket.listener;

import com.ims.common.event.InventoryEvent;
import com.ims.websocket.handler.InventoryWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.context.annotation.Bean;

/**
 * Kafka listener for inventory events in the WebSocket Service.
 * <p>
 * This class consumes inventory-related events from Kafka topics and forwards them
 * to connected WebSocket clients through the InventoryWebSocketHandler. It supports
 * real-time inventory updates for various calculation types including for-loan
 * availability, for-pledge availability, and locate availability.
 * </p>
 * <p>
 * Events are filtered by calculation type to ensure appropriate handling for
 * different types of inventory updates.
 * </p>
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class InventoryEventListener {

    private final InventoryWebSocketHandler inventoryWebSocketHandler;

    /**
     * Listens for for-loan inventory events and forwards them to WebSocket clients.
     *
     * @param event The inventory event containing for-loan availability data
     * @param key The Kafka message key
     */
    @KafkaListener(
            topics = "${kafka.inventory-topic}",
            groupId = "${kafka.group-id}",
            containerFactory = "inventoryEventKafkaListenerContainerFactory",
            filter = "forLoanInventoryFilter"
    )
    public void listenForLoanInventory(@Payload InventoryEvent event, @Header(KafkaHeaders.RECEIVED_KEY) String key) {
        log.info("Received for-loan inventory event for security: {}, calculation type: {}", 
                event.getSecurityIdentifier(), event.getCalculationType());
        
        if (!event.validate()) {
            log.warn("Invalid for-loan inventory event received, skipping processing");
            return;
        }
        
        inventoryWebSocketHandler.handleInventoryEvent(event);
        log.debug("For-loan inventory event forwarded to WebSocket handler");
    }

    /**
     * Listens for for-pledge inventory events and forwards them to WebSocket clients.
     *
     * @param event The inventory event containing for-pledge availability data
     * @param key The Kafka message key
     */
    @KafkaListener(
            topics = "${kafka.inventory-topic}",
            groupId = "${kafka.group-id}",
            containerFactory = "inventoryEventKafkaListenerContainerFactory",
            filter = "forPledgeInventoryFilter"
    )
    public void listenForPledgeInventory(@Payload InventoryEvent event, @Header(KafkaHeaders.RECEIVED_KEY) String key) {
        log.info("Received for-pledge inventory event for security: {}, calculation type: {}", 
                event.getSecurityIdentifier(), event.getCalculationType());
        
        if (!event.validate()) {
            log.warn("Invalid for-pledge inventory event received, skipping processing");
            return;
        }
        
        inventoryWebSocketHandler.handleInventoryEvent(event);
        log.debug("For-pledge inventory event forwarded to WebSocket handler");
    }

    /**
     * Listens for locate inventory events and forwards them to WebSocket clients.
     *
     * @param event The inventory event containing locate availability data
     * @param key The Kafka message key
     */
    @KafkaListener(
            topics = "${kafka.inventory-topic}",
            groupId = "${kafka.group-id}",
            containerFactory = "inventoryEventKafkaListenerContainerFactory",
            filter = "locateInventoryFilter"
    )
    public void listenLocateInventory(@Payload InventoryEvent event, @Header(KafkaHeaders.RECEIVED_KEY) String key) {
        log.info("Received locate inventory event for security: {}, calculation type: {}", 
                event.getSecurityIdentifier(), event.getCalculationType());
        
        if (!event.validate()) {
            log.warn("Invalid locate inventory event received, skipping processing");
            return;
        }
        
        inventoryWebSocketHandler.handleInventoryEvent(event);
        log.debug("Locate inventory event forwarded to WebSocket handler");
    }

    /**
     * Listens for short sell inventory events and forwards them to WebSocket clients.
     *
     * @param event The inventory event containing short sell availability data
     * @param key The Kafka message key
     */
    @KafkaListener(
            topics = "${kafka.inventory-topic}",
            groupId = "${kafka.group-id}",
            containerFactory = "inventoryEventKafkaListenerContainerFactory",
            filter = "shortSellInventoryFilter"
    )
    public void listenShortSellInventory(@Payload InventoryEvent event, @Header(KafkaHeaders.RECEIVED_KEY) String key) {
        log.info("Received short sell inventory event for security: {}, calculation type: {}", 
                event.getSecurityIdentifier(), event.getCalculationType());
        
        if (!event.validate()) {
            log.warn("Invalid short sell inventory event received, skipping processing");
            return;
        }
        
        inventoryWebSocketHandler.handleInventoryEvent(event);
        log.debug("Short sell inventory event forwarded to WebSocket handler");
    }

    /**
     * Listens for other inventory event types and forwards them to WebSocket clients.
     *
     * @param event The inventory event containing availability data
     * @param key The Kafka message key
     */
    @KafkaListener(
            topics = "${kafka.inventory-topic}",
            groupId = "${kafka.group-id}",
            containerFactory = "inventoryEventKafkaListenerContainerFactory",
            filter = "otherInventoryFilter"
    )
    public void listenOtherInventory(@Payload InventoryEvent event, @Header(KafkaHeaders.RECEIVED_KEY) String key) {
        log.info("Received other inventory event for security: {}, calculation type: {}", 
                event.getSecurityIdentifier(), event.getCalculationType());
        
        if (!event.validate()) {
            log.warn("Invalid inventory event received, skipping processing");
            return;
        }
        
        inventoryWebSocketHandler.handleInventoryEvent(event);
        log.debug("Other inventory event forwarded to WebSocket handler");
    }

    /**
     * Filter method for for-loan inventory events.
     *
     * @param event The inventory event to filter
     * @param key The Kafka message key
     * @return true if the event is a for-loan inventory event, false otherwise
     */
    @Bean
    public boolean forLoanInventoryFilter(InventoryEvent event, String key) {
        return event != null && "FOR_LOAN".equals(event.getCalculationType());
    }

    /**
     * Filter method for for-pledge inventory events.
     *
     * @param event The inventory event to filter
     * @param key The Kafka message key
     * @return true if the event is a for-pledge inventory event, false otherwise
     */
    @Bean
    public boolean forPledgeInventoryFilter(InventoryEvent event, String key) {
        return event != null && "FOR_PLEDGE".equals(event.getCalculationType());
    }

    /**
     * Filter method for locate inventory events.
     *
     * @param event The inventory event to filter
     * @param key The Kafka message key
     * @return true if the event is a locate inventory event, false otherwise
     */
    @Bean
    public boolean locateInventoryFilter(InventoryEvent event, String key) {
        return event != null && "LOCATE".equals(event.getCalculationType());
    }

    /**
     * Filter method for short sell inventory events.
     *
     * @param event The inventory event to filter
     * @param key The Kafka message key
     * @return true if the event is a short sell inventory event, false otherwise
     */
    @Bean
    public boolean shortSellInventoryFilter(InventoryEvent event, String key) {
        return event != null && "SHORT_SELL".equals(event.getCalculationType());
    }

    /**
     * Filter method for other inventory event types.
     *
     * @param event The inventory event to filter
     * @param key The Kafka message key
     * @return true if the event is not one of the specific inventory types, false otherwise
     */
    @Bean
    public boolean otherInventoryFilter(InventoryEvent event, String key) {
        return event != null && 
               !"FOR_LOAN".equals(event.getCalculationType()) &&
               !"FOR_PLEDGE".equals(event.getCalculationType()) &&
               !"LOCATE".equals(event.getCalculationType()) &&
               !"SHORT_SELL".equals(event.getCalculationType());
    }
}