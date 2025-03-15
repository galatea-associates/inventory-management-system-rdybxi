import { Pact, Matchers } from '@pact-foundation/pact'; // v11.0.2
import path from 'path';
import axios from 'axios'; // v1.4.0

import { API_BASE_URL, API_ENDPOINTS, PERFORMANCE_THRESHOLDS, TEST_TIMEOUTS } from '../../../common/constants';
import { loadTestData, createMockHttpClient, validatePerformance } from '../../../common/testUtils';
import { createMockLocateRequest, createMockOrder, mockLocates, mockOrders } from '../../../common/mockData';

// Configuration for Pact tests
const PACT_DIR = path.resolve(__dirname, '../pacts');
const MOCK_SERVER_PORT = 8083;
const CALCULATION_SERVICE_URL = `http://localhost:${MOCK_SERVER_PORT}`;
const INVENTORY_SERVICE_URL = `http://localhost:${MOCK_SERVER_PORT}`;

/**
 * Sets up the Pact mock provider for testing
 * @param providerName Name of the provider service
 * @returns Configured Pact mock provider
 */
function setupPact(providerName: string): Pact {
  return new Pact({
    consumer: 'workflow-service',
    provider: providerName,
    port: MOCK_SERVER_PORT,
    log: process.env.CI ? path.resolve(process.cwd(), 'logs', 'pact.log') : './logs/pact.log',
    dir: PACT_DIR,
    logLevel: process.env.CI ? 'error' : 'info',
    pactfileWriteMode: 'merge'
  });
}

/**
 * Creates a client for interacting with the calculation service API
 * @returns Client object with methods for calculation service API
 */
function createCalculationClient() {
  const baseUrl = CALCULATION_SERVICE_URL;
  
  return {
    getClientLimit: (clientId: string, securityId: string, businessDate: string) => {
      return axios.get(`${baseUrl}/api/v1/calculations/limits/client/${clientId}`, {
        params: { securityId, businessDate }
      });
    },
    updateClientLimit: (clientId: string, data: any) => {
      return axios.put(`${baseUrl}/api/v1/calculations/limits/client/${clientId}`, data);
    },
    getAggregationUnitLimit: (aggregationUnitId: string, securityId: string, businessDate: string) => {
      return axios.get(`${baseUrl}/api/v1/calculations/limits/aggregation-unit/${aggregationUnitId}`, {
        params: { securityId, businessDate }
      });
    },
    updateAggregationUnitLimit: (aggregationUnitId: string, data: any) => {
      return axios.put(`${baseUrl}/api/v1/calculations/limits/aggregation-unit/${aggregationUnitId}`, data);
    },
    validateOrder: (orderData: any) => {
      return axios.post(`${baseUrl}/api/v1/calculations/limits/validate`, orderData);
    }
  };
}

/**
 * Creates a client for interacting with the inventory service API
 * @returns Client object with methods for inventory service API
 */
function createInventoryClient() {
  const baseUrl = INVENTORY_SERVICE_URL;
  
  return {
    getInventoryAvailability: (securityId: string, businessDate: string, calculationType: string) => {
      return axios.get(`${baseUrl}/api/v1/inventory/availability`, {
        params: { securityId, businessDate, calculationType }
      });
    },
    updateInventoryAvailability: (data: any) => {
      return axios.put(`${baseUrl}/api/v1/inventory/availability`, data);
    },
    getLocateAvailability: (securityId: string, businessDate: string) => {
      return axios.get(`${baseUrl}/api/v1/inventory/locate-availability`, {
        params: { securityId, businessDate }
      });
    },
    updateLocateAvailability: (data: any) => {
      return axios.post(`${baseUrl}/api/v1/inventory/locate-availability/decrement`, data);
    }
  };
}

/**
 * Sets up Pact interactions for client limit-related endpoints
 * @param pact Pact instance
 */
function setupClientLimitInteractions(pact: Pact): void {
  const clientId = 'CLIENT001';
  const securityId = 'AAPL';
  const businessDate = '2023-06-15';
  
  pact.addInteraction({
    state: 'client limits exist',
    uponReceiving: 'a request for client limits by client ID and security ID',
    withRequest: {
      method: 'GET',
      path: `/api/v1/calculations/limits/client/${clientId}`,
      query: {
        securityId: securityId,
        businessDate: businessDate
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        clientId: clientId,
        securityId: securityId,
        businessDate: businessDate,
        longSellLimit: 50000,
        longSellUsed: 10000,
        shortSellLimit: 20000,
        shortSellUsed: 5000
      }
    }
  });
}

