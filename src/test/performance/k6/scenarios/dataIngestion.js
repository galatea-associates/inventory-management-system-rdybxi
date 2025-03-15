// Import external libraries
import http from 'k6/http'; // k6 version: latest
import { sleep, check } from 'k6'; // k6 version: latest
import { group } from 'k6'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest

// Import internal helpers
import { getScenarioConfig, HEADERS } from '../config.js';
import { 
    makeRequest, 
    setActiveEnvironment, 
    authenticate, 
    parseResponse, 
    randomSleep 
} from '../lib/helpers.js';
import { 
    checkResponseStatus, 
    checkResponseTime, 
    runChecks 
} from '../lib/checks.js';
import { 
    getTestDataSet, 
    generateReferenceDataBatch, 
    generateMarketDataBatch 
} from '../data/testData.js';

// Define test options
export const options = getScenarioConfig('dataIngestion', __ENV.LOAD_LEVEL || 'normal');

/**
 * Setup function that initializes the test environment
 * @returns {object} Test data and configuration to be used during the test
 */
export function setup() {
    // Set active environment based on environment variable or default to 'dev'
    const environment = __ENV.ENVIRONMENT || 'dev';
    const env = setActiveEnvironment(environment);
    
    // Authenticate with the API
    const username = __ENV.USERNAME || 'performance_test_user';
    const password = __ENV.PASSWORD || 'performance_test_password';
    authenticate(username, password);
    
    // Get test data for data ingestion scenario
    const testData = getTestDataSet('dataIngestion');
    
    console.log(`Test setup complete for data ingestion performance test in ${environment} environment`);
    
    return {
        testData,
        env,
        config: {
            batchSize: parseInt(__ENV.BATCH_SIZE || '100'),
            targetThroughput: parseInt(__ENV.TARGET_THROUGHPUT || '300000'),
            // The required maximum latency from the requirements
            maxLatency: 200 // 200ms end-to-end latency requirement
        }
    };
}

/**
 * Teardown function that performs cleanup after the test completes
 * @param {object} data - Data from the setup function
 */
export function teardown(data) {
    console.log('Data ingestion performance test completed');
    // Any additional cleanup would go here
}

/**
 * Main test function that executes the data ingestion performance test
 * @param {object} data - Data from the setup function
 */
export default function(data) {
    const { testData, config } = data;
    
    group('Reference Data Ingestion', function() {
        ingestReferenceData(testData);
    });
    
    group('Market Data Ingestion', function() {
        ingestMarketData(testData);
    });
    
    group('Trade Data Ingestion', function() {
        ingestTradeData(testData);
    });
    
    group('Contract Data Ingestion', function() {
        ingestContractData(testData);
    });
    
    group('Multi-Type Batch Ingestion', function() {
        batchIngestMultipleDataTypes(testData);
    });
    
    // Only run the high-throughput test if explicitly enabled
    if (__ENV.TEST_THROUGHPUT === 'true') {
        group('Throughput Verification', function() {
            verifyIngestionThroughput(testData, config.targetThroughput);
        });
    }
}

/**
 * Tests the ingestion of reference data through the API
 * @param {object} testData - Test data for reference data ingestion
 * @returns {object} Test results including response metrics
 */
function ingestReferenceData(testData) {
    // Generate a batch of reference data
    const batchSize = parseInt(__ENV.REFERENCE_DATA_BATCH_SIZE || '50');
    const referenceData = generateReferenceDataBatch(batchSize);
    
    // Create the request payload
    const payload = JSON.stringify({
        records: referenceData,
        source: 'PERFORMANCE_TEST',
        correlationId: `ref-data-test-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`
    });
    
    // Make the request to the reference data ingestion endpoint
    const response = makeRequest(
        'POST',
        '/api/v1/reference-data/batch',
        payload,
        {
            tags: { operation: 'ingestReferenceData' },
            timeout: 10000 // 10 seconds timeout for reference data which can be large
        }
    );
    
    // Validate response
    runChecks(response, {
        status: { fn: checkResponseStatus, params: [202] }, // Expect Accepted status for async processing
        time: { fn: checkResponseTime, params: [5000] } // 5 seconds is reasonable for batch processing
    });
    
    // Parse response to verify the data was accepted
    const responseData = parseResponse(response);
    
    // Add a small delay to avoid overwhelming the server in test
    randomSleep(0.5, 2);
    
    return {
        status: response.status,
        responseTime: response.timings.duration,
        batchSize: batchSize,
        accepted: responseData && responseData.accepted ? responseData.accepted : 0,
        rejected: responseData && responseData.rejected ? responseData.rejected : 0
    };
}

/**
 * Tests the ingestion of market data through the API
 * @param {object} testData - Test data for market data ingestion
 * @returns {object} Test results including response metrics
 */
