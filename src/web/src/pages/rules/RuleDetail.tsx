import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { useNavigate, useParams } from 'react-router-dom'; // react-router-dom ^6.8.1
import { Box, Grid, Typography, Divider, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'; // @mui/material ^5.13.0
import { EditIcon, SaveIcon, PlayArrowIcon, PublishIcon, BlockIcon, ArrowBackIcon } from '@mui/icons-material'; // @mui/icons-material ^5.13.0
import { useDispatch, useSelector } from 'react-redux'; // react-redux ^8.0.5

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import RuleEditor from './RuleEditor';
import FormControl from '../../components/common/FormControl';
import FormLabel from '../../components/common/FormLabel';
import Tabs from '../../components/common/Tabs';
import Tab from '../../components/common/Tab';
import StatusIndicator from '../../components/data/StatusIndicator';
import useApi from '../../hooks/useApi';
import { selectSelectedRule, selectRulesLoading, selectRulesError, selectRuleTestResults } from '../../state/rules/rulesSelectors';
import { updateExistingRule, testRuleThunk, publishRuleThunk, deactivateRuleThunk, clearRuleCacheThunk, clearSelectedRule, clearRuleTestResults } from '../../state/rules/rulesSlice';
import { CalculationRule } from '../../types/models';
import { CalculationRulePayload, RuleTestResult } from '../../types/api';
import { formatDate } from '../../utils/formatter';

/**
 * @ interface RuleDetailProps
 * @description Props for the RuleDetail component
 */
interface RuleDetailProps {
  onBack?: () => void;
  createMode?: boolean;
  className?: string;
}

/**
 * @ interface RuleDetailState
 * @description State interface for the RuleDetail component
 */
interface RuleDetailState {
  editMode: boolean;
  activeTab: number;
  showPublishConfirm: boolean;
  showDeactivateConfirm: boolean;
  successMessage: string | null;
  errorMessage: string | null;
}

/**
 * @ styledcomponent StyledRuleDetail
 * @description Styled container for the rule detail component
 */
const StyledRuleDetail = styled(Box)`
  padding: 16px;
  width: 100%;
  background-color: #f5f5f5;
  overflow: auto;
`;

/**
 * @ styledcomponent RuleDetailHeader
 * @description Styled header for the rule detail component
 */
const RuleDetailHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 16px;
`;

/**
 * @ styledcomponent RuleDetailContent
 * @description Styled content area for the rule detail component
 */
const RuleDetailContent = styled(Box)`
  flex-grow: 1;
  overflow-y: auto;
  padding: 16px;
`;

/**
 * @ styledcomponent RuleDetailSection
 * @description Styled section for rule detail content
 */
const RuleDetailSection = styled(Card)`
  margin-bottom: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
`;

/**
 * @ styledcomponent RuleDetailActions
 * @description Styled container for action buttons
 */
const RuleDetailActions = styled(Box)`
  display: flex;
  gap: 16px;
  align-items: center;
`;

/**
 * @ styledcomponent MessageContainer
 * @description Styled container for success and error messages
 */
const MessageContainer = styled(Box)`
  margin-bottom: 16px;
  width: 100%;
`;

/**
 * @function RuleDetail
 * @param RuleDetailProps props
 * @returns JSX.Element
 * @description Component for displaying and managing calculation rule details
 */
const RuleDetail: React.FC<RuleDetailProps> = (props) => {
  // LD1: Destructure props including onBack, createMode, and className
  const { onBack = () => {}, createMode = false, className = '' } = props;

  // LD1: Initialize state for edit mode, active tab, confirmation dialog, and messages
  const [state, setState] = useState<RuleDetailState>({
    editMode: createMode,
    activeTab: 0,
    showPublishConfirm: false,
    showDeactivateConfirm: false,
    successMessage: null,
    errorMessage: null,
  });

  // LD1: Get rule data, loading state, and error from Redux state
  const selectedRule = useSelector(selectSelectedRule);
  const rulesLoading = useSelector(selectRulesLoading);
  const rulesError = useSelector(selectRulesError);

  // LD1: Get test results from Redux state
  const ruleTestResults = useSelector(selectRuleTestResults);

  // LD1: Get dispatch function from Redux
  const dispatch = useDispatch();

  // LD1: Get navigation function from React Router
  const navigate = useNavigate();

  // LD1: Get URL parameters for rule ID if applicable
  const { id } = useParams<{ id: string }>();

  // LD1: Handle entering and exiting edit mode
  const handleEditMode = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      editMode: !prevState.editMode,
      successMessage: null,
      errorMessage: null,
    }));
  }, []);

  // LD1: Handle tab changes for different rule sections
  const handleTabChange = useCallback((newTab: number) => {
    setState((prevState) => ({ ...prevState, activeTab: newTab }));
  }, []);

  // LD1: Handle saving rule changes
  const handleSave = useCallback(async (ruleData: CalculationRulePayload) => {
    try {
      if (selectedRule) {
        await dispatch(updateExistingRule(ruleData)).unwrap();
        setState((prevState) => ({
          ...prevState,
          editMode: false,
          successMessage: 'Rule saved successfully!',
          errorMessage: null,
        }));
      }
    } catch (error: any) {
      setState((prevState) => ({ ...prevState, errorMessage: error.message }));
    }
  }, [dispatch, selectedRule]);

  // LD1: Handle testing the rule
  const handleTest = useCallback(async () => {
    try {
      setState((prevState) => ({ ...prevState, errorMessage: null }));
      dispatch(clearRuleTestResults());
      if (selectedRule) {
        await dispatch(testRuleThunk(selectedRule)).unwrap();
        setState((prevState) => ({
          ...prevState,
          successMessage: 'Rule tested successfully!',
          activeTab: 2, // Switch to test results tab
        }));
      }
    } catch (error: any) {
      setState((prevState) => ({ ...prevState, errorMessage: error.message }));
    }
  }, [dispatch, selectedRule]);

  // LD1: Handle publishing the rule
  const handlePublish = useCallback(async () => {
    try {
      setState((prevState) => ({ ...prevState, showPublishConfirm: false, errorMessage: null }));
      if (selectedRule) {
        await dispatch(publishRuleThunk(selectedRule.id)).unwrap();
        setState((prevState) => ({
          ...prevState,
          successMessage: 'Rule published successfully!',
        }));
        dispatch(clearRuleCacheThunk()); // Clear rule cache to ensure fresh rule loading
      }
    } catch (error: any) {
      setState((prevState) => ({ ...prevState, errorMessage: error.message }));
    }
  }, [dispatch, selectedRule]);

  // LD1: Handle deactivating the rule
  const handleDeactivate = useCallback(async () => {
    try {
      setState((prevState) => ({ ...prevState, showDeactivateConfirm: false, errorMessage: null }));
      if (selectedRule) {
        await dispatch(deactivateRuleThunk(selectedRule.id)).unwrap();
        setState((prevState) => ({
          ...prevState,
          successMessage: 'Rule deactivated successfully!',
        }));
        dispatch(clearRuleCacheThunk()); // Clear rule cache to ensure fresh rule loading
      }
    } catch (error: any) {
      setState((prevState) => ({ ...prevState, errorMessage: error.message }));
    }
  }, [dispatch, selectedRule]);

  // LD1: Handle confirmation dialogs for publishing and deactivating
  const renderConfirmationDialog = useCallback((action: string) => {
    const open = action === 'publish' ? state.showPublishConfirm : state.showDeactivateConfirm;
    const title = action === 'publish' ? 'Publish Rule?' : 'Deactivate Rule?';
    const message = action === 'publish'
      ? 'Are you sure you want to publish this rule? This will make it active and apply to all calculations.'
      : 'Are you sure you want to deactivate this rule? This will remove it from all calculations.';

    return (
      <Dialog open={open} onClose={() => setState((prevState) => ({ ...prevState, showPublishConfirm: false, showDeactivateConfirm: false }))}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Typography>{message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setState((prevState) => ({ ...prevState, showPublishConfirm: false, showDeactivateConfirm: false }))}>Cancel</Button>
          <Button onClick={action === 'publish' ? handlePublish : handleDeactivate} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    );
  }, [handlePublish, handleDeactivate, state.showPublishConfirm, state.showDeactivateConfirm]);

  // LD1: Handle navigating back to the rule list
  const handleBack = useCallback(() => {
    onBack();
    dispatch(clearSelectedRule());
  }, [dispatch, onBack]);

  // LD1: Clean up selected rule on unmount
  useEffect(() => {
    return () => {
      dispatch(clearSelectedRule());
    };
  }, [dispatch]);

  // LD1: Render rule header with title and action buttons
  const renderRuleHeader = useCallback(() => {
    return (
      <RuleDetailHeader>
        <Box display="flex" alignItems="center">
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
            Back
          </Button>
          <Typography variant="h5" style={{ marginLeft: '16px' }}>
            {createMode ? 'New Rule' : 'Rule Details'}
          </Typography>
        </Box>
        <RuleDetailActions>
          {selectedRule && (
            <>
              <StatusIndicator status={selectedRule.status.toLowerCase()} label={selectedRule.status} />
              {!createMode && state.editMode ? (
                <>
                  <Button startIcon={<SaveIcon />} onClick={() => {}}>
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button startIcon={<EditIcon />} onClick={handleEditMode}>
                    Edit
                  </Button>
                  <Button startIcon={<PlayArrowIcon />} onClick={handleTest}>
                    Test
                  </Button>
                  {selectedRule.status === 'DRAFT' && (
                    <Button startIcon={<PublishIcon />} onClick={() => setState((prevState) => ({ ...prevState, showPublishConfirm: true }))}>
                      Publish
                    </Button>
                  )}
                  {selectedRule.status === 'ACTIVE' && (
                    <Button startIcon={<BlockIcon />} onClick={() => setState((prevState) => ({ ...prevState, showDeactivateConfirm: true }))}>
                      Deactivate
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </RuleDetailActions>
      </RuleDetailHeader>
    );
  }, [createMode, handleBack, handleEditMode, handleTest, selectedRule, state.editMode]);

  // LD1: Render tabs for different rule sections
  const renderTabs = useCallback(() => {
    return (
      <Tabs value={state.activeTab} onChange={(event, newValue) => handleTabChange(newValue)}>
        <Tab label="Details" />
        {state.editMode && <Tab label="Edit" />}
        <Tab label="Test Results" disabled={!ruleTestResults} />
      </Tabs>
    );
  }, [handleTabChange, ruleTestResults, state.activeTab, state.editMode]);

  // LD1: Render rule editor in edit mode
  const renderRuleEditor = useCallback(() => {
    if (state.editMode) {
      return (
        <RuleEditor
          rule={selectedRule}
          onChange={() => {}}
          onSave={handleSave}
          createMode={createMode}
        />
      );
    }
    return null;
  }, [createMode, handleSave, selectedRule, state.editMode]);

  // LD1: Render rule details in view mode
  const renderRuleDetails = useCallback(() => {
    return <Typography>Rule Details Content</Typography>;
  }, []);

  // LD1: Render test results if available
  const renderTestResults = useCallback(() => {
    return <Typography>Test Results Content</Typography>;
  }, []);

  return (
    <StyledRuleDetail className={className}>
      {renderRuleHeader()}
      {renderTabs()}
      <RuleDetailContent>
        {state.activeTab === 0 && renderRuleDetails()}
        {state.activeTab === 1 && renderRuleEditor()}
        {state.activeTab === 2 && renderTestResults()}
      </RuleDetailContent>
      {renderConfirmationDialog('publish')}
      {renderConfirmationDialog('deactivate')}
    </StyledRuleDetail>
  );
};

export default RuleDetail;