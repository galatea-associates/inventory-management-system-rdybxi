/**
 * WebSocket client implementation for the Inventory Management System frontend.
 * This module provides a robust WebSocket client with connection management,
 * message handling, automatic reconnection, and error handling capabilities
 * to support real-time data streaming from backend services.
 */

import { v4 as uuidv4 } from 'uuid'; // uuid 9.0.0
import { getWebSocketUrl } from '../config/api';
import { WEBSOCKET_TOPICS } from '../constants/api';
import { WebSocketMessage } from '../types/api';
import { debug, info, warn, error } from '../utils/logger';
import { handleError, ERROR_TYPES } from '../utils/errorHandler';

// Constants for WebSocket client configuration
const CONNECTION_RETRY_DELAY_MS = 2000; // Base delay for reconnection attempts
const MAX_RETRY_ATTEMPTS = 5; // Maximum number of reconnection attempts
const HEARTBEAT_INTERVAL_MS = 30000; // Interval for sending heartbeat messages
const RECONNECT_JITTER_MS = 1000; // Maximum jitter to add to reconnection delay

/**
 * WebSocket connection states enum
 */
export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3
}

/**
 * Interface for WebSocket client configuration options
 */
export interface WebSocketClientOptions {
  /**
   * Automatically connect when client is created
   * @default true
   */
  autoConnect?: boolean;
  
  /**
   * Automatically reconnect on connection loss
   * @default true
   */
  autoReconnect?: boolean;
  
  /**
   * Interval for sending heartbeat messages (in milliseconds)
   * @default 30000
   */
  heartbeatInterval?: number;
  
  /**
   * Maximum number of reconnection attempts
   * @default 5
   */
  maxReconnectAttempts?: number;
  
  /**
   * Base delay for reconnection attempts (in milliseconds)
   * @default 2000
   */
  reconnectDelay?: number;
  
  /**
   * Callback function called when connection is established
   */
  onOpen?: (event: Event) => void;
  
  /**
   * Callback function called when connection is closed
   */
  onClose?: (event: CloseEvent) => void;
  
  /**
   * Callback function called when connection error occurs
   */
  onError?: (event: Event) => void;
  
  /**
   * Callback function called when message is received
   */
  onMessage?: (message: WebSocketMessage<any>) => void;
}

/**
 * Calculates reconnection delay with exponential backoff and jitter
 * @param attempt - Current reconnection attempt number
 * @returns Delay in milliseconds before next reconnection attempt
 */
export function getReconnectDelay(attempt: number): number {
  // Calculate base delay using exponential backoff formula: baseDelay * 2^attempt
  const baseDelay = CONNECTION_RETRY_DELAY_MS * Math.pow(2, attempt);
  
  // Add random jitter to prevent thundering herd problem
  const jitter = Math.random() * RECONNECT_JITTER_MS;
  
  return baseDelay + jitter;
}

/**
 * Parses a WebSocket message from string to object
 * @param data - Message string to parse
 * @returns Parsed message object or null if parsing fails
 */
export function parseMessage(data: string): WebSocketMessage<any> | null {
  try {
    const parsedData = JSON.parse(data);
    
    // Validate that the parsed object has the required WebSocketMessage structure
    if (
      parsedData &&
      typeof parsedData === 'object' &&
      'type' in parsedData &&
      'payload' in parsedData &&
      'timestamp' in parsedData &&
      'correlationId' in parsedData
    ) {
      return parsedData as WebSocketMessage<any>;
    }
    
    debug('Invalid WebSocket message format', parsedData);
    return null;
  } catch (e) {
    error('Failed to parse WebSocket message', { error: e, data });
    return null;
  }
}

/**
 * Converts a WebSocket message object to string
 * @param type - Message type
 * @param payload - Message payload
 * @param correlationId - Optional correlation ID for message tracing
 * @returns JSON string representation of the message
 */
