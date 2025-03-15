package com.ims.ingestion.service;

import com.ims.common.event.ReferenceDataEvent; // internal
import com.ims.common.model.Security; // internal
import com.ims.ingestion.adapter.BloombergAdapter; // internal
import com.ims.ingestion.adapter.ReutersAdapter; // internal
import com.ims.ingestion.exception.IngestionException; // internal
import com.ims.ingestion.model.SecurityReferenceData; // internal
import com.ims.ingestion.repository.ReferenceDataRepository; // internal
import java.io.File; // java.io 17
import java.util.ArrayList; // java.util 17
import java.util.Arrays; // java.util 17
import java.util.HashMap; // java.util 17
import java.util.List; // java.util 17
import java.util.Map; // java.util 17
import java.util.Optional; // java.util 17
import java.util.concurrent.CompletableFuture; // java.util.concurrent 17
import org.junit.jupiter.api.BeforeEach; // org.junit.jupiter.api 5.9.2
import org.junit.jupiter.api.DisplayName; // org.junit.jupiter.api 5.9.2
import org.junit.jupiter.api.Test; // org.junit.jupiter.api 5.9.2
import org.junit.jupiter.api.extension.ExtendWith; // org.junit.jupiter.api.extension 5.9.2
import org.mockito.ArgumentCaptor; // org.mockito 4.8.1
import org.mockito.InjectMocks; // org.mockito 4.8.1
import org.mockito.Mock; // org.mockito 4.8.1
import org.mockito.Mockito; // org.mockito 4.8.1
import org.mockito.junit.jupiter.MockitoExtension; // org.mockito.junit.jupiter 4.8.1
import org.springframework.kafka.core.KafkaTemplate; // org.springframework.kafka.core 3.0.5

import static org.junit.jupiter.api.Assertions.*; // org.junit.jupiter.api 5.9.2
import static org.mockito.ArgumentMatchers.*; // org.mockito 4.8.1
import static org.mockito.Mockito.*; // org.mockito 4.8.1

/**
 * Test class for ReferenceDataService that verifies the functionality for ingesting, processing,
 * and publishing reference data from multiple external sources.
 */
@ExtendWith(MockitoExtension.class)
public class ReferenceDataServiceTest {

  @Mock private ReferenceDataRepository referenceDataRepository;

  @Mock private DataMappingService dataMappingService;

  @Mock private ReutersAdapter reutersAdapter;

  @Mock private BloombergAdapter bloombergAdapter;

  @Mock private KafkaTemplate<String, ReferenceDataEvent> kafkaTemplate;

  @InjectMocks private ReferenceDataService referenceDataService;

  private String referenceDataTopic = "reference-data-topic";

  /** Set up test environment before each test */
  @BeforeEach
  void setUp() {
    // Initialize referenceDataTopic with 'reference-data-topic'
    referenceDataTopic = "reference-data-topic";
    // Initialize referenceDataService with mocked dependencies
    referenceDataService =
        new ReferenceDataService(
            referenceDataRepository, dataMappingService, reutersAdapter, bloombergAdapter, kafkaTemplate);
    // Configure mock behavior for common scenarios
    Mockito.when(kafkaTemplate.send(anyString(), any(ReferenceDataEvent.class)))
        .thenReturn(null); // Mock successful Kafka send
  }

