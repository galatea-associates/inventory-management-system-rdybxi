import axios from 'axios'; // v1.4.0
import { loadTestData } from '../../common/testUtils';
import { 
  API_BASE_URL, 
  API_ENDPOINTS,
  TEST_TIMEOUTS
} from '../../common/constants';

/**
 * Sets up test data for trade data integration tests
 * @returns Object containing test trade data
 */
function setupTestData() {
  // Load securities test data from fixture files
  const securities = loadTestData('./src/test/fixtures/securities/securities.json');
  
  // Load counterparties test data from fixture files
  const counterparties = loadTestData('./src/test/fixtures/counterparties/counterparties.json');
  
  // Create sample trade data objects for testing
  const sampleTrades = {
    validTrade: {
      tradeId: 'TR123456',
      securityId: securities[0].externalIds.REUTERS,
      bookId: 'EQUITY-01',
      counterpartyId: counterparties[0].externalIds.DTCC,
      quantity: 1000,
      price: 150.25,
      tradeDate: '2023-06-15',
      tradeTime: '09:30:00',
      side: 'BUY',
      status: 'NEW'
    },
    invalidTrade: {
      // Missing required fields
      tradeId: 'TR123457',
      securityId: securities[0].externalIds.REUTERS
    },
    duplicateTrade: {
      tradeId: 'TR123456', // Same ID as validTrade
      securityId: securities[0].externalIds.REUTERS,
      bookId: 'EQUITY-01',
      counterpartyId: counterparties[0].externalIds.DTCC,
      quantity: 1000,
      price: 150.25,
      tradeDate: '2023-06-15',
      tradeTime: '09:30:00',
      side: 'BUY',
      status: 'NEW'
    },
    usTrade: {
      tradeId: 'US123456',
      securityId: securities.find(s => s.market === 'US').externalIds.REUTERS,
      bookId: 'EQUITY-01',
      counterpartyId: counterparties[0].externalIds.DTCC,
      quantity: 1000,
      price: 150.25,
      tradeDate: '2023-06-15',
      tradeTime: '09:30:00',
      side: 'BUY',
      status: 'NEW',
      market: 'US'
    },
    jpTrade: {
      tradeId: 'JP123456',
      securityId: securities.find(s => s.market === 'JP').externalIds.REUTERS,
      bookId: 'EQUITY-02',
      counterpartyId: counterparties[1].externalIds.DTCC,
      quantity: 500,
      price: 2500.50,
      tradeDate: '2023-06-15',
      tradeTime: '09:30:00',
      side: 'BUY',
      status: 'NEW',
      market: 'JP',
      settlement: 'QUANTO' // Special handling for quanto settlements
    },
    twTrade: {
      tradeId: 'TW123456',
      securityId: securities.find(s => s.market === 'TW').externalIds.REUTERS,
      bookId: 'EQUITY-03',
      counterpartyId: counterparties[2].externalIds.DTCC,
      quantity: 2000,
      price: 350.75,
      tradeDate: '2023-06-15',
      tradeTime: '09:30:00',
      side: 'BUY',
      status: 'NEW',
      market: 'TW'
    },
    failingTrade: {
      tradeId: 'FL123456',
      securityId: 'INVALID-SECURITY', // This will cause a failure
      bookId: 'EQUITY-01',
      counterpartyId: counterparties[0].externalIds.DTCC,
      quantity: 1000,
      price: 150.25,
      tradeDate: '2023-06-15',
      tradeTime: '09:30:00',
      side: 'BUY',
      status: 'NEW'
    }
  };
  
  return {
    securities,
    counterparties,
    sampleTrades
  };
}

/**
 * Creates a single trade data object for testing
 * @param overrides - Overrides for default trade data
 * @returns Trade data object
 */
function createSingleTradeData(overrides = {}) {
  // Create a default trade data object with required fields
  const defaultTrade = {
    tradeId: `TR${Date.now()}`,
    securityId: 'AAPL.O',
    bookId: 'EQUITY-01',
    counterpartyId: 'CP123456',
    quantity: 1000,
    price: 150.25,
    tradeDate: new Date().toISOString().split('T')[0],
    tradeTime: new Date().toISOString().split('T')[1].substring(0, 8),
    side: 'BUY',
    status: 'NEW'
  };
  
  // Apply any provided overrides to the default object
  return {
    ...defaultTrade,
    ...overrides
  };
}

