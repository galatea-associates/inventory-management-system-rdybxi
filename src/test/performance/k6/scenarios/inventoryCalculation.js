import http from 'k6/http'; // k6 version: latest
import { sleep, check, group } from 'k6'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest

// Internal imports
import { getScenarioConfig } from '../config.js';
import { 
    makeRequest, 
    authenticate, 
    parseResponse, 
    randomSleep, 
    setActiveEnvironment 
} from '../lib/helpers.js';
import { 
    checkInventoryResponse, 
    checkResponseStatus, 
    checkResponseTime 
} from '../lib/checks.js';
import { 
    getTestDataSet,
    generateInventoryDataBatch
} from '../data/testData.js';

// Test data variables
let testData;
const calculationTypes = ['FOR_LOAN', 'FOR_PLEDGE', 'SHORT_SELL', 'LOCATE'];

/**
 * Initializes the test environment and prepares test data
 * @returns {object} Test data and configuration to be used in the test
 */
export function setup() {
    // Set the active environment based on test parameters
    const env = __ENV.ENVIRONMENT || 'dev';
    const envConfig = setActiveEnvironment(env);
    
    // Authenticate with the API using test credentials
    const username = __ENV.USERNAME || 'performance_test_user';
    const password = __ENV.PASSWORD || 'performance_test_pass';
    authenticate(username, password);
    
    // Load test data for inventory calculation
    testData = getTestDataSet('inventoryCalculation');
    
    // Ensure we have counterparties and aggregation units for SHORT_SELL tests
    if (!testData.counterparties) {
        testData.counterparties = getTestDataSet('apiLoad').counterparties;
    }
    
    if (!testData.aggregationUnits) {
        testData.aggregationUnits = getTestDataSet('apiLoad').aggregationUnits;
    }
    
    // Generate additional inventory test data if needed
    if (!testData.inventory || testData.inventory.length < 10) {
        const additionalData = generateInventoryDataBatch(10, {
            securities: testData.securities,
            calculationTypes: calculationTypes,
            businessDate: new Date().toISOString().split('T')[0]
        });
        
        if (!testData.inventory) {
            testData.inventory = [];
        }
        
        testData.inventory = [...testData.inventory, ...additionalData];
    }
    
    return {
        testData,
        env,
        envConfig
    };
}

/**
 * Retrieves for-loan availability for a security
 * @param {string} securityId - Security identifier
 * @param {string} businessDate - Business date (YYYY-MM-DD)
 * @returns {object} HTTP response with for-loan availability data
 */
function getForLoanAvailability(securityId, businessDate) {
    const url = `/api/v1/inventory/for-loan?securityId=${securityId}&businessDate=${businessDate}`;
    const response = makeRequest('GET', url, null, {
        tags: { operation: 'getForLoanAvailability' }
    });
    
    checkInventoryResponse(response);
    return response;
}

/**
 * Retrieves for-pledge availability for a security
 * @param {string} securityId - Security identifier
 * @param {string} businessDate - Business date (YYYY-MM-DD)
 * @returns {object} HTTP response with for-pledge availability data
 */
function getForPledgeAvailability(securityId, businessDate) {
    const url = `/api/v1/inventory/for-pledge?securityId=${securityId}&businessDate=${businessDate}`;
    const response = makeRequest('GET', url, null, {
        tags: { operation: 'getForPledgeAvailability' }
    });
    
    checkInventoryResponse(response);
    return response;
}

/**
 * Retrieves short-sell availability for a security
 * @param {string} securityId - Security identifier
 * @param {string} clientId - Client identifier
 * @param {string} aggregationUnitId - Aggregation unit identifier
 * @param {string} businessDate - Business date (YYYY-MM-DD)
 * @returns {object} HTTP response with short-sell availability data
 */
function getShortSellAvailability(securityId, clientId, aggregationUnitId, businessDate) {
    const url = `/api/v1/inventory/short-sell?securityId=${securityId}&clientId=${clientId}&aggregationUnitId=${aggregationUnitId}&businessDate=${businessDate}`;
    const response = makeRequest('GET', url, null, {
        tags: { operation: 'getShortSellAvailability' }
    });
    
    checkInventoryResponse(response);
    return response;
}

