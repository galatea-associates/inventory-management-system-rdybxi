import axios from 'axios'; // ^1.4.0
import FormData from 'form-data'; // ^4.0.0
import * as fs from 'fs-extra'; // ^11.1.1
import * as path from 'path';
import WebSocket from 'ws'; // ^8.13.0

import {
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

// Use the API_BASE_URL from constants or default to localhost if not available
const API_BASE_URL = process.env.API_TEST_URL || 'http://localhost:8080/api/v1';

/**
 * Sets up test data for market data integration tests
 * @returns Object containing test securities and market data
 */
function setupTestData() {
  const securities = loadTestData(TEST_DATA_PATHS.SECURITIES);
  const marketData = loadTestData(TEST_DATA_PATHS.MARKET_DATA);
  return { securities, marketData };
}

/**
 * Creates a test market data payload for API testing
 * @param securityId - Security identifier
 * @param marketDataType - Type of market data (PRICE, NAV, VOLATILITY)
 * @param additionalData - Additional data to include in the payload
 * @returns Market data payload for API testing
 */
function createTestMarketDataPayload(securityId: string, marketDataType: string, additionalData?: object) {
  const payload = {
    securityId,
    marketDataType,
    eventTime: new Date().toISOString(),
    source: 'TEST',
    processingStatus: 'PENDING',
    ...additionalData
  };

  return payload;
}

/**
 * Waits for market data to be processed by polling the API
 * @param securityId - Security identifier
 * @param marketDataType - Type of market data
 * @returns Promise that resolves to true when data is processed
 */
async function waitForMarketDataProcessing(securityId: string, marketDataType: string): Promise<boolean> {
  const checkDataProcessed = async () => {
    try {
      const endpoint = API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', securityId);
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        params: {
          type: marketDataType,
          latest: true
        }
      });
      
      return response.data && response.data.processingStatus === 'PROCESSED';
    } catch (error) {
      console.log(`Error checking processing status: ${error.message}`);
      return false;
    }
  };

  return waitForCondition(checkDataProcessed, TEST_TIMEOUTS.INTEGRATION);
}

