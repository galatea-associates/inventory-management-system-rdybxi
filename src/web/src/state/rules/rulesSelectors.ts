import { createSelector } from '@reduxjs/toolkit'; // v1.9.3
import { RootState } from '../../types/state';
import { CalculationRule } from '../../types/models';

/**
 * Base selector that returns the rules slice from the root state
 */
export const selectRulesState = (state: RootState) => state.rules;

/**
 * Selector for retrieving all calculation rules
 */
export const selectRules = createSelector(
  [selectRulesState],
  (rulesState) => rulesState.rules
);

/**
 * Selector for retrieving the currently selected calculation rule
 */
export const selectSelectedRule = createSelector(
  [selectRulesState],
  (rulesState) => rulesState.selectedRule
);

/**
 * Selector for retrieving the loading state of rules
 */
export const selectRulesLoading = createSelector(
  [selectRulesState],
  (rulesState) => rulesState.isLoading
);

/**
 * Selector for retrieving the submitting state of rules
 */
export const selectRulesSubmitting = createSelector(
  [selectRulesState],
  (rulesState) => rulesState.isSubmitting
);

/**
 * Selector for retrieving any error in the rules state
 */
export const selectRulesError = createSelector(
  [selectRulesState],
  (rulesState) => rulesState.error
);

/**
 * Selector for retrieving the current rule filters
 */
export const selectRuleFilters = createSelector(
  [selectRulesState],
  (rulesState) => rulesState.filters
);

/**
 * Selector for retrieving the pagination state for rules
 */
export const selectRulePagination = createSelector(
  [selectRulesState],
  (rulesState) => rulesState.pagination
);

/**
 * Selector for retrieving the test results for a rule
 */
export const selectRuleTestResults = createSelector(
  [selectRulesState],
  (rulesState) => rulesState.testResults
);

/**
 * Selector for filtering rules by rule type
 */
export const selectRulesByType = createSelector(
  [selectRules, (_, ruleType: string) => ruleType],
  (rules, ruleType) => rules.filter(rule => rule.ruleType === ruleType)
);

/**
 * Selector for filtering rules by market
 */
export const selectRulesByMarket = createSelector(
  [selectRules, (_, market: string) => market],
  (rules, market) => rules.filter(rule => rule.market === market)
);

/**
 * Selector for filtering rules by status
 */
export const selectRulesByStatus = createSelector(
  [selectRules, (_, status: string) => status],
  (rules, status) => rules.filter(rule => rule.status === status)
);

/**
 * Selector for retrieving only active rules
 */
export const selectActiveRules = createSelector(
  [selectRules],
  (rules) => rules.filter(rule => rule.status === 'ACTIVE')
);

/**
 * Selector for retrieving only draft rules
 */
export const selectDraftRules = createSelector(
  [selectRules],
  (rules) => rules.filter(rule => rule.status === 'DRAFT')
);

/**
 * Selector for retrieving a specific rule by ID
 */
export const selectRuleById = createSelector(
  [selectRules, (_, ruleId: string) => ruleId],
  (rules, ruleId) => rules.find(rule => rule.id === ruleId)
);

/**
 * Selector for retrieving rules filtered by the current filter criteria
 */
export const selectFilteredRules = createSelector(
  [selectRules, selectRuleFilters],
  (rules, filters) => {
    return rules.filter(rule => {
      // Check each filter condition if it exists
      if (filters.ruleType && rule.ruleType !== filters.ruleType) {
        return false;
      }
      if (filters.market && rule.market !== filters.market) {
        return false;
      }
      if (filters.status && rule.status !== filters.status) {
        return false;
      }
      if (filters.name && !rule.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      return true;
    });
  }
);