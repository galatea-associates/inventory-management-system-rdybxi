import { PactV3, MatchersV3, SpecificationVersion } from '@pact-foundation/pact'; // v11.0.2
import path from 'path'; // v18.15.0
import axios from 'axios'; // v1.4.0

import { API_BASE_URL, API_ENDPOINTS, TEST_TIMEOUTS } from '../../../common/constants';
import { loadTestData } from '../../../common/testUtils';
import { TEST_DATA_PATHS } from '../../../common/constants';

// Constants for Pact configuration
const PACT_DIR = path.resolve(__dirname, '../pacts');
const MOCK_SERVER_PORT = 8080;
const MOCK_SERVER_HOST = 'localhost';

/**
 * Sets up a Pact instance for the Calculation Service as a consumer
 * @returns Configured Pact instance for the Calculation Service
 */
function setupCalculationServicePact(): PactV3 {
  const pact = new PactV3({
    consumer: 'calculation-service',
    provider: 'data-ingestion-service',
    spec: SpecificationVersion.V3,
    dir: PACT_DIR,
    port: MOCK_SERVER_PORT,
    host: MOCK_SERVER_HOST,
    logLevel: process.env.NODE_ENV === 'test' ? 'error' : 'info',
  });
  
  return pact;
}

/**
 * Sets up a Pact instance for the Workflow Service as a consumer
 * @returns Configured Pact instance for the Workflow Service
 */
function setupWorkflowServicePact(): PactV3 {
  const pact = new PactV3({
    consumer: 'workflow-service',
    provider: 'data-ingestion-service',
    spec: SpecificationVersion.V3,
    dir: PACT_DIR,
    port: MOCK_SERVER_PORT,
    host: MOCK_SERVER_HOST,
    logLevel: process.env.NODE_ENV === 'test' ? 'error' : 'info',
  });
  
  return pact;
}

/**
 * Creates a Pact interaction for retrieving a security by ID
 * @param pact The Pact instance
 * @param securityId The security ID to request
 * @returns Pact instance with the interaction added
 */
function createSecurityApiInteraction(pact: PactV3, securityId: string): PactV3 {
  // Load mock security data
  const mockSecurities = loadTestData(`${TEST_DATA_PATHS.SECURITIES}/securities.json`);
  const mockSecurity = mockSecurities.find(security => security.internalId === securityId);
  
  return pact
    .given('security with ID exists')
    .uponReceiving('a request to get a security by ID')
    .withRequest({
      method: 'GET',
      path: `/api/v1/securities/${securityId}`,
    })
    .willRespondWith({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like(mockSecurity),
    });
}

/**
 * Creates a Pact interaction for retrieving a list of securities
 * @param pact The Pact instance
 * @param queryParams Optional query parameters
 * @returns Pact instance with the interaction added
 */
function createSecuritiesApiInteraction(pact: PactV3, queryParams?: object): PactV3 {
  // Load mock securities data
  const mockSecurities = loadTestData(`${TEST_DATA_PATHS.SECURITIES}/securities.json`);
  
  return pact
    .given('securities exist')
    .uponReceiving('a request to get securities')
    .withRequest({
      method: 'GET',
      path: '/api/v1/securities',
      query: queryParams,
    })
    .willRespondWith({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        data: MatchersV3.eachLike(mockSecurities[0]),
        pagination: {
          page: MatchersV3.integer(1),
          pageSize: MatchersV3.integer(10),
          totalItems: MatchersV3.integer(mockSecurities.length),
          totalPages: MatchersV3.integer(Math.ceil(mockSecurities.length / 10)),
        }
      },
    });
}

/**
 * Creates a Pact interaction for retrieving a security by external identifier
 * @param pact The Pact instance
 * @param identifierType The type of identifier
 * @param identifierValue The identifier value
 * @returns Pact instance with the interaction added
 */
function createSecurityByIdentifierApiInteraction(pact: PactV3, identifierType: string, identifierValue: string): PactV3 {
  // Load mock security data
  const mockSecurities = loadTestData(`${TEST_DATA_PATHS.SECURITIES}/securities.json`);
  const mockSecurity = mockSecurities[0]; // Simplified - would need to match by identifier in real code
  
  return pact
    .given('security identifiers exist')
    .uponReceiving('a request to get a security by identifier')
    .withRequest({
      method: 'GET',
      path: `/api/v1/securities/identifier/${identifierType}/${identifierValue}`,
    })
    .willRespondWith({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like(mockSecurity),
    });
}

/**
 * Creates a Pact interaction for retrieving index composition data
 * @param pact The Pact instance
 * @param indexId The index ID
 * @param asOfDate The as-of date for the composition
 * @returns Pact instance with the interaction added
 */