/**
 * Sets up Pact interactions for aggregation unit limit-related endpoints
 * @param pact Pact instance
 */
function setupAggregationUnitLimitInteractions(pact: Pact): void {
  const aggregationUnitId = 'AU001';
  const securityId = 'AAPL';
  const businessDate = '2023-06-15';
  
  pact.addInteraction({
    state: 'aggregation unit limits exist',
    uponReceiving: 'a request for aggregation unit limits by aggregation unit ID and security ID',
    withRequest: {
      method: 'GET',
      path: `/api/v1/calculations/limits/aggregation-unit/${aggregationUnitId}`,
      query: {
        securityId: securityId,
        businessDate: businessDate
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        aggregationUnitId: aggregationUnitId,
        securityId: securityId,
        businessDate: businessDate,
        longSellLimit: 200000,
        longSellUsed: 50000,
        shortSellLimit: 100000,
        shortSellUsed: 30000,
        market: 'US'
      }
    }
  });
}

/**
 * Sets up Pact interactions for order validation-related endpoints
 * @param pact Pact instance
 */
function setupOrderValidationInteractions(pact: Pact): void {
  const orderId = 'ORD123';
  const securityId = 'AAPL';
  const clientId = 'CLIENT001';
  const aggregationUnitId = 'AU001';
  
  pact.addInteraction({
    state: 'client limits exist and aggregation unit limits exist',
    uponReceiving: 'a request to validate an order against limits',
    withRequest: {
      method: 'POST',
      path: `/api/v1/calculations/limits/validate`,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        orderId: orderId,
        securityId: securityId,
        clientId: clientId,
        aggregationUnitId: aggregationUnitId,
        orderType: 'SHORT_SELL',
        quantity: 5000
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        orderId: orderId,
        valid: true,
        clientLimitRemaining: 10000,
        aggregationUnitLimitRemaining: 65000,
        message: null
      },
      expectedPerformance: '< 150ms'
    }
  });
}

/**
 * Sets up Pact interactions for inventory availability-related endpoints
 * @param pact Pact instance
 */
function setupInventoryAvailabilityInteractions(pact: Pact): void {
  const securityId = 'AAPL';
  const businessDate = '2023-06-15';
  const calculationType = 'FOR_LOAN';
  
  pact.addInteraction({
    state: 'inventory availability exists',
    uponReceiving: 'a request for inventory availability by security ID',
    withRequest: {
      method: 'GET',
      path: `/api/v1/inventory/availability`,
      query: {
        securityId: securityId,
        businessDate: businessDate,
        calculationType: calculationType
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        securityId: securityId,
        calculationType: calculationType,
        businessDate: businessDate,
        quantity: 15000,
        market: 'GLOBAL',
        securityTemperature: 'GENERAL_COLLATERAL',
        borrowRate: 0.25
      }
    }
  });
}

/**
 * Sets up Pact interactions for locate availability-related endpoints
 * @param pact Pact instance
 */
function setupLocateAvailabilityInteractions(pact: Pact): void {
  const securityId = 'AAPL';
  const businessDate = '2023-06-15';
  
  pact.addInteraction({
    state: 'locate availability exists',
    uponReceiving: 'a request for locate availability by security ID',
    withRequest: {
      method: 'GET',
      path: `/api/v1/inventory/locate-availability`,
      query: {
        securityId: securityId,
        businessDate: businessDate
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        securityId: securityId,
        businessDate: businessDate,
        availableQuantity: 15000,
        securityTemperature: 'GENERAL_COLLATERAL',
        borrowRate: 0.25,
        market: 'US'
      }
    }
  });
  
  const locateId = 'LOC123';
  const decrementQuantity = 1000;
  
  pact.addInteraction({
    state: 'locate availability exists',
    uponReceiving: 'a request to update locate availability after approval',
    withRequest: {
      method: 'POST',
      path: `/api/v1/inventory/locate-availability/decrement`,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        securityId: securityId,
        businessDate: businessDate,
        decrementQuantity: decrementQuantity,
        locateId: locateId
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        securityId: securityId,
        businessDate: businessDate,
        availableQuantity: 14000,
        securityTemperature: 'GENERAL_COLLATERAL',
        borrowRate: 0.25,
        market: 'US'
      },
      expectedPerformance: '< 200ms'
    }
  });
}