  /** Test processing a batch file from Reuters */
  @Test
  @DisplayName("Should process Reuters batch file successfully")
  void testProcessBatchFile_Reuters() {
    // Create a mock File object for Reuters batch file
    File mockFile = mock(File.class);
    // Create a list of SecurityReferenceData for expected result
    List<SecurityReferenceData> expectedData = new ArrayList<>();
    SecurityReferenceData securityReferenceData =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").build();
    expectedData.add(securityReferenceData);
    // Configure reutersAdapter.processReferenceDataBatch to return CompletableFuture with expected data
    when(reutersAdapter.processReferenceDataBatch(any(File.class), anyString()))
        .thenReturn(CompletableFuture.completedFuture(expectedData));
    // Call referenceDataService.processBatchFile with mock file and 'REUTERS' source
    CompletableFuture<List<SecurityReferenceData>> result =
        referenceDataService.processBatchFile(mockFile, "REUTERS");
    // Verify the result matches expected data
    assertEquals(expectedData, result.join());
    // Verify reutersAdapter.processReferenceDataBatch was called with correct parameters
    verify(reutersAdapter).processReferenceDataBatch(eq(mockFile), anyString());
    // Verify referenceDataRepository.saveAll was called with the expected data
    verify(referenceDataRepository).saveAll(eq(expectedData));
  }

  /** Test processing a batch file from Bloomberg */
  @Test
  @DisplayName("Should process Bloomberg batch file successfully")
  void testProcessBatchFile_Bloomberg() {
    // Create a mock File object for Bloomberg batch file
    File mockFile = mock(File.class);
    // Create a list of SecurityReferenceData for expected result
    List<SecurityReferenceData> expectedData = new ArrayList<>();
    SecurityReferenceData securityReferenceData =
        SecurityReferenceData.builder().externalId("AAPL US Equity").identifierType("BLOOMBERG_ID").source("BLOOMBERG").build();
    expectedData.add(securityReferenceData);
    // Configure bloombergAdapter.processReferenceDataBatch to return CompletableFuture with expected data
    when(bloombergAdapter.processReferenceDataBatch(any(File.class), anyString()))
        .thenReturn(CompletableFuture.completedFuture(expectedData));
    // Call referenceDataService.processBatchFile with mock file and 'BLOOMBERG' source
    CompletableFuture<List<SecurityReferenceData>> result =
        referenceDataService.processBatchFile(mockFile, "BLOOMBERG");
    // Verify the result matches expected data
    assertEquals(expectedData, result.join());
    // Verify bloombergAdapter.processReferenceDataBatch was called with correct parameters
    verify(bloombergAdapter).processReferenceDataBatch(eq(mockFile), anyString());
    // Verify referenceDataRepository.saveAll was called with the expected data
    verify(referenceDataRepository).saveAll(eq(expectedData));
  }

  /** Test processing a batch file from an unsupported source */
  @Test
  @DisplayName("Should throw exception for unsupported source")
  void testProcessBatchFile_UnsupportedSource() {
    // Create a mock File object for batch file
    File mockFile = mock(File.class);
    // Call referenceDataService.processBatchFile with mock file and 'UNSUPPORTED' source
    // Verify that IngestionException is thrown with appropriate message
    Exception exception =
        assertThrows(
            IngestionException.class,
            () -> referenceDataService.processBatchFile(mockFile, "UNSUPPORTED"));
    assertEquals("Unsupported data source: UNSUPPORTED", exception.getMessage());
  }

