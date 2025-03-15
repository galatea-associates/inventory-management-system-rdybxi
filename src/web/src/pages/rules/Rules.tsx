import React, { useState, useEffect, useCallback } from 'react'; // React library and hooks for component creation and state management version ^18.2.0
import styled from '@emotion/styled'; // Styled components library for component styling version ^11.10.6
import { useParams, useNavigate } from 'react-router-dom'; // React Router hooks for navigation and accessing URL parameters version ^6.8.1
import { useDispatch, useSelector } from 'react-redux'; // Redux hooks for accessing and updating state version ^8.0.5
import { Box } from '@mui/material'; // Material-UI layout component version ^5.13.0
import AddIcon from '@mui/icons-material/Add'; // Material-UI icon for create action version ^5.13.0

import Page from '../../components/layout/Page'; // Import Page component for consistent page layout and structure
import RuleList from './RuleList'; // Import RuleList component for displaying and managing calculation rules
import RuleDetail from './RuleDetail'; // Import RuleDetail component for viewing and editing rule details
import Button from '../../components/common/Button'; // Import Button component for action buttons
import useApi from '../../hooks/useApi'; // Import custom hook for API calls with loading state
import {
  selectRules,
  selectRulesLoading,
  selectRulesError,
  selectSelectedRule,
} from '../../state/rules/rulesSelectors'; // Import Redux selectors for accessing rule state
import {
  fetchRules,
  setSelectedRule,
  clearSelectedRule,
} from '../../state/rules/rulesSlice'; // Import Redux actions for rule management
import { CalculationRule } from '../../types/models'; // Import type definition for calculation rule model

/**
 * @interface RulesState
 * @description State interface for the Rules component
 */
interface RulesState {
  viewMode: 'list' | 'detail';
  createMode: boolean;
}

/**
 * @styledcomponent StyledRules
 * @description Styled container for the Rules page component
 */
const StyledRules = styled(Box)`
  height: 100%; // Apply height: 100% for full height
  width: 100%; // Apply width: 100% for full width
  display: flex; // Apply display: flex for layout
  flex-direction: column; // Apply flexDirection: column for vertical layout
`;

/**
 * @styledcomponent RulesContent
 * @description Styled container for the main content area
 */
const RulesContent = styled(Box)`
  flex: 1; // Apply flex: 1 for flexible sizing
  overflow: auto; // Apply overflow: auto for scrolling
  padding: 16px; // Apply padding for internal spacing
`;

/**
 * @styledcomponent RulesActions
 * @description Styled container for action buttons
 */
const RulesActions = styled(Box)`
  display: flex; // Apply display: flex for layout
  gap: 8px; // Apply gap: 8px for spacing between buttons
  align-items: center; // Apply alignItems: center for vertical alignment
`;

/**
 * @function Rules
 * @returns JSX.Element
 * @description Main component for the Calculation Rules management page
 */
const Rules: React.FC = () => {
  // LD1: Get URL parameters using useParams hook to check for rule ID
  const { id } = useParams<{ id: string }>();

  // LD1: Get navigation function using useNavigate hook
  const navigate = useNavigate();

  // LD1: Get dispatch function using useDispatch hook
  const dispatch = useDispatch();

  // LD1: Get rules data, loading state, error, and selected rule from Redux using useSelector
  const rules = useSelector(selectRules);
  const rulesLoading = useSelector(selectRulesLoading);
  const rulesError = useSelector(selectRulesError);
  const selectedRule = useSelector(selectSelectedRule);

  // LD1: Initialize state for view mode (list or detail)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  // LD1: Initialize state for create mode flag
  const [createMode, setCreateMode] = useState<boolean>(false);

  // LD1: Fetch rules data when component mounts
  useEffect(() => {
    dispatch(fetchRules());
  }, [dispatch]);

  // LD1: Handle navigation to specific rule if rule ID is provided in URL
  useEffect(() => {
    if (id) {
      const rule = rules.find((rule) => rule.id === id);
      if (rule) {
        dispatch(setSelectedRule(rule));
        setViewMode('detail');
      } else {
        // Rule not found, navigate back to list
        navigate('/rules');
      }
    }
  }, [id, rules, dispatch, navigate]);

  // LD1: Handle creating a new rule
  const handleCreateRule = useCallback(() => {
    setCreateMode(true);
    setViewMode('detail');
    dispatch(clearSelectedRule());
    navigate('/rules/editor'); // Update URL to reflect create mode
  }, [dispatch, navigate]);

  // LD1: Handle viewing rule details
  const handleViewRule = useCallback(
    (rule: CalculationRule) => {
      setCreateMode(false);
      setViewMode('detail');
      dispatch(setSelectedRule(rule));
      navigate(`/rules/${rule.id}`); // Update URL to include the rule ID
    },
    [dispatch, navigate]
  );

  // LD1: Handle returning to rule list from detail view
  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setCreateMode(false);
    dispatch(clearSelectedRule());
    dispatch(fetchRules());
    navigate('/rules'); // Update URL to remove rule ID
  }, [dispatch, navigate]);

  // LD1: Render Page component with appropriate title and actions
  return (
    <Page
      title="Calculation Rules"
      actions={
        <RulesActions>
          <Button startIcon={<AddIcon />} onClick={handleCreateRule}>
            Create Rule
          </Button>
        </RulesActions>
      }
    >
      <StyledRules>
        <RulesContent>
          {viewMode === 'list' && (
            <RuleList onViewRule={handleViewRule} />
          )}
          {viewMode === 'detail' && (
            <RuleDetail onBack={handleBackToList} createMode={createMode} />
          )}
        </RulesContent>
      </StyledRules>
    </Page>
  );
};

export default Rules;