function createIndexCompositionApiInteraction(pact: PactV3, indexId: string, asOfDate: string): PactV3 {
  // Load mock index composition data from test fixtures
  const mockComposition = loadTestData(`${TEST_DATA_PATHS.REFERENCE_DATA}/index-composition.json`);
  
  return pact
    .given('index composition exists')
    .uponReceiving('a request to get index composition')
    .withRequest({
      method: 'GET',
      path: `/api/v1/securities/${indexId}/composition`,
      query: {
        asOfDate: asOfDate,
      },
    })
    .willRespondWith({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        indexId: MatchersV3.string(indexId),
        asOfDate: MatchersV3.string(asOfDate),
        constituents: MatchersV3.eachLike({
          securityId: MatchersV3.string('AAPL'),
          weight: MatchersV3.decimal(0.05),
        }),
      },
    });
}

/**
 * Creates a Pact interaction for retrieving a counterparty by ID
 * @param pact The Pact instance
 * @param counterpartyId The counterparty ID
 * @returns Pact instance with the interaction added
 */
function createCounterpartyApiInteraction(pact: PactV3, counterpartyId: string): PactV3 {
  // Load mock counterparty data
  const mockCounterparties = loadTestData(`${TEST_DATA_PATHS.COUNTERPARTIES}/counterparties.json`);
  const mockCounterparty = mockCounterparties.find(cp => cp.counterpartyId === counterpartyId);
  
  return pact
    .given('counterparty with ID exists')
    .uponReceiving('a request to get a counterparty by ID')
    .withRequest({
      method: 'GET',
      path: `/api/v1/counterparties/${counterpartyId}`,
    })
    .willRespondWith({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like(mockCounterparty),
    });
}

/**
 * Creates a Pact interaction for retrieving latest market data for a security
 * @param pact The Pact instance
 * @param securityId The security ID
 * @param marketDataType The type of market data
 * @returns Pact instance with the interaction added
 */
function createLatestMarketDataApiInteraction(pact: PactV3, securityId: string, marketDataType: string): PactV3 {
  // Load mock market data
  const mockMarketData = loadTestData(`${TEST_DATA_PATHS.MARKET_DATA}/latest-prices.json`);
  
  return pact
    .given('latest prices exist')
    .uponReceiving('a request to get latest market data')
    .withRequest({
      method: 'GET',
      path: '/api/v1/ingestion/market-data/latest',
      query: {
        securityId: securityId,
        type: marketDataType,
      },
    })
    .willRespondWith({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        securityId: securityId,
        timestamp: MatchersV3.iso8601DateTime(),
        price: MatchersV3.decimal(100.0),
        source: MatchersV3.string('BLOOMBERG'),
        type: marketDataType,
      }),
    });
}

/**
 * Creates a Pact interaction for retrieving market data within a time range
 * @param pact The Pact instance
 * @param securityId The security ID
 * @param startTime The start time
 * @param endTime The end time
 * @returns Pact instance with the interaction added
 */
function createMarketDataTimeRangeApiInteraction(pact: PactV3, securityId: string, startTime: string, endTime: string): PactV3 {
  // Load mock market data
  const mockMarketData = loadTestData(`${TEST_DATA_PATHS.MARKET_DATA}/time-series-prices.json`);
  
  return pact
    .given('price history exists')
    .uponReceiving('a request to get market data in time range')
    .withRequest({
      method: 'GET',
      path: '/api/v1/ingestion/market-data/time-range',
      query: {
        securityId: securityId,
        startTime: startTime,
        endTime: endTime,
      },
    })
    .willRespondWith({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.eachLike({
        securityId: securityId,
        timestamp: MatchersV3.iso8601DateTime(),
        price: MatchersV3.decimal(100.0),
        source: MatchersV3.string('BLOOMBERG'),
        type: MatchersV3.string('PRICE'),
      }),
    });
}

/**
 * Creates a Pact interaction for retrieving latest prices for multiple securities
 * @param pact The Pact instance
 * @param securityIds Array of security IDs
 * @returns Pact instance with the interaction added
 */
function createLatestPricesForSecuritiesApiInteraction(pact: PactV3, securityIds: string[]): PactV3 {
  // Load mock market data
  const mockMarketData = loadTestData(`${TEST_DATA_PATHS.MARKET_DATA}/latest-prices.json`);
  
  return pact
    .given('latest prices exist')
    .uponReceiving('a request to get latest prices for securities')
    .withRequest({
      method: 'POST',
      path: '/api/v1/ingestion/market-data/latest-prices',
      headers: {
        'Content-Type': 'application/json',
      },
      body: securityIds,
    })
    .willRespondWith({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like(
        securityIds.reduce((acc, securityId) => {
          acc[securityId] = {
            securityId: securityId,
            timestamp: MatchersV3.iso8601DateTime(),
            price: MatchersV3.decimal(100.0),
            source: MatchersV3.string('BLOOMBERG'),
            type: MatchersV3.string('PRICE'),
          };
          return acc;
        }, {})
      ),
    });
}

