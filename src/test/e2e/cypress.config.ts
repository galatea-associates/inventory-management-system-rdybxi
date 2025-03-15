import { defineConfig } from 'cypress'; // version 12.14.0
import preprocessor from '@cypress/webpack-preprocessor'; // version 5.17.1
import codeCoverageTask from '@cypress/code-coverage/task'; // version 3.10.0
import * as fs from 'fs';
import { TEST_TIMEOUTS, PERFORMANCE_THRESHOLDS } from '../common/constants';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/integration/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      // Register TypeScript preprocessor for handling .ts files
      on('file:preprocessor', preprocessor({
        webpackOptions: {
          resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx']
          },
          module: {
            rules: [
              {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: {
                  loader: 'ts-loader'
                }
              }
            ]
          }
        }
      }));

      // Register code coverage task
      codeCoverageTask(on, config);

      // Configure custom tasks for file operations and test data management
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        readFileMaybe(filename) {
          if (fs.existsSync(filename)) {
            return fs.readFileSync(filename, 'utf8');
          }
          return null;
        },
        performanceCheck({ metricName, value, threshold }) {
          const pass = value <= threshold;
          console.log(`Performance check for ${metricName}: ${value}ms (threshold: ${threshold}ms) - ${pass ? 'PASS' : 'FAIL'}`);
          return { pass, value, threshold };
        }
      });

      // Set up environment-specific configuration
      const environment = process.env.TEST_ENVIRONMENT || process.env.NODE_ENV || 'development';
      config.env.environment = environment;
      
      // Load environment-specific settings
      switch (environment) {
        case 'ci':
          config.video = false;
          config.screenshotOnRunFailure = false;
          break;
        case 'production':
          config.baseUrl = process.env.PROD_BASE_URL || config.baseUrl;
          config.env.API_BASE_URL = process.env.PROD_API_URL || config.env.API_BASE_URL;
          break;
        default:
          // Development is the default
          break;
      }

      return config;
    },
    experimentalStudio: false,
    defaultCommandTimeout: TEST_TIMEOUTS.E2E,
    requestTimeout: TEST_TIMEOUTS.E2E,
    responseTimeout: TEST_TIMEOUTS.E2E,
    pageLoadTimeout: TEST_TIMEOUTS.E2E * 2,
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true
  },
  viewportWidth: 1280,
  viewportHeight: 720,
  retries: {
    runMode: 2,
    openMode: 0
  },
  env: {
    codeCoverage: {
      url: '/api/__coverage__',
      exclude: [
        'cypress/**/*.*',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}'
      ]
    },
    API_BASE_URL: 'http://localhost:8080/api',
    PERFORMANCE_THRESHOLD: PERFORMANCE_THRESHOLDS.UI_RESPONSE,
    COVERAGE_ENABLED: true
  },
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports',
    overwrite: false,
    html: true,
    json: true
  },
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
  downloadsFolder: 'cypress/downloads',
  fixturesFolder: 'cypress/fixtures'
});