import axios from 'axios'; // ^1.4.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { 
  API_ENDPOINTS, 
  PERFORMANCE_THRESHOLDS, 
  TEST_TIMEOUTS 
} from '../../common/constants';
import { 
  loadTestData, 
  validatePerformance 
} from '../../common/testUtils';
import { 
  createMockOrder, 
  createMockSecurity, 
  createMockCounterparty 
} from '../../common/mockData';

// Constants for the test suite
const API_BASE_URL = process.env.API_TEST_URL || 'http://localhost:8080/api/v1';

/**
 * Sets up test data for short sell approval tests
 * @returns Object containing test securities, counterparties, and orders
 */
function setupTestData() {
  // Load test securities and counterparties from fixtures
  const securities = loadTestData('./src/test/fixtures/securities.json');
  const counterparties = loadTestData('./src/test/fixtures/counterparties.json');
  
  // Create test orders for different scenarios
  const validShortSellOrder = createMockOrder({
    orderType: 'SHORT_SELL',
    securityId: 'SEC-EQ-001',
    security: {
      internalId: 'SEC-EQ-001',
      description: 'Apple Inc. Common Stock'
    },
    clientId: 'CP-00001',
    client: {
      counterpartyId: 'CP-00001',
      name: 'ABC Capital Partners'
    },
    aggregationUnitId: 'AU-001',
    aggregationUnit: {
      aggregationUnitId: 'AU-001',
      name: 'US Equity Trading',
      market: 'US'
    },
    side: 'SELL',
    quantity: 5000
  });
  
  const validLongSellOrder = createMockOrder({
    orderType: 'LONG_SELL',
    securityId: 'SEC-EQ-002',
    security: {
      internalId: 'SEC-EQ-002',
      description: 'Microsoft Corporation Common Stock'
    },
    clientId: 'CP-00001',
    client: {
      counterpartyId: 'CP-00001',
      name: 'ABC Capital Partners'
    },
    aggregationUnitId: 'AU-001',
    aggregationUnit: {
      aggregationUnitId: 'AU-001',
      name: 'US Equity Trading',
      market: 'US'
    },
    side: 'SELL',
    quantity: 4000
  });
  
  const insufficientClientLimitOrder = createMockOrder({
    orderType: 'SHORT_SELL',
    securityId: 'SEC-EQ-003',
    security: {
      internalId: 'SEC-EQ-003',
      description: 'Tesla, Inc. Common Stock'
    },
    clientId: 'CP-00002',
    client: {
      counterpartyId: 'CP-00002',
      name: 'XYZ Investment Fund'
    },
    aggregationUnitId: 'AU-002',
    aggregationUnit: {
      aggregationUnitId: 'AU-002',
      name: 'US Equity Trading',
      market: 'US'
    },
    side: 'SELL',
    quantity: 20000  // Large quantity that should exceed client limit
  });
  
  const insufficientAULimitOrder = createMockOrder({
    orderType: 'SHORT_SELL',
    securityId: 'SEC-EQ-004',
    security: {
      internalId: 'SEC-EQ-004',
      description: 'Amazon.com, Inc. Common Stock'
    },
    clientId: 'CP-00003',
    client: {
      counterpartyId: 'CP-00003',
      name: 'Global Asset Management'
    },
    aggregationUnitId: 'AU-003',
    aggregationUnit: {
      aggregationUnitId: 'AU-003',
      name: 'US Equity Trading',
      market: 'US'
    },
    side: 'SELL',
    quantity: 30000  // Large quantity that should exceed aggregation unit limit
  });
  
  const invalidOrder = createMockOrder({
    // Missing required fields
    orderType: 'SHORT_SELL',
    securityId: 'SEC-EQ-005',
    // Missing client and aggregation unit information
    side: 'SELL',
    quantity: 1000
  });
  
  return {
    securities,
    counterparties,
    orders: {
      validShortSellOrder,
      validLongSellOrder,
      insufficientClientLimitOrder,
      insufficientAULimitOrder,
      invalidOrder
    }
  };
}

/**
 * Sends a request to validate a short sell order
 * @param orderData Order data to validate
 * @returns Promise that resolves to the validation response
 */
async function validateShortSellOrder(orderData) {
  try {
    const url = `${API_BASE_URL}${API_ENDPOINTS.SHORT_SELL.VALIDATE_ORDER}`;
    const response = await axios.post(url, orderData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Validation error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from validation request');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error in validation request setup:', error.message);
    }
    throw error;
  }
}

