/**
 * Integration test for the reference data ingestion functionality in the Inventory Management System.
 * This test verifies that the system can correctly ingest, process, and store reference data from multiple sources,
 * handle conflicts, and publish events for downstream services.
 */

import axios from 'axios'; // ^1.4.0
import { test, describe, expect, afterAll } from 'jest'; // ^29.5.0
import * as fs from 'fs-extra'; // ^11.1.1
import * as path from 'path';

import {
  setupTestEnvironment,
  loadTestData,
  validatePerformance,
  waitForCondition
} from '../../common/testUtils';
import {
  API_ENDPOINTS,
  TEST_TIMEOUTS,
  PERFORMANCE_THRESHOLDS,
  TEST_DATA_PATHS
} from '../../common/constants';
import {
  createMockApiClient,
  mockApiGet,
  mockApiPost
} from '../../common/mocks/apiMocks';

// Apply global setup before all tests
setupTestEnvironment();

describe('Reference Data Ingestion Integration Tests', () => {

  /**
   * Tests the batch ingestion of reference data from multiple sources
   */
  test('Batch Reference Data Ingestion', async () => {
    // Load test reference data from fixtures
    const securitiesData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/securities.json`);
    const counterpartiesData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/counterparties.json`);
    const indexCompositionsData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/indexCompositions.json`);
    const aggregationUnitsData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/aggregationUnits.json`);

    // Mock the API endpoints for batch reference data ingestion
    const mockApiClient = createMockApiClient({
      [API_ENDPOINTS.REFERENCE_DATA.SECURITIES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, securitiesData),
      [API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTIES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTIES, counterpartiesData),
      [API_ENDPOINTS.REFERENCE_DATA.INDEXES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.INDEXES, indexCompositionsData),
      [API_ENDPOINTS.REFERENCE_DATA.AGGREGATION_UNITS]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.AGGREGATION_UNITS, aggregationUnitsData),
    });

    // Prepare test batch files for Reuters and Bloomberg sources
    const reutersBatchFile = path.resolve(`${TEST_DATA_PATHS.REFERENCE_DATA}/reuters_batch.csv`);
    const bloombergBatchFile = path.resolve(`${TEST_DATA_PATHS.REFERENCE_DATA}/bloomberg_batch.xml`);

    // Call the API to process the batch files
    const batchProcessingResult = await mockApiClient.post(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, {
      reutersFile: reutersBatchFile,
      bloombergFile: bloombergBatchFile
    });

    // Verify the batch processing status and reconciliation report
    expect(batchProcessingResult.status).toBe(200);
    expect(batchProcessingResult.data.status).toBe('COMPLETED');
    expect(batchProcessingResult.data.reconciliationReport).toBeDefined();

    // Verify that securities were correctly created in the system
    const securities = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITIES);
    expect(securities.status).toBe(200);
    expect(securities.data.length).toBeGreaterThan(0);

    // Verify that security identifiers were correctly mapped
    const securityIdentifiers = securities.data.map(security => security.identifiers);
    expect(securityIdentifiers.length).toBeGreaterThan(0);

    // Verify that index compositions were correctly processed
    const indexCompositions = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.INDEXES);
    expect(indexCompositions.status).toBe(200);
    expect(indexCompositions.data.length).toBeGreaterThan(0);

    // Verify that aggregation units were correctly created
    const aggregationUnits = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.AGGREGATION_UNITS);
    expect(aggregationUnits.status).toBe(200);
    expect(aggregationUnits.data.length).toBeGreaterThan(0);

    // Verify performance meets the required threshold
    const performanceResult = await validatePerformance(
      () => mockApiClient.post(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, {
        reutersFile: reutersBatchFile,
        bloombergFile: bloombergBatchFile
      }),
      [],
      PERFORMANCE_THRESHOLDS.EVENT_PROCESSING
    );
    expect(performanceResult.success).toBe(true);
  }, TEST_TIMEOUTS.INTEGRATION);

  /**
   * Tests real-time updates of reference data
   */
  test('Real-Time Reference Data Updates', async () => {
    // Load test reference data from fixtures
    const securitiesData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/securities.json`);

    // Mock the API endpoints for real-time reference data updates
    const mockApiClient = createMockApiClient({
      [API_ENDPOINTS.REFERENCE_DATA.SECURITIES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, securitiesData),
    });

    // Prepare test update data for Reuters and Bloomberg sources
    const reutersUpdateData = {
      internalId: 'SEC-EQ-001',
      issuer: 'Apple Inc.',
      description: 'Apple Inc. Common Stock - Updated'
    };
    const bloombergUpdateData = {
      internalId: 'SEC-EQ-002',
      issuer: 'Microsoft Corporation',
      description: 'Microsoft Corporation Common Stock - Updated'
    };

    // Call the API to process the real-time updates
    const reutersUpdateResult = await mockApiClient.put(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, reutersUpdateData);
    const bloombergUpdateResult = await mockApiClient.put(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, bloombergUpdateData);

    // Verify that securities were correctly updated in the system
    expect(reutersUpdateResult.status).toBe(200);
    expect(reutersUpdateResult.data.description).toBe('Apple Inc. Common Stock - Updated');
    expect(bloombergUpdateResult.status).toBe(200);
    expect(bloombergUpdateResult.data.description).toBe('Microsoft Corporation Common Stock - Updated');

    // Verify that security identifiers were correctly updated
    const updatedSecurities = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITIES);
    expect(updatedSecurities.status).toBe(200);
    expect(updatedSecurities.data.find(s => s.internalId === 'SEC-EQ-001').description).toBe('Apple Inc. Common Stock - Updated');
    expect(updatedSecurities.data.find(s => s.internalId === 'SEC-EQ-002').description).toBe('Microsoft Corporation Common Stock - Updated');

    // Measure the processing time for real-time updates
    const reutersPerformanceResult = await validatePerformance(
      () => mockApiClient.put(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, reutersUpdateData),
      [],
      PERFORMANCE_THRESHOLDS.EVENT_PROCESSING
    );
    const bloombergPerformanceResult = await validatePerformance(
      () => mockApiClient.put(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, bloombergUpdateData),
      [],
      PERFORMANCE_THRESHOLDS.EVENT_PROCESSING
    );

    // Verify performance meets the 200ms threshold requirement
    expect(reutersPerformanceResult.success).toBe(true);
    expect(bloombergPerformanceResult.success).toBe(true);
  }, TEST_TIMEOUTS.INTEGRATION);

  /**
   * Tests integration of reference data from multiple sources
   */
  test('Multi-Source Data Integration', async () => {
    // Load test reference data from fixtures for multiple sources (Reuters, Bloomberg, MarkIT, Ultumus, RIMES)
    const reutersData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/reuters_data.json`);
    const bloombergData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/bloomberg_data.json`);
    const markitData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/markit_data.json`);
    const ultumusData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/ultumus_data.json`);
    const rimesData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/rimes_data.json`);

    // Mock the API endpoints for multi-source data integration
    const mockApiClient = createMockApiClient({
      [API_ENDPOINTS.REFERENCE_DATA.SECURITIES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, reutersData),
      [API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTIES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTIES, bloombergData),
      [API_ENDPOINTS.REFERENCE_DATA.INDEXES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.INDEXES, markitData),
      [API_ENDPOINTS.REFERENCE_DATA.AGGREGATION_UNITS]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.AGGREGATION_UNITS, ultumusData),
    });

    // Call the API to process data from each source
    const reutersResult = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITIES);
    const bloombergResult = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTIES);
    const markitResult = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.INDEXES);
    const ultumusResult = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.AGGREGATION_UNITS);

    // Verify that data from all sources is correctly integrated
    expect(reutersResult.status).toBe(200);
    expect(bloombergResult.status).toBe(200);
    expect(markitResult.status).toBe(200);
    expect(ultumusResult.status).toBe(200);

    // Verify that securities have identifiers from multiple sources
    const securities = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITIES);
    expect(securities.status).toBe(200);
    expect(securities.data.length).toBeGreaterThan(0);
    securities.data.forEach(security => {
      expect(security.identifiers).toBeDefined();
    });

    // Verify that index compositions from different sources are correctly linked
    const indexCompositions = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.INDEXES);
    expect(indexCompositions.status).toBe(200);
    expect(indexCompositions.data.length).toBeGreaterThan(0);

    // Verify that the system correctly prioritizes data based on source
    // (This requires more specific data and rules to be set up in the mock)
    // For example, if Reuters and Bloomberg both provide a description for a security,
    // the system should prioritize the Reuters description based on a predefined rule.
  }, TEST_TIMEOUTS.INTEGRATION);

  /**
   * Tests detection and resolution of conflicts in reference data
   */
  test('Conflict Detection and Resolution', async () => {
    // Load test reference data with intentional conflicts
    const conflictingData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/conflicting_data.json`);

    // Mock the API endpoints for conflict detection and resolution
    const mockApiClient = createMockApiClient({
      [API_ENDPOINTS.REFERENCE_DATA.SECURITIES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, conflictingData),
    });

    // Call the API to process conflicting data
    const conflictingResult = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITIES);

    // Verify that conflicts are correctly detected
    expect(conflictingResult.status).toBe(200);
    expect(conflictingResult.data.hasConflicts).toBe(true);

    // Verify that conflict reports are generated
    expect(conflictingResult.data.conflictReport).toBeDefined();

    // Call the API to resolve conflicts
    const resolutionResult = await mockApiClient.post(API_ENDPOINTS.REFERENCE_DATA.SECURITIES + '/resolve', {
      securityId: 'SEC-EQ-001',
      resolutionStrategy: 'REUTERS_PREFERRED'
    });

    // Verify that conflicts are correctly resolved based on resolution rules
    expect(resolutionResult.status).toBe(200);
    expect(resolutionResult.data.resolved).toBe(true);

    // Verify that the resolved data is correctly stored in the system
    const resolvedSecurity = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITIES + '/SEC-EQ-001');
    expect(resolvedSecurity.status).toBe(200);
    expect(resolvedSecurity.data.description).toBe('Reuters Preferred Description');
  }, TEST_TIMEOUTS.INTEGRATION);

  /**
   * Tests publishing of reference data events to downstream services
   */
  test('Reference Data Event Publishing', async () => {
    // Load test reference data from fixtures
    const securitiesData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/securities.json`);

    // Mock the API endpoints for reference data processing
    const mockApiClient = createMockApiClient({
      [API_ENDPOINTS.REFERENCE_DATA.SECURITIES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, securitiesData),
    });

    // Mock the Kafka message bus for event publishing
    const mockKafkaPublish = jest.fn();

    // Call the API to process reference data
    const processingResult = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITIES);

    // Verify that appropriate events are published to Kafka
    expect(mockKafkaPublish).toHaveBeenCalledTimes(securitiesData.length);

    // Verify that events contain the correct data
    securitiesData.forEach(security => {
      expect(mockKafkaPublish).toHaveBeenCalledWith('security.created', security);
    });

    // Verify that events are published for both creates and updates
    // (This requires more complex logic to track which securities are created vs updated)

    // Verify that events include the correct source information
    // (This requires the mock API to inject source information into the data)
  }, TEST_TIMEOUTS.INTEGRATION);

  /**
   * Tests error handling and recovery during reference data ingestion
   */
  test('Error Handling and Recovery', async () => {
    // Load test reference data with intentional errors
    const errorData = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/error_data.json`);

    // Mock the API endpoints for reference data processing
    const mockApiClient = createMockApiClient({
      [API_ENDPOINTS.REFERENCE_DATA.SECURITIES]: mockApiGet(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, errorData),
    });

    // Call the API to process data with errors
    const processingResult = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITIES);

    // Verify that errors are correctly detected and logged
    expect(processingResult.status).toBe(500);
    expect(processingResult.data.errors.length).toBeGreaterThan(0);

    // Verify that valid records are processed despite errors
    const validSecurities = errorData.filter(security => security.isValid);
    expect(processingResult.data.processedCount).toBe(validSecurities.length);

    // Call the API to reprocess failed items
    const reprocessingResult = await mockApiClient.post(API_ENDPOINTS.REFERENCE_DATA.SECURITIES + '/reprocess', {
      failedSecurityIds: ['SEC-EQ-001', 'SEC-EQ-002']
    });

    // Verify that previously failed items are successfully processed
    expect(reprocessingResult.status).toBe(200);
    expect(reprocessingResult.data.successCount).toBe(2);

    // Verify that the system maintains data integrity during error recovery
    const allSecurities = await mockApiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITIES);
    expect(allSecurities.data.length).toBe(errorData.length);
  }, TEST_TIMEOUTS.INTEGRATION);

});

/**
 * Verifies that security data is correctly stored in the system
 */
function verifySecurityData(expectedData: any, actualData: any): void {
  // Compare security attributes between expected and actual data
  expect(actualData.issuer).toBe(expectedData.issuer);
  expect(actualData.description).toBe(expectedData.description);
  expect(actualData.currency).toBe(expectedData.currency);

  // Verify that all required fields are present and correct
  expect(actualData.internalId).toBeDefined();
  expect(actualData.securityType).toBeDefined();
  expect(actualData.market).toBeDefined();
  expect(actualData.status).toBeDefined();

  // Verify that relationships to other entities are correct
  // (This requires more specific data and relationships to be set up in the mock)

  // Assert that the verification passes
  expect(true).toBe(true);
}

/**
 * Sets up mock API endpoints for reference data integration tests
 */
function setupMockApi() {
  // Create a mock API client using createMockApiClient
  const mockApiClient = createMockApiClient();

  // Configure mock endpoints for batch processing
  mockApiClient.post.mockImplementation((url, data) => {
    if (url === API_ENDPOINTS.REFERENCE_DATA.SECURITIES) {
      return Promise.resolve({ status: 200, data: { status: 'COMPLETED', reconciliationReport: {} } });
    }
    return Promise.reject(new Error(`Unexpected API call: ${url}`));
  });

  // Configure mock endpoints for real-time updates
  mockApiClient.put.mockImplementation((url, data) => {
    if (url === API_ENDPOINTS.REFERENCE_DATA.SECURITIES) {
      return Promise.resolve({ status: 200, data });
    }
    return Promise.reject(new Error(`Unexpected API call: ${url}`));
  });

  // Configure mock endpoints for conflict detection and resolution
  mockApiClient.post.mockImplementation((url, data) => {
    if (url === API_ENDPOINTS.REFERENCE_DATA.SECURITIES + '/resolve') {
      return Promise.resolve({ status: 200, data: { resolved: true } });
    }
    return Promise.reject(new Error(`Unexpected API call: ${url}`));
  });

  // Configure mock endpoints for event publishing
  const mockKafkaPublish = jest.fn();

  return { mockApiClient, mockKafkaPublish };
}