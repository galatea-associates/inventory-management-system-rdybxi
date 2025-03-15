/**
 * Central configuration export file for the Inventory Management System frontend.
 * This file aggregates and re-exports all configuration modules including API settings, theme configuration, and internationalization setup
 * to provide a unified configuration interface for the application.
 */

import * as apiConfig from './api'; // Import API configuration settings
import * as themeConfig from './theme'; // Import theme configuration settings
import * as i18nConfig from './i18n'; // Import internationalization configuration

/**
 * Export API configuration namespace
 * @namespace
 */
export { apiConfig };

/**
 * Export theme configuration namespace
 * @namespace
 */
export { themeConfig };

/**
 * Export internationalization configuration namespace
 * @namespace
 */
export { i18nConfig };