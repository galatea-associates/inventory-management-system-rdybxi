import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux'; // redux ^4.2.1
import { webSocketService } from '../services/websocket.service';
import { WebSocketMessage } from '../types/api';
import { WEBSOCKET_TOPICS } from '../constants/api';
import { debug, info, warn, error } from '../utils/logger';
import { getToken } from '../utils/security';
import { WEBSOCKET_ACTIONS } from '../state/websocket/websocketMiddleware';

// Constants for reconnection
const WEBSOCKET_RECONNECT_INTERVAL = 2000; // 2 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Creates a Redux middleware for WebSocket integration
 * @returns Configured Redux middleware for WebSocket integration
 */
export const createWebSocketMiddleware = (): Middleware => {
  return (api: MiddlewareAPI) => (next: Dispatch) => (action: AnyAction) => {
    switch (action.type) {
      case WEBSOCKET_ACTIONS.CONNECT:
        handleWebSocketConnect(api, action);
        break;
        
      case WEBSOCKET_ACTIONS.DISCONNECT:
        handleWebSocketDisconnect(api, action);
        break;
        
      case WEBSOCKET_ACTIONS.SEND_MESSAGE:
        handleWebSocketSendMessage(api, action);
        break;
    }
    
    return next(action);
  };
};

/**
 * Handles WebSocket connection action
 * @param api - Redux middleware API
 * @param action - Redux action
 * @returns Promise that resolves when connection is attempted
 */
async function handleWebSocketConnect(api: MiddlewareAPI, action: AnyAction): Promise<void> {
  const { topic } = action.payload || {};
  
  if (!topic || !Object.values(WEBSOCKET_TOPICS).includes(topic)) {
    warn(`Invalid WebSocket topic: ${topic}`);
    return;
  }
  
  debug(`Connecting to WebSocket topic: ${topic}`);
  
  try {
    const connected = await connectWithAuth(topic);
    
    if (connected) {
      info(`Connected to WebSocket topic: ${topic}`);
      
      api.dispatch({
        type: WEBSOCKET_ACTIONS.CONNECTED,
        payload: { topic }
      });
      
      // Setup message handlers
      setupMessageHandlers(topic, api.dispatch);
    } else {
      warn(`Failed to connect to WebSocket topic: ${topic}`);
      
      api.dispatch({
        type: WEBSOCKET_ACTIONS.CONNECTION_ERROR,
        payload: { topic, error: 'Failed to connect' }
      });
    }
  } catch (err) {
    error(`Error connecting to WebSocket topic: ${topic}`, err);
    
    api.dispatch({
      type: WEBSOCKET_ACTIONS.CONNECTION_ERROR,
      payload: { topic, error: err instanceof Error ? err.message : 'Unknown error' }
    });
  }
}

/**
 * Handles WebSocket disconnection action
 * @param api - Redux middleware API
 * @param action - Redux action
 */
function handleWebSocketDisconnect(api: MiddlewareAPI, action: AnyAction): void {
  const { topic } = action.payload || {};
  
  if (!topic || !Object.values(WEBSOCKET_TOPICS).includes(topic)) {
    warn(`Invalid WebSocket topic: ${topic}`);
    return;
  }
  
  debug(`Disconnecting from WebSocket topic: ${topic}`);
  
  webSocketService.disconnect(topic);
  
  api.dispatch({
    type: WEBSOCKET_ACTIONS.DISCONNECTED,
    payload: { topic }
  });
}

/**
 * Handles sending a message through WebSocket
 * @param api - Redux middleware API
 * @param action - Redux action
 */
function handleWebSocketSendMessage(api: MiddlewareAPI, action: AnyAction): void {
  const { topic, type, payload, correlationId } = action.payload || {};
  
  if (!topic || !Object.values(WEBSOCKET_TOPICS).includes(topic)) {
    warn(`Invalid WebSocket topic: ${topic}`);
    return;
  }
  
  if (!webSocketService.isConnected(topic)) {
    warn(`WebSocket not connected for topic: ${topic}`);
    return;
  }
  
  debug(`Sending message to WebSocket topic: ${topic}`, { type, correlationId });
  webSocketService.sendMessage(topic, type, payload, correlationId);
}

