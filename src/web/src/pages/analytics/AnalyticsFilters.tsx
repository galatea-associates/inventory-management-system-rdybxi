import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box } from '@mui/material'; // @mui/material ^5.13
import FilterPanel, { FilterDefinition, FilterPreset } from '../../components/data/FilterPanel';
import { SelectOption } from '../../components/common/Select';
import useLocalStorage from '../../hooks/useLocalStorage';
import { getSecurityTypes, getMarkets, searchSecurities, searchCounterparties } from '../../api/reference';
import { getCalculationTypes } from '../../api/inventory';
import { getLocateStatuses, getLocateTypes } from '../../api/locate';
import { getCurrentBusinessDate, addDays, subtractDays, formatDate } from '../../utils/date';

/**
 * Interface for filter options used in analytics filters
 */
interface FilterOptions {
  calculationTypes?: SelectOption[];
  markets?: SelectOption[];
  securityTypes?: SelectOption[];
  positionTypes?: SelectOption[];
  locateStatuses?: SelectOption[];
  locateTypes?: SelectOption[];
  exceptionTypes?: SelectOption[];
  severityLevels?: SelectOption[];
  services?: SelectOption[];
  statuses?: SelectOption[];
  groupByOptions?: SelectOption[];
}

/**
 * Props for the AnalyticsFilters component
 */
export interface AnalyticsFiltersProps {
  analyticsType: string;
  filters: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
  onApply: (filters: Record<string, any>) => void;
  onReset?: () => void;
  onSave?: (name: string, values: Record<string, any>) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

/**
 * Styled container for the analytics filters
 */
const StyledFilterContainer = styled(Box)`
  margin-bottom: theme.spacing(3);
  width: 100%;
`;

/**
 * Creates filter definitions specific to inventory analytics
 * @param calculationTypes - Array of calculation types
 * @param markets - Array of markets
 * @param securityTypes - Array of security types
 * @returns Array of filter definitions for inventory analytics
 */
const getInventoryFilterDefinitions = (
  calculationTypes: SelectOption[],
  markets: SelectOption[],
  securityTypes: SelectOption[]
): FilterDefinition[] => {
  return [
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'dateRange',
      defaultValue: {
        startDate: subtractDays(getCurrentBusinessDate(), 30),
        endDate: getCurrentBusinessDate(),
      },
    },
    {
      id: 'calculationType',
      label: 'Calculation Type',
      type: 'select',
      options: calculationTypes,
    },
    {
      id: 'market',
      label: 'Market',
      type: 'select',
      options: markets,
    },
    {
      id: 'securityType',
      label: 'Security Type',
      type: 'select',
      options: securityTypes,
    },
    {
      id: 'securityId',
      label: 'Security',
      type: 'search',
      props: {
        search: searchSecurities,
      },
    },
    {
      id: 'counterpartyId',
      label: 'Counterparty',
      type: 'search',
      props: {
        search: searchCounterparties,
      },
    },
    {
      id: 'aggregationUnitId',
      label: 'Aggregation Unit',
      type: 'search',
      props: {
        search: searchCounterparties, // Assuming aggregation units can be searched like counterparties
      },
    },
  ];
};

/**
 * Creates filter definitions specific to position analytics
 * @param securityTypes - Array of security types
 * @param positionTypes - Array of position types
 * @returns Array of filter definitions for position analytics
 */
