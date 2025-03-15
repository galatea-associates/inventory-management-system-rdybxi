import type { Config } from '@jest/types';
import { TEST_TIMEOUTS } from '../../common/constants';

/**
 * Creates and returns the Jest configuration object for Pact contract tests
 * @returns Jest configuration object for contract tests
 */
const createJestConfig = (): Config.InitialOptions => {
  return {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: ['**/*.pact.test.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    setupFilesAfterEnv: ['../../common/setupTests.ts'],
    transform: {
      '^.+\\.tsx?$': ['ts-jest', { tsconfig: '../../tsconfig.json' }]
    },
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/../../../$1'
    },
    collectCoverage: true,
    coverageDirectory: '<rootDir>/../../coverage/contract',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    reporters: [
      'default',
      ['jest-junit', {
        outputDirectory: '<rootDir>/../../reports/contract',
        outputName: 'junit.xml'
      }],
      ['jest-html-reporter', {
        outputPath: '<rootDir>/../../reports/contract/html/index.html'
      }]
    ],
    testTimeout: TEST_TIMEOUTS.CONTRACT,
    maxWorkers: '50%',
    verbose: true,
    clearMocks: true,
    restoreMocks: true,
    resetMocks: true,
    globalSetup: '<rootDir>/setup/globalSetup.ts',
    globalTeardown: '<rootDir>/setup/globalTeardown.ts'
  };
};

export default createJestConfig();