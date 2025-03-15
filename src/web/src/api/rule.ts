/**
 * API client module for calculation rule management in the Inventory Management System.
 * Provides functions for retrieving, creating, updating, and managing calculation rules
 * that define how inventory calculations are performed across different markets and 
 * regulatory environments.
 */

import { get, post, put, delete as deleteRequest } from './client'; // axios 1.4.0
import { ApiResponse, CalculationRulePayload } from '../types/api';
import { CalculationRule, RuleCondition, RuleAction } from '../types/models';

/**
 * Retrieves all active calculation rules
 * 
 * @returns Promise resolving to an API response containing an array of active calculation rules
 */
export async function getActiveRules(): Promise<ApiResponse<CalculationRule[]>> {
  return get('/api/v1/calculations/rules');
}

/**
 * Retrieves active calculation rules for a specific rule type and market
 * 
 * @param ruleType - The type of calculation rule to retrieve
 * @param market - The market to retrieve rules for
 * @returns Promise resolving to an API response containing an array of active calculation rules for the specified type and market
 */
export async function getRulesByTypeAndMarket(
  ruleType: string,
  market: string
): Promise<ApiResponse<CalculationRule[]>> {
  return get(`/api/v1/calculations/rules/type/${ruleType}/market/${market}`);
}

/**
 * Retrieves a calculation rule by its name and market
 * 
 * @param name - The name of the rule to retrieve
 * @param market - The market of the rule to retrieve
 * @returns Promise resolving to an API response containing the calculation rule with the specified name and market
 */
export async function getRuleByNameAndMarket(
  name: string,
  market: string
): Promise<ApiResponse<CalculationRule>> {
  return get(`/api/v1/calculations/rules/name/${name}/market/${market}`);
}

/**
 * Creates a new calculation rule
 * 
 * @param rule - The calculation rule payload to create
 * @returns Promise resolving to an API response containing the created calculation rule
 */
export async function createRule(
  rule: CalculationRulePayload
): Promise<ApiResponse<CalculationRule>> {
  return post('/api/v1/calculations/rules', rule);
}

/**
 * Updates an existing calculation rule
 * 
 * @param rule - The calculation rule payload to update
 * @returns Promise resolving to an API response containing the updated calculation rule
 */
export async function updateRule(
  rule: CalculationRulePayload
): Promise<ApiResponse<CalculationRule>> {
  return put('/api/v1/calculations/rules', rule);
}

/**
 * Clears the rule cache to force fresh rule loading
 * 
 * @returns Promise resolving to an API response indicating success
 */
export async function clearRuleCache(): Promise<ApiResponse<void>> {
  return post('/api/v1/calculations/rules/clear-cache');
}

/**
 * Retrieves available rule types for calculation rules
 * 
 * @returns Promise resolving to an API response containing an array of available rule types
 */
export async function getRuleTypes(): Promise<ApiResponse<string[]>> {
  return get('/api/v1/calculations/rules/types');
}

/**
 * Retrieves available statuses for calculation rules
 * 
 * @returns Promise resolving to an API response containing an array of available rule statuses
 */
export async function getRuleStatuses(): Promise<ApiResponse<string[]>> {
  return get('/api/v1/calculations/rules/statuses');
}

/**
 * Retrieves available markets for calculation rules
 * 
 * @returns Promise resolving to an API response containing an array of available markets
 */
export async function getAvailableMarkets(): Promise<ApiResponse<string[]>> {
  return get('/api/v1/calculations/rules/markets');
}

/**
 * Retrieves available inclusion criteria options for a specific rule type
 * 
 * @param ruleType - The type of rule to get inclusion criteria options for
 * @returns Promise resolving to an API response containing a map of inclusion criteria keys to display names
 */
export async function getInclusionCriteriaOptions(
  ruleType: string
): Promise<ApiResponse<Record<string, string>>> {
  return get(`/api/v1/calculations/rules/criteria/inclusion?ruleType=${ruleType}`);
}

/**
 * Retrieves available exclusion criteria options for a specific rule type
 * 
 * @param ruleType - The type of rule to get exclusion criteria options for
 * @returns Promise resolving to an API response containing a map of exclusion criteria keys to display names
 */
export async function getExclusionCriteriaOptions(
  ruleType: string
): Promise<ApiResponse<Record<string, string>>> {
  return get(`/api/v1/calculations/rules/criteria/exclusion?ruleType=${ruleType}`);
}

/**
 * Tests a calculation rule against sample data
 * 
 * @param rule - The calculation rule payload to test
 * @returns Promise resolving to an API response containing the test results
 */
export async function testRule(
  rule: CalculationRulePayload
): Promise<ApiResponse<any>> {
  return post('/api/v1/calculations/rules/test', rule);
}

/**
 * Publishes a calculation rule, changing its status to active
 * 
 * @param ruleId - The ID of the rule to publish
 * @returns Promise resolving to an API response containing the published calculation rule
 */
export async function publishRule(
  ruleId: string
): Promise<ApiResponse<CalculationRule>> {
  return post(`/api/v1/calculations/rules/${ruleId}/publish`);
}

/**
 * Deactivates a calculation rule, changing its status to inactive
 * 
 * @param ruleId - The ID of the rule to deactivate
 * @returns Promise resolving to an API response containing the deactivated calculation rule
 */
export async function deactivateRule(
  ruleId: string
): Promise<ApiResponse<CalculationRule>> {
  return post(`/api/v1/calculations/rules/${ruleId}/deactivate`);
}