// Import external packages
import 'jest-canvas-mock'; // v^2.5.0
import * as matchers from 'jest-extended'; // v^3.2.4
import { setupServer } from 'msw/node'; // v^1.2.1

// Setup extended matchers
function setupExtendedMatchers() {
  expect.extend(matchers);
  
  // Add custom matchers specific to the IMS application
  expect.extend({
    toBeValidInventoryItem(received) {
      const pass = received &&
        typeof received.securityId === 'string' &&
        typeof received.quantity === 'number';
      
      return {
        message: () => pass
          ? `expected ${JSON.stringify(received)} not to be a valid inventory item`
          : `expected ${JSON.stringify(received)} to be a valid inventory item with securityId and quantity`,
        pass
      };
    },
    toBeValidPositionData(received) {
      const pass = received &&
        typeof received.bookId === 'string' &&
        typeof received.securityId === 'string' &&
        typeof received.quantity !== 'undefined';
      
      return {
        message: () => pass
          ? `expected ${JSON.stringify(received)} not to be a valid position data`
          : `expected ${JSON.stringify(received)} to be a valid position data with bookId, securityId and quantity`,
        pass
      };
    }
  });
}

// Setup Canvas mock for D3.js and Recharts visualizations
function setupCanvasMock() {
  // jest-canvas-mock is imported at the top
  
  // Additional canvas mocks for advanced charting functionality
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(contextType) {
    const context = originalGetContext.call(this, contextType);
    if (contextType === '2d') {
      context.measureText = (text) => ({
        width: text.length * 8,
        height: 16,
        actualBoundingBoxAscent: 12,
        actualBoundingBoxDescent: 4,
        fontBoundingBoxAscent: 12,
        fontBoundingBoxDescent: 4
      });
    }
    return context;
  };
}

// Setup Mock Service Worker for API mocking
function setupMockServiceWorker() {
  // Create a default empty server
  // Users should create a ./mocks/handlers.js file and import it in their tests
  // to provide specific API mocks
  const server = setupServer();
  
  // Start server before all tests
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  
  // Reset handlers between tests
  afterEach(() => server.resetHandlers());
  
  // Close server after all tests
  afterAll(() => server.close());
  
  // Make server available globally for adding handlers in specific tests
  global.mswServer = server;
}

// Setup IntersectionObserver mock
function setupIntersectionObserverMock() {
  global.IntersectionObserver = class IntersectionObserverMock {
    constructor(callback) {
      this.callback = callback;
      this.elements = new Set();
      this.mockIntersectionObserverEntry = {
        boundingClientRect: {},
        intersectionRatio: 0,
        intersectionRect: {},
        isIntersecting: false,
        rootBounds: {},
        target: null,
        time: Date.now()
      };
    }
    
    observe(element) {
      this.elements.add(element);
    }
    
    unobserve(element) {
      this.elements.delete(element);
    }
    
    disconnect() {
      this.elements.clear();
    }
    
    // Helper method for tests to trigger intersection events
    triggerIntersection(elementsToNotify, isIntersecting) {
      const entries = [];
      elementsToNotify.forEach(element => {
        if (this.elements.has(element)) {
          const entry = {
            ...this.mockIntersectionObserverEntry,
            isIntersecting,
            target: element
          };
          entries.push(entry);
        }
      });
      
      if (entries.length > 0) {
        this.callback(entries, this);
      }
    }
  };
}

// Setup MutationObserver mock
function setupMutationObserverMock() {
  global.MutationObserver = class MutationObserverMock {
    constructor(callback) {
      this.callback = callback;
      this.observedElement = null;
      this.options = null;
      this.mockMutationRecord = {
        addedNodes: [],
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        oldValue: null,
        previousSibling: null,
        removedNodes: [],
        target: null,
        type: 'attributes'
      };
    }
    
    observe(element, options) {
      this.observedElement = element;
      this.options = options;
    }
    
    disconnect() {
      this.observedElement = null;
      this.options = null;
    }
    
    takeRecords() {
      return [];
    }
    
    // Helper method for tests to trigger mutation events
    triggerMutation(type, target, details = {}) {
      if (this.observedElement) {
        const record = {
          ...this.mockMutationRecord,
          type,
          target,
          ...details
        };
        this.callback([record], this);
      }
    }
  };
}

