import { Verifier, LogLevel } from '@pact-foundation/pact'; // v11.0.2
import * as path from 'path'; // v18.15.0
import axios from 'axios'; // v1.4.0

// Import internal modules and constants
import { 
  API_BASE_URL, 
  API_ENDPOINTS, 
  TEST_TIMEOUTS, 
  PERFORMANCE_THRESHOLDS,
  LOCATE_STATUS,
  LOCATE_TYPES
} from '../../../common/constants';
import { loadTestData } from '../../../common/testUtils';
import { 
  createMockLocateRequest, 
  createMockOrderValidation, 
  createMockWorkflowRule 
} from '../../../common/mockData';

// Global constants
const PACT_DIR = path.resolve(__dirname, '../pacts');
const PROVIDER_BASE_URL = process.env.PROVIDER_BASE_URL || 'http://localhost:8081';
const PACT_BROKER_URL = process.env.PACT_BROKER_URL || 'http://localhost:9292';

/**
 * Sets up state handlers for the Pact provider tests
 * @returns Object containing state handlers for different provider states
 */
function setupStateHandlers() {
  return {
    // Handler for state where locate requests exist
    'locate requests exist': async () => {
      // Set up the environment to have locate requests available
      // In a real implementation, this might interact with a database or service
      console.log('Setting up state: locate requests exist');
      return {};
    },
    
    // Handler for state where a specific locate request ID exists
    'locate request with ID exists': async (params: any) => {
      console.log(`Setting up state: locate request with ID ${params.locateId} exists`);
      return {};
    },
    
    // Handler for state where pending locate requests exist
    'pending locate requests exist': async () => {
      console.log('Setting up state: pending locate requests exist');
      return {};
    },
    
    // Handler for state where approved locate requests exist
    'approved locate requests exist': async () => {
      console.log('Setting up state: approved locate requests exist');
      return {};
    },
    
    // Handler for state where locate requests for a specific security exist
    'locate requests for security exist': async (params: any) => {
      console.log(`Setting up state: locate requests for security ${params.securityId} exist`);
      return {};
    },
    
    // Handler for state where locate requests for a specific client exist
    'locate requests for client exist': async (params: any) => {
      console.log(`Setting up state: locate requests for client ${params.clientId} exist`);
      return {};
    },
    
    // Handler for state where order validations exist
    'order validations exist': async () => {
      console.log('Setting up state: order validations exist');
      return {};
    },
    
    // Handler for state where a specific order validation ID exists
    'order validation with ID exists': async (params: any) => {
      console.log(`Setting up state: order validation with ID ${params.orderId} exists`);
      return {};
    },
    
    // Handler for state where order validations for a specific client exist
    'order validations for client exist': async (params: any) => {
      console.log(`Setting up state: order validations for client ${params.clientId} exist`);
      return {};
    },
    
    // Handler for state where order validations for a specific security exist
    'order validations for security exist': async (params: any) => {
      console.log(`Setting up state: order validations for security ${params.securityId} exist`);
      return {};
    },
    
    // Handler for state where workflow rules exist
    'workflow rules exist': async () => {
      console.log('Setting up state: workflow rules exist');
      return {};
    },
    
    // Handler for state where a specific workflow rule ID exists
    'workflow rule with ID exists': async (params: any) => {
      console.log(`Setting up state: workflow rule with ID ${params.ruleId} exists`);
      return {};
    }
  };
}

/**
 * Verifies the contract between the Workflow Service and the Data Ingestion Service
 * @returns Promise that resolves when verification is complete
 */
async function verifyDataIngestionServiceContract(): Promise<void> {
  const verifier = new Verifier({
    providerName: 'workflow-service',
    providerVersion: process.env.CI_COMMIT_SHA || require('../../../package.json').version,
    providerBaseUrl: PROVIDER_BASE_URL,
    pactBrokerUrl: PACT_BROKER_URL,
    pactBrokerUsername: process.env.PACT_BROKER_USERNAME,
    pactBrokerPassword: process.env.PACT_BROKER_PASSWORD,
    consumerName: 'data-ingestion-service',
    stateHandlers: setupStateHandlers(),
    logLevel: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
    timeoutMs: TEST_TIMEOUTS.CONTRACT
  });
  
  return verifier.verifyProvider();
}

/**
 * Verifies the contract between the Workflow Service and the Calculation Service
 * @returns Promise that resolves when verification is complete
 */
async function verifyCalculationServiceContract(): Promise<void> {
  const verifier = new Verifier({
    providerName: 'workflow-service',
    providerVersion: process.env.CI_COMMIT_SHA || require('../../../package.json').version,
    providerBaseUrl: PROVIDER_BASE_URL,
    pactBrokerUrl: PACT_BROKER_URL,
    pactBrokerUsername: process.env.PACT_BROKER_USERNAME,
    pactBrokerPassword: process.env.PACT_BROKER_PASSWORD,
    consumerName: 'calculation-service',
    stateHandlers: setupStateHandlers(),
    logLevel: process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO,
    timeoutMs: TEST_TIMEOUTS.CONTRACT
  });
  
  return verifier.verifyProvider();
}

/**
 * Verifies that the short sell approval workflow meets performance requirements
 * @returns Promise that resolves when verification is complete
 */
async function verifyPerformanceRequirements(): Promise<void> {
  // Create a mock order validation request
  const mockOrderValidation = createMockOrderValidation({
    orderType: 'SHORT_SELL',
    securityId: 'SEC-EQ-003', // Tesla mock security
    clientId: 'CP-00002', // XYZ Investment Fund
    aggregationUnitId: 'AU-002',
    quantity: 2500
  });
  
  try {
    // Get start time
    const startTime = performance.now();
    
    // Send request to the short sell validation endpoint
    const response = await axios.post(
      `${PROVIDER_BASE_URL}${API_ENDPOINTS.SHORT_SELL.VALIDATE_ORDER}`,
      mockOrderValidation,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL * 2 // Double the threshold for the request timeout
      }
    );
    
    // Get end time
    const endTime = performance.now();
    
    // Calculate response time
    const responseTime = endTime - startTime;
    
    // Check if response time meets the performance threshold
    if (responseTime > PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL) {
      throw new Error(`Short sell approval took ${responseTime.toFixed(2)}ms, which exceeds the threshold of ${PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL}ms`);
    }
    
    // Log performance results
    console.log(`Short sell approval completed in ${responseTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL}ms)`);
    
    return Promise.resolve();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`Short sell validation failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error(`Short sell validation request failed to receive a response: ${error.message}`);
      } else {
        throw new Error(`Short sell validation error during request setup: ${error.message}`);
      }
    }
    throw error;
  }
}

describe('Workflow Service Provider Tests', () => {
  // Test to verify Data Ingestion Service contract
  it('should fulfill the contract with the Data Ingestion Service', async () => {
    await expect(verifyDataIngestionServiceContract()).resolves.not.toThrow();
  });
  
  // Test to verify Calculation Service contract
  it('should fulfill the contract with the Calculation Service', async () => {
    await expect(verifyCalculationServiceContract()).resolves.not.toThrow();
  });
  
  // Test to verify performance requirements
  it('should meet performance requirements for short sell approval', async () => {
    await expect(verifyPerformanceRequirements()).resolves.not.toThrow();
  });
});