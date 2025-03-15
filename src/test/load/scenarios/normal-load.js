import http from 'k6/http'; // k6 version: latest
import { sleep, check } from 'k6'; // k6 version: latest
import { group } from 'k6'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest

// Import helper functions
import { 
  authenticate, 
  setActiveEnvironment, 
  makeRequest, 
  randomSleep,
  generateLocateRequest,
  generateShortSellRequest
} from '../../performance/k6/lib/helpers.js';

// Import check functions
import {
  checkResponseStatus,
  checkResponseTime,
  checkLocateResponse,
  checkShortSellResponse,
  checkPositionResponse,
  checkInventoryResponse
} from '../../performance/k6/lib/checks.js';

// Import configuration
import {
  getLoadProfile,
  getThresholds
} from '../../performance/k6/config.js';

// Import test data
import testData from '../data/test-data.json';

// Define test configuration
export let options = {
  // Will be set in setup() based on config
};

/**
 * Setup function - initializes the test environment and authenticates with the API
 * Executed once before the test starts
 */
export function setup() {
  // Set the active environment based on environment variable or default to 'dev'
  const envTarget = __ENV.ENV_TARGET || 'dev';
  setActiveEnvironment(envTarget);
  
  // Authenticate with the API
  const username = __ENV.USERNAME || 'performance_test_user';
  const password = __ENV.PASSWORD || 'performance_test_password';
  const token = authenticate(username, password);
  
  // Get load profile for normal load
  const loadProfile = getLoadProfile('apiLoad', 'normal');
  const thresholds = getThresholds('apiLoad');
  
  // Set up test options with SLA thresholds
  options = {
    scenarios: {
      normalLoad: loadProfile
    },
    thresholds: {
      ...thresholds,
      // Ensure our critical SLAs are enforced
      'http_req_duration{operation:validateOrder}': ['p(99)<150'], // Short sell approval SLA
      'http_req_duration{operation:calculatePosition}': ['p(99)<200'], // Position calculation SLA
      'http_req_duration': ['p(95)<2000'], // General response time
      'http_req_failed': ['rate<0.01'] // Less than 1% error rate
    },
    tags: {
      name: 'normal-load',
      type: 'performance',
      environment: envTarget
    }
  };
  
  // Return data that will be passed to the default function
  return {
    token: token,
    testData: testData,
    scenarios: testData.scenarios,
    securities: testData.securities,
    counterparties: testData.counterparties,
    positions: testData.positions,
    locates: testData.locates
  };
}

/**
 * Main test function that executes the normal load test scenario
 * Executed for each virtual user
 */
export default function(data) {
  // Determine which scenario to run based on weighted distribution
  const scenarioWeights = {
    locate: 0.2,
    shortSell: 0.3,
    position: 0.2,
    inventory: 0.15,
    dataIngestion: 0.05,
    mixed: 0.1
  };
  
  // Get a random number between 0 and 1
  const rand = Math.random();
  let cumulativeWeight = 0;
  let selectedScenario = 'mixed'; // Default to mixed scenario
  
  // Select scenario based on weights
  for (const [scenario, weight] of Object.entries(scenarioWeights)) {
    cumulativeWeight += weight;
    if (rand <= cumulativeWeight) {
      selectedScenario = scenario;
      break;
    }
  }
  
  // Execute the selected scenario
  switch (selectedScenario) {
    case 'locate':
      executeLocateScenario(data);
      break;
    case 'shortSell':
      executeShortSellScenario(data);
      break;
    case 'position':
      executePositionScenario(data);
      break;
    case 'inventory':
      executeInventoryScenario(data);
      break;
    case 'dataIngestion':
      executeDataIngestionScenario(data);
      break;
    case 'mixed':
      executeMixedScenario(data);
      break;
    default:
      console.log(`Unknown scenario: ${selectedScenario}`);
      executeMixedScenario(data);
  }
}

/**
 * Executes the locate approval workflow test scenario
 */
