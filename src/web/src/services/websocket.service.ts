/**
 * WebSocket service for the Inventory Management System frontend
 * Manages WebSocket connections with automatic reconnection, message handling, 
 * and support for real-time data updates from backend services.
 */

import { v4 as uuidv4 } from 'uuid'; // uuid 9.0.0
import { WebSocketClient, createWebSocketClient, WebSocketClientOptions } from '../api/websocket';
import { WebSocketMessage } from '../types/api';
import { WEBSOCKET_TOPICS } from '../constants/api';
import { getWebSocketUrl } from '../config/api';
import { debug, info, warn, error } from '../utils/logger';
import { handleError, ERROR_TYPES } from '../utils/errorHandler';
import { registerMessageHandlers } from '../features/websocket/utils/messageHandlers';

// Default configuration constants
const DEFAULT_RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30000;

/**
 * Retrieves authentication headers for WebSocket connection
 * @returns Authentication headers object with token
 */
function getAuthHeaders(): Record<string, string> {
  // Try to get token from localStorage first, then sessionStorage as fallback
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }
  
  return {};
}

/**
 * Singleton service for managing WebSocket connections and message handling
 */
class WebSocketService {
  private clients: Map<string, WebSocketClient> = new Map();
  private initialized: boolean = false;
  private defaultOptions: WebSocketClientOptions;
  
  constructor() {
    // Initialize clients map to store WebSocket clients by topic
    this.clients = new Map();
    this.initialized = false;
    
    // Configure default options for WebSocket clients
    this.defaultOptions = {
      autoConnect: false, // We will manage connection explicitly
      autoReconnect: true, // Enable automatic reconnection
      reconnectDelay: DEFAULT_RECONNECT_DELAY_MS,
      maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
      heartbeatInterval: DEFAULT_HEARTBEAT_INTERVAL_MS,
      onError: (event: Event) => {
        error('WebSocket connection error', event);
      }
    };
  }
  
  /**
   * Initializes the WebSocket service and establishes connections
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) {
      debug('WebSocket service already initialized');
      return;
    }
    
    this.initialized = true;
    info('Initializing WebSocket service');
    
    // Connect to default topics if authentication is available
    await this.connectToDefaultTopics();
  }
  
  /**
   * Shuts down all WebSocket connections
   */
  public shutdown(): void {
    debug('Shutting down WebSocket service');
    
    // Iterate through all clients in the map
    this.clients.forEach((client, topic) => {
      debug(`Disconnecting WebSocket client for topic: ${topic}`);
      this.disconnect(topic);
    });
    
    // Clear the clients map
    this.clients.clear();
    this.initialized = false;
    
    info('WebSocket service shutdown complete');
  }
  
  /**
   * Establishes a WebSocket connection for a specific topic
   * @param topic Topic to connect to
   * @param options Optional WebSocket client options
   * @returns Promise that resolves to true if connection successful
   */
  public async connect(topic: string, options: WebSocketClientOptions = {}): Promise<boolean> {
    // If client already exists for this topic, return true
    if (this.clients.has(topic)) {
      debug(`WebSocket client already exists for topic: ${topic}`);
      return true;
    }
    
    try {
      // Construct WebSocket URL for the topic
      const url = getWebSocketUrl(topic);
      
      // Merge provided options with default options
      const clientOptions = {
        ...this.defaultOptions,
        ...options
      };
      
      debug(`Creating WebSocket client for topic: ${topic} with URL: ${url}`);
      
      // Create WebSocket client
      const client = createWebSocketClient(url, clientOptions);
      
      // Store the client in the clients map
      this.clients.set(topic, client);
      
      // Attempt to establish connection with authentication headers
      const connected = await client.connect(getAuthHeaders());
      
      if (connected) {
        info(`WebSocket connected to topic: ${topic}`);
      } else {
        warn(`Failed to connect WebSocket to topic: ${topic}`);
      }
      
      return connected;
    } catch (err) {
      this.handleConnectionError(topic, err as Error);
      return false;
    }
  }
  
  /**
   * Closes a WebSocket connection for a specific topic
   * @param topic Topic to disconnect from
   * @returns True if disconnection successful
   */
  public disconnect(topic: string): boolean {
    // Check if client exists for the topic
    const client = this.clients.get(topic);
    
    // If client exists, disconnect it
    if (client) {
      client.disconnect();
      this.clients.delete(topic);
      debug(`WebSocket disconnected from topic: ${topic}`);
      return true;
    }
    
    debug(`No WebSocket client found for topic: ${topic}`);
    return false;
  }
  
  /**
   * Attempts to reconnect a WebSocket for a specific topic
   * @param topic Topic to reconnect to
   * @returns Promise that resolves to true if reconnection successful
   */
  public async reconnect(topic: string): Promise<boolean> {
    // Check if client exists for the topic
    const client = this.clients.get(topic);
    
    // If client exists, attempt to reconnect it
    if (client) {
      debug(`Attempting to reconnect WebSocket for topic: ${topic}`);
      return await client.reconnect();
    }
    
    warn(`Cannot reconnect - No WebSocket client found for topic: ${topic}`);
    return false;
  }
  
