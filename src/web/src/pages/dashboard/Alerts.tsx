import React, { useState, useEffect, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.11.0
import { Box, Stack, Grid, Button } from '@mui/material'; // @mui/material ^5.13
import WarningIcon from '@mui/icons-material/Warning'; // @mui/icons-material ^5.13
import ErrorIcon from '@mui/icons-material/Error'; // @mui/icons-material ^5.13
import InfoIcon from '@mui/icons-material/Info'; // @mui/icons-material ^5.13
import Card from '../../components/common/Card';
import Typography from '../../components/common/Typography';
import Alert from '../../components/common/Alert';
import KPI from '../../components/data/KPI';
import StatusIndicator from '../../components/data/StatusIndicator';
import { useApiQuery } from '../../hooks/useApi';
import { getExceptionStats } from '../../api/exception';
import { Alert as AlertModel } from '../../types/models';

/**
 * Interface defining the props for the Alerts component, including optional refresh interval and maximum alerts to display.
 */
interface AlertsProps {
  /** Optional refresh interval in milliseconds for automatic data refresh. */
  refreshInterval?: number;
  /** Optional maximum number of alerts to display. */
  maxAlerts?: number;
}

/**
 * Styled Card component to contain the alerts section, providing a consistent look and feel.
 */
const AlertCard = styled(Card)`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

/**
 * Styled Box component for the header of the alerts section, including title and alert count.
 */
const AlertHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme => theme.spacing(2)};
  border-bottom: 1px solid ${theme => theme.palette.divider};
`;

/**
 * Styled Typography component for the alert title, with bold font weight and icon alignment.
 */
const AlertTitle = styled(Typography)`
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: ${theme => theme.spacing(1)};
`;

/**
 * Styled Box component for displaying the alert count, with error background color and white text.
 */
const AlertCount = styled(Box)`
  display: flex;
  align-items: center;
  background-color: ${theme => theme.palette.error.main};
  color: white;
  border-radius: 12px;
  padding: 0 8px;
  font-size: 0.75rem;
  height: 24px;
`;

/**
 * Styled Box component for the alert content, providing scrollable overflow and padding.
 */
const AlertContent = styled(Box)`
  flex: 1;
  overflow-y: auto;
  padding: ${theme => theme.spacing(2)};
`;

/**
 * Styled Box component for individual alert items, with consistent spacing and border.
 */
const AlertItem = styled(Box)`
  display: flex;
  align-items: flex-start;
  gap: ${theme => theme.spacing(1)};
  margin-bottom: ${theme => theme.spacing(1.5)};
  padding-bottom: ${theme => theme.spacing(1.5)};
  border-bottom: 1px solid ${theme => theme.palette.divider};

  &:last-child {
    margin-bottom: 0;
    border-bottom: none;
  }
`;

/**
 * Styled Box component for the alert information, including time and message.
 */
const AlertInfo = styled(Box)`
  flex: 1;
`;

/**
 * Styled Typography component for the alert timestamp, with secondary text color and small font size.
 */
const AlertTime = styled(Typography)`
  color: ${theme => theme.palette.text.secondary};
  font-size: 0.75rem;
`;

/**
 * Styled Typography component for the alert message, with a slightly larger font size.
 */
const AlertMessage = styled(Typography)`
  font-size: 0.875rem;
`;

/**
 * Styled Box component for the alert footer, including a "View All" button.
 */
const AlertFooter = styled(Box)`
  display: flex;
  justify-content: center;
  padding: ${theme => theme.spacing(2)};
  border-top: 1px solid ${theme => theme.palette.divider};
`;

/**
 * Styled Grid component for the KPI container, providing consistent spacing and border.
 */
const KPIContainer = styled(Grid)`
  padding: ${theme => theme.spacing(2)};
  border-bottom: 1px solid ${theme => theme.palette.divider};
`;

/**
 * Styled Typography component for displaying a message when no alerts are available.
 */
const NoAlertsMessage = styled(Typography)`
  text-align: center;
  padding: ${theme => theme.spacing(4)};
  color: ${theme => theme.palette.text.secondary};
`;

/**
 * Dashboard component that displays system alerts and notifications.
 * @param props - AlertsProps interface
 * @returns Rendered alerts component
 */
const Alerts: React.FC<AlertsProps> = ({ refreshInterval = 60000, maxAlerts = 5 }) => {
  // LD1: Set up state for alert data and statistics
  const [alerts, setAlerts] = useState<AlertModel[]>([]);
  const [exceptionStats, setExceptionStats] = useState<{ bySeverity: Record<string, number>; total: number } | null>(null);

  // LD1: Use useApiQuery to fetch recent alerts with high severity
  const { data: alertsData, refetch: refetchAlerts } = useApiQuery<AlertModel[]>('/api/v1/alerts', {
    severity: 'High',
    limit: maxAlerts,
  });

  // LD1: Use useApiQuery to fetch alert statistics
  const { data: exceptionStatsData, refetch: refetchExceptionStats } = useApiQuery<{ bySeverity: Record<string, number>; total: number }>(
    '/api/v1/exceptions/stats',
    {},
    {},
    { autoNotifyError: false }
  );

  // LD1: Set up useEffect for automatic refresh based on refreshInterval
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetchAlerts();
      refetchExceptionStats();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, refetchAlerts, refetchExceptionStats]);

  // LD1: Update alerts state when alertsData changes
  useEffect(() => {
    if (alertsData) {
      setAlerts(alertsData);
    }
  }, [alertsData]);

  // LD1: Update exceptionStats state when exceptionStatsData changes
  useEffect(() => {
    if (exceptionStatsData) {
      setExceptionStats(exceptionStatsData);
    }
  }, [exceptionStatsData]);

  // LD1: Create a function to map alert severity to appropriate icon and color
  const getSeverityIcon = (severity: string): React.ReactNode => {
    switch (severity) {
      case 'Critical':
      case 'High':
        return <ErrorIcon />;
      case 'Medium':
        return <WarningIcon />;
      case 'Low':
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  // LD1: Create a function to format alert timestamp
  const formatAlertTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // LD1: Create a function to map alert severity to appropriate color
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'Critical':
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'info';
      default:
        return 'info';
    }
  };

  // LD1: Render a Card component as the container
  return (
    <AlertCard>
      {/* LD1: Render a header with title and alert count */}
      <AlertHeader>
        <AlertTitle>
          System Alerts
        </AlertTitle>
        {exceptionStats && (
          <AlertCount>{exceptionStats.total}</AlertCount>
        )}
      </AlertHeader>

      {/* LD1: Render KPI components showing alert counts by severity */}
      <KPIContainer container spacing={2}>
        <Grid item xs={6} md={3}>
          <KPI
            label="Critical"
            value={exceptionStats?.bySeverity?.Critical || 0}
            icon={<StatusIndicator status="error" size="small" showIcon />}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPI
            label="High"
            value={exceptionStats?.bySeverity?.High || 0}
            icon={<StatusIndicator status="warning" size="small" showIcon />}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPI
            label="Medium"
            value={exceptionStats?.bySeverity?.Medium || 0}
            icon={<StatusIndicator status="info" size="small" showIcon />}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KPI
            label="Low"
            value={exceptionStats?.bySeverity?.Low || 0}
            icon={<StatusIndicator status="info" size="small" showIcon />}
          />
        </Grid>
      </KPIContainer>

      {/* LD1: Render a list of recent alerts with severity indicators */}
      <AlertContent>
        <Stack spacing={2}>
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <AlertItem key={alert.id}>
                <StatusIndicator status={getSeverityColor(alert.severity)} size="small" showIcon />
                <AlertInfo>
                  <AlertTime>{formatAlertTime(alert.timestamp)}</AlertTime>
                  <AlertMessage>{alert.message}</AlertMessage>
                </AlertInfo>
              </AlertItem>
            ))
          ) : (
            <NoAlertsMessage>No alerts to display.</NoAlertsMessage>
          )}
        </Stack>
      </AlertContent>

      {/* LD1: Render a "View All" button that links to the exceptions page */}
      <AlertFooter>
        <Button variant="contained">View All</Button>
      </AlertFooter>
    </AlertCard>
  );
};

Alerts.defaultProps = {
  refreshInterval: 60000,
  maxAlerts: 5,
};

export default Alerts;