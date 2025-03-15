import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Paper, Grid, Typography, IconButton, Collapse, Divider } from '@mui/material'; // Material-UI components ^5.13
import { Search, Add, Remove, Clear, ExpandMore, ExpandLess } from '@mui/icons-material'; // Material-UI icons ^5.13
import SearchInput from '../common/SearchInput'; // Internal search input component
import Input from '../common/Input'; // Internal input component
import Select from '../common/Select'; // Internal select component
import Button from '../common/Button'; // Internal button component
import DatePicker from '../common/DatePicker'; // Internal date picker component
import Tooltip from '../common/Tooltip'; // Internal tooltip component
import useDebounce from '../../hooks/useDebounce'; // Internal debounce hook
import { colors, spacing } from '../../styles/variables'; // Internal color and spacing variables

/**
 * Type definition for search panel component properties
 */
export interface SearchPanelProps {
  /**
   * Callback function to handle simple search input
   * @param value - The search string
   */
  onSearch: (value: string) => void;
  /**
   * Callback function to handle advanced search criteria
   * @param query - The advanced search query object
   */
  onAdvancedSearch: (query: any) => void;
  /**
   * Array of search field configurations
   */
  searchFields: SearchField[];
  /**
   * Initial search criteria for advanced search
   */
  initialCriteria?: SearchCriterion[];
  /**
   * Placeholder text for the simple search input
   */
  placeholder?: string;
  /**
   * Debounce time in milliseconds for the simple search input
   */
  debounceTime?: number;
  /**
   * Whether to show the advanced search panel
   */
  showAdvanced?: boolean;
  /**
   * Optional CSS class name for styling
   */
  className?: string;
}

/**
 * Type definition for search field configuration
 */
export interface SearchField {
  /**
   * Unique identifier for the field
   */
  id: string;
  /**
   * Label to display for the field
   */
  label: string;
  /**
   * Data type of the field ('string', 'number', 'date', 'boolean', 'enum')
   */
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  /**
   * Options for 'enum' type fields
   */
  options?: { value: string | number | boolean, label: string }[];
}

/**
 * Type definition for a single search criterion
 */
export interface SearchCriterion {
  /**
   * Field to search on
   */
  field: string;
  /**
   * Operator to use for the search
   */
  operator: string;
  /**
   * Value to search for
   */
  value: any;
}

/**
 * Type definition for advanced search query structure
 */
export interface AdvancedSearchQuery {
  /**
   * Array of search criteria
   */
  criteria: { field: string, operator: string, value: any }[];
  /**
   * Logical operator to combine criteria ('AND', 'OR')
   */
  logicalOperator: 'AND' | 'OR';
}

/**
 * Styled container for the search panel
 */
const StyledSearchPanel = styled(Paper)`
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  padding: ${spacing.md}px;
  margin-bottom: ${spacing.md}px;
`;

/**
 * Styled header for the search panel
 */
const SearchPanelHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${spacing.sm}px;
  background-color: ${colors.background.secondary};
`;

/**
 * Styled container for the simple search input
 */
const SimpleSearchContainer = styled(Box)`
  flex-grow: 1;
  margin-right: ${spacing.md}px;
`;

/**
 * Styled container for the advanced search panel
 */
const AdvancedSearchContainer = styled(Box)`
  padding: ${spacing.md}px;
  max-height: 400px;
  overflow-y: auto;
`;

/**
 * Styled container for search criteria
 */
const CriteriaContainer = styled(Box)`
  margin-bottom: ${spacing.md}px;
  max-height: 200px;
  overflow-y: auto;
`;

/**
 * Styled container for search action buttons
 */
const ActionContainer = styled(Box)`
  display: flex;
  justify-content: flex-end;
  margin-top: ${spacing.md}px;
  gap: ${spacing.sm}px;
