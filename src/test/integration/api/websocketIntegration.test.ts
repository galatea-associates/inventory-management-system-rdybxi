/**
 * Integration tests for WebSocket communication in the Inventory Management System.
 * Tests real-time data streaming capabilities between the frontend and backend,
 * including connection establishment, subscription management, message handling,
 * and reconnection behavior.
 */

import { WebSocket, Server as WebSocketServer } from 'ws'; // ws 8.13.0
import fetchMock from 'jest-fetch-mock'; // jest-fetch-mock 3.0.3
import nock from 'nock'; // nock 13.3.1

import { createWebSocketClient, WebSocketClient } from '../../../web/src/api/websocket';
import { API_BASE_URL, WEBSOCKET_EVENTS, TEST_TIMEOUTS, PERFORMANCE_THRESHOLDS } from '../../common/constants';
import { loadTestData, waitForCondition, validatePerformance, createMockWebSocket } from '../../common/testUtils';
import { WebSocketMessage } from '../../../web/src/types/api';

/**
 * Sets up a WebSocket server for testing purposes
 * @param port - Port number to run the server on
 * @returns WebSocket server instance
 */
function setupWebSocketServer(port: number): WebSocketServer {
  const server = new WebSocketServer({ port });
  
  server.on('connection', (socket) => {
    // Send a connection acknowledgment
    socket.send(JSON.stringify({
      type: 'CONNECTION_ACK',
      payload: { status: 'connected' },
      timestamp: new Date().toISOString(),
      correlationId: 'server-correlation-id'
    }));
    
    // Handle incoming messages
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle different message types
        switch (message.type) {
          case 'subscribe':
            // Send subscription confirmation
            socket.send(JSON.stringify({
              type: 'SUBSCRIPTION_CONFIRMED',
              payload: { 
                topic: message.payload.topic,
                successful: true
              },
              timestamp: new Date().toISOString(),
              correlationId: message.correlationId
            }));
            break;
            
          case 'unsubscribe':
            // Send unsubscription confirmation
            socket.send(JSON.stringify({
              type: 'UNSUBSCRIPTION_CONFIRMED',
              payload: { 
                topic: message.payload.topic,
                successful: true
              },
              timestamp: new Date().toISOString(),
              correlationId: message.correlationId
            }));
            break;
            
          case 'heartbeat':
            // Respond with a pong message
            socket.send(JSON.stringify({
              type: 'PONG',
              payload: {},
              timestamp: new Date().toISOString(),
              correlationId: message.correlationId
            }));
            break;
            
          default:
            // Echo back unknown messages for testing
            socket.send(data.toString());
        }
      } catch (e) {
        console.error('Error processing WebSocket message:', e);
        
        // Send error response
        socket.send(JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Failed to process message', error: e.message },
          timestamp: new Date().toISOString(),
          correlationId: 'error-correlation-id'
        }));
      }
    });
  });
  
  return server;
}

/**
 * Creates a test WebSocket message with specified type and payload
 * @param type - Message type
 * @param payload - Message payload
 * @returns WebSocket message object
 */
function createTestMessage(type: string, payload: object): WebSocketMessage<any> {
  return {
    type,
    payload,
    timestamp: new Date().toISOString(),
    correlationId: `test-${Date.now()}`
  };
}

/**
 * Waits for a WebSocket connection to be established
 * @param client - WebSocket client instance
 * @returns Promise that resolves to true when connected
 */
async function waitForWebSocketOpen(client: WebSocketClient): Promise<boolean> {
  return waitForCondition(() => client.isConnected(), 5000, 100);
}

/**
 * Waits for a specific WebSocket message to be received
 * @param client - WebSocket client instance
 * @param messageType - Type of message to wait for
 * @returns Promise that resolves to the received message
 */
