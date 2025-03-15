package com.ims.calculation.service;

import com.ims.calculation.engine.InventoryEngine; // version 
import com.ims.calculation.engine.LimitEngine; // version 
import com.ims.calculation.engine.PositionEngine; // version 
import com.ims.calculation.exception.CalculationException; // version 
import com.ims.calculation.model.AggregationUnitLimit; // version 
import com.ims.calculation.model.ClientLimit; // version 
import com.ims.calculation.publisher.CalculationEventPublisher; // version 
import com.ims.calculation.repository.LimitRepository; // version 
import com.ims.common.model.Position; // version 
import com.ims.common.util.DateUtil; // version 
import java.math.BigDecimal; // version 17
import java.time.LocalDate; // version 17
import java.util.List; // version 17
import java.util.concurrent.CompletableFuture; // version 17
import lombok.RequiredArgsConstructor; // version 1.18.26
import lombok.extern.slf4j.Slf4j; // version 1.18.26
import org.springframework.scheduling.annotation.Async; // version 6.0.9
import org.springframework.stereotype.Service; // version 6.0.9
import org.springframework.transaction.annotation.Transactional; // version 6.0.9

/**
 * Service class responsible for calculating and managing client and aggregation unit trading limits in the Inventory Management System. This service orchestrates the calculation of long sell and short sell limits based on position data, inventory availability, and market-specific rules. It provides methods for calculating limits, validating orders against limits, and updating limit usage after order execution, supporting the short sell approval workflow and regulatory compliance across different markets.
 */
@Service // org.springframework.stereotype.Service version 6.0.9
@Slf4j // lombok.extern.slf4j.Slf4j version 1.18.26
@RequiredArgsConstructor // lombok.RequiredArgsConstructor version 1.18.26
@Transactional // org.springframework.transaction.annotation.Transactional version 6.0.9
public class LimitCalculationService {

  private final LimitRepository limitRepository;
  private final LimitEngine limitEngine;
  private final CalculationEventPublisher eventPublisher;

  /**
   * Calculates client and aggregation unit limits based on position data
   *
   * @param positions List of positions
   */
  public void calculateLimits(List<Position> positions) {
    log.info("Starting limit calculation");
    LocalDate businessDate = DateUtil.getCurrentDate();
    limitEngine.calculateClientLimits(positions, businessDate);
    limitEngine.calculateAggregationUnitLimits(positions, businessDate);
    log.info("Completed limit calculation");
  }

  /**
   * Asynchronously calculates client and aggregation unit limits based on position data
   *
   * @param positions List of positions
   * @return CompletableFuture<Void>
   */
  @Async // org.springframework.scheduling.annotation.Async version 6.0.9
  public CompletableFuture<Void> calculateLimitsAsync(List<Position> positions) {
    log.info("Starting asynchronous limit calculation");
    LocalDate businessDate = DateUtil.getCurrentDate();
    return limitEngine.calculateLimitsAsync(positions, businessDate);
  }

  /**
   * Validates an order against both client and aggregation unit limits
   *
   * @param clientId String
   * @param aggregationUnitId String
   * @param securityId String
   * @param orderType String
   * @param quantity BigDecimal
   * @return boolean
   */
  @Transactional(readOnly = true) // org.springframework.transaction.annotation.Transactional version 6.0.9
  public boolean validateOrderAgainstLimits(
      String clientId, String aggregationUnitId, String securityId, String orderType, BigDecimal quantity) {
    log.info(
        "Validating order against limits for clientId: {}, aggregationUnitId: {}, securityId: {}, orderType: {}, quantity: {}",
        clientId,
        aggregationUnitId,
        securityId,
        orderType,
        quantity);
    validateInputParameters(clientId, aggregationUnitId, securityId, orderType, quantity);
    LocalDate businessDate = DateUtil.getCurrentDate();
    boolean isValid =
        limitEngine.validateOrder(clientId, aggregationUnitId, securityId, orderType, quantity, businessDate);
    log.info("Order validation result: {}", isValid);
    return isValid;
  }

  /**
   * Updates both client and aggregation unit limit usage after order execution
   *
   * @param clientId String
   * @param aggregationUnitId String
   * @param securityId String
   * @param orderType String
   * @param quantity BigDecimal
   */
  public void updateLimitUsage(
      String clientId, String aggregationUnitId, String securityId, String orderType, BigDecimal quantity) {
    log.info(
        "Updating limit usage for clientId: {}, aggregationUnitId: {}, securityId: {}, orderType: {}, quantity: {}",
        clientId,
        aggregationUnitId,
        securityId,
        orderType,
        quantity);
    validateInputParameters(clientId, aggregationUnitId, securityId, orderType, quantity);
    LocalDate businessDate = DateUtil.getCurrentDate();
    limitEngine.updateLimitUsage(clientId, aggregationUnitId, securityId, orderType, quantity, businessDate);
    log.info("Limit usage updated successfully");
  }