export function stringifyMessage(
  type: string,
  payload: any,
  correlationId: string = uuidv4()
): string {
  const message: WebSocketMessage<any> = {
    type,
    payload,
    timestamp: new Date().toISOString(),
    correlationId
  };
  
  return JSON.stringify(message);
}

/**
 * Client for managing WebSocket connections with automatic reconnection and message handling
 */
export class WebSocketClient {
  private url: string;
  private socket: WebSocket | null = null;
  private connected: boolean = false;
  private connecting: boolean = false;
  private retryCount: number = 0;
  private reconnectTimeoutId: number | null = null;
  private heartbeatIntervalId: number | null = null;
  private messageHandlers: Record<string, Function[]> = {};
  private onOpenCallback: Function | null = null;
  private onCloseCallback: Function | null = null;
  private onErrorCallback: Function | null = null;
  private onMessageCallback: Function | null = null;
  private options: WebSocketClientOptions;
  
  /**
   * Initializes a new WebSocketClient instance
   * @param url - WebSocket server URL
   * @param options - Configuration options
   */
  constructor(url: string, options: WebSocketClientOptions = {}) {
    this.url = url;
    this.onOpenCallback = options.onOpen || null;
    this.onCloseCallback = options.onClose || null;
    this.onErrorCallback = options.onError || null;
    this.onMessageCallback = options.onMessage || null;
    
    // Set default options
    this.options = {
      autoConnect: options.autoConnect !== undefined ? options.autoConnect : true,
      autoReconnect: options.autoReconnect !== undefined ? options.autoReconnect : true,
      heartbeatInterval: options.heartbeatInterval || HEARTBEAT_INTERVAL_MS,
      maxReconnectAttempts: options.maxReconnectAttempts || MAX_RETRY_ATTEMPTS,
      reconnectDelay: options.reconnectDelay || CONNECTION_RETRY_DELAY_MS,
      ...options
    };
    
    // Auto-connect if enabled
    if (this.options.autoConnect) {
      this.connect();
    }
  }
  
  /**
   * Establishes the WebSocket connection
   * @param headers - Optional headers to include in the connection request
   * @returns Promise that resolves to true if connection successful, false otherwise
   */
  public connect(headers?: object): Promise<boolean> {
    // If already connected, return true immediately
    if (this.connected) {
      return Promise.resolve(true);
    }
    
    // If connecting, return false immediately
    if (this.connecting) {
      return Promise.resolve(false);
    }
    
    // Set connecting flag
    this.connecting = true;
    
    // Create a new Promise that resolves when connection is established or rejects on error
    return new Promise<boolean>((resolve, reject) => {
      try {
        // Create a new WebSocket instance
        this.socket = new WebSocket(this.url);
        
        // Set up one-time event handlers for initial connection
        const onOpenOnce = (event: Event) => {
          this.handleOpen(event);
          resolve(true);
        };
        
        const onErrorOnce = (event: Event) => {
          this.handleError(event);
          resolve(false);
        };
        
        // Add one-time event listeners
        this.socket.addEventListener('open', onOpenOnce, { once: true });
        this.socket.addEventListener('error', onErrorOnce, { once: true });
        
        // Set up ongoing event handlers
        this.socket.addEventListener('close', this.handleClose.bind(this));
        this.socket.addEventListener('error', this.handleError.bind(this));
        this.socket.addEventListener('message', this.handleMessage.bind(this));
        
        debug('WebSocket connecting to', this.url);
      } catch (e) {
        error('Failed to create WebSocket connection', e);
        this.connecting = false;
        resolve(false);
      }
    });
  }
  
  /**
   * Closes the WebSocket connection
   */
  public disconnect(): void {
    // Clear any reconnect timeout
    if (this.reconnectTimeoutId !== null) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    // Clear heartbeat interval
    this.stopHeartbeat();
    
    // Close the socket if it exists and is open
    if (this.socket && this.socket.readyState === WebSocketReadyState.OPEN) {
      this.socket.close(1000, 'Normal Closure');
    }
    
    this.connected = false;
    this.connecting = false;
    this.socket = null;
    
    debug('WebSocket disconnected');
  }
  
