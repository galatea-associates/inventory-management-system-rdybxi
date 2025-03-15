package com.ims.ingestion.service;

import com.ims.common.event.BaseEvent; // Base class for all events in the system
import com.ims.common.event.ReferenceDataEvent; // Event class for publishing reference data changes
import com.ims.common.model.Contract; // Core domain model that contract data is mapped to
import com.ims.ingestion.exception.IngestionException; // Exception for handling contract data processing failures
import com.ims.ingestion.model.ContractData; // Entity class for contract data being processed by this service
import com.ims.ingestion.repository.ContractDataRepository; // Repository for accessing and managing contract data
import java.time.LocalDateTime; // version 17
import java.util.ArrayList; // version 17
import java.util.List; // version 17
import java.util.Optional; // version 17
import java.util.UUID; // version 17
import lombok.extern.slf4j.Slf4j; // version 1.18.26
import org.springframework.beans.factory.annotation.Autowired; // version 6.0.9
import org.springframework.kafka.core.KafkaTemplate; // version 3.0.5
import org.springframework.stereotype.Service; // version 6.0.9
import org.springframework.transaction.annotation.Transactional; // version 6.0.9

/**
 * Service responsible for processing and managing contract data during the
 * ingestion process. Handles validation, transformation, and event publishing
 * for contract data from various sources.
 */
@Service
@Slf4j
public class ContractDataService {

  private final ContractDataRepository contractDataRepository;
  private final DataMappingService dataMappingService;
  private final KafkaTemplate<String, Object> kafkaTemplate;
  private final String contractEventTopic = "contract-events";

  /**
   * Constructor with dependency injection
   *
   * @param contractDataRepository Repository for accessing and managing contract
   *                               data
   * @param dataMappingService Service for mapping between external and internal
   *                               data models
   * @param kafkaTemplate Template for sending messages to Kafka topics
   */
  @Autowired
  public ContractDataService(
      ContractDataRepository contractDataRepository,
      DataMappingService dataMappingService,
      KafkaTemplate<String, Object> kafkaTemplate) {
    this.contractDataRepository = contractDataRepository;
    this.dataMappingService = dataMappingService;
    this.kafkaTemplate = kafkaTemplate;
  }

  /**
   * Processes a single contract data item
   *
   * @param contractData The contract data to process
   * @return The processed contract domain object
   */
  @Transactional
  public Contract processContractData(ContractData contractData) {
    log.info("Starting processing for contract data: {}", contractData.getExternalContractId());

    // Validate the contract data using contractData.validate()
    if (!validateContractData(contractData)) {
      log.error(
          "Contract data validation failed for contract: {}", contractData.getExternalContractId());
      throw IngestionException.forContractData(
          contractData.getExternalContractId(),
          contractData.getDataSource(),
          "Contract data validation failed");
    }

    // Check for existing contract with the same external ID
    Optional<ContractData> existingContractData =
        contractDataRepository.findByExternalContractId(contractData.getExternalContractId());

    if (existingContractData.isPresent()) {
      log.info(
          "Updating existing contract data with external ID: {}", contractData.getExternalContractId());
    } else {
      log.info("Saving new contract data with external ID: {}", contractData.getExternalContractId());
    }

    // Resolve security and counterparty references using dataMappingService
    // Transform contract data to Contract domain object using contractData.toContract()
    Contract contract = contractData.toContract();

    // Publish contract event to Kafka
    publishContractEvent(contract);

    // Mark contract data as processed
    contractData.markAsProcessed();

    // Return the processed Contract domain object
    return contract;
  }

  /**
   * Processes a batch of contract data items
   *
   * @param contractDataList The list of contract data to process
   * @return The batch ID for the processed batch
   */
  @Transactional
  public String processBatchContractData(List<ContractData> contractDataList) {
    log.info("Starting batch processing for {} contract data items", contractDataList.size());

    // Generate a unique batch ID using UUID
    String batchId = UUID.randomUUID().toString();

    // Set the batch ID on all contract data items
    contractDataList.forEach(contractData -> contractData.setBatchId(batchId));

    // Save all contract data items to the repository
    contractDataRepository.saveAll(contractDataList);

    // Process each contract data item in the batch
    int successCount = 0;
    int errorCount = 0;

    for (ContractData contractData : contractDataList) {
      try {
        processContractData(contractData);
        successCount++;
      } catch (IngestionException e) {
        log.error(
            "Error processing contract data with external ID: {}. Error: {}",
            contractData.getExternalContractId(),
            e.getMessage());
        errorCount++;
      }
    }

    // Log completion of batch processing with success/failure counts
    log.info(
        "Completed batch processing for batch ID: {}. Success: {}, Errors: {}",
        batchId,
        successCount,
        errorCount);

    // Return the batch ID
    return batchId;
  }