  /** Test processing a batch of reference data by batch ID */
  @Test
  @DisplayName("Should process batch by ID successfully")
  void testProcessBatch() {
    // Create a batch ID string
    String batchId = "batch123";
    // Create a list of SecurityReferenceData for the batch
    List<SecurityReferenceData> referenceDataList = new ArrayList<>();
    SecurityReferenceData securityReferenceData =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").processingStatus("PENDING").build();
    referenceDataList.add(securityReferenceData);
    // Configure referenceDataRepository.findByBatchId to return the test data
    when(referenceDataRepository.findByBatchId(batchId)).thenReturn(referenceDataList);
    // Configure referenceDataRepository.findDuplicatesByBatchId to return empty list
    when(referenceDataRepository.findDuplicatesByBatchId(batchId)).thenReturn(new ArrayList<>());
    // Configure dataMappingService.mapSecurityReferenceData to return a Security object
    Security security = Security.builder().internalId("IMS-REUTERS_ID-AAPL.O").build();
    when(dataMappingService.mapSecurityReferenceData(any(SecurityReferenceData.class)))
        .thenReturn(security);
    // Call referenceDataService.processBatch with the batch ID
    referenceDataService.processBatch(batchId);
    // Verify referenceDataRepository.findByBatchId was called with correct batch ID
    verify(referenceDataRepository).findByBatchId(batchId);
    // Verify referenceDataRepository.findDuplicatesByBatchId was called with correct batch ID
    verify(referenceDataRepository).findDuplicatesByBatchId(batchId);
    // Verify dataMappingService.mapSecurityReferenceData was called for each item
    verify(dataMappingService).mapSecurityReferenceData(any(SecurityReferenceData.class));
    // Verify kafkaTemplate.send was called for each item
    verify(kafkaTemplate).send(anyString(), any(ReferenceDataEvent.class));
    // Verify each SecurityReferenceData was marked as processed
    assertEquals("PROCESSED", securityReferenceData.getProcessingStatus());
    // Verify referenceDataRepository.save was called for each item
    verify(referenceDataRepository).save(any(SecurityReferenceData.class));
  }

  /** Test processing a batch with duplicate reference data */
  @Test
  @DisplayName("Should handle duplicates in batch processing")
  void testProcessBatch_WithDuplicates() {
    // Create a batch ID string
    String batchId = "batch123";
    // Create a list of SecurityReferenceData for the batch
    List<SecurityReferenceData> referenceDataList = new ArrayList<>();
    SecurityReferenceData securityReferenceData =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").processingStatus("PENDING").build();
    referenceDataList.add(securityReferenceData);
    // Create a list of duplicate SecurityReferenceData
    List<SecurityReferenceData> duplicateList = new ArrayList<>();
    SecurityReferenceData duplicate =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").processingStatus("PENDING").build();
    duplicateList.add(duplicate);
    // Configure referenceDataRepository.findByBatchId to return the test data
    when(referenceDataRepository.findByBatchId(batchId)).thenReturn(referenceDataList);
    // Configure referenceDataRepository.findDuplicatesByBatchId to return the duplicates
    when(referenceDataRepository.findDuplicatesByBatchId(batchId)).thenReturn(duplicateList);
    // Call referenceDataService.processBatch with the batch ID
    referenceDataService.processBatch(batchId);
    // Verify referenceDataRepository.findByBatchId was called with correct batch ID
    verify(referenceDataRepository).findByBatchId(batchId);
    // Verify referenceDataRepository.findDuplicatesByBatchId was called with correct batch ID
    verify(referenceDataRepository).findDuplicatesByBatchId(batchId);
    // Verify duplicate items were marked as error with appropriate message
    assertEquals("ERROR", duplicate.getProcessingStatus());
    assertEquals("Duplicate entry in batch", duplicate.getErrorMessage());
    // Verify referenceDataRepository.save was called for the duplicate items
    verify(referenceDataRepository).save(any(SecurityReferenceData.class));
  }

  /** Test processing a valid reference data item */
  @Test
  @DisplayName("Should process valid reference data successfully")
  void testProcessReferenceData_Valid() {
    // Create a SecurityReferenceData object with valid data
    SecurityReferenceData referenceData =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").build();
    // Configure referenceData.validate to return true
    // Configure findExistingReferenceData to return empty Optional
    when(referenceDataRepository.findByExternalIdAndIdentifierTypeAndSource(anyString(), anyString(), anyString()))
        .thenReturn(Optional.empty());
    // Configure dataMappingService.mapSecurityReferenceData to return a Security object
    Security security = Security.builder().internalId("IMS-REUTERS_ID-AAPL.O").build();
    when(dataMappingService.mapSecurityReferenceData(any(SecurityReferenceData.class)))
        .thenReturn(security);
    // Call referenceDataService.processReferenceData with the test data
    boolean result = referenceDataService.processReferenceData(referenceData);
    // Verify the result is true
    assertTrue(result);
    // Verify dataMappingService.mapSecurityReferenceData was called
    verify(dataMappingService).mapSecurityReferenceData(any(SecurityReferenceData.class));
    // Verify kafkaTemplate.send was called with correct parameters
    verify(kafkaTemplate).send(anyString(), any(ReferenceDataEvent.class));
    // Verify referenceData was marked as processed
    assertEquals("PROCESSED", referenceData.getProcessingStatus());
  }

