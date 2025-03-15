import { check } from 'k6'; // k6 version: latest
import { http } from 'k6/http'; // k6 version: latest
import { TIMEOUT_SETTINGS } from '../config.js';

// Global flag to enable verbose logging of check results
let verbose = false;

/**
 * Checks if the HTTP response status code matches the expected value
 * @param {object} response - The HTTP response object
 * @param {number} expectedStatus - The expected HTTP status code
 * @returns {boolean} True if the status code matches, false otherwise
 */
export function checkResponseStatus(response, expectedStatus) {
  const result = check(response, {
    [`Status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
  
  logCheckResult('checkResponseStatus', result, {
    expected: expectedStatus,
    actual: response.status
  });
  
  return result;
}

/**
 * Checks if the HTTP response time is below the specified threshold
 * @param {object} response - The HTTP response object
 * @param {number} threshold - The maximum acceptable response time in milliseconds
 * @returns {boolean} True if the response time is below the threshold, false otherwise
 */
export function checkResponseTime(response, threshold) {
  const result = check(response, {
    [`Response time is below ${threshold}ms`]: (r) => r.timings.duration < threshold,
  });
  
  logCheckResult('checkResponseTime', result, {
    threshold: threshold,
    actual: response.timings.duration
  });
  
  return result;
}

/**
 * Checks if the HTTP response body contains the expected properties
 * @param {object} response - The HTTP response object
 * @param {array} expectedProperties - Array of property names to check
 * @returns {boolean} True if all expected properties are present, false otherwise
 */
export function checkResponseBody(response, expectedProperties) {
  let body;
  try {
    body = JSON.parse(response.body);
  } catch (e) {
    logCheckResult('checkResponseBody', false, {
      error: 'Failed to parse response body as JSON'
    });
    return false;
  }
  
  const checks = {};
  for (const prop of expectedProperties) {
    checks[`Response has property ${prop}`] = (r) => body && body[prop] !== undefined;
  }
  
  const result = check(response, checks);
  
  logCheckResult('checkResponseBody', result, {
    expectedProperties: expectedProperties,
    actualBody: verbose ? body : 'Response body (not shown in non-verbose mode)'
  });
  
  return result;
}

/**
 * Validates a locate response against expected criteria
 * @param {object} response - The HTTP response object
 * @returns {boolean} True if the locate response is valid, false otherwise
 */
export function checkLocateResponse(response) {
  // Check for acceptable status codes (200 or 201)
  const statusResult = check(response, {
    'Locate status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
  
  // Check response time
  const timeResult = check(response, {
    [`Locate response time is below ${TIMEOUT_SETTINGS.locate}ms`]: (r) => r.timings.duration < TIMEOUT_SETTINGS.locate,
  });
  
  // Parse body and check required properties
  let body;
  try {
    body = JSON.parse(response.body);
  } catch (e) {
    logCheckResult('checkLocateResponse', false, {
      error: 'Failed to parse locate response body as JSON'
    });
    return false;
  }
  
  // Check for required properties
  const requiredProps = ['requestId', 'status', 'securityId', 'quantity'];
  const propsResult = check(response, {
    'Locate response has required properties': () => {
      return requiredProps.every(prop => body && body[prop] !== undefined);
    }
  });
  
  // Check for valid status value
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
  const statusValueResult = check(response, {
    'Locate status has valid value': () => {
      return body && body.status && validStatuses.includes(body.status);
    }
  });
  
  // Overall result
  const result = statusResult && timeResult && propsResult && statusValueResult;
  
  logCheckResult('checkLocateResponse', result, {
    status: response.status,
    responseTime: response.timings.duration,
    locateStatus: body ? body.status : undefined
  });
  
  return result;
}

/**
 * Validates a short sell validation response against expected criteria
 * @param {object} response - The HTTP response object
 * @returns {boolean} True if the short sell response is valid, false otherwise
 */
export function checkShortSellResponse(response) {
  // Check status is 200
  const statusResult = check(response, {
    'Short sell status is 200': (r) => r.status === 200,
  });
  
  // Check response time - short sell has a strict requirement of 150ms
  const timeResult = check(response, {
    [`Short sell response time is below ${TIMEOUT_SETTINGS.shortSell}ms`]: (r) => r.timings.duration < TIMEOUT_SETTINGS.shortSell,
  });
  
  // Parse body and check required properties
  let body;
  try {
    body = JSON.parse(response.body);
  } catch (e) {
    logCheckResult('checkShortSellResponse', false, {
      error: 'Failed to parse short sell response body as JSON'
    });
    return false;
  }
  
  // Check for required properties
  const requiredProps = ['orderId', 'status', 'clientLimit', 'aggregationUnitLimit'];
  const propsResult = check(response, {
    'Short sell response has required properties': () => {
      return requiredProps.every(prop => body && body[prop] !== undefined);
    }
  });
  
  // Check for valid status value
  const validStatuses = ['APPROVED', 'REJECTED'];
  const statusValueResult = check(response, {
    'Short sell status has valid value': () => {
      return body && body.status && validStatuses.includes(body.status);
    }
  });
  
  // Overall result
  const result = statusResult && timeResult && propsResult && statusValueResult;
  
  logCheckResult('checkShortSellResponse', result, {
    status: response.status,
    responseTime: response.timings.duration,
    shortSellStatus: body ? body.status : undefined
  });
  
  return result;
}

/**
 * Validates a position calculation response against expected criteria
 * @param {object} response - The HTTP response object
 * @returns {boolean} True if the position response is valid, false otherwise
 */
export function checkPositionResponse(response) {
  // Check status is 200
  const statusResult = check(response, {
    'Position status is 200': (r) => r.status === 200,
  });
  
  // Check response time
  const timeResult = check(response, {
    [`Position response time is below ${TIMEOUT_SETTINGS.default}ms`]: (r) => r.timings.duration < TIMEOUT_SETTINGS.default,
  });
  
  // Parse body and check required properties
  let body;
  try {
    body = JSON.parse(response.body);
  } catch (e) {
    logCheckResult('checkPositionResponse', false, {
      error: 'Failed to parse position response body as JSON'
    });
    return false;
  }
  
  // Check for required properties
  const requiredProps = ['bookId', 'securityId', 'quantity'];
  const propsResult = check(response, {
    'Position response has required properties': () => {
      return requiredProps.every(prop => body && body[prop] !== undefined);
    }
  });
  
  // Overall result
  const result = statusResult && timeResult && propsResult;
  
  logCheckResult('checkPositionResponse', result, {
    status: response.status,
    responseTime: response.timings.duration
  });
  
  return result;
}

/**
 * Validates an inventory calculation response against expected criteria
 * @param {object} response - The HTTP response object
 * @returns {boolean} True if the inventory response is valid, false otherwise
 */
export function checkInventoryResponse(response) {
  // Check status is 200
  const statusResult = check(response, {
    'Inventory status is 200': (r) => r.status === 200,
  });
  
  // Check response time
  const timeResult = check(response, {
    [`Inventory response time is below ${TIMEOUT_SETTINGS.default}ms`]: (r) => r.timings.duration < TIMEOUT_SETTINGS.default,
  });
  
  // Parse body and check required properties
  let body;
  try {
    body = JSON.parse(response.body);
  } catch (e) {
    logCheckResult('checkInventoryResponse', false, {
      error: 'Failed to parse inventory response body as JSON'
    });
    return false;
  }
  
  // Check for required properties
  const requiredProps = ['securityId', 'availableQuantity', 'calculationType'];
  const propsResult = check(response, {
    'Inventory response has required properties': () => {
      return requiredProps.every(prop => body && body[prop] !== undefined);
    }
  });
  
  // Overall result
  const result = statusResult && timeResult && propsResult;
  
  logCheckResult('checkInventoryResponse', result, {
    status: response.status,
    responseTime: response.timings.duration
  });
  
  return result;
}

/**
 * Validates an error response against expected criteria
 * @param {object} response - The HTTP response object
 * @param {number} expectedStatus - The expected HTTP error status code
 * @returns {boolean} True if the error response is valid, false otherwise
 */
export function checkErrorResponse(response, expectedStatus) {
  // Check status matches expected error status
  const statusResult = check(response, {
    [`Error status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
  
  // Parse body and check error properties
  let body;
  try {
    body = JSON.parse(response.body);
  } catch (e) {
    logCheckResult('checkErrorResponse', false, {
      error: 'Failed to parse error response body as JSON'
    });
    return false;
  }
  
  // Check for required error properties
  const requiredProps = ['code', 'message'];
  const propsResult = check(response, {
    'Error response has required properties': () => {
      return requiredProps.every(prop => body && body[prop] !== undefined);
    }
  });
  
  // Overall result
  const result = statusResult && propsResult;
  
  logCheckResult('checkErrorResponse', result, {
    expectedStatus: expectedStatus,
    actualStatus: response.status,
    errorCode: body ? body.code : undefined,
    errorMessage: body ? body.message : undefined
  });
  
  return result;
}

/**
 * Runs multiple checks and aggregates the results
 * @param {object} response - The HTTP response object
 * @param {object} checks - Object containing check functions to run and their parameters
 * @returns {object} Object containing check results and overall pass/fail status
 */
export function runChecks(response, checks) {
  const results = {
    overall: true,
    checks: {}
  };
  
  for (const [checkName, checkConfig] of Object.entries(checks)) {
    const { fn, params = [] } = checkConfig;
    
    // Run the check function with the response and any additional parameters
    const result = fn(response, ...params);
    
    // Store the result
    results.checks[checkName] = result;
    
    // Update overall status
    if (!result) {
      results.overall = false;
    }
  }
  
  if (verbose) {
    console.log(`Check results: ${results.overall ? 'PASS' : 'FAIL'}`, results);
  }
  
  return results;
}

/**
 * Sets the verbose flag for detailed check logging
 * @param {boolean} value - The value to set
 */
export function setVerbose(value) {
  verbose = !!value;
}

/**
 * Logs the result of a check if verbose mode is enabled
 * @param {string} checkName - The name of the check
 * @param {boolean} result - The result of the check
 * @param {object} details - Additional details about the check
 */
function logCheckResult(checkName, result, details = {}) {
  if (verbose) {
    console.log(`Check '${checkName}': ${result ? 'PASS' : 'FAIL'}`, details);
  }
}