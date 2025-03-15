import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import { useSelector } from 'react-redux'; // react-redux ^8.0.5
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import FilterPanel, { FilterDefinition, FilterPanelProps, FilterPreset } from '../../components/data/FilterPanel';
import DateUtil from '../../utils/date';
import useLocalStorage from '../../hooks/useLocalStorage';
import { InventoryFilters } from '../../types/state';

/**
 * Interface defining the props for the InventoryFilters component.
 */
interface InventoryFiltersProps {
  /**
   * Callback function to handle filter changes.
   * @param filters - The updated inventory filters.
   */
  onFilterChange: (filters: InventoryFilters) => void;
  /**
   * Initial filters to apply when the component is first loaded.
   */
  initialFilters?: InventoryFilters;
  /**
   * Optional CSS class name for styling the component.
   */
  className?: string;
}

/**
 * Styled container for the filter panel.
 * This component applies consistent styling to the filter panel, including margins, padding,
 * width, background color, and border radius. It also includes responsive styles for different screen sizes.
 */
const FilterContainer = styled.div`
  margin-bottom: 16px;
  width: 100%;
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 16px;

  @media (max-width: 768px) {
    padding: 8px;
  }
`;

/**
 * Creates filter definitions for the inventory filter panel.
 * This function defines the structure and behavior of each filter in the panel,
 * including the filter type, options, and default values.
 * @returns An array of filter definitions.
 */
const getFilterDefinitions = (): FilterDefinition[] => {
  return [
    {
      id: 'securityId',
      label: 'Security',
      type: 'search',
    },
    {
      id: 'counterpartyId',
      label: 'Counterparty',
      type: 'search',
    },
    {
      id: 'calculationType',
      label: 'Calculation Type',
      type: 'select',
      options: [
        { value: 'FOR_LOAN', label: 'For Loan' },
        { value: 'FOR_PLEDGE', label: 'For Pledge' },
        { value: 'OVERBORROW', label: 'Overborrow' },
        { value: 'LONG_SHORT_SELL', label: 'Long and Short Sell' },
        { value: 'LOCATE', label: 'Locate' },
      ],
    },
    {
      id: 'market',
      label: 'Market',
      type: 'select',
      options: [
        { value: 'US', label: 'United States' },
        { value: 'UK', label: 'United Kingdom' },
        { value: 'JP', label: 'Japan' },
        { value: 'HK', label: 'Hong Kong' },
        { value: 'SG', label: 'Singapore' },
        { value: 'AU', label: 'Australia' },
        { value: 'DE', label: 'Germany' },
        { value: 'FR', label: 'France' },
        { value: 'CH', label: 'Switzerland' },
        { value: 'TW', label: 'Taiwan' },
      ],
    },
    {
      id: 'businessDate',
      label: 'Business Date',
      type: 'date',
    },
    {
      id: 'securityTemperature',
      label: 'Security Temperature',
      type: 'select',
      options: [
        { value: 'HARD_TO_BORROW', label: 'Hard to Borrow' },
        { value: 'GENERAL_COLLATERAL', label: 'General Collateral' },
      ],
    },
    {
      id: 'isExternalSource',
      label: 'External Source',
      type: 'checkbox',
    },
  ];
};

/**
 * Handles changes to individual filter values.
 * This function updates the component's state with the new filter value for the specified filter ID.
 * @param id - The ID of the filter being changed.
 * @param value - The new value for the filter.
 */
const handleFilterChange = (
  setFilterValues: React.Dispatch<React.SetStateAction<Record<string, any>>>
) => (id: string, value: any): void => {
  setFilterValues((prevValues) => ({
    ...prevValues,
    [id]: value,
  }));
};

/**
 * Handles applying all current filter values.
 * This function transforms the filter values into the InventoryFilters format and calls the onFilterChange callback.
 * @param onFilterChange - The callback function to be called with the transformed filters.
 * @param filterValues - The current filter values.
 */
const handleApplyFilters = (
  onFilterChange: (filters: InventoryFilters) => void,
  filterValues: Record<string, any>
) => (): void => {
  const filters: InventoryFilters = {
    securityId: filterValues.securityId || null,
    counterpartyId: filterValues.counterpartyId || null,
    aggregationUnitId: filterValues.aggregationUnitId || null,
    calculationType: filterValues.calculationType || null,
    businessDate: filterValues.businessDate ? DateUtil.formatDate(filterValues.businessDate) : null,
    market: filterValues.market || null,
    securityTemperature: filterValues.securityTemperature || null,
    isExternalSource: filterValues.isExternalSource === true ? true : null,
  };
  onFilterChange(filters);
};

