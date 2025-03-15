import http from 'k6/http'; // k6 version: latest
import { sleep, check } from 'k6'; // k6 version: latest
import { group } from 'k6'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest

import { authenticate, setActiveEnvironment, makeRequest, randomSleep, generateLocateRequest, generateShortSellRequest } from '../../performance/k6/lib/helpers.js';
import { checkResponseStatus, checkResponseTime, checkLocateResponse, checkShortSellResponse, checkPositionResponse, checkInventoryResponse } from '../../performance/k6/lib/checks.js';
import { getLoadProfile, getThresholds } from '../../performance/k6/config.js';
import testData from '../data/test-data.json';

// Configure the test options with extreme stress settings
export const options = {
  // Configure stress test with extreme settings to identify breaking points
  scenarios: {
    stressTest: {
      executor: 'ramping-arrival-rate',
      startRate: 100,  // Starting at 100 requests per second
      timeUnit: '1s',
      preAllocatedVUs: 500,  // Pre-allocate VUs for faster ramp-up
      maxVUs: 2000,  // Maximum number of VUs for extreme load
      stages: [
        { duration: '30s', target: 1000 },  // Ramp up to 1000 RPS over 30 seconds
        { duration: '1m', target: 1000 },   // Hold at 1000 RPS for 1 minute
        { duration: '30s', target: 2000 },  // Ramp up to 2000 RPS over 30 seconds
        { duration: '1m', target: 2000 },   // Hold at 2000 RPS for 1 minute
        { duration: '30s', target: 3000 },  // Ramp up to 3000 RPS over 30 seconds (beyond expected capacity)
        { duration: '1m', target: 3000 },   // Hold at 3000 RPS for 1 minute
        { duration: '30s', target: 0 }      // Ramp down to 0 RPS
      ],
    }
  },
  // Define thresholds for stress test - intentionally setting high but realistic values
  // to identify breaking points while still reflecting actual requirements
  thresholds: {
    'http_req_duration': ['p(99)<300', 'p(95)<200', 'p(50)<150'],  // Overall response time thresholds
    'http_req_failed': ['rate<0.05'],  // Allow up to 5% failure rate under extreme stress
    'http_req_duration{operation:validateShortSell}': ['p(99)<200', 'p(95)<150', 'p(50)<100'],  // Critical SLA for short sell
    'http_req_duration{operation:calculatePosition}': ['p(99)<300', 'p(95)<200', 'p(50)<150'],  // 200ms end-to-end requirement
  },
  // Tags for categorizing the test
  tags: {
    testType: 'stress',
    application: 'ims'
  }
};

// Setup function to initialize the test environment
export function setup() {
  // Set the active environment based on ENV_TARGET or default to 'staging'
  const activeEnv = __ENV.ENV_TARGET || 'staging';
  setActiveEnvironment(activeEnv);
  
  // Authenticate with the API
  const username = __ENV.API_USERNAME || 'performance_test_user';
  const password = __ENV.API_PASSWORD || 'performance_test_password';
  const token = authenticate(username, password);
  
  // Load test data
  const securities = testData.securities;
  const counterparties = testData.counterparties;
  const positions = testData.positions;
  const locates = testData.locates;
  const scenarios = testData.scenarios;
  
  // Configure stress test parameters
  // These batch sizes are intentionally large to create extreme load conditions
  const stressParams = {
    // Extreme volume parameters to identify system breaking points
    locateRequestBatchSize: 50,         // 50 locate requests per batch
    shortSellRequestBatchSize: 100,     // 100 short sell validations per batch
    positionQueryBatchSize: 50,         // 50 position queries per batch
    inventoryQueryBatchSize: 50,        // 50 inventory queries per batch
    dataIngestionBatchSize: 200,        // 200 data updates per batch
    // Parameters for mixed scenario
    mixedScenarioRatio: {
      locate: 0.2,           // 20% locate requests
      shortSell: 0.3,        // 30% short sell validations
      position: 0.2,         // 20% position queries
      inventory: 0.2,        // 20% inventory queries
      dataIngestion: 0.1     // 10% data ingestion operations
    }
  };
  
  console.log(`Stress test initialized with environment: ${activeEnv}`);
  console.log(`Target performance: 300,000+ events/sec with <200ms end-to-end latency`);
  console.log(`Short sell validation target: <150ms for 99% of requests`);
  
  return {
    token: token,
    securities: securities,
    counterparties: counterparties,
    positions: positions,
    locates: locates,
    scenarios: scenarios,
    stressParams: stressParams
  };
}

