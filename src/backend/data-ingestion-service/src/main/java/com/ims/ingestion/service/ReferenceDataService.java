package com.ims.ingestion.service;

import com.ims.common.event.ReferenceDataEvent;
import com.ims.common.model.Security;
import com.ims.ingestion.adapter.BloombergAdapter; // version 1.0.0
import com.ims.ingestion.adapter.ReutersAdapter; // version 1.0.0
import com.ims.ingestion.exception.IngestionException;
import com.ims.ingestion.model.SecurityReferenceData;
import com.ims.ingestion.repository.ReferenceDataRepository;
import java.io.File; // version 17
import java.io.IOException; // version 17
import java.nio.file.Files; // version 17
import java.nio.file.Path; // version 17
import java.nio.file.Paths; // version 17
import java.time.LocalDateTime; // version 17
import java.util.ArrayList; // version 17
import java.util.HashMap; // version 17
import java.util.List; // version 17
import java.util.Map; // version 17
import java.util.Optional; // version 17
import java.util.UUID; // version 17
import java.util.concurrent.CompletableFuture; // version 17
import java.util.stream.Collectors; // version 17
import lombok.extern.slf4j.Slf4j; // version 1.18.26
import org.springframework.beans.factory.annotation.Autowired; // version 6.0.9
import org.springframework.beans.factory.annotation.Value; // version 6.0.9
import org.springframework.kafka.core.KafkaTemplate; // version 3.0.5
import org.springframework.scheduling.annotation.Scheduled; // version 6.0.9
import org.springframework.stereotype.Service; // version 6.0.9
import org.springframework.transaction.annotation.Transactional; // version 6.0.9

/**
 * Service responsible for ingesting, processing, and publishing reference data from multiple external sources.
 * Handles both batch and real-time reference data updates, performs data mapping, conflict detection, and publishes events for downstream services.
 */
@Service
@Slf4j
public class ReferenceDataService {

  private static final String PROCESSING_STATUS_PENDING = "PENDING";
  private static final String PROCESSING_STATUS_PROCESSED = "PROCESSED";
  private static final String PROCESSING_STATUS_ERROR = "ERROR";
  private static final String OPERATION_CREATE = "CREATE";
  private static final String OPERATION_UPDATE = "UPDATE";

  private final ReferenceDataRepository referenceDataRepository;
  private final DataMappingService dataMappingService;
  private final KafkaTemplate<String, ReferenceDataEvent> kafkaTemplate;

  @Value("${kafka.referenceData.topic}")
  private String referenceDataTopic;

  @Value("${batch.input.directory}")
  private String batchInputDirectory;

  private final ReutersAdapter reutersAdapter;

  private final BloombergAdapter bloombergAdapter;

  /**
   * Constructor with dependency injection
   *
   * @param referenceDataRepository The repository for accessing and managing security reference data
   * @param dataMappingService The service for mapping between external data formats and internal domain models
   * @param reutersAdapter The adapter for integrating with Reuters as a data provider
   * @param bloombergAdapter The adapter for integrating with Bloomberg as a data provider
   * @param kafkaTemplate The template for sending messages to Kafka topics
   */
  @Autowired
  public ReferenceDataService(
      ReferenceDataRepository referenceDataRepository,
      DataMappingService dataMappingService,
      ReutersAdapter reutersAdapter,
      BloombergAdapter bloombergAdapter,
      KafkaTemplate<String, ReferenceDataEvent> kafkaTemplate) {
    this.referenceDataRepository = referenceDataRepository;
    this.dataMappingService = dataMappingService;
    this.reutersAdapter = reutersAdapter;
    this.bloombergAdapter = bloombergAdapter;
    this.kafkaTemplate = kafkaTemplate;
    log.info("ReferenceDataService initialized");
  }

  /**
   * Processes a reference data batch file from a specific source
   *
   * @param batchFile The batch file to process
   * @param source The source of the batch file
   * @return Future containing processed reference data
   */
  @Transactional
  public CompletableFuture<List<SecurityReferenceData>> processBatchFile(
      File batchFile, String source) {
    log.info("Starting batch processing for source: {}", source);
    String batchId = UUID.randomUUID().toString();

    try {
      List<SecurityReferenceData> referenceDataList = new ArrayList<>();
      if ("Reuters".equalsIgnoreCase(source)) {
        referenceDataList = reutersAdapter.processFile(batchFile, batchId);
      } else if ("Bloomberg".equalsIgnoreCase(source)) {
        referenceDataList = bloombergAdapter.processFile(batchFile, batchId);
      } else {
        throw IngestionException.forReferenceData("Unsupported data source: " + source);
      }

      referenceDataRepository.saveAll(referenceDataList);
      processBatch(batchId);

      return CompletableFuture.completedFuture(referenceDataList);
    } catch (Exception e) {
      log.error("Error processing batch file from {}: {}", source, e.getMessage(), e);
      return CompletableFuture.failedFuture(e);
    }
  }