/**
 * Sends a request to validate a short sell order by ID
 * @param orderId Order ID to validate
 * @param securityId Security ID
 * @param clientId Client ID
 * @param aggregationUnitId Aggregation Unit ID
 * @param orderType Order Type (SHORT_SELL or LONG_SELL)
 * @param quantity Order quantity
 * @returns Promise that resolves to the validation response
 */
async function validateShortSellOrderById(
  orderId,
  securityId,
  clientId,
  aggregationUnitId,
  orderType,
  quantity
) {
  try {
    const url = `${API_BASE_URL}${API_ENDPOINTS.SHORT_SELL.ORDER_BY_ID.replace(':id', orderId)}`;
    const params = {
      securityId,
      clientId,
      aggregationUnitId,
      orderType,
      quantity
    };
    
    const response = await axios.post(url, null, {
      params,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Validation by ID error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received from validation by ID request');
    } else {
      console.error('Error in validation by ID request setup:', error.message);
    }
    throw error;
  }
}

/**
 * Retrieves the validation status for a specific order
 * @param orderId Order ID to check status for
 * @returns Promise that resolves to the validation status
 */
async function getOrderValidationStatus(orderId) {
  try {
    const url = `${API_BASE_URL}${API_ENDPOINTS.SHORT_SELL.ORDER_BY_ID.replace(':id', orderId)}`;
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Status retrieval error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received from status retrieval request');
    } else {
      console.error('Error in status retrieval request setup:', error.message);
    }
    throw error;
  }
}

