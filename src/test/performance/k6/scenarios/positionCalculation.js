import http from 'k6/http'; // k6 version: latest
import { sleep, check } from 'k6'; // k6 version: latest
import { group } from 'k6'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest

// Import configuration and helpers
import { getScenarioConfig } from '../config.js';
import { 
  makeRequest, 
  authenticate, 
  parseResponse, 
  randomSleep, 
  setActiveEnvironment,
  formatDate
} from '../lib/helpers.js';

// Import validation utilities
import { 
  checkPositionResponse, 
  checkResponseStatus, 
  checkResponseTime 
} from '../lib/checks.js';

// Import test data utilities
import { 
  getTestDataSet, 
  generatePositionDataBatch,
  SECURITIES,
  BOOKS
} from '../data/testData.js';

// Global test data to be populated in setup
let testData;

// Configure k6 test scenario options
export const options = getScenarioConfig('positionCalculation', __ENV.LOAD_LEVEL || 'normal');

/**
 * Initializes the test environment and prepares test data
 * @returns {object} Test data and configuration for the test execution
 */
export function setup() {
  // Set the active environment based on environment variables or default to 'dev'
  const environment = __ENV.ENVIRONMENT || 'dev';
  setActiveEnvironment(environment);
  
  // Authenticate with the API using test credentials
  const username = __ENV.TEST_USERNAME || 'performance_test_user';
  const password = __ENV.TEST_PASSWORD || 'performance_test_password';
  authenticate(username, password);
  
  // Load position calculation test data
  const data = getTestDataSet('positionCalculation');
  
  // Generate additional position data if needed
  if (data.positions.length < 10) {
    const additionalPositions = generatePositionDataBatch(10, {
      securities: data.securities,
      books: data.books
    });
    data.positions = [...data.positions, ...additionalPositions];
  }
  
  // Return the prepared test data and configuration
  return {
    testData: data,
    environment: environment
  };
}

/**
 * Cleans up after test execution
 * @param {object} data - Data passed from the setup function
 */
export function teardown(data) {
  console.log('Position calculation performance test completed.');
  // No specific cleanup needed for this test scenario
}

/**
 * Retrieves position calculation for a specific security and book
 * @param {string} securityId - Security identifier
 * @param {string} bookId - Book identifier
 * @param {string} businessDate - Business date in YYYY-MM-DD format
 * @returns {object} HTTP response from position calculation API
 */
function getPositionCalculation(securityId, bookId, businessDate) {
  const url = `/api/v1/positions?securityId=${securityId}&bookId=${bookId}&businessDate=${businessDate}`;
  const params = {
    tags: { operation: 'calculatePosition' }
  };
  
  const response = http.get(url, params);
  checkPositionResponse(response);
  
  return response;
}

/**
 * Retrieves settlement ladder for a specific security and book
 * @param {string} securityId - Security identifier
 * @param {string} bookId - Book identifier
 * @param {string} businessDate - Business date in YYYY-MM-DD format
 * @returns {object} HTTP response from settlement ladder API
 */
function getSettlementLadder(securityId, bookId, businessDate) {
  const url = `/api/v1/positions/settlement-ladder?securityId=${securityId}&bookId=${bookId}&businessDate=${businessDate}`;
  const params = {
    tags: { operation: 'getSettlementLadder' }
  };
  
  const response = http.get(url, params);
  checkResponseStatus(response, 200);
  checkResponseTime(response, 2000);
  
  return response;
}

/**
 * Triggers a position calculation update for testing
 * @param {object} positionData - Position data to update
 * @returns {object} HTTP response from position calculation trigger API
 */
function triggerPositionCalculation(positionData) {
  const url = '/api/v1/positions/calculate';
  const payload = JSON.stringify(positionData);
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'calculatePosition' }
  };
  
  const response = http.post(url, payload, params);
  checkResponseStatus(response, 200);
  checkResponseTime(response, 200); // Critical 200ms requirement
  
  return response;
}

/**
 * Performs batch position calculation for multiple securities
 * @param {array} positionDataBatch - Array of position data objects
 * @returns {object} HTTP response from batch position calculation API
 */
