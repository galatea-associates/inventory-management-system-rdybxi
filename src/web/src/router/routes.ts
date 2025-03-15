import React from 'react';
import { ROUTES, AUTH_ROUTES, ERROR_ROUTES, NESTED_ROUTES } from '../constants/routes';

/**
 * Interface defining the structure of route configuration objects
 */
export interface RouteConfig {
  /** The URL path for the route */
  path: string;
  /** The component to render for this route */
  component: React.ComponentType<any>;
  /** Optional array of permissions required to access this route */
  permissions?: string[];
  /** Whether the path should match exactly or allow nested paths */
  exact?: boolean;
}

// Lazily load components for code splitting
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Positions = React.lazy(() => import('../pages/Positions'));
const Inventory = React.lazy(() => import('../pages/Inventory'));
const Locates = React.lazy(() => import('../pages/Locates'));
const Exceptions = React.lazy(() => import('../pages/Exceptions'));
const Rules = React.lazy(() => import('../pages/Rules'));
const Analytics = React.lazy(() => import('../pages/Analytics'));
const Settings = React.lazy(() => import('../pages/Settings'));

// Auth pages
const Login = React.lazy(() => import('../pages/auth/Login'));
const ForgotPassword = React.lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('../pages/auth/ResetPassword'));

// Error pages
const NotFound = React.lazy(() => import('../pages/errors/NotFound'));
const Unauthorized = React.lazy(() => import('../pages/errors/Unauthorized'));
const ServerError = React.lazy(() => import('../pages/errors/ServerError'));

// Detail pages
const PositionDetail = React.lazy(() => import('../pages/positions/PositionDetail'));
const InventoryDetail = React.lazy(() => import('../pages/inventory/InventoryDetail'));
const LocateDetail = React.lazy(() => import('../pages/locates/LocateDetail'));
const ExceptionDetail = React.lazy(() => import('../pages/exceptions/ExceptionDetail'));
const RuleDetail = React.lazy(() => import('../pages/rules/RuleDetail'));
const RuleEditor = React.lazy(() => import('../pages/rules/RuleEditor'));

/**
 * Routes that require authentication and specific permissions
 */
export const privateRoutes: RouteConfig[] = [
  {
    path: ROUTES.DASHBOARD,
    component: Dashboard,
    permissions: ['view:dashboard'],
    exact: true
  },
  {
    path: ROUTES.POSITIONS,
    component: Positions,
    permissions: ['view:positions'],
    exact: true
  },
  {
    path: NESTED_ROUTES.POSITION_DETAIL,
    component: PositionDetail,
    permissions: ['view:positions'],
    exact: true
  },
  {
    path: ROUTES.INVENTORY,
    component: Inventory,
    permissions: ['view:inventory'],
    exact: true
  },
  {
    path: NESTED_ROUTES.INVENTORY_DETAIL,
    component: InventoryDetail,
    permissions: ['view:inventory'],
    exact: true
  },
  {
    path: ROUTES.LOCATES,
    component: Locates,
    permissions: ['view:locates'],
    exact: true
  },
  {
    path: NESTED_ROUTES.LOCATE_DETAIL,
    component: LocateDetail,
    permissions: ['view:locates', 'manage:locates'],
    exact: true
  },
  {
    path: ROUTES.EXCEPTIONS,
    component: Exceptions,
    permissions: ['view:exceptions'],
    exact: true
  },
  {
    path: NESTED_ROUTES.EXCEPTION_DETAIL,
    component: ExceptionDetail,
    permissions: ['view:exceptions', 'manage:exceptions'],
    exact: true
  },
  {
    path: ROUTES.RULES,
    component: Rules,
    permissions: ['view:rules'],
    exact: true
  },
  {
    path: NESTED_ROUTES.RULE_DETAIL,
    component: RuleDetail,
    permissions: ['view:rules'],
    exact: true
  },
  {
    path: NESTED_ROUTES.RULE_EDITOR,
    component: RuleEditor,
    permissions: ['edit:rules'],
    exact: true
  },
  {
    path: ROUTES.ANALYTICS,
    component: Analytics,
    permissions: ['view:analytics'],
    exact: true
  },
  {
    path: ROUTES.SETTINGS,
    component: Settings,
    permissions: ['view:settings'],
    exact: true
  }
];

/**
 * Routes that are publicly accessible without authentication
 */
export const publicRoutes: RouteConfig[] = [
  {
    path: ROUTES.ROOT,
    component: Login,
    exact: true
  },
  {
    path: AUTH_ROUTES.LOGIN,
    component: Login,
    exact: true
  },
  {
    path: AUTH_ROUTES.FORGOT_PASSWORD,
    component: ForgotPassword,
    exact: true
  },
  {
    path: AUTH_ROUTES.RESET_PASSWORD,
    component: ResetPassword,
    exact: true
  }
];

/**
 * Routes for error pages
 */
export const errorRoutes: RouteConfig[] = [
  {
    path: ERROR_ROUTES.NOT_FOUND,
    component: NotFound,
    exact: true
  },
  {
    path: ERROR_ROUTES.UNAUTHORIZED,
    component: Unauthorized,
    exact: true
  },
  {
    path: ERROR_ROUTES.SERVER_ERROR,
    component: ServerError,
    exact: true
  }
];