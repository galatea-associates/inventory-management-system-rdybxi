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
import java.math.BigDecimal; // JDK 17
import java.time.LocalDate; // JDK 17
import java.util.List; // JDK 17
import java.util.ArrayList; // JDK 17
import java.util.Optional; // JDK 17
import java.util.concurrent.CompletableFuture; // JDK 17
import org.junit.jupiter.api.Test; // JUnit 5.9.2
import org.junit.jupiter.api.BeforeEach; // JUnit 5.9.2
import org.junit.jupiter.api.DisplayName; // JUnit 5.9.2
import org.junit.jupiter.api.extension.ExtendWith; // JUnit 5.9.2
import org.mockito.Mock; // Mockito 4.8.1
import org.mockito.InjectMocks; // Mockito 4.8.1
import org.mockito.Mockito; // Mockito 4.8.1
import org.mockito.junit.jupiter.MockitoExtension; // Mockito 4.8.1
import org.mockito.ArgumentCaptor; // Mockito 4.8.1
import org.assertj.core.api.Assertions; // AssertJ 3.23.1

/**
 * Test class for PositionCalculationService that verifies the functionality of position
 * calculation, settlement ladder projection, and position event processing.
 */
@ExtendWith(MockitoExtension.class)
class PositionCalculationServiceTest {

  @Mock private PositionRepository positionRepository;

  @Mock private PositionEngine positionEngine;

  @Mock private CalculationEventPublisher eventPublisher;

  @InjectMocks private PositionCalculationService positionCalculationService;

  private LocalDate businessDate;
  private Security security;

  /** Set up test fixtures before each test */
  @BeforeEach
  void setUp() {
    // Initialize businessDate to LocalDate.now()
    businessDate = LocalDate.now();

    // Initialize security with a test security using Security.builder()
    security = Security.builder().internalId("SEC001").build();

    // Configure mock behavior for common method calls
    Mockito.when(security.getInternalId()).thenReturn("SEC001");
  }

  /** Test processing a trade event */
  @Test
  @DisplayName("Should process trade event successfully")
  void testProcessTradeEvent() {
    // Create a test TradeDataEvent
    TradeDataEvent tradeEvent = createTestTradeEvent();

    // Create a test Position
    Position position = createTestPosition();

    // Mock positionEngine.processTradeEvent() to return the test position
    Mockito.when(positionEngine.processTradeEvent(tradeEvent)).thenReturn(position);

    // Mock eventPublisher.publishPositionEvent() to return a completed future
    Mockito.when(eventPublisher.publishPositionUpdateEvent(position))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call positionCalculationService.processTradeEvent() with the test event
    Position result = positionCalculationService.processTradeEvent(tradeEvent);

    // Verify positionEngine.processTradeEvent() was called with the event
    Mockito.verify(positionEngine).processTradeEvent(tradeEvent);

    // Verify eventPublisher.publishPositionEvent() was called with the position
    Mockito.verify(eventPublisher).publishPositionUpdateEvent(position);

    // Assert that the returned position matches the expected position
    Assertions.assertThat(result).isEqualTo(position);
  }

  /** Test processing a position event */
  @Test
  @DisplayName("Should process position event successfully")
  void testProcessPositionEvent() {
    // Create a test PositionEvent
    PositionEvent positionEvent = createTestPositionEvent();

    // Create a test Position
    Position position = createTestPosition();

    // Mock positionEngine.processPositionEvent() to return the test position
    Mockito.when(positionEngine.processPositionEvent(positionEvent)).thenReturn(position);

    // Mock eventPublisher.publishPositionEvent() to return a completed future
    Mockito.when(eventPublisher.publishPositionUpdateEvent(position))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call positionCalculationService.processPositionEvent() with the test event
    Position result = positionCalculationService.processPositionEvent(positionEvent);

    // Verify positionEngine.processPositionEvent() was called with the event
    Mockito.verify(positionEngine).processPositionEvent(positionEvent);

    // Verify eventPublisher.publishPositionEvent() was called with the position
    Mockito.verify(eventPublisher).publishPositionUpdateEvent(position);

    // Assert that the returned position matches the expected position
    Assertions.assertThat(result).isEqualTo(position);
  }

