/**
 * Custom React hook for authentication functionality in the Inventory Management System.
 * Manages user sessions, authentication state, token handling, and permission checking.
 * Implements token-based authentication with refresh mechanism and MFA support.
 */
import { useState, useEffect, useCallback, useRef } from 'react'; // react 18.2.0
import { User } from '../types/models';
import { ErrorResponse } from '../types/api';
import { LoginResponse, MfaSetupResponse, MfaConfirmResponse } from '../api/auth';
import {
  getToken, setToken, removeToken,
  getRefreshToken, setRefreshToken, removeRefreshToken,
  getUser, setUser, removeUser, clearAuthData,
  isTokenExpired, hasPermission, hasRole
} from '../utils/security';
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
  getCurrentUser as getCurrentUserApi
} from '../api/auth';

// Token refresh interval in milliseconds (5 minutes)
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000;

/**
 * Interface for login credentials
 */
interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Interface for MFA verification data
 */
interface MfaVerificationData {
  code: string;
  sessionId: string;
}

/**
 * Interface for MFA confirmation data
 */
interface MfaConfirmData {
  code: string;
  secretKey: string;
}

/**
 * Interface for password change data
 */
interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Interface for password reset data
 */
interface PasswordResetData {
  token: string;
  newPassword: string;
}

