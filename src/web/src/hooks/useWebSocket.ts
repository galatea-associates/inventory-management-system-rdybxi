/**
 * Custom React hook for managing WebSocket connections in the Inventory Management System.
 * 
 * This hook provides a complete WebSocket lifecycle management solution with:
 * - Connection management (connect, disconnect, reconnect)
 * - Automatic reconnection with configurable retry limits
 * - Message sending and receiving
 * - Support for typed message handlers
 * - Authentication integration
 * - Comprehensive error handling
 */
import { useState, useEffect, useCallback, useRef } from 'react'; // react ^18.2.0
import { WebSocketClient, createWebSocketClient } from '../api/websocket';
import { WebSocketMessage } from '../types/api';
import { getWebSocketUrl } from '../config/api';
import { debug, info, warn, error } from '../utils/logger';
import { handleError } from '../utils/errorHandler';
import { useAuth } from './useAuth';

// Default reconnection settings
const RECONNECT_INTERVAL_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Configuration options for the WebSocket hook
 */
export interface WebSocketOptions {
  /** Automatically connect when component mounts */
  autoConnect?: boolean;
  /** Automatically attempt to reconnect on connection loss */
  autoReconnect?: boolean;
  /** Interval between reconnection attempts in milliseconds */
  reconnectInterval?: number;
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
  /** Initial message handlers keyed by message type */
  messageHandlers?: Record<string, Function[]>;
  /** Callback fired when connection is established */
  onOpen?: (event: Event) => void;
  /** Callback fired when connection is closed */
  onClose?: (event: CloseEvent) => void;
  /** Callback fired when connection error occurs */
  onError?: (event: Event) => void;
  /** Callback fired when message is received */
  onMessage?: (message: WebSocketMessage<any>) => void;
}

/**
 * Return type of the useWebSocket hook
 */
export interface WebSocketHookResult {
  /** Whether the WebSocket is currently connected */
  connected: boolean;
  /** Whether the WebSocket is currently connecting */
  connecting: boolean;
  /** Current error state, if any */
  error: Error | null;
  /** Function to establish WebSocket connection */
  connect: () => Promise<boolean>;
  /** Function to close WebSocket connection */
  disconnect: () => void;
  /** Function to reconnect WebSocket (disconnect + connect) */
  reconnect: () => Promise<boolean>;
  /** Function to send a message through the WebSocket */
  sendMessage: (type: string, payload: any, correlationId?: string) => boolean;
  /** Function to register a message handler for a specific message type */
  addMessageHandler: (type: string, handler: Function) => void;
  /** Function to unregister a message handler for a specific message type */
  removeMessageHandler: (type: string, handler: Function) => void;
}

/**
 * Custom hook for managing WebSocket connections with automatic reconnection and message handling
 * 
 * @param endpoint - WebSocket endpoint URL or topic name
 * @param options - Configuration options for the WebSocket connection
 * @returns WebSocket connection state and control functions
 */