  /** Test calculating all positions for a business date */
  @Test
  @DisplayName("Should calculate all positions for a business date")
  void testCalculatePositions() {
    // Create a list of test positions
    List<Position> positions = createTestPositionList();

    // Mock positionRepository.findByBusinessDate() to return the test positions
    Mockito.when(positionRepository.findByBusinessDate(businessDate)).thenReturn(positions);

    // Mock positionEngine.processPositionsAsync() to return the same positions
    Mockito.when(positionEngine.processPositionsAsync(positions)).thenReturn(positions);

    // Mock eventPublisher.publishPositionEvents() to return a list of completed futures
    Mockito.when(eventPublisher.publishPositionUpdateEvents(positions))
        .thenReturn(List.of(CompletableFuture.completedFuture(null)));

    // Call positionCalculationService.calculatePositions() with the business date
    List<Position> result = positionCalculationService.calculatePositions(businessDate);

    // Verify positionRepository.findByBusinessDate() was called with the business date
    Mockito.verify(positionRepository).findByBusinessDate(businessDate);

    // Verify positionEngine.processPositionsAsync() was called with the positions
    Mockito.verify(positionEngine).processPositionsAsync(positions);

    // Verify eventPublisher.publishPositionEvents() was called with the positions
    Mockito.verify(eventPublisher).publishPositionUpdateEvents(positions);

    // Assert that the returned positions match the expected positions
    Assertions.assertThat(result).isEqualTo(positions);
  }

  /** Test calculating positions for a specific security and business date */
  @Test
  @DisplayName("Should calculate positions for a specific security and business date")
  void testCalculatePositionsForSecurity() {
    // Create a list of test positions for the security
    List<Position> positions = createTestPositionList();

    // Mock positionRepository.findBySecurityAndBusinessDate() to return the test positions
    Mockito.when(positionRepository.findBySecurityAndBusinessDate(security, businessDate))
        .thenReturn(positions);

    // Mock positionEngine.processPositionsAsync() to return the same positions
    Mockito.when(positionEngine.processPositionsAsync(positions)).thenReturn(positions);

    // Mock eventPublisher.publishPositionEvents() to return a list of completed futures
    Mockito.when(eventPublisher.publishPositionUpdateEvents(positions))
        .thenReturn(List.of(CompletableFuture.completedFuture(null)));

    // Call positionCalculationService.calculatePositionsForSecurity() with the security and
    // business date
    List<Position> result =
        positionCalculationService.calculatePositionsForSecurity(security, businessDate);

    // Verify positionRepository.findBySecurityAndBusinessDate() was called with the security and
    // business date
    Mockito.verify(positionRepository).findBySecurityAndBusinessDate(security, businessDate);

    // Verify positionEngine.processPositionsAsync() was called with the positions
    Mockito.verify(positionEngine).processPositionsAsync(positions);

    // Verify eventPublisher.publishPositionEvents() was called with the positions
    Mockito.verify(eventPublisher).publishPositionUpdateEvents(positions);

    // Assert that the returned positions match the expected positions
    Assertions.assertThat(result).isEqualTo(positions);
  }

