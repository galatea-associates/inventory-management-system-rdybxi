import { Verifier, VerifierOptions, LogLevel } from '@pact-foundation/pact'; // v11.0.2
import * as path from 'path';
import axios from 'axios'; // v1.4.0

import { 
  API_BASE_URL, 
  API_ENDPOINTS, 
  PERFORMANCE_THRESHOLDS, 
  TEST_TIMEOUTS 
} from '../../../common/constants';
import { loadTestData } from '../../../common/testUtils';

// Path to the pact files directory
const PACT_DIR = path.resolve(__dirname, '../pacts');

// URL of the calculation service to test against
const CALCULATION_SERVICE_URL = process.env.CALCULATION_SERVICE_URL || 'http://localhost:8082';

/**
 * Sets up state handlers for the Pact provider tests
 * @returns Object containing state handlers for different provider states
 */
function setupStateHandlers() {
  return {
    // Handler for 'a position exists' state
    'a position exists': async (parameters: any) => {
      // In a real implementation, this would set up a position in the test environment
      const { bookId, securityId } = parameters;
      console.log(`Setting up state 'a position exists' for book ${bookId} and security ${securityId}`);
      
      // This is a simplified mock implementation - in a real scenario, we would make
      // API calls to ensure the test data is set up correctly
      return true;
    },
    
    // Handler for 'positions exist for a security' state
    'positions exist for a security': async (parameters: any) => {
      const { securityId } = parameters;
      console.log(`Setting up state 'positions exist for a security' for security ${securityId}`);
      return true;
    },
    
    // Handler for 'a settlement ladder exists' state
    'a settlement ladder exists': async (parameters: any) => {
      const { bookId, securityId } = parameters;
      console.log(`Setting up state 'a settlement ladder exists' for book ${bookId} and security ${securityId}`);
      return true;
    },
    
    // Handler for 'for loan availability exists' state
    'for loan availability exists': async (parameters: any) => {
      const { businessDate } = parameters;
      console.log(`Setting up state 'for loan availability exists' for date ${businessDate}`);
      return true;
    },
    
    // Handler for 'for pledge availability exists' state
    'for pledge availability exists': async (parameters: any) => {
      const { businessDate } = parameters;
      console.log(`Setting up state 'for pledge availability exists' for date ${businessDate}`);
      return true;
    },
    
    // Handler for 'locate availability exists' state
    'locate availability exists': async (parameters: any) => {
      const { businessDate } = parameters;
      console.log(`Setting up state 'locate availability exists' for date ${businessDate}`);
      return true;
    },
    
    // Handler for 'client limits exist' state
    'client limits exist': async (parameters: any) => {
      const { clientId, securityId } = parameters;
      console.log(`Setting up state 'client limits exist' for client ${clientId} and security ${securityId}`);
      return true;
    },
    
    // Handler for 'aggregation unit limits exist' state
    'aggregation unit limits exist': async (parameters: any) => {
      const { aggregationUnitId, securityId } = parameters;
      console.log(`Setting up state 'aggregation unit limits exist' for aggregation unit ${aggregationUnitId} and security ${securityId}`);
      return true;
    },
    
    // Handler for 'calculation rules exist' state
    'calculation rules exist': async () => {
      console.log(`Setting up state 'calculation rules exist'`);
      return true;
    }
  };
}

/**
 * Verifies that the calculation service implements the expected contracts
 * @returns Promise that resolves when verification is complete
 */
async function verifyCalculationServiceProvider(): Promise<void> {
  // Configure the verifier options
  const opts: VerifierOptions = {
    // Provider name as used in the Pact contracts
    provider: 'calculation-service',
    
    // Provider base URL for the API requests
    providerBaseUrl: CALCULATION_SERVICE_URL,
    
    // Log level - use error in CI, info otherwise
    logLevel: process.env.CI ? LogLevel.ERROR : LogLevel.INFO,
    
    // Path to the pact files directory
    pactUrls: [path.join(PACT_DIR, 'workflow-service-calculation-service.json')],
    
    // State handlers for setting up provider states
    stateHandlers: setupStateHandlers(),
    
    // Provider version from environment or default
    providerVersion: process.env.PROVIDER_VERSION || '1.0.0',
    
    // Publish results to Pact Broker if in CI
    publishVerificationResult: process.env.CI === 'true',
  };
  
  // Add Pact Broker URL and authentication if in CI environment
  if (process.env.PACT_BROKER_URL) {
    opts.pactBrokerUrl = process.env.PACT_BROKER_URL;
    
    // Add Pact Broker authentication if provided
    if (process.env.PACT_BROKER_USERNAME && process.env.PACT_BROKER_PASSWORD) {
      opts.pactBrokerUsername = process.env.PACT_BROKER_USERNAME;
      opts.pactBrokerPassword = process.env.PACT_BROKER_PASSWORD;
    }
  }
  
  try {
    // Create a new Pact Verifier instance and run verification
    const verificationResult = await new Verifier(opts).verifyProvider();
    console.log('Pact verification completed successfully');
    return verificationResult;
  } catch (error) {
    console.error('Pact verification failed:', error);
    throw error;
  }
}

/**
 * Tests the performance of a specific API endpoint
 * @param endpoint - The API endpoint to test
 * @param params - Query parameters for the request
 * @param threshold - The performance threshold in milliseconds
 * @returns Promise with the response time
 */
async function testEndpointPerformance(endpoint: string, params = {}, threshold: number): Promise<number> {
  const startTime = Date.now();
  
  try {
    // Make the API request
    await axios.get(`${CALCULATION_SERVICE_URL}${endpoint}`, { params });
    
    // Calculate the response time
    const responseTime = Date.now() - startTime;
    
    // Verify that the response time is within the threshold
    expect(responseTime).toBeLessThanOrEqual(threshold);
    
    console.log(`API endpoint ${endpoint} responded in ${responseTime}ms (threshold: ${threshold}ms)`);
    
    return responseTime;
  } catch (error) {
    console.error(`Error testing endpoint ${endpoint}:`, error);
    throw error;
  }
}

// Test suite for the calculation service provider tests
describe('Calculation Service Provider Tests', () => {
  // Set a longer timeout for this test since contract verification can take time
  jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
  
  // Test to verify that the calculation service satisfies all consumer contracts
  it('should satisfy all consumer contracts', async () => {
    // Verify that the calculation service implements the contracts without throwing
    await expect(verifyCalculationServiceProvider()).resolves.not.toThrow();
    
    // Test performance of critical endpoints
    // Position calculation - should be <200ms
    await testEndpointPerformance(
      '/api/v1/calculations/positions/EQUITY-01/AAPL',
      {},
      PERFORMANCE_THRESHOLDS.POSITION_CALCULATION
    );
    
    // Inventory calculation - should be <200ms
    await testEndpointPerformance(
      '/api/v1/calculations/inventory/for-loan',
      { businessDate: '2023-06-15' },
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    
    // Short sell approval - should be <150ms
    await testEndpointPerformance(
      '/api/v1/calculations/limits/validate',
      { 
        clientId: 'CLIENT001', 
        aggregationUnitId: 'AU001', 
        securityId: 'AAPL', 
        orderType: 'SHORT_SELL',
        quantity: 1000
      },
      PERFORMANCE_THRESHOLDS.SHORT_SELL_APPROVAL
    );
    
    console.log('All contract and performance requirements satisfied');
  });
});