function executeLocateScenario(testContext) {
  group("Locate Approval Workflow", function() {
    // Generate 1-3 locate requests
    const numRequests = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numRequests; i++) {
      // Generate a locate request using either random data or test data
      let locateRequest;
      
      if (Math.random() < 0.5 && testContext.scenarios.locateApproval) {
        // Use test data
        const scenarioData = testContext.scenarios.locateApproval;
        const securities = scenarioData.securities;
        const counterparties = scenarioData.counterparties;
        const aggregationUnits = scenarioData.aggregationUnits;
        
        // Pick random items from the arrays
        const securityId = securities[Math.floor(Math.random() * securities.length)];
        const counterpartyId = counterparties[Math.floor(Math.random() * counterparties.length)];
        const aggregationUnitId = aggregationUnits[Math.floor(Math.random() * aggregationUnits.length)];
        
        // Generate quantity within the specified range
        const minQty = scenarioData.requestQuantityRange[0];
        const maxQty = scenarioData.requestQuantityRange[1];
        const quantity = Math.round((minQty + Math.random() * (maxQty - minQty)) / 100) * 100;
        
        locateRequest = {
          requestId: `LOC-${new Date().toISOString().split('T')[0]}-${String(i + 1).padStart(5, '0')}`,
          securityId: securityId,
          clientId: counterpartyId,
          requestedQuantity: quantity,
          requestTimestamp: new Date().toISOString(),
          locateType: 'SHORT_SELL',
          swapCashIndicator: Math.random() > 0.5 ? 'SWAP' : 'CASH',
          aggregationUnitId: aggregationUnitId
        };
      } else {
        // Use the helper function
        locateRequest = generateLocateRequest();
      }
      
      // Submit the locate request
      const response = makeRequest('POST', '/api/v1/locates', JSON.stringify(locateRequest), {
        tags: { operation: 'submitLocate' }
      });
      
      // Check response
      checkResponseStatus(response, 200);
      checkResponseTime(response, 3000); // Allow up to 3s but expect faster responses
      checkLocateResponse(response);
      
      // Add a small wait to simulate user think time
      randomSleep(0.5, 2);
      
      // If the locate was approved, check inventory has been updated
      if (response.status === 200) {
        try {
          const responseData = JSON.parse(response.body);
          if (responseData.status === 'APPROVED') {
            // Query inventory for the security
            const inventoryResponse = makeRequest('GET', `/api/v1/inventory/for-loan?securityId=${locateRequest.securityId}`, null, {
              tags: { operation: 'checkInventory' }
            });
            
            // Check inventory response
            checkResponseStatus(inventoryResponse, 200);
            checkResponseTime(inventoryResponse, 3000);
            checkInventoryResponse(inventoryResponse);
          }
        } catch (e) {
          console.error(`Error processing locate response: ${e.message}`);
        }
      }
      
      // Add a wait between locate requests
      randomSleep(1, 3);
    }
  });
}

/**
 * Executes the short sell validation workflow test scenario
 */