  /** Test calculating a single position */
  @Test
  @DisplayName("Should calculate a single position")
  void testCalculatePosition() {
    // Create a test position
    Position position = createTestPosition();

    // Mock positionRepository.findByBookIdAndSecurityAndBusinessDate() to return Optional.of(position)
    Mockito.when(
            positionRepository.findByBookIdAndSecurityAndBusinessDate(
                position.getBookId(), security, businessDate))
        .thenReturn(Optional.of(position));

    // Mock positionEngine.calculateCurrentPosition() to return the position
    Mockito.when(positionEngine.calculateCurrentPosition(position)).thenReturn(position);

    // Mock positionEngine.calculateSettlementLadder() to return a settlement ladder
    SettlementLadder settlementLadder = SettlementLadder.builder().build();
    Mockito.when(positionEngine.calculateSettlementLadder(position)).thenReturn(settlementLadder);

    // Mock positionEngine.calculateProjectedPosition() to return the position
    Mockito.when(positionEngine.calculateProjectedPosition(position)).thenReturn(position);

    // Mock positionRepository.save() to return the position
    Mockito.when(positionRepository.save(position)).thenReturn(position);

    // Mock eventPublisher.publishPositionEvent() to return a completed future
    Mockito.when(eventPublisher.publishPositionUpdateEvent(position))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call positionCalculationService.calculatePosition() with bookId, security, and businessDate
    Position result =
        positionCalculationService.calculatePosition(position.getBookId(), security, businessDate);

    // Verify positionRepository.findByBookIdAndSecurityAndBusinessDate() was called
    Mockito.verify(positionRepository)
        .findByBookIdAndSecurityAndBusinessDate(position.getBookId(), security, businessDate);

    // Verify positionEngine.calculateCurrentPosition() was called
    Mockito.verify(positionEngine).calculateCurrentPosition(position);

    // Verify positionEngine.calculateSettlementLadder() was called
    Mockito.verify(positionEngine).calculateSettlementLadder(position);

    // Verify positionEngine.calculateProjectedPosition() was called
    Mockito.verify(positionEngine).calculateProjectedPosition(position);

    // Verify positionRepository.save() was called
    Mockito.verify(positionRepository).save(position);

    // Verify eventPublisher.publishPositionEvent() was called
    Mockito.verify(eventPublisher).publishPositionUpdateEvent(position);

    // Assert that the returned position matches the expected position
    Assertions.assertThat(result).isEqualTo(position);
  }

  /** Test calculating a position that doesn't exist */
  @Test
  @DisplayName("Should throw exception when position not found")
  void testCalculatePositionNotFound() {
    // Mock positionRepository.findByBookIdAndSecurityAndBusinessDate() to return Optional.empty()
    Mockito.when(
            positionRepository.findByBookIdAndSecurityAndBusinessDate(
                "TEST_BOOK", security, businessDate))
        .thenReturn(Optional.empty());

    // Call positionCalculationService.calculatePosition() and expect CalculationException
    Assertions.assertThatThrownBy(
            () ->
                positionCalculationService.calculatePosition("TEST_BOOK", security, businessDate))
        .isInstanceOf(CalculationException.class)
        .hasMessage("CALCULATION_ERROR: Position not found");

    // Verify positionRepository.findByBookIdAndSecurityAndBusinessDate() was called
    Mockito.verify(positionRepository)
        .findByBookIdAndSecurityAndBusinessDate("TEST_BOOK", security, businessDate);

    // Verify no other interactions with mocks
    Mockito.verifyNoMoreInteractions(positionRepository, positionEngine, eventPublisher);
  }

  /** Test recalculating positions with a specific calculation status */
  @Test
  @DisplayName("Should recalculate positions with specific calculation status")
  void testRecalculatePositions() {
    // Create a list of test positions
    List<Position> positions = createTestPositionList();

    // Mock positionRepository.findByBusinessDateAndCalculationStatus() to return the test positions
    Mockito.when(
            positionRepository.findByBusinessDateAndCalculationStatus(businessDate, "PENDING"))
        .thenReturn(positions);

    // Mock positionEngine.processPositionsAsync() to return the same positions
    Mockito.when(positionEngine.processPositionsAsync(positions)).thenReturn(positions);

    // Mock eventPublisher.publishPositionEvents() to return a list of completed futures
    Mockito.when(eventPublisher.publishPositionUpdateEvents(positions))
        .thenReturn(List.of(CompletableFuture.completedFuture(null)));

    // Call positionCalculationService.recalculatePositions() with business date and calculation
    // status
    List<Position> result =
        positionCalculationService.recalculatePositions(businessDate, "PENDING");

    // Verify positionRepository.findByBusinessDateAndCalculationStatus() was called
    Mockito.verify(positionRepository)
        .findByBusinessDateAndCalculationStatus(businessDate, "PENDING");

    // Verify positionEngine.processPositionsAsync() was called with the positions
    Mockito.verify(positionEngine).processPositionsAsync(positions);

    // Verify eventPublisher.publishPositionEvents() was called with the positions
    Mockito.verify(eventPublisher).publishPositionUpdateEvents(positions);

    // Assert that the returned positions match the expected positions
    Assertions.assertThat(result).isEqualTo(positions);
  }

