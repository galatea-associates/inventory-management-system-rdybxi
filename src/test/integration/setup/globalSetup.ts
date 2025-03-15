import * as path from 'path';
import * as fs from 'fs-extra'; // v11.1.1
import Docker from 'dockerode'; // v3.3.5
import execa from 'execa'; // v7.1.1
import { TEST_TIMEOUTS } from '../../common/constants';
import { setupTestEnvironment } from '../../common/testUtils';

// Global state object to be shared with globalTeardown
const globalState: Record<string, any> = {};

/**
 * Starts the Docker services required for integration testing
 * 
 * @returns Promise that resolves when services are started
 */
async function startDockerServices(): Promise<void> {
  console.log('Starting Docker services for integration tests...');
  
  // Determine the Docker Compose file path
  const dockerComposeFilePath = path.resolve(process.cwd(), 'docker-compose.test.yml');
  
  if (!fs.existsSync(dockerComposeFilePath)) {
    throw new Error(`Docker Compose file not found at ${dockerComposeFilePath}`);
  }
  
  try {
    // Check if Docker is running
    const docker = new Docker();
    await docker.ping();
    
    // Start services using Docker Compose
    const composeResult = await execa('docker-compose', [
      '-f', dockerComposeFilePath, 
      'up', 
      '-d', 
      '--build'
    ]);
    
    if (composeResult.exitCode !== 0) {
      throw new Error(`Failed to start Docker services: ${composeResult.stderr}`);
    }
    
    // Store container info for cleanup in teardown
    const containers = await docker.listContainers({
      filters: { label: ['com.docker.compose.project=ims-test'] }
    });
    
    globalState.dockerContainers = containers.map(container => container.Id);
    console.log(`Started ${containers.length} Docker containers for integration tests`);
    
  } catch (error) {
    console.error('Failed to start Docker services:', error);
    throw error;
  }
}

/**
 * Initializes test databases with required schema and test data
 * 
 * @returns Promise that resolves when databases are initialized
 */
async function initializeTestDatabases(): Promise<void> {
  console.log('Initializing test databases with schema and test data...');
  
  try {
    // Path to schema and data initialization scripts
    const dbScriptsPath = path.resolve(process.cwd(), 'src/test/integration/setup/db');
    
    // Execute schema initialization scripts for PostgreSQL
    console.log('Initializing PostgreSQL schema...');
    await execa('docker-compose', [
      '-f', path.resolve(process.cwd(), 'docker-compose.test.yml'),
      'exec', '-T', 'postgres',
      'psql', '-U', 'postgres', '-d', 'ims_test', 
      '-f', '/docker-entrypoint-initdb.d/init.sql'
    ]);
    
    // Execute schema initialization scripts for TimescaleDB
    console.log('Initializing TimescaleDB schema...');
    await execa('docker-compose', [
      '-f', path.resolve(process.cwd(), 'docker-compose.test.yml'),
      'exec', '-T', 'timescaledb',
      'psql', '-U', 'postgres', '-d', 'ims_timeseries_test', 
      '-f', '/docker-entrypoint-initdb.d/init.sql'
    ]);
    
    // Load test data into databases
    if (fs.existsSync(path.join(dbScriptsPath, 'data'))) {
      console.log('Loading test data...');
      const dataFiles = await fs.readdir(path.join(dbScriptsPath, 'data'));
      
      for (const file of dataFiles) {
        if (file.endsWith('.sql')) {
          console.log(`Processing data file: ${file}`);
          const filePath = path.join(dbScriptsPath, 'data', file);
          const sqlContent = await fs.readFile(filePath, 'utf8');
          
          // Determine target database based on file name
          const dbTarget = file.includes('timeseries') ? 'timescaledb' : 'postgres';
          const dbName = file.includes('timeseries') ? 'ims_timeseries_test' : 'ims_test';
          
          await execa('docker-compose', [
            '-f', path.resolve(process.cwd(), 'docker-compose.test.yml'),
            'exec', '-T', dbTarget,
            'psql', '-U', 'postgres', '-d', dbName, '-c', sqlContent
          ]);
        }
      }
    }
    
    // Verify data was loaded correctly
    console.log('Verifying test data was loaded correctly...');
    const verifyPostgres = await execa('docker-compose', [
      '-f', path.resolve(process.cwd(), 'docker-compose.test.yml'),
      'exec', '-T', 'postgres',
      'psql', '-U', 'postgres', '-d', 'ims_test', '-c', 
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"
    ]);
    
    console.log(`PostgreSQL tables loaded: ${verifyPostgres.stdout.trim()}`);
    
    console.log('Test databases initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize test databases:', error);
    throw error;
  }
}

