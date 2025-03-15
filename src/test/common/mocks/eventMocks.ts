/**
 * Provides mock implementations of events for testing the Inventory Management System.
 * This file centralizes event mocking functionality to simulate various event types
 * like reference data events, market data events, position events, inventory events,
 * locate events, and workflow events. These mock events are used in unit tests,
 * integration tests, and performance tests to ensure consistent event structures.
 */

import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import jest from 'jest'; // ^29.5.0
import { WEBSOCKET_EVENTS, MOCK_DELAYS } from '../constants';
import { createMockEvent } from '../mockData';

/**
 * Constants defining event types for different domains
 */
export const EVENT_TYPES = {
  REFERENCE_DATA: {
    CREATED: 'reference.data.created',
    UPDATED: 'reference.data.updated',
    DELETED: 'reference.data.deleted'
  },
  MARKET_DATA: {
    PRICE_UPDATED: 'market.data.price.updated',
    NAV_UPDATED: 'market.data.nav.updated',
    VOLATILITY_UPDATED: 'market.data.volatility.updated',
  },
  TRADE_DATA: {
    ORDER_CREATED: 'trade.data.order.created',
    ORDER_UPDATED: 'trade.data.order.updated',
    EXECUTION_CREATED: 'trade.data.execution.created'
  },
  POSITION: {
    CREATED: 'position.created',
    UPDATED: 'position.updated',
    SETTLEMENT_UPDATED: 'position.settlement.updated'
  },
  INVENTORY: {
    UPDATED: 'inventory.updated',
    CALCULATED: 'inventory.calculated'
  },
  LOCATE: {
    REQUESTED: 'locate.requested',
    APPROVED: 'locate.approved',
    REJECTED: 'locate.rejected'
  },
  WORKFLOW: {
    STARTED: 'workflow.started',
    COMPLETED: 'workflow.completed',
    TASK_ASSIGNED: 'workflow.task.assigned'
  }
};

/**
 * Creates a base mock event with common metadata
 * @param overrides Properties to override default values
 * @returns A base mock event with metadata
 */
export function createMockBaseEvent(overrides = {}) {
  return {
    metadata: {
      eventId: uuidv4(),
      eventTime: new Date().toISOString(),
      source: 'test-mock-service',
      correlationId: uuidv4(),
      ...overrides.metadata
    },
    payload: {},
    ...overrides
  };
}

/**
 * Creates a mock reference data event
 * @param eventType Type of reference data event
 * @param payload Event payload data
 * @param overrides Properties to override default values
 * @returns A mock reference data event
 */
export function createMockReferenceDataEvent(eventType = EVENT_TYPES.REFERENCE_DATA.UPDATED, payload = {}, overrides = {}) {
  const baseEvent = createMockBaseEvent(overrides);
  baseEvent.metadata.eventType = eventType;
  
  // Generate a default payload if none provided
  if (Object.keys(payload).length === 0) {
    // Default to a security reference data update
    payload = {
      security: {
        internalId: `SEC-${uuidv4().substring(0, 8)}`,
        securityType: 'EQUITY',
        issuer: 'Test Company',
        description: 'Test Security',
        status: 'ACTIVE'
      }
    };
  }
  
  baseEvent.payload = payload;
  return baseEvent;
}

/**
 * Creates a mock market data event
 * @param eventType Type of market data event
 * @param payload Event payload data
 * @param overrides Properties to override default values
 * @returns A mock market data event
 */
export function createMockMarketDataEvent(eventType = EVENT_TYPES.MARKET_DATA.PRICE_UPDATED, payload = {}, overrides = {}) {
  const baseEvent = createMockBaseEvent(overrides);
  baseEvent.metadata.eventType = eventType;
  
  // Generate a default payload if none provided
  if (Object.keys(payload).length === 0) {
    // Default to a price update
    payload = {
      securityId: `SEC-${uuidv4().substring(0, 8)}`,
      price: Math.random() * 1000,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      source: 'MOCK_MARKET_DATA'
    };
  }
  
  baseEvent.payload = payload;
  return baseEvent;
}

/**
 * Creates a mock trade data event
 * @param eventType Type of trade data event
 * @param payload Event payload data
 * @param overrides Properties to override default values
 * @returns A mock trade data event
 */
