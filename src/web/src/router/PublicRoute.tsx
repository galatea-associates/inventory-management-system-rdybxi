import React from 'react'; // react ^18.2.0
import { Navigate, useLocation, RouteProps } from 'react-router-dom'; // ^6.10.0
import { useAuthContext } from '../contexts/AuthContext';
import Loader from '../components/common/Loader';
import { ROUTES } from '../constants/routes';

/**
 * Props for the PublicRoute component
 */
interface PublicRouteProps extends Omit<RouteProps, 'component'> {
  component: React.ComponentType<any>;
}

/**
 * A component that handles public routes and redirects authenticated users
 * to the dashboard. Used for routes like login, forgot password, etc.
 * 
 * @param props - Component props
 * @returns React element for the route
 */
const PublicRoute = ({ component: Component, ...rest }: PublicRouteProps): React.ReactElement => {
  // Get authentication state from context
  const { isAuthenticated, isLoading } = useAuthContext();
  
  // Get current location
  const location = useLocation();

  // Show loader while authentication state is loading
  if (isLoading) {
    return <Loader fullScreen />;
  }

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} state={{ from: location }} replace />;
  }

  // Otherwise render the component with any additional props
  return <Component {...rest} />;
};

export default PublicRoute;
export type { PublicRouteProps };