/**
 * Sets up global environment variables and configurations for tests
 */
function setupGlobalEnvironment(): void {
  console.log('Setting up global environment variables and configurations...');
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.API_TEST_URL = 'http://localhost:8080/api/v1';
  
  // Database connection settings
  process.env.POSTGRES_HOST = 'localhost';
  process.env.POSTGRES_PORT = '5432';
  process.env.POSTGRES_DB = 'ims_test';
  process.env.POSTGRES_USER = 'postgres';
  process.env.POSTGRES_PASSWORD = 'postgres';
  
  process.env.TIMESCALEDB_HOST = 'localhost';
  process.env.TIMESCALEDB_PORT = '5433';
  process.env.TIMESCALEDB_DB = 'ims_timeseries_test';
  process.env.TIMESCALEDB_USER = 'postgres';
  process.env.TIMESCALEDB_PASSWORD = 'postgres';
  
  // Cache and message bus settings
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.KAFKA_BROKERS = 'localhost:9092';
  
  // Configure global mocks and stubs
  setupTestEnvironment();
  
  // Initialize global test state
  globalState.testEnvironment = {
    env: { ...process.env },
    timestamp: new Date().toISOString()
  };
  
  // Set up global error handlers
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection during test setup:', reason);
  });
  
  console.log('Global environment setup completed');
}

/**
 * Waits for all required services to be ready before starting tests
 * 
 * @returns Promise that resolves to true when all services are ready
 */
async function waitForServicesReady(): Promise<boolean> {
  console.log('Waiting for services to be ready...');
  
  // Function to check if a service is ready
  const checkServiceHealth = async (
    url: string, 
    maxRetries = 30, 
    retryDelay = 1000
  ): Promise<boolean> => {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Ignore errors and retry
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      retries++;
      
      if (retries % 5 === 0) {
        console.log(`Still waiting for service at ${url}... (${retries}/${maxRetries})`);
      }
    }
    
    console.error(`Service at ${url} is not ready after ${maxRetries} attempts`);
    return false;
  };
  
  // Define services to check
  const servicesToCheck = [
    { name: 'API Gateway', url: 'http://localhost:8080/api/v1/health' },
    { name: 'Database', url: 'http://localhost:8080/api/v1/health/db' },
    { name: 'Kafka', url: 'http://localhost:8080/api/v1/health/kafka' }
  ];
  
  // Check all services
  for (const service of servicesToCheck) {
    console.log(`Checking if ${service.name} is ready...`);
    const isReady = await checkServiceHealth(service.url);
    if (!isReady) {
      return false;
    }
    console.log(`✓ ${service.name} is ready`);
  }
  
  console.log('All services are ready');
  return true;
}

/**
 * Main function that Jest executes before running integration tests
 */
export default async function(): Promise<void> {
  console.log('========== STARTING INTEGRATION TEST SETUP ==========');
  console.log(`Setup started at: ${new Date().toISOString()}`);
  
  try {
    // Set Jest timeout for setup
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
    
    // Start Docker services required for testing
    await startDockerServices();
    
    // Wait for services to be healthy and ready
    const servicesReady = await waitForServicesReady();
    if (!servicesReady) {
      throw new Error('Services not ready after maximum wait time');
    }
    
    // Initialize test databases with schema and test data
    await initializeTestDatabases();
    
    // Set up global environment variables and configurations
    setupGlobalEnvironment();
    
    // Store global state to be shared with teardown
    // @ts-ignore - Global variable for Jest
    global.__INTEGRATION_TEST_GLOBAL_STATE__ = globalState;
    
    console.log(`Setup completed at: ${new Date().toISOString()}`);
    console.log('========== INTEGRATION TEST SETUP COMPLETE ==========');
    
  } catch (error) {
    console.error('========== INTEGRATION TEST SETUP FAILED ==========');
    console.error('Error during integration test setup:', error);
    
    // Attempt cleanup in case of setup failure
    try {
      console.log('Attempting to clean up resources after setup failure...');
      if (globalState.dockerContainers) {
        const docker = new Docker();
        for (const containerId of globalState.dockerContainers) {
          console.log(`Stopping container: ${containerId.substring(0, 12)}...`);
          const container = docker.getContainer(containerId);
          await container.stop();
          await container.remove();
        }
      }
    } catch (cleanupError) {
      console.error('Failed to clean up after setup failure:', cleanupError);
    }
    
    // Re-throw the original error to fail the test run
    throw error;
  }
}