/**
 * Tests the client limit-related endpoints against the Pact mock provider
 * @param client Client object for interacting with calculation service
 * @returns Promise that resolves when tests are complete
 */
async function testClientLimitEndpoints(client: any): Promise<void> {
  const clientId = 'CLIENT001';
  const securityId = 'AAPL';
  const businessDate = '2023-06-15';
  
  // Test getClientLimit endpoint
  const response = await client.getClientLimit(clientId, securityId, businessDate);
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty('clientId', clientId);
  expect(response.data).toHaveProperty('securityId', securityId);
  expect(response.data).toHaveProperty('longSellLimit');
  expect(response.data).toHaveProperty('shortSellLimit');
}

/**
 * Tests the aggregation unit limit-related endpoints against the Pact mock provider
 * @param client Client object for interacting with calculation service
 * @returns Promise that resolves when tests are complete
 */
async function testAggregationUnitLimitEndpoints(client: any): Promise<void> {
  const aggregationUnitId = 'AU001';
  const securityId = 'AAPL';
  const businessDate = '2023-06-15';
  
  // Test getAggregationUnitLimit endpoint
  const response = await client.getAggregationUnitLimit(aggregationUnitId, securityId, businessDate);
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty('aggregationUnitId', aggregationUnitId);
  expect(response.data).toHaveProperty('securityId', securityId);
  expect(response.data).toHaveProperty('longSellLimit');
  expect(response.data).toHaveProperty('shortSellLimit');
  expect(response.data).toHaveProperty('market');
}

/**
 * Tests the order validation-related endpoints against the Pact mock provider
 * @param client Client object for interacting with calculation service
 * @returns Promise that resolves when tests are complete
 */
