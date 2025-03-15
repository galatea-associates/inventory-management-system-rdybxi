/**
 * Root Jest configuration file for the Inventory Management System test suite.
 * This file defines the core testing environment, patterns, coverage thresholds,
 * and other configuration needed for running unit tests.
 */

import { Config } from '@jest/types';
import path from 'path';
import { TEST_TIMEOUTS } from './common/constants';

/**
 * Creates and returns the Jest configuration object for the test suite
 */
const createJestConfig = (): Config.InitialOptions => {
  return {
    // Use ts-jest preset for TypeScript support
    preset: 'ts-jest',
    
    // Set the test environment to Node.js
    testEnvironment: 'node',
    
    // Root directory for test discovery
    roots: ['<rootDir>'],
    
    // Test file matching patterns
    testMatch: ['**/?(*.)+(spec|test).ts'],
    
    // Patterns to ignore when searching for test files
    testPathIgnorePatterns: [
      '/node_modules/',
      '/dist/',
      '/integration/',
      '/e2e/',
      '/performance/',
      '/contract/',
      '/load/'
    ],
    
    // Files to run after Jest is loaded
    setupFilesAfterEnv: ['./common/setupTests.ts'],
    
    // Transform files with ts-jest
    transform: {
      '^.+\\.tsx?$': ['ts-jest', {
        tsconfig: './tsconfig.json'
      }]
    },
    
    // Module path mapping for cleaner imports
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/../$1',
      '^@test/(.*)$': '<rootDir>/$1',
      '^@common/(.*)$': '<rootDir>/common/$1',
      '^@fixtures/(.*)$': '<rootDir>/common/fixtures/$1',
      '^@mocks/(.*)$': '<rootDir>/common/mocks/$1'
    },
    
    // Code coverage configuration
    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    coveragePathIgnorePatterns: [
      '/node_modules/',
      '/dist/',
      '/common/fixtures/',
      '/common/mocks/'
    ],
    
    // Coverage thresholds as per the quality metrics requirements
    coverageThreshold: {
      global: {
        branches: 70,
        functions: 85,
        lines: 85,
        statements: 85
      }
    },
    
    // Test reporters for different output formats
    reporters: [
      'default',
      ['jest-junit', {
        outputDirectory: '<rootDir>/reports',
        outputName: 'junit.xml'
      }],
      ['jest-html-reporter', {
        outputPath: '<rootDir>/reports/html/index.html'
      }]
    ],
    
    // Test timeout using the constant from common/constants.ts
    testTimeout: TEST_TIMEOUTS.UNIT,
    
    // Limit the number of workers to optimize CI performance
    maxWorkers: '50%',
    
    // Verbose output for detailed test information
    verbose: true,
    
    // Mock behavior configuration
    clearMocks: true,
    restoreMocks: true,
    resetMocks: true
  };
};

// Export the configuration as the default export
export default createJestConfig();