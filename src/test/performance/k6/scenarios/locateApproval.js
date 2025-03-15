// Import external dependencies
import http from 'k6/http'; // k6 version: latest
import { sleep, check } from 'k6'; // k6 version: latest
import { group } from 'k6'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest

// Import internal dependencies
import { getScenarioConfig, HEADERS, TIMEOUT_SETTINGS } from '../config.js';
import { 
    setActiveEnvironment, 
    makeRequest, 
    authenticate, 
    parseResponse, 
    randomSleep, 
    generateLocateRequest 
} from '../lib/helpers.js';
import { 
    checkLocateResponse, 
    checkResponseStatus, 
    checkResponseTime 
} from '../lib/checks.js';
import { 
    getTestDataSet, 
    generateLocateRequestBatch, 
    SECURITIES, 
    COUNTERPARTIES 
} from '../data/testData.js';

// Global variables to persist state between iterations
let testData;
let pendingLocates = [];

// Test configuration based on the scenario name and optional environment load level
export const options = getScenarioConfig('locateApproval', __ENV.LOAD_LEVEL || 'normal');

/**
 * Setup function that runs once before the test to prepare the environment and data
 * @returns {object} Test context data to be passed to the default function
 */
export function setup() {
    // Set active environment (dev, staging, production)
    const env = __ENV.ENVIRONMENT || 'dev';
    setActiveEnvironment(env);
    
    // Authenticate with the API
    const token = authenticate('test_user', 'test_password');
    
    // Get test data for locate approval scenario
    testData = getTestDataSet('locateApproval');
    
    // Generate a batch of locate requests for testing
    const locateRequests = generateLocateRequestBatch(20, {
        securities: testData.securities,
        counterparties: testData.counterparties
    });
    
    return {
        token: token,
        testData: testData,
        locateRequests: locateRequests
    };
}

/**
 * Teardown function that runs once after the test to clean up resources
 * @param {object} data - The data returned from the setup function
 */
export function teardown(data) {
    console.log('Locate approval performance test completed');
    // Any required cleanup would go here
}

/**
 * Creates a new locate request in the system
 * @param {object} locateRequest - The locate request to submit
 * @returns {object} The created locate request response
 */
function createLocateRequest(locateRequest) {
    const response = makeRequest('POST', '/api/v1/locates', JSON.stringify(locateRequest), {
        tags: { operation: 'submitLocate' },
        timeout: TIMEOUT_SETTINGS.locate
    });
    
    checkLocateResponse(response);
    
    return parseResponse(response);
}

/**
 * Retrieves a locate request by its ID
 * @param {string} requestId - The ID of the locate request to retrieve
 * @returns {object} The locate request response
 */
function getLocateRequest(requestId) {
    const response = makeRequest('GET', `/api/v1/locates/${requestId}`, null, {
        tags: { operation: 'checkStatus' },
        timeout: TIMEOUT_SETTINGS.locate
    });
    
    checkResponseStatus(response, 200);
    checkResponseTime(response, TIMEOUT_SETTINGS.locate);
    
    return parseResponse(response);
}

/**
 * Retrieves all pending locate requests
 * @returns {array} List of pending locate requests
 */
function getPendingLocates() {
    const response = makeRequest('GET', '/api/v1/locates/pending', null, {
        tags: { operation: 'getPendingLocates' },
        timeout: TIMEOUT_SETTINGS.locate
    });
    
    checkResponseStatus(response, 200);
    checkResponseTime(response, TIMEOUT_SETTINGS.locate);
    
    return parseResponse(response);
}

/**
 * Approves a pending locate request
 * @param {string} requestId - The ID of the locate request to approve
 * @param {number} approvedQuantity - The quantity to approve
 * @param {string} approvedBy - The user approving the request
 * @param {string} securityTemperature - The security temperature (HTB/GC)
 * @param {number} borrowRate - The borrow rate
 * @returns {object} The approved locate request response
 */
function approveLocateRequest(requestId, approvedQuantity, approvedBy, securityTemperature = 'GC', borrowRate = 0.5) {
    const payload = {
        requestId: requestId,
        approvedQuantity: approvedQuantity,
        approvedBy: approvedBy,
        securityTemperature: securityTemperature,
        borrowRate: borrowRate
    };
    
    const response = makeRequest('POST', `/api/v1/locates/${requestId}/approve`, JSON.stringify(payload), {
        tags: { operation: 'approveLocate' },
        timeout: TIMEOUT_SETTINGS.locate
    });
    
    checkLocateResponse(response);
    
    return parseResponse(response);
}

/**
 * Rejects a pending locate request
 * @param {string} requestId - The ID of the locate request to reject
 * @param {string} rejectionReason - The reason for rejection
 * @param {string} rejectedBy - The user rejecting the request
 * @returns {object} The rejected locate request response
 */
function rejectLocateRequest(requestId, rejectionReason, rejectedBy) {
    const payload = {
        requestId: requestId,
        rejectionReason: rejectionReason,
        rejectedBy: rejectedBy
    };
    
    const response = makeRequest('POST', `/api/v1/locates/${requestId}/reject`, JSON.stringify(payload), {
        tags: { operation: 'rejectLocate' },
        timeout: TIMEOUT_SETTINGS.locate
    });
    
    checkLocateResponse(response);
    
    return parseResponse(response);
}

/**
 * Simulates the auto-approval flow for locate requests
 * @param {object} data - The test context data from setup function
 */
