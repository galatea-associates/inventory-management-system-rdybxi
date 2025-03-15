import React, { useState, useEffect, useCallback, useMemo } from 'react'; // React, { useState, useEffect, useCallback, useMemo } ^18.2.0
import styled from '@emotion/styled'; // styled components library for component styling @emotion/styled ^11.10.6
import { useDispatch, useSelector } from 'react-redux'; // Redux hooks for accessing and updating state react-redux ^8.0.5
import FilterPanel from '../../components/data/FilterPanel'; // Import FilterPanel component for standardized filtering interface
import { FilterDefinition, FilterPreset } from '../../components/data/FilterPanel'; // Import filter type definitions
import { selectLocateFilters } from '../../state/locates/locatesSelectors'; // Import selector for locate filters from Redux state
import { setLocateFilters, clearLocateFilters, filterLocateRequests } from '../../state/locates/locatesSlice'; // Import actions and thunks for locate filtering
import { LocateFilters } from '../../types/state'; // Import locate filters interface
import useDebounce from '../../hooks/useDebounce'; // Import debounce hook for optimizing filter changes
import useLocalStorage from '../../hooks/useLocalStorage'; // Import local storage hook for saving filter presets

// Styled container for the locate filters
const StyledFilterContainer = styled.div`
  margin-bottom: 16px; /* Sets margin and padding for proper spacing */
  padding: 8px;
  /* Ensures consistent styling with other filter components */
`;

interface LocateFiltersProps {
    onFilterChange: (filters: LocateFilters) => void;
    className?: string;
}

/**
 * A component that provides filtering capabilities for locate requests
 */
