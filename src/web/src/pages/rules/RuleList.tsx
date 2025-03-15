import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { useNavigate } from 'react-router-dom'; // react-router-dom ^6.8.1
import { Box, Grid, Typography, Alert, Modal } from '@mui/material'; // @mui/material ^5.13.0
import { AddIcon, EditIcon, DeleteIcon, VisibilityIcon } from '@mui/icons-material'; // @mui/icons-material ^5.13.0

import DataGrid from '../../components/data/DataGrid';
import RuleFilters from './RuleFilters';
import RuleDetail from './RuleDetail';
import Button from '../../components/common/Button';
import PageTitle from '../../components/common/PageTitle';
import StatusIndicator from '../../components/data/StatusIndicator';
import useApi from '../../hooks/useApi';
import { getActiveRules, getRuleTypes, getRuleStatuses, getAvailableMarkets, createRule, deactivateRule } from '../../api/rule';
import { CalculationRule } from '../../types/models';
import { CalculationRuleFilterRequest } from '../../types/api';
import { formatDate } from '../../utils/formatter';

/**
 * @ interface RuleListState
 * @description State interface for the RuleList component
 */
interface RuleListState {
  rules: CalculationRule[];
  loading: boolean;
  error: Error | null;
  selectedRule: CalculationRule | null;
  filterValues: CalculationRuleFilterRequest;
  filterPresets: FilterPreset[];
  viewMode: 'list' | 'detail' | 'create';
  successMessage: string | null;
  errorMessage: string | null;
  showConfirmDialog: boolean;
  ruleToDeactivate: CalculationRule | null;
}

/**
 * @interface FilterPreset
 * @description Interface for saved filter preset
 */
interface FilterPreset {
  id: string;
  name: string;
  values: CalculationRuleFilterRequest;
  isDefault?: boolean;
}

/**
 * @styledcomponent StyledRuleList
 * @description Styled container for the rule list component
 */
const StyledRuleList = styled(Box)`
  padding: 16px;
  height: 100%;
  width: 100%;
  background-color: #f5f5f5;
  overflow: auto;
`;

/**
 * @styledcomponent RuleListHeader
 * @description Styled header for the rule list component
 */
const RuleListHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 16px;
`;

/**
 * @styledcomponent RuleListContent
 * @description Styled content area for the rule list component
 */
const RuleListContent = styled(Box)`
  flex-grow: 1;
  overflow-y: auto;
  padding: 16px;
`;

/**
 * @styledcomponent RuleListActions
 * @description Styled container for action buttons
 */
const RuleListActions = styled(Box)`
  display: flex;
  gap: 16px;
  align-items: center;
`;

/**
 * @styledcomponent FilterContainer
 * @description Styled container for the filter panel
 */
const FilterContainer = styled(Box)`
  margin-bottom: 16px;
  width: 100%;
`;

/**
 * @styledcomponent MessageContainer
 * @description Styled container for success and error messages
 */
const MessageContainer = styled(Box)`
  margin-bottom: 16px;
  width: 100%;
