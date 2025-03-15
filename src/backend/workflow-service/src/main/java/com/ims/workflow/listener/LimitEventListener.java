package com.ims.workflow.listener;

import com.ims.calculation.model.AggregationUnitLimit; // Import AggregationUnitLimit class from calculation-service, version: N/A
import com.ims.calculation.model.ClientLimit; // Import ClientLimit class from calculation-service, version: N/A
import com.ims.common.event.AggregationUnitLimitEvent; // Import AggregationUnitLimitEvent class from common-lib, version: 1.0.0
import com.ims.common.event.ClientLimitEvent; // Import ClientLimitEvent class from common-lib, version: 1.0.0
import com.ims.workflow.exception.WorkflowException; // Import WorkflowException class from workflow-service, version: N/A
import com.ims.workflow.model.OrderValidation; // Import OrderValidation class from workflow-service, version: N/A
import com.ims.workflow.publisher.WorkflowEventPublisher; // Import WorkflowEventPublisher class from workflow-service, version: N/A
import com.ims.workflow.service.ShortSellService; // Import ShortSellService class from workflow-service, version: N/A
import java.util.List; // Import List class from java.util, version: 17
import java.util.concurrent.atomic.AtomicInteger; // Import AtomicInteger class from java.util.concurrent.atomic, version: 17
import java.util.stream.Collectors; // Import Collectors class from java.util.stream, version: 17
import lombok.RequiredArgsConstructor; // Import RequiredArgsConstructor class from lombok, version: 1.18.26
import lombok.extern.slf4j.Slf4j; // Import Slf4j class from lombok.extern.slf4j, version: 1.18.26
import org.springframework.kafka.annotation.KafkaListener; // Import KafkaListener class from org.springframework.kafka.annotation, version: 3.0.7
import org.springframework.kafka.support.KafkaHeaders; // Import KafkaHeaders class from org.springframework.kafka.support, version: 3.0.7
import org.springframework.messaging.handler.annotation.Header; // Import Header class from org.springframework.messaging.handler.annotation, version: 6.0.9
import org.springframework.messaging.handler.annotation.Payload; // Import Payload class from org.springframework.messaging.handler.annotation, version: 6.0.9
import org.springframework.stereotype.Component; // Import Component class from org.springframework.stereotype, version: 6.0.9
import org.springframework.transaction.annotation.Transactional; // Import Transactional class from org.springframework.transaction.annotation, version: 6.0.9