  /**
   * Attempts to reconnect to the WebSocket server
   * @returns Promise that resolves to true if reconnection successful, false otherwise
   */
  public reconnect(): Promise<boolean> {
    // Increment retry count
    this.retryCount++;
    
    // If retry count exceeds maximum, give up
    if (this.retryCount > (this.options.maxReconnectAttempts || MAX_RETRY_ATTEMPTS)) {
      error('Maximum reconnection attempts reached');
      return Promise.resolve(false);
    }
    
    // Calculate delay using exponential backoff with jitter
    const delay = getReconnectDelay(this.retryCount);
    
    info(`Attempting to reconnect (attempt ${this.retryCount} of ${this.options.maxReconnectAttempts || MAX_RETRY_ATTEMPTS}) in ${Math.round(delay / 1000)} seconds`);
    
    // Return a Promise that resolves after the delay and attempts connection
    return new Promise<boolean>((resolve) => {
      this.reconnectTimeoutId = window.setTimeout(async () => {
        this.reconnectTimeoutId = null;
        const success = await this.connect();
        
        if (success) {
          // Reset retry count on successful connection
          this.retryCount = 0;
        } else if (this.options.autoReconnect) {
          // Schedule another reconnect attempt if not successful and auto-reconnect is enabled
          this.reconnect();
        }
        
        resolve(success);
      }, delay);
    });
  }
  
  /**
   * Sends a message through the WebSocket connection
   * @param type - Message type
   * @param payload - Message payload
   * @param correlationId - Optional correlation ID for message tracing
   * @returns True if message was sent successfully
   */
  public sendMessage(type: string, payload: any, correlationId?: string): boolean {
    // Check if connected
    if (!this.connected || !this.socket) {
      warn('Cannot send message - WebSocket is not connected');
      return false;
    }
    
    // Generate correlation ID if not provided
    const msgCorrelationId = correlationId || uuidv4();
    
    // Convert message to string
    const messageStr = stringifyMessage(type, payload, msgCorrelationId);
    
    // Send the message
    this.socket.send(messageStr);
    debug('WebSocket message sent', { type, correlationId: msgCorrelationId });
    
    return true;
  }
  
  /**
   * Adds a handler function for a specific message type
   * @param type - Message type to handle
   * @param handler - Handler function to add
   */
  public addMessageHandler(type: string, handler: Function): void {
    // If there are no handlers for this type, create an empty array
    if (!this.messageHandlers[type]) {
      this.messageHandlers[type] = [];
    }
    
    // Add the handler function to the array
    this.messageHandlers[type].push(handler);
    debug(`Added message handler for type: ${type}`);
  }
  
  /**
   * Removes a handler function for a specific message type
   * @param type - Message type
   * @param handler - Handler function to remove
   */
  public removeMessageHandler(type: string, handler: Function): void {
    // If no handlers for this type, return immediately
    if (!this.messageHandlers[type]) {
      return;
    }
    
    // Filter out the specified handler from the array
    this.messageHandlers[type] = this.messageHandlers[type].filter(h => h !== handler);
    
    // If array becomes empty, delete the type entry from the map
    if (this.messageHandlers[type].length === 0) {
      delete this.messageHandlers[type];
    }
    
    debug(`Removed message handler for type: ${type}`);
  }
  
  /**
   * Checks if the WebSocket is currently connected
   * @returns True if connected, false otherwise
   */
  public isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Checks if the WebSocket is currently connecting
   * @returns True if connecting, false otherwise
   */
  public isConnecting(): boolean {
    return this.connecting;
  }
  
