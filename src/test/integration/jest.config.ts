import { Config } from '@jest/types';
import { TEST_TIMEOUTS } from '../common/constants';

/**
 * Creates and returns the Jest configuration object for integration tests
 * @returns Jest configuration object for integration testing
 */
const createJestConfig = (): Config.InitialOptions => {
  return {
    // Use ts-jest preset for TypeScript support
    preset: 'ts-jest',
    
    // Use Node.js environment for service-level testing
    testEnvironment: 'node',
    
    // Test locations and patterns
    roots: ['<rootDir>'],
    testMatch: ['**/*.integration.test.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    
    // Setup files for test environment
    setupFilesAfterEnv: ['../common/setupTests.ts'],
    globalSetup: './setup/globalSetup.ts',
    globalTeardown: './setup/globalTeardown.ts',
    
    // TypeScript configuration
    transform: {
      '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.json' }]
    },
    
    // Module path aliases for easier imports
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/../$1',
      '^@common/(.*)$': '<rootDir>/../common/$1',
      '^@fixtures/(.*)$': '<rootDir>/../common/fixtures/$1',
      '^@mocks/(.*)$': '<rootDir>/../common/mocks/$1'
    },
    
    // Coverage collection and thresholds
    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/setup/'],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    
    // Reporting configuration for CI/CD integration
    reporters: [
      'default',
      ['jest-junit', {
        outputDirectory: '<rootDir>/reports',
        outputName: 'integration-junit.xml'
      }],
      ['jest-html-reporter', {
        outputPath: '<rootDir>/reports/html/integration.html'
      }]
    ],
    
    // Test timeout from constants - 30 seconds for integration tests
    testTimeout: TEST_TIMEOUTS.INTEGRATION,
    
    // Performance optimization
    maxWorkers: '50%',
    
    // Verbose output for detailed test information
    verbose: true,
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    resetMocks: true,
    
    // Test sequence and cleanup
    testSequencer: '@jest/test-sequencer',
    detectOpenHandles: true,
    forceExit: true
  };
};

// Export the configuration for Jest to use
export default createJestConfig();