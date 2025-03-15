// Import dependencies
import { exec } from 'k6/execution'; // k6 version: latest

// Base configuration used across all test scenarios
export const BASE_CONFIG = {
  // Basic configuration
  discardResponseBodies: true,
  userAgent: 'k6/IMS-Performance-Tests',
  
  // Default thresholds that apply across all tests
  thresholds: {
    http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
  },
  
  // Standardized tags for all tests
  tags: {
    application: 'ims',
  }
};

// Common HTTP headers for different request types
export const HEADERS = {
  common: {
    'Accept': '*/*',
    'Cache-Control': 'no-cache',
    'User-Agent': 'k6-performance-test',
  },
  json: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  form: {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
};

// Default sleep durations for think time simulation
export const SLEEP_DURATIONS = {
  min: 0.5, // In seconds
  max: 2.0,  // In seconds
};

// Timeout settings for different API operations
export const TIMEOUT_SETTINGS = {
  default: 10000, // 10 seconds (in ms)
  shortSell: 5000, // Short sell validation should be very fast (5 seconds)
  locate: 8000,    // Locate approval (8 seconds)
};

// Environment-specific configuration objects for different deployment environments
export const ENV_CONFIGS = {
  dev: {
    baseUrl: 'https://dev-api.ims.example.com',
    wsUrl: 'wss://dev-ws.ims.example.com',
    auth: {
      url: 'https://dev-auth.ims.example.com/token',
      client_id: 'performance_test_client',
      client_secret: '${__ENV.DEV_CLIENT_SECRET}', // Set via environment variable
    },
    rateLimits: {
      enabled: false,
    },
    logLevel: 'debug',
  },
  staging: {
    baseUrl: 'https://staging-api.ims.example.com',
    wsUrl: 'wss://staging-ws.ims.example.com',
    auth: {
      url: 'https://staging-auth.ims.example.com/token',
      client_id: 'performance_test_client',
      client_secret: '${__ENV.STAGING_CLIENT_SECRET}', // Set via environment variable
    },
    rateLimits: {
      enabled: true,
      requestsPerSecond: 500,
    },
    logLevel: 'info',
  },
  production: {
    baseUrl: 'https://api.ims.example.com',
    wsUrl: 'wss://ws.ims.example.com',
    auth: {
      url: 'https://auth.ims.example.com/token',
      client_id: 'performance_test_client',
      client_secret: '${__ENV.PROD_CLIENT_SECRET}', // Set via environment variable
    },
    rateLimits: {
      enabled: true,
      requestsPerSecond: 300,
    },
    logLevel: 'error',
  }
};

/**
 * Returns the configuration for a specific environment
 * @param {string} environment - The environment to get configuration for (dev, staging, production)
 * @returns {object} Environment configuration object
 */
export function getEnvironmentConfig(environment) {
  if (ENV_CONFIGS[environment]) {
    return ENV_CONFIGS[environment];
  }
  
  // Default to development environment if specified environment doesn't exist
  console.warn(`Environment '${environment}' not found, using 'dev' instead.`);
  return ENV_CONFIGS.dev;
}

/**
 * Returns performance thresholds for a specific test scenario
 * @param {string} scenarioName - The name of the test scenario
 * @returns {object} Threshold configuration object
 */
export function getThresholds(scenarioName) {
  switch (scenarioName) {
    case 'locateApproval':
      return {
        'http_req_duration': ['p(99)<5000', 'p(95)<3000', 'avg<2000'],
        'http_req_duration{operation:submitLocate}': ['p(99)<3000', 'p(95)<2000'],
        'http_req_duration{operation:checkStatus}': ['p(99)<2000', 'p(95)<1000'],
        'iterations': ['rate>10'],
      };
      
    case 'shortSellValidation':
      return {
        'http_req_duration': ['p(99)<3000', 'p(95)<1000'],
        // Critical SLA requirement: 99% of short sell validations must complete within 150ms
        'http_req_duration{operation:validateOrder}': ['p(99)<150', 'p(95)<100', 'avg<50'],
        'iterations': ['rate>50'],
      };
      
    case 'positionCalculation':
      return {
        'http_req_duration': ['p(99)<3000', 'p(95)<2000'],
        // The 200ms end-to-end requirement for event processing
        'http_req_duration{operation:calculatePosition}': ['p(99)<200', 'p(95)<150', 'avg<100'],
        'iterations': ['rate>30'],
      };
      
    case 'inventoryCalculation':
      return {
        'http_req_duration': ['p(99)<3000', 'p(95)<2000'],
        'http_req_duration{operation:calculateInventory}': ['p(99)<500', 'p(95)<300', 'avg<200'],
        'iterations': ['rate>20'],
      };
      
    case 'dataIngestion':
      return {
        'http_req_duration': ['p(99)<5000', 'p(95)<3000'],
        'http_req_duration{operation:ingestReferenceData}': ['p(99)<4000', 'p(95)<2000'],
        'http_req_duration{operation:ingestMarketData}': ['p(99)<1000', 'p(95)<500'],
        'http_req_duration{operation:ingestTradeData}': ['p(99)<2000', 'p(95)<1000'],
        'iterations': ['rate>100'],
      };
      
    case 'apiLoad':
      return {
        'http_req_duration': ['p(99)<3000', 'p(95)<2000', 'avg<1000'],
        'http_req_failed': ['rate<0.01'], // Less than 1% error rate
        'iterations': ['rate>200'],
      };
      
    default:
      return {
        'http_req_duration': ['p(99)<3000', 'p(95)<2000'],
        'http_req_failed': ['rate<0.01'],
      };
  }
}

/**
 * Returns load profile configuration for a specific test scenario and load level
 * @param {string} scenarioName - The name of the test scenario
 * @param {string} loadLevel - The level of load to test (normal, peak, stress, endurance, spike)
 * @returns {object} Load profile configuration object
 */
export function getLoadProfile(scenarioName, loadLevel) {
  // Base configurations for different scenarios
  const baseConfigs = {
    locateApproval: {
      normal: { vus: 50, duration: '5m', rate: 20 },
      peak: { vus: 100, duration: '5m', rate: 50 },
      stress: { vus: 200, duration: '10m', rate: 100 },
      endurance: { vus: 75, duration: '30m', rate: 30 },
      spike: { vus: 300, rampUp: '10s', hold: '1m', rampDown: '30s', rate: 150 }
    },
    shortSellValidation: {
      normal: { vus: 100, duration: '5m', rate: 100 },
      peak: { vus: 250, duration: '5m', rate: 250 },
      stress: { vus: 500, duration: '10m', rate: 500 },
      endurance: { vus: 150, duration: '30m', rate: 150 },
      spike: { vus: 750, rampUp: '10s', hold: '1m', rampDown: '30s', rate: 750 }
    },
    positionCalculation: {
      normal: { vus: 50, duration: '5m', rate: 30 },
      peak: { vus: 100, duration: '5m', rate: 75 },
      stress: { vus: 200, duration: '10m', rate: 150 },
      endurance: { vus: 75, duration: '30m', rate: 50 },
      spike: { vus: 300, rampUp: '10s', hold: '1m', rampDown: '30s', rate: 200 }
    },
    inventoryCalculation: {
      normal: { vus: 30, duration: '5m', rate: 20 },
      peak: { vus: 60, duration: '5m', rate: 40 },
      stress: { vus: 120, duration: '10m', rate: 80 },
      endurance: { vus: 40, duration: '30m', rate: 25 },
      spike: { vus: 180, rampUp: '10s', hold: '1m', rampDown: '30s', rate: 120 }
    },
    dataIngestion: {
      normal: { vus: 200, duration: '5m', rate: 1000 },
      peak: { vus: 400, duration: '5m', rate: 2500 },
      stress: { vus: 800, duration: '10m', rate: 5000 },
      endurance: { vus: 300, duration: '30m', rate: 1500 },
      spike: { vus: 1000, rampUp: '10s', hold: '1m', rampDown: '30s', rate: 7500 }
    },
    apiLoad: {
      normal: { vus: 100, duration: '5m', rate: 200 },
      peak: { vus: 250, duration: '5m', rate: 500 },
      stress: { vus: 500, duration: '10m', rate: 1000 },
      endurance: { vus: 150, duration: '30m', rate: 300 },
      spike: { vus: 750, rampUp: '10s', hold: '1m', rampDown: '30s', rate: 1500 }
    }
  };
  
  // Default to apiLoad if scenarioName not found
  const config = baseConfigs[scenarioName] || baseConfigs.apiLoad;
  // Default to normal if loadLevel not found
  const profile = config[loadLevel] || config.normal;
  
  // Return the load profile based on the load level
  if (loadLevel === 'spike') {
    return {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: profile.vus,
      maxVUs: profile.vus * 1.5,
      stages: [
        { duration: profile.rampUp, target: profile.rate },
        { duration: profile.hold, target: profile.rate },
        { duration: profile.rampDown, target: 0 },
      ],
    };
  } else {
    return {
      executor: 'constant-arrival-rate',
      rate: profile.rate,
      timeUnit: '1s',
      duration: profile.duration,
      preAllocatedVUs: profile.vus,
      maxVUs: profile.vus * 1.5,
    };
  }
}

/**
 * Returns the complete k6 scenario configuration for a specific test
 * @param {string} scenarioName - The name of the test scenario
 * @param {string} loadLevel - The level of load to test
 * @returns {object} Complete k6 scenario configuration
 */
export function getScenarioConfig(scenarioName, loadLevel) {
  const thresholds = getThresholds(scenarioName);
  const loadProfile = getLoadProfile(scenarioName, loadLevel);
  
  // Create a scenario-specific configuration
  const scenarioConfig = {
    scenarios: {
      [scenarioName]: {
        ...loadProfile,
        tags: {
          scenario: scenarioName,
          loadLevel: loadLevel
        },
      }
    },
    thresholds: thresholds,
  };
  
  // Add any scenario-specific settings
  switch (scenarioName) {
    case 'shortSellValidation':
      // For short sell validation, we need to ensure strict timeout settings
      scenarioConfig.scenarios[scenarioName].env = {
        TIMEOUT: TIMEOUT_SETTINGS.shortSell,
      };
      break;
      
    case 'locateApproval':
      // For locate approval, we use a different timeout
      scenarioConfig.scenarios[scenarioName].env = {
        TIMEOUT: TIMEOUT_SETTINGS.locate,
      };
      break;
      
    case 'dataIngestion':
      // For data ingestion, we expect higher throughput and need different settings
      scenarioConfig.scenarios[scenarioName].maxVUs = loadProfile.maxVUs * 2;
      scenarioConfig.scenarios[scenarioName].env = {
        BATCH_SIZE: 100,
      };
      break;
  }
  
  return {
    ...BASE_CONFIG,
    ...scenarioConfig,
  };
}