  /** Test processing an invalid reference data item */
  @Test
  @DisplayName("Should handle invalid reference data")
  void testProcessReferenceData_Invalid() {
    // Create a SecurityReferenceData object with invalid data
    SecurityReferenceData referenceData = new SecurityReferenceData(); // Missing required fields
    // Configure referenceData.validate to return false
    // Call referenceDataService.processReferenceData with the test data
    boolean result = referenceDataService.processReferenceData(referenceData);
    // Verify the result is false
    assertFalse(result);
    // Verify referenceData was marked as error with appropriate message
    assertEquals("ERROR", referenceData.getProcessingStatus());
    assertNotNull(referenceData.getErrorMessage());
    // Verify dataMappingService.mapSecurityReferenceData was not called
    verify(dataMappingService, never()).mapSecurityReferenceData(any(SecurityReferenceData.class));
    // Verify kafkaTemplate.send was not called
    verify(kafkaTemplate, never()).send(anyString(), any(ReferenceDataEvent.class));
  }

  /** Test processing reference data that already exists */
  @Test
  @DisplayName("Should handle existing reference data as update")
  void testProcessReferenceData_ExistingData() {
    // Create a SecurityReferenceData object with valid data
    SecurityReferenceData referenceData =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").build();
    // Create an existing SecurityReferenceData object
    SecurityReferenceData existingData =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").build();
    // Configure referenceData.validate to return true
    // Configure findExistingReferenceData to return Optional with existing data
    when(referenceDataRepository.findByExternalIdAndIdentifierTypeAndSource(anyString(), anyString(), anyString()))
        .thenReturn(Optional.of(existingData));
    // Configure dataMappingService.mapSecurityReferenceData to return a Security object
    Security security = Security.builder().internalId("IMS-REUTERS_ID-AAPL.O").build();
    when(dataMappingService.mapSecurityReferenceData(any(SecurityReferenceData.class)))
        .thenReturn(security);
    // Call referenceDataService.processReferenceData with the test data
    boolean result = referenceDataService.processReferenceData(referenceData);
    // Verify the result is true
    assertTrue(result);
    // Verify dataMappingService.mapSecurityReferenceData was called
    verify(dataMappingService).mapSecurityReferenceData(any(SecurityReferenceData.class));
    // Verify kafkaTemplate.send was called with event containing 'UPDATE' operation
    ArgumentCaptor<ReferenceDataEvent> argumentCaptor = ArgumentCaptor.forClass(ReferenceDataEvent.class);
    verify(kafkaTemplate).send(eq(referenceDataTopic), argumentCaptor.capture());
    ReferenceDataEvent event = argumentCaptor.getValue();
    assertEquals("UPDATE", event.getOperation());
    // Verify referenceData was marked as processed
    assertEquals("PROCESSED", referenceData.getProcessingStatus());
  }