async function testOrderValidationEndpoints(client: any): Promise<void> {
  const orderData = {
    orderId: 'ORD123',
    securityId: 'AAPL',
    clientId: 'CLIENT001',
    aggregationUnitId: 'AU001',
    orderType: 'SHORT_SELL',
    quantity: 5000
  };
  
  // Test validateOrder endpoint with performance validation
  const performanceResult = await validatePerformance(
    () => client.validateOrder(orderData),
    [],
    PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL
  );
  
  expect(performanceResult.success).toBe(true);
  expect(performanceResult.result.data).toHaveProperty('valid', true);
  expect(performanceResult.result.data).toHaveProperty('clientLimitRemaining');
  expect(performanceResult.result.data).toHaveProperty('aggregationUnitLimitRemaining');
  expect(performanceResult.executionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
}

/**
 * Tests the inventory availability-related endpoints against the Pact mock provider
 * @param client Client object for interacting with inventory service
 * @returns Promise that resolves when tests are complete
 */
async function testInventoryAvailabilityEndpoints(client: any): Promise<void> {
  const securityId = 'AAPL';
  const businessDate = '2023-06-15';
  const calculationType = 'FOR_LOAN';
  
  // Test getInventoryAvailability endpoint
  const response = await client.getInventoryAvailability(securityId, businessDate, calculationType);
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty('securityId', securityId);
  expect(response.data).toHaveProperty('calculationType', calculationType);
  expect(response.data).toHaveProperty('quantity');
  expect(response.data).toHaveProperty('securityTemperature');
  expect(response.data).toHaveProperty('borrowRate');
}

/**
 * Tests the locate availability-related endpoints against the Pact mock provider
 * @param client Client object for interacting with inventory service
 * @returns Promise that resolves when tests are complete
 */
async function testLocateAvailabilityEndpoints(client: any): Promise<void> {
  const securityId = 'AAPL';
  const businessDate = '2023-06-15';
  
  // Test getLocateAvailability endpoint
  const response = await client.getLocateAvailability(securityId, businessDate);
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty('securityId', securityId);
  expect(response.data).toHaveProperty('availableQuantity');
  expect(response.data).toHaveProperty('securityTemperature');
  expect(response.data).toHaveProperty('borrowRate');
  
  // Test updateLocateAvailability endpoint with performance validation
  const updateData = {
    securityId: securityId,
    businessDate: businessDate,
    decrementQuantity: 1000,
    locateId: 'LOC123'
  };
  
  const performanceResult = await validatePerformance(
    () => client.updateLocateAvailability(updateData),
    [],
    PERFORMANCE_THRESHOLDS.EVENT_PROCESSING
  );
  
  expect(performanceResult.success).toBe(true);
  expect(performanceResult.result.data).toHaveProperty('availableQuantity', 14000);
  expect(performanceResult.executionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.EVENT_PROCESSING);
}

/**
 * Test suite for workflow service consumer tests
 * Verifies that the calculation and inventory service APIs meet
 * the expectations of the workflow service
 */
describe('Workflow Service Consumer Tests', () => {
  
  test('should correctly implement the client limit API contract', async () => {
    const pact = setupPact('calculation-service');
    
    try {
      await pact.setup();
      setupClientLimitInteractions(pact);
      
      const client = createCalculationClient();
      await testClientLimitEndpoints(client);
      
      await pact.verify();
    } finally {
      await pact.finalize();
    }
  });
  
  test('should correctly implement the aggregation unit limit API contract', async () => {
    const pact = setupPact('calculation-service');
    
    try {
      await pact.setup();
      setupAggregationUnitLimitInteractions(pact);
      
      const client = createCalculationClient();
      await testAggregationUnitLimitEndpoints(client);
      
      await pact.verify();
    } finally {
      await pact.finalize();
    }
  });
  
  test('should correctly implement the order validation API contract', async () => {
    const pact = setupPact('calculation-service');
    
    try {
      await pact.setup();
      setupOrderValidationInteractions(pact);
      
      const client = createCalculationClient();
      await testOrderValidationEndpoints(client);
      
      await pact.verify();
    } finally {
      await pact.finalize();
    }
  });
  
  test('should correctly implement the inventory availability API contract', async () => {
    const pact = setupPact('inventory-service');
    
    try {
      await pact.setup();
      setupInventoryAvailabilityInteractions(pact);
      
      const client = createInventoryClient();
      await testInventoryAvailabilityEndpoints(client);
      
      await pact.verify();
    } finally {
      await pact.finalize();
    }
  });
  
  test('should correctly implement the locate availability API contract', async () => {
    const pact = setupPact('inventory-service');
    
    try {
      await pact.setup();
      setupLocateAvailabilityInteractions(pact);
      
      const client = createInventoryClient();
      await testLocateAvailabilityEndpoints(client);
      
      await pact.verify();
    } finally {
      await pact.finalize();
    }
  });
  
  test('should meet performance requirements for critical endpoints', async () => {
    const shortSellOrder = {
      orderId: 'ORD123',
      securityId: 'AAPL',
      clientId: 'CLIENT001',
      aggregationUnitId: 'AU001',
      orderType: 'SHORT_SELL',
      quantity: 5000
    };
    
    const locateDecrement = {
      securityId: 'AAPL',
      businessDate: '2023-06-15',
      decrementQuantity: 1000,
      locateId: 'LOC123'
    };
    
    // Test cases are separated to be explicit about performance requirements
    const pactCalculation = setupPact('calculation-service');
    try {
      await pactCalculation.setup();
      setupOrderValidationInteractions(pactCalculation);
      
      const calculationClient = createCalculationClient();
      const orderValidationPerf = await validatePerformance(
        () => calculationClient.validateOrder(shortSellOrder),
        [],
        PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL
      );
      
      expect(orderValidationPerf.success).toBe(true);
      expect(orderValidationPerf.executionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
      
      await pactCalculation.verify();
    } finally {
      await pactCalculation.finalize();
    }
    
    const pactInventory = setupPact('inventory-service');
    try {
      await pactInventory.setup();
      setupLocateAvailabilityInteractions(pactInventory);
      
      const inventoryClient = createInventoryClient();
      const locateDecrementPerf = await validatePerformance(
        () => inventoryClient.updateLocateAvailability(locateDecrement),
        [],
        PERFORMANCE_THRESHOLDS.EVENT_PROCESSING
      );
      
      expect(locateDecrementPerf.success).toBe(true);
      expect(locateDecrementPerf.executionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.EVENT_PROCESSING);
      
      await pactInventory.verify();
    } finally {
      await pactInventory.finalize();
    }
  });
});