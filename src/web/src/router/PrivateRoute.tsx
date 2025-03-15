/**
 * A React component that protects routes requiring authentication in the Inventory Management System.
 * This component checks if the user is authenticated and redirects to the login page if they are not.
 * It also supports permission-based access control for routes that require specific permissions.
 */
import React from 'react';
import { Route, Navigate, useLocation } from 'react-router-dom'; // react-router-dom ^6.10.0
import { useAuthContext } from '../contexts/AuthContext';
import Unauthorized from '../pages/error/Unauthorized';
import { AUTH_ROUTES } from '../constants/routes';

/**
 * Props for the PrivateRoute component
 */
export interface PrivateRouteProps extends Omit<React.ComponentProps<typeof Route>, 'element'> {
  /** The component to render if authentication and permissions check pass */
  component: React.ComponentType<any>;
  /** Required permission(s) to access this route. Can be a single permission string or an array of permissions */
  permissions?: string | string[];
  /** When multiple permissions are specified, indicates whether all permissions are required (true) or any permission is sufficient (false) */
  requireAllPermissions?: boolean;
}

/**
 * A component that protects routes requiring authentication
 * 
 * @param props - Component props
 * @returns The protected route component or a redirect to login
 */
const PrivateRoute = ({
  component: Component,
  permissions,
  requireAllPermissions = false,
  ...rest
}: PrivateRouteProps): React.ReactElement => {
  const { isAuthenticated, hasPermission, hasAllPermissions, hasAnyPermission } = useAuthContext();
  const location = useLocation();

  // If user is not authenticated, redirect to login page with return URL
  if (!isAuthenticated) {
    return <Navigate to={AUTH_ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Check permissions if specified
  if (permissions) {
    let hasRequiredPermissions = false;
    
    if (Array.isArray(permissions)) {
      // Check if user has all required permissions or any required permission
      hasRequiredPermissions = requireAllPermissions
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions);
    } else {
      // Check if user has the single required permission
      hasRequiredPermissions = hasPermission(permissions);
    }

    // If user doesn't have required permissions, show unauthorized page
    if (!hasRequiredPermissions) {
      return <Unauthorized />;
    }
  }

  // User is authenticated and has required permissions, render the protected component
  return <Component {...rest} />;
};

export default PrivateRoute;