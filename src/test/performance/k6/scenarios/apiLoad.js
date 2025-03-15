// Import k6 modules
import http from 'k6/http'; // k6 version: latest
import { sleep, check } from 'k6'; // k6 version: latest
import { group } from 'k6'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest

// Import internal modules
import { getScenarioConfig, HEADERS, TIMEOUT_SETTINGS } from '../config.js';
import { 
    setActiveEnvironment, 
    makeRequest, 
    authenticate, 
    parseResponse,
    randomSleep,
    generateLocateRequest,
    generateShortSellRequest,
    formatDate
} from '../lib/helpers.js';
import {
    checkResponseStatus,
    checkResponseTime,
    checkResponseBody,
    runChecks
} from '../lib/checks.js';
import { getTestDataSet } from '../data/testData.js';

// Load test configuration - configures the test for API load testing with specified load level
export const options = getScenarioConfig('apiLoad', __ENV.LOAD_LEVEL || 'normal');

// Global test data
let testData;
let apiEndpoints;

/**
 * Setup function that runs once before the test to prepare the environment and data
 * @returns {object} Test context data to be passed to the default function
 */
export function setup() {
    // Set the active environment based on environment variables or default to 'dev'
    const env = __ENV.ENVIRONMENT || 'dev';
    setActiveEnvironment(env);
    
    // Authenticate with the API using test credentials
    const authToken = authenticate('performance_test_user', 'performance_test_password');
    
    // Load test data for API load testing
    testData = getTestDataSet('apiLoad');
    
    // Define API endpoints to be tested with their configurations
    apiEndpoints = {
        reference: [
            { path: '/api/v1/securities', method: 'GET', params: {}, expectedProperties: ['data', 'metadata'] },
            { path: '/api/v1/counterparties', method: 'GET', params: {}, expectedProperties: ['data', 'metadata'] },
            { path: '/api/v1/aggregation-units', method: 'GET', params: {}, expectedProperties: ['data', 'metadata'] }
        ],
        position: [
            { path: '/api/v1/positions', method: 'GET', params: { date: formatDate(new Date()) }, expectedProperties: ['data', 'metadata'] },
            { path: '/api/v1/positions/summary', method: 'GET', params: {}, expectedProperties: ['summary'] },
            { path: '/api/v1/positions/settlement-ladder', method: 'GET', params: { date: formatDate(new Date()) }, expectedProperties: ['data', 'metadata'] }
        ],
        inventory: [
            { path: '/api/v1/inventory/for-loan', method: 'GET', params: {}, expectedProperties: ['data', 'metadata'] },
            { path: '/api/v1/inventory/for-pledge', method: 'GET', params: {}, expectedProperties: ['data', 'metadata'] },
            { path: '/api/v1/inventory/overborrows', method: 'GET', params: {}, expectedProperties: ['data', 'metadata'] },
            { path: '/api/v1/inventory/sell-limits', method: 'GET', params: {}, expectedProperties: ['data', 'metadata'] }
        ],
        locate: [
            { path: '/api/v1/locates', method: 'POST', params: {}, expectedProperties: ['requestId', 'status', 'securityId'] }
        ],
        shortSell: [
            { path: '/api/v1/orders/validate', method: 'POST', params: {}, expectedProperties: ['orderId', 'status', 'clientLimit', 'aggregationUnitLimit'] }
        ]
    };
    
    // Return the test context with authentication token, test data, and API endpoints
    return {
        authToken,
        testData,
        apiEndpoints
    };
}

/**
 * Teardown function that runs once after the test to clean up resources
 * @param {object} data - Data from the setup function
 */
export function teardown(data) {
    console.log('API load test completed, performing cleanup');
    // Clean up any resources created during the test
    // Perform any necessary post-test data verification
}

/**
 * Makes requests to reference data API endpoints
 * @param {object} context - Test context containing API endpoints and test data
 * @returns {object} Response and check results
 */
