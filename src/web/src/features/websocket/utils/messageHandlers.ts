import { Dispatch } from 'redux';
import { WebSocketMessage } from '../../../types/api';
import { Position, Inventory, LocateRequest, Alert } from '../../../types/models';
import { WEBSOCKET_TOPICS } from '../../../constants/api';
import { WebSocketClient } from '../../../api/websocket';
import { debug, info, warn, error } from '../../../utils/logger';

/**
 * Registers message handlers for different message types on a WebSocket client
 * @param client - WebSocket client instance
 * @param dispatch - Redux dispatch function
 * @param messageTypes - Optional array of message types to register handlers for
 * @param customHandler - Optional custom handler function for all message types
 */
export function registerMessageHandlers(
  client: WebSocketClient,
  dispatch: Dispatch,
  messageTypes?: string[],
  customHandler?: Function
): void {
  // If no specific message types provided, use all available topic values
  const types = messageTypes || Object.values(WEBSOCKET_TOPICS);
  
  debug('Registering WebSocket message handlers', { types });
  
  // Register handlers for each message type
  types.forEach(type => {
    const handler = getMessageHandler(type, dispatch);
    client.addMessageHandler(type, handler);
    debug(`Registered handler for message type: ${type}`);
  });
  
  // If a custom handler is provided, register it for all message types
  if (customHandler) {
    types.forEach(type => {
      client.addMessageHandler(type, customHandler);
      debug(`Registered custom handler for message type: ${type}`);
    });
  }
  
  info(`Registered message handlers for ${types.length} message types`);
}

/**
 * Handles position update messages from WebSocket
 * @param message - Position message from WebSocket
 * @param dispatch - Redux dispatch function
 */
export function handlePositionMessage(
  message: WebSocketMessage<Position>,
  dispatch: Dispatch
): void {
  try {
    const position = message.payload;
    debug('Received position update', { 
      securityId: position.security.id, 
      bookId: position.bookId,
      qty: position.contractualQty 
    });
    
    // Determine message subtype based on payload properties or metadata
    const subtype = message.type.includes('.') 
      ? message.type.split('.')[1] 
      : 'update';
    
    // Dispatch appropriate action based on subtype
    switch (subtype) {
      case 'create':
        dispatch({ 
          type: 'positions/addPosition', 
          payload: position 
        });
        
        // If this is the currently selected position, update selected position
        const selectedPositionId = localStorage.getItem('selectedPositionId');
        if (selectedPositionId === position.id) {
          dispatch({ 
            type: 'positions/setSelectedPosition', 
            payload: position 
          });
        }
        break;
        
      case 'update':
        dispatch({ 
          type: 'positions/updatePosition', 
          payload: position 
        });
        
        // If this is the currently selected position, update selected position
        const selectedPosId = localStorage.getItem('selectedPositionId');
        if (selectedPosId === position.id) {
          dispatch({ 
            type: 'positions/setSelectedPosition', 
            payload: position 
          });
        }
        break;
        
      case 'delete':
        dispatch({ 
          type: 'positions/removePosition', 
          payload: position.id 
        });
        
        // If this is the currently selected position, clear selected position
        const selectedPosIdForDelete = localStorage.getItem('selectedPositionId');
        if (selectedPosIdForDelete === position.id) {
          dispatch({ 
            type: 'positions/clearSelectedPosition'
          });
        }
        break;
        
      default:
        warn(`Unknown position message subtype: ${subtype}`);
        break;
    }
  } catch (err) {
    error('Error handling position message', err);
  }
}

/**
 * Handles inventory update messages from WebSocket
 * @param message - Inventory message from WebSocket
 * @param dispatch - Redux dispatch function
 */
