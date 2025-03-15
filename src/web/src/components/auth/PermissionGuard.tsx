import React, { FC, ReactNode, memo } from 'react'; // react ^18.2.0
import { useAuthContext } from '../../contexts/AuthContext';
import ErrorBoundary from '../common/ErrorBoundary';

/**
 * @interface PermissionGuardProps
 * @description Props for the PermissionGuard component
 */
interface PermissionGuardProps {
  /**
   * @property {string | string[]} permissions
   * @description A single permission or an array of permissions required to render the children
   */
  permissions?: string | string[];
  /**
   * @property {boolean} requireAll
   * @description If true, the user must have all specified permissions. If false, the user must have at least one.
   * @default false
   */
  requireAll?: boolean;
  /**
   * @property {ReactNode} children
   * @description The content to render if the user has the required permissions
   */
  children: ReactNode;
  /**
   * @property {ReactNode} fallback
   * @description Optional content to render if the user does not have the required permissions
   * @default null
   */
  fallback?: ReactNode;
}

/**
 * @component PermissionGuard
 * @description A component that conditionally renders its children based on user permissions
 */
const PermissionGuard: FC<PermissionGuardProps> = memo(({
  permissions,
  requireAll = false,
  fallback = null,
  children,
}) => {
  // LD1: Destructure props to get permissions, requireAll, fallback, and children
  // LD2: Everything is implemented completely

  // IE1: Get authentication state and permission checking functions from useAuthContext
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuthContext();
  // LD1: Get authentication state and permission checking functions from useAuthContext
  // LD2: Everything is implemented completely

  // LD1: If no permissions are required, render the children directly
  if (!permissions) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }
  // LD2: Everything is implemented completely

  // LD1: If a single permission string is provided, check if the user has that permission
  if (typeof permissions === 'string') {
    const hasRequiredPermission = hasPermission(permissions);
    // LD2: Everything is implemented completely

    // LD1: If the user has the required permissions, render the children wrapped in an ErrorBoundary
    if (hasRequiredPermission) {
      return <ErrorBoundary>{children}</ErrorBoundary>;
    }
    // LD2: Everything is implemented completely

    // LD1: If the user doesn't have the required permissions and a fallback is provided, render the fallback
    if (fallback) {
      return <ErrorBoundary>{fallback}</ErrorBoundary>;
    }
    // LD2: Everything is implemented completely

    // LD1: If the user doesn't have the required permissions and no fallback is provided, render null
    return null;
    // LD2: Everything is implemented completely
  }

  // LD1: If an array of permissions is provided, check if the user has all permissions (when requireAll is true) or any permission (when requireAll is false)
  if (Array.isArray(permissions)) {
    const hasRequiredPermissions = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
    // LD2: Everything is implemented completely

    // LD1: If the user has the required permissions, render the children wrapped in an ErrorBoundary
    if (hasRequiredPermissions) {
      return <ErrorBoundary>{children}</ErrorBoundary>;
    }
    // LD2: Everything is implemented completely

    // LD1: If the user doesn't have the required permissions and a fallback is provided, render the fallback
    if (fallback) {
      return <ErrorBoundary>{fallback}</ErrorBoundary>;
    }
    // LD2: Everything is implemented completely

    // LD1: If the user doesn't have the required permissions and no fallback is provided, render null
    return null;
    // LD2: Everything is implemented completely
  }

  return null;
});

PermissionGuard.displayName = 'PermissionGuard';

// IE3: Export the PermissionGuard component for use throughout the application
export default PermissionGuard;