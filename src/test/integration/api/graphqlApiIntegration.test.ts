import axios from 'axios'; // v1.4.0
import MockAdapter from 'axios-mock-adapter'; // v1.21.5
import { print } from 'graphql'; // v16.6.0
import { gql } from 'graphql-tag'; // v2.12.6
import { API_BASE_URL, API_ENDPOINTS, TEST_TIMEOUTS } from '../../common/constants';
import { loadTestData, validatePerformance } from '../../common/testUtils';

// Global variables
let apiClient: any;
let mockAdapter: any;
const GRAPHQL_ENDPOINT = '/api/v1/graphql';

/**
 * Sets up the API client and mock adapter for testing
 */
function setupApiClient() {
  apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: TEST_TIMEOUTS.INTEGRATION,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  });

  // Add request interceptor for debugging
  apiClient.interceptors.request.use(
    (config) => {
      // Log request for debugging if needed
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor for debugging
  apiClient.interceptors.response.use(
    (response) => {
      // Log response for debugging if needed
      return response;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Create mock adapter for the axios instance
  mockAdapter = new MockAdapter(apiClient);
}

/**
 * Sets up mock responses for GraphQL API queries and mutations
 */
function setupMockResponses() {
  // Load test data from fixture files
  const positionsTestData = loadTestData('./src/test/fixtures/positions/positions.json');
  const inventoryTestData = loadTestData('./src/test/fixtures/inventories/inventory-availability.json');
  const forLoanTestData = loadTestData('./src/test/fixtures/inventories/for-loan-availability.json');
  const forPledgeTestData = loadTestData('./src/test/fixtures/inventories/for-pledge-availability.json');
  const locatesTestData = loadTestData('./src/test/fixtures/locates/locate-requests.json');
  const securitiesTestData = loadTestData('./src/test/fixtures/securities/securities.json');
  const counterpartiesTestData = loadTestData('./src/test/fixtures/counterparties/counterparties.json');
  const settlementLadderTestData = loadTestData('./src/test/fixtures/positions/settlement-ladder.json');
  const positionSummaryTestData = loadTestData('./src/test/fixtures/positions/position-summary.json');
  const inventorySummaryTestData = loadTestData('./src/test/fixtures/inventories/inventory-summary.json');
  const locateSummaryTestData = loadTestData('./src/test/fixtures/locates/locate-summary.json');
  const topSecuritiesTestData = loadTestData('./src/test/fixtures/inventories/top-securities.json');

  // Configure mock responses for GraphQL requests
  mockAdapter.onPost(GRAPHQL_ENDPOINT).reply((config) => {
    const request = JSON.parse(config.data);
    const { query, variables } = request;
    
    // Handle specific error test cases
    if (query.includes('validation_error_test')) {
      return [200, {
        errors: [{
          message: 'Validation failed for field: quantity',
          extensions: {
            code: 'VALIDATION_ERROR',
            field: 'quantity',
            value: variables.quantity
          }
        }]
      }];
    } else if (query.includes('not_found_test')) {
      return [200, {
        errors: [{
          message: `Entity not found: ${variables.id}`,
          extensions: {
            code: 'NOT_FOUND',
            entityType: 'Security',
            entityId: variables.id
          }
        }]
      }];
    } else if (query.includes('unauthorized_test')) {
      return [200, {
        errors: [{
          message: 'Unauthorized access',
          extensions: {
            code: 'UNAUTHORIZED'
          }
        }]
      }];
    } else if (query.includes('forbidden_test')) {
      return [200, {
        errors: [{
          message: 'Forbidden: Insufficient permissions',
          extensions: {
            code: 'FORBIDDEN',
            requiredPermission: 'APPROVE_LOCATE'
          }
        }]
      }];
    }
    
    // Determine response based on query content
    if (query.includes('positions(filter:')) {
      return [200, { data: { positions: positionsTestData } }];
    } else if (query.includes('position(id:')) {
      const positionId = variables?.id || '';
      const position = positionsTestData.find((p: any) => p.id === positionId) || null;
      return [200, { data: { position } }];
    } else if (query.includes('positionSummary')) {
      return [200, { data: { positionSummary: positionSummaryTestData } }];
    } else if (query.includes('settlementLadder')) {
      return [200, { data: { settlementLadder: settlementLadderTestData } }];
    } else if (query.includes('inventoryAvailability')) {
      return [200, { data: { inventoryAvailability: inventoryTestData } }];
    } else if (query.includes('forLoanAvailability')) {
      return [200, { data: { forLoanAvailability: forLoanTestData } }];
    } else if (query.includes('forPledgeAvailability')) {
      return [200, { data: { forPledgeAvailability: forPledgeTestData } }];
    } else if (query.includes('inventorySummary')) {
      return [200, { data: { inventorySummary: inventorySummaryTestData } }];
    } else if (query.includes('topSecuritiesByAvailability')) {
      return [200, { data: { topSecuritiesByAvailability: topSecuritiesTestData } }];
    } else if (query.includes('locateRequests(filter:')) {
      return [200, { data: { locateRequests: locatesTestData } }];
    } else if (query.includes('locateRequest(id:')) {
      const locateId = variables?.id || '';
      const locate = locatesTestData.find((l: any) => l.id === locateId) || null;
      return [200, { data: { locateRequest: locate } }];
    } else if (query.includes('locateSummary')) {
      return [200, { data: { locateSummary: locateSummaryTestData } }];
    } else if (query.includes('security(id:')) {
      const securityId = variables?.id || '';
      const security = securitiesTestData.find((s: any) => s.id === securityId) || null;
      
      // For complex queries requesting a security with all related data
      if (query.includes('positions') || query.includes('locateRequests')) {
        return [200, { 
          data: { 
            security: {
              ...security,
              positions: positionsTestData.filter((p: any) => p.securityId === securityId),
              forLoanAvailability: forLoanTestData,
              forPledgeAvailability: forPledgeTestData,
              locateRequests: locatesTestData.filter((l: any) => l.securityId === securityId)
            } 
          } 
        }];
      }
      
      return [200, { data: { security } }];
    } else if (query.includes('counterparty(id:')) {
      const counterpartyId = variables?.id || '';
      const counterparty = counterpartiesTestData.find((c: any) => c.id === counterpartyId) || null;
      
      // For complex queries requesting a counterparty with all related data
      if (query.includes('positions') || query.includes('locateRequests')) {
        return [200, { 
          data: { 
            counterparty: {
              ...counterparty,
              positions: positionsTestData.filter((p: any) => p.counterpartyId === counterpartyId),
              locateRequests: locatesTestData.filter((l: any) => l.clientId === counterpartyId || l.requestorId === counterpartyId)
            } 
          } 
        }];
      }
      
      return [200, { data: { counterparty } }];
    } else if (query.includes('createLocateRequest')) {
      return [200, { 
        data: { 
          createLocateRequest: {
            id: 'new-locate-id',
            ...variables.input,
            requestTimestamp: new Date().toISOString(),
            status: 'PENDING'
          } 
        } 
      }];
    } else if (query.includes('approveLocateRequest')) {
      return [200, { 
        data: { 
          approveLocateRequest: {
            id: variables.id,
            status: 'APPROVED',
            approvedQuantity: variables.approvedQuantity,
            approvalTimestamp: new Date().toISOString(),
            comments: variables.comments
          } 
        } 
      }];
    } else if (query.includes('rejectLocateRequest')) {
      return [200, { 
        data: { 
          rejectLocateRequest: {
            id: variables.id,
            status: 'REJECTED',
            rejectionReason: variables.rejectionReason,
            rejectionTimestamp: new Date().toISOString()
          } 
        } 
      }];
    } else if (query.includes('validateShortSellOrder')) {
      return [200, { 
        data: { 
          validateShortSellOrder: {
            orderId: 'order-id',
            isApproved: true,
            clientLimit: 10000,
            aggregationUnitLimit: 50000,
            remainingClientLimit: 5000,
            remainingAggregationUnitLimit: 25000
          } 
        } 
      }];
    } else if (query.includes('__schema')) {
      // Introspection query
      return [200, { data: { __schema: { types: [] } } }];
    } else {
      // For unhandled queries, return a generic error
      return [400, { errors: [{ message: 'Unhandled query in test mock' }] }];
    }
  });
}

/**
 * Executes a GraphQL query against the API
 * @param query - The GraphQL query string
 * @param variables - Variables for the query
 * @returns Promise that resolves to the GraphQL response
 */
async function executeGraphQLQuery(query: string, variables: object = {}) {
  const response = await apiClient.post(GRAPHQL_ENDPOINT, {
    query,
    variables
  });
  return response.data;
}

/**
 * Executes a GraphQL mutation against the API
 * @param mutation - The GraphQL mutation string
 * @param variables - Variables for the mutation
 * @returns Promise that resolves to the GraphQL response
 */
async function executeGraphQLMutation(mutation: string, variables: object = {}) {
  const response = await apiClient.post(GRAPHQL_ENDPOINT, {
    query: mutation,
    variables
  });
  return response.data;
}

describe('Position GraphQL Queries', () => {
  beforeAll(() => {
    setupApiClient();
    setupMockResponses();
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
  });

  test('should retrieve positions with nested filtering', async () => {
    const query = gql`
      query GetPositions($filter: PositionFilterInput!) {
        positions(filter: $filter) {
          id
          securityId
          bookId
          contractualQty
          settledQty
          businessDate
          security {
            id
            securityType
            ticker
            description
          }
        }
      }
    `;

    const variables = {
      filter: {
        securityType: 'EQUITY',
        bookId: 'EQUITY-01'
      }
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.positions');
    expect(Array.isArray(result.data.positions)).toBe(true);
    expect(result.data.positions.length).toBeGreaterThan(0);
    
    // Check that nested fields are populated
    const position = result.data.positions[0];
    expect(position).toHaveProperty('security');
    expect(position.security).toHaveProperty('ticker');
  });

  test('should retrieve positions with security details', async () => {
    const query = gql`
      query GetPosition($id: ID!) {
        position(id: $id) {
          id
          securityId
          bookId
          contractualQty
          settledQty
          businessDate
          security {
            id
            securityType
            ticker
            description
            issuer
            currency
            status
          }
        }
      }
    `;

    const variables = {
      id: 'position-1'
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.position');
    expect(result.data.position).toHaveProperty('id', 'position-1');
    expect(result.data.position).toHaveProperty('security');
    expect(result.data.position.security).toHaveProperty('ticker');
    expect(result.data.position.security).toHaveProperty('description');
  });

  test('should retrieve positions with counterparty details', async () => {
    const query = gql`
      query GetPosition($id: ID!) {
        position(id: $id) {
          id
          securityId
          bookId
          contractualQty
          settledQty
          businessDate
          counterparty {
            id
            name
            type
            status
          }
        }
      }
    `;

    const variables = {
      id: 'position-1'
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.position');
    expect(result.data.position).toHaveProperty('id', 'position-1');
    expect(result.data.position).toHaveProperty('counterparty');
    expect(result.data.position.counterparty).toHaveProperty('name');
    expect(result.data.position.counterparty).toHaveProperty('type');
  });

  test('should retrieve position summary with aggregations', async () => {
    const query = gql`
      query GetPositionSummary($aggregation: PositionAggregationInput!) {
        positionSummary(aggregation: $aggregation) {
          totalLong
          totalShort
          netPosition
          securityCount
          bySecurityType {
            securityType
            totalLong
            totalShort
            netPosition
          }
          byBook {
            bookId
            totalLong
            totalShort
            netPosition
          }
        }
      }
    `;

    const variables = {
      aggregation: {
        groupBy: ['SECURITY_TYPE', 'BOOK']
      }
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.positionSummary');
    expect(result.data.positionSummary).toHaveProperty('totalLong');
    expect(result.data.positionSummary).toHaveProperty('totalShort');
    expect(result.data.positionSummary).toHaveProperty('bySecurityType');
    expect(Array.isArray(result.data.positionSummary.bySecurityType)).toBe(true);
    expect(result.data.positionSummary).toHaveProperty('byBook');
    expect(Array.isArray(result.data.positionSummary.byBook)).toBe(true);
  });

  test('should retrieve settlement ladder with projections', async () => {
    const query = gql`
      query GetSettlementLadder($securityId: ID!, $bookId: ID) {
        settlementLadder(securityId: $securityId, bookId: $bookId) {
          securityId
          bookId
          businessDate
          sd0 {
            deliver
            receipt
            net
          }
          sd1 {
            deliver
            receipt
            net
          }
          sd2 {
            deliver
            receipt
            net
          }
          sd3 {
            deliver
            receipt
            net
          }
          sd4 {
            deliver
            receipt
            net
          }
        }
      }
    `;

    const variables = {
      securityId: 'security-1',
      bookId: 'EQUITY-01'
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.settlementLadder');
    expect(result.data.settlementLadder).toHaveProperty('securityId', 'security-1');
    expect(result.data.settlementLadder).toHaveProperty('sd0');
    expect(result.data.settlementLadder).toHaveProperty('sd1');
    expect(result.data.settlementLadder).toHaveProperty('sd2');
  });
});

describe('Inventory GraphQL Queries', () => {
  beforeAll(() => {
    setupApiClient();
    setupMockResponses();
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
  });

  test('should retrieve inventory availability with aggregations', async () => {
    const query = gql`
      query GetInventoryAvailability($aggregation: InventoryAggregationInput!) {
        inventoryAvailability(aggregation: $aggregation) {
          totalAvailable
          bySecurityType {
            securityType
            available
            percentage
          }
          byCalculationType {
            calculationType
            available
            percentage
          }
        }
      }
    `;

    const variables = {
      aggregation: {
        groupBy: ['SECURITY_TYPE', 'CALCULATION_TYPE']
      }
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.inventoryAvailability');
    expect(result.data.inventoryAvailability).toHaveProperty('totalAvailable');
    expect(result.data.inventoryAvailability).toHaveProperty('bySecurityType');
    expect(Array.isArray(result.data.inventoryAvailability.bySecurityType)).toBe(true);
    expect(result.data.inventoryAvailability).toHaveProperty('byCalculationType');
    expect(Array.isArray(result.data.inventoryAvailability.byCalculationType)).toBe(true);
  });

  test('should retrieve for-loan availability with security details', async () => {
    const query = gql`
      query GetForLoanAvailability($securityId: ID!) {
        forLoanAvailability(securityId: $securityId) {
          securityId
          calculationType
          availableQuantity
          security {
            id
            securityType
            ticker
            description
            temperature
          }
        }
      }
    `;

    const variables = {
      securityId: 'security-1'
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.forLoanAvailability');
    expect(result.data.forLoanAvailability).toHaveProperty('securityId', 'security-1');
    expect(result.data.forLoanAvailability).toHaveProperty('calculationType', 'FOR_LOAN');
    expect(result.data.forLoanAvailability).toHaveProperty('security');
    expect(result.data.forLoanAvailability.security).toHaveProperty('ticker');
    expect(result.data.forLoanAvailability.security).toHaveProperty('temperature');
  });

  test('should retrieve for-pledge availability with security details', async () => {
    const query = gql`
      query GetForPledgeAvailability($securityId: ID!) {
        forPledgeAvailability(securityId: $securityId) {
          securityId
          calculationType
          availableQuantity
          security {
            id
            securityType
            ticker
            description
          }
        }
      }
    `;

    const variables = {
      securityId: 'security-1'
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.forPledgeAvailability');
    expect(result.data.forPledgeAvailability).toHaveProperty('securityId', 'security-1');
    expect(result.data.forPledgeAvailability).toHaveProperty('calculationType', 'FOR_PLEDGE');
    expect(result.data.forPledgeAvailability).toHaveProperty('security');
    expect(result.data.forPledgeAvailability.security).toHaveProperty('ticker');
  });

  test('should retrieve inventory summary with category breakdown', async () => {
    const query = gql`
      query GetInventorySummary {
        inventorySummary {
          totalValue
          byCategory {
            category
            value
            percentage
            change1d
          }
        }
      }
    `;

    const result = await executeGraphQLQuery(print(query));
    
    expect(result).toHaveProperty('data.inventorySummary');
    expect(result.data.inventorySummary).toHaveProperty('totalValue');
    expect(result.data.inventorySummary).toHaveProperty('byCategory');
    expect(Array.isArray(result.data.inventorySummary.byCategory)).toBe(true);
    expect(result.data.inventorySummary.byCategory.length).toBeGreaterThan(0);
    expect(result.data.inventorySummary.byCategory[0]).toHaveProperty('category');
    expect(result.data.inventorySummary.byCategory[0]).toHaveProperty('value');
    expect(result.data.inventorySummary.byCategory[0]).toHaveProperty('percentage');
  });

  test('should retrieve top securities by availability', async () => {
    const query = gql`
      query GetTopSecurities($calculationType: CalculationType!, $limit: Int) {
        topSecuritiesByAvailability(calculationType: $calculationType, limit: $limit) {
          securityId
          availableQuantity
          security {
            id
            ticker
            description
            securityType
          }
        }
      }
    `;

    const variables = {
      calculationType: 'FOR_LOAN',
      limit: 10
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.topSecuritiesByAvailability');
    expect(Array.isArray(result.data.topSecuritiesByAvailability)).toBe(true);
    expect(result.data.topSecuritiesByAvailability.length).toBeGreaterThan(0);
    expect(result.data.topSecuritiesByAvailability.length).toBeLessThanOrEqual(10);
    expect(result.data.topSecuritiesByAvailability[0]).toHaveProperty('securityId');
    expect(result.data.topSecuritiesByAvailability[0]).toHaveProperty('availableQuantity');
    expect(result.data.topSecuritiesByAvailability[0]).toHaveProperty('security');
  });
});

describe('Locate GraphQL Queries', () => {
  beforeAll(() => {
    setupApiClient();
    setupMockResponses();
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
  });

  test('should retrieve locate requests with nested filtering', async () => {
    const query = gql`
      query GetLocateRequests($filter: LocateRequestFilterInput!) {
        locateRequests(filter: $filter) {
          id
          requestorId
          clientId
          securityId
          locateType
          requestedQuantity
          requestTimestamp
          status
          security {
            id
            ticker
            description
          }
        }
      }
    `;

    const variables = {
      filter: {
        status: 'PENDING',
        securityId: 'security-1'
      }
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.locateRequests');
    expect(Array.isArray(result.data.locateRequests)).toBe(true);
    expect(result.data.locateRequests.length).toBeGreaterThan(0);
    
    // Check that nested fields are populated
    const locateRequest = result.data.locateRequests[0];
    expect(locateRequest).toHaveProperty('security');
    expect(locateRequest.security).toHaveProperty('ticker');
  });

  test('should retrieve locate request with security and counterparty details', async () => {
    const query = gql`
      query GetLocateRequest($id: ID!) {
        locateRequest(id: $id) {
          id
          requestorId
          clientId
          securityId
          locateType
          requestedQuantity
          requestTimestamp
          status
          security {
            id
            ticker
            description
            securityType
          }
          client {
            id
            name
            type
          }
          requestor {
            id
            name
            type
          }
        }
      }
    `;

    const variables = {
      id: 'locate-1'
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.locateRequest');
    expect(result.data.locateRequest).toHaveProperty('id', 'locate-1');
    expect(result.data.locateRequest).toHaveProperty('security');
    expect(result.data.locateRequest.security).toHaveProperty('ticker');
    expect(result.data.locateRequest).toHaveProperty('client');
    expect(result.data.locateRequest.client).toHaveProperty('name');
    expect(result.data.locateRequest).toHaveProperty('requestor');
    expect(result.data.locateRequest.requestor).toHaveProperty('name');
  });

  test('should retrieve locate summary with status breakdown', async () => {
    const query = gql`
      query GetLocateSummary {
        locateSummary {
          total
          byStatus {
            status
            count
            percentage
          }
        }
      }
    `;

    const result = await executeGraphQLQuery(print(query));
    
    expect(result).toHaveProperty('data.locateSummary');
    expect(result.data.locateSummary).toHaveProperty('total');
    expect(result.data.locateSummary).toHaveProperty('byStatus');
    expect(Array.isArray(result.data.locateSummary.byStatus)).toBe(true);
    expect(result.data.locateSummary.byStatus.length).toBeGreaterThan(0);
    expect(result.data.locateSummary.byStatus[0]).toHaveProperty('status');
    expect(result.data.locateSummary.byStatus[0]).toHaveProperty('count');
    expect(result.data.locateSummary.byStatus[0]).toHaveProperty('percentage');
  });
});

describe('Cross-Domain GraphQL Queries', () => {
  beforeAll(() => {
    setupApiClient();
    setupMockResponses();
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
  });

  test('should retrieve positions with inventory availability', async () => {
    const query = gql`
      query GetPositionsWithInventory($securityId: ID!) {
        positions(filter: { securityId: $securityId }) {
          id
          securityId
          bookId
          contractualQty
          settledQty
          businessDate
        }
        forLoanAvailability(securityId: $securityId) {
          securityId
          calculationType
          availableQuantity
        }
        forPledgeAvailability(securityId: $securityId) {
          securityId
          calculationType
          availableQuantity
        }
      }
    `;

    const variables = {
      securityId: 'security-1'
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.positions');
    expect(result).toHaveProperty('data.forLoanAvailability');
    expect(result).toHaveProperty('data.forPledgeAvailability');
    
    expect(Array.isArray(result.data.positions)).toBe(true);
    expect(result.data.positions.length).toBeGreaterThan(0);
    expect(result.data.forLoanAvailability).toHaveProperty('securityId', 'security-1');
    expect(result.data.forPledgeAvailability).toHaveProperty('securityId', 'security-1');
  });

  test('should retrieve locate requests with position and inventory data', async () => {
    const query = gql`
      query GetLocatesWithPositionAndInventory($securityId: ID!) {
        locateRequests(filter: { securityId: $securityId }) {
          id
          securityId
          requestedQuantity
          status
        }
        positions(filter: { securityId: $securityId }) {
          id
          securityId
          bookId
          contractualQty
          settledQty
        }
        forLoanAvailability(securityId: $securityId) {
          securityId
          calculationType
          availableQuantity
        }
      }
    `;

    const variables = {
      securityId: 'security-1'
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.locateRequests');
    expect(result).toHaveProperty('data.positions');
    expect(result).toHaveProperty('data.forLoanAvailability');
    
    expect(Array.isArray(result.data.locateRequests)).toBe(true);
    expect(Array.isArray(result.data.positions)).toBe(true);
    expect(result.data.forLoanAvailability).toHaveProperty('securityId', 'security-1');
  });

  test('should retrieve security with all related data', async () => {
    const query = gql`
      query GetSecurityWithRelatedData($id: ID!) {
        security(id: $id) {
          id
          ticker
          description
          securityType
          positions {
            id
            bookId
            contractualQty
            settledQty
          }
          forLoanAvailability {
            calculationType
            availableQuantity
          }
          forPledgeAvailability {
            calculationType
            availableQuantity
          }
          locateRequests {
            id
            requestedQuantity
            status
          }
        }
      }
    `;

    const variables = {
      id: 'security-1'
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.security');
    expect(result.data.security).toHaveProperty('id', 'security-1');
    expect(result.data.security).toHaveProperty('positions');
    expect(Array.isArray(result.data.security.positions)).toBe(true);
    expect(result.data.security).toHaveProperty('forLoanAvailability');
    expect(result.data.security).toHaveProperty('forPledgeAvailability');
    expect(result.data.security).toHaveProperty('locateRequests');
    expect(Array.isArray(result.data.security.locateRequests)).toBe(true);
  });

  test('should retrieve counterparty with all related data', async () => {
    const query = gql`
      query GetCounterpartyWithRelatedData($id: ID!) {
        counterparty(id: $id) {
          id
          name
          type
          positions {
            id
            securityId
            bookId
            contractualQty
            settledQty
          }
          locateRequests {
            id
            securityId
            requestedQuantity
            status
          }
        }
      }
    `;

    const variables = {
      id: 'counterparty-1'
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('data.counterparty');
    expect(result.data.counterparty).toHaveProperty('id', 'counterparty-1');
    expect(result.data.counterparty).toHaveProperty('positions');
    expect(Array.isArray(result.data.counterparty.positions)).toBe(true);
    expect(result.data.counterparty).toHaveProperty('locateRequests');
    expect(Array.isArray(result.data.counterparty.locateRequests)).toBe(true);
  });
});

describe('GraphQL Mutations', () => {
  beforeAll(() => {
    setupApiClient();
    setupMockResponses();
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
  });

  test('should create a locate request', async () => {
    const mutation = gql`
      mutation CreateLocateRequest($input: CreateLocateRequestInput!) {
        createLocateRequest(input: $input) {
          id
          requestorId
          clientId
          securityId
          locateType
          requestedQuantity
          requestTimestamp
          status
          swapCashIndicator
        }
      }
    `;

    const variables = {
      input: {
        requestorId: 'requestor-1',
        clientId: 'client-1',
        securityId: 'security-1',
        locateType: 'SHORT',
        requestedQuantity: 5000,
        swapCashIndicator: 'CASH'
      }
    };

    const result = await executeGraphQLMutation(print(mutation), variables);
    
    expect(result).toHaveProperty('data.createLocateRequest');
    expect(result.data.createLocateRequest).toHaveProperty('id', 'new-locate-id');
    expect(result.data.createLocateRequest).toHaveProperty('requestorId', 'requestor-1');
    expect(result.data.createLocateRequest).toHaveProperty('clientId', 'client-1');
    expect(result.data.createLocateRequest).toHaveProperty('securityId', 'security-1');
    expect(result.data.createLocateRequest).toHaveProperty('locateType', 'SHORT');
    expect(result.data.createLocateRequest).toHaveProperty('requestedQuantity', 5000);
    expect(result.data.createLocateRequest).toHaveProperty('status');
    expect(result.data.createLocateRequest).toHaveProperty('swapCashIndicator', 'CASH');
  });

  test('should approve a locate request', async () => {
    const mutation = gql`
      mutation ApproveLocateRequest($id: ID!, $approvedQuantity: Float!, $comments: String) {
        approveLocateRequest(id: $id, approvedQuantity: $approvedQuantity, comments: $comments) {
          id
          status
          approvedQuantity
          approvalTimestamp
          comments
        }
      }
    `;

    const variables = {
      id: 'locate-1',
      approvedQuantity: 5000,
      comments: 'Approved based on current inventory levels'
    };

    const result = await executeGraphQLMutation(print(mutation), variables);
    
    expect(result).toHaveProperty('data.approveLocateRequest');
    expect(result.data.approveLocateRequest).toHaveProperty('id', 'locate-1');
    expect(result.data.approveLocateRequest).toHaveProperty('status', 'APPROVED');
    expect(result.data.approveLocateRequest).toHaveProperty('approvedQuantity', 5000);
    expect(result.data.approveLocateRequest).toHaveProperty('approvalTimestamp');
    expect(result.data.approveLocateRequest).toHaveProperty('comments', 'Approved based on current inventory levels');
  });

  test('should reject a locate request', async () => {
    const mutation = gql`
      mutation RejectLocateRequest($id: ID!, $rejectionReason: String!) {
        rejectLocateRequest(id: $id, rejectionReason: $rejectionReason) {
          id
          status
          rejectionReason
          rejectionTimestamp
        }
      }
    `;

    const variables = {
      id: 'locate-1',
      rejectionReason: 'Insufficient inventory available'
    };

    const result = await executeGraphQLMutation(print(mutation), variables);
    
    expect(result).toHaveProperty('data.rejectLocateRequest');
    expect(result.data.rejectLocateRequest).toHaveProperty('id', 'locate-1');
    expect(result.data.rejectLocateRequest).toHaveProperty('status', 'REJECTED');
    expect(result.data.rejectLocateRequest).toHaveProperty('rejectionReason', 'Insufficient inventory available');
    expect(result.data.rejectLocateRequest).toHaveProperty('rejectionTimestamp');
  });

  test('should validate a short sell order', async () => {
    const mutation = gql`
      mutation ValidateShortSellOrder($input: ShortSellOrderInput!) {
        validateShortSellOrder(input: $input) {
          orderId
          isApproved
          clientLimit
          aggregationUnitLimit
          remainingClientLimit
          remainingAggregationUnitLimit
        }
      }
    `;

    const variables = {
      input: {
        securityId: 'security-1',
        clientId: 'client-1',
        aggregationUnitId: 'agg-unit-1',
        quantity: 1000,
        price: 150.75
      }
    };

    const result = await executeGraphQLMutation(print(mutation), variables);
    
    expect(result).toHaveProperty('data.validateShortSellOrder');
    expect(result.data.validateShortSellOrder).toHaveProperty('orderId', 'order-id');
    expect(result.data.validateShortSellOrder).toHaveProperty('isApproved', true);
    expect(result.data.validateShortSellOrder).toHaveProperty('clientLimit', 10000);
    expect(result.data.validateShortSellOrder).toHaveProperty('aggregationUnitLimit', 50000);
    expect(result.data.validateShortSellOrder).toHaveProperty('remainingClientLimit', 5000);
    expect(result.data.validateShortSellOrder).toHaveProperty('remainingAggregationUnitLimit', 25000);
  });
});

describe('GraphQL Error Handling', () => {
  beforeAll(() => {
    setupApiClient();
    setupMockResponses();
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
  });

  test('should handle validation errors in queries', async () => {
    const query = gql`
      query validation_error_test($quantity: Float!) {
        validateQuantity(quantity: $quantity) {
          isValid
          message
        }
      }
    `;

    const variables = {
      quantity: -100 // Invalid negative quantity
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toHaveProperty('message');
    expect(result.errors[0].message).toContain('Validation failed');
    expect(result.errors[0]).toHaveProperty('extensions.code', 'VALIDATION_ERROR');
  });

  test('should handle validation errors in mutations', async () => {
    const mutation = gql`
      mutation validation_error_test($quantity: Float!) {
        createLocateRequest(input: { requestedQuantity: $quantity }) {
          id
          status
        }
      }
    `;

    const variables = {
      quantity: -100 // Invalid negative quantity
    };

    const result = await executeGraphQLMutation(print(mutation), variables);
    
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toHaveProperty('message');
    expect(result.errors[0].message).toContain('Validation failed');
    expect(result.errors[0]).toHaveProperty('extensions.code', 'VALIDATION_ERROR');
  });

  test('should handle not found errors', async () => {
    const query = gql`
      query not_found_test($id: ID!) {
        security(id: $id) {
          id
          ticker
        }
      }
    `;

    const variables = {
      id: 'non-existent-id'
    };

    const result = await executeGraphQLQuery(print(query), variables);
    
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toHaveProperty('message');
    expect(result.errors[0].message).toContain('not found');
    expect(result.errors[0]).toHaveProperty('extensions.code', 'NOT_FOUND');
  });

  test('should handle unauthorized access', async () => {
    const query = gql`
      query unauthorized_test {
        protectedData {
          sensitiveInformation
        }
      }
    `;

    const result = await executeGraphQLQuery(print(query));
    
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toHaveProperty('message');
    expect(result.errors[0].message).toContain('Unauthorized');
    expect(result.errors[0]).toHaveProperty('extensions.code', 'UNAUTHORIZED');
  });

  test('should handle forbidden access', async () => {
    const query = gql`
      query forbidden_test {
        restrictedData {
          confidentialInformation
        }
      }
    `;

    const result = await executeGraphQLQuery(print(query));
    
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toHaveProperty('message');
    expect(result.errors[0].message).toContain('Forbidden');
    expect(result.errors[0]).toHaveProperty('extensions.code', 'FORBIDDEN');
  });
});

describe('GraphQL Performance Tests', () => {
  beforeAll(() => {
    setupApiClient();
    setupMockResponses();
    jest.setTimeout(TEST_TIMEOUTS.PERFORMANCE);
  });

  test('should meet performance requirements for simple queries', async () => {
    const query = gql`
      query SimpleQuery {
        positions(filter: { bookId: "EQUITY-01" }) {
          id
          securityId
          contractualQty
          settledQty
        }
      }
    `;

    const testFn = async () => {
      return await executeGraphQLQuery(print(query));
    };

    const result = await validatePerformance(testFn, [], 500);
    
    expect(result.success).toBe(true);
    expect(result.executionTime).toBeLessThan(result.threshold);
    expect(result.result).toHaveProperty('data.positions');
  });

  test('should meet performance requirements for complex queries', async () => {
    const query = gql`
      query ComplexQuery($securityId: ID!) {
        security(id: $securityId) {
          id
          ticker
          description
          positions {
            id
            bookId
            contractualQty
            settledQty
          }
          forLoanAvailability {
            calculationType
            availableQuantity
          }
          locateRequests {
            id
            requestedQuantity
            status
            client {
              id
              name
            }
          }
        }
      }
    `;

    const variables = {
      securityId: 'security-1'
    };

    const testFn = async () => {
      return await executeGraphQLQuery(print(query), variables);
    };

    const result = await validatePerformance(testFn, [], 1000);
    
    expect(result.success).toBe(true);
    expect(result.executionTime).toBeLessThan(result.threshold);
    expect(result.result).toHaveProperty('data.security');
  });

  test('should meet performance requirements for mutations', async () => {
    const mutation = gql`
      mutation PerformanceMutation($input: CreateLocateRequestInput!) {
        createLocateRequest(input: $input) {
          id
          requestorId
          clientId
          securityId
          locateType
          requestedQuantity
          status
        }
      }
    `;

    const variables = {
      input: {
        requestorId: 'requestor-1',
        clientId: 'client-1',
        securityId: 'security-1',
        locateType: 'SHORT',
        requestedQuantity: 5000,
        swapCashIndicator: 'CASH'
      }
    };

    const testFn = async () => {
      return await executeGraphQLMutation(print(mutation), variables);
    };

    const result = await validatePerformance(testFn, [], 500);
    
    expect(result.success).toBe(true);
    expect(result.executionTime).toBeLessThan(result.threshold);
    expect(result.result).toHaveProperty('data.createLocateRequest');
  });

  test('should meet performance requirements for cross-domain queries', async () => {
    const query = gql`
      query CrossDomainQuery($securityId: ID!) {
        positions(filter: { securityId: $securityId }) {
          id
          securityId
          bookId
          contractualQty
          settledQty
        }
        forLoanAvailability(securityId: $securityId) {
          securityId
          calculationType
          availableQuantity
        }
        locateRequests(filter: { securityId: $securityId }) {
          id
          requestedQuantity
          status
        }
      }
    `;

    const variables = {
      securityId: 'security-1'
    };

    const testFn = async () => {
      return await executeGraphQLQuery(print(query), variables);
    };

    const result = await validatePerformance(testFn, [], 1500);
    
    expect(result.success).toBe(true);
    expect(result.executionTime).toBeLessThan(result.threshold);
    expect(result.result).toHaveProperty('data.positions');
    expect(result.result).toHaveProperty('data.forLoanAvailability');
    expect(result.result).toHaveProperty('data.locateRequests');
  });
});