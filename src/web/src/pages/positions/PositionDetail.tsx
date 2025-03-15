import React, { useEffect, useMemo } from 'react'; // React v18.2
import { useSelector, useDispatch } from 'react-redux'; // react-redux v8.0.5
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Grid, Chip, Skeleton } from '@mui/material'; // @mui/material v5.13
import Card from '../../components/common/Card';
import Typography from '../../components/common/Typography';
import Divider from '../../components/common/Divider';
import SecurityInfo from '../../components/data/SecurityInfo';
import CounterpartyInfo from '../../components/data/CounterpartyInfo';
import SettlementLadder from './SettlementLadder';
import { Position } from '../../types/models';
import { RootState } from '../../types/state';
import { selectSelectedPosition, selectPositionsLoading, selectPositionsError } from '../../state/positions/positionsSelectors';
import { fetchSettlementLadder } from '../../state/positions/positionsSlice';
import { formatCurrency, formatQuantity, formatDateString, formatPositionValue, formatPositionValueWithColor } from '../../utils/formatter';

/**
 * Interface defining the props for the PositionDetail component.
 */
interface PositionDetailProps {
  position: Position | null;
  loading: boolean;
  error: Error | null;
  onClose: () => void;
  className?: string;
}

/**
 * Styled container for the position detail component.
 * Uses Emotion's styled API for creating styled components.
 */
const DetailContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow-y: auto;
  padding: 16px;
`;

/**
 * Styled container for each section of position details.
 */
const SectionContainer = styled(Box)`
  margin-bottom: 16px;
`;

/**
 * Styled title for each section.
 */
const SectionTitle = styled(Typography)`
  font-weight: 600;
  margin-bottom: 8px;
`;

/**
 * Styled row for detail items.
 */
const DetailRow = styled(Grid)`
  margin-bottom: 8px;
`;

/**
 * Styled label for detail items.
 */
const DetailLabel = styled(Typography)`
  font-weight: 500;
  color: text.secondary;
`;

/**
 * Styled value for detail items.
 */
const DetailValue = styled(Typography)`
  font-weight: 400;
`;

/**
 * Styled container for settlement ladder chart.
 */
const SettlementChartContainer = styled(Box)`
  height: 200px;
  width: 100%;
  margin-bottom: 16px;
`;

/**
 * Styled chip for status indicators.
 */
const StatusChip = styled(Chip)`
  height: 24px;
  font-size: 0.75rem;
`;

/**
 * Styled container for error messages.
 */
const ErrorContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 16px;
  color: error.main;
  text-align: center;
`;

/**
 * Styled container for empty state.
 */
const EmptyContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 16px;
  text-align: center;