function callReferenceDataAPI(context) {
    const { apiEndpoints } = context;
    
    // Select a random reference data API endpoint from the available options
    const endpoint = apiEndpoints.reference[Math.floor(Math.random() * apiEndpoints.reference.length)];
    
    // Make a GET request to the selected endpoint
    const response = makeRequest(
        endpoint.method, 
        endpoint.path, 
        null, 
        { 
            tags: { operation: 'referenceData' },
            timeout: TIMEOUT_SETTINGS.default 
        }
    );
    
    // Run checks to validate the response (status, time, body)
    const checkResult = runChecks(response, {
        status: { fn: checkResponseStatus, params: [200] },
        time: { fn: checkResponseTime, params: [3000] },
        body: { fn: checkResponseBody, params: [endpoint.expectedProperties] }
    });
    
    return { response, checkResult };
}

/**
 * Makes requests to position API endpoints
 * @param {object} context - Test context containing API endpoints and test data
 * @returns {object} Response and check results
 */
function callPositionAPI(context) {
    const { apiEndpoints, testData } = context;
    
    // Select a random position API endpoint from the available options
    const endpoint = apiEndpoints.position[Math.floor(Math.random() * apiEndpoints.position.length)];
    
    // Build query parameters
    let queryParams = { ...endpoint.params } || {};
    
    // Add filters for specific endpoints
    if (endpoint.path === '/api/v1/positions') {
        // Add random security filter for some requests
        if (Math.random() > 0.5 && testData.securities && testData.securities.length > 0) {
            const security = testData.securities[Math.floor(Math.random() * testData.securities.length)];
            queryParams.securityId = security.id;
        }
        
        // Add random book filter for some requests
        if (Math.random() > 0.5 && testData.books && testData.books.length > 0) {
            const book = testData.books[Math.floor(Math.random() * testData.books.length)];
            queryParams.bookId = book.id;
        }
    }
    
    // Convert params to query string
    const queryString = Object.entries(queryParams)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    
    // Make a GET request to the selected endpoint with appropriate query parameters
    const path = queryString ? `${endpoint.path}?${queryString}` : endpoint.path;
    const response = makeRequest(
        endpoint.method, 
        path, 
        null, 
        { 
            tags: { operation: 'positionData' },
            timeout: TIMEOUT_SETTINGS.default 
        }
    );
    
    // Run checks to validate the response (status, time, body)
    const checkResult = runChecks(response, {
        status: { fn: checkResponseStatus, params: [200] },
        time: { fn: checkResponseTime, params: [3000] },
        body: { fn: checkResponseBody, params: [endpoint.expectedProperties] }
    });
    
    return { response, checkResult };
}

/**
 * Makes requests to inventory API endpoints
 * @param {object} context - Test context containing API endpoints and test data
 * @returns {object} Response and check results
 */
function callInventoryAPI(context) {
    const { apiEndpoints, testData } = context;
    
    // Select a random inventory API endpoint from the available options
    const endpoint = apiEndpoints.inventory[Math.floor(Math.random() * apiEndpoints.inventory.length)];
    
    // Build query parameters
    let queryParams = { ...endpoint.params } || {};
    
    // Add security filter for specific endpoints
    if (endpoint.path.includes('/inventory/')) {
        // Add random security filter for some requests
        if (Math.random() > 0.3 && testData.securities && testData.securities.length > 0) {
            const security = testData.securities[Math.floor(Math.random() * testData.securities.length)];
            queryParams.securityId = security.id;
        }
        
        // Add date parameter
        queryParams.date = formatDate(new Date());
    }
    
    // Convert params to query string
    const queryString = Object.entries(queryParams)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    
    // Make a GET request to the selected endpoint with appropriate query parameters
    const path = queryString ? `${endpoint.path}?${queryString}` : endpoint.path;
    const response = makeRequest(
        endpoint.method, 
        path, 
        null, 
        { 
            tags: { operation: 'inventoryData' },
            timeout: TIMEOUT_SETTINGS.default 
        }
    );
    
    // Run checks to validate the response (status, time, body)
    const checkResult = runChecks(response, {
        status: { fn: checkResponseStatus, params: [200] },
        time: { fn: checkResponseTime, params: [3000] },
        body: { fn: checkResponseBody, params: [endpoint.expectedProperties] }
    });
    
    return { response, checkResult };
}

