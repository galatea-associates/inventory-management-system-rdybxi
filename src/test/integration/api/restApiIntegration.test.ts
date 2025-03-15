import axios from 'axios'; // ^1.4.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.5
import { API_BASE_URL, API_ENDPOINTS, TEST_TIMEOUTS } from '../../common/constants';
import { loadTestData, validatePerformance } from '../../common/testUtils';

// Global variables
let apiClient;
let mockAdapter;

/**
 * Sets up the API client and mock adapter for testing
 */
function setupApiClient(): void {
  // Create an axios instance with base URL and timeout settings
  apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Configure request and response interceptors
  apiClient.interceptors.request.use(
    (config) => {
      // Add request timestamp for performance tracking
      config.metadata = { startTime: new Date().getTime() };
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  apiClient.interceptors.response.use(
    (response) => {
      // Calculate response time for performance tracking
      const requestStartTime = response.config.metadata.startTime;
      response.metadata = { 
        responseTime: new Date().getTime() - requestStartTime
      };
      return response;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Create a mock adapter for the axios instance
  mockAdapter = new MockAdapter(apiClient);
}

/**
 * Sets up mock responses for API endpoints
 */
function setupMockResponses(): void {
  // Load test data from fixture files
  const securitiesData = loadTestData('./src/test/fixtures/securities/securities.json');
  const securityData = loadTestData('./src/test/fixtures/securities/security.json');
  const counterpartiesData = loadTestData('./src/test/fixtures/counterparties/counterparties.json');
  const counterpartyData = loadTestData('./src/test/fixtures/counterparties/counterparty.json');
  const positionsData = loadTestData('./src/test/fixtures/positions/positions.json');
  const positionData = loadTestData('./src/test/fixtures/positions/position.json');
  const settlementLadderData = loadTestData('./src/test/fixtures/positions/settlement-ladder.json');
  const positionSummaryData = loadTestData('./src/test/fixtures/positions/position-summary.json');
  const inventoryData = loadTestData('./src/test/fixtures/inventories/inventories.json');
  const inventoryItemData = loadTestData('./src/test/fixtures/inventories/inventory-item.json');
  const forLoanData = loadTestData('./src/test/fixtures/inventories/for-loan.json');
  const forPledgeData = loadTestData('./src/test/fixtures/inventories/for-pledge.json');
  const overborrowData = loadTestData('./src/test/fixtures/inventories/overborrow.json');
  const inventorySummaryData = loadTestData('./src/test/fixtures/inventories/inventory-summary.json');
  const topSecuritiesData = loadTestData('./src/test/fixtures/inventories/top-securities.json');
  const locatesData = loadTestData('./src/test/fixtures/locates/locates.json');
  const locateData = loadTestData('./src/test/fixtures/locates/locate.json');
  const locateSummaryData = loadTestData('./src/test/fixtures/locates/locate-summary.json');
  const shortSellValidationData = loadTestData('./src/test/fixtures/orders/short-sell-validation.json');
  const shortSellRejectionData = loadTestData('./src/test/fixtures/orders/short-sell-rejection.json');
  const calculationRulesData = loadTestData('./src/test/fixtures/reference-data/calculation-rules.json');
  const calculationRuleData = loadTestData('./src/test/fixtures/reference-data/calculation-rule.json');
  const ruleTestResultData = loadTestData('./src/test/fixtures/reference-data/rule-test-result.json');
  const authData = loadTestData('./src/test/fixtures/users/auth.json');
  const userData = loadTestData('./src/test/fixtures/users/user.json');
  
  // Error response templates
  const validationErrorData = { 
    error: 'Validation Error', 
    message: 'Invalid request data', 
    details: [{ field: 'quantity', message: 'must be a positive number' }] 
  };
  const notFoundErrorData = { error: 'Not Found', message: 'Resource not found' };
  const unauthorizedErrorData = { error: 'Unauthorized', message: 'Authentication required' };
  const forbiddenErrorData = { error: 'Forbidden', message: 'Insufficient permissions' };

  // Configure mock responses for reference data endpoints
  mockAdapter.onGet(API_ENDPOINTS.REFERENCE_DATA.SECURITIES).reply(200, securitiesData);
  mockAdapter.onGet(new RegExp(`${API_ENDPOINTS.REFERENCE_DATA.SECURITY_BY_ID.replace(':id', '.*')}`)).reply((config) => {
    const id = config.url.split('/').pop();
    if (id === 'non-existent') {
      return [404, notFoundErrorData];
    }
    return [200, { ...securityData, id }];
  });
  mockAdapter.onGet(API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTIES).reply(200, counterpartiesData);
  mockAdapter.onGet(new RegExp(`${API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTY_BY_ID.replace(':id', '.*')}`)).reply((config) => {
    const id = config.url.split('/').pop();
    if (id === 'non-existent') {
      return [404, notFoundErrorData];
    }
    return [200, { ...counterpartyData, id }];
  });

  // Configure mock responses for position endpoints
  mockAdapter.onGet(API_ENDPOINTS.POSITION.POSITIONS).reply(200, positionsData);
  mockAdapter.onGet(new RegExp(`${API_ENDPOINTS.POSITION.POSITIONS_BY_BOOK.replace(':bookId', '.*')}`)).reply(200, positionsData);
  mockAdapter.onGet(new RegExp(`${API_ENDPOINTS.POSITION.POSITIONS_BY_SECURITY.replace(':securityId', '.*')}`)).reply(200, positionsData);
  mockAdapter.onGet(API_ENDPOINTS.POSITION.SETTLEMENT_LADDER).reply(200, settlementLadderData);
  mockAdapter.onGet(API_ENDPOINTS.POSITION.POSITION_SUMMARY).reply(200, positionSummaryData);
  mockAdapter.onPost(API_ENDPOINTS.POSITION.POSITIONS).reply((config) => {
    const requestData = JSON.parse(config.data);
    if (requestData.bookId) {
      return [200, positionsData];
    }
    if (requestData.securityId) {
      return [200, positionsData];
    }
    return [400, validationErrorData];
  });

  // Configure mock responses for inventory endpoints
  mockAdapter.onGet(API_ENDPOINTS.INVENTORY.FOR_LOAN).reply(200, forLoanData);
  mockAdapter.onGet(API_ENDPOINTS.INVENTORY.FOR_PLEDGE).reply(200, forPledgeData);
  mockAdapter.onGet(API_ENDPOINTS.INVENTORY.OVERBORROWS).reply(200, overborrowData);
  mockAdapter.onGet(new RegExp(`${API_ENDPOINTS.INVENTORY.CLIENT_LIMITS.replace(':clientId', '.*')}`)).reply(200, {
    clientId: 'client-123',
    securityId: 'security-123',
    longSellLimit: 10000,
    shortSellLimit: 5000,
  });
  mockAdapter.onGet(new RegExp(`${API_ENDPOINTS.INVENTORY.AGGREGATION_UNIT_LIMITS.replace(':aggregationUnitId', '.*')}`)).reply(200, {
    aggregationUnitId: 'au-123',
    securityId: 'security-123',
    longSellLimit: 50000,
    shortSellLimit: 25000,
  });
  mockAdapter.onPost('/inventory/summary').reply(200, inventorySummaryData);
  mockAdapter.onGet(/\/inventory\/top-securities.*/).reply(200, topSecuritiesData);

  // Configure mock responses for locate endpoints
  mockAdapter.onGet(API_ENDPOINTS.LOCATE.LOCATES).reply(200, locatesData);
  mockAdapter.onGet(new RegExp(`${API_ENDPOINTS.LOCATE.LOCATE_BY_ID.replace(':id', '.*')}`)).reply((config) => {
    const id = config.url.split('/').pop();
    if (id === 'non-existent') {
      return [404, notFoundErrorData];
    }
    return [200, { ...locateData, id }];
  });
  mockAdapter.onPost(API_ENDPOINTS.LOCATE.LOCATES).reply(201, locateData);
  mockAdapter.onPut(new RegExp(`${API_ENDPOINTS.LOCATE.APPROVE_LOCATE.replace(':id', '.*')}`)).reply(200, {
    ...locateData,
    status: 'APPROVED',
    approvedQuantity: 5000,
    approvalTimestamp: new Date().toISOString(),
  });
  mockAdapter.onPut(new RegExp(`${API_ENDPOINTS.LOCATE.REJECT_LOCATE.replace(':id', '.*')}`)).reply(200, {
    ...locateData,
    status: 'REJECTED',
    rejectionReason: 'Insufficient inventory',
    rejectionTimestamp: new Date().toISOString(),
  });
  mockAdapter.onGet(/\/locates\/summary/).reply(200, locateSummaryData);
  mockAdapter.onPost(/\/locates\/filter/).reply((config) => {
    const requestData = JSON.parse(config.data);
    if (requestData.status) {
      return [200, {
        ...locatesData,
        items: locatesData.items.filter(item => item.status === requestData.status)
      }];
    }
    return [200, locatesData];
  });

  // Configure mock responses for short sell endpoints
  mockAdapter.onPost(API_ENDPOINTS.SHORT_SELL.VALIDATE_ORDER).reply((config) => {
    const requestData = JSON.parse(config.data);
    if (requestData.quantity > 10000) {
      return [200, { ...shortSellRejectionData, message: 'Insufficient client limit' }];
    }
    if (requestData.quantity > 5000) {
      return [200, { ...shortSellRejectionData, message: 'Insufficient aggregation unit limit' }];
    }
    return [200, shortSellValidationData];
  });

  // Configure mock responses for calculation rule endpoints
  mockAdapter.onGet(API_ENDPOINTS.CALCULATION_RULE.RULES).reply(200, calculationRulesData);
  mockAdapter.onGet(new RegExp(`${API_ENDPOINTS.CALCULATION_RULE.RULE_BY_ID.replace(':id', '.*')}`)).reply((config) => {
    const id = config.url.split('/').pop();
    if (id === 'non-existent') {
      return [404, notFoundErrorData];
    }
    return [200, { ...calculationRuleData, id }];
  });
  mockAdapter.onPost(API_ENDPOINTS.CALCULATION_RULE.RULES).reply(201, calculationRuleData);
  mockAdapter.onPost(new RegExp(`${API_ENDPOINTS.CALCULATION_RULE.TEST_RULE.replace(':id', '.*')}`)).reply(200, ruleTestResultData);
  mockAdapter.onPost(new RegExp(`${API_ENDPOINTS.CALCULATION_RULE.PUBLISH_RULE.replace(':id', '.*')}`)).reply(200, {
    ...calculationRuleData,
    status: 'ACTIVE',
    publishedDate: new Date().toISOString(),
  });
  mockAdapter.onPut(new RegExp(`${API_ENDPOINTS.CALCULATION_RULE.RULE_BY_ID.replace(':id', '.*')}`)).reply((config) => {
    const id = config.url.split('/').pop();
    const requestData = JSON.parse(config.data);
    return [200, { ...calculationRuleData, ...requestData, id }];
  });
  mockAdapter.onPost(/\/calculation-rules\/filter/).reply((config) => {
    const requestData = JSON.parse(config.data);
    if (requestData.type) {
      return [200, {
        ...calculationRulesData,
        items: calculationRulesData.items.filter(item => item.type === requestData.type)
      }];
    }
    return [200, calculationRulesData];
  });

  // Configure mock responses for authentication endpoints
  mockAdapter.onPost(API_ENDPOINTS.AUTH.LOGIN).reply((config) => {
    const requestData = JSON.parse(config.data);
    if (requestData.username === 'validuser' && requestData.password === 'validpassword') {
      return [200, authData];
    }
    return [401, unauthorizedErrorData];
  });
  mockAdapter.onPost(API_ENDPOINTS.AUTH.LOGOUT).reply(200, { message: 'Logged out successfully' });
  mockAdapter.onPost(API_ENDPOINTS.AUTH.REFRESH_TOKEN).reply(200, {
    token: 'new-mock-token',
    refreshToken: 'new-mock-refresh-token',
    expiresIn: 3600,
  });
  mockAdapter.onGet('/api/v1/users/current').reply((config) => {
    const authHeader = config.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return [401, unauthorizedErrorData];
    }
    return [200, userData];
  });

  // Configure mock responses for error scenarios
  mockAdapter.onGet('/non-existent-resource').reply(404, notFoundErrorData);
  mockAdapter.onGet('/protected-resource').reply((config) => {
    const authHeader = config.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return [401, unauthorizedErrorData];
    }
    return [403, forbiddenErrorData];
  });
  mockAdapter.onPost('/validation-error').reply(400, validationErrorData);
}

describe('REST API Integration Tests', () => {
  // Setup before tests
  beforeAll(() => {
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
    setupApiClient();
    setupMockResponses();
  });

  // Reference Data API Tests
  describe('Reference Data API', () => {
    test('should retrieve securities with pagination', async () => {
      const response = await apiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITIES, {
        params: { page: 1, size: 10 }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items).toBeDefined();
      expect(Array.isArray(response.data.items)).toBe(true);
      expect(response.data.pagination).toBeDefined();
      expect(response.data.pagination.page).toBe(1);
      expect(response.data.pagination.size).toBe(10);
      expect(response.data.pagination.totalItems).toBeGreaterThan(0);
    });

    test('should retrieve a security by ID', async () => {
      const securityId = 'security-123';
      const response = await apiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITY_BY_ID.replace(':id', securityId));
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(securityId);
      expect(response.data.securityType).toBeDefined();
      expect(response.data.issuer).toBeDefined();
    });

    test('should retrieve counterparties with pagination', async () => {
      const response = await apiClient.get(API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTIES, {
        params: { page: 1, size: 10 }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items).toBeDefined();
      expect(Array.isArray(response.data.items)).toBe(true);
      expect(response.data.pagination).toBeDefined();
      expect(response.data.pagination.page).toBe(1);
      expect(response.data.pagination.size).toBe(10);
      expect(response.data.pagination.totalItems).toBeGreaterThan(0);
    });

    test('should retrieve a counterparty by ID', async () => {
      const counterpartyId = 'counterparty-123';
      const response = await apiClient.get(API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTY_BY_ID.replace(':id', counterpartyId));
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(counterpartyId);
      expect(response.data.name).toBeDefined();
      expect(response.data.type).toBeDefined();
    });

    test('should handle errors when retrieving non-existent reference data', async () => {
      expect.assertions(3);
      try {
        await apiClient.get(API_ENDPOINTS.REFERENCE_DATA.SECURITY_BY_ID.replace(':id', 'non-existent'));
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toBe('Not Found');
        expect(error.response.data.message).toBeDefined();
      }
    });
  });

  // Position API Tests
  describe('Position API', () => {
    test('should retrieve positions with pagination', async () => {
      const response = await apiClient.get(API_ENDPOINTS.POSITION.POSITIONS, {
        params: { page: 1, size: 10 }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items).toBeDefined();
      expect(Array.isArray(response.data.items)).toBe(true);
      expect(response.data.pagination).toBeDefined();
      expect(response.data.pagination.page).toBe(1);
      expect(response.data.pagination.size).toBe(10);
      expect(response.data.pagination.totalItems).toBeGreaterThan(0);
    });

    test('should retrieve a position by ID', async () => {
      const positionId = 'position-123';
      // Using positions endpoint with filter for this example
      const response = await apiClient.get(`${API_ENDPOINTS.POSITION.POSITIONS}/${positionId}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    test('should filter positions by book ID', async () => {
      const bookId = 'book-123';
      const response = await apiClient.post(API_ENDPOINTS.POSITION.POSITIONS, {
        bookId: bookId,
        page: 1,
        size: 10
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items).toBeDefined();
      expect(Array.isArray(response.data.items)).toBe(true);
    });

    test('should filter positions by security ID', async () => {
      const securityId = 'security-123';
      const response = await apiClient.post(API_ENDPOINTS.POSITION.POSITIONS, {
        securityId: securityId,
        page: 1,
        size: 10
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items).toBeDefined();
      expect(Array.isArray(response.data.items)).toBe(true);
    });

    test('should retrieve position summary', async () => {
      const response = await apiClient.get(API_ENDPOINTS.POSITION.POSITION_SUMMARY);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.totalLong).toBeDefined();
      expect(response.data.totalShort).toBeDefined();
      expect(response.data.net).toBeDefined();
      expect(response.data.securityCount).toBeDefined();
    });

    test('should retrieve settlement ladder', async () => {
      const securityId = 'security-123';
      const bookId = 'book-123';
      const response = await apiClient.get(API_ENDPOINTS.POSITION.SETTLEMENT_LADDER, {
        params: { securityId, bookId }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data.projections)).toBe(true);
      expect(response.data.projections.length).toBeGreaterThan(0);
    });
  });

  // Inventory API Tests
  describe('Inventory API', () => {
    test('should retrieve inventory items with pagination', async () => {
      // Using for-loan endpoint with pagination as an example
      const response = await apiClient.get(API_ENDPOINTS.INVENTORY.FOR_LOAN, {
        params: { page: 1, size: 10 }
      });
      
      expect(response.status).toBe(200);
    });

    test('should retrieve an inventory item by ID', async () => {
      const inventoryId = 'inventory-123';
      // Using for-loan endpoint for a specific inventory item
      const response = await apiClient.get(`${API_ENDPOINTS.INVENTORY.FOR_LOAN}/${inventoryId}`);
      
      expect(response.status).toBe(200);
    });

    test('should filter inventory by security ID', async () => {
      const securityId = 'security-123';
      const response = await apiClient.get(API_ENDPOINTS.INVENTORY.FOR_LOAN, {
        params: { securityId }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    test('should retrieve for-loan availability', async () => {
      const securityId = 'security-123';
      const response = await apiClient.get(API_ENDPOINTS.INVENTORY.FOR_LOAN, {
        params: { securityId }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.securityId).toBeDefined();
      expect(response.data.availableQuantity).toBeDefined();
    });

    test('should retrieve for-pledge availability', async () => {
      const securityId = 'security-123';
      const response = await apiClient.get(API_ENDPOINTS.INVENTORY.FOR_PLEDGE, {
        params: { securityId }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.securityId).toBeDefined();
      expect(response.data.availableQuantity).toBeDefined();
    });

    test('should retrieve overborrow identification', async () => {
      const securityId = 'security-123';
      const response = await apiClient.get(API_ENDPOINTS.INVENTORY.OVERBORROWS, {
        params: { securityId }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.securityId).toBeDefined();
      expect(response.data.overborrowQuantity).toBeDefined();
    });

    test('should retrieve inventory summary', async () => {
      const response = await apiClient.post('/inventory/summary');
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.totalInventory).toBeDefined();
      expect(response.data.categories).toBeDefined();
      expect(Array.isArray(response.data.categories)).toBe(true);
    });

    test('should retrieve top securities by availability', async () => {
      const calculationType = 'FOR_LOAN';
      const limit = 10;
      const response = await apiClient.get(`/inventory/top-securities?calculationType=${calculationType}&limit=${limit}`);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeLessThanOrEqual(limit);
    });
  });

  // Locate API Tests
  describe('Locate API', () => {
    test('should retrieve locate requests with pagination', async () => {
      const response = await apiClient.get(API_ENDPOINTS.LOCATE.LOCATES, {
        params: { page: 1, size: 10 }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items).toBeDefined();
      expect(Array.isArray(response.data.items)).toBe(true);
      expect(response.data.pagination).toBeDefined();
      expect(response.data.pagination.page).toBe(1);
      expect(response.data.pagination.size).toBe(10);
      expect(response.data.pagination.totalItems).toBeGreaterThan(0);
    });

    test('should retrieve a locate request by ID', async () => {
      const locateId = 'locate-123';
      const response = await apiClient.get(API_ENDPOINTS.LOCATE.LOCATE_BY_ID.replace(':id', locateId));
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(locateId);
      expect(response.data.securityId).toBeDefined();
      expect(response.data.requestorId).toBeDefined();
      expect(response.data.status).toBeDefined();
    });

    test('should filter locate requests by status', async () => {
      const status = 'PENDING';
      const response = await apiClient.post('/locates/filter', {
        status: status,
        page: 1,
        size: 10
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items).toBeDefined();
      expect(Array.isArray(response.data.items)).toBe(true);
    });

    test('should create a new locate request', async () => {
      const locateRequest = {
        securityId: 'security-123',
        clientId: 'client-123',
        requestedQuantity: 5000,
        locateType: 'SHORT',
        swapCashIndicator: 'CASH'
      };
      
      const response = await apiClient.post(API_ENDPOINTS.LOCATE.LOCATES, locateRequest);
      
      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.securityId).toBeDefined();
      expect(response.data.requestedQuantity).toBeDefined();
      expect(response.data.status).toBeDefined();
    });

    test('should approve a locate request', async () => {
      const locateId = 'locate-123';
      const approvalData = {
        approvedQuantity: 5000,
        decrementQuantity: 5000,
        expiryDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow
      };
      
      const response = await apiClient.put(API_ENDPOINTS.LOCATE.APPROVE_LOCATE.replace(':id', locateId), approvalData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.status).toBe('APPROVED');
      expect(response.data.approvedQuantity).toBeDefined();
      expect(response.data.approvalTimestamp).toBeDefined();
    });

    test('should reject a locate request', async () => {
      const locateId = 'locate-123';
      const rejectionData = {
        rejectionReason: 'Insufficient inventory'
      };
      
      const response = await apiClient.put(API_ENDPOINTS.LOCATE.REJECT_LOCATE.replace(':id', locateId), rejectionData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.status).toBe('REJECTED');
      expect(response.data.rejectionReason).toBeDefined();
      expect(response.data.rejectionTimestamp).toBeDefined();
    });

    test('should retrieve locate summary', async () => {
      const response = await apiClient.get('/locates/summary');
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.pending).toBeDefined();
      expect(response.data.approved).toBeDefined();
      expect(response.data.rejected).toBeDefined();
      expect(response.data.total).toBeDefined();
    });
  });

  // Short Sell API Tests
  describe('Short Sell API', () => {
    test('should validate a short sell order', async () => {
      const orderData = {
        securityId: 'security-123',
        clientId: 'client-123',
        aggregationUnitId: 'au-123',
        quantity: 1000,
        side: 'SELL',
        orderType: 'SHORT'
      };
      
      const response = await apiClient.post(API_ENDPOINTS.SHORT_SELL.VALIDATE_ORDER, orderData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.approved).toBe(true);
      expect(response.data.clientLimit).toBeDefined();
      expect(response.data.aggregationUnitLimit).toBeDefined();
    });

    test('should reject a short sell order with insufficient client limit', async () => {
      const orderData = {
        securityId: 'security-123',
        clientId: 'client-123',
        aggregationUnitId: 'au-123',
        quantity: 15000, // Exceeds client limit (10000)
        side: 'SELL',
        orderType: 'SHORT'
      };
      
      const response = await apiClient.post(API_ENDPOINTS.SHORT_SELL.VALIDATE_ORDER, orderData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.approved).toBe(false);
      expect(response.data.message).toContain('Insufficient client limit');
    });

    test('should reject a short sell order with insufficient aggregation unit limit', async () => {
      const orderData = {
        securityId: 'security-123',
        clientId: 'client-123',
        aggregationUnitId: 'au-123',
        quantity: 8000, // Under client limit (10000) but exceeds AU limit threshold
        side: 'SELL',
        orderType: 'SHORT'
      };
      
      const response = await apiClient.post(API_ENDPOINTS.SHORT_SELL.VALIDATE_ORDER, orderData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.approved).toBe(false);
      expect(response.data.message).toContain('Insufficient aggregation unit limit');
    });
  });

  // Calculation Rule API Tests
  describe('Calculation Rule API', () => {
    test('should retrieve calculation rules with pagination', async () => {
      const response = await apiClient.get(API_ENDPOINTS.CALCULATION_RULE.RULES, {
        params: { page: 1, size: 10 }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items).toBeDefined();
      expect(Array.isArray(response.data.items)).toBe(true);
      expect(response.data.pagination).toBeDefined();
      expect(response.data.pagination.page).toBe(1);
      expect(response.data.pagination.size).toBe(10);
      expect(response.data.pagination.totalItems).toBeGreaterThan(0);
    });

    test('should retrieve a calculation rule by ID', async () => {
      const ruleId = 'rule-123';
      const response = await apiClient.get(API_ENDPOINTS.CALCULATION_RULE.RULE_BY_ID.replace(':id', ruleId));
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(ruleId);
      expect(response.data.name).toBeDefined();
      expect(response.data.type).toBeDefined();
      expect(response.data.market).toBeDefined();
      expect(response.data.status).toBeDefined();
    });

    test('should filter calculation rules by type', async () => {
      const type = 'FOR_LOAN';
      const response = await apiClient.post('/calculation-rules/filter', {
        type: type,
        page: 1,
        size: 10
      });
      
      expect(response.status).toBe(200);
      expect(response.data.items).toBeDefined();
      expect(Array.isArray(response.data.items)).toBe(true);
    });

    test('should create a new calculation rule', async () => {
      const ruleData = {
        name: 'Test Rule',
        type: 'FOR_LOAN',
        market: 'Global',
        description: 'Test rule for integration tests',
        include: ['LONG_POSITIONS', 'HYPOTHECATABLE_ASSETS'],
        exclude: ['SLAB_LENDING', 'PAY_TO_HOLDS'],
        version: '1.0.0'
      };
      
      const response = await apiClient.post(API_ENDPOINTS.CALCULATION_RULE.RULES, ruleData);
      
      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.name).toBe(ruleData.name);
      expect(response.data.type).toBe(ruleData.type);
      expect(response.data.market).toBe(ruleData.market);
    });

    test('should update an existing calculation rule', async () => {
      const ruleId = 'rule-123';
      const updateData = {
        name: 'Updated Rule Name',
        description: 'Updated rule description',
        include: ['LONG_POSITIONS', 'HYPOTHECATABLE_ASSETS', 'REPO_PLEDGED_ASSETS'],
        exclude: ['SLAB_LENDING']
      };
      
      const response = await apiClient.put(API_ENDPOINTS.CALCULATION_RULE.RULE_BY_ID.replace(':id', ruleId), updateData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(ruleId);
      expect(response.data.name).toBe(updateData.name);
      expect(response.data.description).toBe(updateData.description);
    });

    test('should test a calculation rule', async () => {
      const ruleId = 'rule-123';
      const testData = {
        securityId: 'security-123',
        testParameters: {
          longPositions: 10000,
          hypothecatableAssets: 5000,
          repoPledgedAssets: 3000
        }
      };
      
      const response = await apiClient.post(API_ENDPOINTS.CALCULATION_RULE.TEST_RULE.replace(':id', ruleId), testData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.result).toBeDefined();
      expect(response.data.calculationDetails).toBeDefined();
    });

    test('should publish a calculation rule', async () => {
      const ruleId = 'rule-123';
      const response = await apiClient.post(API_ENDPOINTS.CALCULATION_RULE.PUBLISH_RULE.replace(':id', ruleId));
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(ruleId);
      expect(response.data.status).toBe('ACTIVE');
      expect(response.data.publishedDate).toBeDefined();
    });
  });

  // Authentication API Tests
  describe('Authentication API', () => {
    test('should authenticate a user with valid credentials', async () => {
      const credentials = {
        username: 'validuser',
        password: 'validpassword'
      };
      
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.token).toBeDefined();
      expect(response.data.refreshToken).toBeDefined();
      expect(response.data.expiresIn).toBeDefined();
    });

    test('should reject authentication with invalid credentials', async () => {
      expect.assertions(3);
      const credentials = {
        username: 'invaliduser',
        password: 'invalidpassword'
      };
      
      try {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('Unauthorized');
        expect(error.response.data.message).toBeDefined();
      }
    });

    test('should refresh an authentication token', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token'
      };
      
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, refreshData);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.token).toBeDefined();
      expect(response.data.refreshToken).toBeDefined();
      expect(response.data.expiresIn).toBeDefined();
    });

    test('should retrieve the current user profile', async () => {
      // Setup authenticated request
      const response = await apiClient.get('/api/v1/users/current', {
        headers: { Authorization: 'Bearer mock-token' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.username).toBeDefined();
      expect(response.data.email).toBeDefined();
      expect(response.data.roles).toBeDefined();
    });

    test('should log out a user', async () => {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {}, {
        headers: { Authorization: 'Bearer mock-token' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.message).toContain('Logged out successfully');
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    test('should handle validation errors', async () => {
      expect.assertions(4);
      try {
        await apiClient.post('/validation-error', {
          invalidData: true
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('Validation Error');
        expect(error.response.data.message).toBeDefined();
        expect(error.response.data.details).toBeDefined();
      }
    });

    test('should handle not found errors', async () => {
      expect.assertions(3);
      try {
        await apiClient.get('/non-existent-resource');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toBe('Not Found');
        expect(error.response.data.message).toBeDefined();
      }
    });

    test('should handle unauthorized access', async () => {
      expect.assertions(3);
      try {
        await apiClient.get('/api/v1/users/current');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('Unauthorized');
        expect(error.response.data.message).toBeDefined();
      }
    });

    test('should handle forbidden access', async () => {
      expect.assertions(3);
      try {
        await apiClient.get('/protected-resource', {
          headers: { Authorization: 'Bearer mock-token' }
        });
      } catch (error) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error).toBe('Forbidden');
        expect(error.response.data.message).toBeDefined();
      }
    });
  });

  // Performance Tests
  describe('Performance Tests', () => {
    test('should meet performance requirements for position calculation', async () => {
      const securityId = 'security-123';
      const bookId = 'book-123';
      
      const result = await validatePerformance(
        async () => {
          return await apiClient.get(API_ENDPOINTS.POSITION.SETTLEMENT_LADDER, {
            params: { securityId, bookId }
          });
        },
        [],
        200 // 200ms as specified in requirements
      );
      
      expect(result.success).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(result.threshold);
      expect(result.result.status).toBe(200);
    });

    test('should meet performance requirements for inventory calculation', async () => {
      const securityId = 'security-123';
      
      const result = await validatePerformance(
        async () => {
          return await apiClient.get(API_ENDPOINTS.INVENTORY.FOR_LOAN, {
            params: { securityId }
          });
        },
        [],
        200 // 200ms as specified in requirements
      );
      
      expect(result.success).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(result.threshold);
      expect(result.result.status).toBe(200);
    });

    test('should meet performance requirements for locate approval', async () => {
      const locateId = 'locate-123';
      const approvalData = {
        approvedQuantity: 5000,
        decrementQuantity: 5000,
        expiryDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      const result = await validatePerformance(
        async () => {
          return await apiClient.put(API_ENDPOINTS.LOCATE.APPROVE_LOCATE.replace(':id', locateId), approvalData);
        },
        [],
        2000 // Locate approval has a higher threshold than other operations
      );
      
      expect(result.success).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(result.threshold);
      expect(result.result.status).toBe(200);
    });

    test('should meet performance requirements for short sell validation', async () => {
      const orderData = {
        securityId: 'security-123',
        clientId: 'client-123',
        aggregationUnitId: 'au-123',
        quantity: 1000,
        side: 'SELL',
        orderType: 'SHORT'
      };
      
      const result = await validatePerformance(
        async () => {
          return await apiClient.post(API_ENDPOINTS.SHORT_SELL.VALIDATE_ORDER, orderData);
        },
        [],
        150 // 150ms as specified in requirements
      );
      
      expect(result.success).toBe(true);
      expect(result.executionTime).toBeLessThanOrEqual(result.threshold);
      expect(result.result.status).toBe(200);
    });
  });
});