export function useWebSocket(
  endpoint: string,
  options: WebSocketOptions = {}
): WebSocketHookResult {
  // Initialize state for connection status
  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Reference to store the WebSocket client instance
  const clientRef = useRef<WebSocketClient | null>(null);
  
  // Get authentication state from auth hook
  const { isAuthenticated } = useAuth();
  
  // Default options with fallbacks
  const {
    autoConnect = true,
    autoReconnect = true,
    reconnectInterval = RECONNECT_INTERVAL_MS,
    maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS,
    messageHandlers = {},
    onOpen,
    onClose,
    onError,
    onMessage
  } = options;

  /**
   * Establishes a WebSocket connection
   * @returns Promise that resolves to true if connection successful, false otherwise
   */
  const connect = useCallback(async (): Promise<boolean> => {
    // Don't try to connect if already connecting or connected
    if (connecting || connected) {
      return connected;
    }

    try {
      setConnecting(true);
      setError(null);
      
      // Create WebSocket client if it doesn't exist
      if (!clientRef.current) {
        const url = endpoint.startsWith('ws://') || endpoint.startsWith('wss://') 
          ? endpoint 
          : getWebSocketUrl(endpoint);
          
        clientRef.current = createWebSocketClient(url, {
          autoConnect: false, // We'll handle connection manually
          autoReconnect,
          maxReconnectAttempts,
          reconnectDelay: reconnectInterval,
          onOpen: (event) => {
            setConnected(true);
            setConnecting(false);
            info(`WebSocket connected to ${endpoint}`);
            if (onOpen) onOpen(event);
          },
          onClose: (event) => {
            setConnected(false);
            info(`WebSocket disconnected from ${endpoint}: ${event.code} ${event.reason}`);
            if (onClose) onClose(event);
          },
          onError: (event) => {
            const wsError = new Error('WebSocket connection error');
            setError(wsError);
            error(`WebSocket error for ${endpoint}`, wsError);
            if (onError) onError(event);
          },
          onMessage: (message) => {
            debug(`WebSocket message received from ${endpoint}`, { 
              type: message.type, 
              correlationId: message.correlationId 
            });
            if (onMessage) onMessage(message);
          }
        });
        
        // Register existing message handlers
        Object.entries(messageHandlers).forEach(([type, handlers]) => {
          handlers.forEach(handler => {
            clientRef.current?.addMessageHandler(type, handler);
          });
        });
      }
      
      // Connect to the WebSocket server
      const success = await clientRef.current.connect();
      
      if (!success) {
        setConnecting(false);
        setError(new Error('Failed to connect to WebSocket server'));
        return false;
      }
      
      return true;
    } catch (err) {
      setConnecting(false);
      const wsError = err instanceof Error ? err : new Error('Unknown WebSocket connection error');
      setError(wsError);
      error(`Failed to create WebSocket connection to ${endpoint}`, wsError);
      handleError(wsError);
      return false;
    }
  }, [
    endpoint, connecting, connected, autoReconnect, 
    reconnectInterval, maxReconnectAttempts, messageHandlers,
    onOpen, onClose, onError, onMessage
  ]);

  /**
   * Closes the WebSocket connection
   */
  const disconnect = useCallback((): void => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setConnected(false);
      setConnecting(false);
      info(`WebSocket disconnected from ${endpoint}`);
    }
  }, [endpoint]);

  /**
   * Attempts to reconnect to the WebSocket server
   * @returns Promise that resolves to true if reconnection successful, false otherwise
   */
  const reconnect = useCallback(async (): Promise<boolean> => {
    disconnect();
    return connect();
  }, [disconnect, connect]);

  /**
   * Sends a message through the WebSocket connection
   * 
   * @param type - Message type
   * @param payload - Message payload
   * @param correlationId - Optional correlation ID for message tracing
   * @returns True if message was sent successfully
   */
  const sendMessage = useCallback(
    (type: string, payload: any, correlationId?: string): boolean => {
      if (!connected || !clientRef.current) {
        warn('Cannot send message - WebSocket is not connected');
        return false;
      }
      
      try {
        return clientRef.current.sendMessage(type, payload, correlationId);
      } catch (err) {
        const wsError = err instanceof Error ? err : new Error('Failed to send WebSocket message');
        setError(wsError);
        error(`Failed to send WebSocket message to ${endpoint}`, wsError);
        return false;
      }
    },
    [connected, endpoint]
  );

  /**
   * Adds a handler function for a specific message type
   * 
   * @param type - Message type to handle
   * @param handler - Handler function to add
   */
  const addMessageHandler = useCallback(
    (type: string, handler: Function): void => {
      if (clientRef.current) {
        clientRef.current.addMessageHandler(type, handler);
        debug(`Added message handler for type: ${type}`);
      } else {
        // Store handler for when client is created
        messageHandlers[type] = [...(messageHandlers[type] || []), handler];
      }
    },
    [messageHandlers]
  );

  /**
   * Removes a handler function for a specific message type
   * 
   * @param type - Message type
   * @param handler - Handler function to remove
   */
  const removeMessageHandler = useCallback(
    (type: string, handler: Function): void => {
      if (clientRef.current) {
        clientRef.current.removeMessageHandler(type, handler);
        debug(`Removed message handler for type: ${type}`);
      } else if (messageHandlers[type]) {
        // Remove from stored handlers
        messageHandlers[type] = messageHandlers[type].filter(h => h !== handler);
        if (messageHandlers[type].length === 0) {
          delete messageHandlers[type];
        }
      }
    },
    [messageHandlers]
  );

  // Effect to handle authentication changes
  useEffect(() => {
    // If user authentication status changes and we're connected, reconnect WebSocket
    if (clientRef.current && connected) {
      reconnect();
    }
  }, [isAuthenticated, reconnect, connected]);

  // Effect to auto-connect when component mounts
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    // Clean up WebSocket connection on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [autoConnect, connect]);

  return {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    addMessageHandler,
    removeMessageHandler
  };
}