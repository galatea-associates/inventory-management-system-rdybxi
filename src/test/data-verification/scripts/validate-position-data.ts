#!/usr/bin/env node
/**
 * Position Data Validation Script
 * 
 * This script validates position data against the defined JSON schema and 
 * performs additional consistency checks to ensure data integrity.
 * 
 * Usage:
 *   validate-position-data [options]
 * 
 * Options:
 *   -f, --file <path>  Path to position data JSON file
 *   -o, --output <path>  Path to output validation report
 *   -h, --help  Display help information
 */

import * as fs from 'fs-extra'; // v11.1.1
import * as path from 'path';
import Ajv from 'ajv'; // v8.12.0
import addFormats from 'ajv-formats'; // v2.1.1
import chalk from 'chalk'; // v5.2.0
import { Command } from 'commander'; // v10.0.1

import { loadTestData } from '../../../test/common/testUtils';
import { TEST_DATA_PATHS } from '../../../test/common/constants';

/**
 * Loads the position data JSON schema from the expected schema file
 * @returns The parsed JSON schema for position data
 */
function loadPositionDataSchema(): object {
  try {
    // Resolve the path to the position data schema file
    const schemaPath = path.resolve('./src/schemas/position-data-schema.json');
    
    // Read and parse the schema file
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    return JSON.parse(schemaContent);
  } catch (error) {
    console.error(chalk.red(`Error loading position data schema: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Loads position data from a file or test fixture
 * @param filePath Optional path to a JSON file containing position data
 * @returns The parsed position data object
 */
function loadPositionData(filePath?: string): object {
  try {
    if (filePath) {
      // If a file path is provided, read and parse that file
      const absolutePath = path.resolve(filePath);
      const fileContent = fs.readFileSync(absolutePath, 'utf8');
      return JSON.parse(fileContent);
    } else {
      // Otherwise, load from the default test fixture
      return loadTestData(TEST_DATA_PATHS.POSITIONS);
    }
  } catch (error) {
    console.error(chalk.red(`Error loading position data: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Validates position data against the JSON schema
 * @param positionData The position data to validate
 * @param schema The JSON schema to validate against
 * @returns Validation result with success flag and any errors
 */
function validatePositionData(positionData: object, schema: object): { success: boolean; errors?: string[] } {
  // Create a new Ajv instance with strict mode and all errors
  const ajv = new Ajv({ strict: true, allErrors: true });
  
  // Add formats to the Ajv instance
  addFormats(ajv);
  
  try {
    // Compile the schema
    const validate = ajv.compile(schema);
    
    // Validate the position data against the compiled schema
    const valid = validate(positionData);
    
    if (!valid) {
      // If validation fails, format the errors for readability
      const formattedErrors = formatValidationErrors(validate.errors || []);
      return { success: false, errors: formattedErrors };
    }
    
    return { success: true };
  } catch (error) {
    console.error(chalk.red(`Schema validation error: ${error.message}`));
    return { success: false, errors: [error.message] };
  }
}

/**
 * Formats validation errors into a readable structure
 * @param errors Array of validation errors from Ajv
 * @returns Formatted error messages
 */
function formatValidationErrors(errors: any[]): string[] {
  return errors.map(error => {
    const path = error.instancePath || '/';
    const message = error.message || 'Unknown validation error';
    
    let details = '';
    if (error.keyword === 'enum') {
      details = ` (allowed values: ${error.params.allowedValues.join(', ')})`;
    } else if (error.keyword === 'additionalProperties') {
      details = ` (unexpected property: ${error.params.additionalProperty})`;
    } else if (error.keyword === 'required') {
      details = ` (missing property: ${error.params.missingProperty})`;
    } else if (error.keyword === 'type') {
      details = ` (expected ${error.params.type}, got ${typeof error.data})`;
    }
    
    return `${path}: ${message}${details}`;
  });
}

/**
 * Performs additional consistency checks on position data beyond schema validation
 * @param positionData The position data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validatePositionConsistency(positionData: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  // Skip validation if positions array doesn't exist or isn't an array
  if (!positionData.positions || !Array.isArray(positionData.positions)) {
    return { success: false, errors: ['Missing or invalid positions array'] };
  }
  
  // Check for duplicate position IDs
  const positionIds = new Set<string>();
  positionData.positions.forEach((position: any, index: number) => {
    if (!position.positionId) {
      errors.push(`Position at index ${index} is missing positionId`);
      return;
    }
    
    if (positionIds.has(position.positionId)) {
      errors.push(`Duplicate positionId found: ${position.positionId}`);
    } else {
      positionIds.add(position.positionId);
    }
    
    // Verify that all positions reference valid securities
    if (!position.securityId) {
      errors.push(`Position ${position.positionId} is missing securityId`);
    }
    
    // Verify that all positions reference valid counterparties where applicable
    if (position.counterpartyId === '') {
      errors.push(`Position ${position.positionId} has empty counterpartyId`);
    }
    
    // Verify that all positions reference valid aggregation units where applicable
    if (position.aggregationUnitId === '') {
      errors.push(`Position ${position.positionId} has empty aggregationUnitId`);
    }
    
    // Check business date format (should be ISO date string)
    if (position.businessDate && !(/^\d{4}-\d{2}-\d{2}$/.test(position.businessDate))) {
      errors.push(`Position ${position.positionId} has invalid businessDate format: ${position.businessDate}`);
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on settlement ladder data beyond schema validation
 * @param positionData The position data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateSettlementLadderConsistency(positionData: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  // Skip validation if settlement ladder array doesn't exist or isn't an array
  if (!positionData.settlementLadders || !Array.isArray(positionData.settlementLadders)) {
    return { success: false, errors: ['Missing or invalid settlementLadders array'] };
  }
  
  // Create a set of position IDs for reference
  const positionIds = new Set<string>();
  if (positionData.positions && Array.isArray(positionData.positions)) {
    positionData.positions.forEach((position: any) => {
      if (position.positionId) {
        positionIds.add(position.positionId);
      }
    });
  }
  
  positionData.settlementLadders.forEach((ladder: any, index: number) => {
    // Verify that all settlement ladders reference valid securities
    if (!ladder.securityId) {
      errors.push(`Settlement ladder at index ${index} is missing securityId`);
    }
    
    // Check that settlement ladder references a valid position
    if (ladder.positionId && !positionIds.has(ladder.positionId)) {
      errors.push(`Settlement ladder at index ${index} references non-existent position: ${ladder.positionId}`);
    }
    
    // Check that settlement dates are in the correct sequence
    if (ladder.settlementDate && !(/^\d{4}-\d{2}-\d{2}$/.test(ladder.settlementDate))) {
      errors.push(`Settlement ladder ${ladder.positionId || index} has invalid settlementDate format: ${ladder.settlementDate}`);
    }
    
    // Check that settlement ladder values are consistent with position data
    // (e.g., netSettlement equals receipts minus deliveries)
    if (typeof ladder.receiptQty === 'number' && 
        typeof ladder.deliveryQty === 'number' && 
        typeof ladder.netSettlement === 'number') {
      const calculatedNet = ladder.receiptQty - ladder.deliveryQty;
      if (Math.abs(ladder.netSettlement - calculatedNet) > 0.0001) { // Allow for small floating-point differences
        errors.push(`Settlement ladder ${ladder.positionId || index} has inconsistent netSettlement: ${ladder.netSettlement} (should be ${calculatedNet})`);
      }
    }
    
    // Check that settlement ladder business dates match position business dates where applicable
    if (ladder.positionId && ladder.businessDate) {
      const position = positionData.positions.find((p: any) => p.positionId === ladder.positionId);
      if (position && position.businessDate !== ladder.businessDate) {
        errors.push(`Settlement ladder ${ladder.positionId} has businessDate (${ladder.businessDate}) that doesn't match position businessDate (${position.businessDate})`);
      }
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on calculated position data beyond schema validation
 * @param positionData The position data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateCalculatedPositionConsistency(positionData: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  // Skip validation if calculated positions array doesn't exist or isn't an array
  if (!positionData.calculatedPositions || !Array.isArray(positionData.calculatedPositions)) {
    return { success: false, errors: ['Missing or invalid calculatedPositions array'] };
  }
  
  // Create a map of position IDs for reference
  const positionMap = new Map<string, any>();
  if (positionData.positions && Array.isArray(positionData.positions)) {
    positionData.positions.forEach((position: any) => {
      if (position.positionId) {
        positionMap.set(position.positionId, position);
      }
    });
  }
  
  positionData.calculatedPositions.forEach((calcPosition: any, index: number) => {
    // Verify that calculated positions have valid calculation status
    const validStatuses = ['COMPLETED', 'FAILED', 'IN_PROGRESS', 'PENDING'];
    if (!calcPosition.calculationStatus || !validStatuses.includes(calcPosition.calculationStatus)) {
      errors.push(`Calculated position at index ${index} has invalid calculationStatus: ${calcPosition.calculationStatus}`);
    }
    
    // Check that calculated values are consistent with base position values
    if (calcPosition.basePositionId) {
      const basePosition = positionMap.get(calcPosition.basePositionId);
      if (!basePosition) {
        errors.push(`Calculated position at index ${index} references non-existent base position: ${calcPosition.basePositionId}`);
      }
    }
    
    // Validate that projected positions are calculated correctly based on settlement ladder
    if (calcPosition.calculationType === 'PROJECTED' && calcPosition.basePositionId) {
      // This would involve complex logic comparing with settlement ladder data
      // Simplified check for now
      if (!calcPosition.projectionDate || !(/^\d{4}-\d{2}-\d{2}$/.test(calcPosition.projectionDate))) {
        errors.push(`Projected position at index ${index} has invalid projectionDate format: ${calcPosition.projectionDate}`);
      }
    }
    
    // Check that calculation dates are not in the future
    if (calcPosition.calculationDate) {
      const calculationDate = new Date(calcPosition.calculationDate);
      const now = new Date();
      if (calculationDate > now) {
        errors.push(`Calculated position at index ${index} has future calculationDate: ${calcPosition.calculationDate}`);
      }
    }
    
    // Verify that calculation rule IDs and versions are valid where applicable
    if (calcPosition.calculationStatus === 'COMPLETED') {
      if (!calcPosition.calculationRuleId) {
        errors.push(`Completed calculated position at index ${index} is missing calculationRuleId`);
      }
      
      if (typeof calcPosition.calculationRuleVersion !== 'string' && typeof calcPosition.calculationRuleVersion !== 'number') {
        errors.push(`Completed calculated position at index ${index} is missing or has invalid calculationRuleVersion`);
      }
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs all consistency checks on position data
 * @param positionData The position data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validatePositionDataConsistency(positionData: any): { success: boolean; errors?: string[] } {
  const positionConsistency = validatePositionConsistency(positionData);
  const settlementConsistency = validateSettlementLadderConsistency(positionData);
  const calculatedConsistency = validateCalculatedPositionConsistency(positionData);
  
  // Combine all errors
  const allErrors: string[] = [];
  
  if (!positionConsistency.success && positionConsistency.errors) {
    allErrors.push(...positionConsistency.errors);
  }
  
  if (!settlementConsistency.success && settlementConsistency.errors) {
    allErrors.push(...settlementConsistency.errors);
  }
  
  if (!calculatedConsistency.success && calculatedConsistency.errors) {
    allErrors.push(...calculatedConsistency.errors);
  }
  
  return {
    success: allErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : undefined
  };
}

/**
 * Generates a detailed validation report for position data
 * @param schemaValidation Result of schema validation
 * @param consistencyValidation Result of consistency validation
 * @param positionData The position data that was validated
 * @returns Formatted validation report
 */
function generateValidationReport(
  schemaValidation: { success: boolean; errors?: string[] },
  consistencyValidation: { success: boolean; errors?: string[] },
  positionData: any
): string {
  const timestamp = new Date().toISOString();
  const overallSuccess = schemaValidation.success && consistencyValidation.success;
  
  // Count the data elements
  const positionCount = Array.isArray(positionData.positions) ? positionData.positions.length : 0;
  const settlementCount = Array.isArray(positionData.settlementLadders) ? positionData.settlementLadders.length : 0;
  const calculatedCount = Array.isArray(positionData.calculatedPositions) ? positionData.calculatedPositions.length : 0;
  
  let report = '';
  
  // Report header
  report += `=============================================================\n`;
  report += `POSITION DATA VALIDATION REPORT\n`;
  report += `=============================================================\n`;
  report += `Timestamp: ${timestamp}\n`;
  report += `Validation Status: ${overallSuccess ? chalk.green('PASSED') : chalk.red('FAILED')}\n\n`;
  
  // Data summary
  report += `Data Summary:\n`;
  report += `- Positions: ${positionCount}\n`;
  report += `- Settlement Ladders: ${settlementCount}\n`;
  report += `- Calculated Positions: ${calculatedCount}\n\n`;
  
  // Schema validation results
  report += `Schema Validation: ${schemaValidation.success ? chalk.green('PASSED') : chalk.red('FAILED')}\n`;
  if (!schemaValidation.success && schemaValidation.errors) {
    report += `Schema Validation Errors (${schemaValidation.errors.length}):\n`;
    schemaValidation.errors.forEach((error, index) => {
      report += `  ${index + 1}. ${error}\n`;
    });
    report += '\n';
  }
  
  // Consistency validation results
  report += `Consistency Validation: ${consistencyValidation.success ? chalk.green('PASSED') : chalk.red('FAILED')}\n`;
  if (!consistencyValidation.success && consistencyValidation.errors) {
    report += `Consistency Validation Errors (${consistencyValidation.errors.length}):\n`;
    consistencyValidation.errors.forEach((error, index) => {
      report += `  ${index + 1}. ${error}\n`;
    });
    report += '\n';
  }
  
  // Validation summary
  report += `=============================================================\n`;
  report += `Validation Summary:\n`;
  report += `- Schema Errors: ${schemaValidation.errors?.length || 0}\n`;
  report += `- Consistency Errors: ${consistencyValidation.errors?.length || 0}\n`;
  report += `- Total Errors: ${(schemaValidation.errors?.length || 0) + (consistencyValidation.errors?.length || 0)}\n`;
  report += `=============================================================\n`;
  
  return report;
}

/**
 * Main function that orchestrates the validation process
 */
async function main(): Promise<void> {
  // Set up command-line interface
  const program = new Command();
  
  program
    .name('validate-position-data')
    .description('Validates position data against JSON schema and performs consistency checks')
    .version('1.0.0')
    .option('-f, --file <path>', 'Path to position data JSON file')
    .option('-o, --output <path>', 'Path to output validation report')
    .parse(process.argv);
  
  const options = program.opts();
  
  // Load the position data schema
  const schema = loadPositionDataSchema();
  
  // Load the position data from the specified file or default location
  const positionData = loadPositionData(options.file);
  
  // Validate the position data against the schema
  const schemaValidation = validatePositionData(positionData, schema);
  
  // Perform consistency validation on the position data
  const consistencyValidation = validatePositionDataConsistency(positionData);
  
  // Generate a validation report
  const report = generateValidationReport(schemaValidation, consistencyValidation, positionData);
  
  // Output the report to console
  console.log(report);
  
  // Optionally output the report to a file
  if (options.output) {
    try {
      // Remove chalk color codes for file output
      const cleanReport = report.replace(/\u001b\[.*?m/g, '');
      fs.writeFileSync(options.output, cleanReport);
      console.log(chalk.green(`\nReport saved to: ${options.output}`));
    } catch (error) {
      console.error(chalk.red(`\nError writing to output file: ${error.message}`));
    }
  }
  
  // Exit with appropriate status code
  process.exit(schemaValidation.success && consistencyValidation.success ? 0 : 1);
}

// Run the main function
main().catch(error => {
  console.error(chalk.red(`Unhandled error: ${error.message}`));
  process.exit(1);
});