const LocateFilters: React.FC<LocateFiltersProps> = ({ onFilterChange, className }) => {
  // Set up Redux hooks for state access and dispatch
  const dispatch = useDispatch();
  const locateFilters = useSelector(selectLocateFilters);

  // Set up local state for filter values
  const [security, setSecurity] = useState<string | null>(locateFilters.securityId || null);
  const [requestor, setRequestor] = useState<string | null>(locateFilters.requestorId || null);
  const [client, setClient] = useState<string | null>(locateFilters.clientId || null);
  const [aggregationUnit, setAggregationUnit] = useState<string | null>(locateFilters.aggregationUnitId || null);
  const [status, setStatus] = useState<string | null>(locateFilters.status || null);
  const [locateType, setLocateType] = useState<string | null>(locateFilters.locateType || null);
  const [swapCashIndicator, setSwapCashIndicator] = useState<string | null>(locateFilters.swapCashIndicator || null);
  const [fromDate, setFromDate] = useState<string | null>(locateFilters.fromDate || null);
  const [toDate, setToDate] = useState<string | null>(locateFilters.toDate || null);

  // Set up debounced filter values to prevent excessive API calls
  const debouncedSecurity = useDebounce(security, 500);
  const debouncedRequestor = useDebounce(requestor, 500);
  const debouncedClient = useDebounce(client, 500);
  const debouncedAggregationUnit = useDebounce(aggregationUnit, 500);
  const debouncedStatus = useDebounce(status, 500);
  const debouncedLocateType = useDebounce(locateType, 500);
  const debouncedSwapCashIndicator = useDebounce(swapCashIndicator, 500);
  const debouncedFromDate = useDebounce(fromDate, 500);
  const debouncedToDate = useDebounce(toDate, 500);

  // Define filter definitions for security, client, status, date range, etc.
  const filterDefinitions: FilterDefinition[] = useMemo(() => [
    {
      id: 'securityId',
      label: 'Security',
      type: 'search',
      defaultValue: null,
    },
    {
      id: 'requestorId',
      label: 'Requestor',
      type: 'search',
      defaultValue: null,
    },
    {
      id: 'clientId',
      label: 'Client',
      type: 'search',
      defaultValue: null,
    },
    {
      id: 'aggregationUnitId',
      label: 'Aggregation Unit',
      type: 'search',
      defaultValue: null,
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: null,
      options: getStatusOptions(),
    },
    {
      id: 'locateType',
      label: 'Locate Type',
      type: 'select',
      defaultValue: null,
      options: getLocateTypeOptions(),
    },
    {
      id: 'swapCashIndicator',
      label: 'Swap/Cash',
      type: 'select',
      defaultValue: null,
      options: getSwapCashOptions(),
    },
    {
      id: 'fromDate',
      label: 'From Date',
      type: 'date',
      defaultValue: null,
    },
    {
      id: 'toDate',
      label: 'To Date',
      type: 'date',
      defaultValue: null,
    },
  ], []);

  // Load and manage filter presets from local storage
  const [filterPresets, setFilterPresets] = useLocalStorage<FilterPreset[]>('locateFilterPresets', []);

  // Handle filter value changes
  const handleFilterChange = useCallback((id: string, value: any) => {
    switch (id) {
      case 'securityId':
        setSecurity(value);
        break;
      case 'requestorId':
        setRequestor(value);
        break;
      case 'clientId':
        setClient(value);
        break;
      case 'aggregationUnitId':
        setAggregationUnit(value);
        break;
      case 'status':
        setStatus(value);
        break;
      case 'locateType':
        setLocateType(value);
        break;
      case 'swapCashIndicator':
        setSwapCashIndicator(value);
        break;
      case 'fromDate':
        setFromDate(value);
        break;
      case 'toDate':
        setToDate(value);
        break;
      default:
        break;
    }
  }, []);

  // Handle filter application with debounced values
  useEffect(() => {
    const filters: LocateFilters = {
      securityId: debouncedSecurity,
      requestorId: debouncedRequestor,
      clientId: debouncedClient,
      aggregationUnitId: debouncedAggregationUnit,
      status: debouncedStatus,
      locateType: debouncedLocateType,
      swapCashIndicator: debouncedSwapCashIndicator,
      fromDate: debouncedFromDate,
      toDate: debouncedToDate,
    };

    dispatch(setLocateFilters(filters));
    dispatch(filterLocateRequests({ filters, pagination: { page: 0, pageSize: 10, totalElements: 0, totalPages: 0, sort: ['requestTimestamp,desc'] } }));
    onFilterChange(filters);
  }, [debouncedSecurity, debouncedRequestor, debouncedClient, debouncedAggregationUnit, debouncedStatus, debouncedLocateType, debouncedSwapCashIndicator, debouncedFromDate, debouncedToDate, dispatch, onFilterChange]);

  // Handle filter reset
  const handleFilterReset = useCallback(() => {
    setSecurity(null);
    setRequestor(null);
    setClient(null);
    setAggregationUnit(null);
    setStatus(null);
    setLocateType(null);
    setSwapCashIndicator(null);
    setFromDate(null);
    setToDate(null);
    dispatch(clearLocateFilters());
    dispatch(filterLocateRequests({ filters: {}, pagination: { page: 0, pageSize: 10, totalElements: 0, totalPages: 0, sort: ['requestTimestamp,desc'] } }));
    onFilterChange({});
  }, [dispatch, onFilterChange]);

  // Handle filter preset saving and loading
  const handleSavePreset = useCallback((name: string, values: any) => {
    const newPreset: FilterPreset = {
      id: Math.random().toString(36).substring(2, 15),
      name,
      values,
    };
    setFilterPresets([...filterPresets, newPreset]);
  }, [filterPresets, setFilterPresets]);

  const handleDeletePreset = useCallback((id: string) => {
    setFilterPresets(filterPresets.filter(preset => preset.id !== id));
  }, [filterPresets, setFilterPresets]);

  // Render FilterPanel component with appropriate props
  return (
    <StyledFilterContainer className={className}>
      <FilterPanel
        title="Locate Filters"
        filters={filterDefinitions}
        values={{
          securityId: security,
          requestorId: requestor,
          clientId: client,
          aggregationUnitId: aggregationUnit,
          status: status,
          locateType: locateType,
          swapCashIndicator: swapCashIndicator,
          fromDate: fromDate,
          toDate: toDate,
        }}
        onChange={handleFilterChange}
        onApply={() => { }} // Apply is handled by useEffect with debounce
        onReset={handleFilterReset}
        onSave={handleSavePreset}
        onDelete={handleDeletePreset}
        presets={filterPresets}
      />
    </StyledFilterContainer>
  );
};

/**
 * Helper function to get status options for the status filter dropdown
 */
const getStatusOptions = () => {
  return [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];
};

/**
 * Helper function to get locate type options for the locate type filter dropdown
 */
const getLocateTypeOptions = () => {
  return [
    { value: 'SHORT', label: 'Short' },
    { value: 'LONG', label: 'Long' },
  ];
};

/**
 * Helper function to get swap cash indicator options for the swap cash filter dropdown
 */
const getSwapCashOptions = () => {
  return [
    { value: 'SWAP', label: 'Swap' },
    { value: 'CASH', label: 'Cash' },
  ];
};

export default LocateFilters;