describe('Calculation Service as Consumer', () => {
  let pact: PactV3;
  
  // Set timeout for Pact tests
  const testTimeout = TEST_TIMEOUTS.CONTRACT || 30000;
  jest.setTimeout(testTimeout);
  
  beforeAll(() => {
    pact = setupCalculationServicePact();
  });
  
  it('should get a security by ID', async () => {
    // Arrange
    const securityId = 'AAPL';
    const interaction = createSecurityApiInteraction(pact, securityId);
    
    // Act & Assert
    await interaction.executeTest(async (mockServer) => {
      const response = await axios.get(
        `${mockServer.url}/api/v1/securities/${securityId}`
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.internalId).toBe(securityId);
    });
  });
  
  it('should get a list of securities', async () => {
    // Arrange
    const queryParams = { type: 'EQUITY', limit: 10 };
    const interaction = createSecuritiesApiInteraction(pact, queryParams);
    
    // Act & Assert
    await interaction.executeTest(async (mockServer) => {
      const response = await axios.get(
        `${mockServer.url}/api/v1/securities`, 
        { params: queryParams }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.pagination).toBeDefined();
    });
  });
  
  it('should get latest market data for a security', async () => {
    // Arrange
    const securityId = 'AAPL';
    const marketDataType = 'PRICE';
    const interaction = createLatestMarketDataApiInteraction(pact, securityId, marketDataType);
    
    // Act & Assert
    await interaction.executeTest(async (mockServer) => {
      const response = await axios.get(
        `${mockServer.url}/api/v1/ingestion/market-data/latest`, 
        { params: { securityId, type: marketDataType } }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.securityId).toBe(securityId);
      expect(response.data.type).toBe(marketDataType);
    });
  });
  
  it('should get market data in a time range', async () => {
    // Arrange
    const securityId = 'AAPL';
    const startTime = '2023-01-01T00:00:00Z';
    const endTime = '2023-01-02T00:00:00Z';
    const interaction = createMarketDataTimeRangeApiInteraction(pact, securityId, startTime, endTime);
    
    // Act & Assert
    await interaction.executeTest(async (mockServer) => {
      const response = await axios.get(
        `${mockServer.url}/api/v1/ingestion/market-data/time-range`, 
        { params: { securityId, startTime, endTime } }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.data.length).toBeGreaterThan(0);
    });
  });
  
  it('should get latest prices for multiple securities', async () => {
    // Arrange
    const securityIds = ['AAPL', 'MSFT', 'GOOGL'];
    const interaction = createLatestPricesForSecuritiesApiInteraction(pact, securityIds);
    
    // Act & Assert
    await interaction.executeTest(async (mockServer) => {
      const response = await axios.post(
        `${mockServer.url}/api/v1/ingestion/market-data/latest-prices`, 
        securityIds
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      securityIds.forEach(id => {
        expect(response.data[id]).toBeDefined();
        expect(response.data[id].securityId).toBe(id);
      });
    });
  });
});

describe('Workflow Service as Consumer', () => {
  let pact: PactV3;
  
  // Set timeout for Pact tests
  const testTimeout = TEST_TIMEOUTS.CONTRACT || 30000;
  jest.setTimeout(testTimeout);
  
  beforeAll(() => {
    pact = setupWorkflowServicePact();
  });
  
  it('should get a security by ID', async () => {
    // Arrange
    const securityId = 'AAPL';
    const interaction = createSecurityApiInteraction(pact, securityId);
    
    // Act & Assert
    await interaction.executeTest(async (mockServer) => {
      const response = await axios.get(
        `${mockServer.url}/api/v1/securities/${securityId}`
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.internalId).toBe(securityId);
    });
  });
  
  it('should get a security by external identifier', async () => {
    // Arrange
    const identifierType = 'ISIN';
    const identifierValue = 'US0378331005';
    const interaction = createSecurityByIdentifierApiInteraction(pact, identifierType, identifierValue);
    
    // Act & Assert
    await interaction.executeTest(async (mockServer) => {
      const response = await axios.get(
        `${mockServer.url}/api/v1/securities/identifier/${identifierType}/${identifierValue}`
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });
  });
  
  it('should get a counterparty by ID', async () => {
    // Arrange
    const counterpartyId = 'CP001';
    const interaction = createCounterpartyApiInteraction(pact, counterpartyId);
    
    // Act & Assert
    await interaction.executeTest(async (mockServer) => {
      const response = await axios.get(
        `${mockServer.url}/api/v1/counterparties/${counterpartyId}`
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.counterpartyId).toBe(counterpartyId);
    });
  });
  
  it('should get latest market data for a security', async () => {
    // Arrange
    const securityId = 'AAPL';
    const marketDataType = 'PRICE';
    const interaction = createLatestMarketDataApiInteraction(pact, securityId, marketDataType);
    
    // Act & Assert
    await interaction.executeTest(async (mockServer) => {
      const response = await axios.get(
        `${mockServer.url}/api/v1/ingestion/market-data/latest`, 
        { params: { securityId, type: marketDataType } }
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.securityId).toBe(securityId);
      expect(response.data.type).toBe(marketDataType);
    });
  });
});