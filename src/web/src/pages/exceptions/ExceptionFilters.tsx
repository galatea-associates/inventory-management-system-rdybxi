import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react 18.2.0
import styled from '@emotion/styled'; // @emotion/styled 11.10.6
import { Box } from '@mui/material'; // @mui/material 5.13
import { format, subDays } from 'date-fns'; // date-fns 2.29.3
import FilterPanel from '../../components/data/FilterPanel';
import { FilterDefinition, FilterPreset } from '../../components/data/FilterPanel';
import { getExceptionTypes, getExceptionSeverities, getExceptionStatuses } from '../../api/exception';
import useLocalStorage from '../../hooks/useLocalStorage';

interface ExceptionFiltersProps {
  values: Record<string, any>;
  onChange: (id: string, value: any) => void;
  onApply: (values: Record<string, any>) => void;
  onReset: () => void;
  className?: string;
}

interface FilterOptions {
  types: Array<{ value: string; label: string }>;
  severities: Array<{ value: string; label: string }>;
  statuses: Array<{ value: string; label: string }>;
}

const StyledExceptionFilters = styled(Box)`
  width: 100%;
  margin-bottom: theme.spacing(2);
`;

const ExceptionFilters: React.FC<ExceptionFiltersProps> = React.memo(function ExceptionFilters({
  values,
  onChange,
  onApply,
  onReset,
  className,
}) {
  // Initialize state for filter options (types, severities, statuses)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    types: [],
    severities: [],
    statuses: [],
  });

  // Initialize state for loading status
  const [loading, setLoading] = useState(false);

  // Initialize state for saved filter presets
  const [savedPresets, setSavedPresets] = useLocalStorage<FilterPreset[]>('exception-filter-presets', []);

  // Create a function to fetch filter options from the API
  const fetchFilterOptions = useCallback(async () => {
    setLoading(true);
    try {
      const types = await getExceptionTypes();
      const severities = await getExceptionSeverities();
      const statuses = await getExceptionStatuses();

      setFilterOptions({
        types: formatFilterOptions(types),
        severities: formatFilterOptions(severities),
        statuses: formatFilterOptions(statuses),
      });
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Implement useEffect to fetch filter options on component mount
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Create a function to load saved filter presets from local storage
  const loadSavedPresets = useCallback(() => {
    // This is already handled by the useLocalStorage hook
  }, []);

  // Define filter definitions for exception type, severity, status, and date range
  const filterDefinitions: FilterDefinition[] = useMemo(() => [
    {
      id: 'exceptionType',
      label: 'Exception Type',
      type: 'select',
      options: filterOptions.types,
      defaultValue: '',
    },
    {
      id: 'severity',
      label: 'Severity',
      type: 'select',
      options: filterOptions.severities,
      defaultValue: '',
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: filterOptions.statuses,
      defaultValue: '',
    },
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'dateRange',
      defaultValue: {
        startDate: subDays(new Date(), 1),
        endDate: new Date(),
      },
    },
  ], [filterOptions]);

  // Create handler functions for filter changes, apply, reset, save, and delete
  const handleFilterChange = useCallback((id: string, value: any) => {
    onChange(id, value);
  }, [onChange]);

  const handleApply = useCallback(() => {
    onApply(values);
  }, [onApply, values]);

  const handleReset = useCallback(() => {
    onReset();
  }, [onReset]);

  const handleSave = useCallback((name: string, filterValues: Record<string, any>) => {
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: name,
      values: filterValues,
    };
    setSavedPresets([...savedPresets, newPreset]);
  }, [savedPresets, setSavedPresets]);

  const handleDelete = useCallback((id: string) => {
    setSavedPresets(savedPresets.filter(preset => preset.id !== id));
  }, [savedPresets, setSavedPresets]);

  // Render FilterPanel component with appropriate filter definitions and handlers
  return (
    <StyledExceptionFilters className={className}>
      <FilterPanel
        title="Exception Filters"
        filters={filterDefinitions}
        values={values}
        onChange={handleFilterChange}
        onApply={handleApply}
        onReset={handleReset}
        onSave={handleSave}
        onDelete={handleDelete}
        presets={savedPresets}
      />
    </StyledExceptionFilters>
  );
});

// Apply appropriate ARIA attributes for accessibility
ExceptionFilters.displayName = 'ExceptionFilters';

// Helper function to format API response data into select options
function formatFilterOptions(options: string[]): Array<{ value: string; label: string }> {
  const formattedOptions = options.map(option => ({
    value: option,
    label: option,
  }));

  formattedOptions.unshift({ value: '', label: 'All' });

  return formattedOptions;
}

// Helper function to get default filter values
function getDefaultFilterValues(): Record<string, any> {
  return {
    exceptionType: '',
    severity: '',
    status: '',
    dateRange: {
      startDate: subDays(new Date(), 1),
      endDate: new Date(),
    },
  };
}

export default ExceptionFilters;