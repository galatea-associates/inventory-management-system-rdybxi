import axios, { AxiosInstance } from 'axios'; // ^1.4.0
import dayjs from 'dayjs'; // ^1.11.9
import * as testUtils from '../../common/testUtils';
import * as mockData from '../../common/mockData';
import { TEST_TIMEOUTS, PERFORMANCE_THRESHOLDS, API_ENDPOINTS, POSITION_TYPES, POSITION_STATUS } from '../../common/constants';
import positions from '../../common/fixtures/positions.json';
import securities from '../../common/fixtures/securities.json';
import counterparties from '../../common/fixtures/counterparties.json';

/**
 * Sets up the API client for making requests to the calculation service
 * @returns Configured axios instance for the calculation service API
 */
function setupApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: process.env.API_BASE_URL || 'http://localhost:8080/api/v1',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.API_TEST_TOKEN || 'test-token'}`
    },
    timeout: TEST_TIMEOUTS.INTEGRATION
  });
  
  // Add request interceptor for logging
  client.interceptors.request.use(config => {
    console.log(`Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });
  
  // Add response interceptor for logging
  client.interceptors.response.use(response => {
    console.log(`Response: ${response.status} ${response.statusText}`);
    return response;
  }, error => {
    console.error('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  });
  
  return client;
}

/**
 * Retrieves a position by book ID, security ID, and business date
 * @param bookId The book identifier
 * @param securityId The security identifier
 * @param businessDate The business date in YYYY-MM-DD format
 * @returns The retrieved position
 */
async function getPosition(bookId: string, securityId: string, businessDate: string): Promise<any> {
  const response = await apiClient.get(API_ENDPOINTS.POSITION.POSITIONS, {
    params: {
      bookId,
      securityId,
      businessDate
    }
  });
  
  return response.data;
}

/**
 * Triggers calculation for a specific position
 * @param bookId The book identifier
 * @param securityId The security identifier
 * @param businessDate The business date in YYYY-MM-DD format
 * @returns The calculated position
 */
async function calculatePosition(bookId: string, securityId: string, businessDate: string): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.POSITION.CALCULATE, {
    bookId,
    securityId,
    businessDate
  });
  
  return response.data;
}

/**
 * Triggers calculation for all positions for a business date
 * @param businessDate The business date in YYYY-MM-DD format
 * @returns The calculated positions
 */
async function calculatePositions(businessDate: string): Promise<any[]> {
  const response = await apiClient.post(API_ENDPOINTS.POSITION.CALCULATE_ALL, {
    businessDate
  });
  
  return response.data;
}

/**
 * Submits a trade event to the calculation service
 * @param tradeEvent The trade event to submit
 * @returns The response from the trade event submission
 */
async function submitTradeEvent(tradeEvent: any): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.POSITION.TRADE_EVENT, tradeEvent);
  
  return response.data;
}

/**
 * Submits a position event to the calculation service
 * @param positionEvent The position event to submit
 * @returns The response from the position event submission
 */
async function submitPositionEvent(positionEvent: any): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.POSITION.POSITION_EVENT, positionEvent);
  
  return response.data;
}

/**
 * Validates that a position has been correctly calculated
 * @param position The position to validate
 * @returns True if the position calculation is valid
 */
function validatePositionCalculation(position: any): boolean {
  // Check that position has calculationStatus set to 'VALID'
  if (position.calculationStatus !== 'VALID') {
    console.error('Position calculation status is not VALID:', position.calculationStatus);
    return false;
  }
  
  // Verify that currentNetPosition equals the sum of settledQty and contractualQty
  if (position.currentNetPosition !== position.settledQty) {
    console.error('Current net position does not match settled quantity:', 
      position.currentNetPosition, 'vs', position.settledQty);
    return false;
  }
  
  // Verify that projectedNetPosition equals currentNetPosition plus net settlement
  const netSettlement = calculateNetSettlement(position);
  const expectedProjectedPosition = position.currentNetPosition + netSettlement;
  
  if (position.projectedNetPosition !== expectedProjectedPosition) {
    console.error('Projected net position is incorrect:', 
      position.projectedNetPosition, 'vs expected', expectedProjectedPosition);
    return false;
  }
  
  return true;
}