/**
 * Makes requests to locate API endpoints
 * @param {object} context - Test context containing API endpoints and test data
 * @returns {object} Response and check results
 */
function callLocateAPI(context) {
    const { apiEndpoints } = context;
    
    // Generate a random locate request using test data
    const locateRequest = generateLocateRequest();
    
    // Make a POST request to the locate API endpoint
    const response = makeRequest(
        'POST', 
        '/api/v1/locates', 
        JSON.stringify(locateRequest), 
        { 
            tags: { operation: 'locateRequest' },
            timeout: TIMEOUT_SETTINGS.locate 
        }
    );
    
    // Run checks to validate the response (status, time, body)
    const checkResult = runChecks(response, {
        status: { fn: checkResponseStatus, params: [200] },
        time: { fn: checkResponseTime, params: [TIMEOUT_SETTINGS.locate] },
        body: { fn: checkResponseBody, params: [apiEndpoints.locate[0].expectedProperties] }
    });
    
    return { response, checkResult };
}

/**
 * Makes requests to short sell validation API endpoints
 * @param {object} context - Test context containing API endpoints and test data
 * @returns {object} Response and check results
 */
function callShortSellAPI(context) {
    const { apiEndpoints } = context;
    
    // Generate a random short sell request using test data
    const shortSellRequest = generateShortSellRequest();
    
    // Make a POST request to the short sell validation API endpoint
    const response = makeRequest(
        'POST', 
        '/api/v1/orders/validate', 
        JSON.stringify(shortSellRequest), 
        { 
            tags: { operation: 'shortSellValidation' },
            timeout: TIMEOUT_SETTINGS.shortSell 
        }
    );
    
    // Run checks to validate the response (status, time, body) with strict 150ms requirement
    const checkResult = runChecks(response, {
        status: { fn: checkResponseStatus, params: [200] },
        time: { fn: checkResponseTime, params: [150] }, // Strict 150ms requirement
        body: { fn: checkResponseBody, params: [apiEndpoints.shortSell[0].expectedProperties] }
    });
    
    return { response, checkResult };
}

/**
 * Makes a request to a randomly selected API endpoint
 * @param {object} context - Test context containing API endpoints and test data
 * @returns {object} Response and check results
 */
function callRandomAPI(context) {
    // Define weighted distribution of API calls to simulate realistic usage
    const weightedDistribution = [
        { type: 'reference', weight: 0.15 }, // Reference data (15%)
        { type: 'position', weight: 0.30 },  // Position data (30%)
        { type: 'inventory', weight: 0.25 }, // Inventory data (25%)
        { type: 'locate', weight: 0.15 },    // Locate requests (15%)
        { type: 'shortSell', weight: 0.15 }  // Short sell validation (15%)
    ];
    
    // Generate a random number to select API type
    const random = Math.random();
    let cumulativeWeight = 0;
    let selectedType;
    
    // Select API type based on weighted distribution
    for (const item of weightedDistribution) {
        cumulativeWeight += item.weight;
        if (random <= cumulativeWeight) {
            selectedType = item.type;
            break;
        }
    }
    
    // Call the appropriate API function based on the selected category
    switch (selectedType) {
        case 'reference':
            return callReferenceDataAPI(context);
        case 'position':
            return callPositionAPI(context);
        case 'inventory':
            return callInventoryAPI(context);
        case 'locate':
            return callLocateAPI(context);
        case 'shortSell':
            return callShortSellAPI(context);
        default:
            // Fallback to position API if something goes wrong with the selection
            return callPositionAPI(context);
    }
}

/**
 * Main test function that executes the API load test scenario
 * @param {object} data - Data from the setup function
 */
export default function(data) {
    const context = data;
    
    group('API Load Test', () => {
        // Call a random API endpoint
        const { response, checkResult } = callRandomAPI(context);
        
        // Record metrics for response time, success rate, and throughput
    });
    
    // Add random sleep between requests to simulate realistic user behavior
    randomSleep(0.5, 2.0);
}