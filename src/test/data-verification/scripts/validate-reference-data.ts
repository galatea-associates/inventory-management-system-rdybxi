#!/usr/bin/env node
/**
 * Reference Data Validation Script
 * 
 * This script validates reference data against the defined JSON schema and performs
 * additional consistency checks to ensure data integrity. It can be used as part
 * of the test suite or as a standalone tool for data verification.
 */

import * as fs from 'fs-extra'; // v11.1.1
import * as path from 'path'; // v0.12.7
import Ajv from 'ajv'; // v8.12.0
import addFormats from 'ajv-formats'; // v2.1.1
import chalk from 'chalk'; // v5.2.0
import { Command } from 'commander'; // v10.0.1

import { loadTestData } from '../../../test/common/testUtils';
import { TEST_DATA_PATHS } from '../../../test/common/constants';

// Define reference data interface types
interface Security {
  internalId: string;
  securityType: string;
  issuer?: string;
  issueDate?: string;
  maturityDate?: string;
  currency?: string;
  status: string;
  market?: string;
  version: number;
  isBasketProduct?: boolean;
  primaryIdentifier?: {
    type: string;
    value: string;
  };
  identifiers: Array<{
    type: string;
    value: string;
    source: string;
  }>;
}

interface Counterparty {
  counterpartyId: string;
  name: string;
  type: string;
  kycStatus?: string;
  status: string;
  primaryIdentifier?: {
    type: string;
    value: string;
  };
  identifiers: Array<{
    type: string;
    value: string;
  }>;
}

interface CounterpartyRelationship {
  parentId: string;
  childId: string;
  relationshipType: string;
}

interface IndexComposition {
  indexId: string;
  constituentId: string;
  weight: number;
  compositionType: string;
  effectiveDate: string;
  expiryDate?: string;
}

interface AggregationUnit {
  aggregationUnitId: string;
  name: string;
  type: string;
  market: string;
  officerId?: string;
  parentEntityId?: string;
  books?: string[];
}

interface ReferenceData {
  securities: Security[];
  counterparties: Counterparty[];
  counterpartyRelationships?: CounterpartyRelationship[];
  indexCompositions: IndexComposition[];
  aggregationUnits: AggregationUnit[];
}

interface ValidationResult {
  success: boolean;
  errors?: string[];
}

/**
 * Loads the reference data JSON schema from the expected schema file
 * 
 * @returns The parsed JSON schema for reference data
 */
