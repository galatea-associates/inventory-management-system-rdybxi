import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux'; // redux ^4.2.1
import { WebSocketClient } from '../../api/websocket';
import { WebSocketMessage } from '../../types/api';
import { RootState } from '../../types/state';
import { WEBSOCKET_BASE_URL, WEBSOCKET_TOPICS } from '../../constants/api';
import { debug, info, warn, error } from '../../utils/logger';
import { getToken } from '../../utils/security';

// Constants for WebSocket middleware configuration
const WEBSOCKET_RECONNECT_DELAY = 2000; // 2 seconds
const WEBSOCKET_MAX_RECONNECT_ATTEMPTS = 5;

// Action types for WebSocket-related Redux actions
export enum WEBSOCKET_ACTIONS {
  CONNECT = 'WEBSOCKET_CONNECT',
  DISCONNECT = 'WEBSOCKET_DISCONNECT',
  SEND_MESSAGE = 'WEBSOCKET_SEND_MESSAGE',
  CONNECTED = 'WEBSOCKET_CONNECTED',
  DISCONNECTED = 'WEBSOCKET_DISCONNECTED',
  CONNECTION_ERROR = 'WEBSOCKET_CONNECTION_ERROR',
  MESSAGE_RECEIVED = 'WEBSOCKET_MESSAGE_RECEIVED'
}

/**
 * Interface for WebSocket middleware options
 */
export interface WebSocketMiddlewareOptions {
  /** Automatically connect when middleware is created */
  autoConnect: boolean;
  /** Automatically reconnect on connection loss */
  autoReconnect: boolean;
  /** WebSocket topics to subscribe to */
  topics: string[];
  /** Message handlers by message type */
  messageHandlers: Record<string, Function>;
}

/**
 * Handles position update messages from WebSocket
 * @param message - WebSocket message with position data
 * @param dispatch - Redux dispatch function
 */
export function handlePositionMessage(message: WebSocketMessage<any>, dispatch: Dispatch): void {
  const payload = message.payload;
  
  // Skip if no payload
  if (!payload) {
    warn('Received position message with no payload', message);
    return;
  }
  
  // Determine the type of position update
  if (payload.updateType === 'new') {
    debug('Received new position update', payload);
    dispatch({ type: 'positions/positionAdded', payload });
  } else if (payload.updateType === 'updated') {
    debug('Received position update', payload);
    dispatch({ type: 'positions/positionUpdated', payload });
  } else if (payload.updateType === 'deleted') {
    debug('Received position deletion', payload);
    dispatch({ type: 'positions/positionDeleted', payload });
  } else {
    debug('Received general position update', payload);
    dispatch({ type: 'positions/positionsReceived', payload });
  }
}

/**
 * Handles inventory update messages from WebSocket
 * @param message - WebSocket message with inventory data
 * @param dispatch - Redux dispatch function
 */
export function handleInventoryMessage(message: WebSocketMessage<any>, dispatch: Dispatch): void {
  const payload = message.payload;
  
  // Skip if no payload
  if (!payload) {
    warn('Received inventory message with no payload', message);
    return;
  }
  
  // Determine the type of inventory update
  if (payload.updateType === 'availability') {
    debug('Received inventory availability update', payload);
    dispatch({ type: 'inventory/availabilityUpdated', payload });
  } else if (payload.updateType === 'calculation') {
    debug('Received inventory calculation update', payload);
    dispatch({ type: 'inventory/calculationUpdated', payload });
  } else {
    debug('Received general inventory update', payload);
    dispatch({ type: 'inventory/inventoryReceived', payload });
  }
}

/**
 * Handles locate update messages from WebSocket
 * @param message - WebSocket message with locate data
 * @param dispatch - Redux dispatch function
 */
