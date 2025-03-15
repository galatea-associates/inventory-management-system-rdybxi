import React, { useMemo } from 'react'; // React v18.2
import { useSelector } from 'react-redux'; // react-redux v8.0.5
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, useTheme } from '@mui/material'; // @mui/material ^5.13
import dayjs from 'dayjs'; // dayjs v1.11.7
import ChartContainer from '../../components/data/ChartContainer';
import LineChart from '../../components/data/LineChart';
import {
  SettlementDay,
  SettlementLadder as SettlementLadderType,
} from '../../types/models';
import { RootState } from '../../types/state';
import { selectSettlementLadder } from '../../state/positions/positionsSelectors';
import { formatNumber } from '../../utils/formatter';
import { formatDate } from '../../utils/date';

/**
 * Props for the SettlementLadder component
 */
export interface SettlementLadderProps {
  /**
   * The security ID for which to display the settlement ladder
   */
  securityId: string;
  /**
   * The book ID for which to display the settlement ladder
   */
  bookId: string;
  /**
   * The height of the chart
   */
  height: number | string;
  /**
   * The width of the chart
   */
  width: number | string;
  /**
   * Whether the data is loading
   */
  loading: boolean;
  /**
   * Any error that occurred during data loading
   */
  error: Error | string | null;
  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * Interface for chart series data
 */
interface ChartSeries {
  name: string;
  key: string;
  color: string;
  showArea: boolean;
  areaOpacity: number;
}

/**
 * Styled container for the settlement ladder chart
 */
const ChartWrapper = styled(Box)<{ height?: number | string }>`
  width: 100%;
  height: ${props => props.height || '300px'};
  display: flex;
  flex-direction: column;
`;

/**
 * Transforms settlement ladder data into format suitable for LineChart
 * @param settlementDays - Array of settlement days
 * @returns Transformed data for chart visualization
 */
const transformSettlementData = (settlementDays: SettlementDay[]): object[] => {
  return settlementDays.map(day => ({
    date: dayjs(day.date).toDate(),
    deliveries: day.deliveries,
    receipts: day.receipts,
    net: day.net,
    projectedPosition: day.projectedPosition,
  }));
};

/**
 * Formats tooltip content for settlement ladder chart
 * @param dataPoint - Data point for the tooltip
 * @returns Formatted tooltip HTML content
 */
const formatTooltip = (dataPoint: any): string => {
  const date = formatDate(dataPoint.date, 'MMM DD, YYYY');
  const deliveries = formatNumber(dataPoint.deliveries, 0);
  const receipts = formatNumber(dataPoint.receipts, 0);
  const net = formatNumber(dataPoint.net, 0);

  return `
    ${date}
    <br>Deliveries: ${deliveries}
    <br>Receipts: ${receipts}
    <br>Net: ${net}
  `;
};

/**
 * Component that visualizes settlement ladder data for positions
 */
const SettlementLadder: React.FC<SettlementLadderProps> = React.memo(({
  securityId,
  bookId,
  height,
  width,
  loading,
  error,
  className,
}) => {
  // Initialize Redux selector hook
  const settlementLadderSelector = useMemo(() => selectSettlementLadder, []);

  // Get current theme for styling
  const theme = useTheme();

  // Select settlement ladder data from Redux state
  const settlementLadderData: SettlementLadderType[] = useSelector((state: RootState) => settlementLadderSelector(state));

  // Transform settlement ladder data into format suitable for LineChart
  const settlementData = useMemo(() => {
    const ladder = settlementLadderData;
    if (!ladder) {
      return [];
    }
    return transformSettlementData(ladder);
  }, [settlementLadderData]);

  // Create series data for deliveries, receipts, and net settlement
  const series: ChartSeries[] = useMemo(() => [
    {
      name: 'Deliveries',
      key: 'deliveries',
      color: theme.palette.error.main,
      showArea: true,
      areaOpacity: 0.3,
    },
    {
      name: 'Receipts',
      key: 'receipts',
      color: theme.palette.success.main,
      showArea: true,
      areaOpacity: 0.3,
    },
    {
      name: 'Net',
      key: 'net',
      color: theme.palette.primary.main,
      showArea: false,
      areaOpacity: 0,
    },
  ], [theme.palette]);

  // Define tooltip formatter function to display date, deliveries, receipts, and net values
  const tooltipFormatter = useMemo(() => (dataPoint: any) => {
    return formatTooltip(dataPoint);
  }, []);

  // Handle empty state when no settlement data is available
  const isEmptyData = useMemo(() => settlementData.length === 0, [settlementData]);

  return (
    <ChartContainer
      title="Settlement Ladder"
      loading={loading}
      error={error}
      isEmpty={isEmptyData}
      height={height}
      className={className}
    >
      <LineChart
        data={settlementData}
        xKey="date"
        yKey="net"
        xAxisLabel="Date"
        yAxisLabel="Net Settlement"
        tooltipFormat={tooltipFormatter}
        lineColor={theme.palette.primary.main}
        showPoints={false}
        showGrid={true}
        isTimeData={true}
        height={height}
      />
    </ChartContainer>
  );
});

export default SettlementLadder;