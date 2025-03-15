import React from 'react'; // React v18.x - Core React library for component creation
import { useSelector } from 'react-redux'; // react-redux v8.x - Hook to access Redux state
import Summary from '../../components/data/Summary'; // Component for displaying summary metrics in a grid
import { SummaryItemProps } from '../../components/data/SummaryItem'; // Type definition for summary item properties
import { // Selectors for accessing position data from Redux state
  selectPositionSummary,
  selectTotalLongValue,
  selectTotalShortValue,
  selectNetPositionValue,
  selectPositions,
} from '../../state/positions/positionsSelectors';
import { // Utilities for formatting currency values
  formatCurrency,
  formatShortCurrency,
} from '../../utils/formatter';
import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // @mui/icons-material v5.13 - Icon for positive trend indicator
import TrendingDownIcon from '@mui/icons-material/TrendingDown'; // @mui/icons-material v5.13 - Icon for negative trend indicator
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'; // @mui/icons-material v5.13 - Icon for total balance
import ShowChartIcon from '@mui/icons-material/ShowChart'; // @mui/icons-material v5.13 - Icon for positions

/**
 * Renders a summary of position data with key metrics
 * @returns Rendered position summary component
 */
const PositionSummary = React.memo(() => {
  // Use useSelector to get position summary data from Redux state
  const positionSummary = useSelector(selectPositionSummary);

  // Use useSelector to get total long value, total short value, and net position value
  const totalLongValue = useSelector(selectTotalLongValue);
  const totalShortValue = useSelector(selectTotalShortValue);
  const netPositionValue = useSelector(selectNetPositionValue);

  // Use useSelector to get the positions array to count securities
  const positions = useSelector(selectPositions);
  const securityCount = positions.length;

  // Create an array of summary items with labels, values, and icons
  const summaryItems: SummaryItemProps[] = [
    {
      label: 'Total Long',
      value: totalLongValue,
      format: 'currency',
      icon: React.createElement(TrendingUpIcon),
    },
    {
      label: 'Total Short',
      value: totalShortValue,
      format: 'currency',
      icon: React.createElement(TrendingDownIcon),
    },
    {
      label: 'Net',
      value: netPositionValue,
      format: 'currency',
      icon: React.createElement(AccountBalanceIcon),
    },
    {
      label: 'Securities',
      value: securityCount,
      format: 'number',
      icon: React.createElement(ShowChartIcon),
    },
  ];

  // Return a Summary component with the summary items
  return (
    <Summary
      items={summaryItems}
      columns={4}
      spacing={16}
      className="position-summary"
      id="position-summary"
    />
  );
});

// Export the PositionSummary component for use in the Positions page
export default PositionSummary;