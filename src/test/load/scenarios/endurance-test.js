import http from 'k6/http'; // k6 version: latest
import { sleep, check } from 'k6'; // k6 version: latest
import { group } from 'k6'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest
import { metrics } from 'k6/metrics'; // k6 version: latest

import { authenticate, setActiveEnvironment, makeRequest, randomSleep, generateLocateRequest, generateShortSellRequest } from '../../performance/k6/lib/helpers.js';
import { checkResponseStatus, checkResponseTime, checkLocateResponse, checkShortSellResponse, checkPositionResponse, checkInventoryResponse } from '../../performance/k6/lib/checks.js';
import { getLoadProfile, getThresholds } from '../../performance/k6/config.js';
import testData from '../data/test-data.json';

// Configuration for endurance testing
export const options = {
  // Moderate but consistent load for extended duration
  scenarios: {
    enduranceTest: {
      executor: 'constant-arrival-rate',
      rate: 50, // 50 iterations per second
      timeUnit: '1s',
      duration: '8h', // 8 hour test duration
      preAllocatedVUs: 100,
      maxVUs: 150,
    },
  },
  thresholds: {
    // System should maintain performance over extended period
    'http_req_duration': ['p(99)<3000', 'p(95)<2000', 'p(50)<1000'],
    'http_req_duration{operation:shortSellValidation}': ['p(99)<150', 'p(95)<100'],
    'http_req_duration{operation:positionCalculation}': ['p(99)<200', 'p(95)<150'],
    'http_req_failed': ['rate<0.001'], // 99.9% success rate over long duration
    'checks': ['rate>0.999'], // Ensure checks pass consistently
  },
  // Tags for test identification and filtering
  tags: {
    testType: 'endurance',
    application: 'ims',
  },
  // Don't discard response bodies for endurance test validation
  discardResponseBodies: false,
};

// Custom metrics for tracking performance degradation over time
const degradationMetrics = {
  responseTimeMovingAvg: metrics.new('response_time_moving_avg', metrics.Trend),
  errorRateMovingAvg: metrics.new('error_rate_moving_avg', metrics.Rate),
  throughputMovingAvg: metrics.new('throughput_moving_avg', metrics.Counter),
  resourceUtilization: metrics.new('resource_utilization', metrics.Gauge),
  memoryLeakIndicator: metrics.new('memory_usage_trend', metrics.Trend),
};

// Setup function - initializes the test environment
export function setup() {
  // Set active environment based on environment variable or default to staging
  const environment = __ENV.ENV_TARGET || 'staging';
  const activeEnv = setActiveEnvironment(environment);
  
  // Authenticate with the API
  const username = __ENV.USERNAME || 'performance_test_user';
  const password = __ENV.PASSWORD || 'performance_test_password';
  const token = authenticate(username, password);
  
  // Load test data
  const securities = testData.securities || [];
  const counterparties = testData.counterparties || [];
  const positions = testData.positions || [];
  const locates = testData.locates || [];
  
  // Get endurance test configuration
  const loadProfile = getLoadProfile('apiLoad', 'endurance');
  const thresholds = getThresholds('apiLoad');
  
  console.log(`Starting endurance test in ${environment} environment with ${loadProfile.rate} iterations/s for ${loadProfile.duration}`);
  
  // Return test context
  return {
    token,
    environment,
    securities,
    counterparties,
    positions,
    locates,
    testConfig: {
      loadProfile,
      thresholds
    },
    startTime: new Date().getTime(),
  };
}