`;

/**
 * @function RuleList
 * @param RuleListProps props
 * @returns JSX.Element
 * @description Main component for displaying and managing calculation rules
 */
const RuleList: React.FC = (props) => {
  // LD1: Destructure props including onBack, createMode, and className
  const { className = '' } = props;

  // LD1: Initialize state for rules data, loading state, error state, and selected rule
  const [rules, setRules] = useState<CalculationRule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedRule, setSelectedRule] = useState<CalculationRule | null>(null);

  // LD1: Initialize state for filter values and filter presets
  const [filterValues, setFilterValues] = useState<CalculationRuleFilterRequest>({});
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);

  // LD1: Initialize state for view mode (list or detail)
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create'>('list');

  // LD1: Initialize state for success and error messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // LD1: Initialize state for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [ruleToDeactivate, setRuleToDeactivate] = useState<CalculationRule | null>(null);

  // LD1: Set up API call functions using useApi hook
  const { data: ruleTypes, loading: ruleTypesLoading, error: ruleTypesError } = useApi<string[]>('/api/v1/rules/types');
  const { data: ruleStatuses, loading: ruleStatusesLoading, error: ruleStatusesError } = useApi<string[]>('/api/v1/rules/statuses');
  const { data: availableMarkets, loading: availableMarketsLoading, error: availableMarketsError } = useApi<string[]>('/api/v1/rules/markets');

  // LD1: Fetch rules data when component mounts or filters change
  useEffect(() => {
    const fetchRules = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getActiveRules();
        setRules(response.data);
      } catch (error: any) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [filterValues]);

  // LD1: Define grid columns for the data grid
  const gridColumns = useMemo(() => [
    { field: 'name', headerName: 'Name' },
    { field: 'description', headerName: 'Description' },
    { field: 'ruleType', headerName: 'Type' },
    { field: 'market', headerName: 'Market' },
    { field: 'status', headerName: 'Status', cellRendererFramework: StatusIndicator },
    { field: 'effectiveDate', headerName: 'Effective Date' },
    { field: 'expiryDate', headerName: 'Expiry Date' },
    { field: 'actions', headerName: 'Actions' },
  ], []);

  // LD1: Handle filter changes and apply filters
  const handleFilterChange = (newFilters: CalculationRuleFilterRequest) => {
    setFilterValues(newFilters);
  };

  // LD1: Handle row selection to view rule details
  const handleRowClick = (rule: CalculationRule) => {
    setSelectedRule(rule);
    setViewMode('detail');
  };

  // LD1: Handle creating new rules
  const handleCreateRule = () => {
    setSelectedRule(null);
    setViewMode('create');
  };

  // LD1: Handle editing existing rules
  const handleEditRule = (rule: CalculationRule) => {
    setSelectedRule(rule);
    setViewMode('detail');
  };

  // LD1: Handle deactivating rules
  const handleDeactivateRule = (rule: CalculationRule) => {
    setShowConfirmDialog(true);
    setRuleToDeactivate(rule);
  };

  // LD1: Handle saving and deleting filter presets
  const handleSavePreset = (name: string, values: CalculationRuleFilterRequest) => {
    // Implement save preset logic here
  };

  const handleDeletePreset = (id: string) => {
    // Implement delete preset logic here
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedRule(null);
  };

  // LD1: Render page title and action buttons
  const renderHeader = () => (
    <RuleListHeader>
      <Typography variant="h4">Calculation Rules</Typography>
      <RuleListActions>
        <Button startIcon={<AddIcon />} onClick={handleCreateRule}>
          Create Rule
        </Button>
      </RuleListActions>
    </RuleListHeader>
  );

  // LD1: Render filter panel with rule-specific filters
  const renderFilters = () => (
    <FilterContainer>
      <RuleFilters
        values={filterValues}
        onChange={handleFilterChange}
        onApply={handleFilterChange}
        onSave={handleSavePreset}
        onDelete={handleDeletePreset}
        presets={filterPresets}
      />
    </FilterContainer>
  );

  // LD1: Render data grid with rules data
  const renderDataGrid = () => (
    <RuleListContent>
      <DataGrid
        data={rules}
        columns={gridColumns}
        loading={loading}
        error={error}
        onRowClick={handleRowClick}
      />
    </RuleListContent>
  );

  // LD1: Render rule detail view when a rule is selected
  const renderRuleDetail = () => (
    <RuleDetail
      onBack={handleBackToList}
      createMode={viewMode === 'create'}
    />
  );

  // LD1: Handle loading and error states appropriately
  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography color="error">Error: {error.message}</Typography>;
  }

  // LD1: Show success and error messages with alerts
  const renderMessages = () => (
    <MessageContainer>
      {successMessage && <Alert severity="success">{successMessage}</Alert>}
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
    </MessageContainer>
  );

  return (
    <StyledRuleList className={className}>
      {renderHeader()}
      {renderMessages()}
      {viewMode === 'list' && (
        <>
          {renderFilters()}
          {renderDataGrid()}
        </>
      )}
      {viewMode === 'detail' && renderRuleDetail()}
      {viewMode === 'create' && renderRuleDetail()}
    </StyledRuleList>
  );
};

export default RuleList;