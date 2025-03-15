/**
 * React context provider for permission management in the Inventory Management System.
 * This context centralizes permission checking functionality, providing a consistent
 * interface for components to verify user permissions throughout the application
 * without directly accessing the authentication context.
 */

import { createContext, useContext, ReactNode, FC } from 'react'; // react ^18.2.0
import { usePermissions } from '../hooks/usePermissions';
import { PermissionType } from '../constants/permissions';

/**
 * Interface defining the shape of the permission context value
 */
interface PermissionContextType {
  /**
   * Array of permission strings for the current user
   */
  permissions: string[];
  
  /**
   * Checks if the current user has a specific permission
   * @param permission - The permission to check
   * @returns True if the user has the permission
   */
  hasPermission: (permission: string) => boolean;
  
  /**
   * Checks if the current user has any of the specified permissions
   * @param permissions - Array of permissions to check
   * @returns True if the user has any of the permissions
   */
  hasAnyPermission: (permissions: string[]) => boolean;
  
  /**
   * Checks if the current user has all of the specified permissions
   * @param permissions - Array of permissions to check
   * @returns True if the user has all of the permissions
   */
  hasAllPermissions: (permissions: string[]) => boolean;
  
  /**
   * Checks if the current user has a specific system-level permission
   * System admins automatically have all system permissions
   * @param permission - The system permission to check
   * @returns True if the user has the system permission
   */
  hasSystemPermission: (permission: string) => boolean;
  
  /**
   * Checks if the current user has administrator privileges
   * @returns True if the user is an admin
   */
  isAdmin: () => boolean;
  
  /**
   * Filters user permissions by a specific permission type
   * @param type - The permission type to filter by
   * @returns Array of permissions of the specified type
   */
  getPermissionsByType: (type: PermissionType) => string[];
  
  /**
   * Gets all permissions related to a specific resource
   * @param resourceType - The resource type (e.g., 'POSITION', 'INVENTORY')
   * @returns Array of permissions for the specified resource
   */
  getResourcePermissions: (resourceType: string) => string[];
  
  /**
   * Checks if the current user can view a specific resource
   * Admins can view all resources
   * @param resourceType - The resource type to check view permission for
   * @returns True if the user can view the resource
   */
  canViewResource: (resourceType: string) => boolean;
  
  /**
   * Checks if the current user can edit a specific resource
   * Editing includes creating, updating, or deleting
   * Admins can edit all resources
   * @param resourceType - The resource type to check edit permission for
   * @returns True if the user can edit the resource
   */
  canEditResource: (resourceType: string) => boolean;
}

// Create the context with a default value of null
const PermissionContext = createContext<PermissionContextType | null>(null);

/**
 * Provider component for the permission context
 * Wraps children with the PermissionContext.Provider and provides permission checking functionality
 * 
 * @param children - React child components that will have access to the permission context
 */
export const PermissionProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Use the usePermissions hook to get all permission-related functions and state
  const permissionState = usePermissions();
  
  // Provide all permission functions and state through the context
  return (
    <PermissionContext.Provider value={permissionState}>
      {children}
    </PermissionContext.Provider>
  );
};

/**
 * Custom hook that provides access to the PermissionContext
 * @returns The permission context value with all permission checking functions
 * @throws Error if used outside of a PermissionProvider
 */
export const usePermissionContext = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  
  if (!context) {
    throw new Error('usePermissionContext must be used within a PermissionProvider');
  }
  
  return context;
};

// Export the context for advanced use cases
export { PermissionContext };