import http from 'k6/http'; // k6 version: latest
import { sleep, check } from 'k6'; // k6 version: latest
import { group } from 'k6'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest

// Import helper functions and test data
import { 
  authenticate, 
  setActiveEnvironment, 
  makeRequest, 
  randomSleep, 
  generateLocateRequest, 
  generateShortSellRequest 
} from '../../performance/k6/lib/helpers.js';
import { 
  checkResponseStatus, 
  checkResponseTime, 
  checkLocateResponse, 
  checkShortSellResponse, 
  checkPositionResponse, 
  checkInventoryResponse 
} from '../../performance/k6/lib/checks.js';
import { 
  getLoadProfile,
  getThresholds
} from '../../performance/k6/config.js';
import testData from '../data/test-data.json';

// Define test options for spike testing
export const options = {
  // Spike test configuration with rapid increase in load
  scenarios: {
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 50,  // Starting point (normal load)
      timeUnit: '1s', // 50 iterations per second
      preAllocatedVUs: 100, // Initial VUs
      maxVUs: 1000,   // Maximum VUs for spike
      stages: [
        // Initial normal load
        { duration: '2m', target: 50 },
        // Rapid spike to 7x normal load
        { duration: '20s', target: 350 },
        // Maintain spike for 1 minute
        { duration: '1m', target: 350 },
        // Gradual return to normal
        { duration: '1m', target: 50 },
        // Continue with normal load
        { duration: '5m', target: 50 }
      ],
    },
  },
  // Performance thresholds based on SLAs
  thresholds: {
    // General response time thresholds
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
    // Short sell validation - critical 150ms SLA requirement
    'http_req_duration{operation:shortSellValidation}': ['p(99)<150', 'p(95)<100'],
    // End-to-end processing - critical 200ms SLA requirement
    'http_req_duration{operation:positionCalculation}': ['p(99)<200', 'p(95)<150'],
    // Error rate threshold
    'http_req_failed': ['rate<0.01'] // Less than 1% errors
  },
  // Test metadata
  tags: {
    test_type: 'spike',
    application: 'ims'
  }
};

// Setup function to initialize test data and authenticate
export function setup() {
  // Set the active environment based on environment variable or default to 'staging'
  const env = __ENV.ENV_TARGET || 'staging';
  setActiveEnvironment(env);
  
  // Authenticate and get token
  const username = __ENV.USERNAME || 'performance_test_user';
  const password = __ENV.PASSWORD || 'default_password'; // Should be passed securely
  const token = authenticate(username, password);
  
  // Load test configurations for spike test
  const spikeConfig = {
    // Define multipliers for the spike phase
    spikeMultiplier: 5,
    requestsPerIteration: {
      normal: {
        locate: 2,
        shortSell: 3,
        position: 5,
        inventory: 4,
        dataIngestion: 10
      },
      spike: {
        locate: 10,
        shortSell: 15,
        position: 25,
        inventory: 20,
        dataIngestion: 50
      }
    },
    // Define distribution of scenarios during test
    scenarioDistribution: {
      locate: 0.2,
      shortSell: 0.25,
      position: 0.15,
      inventory: 0.15,
      dataIngestion: 0.1,
      mixed: 0.15
    }
  };
  
  // Return test context
  return {
    token: token,
    config: spikeConfig,
    testData: testData
  };
}

// Main test function
export default function(data) {
  const token = data.token;
  const config = data.config;
  const testData = data.testData;
  
  // Combine token and test data into test context
  const testContext = {
    token: token,
    testData: testData,
    config: config
  };
  
  // Determine if we're in the spike phase
  const inSpike = isInSpikePhase();
  
  // Get a random number to determine which scenario to run
  const scenarioSelector = Math.random();
  let cumulativeProbability = 0;
  
  // Select scenario based on distribution probability
  if ((cumulativeProbability += config.scenarioDistribution.locate) > scenarioSelector) {
    group('Locate Approval Workflow', () => {
      executeLocateScenario(testContext, inSpike);
    });
  } 
  else if ((cumulativeProbability += config.scenarioDistribution.shortSell) > scenarioSelector) {
    group('Short Sell Validation Workflow', () => {
      executeShortSellScenario(testContext, inSpike);
    });
  }
  else if ((cumulativeProbability += config.scenarioDistribution.position) > scenarioSelector) {
    group('Position Calculation Workflow', () => {
      executePositionScenario(testContext, inSpike);
    });
  }
  else if ((cumulativeProbability += config.scenarioDistribution.inventory) > scenarioSelector) {
    group('Inventory Calculation Workflow', () => {
      executeInventoryScenario(testContext, inSpike);
    });
  }
  else if ((cumulativeProbability += config.scenarioDistribution.dataIngestion) > scenarioSelector) {
    group('Data Ingestion Workflow', () => {
      executeDataIngestionScenario(testContext, inSpike);
    });
  }
  else {
    group('Mixed Workflow', () => {
      executeMixedScenario(testContext, inSpike);
    });
  }
  
  // Add a small random sleep to simulate user think time
  randomSleep(0.1, inSpike ? 0.5 : 2.0); // Shorter sleeps during spike
}