export function handleLocateMessage(message: WebSocketMessage<any>, dispatch: Dispatch): void {
  const payload = message.payload;
  
  // Skip if no payload
  if (!payload) {
    warn('Received locate message with no payload', message);
    return;
  }
  
  const securityName = payload.security?.description || payload.securityId || 'Unknown Security';
  
  // Determine the type of locate update
  if (payload.updateType === 'new') {
    debug('Received new locate request', payload);
    dispatch({ type: 'locates/locateAdded', payload });
    
    // Create notification for new locate requests
    dispatch({
      type: 'notifications/notificationAdded',
      payload: {
        type: 'locate',
        title: 'New Locate Request',
        message: `Locate request for ${securityName}`,
        priority: 'medium'
      }
    });
  } else if (payload.updateType === 'approved') {
    debug('Received locate approval', payload);
    dispatch({ type: 'locates/locateApproved', payload });
    
    // Create notification for approved locates
    dispatch({
      type: 'notifications/notificationAdded',
      payload: {
        type: 'locate',
        title: 'Locate Request Approved',
        message: `Locate request for ${securityName} has been approved`,
        priority: 'medium'
      }
    });
  } else if (payload.updateType === 'rejected') {
    debug('Received locate rejection', payload);
    dispatch({ type: 'locates/locateRejected', payload });
    
    // Create notification for rejected locates
    dispatch({
      type: 'notifications/notificationAdded',
      payload: {
        type: 'locate',
        title: 'Locate Request Rejected',
        message: `Locate request for ${securityName} has been rejected`,
        priority: 'medium'
      }
    });
  } else {
    debug('Received general locate update', payload);
    dispatch({ type: 'locates/locatesReceived', payload });
  }
}

/**
 * Handles alert messages from WebSocket
 * @param message - WebSocket message with alert data
 * @param dispatch - Redux dispatch function
 */
export function handleAlertMessage(message: WebSocketMessage<any>, dispatch: Dispatch): void {
  const payload = message.payload;
  
  // Skip if no payload
  if (!payload) {
    warn('Received alert message with no payload', message);
    return;
  }
  
  debug('Received alert message', payload);
  
  // Dispatch alert action
  dispatch({ type: 'notifications/alertAdded', payload });
  
  // Create notification for the alert
  const severity = payload.severity || 'info';
  dispatch({
    type: 'notifications/notificationAdded',
    payload: {
      type: 'alert',
      title: payload.title || 'System Alert',
      message: payload.message,
      priority: severity === 'critical' ? 'high' : severity === 'high' ? 'medium' : 'low'
    }
  });
}

/**
 * Connects to WebSocket server with authentication
 * @param client - WebSocket client instance
 * @returns Promise resolving to connection success status
 */
export async function connectWebSocket(client: WebSocketClient): Promise<boolean> {
  try {
    // Get authentication token
    const token = getToken();
    
    if (!token) {
      error('WebSocket connection failed: No authentication token');
      return false;
    }
    
    // Prepare connection with authentication
    const headers = {
      Authorization: `Bearer ${token}`
    };
    
    // Connect to WebSocket server
    const connected = await client.connect(headers);
    
    if (connected) {
      info('WebSocket connected successfully');
    } else {
      warn('WebSocket connection failed');
    }
    
    return connected;
  } catch (err) {
    error('WebSocket connection error', err);
    return false;
  }
}

/**
 * Creates a Redux middleware for WebSocket integration
 * @param options - Configuration options for the middleware
 * @returns Configured Redux middleware for WebSocket integration
 */