  /** Test calculating a settlement ladder for a position */
  @Test
  @DisplayName("Should calculate settlement ladder for a position")
  void testCalculateSettlementLadder() {
    // Create a test position
    Position position = createTestPosition();

    // Create a test settlement ladder
    SettlementLadder settlementLadder = SettlementLadder.builder().build();

    // Mock positionEngine.calculateSettlementLadder() to return the settlement ladder
    Mockito.when(positionEngine.calculateSettlementLadder(position)).thenReturn(settlementLadder);

    // Call positionCalculationService.calculateSettlementLadder() with the position
    SettlementLadder result = positionCalculationService.calculateSettlementLadder(position);

    // Verify positionEngine.calculateSettlementLadder() was called with the position
    Mockito.verify(positionEngine).calculateSettlementLadder(position);

    // Assert that the returned settlement ladder matches the expected settlement ladder
    Assertions.assertThat(result).isEqualTo(settlementLadder);
  }

  /** Test calculating the current position */
  @Test
  @DisplayName("Should calculate current position")
  void testCalculateCurrentPosition() {
    // Create a test position
    Position position = createTestPosition();

    // Mock positionEngine.calculateCurrentPosition() to return the position
    Mockito.when(positionEngine.calculateCurrentPosition(position)).thenReturn(position);

    // Call positionCalculationService.calculateCurrentPosition() with the position
    Position result = positionCalculationService.calculateCurrentPosition(position);

    // Verify positionEngine.calculateCurrentPosition() was called with the position
    Mockito.verify(positionEngine).calculateCurrentPosition(position);

    // Assert that the returned position matches the expected position
    Assertions.assertThat(result).isEqualTo(position);
  }

  /** Test calculating the projected position */
  @Test
  @DisplayName("Should calculate projected position")
  void testCalculateProjectedPosition() {
    // Create a test position
    Position position = createTestPosition();

    // Mock positionEngine.calculateProjectedPosition() to return the position
    Mockito.when(positionEngine.calculateProjectedPosition(position)).thenReturn(position);

    // Call positionCalculationService.calculateProjectedPosition() with the position
    Position result = positionCalculationService.calculateProjectedPosition(position);

    // Verify positionEngine.calculateProjectedPosition() was called with the position
    Mockito.verify(positionEngine).calculateProjectedPosition(position);

    // Assert that the returned position matches the expected position
    Assertions.assertThat(result).isEqualTo(position);
  }

  /** Test processing start-of-day positions */
  @Test
  @DisplayName("Should process start-of-day positions")
  void testProcessStartOfDayPositions() {
    // Create a list of test positions
    List<Position> positions = createTestPositionList();

    // Mock positionRepository.saveAll() to return the same positions
    Mockito.when(positionRepository.saveAll(positions)).thenReturn(positions);

    // Mock positionCalculationService.calculatePositions() to return the positions
    Mockito.when(positionCalculationService.calculatePositions(businessDate)).thenReturn(positions);

    // Call positionCalculationService.processStartOfDayPositions() with positions and business
    // date
    List<Position> result =
        positionCalculationService.processStartOfDayPositions(positions, businessDate);

    // Verify each position has isStartOfDay set to true
    for (Position position : positions) {
      Assertions.assertThat(position.getIsStartOfDay()).isTrue();
    }

    // Verify positionRepository.saveAll() was called with the positions
    Mockito.verify(positionRepository).saveAll(positions);

    // Verify positionCalculationService.calculatePositions() was called with the business date
    Mockito.verify(positionCalculationService).calculatePositions(businessDate);

    // Assert that the returned positions match the expected positions
    Assertions.assertThat(result).isEqualTo(positions);
  }

  /** Test validating a trade event */
  @Test
  @DisplayName("Should validate trade event")
  void testValidateTradeEvent() {
    // Create a valid trade event
    TradeDataEvent validEvent = createTestTradeEvent();

    // Create an invalid trade event (missing required fields)
    TradeDataEvent invalidEvent = TradeDataEvent.builder().build();

    // Call positionCalculationService.processTradeEvent() with the valid event
    positionCalculationService.processTradeEvent(validEvent);

    // Call positionCalculationService.processTradeEvent() with the invalid event and expect
    // exception
    Assertions.assertThatThrownBy(() -> positionCalculationService.processTradeEvent(invalidEvent))
        .isInstanceOf(IllegalArgumentException.class);

    // Verify positionEngine.processTradeEvent() was called only for the valid event
    Mockito.verify(positionEngine).processTradeEvent(validEvent);
  }

