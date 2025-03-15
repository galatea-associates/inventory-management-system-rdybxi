import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Grid, Paper, Tabs, Tab, TextField } from '@mui/material'; // @mui/material ^5.13
import { DatePicker } from '@mui/x-date-pickers'; // @mui/x-date-pickers ^6.0
import { useDispatch, useSelector } from '../../state'; // Redux hooks for state management
import { RootState } from '../../types/state'; // Type definition for Redux state
import { LocateRequest, LocateApproval, LocateRejection } from '../../types/models'; // Type definitions for locate-related data models
import { approveLocate, rejectLocate } from '../../state/locates/locatesSlice'; // Redux actions for approving and rejecting locate requests
import { selectSelectedLocate, selectLocatesLoading } from '../../state/locates/locatesSelectors'; // Redux selectors for locate state
import Card from '../../components/common/Card'; // Card component for containing sections of the detail view
import Button from '../../components/common/Button'; // Button component for actions like approve and reject
import Typography from '../../components/common/Typography'; // Typography component for text display
import Divider from '../../components/common/Divider'; // Divider component for separating sections
import SecurityInfo from '../../components/data/SecurityInfo'; // Component for displaying security information
import CounterpartyInfo from '../../components/data/CounterpartyInfo'; // Component for displaying counterparty information
import StatusIndicator from '../../components/data/StatusIndicator'; // Component for displaying status indicators
import { formatDate, formatNumber, formatCurrency } from '../../utils/formatter'; // Utility functions for formatting data

/**
 * Interface for the props of the LocateDetail component
 */
interface LocateDetailProps {
  onApprove: (approvalData: LocateApproval) => void;
  onReject: (rejectionData: LocateRejection) => void;
  className?: string;
}

/**
 * Interface for the state of the approval form
 */
interface ApprovalFormData {
  approvedQuantity: number;
  decrementQuantity: number;
  expiryDate: Date | null;
  comments: string;
}

/**
 * Interface for the state of the rejection form
 */
interface RejectionFormData {
  rejectionReason: string;
  comments: string;
}

/**
 * Styled components for layout and styling
 */
const DetailContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  padding: 16px;
`;

const DetailCard = styled(Card)`
  margin-bottom: 16px;
  padding: 16px;
`;

const SectionTitle = styled(Typography)`
  font-weight: 500;
  margin-bottom: 8px;
`;

const DetailRow = styled(Box)`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const DetailLabel = styled(Typography)`
  font-weight: 500;
  color: text.secondary;
`;

const DetailValue = styled(Typography)`
  text-align: right;
`;

const FormContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ButtonContainer = styled(Box)`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

const TabsContainer = styled(Box)`
  border-bottom: 1px solid divider;
  margin-bottom: 16px;
`;

const EmptyState = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
`;

const LoadingContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

/**
 * Main component for displaying locate request details
 */
