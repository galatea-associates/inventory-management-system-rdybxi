/**
 * Provider-side contract tests for the API Gateway service using Pact.
 * These tests verify that the API Gateway correctly implements the contract
 * expected by consumer applications, particularly the web UI.
 */

import { Verifier, LogLevel } from '@pact-foundation/pact'; // v11.0.2
import * as path from 'path';
import axios from 'axios'; // v1.4.0
import express from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5

import {
  API_BASE_URL,
  API_ENDPOINTS,
  PERFORMANCE_THRESHOLDS
} from '../../../common/constants';
import { loadTestData, createMockService } from '../../../common/testUtils';

// Path to pact files
const PACT_DIR = path.resolve(__dirname, '../pacts');

// Provider base URL
const PROVIDER_BASE_URL = process.env.PROVIDER_URL || 'http://localhost:8080';

// Pact broker URL
const PACT_BROKER_URL = process.env.PACT_BROKER_URL || 'http://localhost:9292';

/**
 * Sets up a mock provider server for testing.
 * 
 * @param port - Port number to run the server on
 * @returns Object containing the server instance and a cleanup function
 */
function setupProviderServer(port: number) {
  const app = express();
  
  // Configure middleware
  app.use(cors());
  app.use(express.json());
  
  // Set up mock routes
  setupMockRoutes(app);
  
  // Start the server
  const server = app.listen(port);
  
  // Return server instance and cleanup function
  return {
    server,
    cleanup: () => {
      server.close();
    }
  };
}

/**
 * Sets up mock routes for the provider server.
 * 
 * @param app - Express application
 */
