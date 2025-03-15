/**
 * Custom React hook that provides permission checking functionality for the Inventory Management System frontend.
 * This hook centralizes access to permission-related utilities and provides a consistent interface
 * for components to verify user permissions throughout the application.
 */
import { useState, useCallback, useEffect } from 'react'; // react 18.2.0
import { useAuth } from './useAuth';
import { PermissionType, SYSTEM_PERMISSIONS } from '../constants/permissions';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasSystemPermission,
  isAdmin,
  getPermissionsByType,
  getResourcePermissions,
  canViewResource,
  canEditResource
} from '../utils/permissions';
import { User } from '../types/models';

/**
 * Interface defining the shape of the permissions state and functions
 */
interface PermissionsState {
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

/**
 * Custom hook that provides permission checking functionality for the application
 * @returns Permissions state and functions
 */
export const usePermissions = (): PermissionsState => {
  // Get user and authentication state from useAuth hook
  const { user } = useAuth();
  
  // Initialize permissions state from user.permissions or empty array
  const [permissions, setPermissions] = useState<string[]>(
    user?.permissions || []
  );
  
  // Update permissions when user changes
  useEffect(() => {
    setPermissions(user?.permissions || []);
  }, [user]);
  
  // Create memoized permission checking functions
  
  const checkHasPermission = useCallback(
    (permission: string): boolean => {
      return hasPermission(permissions, permission);
    },
    [permissions]
  );
  
  const checkHasAnyPermission = useCallback(
    (permissionsToCheck: string[]): boolean => {
      return hasAnyPermission(permissions, permissionsToCheck);
    },
    [permissions]
  );
  
  const checkHasAllPermissions = useCallback(
    (permissionsToCheck: string[]): boolean => {
      return hasAllPermissions(permissions, permissionsToCheck);
    },
    [permissions]
  );
  
  const checkHasSystemPermission = useCallback(
    (permission: string): boolean => {
      return hasSystemPermission(permissions, permission);
    },
    [permissions]
  );
  
  const checkIsAdmin = useCallback(
    (): boolean => {
      return isAdmin(permissions);
    },
    [permissions]
  );
  
  const checkGetPermissionsByType = useCallback(
    (type: PermissionType): string[] => {
      return getPermissionsByType(permissions, type);
    },
    [permissions]
  );
  
  const checkGetResourcePermissions = useCallback(
    (resourceType: string): string[] => {
      return getResourcePermissions(permissions, resourceType);
    },
    [permissions]
  );
  
  const checkCanViewResource = useCallback(
    (resourceType: string): boolean => {
      return canViewResource(permissions, resourceType);
    },
    [permissions]
  );
  
  const checkCanEditResource = useCallback(
    (resourceType: string): boolean => {
      return canEditResource(permissions, resourceType);
    },
    [permissions]
  );
  
  // Return permissions state and functions
  return {
    permissions,
    hasPermission: checkHasPermission,
    hasAnyPermission: checkHasAnyPermission,
    hasAllPermissions: checkHasAllPermissions,
    hasSystemPermission: checkHasSystemPermission,
    isAdmin: checkIsAdmin,
    getPermissionsByType: checkGetPermissionsByType,
    getResourcePermissions: checkGetResourcePermissions,
    canViewResource: checkCanViewResource,
    canEditResource: checkCanEditResource
  };
};