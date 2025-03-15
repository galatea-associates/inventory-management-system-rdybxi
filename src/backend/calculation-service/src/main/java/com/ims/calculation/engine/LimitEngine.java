package com.ims.calculation.engine;

import com.hazelcast.core.HazelcastInstance; // version 5.3.0
import com.hazelcast.map.IMap; // version 5.3.0
import com.ims.calculation.exception.CalculationException;
import com.ims.calculation.model.AggregationUnitLimit;
import com.ims.calculation.model.CalculationRule;
import com.ims.calculation.model.ClientLimit;
import com.ims.calculation.repository.LimitRepository;
import com.ims.common.model.AggregationUnit;
import com.ims.common.model.Counterparty;
import com.ims.common.model.Position;
import com.ims.common.model.Security;
import com.ims.common.util.DateUtil;
import java.math.BigDecimal; // version 17
import java.time.LocalDate; // version 17
import java.util.HashMap;
import java.util.List; // version 17
import java.util.Map; // version 17
import java.util.Optional;
import java.util.concurrent.CompletableFuture; // version 17
import java.util.concurrent.ConcurrentHashMap; // version 17
import java.util.stream.Collectors; // version 17
import lombok.RequiredArgsConstructor; // version 1.18.26
import lombok.extern.slf4j.Slf4j; // version 1.18.26
import org.springframework.stereotype.Component; // version 6.0.9
import org.springframework.transaction.annotation.Transactional; // version 6.0.9

