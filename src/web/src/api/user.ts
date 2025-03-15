/**
 * API module for user management operations in the Inventory Management System frontend.
 * Provides functions for retrieving, updating, and managing user data, preferences, and profiles.
 * Serves as the interface between the frontend and the user management endpoints of the backend API.
 */

import { get, post, put, delete as deleteRequest } from './client'; // axios 1.4.0
import { USER_ENDPOINTS } from '../constants/api';
import { UserInfo, PaginatedResponse, PaginationParams } from '../types/api';

/**
 * Interface for user profile data
 */
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  jobTitle: string;
  phoneNumber: string;
  roles: string[];
  mfaEnabled: boolean;
  lastLoginAt: string;
}

/**
 * Interface for user profile update request data
 */
export interface UserProfileUpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  department: string;
  jobTitle: string;
}

/**
 * Interface for user preferences data
 */
export interface UserPreferences {
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  dashboardLayout: object;
  notifications: object;
}

/**
 * Interface for user preferences update request data
 */
export interface UserPreferencesUpdateRequest {
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  dashboardLayout: object;
  notifications: object;
}

/**
 * Interface for user update request data (admin only)
 */
export interface UserUpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  department: string;
  jobTitle: string;
  enabled: boolean;
}

/**
 * Retrieves the profile information for the current user
 * 
 * @returns Promise resolving to the user profile data
 */
export async function getUserProfile(): Promise<UserProfile> {
  return get<UserProfile>(USER_ENDPOINTS.USER_PROFILE);
}

/**
 * Updates the profile information for the current user
 * 
 * @param profileData - The profile data to update
 * @returns Promise resolving to the updated user profile data
 */
export async function updateUserProfile(profileData: UserProfileUpdateRequest): Promise<UserProfile> {
  return put<UserProfile>(USER_ENDPOINTS.USER_PROFILE, profileData);
}

/**
 * Retrieves the preferences for the current user
 * 
 * @returns Promise resolving to the user preferences data
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  return get<UserPreferences>(USER_ENDPOINTS.USER_PREFERENCES);
}

/**
 * Updates the preferences for the current user
 * 
 * @param preferencesData - The preferences data to update
 * @returns Promise resolving to the updated user preferences data
 */
export async function updateUserPreferences(preferencesData: UserPreferencesUpdateRequest): Promise<UserPreferences> {
  return put<UserPreferences>(USER_ENDPOINTS.USER_PREFERENCES, preferencesData);
}

/**
 * Retrieves a paginated list of users (admin only)
 * 
 * @param params - Pagination parameters
 * @returns Promise resolving to paginated user data
 */
export async function getUsers(params: PaginationParams): Promise<PaginatedResponse<UserInfo>> {
  return get<PaginatedResponse<UserInfo>>(USER_ENDPOINTS.USERS, params);
}

/**
 * Retrieves a specific user by ID (admin only)
 * 
 * @param userId - ID of the user to retrieve
 * @returns Promise resolving to the user data
 */
export async function getUserById(userId: string): Promise<UserInfo> {
  return get<UserInfo>(USER_ENDPOINTS.USER_BY_ID.replace(':id', userId));
}

/**
 * Updates a specific user (admin only)
 * 
 * @param userId - ID of the user to update
 * @param userData - User data to update
 * @returns Promise resolving to the updated user data
 */
export async function updateUser(userId: string, userData: UserUpdateRequest): Promise<UserInfo> {
  return put<UserInfo>(USER_ENDPOINTS.USER_BY_ID.replace(':id', userId), userData);
}

/**
 * Enables a disabled user account (admin only)
 * 
 * @param userId - ID of the user to enable
 * @returns Promise resolving when the user is enabled
 */
export async function enableUser(userId: string): Promise<void> {
  return post<void>(USER_ENDPOINTS.USER_BY_ID.replace(':id', userId) + '/enable');
}

/**
 * Disables a user account (admin only)
 * 
 * @param userId - ID of the user to disable
 * @returns Promise resolving when the user is disabled
 */
export async function disableUser(userId: string): Promise<void> {
  return post<void>(USER_ENDPOINTS.USER_BY_ID.replace(':id', userId) + '/disable');
}

/**
 * Unlocks a locked user account (admin only)
 * 
 * @param userId - ID of the user to unlock
 * @returns Promise resolving when the user is unlocked
 */
export async function unlockUser(userId: string): Promise<void> {
  return post<void>(USER_ENDPOINTS.USER_BY_ID.replace(':id', userId) + '/unlock');
}

/**
 * Assigns a role to a user (admin only)
 * 
 * @param userId - ID of the user
 * @param roleId - ID of the role to assign
 * @returns Promise resolving to the updated user data
 */
export async function assignUserRole(userId: string, roleId: string): Promise<UserInfo> {
  return post<UserInfo>(USER_ENDPOINTS.USER_BY_ID.replace(':id', userId) + '/roles/' + roleId);
}

/**
 * Removes a role from a user (admin only)
 * 
 * @param userId - ID of the user
 * @param roleId - ID of the role to remove
 * @returns Promise resolving to the updated user data
 */
export async function removeUserRole(userId: string, roleId: string): Promise<UserInfo> {
  return deleteRequest<UserInfo>(USER_ENDPOINTS.USER_BY_ID.replace(':id', userId) + '/roles/' + roleId);
}