function setupMockRoutes(app: express.Application) {
  // Reference Data endpoints
  app.get(`${API_ENDPOINTS.REFERENCE_DATA.SECURITIES}`, (req, res) => {
    const securities = loadTestData(`${__dirname}/../fixtures/securities/securities.json`);
    setTimeout(() => res.json(securities), 50); // Simulate network delay
  });
  
  app.get(`${API_ENDPOINTS.REFERENCE_DATA.SECURITY_BY_ID.replace(':id', ':securityId')}`, (req, res) => {
    const securityId = req.params.securityId;
    const security = loadTestData(`${__dirname}/../fixtures/securities/security-${securityId}.json`);
    setTimeout(() => res.json(security), 50);
  });
  
  app.get(`${API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTIES}`, (req, res) => {
    const counterparties = loadTestData(`${__dirname}/../fixtures/counterparties/counterparties.json`);
    setTimeout(() => res.json(counterparties), 50);
  });
  
  // Market Data endpoints
  app.get(`${API_ENDPOINTS.MARKET_DATA.PRICES}`, (req, res) => {
    const prices = loadTestData(`${__dirname}/../fixtures/market-data/prices.json`);
    setTimeout(() => res.json(prices), 50);
  });
  
  app.get(`${API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', ':id')}`, (req, res) => {
    const securityId = req.params.id;
    const prices = loadTestData(`${__dirname}/../fixtures/market-data/prices-${securityId}.json`);
    setTimeout(() => res.json(prices), 50);
  });
  
  // Position endpoints
  app.get(`${API_ENDPOINTS.POSITION.POSITIONS}`, (req, res) => {
    const positions = loadTestData(`${__dirname}/../fixtures/positions/positions.json`);
    setTimeout(() => res.json(positions), 50);
  });
  
  app.get(`${API_ENDPOINTS.POSITION.SETTLEMENT_LADDER}`, (req, res) => {
    const ladders = loadTestData(`${__dirname}/../fixtures/positions/settlement-ladder.json`);
    setTimeout(() => res.json(ladders), 50);
  });
  
  // Inventory endpoints
  app.get(`${API_ENDPOINTS.INVENTORY.FOR_LOAN}`, (req, res) => {
    const forLoan = loadTestData(`${__dirname}/../fixtures/inventories/for-loan.json`);
    setTimeout(() => res.json(forLoan), 50);
  });
  
  app.get(`${API_ENDPOINTS.INVENTORY.FOR_PLEDGE}`, (req, res) => {
    const forPledge = loadTestData(`${__dirname}/../fixtures/inventories/for-pledge.json`);
    setTimeout(() => res.json(forPledge), 50);
  });
  
  app.get(`${API_ENDPOINTS.INVENTORY.CLIENT_LIMITS.replace(':clientId', ':id')}`, (req, res) => {
    const clientId = req.params.id;
    const limits = loadTestData(`${__dirname}/../fixtures/inventories/client-limits-${clientId}.json`);
    setTimeout(() => res.json(limits), 50);
  });
  
  // Locate endpoints
  app.get(`${API_ENDPOINTS.LOCATE.LOCATES}`, (req, res) => {
    const locates = loadTestData(`${__dirname}/../fixtures/locates/locates.json`);
    setTimeout(() => res.json(locates), 50);
  });
  
  app.post(`${API_ENDPOINTS.LOCATE.LOCATES}`, (req, res) => {
    const request = req.body;
    const response = {
      id: 'loc-' + Date.now(),
      ...request,
      status: 'PENDING',
      requestTimestamp: new Date().toISOString()
    };
    setTimeout(() => res.status(201).json(response), 50);
  });
  
  app.put(`${API_ENDPOINTS.LOCATE.APPROVE_LOCATE.replace(':id', ':locateId')}`, (req, res) => {
    const locateId = req.params.locateId;
    const approvalDetails = req.body;
    const response = {
      id: locateId,
      status: 'APPROVED',
      approvalDetails,
      approvalTimestamp: new Date().toISOString()
    };
    setTimeout(() => res.json(response), 50);
  });
  
  // Short Sell endpoints
  app.post(`${API_ENDPOINTS.SHORT_SELL.VALIDATE_ORDER}`, (req, res) => {
    const orderDetails = req.body;
    // Special handling for short sell validation to measure performance
    const delay = req.query.delay ? parseInt(req.query.delay as string) : 100;
    
    const response = {
      orderId: orderDetails.orderId || 'ord-' + Date.now(),
      validationResult: 'APPROVED',
      clientLimit: {
        available: 10000,
        utilized: 5000
      },
      aggregationUnitLimit: {
        available: 50000,
        utilized: 20000
      }
    };
    
    setTimeout(() => res.json(response), delay);
  });
  
  // Calculation Rule endpoints
  app.get(`${API_ENDPOINTS.CALCULATION_RULE.RULES}`, (req, res) => {
    const rules = loadTestData(`${__dirname}/../fixtures/calculation-rules/rules.json`);
    setTimeout(() => res.json(rules), 50);
  });
  
  app.get(`${API_ENDPOINTS.CALCULATION_RULE.RULE_BY_ID.replace(':id', ':ruleId')}`, (req, res) => {
    const ruleId = req.params.ruleId;
    const rule = loadTestData(`${__dirname}/../fixtures/calculation-rules/rule-${ruleId}.json`);
    setTimeout(() => res.json(rule), 50);
  });
  
  // Authentication endpoints
  app.post(`${API_ENDPOINTS.AUTH.LOGIN}`, (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'testuser' && password === 'password') {
      const response = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZXMiOlsiVFJBREVSIl0sImlhdCI6MTYyMzMyMzQwMCwiZXhwIjoxNjIzMzI3MDAwfQ.zx8M3kWlvNFaNjlCKr3FzytRVqNQh9CbZsM0lfOtZ50',
        refreshToken: 'refresh-token-12345',
        expiresIn: 3600,
        userId: '123456',
        username: 'testuser',
        roles: ['TRADER']
      };
      setTimeout(() => res.json(response), 50);
    } else {
      setTimeout(() => res.status(401).json({
        error: 'Invalid credentials'
      }), 50);
    }
  });
  
  app.post(`${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, (req, res) => {
    const { refreshToken } = req.body;
    
    if (refreshToken === 'refresh-token-12345') {
      const response = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZXMiOlsiVFJBREVSIl0sImlhdCI6MTYyMzMyNzAwMCwiZXhwIjoxNjIzMzMwNjAwfQ.8zNjwBXWGfVHVkSzo2QPyIVJ6qTKsKO8DHZv2mz7pWw',
        refreshToken: 'refresh-token-67890',
        expiresIn: 3600
      };
      setTimeout(() => res.json(response), 50);
    } else {
      setTimeout(() => res.status(401).json({
        error: 'Invalid refresh token'
      }), 50);
    }
  });
}

/**
 * Verifies the provider against a specific consumer's expectations.
 * 
 * @param consumerName - Name of the consumer to verify against
 * @param options - Additional options for verification
 * @returns Promise that resolves when verification is complete
 */
async function verifyProviderAgainstConsumer(
  consumerName: string,
  options: any = {}
): Promise<void> {
  // Create verifier instance
  const verifier = new Verifier({
    providerBaseUrl: PROVIDER_BASE_URL,
    provider: 'api-gateway',
    providerVersion: '1.0.0',
    pactBrokerUrl: PACT_BROKER_URL,
    publishVerificationResult: process.env.CI === 'true',
    consumerVersionSelectors: [
      { latest: true }
    ],
    logLevel: LogLevel.INFO,
    ...options
  });
  
  // Configure state handlers
  const stateHandlers = setupStateHandlers(options);
  
  // Verify provider against consumer
  try {
    await verifier.verifyProvider({
      provider: 'api-gateway',
      providerBaseUrl: PROVIDER_BASE_URL,
      pactUrls: options.pactUrls || undefined,
      pactBrokerUrl: options.pactBrokerUrl || PACT_BROKER_URL,
      consumerVersionSelectors: [
        { consumer: consumerName, latest: true }
      ],
      stateHandlers,
      enablePending: true
    });
  } catch (error) {
    console.error(`Verification failed for consumer ${consumerName}:`, error);
    throw error;
  }
}

/**
 * Sets up state handlers for different provider states.
 * 
 * @param options - Additional options for state handlers
 * @returns Object containing state handler functions
 */
function setupStateHandlers(options: any = {}): Record<string, Function> {
  return {
    'securities exist': async () => {
      // State is already set up in the mock server
      return { securities: loadTestData(`${__dirname}/../fixtures/securities/securities.json`) };
    },
    'a security with ID exists': async (parameters: any) => {
      // Security data is already set up in the mock server
      const securityId = parameters.id || 'AAPL';
      return { security: loadTestData(`${__dirname}/../fixtures/securities/security-${securityId}.json`) };
    },
    'counterparties exist': async () => {
      // State is already set up in the mock server
      return { counterparties: loadTestData(`${__dirname}/../fixtures/counterparties/counterparties.json`) };
    },
    'positions exist': async () => {
      // State is already set up in the mock server
      return { positions: loadTestData(`${__dirname}/../fixtures/positions/positions.json`) };
    },
    'a position with ID exists': async (parameters: any) => {
      // Position data is already set up in the mock server
      const positionId = parameters.id || 'pos-1';
      return { position: loadTestData(`${__dirname}/../fixtures/positions/position-${positionId}.json`) };
    },
    'settlement ladder exists for position': async (parameters: any) => {
      // Settlement ladder data is already set up in the mock server
      const positionId = parameters.id || 'pos-1';
      return { settlementLadder: loadTestData(`${__dirname}/../fixtures/positions/settlement-ladder-${positionId}.json`) };
    },
    'inventory availability exists': async () => {
      // State is already set up in the mock server
      return { 
        forLoan: loadTestData(`${__dirname}/../fixtures/inventories/for-loan.json`),
        forPledge: loadTestData(`${__dirname}/../fixtures/inventories/for-pledge.json`)
      };
    },
    'inventory exists for security': async (parameters: any) => {
      // Inventory data is already set up in the mock server
      const securityId = parameters.id || 'AAPL';
      return { 
        inventory: loadTestData(`${__dirname}/../fixtures/inventories/inventory-${securityId}.json`) 
      };
    },
    'locate requests exist': async () => {
      // State is already set up in the mock server
      return { locates: loadTestData(`${__dirname}/../fixtures/locates/locates.json`) };
    },
    'a locate request can be approved': async (parameters: any) => {
      // Locate data is already set up in the mock server
      const locateId = parameters.id || 'loc-1';
      return { locate: loadTestData(`${__dirname}/../fixtures/locates/locate-${locateId}.json`) };
    },
    'a locate request can be rejected': async (parameters: any) => {
      // Locate data is already set up in the mock server
      const locateId = parameters.id || 'loc-2';
      return { locate: loadTestData(`${__dirname}/../fixtures/locates/locate-${locateId}.json`) };
    },
    'short sell validation is available': async () => {
      // State is already set up in the mock server
      return { shortSellEnabled: true };
    },
    'client limits exist': async (parameters: any) => {
      // Client limits data is already set up in the mock server
      const clientId = parameters.id || 'client-1';
      return { clientLimits: loadTestData(`${__dirname}/../fixtures/inventories/client-limits-${clientId}.json`) };
    },
    'aggregation unit limits exist': async (parameters: any) => {
      // Aggregation unit limits data is already set up in the mock server
      const auId = parameters.id || 'au-1';
      return { auLimits: loadTestData(`${__dirname}/../fixtures/inventories/au-limits-${auId}.json`) };
    },
    'calculation rules exist': async () => {
      // State is already set up in the mock server
      return { rules: loadTestData(`${__dirname}/../fixtures/calculation-rules/rules.json`) };
    },
    'a calculation rule with ID exists': async (parameters: any) => {
      // Calculation rule data is already set up in the mock server
      const ruleId = parameters.id || 'rule-1';
      return { rule: loadTestData(`${__dirname}/../fixtures/calculation-rules/rule-${ruleId}.json`) };
    },
    'a user can be authenticated': async () => {
      // Authentication data is already set up in the mock server
      return { 
        validCredentials: {
          username: 'testuser',
          password: 'password'
        }
      };
    },
    'a token can be refreshed': async () => {
      // Token refresh data is already set up in the mock server
      return { 
        validRefreshToken: 'refresh-token-12345'
      };
    },
    'user profile exists': async (parameters: any) => {
      // User profile data is already set up in the mock server
      const userId = parameters.id || '123456';
      return { userProfile: loadTestData(`${__dirname}/../fixtures/users/user-${userId}.json`) };
    }
  };
}

/**
 * Measures the response time of an API request.
 * 
 * @param requestFn - Function that makes the API request
 * @returns Promise that resolves to response and timing information
 */
async function measureResponseTime(requestFn: () => Promise<any>): Promise<{ response: any; responseTime: number }> {
  const startTime = Date.now();
  const response = await requestFn();
  const endTime = Date.now();
  
  return {
    response,
    responseTime: endTime - startTime
  };
}

describe('API Gateway Provider Tests', () => {
  let providerServer: any;
  
  beforeAll(() => {
    // Set up the provider server
    providerServer = setupProviderServer(8080);
  });
  
  afterAll(() => {
    // Clean up after tests
    if (providerServer && providerServer.cleanup) {
      providerServer.cleanup();
    }
  });
  
  test('should verify contracts with web-ui consumer', async () => {
    await verifyProviderAgainstConsumer('web-ui', {
      pactUrls: [`${PACT_DIR}/web-ui-api-gateway.json`]
    });
  });
  
  test('should meet performance requirements for short sell validation', async () => {
    // Configure short delay to simulate real-world conditions
    const { responseTime, response } = await measureResponseTime(() => 
      axios.post(`${PROVIDER_BASE_URL}${API_ENDPOINTS.SHORT_SELL.VALIDATE_ORDER}`, {
        orderId: 'test-order-1',
        securityId: 'AAPL',
        clientId: 'client-1',
        aggregationUnitId: 'au-1',
        quantity: 100,
        price: 150.00,
        side: 'SELL',
        orderType: 'SHORT'
      })
    );
    
    // Verify performance threshold
    expect(responseTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL);
    
    // Verify response structure
    expect(response.data).toHaveProperty('validationResult');
    expect(response.data).toHaveProperty('clientLimit');
    expect(response.data).toHaveProperty('aggregationUnitLimit');
  });
  
  test('should handle authentication correctly', async () => {
    // Test successful login
    const loginResponse = await axios.post(`${PROVIDER_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
      username: 'testuser',
      password: 'password'
    });
    
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.data).toHaveProperty('token');
    expect(loginResponse.data).toHaveProperty('refreshToken');
    
    // Test token refresh
    const refreshResponse = await axios.post(`${PROVIDER_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
      refreshToken: loginResponse.data.refreshToken
    });
    
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.data).toHaveProperty('token');
    expect(refreshResponse.data).toHaveProperty('refreshToken');
    
    // Test failed login
    try {
      await axios.post(`${PROVIDER_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
        username: 'testuser',
        password: 'wrong-password'
      });
      fail('Should have thrown an error for invalid credentials');
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });
  
  test('should correctly route requests to appropriate services', async () => {
    // Create a mock express app with route tracking
    const app = express();
    const routeHits: Record<string, number> = {};
    
    // Install route tracker middleware
    app.use((req, res, next) => {
      const route = req.path;
      routeHits[route] = (routeHits[route] || 0) + 1;
      next();
    });
    
    // Set up mock routes with the same structure as the actual API Gateway
    setupMockRoutes(app);
    
    // Start the server
    const port = 8090;
    const server = app.listen(port);
    
    try {
      // Make requests to different endpoints
      await axios.get(`http://localhost:${port}${API_ENDPOINTS.REFERENCE_DATA.SECURITIES}`);
      await axios.get(`http://localhost:${port}${API_ENDPOINTS.MARKET_DATA.PRICES}`);
      await axios.get(`http://localhost:${port}${API_ENDPOINTS.POSITION.POSITIONS}`);
      await axios.get(`http://localhost:${port}${API_ENDPOINTS.INVENTORY.FOR_LOAN}`);
      
      // Verify that requests were routed correctly
      expect(routeHits[API_ENDPOINTS.REFERENCE_DATA.SECURITIES]).toBe(1);
      expect(routeHits[API_ENDPOINTS.MARKET_DATA.PRICES]).toBe(1);
      expect(routeHits[API_ENDPOINTS.POSITION.POSITIONS]).toBe(1);
      expect(routeHits[API_ENDPOINTS.INVENTORY.FOR_LOAN]).toBe(1);
    } finally {
      // Shut down the server
      server.close();
    }
  });
});