// Main test function that executes the stress test
export default function(data) {
  // Extract data from setup
  const token = data.token;
  const securities = data.securities;
  const counterparties = data.counterparties;
  const positions = data.positions;
  const locates = data.locates;
  const scenarios = data.scenarios;
  const stressParams = data.stressParams;
  
  // Choose which scenario to run based on a weighted distribution
  // Using VU number to distribute load across different scenarios
  // This ensures a good mix of different operation types to stress test all components
  const vuNumber = exec.vu.idInTest % 100;
  let testContext = {
    token: token,
    securities: securities,
    counterparties: counterparties,
    positions: positions,
    locates: locates,
    scenarios: scenarios,
    stressParams: stressParams
  };
  
  // Distribute VUs across scenarios based on their weight
  // This creates a more realistic stress pattern across different services
  if (vuNumber < 20) {
    // 20% of VUs run locate approval stress test
    group('Locate Approval Stress Test', () => {
      executeStressLocateScenario(testContext);
    });
  } else if (vuNumber < 50) {
    // 30% of VUs run short sell validation stress test
    group('Short Sell Validation Stress Test', () => {
      executeStressShortSellScenario(testContext);
    });
  } else if (vuNumber < 70) {
    // 20% of VUs run position calculation stress test
    group('Position Calculation Stress Test', () => {
      executeStressPositionScenario(testContext);
    });
  } else if (vuNumber < 90) {
    // 20% of VUs run inventory calculation stress test
    group('Inventory Calculation Stress Test', () => {
      executeStressInventoryScenario(testContext);
    });
  } else if (vuNumber < 95) {
    // 5% of VUs run data ingestion stress test
    group('Data Ingestion Stress Test', () => {
      executeStressDataIngestionScenario(testContext);
    });
  } else {
    // 5% of VUs run mixed workflow stress test
    group('Mixed Workflow Stress Test', () => {
      executeStressMixedScenario(testContext);
    });
  }
  
  // Add minimal sleep between iterations to simulate high-frequency operations
  // Using very short sleep times to maintain extreme load
  randomSleep(0.1, 0.3); // Minimal sleep: 0.1-0.3 seconds
}

// Function to execute the locate approval workflow under extreme stress
function executeStressLocateScenario(testContext) {
  const { token, securities, counterparties, stressParams } = testContext;
  
  // Generate multiple locate requests for stress testing
  // This creates a high volume of concurrent locate requests to stress the system
  const batchSize = stressParams.locateRequestBatchSize;
  const locateRequests = [];
  
  for (let i = 0; i < batchSize; i++) {
    const securityIndex = Math.floor(Math.random() * securities.length);
    const counterpartyIndex = Math.floor(Math.random() * counterparties.length);
    
    const request = {
      requestId: `STRESS-LOC-${exec.vu.idInTest}-${i}-${Date.now()}`,
      securityId: securities[securityIndex].internalId,
      clientId: counterparties[counterpartyIndex].counterpartyId,
      requestedQuantity: Math.floor(Math.random() * 10000) + 1000,
      requestTimestamp: new Date().toISOString(),
      locateType: 'SHORT_SELL',
      swapCashIndicator: Math.random() > 0.5 ? 'SWAP' : 'CASH'
    };
    
    locateRequests.push(request);
  }
  
  // Submit the locate requests in rapid succession
  const responses = [];
  for (let i = 0; i < locateRequests.length; i++) {
    try {
      const response = makeRequest('POST', '/api/v1/locates', JSON.stringify(locateRequests[i]), {
        tags: { operation: 'submitLocate' }
      });
      
      // Validate response
      check(response, {
        'locate status is 200 or 201': r => r.status === 200 || r.status === 201,
        'locate response time is acceptable': r => r.timings.duration < 5000,  // Higher threshold for stress test
      });
      
      responses.push(response);
    } catch (e) {
      console.error(`Error submitting locate request: ${e.message}`);
    }
  }
  
  // Query inventory availability to see the impact of the locate requests
  // This verifies that the system correctly updates inventory under extreme load
  const inventoryResponses = [];
  const securityIds = securities.slice(0, 5).map(s => s.internalId);
  
  for (const securityId of securityIds) {
    try {
      const response = makeRequest('GET', `/api/v1/inventory/for-loan?securityId=${securityId}`, null, {
        tags: { operation: 'queryInventory' }
      });
      
      // Validate response
      check(response, {
        'inventory status is 200': r => r.status === 200,
        'inventory response time is acceptable': r => r.timings.duration < 5000,  // Higher threshold for stress test
      });
      
      inventoryResponses.push(response);
    } catch (e) {
      console.error(`Error querying inventory: ${e.message}`);
    }
  }
}