// Setup Redux mock helper
function setupReduxMock() {
  global.mockReduxStore = (initialState = {}) => {
    const store = {
      getState: jest.fn(() => initialState),
      dispatch: jest.fn(),
      replaceReducer: jest.fn(),
      subscribe: jest.fn(() => jest.fn()),
      actions: [],
      
      // Helper methods for testing
      getLastAction: () => store.actions[store.actions.length - 1],
      getActionsByType: (type) => store.actions.filter(action => action.type === type),
      getActionCount: () => store.actions.length
    };
    
    // Capture actions on dispatch
    store.dispatch.mockImplementation(action => {
      store.actions.push(action);
      return action;
    });
    
    return store;
  };
}

// Setup WebSocket mock for testing real-time features
function setupWebSocketMock() {
  class WebSocketMock {
    constructor(url) {
      this.url = url;
      this.readyState = WebSocketMock.CONNECTING;
      
      // Event handlers
      this.onopen = null;
      this.onclose = null;
      this.onmessage = null;
      this.onerror = null;
      
      // Queue messages until a connection is established
      this.messageQueue = [];
      
      // Store sent messages for assertions
      this.sentMessages = [];
      
      // Auto-connect by default
      setTimeout(() => this.simulateConnection(), 0);
    }
    
    // WebSocket readyState constants
    static get CONNECTING() { return 0; }
    static get OPEN() { return 1; }
    static get CLOSING() { return 2; }
    static get CLOSED() { return 3; }
    
    // Methods
    send(data) {
      if (this.readyState !== WebSocketMock.OPEN) {
        throw new Error('WebSocket is not open');
      }
      this.sentMessages.push(data);
    }
    
    close(code, reason) {
      if (this.readyState === WebSocketMock.CLOSING || this.readyState === WebSocketMock.CLOSED) {
        return;
      }
      this.readyState = WebSocketMock.CLOSING;
      setTimeout(() => {
        this.readyState = WebSocketMock.CLOSED;
        if (this.onclose) {
          this.onclose({
            code: code || 1000,
            reason: reason || '',
            wasClean: true
          });
        }
      }, 0);
    }
    
    // Helper methods for testing
    simulateConnection() {
      if (this.readyState !== WebSocketMock.CONNECTING) {
        return;
      }
      this.readyState = WebSocketMock.OPEN;
      if (this.onopen) {
        this.onopen({});
      }
      // Send any queued messages
      while (this.messageQueue.length > 0) {
        this.simulateIncomingMessage(this.messageQueue.shift());
      }
    }
    
    simulateIncomingMessage(data) {
      if (this.readyState === WebSocketMock.OPEN && this.onmessage) {
        this.onmessage({
          data,
          origin: this.url,
          lastEventId: ''
        });
      } else if (this.readyState === WebSocketMock.CONNECTING) {
        // Queue message to be sent when connection opens
        this.messageQueue.push(data);
      }
    }
    
    simulateError(error) {
      if (this.onerror) {
        this.onerror(new ErrorEvent('error', { error, message: error.message }));
      }
    }
  }
  
  // Assign mock to global
  global.WebSocket = WebSocketMock;
  
  // Create helper object for controlling WebSocket mocks
  global.mockWebSocket = {
    simulateIncomingMessage: (socket, data) => socket.simulateIncomingMessage(data),
    simulateConnection: (socket) => socket.simulateConnection(),
    simulateError: (socket, error) => socket.simulateError(error),
    getSentMessages: (socket) => socket.sentMessages,
    clearSentMessages: (socket) => { socket.sentMessages = []; }
  };
}

// Setup Jest timer mocks for testing time-dependent code
function setupJestTimers() {
  // Use fake timers
  jest.useFakeTimers();
  
  // Add timer helpers to global object
  global.advanceTimersByTime = (ms) => {
    jest.advanceTimersByTime(ms);
  };
  
  global.runAllTimers = () => {
    jest.runAllTimers();
  };
  
  global.runOnlyPendingTimers = () => {
    jest.runOnlyPendingTimers();
  };
  
  // Reset timers after each test
  afterEach(() => {
    jest.clearAllTimers();
  });
}

// Run all setup functions
setupExtendedMatchers();
setupCanvasMock();
setupMockServiceWorker();
setupIntersectionObserverMock();
setupMutationObserverMock();
setupReduxMock();
setupWebSocketMock();
setupJestTimers();

// Log setup completion
console.log('Jest setup complete - Mock environment configured for IMS web frontend tests');