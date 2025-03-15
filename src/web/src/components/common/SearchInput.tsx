import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Input, { InputProps } from './Input';
import useDebounce from '../../hooks/useDebounce';
import { colors, spacing } from '../../styles/variables';
import { transition, focusVisible } from '../../styles/mixins';

/**
 * Props for the SearchInput component
 */
export interface SearchInputProps extends Omit<InputProps, 'startAdornment' | 'endAdornment'> {
  /** The current search value */
  value: string;
  /** Handler called when the search value changes */
  onChange: (value: string) => void;
  /** Handler called when search should be performed (after debounce or Enter key) */
  onSearch: (value: string) => void;
  /** Time in milliseconds to debounce search input (default: 300) */
  debounceTime?: number;
  /** Placeholder text for the search input */
  placeholder?: string;
}

/**
 * Styled version of SearchIcon with custom styling
 */
export const StyledSearchIcon = styled(SearchIcon)`
  color: ${colors.text.secondary};
  font-size: 1.25rem;
  margin-right: ${spacing.xs}px;
`;

/**
 * Styled version of IconButton for the clear button
 */
export const StyledClearButton = styled(IconButton)<{ disabled?: boolean }>`
  padding: ${spacing.xs}px;
  color: ${colors.text.secondary};
  ${transition('all', '0.2s')};
  ${focusVisible()};
  
  &:hover:not(:disabled) {
    color: ${colors.text.primary};
  }
  
  &:disabled {
    opacity: 0.3;
  }
`;

/**
 * A specialized input component for search functionality with debounced input and clear button.
 * Extends the base Input component with search-specific features.
 */
const SearchInput = React.memo<SearchInputProps>((props) => {
  const {
    value,
    onChange,
    onSearch,
    debounceTime = 300,
    placeholder = 'Search...',
    disabled,
    fullWidth = true,
    className,
    ...rest
  } = props;

  // Internal state to track search value
  const [searchValue, setSearchValue] = useState<string>(value || '');
  
  // Synchronize internal state with external value
  useEffect(() => {
    if (value !== searchValue) {
      setSearchValue(value || '');
    }
  }, [value, searchValue]);
  
  // Debounced version of the search value
  const debouncedSearchValue = useDebounce<string>(searchValue, debounceTime);
  
  // Set up effect to trigger search when debounced value changes
  useEffect(() => {
    onSearch(debouncedSearchValue);
  }, [debouncedSearchValue, onSearch]);
  
  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    onChange(newValue);
  }, [onChange]);
  
  // Clear search and trigger onSearch with empty string
  const handleClear = useCallback(() => {
    setSearchValue('');
    onChange('');
    onSearch('');
  }, [onChange, onSearch]);
  
  // Handle key down to immediately trigger search on Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(searchValue);
    }
  }, [onSearch, searchValue]);
  
  return (
    <Input
      value={searchValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      fullWidth={fullWidth}
      placeholder={placeholder}
      type="text"
      className={className}
      startAdornment={<StyledSearchIcon />}
      endAdornment={
        searchValue ? (
          <StyledClearButton
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear search"
            size="small"
          >
            <ClearIcon fontSize="small" />
          </StyledClearButton>
        ) : null
      }
      aria-label="Search"
      {...rest}
    />
  );
});

// Default props
SearchInput.defaultProps = {
  debounceTime: 300,
  placeholder: 'Search...',
  fullWidth: true,
  type: 'text',
};

export default SearchInput;