  /**
   * Retrieves a client limit for a specific client, security, and business date
   *
   * @param clientId String
   * @param securityId String
   * @param businessDate LocalDate
   * @return ClientLimit
   */
  @Transactional(readOnly = true) // org.springframework.transaction.annotation.Transactional version 6.0.9
  public ClientLimit getClientLimit(String clientId, String securityId, LocalDate businessDate) {
    log.debug(
        "Retrieving client limit for clientId: {}, securityId: {}, businessDate: {}",
        clientId,
        securityId,
        businessDate);
    return limitRepository
        .findClientLimitByClientIdAndSecurityIdAndBusinessDate(clientId, securityId, businessDate)
        .orElse(null);
  }

  /**
   * Retrieves an aggregation unit limit for a specific aggregation unit, security, and business date
   *
   * @param aggregationUnitId String
   * @param securityId String
   * @param businessDate LocalDate
   * @return AggregationUnitLimit
   */
  @Transactional(readOnly = true) // org.springframework.transaction.annotation.Transactional version 6.0.9
  public AggregationUnitLimit getAggregationUnitLimit(
      String aggregationUnitId, String securityId, LocalDate businessDate) {
    log.debug(
        "Retrieving aggregation unit limit for aggregationUnitId: {}, securityId: {}, businessDate: {}",
        aggregationUnitId,
        securityId,
        businessDate);
    return limitRepository
        .findAggregationUnitLimitByAggregationUnitIdAndSecurityIdAndBusinessDate(
            aggregationUnitId, securityId, businessDate)
        .orElse(null);
  }

  /**
   * Publishes events for client and aggregation unit limits
   *
   * @param clientLimits List<ClientLimit>
   * @param aggregationUnitLimits List<AggregationUnitLimit>
   */
  private void publishLimitEvents(List<ClientLimit> clientLimits, List<AggregationUnitLimit> aggregationUnitLimits) {
    log.debug("Publishing limit events");
    for (ClientLimit clientLimit : clientLimits) {
      eventPublisher.publishClientLimitEvent(clientLimit, "LIMIT_CALCULATED");
    }
    for (AggregationUnitLimit aggregationUnitLimit : aggregationUnitLimits) {
      eventPublisher.publishAggregationUnitLimitEvent(aggregationUnitLimit, "LIMIT_CALCULATED");
    }
    log.debug("Limit events published successfully");
  }

  /**
   * Validates input parameters for limit operations
   *
   * @param params Object...
   */
  private void validateInputParameters(Object... params) {
    for (Object param : params) {
      if (param == null) {
        log.error("Input parameter is null");
        throw CalculationException.forRuleCalculation("LIMIT_VALIDATION", "Input parameters cannot be null");
      }
    }
  }

  /**
   * Triggers a recalculation of all limits for the current business date
   */
  public void recalculateLimits() {
    log.info("Starting limit recalculation");
    LocalDate businessDate = DateUtil.getCurrentDate();
    limitEngine.clearCache();
    List<Position> positions = limitRepository.findPositionsByBusinessDate(businessDate);
    calculateLimits(positions);
    log.info("Completed limit recalculation");
  }

  /**
   * Applies market-specific rules to all limits for a specific market
   *
   * @param market String
   */
  public void applyMarketSpecificRules(String market) {
    log.info("Applying market-specific rules for market: {}", market);
    LocalDate businessDate = DateUtil.getCurrentDate();
    List<ClientLimit> clientLimits = limitRepository.findClientLimitsByMarketAndBusinessDate(market, businessDate);
    List<AggregationUnitLimit> aggregationUnitLimits = limitRepository.findAggregationUnitLimitsByMarketAndBusinessDate(market, businessDate);

    for (AggregationUnitLimit aggregationUnitLimit : aggregationUnitLimits) {
      aggregationUnitLimit.applyMarketSpecificRules();
    }

    limitRepository.saveAll(clientLimits);
    limitRepository.saveAll(aggregationUnitLimits);

    publishLimitEvents(clientLimits, aggregationUnitLimits);
    log.info("Market-specific rules applied successfully for market: {}", market);
  }
}