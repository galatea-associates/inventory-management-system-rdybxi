/**
 * Utility Index Module
 * 
 * This is the main entry point for all utility functions in the Inventory Management System frontend.
 * It re-exports specialized utility modules to provide a centralized access point for common operations
 * like API interactions, data formatting, validation, date manipulation, error handling, and storage management.
 * 
 * Using this centralized approach ensures consistent implementation across the application and reduces
 * import complexity by providing a single import point for all utility functions.
 */

// Import all utility modules
import * as apiUtils from './api';
import * as formatterUtils from './formatter';
import * as validationUtils from './validation';
import * as dateUtils from './date';
import * as numberUtils from './number';
import * as localStorageUtils from './localStorage';
import * as sessionStorageUtils from './sessionStorage';
import * as errorUtils from './errorHandler';
import * as loggerUtils from './logger';
import * as permissionUtils from './permissions';

// Re-export all utility modules
export {
  apiUtils,
  formatterUtils,
  validationUtils,
  dateUtils,
  numberUtils,
  localStorageUtils,
  sessionStorageUtils,
  errorUtils,
  loggerUtils,
  permissionUtils
};