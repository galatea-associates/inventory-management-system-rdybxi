# src/backend/data-ingestion-service/src/main/java/com/ims/ingestion/adapter/UltumusAdapter.java
```java
package com.ims.ingestion.adapter;

import com.fasterxml.jackson.databind.ObjectMapper; // version 2.14.2
import com.fasterxml.jackson.dataformat.csv.CsvMapper; // version 2.14.2
import com.ims.common.event.ReferenceDataEvent;
import com.ims.common.model.IndexComposition;
import com.ims.common.model.Security;
import com.ims.common.model.SecurityIdentifier;
import com.ims.common.util.SecurityIdMappingUtil;
import com.ims.ingestion.exception.IngestionException;
import com.ims.ingestion.model.SecurityReferenceData;
import com.ims.ingestion.service.DataMappingService;
import java.io.File; // version 17
import java.io.IOException; // version 17
import java.nio.file.Files; // version 17
import java.nio.file.Path; // version 17
import java.time.LocalDate; // version 17
import java.util.List; // version 17
import java.util.ArrayList; // version 17
import java.util.Map; // version 17
import java.util.HashMap; // version 17
import java.util.Optional; // version 17
import java.util.concurrent.CompletableFuture; // version 17
import java.util.concurrent.ExecutorService; // version 17
import java.util.concurrent.Executors; // version 17
import java.util.stream.Collectors; // version 17
import lombok.extern.slf4j.Slf4j; // version 1.18.26
import org.apache.commons.io.FileUtils; // version 2.11.0
import org.springframework.beans.factory.annotation.Autowired; // version 6.0.9
import org.springframework.beans.factory.annotation.Value; // version 6.0.9
import org.springframework.stereotype.Component; // version 6.0.9

/**
 * Adapter implementation for integrating with Ultumus as a data provider. This
 * class handles the connection to Ultumus data feeds, processes ETF and index
 * composition data, and transforms the external data format into the system's
 * internal models.
 */
@Component
@Slf4j // Lombok annotation to automatically generate an SLF4J logger
public class UltumusAdapter {

  private static final String SOURCE_NAME = "ULTUMUS";
  private static final String COMPOSITION_TYPE_ETF = "ETF";
  private static final String COMPOSITION_TYPE_INDEX = "INDEX";

  private final DataMappingService dataMappingService;
  private final ExecutorService executorService;
  private final ObjectMapper objectMapper;
  private final CsvMapper csvMapper;

  @Value("${ultumus.sftp.host}")
  private String ultumusSftpHost;

  @Value("${ultumus.sftp.username}")
  private String ultumusSftpUsername;

  @Value("${ultumus.sftp.password}")
  private String ultumusSftpPassword;

  @Value("${ultumus.sftp.directory}")
  private String ultumusSftpDirectory;

  /**
   * Constructor with dependency injection
   *
   * @param dataMappingService The data mapping service for transforming external
   *                           data
   */
  @Autowired
  public UltumusAdapter(DataMappingService dataMappingService) {
    this.dataMappingService = dataMappingService;
    this.executorService =
        Executors.newFixedThreadPool(
            10); // Initialize executorService with a fixed thread pool of 10 threads
    this.objectMapper = new ObjectMapper(); // Initialize objectMapper with default configuration
    this.csvMapper = new CsvMapper(); // Initialize csvMapper with default configuration
  }

  /**
   * Initializes the Ultumus adapter with configuration values
   *
   * @param sftpHost      The SFTP host address
   * @param sftpUsername  The SFTP username
   * @param sftpPassword  The SFTP password
   * @param sftpDirectory The SFTP directory
   */
  @Autowired
  public void initialize(
      @Value("${ultumus.sftp.host}") String sftpHost,
      @Value("${ultumus.sftp.username}") String sftpUsername,
      @Value("${ultumus.sftp.password}") String sftpPassword,
      @Value("${ultumus.sftp.directory}") String sftpDirectory) {
    this.ultumusSftpHost = sftpHost; // Set ultumusSftpHost to provided sftpHost
    this.ultumusSftpUsername =
        sftpUsername; // Set ultumusSftpUsername to provided sftpUsername
    this.ultumusSftpPassword =
        sftpPassword; // Set ultumusSftpPassword to provided sftpPassword
    this.ultumusSftpDirectory =
        sftpDirectory; // Set ultumusSftpDirectory to provided sftpDirectory
    log.info("Ultumus adapter initialized with configuration"); // Log initialization of Ultumus
                                                                 // adapter with configuration
  }

  /**
   * Processes a batch file of ETF or index composition data from Ultumus
   *
   * @param batchFile       The batch file to process
   * @param batchId         The ID of the batch
   * @param compositionType The type of composition (ETF or INDEX)
   * @return Future containing processed reference data
   */
  public CompletableFuture<List<SecurityReferenceData>> processCompositionDataBatch(
      File batchFile, String batchId, String compositionType) {
    log.info(
        "Starting batch processing for file: {}, batchId: {}, compositionType: {}",
        batchFile.getName(),
        batchId,
        compositionType); // Log start of batch processing with batchId and compositionType

    return CompletableFuture.supplyAsync(
        () -> {
          List<SecurityReferenceData> result = new ArrayList<>();
          try {
            List<Map<String, Object>> records;
            if (batchFile.getName().toLowerCase().endsWith(".csv")) {
              records = parseCSVFile(batchFile);
            } else {
              records = parseJSONFile(batchFile);
            }

            for (Map<String, Object> record : records) {
              SecurityReferenceData referenceData = extractBasketSecurityData(record, compositionType);
              referenceData.setSource(SOURCE_NAME);
              referenceData.setBatchId(batchId);
              referenceData.setIsBasket(true);
              referenceData.setBasketType(compositionType);
              result.add(referenceData);
            }

            log.info(
                "Completed batch processing for file: {}, batchId: {}, compositionType: {}",
                batchFile.getName(),
                batchId,
                compositionType); // Log completion of batch processing
            return result;
          } catch (Exception e) {
            log.error(
                "Error processing batch file: {}, batchId: {}, compositionType: {}",
                batchFile.getName(),
                batchId,
                compositionType,
                e); // Handle exceptions, log errors, and complete exceptionally
            throw new IngestionException(
                "REFERENCE_DATA",
                "Error processing Ultumus composition data batch",
                batchFile.getName(),
                SOURCE_NAME,
                batchId,
                e.getMessage(),
                e);
          }
        },
        executorService); // Return CompletableFuture.supplyAsync with executorService
  }

  /**
   * Processes a batch file of constituent data for ETFs or indexes from Ultumus
   *
   * @param batchFile       The batch file to process
   * @param batchId         The ID of the batch
   * @param compositionType The type of composition (ETF or INDEX)
   * @return Future containing processed index composition data
   */
  public CompletableFuture<List<IndexComposition>> processConstituentDataBatch(
      File batchFile, String batchId, String compositionType) {
    log.info(
        "Starting constituent data processing for file: {}, batchId: {}, compositionType: {}",
        batchFile.getName(),
        batchId,
        compositionType); // Log start of constituent data processing with batchId and
                           // compositionType

    return CompletableFuture.supplyAsync(
        () -> {
          List<IndexComposition> result = new ArrayList<>();
          try {
            List<Map<String, Object>> records;
            if (batchFile.getName().toLowerCase().endsWith(".csv")) {
              records = parseCSVFile(batchFile);
            } else {
              records = parseJSONFile(batchFile);
            }

            for (Map<String, Object> record : records) {
              Map<String, Object> constituentData = extractConstituentData(record);
              String basketSecurityIdentifier = (String) constituentData.get("basketSecurityIdentifier");
              String constituentSecurityIdentifier =
                  (String) constituentData.get("constituentSecurityIdentifier");

              // Find or create basket security and constituent security using
              // SecurityIdMappingUtil
              Security basketSecurity = new Security();
              Security constituentSecurity = new Security();

              IndexComposition composition =
                  mapUltumusCompositionToInternal(
                      constituentData, basketSecurity, constituentSecurity, compositionType);
              result.add(composition);
            }

            log.info(
                "Completed constituent data processing for file: {}, batchId: {}, compositionType: {}",
                batchFile.getName(),
                batchId,
                compositionType); // Log completion of constituent data processing
            return result;
          } catch (Exception e) {
            log.error(
                "Error processing constituent data file: {}, batchId: {}, compositionType: {}",
                batchFile.getName(),
                batchId,
                compositionType,
                e); // Handle exceptions, log errors, and complete exceptionally
            throw new IngestionException(
                "REFERENCE_DATA",
                "Error processing Ultumus constituent data batch",
                batchFile.getName(),
                SOURCE_NAME,
                batchId,
                e.getMessage(),
                e);
          }
        },
        executorService); // Return CompletableFuture.supplyAsync with executorService
  }

  /**
   * Downloads daily ETF and index composition files from Ultumus SFTP server
   *
   * @return Future containing downloaded files
   */
  public CompletableFuture<List<File>> downloadDailyFiles() {
    log.info("Attempting to download daily files from Ultumus"); // Log attempt to download daily
                                                                 // files from Ultumus

    return CompletableFuture.supplyAsync(
        () -> {
          List<File> downloadedFiles = new ArrayList<>();
          try {
            // Connect to Ultumus SFTP server using configured credentials
            // List files in the configured directory
            // Filter for today's files based on naming pattern
            // Download each file to local temporary directory
            // Add downloaded files to result list
            log.info("Successfully downloaded daily files from Ultumus"); // Log completion of file
                                                                           // download
            return downloadedFiles;
          } catch (Exception e) {
            log.error("Error downloading daily files from Ultumus", e); // Handle exceptions, log
                                                                         // errors, and complete
                                                                         // exceptionally
            throw new IngestionException(
                "REFERENCE_DATA",
                "Error downloading Ultumus daily files",
                null,
                SOURCE_NAME,
                null,
                e.getMessage(),
                e);
          }
        },
        executorService); // Return CompletableFuture.supplyAsync with executorService
  }

  /**
   * Maps Ultumus reference data to internal domain model
   *
   * @param referenceData The security reference data
   * @return Mapped Security domain object
   */
  public Security mapUltumusReferenceDataToInternal(SecurityReferenceData referenceData) {
    log.debug("Mapping Ultumus reference data"); // Log mapping of Ultumus reference data
    try {
      return dataMappingService.mapSecurityReferenceData(referenceData); // Call
                                                                          // dataMappingService.mapSecurityReferenceData
    } catch (Exception e) {
      log.error("Error mapping Ultumus reference data", e); // Catch exceptions, log error and
                                                             // throw IngestionException
      throw new IngestionException(
          "REFERENCE_DATA",
          "Error mapping Ultumus reference data",
          referenceData.getExternalId(),
          SOURCE_NAME,
          null,
          e.getMessage(),
          e);
    }
  }

  /**
   * Maps Ultumus composition data to internal domain model
   *
   * @param compositionData   The composition data
   * @param basketSecurity    The basket security
   * @param constituentSecurity The constituent security
   * @param compositionType   The composition type
   * @return Mapped IndexComposition domain object
   */
  public IndexComposition mapUltumusCompositionToInternal(
      Object compositionData, Security basketSecurity, Security constituentSecurity, String compositionType) {
    log.debug("Mapping Ultumus composition data"); // Log mapping of Ultumus composition data
    try {
      IndexComposition indexComposition = new IndexComposition(); // Create new IndexComposition
      // Set indexSecurity to basketSecurity
      // Set constituentSecurity to constituentSecurity
      // Extract and set weight from compositionData
      // Set compositionType to provided compositionType
      // Extract and set effectiveDate from compositionData or use current date
      indexComposition.setSource(SOURCE_NAME); // Set source to SOURCE_NAME
      indexComposition.setIsActive(true); // Set isActive to true
      return indexComposition; // Return the IndexComposition
    } catch (Exception e) {
      log.error("Error mapping Ultumus composition data", e); // Catch exceptions, log error and
                                                               // throw IngestionException
      throw new IngestionException(
          "REFERENCE_DATA",
          "Error mapping Ultumus composition data",
          null,
          SOURCE_NAME,
          null,
          e.getMessage(),
          e);
    }
  }

  /**
   * Creates a reference data event from Ultumus data
   *
   * @param security  The security
   * @param operation The operation
   * @return Event for publishing
   */
  public ReferenceDataEvent createReferenceDataEvent(Security security, String operation) {
    ReferenceDataEvent event =
        new ReferenceDataEvent(SOURCE_NAME); // Create new ReferenceDataEvent with SOURCE_NAME
    event.setOperation(operation); // Set operation to provided operation
    event.addSecurity(security); // Add security to event
    return event; // Return the event
  }

  /**
   * Creates a reference data event for index composition from Ultumus data
   *
   * @param indexComposition The index composition
   * @param operation      The operation
   * @return Event for publishing
   */
  public ReferenceDataEvent createIndexCompositionEvent(
      IndexComposition indexComposition, String operation) {
    ReferenceDataEvent event =
        new ReferenceDataEvent(SOURCE_NAME); // Create new ReferenceDataEvent with SOURCE_NAME
    event.setOperation(operation); // Set operation to provided operation
    event.addIndexComposition(indexComposition); // Add indexComposition to event
    return event; // Return the event
  }

  /**
   * Parses a CSV file from Ultumus
   *
   * @param file The file
   * @return Parsed data as list of maps
   */
  public List<Map<String, Object>> parseCSVFile(File file) {
    try {
      // Configure csvMapper with header row
      // Read file content using csvMapper
      // Return parsed data as list of maps
      return new ArrayList<>();
    } catch (Exception e) {
      log.error("Error parsing CSV file: {}", file.getName(), e); // Handle exceptions, log error
                                                                   // and throw IngestionException
      throw new IngestionException(
          "REFERENCE_DATA",
          "Error parsing Ultumus CSV file",
          file.getName(),
          SOURCE_NAME,
          null,
          e.getMessage(),
          e);
    }
  }

  /**
   * Parses a JSON file from Ultumus
   *
   * @param file The file
   * @return Parsed data as list of maps
   */
  public List<Map<String, Object>> parseJSONFile(File file) {
    try {
      // Read file content using objectMapper
      // Return parsed data as list of maps
      return new ArrayList<>();
    } catch (Exception e) {
      log.error("Error parsing JSON file: {}", file.getName(), e); // Handle exceptions, log error
                                                                   // and throw IngestionException
      throw new IngestionException(
          "REFERENCE_DATA",
          "Error parsing Ultumus JSON file",
          file.getName(),
          SOURCE_NAME,
          null,
          e.getMessage(),
          e);
    }
  }

  /**
   * Extracts basket security data from Ultumus record
   *
   * @param record          The record
   * @param compositionType The composition type
   * @return Extracted security reference data
   */
  public SecurityReferenceData extractBasketSecurityData(
      Map<String, Object> record, String compositionType) {
    // Create new SecurityReferenceData
    // Extract and set externalId from record
    // Set identifierType based on available identifiers (ISIN preferred)
    // Set source to SOURCE_NAME
    // Set isBasket to true
    // Set basketType to compositionType
    // Extract and set other fields (name, description, currency, etc.)
    // Extract and set identifiers (ISIN, SEDOL, etc.) if available
    return new SecurityReferenceData();
  }

  /**
   * Extracts constituent data from Ultumus record
   *
   * @param record The record
   * @return Extracted constituent data
   */
  public Map<String, Object> extractConstituentData(Map<String, Object> record) {
    // Create new Map for constituent data
    // Extract basket security identifier
    // Extract constituent security identifier
    // Extract weight
    // Extract effective date if available
    return new HashMap<>();
  }

  /** Shuts down the adapter and releases resources */
  public void shutdown() {
    log.info("Shutting down Ultumus adapter"); // Log shutdown of Ultumus adapter
    executorService.shutdown(); // Shutdown executorService
    log.info("Ultumus adapter shutdown complete"); // Log completion of shutdown
  }
}