`;

/**
 * Renders the position details section with quantities and values.
 * @param position - The position object containing the data.
 * @returns JSX.Element - The rendered position details section.
 */
const renderPositionDetails = (position: Position): JSX.Element => {
  return (
    <Grid container spacing={2}>
      <DetailRow item xs={6}>
        <DetailLabel variant="body2">Business Date</DetailLabel>
        <DetailValue variant="body1">{formatDateString(position.businessDate)}</DetailValue>
      </DetailRow>
      <DetailRow item xs={6}>
        <DetailLabel variant="body2">Position Type</DetailLabel>
        <DetailValue variant="body1">{position.positionType}</DetailValue>
      </DetailRow>
      <DetailRow item xs={6}>
        <DetailLabel variant="body2">Book ID</DetailLabel>
        <DetailValue variant="body1">{position.bookId}</DetailValue>
      </DetailRow>
      <DetailRow item xs={6}>
        <DetailLabel variant="body2">Contractual Quantity</DetailLabel>
        <DetailValue variant="body1">{formatQuantity(position.contractualQty)}</DetailValue>
      </DetailRow>
      <DetailRow item xs={6}>
        <DetailLabel variant="body2">Settled Quantity</DetailLabel>
        <DetailValue variant="body1">{formatQuantity(position.settledQty)}</DetailValue>
      </DetailRow>
      <DetailRow item xs={6}>
        <DetailLabel variant="body2">Market Value</DetailLabel>
        <DetailValue variant="body1">{formatCurrency(position.marketValue, position.security.currency)}</DetailValue>
      </DetailRow>
    </Grid>
  );
};

/**
 * Renders the settlement details section with settlement ladder.
 * @param position - The position object containing the data.
 * @param loading - A boolean indicating whether the data is loading.
 * @param error - An error object or null if there is no error.
 * @returns JSX.Element - The rendered settlement details section.
 */
const renderSettlementDetails = (position: Position, loading: boolean, error: Error | null): JSX.Element => {
  return (
    <SectionContainer>
      <SectionTitle variant="h6">Settlement Details</SectionTitle>
      <SettlementChartContainer>
        <SettlementLadder
          securityId={position.security.internalId}
          bookId={position.bookId}
          height="200px"
          loading={loading}
          error={error}
        />
      </SettlementChartContainer>
      <Grid container spacing={2}>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">SD0 Deliver</DetailLabel>
          <DetailValue variant="body1">{formatQuantity(position.sd0Deliver)}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">SD0 Receipt</DetailLabel>
          <DetailValue variant="body1">{formatQuantity(position.sd0Receipt)}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">SD1 Deliver</DetailLabel>
          <DetailValue variant="body1">{formatQuantity(position.sd1Deliver)}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">SD1 Receipt</DetailLabel>
          <DetailValue variant="body1">{formatQuantity(position.sd1Receipt)}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">SD2 Deliver</DetailLabel>
          <DetailValue variant="body1">{formatQuantity(position.sd2Deliver)}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">SD2 Receipt</DetailLabel>
          <DetailValue variant="body1">{formatQuantity(position.sd2Receipt)}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">SD3 Deliver</DetailLabel>
          <DetailValue variant="body1">{formatQuantity(position.sd3Deliver)}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">SD3 Receipt</DetailLabel>
          <DetailValue variant="body1">{formatQuantity(position.sd3Receipt)}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">SD4 Deliver</DetailLabel>
          <DetailValue variant="body1">{formatQuantity(position.sd4Deliver)}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">SD4 Receipt</DetailLabel>
          <DetailValue variant="body1">{formatQuantity(position.sd4Receipt)}</DetailValue>
        </DetailRow>
      </Grid>
    </SectionContainer>
  );
};

/**
 * Renders additional position attributes section.
 * @param position - The position object containing the data.
 * @returns JSX.Element - The rendered additional attributes section.
 */
const renderAdditionalAttributes = (position: Position): JSX.Element => {
  return (
    <SectionContainer>
      <SectionTitle variant="h6">Additional Attributes</SectionTitle>
      <Grid container spacing={2}>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">Hypothecatable</DetailLabel>
          <DetailValue variant="body1">{position.isHypothecatable ? 'Yes' : 'No'}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">Reserved</DetailLabel>
          <DetailValue variant="body1">{position.isReserved ? 'Yes' : 'No'}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">Aggregation Unit</DetailLabel>
          <DetailValue variant="body1">{position.aggregationUnit.name}</DetailValue>
        </DetailRow>
        <DetailRow item xs={6}>
          <DetailLabel variant="body2">Market</DetailLabel>
          <DetailValue variant="body1">{position.security.market}</DetailValue>
        </DetailRow>
      </Grid>
    </SectionContainer>
  );
};

/**
 * Renders loading skeleton while position data is being fetched.
 * @returns JSX.Element - The rendered loading skeleton.
 */
const renderLoadingSkeleton = (): JSX.Element => {
  return (
    <DetailContainer>
      <SectionContainer>
        <Skeleton variant="text" width={200} height={24} />
        <Skeleton variant="text" width={150} height={20} />
      </SectionContainer>
      <SectionContainer>
        <Skeleton variant="rectangular" width="100%" height={200} />
      </SectionContainer>
      <SectionContainer>
        <Skeleton variant="text" width={150} height={24} />
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => (
            <DetailRow item xs={6} key={i}>
              <Skeleton variant="text" width={80} height={20} />
              <Skeleton variant="text" width={100} height={20} />
            </DetailRow>
          ))}
        </Grid>
      </SectionContainer>
    </DetailContainer>
  );
};

/**
 * Component that displays detailed information about a selected position.
 * @param props - The props for the component.
 * @returns JSX.Element - The rendered component.
 */
const PositionDetail: React.FC<PositionDetailProps> = React.memo(({ position: propPosition, loading: propLoading, error: propError, onClose, className }) => {
  // Initialize Redux dispatch and selector hooks
  const dispatch = useDispatch();
  const selectedPosition = useSelector((state: RootState) => selectSelectedPosition(state));
  const loading = useSelector((state: RootState) => selectPositionsLoading(state));
  const error = useSelector((state: RootState) => selectPositionsError(state));

  // Use the position from props if provided, otherwise use the selected position from Redux
  const position = propPosition || selectedPosition;
  const isLoading = propLoading || loading;
  const hasError = propError || error;

  // Fetch settlement ladder data when position changes
  useEffect(() => {
    if (position) {
      dispatch(fetchSettlementLadder({ bookId: position.bookId, securityId: position.security.internalId, businessDate: position.businessDate }));
    }
  }, [position, dispatch]);

  // Render loading skeleton if position is loading
  if (isLoading) {
    return renderLoadingSkeleton();
  }

  // Render error message if there's an error
  if (hasError) {
    return (
      <DetailContainer>
        <ErrorContainer>
          <Typography variant="h6" color="error">Error</Typography>
          <Typography variant="body2" color="error">{hasError instanceof Error ? hasError.message : hasError}</Typography>
        </ErrorContainer>
      </DetailContainer>
    );
  }

  // Render empty state if no position is selected
  if (!position) {
    return (
      <DetailContainer>
        <EmptyContainer>
          <Typography variant="h6" color="textSecondary">No Position Selected</Typography>
          <Typography variant="body2" color="textSecondary">Please select a position to view details.</Typography>
        </EmptyContainer>
      </DetailContainer>
    );
  }

  // Render position details organized in sections
  return (
    <DetailContainer className={className}>
      <SectionContainer>
        <SectionTitle variant="h6">Security Information</SectionTitle>
        <SecurityInfo security={position.security} showHeader={false} />
      </SectionContainer>

      <SectionContainer>
        <SectionTitle variant="h6">Position Details</SectionTitle>
        {renderPositionDetails(position)}
      </SectionContainer>

      {renderSettlementDetails(position, isLoading, hasError)}

      <SectionContainer>
        <SectionTitle variant="h6">Counterparty Information</SectionTitle>
        <CounterpartyInfo counterparty={position.counterparty} showHeader={false} />
      </SectionContainer>

      {renderAdditionalAttributes(position)}
    </DetailContainer>
  );
});

PositionDetail.displayName = 'PositionDetail';

export default PositionDetail;