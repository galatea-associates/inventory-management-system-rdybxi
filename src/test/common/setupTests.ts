// setupTests.ts
// Import and configure @testing-library/jest-dom for DOM testing
import '@testing-library/jest-dom'; // version: ^5.16.5
// Import and configure jest-extended to add additional matchers
import 'jest-extended'; // version: ^3.2.4
// Import and configure jest-fetch-mock for fetch API mocking
import fetchMock from 'jest-fetch-mock'; // version: ^3.0.3
import axios from 'axios'; // version: ^1.4.0

import * as constants from './constants';
import { setupTestEnvironment, mockDate, resetMockDate } from './testUtils';
import { createMockAdapter, setupAllMocks } from './mocks/apiMocks';

/**
 * Global setup file for Jest tests in the Inventory Management System.
 * Configures the test environment with necessary mocks, extensions, and global
 * settings to ensure consistent test behavior across all test suites.
 * This file is executed by Jest before running tests as specified in the
 * jest.config.ts setupFilesAfterEnv configuration.
 */

// Set up test environment using setupTestEnvironment from testUtils
setupTestEnvironment();

/**
 * Sets up global mocks for browser APIs and external dependencies
 */
function setupMocks() {
  // Mock window.matchMedia for components that use media queries
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock window.scrollTo to avoid errors when components trigger scrolling
  window.scrollTo = jest.fn();

  // Mock window.ResizeObserver for components that observe element dimensions
  (global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock localStorage and sessionStorage APIs
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });

  // Configure fetch mock using jest-fetch-mock
  fetchMock.enableMocks();

  // Set up axios mock adapter for API requests
  createMockAdapter(axios, {});

  // Configure all API endpoint mocks using setupAllMocks
  setupAllMocks();
}

/**
 * Configures how console messages are handled during tests
 */
function setupConsoleHandlers() {
  // Store original console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // Mock console.error to fail tests on errors unless explicitly allowed
  console.error = jest.fn().mockImplementation((message: any, ...args: any[]) => {
    // Allow specific known warnings from dependencies
    const allowedWarnings = [
      'EventEmitter.removeListener',
    ];

    if (!allowedWarnings.some(warning => String(message).includes(warning))) {
      originalConsoleError(message, ...args);
      throw new Error(`Unexpected console.error: ${message}`);
    } else {
      originalConsoleError(message, ...args);
    }
  });

  // Mock console.warn to show warnings but not fail tests
  console.warn = jest.fn().mockImplementation((message: any, ...args: any[]) => {
    originalConsoleWarn(message, ...args);
  });

  // Restore original console methods after tests
  afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });
}

/**
 * Sets up global mock objects and functions used across tests
 */
function setupGlobalMocks() {
  // Set up global mock for WebSocket API
  global.WebSocket = jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as any;

  // Set up global mock for MutationObserver
  global.MutationObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(),
  }));

  // Set up global mock for IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Set up global mock for requestAnimationFrame
  global.requestAnimationFrame = jest.fn().mockImplementation(cb => setTimeout(cb, 0));

  // Set up global mock for cancelAnimationFrame
  global.cancelAnimationFrame = jest.fn().mockImplementation(id => clearTimeout(id));
}

// Set up global mocks for browser APIs using setupMocks function
setupMocks();

// Configure console error/warning handling using setupConsoleHandlers function
setupConsoleHandlers();

// Set up global mock objects and functions using setupGlobalMocks function
setupGlobalMocks();

// Configure global Jest timeout using TEST_TIMEOUTS.UNIT
jest.setTimeout(constants.TEST_TIMEOUTS.UNIT);

// Set up a fixed mock date for consistent date-based testing
mockDate();

// Configure global beforeAll hook to set up test environment
beforeAll(() => {
  // Mock the date to a fixed value for consistent testing
  mockDate();
});

// Configure global afterAll hook to clean up after tests
afterAll(() => {
  // Restore the original date
  resetMockDate();
  // Clear all mocks to prevent bleed-over between tests
  jest.clearAllMocks();
});