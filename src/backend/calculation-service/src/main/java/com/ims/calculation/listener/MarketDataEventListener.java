package com.ims.calculation.listener;

import com.ims.calculation.service.InventoryCalculationService;
import com.ims.calculation.service.PositionCalculationService;
import com.ims.common.event.BaseEvent;
import com.ims.common.event.MarketDataEvent;
import com.ims.common.util.DateUtil;
import java.util.concurrent.CompletableFuture; // JDK 17
import lombok.RequiredArgsConstructor; // lombok 1.18.26
import lombok.extern.slf4j.Slf4j; // lombok 1.18.26
import org.springframework.kafka.annotation.KafkaListener; // Spring Kafka 3.0.7
import org.springframework.messaging.handler.annotation.Header; // Spring Framework 6.0.9
import org.springframework.messaging.handler.annotation.Payload; // Spring Framework 6.0.9
import org.springframework.stereotype.Component; // Spring Framework 6.0.9

/**
 * Kafka listener component responsible for consuming market data events from the message bus and
 * triggering appropriate calculations in the Inventory Management System. This class handles the
 * reception of price updates, NAV updates, and volatility data, validates them, and delegates to
 * the appropriate calculation services for position and inventory recalculations based on market
 * data changes.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class MarketDataEventListener {

  private final PositionCalculationService positionCalculationService;
  private final InventoryCalculationService inventoryCalculationService;

  /**
   * Constructor that initializes the market data event listener with required dependencies
   *
   * @param positionCalculationService Service for recalculating positions based on market data
   *     changes
   * @param inventoryCalculationService Service for recalculating inventory based on position
   *     updates from market data changes
   */
  public MarketDataEventListener(
      PositionCalculationService positionCalculationService,
      InventoryCalculationService inventoryCalculationService) {
    this.positionCalculationService = positionCalculationService;
    this.inventoryCalculationService = inventoryCalculationService;
  }

  /**
   * Kafka listener method that consumes market data events from the market data events topic
   *
   * @param event The market data event
   * @param key The key of the Kafka message
   * @param partition The partition of the Kafka message
   * @param offset The offset of the Kafka message
   */
  @KafkaListener(
      topics = "${app.kafka.topics.market-data-events}",
      groupId = "${app.kafka.consumer.group-id}",
      containerFactory = "marketDataEventKafkaListenerContainerFactory")
  public void consumeMarketDataEvents(
      @Payload MarketDataEvent event,
      @Header(name = "kafka_receivedMessageKey", required = false) String key,
      @Header(name = "kafka_receivedPartitionId", required = false) Long partition,
      @Header(name = "kafka_offset", required = false) Long offset) {
    // Log the received market data event with key, partition, and offset information
    logEventDetails(event, key, partition, offset);

    // Validate the market data event using validateMarketDataEvent(event)
    if (!validateMarketDataEvent(event)) {
      // If validation fails, log an error and return
      log.error("Received invalid market data event: {}", event);
      return;
    }

    // Process the market data event based on its type (price update, NAV update, volatility update,
    // batch update)
    CompletableFuture<?> future = processMarketDataEvent(event);

    // Log the successful processing of the market data event
    future.thenRun(
        () -> log.info("Successfully processed market data event: {} ", event.getEventId()));
  }

  /**
   * Validates a market data event before processing
   *
   * @param event The market data event
   * @return True if the event is valid, false otherwise
   */
  private boolean validateMarketDataEvent(MarketDataEvent event) {
    // Check if event is not null
    if (event == null) {
      log.error("Market data event is null");
      return false;
    }

    // Check if event.isValid() returns true
    if (!event.isValid()) {
      log.error("Market data event is not valid: {}", event);
      return false;
    }

    // Check if event.validate() returns true
    if (!event.validate()) {
      log.error("Market data event failed specific validation: {}", event);
      return false;
    }

    // Check if securityId is not null or empty
    if (event.getSecurityId() == null || event.getSecurityId().isEmpty()) {
      log.error("Market data event has no security ID: {}", event);
      return false;
    }

    // Check if effectiveTime is not null
    if (event.getEffectiveTime() == null) {
      log.error("Market data event has no effective time: {}", event);
      return false;
    }

    // Return true if all checks pass, false otherwise
    return true;
  }

  /**
   * Processes a market data event by delegating to the appropriate calculation services
   *
   * @param event The market data event
   * @return Future representing the asynchronous operation
   */
  private CompletableFuture<?> processMarketDataEvent(MarketDataEvent event) {
    // Log the start of market data event processing
    log.info("Processing market data event: {}", event.getEventId());

    // Extract securityId from event
    String securityId = event.getSecurityId();

    // Get current business date using DateUtil.getCurrentDate()
    java.time.LocalDate businessDate = DateUtil.getCurrentDate();

    // Call positionCalculationService.calculatePositionsForSecurity(securityId, businessDate) to
    // update position data
    CompletableFuture<?> positionFuture =
        CompletableFuture.runAsync(
            () -> positionCalculationService.calculatePositionsForSecurity(securityId, businessDate));

    // Call inventoryCalculationService.calculateInventoryForSecurity(securityId, businessDate) to
    // update inventory data
    CompletableFuture<?> inventoryFuture =
        CompletableFuture.runAsync(
            () -> inventoryCalculationService.calculateInventoryForSecurity(securityId, businessDate));

    // Return a CompletableFuture.allOf() combining both service calls
    return CompletableFuture.allOf(positionFuture, inventoryFuture)
        .exceptionally(
            ex -> {
              // Add exception handling to log errors and complete the future exceptionally
              log.error("Error processing market data event: {}", event.getEventId(), ex);
              return null;
            });
  }

  /**
   * Processes a price update event
   *
   * @param event The market data event
   * @return Future representing the asynchronous operation
   */
  private CompletableFuture<?> processPriceUpdate(MarketDataEvent event) {
    // Log the start of price update processing
    log.info("Processing price update event: {}", event.getEventId());

    // Call processMarketDataEvent(event) to trigger position and inventory recalculations
    return processMarketDataEvent(event);
  }

  /**
   * Processes a NAV update event
   *
   * @param event The market data event
   * @return Future representing the asynchronous operation
   */
  private CompletableFuture<?> processNavUpdate(MarketDataEvent event) {
    // Log the start of NAV update processing
    log.info("Processing NAV update event: {}", event.getEventId());

    // Call processMarketDataEvent(event) to trigger position and inventory recalculations
    return processMarketDataEvent(event);
  }

  /**
   * Processes a volatility update event
   *
   * @param event The market data event
   * @return Future representing the asynchronous operation
   */
  private CompletableFuture<?> processVolatilityUpdate(MarketDataEvent event) {
    // Log the start of volatility update processing
    log.info("Processing volatility update event: {}", event.getEventId());

    // Call processMarketDataEvent(event) to trigger position and inventory recalculations
    return processMarketDataEvent(event);
  }

  /**
   * Processes a batch update event containing multiple market data updates
   *
   * @param event The market data event
   * @return Future representing the asynchronous operation
   */
  private CompletableFuture<?> processBatchUpdate(MarketDataEvent event) {
    // Log the start of batch update processing
    log.info("Processing batch update event: {}", event.getEventId());

    // Call processMarketDataEvent(event) to trigger position and inventory recalculations
    return processMarketDataEvent(event);
  }

  /**
   * Logs detailed information about a market data event
   *
   * @param event The market data event
   * @param key The key of the Kafka message
   * @param partition The partition of the Kafka message
   * @param offset The offset of the Kafka message
   */
  private void logEventDetails(MarketDataEvent event, String key, Long partition, Long offset) {
    // Log event details including event ID, type, security ID, effective time
    log.info(
        "Received MarketDataEvent - EventId: {}, EventType: {}, SecurityId: {}, EffectiveTime: {}",
        event.getEventId(),
        event.getEventType(),
        event.getSecurityId(),
        event.getEffectiveTime());

    // Log Kafka message details including key, partition, and offset
    log.info("Kafka - Key: {}, Partition: {}, Offset: {}", key, partition, offset);

    // Log event subtype (price update, NAV update, volatility update, batch update)
    if (event.isPriceUpdate()) {
      log.info("Event Subtype: Price Update");
    } else if (event.isNavUpdate()) {
      log.info("Event Subtype: NAV Update");
    } else if (event.isVolatilityUpdate()) {
      log.info("Event Subtype: Volatility Update");
    } else if (event.isBatchEvent()) {
      log.info("Event Subtype: Batch Update");
    }
  }
}