const getPositionFilterDefinitions = (
  securityTypes: SelectOption[],
  positionTypes: SelectOption[]
): FilterDefinition[] => {
  return [
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'dateRange',
      defaultValue: {
        startDate: subtractDays(getCurrentBusinessDate(), 30),
        endDate: getCurrentBusinessDate(),
      },
    },
    {
      id: 'positionType',
      label: 'Position Type',
      type: 'select',
      options: positionTypes,
    },
    {
      id: 'securityType',
      label: 'Security Type',
      type: 'select',
      options: securityTypes,
    },
    {
      id: 'securityId',
      label: 'Security',
      type: 'search',
      props: {
        search: searchSecurities,
      },
    },
    {
      id: 'bookId',
      label: 'Book',
      type: 'search',
      props: {
        search: searchCounterparties, // Assuming books can be searched like counterparties
      },
    },
    {
      id: 'counterpartyId',
      label: 'Counterparty',
      type: 'search',
      props: {
        search: searchCounterparties,
      },
    },
    {
      id: 'aggregationUnitId',
      label: 'Aggregation Unit',
      type: 'search',
      props: {
        search: searchCounterparties, // Assuming aggregation units can be searched like counterparties
      },
    },
    {
      id: 'groupBy',
      label: 'Group By',
      type: 'select',
      options: [
        { value: 'security', label: 'Security' },
        { value: 'book', label: 'Book' },
        { value: 'counterparty', label: 'Counterparty' },
        { value: 'aggregationUnit', label: 'Aggregation Unit' },
      ],
    },
  ];
};

/**
 * Creates filter definitions specific to locate analytics
 * @param locateStatuses - Array of locate statuses
 * @param locateTypes - Array of locate types
 * @returns Array of filter definitions for locate analytics
 */
const getLocateFilterDefinitions = (
  locateStatuses: SelectOption[],
  locateTypes: SelectOption[]
): FilterDefinition[] => {
  return [
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'dateRange',
      defaultValue: {
        startDate: subtractDays(getCurrentBusinessDate(), 30),
        endDate: getCurrentBusinessDate(),
      },
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: locateStatuses,
    },
    {
      id: 'locateType',
      label: 'Locate Type',
      type: 'select',
      options: locateTypes,
    },
    {
      id: 'securityId',
      label: 'Security',
      type: 'search',
      props: {
        search: searchSecurities,
      },
    },
    {
      id: 'clientId',
      label: 'Client',
      type: 'search',
      props: {
        search: searchCounterparties,
      },
    },
    {
      id: 'requestorId',
      label: 'Requestor',
      type: 'search',
      props: {
        search: searchCounterparties,
      },
    },
    {
      id: 'aggregationUnitId',
      label: 'Aggregation Unit',
      type: 'search',
      props: {
        search: searchCounterparties, // Assuming aggregation units can be searched like counterparties
      },
    },
  ];
};

/**
 * Creates filter definitions specific to exception analytics
 * @param exceptionTypes - Array of exception types
 * @param severityLevels - Array of severity levels
 * @param services - Array of services
 * @param statuses - Array of statuses
 * @returns Array of filter definitions for exception analytics
 */
const getExceptionFilterDefinitions = (
  exceptionTypes: SelectOption[],
  severityLevels: SelectOption[],
  services: SelectOption[],
  statuses: SelectOption[]
): FilterDefinition[] => {
  return [
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'dateRange',
      defaultValue: {
        startDate: subtractDays(getCurrentBusinessDate(), 30),
        endDate: getCurrentBusinessDate(),
      },
    },
    {
      id: 'exceptionType',
      label: 'Exception Type',
      type: 'select',
      options: exceptionTypes,
    },
    {
      id: 'severity',
      label: 'Severity',
      type: 'select',
      options: severityLevels,
    },
    {
      id: 'service',
      label: 'Service',
      type: 'select',
      options: services,
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: statuses,
    },
  ];
};

/**
 * Loads filter options based on analytics type
 * @param analyticsType - Type of analytics (inventory, position, locate, exception)
 * @returns Promise that resolves when options are loaded
 */
