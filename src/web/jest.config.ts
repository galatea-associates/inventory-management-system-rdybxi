import { Config } from '@jest/types'; // v29.5.0
import path from 'path';

/**
 * Creates and returns the Jest configuration object for the web frontend
 * @returns Jest configuration object for testing React components
 */
const createJestConfig = (): Config.InitialOptions => {
  return {
    // Use ts-jest as the preset for TypeScript testing
    preset: 'ts-jest',
    
    // Set the test environment to jsdom for browser-like testing
    testEnvironment: 'jsdom',
    
    // Define the root directory for tests
    roots: ['<rootDir>/src'],
    
    // Define test file patterns
    testMatch: [
      '**/__tests__/**/*.{ts,tsx}',
      '**/?(*.)+(spec|test).{ts,tsx}'
    ],
    
    // Define patterns to ignore for testing
    testPathIgnorePatterns: [
      '/node_modules/',
      '/dist/',
      '/build/'
    ],
    
    // Setup files to run before tests
    setupFilesAfterEnv: [
      '<rootDir>/src/setupTests.ts',
      '<rootDir>/jest.setup.js'
    ],
    
    // Configure transformations for different file types
    transform: {
      '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.json' }],
      '^.+\\.jsx?$': ['babel-jest', {
        presets: ['@babel/preset-env', '@babel/preset-react']
      }]
    },
    
    // Module name mapping for imports
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js'
    },
    
    // Enable collecting coverage
    collectCoverage: true,
    
    // Define the directory for coverage reports
    coverageDirectory: '<rootDir>/coverage',
    
    // Define coverage reporters
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    
    // Define patterns to ignore for coverage
    coveragePathIgnorePatterns: [
      '/node_modules/',
      '/dist/',
      '/build/',
      '/src/types/',
      '/src/constants/',
      '/src/assets/'
    ],
    
    // Define coverage thresholds
    coverageThreshold: {
      global: {
        branches: 70,
        functions: 85,
        lines: 85,
        statements: 85
      }
    },
    
    // Configure test reporters
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
    
    // Set test timeout
    testTimeout: 30000,
    
    // Set maximum workers
    maxWorkers: '50%',
    
    // Enable verbose output
    verbose: true,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after tests
    restoreMocks: true,
    
    // Reset mocks before tests
    resetMocks: true,
    
    // Define module directories
    moduleDirectories: ['node_modules', 'src'],
    
    // Configure watch plugins
    watchPlugins: [
      'jest-watch-typeahead/filename',
      'jest-watch-typeahead/testname'
    ]
  };
};

// Export the configuration
export default createJestConfig();