/**
 * Kafka listener component responsible for consuming limit-related events from the message bus and triggering appropriate workflow actions in the Inventory Management System.
 * This listener processes client limit and aggregation unit limit updates to support short sell validation workflows, ensuring orders are validated against the latest available limits.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class LimitEventListener {

  private final ShortSellService shortSellService;
  private final WorkflowEventPublisher eventPublisher;

  /**
   * Consumes client limit events from Kafka and processes them
   *
   * @param event ClientLimitEvent containing the client limit update
   * @param topic Kafka topic from which the event was received
   * @param partition Kafka partition from which the event was received
   * @param offset Kafka offset of the received event
   */
  @KafkaListener(
      topics = "${kafka.topics.client-limit-events}",
      groupId = "${kafka.consumer.workflow-group-id}",
      containerFactory = "clientLimitEventKafkaListenerContainerFactory")
  @Transactional
  public void consumeClientLimitEvent(
      @Payload ClientLimitEvent event,
      @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
      @Header(KafkaHeaders.RECEIVED_PARTITION_ID) Integer partition,
      @Header(KafkaHeaders.OFFSET) Long offset) {
    // Log the received client limit event with topic, partition, and offset
    log.info(
        "Received ClientLimitEvent from topic: {}, partition: {}, offset: {}, event: {}",
        topic,
        partition,
        offset,
        event);

    // Validate the event using event.isValid()
    if (!event.isValid()) {
      // If not valid, log error and return
      log.error("Invalid ClientLimitEvent received: {}", event);
      return;
    }

    // Create a ClientLimit object from the event data
    ClientLimit clientLimit = createClientLimitFromEvent(event);

    // Update the client limit in the system using shortSellService.updateClientLimit()
    ClientLimit updatedLimit = shortSellService.updateClientLimit(clientLimit);

    if (updatedLimit == null) {
      log.error("Failed to update client limit for client: {}, security: {}", clientLimit.getClientId(), clientLimit.getSecurityId());
      return;
    }

    // Process pending order validations affected by this limit update
    int processedValidations = handleClientLimitUpdate(clientLimit);

    // Log the completion of event processing
    log.info(
        "Processed ClientLimitEvent for client: {}, security: {}, validations: {}",
        clientLimit.getClientId(),
        clientLimit.getSecurityId(),
        processedValidations);
  }

  /**
   * Consumes aggregation unit limit events from Kafka and processes them
   *
   * @param event AggregationUnitLimitEvent containing the aggregation unit limit update
   * @param topic Kafka topic from which the event was received
   * @param partition Kafka partition from which the event was received
   * @param offset Kafka offset of the received event
   */
  @KafkaListener(
      topics = "${kafka.topics.aggregation-unit-limit-events}",
      groupId = "${kafka.consumer.workflow-group-id}",
      containerFactory = "aggregationUnitLimitEventKafkaListenerContainerFactory")
  @Transactional
  public void consumeAggregationUnitLimitEvent(
      @Payload AggregationUnitLimitEvent event,
      @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
      @Header(KafkaHeaders.RECEIVED_PARTITION_ID) Integer partition,
      @Header(KafkaHeaders.OFFSET) Long offset) {
    // Log the received aggregation unit limit event with topic, partition, and offset
    log.info(
        "Received AggregationUnitLimitEvent from topic: {}, partition: {}, offset: {}, event: {}",
        topic,
        partition,
        offset,
        event);

    // Validate the event using event.isValid()
    if (!event.isValid()) {
      // If not valid, log error and return
      log.error("Invalid AggregationUnitLimitEvent received: {}", event);
      return;
    }

    // Create an AggregationUnitLimit object from the event data
    AggregationUnitLimit aggregationUnitLimit = createAggregationUnitLimitFromEvent(event);

    // Apply market-specific rules using aggregationUnitLimit.applyMarketSpecificRules()
    aggregationUnitLimit.applyMarketSpecificRules();

    // Update the aggregation unit limit in the system using
    // shortSellService.updateAggregationUnitLimit()
    AggregationUnitLimit updatedLimit = shortSellService.updateAggregationUnitLimit(aggregationUnitLimit);

    if (updatedLimit == null) {
      log.error("Failed to update aggregation unit limit for AU: {}, security: {}", aggregationUnitLimit.getAggregationUnitId(), aggregationUnitLimit.getSecurityId());
      return;
    }

    // Process pending order validations affected by this limit update
    int processedValidations = handleAggregationUnitLimitUpdate(aggregationUnitLimit);

    // Log the completion of event processing
    log.info(
        "Processed AggregationUnitLimitEvent for AU: {}, security: {}, validations: {}",
        aggregationUnitLimit.getAggregationUnitId(),
        aggregationUnitLimit.getSecurityId(),
        processedValidations);
  }

  /**
   * Handles client limit update events by processing pending order validations
   *
   * @param clientLimit ClientLimit object representing the updated client limit
   * @return Number of order validations processed
   */
  private int handleClientLimitUpdate(ClientLimit clientLimit) {
    // Log the start of client limit update handling
    log.info(
        "Handling client limit update for client: {}, security: {}",
        clientLimit.getClientId(),
        clientLimit.getSecurityId());

    // Check if the client limit is active using isActive()
    if (!clientLimit.isActive()) {
      // If not active, log and return 0
      log.warn(
          "Client limit is not active for client: {}, security: {}",
          clientLimit.getClientId(),
          clientLimit.getSecurityId());
      return 0;
    }

    // Get pending order validations for the client and security
    List<OrderValidation> pendingValidations =
        getPendingOrderValidationsForClientAndSecurity(
            clientLimit.getClientId(), clientLimit.getSecurityId());

    // Create an atomic counter for processed validations
    AtomicInteger processedCount = new AtomicInteger(0);

    // For each pending order validation:
    pendingValidations.forEach(
        validation -> {
          // Validate the order using shortSellService.validateOrder()
          OrderValidation updatedValidation = shortSellService.validateOrder(validation);

          if (updatedValidation.isApproved() || updatedValidation.isRejected()) {
            // Increment the counter if validation was successful
            processedCount.incrementAndGet();
          }
        });

    // Log the completion with number of validations processed
    log.info(
        "Completed client limit update handling for client: {}, security: {}, validations: {}",
        clientLimit.getClientId(),
        clientLimit.getSecurityId(),
        processedCount.get());

    // Return the number of processed validations
    return processedCount.get();
  }

  /**
   * Handles aggregation unit limit update events by processing pending order validations
   *
   * @param aggregationUnitLimit AggregationUnitLimit object representing the updated aggregation
   *     unit limit
   * @return Number of order validations processed
   */
  private int handleAggregationUnitLimitUpdate(AggregationUnitLimit aggregationUnitLimit) {
    // Log the start of aggregation unit limit update handling
    log.info(
        "Handling aggregation unit limit update for AU: {}, security: {}",
        aggregationUnitLimit.getAggregationUnitId(),
        aggregationUnitLimit.getSecurityId());

    // Check if the aggregation unit limit is active using isActive()
    if (!aggregationUnitLimit.isActive()) {
      // If not active, log and return 0
      log.warn(
          "Aggregation unit limit is not active for AU: {}, security: {}",
          aggregationUnitLimit.getAggregationUnitId(),
          aggregationUnitLimit.getSecurityId());
      return 0;
    }

    // Get pending order validations for the aggregation unit and security
    List<OrderValidation> pendingValidations =
        getPendingOrderValidationsForAggregationUnitAndSecurity(
            aggregationUnitLimit.getAggregationUnitId(), aggregationUnitLimit.getSecurityId());

    // Create an atomic counter for processed validations
    AtomicInteger processedCount = new AtomicInteger(0);

    // For each pending order validation:
    pendingValidations.forEach(
        validation -> {
          // Validate the order using shortSellService.validateOrder()
          OrderValidation updatedValidation = shortSellService.validateOrder(validation);

          if (updatedValidation.isApproved() || updatedValidation.isRejected()) {
            // Increment the counter if validation was successful
            processedCount.incrementAndGet();
          }
        });

    // Log the completion with number of validations processed
    log.info(
        "Completed aggregation unit limit update handling for AU: {}, security: {}, validations: {}",
        aggregationUnitLimit.getAggregationUnitId(),
        aggregationUnitLimit.getSecurityId(),
        processedCount.get());

    // Return the number of processed validations
    return processedCount.get();
  }

  /**
   * Retrieves pending order validations for a specific client and security
   *
   * @param clientId Client ID
   * @param securityId Security ID
   * @return List of pending order validations for the client and security
   */
  private List<OrderValidation> getPendingOrderValidationsForClientAndSecurity(
      String clientId, String securityId) {
    // Get all pending order validations from shortSellService
    List<OrderValidation> allValidations = shortSellService.getPendingValidations();

    // Filter the validations to include only those for the specified client and security
    return allValidations.stream()
        .filter(
            validation ->
                clientId.equals(validation.getClientId())
                    && securityId.equals(validation.getSecurityId()))
        .collect(Collectors.toList());
  }

  /**
   * Retrieves pending order validations for a specific aggregation unit and security
   *
   * @param aggregationUnitId Aggregation Unit ID
   * @param securityId Security ID
   * @return List of pending order validations for the aggregation unit and security
   */
  private List<OrderValidation> getPendingOrderValidationsForAggregationUnitAndSecurity(
      String aggregationUnitId, String securityId) {
    // Get all pending order validations from shortSellService
    List<OrderValidation> allValidations = shortSellService.getPendingValidations();

    // Filter the validations to include only those for the specified aggregation unit and security
    return allValidations.stream()
        .filter(
            validation ->
                aggregationUnitId.equals(validation.getAggregationUnitId())
                    && securityId.equals(validation.getSecurityId()))
        .collect(Collectors.toList());
  }

  /**
   * Creates a ClientLimit object from a ClientLimitEvent
   *
   * @param event ClientLimitEvent containing the data for the ClientLimit
   * @return The created ClientLimit object
   */
  private ClientLimit createClientLimitFromEvent(ClientLimitEvent event) {
    // Create a new ClientLimit object
    ClientLimit clientLimit = new ClientLimit();

    // Set clientId from event.clientId
    clientLimit.setClientId(event.getClientId());

    // Set securityId from event.securityId
    clientLimit.setSecurityId(event.getSecurityId());

    // Set businessDate from event.businessDate
    clientLimit.setBusinessDate(event.getBusinessDate());

    // Set longSellLimit from event.longSellLimit
    clientLimit.setLongSellLimit(event.getLongSellLimit());

    // Set shortSellLimit from event.shortSellLimit
    clientLimit.setShortSellLimit(event.getShortSellLimit());

    // Set longSellUsed from event.longSellUsed
    // clientLimit.setLongSellUsed(event.getLongSellUsed());  // Assuming this field exists in
    // ClientLimitEvent

    // Set shortSellUsed from event.shortSellUsed
    // clientLimit.setShortSellUsed(event.getShortSellUsed()); // Assuming this field exists in
    // ClientLimitEvent

    // Set status from event.status
    clientLimit.setStatus(event.getStatus());

    // Return the created ClientLimit object
    return clientLimit;
  }

  /**
   * Creates an AggregationUnitLimit object from an AggregationUnitLimitEvent
   *
   * @param event AggregationUnitLimitEvent containing the data for the AggregationUnitLimit
   * @return The created AggregationUnitLimit object
   */
  private AggregationUnitLimit createAggregationUnitLimitFromEvent(
      AggregationUnitLimitEvent event) {
    // Create a new AggregationUnitLimit object
    AggregationUnitLimit aggregationUnitLimit = new AggregationUnitLimit();

    // Set aggregationUnitId from event.aggregationUnitId
    aggregationUnitLimit.setAggregationUnitId(event.getAggregationUnitId());

    // Set securityId from event.securityId
    aggregationUnitLimit.setSecurityId(event.getSecurityId());

    // Set businessDate from event.businessDate
    aggregationUnitLimit.setBusinessDate(event.getBusinessDate());

    // Set longSellLimit from event.longSellLimit
    aggregationUnitLimit.setLongSellLimit(event.getLongSellLimit());

    // Set shortSellLimit from event.shortSellLimit
    aggregationUnitLimit.setShortSellLimit(event.getShortSellLimit());

    // Set longSellUsed from event.longSellUsed
    // aggregationUnitLimit.setLongSellUsed(event.getLongSellUsed()); // Assuming this field
    // exists in AggregationUnitLimitEvent

    // Set shortSellUsed from event.shortSellUsed
    // aggregationUnitLimit.setShortSellUsed(event.getShortSellUsed()); // Assuming this field
    // exists in AggregationUnitLimitEvent

    // Set status from event.status
    aggregationUnitLimit.setStatus(event.getStatus());

    // Set marketSpecificRules from event.marketSpecificRules
    // aggregationUnitLimit.setMarketSpecificRules(event.getMarketSpecificRules()); // Assuming
    // this field exists in AggregationUnitLimitEvent

    // Return the created AggregationUnitLimit object
    return aggregationUnitLimit;
  }
}