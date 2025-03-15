import http from 'k6/http'; // k6 version: latest
import { sleep, check } from 'k6'; // k6 version: latest
import crypto from 'k6/crypto'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest

import { BASE_CONFIG, HEADERS, TIMEOUT_SETTINGS, getEnvironmentConfig } from '../config.js';

// Global variables
let activeEnvironment;
let authToken;
let verbose = false;

/**
 * Sets the active environment configuration for the test
 * @param {string} environment - The environment to use (dev, staging, production)
 * @returns {object} The active environment configuration
 */
export function setActiveEnvironment(environment) {
    activeEnvironment = getEnvironmentConfig(environment);
    return activeEnvironment;
}

/**
 * Returns the currently active environment configuration
 * @returns {object} The active environment configuration
 */
export function getActiveEnvironment() {
    // If no environment is explicitly set, get the default one
    if (!activeEnvironment) {
        activeEnvironment = getEnvironmentConfig('dev');
    }
    return activeEnvironment;
}

/**
 * Makes an HTTP request with proper headers and error handling
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {string} url - URL path (will be appended to base URL)
 * @param {object} payload - Request payload (for POST, PUT, etc.)
 * @param {object} params - Additional request parameters
 * @returns {object} HTTP response
 */
export function makeRequest(method, url, payload = null, params = {}) {
    const env = getActiveEnvironment();
    
    // Build the full URL
    const fullUrl = url.startsWith('http') ? url : `${env.baseUrl}${url}`;
    
    // Set up headers
    const headers = {
        ...HEADERS.common,
        ...(params.headers || {})
    };
    
    // Add JSON content type if payload is present and content type not explicitly set
    if (payload && !headers['Content-Type']) {
        Object.assign(headers, HEADERS.json);
    }
    
    // Add auth token if available
    if (authToken && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Setup request parameters
    const requestParams = {
        headers,
        timeout: params.timeout || TIMEOUT_SETTINGS.default,
        tags: params.tags || {},
        ...params
    };
    
    // Make the request
    let response;
    
    switch (method.toUpperCase()) {
        case 'GET':
            response = http.get(fullUrl, requestParams);
            break;
        case 'POST':
            response = http.post(fullUrl, payload, requestParams);
            break;
        case 'PUT':
            response = http.put(fullUrl, payload, requestParams);
            break;
        case 'DELETE':
            response = http.del(fullUrl, payload, requestParams);
            break;
        case 'PATCH':
            response = http.patch(fullUrl, payload, requestParams);
            break;
        default:
            throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    // Log request and response if verbose mode is enabled
    logVerbose(`${method.toUpperCase()} ${fullUrl} - Status: ${response.status}`);
    if (payload) {
        logVerbose(`Request: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
    }
    logVerbose(`Response: ${response.body.substring(0, 500)}${response.body.length > 500 ? '...' : ''}`);
    
    return response;
}

/**
 * Authenticates with the API and stores the token
 * @param {string} username - Username for authentication
 * @param {string} password - Password for authentication
 * @returns {string} Authentication token
 */
export function authenticate(username, password) {
    const env = getActiveEnvironment();
    
    const payload = JSON.stringify({
        username: username,
        password: password,
        client_id: env.auth.client_id
    });
    
    const response = makeRequest('POST', env.auth.url, payload, {
        tags: { operation: 'authenticate' }
    });
    
    check(response, {
        'authentication successful': (r) => r.status === 200
    });
    
    if (response.status !== 200) {
        throw new Error(`Authentication failed: ${response.status} - ${response.body}`);
    }
    
    const responseData = parseResponse(response);
    authToken = responseData.access_token || responseData.token;
    
    return authToken;
}

/**
 * Parses an HTTP response body as JSON
 * @param {object} response - HTTP response object
 * @returns {object} Parsed JSON object
 */
export function parseResponse(response) {
    try {
        return JSON.parse(response.body);
    } catch (e) {
        logVerbose(`Failed to parse response as JSON: ${e.message}`);
        logVerbose(`Response body: ${response.body.substring(0, 500)}${response.body.length > 500 ? '...' : ''}`);
        return null;
    }
}

/**
 * Adds a random sleep duration to simulate user think time
 * @param {number} min - Minimum sleep time in seconds
 * @param {number} max - Maximum sleep time in seconds
 */
export function randomSleep(min = 1, max = 5) {
    const sleepTime = min + Math.random() * (max - min);
    sleep(sleepTime);
}

/**
 * Logs a message if verbose mode is enabled
 * @param {string} message - Message to log
 */
export function logVerbose(message) {
    if (verbose) {
        console.log(`[${formatDateTime(new Date())}] [VU:${exec.vu.idInTest}] ${message}`);
    }
}

/**
 * Generates a random security ID for test data
 * @returns {string} Random security ID
 */
export function generateRandomSecurityId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'SEC-';
    
    for (let i = 0; i < 5; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
}

/**
 * Generates a random counterparty ID for test data
 * @returns {string} Random counterparty ID
 */
export function generateRandomCounterpartyId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'CP-';
    
    for (let i = 0; i < 5; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
}

/**
 * Generates a random quantity for test data
 * @param {number} min - Minimum quantity
 * @param {number} max - Maximum quantity
 * @returns {number} Random quantity
 */
export function generateRandomQuantity(min = 1000, max = 50000) {
    // Generate a random number between min and max, then round to the nearest 100
    return Math.round((min + Math.random() * (max - min)) / 100) * 100;
}

/**
 * Generates a random locate request for testing
 * @returns {object} Locate request object
 */
export function generateLocateRequest() {
    return {
        requestId: generateUUID(),
        securityId: generateRandomSecurityId(),
        clientId: generateRandomCounterpartyId(),
        requestedQuantity: generateRandomQuantity(),
        requestTimestamp: formatDateTime(new Date()),
        locateType: 'SHORT_SELL',
        swapCashIndicator: Math.random() > 0.5 ? 'SWAP' : 'CASH'
    };
}

/**
 * Generates a random short sell request for testing
 * @returns {object} Short sell request object
 */
export function generateShortSellRequest() {
    return {
        orderId: generateUUID(),
        securityId: generateRandomSecurityId(),
        counterpartyId: generateRandomCounterpartyId(),
        quantity: generateRandomQuantity(),
        side: 'SELL_SHORT',
        price: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
        orderDate: formatDate(new Date())
    };
}

/**
 * Formats a date for API requests
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export function formatDate(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Formats a date and time for API requests
 * @param {Date} date - Date to format
 * @returns {string} Formatted date-time string (ISO format)
 */
export function formatDateTime(date) {
    return date.toISOString();
}

/**
 * Generates a UUID for test data
 * @returns {string} UUID string
 */
export function generateUUID() {
    // Generate a random UUID v4
    return crypto.randomUUID();
}