/**
 * Creates a batch of trade data objects for testing
 * @param count - Number of trade objects to create
 * @returns Array of trade data objects
 */
function createBatchTradeData(count = 10) {
  const trades = [];
  
  // Loop 'count' times to create multiple trade data objects
  for (let i = 0; i < count; i++) {
    trades.push(createSingleTradeData({
      tradeId: `TR${Date.now()}-${i}`,
      quantity: 1000 + (i * 100),
      price: 150.25 + (i * 0.5)
    }));
  }
  
  return trades;
}

describe('Trade Data Ingestion Integration Tests', () => {
  let testData;
  
  beforeAll(() => {
    // Initialize test data using setupTestData()
    testData = setupTestData();
    
    // Configure axios with base URL and headers
    axios.defaults.baseURL = API_BASE_URL;
    axios.defaults.headers.common['Content-Type'] = 'application/json';
  });
  
  afterAll(() => {
    // Clean up any test data created during tests
    // This might involve deleting test trades if they're not automatically cleaned up
  });
  
  test('should successfully process a single trade', async () => {
    // Create a single trade data object using createSingleTradeData()
    const tradeData = createSingleTradeData();
    
    // Send a POST request to the trade data endpoint
    const response = await axios.post(
      API_ENDPOINTS.TRADE_DATA.TRADES, 
      tradeData
    );
    
    // Verify the response status is 200
    expect(response.status).toBe(200);
    
    // Verify the response contains the processed trade data
    expect(response.data).toBeDefined();
    expect(response.data.tradeId).toBe(tradeData.tradeId);
    
    // Verify the trade has been marked as processed
    expect(response.data.processed).toBe(true);
    
    // Verify the security reference has been resolved
    expect(response.data.security).toBeDefined();
    expect(response.data.security.internalId).toBeDefined();
    
    // Verify the counterparty reference has been resolved
    expect(response.data.counterparty).toBeDefined();
    expect(response.data.counterparty.internalId).toBeDefined();
    
    // Verify the settlement date has been calculated
    expect(response.data.settlementDate).toBeDefined();
  }, TEST_TIMEOUTS.INTEGRATION);
  
  test('should reject invalid trade data', async () => {
    // Create an invalid trade data object missing required fields
    const invalidTradeData = {
      tradeId: `TR${Date.now()}`,
      // Missing other required fields
    };
    
    // Send a POST request to the trade data endpoint
    try {
      await axios.post(
        API_ENDPOINTS.TRADE_DATA.TRADES, 
        invalidTradeData
      );
      
      // Should not reach here
      fail('Request should have failed with a 400 error');
    } catch (error) {
      // Verify the response status is 400
      expect(error.response).toBeDefined();
      expect(error.response.status).toBe(400);
      
      // Verify the response contains appropriate error messages
      expect(error.response.data.errors).toBeDefined();
      expect(error.response.data.errors.length).toBeGreaterThan(0);
      expect(error.response.data.errors.some(e => e.includes('securityId'))).toBe(true);
      expect(error.response.data.errors.some(e => e.includes('bookId'))).toBe(true);
      expect(error.response.data.errors.some(e => e.includes('quantity'))).toBe(true);
    }
  }, TEST_TIMEOUTS.INTEGRATION);
  
  test('should successfully process a batch of trades', async () => {
    // Create a batch of trade data objects using createBatchTradeData()
    const batchSize = 25;
    const batchTradeData = createBatchTradeData(batchSize);
    
    // Send a POST request to the trade data batch endpoint
    const response = await axios.post(
      API_ENDPOINTS.TRADE_DATA.BATCH, 
      { trades: batchTradeData }
    );
    
    // Verify the response status is 200
    expect(response.status).toBe(200);
    
    // Verify the response contains a batch ID
    expect(response.data).toBeDefined();
    expect(response.data.batchId).toBeDefined();
    
    // Poll the batch status endpoint until processing is complete
    const batchId = response.data.batchId;
    let batchStatus;
    let maxRetries = 30;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      const statusResponse = await axios.get(
        `${API_ENDPOINTS.TRADE_DATA.BATCH_STATUS}/${batchId}`
      );
      
      batchStatus = statusResponse.data;
      
      if (batchStatus.status === 'COMPLETED') {
        break;
      }
      
      // Wait for 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      retryCount++;
    }
    
    // Verify all trades in the batch were processed successfully
    expect(batchStatus.status).toBe('COMPLETED');
    expect(batchStatus.processed).toBe(batchSize);
    expect(batchStatus.failed).toBe(0);
  }, TEST_TIMEOUTS.INTEGRATION);
  
  test('should detect and handle duplicate trades', async () => {
    // Create a trade data object
    const tradeData = createSingleTradeData();
    
    // Submit the trade data and verify successful processing
    const firstResponse = await axios.post(
      API_ENDPOINTS.TRADE_DATA.TRADES, 
      tradeData
    );
    
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.data.processed).toBe(true);
    
    // Submit the same trade data again
    try {
      await axios.post(
        API_ENDPOINTS.TRADE_DATA.TRADES, 
        tradeData
      );
      
      // Should not reach here
      fail('Request should have failed with a duplicate trade error');
    } catch (error) {
      // Verify the system correctly identifies it as a duplicate
      expect(error.response).toBeDefined();
      expect(error.response.status).toBe(409); // Conflict status code
      
      // Verify the duplicate handling policy is applied correctly
      expect(error.response.data.error).toBeDefined();
      expect(error.response.data.error).toContain('duplicate');
      expect(error.response.data.tradeId).toBe(tradeData.tradeId);
    }
  }, TEST_TIMEOUTS.INTEGRATION);
  
  test('should correctly calculate settlement dates based on market rules', async () => {
    // Create trade data objects for different markets (US, JP, TW)
    const { usTrade, jpTrade, twTrade } = testData.sampleTrades;
    
    // Submit each trade and verify successful processing
    const usTradeResponse = await axios.post(
      API_ENDPOINTS.TRADE_DATA.TRADES, 
      usTrade
    );
    
    const jpTradeResponse = await axios.post(
      API_ENDPOINTS.TRADE_DATA.TRADES, 
      jpTrade
    );
    
    const twTradeResponse = await axios.post(
      API_ENDPOINTS.TRADE_DATA.TRADES, 
      twTrade
    );
    
    // Verify T+2 settlement for US market
    const usTradeDate = new Date(usTrade.tradeDate);
    const expectedUsSettlementDate = new Date(usTradeDate);
    expectedUsSettlementDate.setDate(usTradeDate.getDate() + 2);
    
    const actualUsSettlementDate = new Date(usTradeResponse.data.settlementDate);
    expect(actualUsSettlementDate.toISOString().split('T')[0])
      .toBe(expectedUsSettlementDate.toISOString().split('T')[0]);
    
    // Verify T+2 settlement for JP market with special handling for quanto settlements
    const jpTradeDate = new Date(jpTrade.tradeDate);
    const expectedJpSettlementDate = new Date(jpTradeDate);
    expectedJpSettlementDate.setDate(jpTradeDate.getDate() + 2);
    
    const actualJpSettlementDate = new Date(jpTradeResponse.data.settlementDate);
    expect(actualJpSettlementDate.toISOString().split('T')[0])
      .toBe(expectedJpSettlementDate.toISOString().split('T')[0]);
    
    // Verify special handling for quanto settlements
    expect(jpTradeResponse.data.settlementDetails.quantoHandling).toBe(true);
    
    // Verify T+2 settlement for TW market
    const twTradeDate = new Date(twTrade.tradeDate);
    const expectedTwSettlementDate = new Date(twTradeDate);
    expectedTwSettlementDate.setDate(twTradeDate.getDate() + 2);
    
    const actualTwSettlementDate = new Date(twTradeResponse.data.settlementDate);
    expect(actualTwSettlementDate.toISOString().split('T')[0])
      .toBe(expectedTwSettlementDate.toISOString().split('T')[0]);
  }, TEST_TIMEOUTS.INTEGRATION);
  
  test('should handle reprocessing of failed trades', async () => {
    // Create trade data that will initially fail processing
    const { failingTrade } = testData.sampleTrades;
    
    // Submit the trade and verify it fails
    try {
      await axios.post(
        API_ENDPOINTS.TRADE_DATA.TRADES, 
        failingTrade
      );
      
      fail('Request should have failed with an invalid security error');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toContain('security');
    }
    
    // Fix the issue that caused the failure
    const fixedTrade = {
      ...failingTrade,
      securityId: testData.securities[0].externalIds.REUTERS // Valid security ID
    };
    
    // Call the reprocess endpoint
    const reprocessResponse = await axios.post(
      `${API_ENDPOINTS.TRADE_DATA.REPROCESS}/${failingTrade.tradeId}`,
      fixedTrade
    );
    
    // Verify the trade is successfully reprocessed
    expect(reprocessResponse.status).toBe(200);
    expect(reprocessResponse.data.processed).toBe(true);
    expect(reprocessResponse.data.tradeId).toBe(fixedTrade.tradeId);
    expect(reprocessResponse.data.security).toBeDefined();
    expect(reprocessResponse.data.security.internalId).toBeDefined();
  }, TEST_TIMEOUTS.INTEGRATION);
  
  test('should retrieve trades by batch ID', async () => {
    // Create and submit a batch of trades
    const batchSize = 5;
    const batchTradeData = createBatchTradeData(batchSize);
    
    const response = await axios.post(
      API_ENDPOINTS.TRADE_DATA.BATCH, 
      { trades: batchTradeData }
    );
    
    // Get the batch ID from the response
    const batchId = response.data.batchId;
    
    // Wait for batch processing to complete
    let maxRetries = 30;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      const statusResponse = await axios.get(
        `${API_ENDPOINTS.TRADE_DATA.BATCH_STATUS}/${batchId}`
      );
      
      if (statusResponse.data.status === 'COMPLETED') {
        break;
      }
      
      // Wait for 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      retryCount++;
    }
    
    // Call the get trades by batch ID endpoint
    const tradesResponse = await axios.get(
      `${API_ENDPOINTS.TRADE_DATA.TRADES_BY_BATCH}/${batchId}`
    );
    
    // Verify all trades in the batch are returned
    expect(tradesResponse.status).toBe(200);
    expect(tradesResponse.data).toBeDefined();
    expect(tradesResponse.data.trades).toBeDefined();
    expect(tradesResponse.data.trades.length).toBe(batchSize);
    
    // Verify the returned trades match the original batch
    const responseTradeIds = tradesResponse.data.trades.map(trade => trade.tradeId).sort();
    const batchTradeIds = batchTradeData.map(trade => trade.tradeId).sort();
    
    expect(responseTradeIds).toEqual(batchTradeIds);
  }, TEST_TIMEOUTS.INTEGRATION);
  
  test('should handle high volume of trades with acceptable performance', async () => {
    // Create a large batch of trade data (1000+ trades)
    const largeTradeCount = 1000;
    const startTime = performance.now();
    const largeTradeData = createBatchTradeData(largeTradeCount);
    
    // Measure the time taken to process the batch
    const response = await axios.post(
      API_ENDPOINTS.TRADE_DATA.BATCH, 
      { trades: largeTradeData }
    );
    
    const batchId = response.data.batchId;
    
    // Poll until processing is complete
    let maxRetries = 60;
    let retryCount = 0;
    let finalStatus;
    
    while (retryCount < maxRetries) {
      const statusResponse = await axios.get(
        `${API_ENDPOINTS.TRADE_DATA.BATCH_STATUS}/${batchId}`
      );
      
      finalStatus = statusResponse.data;
      
      if (finalStatus.status === 'COMPLETED') {
        break;
      }
      
      // Wait for 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      retryCount++;
    }
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    // Verify all trades are processed correctly
    expect(finalStatus.status).toBe('COMPLETED');
    expect(finalStatus.processed).toBe(largeTradeCount);
    expect(finalStatus.failed).toBe(0);
    
    // Verify the processing time meets performance requirements
    // Should be under 30 seconds for 1000 trades (averaging 33+ trades/second)
    expect(processingTime).toBeLessThan(30000);
    
    // Log performance metrics
    console.log(`Processed ${largeTradeCount} trades in ${processingTime.toFixed(0)}ms (${(largeTradeCount/(processingTime/1000)).toFixed(2)} trades/sec)`);
  }, TEST_TIMEOUTS.INTEGRATION);
});