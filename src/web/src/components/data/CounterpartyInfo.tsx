import React from 'react';
import styled from '@emotion/styled'; // ^11.10.6
import { Grid, Box, Chip } from '@mui/material'; // 5.13
import Card from '../common/Card';
import Typography from '../common/Typography';
import Divider from '../common/Divider';
import { formatCounterpartyIdentifier } from '../../utils/formatter';
import { Counterparty } from '../../types/models';

/**
 * Props for the CounterpartyInfo component
 */
export interface CounterpartyInfoProps {
  counterparty: Counterparty;
  compact?: boolean;
  showHeader?: boolean;
  showStatus?: boolean;
}

/**
 * Styled container for the counterparty information
 */
const StyledCounterpartyInfo = styled(Box)`
  width: 100%;
`;

/**
 * Styled header for the counterparty information
 */
const CounterpartyHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

/**
 * Styled title for the counterparty name
 */
const CounterpartyTitle = styled(Typography)`
  font-weight: 500;
`;

/**
 * Styled component for counterparty identifier
 */
const CounterpartyIdentifier = styled(Typography)`
  color: text.secondary;
`;

/**
 * Styled component for counterparty status indicator
 */
const CounterpartyStatus = styled(Chip)`
  font-size: 0.75rem;
  height: 24px;
`;

/**
 * Styled component for counterparty detail items
 */
const CounterpartyDetail = styled(Grid)`
  margin-bottom: 8px;
`;

/**
 * Styled label for counterparty detail items
 */
const CounterpartyLabel = styled(Typography)`
  font-weight: 500;
  color: text.secondary;
`;

/**
 * Styled value for counterparty detail items
 */
const CounterpartyValue = styled(Typography)`
  font-weight: 400;
`;

/**
 * Styled component for KYC status indicator
 */
const KycStatus = styled(Chip)`
  font-size: 0.75rem;
  height: 24px;
`;

/**
 * A reusable component for displaying detailed information about a counterparty
 * in the Inventory Management System. This component provides a standardized way
 * to present counterparty details including identifiers, type, status, and KYC information.
 * 
 * @param counterparty - The counterparty entity to display
 * @param compact - If true, displays a more compact version of the component
 * @param showHeader - If true, displays the header with name and primary identifier
 * @param showStatus - If true, displays status indicators
 */
const CounterpartyInfo = React.memo(({
  counterparty,
  compact = false,
  showHeader = true,
  showStatus = true,
  ...props
}: CounterpartyInfoProps) => {
  if (!counterparty) {
    return null;
  }

  // Format the primary identifier
  const primaryIdentifier = counterparty.identifiers && counterparty.identifiers.length > 0 
    ? formatCounterpartyIdentifier(
        counterparty.identifiers[0].identifierValue, 
        counterparty.identifiers[0].identifierType
      )
    : counterparty.counterpartyId;

  // Determine status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Determine KYC status color
  const getKycStatusColor = (kycStatus: string) => {
    switch (kycStatus.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <StyledCounterpartyInfo {...props}>
      {showHeader && (
        <CounterpartyHeader>
          <Box>
            <CounterpartyTitle variant="h6">
              {counterparty.name}
            </CounterpartyTitle>
            <CounterpartyIdentifier variant="body2">
              {primaryIdentifier}
            </CounterpartyIdentifier>
          </Box>
          {showStatus && counterparty.status && (
            <CounterpartyStatus
              label={counterparty.status}
              color={getStatusColor(counterparty.status) as any}
              size="small"
            />
          )}
        </CounterpartyHeader>
      )}

      <Grid container spacing={compact ? 1 : 2}>
        {!compact && (
          <CounterpartyDetail item xs={12} sm={6}>
            <CounterpartyLabel variant="body2">ID</CounterpartyLabel>
            <CounterpartyValue>{counterparty.counterpartyId}</CounterpartyValue>
          </CounterpartyDetail>
        )}

        <CounterpartyDetail item xs={12} sm={compact ? 6 : 6}>
          <CounterpartyLabel variant="body2">Type</CounterpartyLabel>
          <CounterpartyValue>{counterparty.type}</CounterpartyValue>
        </CounterpartyDetail>

        {counterparty.kycStatus && (
          <CounterpartyDetail item xs={12} sm={compact ? 6 : 6}>
            <CounterpartyLabel variant="body2">KYC Status</CounterpartyLabel>
            <KycStatus
              label={counterparty.kycStatus}
              color={getKycStatusColor(counterparty.kycStatus) as any}
              size="small"
            />
          </CounterpartyDetail>
        )}

        {!compact && counterparty.identifiers && counterparty.identifiers.length > 0 && (
          <>
            <Grid item xs={12}>
              <Divider />
              <CounterpartyLabel variant="body2" style={{ marginTop: '16px', marginBottom: '8px' }}>
                Identifiers
              </CounterpartyLabel>
            </Grid>
            {counterparty.identifiers.map((identifier, index) => (
              <CounterpartyDetail item xs={12} sm={6} key={identifier.id || index}>
                <CounterpartyLabel variant="body2">
                  {identifier.identifierType}
                </CounterpartyLabel>
                <CounterpartyValue>
                  {formatCounterpartyIdentifier(
                    identifier.identifierValue,
                    identifier.identifierType
                  )}
                </CounterpartyValue>
              </CounterpartyDetail>
            ))}
          </>
        )}
      </Grid>
    </StyledCounterpartyInfo>
  );
});

CounterpartyInfo.displayName = 'CounterpartyInfo';

export default CounterpartyInfo;