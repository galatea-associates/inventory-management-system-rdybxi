import * as fs from 'fs-extra'; // v11.1.1
import * as path from 'path'; // v0.12.7
import Ajv from 'ajv'; // v8.12.0
import addFormats from 'ajv-formats'; // v2.1.1
import chalk from 'chalk'; // v5.2.0
import { Command } from 'commander'; // v10.0.1

import { loadTestData } from '../../../test/common/testUtils';
import { 
  TEST_DATA_PATHS, 
  CALCULATION_TYPES 
} from '../../../test/common/constants';

/**
 * Loads the inventory data JSON schema from the expected schema file
 * @returns The parsed JSON schema for inventory data
 */
function loadInventoryDataSchema(): object {
  try {
    const schemaPath = path.resolve(__dirname, '../../schemas/inventory-data-schema.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    return JSON.parse(schemaContent);
  } catch (error) {
    console.error(chalk.red(`Error loading inventory data schema: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Loads inventory data from a file or test fixture
 * @param filePath Optional file path to load data from
 * @returns The parsed inventory data object
 */
function loadInventoryData(filePath?: string): object {
  try {
    if (filePath) {
      const absolutePath = path.resolve(filePath);
      const fileContent = fs.readFileSync(absolutePath, 'utf8');
      return JSON.parse(fileContent);
    } else {
      // Use default test fixture
      return loadTestData(TEST_DATA_PATHS.INVENTORIES);
    }
  } catch (error) {
    console.error(chalk.red(`Error loading inventory data: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Validates inventory data against the JSON schema
 * @param inventoryData The inventory data to validate
 * @param schema The JSON schema to validate against
 * @returns Validation result with success flag and any errors
 */
function validateInventoryData(inventoryData: object, schema: object): { success: boolean; errors?: string[] } {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  
  const validate = ajv.compile(schema);
  const valid = validate(inventoryData);
  
  if (!valid) {
    const formattedErrors = formatValidationErrors(validate.errors);
    return {
      success: false,
      errors: formattedErrors
    };
  }
  
  return { success: true };
}

/**
 * Formats validation errors into a readable structure
 * @param errors Array of Ajv error objects
 * @returns Formatted error messages
 */
function formatValidationErrors(errors: any[]): string[] {
  return errors.map(error => {
    const path = error.instancePath || '/';
    const message = error.message || 'Unknown error';
    
    let additionalInfo = '';
    if (error.keyword === 'enum') {
      additionalInfo = ` (allowed values: ${error.params.allowedValues.join(', ')})`;
    } else if (error.keyword === 'additionalProperties') {
      additionalInfo = ` (unexpected property: ${error.params.additionalProperty})`;
    }
    
    return `Path "${path}": ${message}${additionalInfo}`;
  });
}

/**
 * Performs additional consistency checks on inventories data beyond schema validation
 * @param inventoryData The inventory data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateInventoriesConsistency(inventoryData: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  if (!inventoryData.inventories || !Array.isArray(inventoryData.inventories)) {
    return { success: true }; // No inventories to validate
  }
  
  // Check for duplicate inventory IDs
  const inventoryIds = new Set<string>();
  inventoryData.inventories.forEach(inventory => {
    if (inventoryIds.has(inventory.inventoryId)) {
      errors.push(`Duplicate inventory ID found: ${inventory.inventoryId}`);
    }
    inventoryIds.add(inventory.inventoryId);
  });
  
  // Verify that all inventories have valid security IDs
  inventoryData.inventories.forEach(inventory => {
    if (!inventory.securityId) {
      errors.push(`Missing security ID in inventory: ${inventory.inventoryId}`);
    }
  });
  
  // Check that available quantity is not greater than gross quantity
  inventoryData.inventories.forEach(inventory => {
    if (inventory.availableQuantity > inventory.grossQuantity) {
      errors.push(`Inventory ${inventory.inventoryId}: Available quantity (${inventory.availableQuantity}) exceeds gross quantity (${inventory.grossQuantity})`);
    }
  });
  
  // Verify that decrement quantity is not greater than available quantity
  inventoryData.inventories.forEach(inventory => {
    if (inventory.decrementQuantity > inventory.availableQuantity) {
      errors.push(`Inventory ${inventory.inventoryId}: Decrement quantity (${inventory.decrementQuantity}) exceeds available quantity (${inventory.availableQuantity})`);
    }
  });
  
  // Validate that calculation rule IDs and versions are consistent
  inventoryData.inventories.forEach(inventory => {
    if (inventory.calculationRuleId && !inventory.calculationRuleVersion) {
      errors.push(`Inventory ${inventory.inventoryId}: Calculation rule ID present but version missing`);
    }
    if (!inventory.calculationRuleId && inventory.calculationRuleVersion) {
      errors.push(`Inventory ${inventory.inventoryId}: Calculation rule version present but ID missing`);
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on calculated inventories data beyond schema validation
 * @param inventoryData The inventory data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateCalculatedInventoriesConsistency(inventoryData: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  if (!inventoryData.calculatedInventories || !Array.isArray(inventoryData.calculatedInventories)) {
    return { success: true }; // No calculated inventories to validate
  }
  
  // Check for duplicate calculated inventory IDs
  const calculatedInventoryIds = new Set<string>();
  inventoryData.calculatedInventories.forEach(inventory => {
    if (calculatedInventoryIds.has(inventory.calculatedInventoryId)) {
      errors.push(`Duplicate calculated inventory ID found: ${inventory.calculatedInventoryId}`);
    }
    calculatedInventoryIds.add(inventory.calculatedInventoryId);
  });
  
  // Verify that all calculated inventories have valid security IDs
  inventoryData.calculatedInventories.forEach(inventory => {
    if (!inventory.securityId) {
      errors.push(`Missing security ID in calculated inventory: ${inventory.calculatedInventoryId}`);
    }
  });
  
  // Check that available quantity is not greater than gross quantity
  inventoryData.calculatedInventories.forEach(inventory => {
    if (inventory.availableQuantity > inventory.grossQuantity) {
      errors.push(`Calculated inventory ${inventory.calculatedInventoryId}: Available quantity (${inventory.availableQuantity}) exceeds gross quantity (${inventory.grossQuantity})`);
    }
  });
  
  // Verify that decrement quantity is not greater than available quantity
  inventoryData.calculatedInventories.forEach(inventory => {
    if (inventory.decrementQuantity > inventory.availableQuantity) {
      errors.push(`Calculated inventory ${inventory.calculatedInventoryId}: Decrement quantity (${inventory.decrementQuantity}) exceeds available quantity (${inventory.availableQuantity})`);
    }
  });
  
  // Validate that source inventory IDs reference valid inventories
  if (inventoryData.inventories && Array.isArray(inventoryData.inventories)) {
    const validInventoryIds = new Set(inventoryData.inventories.map(inv => inv.inventoryId));
    
    inventoryData.calculatedInventories.forEach(inventory => {
      if (inventory.sourceInventoryIds && Array.isArray(inventory.sourceInventoryIds)) {
        inventory.sourceInventoryIds.forEach(sourceId => {
          if (!validInventoryIds.has(sourceId)) {
            errors.push(`Calculated inventory ${inventory.calculatedInventoryId}: References non-existent source inventory ID: ${sourceId}`);
          }
        });
      }
    });
  }
  
  // Check that calculation timestamps are valid
  inventoryData.calculatedInventories.forEach(inventory => {
    if (inventory.calculationTimestamp) {
      const timestamp = new Date(inventory.calculationTimestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push(`Calculated inventory ${inventory.calculatedInventoryId}: Invalid calculation timestamp: ${inventory.calculationTimestamp}`);
      }
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on locate availability data beyond schema validation
 * @param inventoryData The inventory data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateLocateAvailabilityConsistency(inventoryData: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  if (!inventoryData.locateAvailability || !Array.isArray(inventoryData.locateAvailability)) {
    return { success: true }; // No locate availability data to validate
  }
  
  // Check for duplicate locate availability IDs
  const locateAvailabilityIds = new Set<string>();
  inventoryData.locateAvailability.forEach(locate => {
    if (locateAvailabilityIds.has(locate.locateAvailabilityId)) {
      errors.push(`Duplicate locate availability ID found: ${locate.locateAvailabilityId}`);
    }
    locateAvailabilityIds.add(locate.locateAvailabilityId);
  });
  
  // Verify that all locate availability records have valid security IDs
  inventoryData.locateAvailability.forEach(locate => {
    if (!locate.securityId) {
      errors.push(`Missing security ID in locate availability: ${locate.locateAvailabilityId}`);
    }
  });
  
  // Check that decrement quantity is not greater than available quantity
  inventoryData.locateAvailability.forEach(locate => {
    if (locate.decrementQuantity > locate.availableQuantity) {
      errors.push(`Locate availability ${locate.locateAvailabilityId}: Decrement quantity (${locate.decrementQuantity}) exceeds available quantity (${locate.availableQuantity})`);
    }
  });
  
  // Validate that source inventory IDs reference valid inventories
  if (inventoryData.inventories && Array.isArray(inventoryData.inventories)) {
    const validInventoryIds = new Set(inventoryData.inventories.map(inv => inv.inventoryId));
    
    inventoryData.locateAvailability.forEach(locate => {
      if (locate.sourceInventoryIds && Array.isArray(locate.sourceInventoryIds)) {
        locate.sourceInventoryIds.forEach(sourceId => {
          if (!validInventoryIds.has(sourceId)) {
            errors.push(`Locate availability ${locate.locateAvailabilityId}: References non-existent source inventory ID: ${sourceId}`);
          }
        });
      }
    });
  }
  
  // Check that calculation timestamps are valid
  inventoryData.locateAvailability.forEach(locate => {
    if (locate.calculationTimestamp) {
      const timestamp = new Date(locate.calculationTimestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push(`Locate availability ${locate.locateAvailabilityId}: Invalid calculation timestamp: ${locate.calculationTimestamp}`);
      }
    }
  });
  
  // Verify that expiry dates are after business dates
  inventoryData.locateAvailability.forEach(locate => {
    if (locate.businessDate && locate.expiryDate) {
      const businessDate = new Date(locate.businessDate);
      const expiryDate = new Date(locate.expiryDate);
      
      if (!isNaN(businessDate.getTime()) && !isNaN(expiryDate.getTime()) && businessDate > expiryDate) {
        errors.push(`Locate availability ${locate.locateAvailabilityId}: Expiry date (${locate.expiryDate}) is before business date (${locate.businessDate})`);
      }
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on inventory events data beyond schema validation
 * @param inventoryData The inventory data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateInventoryEventsConsistency(inventoryData: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  if (!inventoryData.inventoryEvents || !Array.isArray(inventoryData.inventoryEvents)) {
    return { success: true }; // No inventory events to validate
  }
  
  // Check for duplicate event IDs
  const eventIds = new Set<string>();
  inventoryData.inventoryEvents.forEach(event => {
    if (eventIds.has(event.eventId)) {
      errors.push(`Duplicate inventory event ID found: ${event.eventId}`);
    }
    eventIds.add(event.eventId);
  });
  
  // Verify that all events have valid security IDs
  inventoryData.inventoryEvents.forEach(event => {
    if (!event.securityId) {
      errors.push(`Missing security ID in inventory event: ${event.eventId}`);
    }
  });
  
  // Validate that inventory IDs reference valid inventories
  if (inventoryData.inventories && Array.isArray(inventoryData.inventories)) {
    const validInventoryIds = new Set(inventoryData.inventories.map(inv => inv.inventoryId));
    
    inventoryData.inventoryEvents.forEach(event => {
      if (event.inventoryId && !validInventoryIds.has(event.inventoryId)) {
        errors.push(`Inventory event ${event.eventId}: References non-existent inventory ID: ${event.inventoryId}`);
      }
    });
  }
  
  // Check that event timestamps are valid
  inventoryData.inventoryEvents.forEach(event => {
    if (event.eventTimestamp) {
      const timestamp = new Date(event.eventTimestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push(`Inventory event ${event.eventId}: Invalid event timestamp: ${event.eventTimestamp}`);
      }
    }
  });
  
  // Verify that quantity changes match the difference between before and after values
  inventoryData.inventoryEvents.forEach(event => {
    if (typeof event.quantityBefore === 'number' && 
        typeof event.quantityAfter === 'number' && 
        typeof event.quantityChange === 'number') {
      
      const calculatedChange = event.quantityAfter - event.quantityBefore;
      if (Math.abs(calculatedChange - event.quantityChange) > 0.0001) { // Allow for small floating point differences
        errors.push(`Inventory event ${event.eventId}: Quantity change (${event.quantityChange}) does not match the difference between before (${event.quantityBefore}) and after (${event.quantityAfter}) values`);
      }
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validates that market-specific rules are correctly applied to inventory data
 * @param inventoryData The inventory data to validate
 * @returns Validation result with success flag and any rule violation errors
 */
function validateMarketSpecificRules(inventoryData: any): { success: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  // Extract inventories for specific markets
  if (!inventoryData.inventories || !Array.isArray(inventoryData.inventories)) {
    return { success: true }; // No inventories to validate
  }
  
  const taiwanInventories = inventoryData.inventories.filter(inv => inv.market === 'TWN');
  const japanInventories = inventoryData.inventories.filter(inv => inv.market === 'JPN');
  
  // Check Taiwan market rule: borrowed shares cannot be re-lent
  taiwanInventories.forEach(inventory => {
    if (inventory.isBorrowed && inventory.calculationType === CALCULATION_TYPES.FOR_LOAN) {
      errors.push(`Taiwan market rule violation: Borrowed shares cannot be re-lent. Inventory ID: ${inventory.inventoryId}`);
    }
  });
  
  // Check Japan market rule: settlement cut-off times for SLAB activity
  if (inventoryData.calculatedInventories && Array.isArray(inventoryData.calculatedInventories)) {
    const japanCalculatedInventories = inventoryData.calculatedInventories.filter(inv => 
      inv.market === 'JPN' && 
      inv.calculationType === CALCULATION_TYPES.FOR_LOAN
    );
    
    japanCalculatedInventories.forEach(inventory => {
      if (inventory.calculationTimestamp) {
        const calculationTime = new Date(inventory.calculationTimestamp);
        if (!isNaN(calculationTime.getTime())) {
          const hours = calculationTime.getHours();
          const minutes = calculationTime.getMinutes();
          
          // Japan SLAB activity should be calculated before 15:00 JST
          if (hours > 15 || (hours === 15 && minutes > 0)) {
            errors.push(`Japan market rule violation: SLAB activity calculated after cut-off time (15:00 JST). Calculated Inventory ID: ${inventory.calculatedInventoryId}, Time: ${calculationTime.toISOString()}`);
          }
        }
      }
    });
  }
  
  // Check Japan market rule: quanto settlements with T+1 date settle T+2
  if (inventoryData.inventoryEvents && Array.isArray(inventoryData.inventoryEvents)) {
    const japanSettlementEvents = inventoryData.inventoryEvents.filter(event => 
      event.market === 'JPN' && 
      event.eventType === 'SETTLEMENT' &&
      event.isQuantoSettlement
    );
    
    japanSettlementEvents.forEach(event => {
      if (event.settlementDate && event.tradeDate) {
        const tradeDate = new Date(event.tradeDate);
        const settlementDate = new Date(event.settlementDate);
        
        if (!isNaN(tradeDate.getTime()) && !isNaN(settlementDate.getTime())) {
          // Calculate business days - this is a simplified calculation
          const oneDayMs = 24 * 60 * 60 * 1000;
          const diffDays = Math.round((settlementDate.getTime() - tradeDate.getTime()) / oneDayMs);
          
          // Quanto settlements with T+1 should actually settle T+2
          if (event.expectedSettlementDays === 1 && diffDays !== 2) {
            errors.push(`Japan market rule violation: Quanto settlement with T+1 expected settlement should settle T+2. Event ID: ${event.eventId}`);
          }
        }
      }
    });
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs all consistency checks on inventory data
 * @param inventoryData The inventory data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateInventoryDataConsistency(inventoryData: any): { success: boolean; errors?: string[] } {
  const inventoriesValidation = validateInventoriesConsistency(inventoryData);
  const calculatedInventoriesValidation = validateCalculatedInventoriesConsistency(inventoryData);
  const locateAvailabilityValidation = validateLocateAvailabilityConsistency(inventoryData);
  const inventoryEventsValidation = validateInventoryEventsConsistency(inventoryData);
  const marketRulesValidation = validateMarketSpecificRules(inventoryData);
  
  const allErrors = [
    ...(inventoriesValidation.errors || []),
    ...(calculatedInventoriesValidation.errors || []),
    ...(locateAvailabilityValidation.errors || []),
    ...(inventoryEventsValidation.errors || []),
    ...(marketRulesValidation.errors || [])
  ];
  
  return {
    success: allErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : undefined
  };
}

/**
 * Generates a detailed validation report for inventory data
 * @param schemaValidation Schema validation result
 * @param consistencyValidation Consistency validation result
 * @param inventoryData The inventory data that was validated
 * @returns Formatted validation report
 */
function generateValidationReport(
  schemaValidation: { success: boolean; errors?: string[] },
  consistencyValidation: { success: boolean; errors?: string[] },
  inventoryData: any
): string {
  const timestamp = new Date().toISOString();
  const overallSuccess = schemaValidation.success && consistencyValidation.success;
  
  // Count records
  const inventoryCount = inventoryData.inventories?.length || 0;
  const calculatedInventoryCount = inventoryData.calculatedInventories?.length || 0;
  const locateAvailabilityCount = inventoryData.locateAvailability?.length || 0;
  const inventoryEventCount = inventoryData.inventoryEvents?.length || 0;
  
  let report = `
========================================================
INVENTORY DATA VALIDATION REPORT
========================================================
Timestamp: ${timestamp}
Status: ${overallSuccess ? chalk.green('SUCCESS') : chalk.red('FAILED')}

Data Summary:
- Inventories: ${inventoryCount}
- Calculated Inventories: ${calculatedInventoryCount}
- Locate Availability Records: ${locateAvailabilityCount}
- Inventory Events: ${inventoryEventCount}
`;

  if (!schemaValidation.success) {
    report += `
${chalk.red('SCHEMA VALIDATION ERRORS')} (${schemaValidation.errors?.length || 0})
--------------------------------------------------------
${schemaValidation.errors?.map(err => `- ${err}`).join('\n')}
`;
  }

  if (!consistencyValidation.success) {
    report += `
${chalk.red('CONSISTENCY VALIDATION ERRORS')} (${consistencyValidation.errors?.length || 0})
--------------------------------------------------------
${consistencyValidation.errors?.map(err => `- ${err}`).join('\n')}
`;
  }

  report += `
========================================================
VALIDATION SUMMARY
========================================================
Schema Validation: ${schemaValidation.success ? chalk.green('PASSED') : chalk.red(`FAILED (${schemaValidation.errors?.length || 0} errors)`)}
Consistency Validation: ${consistencyValidation.success ? chalk.green('PASSED') : chalk.red(`FAILED (${consistencyValidation.errors?.length || 0} errors)`)}
Overall Status: ${overallSuccess ? chalk.green('PASSED') : chalk.red('FAILED')}
========================================================
`;

  return report;
}

/**
 * Main function that orchestrates the validation process
 */
function main(): void {
  const program = new Command();
  
  program
    .name('validate-inventory-data')
    .description('Validates inventory data against JSON schema and business rules')
    .version('1.0.0')
    .option('-f, --file <path>', 'Path to inventory data file (defaults to test fixture)')
    .option('-s, --schema <path>', 'Path to schema file (defaults to standard schema location)')
    .option('-o, --output <path>', 'Path to output validation report')
    .option('-q, --quiet', 'Suppress console output')
    .parse(process.argv);
  
  const options = program.opts();
  
  // Load schema and data
  const schema = loadInventoryDataSchema();
  const inventoryData = loadInventoryData(options.file);
  
  // Perform validation
  const schemaValidation = validateInventoryData(inventoryData, schema);
  const consistencyValidation = validateInventoryDataConsistency(inventoryData);
  
  // Generate report
  const report = generateValidationReport(schemaValidation, consistencyValidation, inventoryData);
  
  // Output results
  if (!options.quiet) {
    console.log(report);
  }
  
  // Save report to file if requested
  if (options.output) {
    try {
      const outputPath = path.resolve(options.output);
      // Remove ANSI color codes for file output
      fs.writeFileSync(outputPath, report.replace(/\x1b\[[0-9;]*m/g, ''), 'utf8');
      if (!options.quiet) {
        console.log(chalk.green(`Validation report saved to: ${outputPath}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error saving validation report: ${error.message}`));
    }
  }
  
  // Exit with appropriate status code
  process.exit(schemaValidation.success && consistencyValidation.success ? 0 : 1);
}

// If this script is run directly (not imported), run the main function
if (require.main === module) {
  main();
}

export {
  loadInventoryDataSchema,
  loadInventoryData,
  validateInventoryData,
  formatValidationErrors,
  validateInventoriesConsistency,
  validateCalculatedInventoriesConsistency,
  validateLocateAvailabilityConsistency,
  validateInventoryEventsConsistency,
  validateMarketSpecificRules,
  validateInventoryDataConsistency,
  generateValidationReport
};