function batchPositionCalculation(positionDataBatch) {
  const url = '/api/v1/positions/calculate-batch';
  const payload = JSON.stringify({ positions: positionDataBatch });
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'batchCalculatePosition' }
  };
  
  const response = http.post(url, payload, params);
  checkResponseStatus(response, 200);
  checkResponseTime(response, 500); // Batch calculation can take longer
  
  return response;
}

/**
 * Executes the position calculation test scenario
 * @param {object} data - Test data from setup function
 */
function positionCalculationScenario(data) {
  const testData = data.testData;
  
  group('Single Position Calculation', () => {
    // Select a random security and book from test data
    const security = testData.securities[Math.floor(Math.random() * testData.securities.length)];
    const book = testData.books[Math.floor(Math.random() * testData.books.length)];
    const businessDate = formatDate(new Date());
    
    // Get position calculation
    const response = getPositionCalculation(
      security.id || security,
      book.id || book,
      businessDate
    );
    
    // Validate the response
    check(response, {
      'Position calculation successful': (r) => r.status === 200,
      'Response contains position data': (r) => {
        const data = parseResponse(r);
        return data && data.bookId && data.securityId && data.quantity !== undefined;
      }
    });
    
    // Add random sleep to simulate user think time
    randomSleep(0.5, 1.5);
  });
  
  group('Settlement Ladder Retrieval', () => {
    // Select a random security and book from test data
    const security = testData.securities[Math.floor(Math.random() * testData.securities.length)];
    const book = testData.books[Math.floor(Math.random() * testData.books.length)];
    const businessDate = formatDate(new Date());
    
    // Get settlement ladder
    const response = getSettlementLadder(
      security.id || security,
      book.id || book,
      businessDate
    );
    
    // Validate the response
    check(response, {
      'Settlement ladder retrieval successful': (r) => r.status === 200,
      'Response contains settlement data': (r) => {
        const data = parseResponse(r);
        return data && Array.isArray(data.settlementDays);
      }
    });
    
    // Add random sleep to simulate user think time
    randomSleep(0.5, 1.5);
  });
  
  group('Position Calculation Trigger', () => {
    // Generate position data for a random security and book
    const security = testData.securities[Math.floor(Math.random() * testData.securities.length)];
    const book = testData.books[Math.floor(Math.random() * testData.books.length)];
    const businessDate = formatDate(new Date());
    
    const positionData = {
      bookId: book.id || book,
      securityId: security.id || security,
      businessDate: businessDate,
      contractualQty: Math.floor(Math.random() * 10000) + 1000,
      settledQty: Math.floor(Math.random() * 8000) + 1000,
      sd0Deliver: Math.floor(Math.random() * 1000),
      sd0Receipt: Math.floor(Math.random() * 1000),
      sd1Deliver: Math.floor(Math.random() * 500),
      sd1Receipt: Math.floor(Math.random() * 500)
    };
    
    // Trigger position calculation
    const response = triggerPositionCalculation(positionData);
    
    // Validate the response
    check(response, {
      'Position calculation trigger successful': (r) => r.status === 200,
      'Response within 200ms SLA': (r) => r.timings.duration < 200,
      'Response contains calculation results': (r) => {
        const data = parseResponse(r);
        return data && data.calculationId && data.status;
      }
    });
    
    // Add random sleep to simulate user think time
    randomSleep(0.5, 1.5);
  });
  
  group('Batch Position Calculation', () => {
    // Generate a batch of position data for multiple securities and books
    const batchSize = 5;
    const positionDataBatch = generatePositionDataBatch(batchSize, {
      securities: testData.securities,
      books: testData.books,
      businessDate: formatDate(new Date())
    });
    
    // Perform batch position calculation
    const response = batchPositionCalculation(positionDataBatch);
    
    // Validate the response
    check(response, {
      'Batch position calculation successful': (r) => r.status === 200,
      'Response contains batch results': (r) => {
        const data = parseResponse(r);
        return data && Array.isArray(data.results) && data.results.length === batchSize;
      }
    });
    
    // Add random sleep to simulate user think time
    randomSleep(0.5, 1.5);
  });
}

/**
 * Main test function that executes the position calculation scenario
 * @param {object} data - Test data from setup function
 */
export default function(data) {
  positionCalculationScenario(data);
}