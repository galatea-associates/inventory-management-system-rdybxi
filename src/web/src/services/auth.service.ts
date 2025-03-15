/**
 * Authentication Service
 * 
 * This service provides a centralized implementation of authentication-related functionality
 * for the Inventory Management System frontend, including user login/logout, token management,
 * session handling, and security operations. It serves as a bridge between the UI components
 * and the authentication API, abstracting the underlying implementation details.
 */

import { 
  login as loginApi, 
  logout as logoutApi, 
  refreshToken as refreshTokenApi, 
  verifyMfa as verifyMfaApi, 
  setupMfa as setupMfaApi, 
  confirmMfaSetup as confirmMfaSetupApi, 
  disableMfa as disableMfaApi, 
  changePassword as changePasswordApi, 
  resetPassword as resetPasswordApi, 
  forgotPassword as forgotPasswordApi, 
  validateResetToken as validateResetTokenApi, 
  getCurrentUser as getCurrentUserApi,
  MfaSetupResponse,
  MfaConfirmResponse
} from '../api/auth';

import { 
  AuthRequest, 
  AuthResponse, 
  RefreshTokenRequest,
  UserInfo
} from '../types/api';

import { User } from '../types/models';

import { 
  setToken, 
  removeToken, 
  setRefreshToken, 
  removeRefreshToken, 
  setUser, 
  removeUser, 
  clearAuthData, 
  isTokenExpired, 
  parseJwt, 
  getTokenExpirationTime, 
  getRemainingTokenTime, 
  hasPermission as securityHasPermission, 
  hasRole as securityHasRole 
} from '../utils/security';

import { 
  setItem, 
  getItem, 
  removeItem 
} from '../utils/sessionStorage';

// Key for storing MFA session ID in sessionStorage
const MFA_SESSION_KEY = 'mfa_session_id';

// Threshold for token refresh (5 minutes in milliseconds)
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

/**
 * Authenticates a user with username and password
 * 
 * @param credentials - Authentication credentials
 * @returns Promise resolving to authentication response with tokens and user info
 */
export async function login(credentials: AuthRequest): Promise<AuthResponse> {
  try {
    const response = await loginApi(credentials);
    
    // If MFA is required, store the MFA session ID and return the response
    if (response.mfaRequired) {
      storeMfaSession(response.sessionId);
      return response;
    }
    
    // If login is successful without MFA, store the auth data
    setToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setUser(response.user as unknown as User);
    
    return response;
  } catch (error) {
    // Let the caller handle errors
    throw error;
  }
}

/**
 * Logs out the current user and invalidates their session
 * 
 * @returns Promise resolving when logout is complete
 */
export async function logout(): Promise<void> {
  try {
    // Call API to invalidate the session on the server
    await logoutApi();
  } catch (error) {
    // Log error but continue with local cleanup
    console.error('Logout API call failed:', error);
  } finally {
    // Always clear auth data regardless of API success
    clearAuthData();
    clearMfaSession();
  }
}

/**
 * Refreshes the authentication token using a refresh token
 * 
 * @returns Promise resolving to new authentication tokens
 */
export async function refreshToken(): Promise<AuthResponse> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const refreshTokenRequest: RefreshTokenRequest = {
    refreshToken
  };
  
  try {
    const response = await refreshTokenApi(refreshTokenRequest);
    
    // Update stored tokens
    setToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    
    return response;
  } catch (error) {
    // Clear auth data if refresh fails
    clearAuthData();
    throw error;
  }
}

/**
 * Verifies a multi-factor authentication code
 * 
 * @param code - The MFA verification code
 * @returns Promise resolving to authentication response after MFA verification
 */