function simulateAutoApprovalFlow(data) {
    // Generate a random locate request
    let locateRequest;
    
    // Either use a pre-generated request or create a new one
    if (data.locateRequests && data.locateRequests.length > 0 && Math.random() > 0.5) {
        const index = Math.floor(Math.random() * data.locateRequests.length);
        locateRequest = data.locateRequests[index];
    } else {
        // Use test data securities and counterparties if available
        locateRequest = generateLocateRequest();
        if (data.testData && data.testData.securities && data.testData.securities.length > 0) {
            const security = data.testData.securities[Math.floor(Math.random() * data.testData.securities.length)];
            locateRequest.securityId = security.id || security;
        }
        if (data.testData && data.testData.counterparties && data.testData.counterparties.length > 0) {
            const counterparty = data.testData.counterparties[Math.floor(Math.random() * data.testData.counterparties.length)];
            locateRequest.clientId = counterparty.id || counterparty;
        }
    }
    
    // Submit the locate request
    const response = createLocateRequest(locateRequest);
    
    // Check if it was auto-approved or needs manual approval
    if (response && response.status === 'APPROVED') {
        // Auto-approved - verify the approval details
        check(response, {
            'Auto-approved locate request': (r) => r.status === 'APPROVED',
            'Has approved quantity': (r) => r.approvedQuantity > 0,
            'Has approval timestamp': (r) => r.approvalTimestamp !== undefined
        });
        
        // Optionally check the locate status to verify it was processed correctly
        if (Math.random() > 0.7) { // 30% chance to check status
            const status = getLocateRequest(response.requestId);
            check(status, {
                'Status check returns approved locate': (s) => s.status === 'APPROVED',
                'Status check shows correct quantity': (s) => s.approvedQuantity === response.approvedQuantity
            });
        }
    } else if (response && response.status === 'PENDING') {
        // Add to pending locates for later manual approval
        pendingLocates.push(response);
        
        // Verify pending status
        check(response, {
            'Locate request is pending': (r) => r.status === 'PENDING',
            'Requested quantity is preserved': (r) => r.requestedQuantity === locateRequest.requestedQuantity
        });
    }
    
    // Add random sleep to simulate user think time
    randomSleep(1, 3);
}

/**
 * Simulates the manual approval flow for locate requests
 * @param {object} data - The test context data from setup function
 */
function simulateManualApprovalFlow(data) {
    // Get pending locate requests
    let locates = pendingLocates;
    
    // If we don't have any cached, fetch them from the API
    if (locates.length === 0) {
        const response = getPendingLocates();
        if (response && Array.isArray(response)) {
            locates = response;
        }
    }
    
    // If still no pending locates, create some
    if (locates.length === 0) {
        // Create 1-3 locate requests that will likely go to manual approval
        const count = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < count; i++) {
            const locateRequest = generateLocateRequest();
            
            // Set a high quantity to increase chance of manual review
            locateRequest.requestedQuantity = 100000 + Math.floor(Math.random() * 900000);
            
            // Submit the request
            const response = createLocateRequest(locateRequest);
            
            // If it's pending, add to our list
            if (response && response.status === 'PENDING') {
                locates.push(response);
            }
            
            // Brief pause between requests
            sleep(0.5);
        }
    }
    
    // Process each pending locate
    for (let i = 0; i < locates.length; i++) {
        const locate = locates[i];
        
        // Randomly decide to approve or reject
        if (Math.random() > 0.3) { // 70% chance to approve
            // Approve the locate, sometimes with reduced quantity
            const approvedQty = Math.random() > 0.7 ? 
                locate.requestedQuantity : 
                Math.floor(locate.requestedQuantity * (0.5 + Math.random() * 0.5)); // 50-100% of requested
            
            const response = approveLocateRequest(
                locate.requestId,
                approvedQty,
                'test_approver',
                Math.random() > 0.8 ? 'HTB' : 'GC', // 20% chance of Hard to Borrow
                Math.random() * 2 // Random borrow rate between 0 and 2
            );
            
            check(response, {
                'Manually approved locate request': (r) => r.status === 'APPROVED',
                'Has approval details': (r) => r.approvedBy === 'test_approver',
                'Approved quantity is set': (r) => r.approvedQuantity === approvedQty
            });
        } else {
            // Reject the locate
            const rejectionReasons = [
                'Insufficient inventory',
                'Client restrictions',
                'Market regulations',
                'Security not available for borrow'
            ];
            const reason = rejectionReasons[Math.floor(Math.random() * rejectionReasons.length)];
            
            const response = rejectLocateRequest(
                locate.requestId,
                reason,
                'test_approver'
            );
            
            check(response, {
                'Manually rejected locate request': (r) => r.status === 'REJECTED',
                'Has rejection reason': (r) => r.rejectionReason === reason,
                'Has rejection timestamp': (r) => r.rejectionTimestamp !== undefined
            });
        }
        
        // Remove from pending list
        pendingLocates = pendingLocates.filter(l => l.requestId !== locate.requestId);
        
        // Add random sleep between operations
        randomSleep(0.5, 2);
        
        // Only process up to 3 locates per iteration to avoid spending too much time here
        if (i >= 2) break;
    }
}

/**
 * Main test function that executes the locate approval workflow test scenarios
 * @param {object} data - The test context data from setup function
 */
export default function(data) {
    // Randomly select which flow to execute
    const flowChoice = Math.random();
    
    if (flowChoice < 0.7) { // 70% of users submit new locate requests
        group('Auto-Approval Flow', () => {
            simulateAutoApprovalFlow(data);
        });
    } else { // 30% of users process pending locate requests
        group('Manual Approval Flow', () => {
            simulateManualApprovalFlow(data);
        });
    }
}