// Extend Jest with custom DOM matchers
import '@testing-library/jest-dom'; // v5.16.5
// Import fetch mock for API testing
import { enableFetchMocks } from 'jest-fetch-mock'; // v3.0.3
// Import ResizeObserver polyfill
import ResizeObserverPolyfill from 'resize-observer-polyfill'; // v1.5.1

/**
 * Sets up mocks for browser APIs that are not available in JSDOM
 */
function setupBrowserMocks(): void {
  // Mock matchMedia
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

  // Mock scrollTo
  window.scrollTo = jest.fn();

  // Mock ResizeObserver
  global.ResizeObserver = ResizeObserverPolyfill;

  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string): string | null => store[key] || null,
      setItem: (key: string, value: string): void => {
        store[key] = value.toString();
      },
      removeItem: (key: string): void => {
        delete store[key];
      },
      clear: (): void => {
        store = {};
      },
      length: 0,
      key: (_index: number): string | null => null,
    };
  })();

  // Mock sessionStorage
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string): string | null => store[key] || null,
      setItem: (key: string, value: string): void => {
        store[key] = value.toString();
      },
      removeItem: (key: string): void => {
        delete store[key];
      },
      clear: (): void => {
        store = {};
      },
      length: 0,
      key: (_index: number): string | null => null,
    };
  })();

  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
}

/**
 * Configures fetch mock for API testing
 */
function setupFetchMock(): void {
  // Enable fetch mocks
  enableFetchMocks();
  
  // Configure default fetch mock behavior
  global.fetchMock.doMock();
  
  // Reset fetch mocks before each test
  beforeEach(() => {
    global.fetchMock.resetMocks();
  });
}

/**
 * Configures how console messages are handled during tests
 */
function setupConsoleOverrides(): void {
  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;

  // List of warnings to ignore (from third-party libraries)
  const ignoredWarnings = [
    // Add patterns for warnings that should be ignored
    'Warning: ReactDOM.render is no longer supported',
    'Warning: React.createFactory() is deprecated',
    'Warning: findDOMNode is deprecated in StrictMode',
    'Warning: componentWillReceiveProps has been renamed',
    'Warning: componentWillMount has been renamed',
    'Warning: componentWillUpdate has been renamed',
  ];

  // Override console.error
  console.error = (...args) => {
    // Fail tests on unexpected errors
    const message = args.join(' ');
    if (ignoredWarnings.some(warning => message.includes(warning))) {
      originalWarn(...args);
    } else {
      originalError(...args);
      throw new Error(`Unexpected console error: ${message}`);
    }
  };

  // Override console.warn
  console.warn = (...args) => {
    // Log warnings without failing tests
    const message = args.join(' ');
    if (!ignoredWarnings.some(warning => message.includes(warning))) {
      originalWarn(...args);
    }
  };

  // Restore console methods after all tests
  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });
}

// Initialize test environment
setupBrowserMocks();
setupFetchMock();
setupConsoleOverrides();