async function waitForWebSocketMessage(client: WebSocketClient, messageType: string): Promise<WebSocketMessage<any>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for message type: ${messageType}`));
    }, 5000);
    
    const handler = (payload: any, message: WebSocketMessage<any>) => {
      clearTimeout(timeout);
      client.removeMessageHandler(messageType, handler);
      resolve(message);
    };
    
    client.addMessageHandler(messageType, handler);
  });
}

describe('WebSocket Integration Tests', () => {
  let server: WebSocketServer;
  let testPort: number;
  let wsBaseUrl: string;
  let positionData: any;
  let inventoryData: any;
  let locateData: any;
  let activeClients: WebSocketClient[] = [];
  
  // Set up WebSocket server before all tests
  beforeAll(async () => {
    // Setup test port (8085 is commonly used for WebSocket in the app)
    testPort = 8085;
    wsBaseUrl = `ws://localhost:${testPort}`;
    
    // Configure fetch mock
    fetchMock.enableMocks();
    
    // Set up WebSocket server
    server = setupWebSocketServer(testPort);
    
    // Load test data
    positionData = await loadTestData(`${__dirname}/../../fixtures/positions/positions.json`);
    inventoryData = await loadTestData(`${__dirname}/../../fixtures/inventories/inventories.json`);
    locateData = await loadTestData(`${__dirname}/../../fixtures/locates/locates.json`);
    
    // Configure WebSocket mock for browser environment
    global.WebSocket = WebSocket as any;
  });
  
  // Clean up after all tests
  afterAll(() => {
    // Close WebSocket server
    server.close();
    
    // Reset mocks
    fetchMock.resetMocks();
    
    // Reset WebSocket mock
    if (global.WebSocket && typeof global.WebSocket !== 'function') {
      delete global.WebSocket;
    }
  });
  
  // Reset client state before each test
  beforeEach(() => {
    // Reset any WebSocket connection state
    activeClients = [];
  });
  
  // Clean up after each test
  afterEach(() => {
    // Disconnect any active WebSocket connections
    activeClients.forEach(client => {
      if (client.isConnected()) {
        client.disconnect();
      }
    });
    activeClients = [];
    
    // Clear any pending timeouts
    jest.clearAllTimers();
  });
  
  test('should establish a WebSocket connection successfully', async () => {
    // Create a WebSocket client
    const client = createWebSocketClient(wsBaseUrl);
    activeClients.push(client);
    
    // Connect to the WebSocket server
    await client.connect();
    
    // Wait for the connection to be established
    const connected = await waitForWebSocketOpen(client);
    
    // Verify the connection
    expect(connected).toBe(true);
    expect(client.isConnected()).toBe(true);
    
    // Wait for the CONNECTION_ACK message
    const ackMessage = await waitForWebSocketMessage(client, 'CONNECTION_ACK');
    
    // Verify the CONNECTION_ACK message
    expect(ackMessage).toBeDefined();
    expect(ackMessage.type).toBe('CONNECTION_ACK');
    expect(ackMessage.payload.status).toBe('connected');
  });
  
  test('should handle connection errors gracefully', async () => {
    // Create a WebSocket client with an invalid URL
    const client = createWebSocketClient('ws://localhost:9999');
    activeClients.push(client);
    
    // Attempt to connect
    const connected = await client.connect();
    
    // Verify connection failed
    expect(connected).toBe(false);
    expect(client.isConnected()).toBe(false);
  });
  
  test('should reconnect automatically after connection loss', async () => {
    // Create a WebSocket client with auto-reconnect option
    const client = createWebSocketClient(wsBaseUrl, { autoReconnect: true });
    activeClients.push(client);
    
    // Connect to the WebSocket server
    await client.connect();
    
    // Wait for the connection to be established
    let connected = await waitForWebSocketOpen(client);
    expect(connected).toBe(true);
    
    // Get the connection from the server
    const connections = Array.from(server.clients);
    expect(connections.length).toBeGreaterThan(0);
    
    // Simulate a server-side connection close
    connections[0].close();
    
    // Wait for reconnection
    connected = await waitForCondition(() => client.isConnected(), 10000, 100);
    
    // Verify reconnection succeeded
    expect(connected).toBe(true);
  });
  
  test('should subscribe to position updates successfully', async () => {
    // Create a WebSocket client
    const client = createWebSocketClient(wsBaseUrl);
    activeClients.push(client);
    
    // Connect to the WebSocket server
    await client.connect();
    
    // Wait for the connection to be established
    const connected = await waitForWebSocketOpen(client);
    expect(connected).toBe(true);
    
    // Set up a handler for position updates
    const positionUpdatePromise = waitForWebSocketMessage(client, WEBSOCKET_EVENTS.POSITION_UPDATE);
    
    // Subscribe to position updates
    client.sendMessage('subscribe', { topic: 'positions', securityId: 'AAPL' });
    
    // Wait for subscription confirmation
    const subscriptionMessage = await waitForWebSocketMessage(client, 'SUBSCRIPTION_CONFIRMED');
    expect(subscriptionMessage.payload.topic).toBe('positions');
    expect(subscriptionMessage.payload.successful).toBe(true);
    
    // Get the connection from the server
    const connections = Array.from(server.clients);
    expect(connections.length).toBeGreaterThan(0);
    
    // Simulate a position update from the server
    const positionUpdateMessage = createTestMessage(WEBSOCKET_EVENTS.POSITION_UPDATE, {
      securityId: 'AAPL',
      bookId: 'BOOK1',
      quantity: 5000
    });
    
    connections[0].send(JSON.stringify(positionUpdateMessage));
    
    // Wait for the position update message
    const receivedUpdate = await positionUpdatePromise;
    
    // Verify the position update
    expect(receivedUpdate).toBeDefined();
    expect(receivedUpdate.type).toBe(WEBSOCKET_EVENTS.POSITION_UPDATE);
    expect(receivedUpdate.payload.securityId).toBe('AAPL');
  });
  
  test('should subscribe to inventory updates successfully', async () => {
    // Create a WebSocket client
    const client = createWebSocketClient(wsBaseUrl);
    activeClients.push(client);
    
    // Connect to the WebSocket server
    await client.connect();
    
    // Wait for the connection to be established
    const connected = await waitForWebSocketOpen(client);
    expect(connected).toBe(true);
    
    // Set up a handler for inventory updates
    const inventoryUpdatePromise = waitForWebSocketMessage(client, WEBSOCKET_EVENTS.INVENTORY_UPDATE);
    
    // Subscribe to inventory updates
    client.sendMessage('subscribe', { topic: 'inventory', securityId: 'MSFT' });
    
    // Wait for subscription confirmation
    const subscriptionMessage = await waitForWebSocketMessage(client, 'SUBSCRIPTION_CONFIRMED');
    expect(subscriptionMessage.payload.topic).toBe('inventory');
    expect(subscriptionMessage.payload.successful).toBe(true);
    
    // Get the connection from the server
    const connections = Array.from(server.clients);
    expect(connections.length).toBeGreaterThan(0);
    
    // Simulate an inventory update from the server
    const inventoryUpdateMessage = createTestMessage(WEBSOCKET_EVENTS.INVENTORY_UPDATE, {
      securityId: 'MSFT',
      forLoanQuantity: 10000,
      forPledgeQuantity: 5000
    });
    
    connections[0].send(JSON.stringify(inventoryUpdateMessage));
    
    // Wait for the inventory update message
    const receivedUpdate = await inventoryUpdatePromise;
    
    // Verify the inventory update
    expect(receivedUpdate).toBeDefined();
    expect(receivedUpdate.type).toBe(WEBSOCKET_EVENTS.INVENTORY_UPDATE);
    expect(receivedUpdate.payload.securityId).toBe('MSFT');
  });
  
  test('should subscribe to locate updates successfully', async () => {
    // Create a WebSocket client
    const client = createWebSocketClient(wsBaseUrl);
    activeClients.push(client);
    
    // Connect to the WebSocket server
    await client.connect();
    
    // Wait for the connection to be established
    const connected = await waitForWebSocketOpen(client);
    expect(connected).toBe(true);
    
    // Set up a handler for locate updates
    const locateUpdatePromise = waitForWebSocketMessage(client, WEBSOCKET_EVENTS.LOCATE_UPDATE);
    
    // Subscribe to locate updates
    client.sendMessage('subscribe', { topic: 'locates' });
    
    // Wait for subscription confirmation
    const subscriptionMessage = await waitForWebSocketMessage(client, 'SUBSCRIPTION_CONFIRMED');
    expect(subscriptionMessage.payload.topic).toBe('locates');
    expect(subscriptionMessage.payload.successful).toBe(true);
    
    // Get the connection from the server
    const connections = Array.from(server.clients);
    expect(connections.length).toBeGreaterThan(0);
    
    // Simulate a locate update from the server
    const locateUpdateMessage = createTestMessage(WEBSOCKET_EVENTS.LOCATE_UPDATE, {
      locateId: 'L123',
      securityId: 'TSLA',
      status: 'APPROVED'
    });
    
    connections[0].send(JSON.stringify(locateUpdateMessage));
    
    // Wait for the locate update message
    const receivedUpdate = await locateUpdatePromise;
    
    // Verify the locate update
    expect(receivedUpdate).toBeDefined();
    expect(receivedUpdate.type).toBe(WEBSOCKET_EVENTS.LOCATE_UPDATE);
    expect(receivedUpdate.payload.locateId).toBe('L123');
  });
  
  test('should unsubscribe from updates successfully', async () => {
    // Create a WebSocket client
    const client = createWebSocketClient(wsBaseUrl);
    activeClients.push(client);
    
    // Connect to the WebSocket server
    await client.connect();
    
    // Wait for the connection to be established
    const connected = await waitForWebSocketOpen(client);
    expect(connected).toBe(true);
    
    // Subscribe to position updates
    client.sendMessage('subscribe', { topic: 'positions', securityId: 'GOOGL' });
    
    // Wait for subscription confirmation
    const subscriptionMessage = await waitForWebSocketMessage(client, 'SUBSCRIPTION_CONFIRMED');
    expect(subscriptionMessage.payload.topic).toBe('positions');
    
    // Set up a flag to track if we receive updates after unsubscribing
    let receivedUpdateAfterUnsubscribe = false;
    client.addMessageHandler(WEBSOCKET_EVENTS.POSITION_UPDATE, () => {
      receivedUpdateAfterUnsubscribe = true;
    });
    
    // Unsubscribe from position updates
    client.sendMessage('unsubscribe', { topic: 'positions', securityId: 'GOOGL' });
    
    // Wait for unsubscription confirmation
    const unsubscriptionMessage = await waitForWebSocketMessage(client, 'UNSUBSCRIPTION_CONFIRMED');
    expect(unsubscriptionMessage.payload.topic).toBe('positions');
    expect(unsubscriptionMessage.payload.successful).toBe(true);
    
    // Get the connection from the server
    const connections = Array.from(server.clients);
    expect(connections.length).toBeGreaterThan(0);
    
    // Simulate a position update from the server
    const positionUpdateMessage = createTestMessage(WEBSOCKET_EVENTS.POSITION_UPDATE, {
      securityId: 'GOOGL',
      bookId: 'BOOK1',
      quantity: 2000
    });
    
    connections[0].send(JSON.stringify(positionUpdateMessage));
    
    // Wait a short time to see if we receive the update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify that we did not receive the update
    expect(receivedUpdateAfterUnsubscribe).toBe(false);
  });
  
  test('should handle ping/pong for connection keepalive', async () => {
    // Create a WebSocket client
    const client = createWebSocketClient(wsBaseUrl);
    activeClients.push(client);
    
    // Connect to the WebSocket server
    await client.connect();
    
    // Wait for the connection to be established
    const connected = await waitForWebSocketOpen(client);
    expect(connected).toBe(true);
    
    // Set up a handler for pong responses
    const pongPromise = waitForWebSocketMessage(client, 'PONG');
    
    // Send a heartbeat message
    client.sendMessage('heartbeat', {});
    
    // Wait for the pong response
    const pongMessage = await pongPromise;
    
    // Verify the pong message
    expect(pongMessage).toBeDefined();
    expect(pongMessage.type).toBe('PONG');
  });
  
  test('should handle multiple subscriptions correctly', async () => {
    // Create a WebSocket client
    const client = createWebSocketClient(wsBaseUrl);
    activeClients.push(client);
    
    // Connect to the WebSocket server
    await client.connect();
    
    // Wait for the connection to be established
    const connected = await waitForWebSocketOpen(client);
    expect(connected).toBe(true);
    
    // Set up handlers for position updates
    const positionAPromise = new Promise<WebSocketMessage<any>>((resolve) => {
      client.addMessageHandler(WEBSOCKET_EVENTS.POSITION_UPDATE, (payload, message) => {
        if (payload.securityId === 'AMZN') {
          resolve(message);
        }
      });
    });
    
    const positionBPromise = new Promise<WebSocketMessage<any>>((resolve) => {
      client.addMessageHandler(WEBSOCKET_EVENTS.POSITION_UPDATE, (payload, message) => {
        if (payload.securityId === 'FB') {
          resolve(message);
        }
      });
    });
    
    // Subscribe to position updates for two securities
    client.sendMessage('subscribe', { topic: 'positions', securityId: 'AMZN' });
    client.sendMessage('subscribe', { topic: 'positions', securityId: 'FB' });
    
    // Wait for both subscription confirmations
    await waitForWebSocketMessage(client, 'SUBSCRIPTION_CONFIRMED');
    await waitForWebSocketMessage(client, 'SUBSCRIPTION_CONFIRMED');
    
    // Get the connection from the server
    const connections = Array.from(server.clients);
    expect(connections.length).toBeGreaterThan(0);
    
    // Simulate position updates from the server
    const positionUpdateA = createTestMessage(WEBSOCKET_EVENTS.POSITION_UPDATE, {
      securityId: 'AMZN',
      bookId: 'BOOK1',
      quantity: 1000
    });
    
    const positionUpdateB = createTestMessage(WEBSOCKET_EVENTS.POSITION_UPDATE, {
      securityId: 'FB',
      bookId: 'BOOK1',
      quantity: 1500
    });
    
    connections[0].send(JSON.stringify(positionUpdateA));
    connections[0].send(JSON.stringify(positionUpdateB));
    
    // Wait for both position updates
    const receivedUpdateA = await positionAPromise;
    const receivedUpdateB = await positionBPromise;
    
    // Verify both updates were received
    expect(receivedUpdateA).toBeDefined();
    expect(receivedUpdateA.payload.securityId).toBe('AMZN');
    
    expect(receivedUpdateB).toBeDefined();
    expect(receivedUpdateB.payload.securityId).toBe('FB');
  });
  
  test('should meet performance requirements for message processing', async () => {
    // Create a WebSocket client
    const client = createWebSocketClient(wsBaseUrl);
    activeClients.push(client);
    
    // Connect to the WebSocket server
    await client.connect();
    
    // Wait for the connection to be established
    const connected = await waitForWebSocketOpen(client);
    expect(connected).toBe(true);
    
    // Subscribe to a high-volume update stream
    client.sendMessage('subscribe', { topic: 'market-data' });
    
    // Wait for subscription confirmation
    await waitForWebSocketMessage(client, 'SUBSCRIPTION_CONFIRMED');
    
    // Get the connection from the server
    const connections = Array.from(server.clients);
    expect(connections.length).toBeGreaterThan(0);
    
    // Prepare test for processing 100 messages
    const MESSAGE_COUNT = 100;
    let receivedCount = 0;
    
    // Set up a handler to count received messages
    const messageProcessingPromise = new Promise<number>((resolve) => {
      const startTime = performance.now();
      
      client.addMessageHandler('MARKET_DATA', () => {
        receivedCount++;
        
        if (receivedCount === MESSAGE_COUNT) {
          const endTime = performance.now();
          resolve(endTime - startTime);
        }
      });
    });
    
    // Send a burst of messages
    for (let i = 0; i < MESSAGE_COUNT; i++) {
      const marketDataMessage = createTestMessage('MARKET_DATA', {
        securityId: `SEC${i}`,
        price: 100 + Math.random() * 10
      });
      
      connections[0].send(JSON.stringify(marketDataMessage));
    }
    
    // Wait for all messages to be processed and measure the time
    const processingTime = await messageProcessingPromise;
    
    // Calculate messages per second
    const messagesPerSecond = (MESSAGE_COUNT / processingTime) * 1000;
    
    // Verify performance meets requirements
    expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_RESPONSE);
    expect(receivedCount).toBe(MESSAGE_COUNT); // No messages dropped
    expect(messagesPerSecond).toBeGreaterThan(1000); // At least 1000 messages per second
  });
  
  test('should handle server-side errors gracefully', async () => {
    // Create a WebSocket client
    const client = createWebSocketClient(wsBaseUrl);
    activeClients.push(client);
    
    // Connect to the WebSocket server
    await client.connect();
    
    // Wait for the connection to be established
    const connected = await waitForWebSocketOpen(client);
    expect(connected).toBe(true);
    
    // Set up a handler for error messages
    const errorPromise = waitForWebSocketMessage(client, 'ERROR');
    
    // Send a malformed message that will trigger a server-side error
    if (client['socket']) {
      client['socket'].send('{malformed-json:');
    }
    
    // Wait for the error message
    const errorMessage = await errorPromise;
    
    // Verify the error message
    expect(errorMessage).toBeDefined();
    expect(errorMessage.type).toBe('ERROR');
    expect(errorMessage.payload.message).toBeDefined();
    
    // Verify the client remains connected
    expect(client.isConnected()).toBe(true);
    
    // Verify the client can still send and receive messages
    const pingPromise = waitForWebSocketMessage(client, 'PONG');
    client.sendMessage('heartbeat', {});
    const pongMessage = await pingPromise;
    
    expect(pongMessage).toBeDefined();
    expect(pongMessage.type).toBe('PONG');
  });
  
  test('should handle client-side errors gracefully', async () => {
    // Create a WebSocket client
    const client = createWebSocketClient(wsBaseUrl);
    activeClients.push(client);
    
    // Connect to the WebSocket server
    await client.connect();
    
    // Wait for the connection to be established
    const connected = await waitForWebSocketOpen(client);
    expect(connected).toBe(true);
    
    // Add a message handler that will throw an error
    const errorHandlerType = 'TEST_ERROR_HANDLER';
    let errorHandlerCalled = false;
    let clientStillConnected = false;
    
    client.addMessageHandler(errorHandlerType, () => {
      errorHandlerCalled = true;
      throw new Error('Simulated client-side error');
    });
    
    // Set up a handler for a subsequent message to verify client is still functioning
    const subsequentPromise = waitForWebSocketMessage(client, 'SUBSEQUENT_MESSAGE');
    
    // Get the connection from the server
    const connections = Array.from(server.clients);
    expect(connections.length).toBeGreaterThan(0);
    
    // Send a message that will trigger the error handler
    const errorMessage = createTestMessage(errorHandlerType, {
      data: 'This will trigger a client-side error'
    });
    
    connections[0].send(JSON.stringify(errorMessage));
    
    // Wait a short time for the error handler to be called
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if client is still connected
    clientStillConnected = client.isConnected();
    
    // Send a subsequent message to verify client is still functioning
    const subsequentMessage = createTestMessage('SUBSEQUENT_MESSAGE', {
      data: 'This should still be received'
    });
    
    connections[0].send(JSON.stringify(subsequentMessage));
    
    // Wait for the subsequent message
    const receivedMessage = await subsequentPromise;
    
    // Verify the error handler was called but client remains functional
    expect(errorHandlerCalled).toBe(true);
    expect(clientStillConnected).toBe(true);
    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.type).toBe('SUBSEQUENT_MESSAGE');
  });
});