export function createMockTradeDataEvent(eventType = EVENT_TYPES.TRADE_DATA.ORDER_CREATED, payload = {}, overrides = {}) {
  const baseEvent = createMockBaseEvent(overrides);
  baseEvent.metadata.eventType = eventType;
  
  // Generate a default payload if none provided
  if (Object.keys(payload).length === 0) {
    // Default to an order created event
    payload = {
      orderId: `ORD-${uuidv4().substring(0, 8)}`,
      securityId: `SEC-${uuidv4().substring(0, 8)}`,
      clientId: `CP-${uuidv4().substring(0, 8)}`,
      orderType: 'BUY',
      quantity: 1000,
      price: 100.00
    };
  }
  
  baseEvent.payload = payload;
  return baseEvent;
}

/**
 * Creates a mock position event
 * @param eventType Type of position event
 * @param payload Event payload data
 * @param overrides Properties to override default values
 * @returns A mock position event
 */
export function createMockPositionEvent(eventType = EVENT_TYPES.POSITION.UPDATED, payload = {}, overrides = {}) {
  const baseEvent = createMockBaseEvent(overrides);
  baseEvent.metadata.eventType = eventType;
  
  // Generate a default payload if none provided
  if (Object.keys(payload).length === 0) {
    // Default to a position update
    payload = {
      position: {
        id: `POS-${uuidv4().substring(0, 8)}`,
        bookId: 'EQUITY-01',
        security: { internalId: `SEC-${uuidv4().substring(0, 8)}` },
        counterparty: { counterpartyId: `CP-${uuidv4().substring(0, 8)}` },
        contractualQty: 1000,
        settledQty: 800,
        businessDate: new Date().toISOString().split('T')[0]
      }
    };
  }
  
  baseEvent.payload = payload;
  return baseEvent;
}

/**
 * Creates a mock inventory event
 * @param eventType Type of inventory event
 * @param payload Event payload data
 * @param overrides Properties to override default values
 * @returns A mock inventory event
 */
export function createMockInventoryEvent(eventType = EVENT_TYPES.INVENTORY.UPDATED, payload = {}, overrides = {}) {
  const baseEvent = createMockBaseEvent(overrides);
  baseEvent.metadata.eventType = eventType;
  
  // Generate a default payload if none provided
  if (Object.keys(payload).length === 0) {
    // Default to an inventory update
    payload = {
      inventory: {
        id: uuidv4(),
        security: { internalId: `SEC-${uuidv4().substring(0, 8)}` },
        counterparty: { counterpartyId: `CP-${uuidv4().substring(0, 8)}` },
        calculationType: 'FOR_LOAN',
        grossQuantity: 5000,
        availableQuantity: 3000,
        businessDate: new Date().toISOString().split('T')[0]
      }
    };
  }
  
  baseEvent.payload = payload;
  return baseEvent;
}

/**
 * Creates a mock locate event
 * @param eventType Type of locate event
 * @param payload Event payload data
 * @param overrides Properties to override default values
 * @returns A mock locate event
 */