// Main test function
export default function(data) {
  // Determine which scenario to run based on a weighted distribution
  const scenarios = [
    { name: "locate", weight: 0.2, fn: executeEnduranceLocateScenario },
    { name: "shortSell", weight: 0.2, fn: executeEnduranceShortSellScenario },
    { name: "position", weight: 0.2, fn: executeEndurancePositionScenario },
    { name: "inventory", weight: 0.15, fn: executeEnduranceInventoryScenario },
    { name: "dataIngestion", weight: 0.15, fn: executeEnduranceDataIngestionScenario },
    { name: "mixed", weight: 0.1, fn: executeEnduranceMixedScenario }
  ];
  
  // Calculate total weight
  const totalWeight = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
  
  // Generate a random number between 0 and totalWeight
  const random = Math.random() * totalWeight;
  
  // Determine which scenario to run
  let currentWeight = 0;
  let selectedScenario = scenarios[0].fn;
  
  for (const scenario of scenarios) {
    currentWeight += scenario.weight;
    if (random <= currentWeight) {
      selectedScenario = scenario.fn;
      break;
    }
  }
  
  // Create test context
  const testContext = {
    token: data.token,
    environment: data.environment,
    securities: data.securities,
    counterparties: data.counterparties,
    positions: data.positions,
    locates: data.locates,
    testData: testData,
    iterationStartTime: new Date().getTime(),
    testStartTime: data.startTime,
    iterationCount: exec.scenario.iterationInTest
  };
  
  // Execute the selected scenario
  selectedScenario(testContext);
  
  // Periodically check for resource utilization and memory leaks
  if (exec.scenario.iterationInTest % 100 === 0) {
    const utilization = checkResourceUtilization(testContext);
    degradationMetrics.resourceUtilization.add(utilization.cpuUtilization);
    degradationMetrics.memoryLeakIndicator.add(utilization.memoryUsage);
    
    // Log periodic test status for long-running test visibility
    const elapsedMinutes = Math.floor((new Date().getTime() - data.startTime) / 60000);
    console.log(`Endurance test running for ${elapsedMinutes} minutes. Iteration: ${exec.scenario.iterationInTest}`);
  }
}

// Execute the locate approval workflow endurance scenario
function executeEnduranceLocateScenario(testContext) {
  group("Endurance - Locate Approval Workflow", function() {
    // Generate a locate request
    const locateRequest = generateLocateRequest();
    const securityIndex = Math.floor(Math.random() * testContext.securities.length);
    const counterpartyIndex = Math.floor(Math.random() * testContext.counterparties.length);
    
    locateRequest.securityId = testContext.securities[securityIndex].internalId;
    locateRequest.clientId = testContext.counterparties[counterpartyIndex].counterpartyId;
    
    // Submit the locate request
    const response = makeRequest('POST', '/api/v1/locates', JSON.stringify(locateRequest), {
      tags: { operation: 'locateRequest' }
    });
    
    // Check response
    const responseValid = checkLocateResponse(response);
    check(response, {
      'locate request successful': (r) => r.status === 200 || r.status === 201,
      'locate response time acceptable': (r) => r.timings.duration < 3000,
    });
    
    // Track response time for degradation monitoring
    trackPerformanceDegradation('locateRequest', response.timings.duration, {
      security: locateRequest.securityId,
      client: locateRequest.clientId
    });
    
    // If locate was successful, check the status
    if (responseValid) {
      const locateData = JSON.parse(response.body);
      
      // Wait a moment before checking status - simulating realistic user behavior
      randomSleep(1, 2);
      
      // Check locate status
      const statusResponse = makeRequest('GET', `/api/v1/locates/${locateData.requestId}`, null, {
        tags: { operation: 'locateStatus' }
      });
      
      check(statusResponse, {
        'locate status check successful': (r) => r.status === 200,
        'locate status response time acceptable': (r) => r.timings.duration < 2000,
      });
      
      // Track response time for degradation monitoring
      trackPerformanceDegradation('locateStatus', statusResponse.timings.duration, {
        security: locateRequest.securityId,
        client: locateRequest.clientId
      });
      
      // If the locate was approved, check inventory
      if (statusResponse.status === 200) {
        const statusData = JSON.parse(statusResponse.body);
        
        if (statusData.status === 'APPROVED') {
          // Check inventory availability
          const inventoryResponse = makeRequest('GET', `/api/v1/inventory/for-loan?securityId=${locateRequest.securityId}`, null, {
            tags: { operation: 'inventoryCheck' }
          });
          
          check(inventoryResponse, {
            'inventory check successful': (r) => r.status === 200,
            'inventory response time acceptable': (r) => r.timings.duration < 2000,
          });
          
          // Track response time for degradation monitoring
          trackPerformanceDegradation('inventoryCheck', inventoryResponse.timings.duration, {
            security: locateRequest.securityId
          });
        }
      }
    }
    
    // Simulate user think time
    randomSleep(2, 5);
  });
}