  /**
   * Retrieves contract data by its external ID
   *
   * @param externalContractId The external contract ID
   * @return The contract data if found, or empty Optional otherwise
   */
  public Optional<ContractData> getContractDataByExternalId(String externalContractId) {
    // Call contractDataRepository.findByExternalContractId(externalContractId)
    // Return the result
    return contractDataRepository.findByExternalContractId(externalContractId);
  }

  /**
   * Retrieves all contract data items for a specific batch
   *
   * @param batchId The batch ID
   * @return List of contract data items in the batch
   */
  public List<ContractData> getContractDataByBatchId(String batchId) {
    // Call contractDataRepository.findByBatchId(batchId)
    // Return the result
    return contractDataRepository.findByBatchId(batchId);
  }

  /**
   * Retrieves all contract data items with a specific processing status
   *
   * @param processingStatus The processing status
   * @return List of contract data items with the specified status
   */
  public List<ContractData> getContractDataByStatus(String processingStatus) {
    // Call contractDataRepository.findByProcessingStatus(processingStatus)
    // Return the result
    return contractDataRepository.findByProcessingStatus(processingStatus);
  }

  /**
   * Retrieves all contract data items for a specific batch with a specific
   * processing status
   *
   * @param batchId The batch ID
   * @param processingStatus The processing status
   * @return List of contract data items in the batch with the specified status
   */
  public List<ContractData> getContractDataByBatchIdAndStatus(String batchId, String processingStatus) {
    // Call contractDataRepository.findByBatchIdAndProcessingStatus(batchId, processingStatus)
    // Return the result
    return contractDataRepository.findByBatchIdAndProcessingStatus(batchId, processingStatus);
  }

  /**
   * Gets the processing status of a batch
   *
   * @param batchId The batch ID
   * @return Status information for the batch
   */
  public BatchStatus getBatchStatus(String batchId) {
    // Get total count of items in batch
    long totalCount = contractDataRepository.countByBatchId(batchId);

    // Get count of processed items
    long processedCount =
        contractDataRepository.countByBatchIdAndProcessingStatus(batchId, "PROCESSED");

    // Get count of error items
    long errorCount = contractDataRepository.countByBatchIdAndProcessingStatus(batchId, "ERROR");

    // Get count of pending items
    long pendingCount = totalCount - processedCount - errorCount;

    // Calculate completion percentage
    double completionPercentage = (totalCount > 0) ? ((double) (processedCount + errorCount) / totalCount) * 100 : 0;

    // Create and return BatchStatus object with the collected information
    return new BatchStatus(batchId, (int) totalCount, (int) processedCount, (int) errorCount, (int) pendingCount);
  }

  /**
   * Deletes all contract data items for a specific batch
   *
   * @param batchId The batch ID
   */
  @Transactional
  public void deleteBatch(String batchId) {
    log.info("Starting deletion of batch with ID: {}", batchId);

    // Call contractDataRepository.deleteByBatchId(batchId)
    contractDataRepository.deleteByBatchId(batchId);

    log.info("Completed deletion of batch with ID: {}", batchId);
  }

  /**
   * Finds contracts with duplicate external IDs
   *
   * @return List of contract data items with duplicate external IDs
   */
  public List<ContractData> findDuplicateContracts() {
    // Call contractDataRepository.findDuplicateContracts()
    // Return the result
    return contractDataRepository.findDuplicateContracts();
  }