  /** Test finding existing reference data */
  @Test
  @DisplayName("Should find existing reference data")
  void testFindExistingReferenceData() {
    // Create a SecurityReferenceData object
    SecurityReferenceData referenceData =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").build();
    // Configure referenceDataRepository.findByExternalIdAndIdentifierTypeAndSource to return Optional with data
    when(referenceDataRepository.findByExternalIdAndIdentifierTypeAndSource(anyString(), anyString(), anyString()))
        .thenReturn(Optional.of(referenceData));
    // Call referenceDataService.findExistingReferenceData with externalId, identifierType, and source
    Optional<SecurityReferenceData> result =
        referenceDataService.findExistingReferenceData("AAPL.O", "REUTERS_ID", "REUTERS");
    // Verify the result contains the expected data
    assertTrue(result.isPresent());
    assertEquals(referenceData, result.get());
    // Verify referenceDataRepository.findByExternalIdAndIdentifierTypeAndSource was called with correct parameters
    verify(referenceDataRepository)
        .findByExternalIdAndIdentifierTypeAndSource(eq("AAPL.O"), eq("REUTERS_ID"), eq("REUTERS"));
  }

  /** Test publishing a reference data event */
  @Test
  @DisplayName("Should publish reference data event")
  void testPublishReferenceDataEvent() {
    // Create a ReferenceDataEvent object
    ReferenceDataEvent event = new ReferenceDataEvent("REUTERS");
    // Call referenceDataService.publishReferenceDataEvent with the event
    referenceDataService.publishReferenceDataEvent(event);
    // Verify kafkaTemplate.send was called with correct topic and event
    verify(kafkaTemplate).send(eq(referenceDataTopic), eq(event));
    // Verify no exceptions were thrown
  }

  /** Test creating a reference data event for Reuters data */
  @Test
  @DisplayName("Should create reference data event for Reuters data")
  void testCreateReferenceDataEvent_Reuters() {
    // Create a SecurityReferenceData object with source 'REUTERS'
    SecurityReferenceData referenceData =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").build();
    // Create a Security object
    Security security = Security.builder().internalId("IMS-REUTERS_ID-AAPL.O").build();
    // Configure reutersAdapter.mapReutersReferenceDataToInternal to return the Security object
    when(reutersAdapter.mapReutersReferenceDataToInternal(referenceData)).thenReturn(security);
    // Configure reutersAdapter.createReferenceDataEvent to return a ReferenceDataEvent
    ReferenceDataEvent expectedEvent = new ReferenceDataEvent("REUTERS");
    when(reutersAdapter.createReferenceDataEvent(security, "CREATE")).thenReturn(expectedEvent);
    // Call referenceDataService.createReferenceDataEvent with the reference data and 'CREATE' operation
    ReferenceDataEvent event = referenceDataService.createReferenceDataEvent(referenceData, "CREATE");
    // Verify reutersAdapter.mapReutersReferenceDataToInternal was called with the reference data
    verify(reutersAdapter).mapReutersReferenceDataToInternal(referenceData);
    // Verify reutersAdapter.createReferenceDataEvent was called with the Security object and 'CREATE' operation
    verify(reutersAdapter).createReferenceDataEvent(security, "CREATE");
    // Verify the returned event is the expected event
    assertEquals(expectedEvent, event);
  }

  /** Test creating a reference data event for Bloomberg data */
  @Test
  @DisplayName("Should create reference data event for Bloomberg data")
  void testCreateReferenceDataEvent_Bloomberg() {
    // Create a SecurityReferenceData object with source 'BLOOMBERG'
    SecurityReferenceData referenceData =
        SecurityReferenceData.builder().externalId("AAPL US Equity").identifierType("BLOOMBERG_ID").source("BLOOMBERG").build();
    // Create a Security object
    Security security = Security.builder().internalId("IMS-BLOOMBERG_ID-AAPL US Equity").build();
    // Configure bloombergAdapter.mapBloombergReferenceDataToInternal to return the Security object
    when(bloombergAdapter.mapBloombergReferenceDataToInternal(referenceData)).thenReturn(security);
    // Configure bloombergAdapter.createReferenceDataEvent to return a ReferenceDataEvent
    ReferenceDataEvent expectedEvent = new ReferenceDataEvent("BLOOMBERG");
    when(bloombergAdapter.createReferenceDataEvent(security, "CREATE")).thenReturn(expectedEvent);
    // Call referenceDataService.createReferenceDataEvent with the reference data and 'CREATE' operation
    ReferenceDataEvent event = referenceDataService.createReferenceDataEvent(referenceData, "CREATE");
    // Verify bloombergAdapter.mapBloombergReferenceDataToInternal was called with the reference data
    verify(bloombergAdapter).mapBloombergReferenceDataToInternal(referenceData);
    // Verify bloombergAdapter.createReferenceDataEvent was called with the Security object and 'CREATE' operation
    verify(bloombergAdapter).createReferenceDataEvent(security, "CREATE");
    // Verify the returned event is the expected event
    assertEquals(expectedEvent, event);
  }

