/**
 * API module for authentication-related operations in the Inventory Management System.
 * Provides functions for user authentication, token management, password operations,
 * and multi-factor authentication, serving as the interface between the frontend
 * and the authentication endpoints of the backend API.
 * 
 * @module api/auth
 */

import { post, get, put, delete as deleteRequest } from './client';
import { AUTH_ENDPOINTS } from '../constants/api';
import { AuthRequest, AuthResponse, RefreshTokenRequest, UserInfo } from '../types/api';

/**
 * Interface for login response data
 */
export interface LoginResponse {
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token */
  refreshToken: string;
  /** User information */
  user: UserInfo;
}

/**
 * Interface for token refresh response data
 */
export interface TokenResponse {
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token */
  refreshToken: string;
}

/**
 * Interface for MFA setup response data
 */
export interface MfaSetupResponse {
  /** Secret key for TOTP configuration */
  secretKey: string;
  /** QR code URL for easy setup in authenticator apps */
  qrCodeUrl: string;
}

/**
 * Interface for MFA confirmation response data
 */
export interface MfaConfirmResponse {
  /** Whether the MFA setup was successful */
  success: boolean;
  /** Backup codes for account recovery */
  backupCodes: string[];
}

/**
 * Authenticates a user with username and password
 * 
 * @param credentials - Authentication credentials
 * @returns Promise resolving to authentication response with tokens and user info
 */
export async function login(credentials: AuthRequest): Promise<AuthResponse> {
  return await post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, credentials);
}

/**
 * Logs out the current user and invalidates their session
 * 
 * @returns Promise resolving when logout is complete
 */
export async function logout(): Promise<void> {
  return await post<void>(AUTH_ENDPOINTS.LOGOUT);
}

/**
 * Refreshes the authentication token using a refresh token
 * 
 * @param refreshTokenRequest - Object containing the refresh token
 * @returns Promise resolving to new authentication tokens
 */
export async function refreshToken(refreshTokenRequest: RefreshTokenRequest): Promise<AuthResponse> {
  return await post<AuthResponse>(AUTH_ENDPOINTS.REFRESH_TOKEN, refreshTokenRequest);
}

/**
 * Verifies a multi-factor authentication code
 * 
 * @param params - Object containing verification code and session ID
 * @returns Promise resolving to authentication response after MFA verification
 */
export async function verifyMfa(params: { code: string; sessionId: string }): Promise<AuthResponse> {
  return await post<AuthResponse>(`${AUTH_ENDPOINTS.LOGIN}/mfa/verify`, params);
}

/**
 * Initiates the setup process for multi-factor authentication
 * 
 * @returns Promise resolving to MFA setup data including QR code
 */
export async function setupMfa(): Promise<MfaSetupResponse> {
  return await post<MfaSetupResponse>(`${AUTH_ENDPOINTS.LOGIN}/mfa/setup`);
}

/**
 * Confirms the setup of multi-factor authentication with a verification code
 * 
 * @param params - Object containing verification code and secret key
 * @returns Promise resolving to MFA confirmation response
 */
export async function confirmMfaSetup(params: { code: string; secretKey: string }): Promise<MfaConfirmResponse> {
  return await post<MfaConfirmResponse>(`${AUTH_ENDPOINTS.LOGIN}/mfa/confirm`, params);
}

/**
 * Disables multi-factor authentication for the current user
 * 
 * @param params - Object containing user password for verification
 * @returns Promise resolving when MFA is disabled
 */
export async function disableMfa(params: { password: string }): Promise<void> {
  return await post<void>(`${AUTH_ENDPOINTS.LOGIN}/mfa/disable`, params);
}

/**
 * Changes the password for the current user
 * 
 * @param params - Object containing current and new passwords
 * @returns Promise resolving when password is changed
 */
export async function changePassword(params: { currentPassword: string; newPassword: string }): Promise<void> {
  return await post<void>(AUTH_ENDPOINTS.CHANGE_PASSWORD, params);
}

/**
 * Initiates the password reset process for a user
 * 
 * @param params - Object containing user email
 * @returns Promise resolving when reset email is sent
 */
export async function forgotPassword(params: { email: string }): Promise<void> {
  return await post<void>(AUTH_ENDPOINTS.FORGOT_PASSWORD, params);
}

/**
 * Resets a user's password using a reset token
 * 
 * @param params - Object containing reset token and new password
 * @returns Promise resolving when password is reset
 */
export async function resetPassword(params: { token: string; newPassword: string }): Promise<void> {
  return await post<void>(AUTH_ENDPOINTS.RESET_PASSWORD, params);
}

/**
 * Validates a password reset token
 * 
 * @param token - The password reset token to validate
 * @returns Promise resolving when token is validated
 */
export async function validateResetToken(token: string): Promise<void> {
  return await get<void>(`${AUTH_ENDPOINTS.RESET_PASSWORD}/validate/${token}`);
}

/**
 * Retrieves the current authenticated user's information
 * 
 * @returns Promise resolving to the current user data
 */
export async function getCurrentUser(): Promise<UserInfo> {
  return await get<UserInfo>(`${AUTH_ENDPOINTS.LOGIN}/current`);
}