function ingestMarketData(testData) {
    // Generate a batch of market data
    const batchSize = parseInt(__ENV.MARKET_DATA_BATCH_SIZE || '200');
    const marketData = generateMarketDataBatch(batchSize, {
        securities: testData.securities
    });
    
    // Create the request payload
    const payload = JSON.stringify({
        prices: marketData,
        source: 'PERFORMANCE_TEST',
        timestamp: new Date().toISOString(),
        correlationId: `market-data-test-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`
    });
    
    // Make the request to the market data ingestion endpoint
    const response = makeRequest(
        'POST',
        '/api/v1/market-data/prices/batch',
        payload,
        {
            tags: { operation: 'ingestMarketData' },
            timeout: 5000 // Market data should be processed quickly
        }
    );
    
    // Validate response
    runChecks(response, {
        status: { fn: checkResponseStatus, params: [202] }, // Expect Accepted status
        time: { fn: checkResponseTime, params: [1000] } // Market data should be faster than reference data
    });
    
    // Parse response
    const responseData = parseResponse(response);
    
    // Add a small delay between requests
    randomSleep(0.3, 1);
    
    return {
        status: response.status,
        responseTime: response.timings.duration,
        batchSize: batchSize,
        accepted: responseData && responseData.accepted ? responseData.accepted : 0,
        rejected: responseData && responseData.rejected ? responseData.rejected : 0
    };
}

/**
 * Tests the ingestion of trade data through the API
 * @param {object} testData - Test data for trade data ingestion
 * @returns {object} Test results including response metrics
 */
function ingestTradeData(testData) {
    // Generate trade data
    const batchSize = parseInt(__ENV.TRADE_DATA_BATCH_SIZE || '100');
    const trades = [];
    
    for (let i = 0; i < batchSize; i++) {
        trades.push({
            tradeId: `TRADE-${exec.vu.idInTest}-${exec.scenario.iterationInTest}-${i}`,
            securityId: testData.securities[i % testData.securities.length].id,
            counterpartyId: testData.counterparties[i % testData.counterparties.length].id,
            quantity: Math.floor(Math.random() * 10000) + 1000,
            price: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
            tradeDate: new Date().toISOString().split('T')[0],
            settlementDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            side: Math.random() > 0.5 ? 'BUY' : 'SELL',
            status: 'NEW'
        });
    }
    
    // Create the request payload
    const payload = JSON.stringify({
        trades: trades,
        source: 'PERFORMANCE_TEST',
        correlationId: `trade-data-test-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`
    });
    
    // Make the request to the trade data ingestion endpoint
    const response = makeRequest(
        'POST',
        '/api/v1/trade-data/batch',
        payload,
        {
            tags: { operation: 'ingestTradeData' },
            timeout: 5000
        }
    );
    
    // Validate response
    runChecks(response, {
        status: { fn: checkResponseStatus, params: [202] }, // Expect Accepted status
        time: { fn: checkResponseTime, params: [2000] } // Trades might take longer to process than market data
    });
    
    // Parse response
    const responseData = parseResponse(response);
    
    // Add a small delay between requests
    randomSleep(0.5, 1.5);
    
    return {
        status: response.status,
        responseTime: response.timings.duration,
        batchSize: batchSize,
        accepted: responseData && responseData.accepted ? responseData.accepted : 0,
        rejected: responseData && responseData.rejected ? responseData.rejected : 0
    };
}

/**
 * Tests the ingestion of contract data through the API
 * @param {object} testData - Test data for contract data ingestion
 * @returns {object} Test results including response metrics
 */