export function handleInventoryMessage(
  message: WebSocketMessage<Inventory>,
  dispatch: Dispatch
): void {
  try {
    const inventory = message.payload;
    debug('Received inventory update', { 
      securityId: inventory.security.id, 
      calculationType: inventory.calculationType,
      availableQty: inventory.availableQuantity 
    });
    
    // Determine message subtype based on payload properties or metadata
    const subtype = message.type.includes('.') 
      ? message.type.split('.')[1] 
      : 'update';
    
    // Dispatch appropriate action based on subtype
    switch (subtype) {
      case 'create':
        dispatch({ 
          type: 'inventory/addInventory', 
          payload: inventory 
        });
        
        // If this is the currently selected inventory, update selected inventory
        const selectedInventoryId = localStorage.getItem('selectedInventoryId');
        if (selectedInventoryId === inventory.id) {
          dispatch({ 
            type: 'inventory/setSelectedInventory', 
            payload: inventory 
          });
        }
        break;
        
      case 'update':
        dispatch({ 
          type: 'inventory/updateInventory', 
          payload: inventory 
        });
        
        // If this is the currently selected inventory, update selected inventory
        const selectedInvId = localStorage.getItem('selectedInventoryId');
        if (selectedInvId === inventory.id) {
          dispatch({ 
            type: 'inventory/setSelectedInventory', 
            payload: inventory 
          });
        }
        break;
        
      case 'delete':
        dispatch({ 
          type: 'inventory/removeInventory', 
          payload: inventory.id 
        });
        
        // If this is the currently selected inventory, clear selected inventory
        const selectedInvIdForDelete = localStorage.getItem('selectedInventoryId');
        if (selectedInvIdForDelete === inventory.id) {
          dispatch({ 
            type: 'inventory/clearSelectedInventory'
          });
        }
        break;
        
      default:
        warn(`Unknown inventory message subtype: ${subtype}`);
        break;
    }
  } catch (err) {
    error('Error handling inventory message', err);
  }
}

/**
 * Handles locate request update messages from WebSocket
 * @param message - Locate request message from WebSocket
 * @param dispatch - Redux dispatch function
 */
export function handleLocateMessage(
  message: WebSocketMessage<LocateRequest>,
  dispatch: Dispatch
): void {
  try {
    const locate = message.payload;
    debug('Received locate update', { 
      requestId: locate.requestId, 
      securityId: locate.security.id,
      status: locate.status 
    });
    
    // Determine message subtype based on payload properties or metadata
    const subtype = message.type.includes('.') 
      ? message.type.split('.')[1] 
      : 'update';
    
    // Dispatch appropriate action based on subtype
    switch (subtype) {
      case 'create':
        dispatch({ 
          type: 'locates/addLocate', 
          payload: locate 
        });
        
        // Create a notification for new locate request
        dispatch({
          type: 'notifications/addNotification',
          payload: {
            id: locate.id,
            title: 'New Locate Request',
            message: `New locate request for ${locate.security.description} (${locate.requestedQuantity} shares)`,
            type: 'info',
            timestamp: new Date().toISOString()
          }
        });
        break;
        
      case 'update':
        dispatch({ 
          type: 'locates/updateLocate', 
          payload: locate 
        });
        break;
        
      case 'approve':
        dispatch({ 
          type: 'locates/updateLocate', 
          payload: locate 
        });
        
        // Create a notification for approval
        dispatch({
          type: 'notifications/addNotification',
          payload: {
            id: locate.id,
            title: 'Locate Request Approved',
            message: `Locate request for ${locate.security.description} approved for ${locate.approval.approvedQuantity} shares`,
            type: 'success',
            timestamp: new Date().toISOString()
          }
        });
        break;
        
      case 'reject':
        dispatch({ 
          type: 'locates/updateLocate', 
          payload: locate 
        });
        
        // Create a notification for rejection
        dispatch({
          type: 'notifications/addNotification',
          payload: {
            id: locate.id,
            title: 'Locate Request Rejected',
            message: `Locate request for ${locate.security.description} rejected: ${locate.rejection.rejectionReason}`,
            type: 'error',
            timestamp: new Date().toISOString()
          }
        });
        break;
        
      default:
        warn(`Unknown locate message subtype: ${subtype}`);
        break;
    }
    
    // If this is the currently selected locate, update selected locate
    const selectedLocateId = localStorage.getItem('selectedLocateId');
    if (selectedLocateId === locate.id) {
      dispatch({ 
        type: 'locates/setSelectedLocate', 
        payload: locate 
      });
    }
  } catch (err) {
    error('Error handling locate message', err);
  }
}