// Test Suite
describe('Short Sell Approval Integration Tests', () => {
  let testData;
  let axiosInstance;
  
  // Set up test data and configure axios
  beforeAll(() => {
    // Set longer timeout for integration tests
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
    
    // Initialize test data
    testData = setupTestData();
    
    // Configure axios instance
    axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });
  
  // Clean up after all tests
  afterAll(() => {
    // Reset jest timeout
    jest.setTimeout(TEST_TIMEOUTS.UNIT);
  });
  
  // Test Cases
  
  /**
   * Verifies that a valid short sell order is approved.
   * This test covers the basic approval workflow for short sell orders.
   */
  it('should approve a valid short sell order', async () => {
    // Arrange
    const order = testData.orders.validShortSellOrder;
    
    // Act
    const result = await validateShortSellOrder(order);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.approved).toBe(true);
    expect(result.orderId).toBe(order.orderId);
    expect(result.processingTimeMs).toBeDefined();
    expect(result.processingTimeMs).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
  });
  
  /**
   * Verifies that a valid long sell order is approved.
   * This test ensures the system can handle different order types correctly.
   */
  it('should approve a valid long sell order', async () => {
    // Arrange
    const order = testData.orders.validLongSellOrder;
    
    // Act
    const result = await validateShortSellOrder(order);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.approved).toBe(true);
    expect(result.orderId).toBe(order.orderId);
    expect(result.processingTimeMs).toBeDefined();
    expect(result.processingTimeMs).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
  });
  
  /**
   * Verifies that an order with insufficient client limit is rejected.
   * This test covers requirement F-302-RQ-003 for validating orders against client limits.
   */
  it('should reject an order with insufficient client limit', async () => {
    // Arrange
    const order = testData.orders.insufficientClientLimitOrder;
    
    // Act
    const result = await validateShortSellOrder(order);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.approved).toBe(false);
    expect(result.orderId).toBe(order.orderId);
    expect(result.rejectionReason).toBe('INSUFFICIENT_CLIENT_LIMIT');
    expect(result.processingTimeMs).toBeDefined();
    expect(result.processingTimeMs).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
  });
  
  /**
   * Verifies that an order with insufficient aggregation unit limit is rejected.
   * This test covers requirement F-302-RQ-004 for validating orders against aggregation unit limits.
   */
  it('should reject an order with insufficient aggregation unit limit', async () => {
    // Arrange
    const order = testData.orders.insufficientAULimitOrder;
    
    // Act
    const result = await validateShortSellOrder(order);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.approved).toBe(false);
    expect(result.orderId).toBe(order.orderId);
    expect(result.rejectionReason).toBe('INSUFFICIENT_AGGREGATION_UNIT_LIMIT');
    expect(result.processingTimeMs).toBeDefined();
    expect(result.processingTimeMs).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
  });
  
  /**
   * Verifies that invalid orders are properly rejected with validation errors.
   * This test ensures the API performs proper validation of request data.
   */
  it('should reject an invalid order', async () => {
    // Arrange
    const order = testData.orders.invalidOrder;
    
    // Act & Assert
    await expect(validateShortSellOrder(order)).rejects.toThrow();
    try {
      await validateShortSellOrder(order);
    } catch (error) {
      expect(error.response).toBeDefined();
      expect(error.response.status).toBe(400);
      expect(error.response.data.message).toContain('validation');
    }
  });
  
  /**
   * Verifies the API endpoint for validating orders by ID.
   * This test ensures the system supports alternative validation methods.
   */
  it('should validate an order by ID', async () => {
    // Arrange
    const orderId = uuidv4();
    const securityId = 'SEC-EQ-001';
    const clientId = 'CP-00001';
    const aggregationUnitId = 'AU-001';
    const orderType = 'SHORT_SELL';
    const quantity = 5000;
    
    // Act
    const result = await validateShortSellOrderById(
      orderId,
      securityId,
      clientId,
      aggregationUnitId,
      orderType,
      quantity
    );
    
    // Assert
    expect(result).toBeDefined();
    expect(result.approved).toBe(true);
    expect(result.orderId).toBe(orderId);
    expect(result.processingTimeMs).toBeDefined();
    expect(result.processingTimeMs).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
  });
  
  /**
   * Verifies the ability to retrieve validation status for a previously validated order.
   * This test ensures the system maintains a record of validation decisions.
   */
  it('should retrieve order validation status', async () => {
    // Arrange
    // First, create and validate an order to generate a validation record
    const order = testData.orders.validShortSellOrder;
    await validateShortSellOrder(order);
    
    // Act
    const status = await getOrderValidationStatus(order.orderId);
    
    // Assert
    expect(status).toBeDefined();
    expect(status.orderId).toBe(order.orderId);
    expect(status.validated).toBe(true);
    expect(status.decision).toBe('APPROVED');
    expect(status.timestamp).toBeDefined();
    expect(status.validatedBy).toBeDefined();
  });
  
  /**
   * Verifies that validation completes within the required performance threshold.
   * This test covers requirement F-302-RQ-006 for completing the workflow in under 150ms.
   */
  it('should complete validation within performance threshold', async () => {
    // Arrange
    const order = testData.orders.validShortSellOrder;
    
    // Act
    const { success, executionTime, threshold, result } = await validatePerformance(
      validateShortSellOrder,
      [order],
      PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL
    );
    
    // Assert
    expect(success).toBe(true);
    expect(executionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
    expect(threshold).toBe(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
    expect(result.processingTimeMs).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
  });
  
  /**
   * Verifies that the system can handle multiple concurrent validation requests.
   * This test ensures the system can maintain performance under load.
   */
  it('should handle concurrent validation requests', async () => {
    // Arrange
    const concurrentRequests = 10;
    const orders = Array.from({ length: concurrentRequests }, (_, index) => 
      createMockOrder({
        orderId: `ORD-CONCURRENT-${index}`,
        orderType: 'SHORT_SELL',
        securityId: 'SEC-EQ-001',
        security: {
          internalId: 'SEC-EQ-001',
          description: 'Apple Inc. Common Stock'
        },
        clientId: 'CP-00001',
        client: {
          counterpartyId: 'CP-00001',
          name: 'ABC Capital Partners'
        },
        aggregationUnitId: 'AU-001',
        aggregationUnit: {
          aggregationUnitId: 'AU-001',
          name: 'US Equity Trading',
          market: 'US'
        },
        side: 'SELL',
        quantity: 1000 + index * 100 // Different quantities
      })
    );
    
    // Act
    const startTime = Date.now();
    const results = await Promise.all(orders.map(order => validateShortSellOrder(order)));
    const totalTime = Date.now() - startTime;
    
    // Assert
    expect(results.length).toBe(concurrentRequests);
    results.forEach((result, index) => {
      expect(result).toBeDefined();
      expect(result.orderId).toBe(orders[index].orderId);
      expect(result.processingTimeMs).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
    });
    
    // Check that concurrent processing was efficient
    // Average time per request should be significantly less than processing them sequentially
    const avgTimePerRequest = totalTime / concurrentRequests;
    expect(avgTimePerRequest).toBeLessThan(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
    
    console.log(`Processed ${concurrentRequests} concurrent requests in ${totalTime}ms (avg: ${avgTimePerRequest.toFixed(2)}ms per request)`);
  });
});