function ingestContractData(testData) {
    // Generate contract data
    const batchSize = parseInt(__ENV.CONTRACT_DATA_BATCH_SIZE || '50');
    const contracts = [];
    
    for (let i = 0; i < batchSize; i++) {
        // Determine contract type (SBL, Repo, Swap)
        const contractTypes = ['SECURITIES_LENDING', 'REPO', 'SWAP'];
        const contractType = contractTypes[i % contractTypes.length];
        
        const baseContract = {
            contractId: `CONTRACT-${exec.vu.idInTest}-${exec.scenario.iterationInTest}-${i}`,
            counterpartyId: testData.counterparties[i % testData.counterparties.length].id,
            effectiveDate: new Date().toISOString().split('T')[0],
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'ACTIVE',
            contractType: contractType
        };
        
        // Add contract-type specific fields
        if (contractType === 'SECURITIES_LENDING') {
            contracts.push({
                ...baseContract,
                securityId: testData.securities[i % testData.securities.length].id,
                quantity: Math.floor(Math.random() * 10000) + 1000,
                fee: parseFloat((Math.random() * 2).toFixed(4)),
                autoRoll: Math.random() > 0.5,
                terminationDate: null
            });
        } else if (contractType === 'REPO') {
            contracts.push({
                ...baseContract,
                securityId: testData.securities[i % testData.securities.length].id,
                quantity: Math.floor(Math.random() * 10000) + 5000,
                rate: parseFloat((Math.random() * 5).toFixed(4)),
                term: Math.floor(Math.random() * 90) + 1, // 1-90 days
                haircut: parseFloat((Math.random() * 10).toFixed(2))
            });
        } else if (contractType === 'SWAP') {
            contracts.push({
                ...baseContract,
                notionalAmount: Math.floor(Math.random() * 1000000) + 100000,
                currency: 'USD',
                payLeg: {
                    rate: parseFloat((Math.random() * 5).toFixed(4)),
                    rateType: 'FIXED'
                },
                receiveLeg: {
                    rate: parseFloat((Math.random() * 5).toFixed(4)),
                    rateType: 'FLOATING',
                    referenceRate: 'LIBOR'
                }
            });
        }
    }
    
    // Create the request payload
    const payload = JSON.stringify({
        contracts: contracts,
        source: 'PERFORMANCE_TEST',
        correlationId: `contract-data-test-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`
    });
    
    // Make the request to the contract data ingestion endpoint
    const response = makeRequest(
        'POST',
        '/api/v1/contract-data/batch',
        payload,
        {
            tags: { operation: 'ingestContractData' },
            timeout: 5000
        }
    );
    
    // Validate response
    runChecks(response, {
        status: { fn: checkResponseStatus, params: [202] }, // Expect Accepted status
        time: { fn: checkResponseTime, params: [3000] } // Contracts might take longer to process
    });
    
    // Parse response
    const responseData = parseResponse(response);
    
    // Add a small delay between requests
    randomSleep(0.5, 1.5);
    
    return {
        status: response.status,
        responseTime: response.timings.duration,
        batchSize: batchSize,
        accepted: responseData && responseData.accepted ? responseData.accepted : 0,
        rejected: responseData && responseData.rejected ? responseData.rejected : 0
    };
}

/**
 * Tests the concurrent ingestion of multiple data types to simulate real-world load
 * @param {object} testData - Test data for multiple data types
 * @returns {object} Test results including response metrics
 */
function batchIngestMultipleDataTypes(testData) {
    // Get the active environment for base URL
    const env = getActiveEnvironment();
    
    // Generate data for each type with smaller batch sizes for concurrent processing
    const referenceData = generateReferenceDataBatch(10);
    const marketData = generateMarketDataBatch(100, { securities: testData.securities });
    
    // Generate trade data
    const tradeData = [];
    for (let i = 0; i < 20; i++) {
        tradeData.push({
            tradeId: `TRADE-MT-${exec.vu.idInTest}-${exec.scenario.iterationInTest}-${i}`,
            securityId: testData.securities[i % testData.securities.length].id,
            counterpartyId: testData.counterparties[i % testData.counterparties.length].id,
            quantity: Math.floor(Math.random() * 10000) + 1000,
            price: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
            tradeDate: new Date().toISOString().split('T')[0],
            settlementDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            side: Math.random() > 0.5 ? 'BUY' : 'SELL',
            status: 'NEW'
        });
    }
    
    // Generate contract data
    const contracts = [];
    for (let i = 0; i < 5; i++) {
        contracts.push({
            contractId: `CONTRACT-MT-${exec.vu.idInTest}-${exec.scenario.iterationInTest}-${i}`,
            counterpartyId: testData.counterparties[i % testData.counterparties.length].id,
            securityId: testData.securities[i % testData.securities.length].id,
            effectiveDate: new Date().toISOString().split('T')[0],
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            quantity: Math.floor(Math.random() * 10000) + 1000,
            fee: parseFloat((Math.random() * 2).toFixed(4)),
            status: 'ACTIVE',
            contractType: 'SECURITIES_LENDING'
        });
    }
    
    // Create payloads
    const referencePayload = JSON.stringify({
        records: referenceData,
        source: 'PERFORMANCE_TEST',
        correlationId: `multi-ref-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`
    });
    
    const marketPayload = JSON.stringify({
        prices: marketData,
        source: 'PERFORMANCE_TEST',
        timestamp: new Date().toISOString(),
        correlationId: `multi-mkt-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`
    });
    
    const tradePayload = JSON.stringify({
        trades: tradeData,
        source: 'PERFORMANCE_TEST',
        correlationId: `multi-trade-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`
    });
    
    const contractPayload = JSON.stringify({
        contracts: contracts,
        source: 'PERFORMANCE_TEST',
        correlationId: `multi-contract-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`
    });
    
    // Make concurrent requests
    const responses = http.batch([
        {
            method: 'POST',
            url: `${env.baseUrl}/api/v1/reference-data/batch`,
            body: referencePayload,
            params: {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${global.authToken}`,
                    ...HEADERS.json
                },
                tags: { operation: 'batchIngestReference' }
            }
        },
        {
            method: 'POST',
            url: `${env.baseUrl}/api/v1/market-data/prices/batch`,
            body: marketPayload,
            params: {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${global.authToken}`,
                    ...HEADERS.json
                },
                tags: { operation: 'batchIngestMarket' }
            }
        },
        {
            method: 'POST',
            url: `${env.baseUrl}/api/v1/trade-data/batch`,
            body: tradePayload,
            params: {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${global.authToken}`,
                    ...HEADERS.json
                },
                tags: { operation: 'batchIngestTrade' }
            }
        },
        {
            method: 'POST',
            url: `${env.baseUrl}/api/v1/contract-data/batch`,
            body: contractPayload,
            params: {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${global.authToken}`,
                    ...HEADERS.json
                },
                tags: { operation: 'batchIngestContract' }
            }
        }
    ]);
    
    // Check all responses
    let allSuccessful = true;
    let maxResponseTime = 0;
    
    responses.forEach((response, i) => {
        const operationNames = ['batchIngestReference', 'batchIngestMarket', 'batchIngestTrade', 'batchIngestContract'];
        const timeThresholds = [5000, 1000, 2000, 3000]; // Different thresholds for different endpoints
        
        const checks = runChecks(response, {
            status: { fn: checkResponseStatus, params: [202] },
            time: { fn: checkResponseTime, params: [timeThresholds[i]] }
        });
        
        if (!checks.overall) {
            allSuccessful = false;
        }
        
        if (response.timings.duration > maxResponseTime) {
            maxResponseTime = response.timings.duration;
        }
    });
    
    // Add a delay between batches
    randomSleep(1, 3);
    
    return {
        allSuccessful,
        maxResponseTime,
        referenceDataSize: referenceData.length,
        marketDataSize: marketData.length,
        tradeDataSize: tradeData.length,
        contractDataSize: contracts.length,
        totalEventsProcessed: referenceData.length + marketData.length + tradeData.length + contracts.length
    };
}