/**
 * Retrieves locate availability for a security
 * @param {string} securityId - Security identifier
 * @param {string} businessDate - Business date (YYYY-MM-DD)
 * @returns {object} HTTP response with locate availability data
 */
function getLocateAvailability(securityId, businessDate) {
    const url = `/api/v1/inventory/locate?securityId=${securityId}&businessDate=${businessDate}`;
    const response = makeRequest('GET', url, null, {
        tags: { operation: 'getLocateAvailability' }
    });
    
    checkInventoryResponse(response);
    return response;
}

/**
 * Triggers a calculation of inventory for a security
 * @param {string} securityId - Security identifier
 * @param {string} calculationType - Type of calculation (FOR_LOAN, FOR_PLEDGE, etc.)
 * @param {string} businessDate - Business date (YYYY-MM-DD)
 * @returns {object} HTTP response with calculation result
 */
function calculateInventory(securityId, calculationType, businessDate) {
    const url = `/api/v1/inventory/calculate`;
    const payload = JSON.stringify({
        securityId: securityId,
        calculationType: calculationType,
        businessDate: businessDate
    });
    
    const response = makeRequest('POST', url, payload, {
        tags: { operation: 'calculateInventory' }
    });
    
    checkInventoryResponse(response);
    
    // Verify response time meets the 200ms performance requirement
    checkResponseTime(response, 200);
    
    return response;
}

/**
 * Main test function that executes the inventory calculation performance tests
 * @param {object} data - Data from the setup function
 */
export default function(data) {
    // Extract test data from the data parameter
    const { testData } = data;
    
    // Get securities and business date
    const securities = testData.securities;
    const businessDate = new Date().toISOString().split('T')[0];
    
    // For each VU (virtual user), select different security and calculation types
    const vuId = exec.vu.idInTest || 0;
    
    // Group tests by calculation type
    for (const calculationType of calculationTypes) {
        group(`Inventory Calculation - ${calculationType}`, () => {
            // Select security based on VU ID for better test distribution
            const securityIndex = (vuId + calculationTypes.indexOf(calculationType)) % securities.length;
            const security = securities[securityIndex];
            const securityId = security.id;
            
            try {
                // Execute appropriate tests based on calculation type
                switch (calculationType) {
                    case 'FOR_LOAN':
                        // Test getting for-loan availability
                        getForLoanAvailability(securityId, businessDate);
                        
                        // Test calculating for-loan availability
                        calculateInventory(securityId, calculationType, businessDate);
                        break;
                        
                    case 'FOR_PLEDGE':
                        // Test getting for-pledge availability
                        getForPledgeAvailability(securityId, businessDate);
                        
                        // Test calculating for-pledge availability
                        calculateInventory(securityId, calculationType, businessDate);
                        break;
                        
                    case 'SHORT_SELL':
                        // For short-sell, we need a client and aggregation unit
                        const clientId = testData.counterparties[vuId % testData.counterparties.length].id;
                        const aggregationUnitId = testData.aggregationUnits[vuId % testData.aggregationUnits.length].id;
                        
                        // Test getting short-sell availability
                        getShortSellAvailability(securityId, clientId, aggregationUnitId, businessDate);
                        
                        // Test calculating short-sell availability
                        calculateInventory(securityId, calculationType, businessDate);
                        break;
                        
                    case 'LOCATE':
                        // Test getting locate availability
                        getLocateAvailability(securityId, businessDate);
                        
                        // Test calculating locate availability
                        calculateInventory(securityId, calculationType, businessDate);
                        break;
                        
                    default:
                        console.log(`Unknown calculation type: ${calculationType}`);
                }
            } catch (error) {
                console.error(`Error in ${calculationType} test for security ${securityId}: ${error.message}`);
            }
            
            // Add random sleep between requests to simulate real usage patterns
            randomSleep(0.5, 2);
        });
    }
}

// k6 test configuration options
export const options = getScenarioConfig('inventoryCalculation', __ENV.LOAD_LEVEL || 'normal');