// Execute the short sell validation workflow endurance scenario
function executeEnduranceShortSellScenario(testContext) {
  group("Endurance - Short Sell Validation Workflow", function() {
    // Generate a short sell request
    const shortSellRequest = generateShortSellRequest();
    const securityIndex = Math.floor(Math.random() * testContext.securities.length);
    const counterpartyIndex = Math.floor(Math.random() * testContext.counterparties.length);
    
    shortSellRequest.securityId = testContext.securities[securityIndex].internalId;
    shortSellRequest.counterpartyId = testContext.counterparties[counterpartyIndex].counterpartyId;
    
    // Submit the short sell validation request
    const response = makeRequest('POST', '/api/v1/orders/validate', JSON.stringify(shortSellRequest), {
      tags: { operation: 'shortSellValidation' }
    });
    
    // Check response - critical SLA requirement: 99% of short sell validations must complete within 150ms
    const responseValid = checkShortSellResponse(response);
    check(response, {
      'short sell validation successful': (r) => r.status === 200,
      'short sell validation within SLA': (r) => r.timings.duration < 150,
    });
    
    // Track response time for degradation monitoring
    trackPerformanceDegradation('shortSellValidation', response.timings.duration, {
      security: shortSellRequest.securityId,
      client: shortSellRequest.counterpartyId
    });
    
    // If validation was successful, check client limits
    if (responseValid) {
      const validationData = JSON.parse(response.body);
      
      // Check client limits
      const limitResponse = makeRequest('GET', `/api/v1/limits/client/${shortSellRequest.counterpartyId}?securityId=${shortSellRequest.securityId}`, null, {
        tags: { operation: 'clientLimitCheck' }
      });
      
      check(limitResponse, {
        'client limit check successful': (r) => r.status === R200,
        'client limit response time acceptable': (r) => r.timings.duration < 2000,
      });
      
      // Track response time for degradation monitoring
      trackPerformanceDegradation('clientLimitCheck', limitResponse.timings.duration, {
        security: shortSellRequest.securityId,
        client: shortSellRequest.counterpartyId
      });
      
      // Wait a moment before next request - simulating realistic user behavior
      randomSleep(0.5, 1);
      
      // Check aggregation unit limits
      const auLimitResponse = makeRequest('GET', `/api/v1/limits/aggregation-unit/${validationData.aggregationUnitId}?securityId=${shortSellRequest.securityId}`, null, {
        tags: { operation: 'auLimitCheck' }
      });
      
      check(auLimitResponse, {
        'AU limit check successful': (r) => r.status === 200,
        'AU limit response time acceptable': (r) => r.timings.duration < 2000,
      });
      
      // Track response time for degradation monitoring
      trackPerformanceDegradation('auLimitCheck', auLimitResponse.timings.duration, {
        security: shortSellRequest.securityId,
        aggregationUnit: validationData.aggregationUnitId
      });
    }
    
    // Simulate user think time
    randomSleep(1, 3);
  });
}