/**
 * Core calculation engine for client and aggregation unit trading limits in the Inventory Management
 * System. This class implements high-performance, thread-safe algorithms for real-time limit
 * calculations, supporting the short sell approval workflow and order validation against available
 * inventory and regulatory constraints. It processes position data, inventory availability, and
 * applies market-specific rules to calculate and update limits for both client and aggregation unit
 * levels.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class LimitEngine {

  private final LimitRepository limitRepository;
  private final PositionEngine positionEngine;
  private final InventoryEngine inventoryEngine;
  private final HazelcastInstance hazelcastInstance;
  private final IMap<String, ClientLimit> clientLimitCache;
  private final IMap<String, AggregationUnitLimit> aggregationUnitLimitCache;

  /**
   * Constructor that initializes the limit engine with required dependencies
   *
   * @param limitRepository Repository for client and aggregation unit limits
   * @param positionEngine Engine for position calculations
   * @param inventoryEngine Engine for inventory calculations
   * @param hazelcastInstance Hazelcast instance for distributed caching
   */
  public LimitEngine(
      LimitRepository limitRepository,
      PositionEngine positionEngine,
      InventoryEngine inventoryEngine,
      HazelcastInstance hazelcastInstance) {
    this.limitRepository = limitRepository;
    this.positionEngine = positionEngine;
    this.inventoryEngine = inventoryEngine;
    this.hazelcastInstance = hazelcastInstance;
    this.clientLimitCache = hazelcastInstance.getMap("clientLimitCache");
    this.aggregationUnitLimitCache = hazelcastInstance.getMap("aggregationUnitLimitCache");
  }

  /**
   * Calculates client limits for long and short selling based on positions and inventory
   * availability
   *
   * @param positions List of positions
   * @param businessDate The business date
   * @return List of calculated client limits
   */
  @Transactional
  public List<ClientLimit> calculateClientLimits(List<Position> positions, LocalDate businessDate) {
    log.info("Starting client limit calculation for businessDate: {}", businessDate);

    if (positions == null || businessDate == null) {
      throw new IllegalArgumentException("Positions and businessDate must not be null");
    }

    List<ClientLimit> clientLimits =
        positions.stream()
            .filter(
                position -> {
                  if (position == null || position.getSecurity() == null) {
                    log.warn("Skipping null position or position with null security");
                    return false;
                  }
                  return true;
                })
            .collect(
                Collectors.groupingBy(
                    position ->
                        new Pair<>(
                            position.getCounterparty().getCounterpartyId(),
                            position.getSecurity().getInternalId())))
            .entrySet()
            .parallelStream()
            .map(
                entry -> {
                  String clientId = entry.getKey().getFirst();
                  String securityId = entry.getKey().getSecond();
                  List<Position> clientPositions = entry.getValue();

                  // Calculate long sell limit based on long positions
                  double longSellLimit =
                      clientPositions.stream()
                          .filter(Position::isLong)
                          .map(Position::getProjectedPosition)
                          .filter(qty -> qty != null)
                          .mapToDouble(BigDecimal::doubleValue)
                          .sum();

                  // Calculate short sell limit based on short sell availability
                  double shortSellLimit =
                      clientPositions.stream()
                          .filter(Position::isShort)
                          .map(Position::getProjectedPosition)
                          .filter(qty -> qty != null)
                          .mapToDouble(BigDecimal::doubleValue)
                          .sum();

                  ClientLimit clientLimit = findOrCreateClientLimit(clientId, securityId, businessDate);
                  clientLimit.setLongSellLimit(longSellLimit);
                  clientLimit.setShortSellLimit(shortSellLimit);
                  clientLimit.setCurrency(
                      clientPositions.stream()
                          .findFirst()
                          .map(pos -> pos.getSecurity().getCurrency())
                          .orElse("USD")); // Default currency

                  // Apply market-specific rules
                  clientLimit.setMarket(
                      clientPositions.stream()
                          .findFirst()
                          .map(pos -> pos.getSecurity().getMarket())
                          .orElse("GLOBAL")); // Default market
                  applyMarketSpecificRules(clientLimit, clientLimit.getMarket());

                  return clientLimit;
                })
            .collect(Collectors.toList());

    // Save all calculated client limits to repository
    List<ClientLimit> savedClientLimits = limitRepository.saveAll(clientLimits);

    // Update cache with new records
    savedClientLimits.forEach(this::cacheClientLimit);

    log.info("Completed client limit calculation, {} records created", savedClientLimits.size());
    return savedClientLimits;
  }

  /**
   * Calculates aggregation unit limits for long and short selling based on positions and inventory
   * availability
   *
   * @param positions List of positions
   * @param businessDate The business date
   * @return List of calculated aggregation unit limits
   */
  @Transactional
  public List<AggregationUnitLimit> calculateAggregationUnitLimits(
      List<Position> positions, LocalDate businessDate) {
    log.info(
        "Starting aggregation unit limit calculation for businessDate: {}", businessDate); // Corrected
    // log message

    if (positions == null || businessDate == null) {
      throw new IllegalArgumentException("Positions and businessDate must not be null");
    }

    List<AggregationUnitLimit> aggregationUnitLimits =
        positions.stream()
            .filter(
                position -> {
                  if (position == null || position.getSecurity() == null) {
                    log.warn("Skipping null position or position with null security");
                    return false;
                  }
                  return true;
                })
            .collect(
                Collectors.groupingBy(
                    position ->
                        new Pair<>(
                            position.getAggregationUnit().getAggregationUnitId(),
                            position.getSecurity().getInternalId())))
            .entrySet()
            .parallelStream()
            .map(
                entry -> {
                  String aggregationUnitId = entry.getKey().getFirst();
                  String securityId = entry.getKey().getSecond();
                  List<Position> aggregationUnitPositions = entry.getValue();

                  // Calculate long sell limit based on long positions
                  double longSellLimit =
                      aggregationUnitPositions.stream()
                          .filter(Position::isLong)
                          .map(Position::getProjectedPosition)
                          .filter(qty -> qty != null)
                          .mapToDouble(BigDecimal::doubleValue)
                          .sum();

                  // Calculate short sell limit based on short sell availability
                  double shortSellLimit =
                      aggregationUnitPositions.stream()
                          .filter(Position::isShort)
                          .map(Position::getProjectedPosition)
                          .filter(qty -> qty != null)
                          .mapToDouble(BigDecimal::doubleValue)
                          .sum();

                  AggregationUnitLimit aggregationUnitLimit =
                      findOrCreateAggregationUnitLimit(aggregationUnitId, securityId, businessDate);
                  aggregationUnitLimit.setLongSellLimit(longSellLimit);
                  aggregationUnitLimit.setShortSellLimit(shortSellLimit);
                  aggregationUnitLimit.setCurrency(
                      aggregationUnitPositions.stream()
                          .findFirst()
                          .map(pos -> pos.getSecurity().getCurrency())
                          .orElse("USD")); // Default currency

                  // Apply market-specific rules
                  AggregationUnit aggregationUnit =
                      aggregationUnitPositions.stream()
                          .findFirst()
                          .map(Position::getAggregationUnit)
                          .orElse(null);
                  if (aggregationUnit != null) {
                    applyMarketSpecificRules(aggregationUnitLimit, aggregationUnit);
                  }

                  return aggregationUnitLimit;
                })
            .collect(Collectors.toList());

    // Save all calculated aggregation unit limits to repository
    List<AggregationUnitLimit> savedAggregationUnitLimits =
        limitRepository.saveAll(aggregationUnitLimits);

    // Update cache with new records
    savedAggregationUnitLimits.forEach(this::cacheAggregationUnitLimit);

    log.info(
        "Completed aggregation unit limit calculation, {} records created",
        savedAggregationUnitLimits.size());
    return aggregationUnitLimits;
  }

  /**
   * Validates an order against client limits
   *
   * @param clientId The client identifier
   * @param securityId The security identifier
   * @param orderType The order type
   * @param quantity The quantity
   * @param businessDate The business date
   * @return True if the order is valid against client limits, false otherwise
   */
  @Transactional(readOnly = true)
  public boolean validateOrderAgainstClientLimit(
      String clientId, String securityId, String orderType, BigDecimal quantity, LocalDate businessDate) {
    log.debug(
        "Validating order against client limit: clientId={}, securityId={}, orderType={}, quantity={}, businessDate={}",
        clientId,
        securityId,
        orderType,
        quantity,
        businessDate);

    if (clientId == null || securityId == null || orderType == null || quantity == null) {
      log.warn("Order validation failed due to null input parameters");
      return false;
    }

    ClientLimit clientLimit = findOrCreateClientLimit(clientId, securityId, businessDate);

    boolean isValid;
    if ("LONG_SELL".equals(orderType)) {
      isValid = clientLimit.hasLongSellCapacity(quantity.doubleValue());
    } else if ("SHORT_SELL".equals(orderType)) {
      isValid = clientLimit.hasShortSellCapacity(quantity.doubleValue());
    } else {
      log.warn("Unsupported order type: {}", orderType);
      return false;
    }

    log.debug("Order validation result: {}", isValid);
    return isValid;
  }

  /**
   * Validates an order against aggregation unit limits
   *
   * @param aggregationUnitId The aggregation unit identifier
   * @param securityId The security identifier
   * @param orderType The order type
   * @param quantity The quantity
   * @param businessDate The business date
   * @return True if the order is valid against aggregation unit limits, false otherwise
   */
  @Transactional(readOnly = true)
  public boolean validateOrderAgainstAggregationUnitLimit(
      String aggregationUnitId,
      String securityId,
      String orderType,
      BigDecimal quantity,
      LocalDate businessDate) {
    log.debug(
        "Validating order against aggregation unit limit: aggregationUnitId={}, securityId={}, orderType={}, quantity={}, businessDate={}",
        aggregationUnitId,
        securityId,
        orderType,
        quantity,
        businessDate);

    if (aggregationUnitId == null || securityId == null || orderType == null || quantity == null) {
      log.warn("Order validation failed due to null input parameters");
      return false;
    }

    AggregationUnitLimit aggregationUnitLimit =
        findOrCreateAggregationUnitLimit(aggregationUnitId, securityId, businessDate);

    boolean isValid;
    if ("LONG_SELL".equals(orderType)) {
      isValid = aggregationUnitLimit.hasLongSellCapacity(quantity.doubleValue());
    } else if ("SHORT_SELL".equals(orderType)) {
      isValid = aggregationUnitLimit.hasShortSellCapacity(quantity.doubleValue());
    } else {
      log.warn("Unsupported order type: {}", orderType);
      return false;
    }

    log.debug("Order validation result: {}", isValid);
    return isValid;
  }

  /**
   * Updates the used amount for a client limit after order execution
   *
   * @param clientId The client identifier
   * @param securityId The security identifier
   * @param orderType The order type
   * @param quantity The quantity
   * @param businessDate The business date
   * @return The updated client limit
   */
  @Transactional
  public ClientLimit updateClientLimitUsage(
      String clientId, String securityId, String orderType, BigDecimal quantity, LocalDate businessDate) {
    log.debug(
        "Updating client limit usage: clientId={}, securityId={}, orderType={}, quantity={}, businessDate={}",
        clientId,
        securityId,
        orderType,
        quantity,
        businessDate);

    if (clientId == null || securityId == null || orderType == null || quantity == null) {
      throw new IllegalArgumentException("Input parameters cannot be null");
    }

    ClientLimit clientLimit = findOrCreateClientLimit(clientId, securityId, businessDate);

    if ("LONG_SELL".equals(orderType)) {
      limitRepository.updateClientLongSellUsed(
          clientId, securityId, businessDate, quantity); // Corrected method call
      clientLimit.updateLongSellUsed(quantity.doubleValue());
    } else if ("SHORT_SELL".equals(orderType)) {
      limitRepository.updateClientShortSellUsed(
          clientId, securityId, businessDate, quantity); // Corrected method call
      clientLimit.updateShortSellUsed(quantity.doubleValue());
    } else {
      throw new CalculationException(
          "Unsupported order type: " + orderType,
          "Order type not supported for limit usage update");
    }

    cacheClientLimit(clientLimit);
    log.info("Client limit usage updated successfully");
    return clientLimit;
  }

  /**
   * Updates the used amount for an aggregation unit limit after order execution
   *
   * @param aggregationUnitId The aggregation unit identifier
   * @param securityId The security identifier
   * @param orderType The order type
   * @param quantity The quantity
   * @param businessDate The business date
   * @return The updated aggregation unit limit
   */
  @Transactional
  public AggregationUnitLimit updateAggregationUnitLimitUsage(
      String aggregationUnitId,
      String securityId,
      String orderType,
      BigDecimal quantity,
      LocalDate businessDate) {
    log.debug(
        "Updating aggregation unit limit usage: aggregationUnitId={}, securityId={}, orderType={}, quantity={}, businessDate={}",
        aggregationUnitId,
        securityId,
        orderType,
        quantity,
        businessDate);

    if (aggregationUnitId == null || securityId == null || orderType == null || quantity == null) {
      throw new IllegalArgumentException("Input parameters cannot be null");
    }

    AggregationUnitLimit aggregationUnitLimit =
        findOrCreateAggregationUnitLimit(aggregationUnitId, securityId, businessDate);

    if ("LONG_SELL".equals(orderType)) {
      limitRepository.updateAggregationUnitLongSellUsed(
          aggregationUnitId, securityId, businessDate, quantity); // Corrected method call
      aggregationUnitLimit.updateLongSellUsed(quantity.doubleValue());
    } else if ("SHORT_SELL".equals(orderType)) {
      limitRepository.updateAggregationUnitShortSellUsed(
          aggregationUnitId, securityId, businessDate, quantity); // Corrected method call
      aggregationUnitLimit.updateShortSellUsed(quantity.doubleValue());
    } else {
      throw new CalculationException(
          "Unsupported order type: " + orderType,
          "Order type not supported for limit usage update");
    }

    cacheAggregationUnitLimit(aggregationUnitLimit);
    log.info("Aggregation unit limit usage updated successfully");
    return aggregationUnitLimit;
  }

  /**
   * Finds an existing client limit or creates a new one if not found
   *
   * @param clientId The client identifier
   * @param securityId The security identifier
   * @param businessDate The business date
   * @return The found or created client limit
   */
  private ClientLimit findOrCreateClientLimit(String clientId, String securityId, LocalDate businessDate) {
    String cacheKey = getClientLimitCacheKey(clientId, securityId, businessDate);

    // Check if client limit exists in cache
    ClientLimit clientLimit = clientLimitCache.get(cacheKey);
    if (clientLimit != null) {
      log.debug("Client limit found in cache: {}", clientLimit);
      return clientLimit;
    }

    // If not in cache, query repository
    Optional<ClientLimit> existingLimit =
        limitRepository.findClientLimitByClientIdAndSecurityIdAndBusinessDate(
            clientId, securityId, businessDate);

    if (existingLimit.isPresent()) {
      clientLimit = existingLimit.get();
      cacheClientLimit(clientLimit);
      log.debug("Client limit found in repository: {}", clientLimit);
      return clientLimit;
    }

    // If not found, create new client limit with default values
    clientLimit =
        ClientLimit.builder()
            .clientId(clientId)
            .securityId(securityId)
            .businessDate(businessDate)
            .longSellLimit(0.0)
            .shortSellLimit(0.0)
            .longSellUsed(0.0)
            .shortSellUsed(0.0)
            .status("ACTIVE")
            .build();

    // Save new client limit to repository and cache
    clientLimit = limitRepository.save(clientLimit);
    cacheClientLimit(clientLimit);

    log.info("Created new client limit: {}", clientLimit);
    return clientLimit;
  }

  /**
   * Finds an existing aggregation unit limit or creates a new one if not found
   *
   * @param aggregationUnitId The aggregation unit identifier
   * @param securityId The security identifier
   * @param businessDate The business date
   * @return The found or created aggregation unit limit
   */
  private AggregationUnitLimit findOrCreateAggregationUnitLimit(
      String aggregationUnitId, String securityId, LocalDate businessDate) {
    String cacheKey = getAggregationUnitLimitCacheKey(aggregationUnitId, securityId, businessDate);

    // Check if aggregation unit limit exists in cache
    AggregationUnitLimit aggregationUnitLimit = aggregationUnitLimitCache.get(cacheKey);
    if (aggregationUnitLimit != null) {
      log.debug("Aggregation unit limit found in cache: {}", aggregationUnitLimit);
      return aggregationUnitLimit;
    }

    // If not in cache, query repository
    Optional<AggregationUnitLimit> existingLimit =
        limitRepository.findAggregationUnitLimitByAggregationUnitIdAndSecurityIdAndBusinessDate(
            aggregationUnitId, securityId, businessDate);

    if (existingLimit.isPresent()) {
      aggregationUnitLimit = existingLimit.get();
      cacheAggregationUnitLimit(aggregationUnitLimit);
      log.debug("Aggregation unit limit found in repository: {}", aggregationUnitLimit);
      return aggregationUnitLimit;
    }

    // If not found, create new aggregation unit limit with default values
    aggregationUnitLimit =
        AggregationUnitLimit.builder()
            .aggregationUnitId(aggregationUnitId)
            .securityId(securityId)
            .businessDate(businessDate)
            .longSellLimit(0.0)
            .shortSellLimit(0.0)
            .longSellUsed(0.0)
            .shortSellUsed(0.0)
            .status("ACTIVE")
            .build();

    // Save new aggregation unit limit to repository and cache
    aggregationUnitLimit = limitRepository.save(aggregationUnitLimit);
    cacheAggregationUnitLimit(aggregationUnitLimit);

    log.info("Created new aggregation unit limit: {}", aggregationUnitLimit);
    return aggregationUnitLimit;
  }

  /**
   * Caches a client limit for faster access
   *
   * @param clientLimit The client limit to cache
   */
  private void cacheClientLimit(ClientLimit clientLimit) {
    String cacheKey =
        getClientLimitCacheKey(clientLimit.getClientId(), clientLimit.getSecurityId(), clientLimit.getBusinessDate());
    clientLimitCache.put(cacheKey, clientLimit);
    log.debug("Updated client limit cache with key: {}", cacheKey);
  }

  /**
   * Caches an aggregation unit limit for faster access
   *
   * @param aggregationUnitLimit The aggregation unit limit to cache
   */
  private void cacheAggregationUnitLimit(AggregationUnitLimit aggregationUnitLimit) {
    String cacheKey =
        getAggregationUnitLimitCacheKey(
            aggregationUnitLimit.getAggregationUnitId(),
            aggregationUnitLimit.getSecurityId(),
            aggregationUnitLimit.getBusinessDate());
    aggregationUnitLimitCache.put(cacheKey, aggregationUnitLimit);
    log.debug("Updated aggregation unit limit cache with key: {}", cacheKey);
  }

  /**
   * Generates a cache key for a client limit
   *
   * @param clientId The client identifier
   * @param securityId The security identifier
   * @param businessDate The business date
   * @return The generated cache key
   */
  private String getClientLimitCacheKey(String clientId, String securityId, LocalDate businessDate) {
    return clientId + ":" + securityId + ":" + businessDate.toString();
  }

  /**
   * Generates a cache key for an aggregation unit limit
   *
   * @param aggregationUnitId The aggregation unit identifier
   * @param securityId The security identifier
   * @param businessDate The business date
   * @return The generated cache key
   */
  private String getAggregationUnitLimitCacheKey(
      String aggregationUnitId, String securityId, LocalDate businessDate) {
    return aggregationUnitId + ":" + securityId + ":" + businessDate.toString();
  }

  /** Clears the client and aggregation unit limit caches */
  public void clearCache() {
    clientLimitCache.clear();
    aggregationUnitLimitCache.clear();
    log.info("Client and Aggregation Unit Limit caches cleared");
  }

  /**
   * Applies market-specific rules to limit calculations
   *
   * @param clientLimit The client limit to apply rules to
   * @param market The market
   * @return The client limit with market-specific rules applied
   */
  private ClientLimit applyMarketSpecificRules(ClientLimit clientLimit, String market) {
    if ("TW".equals(market)) {
      // Taiwan-specific rules
      // Implementation would vary based on specific business requirements
      log.info("Applying Taiwan-specific rules to client limit for security {}", clientLimit.getSecurityId());
    } else if ("JP".equals(market)) {
      // Japan-specific rules
      // Implementation would vary based on specific business requirements
      log.info("Applying Japan-specific rules to client limit for security {}", clientLimit.getSecurityId());
      // Check if before market cutoff and adjust limits accordingly
      if (!DateUtil.isBeforeMarketCutoff(market)) {
        log.info("Adjusting client limits due to after-market cutoff for Japan");
        // Adjust limits based on the time of day and settlement cut-off rules
        // Implementation would vary based on specific business requirements
      }
    }

    // Apply other market-specific rules as needed
    // This would be expanded based on specific regulatory requirements
    return clientLimit;
  }

  /**
   * Applies market-specific rules to limit calculations
   *
   * @param aggregationUnitLimit The aggregation unit limit to apply rules to
   * @param aggregationUnit The aggregation unit
   * @return The aggregation unit limit with market-specific rules applied
   */
  private AggregationUnitLimit applyMarketSpecificRules(
      AggregationUnitLimit aggregationUnitLimit, AggregationUnit aggregationUnit) {
    String market = aggregationUnit.getMarket();
    Set<String> marketSpecificRules = aggregationUnit.getMarketSpecificRules();

    if ("TW".equals(market)) {
      // Taiwan-specific rules
      // Implementation would vary based on specific business requirements
      log.info(
          "Applying Taiwan-specific rules to aggregation unit limit for security {}",
          aggregationUnitLimit.getSecurityId());
    } else if ("JP".equals(market)) {
      // Japan-specific rules
      // Implementation would vary based on specific business requirements
      log.info(
          "Applying Japan-specific rules to aggregation unit limit for security {}",
          aggregationUnitLimit.getSecurityId());
      // Check if before market cutoff and adjust limits accordingly
      if (!DateUtil.isBeforeMarketCutoff(market)) {
        log.info("Adjusting aggregation unit limits due to after-market cutoff for Japan");
        // Adjust limits based on the time of day and settlement cut-off rules
        // Implementation would vary based on specific business requirements
      }
    }

    // Apply other market-specific rules based on aggregation unit's rules
    if (marketSpecificRules != null && !marketSpecificRules.isEmpty()) {
      log.info(
          "Applying custom market-specific rules to aggregation unit limit for security {}: {}",
          aggregationUnitLimit.getSecurityId(),
          marketSpecificRules);
      // Apply custom rules based on the set of rules
      // Implementation would vary based on specific business requirements
    }

    return aggregationUnitLimit;
  }

  /**
   * Calculates client and aggregation unit limits asynchronously in parallel
   *
   * @param positions List of positions
   * @param businessDate The business date
   * @return Future that completes when all calculations are done
   */
  public CompletableFuture<Void> calculateLimitsAsync(
      List<Position> positions, LocalDate businessDate) {
    log.info("Starting asynchronous limit calculation for businessDate: {}", businessDate);

    CompletableFuture<List<ClientLimit>> clientLimitFuture =
        CompletableFuture.supplyAsync(() -> calculateClientLimits(positions, businessDate));

    CompletableFuture<List<AggregationUnitLimit>> aggregationUnitLimitFuture =
        CompletableFuture.supplyAsync(() -> calculateAggregationUnitLimits(positions, businessDate));

    return CompletableFuture.allOf(clientLimitFuture, aggregationUnitLimitFuture)
        .thenAccept(
            v ->
                log.info(
                    "Completed asynchronous limit calculation for businessDate: {}",
                    businessDate)); // Corrected log message
  }

  /**
   * Validates an order against both client and aggregation unit limits
   *
   * @param clientId The client identifier
   * @param aggregationUnitId The aggregation unit identifier
   * @param securityId The security identifier
   * @param orderType The order type
   * @param quantity The quantity
   * @param businessDate The business date
   * @return True if the order is valid against both client and aggregation unit limits, false
   *     otherwise
   */
  @Transactional(readOnly = true)
  public boolean validateOrder(
      String clientId,
      String aggregationUnitId,
      String securityId,
      String orderType,
      BigDecimal quantity,
      LocalDate businessDate) {
    log.debug(
        "Validating order: clientId={}, aggregationUnitId={}, securityId={}, orderType={}, quantity={}, businessDate={}",
        clientId,
        aggregationUnitId,
        securityId,
        orderType,
        quantity,
        businessDate);

    if (clientId == null
        || aggregationUnitId == null
        || securityId == null
        || orderType == null
        || quantity == null) {
      log.warn("Order validation failed due to null input parameters");
      return false;
    }

    boolean isValidAgainstClient = validateOrderAgainstClientLimit(clientId, securityId, orderType, quantity, businessDate);
    if (!isValidAgainstClient) {
      log.debug("Order is not valid against client limit");
      return false;
    }

    boolean isValidAgainstAggregationUnit = validateOrderAgainstAggregationUnitLimit(aggregationUnitId, securityId, orderType, quantity, businessDate);
    if (!isValidAgainstAggregationUnit) {
      log.debug("Order is not valid against aggregation unit limit");
      return false;
    }

    log.debug("Order is valid against both client and aggregation unit limits");
    return true;
  }

  /**
   * Updates both client and aggregation unit limit usage after order execution
   *
   * @param clientId The client identifier
   * @param aggregationUnitId The aggregation unit identifier
   * @param securityId The security identifier
   * @param orderType The order type
   * @param quantity The quantity
   * @param businessDate The business date
   */
  @Transactional
  public void updateLimitUsage(
      String clientId,
      String aggregationUnitId,
      String securityId,
      String orderType,
      BigDecimal quantity,
      LocalDate businessDate) {
    log.debug(
        "Updating limit usage: clientId={}, aggregationUnitId={}, securityId={}, orderType={}, quantity={}, businessDate={}",
        clientId,
        aggregationUnitId,
        securityId,
        orderType,
        quantity,
        businessDate);

    if (clientId == null
        || aggregationUnitId == null
        || securityId == null
        || orderType == null
        || quantity == null) {
      throw new IllegalArgumentException("Input parameters cannot be null");
    }

    updateClientLimitUsage(clientId, securityId, orderType, quantity, businessDate);
    updateAggregationUnitLimitUsage(aggregationUnitId, securityId, orderType, quantity, businessDate);

    log.info("Limit usage updated successfully for both client and aggregation unit");
  }

  // Helper class to represent a pair of values for grouping
  private static class Pair<F, S> {
    private final F first;
    private final S second;

    public Pair(F first, S second) {
      this.first = first;
      this.second = second;
    }

    public F getFirst() {
      return first;
    }

    public S getSecond() {
      return second;
    }

    @Override
    public boolean equals(Object o) {
      if (this == o) return true;
      if (o == null || getClass() != o.getClass()) return false;

      Pair<?, ?> pair = (Pair<?, ?>) o;

      if (!first.equals(pair.first)) return false;
      return second.equals(pair.second);
    }

    @Override
    public int hashCode() {
      int result = first.hashCode();
      result = 31 * result + second.hashCode();
      return result;
    }
  }
}