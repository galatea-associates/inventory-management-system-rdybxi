/**
 * ESLint configuration for the Inventory Management System backend services
 * This file defines linting rules to ensure code quality and consistency
 * across all backend JavaScript services.
 * 
 * eslint: ^8.38.0
 * eslint-plugin-node: ^11.1.0
 * eslint-config-airbnb-base: ^15.0.0
 * eslint-plugin-import: ^2.27.5
 */

module.exports = {
  // Indicates this is a root configuration that shouldn't be extended by other configs
  root: true,

  // Define environments where code will run
  env: {
    node: true,     // Node.js global variables and Node.js scoping
    es2021: true,   // Enables all ECMAScript 2021 features
    jest: true,     // Jest global variables for testing
  },

  // Extend recommended configurations
  extends: [
    'eslint:recommended',            // ESLint recommended rules
    'airbnb-base',                   // Airbnb's base JS style guide
    'plugin:node/recommended',       // Node.js specific recommendations
  ],

  // Parser options
  parserOptions: {
    ecmaVersion: 2021,               // Latest ECMAScript version
    sourceType: 'module',            // Code is in ECMAScript modules
  },

  // Plugins for additional rules
  plugins: [
    'node',                          // Node.js specific linting rules
    'import',                        // ES modules import validation
  ],

  // Custom rule configurations
  rules: {
    // Warn about console statements except for errors and warnings
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    
    // Disallow debugger statements
    'no-debugger': 'error',
    
    // Error on unused variables except those starting with underscore
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // Limit line length to 120 characters
    'max-len': ['error', { code: 120 }],
    
    // Enforce single quotes
    'quotes': ['error', 'single'],
    
    // Require semicolons
    'semi': ['error', 'always'],
    
    // Require trailing commas in multiline objects and arrays
    'comma-dangle': ['error', 'always-multiline'],
    
    // Require parentheses around arrow function arguments
    'arrow-parens': ['error', 'always'],
    
    // Allow dev dependencies in test files
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: ['**/*.test.js', '**/*.spec.js', '**/jest.config.js'],
    }],
    
    // Allow ES module syntax even if not supported by Node.js
    'node/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }],
    
    // Disable no-missing-import since we're using ES modules
    'node/no-missing-import': 'off',
    
    // Enforce import order
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    }],
  },

  // Rule overrides for specific file patterns
  overrides: [
    {
      // Test and configuration files
      files: ['**/*.test.js', '**/*.spec.js', '**/jest.config.js'],
      rules: {
        // Allow unpublished requires in test files
        'node/no-unpublished-require': 'off',
        
        // Relax line length limit for test files
        'max-len': ['warn', { code: 150 }],
      },
    },
  ],
};