// Execute locate approval workflow test scenario with spike volume
function executeLocateScenario(testContext, isSpike) {
  const requestCount = isSpike ? 
    testContext.config.requestsPerIteration.spike.locate : 
    testContext.config.requestsPerIteration.normal.locate;
  
  // Generate and send multiple locate requests
  for (let i = 0; i < requestCount; i++) {
    // Generate locate request data
    const locateRequest = generateLocateRequest();
    
    // Override with test data if needed
    if (testContext.testData.securities.length > 0) {
      const securityIndex = Math.floor(Math.random() * testContext.testData.securities.length);
      locateRequest.securityId = testContext.testData.securities[securityIndex].internalId;
    }
    
    if (testContext.testData.counterparties.length > 0) {
      const counterpartyIndex = Math.floor(Math.random() * testContext.testData.counterparties.length);
      locateRequest.clientId = testContext.testData.counterparties[counterpartyIndex].counterpartyId;
    }
    
    // Submit the locate request
    const locateResponse = makeRequest('POST', '/api/v1/locates', JSON.stringify(locateRequest), {
      headers: {
        'Authorization': `Bearer ${testContext.token}`
      },
      tags: { operation: 'locateRequest' }
    });
    
    // Check the response
    checkResponseStatus(locateResponse, 200);
    checkResponseTime(locateResponse, 3000);
    checkLocateResponse(locateResponse);
    
    // Get the locate ID if successful
    let locateId;
    try {
      const responseBody = JSON.parse(locateResponse.body);
      locateId = responseBody.requestId;
    } catch (e) {
      console.error('Failed to parse locate response:', e);
      continue;
    }
    
    // Check locate status after a short delay (only for a sample of requests during spike)
    if (!isSpike || Math.random() < 0.2) {
      sleep(0.5);
      
      const statusResponse = makeRequest('GET', `/api/v1/locates/${locateId}`, null, {
        headers: {
          'Authorization': `Bearer ${testContext.token}`
        },
        tags: { operation: 'locateStatus' }
      });
      
      checkResponseStatus(statusResponse, 200);
      checkResponseTime(statusResponse, 1000);
    }
  }
}

// Execute short sell validation workflow test scenario with spike volume
function executeShortSellScenario(testContext, isSpike) {
  const requestCount = isSpike ? 
    testContext.config.requestsPerIteration.spike.shortSell : 
    testContext.config.requestsPerIteration.normal.shortSell;
  
  // Generate and send multiple short sell validation requests
  for (let i = 0; i < requestCount; i++) {
    // Generate short sell request data
    const shortSellRequest = generateShortSellRequest();
    
    // Override with test data if needed
    if (testContext.testData.securities.length > 0) {
      const securityIndex = Math.floor(Math.random() * testContext.testData.securities.length);
      shortSellRequest.securityId = testContext.testData.securities[securityIndex].internalId;
    }
    
    if (testContext.testData.counterparties.length > 0) {
      const counterpartyIndex = Math.floor(Math.random() * testContext.testData.counterparties.length);
      shortSellRequest.counterpartyId = testContext.testData.counterparties[counterpartyIndex].counterpartyId;
    }
    
    // Submit the short sell validation request
    const shortSellResponse = makeRequest('POST', '/api/v1/orders/validate', JSON.stringify(shortSellRequest), {
      headers: {
        'Authorization': `Bearer ${testContext.token}`
      },
      tags: { operation: 'shortSellValidation' }
    });
    
    // Check the response - validate against the critical 150ms SLA
    checkResponseStatus(shortSellResponse, 200);
    checkResponseTime(shortSellResponse, 150); // Critical SLA - must be under 150ms
    checkShortSellResponse(shortSellResponse);
    
    // If approved, check client and aggregation unit limits
    try {
      const responseBody = JSON.parse(shortSellResponse.body);
      if (responseBody.status === 'APPROVED') {
        // Check client limit (only for a sample of requests during spike)
        if (!isSpike || Math.random() < 0.2) {
          const clientLimitResponse = makeRequest('GET', `/api/v1/limits/client/${shortSellRequest.counterpartyId}`, null, {
            headers: {
              'Authorization': `Bearer ${testContext.token}`
            },
            tags: { operation: 'clientLimitCheck' }
          });
          
          checkResponseStatus(clientLimitResponse, 200);
        }
        
        // Check aggregation unit limit (only for a sample of requests during spike)
        if (!isSpike || Math.random() < 0.2) {
          const auLimitResponse = makeRequest('GET', `/api/v1/limits/aggregation-unit/${responseBody.aggregationUnitId}`, null, {
            headers: {
              'Authorization': `Bearer ${testContext.token}`
            },
            tags: { operation: 'auLimitCheck' }
          });
          
          checkResponseStatus(auLimitResponse, 200);
        }
      }
    } catch (e) {
      console.error('Failed to parse short sell response:', e);
    }
  }
}

