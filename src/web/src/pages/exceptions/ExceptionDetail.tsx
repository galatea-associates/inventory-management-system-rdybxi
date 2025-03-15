import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import {
  Box,
  Typography,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  CircularProgress,
  TextField,
} from '@mui/material'; // @mui/material 5.13
import { format, formatDistance } from 'date-fns'; // date-fns 2.29.3
import { useDispatch, useSelector } from 'react-redux'; // react-redux 8.0.5
import DetailPanel from '../../components/data/DetailPanel';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import StatusIndicator from '../../components/data/StatusIndicator';
import {
  acknowledgeExceptionThunk,
  resolveExceptionThunk,
  assignExceptionThunk,
  escalateExceptionThunk,
  addExceptionCommentThunk,
} from '../../state/exceptions/exceptionsSlice';
import {
  selectSelectedException,
  selectExceptionsSubmitting,
} from '../../state/exceptions/exceptionsSelectors';
import { getExceptionSeverities } from '../../api/exception';
import { Alert } from '../../types/models';

/**
 * Interface for exception detail properties
 */
interface ExceptionDetailProps {
  exception: Alert | null;
  onClose: () => void;
  onUpdate: (exception: Alert) => void;
  width: string | number;
  height: string | number;
  className?: string;
}

/**
 * Interface for severity dropdown options
 */
interface SeverityOption {
  value: string;
  label: string;
}

/**
 * Interface for user dropdown options
 */
interface UserOption {
  value: string;
  label: string;
}

/**
 * Styled container for the exception detail
 */
const StyledExceptionDetail = styled(Box)`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

/**
 * Styled section within the exception detail
 */
const DetailSection = styled(Box)`
  margin-bottom: ${theme => theme.spacing(2)};
  padding: ${theme => theme.spacing(2)};
  border-radius: ${theme => theme.shape.borderRadius}px;
  background-color: ${theme => theme.palette.background.paper};
`;

/**
 * Styled title for detail sections
 */
const SectionTitle = styled(Typography)`
  font-weight: bold;
  margin-bottom: ${theme => theme.spacing(1)};
`;

/**
 * Styled content container for detail sections
 */
const SectionContent = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: ${theme => theme.spacing(1)};
`;

/**
 * Styled row for property display
 */
const PropertyRow = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

/**
 * Styled label for property display
 */
const PropertyLabel = styled(Typography)`
  font-weight: medium;
  color: ${theme => theme.palette.text.secondary};
  font-size: 0.875rem;
`;

/**
 * Styled value for property display
 */
const PropertyValue = styled(Typography)`
  font-weight: regular;
  font-size: 0.875rem;
`;

/**
 * Styled container for action buttons
 */
const ActionBar = styled(Box)`
  display: flex;
  gap: ${theme => theme.spacing(1)};
  margin-top: ${theme => theme.spacing(2)};
  justify-content: flex-end;
`;

/**
 * Styled section for comments
 */
const CommentSection = styled(Box)`
  margin-top: ${theme => theme.spacing(2)};
  display: flex;
  flex-direction: column;
  gap: ${theme => theme.spacing(1)};
`;

/**
 * Styled input for comments
 */
const CommentInput = styled(Box)`
  display: flex;
  gap: ${theme => theme.spacing(1)};
`;

/**
 * Styled container for individual comments
 */
const Comment = styled(Box)`
  padding: ${theme => theme.spacing(1)};
  border-radius: ${theme => theme.shape.borderRadius}px;
  background-color: ${theme => theme.palette.background.default};
  margin-bottom: ${theme => theme.spacing(1)};
`;

/**
 * Styled header for comments
 */
const CommentHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${theme => theme.spacing(0.5)};
`;

/**
 * Styled author display for comments
 */
const CommentAuthor = styled(Typography)`
  font-weight: bold;
  font-size: 0.75rem;
`;

/**
 * Styled timestamp display for comments
 */
const CommentTime = styled(Typography)`
  font-size: 0.75rem;
  color: ${theme => theme.palette.text.secondary};