  /**
   * Handles WebSocket connection open event
   * @param event - Connection open event
   */
  private handleOpen(event: Event): void {
    this.connected = true;
    this.connecting = false;
    this.retryCount = 0;
    
    // Start heartbeat interval
    this.startHeartbeat();
    
    info('WebSocket connection established');
    
    // Call the onOpen callback if provided
    if (this.onOpenCallback) {
      this.onOpenCallback(event);
    }
  }
  
  /**
   * Handles WebSocket connection close event
   * @param event - Connection close event
   */
  private handleClose(event: CloseEvent): void {
    this.connected = false;
    
    // Stop heartbeat interval
    this.stopHeartbeat();
    
    // Log connection closure with code and reason
    info(`WebSocket connection closed: ${event.code} ${event.reason}`);
    
    // Call the onClose callback if provided
    if (this.onCloseCallback) {
      this.onCloseCallback(event);
    }
    
    // Attempt reconnection if closure was unexpected and auto-reconnect is enabled
    if (event.code !== 1000 && this.options.autoReconnect) {
      this.reconnect();
    }
  }
  
  /**
   * Handles WebSocket connection error event
   * @param event - Connection error event
   */
  private handleError(event: Event): void {
    error('WebSocket error', event);
    
    // Process error using handleError utility
    handleError(new Error('WebSocket connection error'));
    
    // Call the onError callback if provided
    if (this.onErrorCallback) {
      this.onErrorCallback(event);
    }
    
    // If auto-reconnect is enabled, attempt reconnection
    if (this.options.autoReconnect && !this.connected) {
      this.reconnect();
    }
  }
  
  /**
   * Handles incoming WebSocket messages
   * @param event - Message event
   */
  private handleMessage(event: MessageEvent): void {
    // Parse the message data
    const message = parseMessage(event.data);
    
    // If parsing fails, log error and return
    if (!message) {
      error('Failed to parse incoming WebSocket message', event.data);
      return;
    }
    
    // Call the onMessage callback if provided
    if (this.onMessageCallback) {
      this.onMessageCallback(message);
    }
    
    // If message has a type and handlers exist for that type, invoke all handlers
    if (message.type && this.messageHandlers[message.type]) {
      for (const handler of this.messageHandlers[message.type]) {
        try {
          handler(message.payload, message);
        } catch (e) {
          error(`Error in message handler for type ${message.type}`, e);
        }
      }
    }
    
    debug('WebSocket message received', { type: message.type, correlationId: message.correlationId });
  }
  
  /**
   * Starts the heartbeat interval to keep connection alive
   */
  private startHeartbeat(): void {
    // Clear any existing heartbeat interval
    this.stopHeartbeat();
    
    // Set up new interval to send heartbeat messages
    this.heartbeatIntervalId = window.setInterval(() => {
      this.sendHeartbeat();
    }, this.options.heartbeatInterval || HEARTBEAT_INTERVAL_MS);
    
    debug('WebSocket heartbeat started');
  }
  
  /**
   * Stops the heartbeat interval
   */
  private stopHeartbeat(): void {
    // Clear the heartbeat interval if it exists
    if (this.heartbeatIntervalId !== null) {
      window.clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
      debug('WebSocket heartbeat stopped');
    }
  }
  
  /**
   * Sends a heartbeat message to keep the connection alive
   */
  private sendHeartbeat(): void {
    // Send a heartbeat message
    this.sendMessage('heartbeat', {});
    debug('WebSocket heartbeat sent');
  }
}

/**
 * Factory function to create a WebSocket client instance
 * @param url - WebSocket server URL or topic name (will be converted to full URL)
 * @param options - WebSocket client configuration options
 * @returns A configured WebSocket client instance
 */
export function createWebSocketClient(url: string, options: WebSocketClientOptions = {}): WebSocketClient {
  // If url doesn't start with ws:// or wss://, assume it's a topic name and convert to full URL
  const fullUrl = url.startsWith('ws://') || url.startsWith('wss://') 
    ? url 
    : getWebSocketUrl(url);
  
  return new WebSocketClient(fullUrl, options);
}