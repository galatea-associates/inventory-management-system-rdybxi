/**
 * Constants Index
 * 
 * This is the central export file for all constants used in the Inventory Management System.
 * It aggregates and re-exports all constants from specialized modules to provide a single
 * import point for the entire application, ensuring consistency and maintainability.
 */

// Import all constants from each specialized module
import * as apiConstants from './api';
import * as themeConstants from './theme';
import * as routeConstants from './routes';
import * as notificationConstants from './notifications';
import * as permissionConstants from './permissions';

// Re-export all constants
export {
  apiConstants,
  themeConstants,
  routeConstants,
  notificationConstants,
  permissionConstants
};