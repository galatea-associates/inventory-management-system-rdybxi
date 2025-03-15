import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  API_ENDPOINTS,
  CALCULATION_TYPES,
  PERFORMANCE_THRESHOLDS,
  TEST_DATA_PATHS
} from '../../common/constants';
import {
  loadTestData,
  validatePerformance,
  waitForCondition
} from '../../common/testUtils';

// Global variables
const API_BASE_URL = process.env.API_TEST_URL || 'http://localhost:8080/api/v1';
let mockAxios: MockAdapter;
let testPositions: any;
let testInventories: any;

/**
 * Fetches inventory calculation results from the API
 * @param businessDate The business date for which to fetch inventory calculations
 * @returns Promise that resolves to the inventory calculation results
 */
async function fetchInventoryCalculation(businessDate: string) {
  const url = `${API_BASE_URL}/inventory`;
  const response = await axios.get(url, {
    params: { businessDate }
  });
  return response.data;
}

/**
 * Fetches inventory calculation results for a specific security from the API
 * @param securityId The security identifier
 * @param businessDate The business date for which to fetch inventory calculations
 * @returns Promise that resolves to the inventory calculation results for the security
 */
async function fetchInventoryCalculationForSecurity(securityId: string, businessDate: string) {
  const url = `${API_BASE_URL}/inventory/security/${securityId}`;
  const response = await axios.get(url, {
    params: { businessDate }
  });
  return response.data;
}

/**
 * Fetches for loan availability calculation results from the API
 * @param businessDate The business date for which to fetch for loan availability
 * @returns Promise that resolves to the for loan availability calculation results
 */
async function fetchForLoanAvailability(businessDate: string) {
  const url = `${API_BASE_URL}${API_ENDPOINTS.INVENTORY.FOR_LOAN}`;
  const response = await axios.get(url, {
    params: { businessDate }
  });
  return response.data;
}

/**
 * Fetches for pledge availability calculation results from the API
 * @param businessDate The business date for which to fetch for pledge availability
 * @returns Promise that resolves to the for pledge availability calculation results
 */
async function fetchForPledgeAvailability(businessDate: string) {
  const url = `${API_BASE_URL}${API_ENDPOINTS.INVENTORY.FOR_PLEDGE}`;
  const response = await axios.get(url, {
    params: { businessDate }
  });
  return response.data;
}

/**
 * Sets up mock responses for API requests
 */
function setupMockResponses() {
  // Mock response for general inventory endpoint
  mockAxios.onGet(`${API_BASE_URL}/inventory`).reply(200, testInventories.all);
  
  // Mock response for inventory by security endpoint
  mockAxios.onGet(new RegExp(`${API_BASE_URL}/inventory/security/.*`)).reply((config) => {
    const url = config.url || '';
    const securityId = url.split('/').pop();
    const securityData = testInventories.bySecurityId[securityId];
    return [200, securityData || {}];
  });
  
  // Mock response for for-loan availability endpoint
  mockAxios.onGet(`${API_BASE_URL}${API_ENDPOINTS.INVENTORY.FOR_LOAN}`).reply(200, testInventories.forLoan);
  
  // Mock response for for-pledge availability endpoint
  mockAxios.onGet(`${API_BASE_URL}${API_ENDPOINTS.INVENTORY.FOR_PLEDGE}`).reply(200, testInventories.forPledge);
  
  // Mock response for short-sell limits
  mockAxios.onGet(`${API_BASE_URL}${API_ENDPOINTS.INVENTORY.SELL_LIMITS}`).reply(200, testInventories.sellLimits);
  
  // Mock response for overborrow identification
  mockAxios.onGet(`${API_BASE_URL}${API_ENDPOINTS.INVENTORY.OVERBORROWS}`).reply(200, testInventories.overborrows);
  
  // Mock response for locate availability endpoint
  mockAxios.onGet(new RegExp(`${API_BASE_URL}/inventory/locate/.*`)).reply((config) => {
    const url = config.url || '';
    const securityId = url.split('/').pop();
    return [200, { ...testInventories.locate, securityId }];
  });
}

