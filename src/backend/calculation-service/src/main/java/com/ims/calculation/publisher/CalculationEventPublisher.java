package com.ims.calculation.publisher;

import com.ims.calculation.model.AggregationUnitLimit;
import com.ims.calculation.model.ClientLimit;
import com.ims.calculation.model.InventoryAvailability;
import com.ims.calculation.model.Position;
import com.ims.common.event.BaseEvent;
import com.ims.common.event.InventoryEvent;
import com.ims.common.event.PositionEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Service responsible for publishing calculation-related events to Kafka topics in the 
 * Inventory Management System. This service handles the serialization and asynchronous
 * delivery of position, inventory, client limit, and aggregation unit limit events
 * to downstream services.
 * 
 * This service is designed to support high-throughput event processing (300,000+ events per second)
 * with guaranteed delivery semantics as per requirement F-501.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CalculationEventPublisher {

    private static final String SOURCE_NAME = "CALCULATION_SERVICE";

    // Kafka templates for different event types
    private final KafkaTemplate<String, PositionEvent> positionEventKafkaTemplate;
    private final KafkaTemplate<String, InventoryEvent> inventoryEventKafkaTemplate;
    private final KafkaTemplate<String, ClientLimitEvent> clientLimitEventKafkaTemplate;
    private final KafkaTemplate<String, AggregationUnitLimitEvent> aggregationUnitLimitEventKafkaTemplate;

    // Kafka topic names, injected from application properties
    @Value("${kafka.topic.position-event}")
    private String positionEventTopic;

    @Value("${kafka.topic.inventory-event}")
    private String inventoryEventTopic;

    @Value("${kafka.topic.client-limit-event}")
    private String clientLimitEventTopic;

    @Value("${kafka.topic.aggregation-unit-limit-event}")
    private String aggregationUnitLimitEventTopic;

    /**
     * Publishes a position event to Kafka asynchronously.
     *
     * @param position The position to publish
     * @param eventType The type of event (POSITION_UPDATE, START_OF_DAY, etc.)
     * @return A CompletableFuture representing the asynchronous operation
     */
    @Async
    public CompletableFuture<?> publishPositionEvent(Position position, String eventType) {
        log.debug("Publishing position event for position with bookId: {}, securityId: {}", 
                position.getBookId(), position.getSecurity().getInternalId());
        
        validateInput(position, "Position cannot be null");
        
        PositionEvent event = PositionEvent.fromPosition(position);
        event.setEventType(eventType);
        event.setSource(SOURCE_NAME);
        
        String routingKey = position.getBookId() + "-" + position.getSecurity().getInternalId();
        
        return positionEventKafkaTemplate.send(positionEventTopic, routingKey, event)
            .completable()
            .thenApply(result -> {
                log.debug("Successfully published position event: {} for position: {}-{}", 
                        event.getEventId(), position.getBookId(), position.getSecurity().getInternalId());
                return result;
            })
            .exceptionally(ex -> {
                log.error("Failed to publish position event for position: {}-{}", 
                        position.getBookId(), position.getSecurity().getInternalId(), ex);
                throw new RuntimeException("Failed to publish position event", ex);
            });
    }

    /**
     * Publishes multiple position events to Kafka asynchronously.
     *
     * @param positions List of positions to publish
     * @param eventType The type of event (POSITION_UPDATE, START_OF_DAY, etc.)
     * @return A list of CompletableFuture representing the asynchronous operations
     */
    @Async
    public List<CompletableFuture<?>> publishPositionEvents(List<Position> positions, String eventType) {
        log.debug("Publishing batch of {} position events", positions.size());
        
        validateInput(positions, "Positions list cannot be null or empty");
        if (positions.isEmpty()) {
            log.warn("Empty positions list provided for batch publishing");
            return List.of();
        }
        
        List<CompletableFuture<?>> futures = new ArrayList<>(positions.size());
        
        for (Position position : positions) {
            PositionEvent event = PositionEvent.fromPosition(position);
            event.setEventType(eventType);
            event.setSource(SOURCE_NAME);
            
            String routingKey = position.getBookId() + "-" + position.getSecurity().getInternalId();
            
            CompletableFuture<?> future = positionEventKafkaTemplate.send(positionEventTopic, routingKey, event)
                .completable()
                .thenApply(result -> {
                    log.debug("Successfully published position event: {} in batch", event.getEventId());
                    return result;
                })
                .exceptionally(ex -> {
                    log.error("Failed to publish position event in batch for position: {}-{}", 
                            position.getBookId(), position.getSecurity().getInternalId(), ex);
                    throw new RuntimeException("Failed to publish position event in batch", ex);
                });
            
            futures.add(future);
        }
        
        log.debug("Initiated publishing for batch of {} position events", positions.size());
        return futures;
    }

    /**
     * Publishes an inventory event to Kafka asynchronously.
     *
     * @param inventory The inventory availability to publish
     * @param eventType The type of event (INVENTORY_UPDATE, etc.)
     * @return A CompletableFuture representing the asynchronous operation
     */
    @Async
    public CompletableFuture<?> publishInventoryEvent(InventoryAvailability inventory, String eventType) {
        log.debug("Publishing inventory event for securityId: {}, calculationType: {}", 
                inventory.getSecurityId(), inventory.getCalculationType());
        
        validateInput(inventory, "Inventory cannot be null");
        
        InventoryEvent event = InventoryEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(eventType)
                .source(SOURCE_NAME)
                .securityIdentifier(inventory.getSecurityId())
                .securityMarket(inventory.getMarket())
                .counterpartyIdentifier(inventory.getCounterpartyId())
                .aggregationUnitIdentifier(inventory.getAggregationUnitId())
                .businessDate(inventory.getBusinessDate())
                .calculationType(inventory.getCalculationType())
                .grossQuantity(inventory.getGrossQuantity())
                .netQuantity(inventory.getNetQuantity())
                .availableQuantity(inventory.getAvailableQuantity())
                .reservedQuantity(inventory.getReservedQuantity())
                .decrementQuantity(inventory.getDecrementQuantity())
                .securityTemperature(inventory.getSecurityTemperature())
                .borrowRate(inventory.getBorrowRate())
                .calculationRuleId(inventory.getCalculationRuleId())
                .calculationRuleVersion(inventory.getCalculationRuleVersion())
                .isExternalSource(inventory.getIsExternalSource())
                .externalSourceName(inventory.getExternalSourceName())
                .status(inventory.getStatus())
                .build();
        
        String routingKey = inventory.getSecurityId() + "-" + inventory.getCalculationType();
        
        return inventoryEventKafkaTemplate.send(inventoryEventTopic, routingKey, event)
            .completable()
            .thenApply(result -> {
                log.debug("Successfully published inventory event: {} for security: {}, type: {}", 
                        event.getEventId(), inventory.getSecurityId(), inventory.getCalculationType());
                return result;
            })
            .exceptionally(ex -> {
                log.error("Failed to publish inventory event for security: {}, type: {}", 
                        inventory.getSecurityId(), inventory.getCalculationType(), ex);
                throw new RuntimeException("Failed to publish inventory event", ex);
            });
    }

    /**
     * Publishes multiple inventory events to Kafka asynchronously.
     *
     * @param inventories List of inventory availabilities to publish
     * @param eventType The type of event (INVENTORY_UPDATE, etc.)
     * @return A list of CompletableFuture representing the asynchronous operations
     */
    @Async
    public List<CompletableFuture<?>> publishInventoryEvents(List<InventoryAvailability> inventories, String eventType) {
        log.debug("Publishing batch of {} inventory events", inventories.size());
        
        validateInput(inventories, "Inventories list cannot be null or empty");
        if (inventories.isEmpty()) {
            log.warn("Empty inventories list provided for batch publishing");
            return List.of();
        }
        
        List<CompletableFuture<?>> futures = new ArrayList<>(inventories.size());
        
        for (InventoryAvailability inventory : inventories) {
            InventoryEvent event = InventoryEvent.builder()
                    .eventId(UUID.randomUUID().toString())
                    .eventType(eventType)
                    .source(SOURCE_NAME)
                    .securityIdentifier(inventory.getSecurityId())
                    .securityMarket(inventory.getMarket())
                    .counterpartyIdentifier(inventory.getCounterpartyId())
                    .aggregationUnitIdentifier(inventory.getAggregationUnitId())
                    .businessDate(inventory.getBusinessDate())
                    .calculationType(inventory.getCalculationType())
                    .grossQuantity(inventory.getGrossQuantity())
                    .netQuantity(inventory.getNetQuantity())
                    .availableQuantity(inventory.getAvailableQuantity())
                    .reservedQuantity(inventory.getReservedQuantity())
                    .decrementQuantity(inventory.getDecrementQuantity())
                    .securityTemperature(inventory.getSecurityTemperature())
                    .borrowRate(inventory.getBorrowRate())
                    .calculationRuleId(inventory.getCalculationRuleId())
                    .calculationRuleVersion(inventory.getCalculationRuleVersion())
                    .isExternalSource(inventory.getIsExternalSource())
                    .externalSourceName(inventory.getExternalSourceName())
                    .status(inventory.getStatus())
                    .build();
            
            String routingKey = inventory.getSecurityId() + "-" + inventory.getCalculationType();
            
            CompletableFuture<?> future = inventoryEventKafkaTemplate.send(inventoryEventTopic, routingKey, event)
                .completable()
                .thenApply(result -> {
                    log.debug("Successfully published inventory event: {} in batch", event.getEventId());
                    return result;
                })
                .exceptionally(ex -> {
                    log.error("Failed to publish inventory event in batch for security: {}, type: {}", 
                            inventory.getSecurityId(), inventory.getCalculationType(), ex);
                    throw new RuntimeException("Failed to publish inventory event in batch", ex);
                });
            
            futures.add(future);
        }
        
        log.debug("Initiated publishing for batch of {} inventory events", inventories.size());
        return futures;
    }

    /**
     * Publishes a client limit event to Kafka asynchronously.
     *
     * @param clientLimit The client limit to publish
     * @param eventType The type of event (CLIENT_LIMIT_UPDATE, etc.)
     * @return A CompletableFuture representing the asynchronous operation
     */
    @Async
    public CompletableFuture<?> publishClientLimitEvent(ClientLimit clientLimit, String eventType) {
        log.debug("Publishing client limit event for clientId: {}, securityId: {}", 
                clientLimit.getClientId(), clientLimit.getSecurityId());
        
        validateInput(clientLimit, "Client limit cannot be null");
        
        ClientLimitEvent event = createClientLimitEvent(clientLimit, eventType);
        
        String routingKey = clientLimit.getClientId() + "-" + clientLimit.getSecurityId();
        
        return clientLimitEventKafkaTemplate.send(clientLimitEventTopic, routingKey, event)
            .completable()
            .thenApply(result -> {
                log.debug("Successfully published client limit event: {} for client: {}, security: {}", 
                        event.getEventId(), clientLimit.getClientId(), clientLimit.getSecurityId());
                return result;
            })
            .exceptionally(ex -> {
                log.error("Failed to publish client limit event for client: {}, security: {}", 
                        clientLimit.getClientId(), clientLimit.getSecurityId(), ex);
                throw new RuntimeException("Failed to publish client limit event", ex);
            });
    }

    /**
     * Publishes multiple client limit events to Kafka asynchronously.
     *
     * @param clientLimits List of client limits to publish
     * @param eventType The type of event (CLIENT_LIMIT_UPDATE, etc.)
     * @return A list of CompletableFuture representing the asynchronous operations
     */
    @Async
    public List<CompletableFuture<?>> publishClientLimitEvents(List<ClientLimit> clientLimits, String eventType) {
        log.debug("Publishing batch of {} client limit events", clientLimits.size());
        
        validateInput(clientLimits, "Client limits list cannot be null or empty");
        if (clientLimits.isEmpty()) {
            log.warn("Empty client limits list provided for batch publishing");
            return List.of();
        }
        
        List<CompletableFuture<?>> futures = new ArrayList<>(clientLimits.size());
        
        for (ClientLimit clientLimit : clientLimits) {
            ClientLimitEvent event = createClientLimitEvent(clientLimit, eventType);
            
            String routingKey = clientLimit.getClientId() + "-" + clientLimit.getSecurityId();
            
            CompletableFuture<?> future = clientLimitEventKafkaTemplate.send(clientLimitEventTopic, routingKey, event)
                .completable()
                .thenApply(result -> {
                    log.debug("Successfully published client limit event: {} in batch", event.getEventId());
                    return result;
                })
                .exceptionally(ex -> {
                    log.error("Failed to publish client limit event in batch for client: {}, security: {}", 
                            clientLimit.getClientId(), clientLimit.getSecurityId(), ex);
                    throw new RuntimeException("Failed to publish client limit event in batch", ex);
                });
            
            futures.add(future);
        }
        
        log.debug("Initiated publishing for batch of {} client limit events", clientLimits.size());
        return futures;
    }

    /**
     * Publishes an aggregation unit limit event to Kafka asynchronously.
     *
     * @param aggregationUnitLimit The aggregation unit limit to publish
     * @param eventType The type of event (AGGREGATION_UNIT_LIMIT_UPDATE, etc.)
     * @return A CompletableFuture representing the asynchronous operation
     */
    @Async
    public CompletableFuture<?> publishAggregationUnitLimitEvent(AggregationUnitLimit aggregationUnitLimit, String eventType) {
        log.debug("Publishing aggregation unit limit event for aggregationUnitId: {}, securityId: {}", 
                aggregationUnitLimit.getAggregationUnitId(), aggregationUnitLimit.getSecurityId());
        
        validateInput(aggregationUnitLimit, "Aggregation unit limit cannot be null");
        
        AggregationUnitLimitEvent event = createAggregationUnitLimitEvent(aggregationUnitLimit, eventType);
        
        String routingKey = aggregationUnitLimit.getAggregationUnitId() + "-" + aggregationUnitLimit.getSecurityId();
        
        return aggregationUnitLimitEventKafkaTemplate.send(aggregationUnitLimitEventTopic, routingKey, event)
            .completable()
            .thenApply(result -> {
                log.debug("Successfully published aggregation unit limit event: {} for unit: {}, security: {}", 
                        event.getEventId(), aggregationUnitLimit.getAggregationUnitId(), aggregationUnitLimit.getSecurityId());
                return result;
            })
            .exceptionally(ex -> {
                log.error("Failed to publish aggregation unit limit event for unit: {}, security: {}", 
                        aggregationUnitLimit.getAggregationUnitId(), aggregationUnitLimit.getSecurityId(), ex);
                throw new RuntimeException("Failed to publish aggregation unit limit event", ex);
            });
    }

    /**
     * Publishes multiple aggregation unit limit events to Kafka asynchronously.
     *
     * @param aggregationUnitLimits List of aggregation unit limits to publish
     * @param eventType The type of event (AGGREGATION_UNIT_LIMIT_UPDATE, etc.)
     * @return A list of CompletableFuture representing the asynchronous operations
     */
    @Async
    public List<CompletableFuture<?>> publishAggregationUnitLimitEvents(List<AggregationUnitLimit> aggregationUnitLimits, String eventType) {
        log.debug("Publishing batch of {} aggregation unit limit events", aggregationUnitLimits.size());
        
        validateInput(aggregationUnitLimits, "Aggregation unit limits list cannot be null or empty");
        if (aggregationUnitLimits.isEmpty()) {
            log.warn("Empty aggregation unit limits list provided for batch publishing");
            return List.of();
        }
        
        List<CompletableFuture<?>> futures = new ArrayList<>(aggregationUnitLimits.size());
        
        for (AggregationUnitLimit aggregationUnitLimit : aggregationUnitLimits) {
            AggregationUnitLimitEvent event = createAggregationUnitLimitEvent(aggregationUnitLimit, eventType);
            
            String routingKey = aggregationUnitLimit.getAggregationUnitId() + "-" + aggregationUnitLimit.getSecurityId();
            
            CompletableFuture<?> future = aggregationUnitLimitEventKafkaTemplate.send(aggregationUnitLimitEventTopic, routingKey, event)
                .completable()
                .thenApply(result -> {
                    log.debug("Successfully published aggregation unit limit event: {} in batch", event.getEventId());
                    return result;
                })
                .exceptionally(ex -> {
                    log.error("Failed to publish aggregation unit limit event in batch for unit: {}, security: {}", 
                            aggregationUnitLimit.getAggregationUnitId(), aggregationUnitLimit.getSecurityId(), ex);
                    throw new RuntimeException("Failed to publish aggregation unit limit event in batch", ex);
                });
            
            futures.add(future);
        }
        
        log.debug("Initiated publishing for batch of {} aggregation unit limit events", aggregationUnitLimits.size());
        return futures;
    }

    /**
     * Helper method to validate that input is not null or empty.
     *
     * @param input The input to validate
     * @param errorMessage The error message to throw if validation fails
     */
    private void validateInput(Object input, String errorMessage) {
        if (input == null) {
            log.error("Validation failed: {}", errorMessage);
            throw new IllegalArgumentException(errorMessage);
        }
        
        if (input instanceof List && ((List<?>) input).isEmpty()) {
            log.error("Validation failed: {}", errorMessage);
            throw new IllegalArgumentException(errorMessage);
        }
    }

    /**
     * Creates a ClientLimitEvent from a ClientLimit entity.
     *
     * @param clientLimit The client limit entity
     * @param eventType The type of event
     * @return A new ClientLimitEvent
     */
    private ClientLimitEvent createClientLimitEvent(ClientLimit clientLimit, String eventType) {
        return ClientLimitEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(eventType)
                .source(SOURCE_NAME)
                .clientId(clientLimit.getClientId())
                .securityId(clientLimit.getSecurityId())
                .businessDate(clientLimit.getBusinessDate())
                .longSellLimit(clientLimit.getLongSellLimit())
                .shortSellLimit(clientLimit.getShortSellLimit())
                .longSellUsed(clientLimit.getLongSellUsed())
                .shortSellUsed(clientLimit.getShortSellUsed())
                .currency(clientLimit.getCurrency())
                .limitType(clientLimit.getLimitType())
                .market(clientLimit.getMarket())
                .status(clientLimit.getStatus())
                .lastUpdated(clientLimit.getLastUpdated())
                .build();
    }

    /**
     * Creates an AggregationUnitLimitEvent from an AggregationUnitLimit entity.
     *
     * @param aggregationUnitLimit The aggregation unit limit entity
     * @param eventType The type of event
     * @return A new AggregationUnitLimitEvent
     */
    private AggregationUnitLimitEvent createAggregationUnitLimitEvent(AggregationUnitLimit aggregationUnitLimit, String eventType) {
        return AggregationUnitLimitEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(eventType)
                .source(SOURCE_NAME)
                .aggregationUnitId(aggregationUnitLimit.getAggregationUnitId())
                .securityId(aggregationUnitLimit.getSecurityId())
                .businessDate(aggregationUnitLimit.getBusinessDate())
                .longSellLimit(aggregationUnitLimit.getLongSellLimit())
                .shortSellLimit(aggregationUnitLimit.getShortSellLimit())
                .longSellUsed(aggregationUnitLimit.getLongSellUsed())
                .shortSellUsed(aggregationUnitLimit.getShortSellUsed())
                .currency(aggregationUnitLimit.getCurrency())
                .limitType(aggregationUnitLimit.getLimitType())
                .market(aggregationUnitLimit.getMarket())
                .status(aggregationUnitLimit.getStatus())
                .marketSpecificRules(aggregationUnitLimit.getMarketSpecificRules())
                .lastUpdated(aggregationUnitLimit.getLastUpdated())
                .build();
    }

    /**
     * Event class representing client limit updates in the Inventory Management System.
     */
    public static class ClientLimitEvent extends BaseEvent {
        private String clientId;
        private String securityId;
        private java.time.LocalDate businessDate;
        private Double longSellLimit;
        private Double shortSellLimit;
        private Double longSellUsed;
        private Double shortSellUsed;
        private String currency;
        private String limitType;
        private String market;
        private String status;
        private java.time.LocalDateTime lastUpdated;

        @lombok.Builder
        public ClientLimitEvent(String eventId, String eventType, String source, java.time.LocalDateTime timestamp, 
                               String correlationId, Integer version, String clientId, String securityId, 
                               java.time.LocalDate businessDate, Double longSellLimit, Double shortSellLimit, 
                               Double longSellUsed, Double shortSellUsed, String currency, String limitType, 
                               String market, String status, java.time.LocalDateTime lastUpdated) {
            super(eventType, source);
            this.setEventId(eventId);
            if (timestamp != null) this.setTimestamp(timestamp);
            if (correlationId != null) this.setCorrelationId(correlationId);
            if (version != null) this.setVersion(version);
            this.clientId = clientId;
            this.securityId = securityId;
            this.businessDate = businessDate;
            this.longSellLimit = longSellLimit;
            this.shortSellLimit = shortSellLimit;
            this.longSellUsed = longSellUsed;
            this.shortSellUsed = shortSellUsed;
            this.currency = currency;
            this.limitType = limitType;
            this.market = market;
            this.status = status;
            this.lastUpdated = lastUpdated;
        }

        // Getters and setters
        public String getClientId() { return clientId; }
        public void setClientId(String clientId) { this.clientId = clientId; }
        public String getSecurityId() { return securityId; }
        public void setSecurityId(String securityId) { this.securityId = securityId; }
        public java.time.LocalDate getBusinessDate() { return businessDate; }
        public void setBusinessDate(java.time.LocalDate businessDate) { this.businessDate = businessDate; }
        public Double getLongSellLimit() { return longSellLimit; }
        public void setLongSellLimit(Double longSellLimit) { this.longSellLimit = longSellLimit; }
        public Double getShortSellLimit() { return shortSellLimit; }
        public void setShortSellLimit(Double shortSellLimit) { this.shortSellLimit = shortSellLimit; }
        public Double getLongSellUsed() { return longSellUsed; }
        public void setLongSellUsed(Double longSellUsed) { this.longSellUsed = longSellUsed; }
        public Double getShortSellUsed() { return shortSellUsed; }
        public void setShortSellUsed(Double shortSellUsed) { this.shortSellUsed = shortSellUsed; }
        public String getCurrency() { return currency; }
        public void setCurrency(String currency) { this.currency = currency; }
        public String getLimitType() { return limitType; }
        public void setLimitType(String limitType) { this.limitType = limitType; }
        public String getMarket() { return market; }
        public void setMarket(String market) { this.market = market; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public java.time.LocalDateTime getLastUpdated() { return lastUpdated; }
        public void setLastUpdated(java.time.LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    }

    /**
     * Event class representing aggregation unit limit updates in the Inventory Management System.
     */
    public static class AggregationUnitLimitEvent extends BaseEvent {
        private String aggregationUnitId;
        private String securityId;
        private java.time.LocalDate businessDate;
        private Double longSellLimit;
        private Double shortSellLimit;
        private Double longSellUsed;
        private Double shortSellUsed;
        private String currency;
        private String limitType;
        private String market;
        private String status;
        private java.util.Set<String> marketSpecificRules;
        private java.time.LocalDateTime lastUpdated;

        @lombok.Builder
        public AggregationUnitLimitEvent(String eventId, String eventType, String source, java.time.LocalDateTime timestamp, 
                                       String correlationId, Integer version, String aggregationUnitId, String securityId, 
                                       java.time.LocalDate businessDate, Double longSellLimit, Double shortSellLimit, 
                                       Double longSellUsed, Double shortSellUsed, String currency, String limitType, 
                                       String market, String status, java.util.Set<String> marketSpecificRules, 
                                       java.time.LocalDateTime lastUpdated) {
            super(eventType, source);
            this.setEventId(eventId);
            if (timestamp != null) this.setTimestamp(timestamp);
            if (correlationId != null) this.setCorrelationId(correlationId);
            if (version != null) this.setVersion(version);
            this.aggregationUnitId = aggregationUnitId;
            this.securityId = securityId;
            this.businessDate = businessDate;
            this.longSellLimit = longSellLimit;
            this.shortSellLimit = shortSellLimit;
            this.longSellUsed = longSellUsed;
            this.shortSellUsed = shortSellUsed;
            this.currency = currency;
            this.limitType = limitType;
            this.market = market;
            this.status = status;
            this.marketSpecificRules = marketSpecificRules;
            this.lastUpdated = lastUpdated;
        }

        // Getters and setters
        public String getAggregationUnitId() { return aggregationUnitId; }
        public void setAggregationUnitId(String aggregationUnitId) { this.aggregationUnitId = aggregationUnitId; }
        public String getSecurityId() { return securityId; }
        public void setSecurityId(String securityId) { this.securityId = securityId; }
        public java.time.LocalDate getBusinessDate() { return businessDate; }
        public void setBusinessDate(java.time.LocalDate businessDate) { this.businessDate = businessDate; }
        public Double getLongSellLimit() { return longSellLimit; }
        public void setLongSellLimit(Double longSellLimit) { this.longSellLimit = longSellLimit; }
        public Double getShortSellLimit() { return shortSellLimit; }
        public void setShortSellLimit(Double shortSellLimit) { this.shortSellLimit = shortSellLimit; }
        public Double getLongSellUsed() { return longSellUsed; }
        public void setLongSellUsed(Double longSellUsed) { this.longSellUsed = longSellUsed; }
        public Double getShortSellUsed() { return shortSellUsed; }
        public void setShortSellUsed(Double shortSellUsed) { this.shortSellUsed = shortSellUsed; }
        public String getCurrency() { return currency; }
        public void setCurrency(String currency) { this.currency = currency; }
        public String getLimitType() { return limitType; }
        public void setLimitType(String limitType) { this.limitType = limitType; }
        public String getMarket() { return market; }
        public void setMarket(String market) { this.market = market; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public java.util.Set<String> getMarketSpecificRules() { return marketSpecificRules; }
        public void setMarketSpecificRules(java.util.Set<String> marketSpecificRules) { this.marketSpecificRules = marketSpecificRules; }
        public java.time.LocalDateTime getLastUpdated() { return lastUpdated; }
        public void setLastUpdated(java.time.LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
    }
}