  /** Test creating a reference data event for an unsupported source */
  @Test
  @DisplayName("Should throw exception for unsupported source in event creation")
  void testCreateReferenceDataEvent_UnsupportedSource() {
    // Create a SecurityReferenceData object with source 'UNSUPPORTED'
    SecurityReferenceData referenceData =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("UNSUPPORTED").build();
    // Call referenceDataService.createReferenceDataEvent with the reference data and 'CREATE' operation
    // Verify that IngestionException is thrown with appropriate message
    Exception exception =
        assertThrows(
            IngestionException.class,
            () -> referenceDataService.createReferenceDataEvent(referenceData, "CREATE"));
    assertEquals("Unsupported data source: UNSUPPORTED", exception.getMessage());
  }

  /** Test subscribing to real-time updates */
  @Test
  @DisplayName("Should subscribe to real-time updates from multiple sources")
  void testSubscribeToRealTimeUpdates() {
    // Create a list of security IDs
    List<String> securityIds = Arrays.asList("AAPL.O", "MSFT.O");
    // Create a list of sources
    List<String> sources = Arrays.asList("REUTERS", "BLOOMBERG");
    // Call referenceDataService.subscribeToRealTimeUpdates with the security IDs and sources
    referenceDataService.subscribeToRealTimeUpdates(securityIds, sources);
    // Verify reutersAdapter.subscribeToReferenceData was called with the security IDs
    verify(reutersAdapter).subscribeToReferenceData(securityIds);
    // Verify bloombergAdapter.subscribeToReferenceData was called with the security IDs
    verify(bloombergAdapter).subscribeToReferenceData(securityIds);
    // Verify no exceptions were thrown
  }

  /** Test handling a real-time update from Reuters */
  @Test
  @DisplayName("Should handle real-time update from Reuters")
  void testHandleRealTimeUpdate_Reuters() {
    // Create a SecurityReferenceData object with source 'REUTERS'
    SecurityReferenceData referenceData =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").build();
    // Call referenceDataService.handleRealTimeUpdate with the reference data and 'REUTERS' source
    referenceDataService.handleRealTimeUpdate(referenceData, "REUTERS");
    // Verify referenceDataRepository.save was called with the reference data
    verify(referenceDataRepository).save(referenceData);
    // Verify processReferenceData was called with the reference data
    verify(referenceDataService).processReferenceData(referenceData);
    // Verify no exceptions were thrown
  }

  /** Test handling a real-time update from Bloomberg */
  @Test
  @DisplayName("Should handle real-time update from Bloomberg")
  void testHandleRealTimeUpdate_Bloomberg() {
    // Create a SecurityReferenceData object with source 'BLOOMBERG'
    SecurityReferenceData referenceData =
        SecurityReferenceData.builder().externalId("AAPL US Equity").identifierType("BLOOMBERG_ID").source("BLOOMBERG").build();
    // Call referenceDataService.handleRealTimeUpdate with the reference data and 'BLOOMBERG' source
    referenceDataService.handleRealTimeUpdate(referenceData, "BLOOMBERG");
    // Verify referenceDataRepository.save was called with the reference data
    verify(referenceDataRepository).save(referenceData);
    // Verify processReferenceData was called with the reference data
    verify(referenceDataService).processReferenceData(referenceData);
    // Verify no exceptions were thrown
  }