// Execute position calculation test scenario with spike volume
function executePositionScenario(testContext, isSpike) {
  const requestCount = isSpike ? 
    testContext.config.requestsPerIteration.spike.position : 
    testContext.config.requestsPerIteration.normal.position;
  
  // Get positions for multiple securities
  for (let i = 0; i < requestCount; i++) {
    // Select a random security
    let securityId = "SEC-EQ-001"; // Default
    if (testContext.testData.securities.length > 0) {
      const securityIndex = Math.floor(Math.random() * testContext.testData.securities.length);
      securityId = testContext.testData.securities[securityIndex].internalId;
    }
    
    // Select a random book
    let bookId = "EQUITY-01"; // Default
    if (testContext.testData.books && testContext.testData.books.length > 0) {
      const bookIndex = Math.floor(Math.random() * testContext.testData.books.length);
      bookId = testContext.testData.books[bookIndex].id;
    }
    
    // Query position
    const positionResponse = makeRequest('GET', `/api/v1/positions?securityId=${securityId}&bookId=${bookId}`, null, {
      headers: {
        'Authorization': `Bearer ${testContext.token}`
      },
      tags: { operation: 'positionCalculation' }
    });
    
    // Check the response - validate against the critical 200ms SLA
    checkResponseStatus(positionResponse, 200);
    checkResponseTime(positionResponse, 200); // Critical SLA - must be under 200ms
    checkPositionResponse(positionResponse);
    
    // During spike, submit trades that affect positions at high volume
    if (isSpike) {
      // Generate a trade
      const tradeRequest = {
        securityId: securityId,
        bookId: bookId,
        counterpartyId: testContext.testData.counterparties[0].counterpartyId,
        quantity: Math.floor(Math.random() * 1000) + 100,
        price: Math.random() * 100 + 50,
        tradeDate: new Date().toISOString().split('T')[0],
        settlementDate: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0], // T+2
        side: Math.random() > 0.5 ? 'BUY' : 'SELL',
        tradeType: 'NORMAL'
      };
      
      // Submit the trade
      const tradeResponse = makeRequest('POST', '/api/v1/trades', JSON.stringify(tradeRequest), {
        headers: {
          'Authorization': `Bearer ${testContext.token}`
        },
        tags: { operation: 'submitTrade' }
      });
      
      checkResponseStatus(tradeResponse, 200);
      
      // Query position again to verify update (only for a sample during spike)
      if (Math.random() < 0.2) {
        const updatedPositionResponse = makeRequest('GET', `/api/v1/positions?securityId=${securityId}&bookId=${bookId}`, null, {
          headers: {
            'Authorization': `Bearer ${testContext.token}`
          },
          tags: { operation: 'positionCalculation' }
        });
        
        checkResponseStatus(updatedPositionResponse, 200);
        checkResponseTime(updatedPositionResponse, 200); // Still enforce the 200ms SLA
      }
    }
    
    // Query settlement ladder (only for a sample during spike)
    if (!isSpike || Math.random() < 0.3) {
      const settlementResponse = makeRequest('GET', `/api/v1/positions/settlement-ladder?securityId=${securityId}&bookId=${bookId}`, null, {
        headers: {
          'Authorization': `Bearer ${testContext.token}`
        },
        tags: { operation: 'settlementLadderQuery' }
      });
      
      checkResponseStatus(settlementResponse, 200);
    }
  }
}