function executeShortSellScenario(testContext) {
  group("Short Sell Validation Workflow", function() {
    // Generate 1-3 short sell requests
    const numRequests = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numRequests; i++) {
      // Generate a short sell request using either random data or test data
      let shortSellRequest;
      
      if (Math.random() < 0.5 && testContext.scenarios.shortSellValidation) {
        // Use test data
        const scenarioData = testContext.scenarios.shortSellValidation;
        const securities = scenarioData.securities;
        const counterparties = scenarioData.counterparties;
        const books = scenarioData.books;
        
        // Pick random items from the arrays
        const securityId = securities[Math.floor(Math.random() * securities.length)];
        const counterpartyId = counterparties[Math.floor(Math.random() * counterparties.length)];
        const bookId = books[Math.floor(Math.random() * books.length)];
        
        // Generate quantity within the specified range
        const minQty = scenarioData.orderQuantityRange[0];
        const maxQty = scenarioData.orderQuantityRange[1];
        const quantity = Math.round((minQty + Math.random() * (maxQty - minQty)) / 100) * 100;
        
        // Generate price within the range for the security
        let price = 100; // Default
        if (scenarioData.priceRanges && scenarioData.priceRanges[securityId]) {
          const priceRange = scenarioData.priceRanges[securityId];
          price = priceRange[0] + Math.random() * (priceRange[1] - priceRange[0]);
          price = parseFloat(price.toFixed(2));
        }
        
        shortSellRequest = {
          orderId: `ORD-${String(i + 1).padStart(5, '0')}`,
          securityId: securityId,
          counterpartyId: counterpartyId,
          quantity: quantity,
          side: 'SELL_SHORT',
          price: price,
          orderDate: new Date().toISOString().split('T')[0],
          bookId: bookId
        };
      } else {
        // Use the helper function
        shortSellRequest = generateShortSellRequest();
      }
      
      // Submit the short sell validation request - critical SLA of 150ms
      const response = makeRequest('POST', '/api/v1/orders/validate', JSON.stringify(shortSellRequest), {
        tags: { operation: 'validateOrder' },
        timeout: 5000 // Overall timeout higher than SLA for test reliability
      });
      
      // Check response - enforce critical SLA requirement of 150ms
      checkResponseStatus(response, 200);
      checkResponseTime(response, 150); // Critical SLA: 99% of short sell validations must complete within 150ms
      checkShortSellResponse(response);
      
      // Add a small wait to simulate user think time
      randomSleep(0.5, 1.5);
      
      // If the order was approved, check client and AU limits have been updated
      if (response.status === 200) {
        try {
          const responseData = JSON.parse(response.body);
          if (responseData.status === 'APPROVED') {
            // Query client limit
            const clientLimitResponse = makeRequest('GET', `/api/v1/limits/client/${shortSellRequest.counterpartyId}?securityId=${shortSellRequest.securityId}`, null, {
              tags: { operation: 'checkClientLimit' }
            });
            
            // Check client limit response
            checkResponseStatus(clientLimitResponse, 200);
            checkResponseTime(clientLimitResponse, 2000);
            
            // Query aggregation unit limit
            if (responseData.aggregationUnitId) {
              const auLimitResponse = makeRequest('GET', `/api/v1/limits/aggregation-unit/${responseData.aggregationUnitId}?securityId=${shortSellRequest.securityId}`, null, {
                tags: { operation: 'checkAULimit' }
              });
              
              // Check AU limit response
              checkResponseStatus(auLimitResponse, 200);
              checkResponseTime(auLimitResponse, 2000);
            }
          }
        } catch (e) {
          console.error(`Error processing short sell response: ${e.message}`);
        }
      }
      
      // Add a wait between short sell requests
      randomSleep(1, 2);
    }
  });
}

/**
 * Executes the position calculation test scenario
 */