/**
 * Creates a notification object from an alert
 * @param alert - Alert object
 * @returns Notification object created from the alert
 */
export function createNotificationFromAlert(alert: Alert): any {
  // Map alert severity to notification type
  let notificationType = 'info';
  switch (alert.severity.toLowerCase()) {
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
    case 'info':
    default:
      notificationType = 'info';
      break;
  }
  
  return {
    id: alert.id,
    title: alert.title,
    message: alert.message,
    type: notificationType,
    timestamp: alert.timestamp,
    source: alert.source,
    relatedEntityId: alert.relatedEntityId,
    relatedEntityType: alert.relatedEntityType,
    dismissible: true,
    autoClose: alert.severity.toLowerCase() !== 'critical',
    link: alert.relatedEntityId ? `/${alert.relatedEntityType}/${alert.relatedEntityId}` : undefined
  };
}

/**
 * Handles system alert messages from WebSocket
 * @param message - Alert message from WebSocket
 * @param dispatch - Redux dispatch function
 */
export function handleAlertMessage(
  message: WebSocketMessage<Alert>,
  dispatch: Dispatch
): void {
  try {
    const alert = message.payload;
    debug('Received alert', { 
      alertId: alert.id, 
      title: alert.title,
      severity: alert.severity 
    });
    
    // Add the alert to the alerts store
    dispatch({ 
      type: 'alerts/addAlert', 
      payload: alert 
    });
    
    // Create and show a notification for this alert
    const notification = createNotificationFromAlert(alert);
    dispatch({
      type: 'notifications/addNotification',
      payload: notification
    });
  } catch (err) {
    error('Error handling alert message', err);
  }
}

/**
 * Returns the appropriate message handler function for a given message type
 * @param messageType - Message type
 * @param dispatch - Redux dispatch function
 * @returns Handler function for the specified message type
 */
export function getMessageHandler(
  messageType: string,
  dispatch: Dispatch
): Function {
  // Match the message type to the appropriate handler
  if (messageType === WEBSOCKET_TOPICS.POSITIONS || messageType.startsWith(`${WEBSOCKET_TOPICS.POSITIONS}.`)) {
    return (payload: any, message: WebSocketMessage<Position>) => 
      handlePositionMessage(message, dispatch);
  }
  
  if (messageType === WEBSOCKET_TOPICS.INVENTORY || messageType.startsWith(`${WEBSOCKET_TOPICS.INVENTORY}.`)) {
    return (payload: any, message: WebSocketMessage<Inventory>) => 
      handleInventoryMessage(message, dispatch);
  }
  
  if (messageType === WEBSOCKET_TOPICS.LOCATES || messageType.startsWith(`${WEBSOCKET_TOPICS.LOCATES}.`)) {
    return (payload: any, message: WebSocketMessage<LocateRequest>) => 
      handleLocateMessage(message, dispatch);
  }
  
  if (messageType === WEBSOCKET_TOPICS.ALERTS || messageType.startsWith(`${WEBSOCKET_TOPICS.ALERTS}.`)) {
    return (payload: any, message: WebSocketMessage<Alert>) => 
      handleAlertMessage(message, dispatch);
  }
  
  // Default handler for unknown message types
  return (payload: any, message: WebSocketMessage<any>) => {
    warn(`No handler registered for message type: ${messageType}`, { payload, message });
  };
}