describe('Market Data Ingestion Integration Tests', () => {
  let testData;
  
  beforeAll(() => {
    // Set Jest timeout for integration tests
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
    // Load test data
    testData = setupTestData();
  });

  test('should successfully ingest market data through REST API', async () => {
    // Create a test market data payload for a price update
    const testSecurity = testData.securities[0];
    const pricePayload = createTestMarketDataPayload(testSecurity.id, 'PRICE', {
      price: 150.75,
      currency: 'USD',
      priceType: 'CLOSE'
    });

    // Send a POST request to the market data endpoint
    const endpoint = API_ENDPOINTS.MARKET_DATA.PRICES;
    const response = await axios.post(`${API_BASE_URL}${endpoint}`, pricePayload);

    // Verify the response status is 200
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.id).toBeDefined();

    // Wait for the market data to be processed
    const processed = await waitForMarketDataProcessing(testSecurity.id, 'PRICE');
    expect(processed).toBe(true);

    // Fetch the processed market data
    const getEndpoint = API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', testSecurity.id);
    const getResponse = await axios.get(`${API_BASE_URL}${getEndpoint}`, {
      params: {
        type: 'PRICE',
        latest: true
      }
    });

    // Verify the data was correctly stored and processed
    expect(getResponse.status).toBe(200);
    expect(getResponse.data).toBeDefined();
    expect(getResponse.data.securityId).toBe(testSecurity.id);
    expect(getResponse.data.price).toBe(150.75);
    expect(getResponse.data.currency).toBe('USD');
    expect(getResponse.data.priceType).toBe('CLOSE');
    expect(getResponse.data.processingStatus).toBe('PROCESSED');
    expect(getResponse.data.source).toBe('TEST');
  });

  test('should handle batch upload of market data files', async () => {
    // Create a test market data CSV file
    const csvData = [
      'securityId,marketDataType,price,currency,priceType,source,eventTime',
      `${testData.securities[0].id},PRICE,155.50,USD,CLOSE,TEST,${new Date().toISOString()}`,
      `${testData.securities[1].id},PRICE,95.25,USD,CLOSE,TEST,${new Date().toISOString()}`,
      `${testData.securities[2].id},PRICE,220.00,USD,CLOSE,TEST,${new Date().toISOString()}`
    ].join('\n');

    const tempFilePath = path.join(__dirname, 'temp-market-data.csv');
    await fs.writeFile(tempFilePath, csvData);

    try {
      // Create a FormData object with the file
      const formData = new FormData();
      formData.append('file', fs.createReadStream(tempFilePath));

      // Send a POST request to the batch upload endpoint
      const endpoint = `${API_ENDPOINTS.MARKET_DATA.PRICES}/batch`;
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
        headers: formData.getHeaders()
      });

      // Verify the response status is 200 and contains a batchId
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.batchId).toBeDefined();

      // Wait for batch processing to complete
      const batchId = response.data.batchId;
      const checkBatchCompleted = async () => {
        try {
          const batchStatusEndpoint = `${API_ENDPOINTS.MARKET_DATA.PRICES}/batch/${batchId}`;
          const statusResponse = await axios.get(`${API_BASE_URL}${batchStatusEndpoint}`);
          return statusResponse.data && statusResponse.data.status === 'COMPLETED';
        } catch (error) {
          console.log(`Error checking batch status: ${error.message}`);
          return false;
        }
      };

      const batchProcessed = await waitForCondition(checkBatchCompleted, TEST_TIMEOUTS.INTEGRATION);
      expect(batchProcessed).toBe(true);

      // Verify all records in the batch were processed correctly
      for (let i = 0; i < 3; i++) {
        const securityId = testData.securities[i].id;
        const getEndpoint = API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', securityId);
        const getResponse = await axios.get(`${API_BASE_URL}${getEndpoint}`, {
          params: {
            type: 'PRICE',
            latest: true
          }
        });

        expect(getResponse.status).toBe(200);
        expect(getResponse.data).toBeDefined();
        expect(getResponse.data.securityId).toBe(securityId);
        expect(getResponse.data.processingStatus).toBe('PROCESSED');
      }
    } finally {
      // Clean up the temporary file
      await fs.remove(tempFilePath);
    }
  });

  test('should retrieve market data within a time range', async () => {
    // Define start and end times for the query
    const endTime = new Date();
    const startTime = new Date(endTime);
    startTime.setHours(startTime.getHours() - 24); // 24 hours ago

    // Send a GET request to the time range endpoint with parameters
    const securityId = testData.securities[0].id;
    const endpoint = API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', securityId);
    const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
      params: {
        type: 'PRICE',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }
    });

    // Verify the response status is 200
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);

    // Verify the returned data is within the specified time range
    response.data.forEach(item => {
      const itemTime = new Date(item.eventTime);
      expect(itemTime >= startTime).toBe(true);
      expect(itemTime <= endTime).toBe(true);
      expect(item.securityId).toBe(securityId);
    });
  });

  test('should retrieve latest prices for multiple securities', async () => {
    // Create a list of security IDs
    const securityIds = testData.securities.slice(0, 3).map(security => security.id);

    // Send a POST request to the latest prices endpoint
    const endpoint = `${API_ENDPOINTS.MARKET_DATA.PRICES}/latest`;
    const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
      securityIds,
      marketDataType: 'PRICE'
    });

    // Verify the response status is 200
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);

    // Verify the response contains price data for all requested securities
    expect(response.data.length).toBe(securityIds.length);
    
    // Create a map of security IDs from the response for easy lookup
    const responseMap = new Map(response.data.map(item => [item.securityId, item]));

    // Verify each security ID is present in the response
    securityIds.forEach(id => {
      expect(responseMap.has(id)).toBe(true);
      const item = responseMap.get(id);
      expect(item.marketDataType).toBe('PRICE');
      expect(item.price).toBeDefined();
      expect(item.currency).toBeDefined();
      expect(item.processingStatus).toBe('PROCESSED');
    });
  });

  test('should handle different market data types (price, NAV, volatility)', async () => {
    const testSecurity = testData.securities[0];
    const basketSecurity = testData.securities.find(sec => sec.securityType === 'ETF' || sec.securityType === 'INDEX');
    
    // Skip test if we don't have a basket security
    if (!basketSecurity) {
      console.warn('Skipping NAV test as no ETF or INDEX security found in test data');
      return;
    }
    
    // Create test market data payloads for different types
    const pricePayload = createTestMarketDataPayload(testSecurity.id, 'PRICE', {
      price: 152.50,
      currency: 'USD',
      priceType: 'CLOSE'
    });

    const navPayload = createTestMarketDataPayload(basketSecurity.id, 'NAV', {
      nav: 35.75,
      currency: 'USD',
      navType: 'EOD'
    });

    const volatilityPayload = createTestMarketDataPayload(testSecurity.id, 'VOLATILITY', {
      term: 30, // 30 days
      volatility: 0.15, // 15%
      calculationType: 'HISTORICAL'
    });

    // Send POST requests for each data type
    const priceEndpoint = API_ENDPOINTS.MARKET_DATA.PRICES;
    const priceResponse = await axios.post(`${API_BASE_URL}${priceEndpoint}`, pricePayload);
    expect(priceResponse.status).toBe(200);

    const navEndpoint = API_ENDPOINTS.MARKET_DATA.BASKET_NAVS;
    const navResponse = await axios.post(`${API_BASE_URL}${navEndpoint}`, navPayload);
    expect(navResponse.status).toBe(200);

    const volEndpoint = API_ENDPOINTS.MARKET_DATA.VOLATILITY_CURVES;
    const volResponse = await axios.post(`${API_BASE_URL}${volEndpoint}`, volatilityPayload);
    expect(volResponse.status).toBe(200);

    // Wait for each type to be processed
    const priceProcessed = await waitForMarketDataProcessing(testSecurity.id, 'PRICE');
    expect(priceProcessed).toBe(true);

    // Custom wait functions for NAV and volatility since they have different endpoints
    const waitForNavProcessing = async () => {
      try {
        const endpoint = API_ENDPOINTS.MARKET_DATA.BASKET_NAV_BY_ID.replace(':basketId', basketSecurity.id);
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          params: { latest: true }
        });
        return response.data && response.data.processingStatus === 'PROCESSED';
      } catch (error) {
        console.log(`Error checking NAV processing: ${error.message}`);
        return false;
      }
    };

    const waitForVolProcessing = async () => {
      try {
        const endpoint = API_ENDPOINTS.MARKET_DATA.VOLATILITY_CURVES;
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          params: { 
            securityId: testSecurity.id,
            latest: true 
          }
        });
        return response.data && response.data.processingStatus === 'PROCESSED';
      } catch (error) {
        console.log(`Error checking volatility processing: ${error.message}`);
        return false;
      }
    };

    const navProcessed = await waitForCondition(waitForNavProcessing, TEST_TIMEOUTS.INTEGRATION);
    expect(navProcessed).toBe(true);

    const volProcessed = await waitForCondition(waitForVolProcessing, TEST_TIMEOUTS.INTEGRATION);
    expect(volProcessed).toBe(true);

    // Fetch and verify each type of data
    // Price verification
    const getPriceEndpoint = API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', testSecurity.id);
    const getPriceResponse = await axios.get(`${API_BASE_URL}${getPriceEndpoint}`, {
      params: { type: 'PRICE', latest: true }
    });

    expect(getPriceResponse.status).toBe(200);
    expect(getPriceResponse.data.price).toBe(152.50);
    expect(getPriceResponse.data.currency).toBe('USD');

    // NAV verification
    const getNavEndpoint = API_ENDPOINTS.MARKET_DATA.BASKET_NAV_BY_ID.replace(':basketId', basketSecurity.id);
    const getNavResponse = await axios.get(`${API_BASE_URL}${getNavEndpoint}`, {
      params: { latest: true }
    });

    expect(getNavResponse.status).toBe(200);
    expect(getNavResponse.data.nav).toBe(35.75);
    expect(getNavResponse.data.currency).toBe('USD');
    expect(getNavResponse.data.navType).toBe('EOD');

    // Volatility verification
    const getVolEndpoint = API_ENDPOINTS.MARKET_DATA.VOLATILITY_CURVES;
    const getVolResponse = await axios.get(`${API_BASE_URL}${getVolEndpoint}`, {
      params: { 
        securityId: testSecurity.id,
        latest: true 
      }
    });

    expect(getVolResponse.status).toBe(200);
    expect(getVolResponse.data.term).toBe(30);
    expect(getVolResponse.data.volatility).toBe(0.15);
    expect(getVolResponse.data.calculationType).toBe('HISTORICAL');
  });

  test('should handle market data from different sources', async () => {
    const testSecurity = testData.securities[0];
    
    // Create test market data payloads from different sources
    const reutersPayload = createTestMarketDataPayload(testSecurity.id, 'PRICE', {
      price: 153.25,
      currency: 'USD',
      priceType: 'CLOSE',
      source: 'REUTERS'
    });

    const bloombergPayload = createTestMarketDataPayload(testSecurity.id, 'PRICE', {
      price: 153.30,
      currency: 'USD',
      priceType: 'CLOSE',
      source: 'BLOOMBERG'
    });

    const markitPayload = createTestMarketDataPayload(testSecurity.id, 'PRICE', {
      price: 153.27,
      currency: 'USD',
      priceType: 'CLOSE',
      source: 'MARKIT'
    });

    // Send POST requests for each source
    const endpoint = API_ENDPOINTS.MARKET_DATA.PRICES;
    const reutersResponse = await axios.post(`${API_BASE_URL}${endpoint}`, reutersPayload);
    expect(reutersResponse.status).toBe(200);

    const bloombergResponse = await axios.post(`${API_BASE_URL}${endpoint}`, bloombergPayload);
    expect(bloombergResponse.status).toBe(200);

    const markitResponse = await axios.post(`${API_BASE_URL}${endpoint}`, markitPayload);
    expect(markitResponse.status).toBe(200);

    // Wait for data from each source to be processed
    for (const source of ['REUTERS', 'BLOOMBERG', 'MARKIT']) {
      const waitForSource = async () => {
        try {
          const getEndpoint = API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', testSecurity.id);
          const response = await axios.get(`${API_BASE_URL}${getEndpoint}`, {
            params: {
              type: 'PRICE',
              source: source,
              latest: true
            }
          });
          return response.data && response.data.processingStatus === 'PROCESSED';
        } catch (error) {
          console.log(`Error checking source processing for ${source}: ${error.message}`);
          return false;
        }
      };

      const processed = await waitForCondition(waitForSource, TEST_TIMEOUTS.INTEGRATION);
      expect(processed).toBe(true);
    }

    // Fetch and verify data from each source
    const getEndpoint = API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', testSecurity.id);
    
    // Verify Reuters data
    const reutersGetResponse = await axios.get(`${API_BASE_URL}${getEndpoint}`, {
      params: {
        type: 'PRICE',
        source: 'REUTERS',
        latest: true
      }
    });
    expect(reutersGetResponse.status).toBe(200);
    expect(reutersGetResponse.data.price).toBe(153.25);
    expect(reutersGetResponse.data.source).toBe('REUTERS');

    // Verify Bloomberg data
    const bloombergGetResponse = await axios.get(`${API_BASE_URL}${getEndpoint}`, {
      params: {
        type: 'PRICE',
        source: 'BLOOMBERG',
        latest: true
      }
    });
    expect(bloombergGetResponse.status).toBe(200);
    expect(bloombergGetResponse.data.price).toBe(153.30);
    expect(bloombergGetResponse.data.source).toBe('BLOOMBERG');

    // Verify MarkIT data
    const markitGetResponse = await axios.get(`${API_BASE_URL}${getEndpoint}`, {
      params: {
        type: 'PRICE',
        source: 'MARKIT',
        latest: true
      }
    });
    expect(markitGetResponse.status).toBe(200);
    expect(markitGetResponse.data.price).toBe(153.27);
    expect(markitGetResponse.data.source).toBe('MARKIT');
  });

  test('should receive real-time market data updates via WebSocket', async () => {
    // Skip test if running in CI environment without WebSocket support
    if (process.env.CI === 'true') {
      console.warn('Skipping WebSocket test in CI environment');
      return;
    }

    // Create a WebSocket connection to the market data stream
    const wsUrl = `ws://${API_BASE_URL.replace('http://', '')}/ws/market-data`;
    const ws = new WebSocket(wsUrl);
    
    // Wait for connection to establish
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    try {
      const testSecurity = testData.securities[0];
      
      // Subscribe to updates for specific securities
      const subscriptionMessage = {
        action: 'SUBSCRIBE',
        securityIds: [testSecurity.id],
        marketDataTypes: ['PRICE']
      };
      ws.send(JSON.stringify(subscriptionMessage));

      // Wait briefly for subscription to be processed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create a promise that will resolve when we receive the WebSocket message
      const messagePromise = new Promise<any>((resolve) => {
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.securityId === testSecurity.id && message.marketDataType === 'PRICE') {
              resolve(message);
            }
          } catch (error) {
            // Ignore parsing errors
            console.log(`Error parsing WebSocket message: ${error.message}`);
          }
        });
      });

      // Trigger a market data update through the REST API
      const pricePayload = createTestMarketDataPayload(testSecurity.id, 'PRICE', {
        price: 154.50,
        currency: 'USD',
        priceType: 'LIVE'
      });
      
      const endpoint = API_ENDPOINTS.MARKET_DATA.PRICES;
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, pricePayload);
      expect(response.status).toBe(200);

      // Wait for the WebSocket message with a timeout
      const receivedMessage = await Promise.race([
        messagePromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
      ]);

      // Verify we received a message and it matches what we expect
      expect(receivedMessage).not.toBeNull();
      expect(receivedMessage.securityId).toBe(testSecurity.id);
      expect(receivedMessage.marketDataType).toBe('PRICE');
      expect(receivedMessage.price).toBe(154.50);
      expect(receivedMessage.currency).toBe('USD');
      expect(receivedMessage.priceType).toBe('LIVE');
    } finally {
      // Close the WebSocket connection
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  });

  test('should meet performance requirements for market data processing', async () => {
    // Create a batch of market data updates (100+ records)
    const batchSize = 100;
    const securityIds = testData.securities.slice(0, Math.min(batchSize, testData.securities.length));
    const marketDataPayloads = [];
    
    for (let i = 0; i < batchSize; i++) {
      // Use modulo to cycle through securities if we have fewer than batchSize
      const security = securityIds[i % securityIds.length];
      
      // Create a payload with randomized price
      const price = 100 + Math.random() * 100; // Random price between 100 and 200
      const payload = createTestMarketDataPayload(security.id, 'PRICE', {
        price: parseFloat(price.toFixed(2)),
        currency: 'USD',
        priceType: 'LIVE'
      });
      
      marketDataPayloads.push(payload);
    }

    // Function to test market data processing performance
    const processBatch = async () => {
      // Send the batch as one request
      const endpoint = `${API_ENDPOINTS.MARKET_DATA.PRICES}/batch`;
      await axios.post(`${API_BASE_URL}${endpoint}`, { items: marketDataPayloads });
      
      // Poll to check if a sample of items are processed
      const sampleSize = 5;
      const sampleIndices = Array.from({ length: sampleSize }, () => 
        Math.floor(Math.random() * marketDataPayloads.length)
      );
      
      for (const idx of sampleIndices) {
        const payload = marketDataPayloads[idx];
        await waitForMarketDataProcessing(payload.securityId, 'PRICE');
      }
      
      return true;
    };

    // Use the validatePerformance function from testUtils
    const perfResult = await validatePerformance(
      processBatch,
      [],
      PERFORMANCE_THRESHOLDS.EVENT_PROCESSING * batchSize
    );

    // Log performance metrics
    console.log(`Batch size: ${batchSize}`);
    console.log(`Total execution time: ${perfResult.executionTime}ms`);
    console.log(`Average time per event: ${(perfResult.executionTime / batchSize).toFixed(2)}ms`);
    console.log(`Events per second: ${(batchSize / (perfResult.executionTime / 1000)).toFixed(2)}`);

    // Verify performance meets requirements
    // Note: This is a simplified test and may not truly validate the 300,000 events/sec requirement
    // Production validation would need more sophisticated testing on appropriate hardware
    expect(perfResult.success).toBe(true);
  });

  test('should handle validation errors gracefully', async () => {
    // Create an invalid market data payload (missing required fields)
    const invalidPayload = {
      // Missing securityId
      marketDataType: 'PRICE',
      price: 100.00,
      currency: 'USD'
    };

    // Send a POST request with the invalid data
    try {
      const endpoint = API_ENDPOINTS.MARKET_DATA.PRICES;
      await axios.post(`${API_BASE_URL}${endpoint}`, invalidPayload);
      // If we reach here, the request didn't fail as expected
      fail('Expected request to fail with validation error');
    } catch (error) {
      // Verify the response status is 400
      expect(error.response).toBeDefined();
      expect(error.response.status).toBe(400);
      
      // Verify the response contains appropriate error details
      expect(error.response.data).toBeDefined();
      expect(error.response.data.error).toBeDefined();
      expect(error.response.data.error.code).toBe('VALIDATION_ERROR');
      expect(error.response.data.error.details).toContain('securityId');
    }

    // Create another invalid payload (invalid data type)
    const invalidTypePayload = {
      securityId: testData.securities[0].id,
      marketDataType: 'PRICE',
      price: 'not-a-number', // Should be a number
      currency: 'USD'
    };

    // Send a POST request with the invalid type
    try {
      const endpoint = API_ENDPOINTS.MARKET_DATA.PRICES;
      await axios.post(`${API_BASE_URL}${endpoint}`, invalidTypePayload);
      // If we reach here, the request didn't fail as expected
      fail('Expected request to fail with validation error');
    } catch (error) {
      // Verify the response status is 400
      expect(error.response).toBeDefined();
      expect(error.response.status).toBe(400);
      
      // Verify the response contains appropriate error details
      expect(error.response.data).toBeDefined();
      expect(error.response.data.error).toBeDefined();
      expect(error.response.data.error.code).toBe('VALIDATION_ERROR');
      expect(error.response.data.error.details).toContain('price');
    }

    // Verify no invalid data was stored in the system
    const endpoint = API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', testData.securities[0].id);
    const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
      params: {
        type: 'PRICE',
        latest: true
      }
    });

    // The latest price should still be valid (from previous tests)
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(typeof response.data.price).toBe('number'); // Price should be a number, not 'not-a-number'
  });

  test('should handle market-specific data correctly', async () => {
    // Create market data payloads for different markets (US, Japan, Taiwan)
    const usSecurity = testData.securities.find(sec => sec.market === 'US');
    const jpSecurity = testData.securities.find(sec => sec.market === 'JP');
    const twSecurity = testData.securities.find(sec => sec.market === 'TW');
    
    // Skip test if we don't have securities for all markets
    if (!usSecurity || !jpSecurity || !twSecurity) {
      console.warn('Skipping market-specific test due to missing test securities for US, JP, or TW markets');
      return;
    }

    // Create market-specific payloads
    const usPayload = createTestMarketDataPayload(usSecurity.id, 'PRICE', {
      price: 150.00,
      currency: 'USD',
      priceType: 'CLOSE',
      exchangeCode: 'NYSE',
      marketSpecificData: {
        regulations: ['SEC', 'FINRA']
      }
    });

    const jpPayload = createTestMarketDataPayload(jpSecurity.id, 'PRICE', {
      price: 15000.00,
      currency: 'JPY',
      priceType: 'CLOSE',
      exchangeCode: 'TSE',
      marketSpecificData: {
        regulations: ['FSA'],
        settlementType: 'QUANTO'
      }
    });

    const twPayload = createTestMarketDataPayload(twSecurity.id, 'PRICE', {
      price: 350.00,
      currency: 'TWD',
      priceType: 'CLOSE',
      exchangeCode: 'TWSE',
      marketSpecificData: {
        regulations: ['FSC'],
        borrowRestriction: true
      }
    });

    // Send POST requests for each market
    const endpoint = API_ENDPOINTS.MARKET_DATA.PRICES;
    const usResponse = await axios.post(`${API_BASE_URL}${endpoint}`, usPayload);
    expect(usResponse.status).toBe(200);

    const jpResponse = await axios.post(`${API_BASE_URL}${endpoint}`, jpPayload);
    expect(jpResponse.status).toBe(200);

    const twResponse = await axios.post(`${API_BASE_URL}${endpoint}`, twPayload);
    expect(twResponse.status).toBe(200);

    // Wait for each market's data to be processed
    const usProcessed = await waitForMarketDataProcessing(usSecurity.id, 'PRICE');
    expect(usProcessed).toBe(true);

    const jpProcessed = await waitForMarketDataProcessing(jpSecurity.id, 'PRICE');
    expect(jpProcessed).toBe(true);

    const twProcessed = await waitForMarketDataProcessing(twSecurity.id, 'PRICE');
    expect(twProcessed).toBe(true);

    // Fetch and verify market-specific fields
    // US market data
    const usEndpoint = API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', usSecurity.id);
    const usGetResponse = await axios.get(`${API_BASE_URL}${usEndpoint}`, {
      params: {
        type: 'PRICE',
        latest: true
      }
    });
    expect(usGetResponse.status).toBe(200);
    expect(usGetResponse.data.price).toBe(150.00);
    expect(usGetResponse.data.currency).toBe('USD');
    expect(usGetResponse.data.exchangeCode).toBe('NYSE');
    expect(usGetResponse.data.marketSpecificData).toBeDefined();
    expect(usGetResponse.data.marketSpecificData.regulations).toContain('SEC');

    // Japan market data
    const jpEndpoint = API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', jpSecurity.id);
    const jpGetResponse = await axios.get(`${API_BASE_URL}${jpEndpoint}`, {
      params: {
        type: 'PRICE',
        latest: true
      }
    });
    expect(jpGetResponse.status).toBe(200);
    expect(jpGetResponse.data.price).toBe(15000.00);
    expect(jpGetResponse.data.currency).toBe('JPY');
    expect(jpGetResponse.data.exchangeCode).toBe('TSE');
    expect(jpGetResponse.data.marketSpecificData).toBeDefined();
    expect(jpGetResponse.data.marketSpecificData.regulations).toContain('FSA');
    expect(jpGetResponse.data.marketSpecificData.settlementType).toBe('QUANTO');

    // Taiwan market data
    const twEndpoint = API_ENDPOINTS.MARKET_DATA.PRICE_BY_SECURITY.replace(':securityId', twSecurity.id);
    const twGetResponse = await axios.get(`${API_BASE_URL}${twEndpoint}`, {
      params: {
        type: 'PRICE',
        latest: true
      }
    });
    expect(twGetResponse.status).toBe(200);
    expect(twGetResponse.data.price).toBe(350.00);
    expect(twGetResponse.data.currency).toBe('TWD');
    expect(twGetResponse.data.exchangeCode).toBe('TWSE');
    expect(twGetResponse.data.marketSpecificData).toBeDefined();
    expect(twGetResponse.data.marketSpecificData.regulations).toContain('FSC');
    expect(twGetResponse.data.marketSpecificData.borrowRestriction).toBe(true);
  });
});