import React, { useMemo, useCallback } from 'react'; // react ^18.2
import { Box, useTheme } from '@mui/material'; // @mui/material ^5.13
import ChartContainer from '../../components/data/ChartContainer';
import BarChart from '../../components/data/BarChart';
import { getTopSecurities } from '../../api/inventory';
import { useApiQuery } from '../../hooks/useApi';
import { formatNumber } from '../../utils/formatter';

/**
 * @ interface TopSecuritiesProps
 */
export interface TopSecuritiesProps {
  businessDate: string;
  calculationType: string;
  limit: number;
  market?: string;
  securityTemperature?: string;
  height?: number | string;
  onSecurityClick?: (securityId: string) => void;
}

/**
 * @ interface TopSecurityData
 */
interface TopSecurityData {
  securityId: string;
  security: string;
  quantity: number;
  value: number;
}

/**
 * @ interface ApiTopSecurityResponse
 */
interface ApiTopSecurityResponse {
  security: {
    id: string;
    internalId: string;
    description: string;
  };
  availableQuantity: number;
  marketValue: number;
}

/**
 * @defaultProps
 */
const defaultProps = {
  limit: 10,
  height: 300,
};

/**
 * @React.memo
 * @function TopSecurities
 * @param {TopSecuritiesProps} props
 * @returns {JSX.Element}
 */
const TopSecurities: React.FC<TopSecuritiesProps> = React.memo((props: TopSecuritiesProps): JSX.Element => {
  // LD1: Destructure props including businessDate, calculationType, limit, market, securityTemperature, height, and onSecurityClick
  const { businessDate, calculationType, limit, market, securityTemperature, height, onSecurityClick } = props;

  // LD1: Use useTheme hook to get current theme for styling
  const theme = useTheme();

  // LD1: Use useApiQuery hook to fetch top securities data from the API
  const { data, loading, error } = useApiQuery<ApiTopSecurityResponse[]>(
    getTopSecurities.name,
    { businessDate, calculationType, limit, market, securityTemperature },
    {},
    { autoNotifyError: false }
  );

  // LD1: Process the API response data to format it for the bar chart
  const chartData: TopSecurityData[] = useMemo(() => {
    return processChartData(data);
  }, [data]);

  // LD1: Create a memoized tooltipFormat function for displaying tooltips on hover
  const tooltipFormat = useCallback((d: TopSecurityData) => {
    return `${d.security}: ${formatNumber(d.quantity, 0)}`;
  }, []);

  // LD1: Create a memoized handleBarClick callback for handling clicks on chart bars
  const handleBarClick = useCallback((securityId: string) => {
    if (onSecurityClick) {
      onSecurityClick(securityId);
    }
  }, [onSecurityClick]);

  // LD1: Return a ChartContainer component with loading and error states
  return (
    <ChartContainer title="Top Securities by Availability" loading={loading} error={error} height={height}>
      {chartData && chartData.length > 0 ? (
        // LD1: Render the BarChart component inside the ChartContainer when data is available
        <BarChart
          data={chartData}
          xKey="security"
          yKey="quantity"
          barColor="primary.main"
          tooltipFormat={tooltipFormat}
          onBarClick={(d: TopSecurityData) => handleBarClick(d.securityId)}
        />
      ) : (
        // LD1: Display empty state when no data is available
        <Box sx={{ textAlign: 'center', p: 2 }}>No data available</Box>
      )}
    </ChartContainer>
  );
});

/**
 * @function processChartData
 * @param {Array<{ security: { id: string; internalId: string; description: string }; availableQuantity: number; marketValue: number }>} data
 * @returns {Array<{ securityId: string; security: string; quantity: number; value: number }>}
 */
const processChartData = (
  data: Array<{
    security: { id: string; internalId: string; description: string };
    availableQuantity: number;
    marketValue: number;
  }> | null
): TopSecurityData[] => {
  if (!data) {
    return [];
  }

  // LD1: Map through the API response data
  return data.map((item) => {
    // LD1: Extract security description, ID, available quantity, and market value
    const { security, availableQuantity, marketValue } = item;
    const { id, description } = security;

    // LD1: Format security descriptions to handle long names
    const securityName = description.length > 20 ? `${description.substring(0, 20)}...` : description;

    // LD1: Return an array of objects with the processed data
    return {
      securityId: id,
      security: securityName,
      quantity: availableQuantity,
      value: marketValue,
    };
  });
};

TopSecurities.defaultProps = defaultProps;

export default TopSecurities;

// IE3: Be generous about your exports so long as it doesn't create a security risk.
// IE1: For internal imports, check that your imported items are used correctly based on the source files provided to you.
// IE2: For third-party or external imports, you must include the library version as a comment near the import.
// S1: You must use an enterprise-ready and production-appropriate coding style, always documenting your approach where necessary.
// LD1: You must always use an extremely extensive level of detail and generate code for every single item mentioned in the JSON specification.
// LD2: You must ensure that you implement everything completely, based on the technical specification, and do not leave anything incomplete, unimplemented or pending.