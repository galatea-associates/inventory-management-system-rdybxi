import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import { Grid, Typography, Box, Divider } from '@mui/material'; // @mui/material 5.13
import { styled } from '@emotion/styled'; // @emotion/styled ^11.11.0
import { CheckCircleOutline, ErrorOutline, AccessTime } from '@mui/icons-material'; // @mui/icons-material 5.13

import Card from '../../components/common/Card';
import StatusIndicator from '../../components/data/StatusIndicator';
import KPI from '../../components/data/KPI';
import Container from '../../components/layout/Container';
import { useApiQuery } from '../../hooks/useApi';
import { useWebSocket } from '../../hooks/useWebSocket';
import { SystemStatus, ComponentStatus } from '../../types/models';

interface SystemStatusProps {
  className?: string;
}

const StatusCard = styled(Card)`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const ComponentCard = styled(Card)`
  height: 100%;
  padding: ${theme => theme.spacing(2)};
`;

const StatusHeader = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme => theme.spacing(2)};
`;

const ComponentHeader = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme => theme.spacing(1)};
`;

const LastUpdatedText = styled(Typography)`
  color: ${theme => theme.palette.text.secondary};
  font-size: 0.75rem;
`;

/**
 * Formats uptime in seconds to a human-readable string
 * @param uptimeSeconds 
 * @returns Formatted uptime string (e.g., '5d 12h 30m')
 */
const formatUptime = (uptimeSeconds: number): string => {
  const days = Math.floor(uptimeSeconds / (60 * 60 * 24));
  const hours = Math.floor((uptimeSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);

  return `${days}d ${hours}h ${minutes}m`;
};

/**
 * Maps system status to appropriate color and icon
 * @param status 
 * @returns Object containing status type and icon
 */
const getStatusColor = (status: string): { type: string; icon: React.ElementType } => {
  switch (status) {
    case 'healthy':
      return { type: 'success', icon: CheckCircleOutline };
    case 'degraded':
      return { type: 'warning', icon: AccessTime };
    case 'down':
      return { type: 'error', icon: ErrorOutline };
    default:
      return { type: 'info', icon: CheckCircleOutline };
  }
};

/**
 * Component that displays the system health status dashboard
 * @param props 
 * @returns Rendered system status component
 */
const SystemStatusComponent: React.FC<SystemStatusProps> = React.memo(({ className }) => {
  // Fetch initial system status data using useApiQuery
  const { data: initialStatus, loading, error, refetch } = useApiQuery<SystemStatus>(
    '/api/v1/system/health',
    {},
    {},
    { autoNotifyError: false }
  );

  // Set up WebSocket connection for real-time updates
  const { connected, sendMessage, addMessageHandler } = useWebSocket('/topic/systemStatus', {
    autoConnect: true,
    autoReconnect: true,
    onOpen: () => {
      debug('WebSocket connected for system status updates');
    },
    onClose: () => {
      debug('WebSocket disconnected for system status updates');
    },
    onError: (wsError) => {
      error('WebSocket error for system status updates', wsError);
    }
  });

  // Initialize state for system status
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(initialStatus);

  // Handle WebSocket messages to update system status
  const handleStatusUpdate = useCallback((message: any) => {
    if (message && message.status && message.components) {
      setSystemStatus(message);
    }
  }, []);

  // Register WebSocket message handler
  useEffect(() => {
    addMessageHandler('systemStatus.update', handleStatusUpdate);

    return () => {
      removeMessageHandler('systemStatus.update', handleStatusUpdate);
    };
  }, [addMessageHandler, removeMessageHandler, handleStatusUpdate]);

  // Update system status when initial data loads
  useEffect(() => {
    if (initialStatus) {
      setSystemStatus(initialStatus);
    }
  }, [initialStatus]);

  // Render loading skeleton when data is loading
  if (loading) {
    return (
      <Container className={className}>
        <Typography variant="h4">Loading System Status...</Typography>
      </Container>
    );
  }

  // Render error message when API request fails
  if (error) {
    return (
      <Container className={className}>
        <Typography variant="h4" color="error">Error: {error.message}</Typography>
      </Container>
    );
  }

  // Ensure systemStatus is not null before rendering
  if (!systemStatus) {
    return (
      <Container className={className}>
        <Typography variant="h4">System Status Unavailable</Typography>
      </Container>
    );
  }

  // Get overall system status and color
  const { status: overallStatus } = systemStatus;
  const { type: statusType, icon: StatusIcon } = getStatusColor(overallStatus);

  return (
    <Container className={className}>
      <Grid container spacing={3}>
        {/* Overall system status card */}
        <Grid item xs={12} md={4}>
          <StatusCard>
            <StatusHeader>
              <Typography variant="h6">Overall System Status</Typography>
              <StatusIndicator status={statusType} showIcon={true} />
            </StatusHeader>
            <Box>
              <Typography variant="body2">
                <StatusIcon style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                {overallStatus}
              </Typography>
              <Typography variant="caption">
                Version: {systemStatus.version}
              </Typography>
            </Box>
            <LastUpdatedText>
              Last Updated: {systemStatus.lastUpdated}
            </LastUpdatedText>
          </StatusCard>
        </Grid>

        {/* System uptime KPI card */}
        <Grid item xs={12} md={4}>
          <StatusCard>
            <Typography variant="h6">System Uptime</Typography>
            <KPI
              value={formatUptime(systemStatus.uptime)}
              label="Current Uptime"
              icon={<AccessTime />}
            />
            <LastUpdatedText>
              Last Updated: {systemStatus.lastUpdated}
            </LastUpdatedText>
          </StatusCard>
        </Grid>

        {/* Placeholder for additional KPIs */}
        <Grid item xs={12} md={4}>
          <StatusCard>
            <Typography variant="h6">Additional Metrics</Typography>
            <Typography variant="body2">More metrics coming soon...</Typography>
            <LastUpdatedText>
              Last Updated: {systemStatus.lastUpdated}
            </LastUpdatedText>
          </StatusCard>
        </Grid>

        {/* Grid of component statuses */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom>Component Status</Typography>
          <Divider style={{ marginBottom: '1rem' }} />
          <Grid container spacing={3}>
            {Object.entries(systemStatus.components).map(([componentName, componentStatus]) => {
              const { type: componentStatusType, icon: ComponentStatusIcon } = getStatusColor(componentStatus.status);

              return (
                <Grid item xs={12} md={6} lg={4} key={componentName}>
                  <ComponentCard>
                    <ComponentHeader>
                      <Typography variant="subtitle1">{componentName}</Typography>
                      <StatusIndicator status={componentStatusType} showIcon={true} />
                    </ComponentHeader>
                    <Typography variant="body2">
                      <ComponentStatusIcon style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                      {componentStatus.status}
                    </Typography>
                    <LastUpdatedText>
                      Last Checked: {componentStatus.details.lastChecked}
                    </LastUpdatedText>
                  </ComponentCard>
                </Grid>
              );
            })}
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
});

SystemStatusComponent.displayName = 'SystemStatusComponent';

export default SystemStatusComponent;