  /** Test detecting and reporting conflicts in reference data */
  @Test
  @DisplayName("Should detect and report conflicts in reference data")
  void testDetectAndReportConflicts() {
    // Create a list of SecurityReferenceData with conflicts
    List<SecurityReferenceData> conflictList = new ArrayList<>();
    SecurityReferenceData securityReferenceData1 =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").build();
    SecurityReferenceData securityReferenceData2 =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("BLOOMBERG").build();
    conflictList.add(securityReferenceData1);
    conflictList.add(securityReferenceData2);
    // Configure referenceDataRepository.findConflictingSecurities to return the conflict list
    when(referenceDataRepository.findConflictingSecurities()).thenReturn(conflictList);
    // Call referenceDataService.detectAndReportConflicts
    List<SecurityReferenceData> result = referenceDataService.detectAndReportConflicts();
    // Verify referenceDataRepository.findConflictingSecurities was called
    verify(referenceDataRepository).findConflictingSecurities();
    // Verify the result contains the expected conflicts
    assertEquals(conflictList, result);
  }

  /** Test resolving conflicts in reference data */
  @Test
  @DisplayName("Should resolve conflicts in reference data")
  void testResolveConflicts() {
    // Create a list of SecurityReferenceData with conflicts
    List<SecurityReferenceData> conflictList = new ArrayList<>();
    SecurityReferenceData securityReferenceData1 =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").build();
    SecurityReferenceData securityReferenceData2 =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("BLOOMBERG").build();
    conflictList.add(securityReferenceData1);
    conflictList.add(securityReferenceData2);
    // Create a list of resolved SecurityReferenceData
    List<SecurityReferenceData> resolvedList = new ArrayList<>();
    SecurityReferenceData resolvedData =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").build();
    resolvedList.add(resolvedData);
    // Configure dataMappingService.handleMappingConflicts to return the resolved list
    when(dataMappingService.handleMappingConflicts(conflictList)).thenReturn(resolvedList);
    // Call referenceDataService.resolveConflicts with the conflict list
    List<SecurityReferenceData> result = referenceDataService.resolveConflicts(conflictList);
    // Verify dataMappingService.handleMappingConflicts was called with the conflict list
    verify(dataMappingService).handleMappingConflicts(conflictList);
    // Verify referenceDataRepository.saveAll was called with the resolved list
    verify(referenceDataRepository).saveAll(resolvedList);
    // Verify the result contains the resolved data
    assertEquals(resolvedList, result);
  }

  /** Test generating a batch reconciliation report */
  @Test
  @DisplayName("Should generate batch reconciliation report")
  void testGenerateBatchReconciliationReport() {
    // Create a batch ID string
    String batchId = "batch123";
    // Configure referenceDataRepository.countByBatchId to return a total count
    when(referenceDataRepository.countByBatchId(batchId)).thenReturn(100L);
    // Configure referenceDataRepository.countByBatchIdAndProcessingStatus to return counts for
    // different statuses
    when(referenceDataRepository.countByBatchIdAndProcessingStatus(batchId, "PROCESSED"))
        .thenReturn(70L);
    when(referenceDataRepository.countByBatchIdAndProcessingStatus(batchId, "ERROR")).thenReturn(10L);
    when(referenceDataRepository.countByBatchIdAndProcessingStatus(batchId, "PENDING")).thenReturn(20L);
    // Call referenceDataService.generateBatchReconciliationReport with the batch ID
    Map<String, Long> report = referenceDataService.generateBatchReconciliationReport(batchId);
    // Verify referenceDataRepository.countByBatchId was called with the batch ID
    verify(referenceDataRepository).countByBatchId(batchId);
    // Verify referenceDataRepository.countByBatchIdAndProcessingStatus was called for each status
    verify(referenceDataRepository).countByBatchIdAndProcessingStatus(batchId, "PROCESSED");
    verify(referenceDataRepository).countByBatchIdAndProcessingStatus(batchId, "ERROR");
    verify(referenceDataRepository).countByBatchIdAndProcessingStatus(batchId, "PENDING");
    // Verify the report contains the expected counts
    assertEquals(100L, report.get("totalRecords"));
    assertEquals(70L, report.get("processedRecords"));
    assertEquals(10L, report.get("errorRecords"));
    assertEquals(20L, report.get("pendingRecords"));
  }