// Execute the position calculation endurance scenario
function executeEndurancePositionScenario(testContext) {
  group("Endurance - Position Calculation", function() {
    // Select a random security and book
    const securityIndex = Math.floor(Math.random() * testContext.securities.length);
    const bookId = testContext.positions[Math.floor(Math.random() * testContext.positions.length)].bookId;
    const securityId = testContext.securities[securityIndex].internalId;
    
    // Query position data
    const response = makeRequest('GET', `/api/v1/positions?securityId=${securityId}&bookId=${bookId}`, null, {
      tags: { operation: 'positionCalculation' }
    });
    
    // Check response
    const responseValid = checkPositionResponse(response);
    check(response, {
      'position query successful': (r) => r.status === 200,
      'position response time within SLA': (r) => r.timings.duration < 200,
    });
    
    // Track response time for degradation monitoring
    trackPerformanceDegradation('positionCalculation', response.timings.duration, {
      security: securityId,
      book: bookId
    });
    
    // Simulate a trade that will affect positions
    if (responseValid) {
      const tradeRequest = {
        securityId: securityId,
        bookId: bookId,
        counterpartyId: testContext.counterparties[Math.floor(Math.random() * testContext.counterparties.length)].counterpartyId,
        quantity: 1000 + Math.floor(Math.random() * 9000),
        price: 100 + Math.random() * 900,
        tradeDate: new Date().toISOString().split('T')[0],
        settlementDate: new Date().toISOString().split('T')[0],
        tradeType: Math.random() > 0.5 ? 'BUY' : 'SELL'
      };
      
      const tradeResponse = makeRequest('POST', '/api/v1/trades', JSON.stringify(tradeRequest), {
        tags: { operation: 'tradeSubmission' }
      });
      
      check(tradeResponse, {
        'trade submission successful': (r) => r.status === 200 || r.status === 201,
        'trade response time acceptable': (r) => r.timings.duration < 2000,
      });
      
      // Track response time for degradation monitoring
      trackPerformanceDegradation('tradeSubmission', tradeResponse.timings.duration, {
        security: securityId,
        book: bookId
      });
      
      // Wait a moment for the trade to be processed
      randomSleep(1, 2);
      
      // Query position data again to verify updates
      const updatedPositionResponse = makeRequest('GET', `/api/v1/positions?securityId=${securityId}&bookId=${bookId}`, null, {
        tags: { operation: 'positionCalculation' }
      });
      
      check(updatedPositionResponse, {
        'updated position query successful': (r) => r.status === 200,
        'updated position response time within SLA': (r) => r.timings.duration < 200,
      });
      
      // Track response time for degradation monitoring
      trackPerformanceDegradation('positionCalculation', updatedPositionResponse.timings.duration, {
        security: securityId,
        book: bookId,
        updateCheck: true
      });
      
      // Check settlement ladder
      const settlementResponse = makeRequest('GET', `/api/v1/positions/settlement-ladder?securityId=${securityId}&bookId=${bookId}`, null, {
        tags: { operation: 'settlementLadder' }
      });
      
      check(settlementResponse, {
        'settlement ladder query successful': (r) => r.status === 200,
        'settlement ladder response time acceptable': (r) => r.timings.duration < 2000,
      });
      
      // Track response time for degradation monitoring
      trackPerformanceDegradation('settlementLadder', settlementResponse.timings.duration, {
        security: securityId,
        book: bookId
      });
    }
    
    // Simulate user think time
    randomSleep(2, 4);
  });
}