// Execute inventory calculation test scenario with spike volume
function executeInventoryScenario(testContext, isSpike) {
  const requestCount = isSpike ? 
    testContext.config.requestsPerIteration.spike.inventory : 
    testContext.config.requestsPerIteration.normal.inventory;
  
  // Query inventory for multiple securities
  for (let i = 0; i < requestCount; i++) {
    // Select a random security
    let securityId = "SEC-EQ-001"; // Default
    if (testContext.testData.securities.length > 0) {
      const securityIndex = Math.floor(Math.random() * testContext.testData.securities.length);
      securityId = testContext.testData.securities[securityIndex].internalId;
    }
    
    // Select a random calculation type
    const calculationTypes = ["FOR_LOAN", "FOR_PLEDGE", "LOCATE", "SHORT_SELL"];
    const calculationType = calculationTypes[Math.floor(Math.random() * calculationTypes.length)];
    
    // Query inventory
    const inventoryResponse = makeRequest('GET', `/api/v1/inventory?securityId=${securityId}&calculationType=${calculationType}`, null, {
      headers: {
        'Authorization': `Bearer ${testContext.token}`
      },
      tags: { operation: 'inventoryCalculation' }
    });
    
    // Check the response
    checkResponseStatus(inventoryResponse, 200);
    checkResponseTime(inventoryResponse, 2000);
    checkInventoryResponse(inventoryResponse);
    
    // During spike, submit locate requests that affect inventory at high volume
    if (isSpike && calculationType === 'LOCATE') {
      // Generate a locate request
      const locateRequest = generateLocateRequest();
      locateRequest.securityId = securityId;
      
      // Submit the locate request
      const locateResponse = makeRequest('POST', '/api/v1/locates', JSON.stringify(locateRequest), {
        headers: {
          'Authorization': `Bearer ${testContext.token}`
        },
        tags: { operation: 'locateRequest' }
      });
      
      checkResponseStatus(locateResponse, 200);
      
      // Query inventory again to verify update (only for a sample during spike)
      if (Math.random() < 0.2) {
        const updatedInventoryResponse = makeRequest('GET', `/api/v1/inventory?securityId=${securityId}&calculationType=${calculationType}`, null, {
          headers: {
            'Authorization': `Bearer ${testContext.token}`
          },
          tags: { operation: 'inventoryCalculation' }
        });
        
        checkResponseStatus(updatedInventoryResponse, 200);
      }
    }
    
    // Query different inventory types in parallel (only during non-spike or for a sample during spike)
    if (!isSpike || Math.random() < 0.3) {
      const requests = calculationTypes.map(type => {
        return {
          method: 'GET',
          url: `/api/v1/inventory?securityId=${securityId}&calculationType=${type}`,
          headers: {
            'Authorization': `Bearer ${testContext.token}`
          },
          tags: { operation: 'inventoryCalculation' }
        };
      });
      
      const responses = http.batch(requests);
      
      for (const response of responses) {
        checkResponseStatus(response, 200);
      }
    }
  }
}

