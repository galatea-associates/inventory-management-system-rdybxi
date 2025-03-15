/**
 * Utility functions for testing the Inventory Management System.
 * Provides various helper functions for setting up test environments,
 * loading test data, performance measurement, mocking, and more.
 */

import * as fs from 'fs-extra'; // v11.1.1
import * as path from 'path';
import { mock } from 'jest-mock-extended'; // v3.0.4
import MockDate from 'mockdate'; // v3.0.5

import {
  TEST_TIMEOUTS,
  PERFORMANCE_THRESHOLDS,
  TEST_DATA_PATHS
} from './constants';

/**
 * Sets up the test environment with necessary mocks and configurations.
 * This function should be called in the jest setupFilesAfterEnv configuration
 * or at the beginning of test suites.
 */
export function setupTestEnvironment(): void {
  // Set up mock for localStorage and sessionStorage if in Node.js environment
  if (typeof window === 'undefined') {
    global.localStorage = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn().mockReturnValue(null),
    };
    
    global.sessionStorage = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn().mockReturnValue(null),
    };
  }
  
  // Set global Jest timeout based on test type (defaults to UNIT test timeout)
  jest.setTimeout(TEST_TIMEOUTS.UNIT);
  
  // Silence console errors during tests to keep output clean
  // Save original console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Replace with mocked versions that can be controlled during tests
  console.error = jest.fn();
  console.warn = jest.fn();
  
  // Restore console methods after tests
  afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });
}

/**
 * Loads test data from JSON fixture files.
 * 
 * @param filePath - Relative path to the fixture file
 * @returns Parsed JSON data from the fixture file
 */
export function loadTestData(filePath: string): any {
  try {
    const absolutePath = path.resolve(filePath);
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error loading test data from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Waits for a condition to be true with timeout.
 * 
 * @param conditionFn - Function that returns boolean or Promise<boolean>
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param interval - Check interval in milliseconds (default: 100)
 * @returns Promise that resolves to true if condition is met, false if timeout
 */
export async function waitForCondition(
  conditionFn: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const startTime = Date.now();
    
    const checkCondition = async () => {
      // Check if we've exceeded the timeout
      if (Date.now() - startTime >= timeout) {
        resolve(false);
        return;
      }
      
      // Check the condition
      try {
        const result = await Promise.resolve(conditionFn());
        if (result) {
          resolve(true);
          return;
        }
        
        // If condition is not met, schedule another check
        setTimeout(checkCondition, interval);
      } catch (error) {
        // If condition check throws an error, continue waiting
        setTimeout(checkCondition, interval);
      }
    };
    
    // Start checking
    checkCondition();
  });
}

/**
 * Measures the execution time of a function.
 * Works with both synchronous and asynchronous functions.
 * 
 * @param fn - Function to measure
 * @param args - Arguments to pass to the function
 * @returns Object containing the function result and execution time in milliseconds
 */
export async function measureExecutionTime<T>(
  fn: (...args: any[]) => T | Promise<T>,
  args: any[] = []
): Promise<{ result: T; executionTime: number }> {
  const startTime = performance.now();
  // Handle both synchronous and asynchronous functions
  const result = await Promise.resolve(fn(...args));
  const endTime = performance.now();
  
  return {
    result,
    executionTime: endTime - startTime
  };
}

/**
 * Validates that a function's execution time is within the specified threshold.
 * 
 * @param fn - Function to validate
 * @param args - Arguments to pass to the function
 * @param threshold - Maximum allowed execution time in milliseconds
 * @returns Promise that resolves to an object with validation result and execution time
 */
export async function validatePerformance<T>(
  fn: (...args: any[]) => T | Promise<T>,
  args: any[] = [],
  threshold: number
): Promise<{ success: boolean; executionTime: number; threshold: number; result: T }> {
  const { result, executionTime } = await measureExecutionTime(fn, args);
  
  return {
    success: executionTime <= threshold,
    executionTime,
    threshold,
    result
  };
}

