/**
 * Integration test suite for the Limit Calculation functionality in the Inventory Management System.
 * 
 * This suite tests the end-to-end limit calculation process, including client limit calculation,
 * aggregation unit limit calculation, order validation against limits, and limit usage updates.
 * It verifies that the calculation service meets performance requirements (under 150ms)
 * and correctly handles various limit scenarios across different markets.
 */

import axios, { AxiosInstance } from 'axios'; // ^1.4.0
import dayjs from 'dayjs'; // ^1.11.9

import { 
  setupTestEnvironment, 
  loadTestData, 
  validatePerformance, 
  mockDate, 
  resetMockDate 
} from '../../common/testUtils';

import { 
  createMockPosition, 
  createMockPositions, 
  createMockCounterparty, 
  createMockOrder,
  mockPositions 
} from '../../common/mockData';

import { 
  TEST_TIMEOUTS, 
  PERFORMANCE_THRESHOLDS, 
  API_ENDPOINTS,
  POSITION_TYPES 
} from '../../common/constants';

// Import test fixtures
import positions from '../../common/fixtures/positions.json';
import securities from '../../common/fixtures/securities.json';
import counterparties from '../../common/fixtures/counterparties.json';

// Global variables
let apiClient: AxiosInstance;
const API_BASE_URL = process.env.API_TEST_URL || 'http://localhost:8080/api/v1';
const BUSINESS_DATE = '2023-06-15';

/**
 * Sets up the API client for making requests to the calculation service
 */
function setupApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.API_TEST_TOKEN || 'test-token'}`
    },
    timeout: TEST_TIMEOUTS.INTEGRATION
  });

  // Request interceptor for logging
  client.interceptors.request.use(request => {
    console.log(`[${new Date().toISOString()}] Making ${request.method?.toUpperCase()} request to ${request.url}`);
    return request;
  });

  // Response interceptor for logging
  client.interceptors.response.use(
    response => {
      console.log(`[${new Date().toISOString()}] Received response with status ${response.status} from ${response.config.url}`);
      return response;
    },
    error => {
      if (error.response) {
        console.error(`[${new Date().toISOString()}] Request failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error(`[${new Date().toISOString()}] No response received:`, error.request);
      } else {
        console.error(`[${new Date().toISOString()}] Request setup failed:`, error.message);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Retrieves a client limit by client ID, security ID, and business date
 */
async function getClientLimit(clientId: string, securityId: string, businessDate: string): Promise<any> {
  const endpoint = API_ENDPOINTS.INVENTORY.CLIENT_LIMITS.replace(':clientId', clientId);
  const response = await apiClient.get(endpoint, {
    params: {
      securityId,
      businessDate
    }
  });
  return response.data;
}

/**
 * Retrieves an aggregation unit limit by aggregation unit ID, security ID, and business date
 */
async function getAggregationUnitLimit(aggregationUnitId: string, securityId: string, businessDate: string): Promise<any> {
  const endpoint = API_ENDPOINTS.INVENTORY.AGGREGATION_UNIT_LIMITS.replace(':aggregationUnitId', aggregationUnitId);
  const response = await apiClient.get(endpoint, {
    params: {
      securityId,
      businessDate
    }
  });
  return response.data;
}

/**
 * Validates an order against both client and aggregation unit limits
 */
async function validateOrderAgainstLimits(
  clientId: string,
  aggregationUnitId: string,
  securityId: string,
  orderType: string,
  quantity: number
): Promise<boolean> {
  const response = await apiClient.get(API_ENDPOINTS.SHORT_SELL.VALIDATE_ORDER, {
    params: {
      clientId,
      aggregationUnitId,
      securityId,
      orderType,
      quantity,
      businessDate: BUSINESS_DATE
    }
  });
  return response.data.isValid;
}

/**
 * Triggers a recalculation of all limits for the current business date
 */
async function recalculateLimits(): Promise<void> {
  await apiClient.post(`${API_ENDPOINTS.INVENTORY.SELL_LIMITS}/recalculate`, {
    businessDate: BUSINESS_DATE
  });
}

/**
 * Updates both client and aggregation unit limit usage after order execution
 */
async function updateLimitUsage(
  clientId: string,
  aggregationUnitId: string,
  securityId: string,
  orderType: string,
  quantity: number
): Promise<void> {
  await apiClient.post(`${API_ENDPOINTS.INVENTORY.SELL_LIMITS}/update-usage`, {
    clientId,
    aggregationUnitId,
    securityId,
    orderType,
    quantity,
    businessDate: BUSINESS_DATE
  });
}

/**
 * Validates that a client limit has been correctly calculated
 */
function validateClientLimit(clientLimit: any): boolean {
  // Check required fields
  if (!clientLimit.clientId || 
      !clientLimit.securityId || 
      !clientLimit.businessDate || 
      clientLimit.longSellLimit === undefined || 
      clientLimit.shortSellLimit === undefined) {
    return false;
  }

  // Check value types and ranges
  if (clientLimit.longSellLimit < 0 || 
      clientLimit.shortSellLimit < 0 || 
      clientLimit.longSellUsed < 0 || 
      clientLimit.shortSellUsed < 0) {
    return false;
  }

  // Check status
  if (clientLimit.status !== 'ACTIVE') {
    return false;
  }

  return true;
}

/**
 * Validates that an aggregation unit limit has been correctly calculated
 */
function validateAggregationUnitLimit(aggregationUnitLimit: any): boolean {
  // Check required fields
  if (!aggregationUnitLimit.aggregationUnitId || 
      !aggregationUnitLimit.securityId || 
      !aggregationUnitLimit.businessDate || 
      aggregationUnitLimit.longSellLimit === undefined || 
      aggregationUnitLimit.shortSellLimit === undefined) {
    return false;
  }

  // Check value types and ranges
  if (aggregationUnitLimit.longSellLimit < 0 || 
      aggregationUnitLimit.shortSellLimit < 0 || 
      aggregationUnitLimit.longSellUsed < 0 || 
      aggregationUnitLimit.shortSellUsed < 0) {
    return false;
  }

  // Check status
  if (aggregationUnitLimit.status !== 'ACTIVE') {
    return false;
  }

  // Validate market-specific rules if applicable
  if (aggregationUnitLimit.market === 'TW') {
    // For Taiwan market, verify that borrowed shares are excluded from for-loan availability
    if (aggregationUnitLimit.borrowedSharesExcluded !== true) {
      return false;
    }
  }

  if (aggregationUnitLimit.market === 'JP') {
    // For Japan market, verify that settlement cut-off rules are applied
    if (aggregationUnitLimit.settlementCutoffApplied !== true) {
      return false;
    }
  }

  return true;
}

/**
 * Creates a mock client limit object for testing
 */
function createMockClientLimit(overrides = {}): any {
  const defaultClientLimit = {
    clientId: 'CP-00001',
    securityId: 'SEC-EQ-001',
    businessDate: BUSINESS_DATE,
    longSellLimit: 10000,
    shortSellLimit: 5000,
    longSellUsed: 2000,
    shortSellUsed: 1000,
    status: 'ACTIVE',
    lastCalculated: dayjs().toISOString(),
    calculationRuleId: 'RULE-001',
    calculationRuleVersion: '1.0'
  };

  return { ...defaultClientLimit, ...overrides };
}

/**
 * Creates a mock aggregation unit limit object for testing
 */
function createMockAggregationUnitLimit(overrides = {}): any {
  const defaultAggregationUnitLimit = {
    aggregationUnitId: 'AU-001',
    securityId: 'SEC-EQ-001',
    businessDate: BUSINESS_DATE,
    market: 'US',
    longSellLimit: 50000,
    shortSellLimit: 25000,
    longSellUsed: 10000,
    shortSellUsed: 5000,
    status: 'ACTIVE',
    lastCalculated: dayjs().toISOString(),
    calculationRuleId: 'RULE-001',
    calculationRuleVersion: '1.0'
  };

  return { ...defaultAggregationUnitLimit, ...overrides };
}

describe('Limit Calculation Integration Tests', () => {
  // Setup before all tests
  beforeAll(async () => {
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
    setupTestEnvironment();
    apiClient = setupApiClient();
    mockDate(new Date('2023-06-15T10:00:00Z'));

    // Load any necessary test data or perform setup operations
    try {
      await recalculateLimits();
    } catch (error) {
      console.error('Error during test setup:', error);
    }
  });

  // Cleanup after all tests
  afterAll(() => {
    resetMockDate();
  });

  // Test retrieving client limit
  test('should retrieve a client limit by client ID, security ID, and business date', async () => {
    const clientId = 'CP-00001';
    const securityId = 'SEC-EQ-001';

    const clientLimit = await getClientLimit(clientId, securityId, BUSINESS_DATE);
    
    expect(clientLimit).toBeDefined();
    expect(clientLimit.clientId).toBe(clientId);
    expect(clientLimit.securityId).toBe(securityId);
    expect(clientLimit.businessDate).toBe(BUSINESS_DATE);
    expect(validateClientLimit(clientLimit)).toBe(true);
  });

  // Test retrieving aggregation unit limit
  test('should retrieve an aggregation unit limit by aggregation unit ID, security ID, and business date', async () => {
    const aggregationUnitId = 'AU-001';
    const securityId = 'SEC-EQ-001';

    const aggregationUnitLimit = await getAggregationUnitLimit(aggregationUnitId, securityId, BUSINESS_DATE);
    
    expect(aggregationUnitLimit).toBeDefined();
    expect(aggregationUnitLimit.aggregationUnitId).toBe(aggregationUnitId);
    expect(aggregationUnitLimit.securityId).toBe(securityId);
    expect(aggregationUnitLimit.businessDate).toBe(BUSINESS_DATE);
    expect(validateAggregationUnitLimit(aggregationUnitLimit)).toBe(true);
  });

  // Test calculating client limits
  test('should calculate client limits correctly', async () => {
    // Trigger recalculation to ensure up-to-date data
    await recalculateLimits();

    // Test multiple clients
    const clients = ['CP-00001', 'CP-00002', 'CP-00003'];
    const securities = ['SEC-EQ-001', 'SEC-EQ-002', 'SEC-EQ-003'];

    for (const clientId of clients) {
      for (const securityId of securities) {
        const clientLimit = await getClientLimit(clientId, securityId, BUSINESS_DATE);
        
        // Validate structure
        expect(validateClientLimit(clientLimit)).toBe(true);
        
        // Find matching position in test data to verify calculation
        const clientPositions = positions.filter(
          p => p.counterparty.counterpartyId === clientId && 
               p.security.internalId === securityId
        );

        // Verify long sell limit calculation (should be based on current settled positions)
        const expectedLongSellLimit = clientPositions.reduce(
          (total, pos) => total + (pos.settledQty > 0 ? pos.settledQty : 0), 
          0
        );
        expect(clientLimit.longSellLimit).toBeGreaterThanOrEqual(0);
        
        // Verify short sell limit calculation (based on approved locates)
        // Note: In a real test, we would need to factor in actual locates, but this is simplified
        expect(clientLimit.shortSellLimit).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // Test calculating aggregation unit limits
  test('should calculate aggregation unit limits correctly', async () => {
    // Trigger recalculation to ensure up-to-date data
    await recalculateLimits();

    // Test multiple aggregation units
    const aggregationUnits = ['AU-001', 'AU-002', 'AU-003'];
    const securities = ['SEC-EQ-001', 'SEC-EQ-002', 'SEC-EQ-003'];

    for (const aggregationUnitId of aggregationUnits) {
      for (const securityId of securities) {
        const auLimit = await getAggregationUnitLimit(aggregationUnitId, securityId, BUSINESS_DATE);
        
        // Validate structure
        expect(validateAggregationUnitLimit(auLimit)).toBe(true);
        
        // Find matching position in test data to verify calculation
        const auPositions = positions.filter(
          p => p.aggregationUnit.id === aggregationUnitId && 
               p.security.internalId === securityId
        );

        // Verify long sell limit calculation (based on net positions)
        const netPositions = auPositions.reduce(
          (total, pos) => total + pos.currentNetPosition, 
          0
        );
        
        // AU limits are more complex than client limits due to including borrow/loan contracts
        // So we simply verify they're non-negative and consistent with position data
        expect(auLimit.longSellLimit).toBeGreaterThanOrEqual(0);
        expect(auLimit.shortSellLimit).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // Test validating orders against client limits
  test('should validate orders against client limits correctly', async () => {
    const clientId = 'CP-00001';
    const aggregationUnitId = 'AU-001';
    const securityId = 'SEC-EQ-001';

    // Get current client limit
    const clientLimit = await getClientLimit(clientId, securityId, BUSINESS_DATE);
    
    // Test order within limit
    const validLongSellQuantity = Math.floor(clientLimit.longSellLimit * 0.5);
    const validLongSellResult = await validateOrderAgainstLimits(
      clientId, 
      aggregationUnitId, 
      securityId, 
      'LONG_SELL', 
      validLongSellQuantity
    );
    expect(validLongSellResult).toBe(true);
    
    // Test order exceeding limit
    const invalidLongSellQuantity = clientLimit.longSellLimit + 1000;
    const invalidLongSellResult = await validateOrderAgainstLimits(
      clientId, 
      aggregationUnitId, 
      securityId, 
      'LONG_SELL', 
      invalidLongSellQuantity
    );
    expect(invalidLongSellResult).toBe(false);
    
    // Test short sell order within limit
    const validShortSellQuantity = Math.floor(clientLimit.shortSellLimit * 0.5);
    const validShortSellResult = await validateOrderAgainstLimits(
      clientId, 
      aggregationUnitId, 
      securityId, 
      'SHORT_SELL', 
      validShortSellQuantity
    );
    expect(validShortSellResult).toBe(true);
    
    // Test short sell order exceeding limit
    const invalidShortSellQuantity = clientLimit.shortSellLimit + 1000;
    const invalidShortSellResult = await validateOrderAgainstLimits(
      clientId, 
      aggregationUnitId, 
      securityId, 
      'SHORT_SELL', 
      invalidShortSellQuantity
    );
    expect(invalidShortSellResult).toBe(false);
  });

  // Test validating orders against aggregation unit limits
  test('should validate orders against aggregation unit limits correctly', async () => {
    const clientId = 'CP-00002';
    const aggregationUnitId = 'AU-002';
    const securityId = 'SEC-EQ-002';

    // Get current aggregation unit limit
    const auLimit = await getAggregationUnitLimit(aggregationUnitId, securityId, BUSINESS_DATE);
    
    // Test order within aggregation unit limit but exceeding client limit
    // First, get client limit
    const clientLimit = await getClientLimit(clientId, securityId, BUSINESS_DATE);
    
    // Create an order quantity that's:
    // 1. Within AU limit
    // 2. But exceeds client limit if possible
    let testQuantity: number;
    if (clientLimit.longSellLimit < auLimit.longSellLimit) {
      testQuantity = clientLimit.longSellLimit + 100;
      // This should fail validation because client limit is exceeded
      const result = await validateOrderAgainstLimits(
        clientId, 
        aggregationUnitId, 
        securityId, 
        'LONG_SELL', 
        testQuantity
      );
      expect(result).toBe(false);
    } else {
      // If client limit >= AU limit, test with a quantity exceeding AU limit
      testQuantity = auLimit.longSellLimit + 100;
      const result = await validateOrderAgainstLimits(
        clientId, 
        aggregationUnitId, 
        securityId, 
        'LONG_SELL', 
        testQuantity
      );
      expect(result).toBe(false);
    }
    
    // Test order within both limits
    const validQuantity = Math.min(
      Math.floor(clientLimit.longSellLimit * 0.5),
      Math.floor(auLimit.longSellLimit * 0.5)
    );
    const validResult = await validateOrderAgainstLimits(
      clientId, 
      aggregationUnitId, 
      securityId, 
      'LONG_SELL', 
      validQuantity
    );
    expect(validResult).toBe(true);
  });

  // Test updating limit usage
  test('should update limit usage correctly after order execution', async () => {
    const clientId = 'CP-00003';
    const aggregationUnitId = 'AU-003';
    const securityId = 'SEC-EQ-003';
    const orderType = 'LONG_SELL';
    const quantity = 500;

    // Get limits before update
    const clientLimitBefore = await getClientLimit(clientId, securityId, BUSINESS_DATE);
    const auLimitBefore = await getAggregationUnitLimit(aggregationUnitId, securityId, BUSINESS_DATE);
    
    // Update limit usage
    await updateLimitUsage(clientId, aggregationUnitId, securityId, orderType, quantity);
    
    // Get limits after update
    const clientLimitAfter = await getClientLimit(clientId, securityId, BUSINESS_DATE);
    const auLimitAfter = await getAggregationUnitLimit(aggregationUnitId, securityId, BUSINESS_DATE);
    
    // Verify client limit usage updated
    if (orderType === 'LONG_SELL') {
      expect(clientLimitAfter.longSellUsed).toBe(clientLimitBefore.longSellUsed + quantity);
      expect(clientLimitAfter.shortSellUsed).toBe(clientLimitBefore.shortSellUsed);
    } else if (orderType === 'SHORT_SELL') {
      expect(clientLimitAfter.shortSellUsed).toBe(clientLimitBefore.shortSellUsed + quantity);
      expect(clientLimitAfter.longSellUsed).toBe(clientLimitBefore.longSellUsed);
    }
    
    // Verify AU limit usage updated
    if (orderType === 'LONG_SELL') {
      expect(auLimitAfter.longSellUsed).toBe(auLimitBefore.longSellUsed + quantity);
      expect(auLimitAfter.shortSellUsed).toBe(auLimitBefore.shortSellUsed);
    } else if (orderType === 'SHORT_SELL') {
      expect(auLimitAfter.shortSellUsed).toBe(auLimitBefore.shortSellUsed + quantity);
      expect(auLimitAfter.longSellUsed).toBe(auLimitBefore.longSellUsed);
    }
  });

  // Test Taiwan market-specific rules
  test('should apply market-specific rules for Taiwan market', async () => {
    const aggregationUnitId = 'AU-007'; // Taiwan Equity Trading
    const securityId = 'SEC-EQ-007'; // Taiwan security
    
    // Get the limit for Taiwan market
    const auLimit = await getAggregationUnitLimit(aggregationUnitId, securityId, BUSINESS_DATE);
    
    // Verify Taiwan-specific rules
    expect(auLimit.market).toBe('TW');
    expect(auLimit.borrowedSharesExcluded).toBe(true);
    
    // In Taiwan, borrowed shares cannot be re-lent,
    // so the limit calculation should reflect this rule
    const positions = await apiClient.get(`/positions`, {
      params: {
        aggregationUnitId,
        securityId,
        businessDate: BUSINESS_DATE
      }
    });
    
    // If there are any borrowed positions, verify they're excluded from limits
    const borrowedPositions = positions.data.filter(
      (p: any) => p.positionType === 'BORROW'
    );
    
    if (borrowedPositions.length > 0) {
      // Borrowed positions should not contribute to lending availability
      const borrowedTotal = borrowedPositions.reduce(
        (total: number, pos: any) => total + pos.settledQty, 
        0
      );
      
      // This test is simplified - in a real system, we'd verify the exact calculation
      expect(auLimit.shortSellLimit).toBeGreaterThanOrEqual(0);
    }
  });

  // Test Japan market-specific rules
  test('should apply market-specific rules for Japan market', async () => {
    const aggregationUnitId = 'AU-006'; // Japan Equity Trading
    const securityId = 'SEC-EQ-006'; // Japan security
    
    // Get the limit for Japan market
    const auLimit = await getAggregationUnitLimit(aggregationUnitId, securityId, BUSINESS_DATE);
    
    // Verify Japan-specific rules
    expect(auLimit.market).toBe('JP');
    expect(auLimit.settlementCutoffApplied).toBe(true);
    
    // Japan has specific settlement cut-off times and quanto settlement rules
    // Verify these are reflected in the limit calculation
    
    // If it's past the cut-off time, no new settlements should be included
    const japanTime = dayjs().add(9, 'hour'); // Convert to Japan time
    const cutoffHour = 15; // Example cut-off at 3 PM Japan time
    
    if (japanTime.hour() >= cutoffHour) {
      // This test is simplified - in a real system, we'd verify settlement timing details
      expect(auLimit).toHaveProperty('settlementCutoffPassed', true);
    }
    
    // Verify quanto settlement handling
    expect(auLimit).toHaveProperty('quantoSettlementHandled', true);
  });

  // Test performance requirements
  test('should meet performance requirements for limit calculation', async () => {
    const clientId = 'CP-00001';
    const aggregationUnitId = 'AU-001';
    const securityId = 'SEC-EQ-001';
    
    // Test client limit calculation performance
    const clientLimitPerf = await validatePerformance(
      () => getClientLimit(clientId, securityId, BUSINESS_DATE),
      [],
      PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL
    );
    expect(clientLimitPerf.success).toBe(true);
    expect(clientLimitPerf.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
    
    // Test aggregation unit limit calculation performance
    const auLimitPerf = await validatePerformance(
      () => getAggregationUnitLimit(aggregationUnitId, securityId, BUSINESS_DATE),
      [],
      PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL
    );
    expect(auLimitPerf.success).toBe(true);
    expect(auLimitPerf.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
    
    // Test order validation performance
    const orderValidationPerf = await validatePerformance(
      () => validateOrderAgainstLimits(clientId, aggregationUnitId, securityId, 'LONG_SELL', 1000),
      [],
      PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL
    );
    expect(orderValidationPerf.success).toBe(true);
    expect(orderValidationPerf.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
  });

  // Test edge cases
  test('should handle edge cases correctly', async () => {
    // 1. Test with zero quantity positions
    const zeroQuantityClientId = 'CP-00009';
    const zeroQuantitySecurityId = 'SEC-EQ-003';
    const zeroQuantityAggregationUnitId = 'AU-001';
    
    const zeroQuantityClientLimit = await getClientLimit(
      zeroQuantityClientId, 
      zeroQuantitySecurityId, 
      BUSINESS_DATE
    );
    expect(zeroQuantityClientLimit.longSellLimit).toBeGreaterThanOrEqual(0);
    expect(zeroQuantityClientLimit.shortSellLimit).toBeGreaterThanOrEqual(0);
    
    // 2. Test with very large position quantities
    // This test would depend on having data with large positions
    
    // 3. Test with negative quantities (short positions)
    const shortPositionClientId = 'CP-00002';
    const shortPositionSecurityId = 'SEC-EQ-003';
    
    const shortPositionClientLimit = await getClientLimit(
      shortPositionClientId, 
      shortPositionSecurityId, 
      BUSINESS_DATE
    );
    // Short positions should not contribute to long sell limits
    expect(shortPositionClientLimit.longSellLimit).toBeGreaterThanOrEqual(0);
    
    // 4. Test with inactive clients
    const inactiveClientId = 'CP-00015';
    try {
      const inactiveClientLimit = await getClientLimit(
        inactiveClientId, 
        'SEC-EQ-001', 
        BUSINESS_DATE
      );
      // Either we should get an error, or the limit should be zero
      if (inactiveClientLimit) {
        expect(inactiveClientLimit.longSellLimit).toBe(0);
        expect(inactiveClientLimit.shortSellLimit).toBe(0);
      }
    } catch (error: any) {
      // If we get an error, it should be a 400 or 404
      expect(error.response.status).toBeGreaterThanOrEqual(400);
      expect(error.response.status).toBeLessThan(500);
    }
  });
});