// Execute data ingestion test scenario with spike volume
function executeDataIngestionScenario(testContext, isSpike) {
  const requestCount = isSpike ? 
    testContext.config.requestsPerIteration.spike.dataIngestion : 
    testContext.config.requestsPerIteration.normal.dataIngestion;
  
  // Generate and submit reference data updates
  for (let i = 0; i < requestCount; i++) {
    // Determine which type of data to update
    const updateType = Math.random() < 0.6 ? 'security' : 'counterparty';
    
    if (updateType === 'security') {
      // Select a random security
      let security = null;
      if (testContext.testData.securities.length > 0) {
        const securityIndex = Math.floor(Math.random() * testContext.testData.securities.length);
        security = testContext.testData.securities[securityIndex];
      } else {
        continue;
      }
      
      // Generate a security update
      const securityUpdate = {
        internalId: security.internalId,
        status: Math.random() < 0.9 ? 'ACTIVE' : 'INACTIVE',
        description: security.description + ' (Updated)',
        identifiers: [
          {
            identifierType: 'TICKER',
            identifierValue: security.primaryIdentifierValue,
            source: 'EXCHANGE',
            isPrimary: true
          }
        ]
      };
      
      // Submit the security update
      const securityResponse = makeRequest('PUT', `/api/v1/securities/${security.internalId}`, JSON.stringify(securityUpdate), {
        headers: {
          'Authorization': `Bearer ${testContext.token}`
        },
        tags: { operation: 'updateSecurity' }
      });
      
      checkResponseStatus(securityResponse, 200);
    } else {
      // Select a random counterparty
      let counterparty = null;
      if (testContext.testData.counterparties.length > 0) {
        const counterpartyIndex = Math.floor(Math.random() * testContext.testData.counterparties.length);
        counterparty = testContext.testData.counterparties[counterpartyIndex];
      } else {
        continue;
      }
      
      // Generate a counterparty update
      const counterpartyUpdate = {
        counterpartyId: counterparty.counterpartyId,
        status: Math.random() < 0.9 ? 'ACTIVE' : 'INACTIVE',
        name: counterparty.name,
        shortName: counterparty.shortName,
        type: counterparty.type
      };
      
      // Submit the counterparty update
      const counterpartyResponse = makeRequest('PUT', `/api/v1/counterparties/${counterparty.counterpartyId}`, JSON.stringify(counterpartyUpdate), {
        headers: {
          'Authorization': `Bearer ${testContext.token}`
        },
        tags: { operation: 'updateCounterparty' }
      });
      
      checkResponseStatus(counterpartyResponse, 200);
    }
  }
  
  // Generate and submit market data updates (higher frequency during spike)
  const marketDataCount = isSpike ? requestCount * 3 : requestCount;
  
  for (let i = 0; i < marketDataCount; i++) {
    // Select a random security
    let securityId = "SEC-EQ-001"; // Default
    if (testContext.testData.securities.length > 0) {
      const securityIndex = Math.floor(Math.random() * testContext.testData.securities.length);
      securityId = testContext.testData.securities[securityIndex].internalId;
    }
    
    // Generate market data update
    const marketDataUpdate = {
      securityId: securityId,
      price: Math.random() * 1000 + 50,
      timestamp: new Date().toISOString(),
      source: 'REUTERS'
    };
    
    // Submit the market data update
    const marketDataResponse = makeRequest('POST', '/api/v1/market-data', JSON.stringify(marketDataUpdate), {
      headers: {
        'Authorization': `Bearer ${testContext.token}`
      },
      tags: { operation: 'updateMarketData' }
    });
    
    checkResponseStatus(marketDataResponse, 200);
  }
}

// Execute a mixed scenario that combines multiple workflows to simulate realistic market activity during a spike
function executeMixedScenario(testContext, isSpike) {
  // Execute a mix of operations to simulate real market activity
  // This creates a more realistic test that combines different workflows
  
  // During spike, amplify all operations
  const multiplier = isSpike ? 3 : 1;
  
  // Execute a smaller number of each scenario type in combination
  for (let i = 0; i < multiplier; i++) {
    // Submit locate requests
    executeLocateScenario(testContext, isSpike);
    
    // Submit short sell validations
    executeShortSellScenario(testContext, isSpike);
    
    // Query positions and submit trades
    executePositionScenario(testContext, isSpike);
    
    // Query inventory data
    executeInventoryScenario(testContext, isSpike);
    
    // Only do some data ingestion in mixed mode
    if (Math.random() < 0.3) {
      executeDataIngestionScenario(testContext, isSpike);
    }
  }
}

// Determines if the current test iteration is in the spike phase
function isInSpikePhase() {
  // Get information about current test progress
  const progress = exec.scenario.progress;
  const currentIteration = exec.instance.vusActive;
  
  // The spike occurs between 25% and 50% of the test duration
  // (Based on our configuration in options.scenarios.spike_test.stages)
  const spikeStartPercentage = 0.25; // After first 2 minutes (2m) of 9m total
  const spikeEndPercentage = 0.5;    // After 4 minutes (2m + 20s + 1m + 40s) of 9m total
  
  return progress >= spikeStartPercentage && progress <= spikeEndPercentage;
}

// Cleans up resources after the test completes
export function teardown(data) {
  // Log out or clean up any resources
  if (data && data.token) {
    makeRequest('POST', '/api/v1/logout', null, {
      headers: {
        'Authorization': `Bearer ${data.token}`
      }
    });
  }
  
  // Generate performance metrics for reporting
  console.log('Spike test completed');
}