export function createWebSocketMiddleware(options: Partial<WebSocketMiddlewareOptions> = {}): Middleware {
  // Default options
  const defaultOptions: WebSocketMiddlewareOptions = {
    autoConnect: true,
    autoReconnect: true,
    topics: Object.values(WEBSOCKET_TOPICS),
    messageHandlers: {
      'position': handlePositionMessage,
      'inventory': handleInventoryMessage,
      'locate': handleLocateMessage,
      'alert': handleAlertMessage
    }
  };
  
  // Merge with provided options
  const fullOptions: WebSocketMiddlewareOptions = {
    ...defaultOptions,
    ...options,
    messageHandlers: {
      ...defaultOptions.messageHandlers,
      ...(options.messageHandlers || {})
    }
  };
  
  // Create WebSocket clients for each topic
  const clients: Record<string, WebSocketClient> = {};
  
  // Return middleware function
  return (store: MiddlewareAPI) => {
    // Initialize WebSocket clients for each topic
    fullOptions.topics.forEach(topic => {
      const topicKey = Object.entries(WEBSOCKET_TOPICS).find(([key, value]) => value === topic)?.[0]?.toLowerCase() || topic;
      
      // Create client with appropriate URL
      clients[topicKey] = new WebSocketClient(topic, {
        autoConnect: false, // We'll manage connection ourselves
        autoReconnect: fullOptions.autoReconnect,
        reconnectDelay: WEBSOCKET_RECONNECT_DELAY,
        maxReconnectAttempts: WEBSOCKET_MAX_RECONNECT_ATTEMPTS,
        onOpen: () => {
          info(`WebSocket connected for topic: ${topicKey}`);
          store.dispatch({
            type: WEBSOCKET_ACTIONS.CONNECTED,
            payload: { topic: topicKey }
          });
        },
        onClose: () => {
          info(`WebSocket disconnected for topic: ${topicKey}`);
          store.dispatch({
            type: WEBSOCKET_ACTIONS.DISCONNECTED,
            payload: { topic: topicKey }
          });
        },
        onError: () => {
          error(`WebSocket error for topic: ${topicKey}`);
          store.dispatch({
            type: WEBSOCKET_ACTIONS.CONNECTION_ERROR,
            payload: { topic: topicKey, error: 'WebSocket connection error' }
          });
        },
        onMessage: (message: WebSocketMessage<any>) => {
          // Dispatch the raw message
          store.dispatch({
            type: WEBSOCKET_ACTIONS.MESSAGE_RECEIVED,
            payload: { topic: topicKey, message }
          });
          
          // Process with specific handler if available
          const messageType = message.type;
          const handler = fullOptions.messageHandlers[messageType];
          
          if (handler) {
            debug(`Processing ${messageType} message from topic ${topicKey}`);
            handler(message, store.dispatch, store.getState);
          } else {
            warn(`No handler for message type: ${messageType} from topic ${topicKey}`);
          }
        }
      });
    });
    
    // Auto-connect if enabled
    if (fullOptions.autoConnect) {
      setTimeout(() => {
        store.dispatch({ type: WEBSOCKET_ACTIONS.CONNECT });
      }, 0);
    }
    
    return (next: Dispatch) => (action: AnyAction) => {
      switch (action.type) {
        case WEBSOCKET_ACTIONS.CONNECT:
          // Connect all WebSocket clients
          Object.entries(clients).forEach(async ([topic, client]) => {
            if (!client.isConnected() && !client.isConnecting()) {
              debug(`Connecting WebSocket for topic: ${topic}`);
              await connectWebSocket(client);
            }
          });
          break;
          
        case WEBSOCKET_ACTIONS.DISCONNECT:
          // Disconnect all WebSocket clients
          Object.entries(clients).forEach(([topic, client]) => {
            debug(`Disconnecting WebSocket for topic: ${topic}`);
            client.disconnect();
          });
          break;
          
        case WEBSOCKET_ACTIONS.SEND_MESSAGE:
          // Send a message through a WebSocket connection
          const { topic, type, payload, correlationId } = action.payload;
          const client = clients[topic.toLowerCase()];
          
          if (client && client.isConnected()) {
            debug(`Sending WebSocket message to topic ${topic}`, { type, correlationId });
            client.sendMessage(type, payload, correlationId);
          } else {
            warn(`Cannot send message to topic ${topic}: WebSocket not connected`);
            
            // Try to connect if not connected
            if (client && !client.isConnecting() && fullOptions.autoConnect) {
              debug(`Attempting to connect WebSocket for topic: ${topic}`);
              store.dispatch({ type: WEBSOCKET_ACTIONS.CONNECT });
              
              // Queue the message to be sent after connection
              setTimeout(() => {
                if (client && client.isConnected()) {
                  client.sendMessage(type, payload, correlationId);
                }
              }, 1000);
            }
          }
          break;
      }
      
      return next(action);
    };
  };
}