export function createMockLocateEvent(eventType = EVENT_TYPES.LOCATE.REQUESTED, payload = {}, overrides = {}) {
  const baseEvent = createMockBaseEvent(overrides);
  baseEvent.metadata.eventType = eventType;
  
  // Generate a default payload if none provided
  if (Object.keys(payload).length === 0) {
    // Default to a locate request
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    payload = {
      locate: {
        requestId: `LOC-${today}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
        security: { internalId: `SEC-${uuidv4().substring(0, 8)}` },
        requestor: { counterpartyId: `CP-${uuidv4().substring(0, 8)}` },
        client: { counterpartyId: `CP-${uuidv4().substring(0, 8)}` },
        quantity: 2000,
        locateType: 'SHORT_SELL'
      }
    };
  }
  
  baseEvent.payload = payload;
  return baseEvent;
}

/**
 * Creates a mock workflow event
 * @param eventType Type of workflow event
 * @param payload Event payload data
 * @param overrides Properties to override default values
 * @returns A mock workflow event
 */
export function createMockWorkflowEvent(eventType = EVENT_TYPES.WORKFLOW.STARTED, payload = {}, overrides = {}) {
  const baseEvent = createMockBaseEvent(overrides);
  baseEvent.metadata.eventType = eventType;
  
  // Generate a default payload if none provided
  if (Object.keys(payload).length === 0) {
    // Default to a workflow started event
    payload = {
      workflowId: `WF-${uuidv4().substring(0, 8)}`,
      workflowType: 'LOCATE_APPROVAL',
      requesterId: `USER-${uuidv4().substring(0, 8)}`,
      startTime: new Date().toISOString()
    };
  }
  
  baseEvent.payload = payload;
  return baseEvent;
}

/**
 * Creates a mock WebSocket event for client-side testing
 * @param eventType Type of WebSocket event
 * @param data Event data
 * @param overrides Properties to override default values
 * @returns A mock WebSocket event
 */
export function createMockWebSocketEvent(eventType = WEBSOCKET_EVENTS.POSITION_UPDATE, data = {}, overrides = {}) {
  return {
    type: eventType,
    data: data,
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Creates a stream of mock events for testing event processing
 * @param eventType Type of event to create
 * @param count Number of events to create
 * @param basePayload Base payload to include in all events
 * @param overrides Properties to override default values
 * @returns Array of mock events
 */
export function createMockEventStream(eventType, count = 100, basePayload = {}, overrides = {}) {
  const events = [];
  let createEventFn;
  
  // Determine which event creation function to use
  if (eventType.startsWith('reference.data')) {
    createEventFn = createMockReferenceDataEvent;
  } else if (eventType.startsWith('market.data')) {
    createEventFn = createMockMarketDataEvent;
  } else if (eventType.startsWith('trade.data')) {
    createEventFn = createMockTradeDataEvent;
  } else if (eventType.startsWith('position')) {
    createEventFn = createMockPositionEvent;
  } else if (eventType.startsWith('inventory')) {
    createEventFn = createMockInventoryEvent;
  } else if (eventType.startsWith('locate')) {
    createEventFn = createMockLocateEvent;
  } else if (eventType.startsWith('workflow')) {
    createEventFn = createMockWorkflowEvent;
  } else {
    createEventFn = createMockBaseEvent;
  }
  
  // Create the specified number of events
  for (let i = 0; i < count; i++) {
    // For each event, merge the base payload with an index to make them unique
    const payload = { ...basePayload, index: i };
    events.push(createEventFn(eventType, payload, overrides));
  }
  
  return events;
}

/**
 * Creates a mock event publisher function
 * @param callback Function to call when events are published
 * @param delay Delay in milliseconds before callback is invoked
 * @returns Jest mock function for publishing events
 */
export function mockEventPublisher(callback = () => {}, delay = MOCK_DELAYS.API_RESPONSE) {
  return jest.fn((event) => {
    setTimeout(() => {
      callback(event);
    }, delay);
    return Promise.resolve({ success: true, eventId: event.metadata?.eventId || uuidv4() });
  });
}

/**
 * Creates a mock event listener function
 * @param handler Function to handle received events
 * @returns Jest mock function for handling events
 */
export function mockEventListener(handler = () => {}) {
  return jest.fn(handler);
}

/**
 * Creates a mock event bus for testing event-driven components
 * @param handlers Initial event handlers
 * @returns Mock event bus with publish and subscribe methods
 */
export function createMockEventBus(handlers = {}) {
  const eventHandlers = { ...handlers };
  
  return {
    publish: jest.fn((eventType, event) => {
      const handlersForType = eventHandlers[eventType] || [];
      handlersForType.forEach(handler => {
        setTimeout(() => {
          handler(event);
        }, MOCK_DELAYS.API_RESPONSE);
      });
      return Promise.resolve({ success: true, eventId: event.metadata?.eventId || uuidv4() });
    }),
    
    subscribe: jest.fn((eventType, handler) => {
      if (!eventHandlers[eventType]) {
        eventHandlers[eventType] = [];
      }
      eventHandlers[eventType].push(handler);
      // Return unsubscribe function
      return () => {
        eventHandlers[eventType] = eventHandlers[eventType].filter(h => h !== handler);
      };
    }),
    
    // Helper to get the current handlers (for testing purposes)
    getHandlers: () => ({ ...eventHandlers })
  };
}

// Pre-defined mock events for common test scenarios
export const mockEvents = {
  referenceData: {
    securityCreated: createMockReferenceDataEvent(EVENT_TYPES.REFERENCE_DATA.CREATED, {
      security: {
        internalId: 'SEC-EQ-001',
        securityType: 'EQUITY',
        issuer: 'Apple Inc.',
        description: 'Apple Inc. Common Stock',
        status: 'ACTIVE'
      }
    }),
    securityUpdated: createMockReferenceDataEvent(EVENT_TYPES.REFERENCE_DATA.UPDATED, {
      security: {
        internalId: 'SEC-EQ-001',
        securityType: 'EQUITY',
        issuer: 'Apple Inc.',
        description: 'Apple Inc. Common Stock (Updated)',
        status: 'ACTIVE'
      }
    })
  },
  
  marketData: {
    priceUpdated: createMockMarketDataEvent(EVENT_TYPES.MARKET_DATA.PRICE_UPDATED, {
      securityId: 'SEC-EQ-001',
      price: 150.25,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      source: 'REUTERS'
    }),
    navUpdated: createMockMarketDataEvent(EVENT_TYPES.MARKET_DATA.NAV_UPDATED, {
      basketId: 'SEC-ETF-001',
      nav: 438.75,
      currency: 'USD',
      timestamp: new Date().toISOString()
    })
  },
  
  tradeData: {
    orderCreated: createMockTradeDataEvent(EVENT_TYPES.TRADE_DATA.ORDER_CREATED, {
      orderId: 'ORD-00000001',
      securityId: 'SEC-EQ-001',
      clientId: 'CP-00001',
      orderType: 'BUY',
      quantity: 5000,
      price: 150.25
    }),
    executionCreated: createMockTradeDataEvent(EVENT_TYPES.TRADE_DATA.EXECUTION_CREATED, {
      executionId: 'EXEC-00000001',
      orderId: 'ORD-00000001',
      quantity: 5000,
      price: 150.25,
      timestamp: new Date().toISOString()
    })
  },
  
  position: {
    positionCreated: createMockPositionEvent(EVENT_TYPES.POSITION.CREATED, {
      position: {
        id: 'POS-00001',
        bookId: 'EQUITY-01',
        security: { internalId: 'SEC-EQ-001' },
        counterparty: { counterpartyId: 'CP-00001' },
        contractualQty: 5000,
        settledQty: 0,
        businessDate: new Date().toISOString().split('T')[0]
      }
    }),
    positionUpdated: createMockPositionEvent(EVENT_TYPES.POSITION.UPDATED, {
      position: {
        id: 'POS-00001',
        bookId: 'EQUITY-01',
        security: { internalId: 'SEC-EQ-001' },
        counterparty: { counterpartyId: 'CP-00001' },
        contractualQty: 12500,
        settledQty: 10000,
        businessDate: new Date().toISOString().split('T')[0]
      }
    })
  },
  
  inventory: {
    inventoryCalculated: createMockInventoryEvent(EVENT_TYPES.INVENTORY.CALCULATED, {
      inventory: {
        id: 'INV-FL-00001',
        security: { internalId: 'SEC-EQ-001' },
        counterparty: { counterpartyId: 'CP-00001' },
        calculationType: 'FOR_LOAN',
        grossQuantity: 12500,
        availableQuantity: 10000,
        businessDate: new Date().toISOString().split('T')[0]
      }
    }),
    inventoryUpdated: createMockInventoryEvent(EVENT_TYPES.INVENTORY.UPDATED, {
      inventory: {
        id: 'INV-FL-00001',
        security: { internalId: 'SEC-EQ-001' },
        counterparty: { counterpartyId: 'CP-00001' },
        calculationType: 'FOR_LOAN',
        grossQuantity: 12500,
        availableQuantity: 8500,
        decrementQuantity: 1500,
        businessDate: new Date().toISOString().split('T')[0]
      }
    })
  },
  
  locate: {
    locateRequested: createMockLocateEvent(EVENT_TYPES.LOCATE.REQUESTED, {
      locate: {
        requestId: `LOC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-00001`,
        security: { internalId: 'SEC-EQ-001' },
        requestor: { counterpartyId: 'CP-00001' },
        client: { counterpartyId: 'CP-00001' },
        quantity: 5000,
        locateType: 'SHORT_SELL'
      }
    }),
    locateApproved: createMockLocateEvent(EVENT_TYPES.LOCATE.APPROVED, {
      locate: {
        requestId: `LOC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-00001`,
        security: { internalId: 'SEC-EQ-001' },
        requestor: { counterpartyId: 'CP-00001' },
        client: { counterpartyId: 'CP-00001' },
        quantity: 5000,
        locateType: 'SHORT_SELL',
        status: 'APPROVED'
      },
      approval: {
        approvedQuantity: 5000,
        decrementQuantity: 5000,
        expiryDate: new Date(new Date().getTime() + 86400000).toISOString().split('T')[0]
      }
    })
  },
  
  workflow: {
    locateWorkflowStarted: createMockWorkflowEvent(EVENT_TYPES.WORKFLOW.STARTED, {
      workflowId: 'WF-LOC-00001',
      workflowType: 'LOCATE_APPROVAL',
      requesterId: 'USER-00001',
      referenceId: `LOC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-00001`,
      startTime: new Date().toISOString()
    }),
    locateWorkflowCompleted: createMockWorkflowEvent(EVENT_TYPES.WORKFLOW.COMPLETED, {
      workflowId: 'WF-LOC-00001',
      workflowType: 'LOCATE_APPROVAL',
      requesterId: 'USER-00001',
      referenceId: `LOC-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-00001`,
      startTime: new Date(new Date().getTime() - 5000).toISOString(),
      endTime: new Date().toISOString(),
      result: 'APPROVED'
    })
  }
};