`;

/**
 * A specialized search panel component that provides advanced search capabilities with multiple criteria
 */
const SearchPanel = React.memo<SearchPanelProps>((props) => {
  // Destructure props including onSearch, onAdvancedSearch, searchFields, initialCriteria, placeholder, debounceTime, showAdvanced, and other configuration options
  const {
    onSearch,
    onAdvancedSearch,
    searchFields,
    initialCriteria = [],
    placeholder = 'Search...',
    debounceTime = 300,
    showAdvanced = true,
    className,
  } = props;

  // Set up state for simple search value
  const [searchValue, setSearchValue] = useState<string>('');

  // Set up state for advanced search criteria array
  const [advancedCriteria, setAdvancedCriteria] = useState<SearchCriterion[]>(initialCriteria);

  // Set up state for advanced panel visibility
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  // Use useDebounce hook to create debounced version of the simple search value
  const debouncedSearchValue = useDebounce<string>(searchValue, debounceTime);

  // Set up effect to trigger onSearch when debounced simple search value changes
  useEffect(() => {
    onSearch(debouncedSearchValue);
  }, [debouncedSearchValue, onSearch]);

  // Handle simple search input change to update state and call onChange
  const handleSimpleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  // Handle advanced search panel toggle
  const handleAdvancedToggle = useCallback(() => {
    setIsAdvancedOpen((prev) => !prev);
  }, []);

  // Handle adding a new search criterion to the advanced criteria array
  const handleAddCriterion = useCallback(() => {
    setAdvancedCriteria((prev) => [...prev, { field: '', operator: '', value: '' }]);
  }, []);

  // Handle removing a search criterion from the advanced criteria array
  const handleRemoveCriterion = useCallback((index: number) => {
    setAdvancedCriteria((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle updating a search criterion (field, operator, or value)
  const handleCriterionChange = useCallback(
    (index: number, field: string, value: string) => {
      setAdvancedCriteria((prev) =>
        prev.map((criterion, i) =>
          i === index ? { ...criterion, [field]: value } : criterion
        )
      );
    },
    []
  );

  // Handle advanced search submission to build query and call onAdvancedSearch
  const handleAdvancedSearch = useCallback(() => {
    const query = buildAdvancedSearchQuery(advancedCriteria);
    onAdvancedSearch(query);
  }, [advancedCriteria, onAdvancedSearch]);

  // Handle clearing all search criteria
  const handleClear = useCallback(() => {
    setSearchValue('');
    setAdvancedCriteria([]);
    onSearch('');
    onAdvancedSearch({ criteria: [], logicalOperator: 'AND' });
  }, [onSearch, onAdvancedSearch]);

  // Render simple search input with search icon
  // Render advanced search toggle button if showAdvanced is true
  // Render collapsible advanced search panel with criteria inputs
  // Render field selector, operator selector, and value input for each criterion
  // Render add and remove buttons for criteria management
  // Render search and clear buttons for advanced search actions
  // Apply appropriate ARIA attributes for accessibility
  return (
    <StyledSearchPanel className={className}>
      <SearchPanelHeader>
        <SimpleSearchContainer>
          <SearchInput
            value={searchValue}
            onChange={handleSimpleSearchChange}
            onSearch={onSearch}
            placeholder={placeholder}
            aria-label="Search"
          />
        </SimpleSearchContainer>
        {showAdvanced && (
          <Tooltip title="Advanced Search">
            <IconButton onClick={handleAdvancedToggle} aria-label="Toggle advanced search">
              {isAdvancedOpen ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Tooltip>
        )}
      </SearchPanelHeader>
      <Collapse in={isAdvancedOpen} timeout="auto" unmountOnExit>
        <AdvancedSearchContainer>
          <CriteriaContainer>
            {advancedCriteria.map((criterion, index) => (
              <React.Fragment key={index}>
                {renderCriterion(criterion, index, handleCriterionChange, handleRemoveCriterion)}
                {index < advancedCriteria.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </CriteriaContainer>
          <ActionContainer>
            <Button variant="outlined" size="small" startIcon={<Add />} onClick={handleAddCriterion}>
              Add Criterion
            </Button>
            <Button variant="contained" size="small" startIcon={<Search />} onClick={handleAdvancedSearch}>
              Search
            </Button>
            <Button variant="text" size="small" startIcon={<Clear />} onClick={handleClear}>
              Clear
            </Button>
          </ActionContainer>
        </AdvancedSearchContainer>
      </Collapse>
    </StyledSearchPanel>
  );
});

SearchPanel.displayName = 'SearchPanel';

/**
 * Renders a single search criterion with field, operator, and value inputs
 */
const renderCriterion = (
  criterion: SearchCriterion,
  index: number,
  onUpdate: (index: number, field: string, value: string) => void,
  onRemove: (index: number) => void
): JSX.Element => {
  // Render Grid container for the criterion row
  // Render field selector with available search fields
  // Render operator selector with operators appropriate for the selected field type
  // Render value input appropriate for the field type (text, number, date, select)
  // Render remove button for the criterion
  // Handle field change to update operators based on field type
  // Handle operator change
  // Handle value change
  // Apply appropriate styling and spacing
  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(index, 'field', e.target.value);
    onUpdate(index, 'operator', ''); // Reset operator when field changes
    onUpdate(index, 'value', ''); // Reset value when field changes
  };

  const handleOperatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(index, 'operator', e.target.value);
    onUpdate(index, 'value', ''); // Reset value when operator changes
  };

  const handleValueChange = (value: any) => {
    onUpdate(index, 'value', value);
  };

  const fieldType = useMemo(() => {
    const selectedField = searchFields.find((f) => f.id === criterion.field);
    return selectedField ? selectedField.type : 'string';
  }, [criterion.field, searchFields]);

  const operators = useMemo(() => getOperatorsForFieldType(fieldType), [fieldType]);

  return (
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={4}>
        <Select
          fullWidth
          value={criterion.field}
          onChange={handleFieldChange}
          options={searchFields.map((field) => ({ value: field.id, label: field.label }))}
          aria-label={`Field for criterion ${index + 1}`}
        />
      </Grid>
      <Grid item xs={3}>
        <Select
          fullWidth
          value={criterion.operator}
          onChange={handleOperatorChange}
          options={operators}
          disabled={!criterion.field}
          aria-label={`Operator for criterion ${index + 1}`}
        />
      </Grid>
      <Grid item xs={4}>
        {renderValueInput({
          field: searchFields.find((f) => f.id === criterion.field),
          operator: criterion.operator,
          value: criterion.value,
          onChange: handleValueChange,
        })}
      </Grid>
      <Grid item xs={1}>
        <IconButton onClick={() => onRemove(index)} aria-label={`Remove criterion ${index + 1}`}>
          <Remove />
        </IconButton>
      </Grid>
    </Grid>
  );
};

/**
 * Returns the appropriate operators for a given field type
 */
const getOperatorsForFieldType = (fieldType: string): { value: string; label: string }[] => {
  // For 'string' type, return operators like 'contains', 'equals', 'startsWith', 'endsWith'
  // For 'number' type, return operators like 'equals', 'greaterThan', 'lessThan', 'between'
  // For 'date' type, return operators like 'equals', 'before', 'after', 'between'
  // For 'boolean' type, return operators like 'equals'
  // For 'enum' type, return operators like 'equals', 'in'
  // Return appropriate SelectOption objects with value and label properties
  switch (fieldType) {
    case 'string':
      return [
        { value: 'contains', label: 'Contains' },
        { value: 'equals', label: 'Equals' },
        { value: 'startsWith', label: 'Starts With' },
        { value: 'endsWith', label: 'Ends With' },
      ];
    case 'number':
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'greaterThan', label: 'Greater Than' },
        { value: 'lessThan', label: 'Less Than' },
        { value: 'between', label: 'Between' },
      ];
    case 'date':
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'before', label: 'Before' },
        { value: 'after', label: 'After' },
        { value: 'between', label: 'Between' },
      ];
    case 'boolean':
      return [{ value: 'equals', label: 'Equals' }];
    case 'enum':
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'in', label: 'In' },
      ];
    default:
      return [];
  }
};

/**
 * Renders the appropriate value input based on field type and operator
 */
const renderValueInput = ({ field, operator, value, onChange }: { field: SearchField; operator: string; value: any; onChange: (value: any) => void }): JSX.Element => {
  // For 'string' type, render text Input component
  // For 'number' type, render number Input component
  // For 'date' type, render DatePicker component
  // For 'boolean' type, render Select component with true/false options
  // For 'enum' type, render Select component with provided options
  // For 'between' operator, render two inputs for range values
  // Handle value change and format appropriately for the field type
  // Apply appropriate props based on field type and operator
  if (!field) {
    return <Typography>Select a field</Typography>;
  }

  const handleChange = (newValue: any) => {
    onChange(newValue);
  };

  switch (field.type) {
    case 'string':
      return <Input fullWidth value={value} onChange={(e) => handleChange(e.target.value)} aria-label="String value" />;
    case 'number':
      return <Input fullWidth type="number" value={value} onChange={(e) => handleChange(e.target.value)} aria-label="Number value" />;
    case 'date':
      return <DatePicker fullWidth value={value} onChange={handleChange} inputFormat="MM/dd/yyyy" aria-label="Date value" />;
    case 'boolean':
      return (
        <Select
          fullWidth
          value={value}
          onChange={(e) => handleChange(e.target.value === 'true')}
          options={[
            { value: true, label: 'True' },
            { value: false, label: 'False' },
          ]}
          aria-label="Boolean value"
        />
      );
    case 'enum':
      return (
        <Select
          fullWidth
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          options={field.options}
          aria-label="Enum value"
        />
      );
    default:
      return <Typography>Invalid field type</Typography>;
  }
};

/**
 * Builds a structured query object from the advanced search criteria
 */
const buildAdvancedSearchQuery = (criteria: SearchCriterion[]): AdvancedSearchQuery => {
  // Initialize empty query object
  // Process each criterion and add to query object
  // Format values appropriately based on field type
  // Handle special operators like 'between' that require multiple values
  // Return structured query object that can be used by the search handler
  return {
    criteria: criteria.map((criterion) => ({
      field: criterion.field,
      operator: criterion.operator,
      value: criterion.value,
    })),
    logicalOperator: 'AND',
  };
};

export default SearchPanel;
export type { SearchPanelProps, SearchField, SearchCriterion, AdvancedSearchQuery };