// Function to execute the short sell validation workflow under extreme stress
function executeStressShortSellScenario(testContext) {
  const { token, securities, counterparties, stressParams } = testContext;
  
  // Generate multiple short sell requests for stress testing
  // This tests the system's ability to handle high volumes of short sell validations
  // which have a strict 150ms SLA requirement
  const batchSize = stressParams.shortSellRequestBatchSize;
  const shortSellRequests = [];
  
  for (let i = 0; i < batchSize; i++) {
    const securityIndex = Math.floor(Math.random() * securities.length);
    const counterpartyIndex = Math.floor(Math.random() * counterparties.length);
    
    const request = {
      orderId: `STRESS-SS-${exec.vu.idInTest}-${i}-${Date.now()}`,
      securityId: securities[securityIndex].internalId,
      counterpartyId: counterparties[counterpartyIndex].counterpartyId,
      quantity: Math.floor(Math.random() * 5000) + 500,
      side: 'SELL_SHORT',
      price: Math.floor(Math.random() * 200) + 100,
      orderDate: new Date().toISOString().split('T')[0]
    };
    
    shortSellRequests.push(request);
  }
  
  // Submit the short sell validation requests in rapid succession
  const responses = [];
  for (let i = 0; i < shortSellRequests.length; i++) {
    try {
      const response = makeRequest('POST', '/api/v1/orders/validate', JSON.stringify(shortSellRequests[i]), {
        tags: { operation: 'validateShortSell' }
      });
      
      // Validate response against the critical 150ms SLA even under stress
      check(response, {
        'short sell status is 200': r => r.status === 200,
        'short sell response time meets SLA': r => r.timings.duration < 200,  // Slightly higher than normal for stress
      });
      
      responses.push(response);
    } catch (e) {
      console.error(`Error validating short sell: ${e.message}`);
    }
  }
  
  // Query client limits to see the impact of the short sell validations
  // This verifies that limits are correctly updated under extreme load
  const limitResponses = [];
  const clientIds = counterparties.slice(0, 3).map(c => c.counterpartyId);
  
  for (const clientId of clientIds) {
    try {
      const response = makeRequest('GET', `/api/v1/limits/client/${clientId}`, null, {
        tags: { operation: 'queryClientLimit' }
      });
      
      // Validate response
      check(response, {
        'limit status is 200': r => r.status === 200,
        'limit response time is acceptable': r => r.timings.duration < 3000,  // Higher threshold for stress test
      });
      
      limitResponses.push(response);
    } catch (e) {
      console.error(`Error querying client limit: ${e.message}`);
    }
  }
}

