/**
 * permissions.ts
 * 
 * This file provides utility functions for permission checking in the Inventory
 * Management System frontend. It implements role-based access control (RBAC) and
 * provides helpers to verify user permissions throughout the application.
 */

import { PermissionType, SYSTEM_PERMISSIONS } from '../constants/permissions';

/**
 * Checks if a user has a specific permission
 * 
 * @param userPermissions - Array of permission strings assigned to the user
 * @param permission - The specific permission to check for
 * @returns True if the user has the permission, false otherwise
 */
export const hasPermission = (
  userPermissions: string[],
  permission: string
): boolean => {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  
  return userPermissions.includes(permission);
};

/**
 * Checks if a user has any of the specified permissions
 * 
 * @param userPermissions - Array of permission strings assigned to the user
 * @param permissions - Array of permissions to check for
 * @returns True if the user has any of the permissions, false otherwise
 */
export const hasAnyPermission = (
  userPermissions: string[],
  permissions: string[]
): boolean => {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  
  if (!permissions || permissions.length === 0) {
    return false;
  }
  
  return permissions.some(permission => userPermissions.includes(permission));
};

/**
 * Checks if a user has all of the specified permissions
 * 
 * @param userPermissions - Array of permission strings assigned to the user
 * @param permissions - Array of permissions to check for
 * @returns True if the user has all of the permissions, false otherwise
 */
export const hasAllPermissions = (
  userPermissions: string[],
  permissions: string[]
): boolean => {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  
  if (!permissions || permissions.length === 0) {
    return true; // If no permissions are required, return true
  }
  
  return permissions.every(permission => userPermissions.includes(permission));
};

/**
 * Checks if a user has a specific system-level permission
 * System admin users automatically have all system permissions
 * 
 * @param userPermissions - Array of permission strings assigned to the user
 * @param permission - The system permission to check for
 * @returns True if the user has the system permission, false otherwise
 */
export const hasSystemPermission = (
  userPermissions: string[],
  permission: string
): boolean => {
  // If user is admin, they have all system permissions
  if (hasPermission(userPermissions, SYSTEM_PERMISSIONS.ADMIN)) {
    return true;
  }
  
  // Otherwise, check for the specific system permission
  return hasPermission(userPermissions, permission);
};

/**
 * Checks if a user has administrator privileges
 * 
 * @param userPermissions - Array of permission strings assigned to the user
 * @returns True if the user is an admin, false otherwise
 */
export const isAdmin = (userPermissions: string[]): boolean => {
  return hasPermission(userPermissions, SYSTEM_PERMISSIONS.ADMIN);
};

/**
 * Filters user permissions by a specific permission type
 * 
 * @param userPermissions - Array of permission strings assigned to the user
 * @param type - The permission type to filter by
 * @returns Array of permissions of the specified type
 */
export const getPermissionsByType = (
  userPermissions: string[],
  type: PermissionType
): string[] => {
  if (!userPermissions || userPermissions.length === 0) {
    return [];
  }
  
  const typePrefix = `${type}:`;
  return userPermissions.filter(permission => permission.startsWith(typePrefix));
};

/**
 * Gets all permissions related to a specific resource
 * 
 * @param userPermissions - Array of permission strings assigned to the user
 * @param resourceType - The resource type (e.g., 'POSITION', 'INVENTORY')
 * @returns Array of permissions for the specified resource
 */
export const getResourcePermissions = (
  userPermissions: string[],
  resourceType: string
): string[] => {
  if (!userPermissions || userPermissions.length === 0) {
    return [];
  }
  
  const resourcePrefix = `${resourceType}:`;
  return userPermissions.filter(permission => permission.startsWith(resourcePrefix));
};

/**
 * Checks if a user can view a specific resource
 * Admins can view all resources
 * 
 * @param userPermissions - Array of permission strings assigned to the user
 * @param resourceType - The resource type to check view permission for
 * @returns True if the user can view the resource, false otherwise
 */
export const canViewResource = (
  userPermissions: string[],
  resourceType: string
): boolean => {
  // Admins can view everything
  if (isAdmin(userPermissions)) {
    return true;
  }
  
  // Check if user has any VIEW permission for this resource
  const resourcePerms = getResourcePermissions(userPermissions, resourceType);
  return resourcePerms.some(perm => perm.includes(':VIEW'));
};

/**
 * Checks if a user can edit a specific resource
 * Editing includes creating, updating, or deleting
 * Admins can edit all resources
 * 
 * @param userPermissions - Array of permission strings assigned to the user
 * @param resourceType - The resource type to check edit permission for
 * @returns True if the user can edit the resource, false otherwise
 */
export const canEditResource = (
  userPermissions: string[],
  resourceType: string
): boolean => {
  // Admins can edit everything
  if (isAdmin(userPermissions)) {
    return true;
  }
  
  // Check if user has any CREATE, UPDATE, or DELETE permission for this resource
  const resourcePerms = getResourcePermissions(userPermissions, resourceType);
  return resourcePerms.some(perm => 
    perm.includes(':CREATE') || 
    perm.includes(':UPDATE') || 
    perm.includes(':DELETE')
  );
};