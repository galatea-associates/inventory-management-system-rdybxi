/**
 * Custom React hook for WebSocket connection management in the Inventory Management System.
 * This hook provides WebSocket connection lifecycle management, reconnection logic, and status
 * tracking for real-time data streaming between the frontend and backend services.
 * 
 * @module websocket/hooks/useWebSocketConnection
 */

import { useState, useEffect, useCallback, useRef } from 'react'; // react 18.2.0
import { webSocketService } from '../../../services/websocket.service';
import { WEBSOCKET_TOPICS } from '../../../constants/api';
import { registerMessageHandlers } from '../utils/messageHandlers';
import { useAuth } from '../../../hooks/useAuth';
import { debug, info, warn, error } from '../../../utils/logger';
import { handleError } from '../../../utils/errorHandler';

// Configuration constants for reconnection strategy
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Options for configuring the WebSocket connection hook behavior
 */
export interface WebSocketConnectionOptions {
  /** Whether to automatically connect when the hook is initialized */
  autoConnect?: boolean;
  /** Whether to automatically reconnect on connection loss */
  autoReconnect?: boolean;
  /** Array of message types to register handlers for */
  messageTypes?: string[];
  /** Redux dispatch function for handling WebSocket messages */
  dispatch?: Function;
  /** Custom message handler callback */
  onMessage?: Function;
  /** Connection established callback */
  onConnect?: Function;
  /** Connection closed callback */
  onDisconnect?: Function;
  /** Connection error callback */
  onError?: Function;
}

/**
 * Return type of the useWebSocketConnection hook
 */
export interface WebSocketConnectionResult {
  /** Whether the WebSocket is currently connected */
  connected: boolean;
  /** Whether a connection attempt is in progress */
  connecting: boolean;
  /** Current connection error, if any */
  error: Error | null;
  /** Function to establish a connection */
  connect: () => Promise<boolean>;
  /** Function to close the connection */
  disconnect: () => void;
  /** Function to re-establish the connection */
  reconnect: () => Promise<boolean>;
  /** Function to send a message through the WebSocket */
  sendMessage: (type: string, payload: any, correlationId?: string) => boolean;
}

/**
 * Custom hook for managing WebSocket connections to specific endpoints with
 * automatic reconnection and status tracking
 * 
 * @param endpoint - The WebSocket endpoint to connect to
 * @param options - Configuration options for the WebSocket connection
 * @returns WebSocket connection state and control functions
 */