  /**
   * Processes a batch of reference data by batch ID
   *
   * @param batchId The batch ID
   */
  @Transactional
  public void processBatch(String batchId) {
    log.info("Starting batch processing with batchId: {}", batchId);

    List<SecurityReferenceData> referenceDataList = referenceDataRepository.findByBatchId(batchId);

    // Check for duplicates within the batch
    List<SecurityReferenceData> duplicates = referenceDataRepository.findDuplicatesByBatchId(batchId);
    if (!duplicates.isEmpty()) {
      log.warn("Found {} duplicate entries in batch {}. Handling...", duplicates.size(), batchId);
      // Handle duplicates (e.g., log, skip, or mark as error)
      duplicates.forEach(
          duplicate -> {
            log.warn(
                "Duplicate entry: externalId={}, identifierType={}, source={}",
                duplicate.getExternalId(),
                duplicate.getIdentifierType(),
                duplicate.getSource());
            duplicate.markAsError("Duplicate entry in batch");
            referenceDataRepository.save(duplicate);
          });
    }

    for (SecurityReferenceData referenceData : referenceDataList) {
      if (referenceData.isPending()) {
        if (!processReferenceData(referenceData)) {
          referenceData.markAsError("Failed to process reference data");
        }
        referenceDataRepository.save(referenceData);
      }
    }

    Map<String, Long> reconciliationReport = generateBatchReconciliationReport(batchId);
    log.info("Completed batch processing with reconciliation: {}", reconciliationReport);
  }

  /**
   * Processes a single reference data item
   *
   * @param referenceData The reference data item to process
   * @return True if processing successful, false otherwise
   */
  @Transactional
  public boolean processReferenceData(SecurityReferenceData referenceData) {
    log.info("Processing reference data item: {}", referenceData);

    if (!referenceData.validate()) {
      log.error("Invalid reference data: {}", referenceData);
      return false;
    }

    Optional<SecurityReferenceData> existingData =
        findExistingReferenceData(
            referenceData.getExternalId(), referenceData.getIdentifierType(), referenceData.getSource());

    String operation = existingData.isPresent() ? OPERATION_UPDATE : OPERATION_CREATE;

    ReferenceDataEvent event = createReferenceDataEvent(referenceData, operation);

    publishReferenceDataEvent(event);
    return true;
  }

  /**
   * Finds existing reference data by external ID, identifier type, and source
   *
   * @param externalId The external ID of the security
   * @param identifierType The type of the identifier
   * @param source The source of the data
   * @return Optional containing existing data if found
   */
  public Optional<SecurityReferenceData> findExistingReferenceData(
      String externalId, String identifierType, String source) {
    return referenceDataRepository.findByExternalIdAndIdentifierTypeAndSource(
        externalId, identifierType, source);
  }

  /**
   * Publishes a reference data event to Kafka
   *
   * @param event The reference data event to publish
   */
  public void publishReferenceDataEvent(ReferenceDataEvent event) {
    log.info("Publishing reference data event: {}", event);
    kafkaTemplate.send(referenceDataTopic, event);
    log.info("Published event to Kafka topic: {}", referenceDataTopic);
  }

  /**
   * Creates a reference data event based on the source
   *
   * @param referenceData The reference data
   * @param operation The operation (CREATE or UPDATE)
   * @return Created reference data event
   */
  public ReferenceDataEvent createReferenceDataEvent(
      SecurityReferenceData referenceData, String operation) {
    ReferenceDataEvent event = new ReferenceDataEvent(referenceData.getSource());
    event.setOperation(operation);
    event.setDataSource(referenceData.getSource());
    // Map and add security to event
    return event;
  }

  /**
   * Subscribes to real-time reference data updates from specified sources
   *
   * @param securityIds List of security IDs
   * @param sources List of sources
   */
  public void subscribeToRealTimeUpdates(List<String> securityIds, List<String> sources) {
    log.info("Subscribing to real-time updates for securities: {} from sources: {}", securityIds, sources);
    // Implementation for subscribing to real-time updates
  }

  /**
   * Handles a real-time reference data update from a specific source
   *
   * @param referenceData The reference data
   * @param source The source of the data
   */
  @Transactional
  public void handleRealTimeUpdate(SecurityReferenceData referenceData, String source) {
    log.info("Handling real-time update from {}: {}", source, referenceData);
    // Implementation for handling real-time updates
  }

