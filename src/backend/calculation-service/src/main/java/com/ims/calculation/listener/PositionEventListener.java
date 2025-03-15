package com.ims.calculation.listener;

import com.ims.calculation.service.InventoryCalculationService; // Internal dependency
import com.ims.calculation.service.PositionCalculationService; // Internal dependency
import com.ims.common.event.BaseEvent; // Internal dependency
import com.ims.common.event.PositionEvent; // Internal dependency
import lombok.RequiredArgsConstructor; // lombok version 1.18.26
import lombok.extern.slf4j.Slf4j; // lombok version 1.18.26
import org.springframework.kafka.annotation.KafkaListener; // Spring Kafka version 3.0.7
import org.springframework.kafka.support.KafkaHeaders; // Spring Kafka version 3.0.7
import org.springframework.messaging.handler.annotation.Header; // Spring Messaging version 6.0.9
import org.springframework.messaging.handler.annotation.Payload; // Spring Messaging version 6.0.9
import org.springframework.stereotype.Component; // Spring Framework version 6.0.9

import java.time.LocalDate; // JDK 17
import java.util.concurrent.CompletableFuture; // JDK 17

/**
 * Kafka listener component responsible for consuming position events from the message bus and
 * triggering appropriate calculations in the Inventory Management System.
 *
 * <p>This class handles the reception of position updates, validates them, and delegates to the
 * appropriate calculation services for position and inventory updates.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class PositionEventListener {

  private final PositionCalculationService positionCalculationService;
  private final InventoryCalculationService inventoryCalculationService;

  /**
   * Constructor that initializes the position event listener with required dependencies
   *
   * @param positionCalculationService Service for processing position calculations
   * @param inventoryCalculationService Service for processing inventory calculations
   */
  public PositionEventListener(
      PositionCalculationService positionCalculationService,
      InventoryCalculationService inventoryCalculationService) {
    this.positionCalculationService = positionCalculationService;
    this.inventoryCalculationService = inventoryCalculationService;
  }

  /**
   * Kafka listener method that consumes position events from the position events topic
   *
   * @param event The position event
   * @param key The key of the Kafka message
   * @param partition The partition of the Kafka message
   * @param offset The offset of the Kafka message
   */
  @KafkaListener(
      topics = "${app.kafka.topics.position-events}",
      groupId = "${app.kafka.consumer.group-id}")
  public void consumePositionEvents(
      @Payload PositionEvent event,
      @Header(KafkaHeaders.RECEIVED_MESSAGE_KEY) String key,
      @Header(KafkaHeaders.RECEIVED_PARTITION_ID) Long partition,
      @Header(KafkaHeaders.OFFSET) Long offset) {
    // Log the received position event with key, partition, and offset information
    logEventDetails(event, key, partition, offset);

    // Validate the position event using validatePositionEvent(event)
    if (!validatePositionEvent(event)) {
      // If validation fails, log an error and return
      log.error("Received invalid position event: {}", event);
      return;
    }

    // Process the position event based on its type (position update, start of day, settlement
    // ladder update)
    processPositionEvent(event);

    // Log the successful processing of the position event
    log.info("Successfully processed position event: {}", event.getEventId());
  }

  /**
   * Validates a position event before processing
   *
   * @param event The position event
   * @return True if the event is valid, false otherwise
   */
  private boolean validatePositionEvent(PositionEvent event) {
    // Check if event is not null
    if (event == null) {
      log.error("Position event is null");
      return false;
    }

    // Check if event.isValid() returns true
    if (!event.isValid()) {
      log.error("Base event validation failed for position event: {}", event);
      return false;
    }

    // Check if event.validate() returns true
    if (!event.validate()) {
      log.error("Position event validation failed: {}", event);
      return false;
    }

    // Check if bookId is not null or empty
    if (event.getBookId() == null || event.getBookId().isEmpty()) {
      log.error("Position event has no bookId: {}", event);
      return false;
    }

    // Check if securityId is not null or empty
    if (event.getSecurityId() == null || event.getSecurityId().isEmpty()) {
      log.error("Position event has no securityId: {}", event);
      return false;
    }

    // Check if businessDate is not null
    if (event.getBusinessDate() == null) {
      log.error("Position event has no businessDate: {}", event);
      return false;
    }

    // Return true if all checks pass, false otherwise
    return true;
  }

  /**
   * Processes a position event by delegating to the appropriate calculation services
   *
   * @param event The position event
   * @return Future representing the asynchronous operation
   */
  private CompletableFuture<?> processPositionEvent(PositionEvent event) {
    // Log the start of position event processing
    log.info("Starting position event processing: {}", event.getEventId());

    // Call positionCalculationService.processPositionEvent(event) to update position data
    CompletableFuture<?> positionFuture =
        CompletableFuture.runAsync(() -> positionCalculationService.processPositionEvent(event));

    // Call inventoryCalculationService.processPositionEvent(event) to update inventory data
    CompletableFuture<?> inventoryFuture =
        CompletableFuture.runAsync(() -> inventoryCalculationService.processPositionEvent(event));

    // Return a CompletableFuture.allOf() combining both service calls
    return CompletableFuture.allOf(positionFuture, inventoryFuture)
        .exceptionally(
            ex -> {
              // Add exception handling to log errors and complete the future exceptionally
              log.error("Error processing position event: {}", event.getEventId(), ex);
              return null;
            });
  }

  /**
   * Logs detailed information about a position event
   *
   * @param event The position event
   * @param key The key of the Kafka message
   * @param partition The partition of the Kafka message
   * @param offset The offset of the Kafka message
   */
  private void logEventDetails(PositionEvent event, String key, Long partition, Long offset) {
    // Log event details including event ID, type, book ID, security ID, business date
    log.info(
        "Received PositionEvent - EventId: {}, EventType: {}, BookId: {}, SecurityId: {}, BusinessDate: {}",
        event.getEventId(),
        event.getEventType(),
        event.getBookId(),
        event.getSecurityId(),
        event.getBusinessDate());

    // Log Kafka message details including key, partition, and offset
    log.info("Kafka - Key: {}, Partition: {}, Offset: {}", key, partition, offset);

    // Log event subtype (position update, start of day, settlement ladder update)
    log.info("Event Subtype: {}", event.getEventSubType());
  }
}