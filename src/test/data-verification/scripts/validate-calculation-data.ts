#!/usr/bin/env node
/**
 * Script for validating calculation data against the defined JSON schema.
 * This script loads calculation data from a file or API, validates it against the calculation data schema,
 * and reports any validation errors. It ensures that all calculation data (positions, settlement ladders,
 * inventory availability, client limits, aggregation unit limits, calculation rules) conforms to the
 * expected structure and constraints.
 */

import * as fs from 'fs-extra'; // v11.1.1
import * as path from 'path'; // v0.12.7
import Ajv from 'ajv'; // v8.12.0
import { addFormats } from 'ajv-formats'; // v2.1.1
import chalk from 'chalk'; // v5.2.0
import { Command } from 'commander'; // v10.0.1

import { loadTestData } from '../../../test/common/testUtils';
import { TEST_DATA_PATHS, CALCULATION_TYPES } from '../../../test/common/constants';

/**
 * Loads the calculation data JSON schema from the expected schema file.
 * 
 * @returns The parsed JSON schema for calculation data
 */
function loadCalculationDataSchema(): any {
  try {
    // Resolve the path to the calculation data schema file
    const schemaPath = path.resolve(__dirname, '../../../../schema/calculation-data-schema.json');
    
    // Read and parse the schema file
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    return schema;
  } catch (error) {
    console.error(chalk.red('Error loading calculation data schema:'), error);
    process.exit(1);
  }
}

/**
 * Loads calculation data from a file or test fixture.
 * 
 * @param filePath - Optional path to the calculation data file
 * @returns The parsed calculation data object
 */
function loadCalculationData(filePath?: string): any {
  try {
    // If a file path is provided, read and parse the file
    if (filePath) {
      const absolutePath = path.resolve(filePath);
      const fileContent = fs.readFileSync(absolutePath, 'utf8');
      return JSON.parse(fileContent);
    }
    
    // Otherwise load from the default test fixture path
    return loadTestData(path.join(TEST_DATA_PATHS.REFERENCE_DATA, 'calculation-data.json'));
  } catch (error) {
    console.error(chalk.red('Error loading calculation data:'), error);
    process.exit(1);
  }
}

/**
 * Validates calculation data against the JSON schema.
 * 
 * @param calculationData - The calculation data to validate
 * @param schema - The JSON schema to validate against
 * @returns Validation result with success flag and any errors
 */