/**
 * Validates inventory calculation results against expected values
 * @param results The calculation results to validate
 * @param calculationType The type of calculation being validated
 */
function validateInventoryCalculationResults(results: any, calculationType: string) {
  expect(results).toBeDefined();
  expect(results.calculationType).toBe(calculationType);
  
  // Validate based on calculation type
  switch (calculationType) {
    case CALCULATION_TYPES.FOR_LOAN:
      // Validate for loan availability
      expect(results.includedPositions).toBeDefined();
      expect(results.includedHypothecatableAssets).toBeDefined();
      expect(results.includedRepoPledgedAssets).toBeDefined();
      expect(results.includedFinancingSwapAssets).toBeDefined();
      expect(results.includedExternalAvailabilities).toBeDefined();
      expect(results.includedCrossBorderSecurities).toBeDefined();
      
      expect(results.excludedSLABLending).toBeDefined();
      expect(results.excludedPayToHolds).toBeDefined();
      expect(results.excludedReservedClientAssets).toBeDefined();
      expect(results.excludedCorporateActionAssets).toBeDefined();
      break;
      
    case CALCULATION_TYPES.FOR_PLEDGE:
      // Validate for pledge availability
      expect(results.includedPositions).toBeDefined();
      expect(results.excludedAlreadyPledged).toBeDefined();
      expect(results.excludedCorporateActionAssets).toBeDefined();
      break;
      
    case CALCULATION_TYPES.OVERBORROW:
      // Validate overborrow identification
      expect(results.overborrowedSecurities).toBeDefined();
      expect(results.totalOverborrowValue).toBeDefined();
      break;
      
    case CALCULATION_TYPES.LONG_SELL:
    case CALCULATION_TYPES.SHORT_SELL:
      // Validate sell limits
      expect(results.clientLimits).toBeDefined();
      expect(results.aggregationUnitLimits).toBeDefined();
      break;
      
    case CALCULATION_TYPES.LOCATE:
      // Validate locate availability
      expect(results.availableLocateQuantity).toBeDefined();
      expect(results.availableBySource).toBeDefined();
      break;
  }
  
  // Validate market-specific rules where applicable
  if (results.marketCode === 'TW') {
    // Taiwan market rules
    expect(results.excludedBorrowedShares).toBeDefined();
  } else if (results.marketCode === 'JP') {
    // Japan market rules
    expect(results.settlementCutoffApplied).toBeDefined();
    expect(results.quantoSettlements).toBeDefined();
  }
}