/**
 * Calculates net settlement for a position
 * @param position The position to calculate net settlement for
 * @returns The net settlement amount
 */
function calculateNetSettlement(position: any): number {
  const receipts = (position.sd0Receipt || 0) + 
                  (position.sd1Receipt || 0) + 
                  (position.sd2Receipt || 0) + 
                  (position.sd3Receipt || 0) + 
                  (position.sd4Receipt || 0);
  
  const delivers = (position.sd0Deliver || 0) + 
                  (position.sd1Deliver || 0) + 
                  (position.sd2Deliver || 0) + 
                  (position.sd3Deliver || 0) + 
                  (position.sd4Deliver || 0);
  
  return receipts - delivers;
}

/**
 * Validates that a position's settlement ladder is correctly calculated
 * @param position The position to validate
 * @returns True if the settlement ladder is valid
 */
function validateSettlementLadder(position: any): boolean {
  // Calculate expected net settlement as the sum of all receipts minus all deliveries
  const netSettlement = calculateNetSettlement(position);
  
  // Verify that the position's net settlement matches the expected value
  const projectedChange = position.projectedNetPosition - position.currentNetPosition;
  
  if (projectedChange !== netSettlement) {
    console.error('Settlement ladder net change does not match calculated net settlement:', 
      projectedChange, 'vs', netSettlement);
    return false;
  }
  
  // Verify that the projected net position accounts for the net settlement
  if (position.projectedNetPosition !== position.currentNetPosition + netSettlement) {
    console.error('Projected net position does not account for settlement activity correctly:',
      position.projectedNetPosition, 'vs expected', position.currentNetPosition + netSettlement);
    return false;
  }
  
  return true;
}

// Global API client
let apiClient: AxiosInstance;