function loadReferenceDataSchema(): object {
  try {
    const schemaPath = path.resolve('./src/schemas/reference-data-schema.json');
    const schemaData = fs.readFileSync(schemaPath, 'utf8');
    return JSON.parse(schemaData);
  } catch (error) {
    console.error(chalk.red(`Error loading schema: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Loads reference data from a file or test fixture
 * 
 * @param filePath Optional path to a JSON file containing reference data
 * @returns The parsed reference data object
 */
function loadReferenceData(filePath?: string): ReferenceData {
  try {
    if (filePath) {
      const absolutePath = path.resolve(filePath);
      const fileData = fs.readFileSync(absolutePath, 'utf8');
      return JSON.parse(fileData);
    } else {
      // Use the test fixture if no file path is provided
      return loadTestData(TEST_DATA_PATHS.REFERENCE_DATA);
    }
  } catch (error) {
    console.error(chalk.red(`Error loading reference data: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Validates reference data against the JSON schema
 * 
 * @param referenceData The reference data to validate
 * @param schema The JSON schema to validate against
 * @returns Validation result with success flag and any errors
 */
function validateReferenceData(referenceData: ReferenceData, schema: object): ValidationResult {
  const ajv = new Ajv({ strict: true, allErrors: true });
  addFormats(ajv);
  
  const validate = ajv.compile(schema);
  const valid = validate(referenceData);
  
  if (!valid) {
    return {
      success: false,
      errors: formatValidationErrors(validate.errors || [])
    };
  }
  
  return { success: true };
}

/**
 * Formats validation errors into a readable structure
 * 
 * @param errors Array of AJV validation errors
 * @returns Array of formatted error messages
 */
function formatValidationErrors(errors: any[]): string[] {
  return errors.map(error => {
    const path = error.instancePath || '/';
    const message = error.message || 'Unknown error';
    let details = '';
    
    if (error.params) {
      details = ` (${Object.entries(error.params)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')})`;
    }
    
    return `${path}: ${message}${details}`;
  });
}

/**
 * Performs additional consistency checks on securities data beyond schema validation
 * 
 * @param referenceData The reference data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateSecuritiesConsistency(referenceData: ReferenceData): ValidationResult {
  const { securities } = referenceData;
  const errors: string[] = [];
  
  // Check for duplicate internal IDs
  const internalIds = new Set<string>();
  for (const security of securities) {
    if (internalIds.has(security.internalId)) {
      errors.push(`Duplicate security internalId: ${security.internalId}`);
    }
    internalIds.add(security.internalId);
  }
  
  // Verify all securities have at least one identifier
  for (const security of securities) {
    if (!security.identifiers || security.identifiers.length === 0) {
      errors.push(`Security ${security.internalId} has no identifiers`);
    }
  }
  
  // Validate that basket products have corresponding index compositions
  const indexIds = new Set(
    referenceData.indexCompositions.map(comp => comp.indexId)
  );
  
  for (const security of securities) {
    if (security.isBasketProduct && !indexIds.has(security.internalId)) {
      errors.push(
        `Basket product ${security.internalId} has no index composition records`
      );
    }
  }
  
  // Check for consistency between primary identifier and identifiers collection
  for (const security of securities) {
    if (security.primaryIdentifier) {
      const hasPrimaryInCollection = security.identifiers.some(
        id => id.type === security.primaryIdentifier!.type && 
             id.value === security.primaryIdentifier!.value
      );
      
      if (!hasPrimaryInCollection) {
        errors.push(
          `Security ${security.internalId} has primaryIdentifier ${security.primaryIdentifier.type}:${security.primaryIdentifier.value} not found in identifiers collection`
        );
      }
    }
  }
  
  // Verify that maturity dates are after issue dates where applicable
  for (const security of securities) {
    if (security.issueDate && security.maturityDate) {
      const issueDate = new Date(security.issueDate);
      const maturityDate = new Date(security.maturityDate);
      
      if (maturityDate <= issueDate) {
        errors.push(
          `Security ${security.internalId} has maturityDate (${security.maturityDate}) on or before issueDate (${security.issueDate})`
        );
      }
    }
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on counterparties data beyond schema validation
 * 
 * @param referenceData The reference data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateCounterpartiesConsistency(referenceData: ReferenceData): ValidationResult {
  const { counterparties, counterpartyRelationships } = referenceData;
  const errors: string[] = [];
  
  // Check for duplicate counterparty IDs
  const counterpartyIds = new Set<string>();
  for (const cp of counterparties) {
    if (counterpartyIds.has(cp.counterpartyId)) {
      errors.push(`Duplicate counterpartyId: ${cp.counterpartyId}`);
    }
    counterpartyIds.add(cp.counterpartyId);
  }
  
  // Verify all counterparties have at least one identifier
  for (const cp of counterparties) {
    if (!cp.identifiers || cp.identifiers.length === 0) {
      errors.push(`Counterparty ${cp.counterpartyId} has no identifiers`);
    }
  }
  
  // Check for consistency between primary identifier and identifiers collection
  for (const cp of counterparties) {
    if (cp.primaryIdentifier) {
      const hasPrimaryInCollection = cp.identifiers.some(
        id => id.type === cp.primaryIdentifier!.type && 
             id.value === cp.primaryIdentifier!.value
      );
      
      if (!hasPrimaryInCollection) {
        errors.push(
          `Counterparty ${cp.counterpartyId} has primaryIdentifier ${cp.primaryIdentifier.type}:${cp.primaryIdentifier.value} not found in identifiers collection`
        );
      }
    }
  }
  
  // Validate that counterparty relationships are consistent
  if (counterpartyRelationships && counterpartyRelationships.length > 0) {
    for (const rel of counterpartyRelationships) {
      if (!counterpartyIds.has(rel.parentId)) {
        errors.push(
          `Counterparty relationship references non-existent parentId: ${rel.parentId}`
        );
      }
      
      if (!counterpartyIds.has(rel.childId)) {
        errors.push(
          `Counterparty relationship references non-existent childId: ${rel.childId}`
        );
      }
      
      if (rel.parentId === rel.childId) {
        errors.push(
          `Counterparty relationship has same parent and child ID: ${rel.parentId}`
        );
      }
    }
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on aggregation units data beyond schema validation
 * 
 * @param referenceData The reference data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateAggregationUnitsConsistency(referenceData: ReferenceData): ValidationResult {
  const { aggregationUnits, counterparties } = referenceData;
  const errors: string[] = [];
  
  // Check for duplicate aggregation unit IDs
  const aggregationUnitIds = new Set<string>();
  for (const unit of aggregationUnits) {
    if (aggregationUnitIds.has(unit.aggregationUnitId)) {
      errors.push(`Duplicate aggregationUnitId: ${unit.aggregationUnitId}`);
    }
    aggregationUnitIds.add(unit.aggregationUnitId);
  }
  
  // Verify that officer IDs reference valid counterparties where applicable
  const counterpartyIds = new Set(
    counterparties.map(cp => cp.counterpartyId)
  );
  
  for (const unit of aggregationUnits) {
    if (unit.officerId && !counterpartyIds.has(unit.officerId)) {
      errors.push(
        `Aggregation unit ${unit.aggregationUnitId} references non-existent officerId: ${unit.officerId}`
      );
    }
  }
  
  // Validate that parent entity IDs reference valid aggregation units where applicable
  for (const unit of aggregationUnits) {
    if (unit.parentEntityId) {
      if (!aggregationUnitIds.has(unit.parentEntityId)) {
        errors.push(
          `Aggregation unit ${unit.aggregationUnitId} references non-existent parentEntityId: ${unit.parentEntityId}`
        );
      }
      
      if (unit.parentEntityId === unit.aggregationUnitId) {
        errors.push(
          `Aggregation unit ${unit.aggregationUnitId} references itself as parent`
        );
      }
    }
  }
  
  // Check that books associated with aggregation units are unique across all units
  const bookToUnitMap = new Map<string, string>();
  for (const unit of aggregationUnits) {
    if (unit.books && unit.books.length > 0) {
      for (const book of unit.books) {
        if (bookToUnitMap.has(book)) {
          errors.push(
            `Book ${book} is associated with multiple aggregation units: ${bookToUnitMap.get(book)} and ${unit.aggregationUnitId}`
          );
        } else {
          bookToUnitMap.set(book, unit.aggregationUnitId);
        }
      }
    }
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs additional consistency checks on index compositions data beyond schema validation
 * 
 * @param referenceData The reference data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateIndexCompositionsConsistency(referenceData: ReferenceData): ValidationResult {
  const { indexCompositions, securities } = referenceData;
  const errors: string[] = [];
  
  // Create set of security IDs for lookup
  const securityIds = new Set(
    securities.map(sec => sec.internalId)
  );
  
  // Map of basketProducts for lookup
  const basketProducts = new Map(
    securities
      .filter(sec => sec.isBasketProduct)
      .map(sec => [sec.internalId, sec])
  );
  
  // Verify that all index securities referenced in compositions exist
  for (const comp of indexCompositions) {
    if (!securityIds.has(comp.indexId)) {
      errors.push(
        `Index composition references non-existent index security: ${comp.indexId}`
      );
    }
    
    if (!securityIds.has(comp.constituentId)) {
      errors.push(
        `Index composition references non-existent constituent security: ${comp.constituentId}`
      );
    }
    
    if (comp.indexId === comp.constituentId) {
      errors.push(
        `Index composition has same index and constituent ID: ${comp.indexId}`
      );
    }
  }
  
  // Verify that index securities are marked as basket products
  const indexIds = new Set(
    indexCompositions.map(comp => comp.indexId)
  );
  
  for (const indexId of indexIds) {
    const security = securities.find(sec => sec.internalId === indexId);
    if (security && !security.isBasketProduct) {
      errors.push(
        `Security ${indexId} is used as an index but not marked as a basket product`
      );
    }
  }
  
  // Validate that weights for each index sum to approximately 1.0
  const indexWeights = new Map<string, number>();
  for (const comp of indexCompositions) {
    const currentWeight = indexWeights.get(comp.indexId) || 0;
    indexWeights.set(comp.indexId, currentWeight + comp.weight);
  }
  
  for (const [indexId, totalWeight] of indexWeights.entries()) {
    // Allow for small rounding errors in weight sums (within 0.5%)
    if (totalWeight < 0.995 || totalWeight > 1.005) {
      errors.push(
        `Index ${indexId} has constituent weights that sum to ${totalWeight.toFixed(4)}, expected approximately 1.0`
      );
    }
  }
  
  // Check that effective dates are before expiry dates where applicable
  for (const comp of indexCompositions) {
    if (comp.effectiveDate && comp.expiryDate) {
      const effectiveDate = new Date(comp.effectiveDate);
      const expiryDate = new Date(comp.expiryDate);
      
      if (expiryDate <= effectiveDate) {
        errors.push(
          `Index composition for ${comp.indexId}/${comp.constituentId} has expiryDate (${comp.expiryDate}) on or before effectiveDate (${comp.effectiveDate})`
        );
      }
    }
  }
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performs all consistency checks on reference data
 * 
 * @param referenceData The reference data to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateReferenceDataConsistency(referenceData: ReferenceData): ValidationResult {
  const securitiesValidation = validateSecuritiesConsistency(referenceData);
  const counterpartiesValidation = validateCounterpartiesConsistency(referenceData);
  const aggregationUnitsValidation = validateAggregationUnitsConsistency(referenceData);
  const indexCompositionsValidation = validateIndexCompositionsConsistency(referenceData);
  
  const allErrors: string[] = [];
  
  if (!securitiesValidation.success && securitiesValidation.errors) {
    allErrors.push(...securitiesValidation.errors.map(err => `Securities: ${err}`));
  }
  
  if (!counterpartiesValidation.success && counterpartiesValidation.errors) {
    allErrors.push(...counterpartiesValidation.errors.map(err => `Counterparties: ${err}`));
  }
  
  if (!aggregationUnitsValidation.success && aggregationUnitsValidation.errors) {
    allErrors.push(...aggregationUnitsValidation.errors.map(err => `Aggregation Units: ${err}`));
  }
  
  if (!indexCompositionsValidation.success && indexCompositionsValidation.errors) {
    allErrors.push(...indexCompositionsValidation.errors.map(err => `Index Compositions: ${err}`));
  }
  
  return {
    success: allErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : undefined
  };
}

/**
 * Generates a detailed validation report for reference data
 * 
 * @param schemaValidation Result of schema validation
 * @param consistencyValidation Result of consistency validation
 * @param referenceData The reference data that was validated
 * @returns Formatted validation report
 */
function generateValidationReport(
  schemaValidation: ValidationResult,
  consistencyValidation: ValidationResult,
  referenceData: ReferenceData
): string {
  const timestamp = new Date().toISOString();
  const overallSuccess = schemaValidation.success && consistencyValidation.success;
  
  let report = `
===========================================================
REFERENCE DATA VALIDATION REPORT
Generated: ${timestamp}
Overall Result: ${overallSuccess ? chalk.green('PASSED') : chalk.red('FAILED')}
===========================================================

Summary:
- Securities: ${referenceData.securities.length}
- Counterparties: ${referenceData.counterparties.length}
- Aggregation Units: ${referenceData.aggregationUnits.length}
- Index Compositions: ${referenceData.indexCompositions.length}
- Counterparty Relationships: ${referenceData.counterpartyRelationships?.length || 0}
`;

  if (!schemaValidation.success && schemaValidation.errors) {
    report += `
SCHEMA VALIDATION ERRORS:
${schemaValidation.errors.map(err => `- ${chalk.red(err)}`).join('\n')}
`;
  }

  if (!consistencyValidation.success && consistencyValidation.errors) {
    report += `
CONSISTENCY VALIDATION ERRORS:
${consistencyValidation.errors.map(err => `- ${chalk.yellow(err)}`).join('\n')}
`;
  }

  report += `
===========================================================
VALIDATION SUMMARY:
- Schema Validation: ${schemaValidation.success ? chalk.green('PASSED') : chalk.red('FAILED')}
- Consistency Validation: ${consistencyValidation.success ? chalk.green('PASSED') : chalk.red('FAILED')}
===========================================================
`;

  return report;
}

/**
 * Main function that orchestrates the validation process
 */
function main(): void {
  const program = new Command();
  
  program
    .name('validate-reference-data')
    .description('Validates reference data against JSON schema and performs consistency checks')
    .version('1.0.0')
    .option('-f, --file <path>', 'Path to reference data JSON file')
    .option('-o, --output <path>', 'Path to output validation report file')
    .parse(process.argv);
  
  const options = program.opts();
  
  // Load schema and reference data
  const schema = loadReferenceDataSchema();
  const referenceData = loadReferenceData(options.file);
  
  // Perform validations
  const schemaValidation = validateReferenceData(referenceData, schema);
  const consistencyValidation = validateReferenceDataConsistency(referenceData);
  
  // Generate report
  const report = generateValidationReport(
    schemaValidation,
    consistencyValidation,
    referenceData
  );
  
  // Output report
  console.log(report);
  
  // Write report to file if output path is specified
  if (options.output) {
    try {
      fs.writeFileSync(options.output, report.replace(/\u001b\[\d+m/g, ''));
      console.log(chalk.green(`Report written to: ${options.output}`));
    } catch (error) {
      console.error(chalk.red(`Error writing report to file: ${error.message}`));
    }
  }
  
  // Exit with appropriate status code
  process.exit(schemaValidation.success && consistencyValidation.success ? 0 : 1);
}

// Execute main function if this script is run directly
if (require.main === module) {
  main();
}

// Export functions for testing and reuse
export {
  loadReferenceDataSchema,
  loadReferenceData,
  validateReferenceData,
  validateReferenceDataConsistency,
  generateValidationReport
};