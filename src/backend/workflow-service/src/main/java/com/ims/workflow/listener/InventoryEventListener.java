package com.ims.workflow.listener;

import com.ims.common.event.InventoryEvent; // version: N/A
import com.ims.workflow.exception.WorkflowException;
import com.ims.workflow.model.LocateRequest;
import com.ims.workflow.model.OrderValidation;
import com.ims.workflow.publisher.WorkflowEventPublisher;
import com.ims.workflow.service.LocateService;
import com.ims.workflow.service.ShortSellService;
import java.util.List; // version: 17
import java.util.concurrent.atomic.AtomicInteger; // version: 17
import java.util.stream.Collectors; // version: 17
import lombok.RequiredArgsConstructor; // version: 1.18.26
import lombok.extern.slf4j.Slf4j; // version: 1.18.26
import org.springframework.kafka.annotation.KafkaListener; // version: 3.0.7
import org.springframework.kafka.support.KafkaHeaders; // version: 3.0.7
import org.springframework.messaging.handler.annotation.Header; // version: 6.0.9
import org.springframework.messaging.handler.annotation.Payload; // version: 6.0.9
import org.springframework.stereotype.Component; // version: 6.0.9
import org.springframework.transaction.annotation.Transactional; // version: 6.0.9

/**
 * Component responsible for consuming inventory-related events from Kafka and triggering
 * appropriate workflow actions based on the event type and content.
 *
 * <p>This listener processes inventory availability updates to support locate approval and short
 * sell validation workflows.
 */
@Component // Spring component annotation for dependency injection
@Slf4j // Logging facade
@RequiredArgsConstructor // Constructor injection for dependencies
public class InventoryEventListener {

  private final LocateService locateService;
  private final ShortSellService shortSellService;
  private final WorkflowEventPublisher eventPublisher;

  /**
   * Consumes inventory events from Kafka and processes them based on event type
   *
   * @param event The inventory event to process
   * @param topic The Kafka topic the event was received from
   * @param partition The Kafka partition the event was received from
   * @param offset The offset of the event in the Kafka partition
   */
  @KafkaListener(
      topics = "${kafka.topics.inventory-events}",
      groupId = "${kafka.consumer.workflow-group-id}",
      containerFactory = "inventoryEventKafkaListenerContainerFactory")
  @Transactional // Transaction management for database operations
  public void consumeInventoryEvent(
      @Payload InventoryEvent event,
      @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
      @Header(KafkaHeaders.RECEIVED_PARTITION_ID) Integer partition,
      @Header(KafkaHeaders.OFFSET) Long offset) {
    // Log the received inventory event with topic, partition, and offset
    log.info(
        "Received inventory event: topic={}, partition={}, offset={}, event={}",
        topic,
        partition,
        offset,
        event);

    // Validate the event using event.isValid()
    if (!event.isValid()) {
      log.warn("Invalid inventory event received: {}", event);
      return;
    }

    // Determine the event type and route to appropriate handler
    if (event.isForLoanUpdate()) {
      handleForLoanUpdate(event);
    } else if (event.isLocateUpdate()) {
      handleLocateUpdate(event);
    } else if (event.isShortSellUpdate()) {
      handleShortSellUpdate(event);
    } else {
      log.warn("Unknown inventory event type: {}", event.getEventType());
    }

    // Log the completion of event processing
    log.info("Finished processing inventory event: {}", event.getEventType());
  }

