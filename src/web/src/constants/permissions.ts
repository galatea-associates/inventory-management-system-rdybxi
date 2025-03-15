/**
 * permissions.ts
 * 
 * This file defines all permission constants used throughout the Inventory Management System.
 * It provides a centralized definition of all permission types, permission strings, and role templates
 * used for access control and authorization within the application.
 */

/**
 * Enum defining the types of permissions in the system
 */
export enum PermissionType {
  SYSTEM = 'SYSTEM',
  REFERENCE_DATA = 'REFERENCE_DATA',
  POSITION = 'POSITION',
  INVENTORY = 'INVENTORY',
  LOCATE = 'LOCATE',
  ORDER = 'ORDER',
  CALCULATION_RULE = 'CALCULATION_RULE',
  EXCEPTION = 'EXCEPTION'
}

/**
 * System-level permission constants
 */
export const SYSTEM_PERMISSIONS = {
  ADMIN: 'SYSTEM:ADMIN',          // Full system administration privileges
  CONFIGURE: 'SYSTEM:CONFIGURE',  // System configuration privileges
  MONITOR: 'SYSTEM:MONITOR',      // System monitoring privileges
  AUDIT: 'SYSTEM:AUDIT'           // System audit privileges
};

/**
 * Reference data permission constants
 */
export const REFERENCE_DATA_PERMISSIONS = {
  VIEW: 'REFERENCE_DATA:VIEW',       // View reference data
  CREATE: 'REFERENCE_DATA:CREATE',   // Create new reference data
  UPDATE: 'REFERENCE_DATA:UPDATE',   // Update existing reference data
  DELETE: 'REFERENCE_DATA:DELETE',   // Delete reference data
  IMPORT: 'REFERENCE_DATA:IMPORT',   // Import reference data from external sources
  EXPORT: 'REFERENCE_DATA:EXPORT'    // Export reference data
};

/**
 * Position-related permission constants
 */
export const POSITION_PERMISSIONS = {
  VIEW: 'POSITION:VIEW',             // Basic position viewing permission
  VIEW_ALL: 'POSITION:VIEW_ALL',     // View all positions across the system
  VIEW_DESK: 'POSITION:VIEW_DESK',   // View positions for a specific desk
  VIEW_CLIENT: 'POSITION:VIEW_CLIENT', // View positions for a specific client
  EXPORT: 'POSITION:EXPORT'          // Export position data
};

/**
 * Inventory-related permission constants
 */
export const INVENTORY_PERMISSIONS = {
  VIEW: 'INVENTORY:VIEW',            // Basic inventory viewing permission
  VIEW_ALL: 'INVENTORY:VIEW_ALL',    // View all inventory across the system
  VIEW_DESK: 'INVENTORY:VIEW_DESK',  // View inventory for a specific desk
  EXPORT: 'INVENTORY:EXPORT'         // Export inventory data
};

/**
 * Locate-related permission constants
 */
export const LOCATE_PERMISSIONS = {
  VIEW: 'LOCATE:VIEW',               // View locate requests
  CREATE: 'LOCATE:CREATE',           // Create locate requests
  APPROVE: 'LOCATE:APPROVE',         // Approve locate requests
  REJECT: 'LOCATE:REJECT',           // Reject locate requests
  VIEW_ALL: 'LOCATE:VIEW_ALL',       // View all locate requests
  VIEW_DESK: 'LOCATE:VIEW_DESK'      // View locate requests for a specific desk
};

/**
 * Order-related permission constants
 */
export const ORDER_PERMISSIONS = {
  VIEW: 'ORDER:VIEW',                // View orders
  VALIDATE: 'ORDER:VALIDATE',        // Validate orders against limits
  VIEW_ALL: 'ORDER:VIEW_ALL',        // View all orders
  VIEW_DESK: 'ORDER:VIEW_DESK'       // View orders for a specific desk
};

/**
 * Calculation rule permission constants
 */
export const CALCULATION_RULE_PERMISSIONS = {
  VIEW: 'CALCULATION_RULE:VIEW',         // View calculation rules
  CREATE: 'CALCULATION_RULE:CREATE',     // Create calculation rules
  UPDATE: 'CALCULATION_RULE:UPDATE',     // Update calculation rules
  DELETE: 'CALCULATION_RULE:DELETE',     // Delete calculation rules
  PUBLISH: 'CALCULATION_RULE:PUBLISH'    // Publish calculation rules
};

/**
 * Exception-related permission constants
 */
export const EXCEPTION_PERMISSIONS = {
  VIEW: 'EXCEPTION:VIEW',            // View system exceptions
  RESOLVE: 'EXCEPTION:RESOLVE',      // Resolve exceptions
  ASSIGN: 'EXCEPTION:ASSIGN',        // Assign exceptions to users
  ESCALATE: 'EXCEPTION:ESCALATE'     // Escalate exceptions
};

/**
 * Predefined permission sets for common roles in the system
 */
