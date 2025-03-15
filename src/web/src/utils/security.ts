/**
 * Security Utility Module
 * 
 * This module provides security-related functionality for the Inventory Management System frontend.
 * It handles authentication token management, secure storage of user data, JWT token operations,
 * and security helper functions to ensure consistent and secure authentication across the application.
 */

import jwtDecode from 'jwt-decode'; // jwt-decode ^3.1.2
import { setItem, getItem, removeItem } from './localStorage';
import { setAuthToken, clearAuthToken } from '../api/client';
import { User } from '../types/models';

// Storage keys for authentication-related data
const TOKEN_STORAGE_KEY = 'auth_token';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';
const USER_STORAGE_KEY = 'user_data';

/**
 * Retrieves the authentication token from storage
 * 
 * @returns The stored authentication token or null if not found
 */
export function getToken(): string | null {
  return getItem(TOKEN_STORAGE_KEY) as string | null;
}

/**
 * Stores the authentication token in localStorage and updates the API client
 * 
 * @param token - The authentication token to store
 */
export function setToken(token: string): void {
  setItem(TOKEN_STORAGE_KEY, token);
  setAuthToken(token);
}

/**
 * Removes the authentication token from storage and clears it from the API client
 */
export function removeToken(): void {
  removeItem(TOKEN_STORAGE_KEY);
  clearAuthToken();
}

/**
 * Retrieves the refresh token from storage
 * 
 * @returns The stored refresh token or null if not found
 */
export function getRefreshToken(): string | null {
  return getItem(REFRESH_TOKEN_STORAGE_KEY) as string | null;
}

/**
 * Stores the refresh token in localStorage
 * 
 * @param refreshToken - The refresh token to store
 */
export function setRefreshToken(refreshToken: string): void {
  setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

/**
 * Removes the refresh token from storage
 */
export function removeRefreshToken(): void {
  removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

/**
 * Retrieves the user data from storage
 * 
 * @returns The stored user data or null if not found
 */
export function getUser(): User | null {
  return getItem(USER_STORAGE_KEY) as User | null;
}

/**
 * Stores the user data in localStorage
 * 
 * @param user - The user data to store
 */
export function setUser(user: User): void {
  setItem(USER_STORAGE_KEY, user);
}

/**
 * Removes the user data from storage
 */
export function removeUser(): void {
  removeItem(USER_STORAGE_KEY);
}

/**
 * Clears all authentication-related data from storage and API client
 */
export function clearAuthData(): void {
  removeToken();
  removeRefreshToken();
  removeUser();
}

/**
 * Checks if the current authentication token is expired
 * 
 * @param token - The JWT token to check (optional, uses stored token if not provided)
 * @returns True if token is expired or invalid, false otherwise
 */
export function isTokenExpired(token?: string): boolean {
  const tokenToCheck = token || getToken();
  if (!tokenToCheck) {
    return true;
  }

  try {
    const decodedToken: any = jwtDecode(tokenToCheck);
    const expirationTime = decodedToken.exp * 1000; // Convert to milliseconds
    return Date.now() >= expirationTime;
  } catch (error) {
    // Invalid token is considered expired
    return true;
  }
}

/**
 * Checks if the current user has a specific permission
 * 
 * @param permission - The permission to check
 * @returns True if the user has the permission, false otherwise
 */
export function hasPermission(permission: string): boolean {
  const user = getUser();
  if (!user || !user.permissions) {
    return false;
  }

  return user.permissions.includes(permission);
}

/**
 * Checks if the current user has a specific role
 * 
 * @param role - The role to check
 * @returns True if the user has the role, false otherwise
 */
export function hasRole(role: string): boolean {
  const user = getUser();
  if (!user || !user.roles) {
    return false;
  }

  return user.roles.includes(role);
}

/**
 * Parses a JWT token to extract its payload
 * 
 * @param token - The JWT token to parse
 * @returns The decoded JWT payload or null if invalid
 */
export function parseJwt(token: string): any {
  try {
    return jwtDecode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Gets the expiration time of a JWT token
 * 
 * @param token - The JWT token to check (optional, uses stored token if not provided)
 * @returns The token expiration timestamp in seconds, or null if invalid
 */
export function getTokenExpirationTime(token?: string): number | null {
  const tokenToCheck = token || getToken();
  if (!tokenToCheck) {
    return null;
  }

  const decoded = parseJwt(tokenToCheck);
  if (!decoded || !decoded.exp) {
    return null;
  }

  return decoded.exp as number;
}

/**
 * Calculates the remaining time until token expiration in seconds
 * 
 * @param token - The JWT token to check (optional, uses stored token if not provided)
 * @returns Seconds until expiration, or null if token is invalid
 */
export function getRemainingTokenTime(token?: string): number | null {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) {
    return null;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const remainingTime = expirationTime - currentTime;
  
  return remainingTime > 0 ? remainingTime : 0;
}