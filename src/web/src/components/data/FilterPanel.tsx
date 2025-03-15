import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { Box, Grid, Typography, Collapse, IconButton, Divider, Tooltip } from '@mui/material'; // @mui/material 5.13
import { FilterList, ExpandMore, ExpandLess, Save, Delete, Refresh } from '@mui/icons-material'; // @mui/material 5.13
import FormControl from '../common/FormControl';
import Select, { SelectOption } from '../common/Select';
import DatePicker from '../common/DatePicker';
import DateRangeSelector from './DateRangeSelector';
import Button from '../common/Button';
import Checkbox from '../common/Checkbox';
import SearchInput from '../common/SearchInput';
import { colors, spacing } from '../../styles/variables';
import useLocalStorage from '../../hooks/useLocalStorage';

/**
 * Interface for filter panel component properties
 */
export interface FilterPanelProps {
  /** Array of filter definitions that specify the filters to render */
  filters: FilterDefinition[];
  /** Current filter values */
  values: Record<string, any>;
  /** Callback for when a filter value changes */
  onChange: (id: string, value: any) => void;
  /** Callback for when filters should be applied */
  onApply: (values: Record<string, any>) => void;
  /** Callback for when filters should be reset */
  onReset: () => void;
  /** Callback for when filters should be saved as a preset */
  onSave?: (name: string, values: Record<string, any>) => void;
  /** Callback for when a filter preset should be deleted */
  onDelete?: (id: string) => void;
  /** Available filter presets */
  presets?: FilterPreset[];
  /** Title for the filter panel */
  title?: string;
  /** Whether to start in advanced mode */
  defaultAdvancedMode?: boolean;
  /** Custom class name for styling */
  className?: string;
}

/**
 * Interface defining a filter configuration
 */
export interface FilterDefinition {
  /** Unique identifier for the filter */
  id: string;
  /** Display label for the filter */
  label: string;
  /** Type of filter control to render */
  type: 'select' | 'multiSelect' | 'date' | 'dateRange' | 'checkbox' | 'search' | 'custom';
  /** Options for select filters */
  options?: SelectOption[];
  /** Default value for the filter */
  defaultValue?: any;
  /** Whether this filter should only show in advanced mode */
  advanced?: boolean;
  /** Whether this filter is required */
  required?: boolean;
  /** Validation function for the filter value */
  validate?: (value: any) => { isValid: boolean, errorMessage?: string };
  /** Custom component for 'custom' type */
  component?: React.ReactNode;
  /** Additional props to pass to the filter component */
  props?: Record<string, any>;
}

/**
 * Interface for saved filter preset
 */
export interface FilterPreset {
  /** Unique identifier for the preset */
  id: string;
  /** Display name for the preset */
  name: string;
  /** Saved filter values */
  values: Record<string, any>;
  /** Whether this is the default preset */
  isDefault?: boolean;
}

/**
 * Styled container for the filter panel
 */
const StyledFilterPanel = styled(Box)`
  border: 1px solid ${colors.grey[300]};
  border-radius: 8px;
  background-color: ${colors.background.paper};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: ${spacing.md}px;
  width: 100%;
`;

/**
 * Styled header for the filter panel
 */
const FilterHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${spacing.sm}px ${spacing.md}px;
  background-color: ${colors.grey[100]};
  border-bottom: 1px solid ${colors.grey[300]};
`;

/**
 * Styled body section for filter controls
 */
const FilterBody = styled(Box)`
  padding: ${spacing.md}px;
  max-height: 600px;
  overflow-y: auto;
`;

/**
 * Styled container for filter action buttons
 */
const FilterActions = styled(Box)`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: ${spacing.sm}px ${spacing.md}px;
  border-top: 1px solid ${colors.grey[300]};
  gap: ${spacing.sm}px;
`;

/**
 * Styled grid for organizing filter controls
 */
const FilterGrid = styled(Grid)`
  width: 100%;
  margin: 0;
`;

/**
 * Styled grid item for individual filter controls
 */
const FilterGridItem = styled(Grid)`
  padding: ${spacing.xs}px;
