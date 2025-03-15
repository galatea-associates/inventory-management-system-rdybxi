import React from 'react'; // react ^18.2.0
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'; // react-router-dom ^6.10.0
import Layout from '../components/layout/Layout';
import PrivateRoute from './PrivateRoute';
import { privateRoutes, errorRoutes } from './routes';
import { ROUTES, NESTED_ROUTES } from '../constants/routes';
import Dashboard from '../pages/dashboard/Dashboard';

/**
 * Component that renders all authenticated routes for the application
 */
const AuthenticatedRoutes: React.FC = React.memo(() => {
  // LD1: Render Routes component to contain all authenticated route definitions
  return (
    <Routes>
      {/* LD1: Add default route that redirects to Dashboard */}
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

      {/* LD1: Map through privateRoutes array to create PrivateRoute components for each authenticated route */}
      {privateRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <PrivateRoute
              component={route.component}
              permissions={route.permissions}
              requireAllPermissions={route.exact}
            />
          }
        />
      ))}

      {/* LD1: Add nested routes for detail views using Outlet component */}
      <Route path={ROUTES.POSITIONS} element={<Outlet />} >
        <Route path={NESTED_ROUTES.POSITION_DETAIL} element={<PrivateRoute component={privateRoutes.find(route => route.path === NESTED_ROUTES.POSITION_DETAIL)?.component || (() => <div>Position Detail</div>)} permissions={privateRoutes.find(route => route.path === NESTED_ROUTES.POSITION_DETAIL)?.permissions} />} />
      </Route>

      <Route path={ROUTES.INVENTORY} element={<Outlet />} >
        <Route path={NESTED_ROUTES.INVENTORY_DETAIL} element={<PrivateRoute component={privateRoutes.find(route => route.path === NESTED_ROUTES.INVENTORY_DETAIL)?.component || (() => <div>Inventory Detail</div>)} permissions={privateRoutes.find(route => route.path === NESTED_ROUTES.INVENTORY_DETAIL)?.permissions} />} />
      </Route>

      <Route path={ROUTES.LOCATES} element={<Outlet />} >
        <Route path={NESTED_ROUTES.LOCATE_DETAIL} element={<PrivateRoute component={privateRoutes.find(route => route.path === NESTED_ROUTES.LOCATE_DETAIL)?.component || (() => <div>Locate Detail</div>)} permissions={privateRoutes.find(route => route.path === NESTED_ROUTES.LOCATE_DETAIL)?.permissions} />} />
      </Route>

      <Route path={ROUTES.EXCEPTIONS} element={<Outlet />} >
        <Route path={NESTED_ROUTES.EXCEPTION_DETAIL} element={<PrivateRoute component={privateRoutes.find(route => route.path === NESTED_ROUTES.EXCEPTION_DETAIL)?.component || (() => <div>Exception Detail</div>)} permissions={privateRoutes.find(route => route.path === NESTED_ROUTES.EXCEPTION_DETAIL)?.permissions} />} />
      </Route>

      <Route path={ROUTES.RULES} element={<Outlet />} >
        <Route path={NESTED_ROUTES.RULE_DETAIL} element={<PrivateRoute component={privateRoutes.find(route => route.path === NESTED_ROUTES.RULE_DETAIL)?.component || (() => <div>Rule Detail</div>)} permissions={privateRoutes.find(route => route.path === NESTED_ROUTES.RULE_DETAIL)?.permissions} />} />
        <Route path={NESTED_ROUTES.RULE_EDITOR} element={<PrivateRoute component={privateRoutes.find(route => route.path === NESTED_ROUTES.RULE_EDITOR)?.component || (() => <div>Rule Editor</div>)} permissions={privateRoutes.find(route => route.path === NESTED_ROUTES.RULE_EDITOR)?.permissions} />} />
      </Route>

      {/* LD1: Map through errorRoutes array to create Route components for error pages */}
      {errorRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<route.component />}
        />
      ))}

      {/* LD1: Wrap all routes with the Layout component to provide consistent structure */}
    </Routes>
  );
});

AuthenticatedRoutes.displayName = 'AuthenticatedRoutes';

// IE3: Export the AuthenticatedRoutes component for use in the main router
export default AuthenticatedRoutes;