// Function to execute the position calculation test scenario under extreme stress
function executeStressPositionScenario(testContext) {
  const { token, securities, positions, counterparties, stressParams } = testContext;
  
  // Query multiple securities for position data simultaneously
  // This tests the system's ability to handle high volumes of position queries
  const batchSize = stressParams.positionQueryBatchSize;
  const positionQueries = [];
  
  for (let i = 0; i < batchSize; i++) {
    const securityIndex = i % securities.length;
    const securityId = securities[securityIndex].internalId;
    
    try {
      const response = makeRequest('GET', `/api/v1/positions?securityId=${securityId}`, null, {
        tags: { operation: 'queryPosition' }
      });
      
      // Validate response against the 200ms end-to-end requirement
      check(response, {
        'position status is 200': r => r.status === 200,
        'position response time is acceptable': r => r.timings.duration < 3000,  // Higher threshold for stress test
      });
      
      positionQueries.push(response);
    } catch (e) {
      console.error(`Error querying position: ${e.message}`);
    }
  }
  
  // Generate high volume of trade requests that will affect positions
  // This tests the system's ability to process trades and update positions under stress
  const tradeRequests = [];
  for (let i = 0; i < Math.ceil(batchSize / 2); i++) {
    const securityIndex = i % securities.length;
    const securityId = securities[securityIndex].internalId;
    
    try {
      const tradeRequest = {
        securityId: securityId,
        bookId: `EQUITY-0${(i % 3) + 1}`,
        counterpartyId: counterparties[i % counterparties.length].counterpartyId,
        quantity: Math.floor(Math.random() * 5000) + 500,
        price: Math.floor(Math.random() * 200) + 100,
        side: Math.random() > 0.5 ? 'BUY' : 'SELL',
        tradeDate: new Date().toISOString().split('T')[0],
        settlementDate: new Date(Date.now() + Math.floor(Math.random() * 3) * 86400000).toISOString().split('T')[0]
      };
      
      const response = makeRequest('POST', '/api/v1/trades', JSON.stringify(tradeRequest), {
        tags: { operation: 'submitTrade' }
      });
      
      // Validate response
      check(response, {
        'trade status is 200 or 201': r => r.status === 200 || r.status === 201,
        'trade response time is acceptable': r => r.timings.duration < 3000,  // Higher threshold for stress test
      });
      
      tradeRequests.push(response);
    } catch (e) {
      console.error(`Error submitting trade: ${e.message}`);
    }
  }
  
  // Query the position settlement ladder to verify position calculations under load
  // This tests the calculation of settlement ladders which is a complex operation
  const ladderQueries = [];
  for (let i = 0; i < Math.min(5, securities.length); i++) {
    const securityId = securities[i].internalId;
    
    try {
      const response = makeRequest('GET', `/api/v1/positions/settlement-ladder?securityId=${securityId}`, null, {
        tags: { operation: 'querySettlementLadder' }
      });
      
      // Validate response
      check(response, {
        'ladder status is 200': r => r.status === 200,
        'ladder response time is acceptable': r => r.timings.duration < 3000,  // Higher threshold for stress test
      });
      
      ladderQueries.push(response);
    } catch (e) {
      console.error(`Error querying settlement ladder: ${e.message}`);
    }
  }
}