// Execute the inventory calculation endurance scenario
function executeEnduranceInventoryScenario(testContext) {
  group("Endurance - Inventory Calculation", function() {
    // Select a random security
    const securityIndex = Math.floor(Math.random() * testContext.securities.length);
    const securityId = testContext.securities[securityIndex].internalId;
    
    // Query inventory availability
    const response = makeRequest('GET', `/api/v1/inventory/for-loan?securityId=${securityId}`, null, {
      tags: { operation: 'inventoryCalculation' }
    });
    
    // Check response
    const responseValid = checkInventoryResponse(response);
    check(response, {
      'inventory query successful': (r) => r.status === 200,
      'inventory response time acceptable': (r) => r.timings.duration < 500,
    });
    
    // Track response time for degradation monitoring
    trackPerformanceDegradation('inventoryCalculation', response.timings.duration, {
      security: securityId,
      calculationType: 'FOR_LOAN'
    });
    
    // If inventory query was successful, submit a locate request that will affect inventory
    if (responseValid) {
      const locateRequest = generateLocateRequest();
      locateRequest.securityId = securityId;
      locateRequest.clientId = testContext.counterparties[Math.floor(Math.random() * testContext.counterparties.length)].counterpartyId;
      
      const locateResponse = makeRequest('POST', '/api/v1/locates', JSON.stringify(locateRequest), {
        tags: { operation: 'locateRequest' }
      });
      
      check(locateResponse, {
        'locate request successful': (r) => r.status === 200 || r.status === 201,
        'locate response time acceptable': (r) => r.timings.duration < 3000,
      });
      
      // Track response time for degradation monitoring
      trackPerformanceDegradation('locateRequest', locateResponse.timings.duration, {
        security: securityId,
        client: locateRequest.clientId
      });
      
      // Wait a moment for the locate to be processed
      randomSleep(1, 2);
      
      // Query inventory data again to verify updates
      const updatedInventoryResponse = makeRequest('GET', `/api/v1/inventory/for-loan?securityId=${securityId}`, null, {
        tags: { operation: 'inventoryCalculation' }
      });
      
      check(updatedInventoryResponse, {
        'updated inventory query successful': (r) => r.status === 200,
        'updated inventory response time acceptable': (r) => r.timings.duration < 500,
      });
      
      // Track response time for degradation monitoring
      trackPerformanceDegradation('inventoryCalculation', updatedInventoryResponse.timings.duration, {
        security: securityId,
        calculationType: 'FOR_LOAN',
        updateCheck: true
      });
      
      // Check for-pledge inventory
      const pledgeResponse = makeRequest('GET', `/api/v1/inventory/for-pledge?securityId=${securityId}`, null, {
        tags: { operation: 'inventoryCalculation' }
      });
      
      check(pledgeResponse, {
        'pledge inventory query successful': (r) => r.status === 200,
        'pledge inventory response time acceptable': (r) => r.timings.duration < 500,
      });
      
      // Track response time for degradation monitoring
      trackPerformanceDegradation('inventoryCalculation', pledgeResponse.timings.duration, {
        security: securityId,
        calculationType: 'FOR_PLEDGE'
      });
    }
    
    // Simulate user think time
    randomSleep(2, 4);
  });
}

// Execute the data ingestion endurance scenario
function executeEnduranceDataIngestionScenario(testContext) {
  group("Endurance - Data Ingestion", function() {
    // Generate reference data update
    const securityIndex = Math.floor(Math.random() * testContext.securities.length);
    const securityId = testContext.securities[securityIndex].internalId;
    
    const referenceUpdate = {
      internalId: securityId,
      status: "ACTIVE",
      description: `Updated description ${new Date().toISOString()}`,
      identifiers: [
        {
          identifierType: "TICKER",
          identifierValue: testContext.securities[securityIndex].primaryIdentifierValue,
          source: "EXCHANGE",
          isPrimary: true
        }
      ]
    };
    
    // Submit reference data update
    const refResponse = makeRequest('PUT', `/api/v1/securities/${securityId}`, JSON.stringify(referenceUpdate), {
      tags: { operation: 'referenceUpdate' }
    });
    
    check(refResponse, {
      'reference update successful': (r) => r.status === 200,
      'reference update response time acceptable': (r) => r.timings.duration < 2000,
    });
    
    // Track response time for degradation monitoring
    trackPerformanceDegradation('referenceUpdate', refResponse.timings.duration, {
      security: securityId
    });
    
    // Generate market data update
    const marketUpdate = {
      securityId: securityId,
      price: 100 + Math.random() * 900,
      timestamp: new Date().toISOString(),
      source: "REUTERS",
      priceType: "LAST"
    };
    
    // Submit market data update
    const marketResponse = makeRequest('POST', '/api/v1/market-data', JSON.stringify(marketUpdate), {
      tags: { operation: 'marketDataUpdate' }
    });
    
    check(marketResponse, {
      'market data update successful': (r) => r.status === 200 || r.status === 201,
      'market data update response time acceptable': (r) => r.timings.duration < 1000,
    });
    
    // Track response time for degradation monitoring
    trackPerformanceDegradation('marketDataUpdate', marketResponse.timings.duration, {
      security: securityId
    });
    
    // Query updated data to verify ingestion
    const verifyResponse = makeRequest('GET', `/api/v1/securities/${securityId}`, null, {
      tags: { operation: 'referenceQuery' }
    });
    
    check(verifyResponse, {
      'reference query successful': (r) => r.status === 200,
      'reference query response time acceptable': (r) => r.timings.duration < 1000,
    });
    
    // Track response time for degradation monitoring
    trackPerformanceDegradation('referenceQuery', verifyResponse.timings.duration, {
      security: securityId
    });
    
    // Simulate processing time
    randomSleep(1, 3);
  });
}