function executePositionScenario(testContext) {
  group("Position Calculation Workflow", function() {
    // Query positions for 1-3 securities
    const numSecurities = Math.floor(Math.random() * 3) + 1;
    const queriedSecurities = [];
    
    for (let i = 0; i < numSecurities; i++) {
      let securityId;
      let bookId;
      
      if (testContext.positions && testContext.positions.length > 0) {
        // Use a security from test data
        const positionIndex = Math.floor(Math.random() * testContext.positions.length);
        const position = testContext.positions[positionIndex];
        securityId = position.security.internalId;
        bookId = position.bookId;
      } else if (testContext.scenarios.positionCalculation) {
        // Use a security from scenario data
        const scenarioData = testContext.scenarios.positionCalculation;
        const securities = scenarioData.securities;
        const books = scenarioData.books;
        
        securityId = securities[Math.floor(Math.random() * securities.length)];
        bookId = books[Math.floor(Math.random() * books.length)];
      } else {
        // Generate random IDs
        securityId = `SEC-EQ-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
        bookId = `EQUITY-${String(Math.floor(Math.random() * 10) + 1).padStart(2, '0')}`;
      }
      
      // Query position - tag as "calculatePosition" for SLA monitoring
      const positionResponse = makeRequest('GET', `/api/v1/positions?securityId=${securityId}&bookId=${bookId}`, null, {
        tags: { operation: 'calculatePosition' }
      });
      
      // Check response - enforce 200ms end-to-end latency SLA
      checkResponseStatus(positionResponse, 200);
      checkResponseTime(positionResponse, 200); // 200ms SLA for position calculation
      checkPositionResponse(positionResponse);
      
      queriedSecurities.push({ securityId, bookId });
      
      // Add a small wait to simulate user think time
      randomSleep(0.5, 1.5);
    }
    
    // For one of the queried securities, simulate a trade that affects the position
    if (queriedSecurities.length > 0) {
      const securityToTrade = queriedSecurities[Math.floor(Math.random() * queriedSecurities.length)];
      
      let tradeRequest;
      if (testContext.scenarios.positionCalculation) {
        const scenarioData = testContext.scenarios.positionCalculation;
        const counterparties = scenarioData.counterparties;
        const tradeTypes = scenarioData.tradeTypes;
        const settlementDays = scenarioData.settlementDays;
        
        // Generate quantity within the specified range
        const minQty = scenarioData.tradeQuantityRange[0];
        const maxQty = scenarioData.tradeQuantityRange[1];
        const quantity = Math.round((minQty + Math.random() * (maxQty - minQty)) / 100) * 100;
        
        // Pick random values
        const counterpartyId = counterparties[Math.floor(Math.random() * counterparties.length)];
        const tradeType = tradeTypes[Math.floor(Math.random() * tradeTypes.length)];
        const settlementDay = settlementDays[Math.floor(Math.random() * settlementDays.length)];
        
        tradeRequest = {
          tradeId: `TR-${new Date().toISOString().split('T')[0]}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`,
          securityId: securityToTrade.securityId,
          bookId: securityToTrade.bookId,
          counterpartyId: counterpartyId,
          quantity: quantity,
          tradeType: tradeType,
          price: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
          tradeDate: new Date().toISOString().split('T')[0],
          settlementDate: (() => {
            const date = new Date();
            date.setDate(date.getDate() + settlementDay);
            return date.toISOString().split('T')[0];
          })()
        };
      } else {
        // Generate random trade
        tradeRequest = {
          tradeId: `TR-${new Date().toISOString().split('T')[0]}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`,
          securityId: securityToTrade.securityId,
          bookId: securityToTrade.bookId,
          counterpartyId: `CP-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`,
          quantity: Math.round(Math.random() * 5000) * (Math.random() > 0.5 ? 1 : -1),
          tradeType: Math.random() > 0.5 ? 'BUY' : 'SELL',
          price: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
          tradeDate: new Date().toISOString().split('T')[0],
          settlementDate: (() => {
            const date = new Date();
            date.setDate(date.getDate() + 2); // T+2 settlement
            return date.toISOString().split('T')[0];
          })()
        };
      }
      
      // Submit the trade
      const tradeResponse = makeRequest('POST', '/api/v1/trades', JSON.stringify(tradeRequest), {
        tags: { operation: 'submitTrade' }
      });
      
      // Check response
      checkResponseStatus(tradeResponse, 200);
      checkResponseTime(tradeResponse, 2000);
      
      // Add a wait to allow position calculation to process
      randomSleep(1, 2);
      
      // Query the position again to verify the update
      const updatedPositionResponse = makeRequest('GET', `/api/v1/positions?securityId=${securityToTrade.securityId}&bookId=${securityToTrade.bookId}`, null, {
        tags: { operation: 'calculatePosition' }
      });
      
      // Check response
      checkResponseStatus(updatedPositionResponse, 200);
      checkResponseTime(updatedPositionResponse, 200); // 200ms SLA for position calculation
      checkPositionResponse(updatedPositionResponse);
      
      // Query settlement ladder for the position
      const settlementLadderResponse = makeRequest('GET', `/api/v1/positions/settlement-ladder?securityId=${securityToTrade.securityId}&bookId=${securityToTrade.bookId}`, null, {
        tags: { operation: 'querySettlementLadder' }
      });
      
      // Check response
      checkResponseStatus(settlementLadderResponse, 200);
      checkResponseTime(settlementLadderResponse, 2000);
      
      // Add a wait between operations
      randomSleep(1, 2);
    }
  });
}

/**
 * Executes the inventory calculation test scenario
 */
function executeInventoryScenario(testContext) {
  group("Inventory Calculation Workflow", function() {
    // Query inventory for 1-3 securities
    const numSecurities = Math.floor(Math.random() * 3) + 1;
    const queriedSecurities = [];
    
    for (let i = 0; i < numSecurities; i++) {
      let securityId;
      
      if (testContext.inventories && testContext.inventories.length > 0) {
        // Use a security from test data
        const inventoryIndex = Math.floor(Math.random() * testContext.inventories.length);
        const inventory = testContext.inventories[inventoryIndex];
        securityId = inventory.security.internalId;
      } else if (testContext.scenarios.inventoryCalculation) {
        // Use a security from scenario data
        const scenarioData = testContext.scenarios.inventoryCalculation;
        const securities = scenarioData.securities;
        securityId = securities[Math.floor(Math.random() * securities.length)];
      } else {
        // Generate random ID
        securityId = `SEC-EQ-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
      }
      
      // Query inventory
      const inventoryResponse = makeRequest('GET', `/api/v1/inventory/for-loan?securityId=${securityId}`, null, {
        tags: { operation: 'calculateInventory' }
      });
      
      // Check response
      checkResponseStatus(inventoryResponse, 200);
      checkResponseTime(inventoryResponse, 3000);
      checkInventoryResponse(inventoryResponse);
      
      queriedSecurities.push(securityId);
      
      // Add a small wait to simulate user think time
      randomSleep(0.5, 1.5);
    }
    
    // For one of the queried securities, simulate a locate request that affects inventory
    if (queriedSecurities.length > 0) {
      const securityToLocate = queriedSecurities[Math.floor(Math.random() * queriedSecurities.length)];
      
      let locateRequest;
      if (testContext.scenarios.locateApproval) {
        // Use test data
        const scenarioData = testContext.scenarios.locateApproval;
        const counterparties = scenarioData.counterparties;
        const aggregationUnits = scenarioData.aggregationUnits;
        
        // Pick random items from the arrays
        const counterpartyId = counterparties[Math.floor(Math.random() * counterparties.length)];
        const aggregationUnitId = aggregationUnits[Math.floor(Math.random() * aggregationUnits.length)];
        
        // Generate quantity within the specified range
        const minQty = scenarioData.requestQuantityRange[0];
        const maxQty = scenarioData.requestQuantityRange[1];
        const quantity = Math.round((minQty + Math.random() * (maxQty - minQty)) / 100) * 100;
        
        locateRequest = {
          requestId: `LOC-${new Date().toISOString().split('T')[0]}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`,
          securityId: securityToLocate,
          clientId: counterpartyId,
          requestedQuantity: quantity,
          requestTimestamp: new Date().toISOString(),
          locateType: 'SHORT_SELL',
          swapCashIndicator: Math.random() > 0.5 ? 'SWAP' : 'CASH',
          aggregationUnitId: aggregationUnitId
        };
      } else {
        // Use the helper function with a specific securityId
        locateRequest = generateLocateRequest();
        locateRequest.securityId = securityToLocate;
      }
      
      // Submit the locate request
      const locateResponse = makeRequest('POST', '/api/v1/locates', JSON.stringify(locateRequest), {
        tags: { operation: 'submitLocate' }
      });
      
      // Check response
      checkResponseStatus(locateResponse, 200);
      checkResponseTime(locateResponse, 3000);
      checkLocateResponse(locateResponse);
      
      // Add a wait to allow inventory calculation to process
      randomSleep(1, 2);
      
      // Query the inventory again to verify the update
      const updatedInventoryResponse = makeRequest('GET', `/api/v1/inventory/for-loan?securityId=${securityToLocate}`, null, {
        tags: { operation: 'calculateInventory' }
      });
      
      // Check response
      checkResponseStatus(updatedInventoryResponse, 200);
      checkResponseTime(updatedInventoryResponse, 3000);
      checkInventoryResponse(updatedInventoryResponse);
      
      // Query different inventory types in parallel (for different calculation types)
      const requests = {
        forLoan: `/api/v1/inventory/for-loan?securityId=${securityToLocate}`,
        forPledge: `/api/v1/inventory/for-pledge?securityId=${securityToLocate}`
      };
      
      const responses = http.batch(requests);
      
      // Check responses
      for (const [key, response] of Object.entries(responses)) {
        checkResponseStatus(response, 200);
        checkResponseTime(response, 3000);
        checkInventoryResponse(response);
      }
      
      // Add a wait between operations
      randomSleep(1, 2);
    }
  });
}