/**
 * Handles resetting all filters to default values.
 * This function resets the filter values to their default state and calls the onFilterChange callback with default filters.
 * @param setFilterValues - The state setter function for the filter values.
 * @param onFilterChange - The callback function to be called with the default filters.
 */
const handleResetFilters = (
  setFilterValues: React.Dispatch<React.SetStateAction<Record<string, any>>>,
  onFilterChange: (filters: InventoryFilters) => void
) => (): void => {
  setFilterValues({});
  onFilterChange({});
};

/**
 * Handles saving current filter values as a preset.
 * This function creates a new preset object with a unique ID, name, and values, and adds it to the saved presets.
 * @param savedPresets - The current saved filter presets.
 * @param setSavedPresets - The state setter function for the saved presets.
 */
const handleSavePreset = (
  savedPresets: FilterPreset[],
  setSavedPresets: React.Dispatch<React.SetStateAction<FilterPreset[]>>,
  setFilterValues: React.Dispatch<React.SetStateAction<Record<string, any>>>
) => (name: string, values: Record<string, any>): void => {
  const newPreset: FilterPreset = {
    id: Date.now().toString(),
    name: name,
    values: values,
  };
  setSavedPresets([...savedPresets, newPreset]);
  setFilterValues(values);
};

/**
 * Handles deleting a saved filter preset.
 * This function filters out the preset with the specified ID and updates the local storage with the remaining presets.
 * @param savedPresets - The current saved filter presets.
 * @param setSavedPresets - The state setter function for the saved presets.
 */
const handleDeletePreset = (
  savedPresets: FilterPreset[],
  setSavedPresets: React.Dispatch<React.SetStateAction<FilterPreset[]>>,
  setFilterValues: React.Dispatch<React.SetStateAction<Record<string, any>>>
) => (id: string): void => {
  const updatedPresets = savedPresets.filter((preset) => preset.id !== id);
  setSavedPresets(updatedPresets);
  setFilterValues({});
};

/**
 * Component that provides filtering capabilities for the Inventory Dashboard.
 * This component allows users to filter inventory data by various criteria including security, counterparty,
 * calculation type, market, business date, and security temperature.
 */
const InventoryFilters: React.FC<InventoryFiltersProps> = React.memo(({ onFilterChange, initialFilters, className }) => {
  // Initialize state for filter values using initialFilters or default values
  const [filterValues, setFilterValues] = useState<Record<string, any>>(initialFilters || {});

  // Use useSelector to get current inventory filters from Redux state
  const inventoryFilters = useSelector((state: any) => state.inventory.filters);

  // Use useLocalStorage to manage saved filter presets
  const [savedPresets, setSavedPresets] = useLocalStorage<FilterPreset[]>('inventoryFilterPresets', []);

  // Create memoized filter definitions
  const filterDefinitions = useMemo(() => getFilterDefinitions(), []);

  // Memoized handleFilterChange function
  const memoizedHandleFilterChange = useCallback(
    handleFilterChange(setFilterValues),
    [setFilterValues]
  );

  // Memoized handleApplyFilters function
  const memoizedHandleApplyFilters = useCallback(
    handleApplyFilters(onFilterChange, filterValues),
    [onFilterChange, filterValues]
  );

  // Memoized handleResetFilters function
  const memoizedHandleResetFilters = useCallback(
    handleResetFilters(setFilterValues, onFilterChange),
    [setFilterValues, onFilterChange]
  );

  // Memoized handleSavePreset function
  const memoizedHandleSavePreset = useCallback(
    handleSavePreset(savedPresets, setSavedPresets, setFilterValues),
    [savedPresets, setSavedPresets, setFilterValues]
  );

  // Memoized handleDeletePreset function
  const memoizedHandleDeletePreset = useCallback(
    handleDeletePreset(savedPresets, setSavedPresets, setFilterValues),
    [savedPresets, setSavedPresets, setFilterValues]
  );

  return (
    <FilterContainer className={className}>
      <FilterPanel
        filters={filterDefinitions}
        values={filterValues}
        onChange={memoizedHandleFilterChange}
        onApply={memoizedHandleApplyFilters}
        onReset={memoizedHandleResetFilters}
        onSave={memoizedHandleSavePreset}
        onDelete={memoizedHandleDeletePreset}
        presets={savedPresets}
        title="Inventory Filters"
      />
    </FilterContainer>
  );
});

export default InventoryFilters;