function validateCalculationData(calculationData: any, schema: any): { success: boolean; errors?: any[] } {
  try {
    // Create a new Ajv instance with strict mode and all errors
    const ajv = new Ajv({ strict: true, allErrors: true });
    
    // Add formats to the Ajv instance
    addFormats(ajv);
    
    // Compile the schema
    const validate = ajv.compile(schema);
    
    // Validate the calculation data against the compiled schema
    const valid = validate(calculationData);
    
    if (!valid) {
      // Format validation errors for readability
      const formattedErrors = formatValidationErrors(validate.errors || []);
      return {
        success: false,
        errors: formattedErrors
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error(chalk.red('Error during schema validation:'), error);
    return {
      success: false,
      errors: [{ message: `Validation error: ${error.message}` }]
    };
  }
}

/**
 * Formats validation errors into a readable structure.
 * 
 * @param errors - The validation errors from Ajv
 * @returns Formatted error messages
 */
function formatValidationErrors(errors: any[]): any[] {
  return errors.map(error => {
    const path = error.instancePath || '';
    const message = error.message || 'Unknown error';
    
    let formattedError = {
      path,
      message,
      schemaPath: error.schemaPath,
      params: error.params
    };
    
    // Add more details based on error type
    if (error.keyword === 'required') {
      formattedError.message = `Missing required property: ${error.params.missingProperty}`;
    } else if (error.keyword === 'enum') {
      formattedError.message = `Value must be one of: ${error.params.allowedValues.join(', ')}`;
    } else if (error.keyword === 'type') {
      formattedError.message = `Expected ${error.params.type}, got ${typeof error.data}`;
    }
    
    return formattedError;
  });
}

/**
 * Performs additional consistency checks on positions data beyond schema validation.
 * 
 * @param calculationData - The calculation data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validatePositionsConsistency(calculationData: any): { success: boolean; errors?: any[] } {
  const errors: any[] = [];
  
  // Skip if positions are not present
  if (!calculationData.positions || !Array.isArray(calculationData.positions)) {
    return { success: true };
  }
  
  const { positions } = calculationData;
  
  // Check for duplicate position IDs
  const positionIds = new Set();
  positions.forEach((position: any, index: number) => {
    if (positionIds.has(position.positionId)) {
      errors.push({
        path: `/positions[${index}]`,
        message: `Duplicate position ID: ${position.positionId}`
      });
    }
    positionIds.add(position.positionId);
    
    // Verify that all positions have valid security IDs
    if (!position.securityId) {
      errors.push({
        path: `/positions[${index}]`,
        message: 'Position missing securityId'
      });
    }
    
    // Check that position types match the sign of quantities
    if (position.positionType === 'LONG' && position.quantity < 0) {
      errors.push({
        path: `/positions[${index}]`,
        message: 'LONG position has negative quantity'
      });
    } else if (position.positionType === 'SHORT' && position.quantity > 0) {
      errors.push({
        path: `/positions[${index}]`,
        message: 'SHORT position has positive quantity'
      });
    }
    
    // Verify that settlement ladder quantities are consistent
    if (position.settlementLadder) {
      const { settlementLadder } = position;
      const sumDeliveries = 
        (settlementLadder.sd0Deliver || 0) +
        (settlementLadder.sd1Deliver || 0) +
        (settlementLadder.sd2Deliver || 0) +
        (settlementLadder.sd3Deliver || 0) +
        (settlementLadder.sd4Deliver || 0);
      
      const sumReceipts =
        (settlementLadder.sd0Receipt || 0) +
        (settlementLadder.sd1Receipt || 0) +
        (settlementLadder.sd2Receipt || 0) +
        (settlementLadder.sd3Receipt || 0) +
        (settlementLadder.sd4Receipt || 0);
        
      if (Math.abs(sumDeliveries - sumReceipts) > 0.0001) {
        errors.push({
          path: `/positions[${index}]/settlementLadder`,
          message: 'Settlement ladder deliveries and receipts do not balance'
        });
      }
    }
  });
  
  return { 
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on settlement ladders data beyond schema validation.
 * 
 * @param calculationData - The calculation data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateSettlementLaddersConsistency(calculationData: any): { success: boolean; errors?: any[] } {
  const errors: any[] = [];
  
  // Skip if settlement ladders are not present
  if (!calculationData.settlementLadders || !Array.isArray(calculationData.settlementLadders)) {
    return { success: true };
  }
  
  const { settlementLadders } = calculationData;
  
  // Check for duplicate settlement ladder IDs
  const ladderIds = new Set();
  settlementLadders.forEach((ladder: any, index: number) => {
    if (ladderIds.has(ladder.ladderId)) {
      errors.push({
        path: `/settlementLadders[${index}]`,
        message: `Duplicate settlement ladder ID: ${ladder.ladderId}`
      });
    }
    ladderIds.add(ladder.ladderId);
    
    // Verify that all settlement ladders have valid security IDs
    if (!ladder.securityId) {
      errors.push({
        path: `/settlementLadders[${index}]`,
        message: 'Settlement ladder missing securityId'
      });
    }
    
    // Check that net settlement matches the sum of individual days
    const netSettlement = ladder.netSettlement || 0;
    let totalSettle = 0;
    
    if (ladder.dailySettlements && Array.isArray(ladder.dailySettlements)) {
      totalSettle = ladder.dailySettlements.reduce(
        (sum: number, day: any) => sum + (day.quantity || 0),
        0
      );
      
      if (Math.abs(netSettlement - totalSettle) > 0.0001) {
        errors.push({
          path: `/settlementLadders[${index}]`,
          message: 'Net settlement does not match sum of daily settlements'
        });
      }
    }
    
    // Verify that deliveries and receipts maps match the individual day fields
    if (ladder.deliveries && typeof ladder.deliveries === 'object') {
      const totalDeliveries = Object.values(ladder.deliveries)
        .reduce((sum: number, qty: any) => sum + (parseFloat(qty) || 0), 0);
      
      const individualDeliveries = 
        (ladder.sd0Deliver || 0) +
        (ladder.sd1Deliver || 0) +
        (ladder.sd2Deliver || 0) +
        (ladder.sd3Deliver || 0) +
        (ladder.sd4Deliver || 0);
      
      if (Math.abs(totalDeliveries - individualDeliveries) > 0.0001) {
        errors.push({
          path: `/settlementLadders[${index}]/deliveries`,
          message: 'Deliveries map does not match individual day fields'
        });
      }
    }
    
    // Check that calculation dates are valid
    if (ladder.calculationDate) {
      const calculationDate = new Date(ladder.calculationDate);
      if (isNaN(calculationDate.getTime())) {
        errors.push({
          path: `/settlementLadders[${index}]/calculationDate`,
          message: 'Invalid calculation date'
        });
      }
    }
  });
  
  return { 
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on inventory availability data beyond schema validation.
 * 
 * @param calculationData - The calculation data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateInventoryAvailabilityConsistency(calculationData: any): { success: boolean; errors?: any[] } {
  const errors: any[] = [];
  
  // Skip if inventory availability is not present
  if (!calculationData.inventoryAvailability || !Array.isArray(calculationData.inventoryAvailability)) {
    return { success: true };
  }
  
  const { inventoryAvailability } = calculationData;
  
  // Check for duplicate inventory availability IDs
  const availabilityIds = new Set();
  inventoryAvailability.forEach((availability: any, index: number) => {
    if (availabilityIds.has(availability.availabilityId)) {
      errors.push({
        path: `/inventoryAvailability[${index}]`,
        message: `Duplicate inventory availability ID: ${availability.availabilityId}`
      });
    }
    availabilityIds.add(availability.availabilityId);
    
    // Verify that all inventory availability records have valid security IDs
    if (!availability.securityId) {
      errors.push({
        path: `/inventoryAvailability[${index}]`,
        message: 'Inventory availability missing securityId'
      });
    }
    
    // Check that available quantity is not greater than gross quantity
    if ((availability.availableQuantity || 0) > (availability.grossQuantity || 0)) {
      errors.push({
        path: `/inventoryAvailability[${index}]`,
        message: 'Available quantity exceeds gross quantity'
      });
    }
    
    // Verify that decrement quantity is not greater than available quantity
    if ((availability.decrementQuantity || 0) > (availability.availableQuantity || 0)) {
      errors.push({
        path: `/inventoryAvailability[${index}]`,
        message: 'Decrement quantity exceeds available quantity'
      });
    }
    
    // Validate that calculation rule IDs and versions are consistent
    if (availability.calculationRuleId && availability.calculationRuleVersion) {
      // Check that the referenced calculation rule exists and has the specified version
      if (calculationData.calculationRules && Array.isArray(calculationData.calculationRules)) {
        const rule = calculationData.calculationRules.find(
          (r: any) => r.ruleId === availability.calculationRuleId
        );
        
        if (!rule) {
          errors.push({
            path: `/inventoryAvailability[${index}]/calculationRuleId`,
            message: `Referenced calculation rule does not exist: ${availability.calculationRuleId}`
          });
        } else if (rule.versions && Array.isArray(rule.versions)) {
          const versionExists = rule.versions.some((v: any) => v.version === availability.calculationRuleVersion);
          if (!versionExists) {
            errors.push({
              path: `/inventoryAvailability[${index}]/calculationRuleVersion`,
              message: `Referenced calculation rule version does not exist: ${availability.calculationRuleVersion}`
            });
          }
        }
      }
    }
    
    // Check that calculation types are valid
    if (availability.calculationType) {
      const validTypes = Object.values(CALCULATION_TYPES);
      if (!validTypes.includes(availability.calculationType)) {
        errors.push({
          path: `/inventoryAvailability[${index}]/calculationType`,
          message: `Invalid calculation type: ${availability.calculationType}`
        });
      }
    }
  });
  
  return { 
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on client limits data beyond schema validation.
 * 
 * @param calculationData - The calculation data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateClientLimitsConsistency(calculationData: any): { success: boolean; errors?: any[] } {
  const errors: any[] = [];
  
  // Skip if client limits are not present
  if (!calculationData.clientLimits || !Array.isArray(calculationData.clientLimits)) {
    return { success: true };
  }
  
  const { clientLimits } = calculationData;
  
  // Check for duplicate client limit IDs
  const limitIds = new Set();
  clientLimits.forEach((limit: any, index: number) => {
    if (limitIds.has(limit.limitId)) {
      errors.push({
        path: `/clientLimits[${index}]`,
        message: `Duplicate client limit ID: ${limit.limitId}`
      });
    }
    limitIds.add(limit.limitId);
    
    // Verify that all client limits have valid client and security IDs
    if (!limit.clientId) {
      errors.push({
        path: `/clientLimits[${index}]`,
        message: 'Client limit missing clientId'
      });
    }
    
    if (!limit.securityId) {
      errors.push({
        path: `/clientLimits[${index}]`,
        message: 'Client limit missing securityId'
      });
    }
    
    // Check that used quantities are not greater than limit quantities
    if ((limit.usedQuantity || 0) > (limit.limitQuantity || 0)) {
      errors.push({
        path: `/clientLimits[${index}]`,
        message: 'Used quantity exceeds limit quantity'
      });
    }
    
    // Validate that limit types are valid
    if (limit.limitType) {
      const validTypes = [CALCULATION_TYPES.LONG_SELL, CALCULATION_TYPES.SHORT_SELL];
      if (!validTypes.includes(limit.limitType)) {
        errors.push({
          path: `/clientLimits[${index}]/limitType`,
          message: `Invalid limit type: ${limit.limitType}`
        });
      }
    }
    
    // Check that business dates are valid
    if (limit.businessDate) {
      const businessDate = new Date(limit.businessDate);
      if (isNaN(businessDate.getTime())) {
        errors.push({
          path: `/clientLimits[${index}]/businessDate`,
          message: 'Invalid business date'
        });
      }
    }
  });
  
  return { 
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on aggregation unit limits data beyond schema validation.
 * 
 * @param calculationData - The calculation data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateAggregationUnitLimitsConsistency(calculationData: any): { success: boolean; errors?: any[] } {
  const errors: any[] = [];
  
  // Skip if aggregation unit limits are not present
  if (!calculationData.aggregationUnitLimits || !Array.isArray(calculationData.aggregationUnitLimits)) {
    return { success: true };
  }
  
  const { aggregationUnitLimits } = calculationData;
  
  // Check for duplicate aggregation unit limit IDs
  const limitIds = new Set();
  aggregationUnitLimits.forEach((limit: any, index: number) => {
    if (limitIds.has(limit.limitId)) {
      errors.push({
        path: `/aggregationUnitLimits[${index}]`,
        message: `Duplicate aggregation unit limit ID: ${limit.limitId}`
      });
    }
    limitIds.add(limit.limitId);
    
    // Verify that all aggregation unit limits have valid aggregation unit and security IDs
    if (!limit.aggregationUnitId) {
      errors.push({
        path: `/aggregationUnitLimits[${index}]`,
        message: 'Aggregation unit limit missing aggregationUnitId'
      });
    }
    
    if (!limit.securityId) {
      errors.push({
        path: `/aggregationUnitLimits[${index}]`,
        message: 'Aggregation unit limit missing securityId'
      });
    }
    
    // Check that used quantities are not greater than limit quantities
    if ((limit.usedQuantity || 0) > (limit.limitQuantity || 0)) {
      errors.push({
        path: `/aggregationUnitLimits[${index}]`,
        message: 'Used quantity exceeds limit quantity'
      });
    }
    
    // Validate that limit types are valid
    if (limit.limitType) {
      const validTypes = [CALCULATION_TYPES.LONG_SELL, CALCULATION_TYPES.SHORT_SELL];
      if (!validTypes.includes(limit.limitType)) {
        errors.push({
          path: `/aggregationUnitLimits[${index}]/limitType`,
          message: `Invalid limit type: ${limit.limitType}`
        });
      }
    }
    
    // Check that business dates are valid
    if (limit.businessDate) {
      const businessDate = new Date(limit.businessDate);
      if (isNaN(businessDate.getTime())) {
        errors.push({
          path: `/aggregationUnitLimits[${index}]/businessDate`,
          message: 'Invalid business date'
        });
      }
    }
    
    // Verify that market-specific rules are valid
    if (limit.marketRules && typeof limit.marketRules === 'object') {
      const validMarkets = ['global', 'us', 'uk', 'japan', 'taiwan', 'eu'];
      Object.keys(limit.marketRules).forEach(market => {
        if (!validMarkets.includes(market.toLowerCase())) {
          errors.push({
            path: `/aggregationUnitLimits[${index}]/marketRules/${market}`,
            message: `Invalid market: ${market}`
          });
        }
      });
    }
  });
  
  return { 
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on calculation rules data beyond schema validation.
 * 
 * @param calculationData - The calculation data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateCalculationRulesConsistency(calculationData: any): { success: boolean; errors?: any[] } {
  const errors: any[] = [];
  
  // Skip if calculation rules are not present
  if (!calculationData.calculationRules || !Array.isArray(calculationData.calculationRules)) {
    return { success: true };
  }
  
  const { calculationRules } = calculationData;
  
  // Check for duplicate calculation rule IDs
  const ruleIds = new Set();
  calculationRules.forEach((rule: any, index: number) => {
    if (ruleIds.has(rule.ruleId)) {
      errors.push({
        path: `/calculationRules[${index}]`,
        message: `Duplicate calculation rule ID: ${rule.ruleId}`
      });
    }
    ruleIds.add(rule.ruleId);
    
    // Verify that rule conditions have valid attributes and operators
    if (rule.conditions && Array.isArray(rule.conditions)) {
      rule.conditions.forEach((condition: any, condIndex: number) => {
        if (!condition.attribute) {
          errors.push({
            path: `/calculationRules[${index}]/conditions[${condIndex}]`,
            message: 'Condition missing attribute'
          });
        }
        
        if (!condition.operator) {
          errors.push({
            path: `/calculationRules[${index}]/conditions[${condIndex}]`,
            message: 'Condition missing operator'
          });
        } else {
          const validOperators = ['=', '!=', '>', '<', '>=', '<=', 'in', 'not in', 'contains', 'starts with', 'ends with'];
          if (!validOperators.includes(condition.operator)) {
            errors.push({
              path: `/calculationRules[${index}]/conditions[${condIndex}]/operator`,
              message: `Invalid operator: ${condition.operator}`
            });
          }
        }
      });
    }
    
    // Check that rule actions have valid action types
    if (rule.actions && Array.isArray(rule.actions)) {
      rule.actions.forEach((action: any, actionIndex: number) => {
        if (!action.actionType) {
          errors.push({
            path: `/calculationRules[${index}]/actions[${actionIndex}]`,
            message: 'Action missing actionType'
          });
        } else {
          const validActionTypes = ['include', 'exclude', 'multiply', 'add', 'set'];
          if (!validActionTypes.includes(action.actionType)) {
            errors.push({
              path: `/calculationRules[${index}]/actions[${actionIndex}]/actionType`,
              message: `Invalid action type: ${action.actionType}`
            });
          }
        }
      });
    }
    
    // Validate that effective dates are before expiry dates where applicable
    if (rule.effectiveDate && rule.expiryDate) {
      const effectiveDate = new Date(rule.effectiveDate);
      const expiryDate = new Date(rule.expiryDate);
      
      if (!isNaN(effectiveDate.getTime()) && !isNaN(expiryDate.getTime()) && effectiveDate >= expiryDate) {
        errors.push({
          path: `/calculationRules[${index}]`,
          message: 'Effective date must be before expiry date'
        });
      }
    }
    
    // Check that rule priorities are consistent
    if (rule.priority !== undefined && (rule.priority < 0 || !Number.isInteger(rule.priority))) {
      errors.push({
        path: `/calculationRules[${index}]/priority`,
        message: 'Priority must be a non-negative integer'
      });
    }
    
    // Verify that rule versions are sequential
    if (rule.versions && Array.isArray(rule.versions)) {
      const versions = [...rule.versions].sort((a, b) => a.version - b.version);
      
      for (let i = 0; i < versions.length; i++) {
        if (versions[i].version !== i + 1) {
          errors.push({
            path: `/calculationRules[${index}]/versions`,
            message: 'Rule versions must be sequential starting from 1'
          });
          break;
        }
      }
    }
  });
  
  return { 
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on overborrow calculations data beyond schema validation.
 * 
 * @param calculationData - The calculation data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateOverborrowCalculationsConsistency(calculationData: any): { success: boolean; errors?: any[] } {
  const errors: any[] = [];
  
  // Skip if overborrow calculations are not present
  if (!calculationData.overborrowCalculations || !Array.isArray(calculationData.overborrowCalculations)) {
    return { success: true };
  }
  
  const { overborrowCalculations } = calculationData;
  
  // Check for duplicate overborrow calculation IDs
  const calculationIds = new Set();
  overborrowCalculations.forEach((calc: any, index: number) => {
    if (calculationIds.has(calc.calculationId)) {
      errors.push({
        path: `/overborrowCalculations[${index}]`,
        message: `Duplicate overborrow calculation ID: ${calc.calculationId}`
      });
    }
    calculationIds.add(calc.calculationId);
    
    // Verify that all overborrow calculations have valid security IDs
    if (!calc.securityId) {
      errors.push({
        path: `/overborrowCalculations[${index}]`,
        message: 'Overborrow calculation missing securityId'
      });
    }
    
    // Check that overborrow quantity matches borrowed minus required quantity
    const borrowedQty = calc.borrowedQuantity || 0;
    const requiredQty = calc.requiredQuantity || 0;
    const overborrowQty = calc.overborrowQuantity || 0;
    
    if (Math.abs((borrowedQty - requiredQty) - overborrowQty) > 0.0001) {
      errors.push({
        path: `/overborrowCalculations[${index}]`,
        message: 'Overborrow quantity does not match borrowed minus required quantity'
      });
    }
    
    // Validate that isOverborrowed flag is consistent with overborrow quantity
    if (calc.isOverborrowed !== undefined && calc.isOverborrowed !== (overborrowQty > 0)) {
      errors.push({
        path: `/overborrowCalculations[${index}]/isOverborrowed`,
        message: 'isOverborrowed flag is inconsistent with overborrow quantity'
      });
    }
    
    // Check that calculation dates are valid
    if (calc.calculationDate) {
      const calculationDate = new Date(calc.calculationDate);
      if (isNaN(calculationDate.getTime())) {
        errors.push({
          path: `/overborrowCalculations[${index}]/calculationDate`,
          message: 'Invalid calculation date'
        });
      }
    }
  });
  
  return { 
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validates that market-specific rules are correctly applied to calculation data.
 * 
 * @param calculationData - The calculation data to validate
 * @returns Validation result with success flag and any rule violation errors
 */
function validateMarketSpecificRules(calculationData: any): { success: boolean; errors?: any[] } {
  const errors: any[] = [];
  
  // Check Taiwan market rule: borrowed shares cannot be re-lent
  if (calculationData.inventoryAvailability && Array.isArray(calculationData.inventoryAvailability)) {
    calculationData.inventoryAvailability.forEach((availability: any, index: number) => {
      if (availability.market?.toLowerCase() === 'taiwan' && 
          availability.calculationType === CALCULATION_TYPES.FOR_LOAN &&
          availability.borrowedQuantity > 0) {
        
        errors.push({
          path: `/inventoryAvailability[${index}]`,
          message: 'Taiwan market rule violation: Borrowed shares cannot be re-lent'
        });
      }
    });
  }
  
  // Check Japan market rule: settlement cut-off times for SLAB activity
  if (calculationData.settlementLadders && Array.isArray(calculationData.settlementLadders)) {
    calculationData.settlementLadders.forEach((ladder: any, index: number) => {
      if (ladder.market?.toLowerCase() === 'japan' && 
          ladder.activityType === 'SLAB' &&
          ladder.settlementTime) {
        
        const settlementTime = new Date(ladder.settlementTime);
        const cutoffTime = new Date(ladder.settlementTime);
        cutoffTime.setHours(13, 30, 0); // 13:30 JST cutoff
        
        if (settlementTime > cutoffTime) {
          errors.push({
            path: `/settlementLadders[${index}]`,
            message: 'Japan market rule violation: SLAB activity must settle before 13:30 JST'
          });
        }
      }
    });
  }
  
  // Check Japan market rule: quanto settlements with T+1 date settle T+2
  if (calculationData.settlementLadders && Array.isArray(calculationData.settlementLadders)) {
    calculationData.settlementLadders.forEach((ladder: any, index: number) => {
      if (ladder.market?.toLowerCase() === 'japan' && 
          ladder.securityType === 'QUANTO' &&
          ladder.settlementType === 'T+1') {
        
        errors.push({
          path: `/settlementLadders[${index}]`,
          message: 'Japan market rule violation: Quanto settlements with T+1 date must settle T+2'
        });
      }
    });
  }
  
  return { 
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs all consistency checks on calculation data.
 * 
 * @param calculationData - The calculation data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateCalculationDataConsistency(calculationData: any): { success: boolean; errors?: any[] } {
  // Perform all consistency validations
  const positionsValidation = validatePositionsConsistency(calculationData);
  const settlementLaddersValidation = validateSettlementLaddersConsistency(calculationData);
  const inventoryValidation = validateInventoryAvailabilityConsistency(calculationData);
  const clientLimitsValidation = validateClientLimitsConsistency(calculationData);
  const auLimitsValidation = validateAggregationUnitLimitsConsistency(calculationData);
  const rulesValidation = validateCalculationRulesConsistency(calculationData);
  const overborrowValidation = validateOverborrowCalculationsConsistency(calculationData);
  const marketRulesValidation = validateMarketSpecificRules(calculationData);
  
  // Combine all errors
  const allErrors = [
    ...(positionsValidation.errors || []),
    ...(settlementLaddersValidation.errors || []),
    ...(inventoryValidation.errors || []),
    ...(clientLimitsValidation.errors || []),
    ...(auLimitsValidation.errors || []),
    ...(rulesValidation.errors || []),
    ...(overborrowValidation.errors || []),
    ...(marketRulesValidation.errors || [])
  ];
  
  return {
    success: allErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : undefined
  };
}

/**
 * Generates a detailed validation report for calculation data.
 * 
 * @param schemaValidation - Result of schema validation
 * @param consistencyValidation - Result of consistency validation
 * @param calculationData - The calculation data that was validated
 * @returns Formatted validation report
 */
function generateValidationReport(
  schemaValidation: { success: boolean; errors?: any[] },
  consistencyValidation: { success: boolean; errors?: any[] },
  calculationData: any
): string {
  const timestamp = new Date().toISOString();
  const isValid = schemaValidation.success && consistencyValidation.success;
  
  let report = `
=======================================================
CALCULATION DATA VALIDATION REPORT
=======================================================
Timestamp: ${timestamp}
Overall Validation: ${isValid ? chalk.green('PASSED') : chalk.red('FAILED')}

SUMMARY:
${calculationData.positions ? `- Positions: ${calculationData.positions.length}` : '- Positions: None'}
${calculationData.settlementLadders ? `- Settlement Ladders: ${calculationData.settlementLadders.length}` : '- Settlement Ladders: None'}
${calculationData.inventoryAvailability ? `- Inventory Availability: ${calculationData.inventoryAvailability.length}` : '- Inventory Availability: None'}
${calculationData.clientLimits ? `- Client Limits: ${calculationData.clientLimits.length}` : '- Client Limits: None'}
${calculationData.aggregationUnitLimits ? `- Aggregation Unit Limits: ${calculationData.aggregationUnitLimits.length}` : '- Aggregation Unit Limits: None'}
${calculationData.calculationRules ? `- Calculation Rules: ${calculationData.calculationRules.length}` : '- Calculation Rules: None'}
${calculationData.overborrowCalculations ? `- Overborrow Calculations: ${calculationData.overborrowCalculations.length}` : '- Overborrow Calculations: None'}
`;

  // Add schema validation errors if any
  if (!schemaValidation.success && schemaValidation.errors) {
    report += `
SCHEMA VALIDATION ERRORS:
${schemaValidation.errors.map((error, index) => 
  `${index + 1}. ${chalk.yellow(error.path)}: ${chalk.red(error.message)}`
).join('\n')}
`;
  }

  // Add consistency validation errors if any
  if (!consistencyValidation.success && consistencyValidation.errors) {
    report += `
CONSISTENCY VALIDATION ERRORS:
${consistencyValidation.errors.map((error, index) => 
  `${index + 1}. ${chalk.yellow(error.path)}: ${chalk.red(error.message)}`
).join('\n')}
`;
  }

  // Add validation summary
  report += `
VALIDATION SUMMARY:
- Schema Validation: ${schemaValidation.success ? chalk.green('PASSED') : chalk.red('FAILED')}
- Consistency Validation: ${consistencyValidation.success ? chalk.green('PASSED') : chalk.red('FAILED')}
- Total Errors: ${(schemaValidation.errors?.length || 0) + (consistencyValidation.errors?.length || 0)}
=======================================================
`;

  return report;
}

/**
 * Main function that orchestrates the validation process.
 */
async function main() {
  // Set up command-line arguments
  const program = new Command();
  
  program
    .name('validate-calculation-data')
    .description('Validates calculation data against the defined JSON schema')
    .version('1.0.0')
    .option('-f, --file <path>', 'Path to the calculation data file')
    .option('-o, --output <path>', 'Path to output the validation report')
    .option('-v, --verbose', 'Show detailed validation information');
  
  program.parse(process.argv);
  
  const options = program.opts();
  
  try {
    // Load the calculation data schema
    const schema = loadCalculationDataSchema();
    
    // Load the calculation data
    const calculationData = loadCalculationData(options.file);
    
    // Display simple progress information
    console.log(chalk.blue('Validating calculation data...'));
    
    // Validate the calculation data against the schema
    const schemaValidation = validateCalculationData(calculationData, schema);
    
    // Perform additional consistency validation
    const consistencyValidation = validateCalculationDataConsistency(calculationData);
    
    // Generate and output the validation report
    const report = generateValidationReport(schemaValidation, consistencyValidation, calculationData);
    
    // Output the report to console
    console.log(report);
    
    // Output the report to a file if requested
    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, report.replace(/\u001b\[\d+m/g, ''));  // Remove ANSI color codes
      console.log(chalk.blue(`Validation report saved to: ${outputPath}`));
    }
    
    // Exit with appropriate status code
    const isValid = schemaValidation.success && consistencyValidation.success;
    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('Error during validation:'), error);
    process.exit(1);
  }
}

// Execute the script if run directly
if (require.main === module) {
  main();
}

// Export functions for testing and importing in other scripts
export {
  loadCalculationDataSchema,
  loadCalculationData,
  validateCalculationData,
  formatValidationErrors,
  validatePositionsConsistency,
  validateSettlementLaddersConsistency,
  validateInventoryAvailabilityConsistency,
  validateClientLimitsConsistency,
  validateAggregationUnitLimitsConsistency,
  validateCalculationRulesConsistency,
  validateOverborrowCalculationsConsistency,
  validateMarketSpecificRules,
  validateCalculationDataConsistency,
  generateValidationReport
};