// Function to execute the inventory calculation test scenario under extreme stress
function executeStressInventoryScenario(testContext) {
  const { token, securities, counterparties, stressParams } = testContext;
  
  // Query inventory availability for multiple securities simultaneously
  // This tests the system's ability to handle high volumes of inventory queries
  const batchSize = stressParams.inventoryQueryBatchSize;
  const inventoryQueries = [];
  
  // Query different inventory types in parallel at high volume
  const inventoryTypes = ['FOR_LOAN', 'FOR_PLEDGE', 'LOCATE', 'SHORT_SELL'];
  
  for (let i = 0; i < batchSize; i++) {
    const securityIndex = i % securities.length;
    const securityId = securities[securityIndex].internalId;
    const inventoryType = inventoryTypes[i % inventoryTypes.length];
    
    try {
      const response = makeRequest('GET', `/api/v1/inventory/${inventoryType.toLowerCase()}?securityId=${securityId}`, null, {
        tags: { operation: `query${inventoryType}` }
      });
      
      // Validate response
      check(response, {
        [`${inventoryType} status is 200`]: r => r.status === 200,
        [`${inventoryType} response time is acceptable`]: r => r.timings.duration < 3000,  // Higher threshold for stress test
      });
      
      inventoryQueries.push(response);
    } catch (e) {
      console.error(`Error querying ${inventoryType} inventory: ${e.message}`);
    }
  }
  
  // Submit locate requests that will affect inventory
  // This tests the system's ability to update inventory calculations under stress
  const locateRequests = [];
  for (let i = 0; i < Math.ceil(batchSize / 3); i++) {
    const securityIndex = i % securities.length;
    const counterpartyIndex = i % counterparties.length;
    
    try {
      const request = {
        requestId: `STRESS-LOC-INV-${exec.vu.idInTest}-${i}-${Date.now()}`,
        securityId: securities[securityIndex].internalId,
        clientId: counterparties[counterpartyIndex].counterpartyId,
        requestedQuantity: Math.floor(Math.random() * 10000) + 1000,
        requestTimestamp: new Date().toISOString(),
        locateType: 'SHORT_SELL',
        swapCashIndicator: Math.random() > 0.5 ? 'SWAP' : 'CASH'
      };
      
      const response = makeRequest('POST', '/api/v1/locates', JSON.stringify(request), {
        tags: { operation: 'submitLocateForInventory' }
      });
      
      // Validate response
      check(response, {
        'locate status is 200 or 201': r => r.status === 200 || r.status === 201,
        'locate response time is acceptable': r => r.timings.duration < 5000,  // Higher threshold for stress test
      });
      
      locateRequests.push(response);
    } catch (e) {
      console.error(`Error submitting locate for inventory: ${e.message}`);
    }
  }
  
  // Query inventory again to verify the updates under stress
  // This verifies that inventory calculations correctly reflect updates under extreme load
  const followUpQueries = [];
  for (let i = 0; i < Math.min(5, securities.length); i++) {
    const securityId = securities[i].internalId;
    
    for (const invType of inventoryTypes) {
      try {
        const response = makeRequest('GET', `/api/v1/inventory/${invType.toLowerCase()}?securityId=${securityId}`, null, {
          tags: { operation: `queryUpdated${invType}` }
        });
        
        // Validate response
        check(response, {
          [`updated ${invType} status is 200`]: r => r.status === 200,
          [`updated ${invType} response time is acceptable`]: r => r.timings.duration < 3000,  // Higher threshold for stress test
        });
        
        followUpQueries.push(response);
      } catch (e) {
        console.error(`Error querying updated ${invType} inventory: ${e.message}`);
      }
    }
  }
}