export function useWebSocketConnection(
  endpoint: string,
  options: WebSocketConnectionOptions = {}
): WebSocketConnectionResult {
  // Initialize connection state
  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // References for tracking reconnection state across renders
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get authentication state from auth hook
  const { isAuthenticated } = useAuth();
  
  // Set default options
  const {
    autoConnect = true,
    autoReconnect = true,
    messageTypes = [],
    dispatch,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;
  
  /**
   * Establishes a WebSocket connection to the specified endpoint
   * @returns Promise that resolves to true if connection successful
   */
  const connect = useCallback(async (): Promise<boolean> => {
    // Don't connect if already connected or connecting
    if (connected || connecting) {
      return connected;
    }
    
    try {
      setConnecting(true);
      setError(null);
      
      debug(`Connecting to WebSocket endpoint: ${endpoint}`);
      
      const success = await webSocketService.connect(endpoint);
      
      if (success) {
        setConnected(true);
        setConnecting(false);
        reconnectAttemptsRef.current = 0;
        
        info(`WebSocket connected to endpoint: ${endpoint}`);
        
        // Call onConnect callback if provided
        if (onConnect) {
          onConnect();
        }
        
        return true;
      } else {
        throw new Error(`Failed to connect to WebSocket endpoint: ${endpoint}`);
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      
      setConnecting(false);
      setConnected(false);
      setError(errorObj);
      
      error(`WebSocket connection error: ${errorObj.message}`, errorObj);
      
      // Call onError callback if provided
      if (onError) {
        onError(errorObj);
      }
      
      // Handle error
      handleError(errorObj);
      
      return false;
    }
  }, [endpoint, connected, connecting, onConnect, onError]);
  
  /**
   * Closes the WebSocket connection
   */
  const disconnect = useCallback((): void => {
    // Clear any reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset the reconnect attempts
    reconnectAttemptsRef.current = 0;
    
    if (connected || webSocketService.isConnected(endpoint)) {
      debug(`Disconnecting WebSocket from endpoint: ${endpoint}`);
      
      webSocketService.disconnect(endpoint);
      setConnected(false);
      
      // Call onDisconnect callback if provided
      if (onDisconnect) {
        onDisconnect();
      }
    }
  }, [endpoint, connected, onDisconnect]);
  
  /**
   * Attempts to reconnect the WebSocket connection with exponential backoff
   * @returns Promise that resolves to true if reconnection successful
   */
  const reconnect = useCallback(async (): Promise<boolean> => {
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Don't reconnect if already connected
    if (connected) {
      return true;
    }
    
    // Increment reconnect attempts
    reconnectAttemptsRef.current += 1;
    
    // Check if max reconnect attempts reached
    if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
      warn(`Maximum reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached for endpoint: ${endpoint}`);
      return false;
    }
    
    info(`Reconnecting to WebSocket endpoint: ${endpoint} (Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
    
    // Try to reconnect through the WebSocket service
    try {
      const success = await webSocketService.reconnect(endpoint);
      
      if (success) {
        setConnected(true);
        setConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        info(`WebSocket reconnected to endpoint: ${endpoint}`);
        
        // Call onConnect callback if provided
        if (onConnect) {
          onConnect();
        }
        
        return true;
      } else {
        throw new Error(`Failed to reconnect to WebSocket endpoint: ${endpoint}`);
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      
      setConnecting(false);
      setError(errorObj);
      
      warn(`WebSocket reconnection failed: ${errorObj.message}`, { 
        attempt: reconnectAttemptsRef.current, 
        maxAttempts: MAX_RECONNECT_ATTEMPTS 
      });
      
      // Schedule another reconnect attempt if auto-reconnect is enabled
      if (autoReconnect) {
        // Calculate delay with exponential backoff
        const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current - 1);
        
        info(`Scheduling reconnect attempt in ${delay}ms`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnect();
        }, delay);
      }
      
      return false;
    }
  }, [endpoint, connected, autoReconnect, onConnect]);
  
  /**
   * Sends a message through the WebSocket connection
   * @param type - Type of message to send
   * @param payload - Message payload
   * @param correlationId - Optional correlation ID for message tracing
   * @returns True if message was sent successfully
   */
  const sendMessage = useCallback((
    type: string,
    payload: any,
    correlationId?: string
  ): boolean => {
    if (!connected) {
      warn(`Cannot send message: WebSocket not connected to endpoint: ${endpoint}`);
      return false;
    }
    
    try {
      const success = webSocketService.sendMessage(endpoint, type, payload, correlationId);
      
      if (success) {
        debug(`Sent WebSocket message: ${type}`, { correlationId });
      } else {
        warn(`Failed to send WebSocket message: ${type}`);
      }
      
      return success;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error(`Error sending WebSocket message: ${errorObj.message}`, errorObj);
      
      // Handle error
      handleError(errorObj);
      
      return false;
    }
  }, [endpoint, connected]);
  
  // Effect to handle authentication changes
  useEffect(() => {
    if (isAuthenticated && autoConnect && !connected && !connecting) {
      connect();
    }
  }, [isAuthenticated, autoConnect, connected, connecting, connect]);
  
  // Effect to auto-connect when component mounts
  useEffect(() => {
    if (autoConnect && !connected && !connecting) {
      connect();
    }
    
    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connected, connecting, connect, disconnect]);
  
  // Effect to register message handlers if dispatch is provided
  useEffect(() => {
    if (connected && dispatch) {
      // If specific message types are provided, use them; otherwise use all available WEBSOCKET_TOPICS
      const types = messageTypes.length > 0 ? messageTypes : Object.values(WEBSOCKET_TOPICS);
      
      // Get the WebSocket client for this endpoint
      const client = webSocketService.getClient(endpoint);
      
      if (client) {
        // Register message handlers for the client
        registerMessageHandlers(client, dispatch, types, onMessage);
        
        debug(`Registered message handlers for ${types.length} message types`);
      }
    }
  }, [connected, endpoint, dispatch, messageTypes, onMessage]);
  
  // Return connection state and control functions
  return {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    reconnect,
    sendMessage
  };
}