const LocateDetail: React.FC<LocateDetailProps> = ({ onApprove, onReject, className }) => {
  const dispatch = useDispatch();
  const selectedLocate = useSelector(selectSelectedLocate);
  const loading = useSelector(selectLocatesLoading);

  const [approvalFormData, setApprovalFormData] = useState<ApprovalFormData>({
    approvedQuantity: 0,
    decrementQuantity: 0,
    expiryDate: null,
    comments: '',
  });

  const [rejectionFormData, setRejectionFormData] = useState<RejectionFormData>({
    rejectionReason: '',
    comments: '',
  });

  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleApproveSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedLocate) return;

    const approvalData: LocateApproval = {
      id: '', // The API will generate the ID
      approvalId: '', // The API will generate the ID
      requestId: selectedLocate.id,
      approvedQuantity: approvalFormData.approvedQuantity,
      decrementQuantity: approvalFormData.decrementQuantity,
      approvalTimestamp: new Date().toISOString(),
      approvedBy: 'currentUser', // Replace with actual user
      expiryDate: approvalFormData.expiryDate ? approvalFormData.expiryDate.toISOString() : new Date().toISOString(),
      comments: approvalFormData.comments,
    };

    onApprove(approvalData);
    setApprovalFormData({ approvedQuantity: 0, decrementQuantity: 0, expiryDate: null, comments: '' });
  }, [approvalFormData, onApprove, selectedLocate]);

  const handleRejectSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedLocate) return;

    const rejectionData: LocateRejection = {
      id: '', // The API will generate the ID
      rejectionId: '', // The API will generate the ID
      requestId: selectedLocate.id,
      rejectionReason: rejectionFormData.rejectionReason,
      rejectionTimestamp: new Date().toISOString(),
      rejectedBy: 'currentUser', // Replace with actual user
      comments: rejectionFormData.comments,
    };

    onReject(rejectionData);
    setRejectionFormData({ rejectionReason: '', comments: '' });
  }, [rejectionFormData, onReject, selectedLocate]);

  const handleApprovalChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setApprovalFormData(prev => ({ ...prev, [name]: Number(value) }));
  }, []);

  const handleRejectionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setRejectionFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleExpiryDateChange = useCallback((date: Date | null) => {
    setApprovalFormData(prev => ({ ...prev, expiryDate: date }));
  }, []);

  const getStatusType = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'EXPIRED':
        return 'info';
      case 'CANCELLED':
        return 'default';
      default:
        return 'default';
    }
  };

  if (!selectedLocate) {
    return (
      <DetailContainer className={className}>
        <EmptyState>
          <Typography variant="h6">No Locate Request Selected</Typography>
          <Typography variant="body2">Please select a locate request to view details.</Typography>
        </EmptyState>
      </DetailContainer>
    );
  }

  if (loading) {
    return (
      <DetailContainer className={className}>
        <LoadingContainer>
          <Typography variant="body1">Loading Locate Details...</Typography>
        </LoadingContainer>
      </DetailContainer>
    );
  }

  return (
    <DetailContainer className={className}>
      <TabsContainer>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Locate Details Tabs">
          <Tab label="Details" />
          <Tab label="Approval" />
          <Tab label="Rejection" />
        </Tabs>
      </TabsContainer>

      {activeTab === 0 && (
        <>
          <SecurityInfo security={selectedLocate.security} />
          <CounterpartyInfo counterparty={selectedLocate.client} />

          <DetailCard>
            <SectionTitle variant="h6">Locate Request Details</SectionTitle>
            <DetailRow>
              <DetailLabel variant="body2">Request ID:</DetailLabel>
              <DetailValue variant="body1">{selectedLocate.requestId}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel variant="body2">Status:</DetailLabel>
              <DetailValue variant="body1">
                <StatusIndicator status={getStatusType(selectedLocate.status)} label={selectedLocate.status} />
              </DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel variant="body2">Quantity:</DetailLabel>
              <DetailValue variant="body1">{formatNumber(selectedLocate.requestedQuantity, 0)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel variant="body2">Type:</DetailLabel>
              <DetailValue variant="body1">{selectedLocate.locateType}</DetailValue>
            </DetailRow>
          </DetailCard>
        </>
      )}

      {activeTab === 1 && (
        <DetailCard>
          <SectionTitle variant="h6">Approve Locate Request</SectionTitle>
          <FormContainer component="form" onSubmit={handleApproveSubmit}>
            <TextField
              label="Approved Quantity"
              name="approvedQuantity"
              type="number"
              value={approvalFormData.approvedQuantity}
              onChange={handleApprovalChange}
              required
              fullWidth
            />
            <TextField
              label="Decrement Quantity"
              name="decrementQuantity"
              type="number"
              value={approvalFormData.decrementQuantity}
              onChange={handleApprovalChange}
              required
              fullWidth
            />
            <DatePicker
              label="Expiry Date"
              value={approvalFormData.expiryDate}
              onChange={handleExpiryDateChange}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <TextField
              label="Comments"
              name="comments"
              multiline
              rows={4}
              value={approvalFormData.comments}
              onChange={handleApprovalChange}
              fullWidth
            />
            <ButtonContainer>
              <Button type="submit" variant="contained" color="primary">
                Approve
              </Button>
            </ButtonContainer>
          </FormContainer>
        </DetailCard>
      )}

      {activeTab === 2 && (
        <DetailCard>
          <SectionTitle variant="h6">Reject Locate Request</SectionTitle>
          <FormContainer component="form" onSubmit={handleRejectSubmit}>
            <TextField
              label="Rejection Reason"
              name="rejectionReason"
              value={rejectionFormData.rejectionReason}
              onChange={handleRejectionChange}
              required
              fullWidth
            />
            <TextField
              label="Comments"
              name="comments"
              multiline
              rows={4}
              value={rejectionFormData.comments}
              onChange={handleRejectionChange}
              fullWidth
            />
            <ButtonContainer>
              <Button type="submit" variant="contained" color="error">
                Reject
              </Button>
            </ButtonContainer>
          </FormContainer>
        </DetailCard>
      )}
    </DetailContainer>
  );
};

export default LocateDetail;