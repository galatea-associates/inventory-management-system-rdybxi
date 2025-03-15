import React from 'react';
import styled from '@emotion/styled';
import { Grid, Box, Chip } from '@mui/material';
import Card from '../common/Card';
import Typography from '../common/Typography';
import Divider from '../common/Divider';
import { 
  formatSecurityIdentifier, 
  formatPrice, 
  formatDateString, 
  formatCurrency 
} from '../../utils/formatter';
import { Security } from '../../types/models';

/**
 * Props for the SecurityInfo component
 */
export interface SecurityInfoProps {
  /** The security object to display information for */
  security: Security;
  /** Whether to show a compact version with fewer details */
  compact?: boolean;
  /** Whether to show the header with description and identifier */
  showHeader?: boolean;
  /** Whether to show the status indicator */
  showStatus?: boolean;
}

const StyledSecurityInfo = styled(Box)`
  width: 100%;
`;

const SecurityHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SecurityTitle = styled(Typography)`
  font-weight: 500;
`;

const SecurityIdentifier = styled(Typography)`
  color: text.secondary;
`;

const SecurityStatus = styled(Chip)`
  font-size: 0.75rem;
  height: 24px;
`;

const SecurityDetail = styled(Grid)`
  margin-bottom: 8px;
`;

const SecurityLabel = styled(Typography)`
  font-weight: 500;
  color: text.secondary;
`;

const SecurityValue = styled(Typography)`
  font-weight: 400;
`;

const SecurityTemperature = styled(Chip)`
  font-size: 0.75rem;
  height: 24px;
`;

/**
 * Displays detailed information about a security.
 * 
 * This component provides a standardized way to present security details
 * including identifiers, market information, and status across various
 * parts of the application.
 */
const SecurityInfo = React.memo(({ 
  security, 
  compact = false,
  showHeader = true,
  showStatus = true,
  ...props 
}: SecurityInfoProps) => {
  // Format the primary identifier
  const primaryIdentifier = formatSecurityIdentifier(
    security.primaryIdentifierValue,
    security.primaryIdentifierType
  );

  // Determine status color based on status value
  const getStatusColor = (status: string): 'success' | 'default' | 'warning' | 'error' => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'suspended':
        return 'warning';
      case 'delisted':
        return 'error';
      default:
        return 'default';
    }
  };

  // Determine temperature color and label
  const getTemperatureDisplay = (temperature: string) => {
    let color: 'success' | 'error' | 'default' = 'default';
    let label = temperature;

    switch (temperature.toUpperCase()) {
      case 'HTB':
        color = 'error';
        label = 'Hard to Borrow';
        break;
      case 'GC':
        color = 'success';
        label = 'General Collateral';
        break;
    }

    return { color, label };
  };

  const temperatureInfo = getTemperatureDisplay(security.securityTemperature);

  return (
    <StyledSecurityInfo {...props}>
      <Card variant="outlined" aria-label={`Security information for ${security.description}`}>
        {showHeader && (
          <>
            <SecurityHeader>
              <Box>
                <SecurityTitle variant="h5">
                  {security.description}
                </SecurityTitle>
                <SecurityIdentifier variant="body2">
                  {security.primaryIdentifierType}: {primaryIdentifier}
                </SecurityIdentifier>
              </Box>
              {showStatus && security.status && (
                <SecurityStatus 
                  label={security.status} 
                  color={getStatusColor(security.status)}
                  size="small"
                  aria-label={`Status: ${security.status}`}
                />
              )}
            </SecurityHeader>
            <Divider />
          </>
        )}

        <Grid container spacing={2} sx={{ mt: compact ? 0 : 1 }}>
          <SecurityDetail item xs={6} md={compact ? 4 : 3}>
            <SecurityLabel variant="body2">Security Type</SecurityLabel>
            <SecurityValue variant="body1" aria-label="Security Type">
              {security.securityType || 'N/A'}
            </SecurityValue>
          </SecurityDetail>
          
          <SecurityDetail item xs={6} md={compact ? 4 : 3}>
            <SecurityLabel variant="body2">Issuer</SecurityLabel>
            <SecurityValue variant="body1" aria-label="Issuer">
              {security.issuer || 'N/A'}
            </SecurityValue>
          </SecurityDetail>
          
          <SecurityDetail item xs={6} md={compact ? 4 : 3}>
            <SecurityLabel variant="body2">Market</SecurityLabel>
            <SecurityValue variant="body1" aria-label="Market">
              {security.market || 'N/A'}
            </SecurityValue>
          </SecurityDetail>
          
          {!compact && (
            <SecurityDetail item xs={6} md={3}>
              <SecurityLabel variant="body2">Exchange</SecurityLabel>
              <SecurityValue variant="body1" aria-label="Exchange">
                {security.exchange || 'N/A'}
              </SecurityValue>
            </SecurityDetail>
          )}

          {!compact && (
            <>
              {security.issueDate && (
                <SecurityDetail item xs={6} md={3}>
                  <SecurityLabel variant="body2">Issue Date</SecurityLabel>
                  <SecurityValue variant="body1" aria-label="Issue Date">
                    {formatDateString(security.issueDate)}
                  </SecurityValue>
                </SecurityDetail>
              )}
              
              {security.maturityDate && (
                <SecurityDetail item xs={6} md={3}>
                  <SecurityLabel variant="body2">Maturity Date</SecurityLabel>
                  <SecurityValue variant="body1" aria-label="Maturity Date">
                    {formatDateString(security.maturityDate)}
                  </SecurityValue>
                </SecurityDetail>
              )}
              
              {security.price !== undefined && (
                <SecurityDetail item xs={6} md={3}>
                  <SecurityLabel variant="body2">Price</SecurityLabel>
                  <SecurityValue variant="body1" aria-label="Price">
                    {formatCurrency(security.price, security.currency)}
                  </SecurityValue>
                </SecurityDetail>
              )}
            </>
          )}
          
          {security.securityTemperature && (
            <SecurityDetail item xs={6} md={compact ? 4 : 3}>
              <SecurityLabel variant="body2">Temperature</SecurityLabel>
              <SecurityValue variant="body1">
                <SecurityTemperature 
                  label={temperatureInfo.label}
                  color={temperatureInfo.color}
                  size="small"
                  aria-label={`Temperature: ${temperatureInfo.label}`}
                />
              </SecurityValue>
            </SecurityDetail>
          )}
        </Grid>
      </Card>
    </StyledSecurityInfo>
  );
});

SecurityInfo.displayName = 'SecurityInfo';

export default SecurityInfo;