export const ROLE_TEMPLATES = {
  /**
   * Administrator role with full system access
   */
  ADMIN: [
    SYSTEM_PERMISSIONS.ADMIN,
    SYSTEM_PERMISSIONS.CONFIGURE,
    SYSTEM_PERMISSIONS.MONITOR,
    SYSTEM_PERMISSIONS.AUDIT,
    REFERENCE_DATA_PERMISSIONS.VIEW,
    REFERENCE_DATA_PERMISSIONS.CREATE,
    REFERENCE_DATA_PERMISSIONS.UPDATE,
    REFERENCE_DATA_PERMISSIONS.DELETE,
    REFERENCE_DATA_PERMISSIONS.IMPORT,
    REFERENCE_DATA_PERMISSIONS.EXPORT,
    POSITION_PERMISSIONS.VIEW,
    POSITION_PERMISSIONS.VIEW_ALL,
    POSITION_PERMISSIONS.EXPORT,
    INVENTORY_PERMISSIONS.VIEW,
    INVENTORY_PERMISSIONS.VIEW_ALL,
    INVENTORY_PERMISSIONS.EXPORT,
    LOCATE_PERMISSIONS.VIEW,
    LOCATE_PERMISSIONS.CREATE,
    LOCATE_PERMISSIONS.APPROVE,
    LOCATE_PERMISSIONS.REJECT,
    LOCATE_PERMISSIONS.VIEW_ALL,
    ORDER_PERMISSIONS.VIEW,
    ORDER_PERMISSIONS.VALIDATE,
    ORDER_PERMISSIONS.VIEW_ALL,
    CALCULATION_RULE_PERMISSIONS.VIEW,
    CALCULATION_RULE_PERMISSIONS.CREATE,
    CALCULATION_RULE_PERMISSIONS.UPDATE,
    CALCULATION_RULE_PERMISSIONS.DELETE,
    CALCULATION_RULE_PERMISSIONS.PUBLISH,
    EXCEPTION_PERMISSIONS.VIEW,
    EXCEPTION_PERMISSIONS.RESOLVE,
    EXCEPTION_PERMISSIONS.ASSIGN,
    EXCEPTION_PERMISSIONS.ESCALATE
  ],
  
  /**
   * Trader role with trading-related permissions
   */
  TRADER: [
    SYSTEM_PERMISSIONS.MONITOR,
    REFERENCE_DATA_PERMISSIONS.VIEW,
    REFERENCE_DATA_PERMISSIONS.EXPORT,
    POSITION_PERMISSIONS.VIEW,
    POSITION_PERMISSIONS.VIEW_DESK,
    POSITION_PERMISSIONS.VIEW_CLIENT,
    POSITION_PERMISSIONS.EXPORT,
    INVENTORY_PERMISSIONS.VIEW,
    INVENTORY_PERMISSIONS.VIEW_DESK,
    INVENTORY_PERMISSIONS.EXPORT,
    LOCATE_PERMISSIONS.VIEW,
    LOCATE_PERMISSIONS.CREATE,
    LOCATE_PERMISSIONS.VIEW_DESK,
    ORDER_PERMISSIONS.VIEW,
    ORDER_PERMISSIONS.VALIDATE,
    ORDER_PERMISSIONS.VIEW_DESK,
    CALCULATION_RULE_PERMISSIONS.VIEW,
    EXCEPTION_PERMISSIONS.VIEW
  ],
  
  /**
   * Operations role with operational permissions
   */
  OPERATIONS: [
    SYSTEM_PERMISSIONS.MONITOR,
    REFERENCE_DATA_PERMISSIONS.VIEW,
    REFERENCE_DATA_PERMISSIONS.CREATE,
    REFERENCE_DATA_PERMISSIONS.UPDATE,
    REFERENCE_DATA_PERMISSIONS.IMPORT,
    REFERENCE_DATA_PERMISSIONS.EXPORT,
    POSITION_PERMISSIONS.VIEW,
    POSITION_PERMISSIONS.VIEW_ALL,
    POSITION_PERMISSIONS.EXPORT,
    INVENTORY_PERMISSIONS.VIEW,
    INVENTORY_PERMISSIONS.VIEW_ALL,
    INVENTORY_PERMISSIONS.EXPORT,
    LOCATE_PERMISSIONS.VIEW,
    LOCATE_PERMISSIONS.APPROVE,
    LOCATE_PERMISSIONS.REJECT,
    LOCATE_PERMISSIONS.VIEW_ALL,
    ORDER_PERMISSIONS.VIEW,
    ORDER_PERMISSIONS.VIEW_ALL,
    CALCULATION_RULE_PERMISSIONS.VIEW,
    CALCULATION_RULE_PERMISSIONS.CREATE,
    CALCULATION_RULE_PERMISSIONS.UPDATE,
    EXCEPTION_PERMISSIONS.VIEW,
    EXCEPTION_PERMISSIONS.RESOLVE,
    EXCEPTION_PERMISSIONS.ASSIGN
  ],
  
  /**
   * Compliance role with monitoring and audit permissions
   */
  COMPLIANCE: [
    SYSTEM_PERMISSIONS.MONITOR,
    SYSTEM_PERMISSIONS.AUDIT,
    REFERENCE_DATA_PERMISSIONS.VIEW,
    REFERENCE_DATA_PERMISSIONS.EXPORT,
    POSITION_PERMISSIONS.VIEW,
    POSITION_PERMISSIONS.VIEW_ALL,
    POSITION_PERMISSIONS.EXPORT,
    INVENTORY_PERMISSIONS.VIEW,
    INVENTORY_PERMISSIONS.VIEW_ALL,
    INVENTORY_PERMISSIONS.EXPORT,
    LOCATE_PERMISSIONS.VIEW,
    LOCATE_PERMISSIONS.VIEW_ALL,
    ORDER_PERMISSIONS.VIEW,
    ORDER_PERMISSIONS.VIEW_ALL,
    CALCULATION_RULE_PERMISSIONS.VIEW,
    EXCEPTION_PERMISSIONS.VIEW,
    EXCEPTION_PERMISSIONS.ESCALATE
  ]
};