  /**
   * Reprocesses contract data items that previously failed processing
   *
   * @param batchId The batch ID
   * @return Number of successfully reprocessed items
   */
  @Transactional
  public int reprocessFailedContracts(String batchId) {
    log.info("Starting reprocessing failed contracts for batch ID: {}", batchId);

    // Get all contract data items with error status for the batch
    List<ContractData> failedContracts =
        contractDataRepository.findByBatchIdAndProcessingStatus(batchId, "ERROR");

    int successCount = 0;

    // Attempt to process each item
    for (ContractData contractData : failedContracts) {
      try {
        processContractData(contractData);
        successCount++;
      } catch (IngestionException e) {
        log.error(
            "Error reprocessing contract data with external ID: {}. Error: {}",
            contractData.getExternalContractId(),
            e.getMessage());
      }
    }

    // Log completion of reprocessing with success count
    log.info(
        "Completed reprocessing failed contracts for batch ID: {}. Success: {}", batchId, successCount);

    // Return the count of successfully reprocessed items
    return successCount;
  }

  /**
   * Publishes a contract event to Kafka
   *
   * @param contract The contract to publish
   */
  private void publishContractEvent(Contract contract) {
    // Create a new event with contract data
    ReferenceDataEvent event = new ReferenceDataEvent("contract-data-service");

    // Set event type based on contract type
    event.setEntityType(contract.getContractType());

    // Set event source to 'contract-data-service'
    event.setDataSource("contract-data-service");

    // Log publishing of event
    log.info("Publishing contract event to Kafka for contract: {}", contract.getExternalContractId());

    // Send event to Kafka using kafkaTemplate.send(contractEventTopic,
    // contract.getExternalContractId(), event)
    kafkaTemplate.send(contractEventTopic, contract.getExternalContractId(), event);
  }

  /**
   * Validates contract data before processing
   *
   * @param contractData The contract data to validate
   * @return True if the contract data is valid, false otherwise
   */
  private boolean validateContractData(ContractData contractData) {
    // Check if contractData is not null
    if (contractData == null) {
      return false;
    }

    // Call contractData.validate() to perform business validation
    return contractData.validate();
  }

  /**
   * Resolves security and counterparty references in contract data
   *
   * @param contractData The contract data to resolve references for
   */
  private void resolveReferences(ContractData contractData) {
    // If securityId is not null, try to find the security using
    // dataMappingService.findExistingSecurity()
    // If security found, set it on the contract data

    // If counterpartyId is not null, try to find the counterparty using
    // dataMappingService.findExistingCounterparty()
    // If counterparty found, set it on the contract data
  }

  /** Inner class representing the processing status of a batch of contract data */
  public static class BatchStatus {

    private final String batchId;
    private final int totalCount;
    private final int processedCount;
    private final int errorCount;
    private final int pendingCount;
    private final double completionPercentage;
    private final LocalDateTime startTime;
    private final LocalDateTime lastUpdateTime;

    /**
     * Constructor for BatchStatus
     *
     * @param batchId The batch ID
     * @param totalCount The total number of items in the batch
     * @param processedCount The number of processed items in the batch
     * @param errorCount The number of items with errors in the batch
     * @param pendingCount The number of items pending processing in the batch
     */
    public BatchStatus(String batchId, int totalCount, int processedCount, int errorCount, int pendingCount) {
      this.batchId = batchId;
      this.totalCount = totalCount;
      this.processedCount = processedCount;
      this.errorCount = errorCount;
      this.pendingCount = pendingCount;
      this.completionPercentage = (processedCount + errorCount) / (double) totalCount * 100;
      this.startTime = LocalDateTime.now();
      this.lastUpdateTime = LocalDateTime.now();
    }

    public String getBatchId() {
      return batchId;
    }

    public int getTotalCount() {
      return totalCount;
    }

    public int getProcessedCount() {
      return processedCount;
    }

    public int getErrorCount() {
      return errorCount;
    }

    public int getPendingCount() {
      return pendingCount;
    }

    public double getCompletionPercentage() {
      return completionPercentage;
    }

    public LocalDateTime getStartTime() {
      return startTime;
    }

    public LocalDateTime getLastUpdateTime() {
      return lastUpdateTime;
    }

    /**
     * Checks if the batch processing is complete
     *
     * @return True if the batch is complete, false otherwise
     */
    public boolean isComplete() {
      return pendingCount == 0;
    }

    /**
     * Checks if the batch has any processing errors
     *
     * @return True if the batch has errors, false otherwise
     */
    public boolean hasErrors() {
      return errorCount > 0;
    }
  }
    
    /**
     * No description provided in JSON.
     * @param contract The contract to publish
     */
    public void publishContractEvent(com.ims.common.model.Contract contract) {
        // No code provided in JSON.
    }
}