/**
 * Sets up message handlers for a WebSocket topic
 * @param topic - WebSocket topic
 * @param dispatch - Redux dispatch function
 */
function setupMessageHandlers(topic: string, dispatch: Dispatch): void {
  debug(`Setting up message handlers for topic: ${topic}`);
  
  if (topic === WEBSOCKET_TOPICS.POSITIONS) {
    webSocketService.addMessageHandler(topic, 'position', (payload: any, message: WebSocketMessage<any>) => {
      handlePositionMessage(message, dispatch);
    });
  } else if (topic === WEBSOCKET_TOPICS.INVENTORY) {
    webSocketService.addMessageHandler(topic, 'inventory', (payload: any, message: WebSocketMessage<any>) => {
      handleInventoryMessage(message, dispatch);
    });
  } else if (topic === WEBSOCKET_TOPICS.LOCATES) {
    webSocketService.addMessageHandler(topic, 'locate', (payload: any, message: WebSocketMessage<any>) => {
      handleLocateMessage(message, dispatch);
    });
  } else if (topic === WEBSOCKET_TOPICS.ALERTS) {
    webSocketService.addMessageHandler(topic, 'alert', (payload: any, message: WebSocketMessage<any>) => {
      handleAlertMessage(message, dispatch);
    });
  }
  
  debug(`Message handlers set up for topic: ${topic}`);
}

/**
 * Handles position update messages from WebSocket
 * @param message - WebSocket message with position data
 * @param dispatch - Redux dispatch function
 */
function handlePositionMessage(message: WebSocketMessage<any>, dispatch: Dispatch): void {
  try {
    const position = message.payload;
    debug('Received position update', { 
      securityId: position.security?.id, 
      bookId: position.bookId
    });
    
    // Determine message subtype based on type field
    const subtype = message.type.includes('.') ? message.type.split('.')[1] : 'update';
    
    // Dispatch appropriate action based on subtype
    switch (subtype) {
      case 'create':
      case 'created':
        dispatch({ type: 'positions/addPosition', payload: position });
        break;
        
      case 'update':
      case 'updated':
        dispatch({ type: 'positions/updatePosition', payload: position });
        break;
        
      case 'delete':
      case 'deleted':
        dispatch({ type: 'positions/removePosition', payload: position.id });
        break;
        
      default:
        dispatch({ type: 'positions/updatePositions', payload: position });
        break;
    }
  } catch (err) {
    error('Error handling position message', err);
  }
}

/**
 * Handles inventory update messages from WebSocket
 * @param message - WebSocket message with inventory data
 * @param dispatch - Redux dispatch function
 */
function handleInventoryMessage(message: WebSocketMessage<any>, dispatch: Dispatch): void {
  try {
    const inventory = message.payload;
    debug('Received inventory update', { 
      securityId: inventory.security?.id, 
      calculationType: inventory.calculationType
    });
    
    // Determine message subtype based on type field
    const subtype = message.type.includes('.') ? message.type.split('.')[1] : 'update';
    
    // Dispatch appropriate action based on subtype
    switch (subtype) {
      case 'create':
      case 'created':
        dispatch({ type: 'inventory/addInventory', payload: inventory });
        break;
        
      case 'update':
      case 'updated':
        dispatch({ type: 'inventory/updateInventory', payload: inventory });
        break;
        
      case 'delete':
      case 'deleted':
        dispatch({ type: 'inventory/removeInventory', payload: inventory.id });
        break;
        
      default:
        dispatch({ type: 'inventory/updateInventories', payload: inventory });
        break;
    }
  } catch (err) {
    error('Error handling inventory message', err);
  }
}