`;

/**
 * Styled text display for comments
 */
const CommentText = styled(Typography)`
  font-size: 0.875rem;
`;

/**
 * Styled container for tab panels
 */
const TabPanel = styled(Box)`
  padding: ${theme => theme.spacing(2)};
  height: 100%;
  overflow: auto;
`;

/**
 * Helper function to format a timestamp with appropriate format
 */
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '';
  return format(new Date(timestamp), 'MM/dd/yyyy HH:mm:ss');
};

/**
 * Helper function to format a timestamp as a relative time
 */
const formatTimeDistance = (timestamp: string): string => {
  if (!timestamp) return '';
  return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
};

/**
 * Helper function to get the appropriate color for a severity level
 */
const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'Critical':
      return 'error';
    case 'High':
      return 'warning';
    case 'Medium':
      return 'info';
    case 'Low':
      return 'success';
    default:
      return 'default';
  }
};

/**
 * Helper function to get the appropriate color for an exception status
 */
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Open':
      return 'error';
    case 'In Progress':
      return 'warning';
    case 'Acknowledged':
      return 'info';
    case 'Resolved':
      return 'success';
    default:
      return 'default';
  }
};

/**
 * A component that displays detailed information about a selected exception
 */
const ExceptionDetail: React.FC<ExceptionDetailProps> = React.memo(({
  exception,
  onClose,
  onUpdate,
  width = '400px',
  height = '100%',
  className,
}) => {
  // Initialize Redux hooks for accessing and updating state
  const dispatch = useDispatch();
  const submitting = useSelector(selectExceptionsSubmitting);

  // Initialize state for comment input, resolution notes, escalation notes, and assignee selection
  const [comment, setComment] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [escalationNotes, setEscalationNotes] = useState('');
  const [assignee, setAssignee] = useState('');

  // Initialize state for dialog visibility (resolve, assign, escalate)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);

  // Initialize state for severity options
  const [severityOptions, setSeverityOptions] = useState<SeverityOption[]>([]);

  /**
   * Function to fetch severity options from the API
   */
  const fetchSeverityOptions = useCallback(async () => {
    try {
      const severities = await getExceptionSeverities();
      const options = severities.map(severity => ({ value: severity, label: severity }));
      setSeverityOptions(options);
    } catch (error) {
      console.error('Failed to fetch severity options', error);
    }
  }, []);

  /**
   * Implement useEffect to fetch severity options on component mount
   */
  useEffect(() => {
    fetchSeverityOptions();
  }, [fetchSeverityOptions]);

  /**
   * Handler function for acknowledging an exception
   */
  const handleAcknowledge = async () => {
    if (!exception?.id) return;
    try {
      await dispatch(acknowledgeExceptionThunk(exception.id)).unwrap();
      onUpdate({ ...exception, status: 'Acknowledged' });
    } catch (err) {
      console.error('Failed to acknowledge exception', err);
    }
  };

  /**
   * Handler function for resolving an exception
   */
  const handleResolve = async () => {
    if (!exception?.id) return;
    try {
      await dispatch(resolveExceptionThunk({ id: exception.id, resolutionNotes })).unwrap();
      onUpdate({ ...exception, status: 'Resolved', resolutionNotes });
      setResolveDialogOpen(false);
      setResolutionNotes('');
    } catch (err) {
      console.error('Failed to resolve exception', err);
    }
  };

  /**
   * Handler function for assigning an exception to a user
   */
  const handleAssign = async () => {
    if (!exception?.id) return;
    try {
      await dispatch(assignExceptionThunk({ id: exception.id, assigneeId: assignee })).unwrap();
      onUpdate({ ...exception, assignedTo: assignee });
      setAssignDialogOpen(false);
      setAssignee('');
    } catch (err) {
      console.error('Failed to assign exception', err);
    }
  };

  /**
   * Handler function for escalating an exception
   */
  const handleEscalate = async () => {
    if (!exception?.id) return;
    try {
      await dispatch(escalateExceptionThunk({
        id: exception.id,
        newSeverity: '', //severityOptions[0].value,
        assigneeId: assignee,
        escalationNotes
      })).unwrap();
      setEscalateDialogOpen(false);
      setEscalationNotes('');
    } catch (err) {
      console.error('Failed to escalate exception', err);
    }
  };

  /**
   * Handler function for adding a comment to an exception
   */
  const handleAddComment = async () => {
    if (!exception?.id) return;
    if (!comment) return;
    try {
      await dispatch(addExceptionCommentThunk({ id: exception.id, comment })).unwrap();
      setComment('');
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  /**
   * Handler functions for opening and closing dialogs
   */
  const handleOpenResolveDialog = () => setResolveDialogOpen(true);
  const handleCloseResolveDialog = () => setResolveDialogOpen(false);
  const handleOpenAssignDialog = () => setAssignDialogOpen(true);
  const handleCloseAssignDialog = () => setAssignDialogOpen(false);
  const handleOpenEscalateDialog = () => setEscalateDialogOpen(true);
  const handleCloseEscalateDialog = () => setEscalateDialogOpen(false);

  /**
   * Handler functions for input changes
   */
  const handleCommentChange = (event: React.ChangeEvent<HTMLInputElement>) => setComment(event.target.value);
  const handleResolutionNotesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => setResolutionNotes(event.target.value);
  const handleEscalationNotesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => setEscalationNotes(event.target.value);
  const handleAssigneeChange = (event: React.ChangeEvent<HTMLSelectElement>) => setAssignee(event.target.value);

  // Render DetailPanel component with exception details if an exception is selected
  return (
    <StyledExceptionDetail className={className}>
      {exception ? (
        <>
          <DetailSection>
            <SectionTitle>Exception Details</SectionTitle>
            <SectionContent>
              <PropertyRow>
                <PropertyLabel>Type:</PropertyLabel>
                <PropertyValue>{exception.alertType}</PropertyValue>
              </PropertyRow>
              <PropertyRow>
                <PropertyLabel>Severity:</PropertyLabel>
                <PropertyValue>
                  <StatusIndicator status={exception.severity.toLowerCase()} label={exception.severity} size="small" showIcon={false} />
                </PropertyValue>
              </PropertyRow>
              <PropertyRow>
                <PropertyLabel>Status:</PropertyLabel>
                <PropertyValue>
                  <StatusIndicator status={exception.status.toLowerCase()} label={exception.status} size="small" showIcon={false} />
                </PropertyValue>
              </PropertyRow>
              <PropertyRow>
                <PropertyLabel>Timestamp:</PropertyLabel>
                <PropertyValue>{formatTimestamp(exception.timestamp)} ({formatTimeDistance(exception.timestamp)})</PropertyValue>
              </PropertyRow>
              <PropertyRow>
                <PropertyLabel>Message:</PropertyLabel>
                <PropertyValue>{exception.message}</PropertyValue>
              </PropertyRow>
            </SectionContent>
          </DetailSection>

          <ActionBar>
            <Button variant="contained" color="primary" onClick={handleAcknowledge} disabled={submitting || exception.status === 'Acknowledged'}>
              Acknowledge
            </Button>
            <Button variant="contained" color="success" onClick={handleOpenResolveDialog} disabled={submitting || exception.status === 'Resolved'}>
              Resolve
            </Button>
            <Button variant="contained" color="warning" onClick={handleOpenAssignDialog} disabled={submitting}>
              Assign
            </Button>
            <Button variant="contained" color="error" onClick={handleOpenEscalateDialog} disabled={submitting}>
              Escalate
            </Button>
          </ActionBar>
        </>
      ) : (
        <Typography>No exception selected.</Typography>
      )}
    </StyledExceptionDetail>
  );
});

ExceptionDetail.displayName = 'ExceptionDetail';

export default ExceptionDetail;