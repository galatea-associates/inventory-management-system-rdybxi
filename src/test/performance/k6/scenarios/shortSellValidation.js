// Import external k6 modules
import { sleep, check } from 'k6'; // k6 version: latest
import { group } from 'k6'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest

// Import internal helper modules
import { getScenarioConfig } from '../config.js';
import { 
  makeRequest, 
  authenticate, 
  setActiveEnvironment, 
  parseResponse, 
  randomSleep, 
  generateShortSellRequest 
} from '../lib/helpers.js';
import { 
  checkShortSellResponse, 
  runChecks 
} from '../lib/checks.js';
import { 
  getTestDataSet, 
  generateShortSellRequestBatch 
} from '../data/testData.js';

// Global variables to store test data
let testData;
let shortSellRequests;

// Export k6 options for the test scenario
export const options = getScenarioConfig('shortSellValidation', __ENV.LOAD_LEVEL || 'normal');

/**
 * Setup function to initialize the test environment and prepare test data
 * Executed once before the test starts
 * @returns {object} Test data and configuration to be used in the test
 */
export function setup() {
  // Set the active environment based on environment variables or default to 'dev'
  const environment = __ENV.ENVIRONMENT || 'dev';
  const env = setActiveEnvironment(environment);
  
  // Authenticate with the API using test credentials
  authenticate('test_user', 'test_password');
  
  // Get test data set for short sell validation scenario
  testData = getTestDataSet('shortSellValidation');
  
  // Generate a batch of short sell requests using test data
  const requestCount = 100; // Generate 100 different requests for test variety
  shortSellRequests = generateShortSellRequestBatch(requestCount, {
    securities: testData.securities,
    counterparties: testData.counterparties,
    aggregationUnits: testData.aggregationUnits
  });
  
  // Return the prepared test data and configuration
  return {
    testData,
    shortSellRequests,
    environment: env
  };
}

/**
 * Sends a short sell validation request and validates the response
 * @param {object} shortSellRequest - The short sell request to validate
 * @returns {object} Validation response and check results
 */
function validateShortSellOrder(shortSellRequest) {
  // Prepare the API endpoint for short sell validation
  const endpoint = '/api/v1/orders/validate';
  
  // Make a POST request to validate the short sell order
  const response = makeRequest('POST', endpoint, JSON.stringify(shortSellRequest), {
    tags: { operation: 'validateOrder' },
    timeout: __ENV.TIMEOUT || 5000
  });
  
  // Parse the response
  const responseData = parseResponse(response);
  
  // Run checks to validate the response meets requirements
  // This includes checking status, response time < 150ms, and required fields
  const checkResults = runChecks(response, {
    'shortSellResponse': { fn: checkShortSellResponse }
  });
  
  // Return the response and check results
  return {
    response: responseData,
    checks: checkResults
  };
}

/**
 * Main test function that executes the short sell validation test scenario
 * @param {object} data - Data passed from the setup function
 */
export default function(data) {
  // Extract test data from the data parameter
  const { shortSellRequests } = data;
  
  // Group test steps for better reporting
  group('Short Sell Validation', () => {
    // Select a random short sell request from the prepared batch
    const randomIndex = Math.floor(Math.random() * shortSellRequests.length);
    const shortSellRequest = shortSellRequests[randomIndex];
    
    // Call validateShortSellOrder with the selected request
    const result = validateShortSellOrder(shortSellRequest);
    
    // Record metrics for response time and success rate
    if (!result.checks.overall) {
      console.log(`Validation failed for order ${shortSellRequest.orderId}`, JSON.stringify({
        orderId: shortSellRequest.orderId,
        securityId: shortSellRequest.securityId,
        response: result.response,
        vu: exec.vu.idInTest,
        iteration: exec.instance.iterationsCompleted
      }));
    }
    
    // Add random sleep between requests to simulate realistic user behavior
    // Short sleep times are appropriate as this is a high-frequency operation
    randomSleep(0.1, 0.5);
  });
}