const loadFilterOptions = async (analyticsType: string): Promise<void> => {
  setLoading(true);
  try {
    // Load common options
    const securityTypesPromise = getSecurityTypes();
    const marketsPromise = getMarkets();

    let calculationTypesPromise: Promise<any> | null = null;
    let locateStatusesPromise: Promise<any> | null = null;
    let locateTypesPromise: Promise<any> | null = null;
    // let exceptionTypesPromise: Promise<any> | null = null;
    // let severityLevelsPromise: Promise<any> | null = null;
    // let servicesPromise: Promise<any> | null = null;
    // let statusesPromise: Promise<any> | null = null;

    // Load specific options based on analytics type
    if (analyticsType === 'inventory') {
      calculationTypesPromise = getCalculationTypes();
    } else if (analyticsType === 'locate') {
      locateStatusesPromise = getLocateStatuses();
      locateTypesPromise = getLocateTypes();
    } else if (analyticsType === 'exception') {
      // exceptionTypesPromise = getExceptionTypes();
      // severityLevelsPromise = getSeverityLevels();
      // servicesPromise = getServices();
      // statusesPromise = getStatuses();
    }

    const [
      securityTypesResponse,
      marketsResponse,
      calculationTypesResponse,
      locateStatusesResponse,
      locateTypesResponse,
      // exceptionTypesResponse,
      // severityLevelsResponse,
      // servicesResponse,
      // statusesResponse,
    ] = await Promise.all([
      securityTypesPromise,
      marketsPromise,
      calculationTypesPromise,
      locateStatusesPromise,
      locateTypesPromise,
      // exceptionTypesPromise,
      // severityLevelsPromise,
      // servicesPromise,
      // statusesPromise,
    ]);

    setOptions({
      securityTypes: securityTypesResponse?.map((type) => ({ value: type, label: type })) || [],
      markets: marketsResponse?.map((market) => ({ value: market, label: market })) || [],
      calculationTypes: calculationTypesResponse?.map((type) => ({ value: type, label: type })) || [],
      locateStatuses: locateStatusesResponse?.map((status) => ({ value: status, label: status })) || [],
      locateTypes: locateTypesResponse?.map((type) => ({ value: type, label: type })) || [],
      // exceptionTypes: exceptionTypesResponse?.map((type) => ({ value: type, label: type })) || [],
      // severityLevels: severityLevelsResponse?.map((level) => ({ value: level, label: level })) || [],
      // services: servicesResponse?.map((service) => ({ value: service, label: service })) || [],
      // statuses: statusesResponse?.map((status) => ({ value: status, label: status })) || [],
    });
  } catch (error) {
    console.error('Error loading filter options:', error);
  } finally {
    setLoading(false);
  }
};

/**
 * Handles changes to filter values
 * @param id - ID of the filter
 * @param value - New value of the filter
 */
const handleFilterChange = (id: string, value: any) => {
  const updatedFilters = { ...filters, [id]: value };
  onChange(updatedFilters);
};

/**
 * Handles filter apply action
 * @param filters - Current filter values
 */
const handleFilterApply = (filters: Record<string, any>) => {
  onApply(filters);
};

/**
 * Handles filter reset action
 */
const handleFilterReset = () => {
  const defaultFilters = getDefaultFilters(analyticsType);
  onChange(defaultFilters);
  onReset?.();
};

/**
 * Handles saving filter presets
 * @param name - Name of the preset
 * @param values - Filter values to save
 */
const handleFilterSave = (name: string, values: Record<string, any>) => {
  const id = Math.random().toString(36).substring(2, 15);
  const newPreset = { id, name, values };
  const updatedPresets = [...presets, newPreset];
  setPresets(updatedPresets);
  onSave?.(name, values);
};

/**
 * Handles deleting filter presets
 * @param id - ID of the preset to delete
 */
const handleFilterDelete = (id: string) => {
  const updatedPresets = presets.filter((preset) => preset.id !== id);
  setPresets(updatedPresets);
  onDelete?.(id);
};

/**
 * Gets default filter values based on analytics type
 * @param analyticsType - Type of analytics (inventory, position, locate, exception)
 * @returns Default filter values
 */