export async function verifyMfa(code: string): Promise<AuthResponse> {
  const sessionId = getMfaSession();
  
  if (!sessionId) {
    throw new Error('No MFA session found');
  }
  
  try {
    const response = await verifyMfaApi({ code, sessionId });
    
    // Store auth data after successful MFA verification
    setToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setUser(response.user as unknown as User);
    
    // Clear the MFA session as it's no longer needed
    clearMfaSession();
    
    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Initiates the setup process for multi-factor authentication
 * 
 * @returns Promise resolving to MFA setup data including QR code
 */
export async function setupMfa(): Promise<MfaSetupResponse> {
  try {
    return await setupMfaApi();
  } catch (error) {
    throw error;
  }
}

/**
 * Confirms the setup of multi-factor authentication with a verification code
 * 
 * @param params - Object containing verification code and secret key
 * @returns Promise resolving to MFA confirmation response
 */
export async function confirmMfaSetup(params: { code: string; secretKey: string }): Promise<MfaConfirmResponse> {
  try {
    return await confirmMfaSetupApi(params);
  } catch (error) {
    throw error;
  }
}

/**
 * Disables multi-factor authentication for the current user
 * 
 * @param params - Object containing user password for verification
 * @returns Promise resolving when MFA is disabled
 */
export async function disableMfa(params: { password: string }): Promise<void> {
  try {
    return await disableMfaApi(params);
  } catch (error) {
    throw error;
  }
}

/**
 * Changes the password for the current user
 * 
 * @param params - Object containing current and new passwords
 * @returns Promise resolving when password is changed
 */
export async function changePassword(params: { currentPassword: string; newPassword: string }): Promise<void> {
  try {
    return await changePasswordApi(params);
  } catch (error) {
    throw error;
  }
}

/**
 * Initiates the password reset process for a user
 * 
 * @param params - Object containing user email
 * @returns Promise resolving when reset email is sent
 */
export async function forgotPassword(params: { email: string }): Promise<void> {
  try {
    return await forgotPasswordApi(params);
  } catch (error) {
    throw error;
  }
}

/**
 * Resets a user's password using a reset token
 * 
 * @param params - Object containing reset token and new password
 * @returns Promise resolving when password is reset
 */
export async function resetPassword(params: { token: string; newPassword: string }): Promise<void> {
  try {
    return await resetPasswordApi(params);
  } catch (error) {
    throw error;
  }
}

/**
 * Validates a password reset token
 * 
 * @param token - The password reset token to validate
 * @returns Promise resolving to true if token is valid
 */
export async function validateResetToken(token: string): Promise<boolean> {
  try {
    await validateResetTokenApi(token);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Retrieves the current authenticated user's information
 * 
 * @returns Promise resolving to the current user data
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const userInfo = await getCurrentUserApi();
    // Update stored user data
    setUser(userInfo as unknown as User);
    return userInfo as unknown as User;
  } catch (error) {
    throw error;
  }
}

/**
 * Checks if the current token is about to expire and refreshes it if needed
 * 
 * @returns Promise resolving to true if token was refreshed
 */
export async function checkTokenExpiration(): Promise<boolean> {
  if (isTokenExpired()) {
    return false; // Token is already expired, no refresh attempted
  }
  
  const remainingTime = getRemainingTokenTime();
  
  if (remainingTime !== null && remainingTime * 1000 < TOKEN_REFRESH_THRESHOLD) {
    try {
      await refreshToken();
      return true; // Token was refreshed
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  }
  
  return false; // No refresh needed
}

/**
 * Checks if the user is currently authenticated with a valid token
 * 
 * @returns True if the user is authenticated with a valid token
 */
export function isAuthenticated(): boolean {
  return !isTokenExpired();
}

/**
 * Checks if the current user has a specific permission
 * 
 * @param permission - The permission to check
 * @returns True if the user has the permission, false otherwise
 */
export function hasPermission(permission: string): boolean {
  return securityHasPermission(permission);
}

/**
 * Checks if the current user has a specific role
 * 
 * @param role - The role to check
 * @returns True if the user has the role, false otherwise
 */
export function hasRole(role: string): boolean {
  return securityHasRole(role);
}

/**
 * Checks if the current user has any of the specified permissions
 * 
 * @param permissions - Array of permissions to check
 * @returns True if the user has any of the permissions, false otherwise
 */
export function hasAnyPermission(permissions: string[]): boolean {
  for (const permission of permissions) {
    if (hasPermission(permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if the current user has all of the specified permissions
 * 
 * @param permissions - Array of permissions to check
 * @returns True if the user has all of the permissions, false otherwise
 */
export function hasAllPermissions(permissions: string[]): boolean {
  for (const permission of permissions) {
    if (!hasPermission(permission)) {
      return false;
    }
  }
  return true;
}

/**
 * Stores the MFA session ID in sessionStorage
 * 
 * @param sessionId - The MFA session ID to store
 */
function storeMfaSession(sessionId: string): void {
  setItem(MFA_SESSION_KEY, sessionId);
}

/**
 * Retrieves the MFA session ID from sessionStorage
 * 
 * @returns The stored MFA session ID or null if not found
 */
function getMfaSession(): string | null {
  return getItem(MFA_SESSION_KEY);
}

/**
 * Removes the MFA session ID from sessionStorage
 */
function clearMfaSession(): void {
  removeItem(MFA_SESSION_KEY);
}