  /** Test validating a position event */
  @Test
  @DisplayName("Should validate position event")
  void testValidatePositionEvent() {
    // Create a valid position event
    PositionEvent validEvent = createTestPositionEvent();

    // Create an invalid position event (missing required fields)
    PositionEvent invalidEvent = PositionEvent.builder().build();

    // Call positionCalculationService.processPositionEvent() with the valid event
    positionCalculationService.processPositionEvent(validEvent);

    // Call positionCalculationService.processPositionEvent() with the invalid event and expect
    // exception
    Assertions.assertThatThrownBy(() -> positionCalculationService.processPositionEvent(invalidEvent))
        .isInstanceOf(IllegalArgumentException.class);

    // Verify positionEngine.processPositionEvent() was called only for the valid event
    Mockito.verify(positionEngine).processPositionEvent(validEvent);
  }

  /** Test publishing a position update event */
  @Test
  @DisplayName("Should publish position update event")
  void testPublishPositionUpdateEvent() {
    // Create a test position
    Position position = createTestPosition();

    // Mock eventPublisher.publishPositionEvent() to return a completed future
    Mockito.when(eventPublisher.publishPositionEvent(position, "POSITION_UPDATE"))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call positionCalculationService.publishPositionUpdateEvent() with the position
    CompletableFuture<?> future =
        positionCalculationService.publishPositionUpdateEvent(position);

    // Verify eventPublisher.publishPositionEvent() was called with the position and
    // 'POSITION_UPDATE' event type
    Mockito.verify(eventPublisher).publishPositionEvent(position, "POSITION_UPDATE");

    // Assert that the returned CompletableFuture completes successfully
    Assertions.assertThat(future).isCompleted();
  }

  /** Test publishing multiple position update events */
  @Test
  @DisplayName("Should publish multiple position update events")
  void testPublishPositionUpdateEvents() {
    // Create a list of test positions
    List<Position> positions = createTestPositionList();

    // Mock eventPublisher.publishPositionEvents() to return a list of completed futures
    Mockito.when(eventPublisher.publishPositionEvents(positions, "POSITION_UPDATE"))
        .thenReturn(List.of(CompletableFuture.completedFuture(null)));

    // Call positionCalculationService.publishPositionUpdateEvents() with the positions
    List<CompletableFuture<?>> futures =
        positionCalculationService.publishPositionUpdateEvents(positions);

    // Verify eventPublisher.publishPositionEvents() was called with the positions and
    // 'POSITION_UPDATE' event type
    Mockito.verify(eventPublisher).publishPositionEvents(positions, "POSITION_UPDATE");

    // Assert that the returned list of CompletableFuture completes successfully
    Assertions.assertThat(futures).allSatisfy(f -> Assertions.assertThat(f).isCompleted());
  }

  /** Helper method to create a test position */
  private Position createTestPosition() {
    return Position.builder()
        .bookId("TEST_BOOK")
        .security(security)
        .businessDate(businessDate)
        .contractualQty(BigDecimal.valueOf(100))
        .settledQty(BigDecimal.valueOf(50))
        .build();
  }

  /** Helper method to create a list of test positions */
  private List<Position> createTestPositionList() {
    List<Position> positions = new ArrayList<>();
    positions.add(createTestPosition());
    return positions;
  }

  /** Helper method to create a test trade event */
  private TradeDataEvent createTestTradeEvent() {
    return TradeDataEvent.builder()
        .bookId("TEST_BOOK")
        .securityId("SEC001")
        .tradeDate(businessDate)
        .quantity(BigDecimal.valueOf(10))
        .build();
  }

  /** Helper method to create a test position event */
  private PositionEvent createTestPositionEvent() {
    return PositionEvent.builder()
        .bookId("TEST_BOOK")
        .securityId("SEC001")
        .businessDate(businessDate)
        .contractualQty(BigDecimal.valueOf(100))
        .settledQty(BigDecimal.valueOf(50))
        .build();
  }

  /** Helper method to create a test settlement ladder */
  private SettlementLadder createTestSettlementLadder(Position position) {
    return SettlementLadder.fromPosition(position);
  }
}