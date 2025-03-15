package com.ims.ingestion.service;

import com.ims.common.event.TradeDataEvent; // version not specified, check latest
import com.ims.common.model.Counterparty; // version not specified, check latest
import com.ims.common.model.Security; // version not specified, check latest
import com.ims.ingestion.exception.IngestionException; // version not specified, check latest
import com.ims.ingestion.model.TradeData; // version not specified, check latest
import com.ims.ingestion.repository.TradeDataRepository; // version not specified, check latest
import java.util.ArrayList; // version 17
import java.util.List; // version 17
import java.util.Optional; // version 17
import java.util.UUID; // version 17
import java.util.concurrent.CompletableFuture; // version 17
import lombok.RequiredArgsConstructor; // version 1.18.26
import lombok.extern.slf4j.Slf4j; // version 1.18.26
import org.springframework.beans.factory.annotation.Autowired; // version 6.0.9
import org.springframework.kafka.core.KafkaTemplate; // version 3.0.5
import org.springframework.scheduling.annotation.Async; // version 6.0.9
import org.springframework.stereotype.Service; // version 6.0.9
import org.springframework.transaction.annotation.Transactional; // version 6.0.9

/**
 * Service responsible for processing trade data during ingestion. Handles validation,
 * transformation, persistence, and event publishing for both batch and real-time trade data.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TradeDataService {

  private final TradeDataRepository tradeDataRepository;
  private final KafkaTemplate<String, TradeDataEvent> tradeDataKafkaTemplate;
  private final DataMappingService dataMappingService;

  /**
   * Processes a single trade data update in real-time.
   *
   * @param tradeData The trade data to process.
   * @return The processed trade data.
   */
  @Transactional
  public TradeData processTrade(TradeData tradeData) {
    log.info("Starting trade processing for tradeId: {}", tradeData.getTradeId());

    // Validate the trade data
    if (!tradeData.validate()) {
      log.error("Trade data validation failed for tradeId: {}", tradeData.getTradeId());
      throw IngestionException.forTradeData(
          "Trade data validation failed for tradeId: " + tradeData.getTradeId());
    }

    // Check for duplicates
    Optional<TradeData> existingTrade = checkForDuplicates(tradeData);
    if (existingTrade.isPresent()) {
      log.warn(
          "Duplicate trade found for tradeId: {}, orderId: {}, executionId: {}",
          tradeData.getTradeId(),
          tradeData.getOrderId(),
          tradeData.getExecutionId());
      // Handle duplicate according to business rules (e.g., skip, update, etc.)
      // For now, we'll just skip it
      log.info("Skipping duplicate trade with tradeId: {}", tradeData.getTradeId());
      return tradeData; // Or throw an exception if duplicates are not allowed
    }

    // Resolve security reference
    Security security = resolveSecurityReference(tradeData);
    tradeData.setSecurity(security);

    // Resolve counterparty reference
    Counterparty counterparty = resolveCounterpartyReference(tradeData);
    tradeData.setCounterparty(counterparty);

    // Calculate settlement date if not provided
    if (tradeData.getSettlementDate() == null) {
      tradeData.setSettlementDate(tradeData.calculateSettlementDate());
      log.info(
          "Settlement date calculated for tradeId: {} as {}",
          tradeData.getTradeId(),
          tradeData.getSettlementDate());
    }

    // Save the trade data to the repository
    tradeData = tradeDataRepository.save(tradeData);
    log.info("Trade data saved to repository with ID: {}", tradeData.getId());

    // Publish trade data event
    publishTradeEvent(tradeData);

    // Mark trade as processed
    tradeData.markAsProcessed();
    tradeData = tradeDataRepository.save(tradeData);
    log.info("Trade data marked as processed for tradeId: {}", tradeData.getTradeId());

    return tradeData;
  }

  /**
   * Processes a batch of trade data.
   *
   * @param tradeDataList The list of trade data to process.
   * @return The batch ID for tracking.
   */
  @Transactional
  public String processBatch(List<TradeData> tradeDataList) {
    String batchId = UUID.randomUUID().toString();
    log.info("Starting batch processing for {} trade data items with batchId: {}", tradeDataList.size(), batchId);

    // Set the batch ID on all trade data items
    tradeDataList.forEach(tradeData -> tradeData.setBatchId(batchId));

    // Set processing status to 'PENDING' on all items
    tradeDataList.forEach(tradeData -> tradeData.setProcessingStatus("PENDING"));

    // Save all trade data items to the repository
    tradeDataRepository.saveAll(tradeDataList);
    log.info("Saved {} trade data items to repository with batchId: {}", tradeDataList.size(), batchId);

    // Submit batch for asynchronous processing
    processBatchAsync(batchId);

    return batchId;
  }

  /**
   * Asynchronously processes a batch of trade data.
   *
   * @param batchId The batch ID to process.
   * @return A CompletableFuture representing the asynchronous processing.
   */
  @Async
  @Transactional
  public CompletableFuture<Void> processBatchAsync(String batchId) {
    log.info("Starting asynchronous batch processing for batchId: {}", batchId);

    // Retrieve all trades with the batch ID from repository
    List<TradeData> tradeDataList = tradeDataRepository.findByBatchId(batchId);
    log.info("Retrieved {} trade data items for batchId: {}", tradeDataList.size(), batchId);

    int successCount = 0;
    int failureCount = 0;

    // Process each trade in the batch
    for (TradeData tradeData : tradeDataList) {
      try {
        processTrade(tradeData);
        successCount++;
      } catch (Exception e) {
        log.error("Exception occurred while processing trade with tradeId: {} in batchId: {}", tradeData.getTradeId(), batchId, e);
        tradeData.markAsError(e.getMessage());
        tradeDataRepository.save(tradeData);
        failureCount++;
      }
    }

    log.info("Completed batch processing for batchId: {}. Success: {}, Failure: {}", batchId, successCount, failureCount);
    return CompletableFuture.completedFuture(null);
  }

  /**
   * Finds all trades associated with a specific batch ID.
   *
   * @param batchId The batch ID to search for.
   * @return List of trade data with the specified batch ID.
   */
  @Transactional(readOnly = true)
  public List<TradeData> findTradesByBatchId(String batchId) {
    log.info("Finding trades by batchId: {}", batchId);
    List<TradeData> trades = tradeDataRepository.findByBatchId(batchId);
    log.info("Found {} trades for batchId: {}", trades.size(), batchId);
    return trades;
  }

  /**
   * Gets the status of a trade data batch ingestion.
   *
   * @param batchId The batch ID to retrieve the status for.
   * @return Map containing batch status information.
   */
  @Transactional(readOnly = true)
  public java.util.Map<String, Object> getBatchStatus(String batchId) {
    log.info("Getting batch status for batchId: {}", batchId);

    long totalCount = tradeDataRepository.countByBatchId(batchId);
    long processedCount = tradeDataRepository.countByBatchIdAndProcessingStatus(batchId, "PROCESSED");
    long errorCount = tradeDataRepository.countByBatchIdAndProcessingStatus(batchId, "ERROR");
    long pendingCount = tradeDataRepository.countByBatchIdAndProcessingStatus(batchId, "PENDING");

    double completionPercentage = (totalCount > 0) ? ((double) processedCount / totalCount) * 100 : 0;

    java.util.Map<String, Object> status = new HashMap<>();
    status.put("batchId", batchId);
    status.put("totalCount", totalCount);
    status.put("processedCount", processedCount);
    status.put("errorCount", errorCount);
    status.put("pendingCount", pendingCount);
    status.put("completionPercentage", completionPercentage);

    log.info("Batch status for batchId: {} - {}", batchId, status);
    return status;
  }

  /**
   * Retries processing of failed trade data items.
   *
   * @return The number of trades reprocessed.
   */
  @Transactional
  public int reprocessFailedTrades() {
    log.info("Retrying processing of failed trades");

    List<TradeData> errorTrades = tradeDataRepository.findErrorTrades();
    log.info("Found {} error trades to reprocess", errorTrades.size());

    int reprocessedCount = 0;
    for (TradeData tradeData : errorTrades) {
      try {
        processTrade(tradeData);
        reprocessedCount++;
        log.info("Successfully reprocessed trade with tradeId: {}", tradeData.getTradeId());
      } catch (Exception e) {
        log.error("Exception occurred while reprocessing trade with tradeId: {}", tradeData.getTradeId(), e);
        tradeData.markAsError(e.getMessage());
        tradeDataRepository.save(tradeData);
      }
    }

    log.info("Successfully reprocessed {} trades", reprocessedCount);
    return reprocessedCount;
  }

  /**
   * Finds duplicate trade data entries.
   *
   * @return List of duplicate trade data.
   */
  @Transactional(readOnly = true)
  public List<TradeData> findDuplicateTrades() {
    log.info("Finding duplicate trades");
    List<TradeData> duplicateTrades = tradeDataRepository.findDuplicateTrades();
    log.info("Found {} duplicate trades", duplicateTrades.size());
    return duplicateTrades;
  }

  /**
   * Cleans up duplicate trade data entries.
   *
   * @return The number of duplicates resolved.
   */
  @Transactional
  public int cleanupDuplicates() {
    log.info("Cleaning up duplicate trades");
    List<TradeData> duplicateTrades = findDuplicateTrades();
    log.info("Found {} duplicate trades to cleanup", duplicateTrades.size());

    // Implement logic to group duplicates by tradeId, orderId, or executionId
    // Determine which record to keep based on timestamp, source priority, etc.
    // Mark others for deletion
    // Delete marked records
    // This is a placeholder implementation
    log.warn("Duplicate cleanup logic not fully implemented");
    return 0; // Placeholder
  }

  /**
   * Checks if a trade already exists in the system.
   *
   * @param tradeData The trade data to check.
   * @return The existing trade if found, or empty Optional.
   */
  public Optional<TradeData> checkForDuplicates(TradeData tradeData) {
    if (tradeData.getTradeId() != null) {
      Optional<TradeData> existingTrade = tradeDataRepository.findByTradeId(tradeData.getTradeId());
      if (existingTrade.isPresent()) {
        log.warn("Duplicate trade found by tradeId: {}", tradeData.getTradeId());
        return existingTrade;
      }
    }

    if (tradeData.getOrderId() != null) {
      Optional<TradeData> existingTrade = tradeDataRepository.findByOrderId(tradeData.getOrderId());
      if (existingTrade.isPresent()) {
        log.warn("Duplicate trade found by orderId: {}", tradeData.getOrderId());
        return existingTrade;
      }
    }

    if (tradeData.getExecutionId() != null) {
      Optional<TradeData> existingTrade = tradeDataRepository.findByExecutionId(tradeData.getExecutionId());
      if (existingTrade.isPresent()) {
        log.warn("Duplicate trade found by executionId: {}", tradeData.getExecutionId());
        return existingTrade;
      }
    }

    return Optional.empty();
  }

  /**
   * Resolves the security reference for a trade.
   *
   * @param tradeData The trade data to resolve the security for.
   * @return The resolved security entity.
   */
  public Security resolveSecurityReference(TradeData tradeData) {
    if (tradeData.getSecurity() != null) {
      return tradeData.getSecurity();
    }

    if (tradeData.getSecurityId() != null) {
      // In a real implementation, you would fetch the security from a security repository
      // based on the securityId.
      // For now, we'll just return a dummy security
      Security security = Security.builder().internalId(tradeData.getSecurityId()).build();
      return security;
    }

    if (tradeData.getSecurityIdentifierType() != null && tradeData.getSecurityIdentifierValue() != null) {
      // Use DataMappingService to find existing security
      // Security security = dataMappingService.findExistingSecurity(tradeData.getSecurityIdentifierType(),
      // tradeData.getSecurityIdentifierValue());
      // For now, we'll just return a dummy security
      Security security = Security.builder().securityType("EQUITY").build();
      return security;
    }

    log.error("Security reference not found for tradeId: {}", tradeData.getTradeId());
    throw IngestionException.forTradeData("Security reference not found for tradeId: " + tradeData.getTradeId());
  }

  /**
   * Resolves the counterparty reference for a trade.
   *
   * @param tradeData The trade data to resolve the counterparty for.
   * @return The resolved counterparty entity.
   */
  public Counterparty resolveCounterpartyReference(TradeData tradeData) {
    if (tradeData.getCounterparty() != null) {
      return tradeData.getCounterparty();
    }

    if (tradeData.getCounterpartyId() != null) {
      // Use DataMappingService to find existing counterparty
      // Counterparty counterparty = dataMappingService.findExistingCounterparty(tradeData.getCounterpartyId());
      // For now, we'll just return a dummy counterparty
      Counterparty counterparty = Counterparty.builder().counterpartyId(tradeData.getCounterpartyId()).build();
      return counterparty;
    }

    log.error("Counterparty reference not found for tradeId: {}", tradeData.getTradeId());
    throw IngestionException.forTradeData("Counterparty reference not found for tradeId: " + tradeData.getTradeId());
  }

  /**
   * Publishes a trade data event to Kafka.
   *
   * @param tradeData The trade data to publish.
   */
  public void publishTradeEvent(TradeData tradeData) {
    TradeDataEvent event = tradeData.toEvent();
    log.info("Publishing trade event for tradeId: {}", tradeData.getTradeId());

    try {
      tradeDataKafkaTemplate.send("trade-data-topic", event); // Replace with actual topic name
      log.info("Successfully published trade event for tradeId: {}", tradeData.getTradeId());
    } catch (Exception e) {
      log.error("Exception occurred while publishing trade event for tradeId: {}", tradeData.getTradeId(), e);
      throw new RuntimeException("Failed to publish trade event", e);
    }
  }

  /**
   * Finds a trade by its ID.
   *
   * @param tradeId The trade ID to search for.
   * @return The trade if found, or empty Optional.
   */
  @Transactional(readOnly = true)
  public Optional<TradeData> findTradeById(String tradeId) {
    log.info("Finding trade by tradeId: {}", tradeId);
    return tradeDataRepository.findByTradeId(tradeId);
  }

  /**
   * Finds a trade by its order ID.
   *
   * @param orderId The order ID to search for.
   * @return The trade if found, or empty Optional.
   */
  @Transactional(readOnly = true)
  public Optional<TradeData> findTradeByOrderId(String orderId) {
    log.info("Finding trade by orderId: {}", orderId);
    return tradeDataRepository.findByOrderId(orderId);
  }

  /**
   * Finds a trade by its execution ID.
   *
   * @param executionId The execution ID to search for.
   * @return The trade if found, or empty Optional.
   */
  @Transactional(readOnly = true)
  public Optional<TradeData> findTradeByExecutionId(String executionId) {
    log.info("Finding trade by executionId: {}", executionId);
    return tradeDataRepository.findByExecutionId(executionId);
  }

  /**
   * Finds all trades with pending processing status.
   *
   * @return List of pending trades.
   */
  @Transactional(readOnly = true)
  public List<TradeData> findPendingTrades() {
    log.info("Finding all pending trades");
    return tradeDataRepository.findPendingTrades();
  }
}