/**
 * Interface defining the shape of the authentication state and functions
 */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ErrorResponse | null;
  mfaSessionId: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  verifyMfa: (data: MfaVerificationData) => Promise<void>;
  setupMfa: () => Promise<MfaSetupResponse>;
  confirmMfaSetup: (data: MfaConfirmData) => Promise<MfaConfirmResponse>;
  disableMfa: (password: string) => Promise<void>;
  changePassword: (data: PasswordChangeData) => Promise<void>;
  resetPassword: (data: PasswordResetData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  validateResetToken: (token: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

/**
 * Custom hook that provides authentication functionality for the application
 * @returns Authentication state and functions
 */
const useAuth = (): AuthState => {
  // Initialize state for user, loading, error, and MFA session
  const [user, setUserState] = useState<User | null>(getUser());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [mfaSessionId, setMfaSessionId] = useState<string | null>(null);
  
  // Create a reference for the refresh token interval
  const refreshTokenInterval = useRef<NodeJS.Timeout | null>(null);

  // Determine if user is authenticated based on token validity
  const isAuthenticated = !!user && !!getToken() && !isTokenExpired();

  /**
   * Authenticates a user with username and password
   * @param credentials - Login credentials
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await loginApi(credentials);
      
      // Store tokens and user data
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      setUser(response.user);
      setUserState(response.user);
      setIsLoading(false);
    } catch (err) {
      // Handle MFA required case if the API returns it
      if (err && 
          (err as ErrorResponse).status === 401 && 
          (err as ErrorResponse).code === 'MFA_REQUIRED' && 
          (err as any).data?.sessionId) {
        setMfaSessionId((err as any).data.sessionId);
        setIsLoading(false);
        return;
      }
      
      setError(err as ErrorResponse);
      setIsLoading(false);
    }
  }, []);

  /**
   * Logs out the current user and cleans up authentication state
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      await logoutApi();
    } catch (err) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', err);
    } finally {
      // Clear all auth data regardless of API success
      clearAuthData();
      setUserState(null);
      setIsLoading(false);
      setMfaSessionId(null);
      
      // Clear refresh token interval
      if (refreshTokenInterval.current) {
        clearInterval(refreshTokenInterval.current);
        refreshTokenInterval.current = null;
      }
    }
  }, []);

  /**
   * Refreshes the authentication token using the refresh token
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    const currentRefreshToken = getRefreshToken();
    
    if (!currentRefreshToken) {
      return;
    }
    
    try {
      const response = await refreshTokenApi({ refreshToken: currentRefreshToken });
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      
      // Update user if provided in response
      if (response.user) {
        setUser(response.user);
        setUserState(response.user);
      }
    } catch (err) {
      // If refresh fails, clear auth state
      console.error('Token refresh failed:', err);
      clearAuthData();
      setUserState(null);
    }
  }, []);

  /**
   * Verifies an MFA code to complete authentication
   * @param data - MFA verification data with code and session ID
   */
  const verifyMfa = useCallback(async (data: MfaVerificationData): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await verifyMfaApi(data);
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      setUser(response.user);
      setUserState(response.user);
      setMfaSessionId(null);
      setIsLoading(false);
    } catch (err) {
      setError(err as ErrorResponse);
      setIsLoading(false);
    }
  }, []);

  /**
   * Initiates MFA setup process
   * @returns MFA setup data including QR code
   */
  const setupMfa = useCallback(async (): Promise<MfaSetupResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await setupMfaApi();
      setIsLoading(false);
      return response;
    } catch (err) {
      setError(err as ErrorResponse);
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * Confirms MFA setup with verification code
   * @param data - MFA confirmation data with code and secret key
   * @returns MFA confirmation response with backup codes
   */
  const confirmMfaSetup = useCallback(async (data: MfaConfirmData): Promise<MfaConfirmResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await confirmMfaSetupApi(data);
      setIsLoading(false);
      
      // Refresh user data to reflect MFA status change
      try {
        const userData = await getCurrentUserApi();
        setUser(userData);
        setUserState(userData);
      } catch (userErr) {
        console.error('Failed to update user data after MFA setup:', userErr);
      }
      
      return response;
    } catch (err) {
      setError(err as ErrorResponse);
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * Disables MFA for the current user
   * @param password - Current password for verification
   */
  const disableMfa = useCallback(async (password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await disableMfaApi({ password });
      setIsLoading(false);
      
      // Refresh user data to reflect MFA status change
      try {
        const userData = await getCurrentUserApi();
        setUser(userData);
        setUserState(userData);
      } catch (userErr) {
        console.error('Failed to update user data after MFA disable:', userErr);
      }
    } catch (err) {
      setError(err as ErrorResponse);
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * Changes the password for the current user
   * @param data - Password change data with current and new password
   */
  const changePassword = useCallback(async (data: PasswordChangeData): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await changePasswordApi(data);
      setIsLoading(false);
    } catch (err) {
      setError(err as ErrorResponse);
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * Resets a password using a reset token
   * @param data - Password reset data with token and new password
   */
  const resetPassword = useCallback(async (data: PasswordResetData): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await resetPasswordApi(data);
      setIsLoading(false);
    } catch (err) {
      setError(err as ErrorResponse);
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * Initiates password reset process by sending email
   * @param email - User's email address
   */
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await forgotPasswordApi({ email });
      setIsLoading(false);
    } catch (err) {
      setError(err as ErrorResponse);
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * Validates a password reset token
   * @param token - Password reset token to validate
   */
  const validateResetToken = useCallback(async (token: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await validateResetTokenApi(token);
      setIsLoading(false);
    } catch (err) {
      setError(err as ErrorResponse);
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * Checks if user has a specific permission
   * @param permission - Permission to check
   * @returns True if user has the permission
   */
  const checkHasPermission = useCallback((permission: string): boolean => {
    return hasPermission(permission);
  }, []);

  /**
   * Checks if user has any of the specified permissions
   * @param permissions - Array of permissions to check
   * @returns True if user has any of the permissions
   */
  const checkHasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!permissions || permissions.length === 0) {
      return false;
    }
    
    return permissions.some(permission => hasPermission(permission));
  }, []);

  /**
   * Checks if user has all of the specified permissions
   * @param permissions - Array of permissions to check
   * @returns True if user has all of the permissions
   */
  const checkHasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!permissions || permissions.length === 0) {
      return false;
    }
    
    return permissions.every(permission => hasPermission(permission));
  }, []);

  // Set up token refresh interval when authenticated
  useEffect(() => {
    // Clean up any existing interval
    if (refreshTokenInterval.current) {
      clearInterval(refreshTokenInterval.current);
      refreshTokenInterval.current = null;
    }
    
    // Start new interval if authenticated
    if (isAuthenticated) {
      refreshTokenInterval.current = setInterval(() => {
        refreshToken();
      }, TOKEN_REFRESH_INTERVAL);
    }
    
    // Clean up interval on component unmount
    return () => {
      if (refreshTokenInterval.current) {
        clearInterval(refreshTokenInterval.current);
        refreshTokenInterval.current = null;
      }
    };
  }, [isAuthenticated, refreshToken]);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      const refreshTokenValue = getRefreshToken();
      
      // If no tokens, no need to check further
      if (!token && !refreshTokenValue) {
        return;
      }
      
      // If token is valid, nothing to do
      if (token && !isTokenExpired()) {
        return;
      }
      
      // If token is expired but refresh token exists, try to refresh
      if (refreshTokenValue) {
        try {
          await refreshToken();
        } catch (err) {
          // If refresh fails, clear auth data
          clearAuthData();
          setUserState(null);
        }
      } else {
        // If no refresh token, clear auth data
        clearAuthData();
        setUserState(null);
      }
    };
    
    checkAuth();
  }, [refreshToken]);

  // Return authentication state and functions
  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    mfaSessionId,
    login,
    logout,
    refreshToken,
    verifyMfa,
    setupMfa,
    confirmMfaSetup,
    disableMfa,
    changePassword,
    resetPassword,
    forgotPassword,
    validateResetToken,
    hasPermission: checkHasPermission,
    hasAnyPermission: checkHasAnyPermission,
    hasAllPermissions: checkHasAllPermissions
  };
};

export default useAuth;