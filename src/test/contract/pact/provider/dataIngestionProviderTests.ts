import { Verifier, LogLevel } from '@pact-foundation/pact'; // v11.0.2
import * as path from 'path'; // v18.15.0
import axios from 'axios'; // v1.4.0
import { API_BASE_URL, API_ENDPOINTS, TEST_TIMEOUTS } from '../../../common/constants';
import { loadTestData } from '../../../common/testUtils';

// Global constants
const PACT_DIR = path.resolve(__dirname, '../pacts');
const PROVIDER_BASE_URL = process.env.PROVIDER_BASE_URL || 'http://localhost:8080';
const PACT_BROKER_URL = process.env.PACT_BROKER_URL || 'http://localhost:9292';

/**
 * Sets up state handlers for the Pact provider tests
 */
function setupStateHandlers() {
  return {
    'securities exist': async () => {
      const securitiesData = loadTestData('./src/test/fixtures/securities/securities.json');
      console.log('Setting up state: securities exist');
      // In a real implementation, you would set up test data in the provider service
      // This could be via an API call, direct database setup, or other mechanism
      return securitiesData;
    },

    'security with ID exists': async (params) => {
      const securityData = loadTestData('./src/test/fixtures/securities/security.json');
      console.log(`Setting up state: security with ID exists (${JSON.stringify(params)})`);
      return securityData;
    },

    'security identifiers exist': async () => {
      const identifiersData = loadTestData('./src/test/fixtures/securities/identifiers.json');
      console.log('Setting up state: security identifiers exist');
      return identifiersData;
    },

    'counterparties exist': async () => {
      const counterpartiesData = loadTestData('./src/test/fixtures/counterparties/counterparties.json');
      console.log('Setting up state: counterparties exist');
      return counterpartiesData;
    },

    'latest prices exist': async () => {
      const pricesData = loadTestData('./src/test/fixtures/market-data/latest-prices.json');
      console.log('Setting up state: latest prices exist');
      return pricesData;
    },

    'price history exists': async () => {
      const priceHistoryData = loadTestData('./src/test/fixtures/market-data/price-history.json');
      console.log('Setting up state: price history exists');
      return priceHistoryData;
    },

    'trade data exists': async () => {
      const tradeData = loadTestData('./src/test/fixtures/trades/trades.json');
      console.log('Setting up state: trade data exists');
      return tradeData;
    },

    'contract data exists': async () => {
      const contractData = loadTestData('./src/test/fixtures/contracts/contracts.json');
      console.log('Setting up state: contract data exists');
      return contractData;
    }
  };
}

/**
 * Verifies the contract between the Data Ingestion Service and the Calculation Service
 */
async function verifyCalculationServiceContract(): Promise<void> {
  // Get package version for provider version
  const packageJson = require('../../../../package.json');
  const providerVersion = process.env.PROVIDER_VERSION || packageJson.version;
  
  // Configure log level based on environment
  const logLevel = process.env.PACT_LOG_LEVEL ? 
    (LogLevel as any)[process.env.PACT_LOG_LEVEL] : 
    LogLevel.INFO;

  const verifierOptions = {
    provider: 'data-ingestion-service',
    providerVersion: providerVersion,
    providerBaseUrl: PROVIDER_BASE_URL,
    
    // Pact Broker configuration
    pactBrokerUrl: PACT_BROKER_URL,
    // Add authentication if needed for Pact Broker
    ...(process.env.PACT_BROKER_USERNAME && process.env.PACT_BROKER_PASSWORD ? {
      pactBrokerUsername: process.env.PACT_BROKER_USERNAME,
      pactBrokerPassword: process.env.PACT_BROKER_PASSWORD,
    } : {}),
    
    // Only verify contracts for the calculation service
    consumerVersionSelectors: [
      {
        consumer: 'calculation-service'
      }
    ],
    
    // Set up state handlers
    stateHandlers: setupStateHandlers(),
    
    // Configure logging and timeout
    logLevel: logLevel,
    timeout: TEST_TIMEOUTS.CONTRACT,
    
    // Enable publishing of verification results
    publishVerificationResult: process.env.CI === 'true'
  };

  return new Verifier(verifierOptions).verifyProvider();
}

/**
 * Verifies the contract between the Data Ingestion Service and the Workflow Service
 */
async function verifyWorkflowServiceContract(): Promise<void> {
  // Get package version for provider version
  const packageJson = require('../../../../package.json');
  const providerVersion = process.env.PROVIDER_VERSION || packageJson.version;
  
  // Configure log level based on environment
  const logLevel = process.env.PACT_LOG_LEVEL ? 
    (LogLevel as any)[process.env.PACT_LOG_LEVEL] : 
    LogLevel.INFO;

  const verifierOptions = {
    provider: 'data-ingestion-service',
    providerVersion: providerVersion,
    providerBaseUrl: PROVIDER_BASE_URL,
    
    // Pact Broker configuration
    pactBrokerUrl: PACT_BROKER_URL,
    // Add authentication if needed for Pact Broker
    ...(process.env.PACT_BROKER_USERNAME && process.env.PACT_BROKER_PASSWORD ? {
      pactBrokerUsername: process.env.PACT_BROKER_USERNAME,
      pactBrokerPassword: process.env.PACT_BROKER_PASSWORD,
    } : {}),
    
    // Only verify contracts for the workflow service
    consumerVersionSelectors: [
      {
        consumer: 'workflow-service'
      }
    ],
    
    // Set up state handlers
    stateHandlers: setupStateHandlers(),
    
    // Configure logging and timeout
    logLevel: logLevel,
    timeout: TEST_TIMEOUTS.CONTRACT,
    
    // Enable publishing of verification results
    publishVerificationResult: process.env.CI === 'true'
  };

  return new Verifier(verifierOptions).verifyProvider();
}

describe('Data Ingestion Service Provider Tests', () => {
  it('should fulfill the contract with the Calculation Service', async () => {
    await expect(verifyCalculationServiceContract()).resolves.not.toThrow();
  });

  it('should fulfill the contract with the Workflow Service', async () => {
    await expect(verifyWorkflowServiceContract()).resolves.not.toThrow();
  });
});