// Execute a mixed scenario that combines multiple workflows
function executeEnduranceMixedScenario(testContext) {
  group("Endurance - Mixed Workflow", function() {
    // Select random security and counterparty
    const securityIndex = Math.floor(Math.random() * testContext.securities.length);
    const counterpartyIndex = Math.floor(Math.random() * testContext.counterparties.length);
    const securityId = testContext.securities[securityIndex].internalId;
    const counterpartyId = testContext.counterparties[counterpartyIndex].counterpartyId;
    
    // First query positions
    const positionResponse = makeRequest('GET', `/api/v1/positions?securityId=${securityId}&counterpartyId=${counterpartyId}`, null, {
      tags: { operation: 'positionQuery' }
    });
    
    check(positionResponse, {
      'position query successful': (r) => r.status === 200,
      'position query response time acceptable': (r) => r.timings.duration < 2000,
    });
    
    // Track response time for degradation monitoring
    trackPerformanceDegradation('positionQuery', positionResponse.timings.duration, {
      security: securityId,
      counterparty: counterpartyId
    });
    
    // Then query inventory
    const inventoryResponse = makeRequest('GET', `/api/v1/inventory/for-loan?securityId=${securityId}`, null, {
      tags: { operation: 'inventoryQuery' }
    });
    
    check(inventoryResponse, {
      'inventory query successful': (r) => r.status === 200,
      'inventory query response time acceptable': (r) => r.timings.duration < 2000,
    });
    
    // Track response time for degradation monitoring
    trackPerformanceDegradation('inventoryQuery', inventoryResponse.timings.duration, {
      security: securityId
    });
    
    // Simulate user thinking about inventory data
    randomSleep(1, 2);
    
    // Submit a locate request
    const locateRequest = generateLocateRequest();
    locateRequest.securityId = securityId;
    locateRequest.clientId = counterpartyId;
    
    const locateResponse = makeRequest('POST', '/api/v1/locates', JSON.stringify(locateRequest), {
      tags: { operation: 'locateRequest' }
    });
    
    check(locateResponse, {
      'locate request successful': (r) => r.status === 200 || r.status === 201,
      'locate response time acceptable': (r) => r.timings.duration < 3000,
    });
    
    // Track response time for degradation monitoring
    trackPerformanceDegradation('locateRequest', locateResponse.timings.duration, {
      security: securityId,
      counterparty: counterpartyId
    });
    
    // Wait for locate processing
    randomSleep(0.5, 1);
    
    // Submit a short sell validation request
    if (locateResponse.status === 200 || locateResponse.status === 201) {
      const locateData = JSON.parse(locateResponse.body);
      
      if (locateData.status === 'APPROVED') {
        const shortSellRequest = generateShortSellRequest();
        shortSellRequest.securityId = securityId;
        shortSellRequest.counterpartyId = counterpartyId;
        shortSellRequest.quantity = locateRequest.requestedQuantity;
        
        const shortSellResponse = makeRequest('POST', '/api/v1/orders/validate', JSON.stringify(shortSellRequest), {
          tags: { operation: 'shortSellValidation' }
        });
        
        check(shortSellResponse, {
          'short sell validation successful': (r) => r.status === 200,
          'short sell validation within SLA': (r) => r.timings.duration < 150,
        });
        
        // Track response time for degradation monitoring
        trackPerformanceDegradation('shortSellValidation', shortSellResponse.timings.duration, {
          security: securityId,
          counterparty: counterpartyId
        });
      }
    }
    
    // Finally query updated inventory
    const updatedInventoryResponse = makeRequest('GET', `/api/v1/inventory/for-loan?securityId=${securityId}`, null, {
      tags: { operation: 'inventoryQuery' }
    });
    
    check(updatedInventoryResponse, {
      'updated inventory query successful': (r) => r.status === 200,
      'updated inventory query response time acceptable': (r) => r.timings.duration < 2000,
    });
    
    // Track response time for degradation monitoring
    trackPerformanceDegradation('inventoryQuery', updatedInventoryResponse.timings.duration, {
      security: securityId,
      updateCheck: true
    });
    
    // Simulate user think time
    randomSleep(2, 5);
  });
}

