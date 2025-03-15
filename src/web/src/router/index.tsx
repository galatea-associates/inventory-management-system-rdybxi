import React from 'react'; // react ^18.2.0
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // ^6.10.0
import { Provider } from 'react-redux'; // react-redux ^8.0.5
import { ThemeProvider, CssBaseline } from '@mui/material'; // @mui/material 5.13

import PublicRoute from './PublicRoute';
import AuthenticatedRoutes from './AuthenticatedRoutes';
import { publicRoutes, errorRoutes } from './routes';
import Login from '../pages/auth/Login';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import NotFound from '../pages/error/NotFound';
import Unauthorized from '../pages/error/Unauthorized';
import ServerError from '../pages/error/ServerError';
import { AuthProvider } from '../contexts/AuthContext';
import { ROUTES, AUTH_ROUTES } from '../constants/routes';
import { store } from '../state/store';
import { theme } from '../styles/theme';

/**
 * Main router component that configures all application routes
 */
const AppRouter: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* LD1: Map through publicRoutes to create public routes using PublicRoute component */}
              {publicRoutes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={<PublicRoute component={route.component} />}
                />
              ))}

              {/* LD1: Include AuthenticatedRoutes component for all protected routes */}
              <Route
                path="/*"
                element={<AuthenticatedRoutes />}
              />

              {/* LD1: Add default route that redirects to login page */}
              <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
};

export default AppRouter;