/**
 * Mocks the Date object for consistent date-based testing.
 * 
 * @param date - Date to mock (default: 2023-01-15T12:00:00Z)
 */
export function mockDate(date?: Date | string | number): void {
  // Default test date: January 15, 2023 12:00:00 UTC
  const mockDateValue = date || new Date('2023-01-15T12:00:00Z');
  MockDate.set(mockDateValue);
}

/**
 * Resets the Date object to the real date.
 */
export function resetMockDate(): void {
  MockDate.reset();
}

/**
 * Creates a mock logger for testing.
 * 
 * @returns Mock logger object with info, warn, error, and debug methods
 */
export function createMockLogger() {
  return mock<{
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
  }>();
}

/**
 * Creates a mock repository for testing.
 * 
 * @param overrides - Optional overrides for repository methods
 * @returns Mock repository object with CRUD methods
 */
export function createMockRepository(overrides: Record<string, any> = {}) {
  const repository = mock<{
    findById: (id: string) => Promise<any>;
    findAll: (filter?: any) => Promise<any[]>;
    save: (entity: any) => Promise<any>;
    update: (entity: any) => Promise<any>;
    delete: (id: string) => Promise<boolean>;
  }>();
  
  // Apply default implementations
  repository.findById.mockResolvedValue(null);
  repository.findAll.mockResolvedValue([]);
  repository.save.mockImplementation(entity => Promise.resolve({ id: 'mock-id', ...entity }));
  repository.update.mockImplementation(entity => Promise.resolve(entity));
  repository.delete.mockResolvedValue(true);
  
  // Apply overrides
  Object.keys(overrides).forEach(key => {
    if (typeof repository[key] === 'function') {
      repository[key].mockImplementation(overrides[key]);
    }
  });
  
  return repository;
}

/**
 * Creates a mock service for testing.
 * 
 * @param overrides - Optional overrides for service methods
 * @returns Mock service object with common service methods
 */
export function createMockService(overrides: Record<string, any> = {}) {
  const service = mock<{
    getById: (id: string) => Promise<any>;
    getAll: (filter?: any) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
    delete: (id: string) => Promise<boolean>;
  }>();
  
  // Apply default implementations
  service.getById.mockResolvedValue(null);
  service.getAll.mockResolvedValue([]);
  service.create.mockImplementation(data => Promise.resolve({ id: 'mock-id', ...data }));
  service.update.mockImplementation((id, data) => Promise.resolve({ id, ...data }));
  service.delete.mockResolvedValue(true);
  
  // Apply overrides
  Object.keys(overrides).forEach(key => {
    if (typeof service[key] === 'function') {
      service[key].mockImplementation(overrides[key]);
    }
  });
  
  return service;
}

/**
 * Creates a mock event publisher for testing.
 * 
 * @returns Mock event publisher object with publish method
 */
export function createMockEventPublisher() {
  const publisher = mock<{
    publish: (eventType: string, data: any) => Promise<void>;
  }>();
  
  publisher.publish.mockResolvedValue(undefined);
  
  return publisher;
}

/**
 * Creates a mock event listener for testing.
 * 
 * @returns Mock event listener object with onEvent method
 */
export function createMockEventListener() {
  const listener = mock<{
    onEvent: (eventType: string, handler: (data: any) => void) => void;
  }>();
  
  return listener;
}

/**
 * Creates a mock HTTP client for testing.
 * 
 * @param responses - Optional map of endpoint to response data
 * @returns Mock HTTP client object with get, post, put, and delete methods
 */
