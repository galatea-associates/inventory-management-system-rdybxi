package com.ims.calculation.service;

import com.ims.calculation.engine.PositionEngine;
import com.ims.calculation.exception.CalculationException;
import com.ims.calculation.model.Position;
import com.ims.calculation.model.SettlementLadder;
import com.ims.calculation.publisher.CalculationEventPublisher;
import com.ims.calculation.repository.PositionRepository;
import com.ims.common.event.PositionEvent;
import com.ims.common.event.TradeDataEvent;
import com.ims.common.model.Security;
import java.time.LocalDate; // JDK 17
import java.util.List; // JDK 17
import java.util.Optional; // JDK 17
import java.util.concurrent.CompletableFuture; // JDK 17
import java.util.stream.Collectors; // JDK 17
import lombok.RequiredArgsConstructor; // lombok 1.18.26
import lombok.extern.slf4j.Slf4j; // lombok 1.18.26
import org.springframework.kafka.annotation.KafkaListener; // Spring Kafka 3.0.7
import org.springframework.scheduling.annotation.Async; // Spring Framework 6.0.9
import org.springframework.stereotype.Service; // Spring Framework 6.0.9
import org.springframework.transaction.annotation.Transactional; // Spring Framework 6.0.9

/**
 * Service class responsible for position calculation in the Inventory Management System.
 * Orchestrates the calculation of real-time positions, settlement ladders, and projected positions based on trade events and start-of-day positions.
 * This service provides high-performance, thread-safe processing to meet the system's throughput and latency requirements while ensuring accurate position data for inventory availability calculations.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class PositionCalculationService {

  private final PositionRepository positionRepository;
  private final PositionEngine positionEngine;
  private final CalculationEventPublisher eventPublisher;

  /**
   * Constructor that initializes the position calculation service with required dependencies
   *
   * @param positionRepository Repository for position data
   * @param positionEngine Engine for performing position calculations
   * @param eventPublisher Publisher for sending calculation events
   */
  public PositionCalculationService(
      PositionRepository positionRepository,
      PositionEngine positionEngine,
      CalculationEventPublisher eventPublisher) {
    this.positionRepository = positionRepository;
    this.positionEngine = positionEngine;
    this.eventPublisher = eventPublisher;
  }

  /**
   * Processes a trade event and updates the relevant position
   *
   * @param event The trade event to process
   * @return The updated position
   */
  public Position processTradeEvent(TradeDataEvent event) {
    log.info("Processing trade event: {}", event);
    // Validate the trade event data
    validateTradeEvent(event);
    // Delegate to positionEngine.processTradeEvent(event) for core calculation
    Position position = positionEngine.processTradeEvent(event);
    // Publish position update event via eventPublisher
    publishPositionUpdateEvent(position);
    // Return the updated position
    return position;
  }

  /**
   * Processes a position event and updates the relevant position
   *
   * @param event The position event to process
   * @return The updated position
   */
  public Position processPositionEvent(PositionEvent event) {
    log.info("Processing position event: {}", event);
    // Validate the position event data
    validatePositionEvent(event);
    // Delegate to positionEngine.processPositionEvent(event) for core calculation
    Position position = positionEngine.processPositionEvent(event);
    // Publish position update event via eventPublisher
    publishPositionUpdateEvent(position);
    // Return the updated position
    return position;
  }

  /**
   * Calculates all positions for a specific business date
   *
   * @param businessDate The business date
   * @return The calculated positions
   */
  public List<Position> calculatePositions(LocalDate businessDate) {
    log.info("Calculating all positions for business date: {}", businessDate);
    // Retrieve all positions for the business date from repository
    List<Position> positions = positionRepository.findByBusinessDate(businessDate);
    // Delegate to positionEngine.processPositionsAsync(positions) for parallel processing
    List<Position> processedPositions = positionEngine.processPositionsAsync(positions);
    // Publish position update events for all calculated positions
    publishPositionUpdateEvents(processedPositions);
    // Return the calculated positions
    return processedPositions;
  }

  /**
   * Calculates all positions for a specific security and business date
   *
   * @param security The security
   * @param businessDate The business date
   * @return The calculated positions for the security
   */
  public List<Position> calculatePositionsForSecurity(Security security, LocalDate businessDate) {
    log.info(
        "Calculating all positions for security: {} and business date: {}",
        security.getInternalId(),
        businessDate);
    // Retrieve all positions for the security and business date from repository
    List<Position> positions =
        positionRepository.findBySecurityAndBusinessDate(security, businessDate);
    // Delegate to positionEngine.processPositionsAsync(positions) for parallel processing
    List<Position> processedPositions = positionEngine.processPositionsAsync(positions);
    // Publish position update events for all calculated positions
    publishPositionUpdateEvents(processedPositions);
    // Return the calculated positions
    return processedPositions;
  }

  /**
   * Calculates a single position
   *
   * @param bookId The book ID
   * @param security The security
   * @param businessDate The business date
   * @return The calculated position
   */
  public Position calculatePosition(String bookId, Security security, LocalDate businessDate) {
    log.info(
        "Calculating position for bookId: {}, security: {}, and businessDate: {}",
        bookId,
        security.getInternalId(),
        businessDate);
    // Find the position by bookId, security, and businessDate
    Optional<Position> optionalPosition =
        positionRepository.findByBookIdAndSecurityAndBusinessDate(bookId, security, businessDate);
    // If position not found, throw CalculationException
    Position position =
        optionalPosition.orElseThrow(
            () ->
                CalculationException.forPositionCalculation(
                    security, businessDate, "Position not found"));
    // Calculate current position using positionEngine.calculateCurrentPosition
    position = positionEngine.calculateCurrentPosition(position);
    // Calculate settlement ladder using positionEngine.calculateSettlementLadder
    positionEngine.calculateSettlementLadder(position);
    // Calculate projected position using positionEngine.calculateProjectedPosition
    positionEngine.calculateProjectedPosition(position);
    // Update calculation status to VALID
    position.updateCalculationStatus("VALID", LocalDate.now());
    // Save position to repository
    position = positionRepository.save(position);
    // Publish position update event
    publishPositionUpdateEvent(position);
    // Return the calculated position
    return position;
  }

  /**
   * Recalculates positions with a specific calculation status for a business date
   *
   * @param businessDate The business date
   * @param calculationStatus The calculation status
   * @return The recalculated positions
   */
  public List<Position> recalculatePositions(LocalDate businessDate, String calculationStatus) {
    log.info(
        "Recalculating positions with status: {} for business date: {}",
        calculationStatus,
        businessDate);
    // Retrieve positions with the specified calculation status for the business date
    List<Position> positions =
        positionRepository.findByBusinessDateAndCalculationStatus(businessDate, calculationStatus);
    // Delegate to positionEngine.processPositionsAsync(positions) for parallel processing
    List<Position> processedPositions = positionEngine.processPositionsAsync(positions);
    // Publish position update events for all recalculated positions
    publishPositionUpdateEvents(processedPositions);
    // Return the recalculated positions
    return processedPositions;
  }

  /**
   * Calculates the settlement ladder for a position
   *
   * @param position The position
   * @return The calculated settlement ladder
   */
  public SettlementLadder calculateSettlementLadder(Position position) {
    log.info("Calculating settlement ladder for position: {}", position.getId());
    // Delegate to positionEngine.calculateSettlementLadder(position)
    return positionEngine.calculateSettlementLadder(position);
  }

  /**
   * Calculates the current position based on settled quantity and contractual quantity
   *
   * @param position The position
   * @return The position with calculated current net position
   */
  public Position calculateCurrentPosition(Position position) {
    log.info("Calculating current position for position: {}", position.getId());
    // Delegate to positionEngine.calculateCurrentPosition(position)
    return positionEngine.calculateCurrentPosition(position);
  }

  /**
   * Calculates the projected position based on current position and settlement ladder
   *
   * @param position The position
   * @return The position with calculated projected net position
   */
  public Position calculateProjectedPosition(Position position) {
    log.info("Calculating projected position for position: {}", position.getId());
    // Delegate to positionEngine.calculateProjectedPosition(position)
    return positionEngine.calculateProjectedPosition(position);
  }

  /**
   * Processes start-of-day positions for a business date
   *
   * @param positions The list of start of day positions
   * @param businessDate The business date
   * @return The processed positions
   */
  public List<Position> processStartOfDayPositions(List<Position> positions, LocalDate businessDate) {
    log.info("Processing start-of-day positions for business date: {}", businessDate);
    // Validate input parameters
    if (positions == null || positions.isEmpty()) {
      throw new IllegalArgumentException("Positions list cannot be null or empty");
    }
    if (businessDate == null) {
      throw new IllegalArgumentException("Business date cannot be null");
    }
    // For each position, set isStartOfDay to true
    positions.forEach(position -> position.setIsStartOfDay(true));
    // Save all positions to repository
    positionRepository.saveAll(positions);
    // Calculate all positions using calculatePositions(businessDate)
    return calculatePositions(businessDate);
  }

  /**
   * Kafka listener for trade events
   *
   * @param event The trade event
   */
  @KafkaListener(
      topics = "${app.kafka.topics.trade-events}",
      groupId = "${app.kafka.consumer.group-id}")
  public void consumeTradeEvents(TradeDataEvent event) {
    log.info("Received trade event: {}", event);
    // Process the trade event using processTradeEvent(event)
    processTradeEvent(event);
    log.info("Successfully processed trade event: {}", event.getTradeId());
  }

  /**
   * Kafka listener for position events
   *
   * @param event The position event
   */
  @KafkaListener(
      topics = "${app.kafka.topics.position-events}",
      groupId = "${app.kafka.consumer.group-id}")
  public void consumePositionEvents(PositionEvent event) {
    log.info("Received position event: {}", event);
    // Process the position event using processPositionEvent(event)
    processPositionEvent(event);
    log.info("Successfully processed position event: {}", event.getEventId());
  }

  /**
   * Validates a trade event before processing
   *
   * @param event The trade event
   * @return True if the event is valid, false otherwise
   */
  private boolean validateTradeEvent(TradeDataEvent event) {
    if (event == null) {
      log.error("Trade event is null");
      return false;
    }

    if (event.getBookId() == null || event.getBookId().isEmpty()) {
      log.error("Trade event has no book ID: {}", event);
      return false;
    }

    if (event.getSecurityId() == null || event.getSecurityId().isEmpty()) {
      log.error("Trade event has no security ID: {}", event);
      return false;
    }

    if (event.getTradeDate() == null) {
      log.error("Trade event has no trade date: {}", event);
      return false;
    }

    if (event.getQuantity() == null || event.getQuantity().compareTo(java.math.BigDecimal.ZERO) == 0) {
      log.error("Trade event has no quantity or zero quantity: {}", event);
      return false;
    }

    return true;
  }

  /**
   * Validates a position event before processing
   *
   * @param event The position event
   * @return True if the event is valid, false otherwise
   */
  private boolean validatePositionEvent(PositionEvent event) {
    if (event == null) {
      log.error("Position event is null");
      return false;
    }

    if (event.getBookId() == null || event.getBookId().isEmpty()) {
      log.error("Position event has no book ID: {}", event);
      return false;
    }

    if (event.getSecurityId() == null || event.getSecurityId().isEmpty()) {
      log.error("Position event has no security ID: {}", event);
      return false;
    }

    if (event.getBusinessDate() == null) {
      log.error("Position event has no business date: {}", event);
      return false;
    }

    return true;
  }

  /**
   * Publishes a position update event
   *
   * @param position The position
   * @return Future representing the asynchronous operation
   */
  @Async
  public CompletableFuture<?> publishPositionUpdateEvent(Position position) {
    log.info("Publishing position event for position: {}", position.getId());
    // Delegate to eventPublisher.publishPositionEvent(position, 'POSITION_UPDATE')
    return eventPublisher.publishPositionEvent(position, "POSITION_UPDATE");
  }

  /**
   * Publishes multiple position update events
   *
   * @param positions The list of positions
   * @return List of futures representing the asynchronous operations
   */
  @Async
  public List<CompletableFuture<?>> publishPositionUpdateEvents(List<Position> positions) {
    log.info("Publishing batch of position events");
    // Delegate to eventPublisher.publishPositionEvents(positions, 'POSITION_UPDATE')
    return eventPublisher.publishPositionEvents(positions, "POSITION_UPDATE");
  }
}