`;

/**
 * Renders the appropriate filter control based on the filter type
 */
const renderFilterControl = (
  filter: FilterDefinition,
  value: any,
  onChange: (value: any) => void
) => {
  const { id, label, type, options, props = {}, validate } = filter;
  const error = validate ? validate(value) : { isValid: true };
  const errorMessage = !error.isValid ? error.errorMessage : undefined;

  switch (type) {
    case 'select':
      return (
        <Select
          label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          options={options || []}
          error={errorMessage}
          fullWidth
          {...props}
        />
      );
    case 'multiSelect':
      return (
        <Select
          label={label}
          value={value || []}
          onChange={(e) => onChange(e.target.value)}
          options={options || []}
          error={errorMessage}
          fullWidth
          multiple
          {...props}
        />
      );
    case 'date':
      return (
        <DatePicker
          label={label}
          value={value}
          onChange={(date) => onChange(date)}
          error={errorMessage}
          fullWidth
          {...props}
        />
      );
    case 'dateRange':
      return (
        <DateRangeSelector
          label={label}
          value={value}
          onChange={(range) => onChange(range)}
          error={errorMessage}
          fullWidth
          {...props}
        />
      );
    case 'checkbox':
      return (
        <Checkbox
          label={label}
          checked={Boolean(value)}
          onChange={(_, checked) => onChange(checked)}
          error={errorMessage}
          {...props}
        />
      );
    case 'search':
      return (
        <SearchInput
          label={label}
          value={value || ''}
          onChange={onChange}
          onSearch={onChange}
          error={errorMessage}
          fullWidth
          {...props}
        />
      );
    case 'custom':
      return filter.component ? React.cloneElement(
        filter.component as React.ReactElement,
        {
          value,
          onChange,
          error: errorMessage,
          ...props
        }
      ) : null;
    default:
      return null;
  }
};

/**
 * FilterPanel Component
 * 
 * A comprehensive filter panel for the Inventory Management System UI that provides
 * a standardized interface for filtering data across various screens. This component
 * supports multiple filter types including dropdown selects, date ranges, checkboxes,
 * and search inputs, with the ability to save and load filter presets.
 */
const FilterPanel = React.memo<FilterPanelProps>((props) => {
  const {
    filters,
    values,
    onChange,
    onApply,
    onReset,
    onSave,
    onDelete,
    presets = [],
    title = 'Filters',
    defaultAdvancedMode = false,
    className
  } = props;

  // State to track if the filter panel is expanded
  const [expanded, setExpanded] = useState(true);
  
  // State to track if advanced mode is enabled
  const [advancedMode, setAdvancedMode] = useState(defaultAdvancedMode);
  
  // State for preset selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  
  // State for preset name input when saving
  const [newPresetName, setNewPresetName] = useState('');
  
  // State for showing save preset input
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Load last used mode from local storage
  const [storedAdvancedMode, setStoredAdvancedMode] = useLocalStorage<boolean>(
    `filter-panel-${title}-advanced-mode`,
    defaultAdvancedMode
  );

  // Initialize advanced mode from local storage
  useEffect(() => {
    setAdvancedMode(storedAdvancedMode);
  }, [storedAdvancedMode]);

  // Handler for toggling the expansion state
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  // Handler for toggling advanced mode
  const toggleAdvancedMode = useCallback(() => {
    const newMode = !advancedMode;
    setAdvancedMode(newMode);
    setStoredAdvancedMode(newMode);
  }, [advancedMode, setStoredAdvancedMode]);

  // Handler for filter value changes
  const handleFilterChange = useCallback((id: string, value: any) => {
    onChange(id, value);
    
    // Reset preset selection when filters change
    if (selectedPresetId) {
      setSelectedPresetId('');
    }
  }, [onChange, selectedPresetId]);

  // Handler for apply button
  const handleApply = useCallback(() => {
    onApply(values);
  }, [onApply, values]);

  // Handler for reset button
  const handleReset = useCallback(() => {
    onReset();
    setSelectedPresetId('');
  }, [onReset]);

  // Handler for preset selection
  const handlePresetSelect = useCallback((e: React.ChangeEvent<{ value: unknown }>) => {
    const presetId = e.target.value as string;
    setSelectedPresetId(presetId);
    
    if (presetId) {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        // Apply the preset values
        Object.entries(preset.values).forEach(([key, value]) => {
          onChange(key, value);
        });
        
        // Apply the filters
        onApply(preset.values);
      }
    }
  }, [presets, onChange, onApply]);

  // Handler for saving a preset
  const handleSavePreset = useCallback(() => {
    if (onSave && newPresetName.trim()) {
      onSave(newPresetName.trim(), values);
      setNewPresetName('');
      setShowSavePreset(false);
    }
  }, [onSave, newPresetName, values]);

  // Handler for deleting a preset
  const handleDeletePreset = useCallback(() => {
    if (onDelete && selectedPresetId) {
      onDelete(selectedPresetId);
      setSelectedPresetId('');
    }
  }, [onDelete, selectedPresetId]);

  // Get filtered list of filter definitions based on the current mode
  const visibleFilters = useMemo(() => {
    return filters.filter(filter => !filter.advanced || advancedMode);
  }, [filters, advancedMode]);

  // Convert presets to select options
  const presetOptions = useMemo(() => {
    return [
      { value: '', label: 'Select a preset...' },
      ...presets.map(preset => ({
        value: preset.id,
        label: preset.name
      }))
    ];
  }, [presets]);

  return (
    <StyledFilterPanel className={className}>
      <FilterHeader>
        <Box display="flex" alignItems="center">
          <FilterList sx={{ mr: 1, color: colors.primary.main }} />
          <Typography variant="subtitle1" fontWeight={500}>
            {title}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center">
          <Typography 
            variant="body2" 
            color="textSecondary" 
            sx={{ cursor: 'pointer', mr: 1 }}
            onClick={toggleAdvancedMode}
          >
            {advancedMode ? 'Simple Mode' : 'Advanced Mode'}
          </Typography>
          
          <IconButton size="small" onClick={toggleExpanded}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </FilterHeader>
      
      <Collapse in={expanded}>
        <FilterBody>
          {/* Presets section */}
          {presets && presets.length > 0 && (
            <Box mb={2}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={8}>
                  <Select
                    value={selectedPresetId}
                    onChange={handlePresetSelect}
                    options={presetOptions}
                    fullWidth
                    placeholder="Select a preset"
                    label="Saved Filters"
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Tooltip title="Save Current Filters">
                    <IconButton 
                      color="primary" 
                      onClick={() => setShowSavePreset(true)}
                      disabled={!onSave}
                    >
                      <Save />
                    </IconButton>
                  </Tooltip>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Tooltip title="Delete Selected Preset">
                    <IconButton 
                      color="error" 
                      onClick={handleDeletePreset}
                      disabled={!selectedPresetId || !onDelete}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
              
              {/* Save preset input */}
              <Collapse in={showSavePreset}>
                <Box mt={2}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={8}>
                      <FormControl fullWidth>
                        <SearchInput
                          value={newPresetName}
                          onChange={setNewPresetName}
                          onSearch={() => {}}
                          placeholder="Enter preset name"
                          fullWidth
                        />
                      </FormControl>
                    </Grid>
                    <Grid item xs={4}>
                      <Button 
                        onClick={handleSavePreset} 
                        disabled={!newPresetName.trim()}
                        fullWidth
                        size="small"
                      >
                        Save
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>
              
              <Divider sx={{ my: 2 }} />
            </Box>
          )}
          
          {/* Filters grid */}
          <FilterGrid container spacing={2}>
            {visibleFilters.map((filter) => (
              <FilterGridItem 
                item 
                xs={12} 
                sm={filter.type === 'checkbox' ? 6 : 12} 
                md={filter.type === 'checkbox' ? 4 : 6} 
                key={filter.id}
              >
                {renderFilterControl(
                  filter,
                  values[filter.id] !== undefined ? values[filter.id] : filter.defaultValue,
                  (value) => handleFilterChange(filter.id, value)
                )}
              </FilterGridItem>
            ))}
          </FilterGrid>
        </FilterBody>
        
        <FilterActions>
          <Button 
            variant="outlined" 
            onClick={handleReset}
            startIcon={<Refresh />}
          >
            Reset
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </FilterActions>
      </Collapse>
    </StyledFilterPanel>
  );
});

FilterPanel.displayName = 'FilterPanel';

export default FilterPanel;