/**
 * Handles locate update messages from WebSocket
 * @param message - WebSocket message with locate data
 * @param dispatch - Redux dispatch function
 */
function handleLocateMessage(message: WebSocketMessage<any>, dispatch: Dispatch): void {
  try {
    const locate = message.payload;
    debug('Received locate update', { 
      requestId: locate.requestId, 
      securityId: locate.security?.id,
      status: locate.status
    });
    
    // Determine message subtype based on type field
    const subtype = message.type.includes('.') ? message.type.split('.')[1] : 'update';
    
    // Dispatch appropriate action based on subtype
    switch (subtype) {
      case 'create':
      case 'created':
        dispatch({ type: 'locates/addLocate', payload: locate });
        
        // Create notification for new locate requests
        dispatch({
          type: 'notifications/addNotification',
          payload: {
            type: 'info',
            title: 'New Locate Request',
            message: `Locate request for ${locate.security?.description || 'Unknown'} (${locate.requestedQuantity} shares)`
          }
        });
        break;
        
      case 'approve':
      case 'approved':
        dispatch({ type: 'locates/updateLocate', payload: locate });
        
        // Create notification for approved locates
        dispatch({
          type: 'notifications/addNotification',
          payload: {
            type: 'success',
            title: 'Locate Request Approved',
            message: `Locate request for ${locate.security?.description || 'Unknown'} approved for ${locate.approval?.approvedQuantity} shares`
          }
        });
        break;
        
      case 'reject':
      case 'rejected':
        dispatch({ type: 'locates/updateLocate', payload: locate });
        
        // Create notification for rejected locates
        dispatch({
          type: 'notifications/addNotification',
          payload: {
            type: 'error',
            title: 'Locate Request Rejected',
            message: `Locate request for ${locate.security?.description || 'Unknown'} rejected: ${locate.rejection?.rejectionReason || 'No reason provided'}`
          }
        });
        break;
        
      default:
        dispatch({ type: 'locates/updateLocate', payload: locate });
        break;
    }
  } catch (err) {
    error('Error handling locate message', err);
  }
}

/**
 * Handles alert messages from WebSocket
 * @param message - WebSocket message with alert data
 * @param dispatch - Redux dispatch function
 */
function handleAlertMessage(message: WebSocketMessage<any>, dispatch: Dispatch): void {
  try {
    const alert = message.payload;
    debug('Received alert', { 
      alertId: alert.id, 
      title: alert.title,
      severity: alert.severity
    });
    
    // Add the alert to the alerts store
    dispatch({ type: 'alerts/addAlert', payload: alert });
    
    // Map severity to notification type
    let notificationType = 'info';
    switch (alert.severity?.toLowerCase()) {
      case 'critical':
      case 'error':
        notificationType = 'error';
        break;
      case 'warning':
        notificationType = 'warning';
        break;
      case 'success':
        notificationType = 'success';
        break;
      default:
        notificationType = 'info';
        break;
    }
    
    // Create notification for the alert
    dispatch({
      type: 'notifications/addNotification',
      payload: {
        type: notificationType,
        title: alert.title || 'System Alert',
        message: alert.message
      }
    });
  } catch (err) {
    error('Error handling alert message', err);
  }
}

/**
 * Connects to WebSocket with authentication
 * @param topic - WebSocket topic to connect to
 * @returns Promise resolving to connection success status
 */
async function connectWithAuth(topic: string): Promise<boolean> {
  const token = getToken();
  
  if (!token) {
    error('Cannot connect to WebSocket: No authentication token available');
    return false;
  }
  
  const headers = {
    Authorization: `Bearer ${token}`
  };
  
  try {
    return await webSocketService.connect(topic, { headers });
  } catch (err) {
    error(`Error connecting to WebSocket topic: ${topic}`, err);
    return false;
  }
}

// Export the middleware factory and a default instance
export default createWebSocketMiddleware();