  /**
   * Handles for-loan inventory update events by processing pending locate requests
   *
   * @param event The inventory event
   * @return The number of locate requests processed
   */
  private int handleForLoanUpdate(InventoryEvent event) {
    // Log the start of for-loan update handling
    log.info("Handling for-loan inventory update for security: {}", event.getSecurityIdentifier());

    // Check if the event has available inventory using hasAvailability()
    if (!event.hasAvailability()) {
      log.warn("No availability for security: {}", event.getSecurityIdentifier());
      return 0;
    }

    // Get pending locate requests for the security in the event
    List<LocateRequest> pendingLocates = getPendingLocatesForSecurity(event.getSecurityIdentifier());

    // Create an atomic counter for processed requests
    AtomicInteger processedRequests = new AtomicInteger(0);

    // For each pending locate request:
    pendingLocates.forEach(
        request -> {
          // Process auto-approval using locateService.processAutoApproval()
          if (locateService.processAutoApproval(request)) {
            // Increment the counter if auto-approval was successful
            processedRequests.incrementAndGet();
          }
        });

    // Log the completion with number of requests processed
    log.info(
        "Processed {} locate requests for security: {}",
        processedRequests.get(),
        event.getSecurityIdentifier());

    // Return the number of processed requests
    return processedRequests.get();
  }

  /**
   * Handles locate-specific inventory update events
   *
   * @param event The inventory event
   * @return The number of locate requests processed
   */
  private int handleLocateUpdate(InventoryEvent event) {
    // Log the start of locate update handling
    log.info("Handling locate inventory update for security: {}", event.getSecurityIdentifier());

    // Check if the event has available inventory using hasAvailability()
    if (!event.hasAvailability()) {
      log.warn("No availability for security: {}", event.getSecurityIdentifier());
      return 0;
    }

    // Get pending locate requests for the security in the event
    List<LocateRequest> pendingLocates = getPendingLocatesForSecurity(event.getSecurityIdentifier());

    // Create an atomic counter for processed requests
    AtomicInteger processedRequests = new AtomicInteger(0);

    // For each pending locate request:
    pendingLocates.forEach(
        request -> {
          // Process auto-approval using locateService.processAutoApproval()
          if (locateService.processAutoApproval(request)) {
            // Increment the counter if auto-approval was successful
            processedRequests.incrementAndGet();
          }
        });

    // Log the completion with number of requests processed
    log.info(
        "Processed {} locate requests for security: {}",
        processedRequests.get(),
        event.getSecurityIdentifier());

    // Return the number of processed requests
    return processedRequests.get();
  }

  /**
   * Handles short sell inventory update events by processing pending order validations
   *
   * @param event The inventory event
   * @return The number of order validations processed
   */
  private int handleShortSellUpdate(InventoryEvent event) {
    // Log the start of short sell update handling
    log.info("Handling short sell inventory update for security: {}", event.getSecurityIdentifier());

    // Check if the event has available inventory using hasAvailability()
    if (!event.hasAvailability()) {
      log.warn("No availability for security: {}", event.getSecurityIdentifier());
      return 0;
    }

    // Get pending order validations for the security in the event
    List<OrderValidation> pendingValidations =
        getPendingOrderValidationsForSecurity(event.getSecurityIdentifier());

    // Create an atomic counter for processed validations
    AtomicInteger processedValidations = new AtomicInteger(0);

    // For each pending order validation:
    pendingValidations.forEach(
        validation -> {
          // Validate the order using shortSellService.validateOrder()
          shortSellService.validateOrder(validation);
          // Increment the counter if validation was successful
          processedValidations.incrementAndGet();
        });

    // Log the completion with number of validations processed
    log.info(
        "Processed {} order validations for security: {}",
        processedValidations.get(),
        event.getSecurityIdentifier());

    // Return the number of processed validations
    return processedValidations.get();
  }

  /**
   * Retrieves pending locate requests for a specific security
   *
   * @param securityId The security ID
   * @return List of pending locate requests for the security
   */
  private List<LocateRequest> getPendingLocatesForSecurity(String securityId) {
    // Get all pending locate requests from locateService
    List<LocateRequest> allPendingLocates = locateService.getPendingLocates();

    // Filter the requests to include only those for the specified security
    List<LocateRequest> filteredLocates =
        allPendingLocates.stream()
            .filter(request -> securityId.equals(request.getSecurity().getInternalId()))
            .collect(Collectors.toList());

    // Return the filtered list
    return filteredLocates;
  }