  /**
   * Detects and reports conflicts in reference data from different sources
   *
   * @return List of reference data with conflicts
   */
  public List<SecurityReferenceData> detectAndReportConflicts() {
    log.info("Starting conflict detection");
    // Implementation for detecting and reporting conflicts
    return new ArrayList<>();
  }

  /**
   * Resolves conflicts in reference data using configured resolution rules
   *
   * @param conflictingData List of conflicting data
   * @return List of resolved reference data
   */
  @Transactional
  public List<SecurityReferenceData> resolveConflicts(List<SecurityReferenceData> conflictingData) {
    log.info("Starting conflict resolution");
    // Implementation for resolving conflicts
    return new ArrayList<>();
  }

  /**
   * Generates a reconciliation report for a batch process
   *
   * @param batchId The batch ID
   * @return Map containing reconciliation statistics
   */
  public Map<String, Long> generateBatchReconciliationReport(String batchId) {
    log.info("Generating reconciliation report for batchId: {}", batchId);
    Map<String, Long> results = new HashMap<>();

    long totalRecords = referenceDataRepository.countByBatchId(batchId);
    long processedRecords =
        referenceDataRepository.countByBatchIdAndProcessingStatus(
            batchId, PROCESSING_STATUS_PROCESSED);
    long errorRecords =
        referenceDataRepository.countByBatchIdAndProcessingStatus(batchId, PROCESSING_STATUS_ERROR);
    long pendingRecords =
        referenceDataRepository.countByBatchIdAndProcessingStatus(batchId, PROCESSING_STATUS_PENDING);

    results.put("totalRecords", totalRecords);
    results.put("processedRecords", processedRecords);
    results.put("errorRecords", errorRecords);
    results.put("pendingRecords", pendingRecords);

    log.info("Reconciliation statistics: {}", results);
    return results;
  }

  /**
   * Scheduled task to process batch files from the input directory
   */
  @Scheduled(cron = "0 0 1 * * SUN")
  public void scheduledBatchProcessing() {
    log.info("Starting scheduled batch processing");

    try {
      Path inputDir = Paths.get(batchInputDirectory);
      if (Files.exists(inputDir) && Files.isDirectory(inputDir)) {
        Files.list(inputDir)
            .filter(Files::isRegularFile)
            .forEach(
                filePath -> {
                  File batchFile = filePath.toFile();
                  String fileName = batchFile.getName();
                  String source = null;

                  if (fileName.startsWith("reuters")) {
                    source = "Reuters";
                  } else if (fileName.startsWith("bloomberg")) {
                    source = "Bloomberg";
                  }

                  if (source != null) {
                    processBatchFile(batchFile, source);
                  } else {
                    log.warn("Skipping file with unknown source: {}", fileName);
                  }
                });
      } else {
        log.warn("Batch input directory does not exist or is not a directory: {}", batchInputDirectory);
      }

      log.info("Completed scheduled batch processing");
    } catch (IOException e) {
      log.error("Error during scheduled batch processing: {}", e.getMessage(), e);
    }
  }

  /**
   * Gets the current processing status for a batch
   *
   * @param batchId The batch ID
   * @return Map containing processing status information
   */
  public Map<String, Object> getProcessingStatus(String batchId) {
    log.info("Retrieving processing status for batchId: {}", batchId);
    Map<String, Long> reconciliation = generateBatchReconciliationReport(batchId);

    Map<String, Object> results = new HashMap<>();
    results.put("batchId", batchId);
    results.putAll(reconciliation);

    long total = reconciliation.getOrDefault("totalRecords", 0L);
    long processed = reconciliation.getOrDefault("processedRecords", 0L);
    double completionPercentage = total > 0 ? ((double) processed / total) * 100 : 0;
    results.put("completionPercentage", completionPercentage);

    String overallStatus = "IN_PROGRESS";
    if (reconciliation.getOrDefault("errorRecords", 0L) > 0) {
      overallStatus = "FAILED";
    } else if (completionPercentage == 100) {
      overallStatus = "COMPLETED";
    }
    results.put("overallStatus", overallStatus);

    return results;
  }

  /**
   * Reprocesses reference data items that failed processing
   *
   * @param batchId The batch ID
   * @return Number of successfully reprocessed items
   */
  @Transactional
  public int reprocessFailedItems(String batchId) {
    log.info("Reprocessing failed items for batchId: {}", batchId);
    List<SecurityReferenceData> errorItems =
        referenceDataRepository.findByBatchIdAndProcessingStatus(batchId, PROCESSING_STATUS_ERROR);

    int successCount = 0;
    for (SecurityReferenceData item : errorItems) {
      if (processReferenceData(item)) {
        successCount++;
      }
    }

    log.info("Successfully reprocessed {} items for batchId: {}", successCount, batchId);
    return successCount;
  }
}