  /** Test getting the processing status for a batch */
  @Test
  @DisplayName("Should get processing status for a batch")
  void testGetProcessingStatus() {
    // Create a batch ID string
    String batchId = "batch123";
    // Create a reconciliation report map
    Map<String, Long> reconciliationReport = new HashMap<>();
    reconciliationReport.put("totalRecords", 100L);
    reconciliationReport.put("processedRecords", 70L);
    reconciliationReport.put("errorRecords", 10L);
    reconciliationReport.put("pendingRecords", 20L);
    // Configure generateBatchReconciliationReport to return the report map
    when(referenceDataService.generateBatchReconciliationReport(batchId)).thenReturn(reconciliationReport);
    // Call referenceDataService.getProcessingStatus with the batch ID
    Map<String, Object> status = referenceDataService.getProcessingStatus(batchId);
    // Verify generateBatchReconciliationReport was called with the batch ID
    verify(referenceDataService).generateBatchReconciliationReport(batchId);
    // Verify the status contains the batch ID
    assertEquals(batchId, status.get("batchId"));
    // Verify the status contains all statistics from the reconciliation report
    assertEquals(70L, status.get("processedRecords"));
    assertEquals(10L, status.get("errorRecords"));
    // Verify the status contains the calculated completion percentage
    assertEquals(70.0, status.get("completionPercentage"));
    // Verify the status contains the overall status (COMPLETED, IN_PROGRESS, or FAILED)
    assertEquals("IN_PROGRESS", status.get("overallStatus"));
  }

  /** Test reprocessing failed reference data items */
  @Test
  @DisplayName("Should reprocess failed items")
  void testReprocessFailedItems() {
    // Create a batch ID string
    String batchId = "batch123";
    // Create a list of failed SecurityReferenceData items
    List<SecurityReferenceData> errorItems = new ArrayList<>();
    SecurityReferenceData errorItem1 =
        SecurityReferenceData.builder().externalId("AAPL.O").identifierType("REUTERS_ID").source("REUTERS").build();
    SecurityReferenceData errorItem2 =
        SecurityReferenceData.builder().externalId("MSFT.O").identifierType("REUTERS_ID").source("REUTERS").build();
    errorItems.add(errorItem1);
    errorItems.add(errorItem2);
    // Configure referenceDataRepository.findByBatchIdAndProcessingStatus to return the failed items
    when(referenceDataRepository.findByBatchIdAndProcessingStatus(batchId, "ERROR"))
        .thenReturn(errorItems);
    // Configure processReferenceData to return true for some items and false for others
    when(referenceDataService.processReferenceData(errorItem1)).thenReturn(true);
    when(referenceDataService.processReferenceData(errorItem2)).thenReturn(false);
    // Call referenceDataService.reprocessFailedItems with the batch ID
    int reprocessedCount = referenceDataService.reprocessFailedItems(batchId);
    // Verify referenceDataRepository.findByBatchIdAndProcessingStatus was called with the batch ID
    // and ERROR status
    verify(referenceDataRepository).findByBatchIdAndProcessingStatus(batchId, "ERROR");
    // Verify processReferenceData was called for each failed item
    verify(referenceDataService).processReferenceData(errorItem1);
    verify(referenceDataService).processReferenceData(errorItem2);
    // Verify the result is the count of successfully reprocessed items
    assertEquals(1, reprocessedCount);
  }
}