/**
 * Verifies the system can handle the required ingestion throughput of 300,000+ events per second
 * @param {object} testData - Test data
 * @param {number} targetEventsPerSecond - Target events per second
 * @returns {object} Test results including throughput metrics
 */
function verifyIngestionThroughput(testData, targetEventsPerSecond) {
    // Determine batch sizes to achieve the target throughput
    // We'll focus on market data which is typically highest volume
    // and requires the lowest latency
    
    // Assuming we can make roughly 10 requests per second per VU
    // we need to calculate how many events per request we need
    const requestsPerSecond = 10;
    const eventsPerRequest = Math.ceil(targetEventsPerSecond / requestsPerSecond / exec.instance.vusActive);
    
    console.log(`Throughput test: Targeting ${targetEventsPerSecond} events/sec with ${eventsPerRequest} events per request`);
    
    // Generate a large batch of market data events
    const marketData = generateMarketDataBatch(eventsPerRequest, {
        securities: testData.securities
    });
    
    // Create the request payload
    const payload = JSON.stringify({
        prices: marketData,
        source: 'THROUGHPUT_TEST',
        timestamp: new Date().toISOString(),
        correlationId: `throughput-test-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`
    });
    
    // Record start time for throughput calculation
    const startTime = new Date().getTime();
    
    // Make the request to the market data ingestion endpoint
    const response = makeRequest(
        'POST',
        '/api/v1/market-data/prices/batch',
        payload,
        {
            tags: { operation: 'throughputTest' },
            timeout: 10000 // Higher timeout for large batch
        }
    );
    
    // Record end time
    const endTime = new Date().getTime();
    const duration = (endTime - startTime) / 1000; // in seconds
    
    // Calculate actual throughput
    const actualEventsPerSecond = eventsPerRequest / duration;
    
    // Validate response
    runChecks(response, {
        status: { fn: checkResponseStatus, params: [202] },
        time: { fn: checkResponseTime, params: [5000] } // Allow up to 5 seconds for large batch
    });
    
    // Check if latency requirement was met
    const latencyOk = response.timings.duration <= 200; // 200ms is the required max latency
    
    // Parse response
    const responseData = parseResponse(response);
    
    // Add a longer delay after throughput test to allow system to recover
    randomSleep(2, 5);
    
    return {
        status: response.status,
        responseTime: response.timings.duration,
        batchSize: eventsPerRequest,
        actualEventsPerSecond,
        targetEventsPerSecond,
        throughputPercent: (actualEventsPerSecond / targetEventsPerSecond) * 100,
        latencyRequirementMet: latencyOk,
        accepted: responseData && responseData.accepted ? responseData.accepted : 0,
        rejected: responseData && responseData.rejected ? responseData.rejected : 0
    };
}