  /**
   * Sends a message through a WebSocket connection
   * @param topic Topic to send message to
   * @param type Message type
   * @param payload Message payload
   * @param correlationId Optional correlation ID for message tracing
   * @returns True if message was sent successfully
   */
  public sendMessage(topic: string, type: string, payload: any, correlationId?: string): boolean {
    // Check if client exists for the topic
    const client = this.clients.get(topic);
    
    // If client exists and is connected, send the message
    if (client && client.isConnected()) {
      // Generate correlationId if not provided
      const msgCorrelationId = correlationId || uuidv4();
      
      debug(`Sending WebSocket message to topic: ${topic}`, { type, correlationId: msgCorrelationId });
      return client.sendMessage(type, payload, msgCorrelationId);
    }
    
    warn(`Cannot send message - WebSocket not connected for topic: ${topic}`);
    return false;
  }
  
  /**
   * Adds a handler function for a specific message type
   * @param topic Topic to add handler to
   * @param messageType Type of message to handle
   * @param handler Handler function to add
   * @returns True if handler was added successfully
   */
  public addMessageHandler(topic: string, messageType: string, handler: Function): boolean {
    // Check if client exists for the topic
    const client = this.clients.get(topic);
    
    // If client exists, add the message handler
    if (client) {
      client.addMessageHandler(messageType, handler);
      debug(`Added message handler for topic: ${topic}, messageType: ${messageType}`);
      return true;
    }
    
    warn(`Cannot add message handler - WebSocket not connected for topic: ${topic}`);
    return false;
  }
  
  /**
   * Removes a handler function for a specific message type
   * @param topic Topic to remove handler from
   * @param messageType Type of message to handle
   * @param handler Handler function to remove
   * @returns True if handler was removed successfully
   */
  public removeMessageHandler(topic: string, messageType: string, handler: Function): boolean {
    // Check if client exists for the topic
    const client = this.clients.get(topic);
    
    // If client exists, remove the message handler
    if (client) {
      client.removeMessageHandler(messageType, handler);
      debug(`Removed message handler for topic: ${topic}, messageType: ${messageType}`);
      return true;
    }
    
    warn(`Cannot remove message handler - WebSocket not connected for topic: ${topic}`);
    return false;
  }
  
  /**
   * Checks if a WebSocket connection is established for a topic
   * @param topic Topic to check
   * @returns True if connected, false otherwise
   */
  public isConnected(topic: string): boolean {
    // Check if client exists for the topic
    const client = this.clients.get(topic);
    
    // If client exists, return its connection status
    return client ? client.isConnected() : false;
  }
  
  /**
   * Checks if a WebSocket connection is in progress for a topic
   * @param topic Topic to check
   * @returns True if connecting, false otherwise
   */
  public isConnecting(topic: string): boolean {
    // Check if client exists for the topic
    const client = this.clients.get(topic);
    
    // If client exists, return its connecting status
    return client ? client.isConnecting() : false;
  }
  
  /**
   * Retrieves the WebSocket client for a specific topic
   * @param topic Topic to get client for
   * @returns WebSocket client instance or null if not found
   */
  public getClient(topic: string): WebSocketClient | null {
    return this.clients.get(topic) || null;
  }
  
  /**
   * Establishes connections to all default WebSocket topics
   * @returns Promise that resolves when all connections are attempted
   */
  private async connectToDefaultTopics(): Promise<void> {
    // Check if authentication is available
    const authHeaders = getAuthHeaders();
    
    // If no authentication, don't connect to topics that require authentication
    if (Object.keys(authHeaders).length === 0) {
      warn('No authentication available, skipping default topic connections');
      return;
    }
    
    // Connect to each default topic
    for (const [key, topic] of Object.entries(WEBSOCKET_TOPICS)) {
      try {
        debug(`Connecting to default topic: ${topic}`);
        await this.connect(topic);
      } catch (err) {
        this.handleConnectionError(topic, err as Error);
      }
    }
  }
  
  /**
   * Handles WebSocket connection errors
   * @param topic Topic that encountered the error
   * @param error Error object
   */
  private handleConnectionError(topic: string, error: Error): void {
    error(`WebSocket connection error for topic: ${topic}`, error);
    
    // Process error using handleError utility
    handleError(error);
    
    // Attempt reconnection if appropriate
    const client = this.clients.get(topic);
    if (client && this.defaultOptions.autoReconnect) {
      client.reconnect().catch(e => {
        error(`Failed to reconnect WebSocket for topic: ${topic}`, e);
        // Remove client from map if reconnection fails
        this.clients.delete(topic);
      });
    } else {
      // Remove client from map
      this.clients.delete(topic);
    }
  }
}

// Create and export singleton instance
const webSocketService = new WebSocketService();
export { webSocketService };