  /**
   * Retrieves pending locate requests for a specific security and client
   *
   * @param securityId The security ID
   * @param clientId The client ID
   * @return List of pending locate requests for the security and client
   */
  private List<LocateRequest> getPendingLocatesForSecurityAndClient(String securityId, String clientId) {
    // Get all pending locate requests from locateService
    List<LocateRequest> allPendingLocates = locateService.getPendingLocates();

    // Filter the requests to include only those for the specified security and client
    List<LocateRequest> filteredLocates =
        allPendingLocates.stream()
            .filter(
                request ->
                    securityId.equals(request.getSecurity().getInternalId())
                        && clientId.equals(request.getClient().getCounterpartyId()))
            .collect(Collectors.toList());

    // Return the filtered list
    return filteredLocates;
  }

  /**
   * Retrieves pending locate requests for a specific security and aggregation unit
   *
   * @param securityId The security ID
   * @param aggregationUnitId The aggregation unit ID
   * @return List of pending locate requests for the security and aggregation unit
   */
  private List<LocateRequest> getPendingLocatesForSecurityAndAggregationUnit(
      String securityId, String aggregationUnitId) {
    // Get all pending locate requests from locateService
    List<LocateRequest> allPendingLocates = locateService.getPendingLocates();

    // Filter the requests to include only those for the specified security and aggregation unit
    List<LocateRequest> filteredLocates =
        allPendingLocates.stream()
            .filter(
                request ->
                    securityId.equals(request.getSecurity().getInternalId())
                        && aggregationUnitId.equals(request.getAggregationUnit().getAggregationUnitId()))
            .collect(Collectors.toList());

    // Return the filtered list
    return filteredLocates;
  }

  /**
   * Retrieves pending order validations for a specific security
   *
   * @param securityId The security ID
   * @return List of pending order validations for the security
   */
  private List<OrderValidation> getPendingOrderValidationsForSecurity(String securityId) {
    // Get all pending order validations from shortSellService
    List<OrderValidation> allPendingValidations = shortSellService.getPendingValidations();

    // Filter the validations to include only those for the specified security
    List<OrderValidation> filteredValidations =
        allPendingValidations.stream()
            .filter(validation -> securityId.equals(validation.getSecurity().getInternalId()))
            .collect(Collectors.toList());

    // Return the filtered list
    return filteredValidations;
  }

  /**
   * Retrieves pending order validations for a specific security and client
   *
   * @param securityId The security ID
   * @param clientId The client ID
   * @return List of pending order validations for the security and client
   */
  private List<OrderValidation> getPendingOrderValidationsForSecurityAndClient(
      String securityId, String clientId) {
    // Get all pending order validations from shortSellService
    List<OrderValidation> allPendingValidations = shortSellService.getPendingValidations();

    // Filter the validations to include only those for the specified security and client
    List<OrderValidation> filteredValidations =
        allPendingValidations.stream()
            .filter(
                validation ->
                    securityId.equals(validation.getSecurity().getInternalId())
                        && clientId.equals(validation.getClient().getCounterpartyId()))
            .collect(Collectors.toList());

    // Return the filtered list
    return filteredValidations;
  }

  /**
   * Retrieves pending order validations for a specific security and aggregation unit
   *
   * @param securityId The security ID
   * @param aggregationUnitId The aggregation unit ID
   * @return List of pending order validations for the security and aggregation unit
   */
  private List<OrderValidation> getPendingOrderValidationsForSecurityAndAggregationUnit(
      String securityId, String aggregationUnitId) {
    // Get all pending order validations from shortSellService
    List<OrderValidation> allPendingValidations = shortSellService.getPendingValidations();

    // Filter the validations to include only those for the specified security and aggregation unit
    List<OrderValidation> filteredValidations =
        allPendingValidations.stream()
            .filter(
                validation ->
                    securityId.equals(validation.getSecurity().getInternalId())
                        && aggregationUnitId.equals(
                            validation.getAggregationUnit().getAggregationUnitId()))
            .collect(Collectors.toList());

    // Return the filtered list
    return filteredValidations;
  }
}