/**
 * Executes the data ingestion test scenario
 */
function executeDataIngestionScenario(testContext) {
  group("Data Ingestion Workflow", function() {
    // Generate reference data updates
    if (Math.random() < 0.7 && testContext.scenarios.dataIngestion) { // 70% chance to run this step
      const scenarioData = testContext.scenarios.dataIngestion.referenceData;
      const securities = scenarioData.securities;
      
      // Pick a random security to update
      const securityId = securities[Math.floor(Math.random() * securities.length)];
      
      // Generate a reference data update
      const refDataUpdate = {
        securityId: securityId,
        updates: {
          status: Math.random() > 0.5 ? 'ACTIVE' : 'INACTIVE',
          description: `Updated description ${new Date().toISOString()}`,
          attributes: {
            volatility: parseFloat((Math.random() * 0.5).toFixed(4)),
            beta: parseFloat((0.8 + Math.random() * 0.4).toFixed(2)),
            marketCap: Math.floor(Math.random() * 1000) * 1000000000
          }
        }
      };
      
      // Submit the reference data update
      const refDataResponse = makeRequest('PUT', `/api/v1/reference/securities/${securityId}`, JSON.stringify(refDataUpdate), {
        tags: { operation: 'ingestReferenceData' }
      });
      
      // Check response
      checkResponseStatus(refDataResponse, 200);
      checkResponseTime(refDataResponse, 3000);
      
      // Add a wait between operations
      randomSleep(1, 2);
    }
    
    // Generate market data updates
    if (Math.random() < 0.9 && testContext.scenarios.dataIngestion) { // 90% chance to run this step
      const scenarioData = testContext.scenarios.dataIngestion.marketData;
      const securities = scenarioData.securities;
      const priceChangeRange = scenarioData.priceChangePercentRange;
      
      // Prepare batch of market data updates
      const marketDataUpdates = [];
      
      const numUpdates = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numUpdates; i++) {
        // Pick a random security
        const securityId = securities[Math.floor(Math.random() * securities.length)];
        
        // Generate a price change within the specified range
        const priceChangePct = priceChangeRange[0] + Math.random() * (priceChangeRange[1] - priceChangeRange[0]);
        const basePrice = 100 + Math.random() * 900; // Random base price between 100 and 1000
        const newPrice = basePrice * (1 + priceChangePct / 100);
        
        marketDataUpdates.push({
          securityId: securityId,
          price: parseFloat(newPrice.toFixed(2)),
          source: 'MARKET',
          timestamp: new Date().toISOString()
        });
      }
      
      // Submit the market data updates
      const marketDataResponse = makeRequest('POST', '/api/v1/market-data/prices', JSON.stringify(marketDataUpdates), {
        tags: { operation: 'ingestMarketData' }
      });
      
      // Check response
      checkResponseStatus(marketDataResponse, 200);
      checkResponseTime(marketDataResponse, 2000);
      
      // Add a wait between operations
      randomSleep(0.5, 1);
    }
    
    // Generate trade data
    if (Math.random() < 0.8 && testContext.scenarios.dataIngestion) { // 80% chance to run this step
      const scenarioData = testContext.scenarios.dataIngestion.tradeData;
      const securities = scenarioData.securities;
      const counterparties = scenarioData.counterparties;
      const books = scenarioData.books;
      const tradeTypes = scenarioData.tradeTypes;
      
      // Generate a trade
      const securityId = securities[Math.floor(Math.random() * securities.length)];
      const counterpartyId = counterparties[Math.floor(Math.random() * counterparties.length)];
      const bookId = books[Math.floor(Math.random() * books.length)];
      const tradeType = tradeTypes[Math.floor(Math.random() * tradeTypes.length)];
      
      // Generate quantity within the specified range
      const minQty = scenarioData.tradeQuantityRange[0];
      const maxQty = scenarioData.tradeQuantityRange[1];
      const quantity = Math.round((minQty + Math.random() * (maxQty - minQty)) / 100) * 100;
      
      const tradeData = {
        tradeId: `TR-${new Date().toISOString().split('T')[0]}-${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`,
        securityId: securityId,
        counterpartyId: counterpartyId,
        bookId: bookId,
        tradeType: tradeType,
        quantity: tradeType === 'BUY' ? quantity : -quantity,
        price: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
        tradeDate: new Date().toISOString().split('T')[0],
        settlementDate: (() => {
          const date = new Date();
          date.setDate(date.getDate() + 2); // T+2 settlement
          return date.toISOString().split('T')[0];
        })(),
        executionTime: new Date().toISOString()
      };
      
      // Submit the trade data
      const tradeDataResponse = makeRequest('POST', '/api/v1/trades', JSON.stringify(tradeData), {
        tags: { operation: 'ingestTradeData' }
      });
      
      // Check response
      checkResponseStatus(tradeDataResponse, 200);
      checkResponseTime(tradeDataResponse, 2000);
      
      // Query the trade data to verify ingestion
      const tradeQueryResponse = makeRequest('GET', `/api/v1/trades/${tradeData.tradeId}`, null, {
        tags: { operation: 'queryTrade' }
      });
      
      // Check response
      checkResponseStatus(tradeQueryResponse, 200);
      checkResponseTime(tradeQueryResponse, 2000);
      
      // Add a wait between operations
      randomSleep(1, 2);
    }
  });
}