export function createMockHttpClient(responses: Record<string, any> = {}) {
  const client = mock<{
    get: (url: string, config?: any) => Promise<any>;
    post: (url: string, data?: any, config?: any) => Promise<any>;
    put: (url: string, data?: any, config?: any) => Promise<any>;
    delete: (url: string, config?: any) => Promise<any>;
  }>();
  
  // Apply default implementations
  client.get.mockImplementation((url) => {
    return Promise.resolve({ 
      data: responses[url] || {}, 
      status: 200, 
      statusText: 'OK',
      headers: {} 
    });
  });
  
  client.post.mockImplementation((url, data) => {
    return Promise.resolve({ 
      data: responses[url] || { id: 'mock-id', ...data }, 
      status: 201, 
      statusText: 'Created',
      headers: {} 
    });
  });
  
  client.put.mockImplementation((url, data) => {
    return Promise.resolve({ 
      data: responses[url] || data, 
      status: 200, 
      statusText: 'OK',
      headers: {} 
    });
  });
  
  client.delete.mockImplementation((url) => {
    return Promise.resolve({ 
      data: responses[url] || {}, 
      status: 204, 
      statusText: 'No Content',
      headers: {} 
    });
  });
  
  return client;
}

/**
 * Creates a mock WebSocket for testing.
 * 
 * @returns Mock WebSocket object with send and close methods
 */
export function createMockWebSocket() {
  const socket = mock<WebSocket>();
  
  // Set default properties
  Object.defineProperty(socket, 'readyState', { value: WebSocket.OPEN });
  Object.defineProperty(socket, 'url', { value: 'ws://mock-websocket-url' });
  Object.defineProperty(socket, 'protocol', { value: '' });
  Object.defineProperty(socket, 'extensions', { value: '' });
  Object.defineProperty(socket, 'bufferedAmount', { value: 0 });
  Object.defineProperty(socket, 'binaryType', { value: 'blob' });
  
  // Add WebSocket constants
  Object.defineProperty(socket, 'CONNECTING', { value: 0 });
  Object.defineProperty(socket, 'OPEN', { value: 1 });
  Object.defineProperty(socket, 'CLOSING', { value: 2 });
  Object.defineProperty(socket, 'CLOSED', { value: 3 });
  
  return socket;
}

/**
 * Creates a mock HTTP request object for testing.
 * 
 * @param overrides - Optional overrides for request properties
 * @returns Mock request object with headers, body, params, and query
 */
export function createMockRequest(overrides: Record<string, any> = {}) {
  const defaultRequest = {
    headers: {
      'content-type': 'application/json',
      'authorization': 'Bearer mock-token',
    },
    body: {},
    params: {},
    query: {},
    cookies: {},
    ip: '127.0.0.1',
    method: 'GET',
    url: '/mock-url',
    originalUrl: '/mock-url',
    path: '/mock-url',
    protocol: 'http',
    secure: false,
    hostname: 'localhost',
  };
  
  // Deep merge the default request with overrides
  const mergedRequest = { 
    ...defaultRequest, 
    ...overrides,
    headers: { ...defaultRequest.headers, ...overrides.headers },
    body: { ...defaultRequest.body, ...overrides.body },
    params: { ...defaultRequest.params, ...overrides.params },
    query: { ...defaultRequest.query, ...overrides.query },
    cookies: { ...defaultRequest.cookies, ...overrides.cookies },
  };
  
  return mergedRequest;
}

/**
 * Creates a mock HTTP response object for testing.
 * 
 * @returns Mock response object with status, json, send, and end methods
 */
export function createMockResponse() {
  const res = mock<{
    status: (code: number) => any;
    json: (data: any) => any;
    send: (body: any) => any;
    end: () => any;
    setHeader: (name: string, value: string) => any;
    type: (type: string) => any;
    cookie: (name: string, value: string, options?: any) => any;
    clearCookie: (name: string, options?: any) => any;
    redirect: (url: string) => any;
  }>();
  
  // Set up method chaining
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.send.mockReturnValue(res);
  res.end.mockReturnValue(res);
  res.setHeader.mockReturnValue(res);
  res.type.mockReturnValue(res);
  res.cookie.mockReturnValue(res);
  res.clearCookie.mockReturnValue(res);
  res.redirect.mockReturnValue(res);
  
  return res;
}