// Tracks performance metrics over time to identify degradation patterns
function trackPerformanceDegradation(metricName, value, tags) {
  // Calculate test duration in minutes
  const currentTime = new Date().getTime();
  const testDuration = Math.floor((currentTime - exec.scenario.startTime) / 60000);
  
  // Add duration tag to track performance changes over time
  const tagWithDuration = { ...tags, durationMinute: testDuration };
  
  // Record the raw metric
  degradationMetrics.responseTimeMovingAvg.add(value, tagWithDuration);
  
  // Update throughput count
  degradationMetrics.throughputMovingAvg.add(1, { operation: metricName, ...tagWithDuration });
  
  // Record error if response time exceeds threshold
  let errorThreshold;
  switch(metricName) {
    case 'shortSellValidation':
      errorThreshold = 150;
      break;
    case 'positionCalculation':
      errorThreshold = 200;
      break;
    default:
      errorThreshold = 3000;
  }
  
  if (value > errorThreshold) {
    degradationMetrics.errorRateMovingAvg.add(1, { operation: metricName, ...tagWithDuration });
  }
}

// Checks for resource utilization issues during the endurance test
function checkResourceUtilization(testContext) {
  // Make a request to a system health endpoint to get resource metrics
  const healthResponse = makeRequest('GET', '/api/v1/system/health', null, {
    tags: { operation: 'systemHealth' }
  });
  
  let utilization = {
    cpuUtilization: 0,
    memoryUsage: 0,
    connectionPoolUsage: 0,
    threadCount: 0,
    errorRate: 0
  };
  
  if (healthResponse.status === 200) {
    try {
      const healthData = JSON.parse(healthResponse.body);
      
      utilization = {
        cpuUtilization: healthData.cpu || 0,
        memoryUsage: healthData.memory || 0,
        connectionPoolUsage: healthData.connectionPool || 0,
        threadCount: healthData.threads || 0,
        errorRate: healthData.errorRate || 0
      };
      
      // Log warnings for concerning resource utilization
      if (utilization.cpuUtilization > 80) {
        console.warn(`High CPU utilization detected: ${utilization.cpuUtilization}%`);
      }
      
      if (utilization.memoryUsage > 80) {
        console.warn(`High memory usage detected: ${utilization.memoryUsage}%`);
      }
      
      if (utilization.connectionPoolUsage > 80) {
        console.warn(`High connection pool usage detected: ${utilization.connectionPoolUsage}%`);
      }
      
      // Check for memory leak indicators (continuously increasing memory usage)
      if (exec.scenario.iterationInTest > 0 && exec.scenario.iterationInTest % 1000 === 0) {
        const testDuration = Math.floor((new Date().getTime() - testContext.testStartTime) / 60000);
        console.log(`Memory usage at ${testDuration} minutes: ${utilization.memoryUsage}%`);
      }
    } catch (e) {
      console.error('Failed to parse health response:', e);
    }
  }
  
  return utilization;
}

// Teardown function to clean up and generate reports
export function teardown(data) {
  console.log('Endurance test completed');
  
  // Calculate total test duration
  const endTime = new Date().getTime();
  const totalDurationMinutes = Math.floor((endTime - data.startTime) / 60000);
  
  console.log(`Test ran for ${totalDurationMinutes} minutes`);
  
  // Log final performance metrics
  console.log(`
Performance metrics summary:
---------------------------
Test duration: ${totalDurationMinutes} minutes
Start time: ${new Date(data.startTime).toISOString()}
End time: ${new Date(endTime).toISOString()}
Environment: ${data.environment}

Compare the start and end performance metrics to identify degradation.
Check the custom metrics in the results dashboard for detailed analysis.
  `);
  
  // No need to explicitly clean up as k6 will handle that
}