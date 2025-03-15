#!/usr/bin/env node
/**
 * Market Data Validation Script
 * 
 * This script validates market data against a defined JSON schema and performs
 * additional consistency checks to ensure data quality. It can load data from
 * a specified file or use default test fixtures.
 */

import * as fs from 'fs-extra'; // v11.1.1
import * as path from 'path'; // v0.12.7
import Ajv from 'ajv'; // v8.12.0
import addFormats from 'ajv-formats'; // v2.1.1
import chalk from 'chalk'; // v5.2.0
import { Command } from 'commander'; // v10.0.1

import { loadTestData } from '../../../test/common/testUtils';
import { TEST_DATA_PATHS } from '../../../test/common/constants';

// Define schema path - adjust this path based on your project structure
const SCHEMA_PATH = path.resolve(__dirname, '../../../schemas/market-data-schema.json');

/**
 * Loads the market data JSON schema from the expected schema file
 * 
 * @returns The parsed JSON schema for market data
 */
function loadMarketDataSchema(): any {
  try {
    const schemaPath = SCHEMA_PATH;
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at path: ${schemaPath}`);
    }
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    return JSON.parse(schemaContent);
  } catch (error) {
    console.error(chalk.red(`Error loading market data schema: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Loads market data from a file or test fixture
 * 
 * @param filePath Optional path to a JSON file containing market data
 * @returns The parsed market data object
 */
function loadMarketData(filePath?: string): any {
  try {
    if (filePath) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Market data file not found at path: ${filePath}`);
      }
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    } else {
      // Load from test fixture if no file path provided
      return loadTestData(TEST_DATA_PATHS.MARKET_DATA);
    }
  } catch (error) {
    console.error(chalk.red(`Error loading market data: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Validates market data against the JSON schema
 * 
 * @param marketData The market data object to validate
 * @param schema The JSON schema to validate against
 * @returns Validation result with success flag and any errors
 */
function validateMarketData(marketData: any, schema: any): { success: boolean; errors: string[] | null } {
  const ajv = new Ajv({ strict: true, allErrors: true });
  addFormats(ajv);
  
  try {
    const validate = ajv.compile(schema);
    const valid = validate(marketData);
    
    if (!valid) {
      const formattedErrors = formatValidationErrors(validate.errors);
      return {
        success: false,
        errors: formattedErrors
      };
    }
    
    return {
      success: true,
      errors: null
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Schema validation error: ${error.message}`]
    };
  }
}

/**
 * Formats validation errors into a readable structure
 * 
 * @param errors Array of validation errors from Ajv
 * @returns Formatted error messages
 */
function formatValidationErrors(errors: any[]): string[] {
  if (!errors || errors.length === 0) {
    return [];
  }
  
  return errors.map(error => {
    const path = error.instancePath || '';
    const message = error.message || 'Unknown error';
    let formattedError = `${path}: ${message}`;
    
    // Add additional context based on error keyword
    if (error.keyword === 'required') {
      formattedError += ` (missing: ${error.params.missingProperty})`;
    } else if (error.keyword === 'enum') {
      formattedError += ` (allowed values: ${error.params.allowedValues.join(', ')})`;
    } else if (error.keyword === 'additionalProperties') {
      formattedError += ` (unexpected property: ${error.params.additionalProperty})`;
    } else if (error.keyword === 'type') {
      formattedError += ` (expected ${error.params.type}, got ${typeof error.data})`;
    }
    
    return formattedError;
  });
}

/**
 * Performs additional consistency checks on price data beyond schema validation
 * 
 * @param marketData The market data object to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validatePricesConsistency(marketData: any): { success: boolean; errors: string[] | null } {
  const errors: string[] = [];
  
  if (!marketData.prices || !Array.isArray(marketData.prices)) {
    return { success: true, errors: null }; // No prices to validate
  }
  
  // Check for duplicate price entries
  const priceKeys = new Set<string>();
  
  marketData.prices.forEach((price: any, index: number) => {
    // Generate a unique key for each price entry
    const priceKey = `${price.securityId}_${price.eventTime}_${price.priceType}`;
    
    // Check for duplicates
    if (priceKeys.has(priceKey)) {
      errors.push(`Duplicate price entry at index ${index} for security ${price.securityId} at time ${price.eventTime} with price type ${price.priceType}`);
    } else {
      priceKeys.add(priceKey);
    }
    
    // Check for either price or bid/ask prices, but not both
    if (price.price !== undefined && (price.bidPrice !== undefined || price.askPrice !== undefined)) {
      errors.push(`Price entry at index ${index} has both price and bid/ask prices for security ${price.securityId}`);
    }
    
    // Check for missing both price and bid/ask prices
    if (price.price === undefined && (price.bidPrice === undefined || price.askPrice === undefined)) {
      errors.push(`Price entry at index ${index} is missing required price information for security ${price.securityId}`);
    }
    
    // Check that prices are positive
    if (price.price !== undefined && price.price <= 0) {
      errors.push(`Price entry at index ${index} has non-positive price value (${price.price}) for security ${price.securityId}`);
    }
    
    if (price.bidPrice !== undefined && price.bidPrice <= 0) {
      errors.push(`Price entry at index ${index} has non-positive bid price value (${price.bidPrice}) for security ${price.securityId}`);
    }
    
    if (price.askPrice !== undefined && price.askPrice <= 0) {
      errors.push(`Price entry at index ${index} has non-positive ask price value (${price.askPrice}) for security ${price.securityId}`);
    }
    
    // Check for bid/ask price relationship (ask should be >= bid)
    if (price.bidPrice !== undefined && price.askPrice !== undefined && price.bidPrice > price.askPrice) {
      errors.push(`Price entry at index ${index} has bid price (${price.bidPrice}) greater than ask price (${price.askPrice}) for security ${price.securityId}`);
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : null
  };
}

/**
 * Performs additional consistency checks on basket NAV data beyond schema validation
 * 
 * @param marketData The market data object to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateBasketNavsConsistency(marketData: any): { success: boolean; errors: string[] | null } {
  const errors: string[] = [];
  
  if (!marketData.basketNavs || !Array.isArray(marketData.basketNavs)) {
    return { success: true, errors: null }; // No basketNavs to validate
  }
  
  // Check for duplicate NAV entries
  const navKeys = new Set<string>();
  
  marketData.basketNavs.forEach((nav: any, index: number) => {
    // Generate a unique key for each NAV entry
    const navKey = `${nav.basketId}_${nav.calculationTime}_${nav.navType}`;
    
    // Check for duplicates
    if (navKeys.has(navKey)) {
      errors.push(`Duplicate basket NAV entry at index ${index} for basket ${nav.basketId} at time ${nav.calculationTime} with type ${nav.navType}`);
    } else {
      navKeys.add(navKey);
    }
    
    // Check for positive NAV values
    if (nav.nav <= 0) {
      errors.push(`Basket NAV entry at index ${index} has non-positive NAV value (${nav.nav}) for basket ${nav.basketId}`);
    }
    
    // Check constituent weights sum to approximately 1.0 if provided
    if (nav.constituents && Array.isArray(nav.constituents) && nav.constituents.length > 0) {
      const totalWeight = nav.constituents.reduce((sum: number, constituent: any) => sum + constituent.weight, 0);
      
      // Allow for small floating point errors (within 0.01 of 1.0)
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        errors.push(`Basket NAV entry at index ${index} has constituent weights that sum to ${totalWeight}, which is not approximately 1.0 for basket ${nav.basketId}`);
      }
      
      // Check for negative constituent weights
      nav.constituents.forEach((constituent: any, constIndex: number) => {
        if (constituent.weight < 0) {
          errors.push(`Basket NAV entry at index ${index} has constituent at index ${constIndex} with negative weight (${constituent.weight}) for basket ${nav.basketId}`);
        }
      });
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : null
  };
}

/**
 * Performs additional consistency checks on volatility curve data beyond schema validation
 * 
 * @param marketData The market data object to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateVolatilityCurvesConsistency(marketData: any): { success: boolean; errors: string[] | null } {
  const errors: string[] = [];
  
  if (!marketData.volatilityCurves || !Array.isArray(marketData.volatilityCurves)) {
    return { success: true, errors: null }; // No volatility curves to validate
  }
  
  // Check for duplicate volatility curve entries
  const curveKeys = new Set<string>();
  
  marketData.volatilityCurves.forEach((curve: any, index: number) => {
    // Generate a unique key for each curve entry
    const curveKey = `${curve.securityId}_${curve.calculationTime}_${curve.curveType}`;
    
    // Check for duplicates
    if (curveKeys.has(curveKey)) {
      errors.push(`Duplicate volatility curve entry at index ${index} for security ${curve.securityId} at time ${curve.calculationTime} with type ${curve.curveType}`);
    } else {
      curveKeys.add(curveKey);
    }
    
    // Check for points array existence
    if (!curve.points || !Array.isArray(curve.points) || curve.points.length === 0) {
      errors.push(`Volatility curve entry at index ${index} has no volatility points for security ${curve.securityId}`);
    } else {
      // Check volatility values are positive and reasonable
      curve.points.forEach((point: any, pointIndex: number) => {
        if (point.volatility <= 0) {
          errors.push(`Volatility curve entry at index ${index} has non-positive volatility value (${point.volatility}) at point index ${pointIndex} for security ${curve.securityId}`);
        }
        
        if (point.volatility > 2) {
          errors.push(`Volatility curve entry at index ${index} has unusually high volatility value (${point.volatility}) at point index ${pointIndex} for security ${curve.securityId}`);
        }
      });
      
      // Check tenors are in ascending order
      let lastTenor = -1;
      for (let i = 0; i < curve.points.length; i++) {
        const point = curve.points[i];
        if (point.tenor <= lastTenor) {
          errors.push(`Volatility curve entry at index ${index} has non-ascending tenor values at point index ${i} for security ${curve.securityId}`);
          break;
        }
        lastTenor = point.tenor;
      }
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : null
  };
}

/**
 * Performs additional consistency checks on FX rate data beyond schema validation
 * 
 * @param marketData The market data object to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateFxRatesConsistency(marketData: any): { success: boolean; errors: string[] | null } {
  const errors: string[] = [];
  
  if (!marketData.fxRates || !Array.isArray(marketData.fxRates)) {
    return { success: true, errors: null }; // No FX rates to validate
  }
  
  // Check for duplicate FX rate entries
  const rateKeys = new Set<string>();
  // Map to check reciprocal rates consistency
  const rateMap = new Map<string, number>();
  
  marketData.fxRates.forEach((rate: any, index: number) => {
    // Generate a unique key for each rate entry
    const rateKey = `${rate.baseCurrency}_${rate.quoteCurrency}_${rate.eventTime}_${rate.rateType}`;
    
    // Check for duplicates
    if (rateKeys.has(rateKey)) {
      errors.push(`Duplicate FX rate entry at index ${index} for ${rate.baseCurrency}/${rate.quoteCurrency} at time ${rate.eventTime} with type ${rate.rateType}`);
    } else {
      rateKeys.add(rateKey);
    }
    
    // Check for positive rate values
    if (rate.rate <= 0) {
      errors.push(`FX rate entry at index ${index} has non-positive rate value (${rate.rate}) for ${rate.baseCurrency}/${rate.quoteCurrency}`);
    }
    
    // Store rate for reciprocal check
    const pairKey = `${rate.baseCurrency}_${rate.quoteCurrency}_${rate.rateType}`;
    const reciprocalPairKey = `${rate.quoteCurrency}_${rate.baseCurrency}_${rate.rateType}`;
    
    rateMap.set(pairKey, rate.rate);
    
    // Check reciprocal rate consistency if both directions exist
    if (rateMap.has(reciprocalPairKey)) {
      const reciprocalRate = rateMap.get(reciprocalPairKey);
      const expectedReciprocal = 1 / rate.rate;
      
      // Allow for small floating point errors (within 0.0001 of expected value)
      if (Math.abs(reciprocalRate - expectedReciprocal) > 0.0001) {
        errors.push(`Inconsistent reciprocal FX rates detected: ${rate.baseCurrency}/${rate.quoteCurrency} = ${rate.rate} but ${rate.quoteCurrency}/${rate.baseCurrency} = ${reciprocalRate} (expected approximately ${expectedReciprocal})`);
      }
    }
  });
  
  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : null
  };
}

/**
 * Performs all consistency checks on market data
 * 
 * @param marketData The market data object to validate
 * @returns Validation result with success flag and any consistency errors
 */
function validateMarketDataConsistency(marketData: any): { success: boolean; errors: string[] | null } {
  const pricesValidation = validatePricesConsistency(marketData);
  const basketNavsValidation = validateBasketNavsConsistency(marketData);
  const volatilityCurvesValidation = validateVolatilityCurvesConsistency(marketData);
  const fxRatesValidation = validateFxRatesConsistency(marketData);
  
  // Combine all errors
  const allErrors: string[] = [];
  
  if (pricesValidation.errors) {
    allErrors.push(...pricesValidation.errors.map(err => `Price Consistency: ${err}`));
  }
  
  if (basketNavsValidation.errors) {
    allErrors.push(...basketNavsValidation.errors.map(err => `Basket NAV Consistency: ${err}`));
  }
  
  if (volatilityCurvesValidation.errors) {
    allErrors.push(...volatilityCurvesValidation.errors.map(err => `Volatility Curve Consistency: ${err}`));
  }
  
  if (fxRatesValidation.errors) {
    allErrors.push(...fxRatesValidation.errors.map(err => `FX Rate Consistency: ${err}`));
  }
  
  return {
    success: allErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : null
  };
}

/**
 * Generates a detailed validation report for market data
 * 
 * @param schemaValidation Schema validation result
 * @param consistencyValidation Consistency validation result
 * @param marketData The market data object that was validated
 * @returns Formatted validation report
 */
function generateValidationReport(
  schemaValidation: { success: boolean; errors: string[] | null },
  consistencyValidation: { success: boolean; errors: string[] | null },
  marketData: any
): string {
  const timestamp = new Date().toISOString();
  const overallSuccess = schemaValidation.success && consistencyValidation.success;
  
  // Count items for summary
  const priceCount = marketData.prices?.length || 0;
  const navCount = marketData.basketNavs?.length || 0;
  const curveCount = marketData.volatilityCurves?.length || 0;
  const fxRateCount = marketData.fxRates?.length || 0;
  
  let report = `
======================================================
MARKET DATA VALIDATION REPORT
======================================================
Timestamp: ${timestamp}
Overall Status: ${overallSuccess ? chalk.green('PASS') : chalk.red('FAIL')}

SUMMARY:
- Total Prices: ${priceCount}
- Total Basket NAVs: ${navCount}
- Total Volatility Curves: ${curveCount}
- Total FX Rates: ${fxRateCount}
------------------------------------------------------
`;
  
  // Add schema validation errors
  if (!schemaValidation.success && schemaValidation.errors) {
    report += `
SCHEMA VALIDATION ERRORS:
${schemaValidation.errors.map(err => chalk.red(`- ${err}`)).join('\n')}
------------------------------------------------------
`;
  }
  
  // Add consistency validation errors
  if (!consistencyValidation.success && consistencyValidation.errors) {
    report += `
CONSISTENCY VALIDATION ERRORS:
${consistencyValidation.errors.map(err => chalk.yellow(`- ${err}`)).join('\n')}
------------------------------------------------------
`;
  }
  
  // Add validation summary
  report += `
VALIDATION SUMMARY:
- Schema Validation: ${schemaValidation.success ? chalk.green('PASS') : chalk.red('FAIL')}
- Consistency Validation: ${consistencyValidation.success ? chalk.green('PASS') : chalk.yellow('FAIL')}
- Overall Result: ${overallSuccess ? chalk.green('PASS') : chalk.red('FAIL')}
======================================================
`;
  
  return report;
}

/**
 * Main function that orchestrates the validation process
 */
function main(): void {
  const program = new Command();
  
  program
    .name('validate-market-data')
    .description('Validates market data against the defined JSON schema and performs consistency checks')
    .version('1.0.0')
    .option('-f, --file <path>', 'Path to the market data file to validate')
    .option('-o, --output <path>', 'Path to write the validation report')
    .option('-s, --silent', 'Suppress console output')
    .parse(process.argv);
  
  const options = program.opts();
  
  // Load the schema
  const schema = loadMarketDataSchema();
  
  // Load the market data
  const marketData = loadMarketData(options.file);
  
  // Validate against schema
  const schemaValidation = validateMarketData(marketData, schema);
  
  // Perform consistency validation
  const consistencyValidation = validateMarketDataConsistency(marketData);
  
  // Generate report
  const report = generateValidationReport(schemaValidation, consistencyValidation, marketData);
  
  // Output report
  if (!options.silent) {
    console.log(report);
  }
  
  // Write report to file if specified
  if (options.output) {
    try {
      fs.writeFileSync(options.output, report);
      if (!options.silent) {
        console.log(chalk.green(`Report written to ${options.output}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error writing report to file: ${error.message}`));
    }
  }
  
  // Exit with appropriate code
  const exitCode = schemaValidation.success && consistencyValidation.success ? 0 : 1;
  process.exit(exitCode);
}

// Execute main function if script is run directly
if (require.main === module) {
  main();
}

// Export functions for testing and reuse
export {
  loadMarketDataSchema,
  loadMarketData,
  validateMarketData,
  formatValidationErrors,
  validatePricesConsistency,
  validateBasketNavsConsistency,
  validateVolatilityCurvesConsistency,
  validateFxRatesConsistency,
  validateMarketDataConsistency,
  generateValidationReport
};