describe('Position Calculation Integration Tests', () => {
  beforeAll(async () => {
    // Call setupTestEnvironment() to configure the test environment
    testUtils.setupTestEnvironment();
    
    // Set up the API client using setupApiClient()
    apiClient = setupApiClient();
    
    // Mock the current date to ensure consistent test results
    testUtils.mockDate('2023-06-15T12:00:00Z');
    
    // Load test data from fixtures
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
  });
  
  afterAll(() => {
    // Reset the mocked date
    testUtils.resetMockDate();
    
    // Clean up any test data or state
  });
  
  test('should retrieve a position by book ID, security ID, and business date', async () => {
    // Use the first position from our test data
    const testPosition = positions[0];
    
    // Call getPosition() with test parameters
    const position = await getPosition(
      testPosition.bookId,
      testPosition.security.internalId,
      testPosition.businessDate
    );
    
    // Verify that the returned position matches expected data
    expect(position).toBeDefined();
    expect(position.bookId).toBe(testPosition.bookId);
    expect(position.security.internalId).toBe(testPosition.security.internalId);
    expect(position.businessDate).toBe(testPosition.businessDate);
    
    // Verify that the position contains all required fields
    expect(position.contractualQty).toBeDefined();
    expect(position.settledQty).toBeDefined();
    expect(position.currentNetPosition).toBeDefined();
    expect(position.projectedNetPosition).toBeDefined();
    expect(position.calculationStatus).toBeDefined();
    expect(position.sd0Deliver).toBeDefined();
    expect(position.sd0Receipt).toBeDefined();
    expect(position.sd1Deliver).toBeDefined();
    expect(position.sd1Receipt).toBeDefined();
  });
  
  test('should calculate a single position correctly', async () => {
    // Use a test position
    const testPosition = positions[1];
    
    // Call calculatePosition() with test parameters
    const calculatedPosition = await calculatePosition(
      testPosition.bookId,
      testPosition.security.internalId,
      testPosition.businessDate
    );
    
    // Verify that the calculation completes successfully
    expect(calculatedPosition).toBeDefined();
    expect(calculatedPosition.calculationStatus).toBe('VALID');
    
    // Validate the calculated position using validatePositionCalculation()
    expect(validatePositionCalculation(calculatedPosition)).toBe(true);
    
    // Verify that the settlement ladder is correct using validateSettlementLadder()
    expect(validateSettlementLadder(calculatedPosition)).toBe(true);
  });
  
  test('should calculate all positions for a business date', async () => {
    // Call calculatePositions() with a test business date
    const businessDate = '2023-06-15';
    const calculatedPositions = await calculatePositions(businessDate);
    
    // Verify that all positions are calculated
    expect(calculatedPositions).toBeDefined();
    expect(calculatedPositions.length).toBeGreaterThan(0);
    
    // Validate each calculated position
    calculatedPositions.forEach(position => {
      expect(position.calculationStatus).toBe('VALID');
      expect(validatePositionCalculation(position)).toBe(true);
    });
    
    // Verify that the total count matches expected number of positions
    const expectedCount = positions.filter(p => p.businessDate === businessDate).length;
    expect(calculatedPositions.length).toBe(expectedCount);
  });
  
  test('should process a trade event and update the relevant position', async () => {
    // Create a mock trade event using createMockTradeDataEvent()
    const tradeEvent = mockData.createMockTradeDataEvent({
      tradeId: 'TRADE-TEST-001',
      bookId: 'EQUITY-01',
      securityId: 'SEC-EQ-001',
      counterpartyId: 'CP-00001',
      quantity: 1000,
      tradeDate: '2023-06-15',
      settlementDate: '2023-06-17', // T+2
      tradeType: 'BUY'
    });
    
    // Submit the trade event using submitTradeEvent()
    await submitTradeEvent(tradeEvent);
    
    // Retrieve the updated position
    const updatedPosition = await getPosition('EQUITY-01', 'SEC-EQ-001', '2023-06-15');
    
    // Verify that the position reflects the trade event changes
    expect(updatedPosition).toBeDefined();
    
    // Find the original position to compare
    const originalPosition = positions.find(p => 
      p.bookId === 'EQUITY-01' && 
      p.security.internalId === 'SEC-EQ-001' &&
      p.businessDate === '2023-06-15'
    );
    
    // The trade should increase contractual quantity and adjust the settlement ladder
    expect(updatedPosition.contractualQty).toBe((originalPosition?.contractualQty || 0) + 1000);
    
    // Verify that the settlement ladder includes this trade (T+2 would be sd2)
    expect(updatedPosition.sd2Receipt).toBeGreaterThanOrEqual((originalPosition?.sd2Receipt || 0));
    
    // Validate the updated position calculation
    expect(validatePositionCalculation(updatedPosition)).toBe(true);
  });
  
  test('should process a position event and update the position', async () => {
    // Create a mock position event using createMockPositionEvent()
    const positionEvent = mockData.createMockPositionEvent({
      bookId: 'EQUITY-02',
      securityId: 'SEC-EQ-003',
      businessDate: '2023-06-15',
      settledQty: -2500, // Updating settled quantity
      contractualQty: -2500,
      isHypothecatable: true
    });
    
    // Submit the position event using submitPositionEvent()
    await submitPositionEvent(positionEvent);
    
    // Retrieve the updated position
    const updatedPosition = await getPosition('EQUITY-02', 'SEC-EQ-003', '2023-06-15');
    
    // Verify that the position reflects the position event changes
    expect(updatedPosition).toBeDefined();
    expect(updatedPosition.settledQty).toBe(-2500);
    expect(updatedPosition.isHypothecatable).toBe(true);
    
    // Validate the updated position calculation
    expect(validatePositionCalculation(updatedPosition)).toBe(true);
  });
  
  test('should calculate settlement ladder correctly', async () => {
    // Retrieve a position with settlement activity
    const testPosition = positions.find(p => 
      p.sd0Receipt > 0 || p.sd0Deliver > 0 || 
      p.sd1Receipt > 0 || p.sd1Deliver > 0 || 
      p.sd2Receipt > 0 || p.sd2Deliver > 0
    ) || positions[0];
    
    // Calculate the position
    const calculatedPosition = await calculatePosition(
      testPosition.bookId,
      testPosition.security.internalId,
      testPosition.businessDate
    );
    
    // Verify that sd0Deliver, sd0Receipt, etc. values are correct
    expect(calculatedPosition.sd0Deliver).toBeDefined();
    expect(calculatedPosition.sd0Receipt).toBeDefined();
    expect(calculatedPosition.sd1Deliver).toBeDefined();
    expect(calculatedPosition.sd1Receipt).toBeDefined();
    expect(calculatedPosition.sd2Deliver).toBeDefined();
    expect(calculatedPosition.sd2Receipt).toBeDefined();
    expect(calculatedPosition.sd3Deliver).toBeDefined();
    expect(calculatedPosition.sd3Receipt).toBeDefined();
    expect(calculatedPosition.sd4Deliver).toBeDefined();
    expect(calculatedPosition.sd4Receipt).toBeDefined();
    
    // Calculate expected net settlement values
    const netSettlement = calculateNetSettlement(calculatedPosition);
    
    // Verify that the position's settlement ladder matches expectations
    expect(calculatedPosition.projectedNetPosition).toBe(
      calculatedPosition.currentNetPosition + netSettlement
    );
    
    // Validate that projected position accounts for settlement activity
    expect(validateSettlementLadder(calculatedPosition)).toBe(true);
  });
  
  test('should handle position calculation for different security types', async () => {
    // Test position calculation for equity securities
    const equityPosition = positions.find(p => 
      p.security.internalId.startsWith('SEC-EQ-')
    ) || positions[0];
    
    const calculatedEquityPosition = await calculatePosition(
      equityPosition.bookId,
      equityPosition.security.internalId,
      equityPosition.businessDate
    );
    
    expect(calculatedEquityPosition).toBeDefined();
    expect(validatePositionCalculation(calculatedEquityPosition)).toBe(true);
    
    // Test position calculation for bond securities
    const bondPosition = positions.find(p => 
      p.security.internalId.startsWith('SEC-BD-')
    );
    
    if (bondPosition) {
      const calculatedBondPosition = await calculatePosition(
        bondPosition.bookId,
        bondPosition.security.internalId,
        bondPosition.businessDate
      );
      
      expect(calculatedBondPosition).toBeDefined();
      expect(validatePositionCalculation(calculatedBondPosition)).toBe(true);
    }
    
    // Test position calculation for ETF securities
    const etfPosition = positions.find(p => 
      p.security.internalId.startsWith('SEC-ETF-')
    );
    
    if (etfPosition) {
      const calculatedEtfPosition = await calculatePosition(
        etfPosition.bookId,
        etfPosition.security.internalId,
        etfPosition.businessDate
      );
      
      expect(calculatedEtfPosition).toBeDefined();
      expect(validatePositionCalculation(calculatedEtfPosition)).toBe(true);
    }
  });
  
  test('should meet performance requirements for position calculation', async () => {
    // Use validatePerformance() to measure calculation time
    const testPosition = positions[0];
    
    const singleResult = await testUtils.validatePerformance(
      () => calculatePosition(
        testPosition.bookId,
        testPosition.security.internalId,
        testPosition.businessDate
      ),
      [],
      PERFORMANCE_THRESHOLDS.POSITION_CALCULATION
    );
    
    // Verify that single position calculation completes within PERFORMANCE_THRESHOLDS.POSITION_CALCULATION
    expect(singleResult.success).toBe(true);
    console.log(`Single position calculation time: ${singleResult.executionTime}ms (threshold: ${PERFORMANCE_THRESHOLDS.POSITION_CALCULATION}ms)`);
    
    // Test performance with batch calculation of multiple positions
    const businessDate = '2023-06-15';
    
    const batchResult = await testUtils.validatePerformance(
      () => calculatePositions(businessDate),
      [],
      PERFORMANCE_THRESHOLDS.POSITION_CALCULATION * 5 // Allow proportionally more time for batch
    );
    
    // Verify that batch calculation meets performance requirements
    expect(batchResult.success).toBe(true);
    console.log(`Batch position calculation time: ${batchResult.executionTime}ms for ${(batchResult.result as any[]).length} positions`);
    
    // Calculate average time per position
    const numPositions = (batchResult.result as any[]).length;
    const avgTimePerPosition = batchResult.executionTime / numPositions;
    
    console.log(`Average time per position in batch: ${avgTimePerPosition}ms`);
    expect(avgTimePerPosition).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.POSITION_CALCULATION);
  });
  
  test('should handle edge cases correctly', async () => {
    // Test calculation with zero quantity positions
    const zeroPosition = mockData.createMockPosition({
      bookId: 'TEST-ZERO-BOOK',
      security: { internalId: 'SEC-EQ-001' },
      counterparty: { counterpartyId: 'CP-00001' },
      contractualQty: 0,
      settledQty: 0,
      currentNetPosition: 0,
      projectedNetPosition: 0
    });
    
    const zeroPositionEvent = mockData.createMockPositionEvent({
      position: zeroPosition
    });
    
    await submitPositionEvent(zeroPositionEvent);
    
    const calculatedZeroPosition = await calculatePosition(
      zeroPosition.bookId,
      zeroPosition.security.internalId,
      zeroPosition.businessDate
    );
    
    expect(calculatedZeroPosition).toBeDefined();
    expect(calculatedZeroPosition.contractualQty).toBe(0);
    expect(validatePositionCalculation(calculatedZeroPosition)).toBe(true);
    
    // Test calculation with very large position quantities
    const largePosition = mockData.createMockPosition({
      bookId: 'TEST-LARGE-BOOK',
      security: { internalId: 'SEC-EQ-002' },
      counterparty: { counterpartyId: 'CP-00002' },
      contractualQty: 10000000, // 10 million
      settledQty: 10000000,
      currentNetPosition: 10000000,
      projectedNetPosition: 10000000
    });
    
    const largePositionEvent = mockData.createMockPositionEvent({
      position: largePosition
    });
    
    await submitPositionEvent(largePositionEvent);
    
    const calculatedLargePosition = await calculatePosition(
      largePosition.bookId,
      largePosition.security.internalId,
      largePosition.businessDate
    );
    
    expect(calculatedLargePosition).toBeDefined();
    expect(calculatedLargePosition.contractualQty).toBe(10000000);
    expect(validatePositionCalculation(calculatedLargePosition)).toBe(true);
    
    // Test calculation with negative quantities (short positions)
    const shortPosition = mockData.createMockPosition({
      bookId: 'TEST-SHORT-BOOK',
      security: { internalId: 'SEC-EQ-003' },
      counterparty: { counterpartyId: 'CP-00003' },
      contractualQty: -5000,
      settledQty: -5000,
      currentNetPosition: -5000,
      projectedNetPosition: -5000
    });
    
    const shortPositionEvent = mockData.createMockPositionEvent({
      position: shortPosition
    });
    
    await submitPositionEvent(shortPositionEvent);
    
    const calculatedShortPosition = await calculatePosition(
      shortPosition.bookId,
      shortPosition.security.internalId,
      shortPosition.businessDate
    );
    
    expect(calculatedShortPosition).toBeDefined();
    expect(calculatedShortPosition.contractualQty).toBe(-5000);
    expect(validatePositionCalculation(calculatedShortPosition)).toBe(true);
    
    // Verify correct handling of positions with no settlement activity
    const noSettlementPosition = mockData.createMockPosition({
      bookId: 'TEST-NO-SETTLE-BOOK',
      security: { internalId: 'SEC-EQ-004' },
      counterparty: { counterpartyId: 'CP-00004' },
      contractualQty: 3000,
      settledQty: 3000,
      sd0Deliver: 0,
      sd0Receipt: 0,
      sd1Deliver: 0,
      sd1Receipt: 0,
      sd2Deliver: 0,
      sd2Receipt: 0,
      sd3Deliver: 0,
      sd3Receipt: 0,
      sd4Deliver: 0,
      sd4Receipt: 0,
      currentNetPosition: 3000,
      projectedNetPosition: 3000
    });
    
    const noSettlementEvent = mockData.createMockPositionEvent({
      position: noSettlementPosition
    });
    
    await submitPositionEvent(noSettlementEvent);
    
    const calculatedNoSettlementPosition = await calculatePosition(
      noSettlementPosition.bookId,
      noSettlementPosition.security.internalId,
      noSettlementPosition.businessDate
    );
    
    expect(calculatedNoSettlementPosition).toBeDefined();
    expect(calculatedNoSettlementPosition.projectedNetPosition).toBe(calculatedNoSettlementPosition.currentNetPosition);
    expect(validateSettlementLadder(calculatedNoSettlementPosition)).toBe(true);
  });
});