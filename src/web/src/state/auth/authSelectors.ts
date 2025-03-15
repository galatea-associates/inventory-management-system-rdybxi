import { createSelector } from '@reduxjs/toolkit'; // ^1.9.3
import { RootState, AuthState } from '../../types/state';

/**
 * Base selector that returns the entire auth state slice
 */
export const selectAuthState = (state: RootState): AuthState => state.auth;

/**
 * Selector for the current authenticated user
 */
export const selectUser = createSelector(
  selectAuthState,
  (authState) => authState.user
);

/**
 * Selector for the current authentication token
 */
export const selectToken = createSelector(
  selectAuthState,
  (authState) => authState.token
);

/**
 * Selector for the current refresh token
 */
export const selectRefreshToken = createSelector(
  selectAuthState,
  (authState) => authState.refreshToken
);

/**
 * Selector for the authentication status
 */
export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (authState) => authState.isAuthenticated
);

/**
 * Selector for the authentication loading state
 */
export const selectAuthLoading = createSelector(
  selectAuthState,
  (authState) => authState.isLoading
);

/**
 * Selector for the authentication error message
 */
export const selectAuthError = createSelector(
  selectAuthState,
  (authState) => authState.error
);

/**
 * Selector for the MFA requirement status
 */
export const selectMfaRequired = createSelector(
  selectAuthState,
  (authState) => authState.mfaRequired
);

/**
 * Selector for the MFA session identifier
 */
export const selectMfaSessionId = createSelector(
  selectAuthState,
  (authState) => authState.mfaSessionId
);

/**
 * Selector for the token expiration timestamp
 */
export const selectTokenExpiration = createSelector(
  selectAuthState,
  (authState) => authState.tokenExpiration
);

/**
 * Selector that determines if the current token is expired
 */
export const selectIsTokenExpired = createSelector(
  selectTokenExpiration,
  (tokenExpiration) => {
    if (!tokenExpiration) return true;
    return Date.now() > tokenExpiration;
  }
);

/**
 * Selector for the current user's permissions
 */
export const selectUserPermissions = createSelector(
  selectUser,
  (user) => user?.permissions || []
);

/**
 * Selector for the current user's roles
 */
export const selectUserRoles = createSelector(
  selectUser,
  (user) => user?.roles || []
);

/**
 * Factory selector that creates a selector to check for a specific permission
 */
export const selectHasPermission = (permission: string) =>
  createSelector(
    selectUserPermissions,
    (permissions) => permissions.includes(permission)
  );

/**
 * Factory selector that creates a selector to check for a specific role
 */
export const selectHasRole = (role: string) =>
  createSelector(
    selectUserRoles,
    (roles) => roles.includes(role)
  );

/**
 * Selector that combines first and last name into a full name
 */
export const selectUserFullName = createSelector(
  selectUser,
  (user) => user ? `${user.firstName} ${user.lastName}` : ''
);

/**
 * Selector that derives the user's initials from their name
 */
export const selectUserInitials = createSelector(
  selectUser,
  (user) => {
    if (!user) return '';
    const firstInitial = user.firstName ? user.firstName.charAt(0) : '';
    const lastInitial = user.lastName ? user.lastName.charAt(0) : '';
    return (firstInitial + lastInitial).toUpperCase();
  }
);