const getDefaultFilters = (analyticsType: string): Record<string, any> => {
  const defaultDateRange = {
    startDate: subtractDays(getCurrentBusinessDate(), 30),
    endDate: getCurrentBusinessDate(),
  };

  let defaultValues: Record<string, any> = {
    dateRange: defaultDateRange,
  };

  if (analyticsType === 'inventory') {
    defaultValues = {
      ...defaultValues,
      calculationType: options.calculationTypes?.[0]?.value || '',
    };
  } else if (analyticsType === 'position') {
    defaultValues = {
      ...defaultValues,
      positionType: 'long',
      groupBy: 'security',
    };
  } else if (analyticsType === 'locate') {
    defaultValues = {
      ...defaultValues,
      status: 'pending',
    };
  } else if (analyticsType === 'exception') {
    defaultValues = {
      ...defaultValues,
      severity: 'high',
      status: 'open',
    };
  }

  return defaultValues;
};

/**
 * Main component that renders analytics-specific filter controls
 */
const AnalyticsFilters = React.memo<AnalyticsFiltersProps>(({
  analyticsType,
  filters,
  onChange,
  onApply,
  onReset,
  onSave,
  onDelete,
  className,
}) => {
  // Initialize state for filter options
  const [options, setOptions] = useState<FilterOptions>({});

  // Initialize state for loading status
  const [loading, setLoading] = useState(false);

  // Load filter options on component mount
  useEffect(() => {
    loadFilterOptions(analyticsType);
  }, [analyticsType]);

  // Create filter definitions based on analytics type
  const filterDefinitions = useMemo(() => {
    switch (analyticsType) {
      case 'inventory':
        return getInventoryFilterDefinitions(
          options.calculationTypes || [],
          options.markets || [],
          options.securityTypes || []
        );
      case 'position':
        return getPositionFilterDefinitions(
          options.securityTypes || [],
          [{ value: 'long', label: 'Long' }, { value: 'short', label: 'Short' }]
        );
      case 'locate':
        return getLocateFilterDefinitions(
          options.locateStatuses || [],
          options.locateTypes || []
        );
      case 'exception':
        return getExceptionFilterDefinitions(
          options.exceptionTypes || [],
          options.severityLevels || [],
          options.services || [],
          options.statuses || []
        );
      default:
        return [];
    }
  }, [analyticsType, options]);

  // Create filter presets from local storage
  const [presets, setPresets] = useLocalStorage<FilterPreset[]>(
    `analytics-filters-${analyticsType}`,
    []
  );

  // Handle filter changes and propagate to parent component
  const handleChange = useCallback(
    (id: string, value: any) => {
      handleFilterChange(id, value);
    },
    [filters]
  );

  // Handle filter application and propagate to parent component
  const handleApplyFilters = useCallback(() => {
    handleFilterApply(filters);
  }, [filters]);

  // Handle filter reset and propagate to parent component
  const handleResetFilters = useCallback(() => {
    handleFilterReset();
  }, [analyticsType]);

  // Handle filter preset save and store in local storage
  const handleSavePreset = useCallback(
    (name: string, values: Record<string, any>) => {
      handleFilterSave(name, values);
    },
    [presets]
  );

  // Handle filter preset delete and update local storage
  const handleFilterDeletePreset = useCallback(
    (id: string) => {
      handleFilterDelete(id);
    },
    [presets]
  );

  return (
    <StyledFilterContainer className={className}>
      <FilterPanel
        title="Analytics Filters"
        filters={filterDefinitions}
        values={filters}
        onChange={handleChange}
        onApply={handleApplyFilters}
        onReset={onReset ? handleResetFilters : undefined}
        onSave={onSave ? handleSavePreset : undefined}
        onDelete={onDelete ? handleFilterDeletePreset : undefined}
        presets={presets}
      />
    </StyledFilterContainer>
  );
});

export default AnalyticsFilters;