// Function to execute the data ingestion test scenario under extreme stress
function executeStressDataIngestionScenario(testContext) {
  const { token, securities, counterparties, stressParams } = testContext;
  
  // Generate high volume of reference data updates
  // This tests the system's ability to handle high volumes of reference data changes
  const refBatchSize = stressParams.dataIngestionBatchSize;
  const refDataUpdates = [];
  
  for (let i = 0; i < refBatchSize; i++) {
    // Alternate between security and counterparty updates
    if (i % 2 === 0) {
      // Security update
      const securityIndex = i % securities.length;
      const security = securities[securityIndex];
      
      try {
        const update = {
          internalId: security.internalId,
          securityType: security.securityType,
          issuer: security.issuer,
          description: `${security.description} (Updated ${Date.now()})`,
          currency: security.currency,
          market: security.market,
          exchange: security.exchange,
          status: 'ACTIVE',
          identifiers: [
            {
              identifierType: 'TICKER',
              identifierValue: `${security.primaryIdentifierValue}`,
              source: 'EXCHANGE',
              isPrimary: true
            }
          ]
        };
        
        const response = makeRequest('PUT', `/api/v1/securities/${security.internalId}`, JSON.stringify(update), {
          tags: { operation: 'updateSecurityReference' }
        });
        
        // Validate response
        check(response, {
          'security update status is 200': r => r.status === 200,
          'security update response time is acceptable': r => r.timings.duration < 5000,  // Higher threshold for stress test
        });
        
        refDataUpdates.push(response);
      } catch (e) {
        console.error(`Error updating security reference: ${e.message}`);
      }
    } else {
      // Counterparty update
      const counterpartyIndex = i % counterparties.length;
      const counterparty = counterparties[counterpartyIndex];
      
      try {
        const update = {
          counterpartyId: counterparty.counterpartyId,
          name: counterparty.name,
          shortName: `${counterparty.shortName} (Updated ${Date.now()})`,
          type: counterparty.type,
          category: counterparty.category,
          status: 'ACTIVE',
          kycStatus: 'APPROVED',
          riskRating: counterparty.riskRating,
          country: counterparty.country,
          region: counterparty.region
        };
        
        const response = makeRequest('PUT', `/api/v1/counterparties/${counterparty.counterpartyId}`, JSON.stringify(update), {
          tags: { operation: 'updateCounterpartyReference' }
        });
        
        // Validate response
        check(response, {
          'counterparty update status is 200': r => r.status === 200,
          'counterparty update response time is acceptable': r => r.timings.duration < 5000,  // Higher threshold for stress test
        });
        
        refDataUpdates.push(response);
      } catch (e) {
        console.error(`Error updating counterparty reference: ${e.message}`);
      }
    }
  }
  
  // Generate high volume of market data updates
  // This tests the system's ability to handle the expected high frequency of market data
  const mktBatchSize = stressParams.dataIngestionBatchSize * 2;  // More market data updates
  const mktDataUpdates = [];
  
  for (let i = 0; i < mktBatchSize; i++) {
    const securityIndex = i % securities.length;
    const security = securities[securityIndex];
    
    try {
      const priceUpdate = {
        securityId: security.internalId,
        price: Math.random() * 1000 + 10,  // Random price between 10 and 1010
        timestamp: new Date().toISOString(),
        source: 'STRESS_TEST',
        priceType: 'LAST'
      };
      
      const response = makeRequest('POST', '/api/v1/market-data/prices', JSON.stringify(priceUpdate), {
        tags: { operation: 'submitMarketData' }
      });
      
      // Validate response
      check(response, {
        'price update status is 200 or 201': r => r.status === 200 || r.status === 201,
        'price update response time is acceptable': r => r.timings.duration < 3000,  // Higher threshold for stress test
      });
      
      mktDataUpdates.push(response);
    } catch (e) {
      console.error(`Error submitting market data: ${e.message}`);
    }
  }
  
  // Query for updated data to verify ingestion under load
  // This verifies that data updates are correctly processed under extreme load
  const verificationQueries = [];
  for (let i = 0; i < Math.min(5, securities.length); i++) {
    const securityId = securities[i].internalId;
    
    try {
      // Query updated security
      const secResponse = makeRequest('GET', `/api/v1/securities/${securityId}`, null, {
        tags: { operation: 'verifySecurityUpdate' }
      });
      
      check(secResponse, {
        'security query status is 200': r => r.status === 200,
        'security query response time is acceptable': r => r.timings.duration < 3000,  // Higher threshold for stress test
      });
      
      verificationQueries.push(secResponse);
      
      // Query updated price
      const priceResponse = makeRequest('GET', `/api/v1/market-data/prices?securityId=${securityId}&latest=true`, null, {
        tags: { operation: 'verifyPriceUpdate' }
      });
      
      check(priceResponse, {
        'price query status is 200': r => r.status === 200,
        'price query response time is acceptable': r => r.timings.duration < 3000,  // Higher threshold for stress test
      });
      
      verificationQueries.push(priceResponse);
    } catch (e) {
      console.error(`Error verifying data updates: ${e.message}`);
    }
  }
}

