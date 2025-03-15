import React, { useState, useEffect, useMemo, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, CircularProgress, Alert } from '@mui/material'; // @mui/material 5.13
import Card from '../../components/common/Card';
import Typography from '../../components/common/Typography';
import TimelineChart, { TimelineEvent } from '../../components/data/TimelineChart';
import { useApiQuery } from '../../hooks/useApi';
import { ActivityItem } from '../../types/models';
import { formatDateTimeString } from '../../utils/formatter';
import useWebSocket from '../../hooks/useWebSocket';

/**
 * Interface defining the props for the RecentActivity component.
 */
interface RecentActivityProps {
  maxItems?: number;
  refreshInterval?: number;
  filters?: object;
  className?: string;
  onActivityClick?: (event: TimelineEvent) => void;
}

/**
 * Styled component for the activity timeline container.
 */
const ActivityContainer = styled(Box)`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

/**
 * Styled component for the timeline chart container.
 */
const TimelineContainer = styled(Box)`
  flex: 1;
  overflow: hidden;
  min-height: 200px;
`;

/**
 * Styled component for the loading indicator container.
 */
const LoadingContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

/**
 * Styled component for the empty state message container.
 */
const EmptyStateContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: ${({ theme }) => theme.palette.text.secondary};
`;

/**
 * Component that displays recent system activities in a timeline format.
 * @param {RecentActivityProps} props - The component props.
 * @returns {JSX.Element} - Rendered recent activity component.
 */
const RecentActivity: React.FC<RecentActivityProps> = React.memo(({
  maxItems = 20,
  refreshInterval = 60000,
  filters,
  className,
  onActivityClick
}) => {
  // LD1: Set up state for activity data.
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // LD1: Fetch activity data using useApiQuery hook.
  const { data, loading, error, refetch } = useApiQuery<ActivityItem[]>(
    '/api/v1/activities',
    { maxItems, ...filters },
    {},
    { autoNotifyError: false }
  );

  // LD1: Set up WebSocket connection for real-time updates.
  const { connected, sendMessage, addMessageHandler } = useWebSocket('/topic/activities');

  // LD1: Process activity data for timeline visualization.
  const timelineEvents = useMemo(() => {
    return processActivitiesForTimeline(activities);
  }, [activities]);

  // LD1: Handle real-time activity updates via WebSocket.
  useEffect(() => {
    const handleNewActivity = (activity: ActivityItem) => {
      setActivities(prevActivities => [activity, ...prevActivities].slice(0, maxItems));
    };

    addMessageHandler('activity.new', handleNewActivity);

    return () => {
      removeMessageHandler('activity.new', handleNewActivity);
    };
  }, [addMessageHandler, maxItems]);

  // LD1: Update activity data when API data changes.
  useEffect(() => {
    if (data) {
      setActivities(data);
    }
  }, [data]);

  // LD1: Implement empty state when no activities are available.
  const isEmpty = !loading && !error && activities.length === 0;

  // LD1: Implement loading state with CircularProgress.
  const isLoading = loading && activities.length === 0;

  // LD1: Implement error state with Alert component.
  const hasError = !!error;

  // LD1: Render Card component with title.
  return (
    <Card className={className}>
      <ActivityContainer>
        <Typography variant="h6">Recent Activity</Typography>
        <TimelineContainer>
          {isLoading && (
            <LoadingContainer>
              <CircularProgress />
            </LoadingContainer>
          )}
          {hasError && (
            <LoadingContainer>
              <Alert severity="error">Error fetching recent activity.</Alert>
            </LoadingContainer>
          )}
          {isEmpty && (
            <EmptyStateContainer>
              <Typography variant="body2" color="textSecondary">No recent activity to display.</Typography>
            </EmptyStateContainer>
          )}
          {!isLoading && !hasError && !isEmpty && (
            <TimelineChart
              events={timelineEvents}
              title="Recent Activity"
            />
          )}
        </TimelineContainer>
      </ActivityContainer>
    </Card>
  );
});

/**
 * Transforms activity data into the format required by TimelineChart.
 * @param {ActivityItem[]} activities - The activity data.
 * @returns {TimelineEvent[]} - Processed timeline events.
 */
const processActivitiesForTimeline = (activities: ActivityItem[]): TimelineEvent[] => {
  return activities.map(activity => ({
    id: activity.id,
    timestamp: activity.timestamp,
    title: activity.activityType,
    description: activity.description,
    eventType: getEventTypeFromActivity(activity.activityType),
    category: 'System',
    relatedEntityType: activity.relatedEntityType,
    relatedEntityId: activity.relatedEntityId,
    details: activity.details
  }));
};

/**
 * Determines the appropriate event type for timeline visualization based on activity type.
 * @param {string} activityType - The activity type.
 * @returns {string} - Event type for timeline visualization.
 */
const getEventTypeFromActivity = (activityType: string): string => {
  switch (activityType) {
    case 'locate_approved':
      return 'success';
    case 'position_updated':
      return 'info';
    case 'order_rejected':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Formats the tooltip content for an activity item.
 * @param {TimelineEvent} event - The timeline event.
 * @returns {string} - Formatted tooltip content.
 */
const formatActivityTooltip = (event: TimelineEvent): string => {
  const timestamp = formatDateTimeString(event.timestamp);
  return `${event.title}\n${timestamp}\n${event.description}`;
};

/**
 * Handles click events on activity items in the timeline.
 * @param {TimelineEvent} event - The timeline event.
 * @returns {void} - No return value.
 */
const handleActivityClick = (event: TimelineEvent): void => {
  if (event.relatedEntityType && event.relatedEntityId) {
    // Navigate to the detail page for the related entity
    console.log(`Navigating to ${event.relatedEntityType} with ID ${event.relatedEntityId}`);
  }
};

export default RecentActivity;