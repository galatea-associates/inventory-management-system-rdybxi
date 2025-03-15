# Data Verification Framework

This directory contains the data verification framework for the Inventory Management System (IMS). The framework is designed to validate the quality, integrity, and consistency of data processed by the system, ensuring compliance with the defined schemas and business rules.

## Overview

The data verification framework provides tools and scripts for validating different types of data used in the IMS:

1. **Reference Data**: Securities, counterparties, aggregation units, and index compositions
2. **Market Data**: Prices, basket NAVs, volatility curves, and FX rates
3. **Position Data**: Positions, settlement ladders, and depot positions
4. **Inventory Data**: Inventory availability, client limits, and aggregation unit limits
5. **Calculation Data**: Calculation results and rule outputs

Each data type has a corresponding JSON schema that defines the expected structure, required fields, data types, and validation rules. The framework includes scripts to validate data against these schemas and perform additional consistency checks.

## Directory Structure

```
├── expected/                  # Expected schema definitions
│   ├── reference-data-schema.json
│   ├── market-data-schema.json
│   ├── position-data-schema.json
│   ├── inventory-data-schema.json
│   └── calculation-data-schema.json
├── scripts/                   # Validation scripts
│   ├── validate-reference-data.ts
│   ├── validate-market-data.ts
│   ├── validate-position-data.ts
│   ├── validate-inventory-data.ts
│   └── validate-calculation-data.ts
└── README.md                  # This file
```

## Schema Definitions

### Reference Data Schema

The reference data schema (`reference-data-schema.json`) defines the structure and validation rules for reference data, including:

- Securities with their attributes and identifiers
- Counterparties with their attributes and identifiers
- Aggregation units with their attributes
- Index compositions with constituent securities and weights

The schema enforces data integrity through:
- Required fields validation
- Data type validation
- Enumeration constraints
- Pattern matching for standardized identifiers (ISIN, CUSIP, SEDOL, etc.)
- Relationship validation between entities

### Market Data Schema

The market data schema (`market-data-schema.json`) defines the structure and validation rules for market data, including:

- Security prices with timestamps and sources
- Basket NAVs with calculation times and types
- Volatility curves with points and tenors
- FX rates with currency pairs and rate types
- Market data events for event-driven processing

The schema enforces data quality through:
- Timestamp validation
- Numerical range validation
- Source enumeration
- Currency code validation
- Event correlation

### Position Data Schema

The position data schema (`position-data-schema.json`) defines the structure and validation rules for position data, including:

- Current positions with quantities and statuses
- Settlement ladders with projected deliveries and receipts
- Depot positions with custodian information

The schema enforces calculation integrity through:
- Quantity validation
- Settlement date validation
- Position status validation
- Book and security reference validation

### Inventory Data Schema

The inventory data schema (`inventory-data-schema.json`) defines the structure and validation rules for inventory data, including:

- Inventory availability by category
- Client limits for long and short selling
- Aggregation unit limits
- Locate approvals and decrements

The schema enforces inventory calculation integrity through:
- Quantity validation
- Category enumeration
- Limit validation
- Relationship validation between entities

### Calculation Data Schema

The calculation data schema (`calculation-data-schema.json`) defines the structure and validation rules for calculation results, including:

- Calculation outputs with timestamps and sources
- Rule execution results
- Calculation audit trails

The schema enforces calculation result integrity through:
- Result validation
- Timestamp validation
- Calculation type enumeration
- Input-output relationship validation

## Validation Scripts

### Reference Data Validation

The reference data validation script (`validate-reference-data.ts`) performs the following checks:

1. **Schema Validation**: Validates reference data against the JSON schema
2. **Consistency Validation**:
   - Checks for duplicate internal IDs
   - Verifies that all securities referenced in index compositions exist
   - Validates that identifier types are consistent with their patterns
   - Checks that securities with isBasket=true have corresponding index compositions
   - Verifies that all counterparty relationships reference valid counterparties
   - Checks that aggregation unit officer IDs reference valid counterparties

**Usage**:
```bash
# Validate reference data from a file
npx ts-node scripts/validate-reference-data.ts --file=/path/to/reference-data.json

# Validate reference data from the default test fixture
npx ts-node scripts/validate-reference-data.ts

# Output validation report to a file
npx ts-node scripts/validate-reference-data.ts --output=/path/to/report.txt
```

### Market Data Validation

The market data validation script (`validate-market-data.ts`) performs the following checks:

1. **Schema Validation**: Validates market data against the JSON schema
2. **Consistency Validation**:
   - Verifies that all securities referenced in market data exist
   - Checks for chronological consistency in time series data
   - Validates currency consistency across related data points
   - Verifies that basket NAVs reference valid basket securities

**Usage**:
```bash
# Validate market data from a file
npx ts-node scripts/validate-market-data.ts --file=/path/to/market-data.json

# Validate market data from the default test fixture
npx ts-node scripts/validate-market-data.ts

# Output validation report to a file
npx ts-node scripts/validate-market-data.ts --output=/path/to/report.txt
```

### Position Data Validation

The position data validation script (`validate-position-data.ts`) performs the following checks:

1. **Schema Validation**: Validates position data against the JSON schema
2. **Consistency Validation**:
   - Verifies that all securities referenced in positions exist
   - Checks for consistency between current positions and settlement ladders
   - Validates that depot positions reference valid securities and custodians
   - Verifies mathematical consistency in position calculations