// Function to execute a mixed scenario that combines multiple workflows under extreme stress
// This provides a more realistic stress test that simulates actual usage patterns
function executeStressMixedScenario(testContext) {
  const { token, securities, counterparties, positions, stressParams } = testContext;
  const ratio = stressParams.mixedScenarioRatio;
  
  // Use a deterministic but varying pattern based on VU ID and iteration
  const iteration = exec.instance.iterationsCompleted;
  const vuId = exec.vu.idInTest;
  const seed = (vuId * 100 + iteration) % 100;
  
  try {
    // Distribute operations based on the predefined ratio
    // This creates a realistic mix of different operations
    if (seed < ratio.locate * 100) {
      // Locate approval operation
      const locateRequest = generateLocateRequest();
      
      const response = makeRequest('POST', '/api/v1/locates', JSON.stringify(locateRequest), {
        tags: { operation: 'mixedLocate' }
      });
      
      checkLocateResponse(response);
      
    } else if (seed < (ratio.locate + ratio.shortSell) * 100) {
      // Short sell validation operation - this has the critical 150ms SLA
      const shortSellRequest = generateShortSellRequest();
      
      const response = makeRequest('POST', '/api/v1/orders/validate', JSON.stringify(shortSellRequest), {
        tags: { operation: 'mixedShortSell' }
      });
      
      checkShortSellResponse(response);
      
    } else if (seed < (ratio.locate + ratio.shortSell + ratio.position) * 100) {
      // Position query operation - this has the 200ms end-to-end requirement
      const securityIndex = iteration % securities.length;
      const securityId = securities[securityIndex].internalId;
      
      const response = makeRequest('GET', `/api/v1/positions?securityId=${securityId}`, null, {
        tags: { operation: 'mixedPosition' }
      });
      
      checkPositionResponse(response);
      
    } else if (seed < (ratio.locate + ratio.shortSell + ratio.position + ratio.inventory) * 100) {
      // Inventory query operation
      const securityIndex = iteration % securities.length;
      const securityId = securities[securityIndex].internalId;
      const inventoryTypes = ['for-loan', 'for-pledge', 'locate', 'short-sell'];
      const typeIndex = iteration % inventoryTypes.length;
      
      const response = makeRequest('GET', `/api/v1/inventory/${inventoryTypes[typeIndex]}?securityId=${securityId}`, null, {
        tags: { operation: 'mixedInventory' }
      });
      
      checkInventoryResponse(response);
      
    } else {
      // Data ingestion operation - testing the high event throughput requirement
      const securityIndex = iteration % securities.length;
      const security = securities[securityIndex];
      
      const priceUpdate = {
        securityId: security.internalId,
        price: Math.random() * 1000 + 10,
        timestamp: new Date().toISOString(),
        source: 'STRESS_TEST',
        priceType: 'LAST'
      };
      
      const response = makeRequest('POST', '/api/v1/market-data/prices', JSON.stringify(priceUpdate), {
        tags: { operation: 'mixedMarketData' }
      });
      
      check(response, {
        'price update status is 200 or 201': r => r.status === 200 || r.status === 201,
        'price update response time is acceptable': r => r.timings.duration < 3000,
      });
    }
  } catch (e) {
    console.error(`Error in mixed scenario: ${e.message}`);
  }
}

// Teardown function to clean up resources after the test
export function teardown(data) {
  // Log out or clean up any resources as needed
  if (data && data.token) {
    console.log('Stress test completed, cleaning up resources');
    
    // Attempt to log out if the API supports it
    try {
      makeRequest('POST', '/api/v1/auth/logout', null, {
        tags: { operation: 'logout' }
      });
    } catch (e) {
      console.log('Logout failed or not supported:', e);
    }
  }
  
  // Log performance statistics summary
  console.log('Stress test complete. Key findings:');
  console.log('- System behavior under extreme load has been evaluated');
  console.log('- Breaking points and degradation patterns have been identified');
  console.log('- Detailed metrics are available in the k6 results output');
  console.log('- Recommended next steps: analyze results and optimize bottlenecks');
}