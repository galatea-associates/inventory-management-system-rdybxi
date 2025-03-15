import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box } from '@mui/material'; // @mui/material 5.13
import FilterPanel, { FilterDefinition, FilterPreset } from '../../components/data/FilterPanel';
import useApi from '../../hooks/useApi';
import { getRuleTypes, getRuleStatuses, getAvailableMarkets } from '../../api/rule';
import { CalculationRuleFilterRequest } from '../../types/api';

/**
 * Interface defining the properties for the RuleFilters component.
 */
export interface RuleFiltersProps {
  /**
   * The current filter values.
   */
  values: CalculationRuleFilterRequest;
  /**
   * Callback function to handle changes to the filter values.
   * @param filters - The updated filter values.
   */
  onChange: (filters: CalculationRuleFilterRequest) => void;
  /**
   * Callback function to handle applying the filter.
   * @param filters - The filter values to apply.
   */
  onApply: (filters: CalculationRuleFilterRequest) => void;
  /**
   * Callback function to handle saving a filter preset.
   * @param name - The name of the preset.
   * @param values - The filter values to save.
   */
  onSave?: (name: string, values: CalculationRuleFilterRequest) => void;
  /**
   * Callback function to handle deleting a filter preset.
   * @param id - The ID of the preset to delete.
   */
  onDelete?: (id: string) => void;
  /**
   * An array of filter presets.
   */
  presets?: FilterPreset[];
  /**
   * Optional CSS class name for styling.
   */
  className?: string;
}

/**
 * Styled container for the rule filters component.
 */
const StyledRuleFilters = styled(Box)`
  margin-bottom: 16px;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
`;

/**
 * Creates filter definitions for rule filters based on API data.
 * @param ruleTypes - Array of rule types.
 * @param statuses - Array of statuses.
 * @param markets - Array of markets.
 * @returns Array of filter definitions for rule filters.
 */
const createFilterDefinitions = (
  ruleTypes: string[],
  statuses: string[],
  markets: string[]
): FilterDefinition[] => {
  return [
    {
      id: 'ruleType',
      label: 'Rule Type',
      type: 'select',
      options: ruleTypes.map(type => ({ value: type, label: type })),
      defaultValue: '',
    },
    {
      id: 'market',
      label: 'Market',
      type: 'select',
      options: markets.map(market => ({ value: market, label: market })),
      defaultValue: '',
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: statuses.map(status => ({ value: status, label: status })),
      defaultValue: '',
    },
    {
      id: 'name',
      label: 'Name',
      type: 'search',
      defaultValue: '',
    },
  ];
};

/**
 * Component that provides filtering capabilities for calculation rules.
 * @param props - The component's properties.
 * @returns Rendered rule filters component.
 */
const RuleFilters: React.FC<RuleFiltersProps> = React.memo(({ values, onChange, onApply, onSave, onDelete, presets, className }) => {
  // LD1: Destructure props including values, onChange, onApply, onSave, onDelete, presets
  // LD1: Set up API queries to fetch rule types, statuses, and markets
  const { data: ruleTypesData, isLoading: isRuleTypesLoading, error: ruleTypesError } = useApiQuery<string[]>(getRuleTypes);
  const { data: statusesData, isLoading: isStatusesLoading, error: statusesError } = useApiQuery<string[]>(getRuleStatuses);
  const { data: marketsData, isLoading: isMarketsLoading, error: marketsError } = useApiQuery<string[]>(getAvailableMarkets);

  // LD1: Create filter definitions based on API data
  const filterDefinitions = useMemo(() => {
    if (!ruleTypesData || !statusesData || !marketsData) {
      return [];
    }
    return createFilterDefinitions(ruleTypesData, statusesData, marketsData);
  }, [ruleTypesData, statusesData, marketsData]);

  // LD1: Handle filter value changes
  const handleFilterChange = useCallback(
    (id: string, value: any) => {
      const updatedValues = { ...values, [id]: value };
      onChange(updatedValues);
    },
    [onChange, values]
  );

  // LD1: Handle filter application
  const handleApplyFilters = useCallback(() => {
    onApply(values);
  }, [onApply, values]);

  // LD1: Handle filter preset saving
  const handleSavePreset = useCallback(
    (name: string, values: CalculationRuleFilterRequest) => {
      if (onSave) {
        onSave(name, values);
      }
    },
    [onSave]
  );

  // LD1: Handle filter preset deletion
  const handleDeletePreset = useCallback(
    (id: string) => {
      if (onDelete) {
        onDelete(id);
      }
    },
    [onDelete]
  );

  // LD1: Render FilterPanel with rule-specific filter definitions
  return (
    <StyledRuleFilters className={className}>
      <FilterPanel
        filters={filterDefinitions}
        values={values}
        onChange={handleFilterChange}
        onApply={handleApplyFilters}
        onSave={onSave ? handleSavePreset : undefined}
        onDelete={onDelete ? handleDeletePreset : undefined}
        presets={presets}
        title="Rule Filters"
      />
    </StyledRuleFilters>
  );
});

RuleFilters.displayName = 'RuleFilters';

export default RuleFilters;