describe('Inventory Calculation Integration Tests', () => {
  beforeAll(() => {
    // Load test data
    testPositions = loadTestData(`${TEST_DATA_PATHS.POSITIONS}/test-positions.json`);
    testInventories = loadTestData(`${TEST_DATA_PATHS.INVENTORIES}/test-inventories.json`);
    
    // Setup mock axios
    mockAxios = new MockAdapter(axios);
    setupMockResponses();
  });

  afterAll(() => {
    mockAxios.restore();
  });

  test('should calculate all inventory types for a business date', async () => {
    const businessDate = '2023-06-15';
    const results = await fetchInventoryCalculation(businessDate);
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    
    // Check that all calculation types are present
    const calculationTypes = results.map((item: any) => item.calculationType);
    expect(calculationTypes).toContain(CALCULATION_TYPES.FOR_LOAN);
    expect(calculationTypes).toContain(CALCULATION_TYPES.FOR_PLEDGE);
    expect(calculationTypes).toContain(CALCULATION_TYPES.SHORT_SELL);
    expect(calculationTypes).toContain(CALCULATION_TYPES.LONG_SELL);
    expect(calculationTypes).toContain(CALCULATION_TYPES.LOCATE);
    expect(calculationTypes).toContain(CALCULATION_TYPES.OVERBORROW);
    
    // Validate each calculation type
    results.forEach((result: any) => {
      validateInventoryCalculationResults(result, result.calculationType);
    });
    
    // Verify performance
    const performanceResult = await validatePerformance(
      fetchInventoryCalculation,
      [businessDate],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(performanceResult.success).toBe(true);
  });

  test('should calculate inventory for a specific security', async () => {
    const securityId = 'AAPL';
    const businessDate = '2023-06-15';
    
    const results = await fetchInventoryCalculationForSecurity(securityId, businessDate);
    
    expect(results).toBeDefined();
    expect(results.securityId).toBe(securityId);
    
    // Check that security-specific calculations are present
    expect(results.forLoan).toBeDefined();
    expect(results.forPledge).toBeDefined();
    expect(results.shortSell).toBeDefined();
    expect(results.longSell).toBeDefined();
    expect(results.locate).toBeDefined();
    
    // Validate calculations for the security
    Object.keys(results).forEach(key => {
      if (Object.values(CALCULATION_TYPES).includes(key.toUpperCase())) {
        validateInventoryCalculationResults(results[key], key.toUpperCase());
      }
    });
    
    // Verify performance
    const performanceResult = await validatePerformance(
      fetchInventoryCalculationForSecurity,
      [securityId, businessDate],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(performanceResult.success).toBe(true);
  });

  test('should calculate for loan availability correctly', async () => {
    const businessDate = '2023-06-15';
    const results = await fetchForLoanAvailability(businessDate);
    
    expect(results).toBeDefined();
    
    // Validate for loan availability calculations
    validateInventoryCalculationResults(results, CALCULATION_TYPES.FOR_LOAN);
    
    // Check specific business rules for for loan availability
    expect(results.includedHypothecatableAssets).toBeDefined();
    expect(results.includedRepoPledgedAssets).toBeDefined();
    expect(results.includedFinancingSwapAssets).toBeDefined();
    expect(results.includedExternalAvailabilities).toBeDefined();
    expect(results.includedCrossBorderSecurities).toBeDefined();
    
    expect(results.excludedSLABLending).toBeDefined();
    expect(results.excludedPayToHolds).toBeDefined();
    expect(results.excludedReservedClientAssets).toBeDefined();
    expect(results.excludedCorporateActionAssets).toBeDefined();
    
    // Verify performance
    const performanceResult = await validatePerformance(
      fetchForLoanAvailability,
      [businessDate],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(performanceResult.success).toBe(true);
  });

  test('should calculate for pledge availability correctly', async () => {
    const businessDate = '2023-06-15';
    const results = await fetchForPledgeAvailability(businessDate);
    
    expect(results).toBeDefined();
    
    // Validate for pledge availability calculations
    validateInventoryCalculationResults(results, CALCULATION_TYPES.FOR_PLEDGE);
    
    // Check specific business rules for for pledge availability
    expect(results.includedPositions).toBeDefined();
    expect(results.excludedAlreadyPledged).toBeDefined();
    expect(results.excludedCorporateActionAssets).toBeDefined();
    
    // Verify performance
    const performanceResult = await validatePerformance(
      fetchForPledgeAvailability,
      [businessDate],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(performanceResult.success).toBe(true);
  });

  test('should apply market-specific rules for Taiwan market', async () => {
    const securityId = 'TAIWANSECURITY';
    const businessDate = '2023-06-15';
    
    const results = await fetchInventoryCalculationForSecurity(securityId, businessDate);
    
    expect(results).toBeDefined();
    expect(results.securityId).toBe(securityId);
    expect(results.marketCode).toBe('TW');
    
    // Validate Taiwan-specific rules: Borrowed shares excluded from for-loan availability
    expect(results.forLoan).toBeDefined();
    expect(results.forLoan.excludedBorrowedShares).toBeDefined();
    expect(results.forLoan.excludedBorrowedShares.length).toBeGreaterThan(0);
    
    // Verify performance
    const performanceResult = await validatePerformance(
      fetchInventoryCalculationForSecurity,
      [securityId, businessDate],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(performanceResult.success).toBe(true);
  });

  test('should apply market-specific rules for Japan market', async () => {
    const securityId = 'JAPANSECURITY';
    const businessDate = '2023-06-15';
    
    const results = await fetchInventoryCalculationForSecurity(securityId, businessDate);
    
    expect(results).toBeDefined();
    expect(results.securityId).toBe(securityId);
    expect(results.marketCode).toBe('JP');
    
    // Validate Japan-specific rules
    // 1. Settlement cut-off rules for SLAB activity
    expect(results.forLoan.settlementCutoffApplied).toBe(true);
    
    // 2. Quanto settlements with T+2
    expect(results.forLoan.quantoSettlements).toBeDefined();
    expect(results.forLoan.quantoSettlements.length).toBeGreaterThan(0);
    
    // Verify performance
    const performanceResult = await validatePerformance(
      fetchInventoryCalculationForSecurity,
      [securityId, businessDate],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(performanceResult.success).toBe(true);
  });

  test('should identify overborrows correctly', async () => {
    const businessDate = '2023-06-15';
    const url = `${API_BASE_URL}${API_ENDPOINTS.INVENTORY.OVERBORROWS}`;
    const response = await axios.get(url, {
      params: { businessDate }
    });
    const results = response.data;
    
    expect(results).toBeDefined();
    expect(results.calculationType).toBe(CALCULATION_TYPES.OVERBORROW);
    expect(Array.isArray(results.overborrowedSecurities)).toBe(true);
    expect(results.overborrowedSecurities.length).toBeGreaterThan(0);
    
    // Check overborrow calculation logic
    results.overborrowedSecurities.forEach((item: any) => {
      expect(item.securityId).toBeDefined();
      expect(item.overborrowQuantity).toBeGreaterThan(0);
      expect(item.currentBorrowQuantity).toBeGreaterThan(item.requiredBorrowQuantity);
    });
    
    // Verify performance
    const fetchOverborrows = async () => {
      const response = await axios.get(url, { params: { businessDate } });
      return response.data;
    };
    
    const performanceResult = await validatePerformance(
      fetchOverborrows,
      [],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(performanceResult.success).toBe(true);
  });

  test('should handle external availability sources correctly', async () => {
    const businessDate = '2023-06-15';
    const results = await fetchForLoanAvailability(businessDate);
    
    expect(results).toBeDefined();
    
    // Check for external availability sources
    expect(results.includedExternalAvailabilities).toBeDefined();
    expect(Array.isArray(results.includedExternalAvailabilities)).toBe(true);
    expect(results.includedExternalAvailabilities.length).toBeGreaterThan(0);
    
    // Validate external source data structure
    results.includedExternalAvailabilities.forEach((source: any) => {
      expect(source.sourceId).toBeDefined();
      expect(source.sourceName).toBeDefined();
      expect(source.securities).toBeDefined();
      expect(Array.isArray(source.securities)).toBe(true);
    });
    
    // Verify performance
    const performanceResult = await validatePerformance(
      fetchForLoanAvailability,
      [businessDate],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(performanceResult.success).toBe(true);
  });

  test('should calculate long and short sell availability correctly', async () => {
    const businessDate = '2023-06-15';
    const url = `${API_BASE_URL}${API_ENDPOINTS.INVENTORY.SELL_LIMITS}`;
    const response = await axios.get(url, {
      params: { businessDate }
    });
    const results = response.data;
    
    expect(results).toBeDefined();
    
    // Check long sell limits
    expect(results.longSell).toBeDefined();
    expect(results.longSell.calculationType).toBe(CALCULATION_TYPES.LONG_SELL);
    expect(results.longSell.clientLimits).toBeDefined();
    expect(results.longSell.aggregationUnitLimits).toBeDefined();
    
    // Check client long sell limits
    results.longSell.clientLimits.forEach((limit: any) => {
      expect(limit.clientId).toBeDefined();
      expect(limit.longPositions).toBeDefined();
      expect(limit.approvedLocates).toBeDefined();
      expect(limit.approvedLongSellOrders).toBeDefined();
      expect(limit.availableLongSellLimit).toBeDefined();
    });
    
    // Check short sell limits
    expect(results.shortSell).toBeDefined();
    expect(results.shortSell.calculationType).toBe(CALCULATION_TYPES.SHORT_SELL);
    expect(results.shortSell.clientLimits).toBeDefined();
    expect(results.shortSell.aggregationUnitLimits).toBeDefined();
    
    // Check client short sell limits
    results.shortSell.clientLimits.forEach((limit: any) => {
      expect(limit.clientId).toBeDefined();
      expect(limit.approvedLocates).toBeDefined();
      expect(limit.approvedShortSellPayToHolds).toBeDefined();
      expect(limit.approvedShortSellOrders).toBeDefined();
      expect(limit.availableShortSellLimit).toBeDefined();
    });
    
    // Check aggregation unit limits
    results.shortSell.aggregationUnitLimits.forEach((limit: any) => {
      expect(limit.aggregationUnitId).toBeDefined();
      expect(limit.existingBorrowContracts).toBeDefined();
      expect(limit.existingLoanContracts).toBeDefined();
      expect(limit.externalLenderAvailabilities).toBeDefined();
      expect(limit.availableShortSellLimit).toBeDefined();
    });
    
    // Verify performance
    const fetchSellLimits = async () => {
      const response = await axios.get(url, { params: { businessDate } });
      return response.data;
    };
    
    const performanceResult = await validatePerformance(
      fetchSellLimits,
      [],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(performanceResult.success).toBe(true);
  });

  test('should calculate locate availability correctly', async () => {
    const businessDate = '2023-06-15';
    const securityId = 'AAPL';
    const url = `${API_BASE_URL}/inventory/locate/${securityId}`;
    
    const response = await axios.get(url, {
      params: { businessDate }
    });
    const results = response.data;
    
    expect(results).toBeDefined();
    expect(results.calculationType).toBe(CALCULATION_TYPES.LOCATE);
    expect(results.securityId).toBe(securityId);
    
    // Check locate availability calculations
    expect(results.availableLocateQuantity).toBeDefined();
    expect(results.availableBySource).toBeDefined();
    expect(Array.isArray(results.availableBySource)).toBe(true);
    
    // Check available sources
    results.availableBySource.forEach((source: any) => {
      expect(source.sourceId).toBeDefined();
      expect(source.sourceName).toBeDefined();
      expect(source.availableQuantity).toBeDefined();
    });
    
    // Check market-specific rules if applicable
    if (results.marketCode) {
      if (results.marketCode === 'TW') {
        expect(results.excludedBorrowedShares).toBeDefined();
      } else if (results.marketCode === 'JP') {
        expect(results.settlementCutoffApplied).toBeDefined();
      }
    }
    
    // Verify performance
    const fetchLocateAvailability = async () => {
      const response = await axios.get(url, { params: { businessDate } });
      return response.data;
    };
    
    const performanceResult = await validatePerformance(
      fetchLocateAvailability,
      [],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(performanceResult.success).toBe(true);
  });

  test('should meet performance requirements for inventory calculations', async () => {
    const businessDate = '2023-06-15';
    
    // Test performance of different calculation types
    const forLoanPerformance = await validatePerformance(
      fetchForLoanAvailability,
      [businessDate],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(forLoanPerformance.success).toBe(true);
    expect(forLoanPerformance.executionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION);
    
    const forPledgePerformance = await validatePerformance(
      fetchForPledgeAvailability,
      [businessDate],
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(forPledgePerformance.success).toBe(true);
    expect(forPledgePerformance.executionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION);
    
    // Test with a large dataset
    const largeDatePerformance = await validatePerformance(
      fetchInventoryCalculation,
      ['2023-06-30'], // Assume this date has more data
      PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION
    );
    expect(largeDatePerformance.success).toBe(true);
    expect(largeDatePerformance.executionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.INVENTORY_CALCULATION);
  });
});