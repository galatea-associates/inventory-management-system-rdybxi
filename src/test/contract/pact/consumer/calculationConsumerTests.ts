import { Pact, Matchers } from '@pact-foundation/pact'; // v11.0.2
import path from 'path';
import axios from 'axios'; // v1.4.0

import { 
  API_BASE_URL, 
  API_ENDPOINTS, 
  PERFORMANCE_THRESHOLDS, 
  TEST_TIMEOUTS 
} from '../../../common/constants';

import {
  loadTestData,
  createMockHttpClient,
  validatePerformance
} from '../../../common/testUtils';

import {
  createMockPosition,
  createMockInventory,
  mockPositions,
  mockInventories
} from '../../../common/mockData';

// Constants for Pact configuration
const PACT_DIR = path.resolve(__dirname, '../pacts');
const MOCK_SERVER_PORT = 8082;
const CALCULATION_SERVICE_URL = `http://localhost:${MOCK_SERVER_PORT}`;

/**
 * Sets up the Pact mock provider for testing
 * @returns Configured Pact mock provider
 */
function setupPact() {
  return new Pact({
    consumer: 'workflow-service',
    provider: 'calculation-service',
    port: MOCK_SERVER_PORT,
    log: process.env.CI ? path.resolve(process.cwd(), 'logs', 'pact.log') : undefined,
    logLevel: process.env.CI ? 'error' : 'info',
    dir: PACT_DIR,
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
    // Position endpoints
    getPosition: async (bookId, securityId, businessDate) => {
      const url = `${baseUrl}/api/v1/calculations/positions/${bookId}/${securityId}?businessDate=${businessDate}`;
      const response = await axios.get(url);
      return response.data;
    },
    
    getPositionsBySecurity: async (securityId, businessDate) => {
      const url = `${baseUrl}/api/v1/calculations/positions/security/${securityId}?businessDate=${businessDate}`;
      const response = await axios.get(url);
      return response.data;
    },
    
    getSettlementLadder: async (bookId, securityId, businessDate) => {
      const url = `${baseUrl}/api/v1/calculations/positions/settlement-ladder?bookId=${bookId}&securityId=${securityId}&businessDate=${businessDate}`;
      const response = await axios.get(url);
      return response.data;
    },
    
    // Inventory endpoints
    getForLoanAvailability: async (securityId, businessDate) => {
      const url = `${baseUrl}/api/v1/calculations/inventory/for-loan?securityId=${securityId}&businessDate=${businessDate}`;
      const response = await axios.get(url);
      return response.data;
    },
    
    getForPledgeAvailability: async (securityId, businessDate) => {
      const url = `${baseUrl}/api/v1/calculations/inventory/for-pledge?securityId=${securityId}&businessDate=${businessDate}`;
      const response = await axios.get(url);
      return response.data;
    },
    
    getLocateAvailability: async (securityId, businessDate) => {
      const url = `${baseUrl}/api/v1/calculations/inventory/locate-availability?securityId=${securityId}&businessDate=${businessDate}`;
      const response = await axios.get(url);
      return response.data;
    },
    
    // Limit endpoints
    getClientLimits: async (clientId, securityId, businessDate) => {
      const url = `${baseUrl}/api/v1/calculations/limits/client/${clientId}?securityId=${securityId}&businessDate=${businessDate}`;
      const response = await axios.get(url);
      return response.data;
    },
    
    getAggregationUnitLimits: async (aggregationUnitId, securityId, businessDate) => {
      const url = `${baseUrl}/api/v1/calculations/limits/aggregation-unit/${aggregationUnitId}?securityId=${securityId}&businessDate=${businessDate}`;
      const response = await axios.get(url);
      return response.data;
    },
    
    validateOrder: async (order) => {
      const url = `${baseUrl}/api/v1/calculations/limits/validate`;
      const response = await axios.post(url, order);
      return response.data;
    },
    
    // Rule endpoints
    getCalculationRules: async (calculationType, market) => {
      const url = `${baseUrl}/api/v1/calculations/rules?calculationType=${calculationType}&market=${market}`;
      const response = await axios.get(url);
      return response.data;
    },
    
    getCalculationRule: async (ruleName, market) => {
      const url = `${baseUrl}/api/v1/calculations/rules/${ruleName}?market=${market}`;
      const response = await axios.get(url);
      return response.data;
    }
  };
}

/**
 * Sets up Pact interactions for position-related endpoints
 * @param pact - The Pact instance
 */
function setupPositionInteractions(pact) {
  // Using the exact interaction from pact_interactions
  pact.addInteraction({
    state: 'a position exists',
    uponReceiving: 'a request for a position by book ID and security ID',
    withRequest: {
      method: 'GET',
      path: '/api/v1/calculations/positions/{bookId}/{securityId}',
      query: {
        businessDate: '2023-06-15'
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        bookId: 'EQUITY-01',
        securityId: 'AAPL',
        businessDate: '2023-06-15',
        contractualQty: 10000,
        settledQty: 8000,
        sd0Deliver: 0,
        sd0Receipt: 2000,
        sd1Deliver: 0,
        sd1Receipt: 0,
        sd2Deliver: 0,
        sd2Receipt: 0,
        sd3Deliver: 0,
        sd3Receipt: 0,
        sd4Deliver: 0,
        sd4Receipt: 0
      }
    }
  });
  
  // Additional position interactions
  pact.addInteraction({
    state: 'positions exist for a security',
    uponReceiving: 'a request for positions by security ID',
    withRequest: {
      method: 'GET',
      path: '/api/v1/calculations/positions/security/AAPL',
      query: {
        businessDate: '2023-06-15'
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: Matchers.eachLike({
        bookId: 'EQUITY-01',
        securityId: 'AAPL',
        businessDate: '2023-06-15',
        contractualQty: 10000,
        settledQty: 8000,
        sd0Deliver: 0,
        sd0Receipt: 2000
      })
    }
  });
  
  pact.addInteraction({
    state: 'a settlement ladder exists',
    uponReceiving: 'a request for a settlement ladder',
    withRequest: {
      method: 'GET',
      path: '/api/v1/calculations/positions/settlement-ladder',
      query: {
        bookId: 'EQUITY-01',
        securityId: 'AAPL',
        businessDate: '2023-06-15'
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        bookId: 'EQUITY-01',
        securityId: 'AAPL',
        businessDate: '2023-06-15',
        settlementDays: Matchers.eachLike({
          day: Matchers.integer(0),
          netDelivery: Matchers.integer(0),
          netReceipt: Matchers.integer(0),
          projectedPosition: Matchers.integer(0)
        }, { min: 5 })
      }
    }
  });
}

/**
 * Sets up Pact interactions for inventory-related endpoints
 * @param pact - The Pact instance
 */
function setupInventoryInteractions(pact) {
  // Using the exact interaction from pact_interactions
  pact.addInteraction({
    state: 'for loan availability exists',
    uponReceiving: 'a request for for-loan availability',
    withRequest: {
      method: 'GET',
      path: '/api/v1/calculations/inventory/for-loan',
      query: {
        securityId: 'AAPL',
        businessDate: '2023-06-15'
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        securityId: 'AAPL',
        calculationType: 'FOR_LOAN',
        businessDate: '2023-06-15',
        quantity: 15000,
        market: 'GLOBAL'
      }
    }
  });
  
  // Additional inventory interactions
  pact.addInteraction({
    state: 'for pledge availability exists',
    uponReceiving: 'a request for for-pledge availability',
    withRequest: {
      method: 'GET',
      path: '/api/v1/calculations/inventory/for-pledge',
      query: {
        securityId: 'AAPL',
        businessDate: '2023-06-15'
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        securityId: 'AAPL',
        calculationType: 'FOR_PLEDGE',
        businessDate: '2023-06-15',
        quantity: 10000,
        market: 'GLOBAL'
      }
    }
  });
  
  pact.addInteraction({
    state: 'locate availability exists',
    uponReceiving: 'a request for locate availability',
    withRequest: {
      method: 'GET',
      path: '/api/v1/calculations/inventory/locate-availability',
      query: {
        securityId: 'AAPL',
        businessDate: '2023-06-15'
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        securityId: 'AAPL',
        calculationType: 'LOCATE',
        businessDate: '2023-06-15',
        quantity: 12000,
        market: 'GLOBAL'
      }
    }
  });
}

/**
 * Sets up Pact interactions for limit-related endpoints
 * @param pact - The Pact instance
 */
function setupLimitInteractions(pact) {
  // Interaction for getClientLimits
  pact.addInteraction({
    state: 'client limits exist',
    uponReceiving: 'a request for client limits',
    withRequest: {
      method: 'GET',
      path: '/api/v1/calculations/limits/client/CLIENT001',
      query: {
        securityId: 'AAPL',
        businessDate: '2023-06-15'
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        clientId: 'CLIENT001',
        securityId: 'AAPL',
        businessDate: '2023-06-15',
        longSellLimit: 10000,
        shortSellLimit: 15000,
        lastUpdated: Matchers.iso8601DateTime()
      }
    }
  });
  
  // Interaction for getAggregationUnitLimits
  pact.addInteraction({
    state: 'aggregation unit limits exist',
    uponReceiving: 'a request for aggregation unit limits',
    withRequest: {
      method: 'GET',
      path: '/api/v1/calculations/limits/aggregation-unit/AU001',
      query: {
        securityId: 'AAPL',
        businessDate: '2023-06-15'
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        aggregationUnitId: 'AU001',
        securityId: 'AAPL',
        businessDate: '2023-06-15',
        longSellLimit: 50000,
        shortSellLimit: 30000,
        lastUpdated: Matchers.iso8601DateTime()
      }
    }
  });
  
  // Using the exact interaction from pact_interactions
  pact.addInteraction({
    state: 'client limits exist and aggregation unit limits exist',
    uponReceiving: 'a request to validate an order against limits',
    withRequest: {
      method: 'POST',
      path: '/api/v1/calculations/limits/validate',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        orderId: 'ORD123',
        securityId: 'AAPL',
        clientId: 'CLIENT001',
        aggregationUnitId: 'AU001',
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
        orderId: 'ORD123',
        valid: true,
        clientLimitRemaining: 10000,
        aggregationUnitLimitRemaining: 50000,
        message: null
      }
    }
  });
}

/**
 * Sets up Pact interactions for calculation rule-related endpoints
 * @param pact - The Pact instance
 */
function setupRuleInteractions(pact) {
  // Interaction for getCalculationRules
  pact.addInteraction({
    state: 'calculation rules exist',
    uponReceiving: 'a request for calculation rules',
    withRequest: {
      method: 'GET',
      path: '/api/v1/calculations/rules',
      query: {
        calculationType: 'FOR_LOAN',
        market: 'GLOBAL'
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: Matchers.eachLike({
        id: 'RULE-001',
        name: 'Global For Loan Availability',
        market: 'GLOBAL',
        calculationType: 'FOR_LOAN',
        status: 'ACTIVE',
        version: '1.2',
        description: 'Global rule for calculating for-loan availability',
        effectiveDate: '2023-01-01'
      })
    }
  });
  
  // Interaction for getCalculationRule
  pact.addInteraction({
    state: 'a calculation rule exists',
    uponReceiving: 'a request for a specific calculation rule',
    withRequest: {
      method: 'GET',
      path: '/api/v1/calculations/rules/Global%20For%20Loan%20Availability',
      query: {
        market: 'GLOBAL'
      }
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        id: 'RULE-001',
        name: 'Global For Loan Availability',
        market: 'GLOBAL',
        calculationType: 'FOR_LOAN',
        status: 'ACTIVE',
        version: '1.2',
        description: 'Global rule for calculating for-loan availability',
        effectiveDate: '2023-01-01',
        configuration: {
          includeLongPositions: true,
          includeHypothecatableAssets: true,
          includeRepoPledgedAssets: true,
          includeFinancingSwapAssets: true,
          includeExternalExclusiveAvailabilities: true,
          includeCrossBorderSecurities: true,
          excludeSLABLending: true,
          excludePayToHolds: true,
          excludeReservedClientAssets: true,
          excludeCorporateActionAssets: true
        }
      }
    }
  });
}

/**
 * Tests the position-related endpoints against the Pact mock provider
 * @param client - The calculation client
 */
async function testPositionEndpoints(client) {
  // Test getPosition
  const positionResult = await validatePerformance(
    () => client.getPosition('EQUITY-01', 'AAPL', '2023-06-15'),
    [],
    PERFORMANCE_THRESHOLDS.POSITION_CALCULATION
  );
  expect(positionResult.success).toBe(true);
  expect(positionResult.result).toHaveProperty('bookId', 'EQUITY-01');
  expect(positionResult.result).toHaveProperty('securityId', 'AAPL');
  
  // Test getPositionsBySecurity
  const positionsBySecurityResult = await client.getPositionsBySecurity('AAPL', '2023-06-15');
  expect(Array.isArray(positionsBySecurityResult)).toBe(true);
  
  // Test getSettlementLadder
  const settlementLadderResult = await client.getSettlementLadder('EQUITY-01', 'AAPL', '2023-06-15');
  expect(settlementLadderResult).toHaveProperty('settlementDays');
  expect(Array.isArray(settlementLadderResult.settlementDays)).toBe(true);
}

/**
 * Tests the inventory-related endpoints against the Pact mock provider
 * @param client - The calculation client
 */
async function testInventoryEndpoints(client) {
  // Test getForLoanAvailability
  const forLoanResult = await validatePerformance(
    () => client.getForLoanAvailability('AAPL', '2023-06-15'),
    [],
    PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
  );
  expect(forLoanResult.success).toBe(true);
  expect(forLoanResult.result).toHaveProperty('securityId', 'AAPL');
  expect(forLoanResult.result).toHaveProperty('calculationType', 'FOR_LOAN');
  
  // Test getForPledgeAvailability
  const forPledgeResult = await client.getForPledgeAvailability('AAPL', '2023-06-15');
  expect(forPledgeResult).toHaveProperty('calculationType', 'FOR_PLEDGE');
  expect(forPledgeResult).toHaveProperty('quantity', 10000);
  
  // Test getLocateAvailability
  const locateAvailabilityResult = await client.getLocateAvailability('AAPL', '2023-06-15');
  expect(locateAvailabilityResult).toHaveProperty('calculationType', 'LOCATE');
  expect(locateAvailabilityResult).toHaveProperty('quantity', 12000);
}

/**
 * Tests the limit-related endpoints against the Pact mock provider
 * @param client - The calculation client
 */
async function testLimitEndpoints(client) {
  // Test getClientLimits
  const clientLimitsResult = await client.getClientLimits('CLIENT001', 'AAPL', '2023-06-15');
  expect(clientLimitsResult).toHaveProperty('clientId', 'CLIENT001');
  expect(clientLimitsResult).toHaveProperty('longSellLimit', 10000);
  expect(clientLimitsResult).toHaveProperty('shortSellLimit', 15000);
  
  // Test getAggregationUnitLimits
  const aggregationUnitLimitsResult = await client.getAggregationUnitLimits('AU001', 'AAPL', '2023-06-15');
  expect(aggregationUnitLimitsResult).toHaveProperty('aggregationUnitId', 'AU001');
  expect(aggregationUnitLimitsResult).toHaveProperty('longSellLimit', 50000);
  expect(aggregationUnitLimitsResult).toHaveProperty('shortSellLimit', 30000);
  
  // Test validateOrder
  const orderToValidate = {
    orderId: 'ORD123',
    securityId: 'AAPL',
    clientId: 'CLIENT001',
    aggregationUnitId: 'AU001',
    orderType: 'SHORT_SELL',
    quantity: 5000
  };
  
  const validateOrderResult = await validatePerformance(
    () => client.validateOrder(orderToValidate),
    [],
    PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL
  );
  expect(validateOrderResult.success).toBe(true);
  expect(validateOrderResult.result).toHaveProperty('valid', true);
  expect(validateOrderResult.result).toHaveProperty('clientLimitRemaining', 10000);
  expect(validateOrderResult.result).toHaveProperty('aggregationUnitLimitRemaining', 50000);
}

/**
 * Tests the rule-related endpoints against the Pact mock provider
 * @param client - The calculation client
 */
async function testRuleEndpoints(client) {
  // Test getCalculationRules
  const calculationRulesResult = await client.getCalculationRules('FOR_LOAN', 'GLOBAL');
  expect(Array.isArray(calculationRulesResult)).toBe(true);
  
  // Test getCalculationRule
  const calculationRuleResult = await client.getCalculationRule('Global For Loan Availability', 'GLOBAL');
  expect(calculationRuleResult).toHaveProperty('id', 'RULE-001');
  expect(calculationRuleResult).toHaveProperty('configuration');
  expect(calculationRuleResult.configuration).toHaveProperty('includeLongPositions', true);
}

describe('Calculation Service Consumer Tests', () => {
  let pact;
  
  beforeEach(() => {
    pact = setupPact();
    return pact.setup();
  });
  
  afterEach(() => {
    return pact.finalize();
  });
  
  test('should correctly implement the position API contract', async () => {
    setupPositionInteractions(pact);
    const client = createCalculationClient();
    await testPositionEndpoints(client);
  });
  
  test('should correctly implement the inventory API contract', async () => {
    setupInventoryInteractions(pact);
    const client = createCalculationClient();
    await testInventoryEndpoints(client);
  });
  
  test('should correctly implement the limit API contract', async () => {
    setupLimitInteractions(pact);
    const client = createCalculationClient();
    await testLimitEndpoints(client);
  });
  
  test('should correctly implement the rule API contract', async () => {
    setupRuleInteractions(pact);
    const client = createCalculationClient();
    await testRuleEndpoints(client);
  });
  
  test('should meet performance requirements for critical endpoints', async () => {
    // Position API performance
    setupPositionInteractions(pact);
    let client = createCalculationClient();
    const positionResult = await validatePerformance(
      () => client.getPosition('EQUITY-01', 'AAPL', '2023-06-15'),
      [],
      PERFORMANCE_THRESHOLDS.POSITION_CALCULATION
    );
    expect(positionResult.success).toBe(true);
    expect(positionResult.executionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.POSITION_CALCULATION);
    
    // Inventory API performance
    setupInventoryInteractions(pact);
    client = createCalculationClient();
    const inventoryResult = await validatePerformance(
      () => client.getForLoanAvailability('AAPL', '2023-06-15'),
      [],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(inventoryResult.success).toBe(true);
    expect(inventoryResult.executionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION);
    
    // Short sell validation performance
    setupLimitInteractions(pact);
    client = createCalculationClient();
    const orderToValidate = {
      orderId: 'ORD123',
      securityId: 'AAPL',
      clientId: 'CLIENT001',
      aggregationUnitId: 'AU001',
      orderType: 'SHORT_SELL',
      quantity: 5000
    };
    
    const validateOrderResult = await validatePerformance(
      () => client.validateOrder(orderToValidate),
      [],
      PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL
    );
    expect(validateOrderResult.success).toBe(true);
    expect(validateOrderResult.executionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
  });
});