**Usage**:
```bash
# Validate position data from a file
npx ts-node scripts/validate-position-data.ts --file=/path/to/position-data.json

# Validate position data from the default test fixture
npx ts-node scripts/validate-position-data.ts

# Output validation report to a file
npx ts-node scripts/validate-position-data.ts --output=/path/to/report.txt
```

### Inventory Data Validation

The inventory data validation script (`validate-inventory-data.ts`) performs the following checks:

1. **Schema Validation**: Validates inventory data against the JSON schema
2. **Consistency Validation**:
   - Verifies that all securities referenced in inventory data exist
   - Checks for consistency between inventory availability and limits
   - Validates that client limits reference valid clients
   - Verifies that aggregation unit limits reference valid aggregation units
   - Checks mathematical consistency in inventory calculations

**Usage**:
```bash
# Validate inventory data from a file
npx ts-node scripts/validate-inventory-data.ts --file=/path/to/inventory-data.json

# Validate inventory data from the default test fixture
npx ts-node scripts/validate-inventory-data.ts

# Output validation report to a file
npx ts-node scripts/validate-inventory-data.ts --output=/path/to/report.txt
```

### Calculation Data Validation

The calculation data validation script (`validate-calculation-data.ts`) performs the following checks:

1. **Schema Validation**: Validates calculation data against the JSON schema
2. **Consistency Validation**:
   - Verifies that all securities referenced in calculation data exist
   - Checks for consistency between calculation inputs and outputs
   - Validates that calculation rules reference valid rule definitions
   - Verifies mathematical accuracy of calculation results

**Usage**:
```bash
# Validate calculation data from a file
npx ts-node scripts/validate-calculation-data.ts --file=/path/to/calculation-data.json

# Validate calculation data from the default test fixture
npx ts-node scripts/validate-calculation-data.ts

# Output validation report to a file
npx ts-node scripts/validate-calculation-data.ts --output=/path/to/report.txt
```

## Integration with Test Framework

The data verification framework is integrated with the IMS test framework in several ways:

1. **CI/CD Integration**: Data validation is performed as part of the CI/CD pipeline to catch data quality issues early
2. **Test Data Validation**: Test data fixtures are validated against schemas to ensure test data quality
3. **Integration Test Support**: Data validation is used in integration tests to verify data transformation correctness
4. **Performance Test Data**: Validates performance test data to ensure realistic test scenarios

The framework can be invoked from other test scripts using the provided validation functions.

## Known-Result Testing

The data verification framework supports known-result testing for calculation validation:

1. **Reference Calculations**: Pre-calculated results for specific scenarios
2. **Calculation Validation**: Comparison of actual calculation outputs with expected results
3. **Tolerance Handling**: Support for floating-point comparison with configurable tolerance

Known-result test cases are defined in the test fixtures and can be extended as needed.

## Data Integrity Testing

The framework includes support for data integrity testing under various conditions:

1. **Transaction Integrity**: Verifying data consistency across transaction boundaries
2. **Failure Recovery**: Validating data integrity after failure scenarios
3. **Concurrent Modification**: Testing data consistency with concurrent updates

These tests are particularly important for ensuring the system maintains data integrity under stress conditions.

## Extending the Framework

To extend the data verification framework:

1. **Adding New Schemas**:
   - Create a new schema file in the `expected/` directory
   - Follow the JSON Schema Draft-07 format
   - Include comprehensive validation rules

2. **Adding New Validation Scripts**:
   - Create a new validation script in the `scripts/` directory
   - Follow the pattern of existing validation scripts
   - Implement both schema validation and consistency validation

3. **Adding New Validation Rules**:
   - Extend existing schemas with additional validation rules
   - Update validation scripts to include new consistency checks
   - Add tests for the new validation rules

## Best Practices

When working with the data verification framework:

1. **Regular Validation**: Validate data regularly, not just during testing
2. **Comprehensive Schemas**: Ensure schemas capture all business rules and constraints
3. **Consistency Checks**: Implement thorough consistency checks beyond basic schema validation
4. **Performance Consideration**: Be mindful of validation performance with large datasets
5. **Error Reporting**: Provide clear, actionable error messages
6. **Validation Coverage**: Ensure all critical data is covered by validation
7. **Schema Evolution**: Manage schema changes carefully to maintain backward compatibility
8. **Automated Testing**: Include data validation in automated test suites

## Troubleshooting

Common issues and their solutions:

1. **Schema Validation Errors**:
   - Check the error message for the specific validation failure
   - Verify that the data conforms to the expected schema
   - Check for typos in field names or incorrect data types

2. **Consistency Validation Errors**:
   - Check for referential integrity issues
   - Verify that related entities exist and are correctly referenced
   - Check for mathematical inconsistencies in calculations

3. **Performance Issues**:
   - Consider validating a subset of data for large datasets
   - Use the `--sample` option to validate a random sample
   - Optimize validation scripts for performance

4. **Script Execution Errors**:
   - Ensure Node.js and TypeScript are properly installed
   - Check that all dependencies are installed
   - Verify file paths and permissions

## References

- [JSON Schema Specification](https://json-schema.org/specification.html)
- [Ajv JSON Schema Validator](https://ajv.js.org/)
- [IMS Technical Specifications](../../docs/technical-specifications.md)
- [Data Quality Requirements](../../docs/data-quality-requirements.md)
- [Test Strategy](../../docs/test-strategy.md)