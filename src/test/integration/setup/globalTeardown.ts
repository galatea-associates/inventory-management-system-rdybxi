/**
 * Global teardown file for Jest integration tests in the Inventory Management System.
 * This file is executed once after all integration tests have completed to clean up 
 * the test environment, including stopping Docker containers, cleaning up test databases,
 * and releasing any resources allocated during testing.
 */

import path from 'path';
import fs from 'fs-extra'; // fs-extra v11.1.1
import Docker from 'dockerode'; // dockerode v3.3.5
import execa from 'execa'; // execa v7.1.1
import { TEST_TIMEOUTS } from '../../common/constants';

/**
 * Stops the Docker services that were started for integration testing
 * @returns Promise that resolves when services are stopped
 */
async function stopDockerServices(): Promise<void> {
  try {
    // Determine the Docker Compose file path
    const composeFilePath = path.resolve(process.cwd(), 'docker-compose.test.yml');
    
    // Ensure the compose file exists
    if (!await fs.pathExists(composeFilePath)) {
      console.log(`Docker Compose file not found at ${composeFilePath}, skipping Docker shutdown`);
      return;
    }
    
    console.log('Stopping Docker services...');
    
    // Stop services using Docker Compose with timeout for graceful shutdown
    await execa('docker-compose', [
      '-f', composeFilePath,
      'down',
      '--volumes',
      '--remove-orphans',
      '--timeout', '30'
    ]);
    
    // Verify all test containers are stopped
    const docker = new Docker();
    const containers = await docker.listContainers({
      filters: {
        label: ['com.ims.test.environment=true']
      }
    });
    
    if (containers.length > 0) {
      console.warn(`${containers.length} test containers still running after docker-compose down. Forcing removal...`);
      for (const container of containers) {
        const containerInstance = docker.getContainer(container.Id);
        await containerInstance.stop();
        await containerInstance.remove();
      }
    }
    
    console.log('Docker services stopped successfully');
  } catch (error) {
    console.error('Failed to stop Docker services:', error);
    // Don't throw error to allow other cleanup to continue
  }
}

/**
 * Cleans up test databases by removing test data
 * @returns Promise that resolves when databases are cleaned up
 */
async function cleanupTestDatabases(): Promise<void> {
  try {
    console.log('Cleaning up test databases...');
    
    // If Docker services are already down, we may not need to clean up the databases
    // as they would be removed with the containers. However, if using persistent volumes
    // or external databases, additional cleanup might be needed here.
    
    // Example of executing a cleanup script for a PostgreSQL database
    // const pgCleanupScriptPath = path.resolve(process.cwd(), 'src/test/scripts/cleanup-postgres.sql');
    // if (await fs.pathExists(pgCleanupScriptPath)) {
    //   await execa('psql', [
    //     '-h', 'localhost',
    //     '-U', 'testuser',
    //     '-d', 'testdb',
    //     '-f', pgCleanupScriptPath
    //   ], {
    //     env: { PGPASSWORD: 'testpassword' }
    //   });
    // }
    
    // Example for cleaning up Redis data
    // await execa('redis-cli', ['FLUSHALL']);
    
    console.log('Test databases cleaned up successfully');
  } catch (error) {
    console.error('Failed to clean up test databases:', error);
  }
}

/**
 * Cleans up temporary files created during testing
 * @returns Promise that resolves when temporary files are cleaned up
 */
async function cleanupTempFiles(): Promise<void> {
  try {
    console.log('Cleaning up temporary files...');
    
    // Define temp directory paths - typically tests might create files in these directories
    const tempDirs = [
      path.resolve(process.cwd(), 'tmp/test'),
      path.resolve(process.cwd(), 'tmp/uploads'),
      path.resolve(process.cwd(), 'tmp/downloads'),
      path.resolve(process.cwd(), 'tmp/reports')
    ];
    
    // Clean up each temp directory
    for (const tempDir of tempDirs) {
      if (await fs.pathExists(tempDir)) {
        // Remove all files in the temp directory but keep the directory
        const files = await fs.readdir(tempDir);
        
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          
          // Only remove files and directories that aren't gitkeep
          if (file !== '.gitkeep') {
            await fs.remove(filePath);
          }
        }
        
        console.log(`Cleaned up directory: ${tempDir}`);
      }
    }
    
    // Remove any specific test files that might have been created elsewhere
    const testFilesToRemove = [
      path.resolve(process.cwd(), 'test-results.json'),
      path.resolve(process.cwd(), 'coverage-report.json')
    ];
    
    for (const file of testFilesToRemove) {
      if (await fs.pathExists(file)) {
        await fs.remove(file);
        console.log(`Removed file: ${file}`);
      }
    }
    
    console.log('Temporary files cleaned up successfully');
  } catch (error) {
    console.error('Failed to clean up temporary files:', error);
  }
}

/**
 * Cleans up global environment variables and configurations set during tests
 */
function cleanupGlobalEnvironment(): void {
  try {
    console.log('Cleaning up global environment...');
    
    // Reset any global variables that were set during testing
    if (global.__TEST_ENVIRONMENT__ !== undefined) {
      delete global.__TEST_ENVIRONMENT__;
    }
    
    // Clear any mock implementations or spy data
    if (global.__MOCK_IMPLEMENTATIONS__ !== undefined) {
      delete global.__MOCK_IMPLEMENTATIONS__;
    }
    
    // Reset any overridden environment variables
    if (process.env.TEST_MODE) {
      delete process.env.TEST_MODE;
    }
    
    // Reset any global error handlers or event listeners
    if (typeof process.removeAllListeners === 'function') {
      process.removeAllListeners('unhandledRejection');
      process.removeAllListeners('uncaughtException');
    }
    
    console.log('Global environment cleaned up successfully');
  } catch (error) {
    console.error('Failed to clean up global environment:', error);
  }
}

/**
 * Main function that Jest executes after running integration tests
 * @returns Promise that resolves when teardown is complete
 */
export default async function(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Starting integration test teardown...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Set timeout to ensure teardown completes
  const teardownTimeout = setTimeout(() => {
    console.error(`Teardown timed out after ${TEST_TIMEOUTS.INTEGRATION}ms`);
    process.exit(1);
  }, TEST_TIMEOUTS.INTEGRATION);
  
  try {
    // Run cleanup tasks in sequence to avoid potential conflicts
    await cleanupTempFiles();
    await cleanupTestDatabases();
    await stopDockerServices();
    
    // Clean up global environment
    cleanupGlobalEnvironment();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Integration test teardown completed successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('Error during teardown:', error);
    process.exit(1);
  } finally {
    clearTimeout(teardownTimeout);
  }
}