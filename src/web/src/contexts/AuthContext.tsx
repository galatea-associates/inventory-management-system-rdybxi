/**
 * AuthContext.tsx
 * 
 * React context provider for authentication in the Inventory Management System.
 * Centralizes authentication state and functionality, providing a consistent interface
 * for components to access user authentication data, perform login/logout operations,
 * and check authentication status throughout the application.
 */
import { createContext, useContext, ReactNode, FC } from 'react'; // react ^18.2.0
import { useAuth } from '../hooks/useAuth';
import { User } from '../types/models';
import { ErrorResponse } from '../types/api';

/**
 * Interface defining the shape of the authentication context value
 */
interface AuthContextType {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ErrorResponse | null;
  mfaSessionId: string | null;
  
  // Authentication methods
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // MFA methods
  verifyMfa: (data: { code: string; sessionId: string }) => Promise<void>;
  setupMfa: () => Promise<any>;
  confirmMfaSetup: (data: { code: string; secretKey: string }) => Promise<any>;
  disableMfa: (password: string) => Promise<void>;
  
  // Password management
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  resetPassword: (data: { token: string; newPassword: string }) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  validateResetToken: (token: string) => Promise<void>;
  
  // Permission checking
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

/**
 * Create the authentication context with a default value of undefined.
 * This ensures that the context is properly initialized when using the useAuthContext hook.
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider component for the authentication context.
 * Wraps children with the AuthContext.Provider and supplies authentication state and methods.
 */
const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Use the useAuth hook to get all authentication functionality
  const auth = useAuth();
  
  // Return the context provider with auth values
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook that provides access to the AuthContext.
 * Throws an error if used outside of an AuthProvider.
 * 
 * @returns Authentication context value
 */
const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
};

export { AuthProvider, useAuthContext, AuthContext };