/**
 * Executes a mixed scenario that combines multiple workflows to simulate realistic market activity
 */
function executeMixedScenario(testContext) {
  group("Mixed Workflow", function() {
    // Execute a sequence of operations that simulates realistic user behavior
    
    // Start with some position queries
    executePositionScenario(testContext);
    
    // Add a wait between scenarios to simulate user think time
    randomSleep(2, 5);
    
    // Then check inventory
    executeInventoryScenario(testContext);
    
    // Add a wait between scenarios
    randomSleep(2, 5);
    
    // If there's locate workflow, execute it
    if (Math.random() < 0.7) { // 70% chance to run locate workflow
      executeLocateScenario(testContext);
      
      // Add a wait between scenarios
      randomSleep(2, 5);
      
      // Follow up with short sell validation
      executeShortSellScenario(testContext);
    } else {
      // Otherwise just do short sell
      executeShortSellScenario(testContext);
    }
    
    // Add a wait between scenarios
    randomSleep(2, 5);
    
    // Finally include some data ingestion
    executeDataIngestionScenario(testContext);
  });
}

/**
 * Cleans up resources after the test completes
 */
export function teardown(data) {
  // Log test completion
  console.log('Normal load test completed successfully');
  
  // Generate performance metrics for reporting
  // Compare results against SLA requirements
  // This is typically handled by the k6 reporting mechanism
}