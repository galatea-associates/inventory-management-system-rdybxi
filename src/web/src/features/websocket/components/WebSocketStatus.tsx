import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.11.0
import { Box, Tooltip, IconButton } from '@mui/material'; // 5.13
import { Refresh as RefreshIcon } from '@mui/icons-material'; // 5.13

import StatusIndicator from '../../../components/data/StatusIndicator';
import { useWebSocketConnection } from '../hooks/useWebSocketConnection';
import { webSocketService } from '../../../services/websocket.service';
import { WEBSOCKET_TOPICS } from '../../../constants/api';

/**
 * Props for the WebSocketStatus component
 */
export interface WebSocketStatusProps {
  /** WebSocket topic to monitor */
  topic?: string;
  /** Whether to show the connection status label */
  showLabel?: boolean;
  /** Whether to show the reconnect button */
  showReconnect?: boolean;
  /** Optional CSS class for styling */
  className?: string;
}

/**
 * Styled component for the status container
 */
const StatusContainer = styled(Box)`
  display: flex;
  align-items: center;
  gap: ${theme => theme.spacing(1)};
`;

/**
 * Styled component for the reconnect button
 */
const ReconnectButton = styled(IconButton)`
  padding: 4px;
  color: ${props => props.disabled ? theme => theme.palette.action.disabled : theme => theme.palette.primary.main};
`;

/**
 * Determines the status type based on connection state
 * @param connected - Whether the WebSocket is connected
 * @param connecting - Whether the WebSocket is connecting
 * @param error - Any connection error
 * @returns Status type for visualization
 */
const getConnectionStatus = (connected: boolean, connecting: boolean, error: Error | null): string => {
  if (error) return 'error';
  if (connected) return 'success';
  if (connecting) return 'warning';
  return 'error'; // Disconnected state
};

/**
 * Returns a human-readable label for the connection status
 * @param connected - Whether the WebSocket is connected
 * @param connecting - Whether the WebSocket is connecting
 * @param error - Any connection error
 * @returns Human-readable status label
 */
const getConnectionLabel = (connected: boolean, connecting: boolean, error: Error | null): string => {
  if (error) return 'Connection Error';
  if (connected) return 'Connected';
  if (connecting) return 'Connecting...';
  return 'Disconnected';
};

/**
 * A component that displays the current status of WebSocket connections in the Inventory Management System.
 * It provides visual feedback about connection state (connected, connecting, disconnected, error)
 * and allows users to manually reconnect when needed.
 */
const WebSocketStatus = React.memo(({
  topic = WEBSOCKET_TOPICS.POSITIONS,
  showLabel = true,
  showReconnect = true,
  className
}: WebSocketStatusProps) => {
  // Use the WebSocket connection hook to get connection state
  const { connected, connecting, error, reconnect } = useWebSocketConnection(topic);
  
  // Determine the status type and label
  const statusType = getConnectionStatus(connected, connecting, error);
  const statusLabel = showLabel ? getConnectionLabel(connected, connecting, error) : undefined;
  
  // Handle manual reconnection
  const handleReconnect = useCallback(async () => {
    if (!connected && !connecting) {
      await reconnect();
    }
  }, [connected, connecting, reconnect]);

  return (
    <StatusContainer 
      className={className}
      aria-live="polite"
      role="status"
    >
      <StatusIndicator 
        status={statusType} 
        label={statusLabel} 
        showIcon={true}
        size="small"
      />
      
      {showReconnect && !connected && !connecting && (
        <Tooltip title="Reconnect">
          <ReconnectButton
            onClick={handleReconnect}
            size="small"
            aria-label="Reconnect WebSocket"
            disabled={connecting}
          >
            <RefreshIcon fontSize="small" />
          </ReconnectButton>
        </Tooltip>
      )}
    </StatusContainer>
  );
});

WebSocketStatus.displayName = 'WebSocketStatus';

export default WebSocketStatus;