import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import jwtDecode from 'jwt-decode'; // jwt-decode ^3.1.2
import { AuthState } from '../../types/state';
import { User } from '../../types/models';
import { AuthRequest, AuthResponse, ErrorResponse } from '../../types/api';
import { 
  login as loginApi, 
  logout as logoutApi, 
  refreshToken as refreshTokenApi, 
  verifyMfa as verifyMfaApi, 
  getCurrentUser as getCurrentUserApi 
} from '../../api/auth';
import { 
  getToken, setToken, removeToken, 
  getRefreshToken, setRefreshToken, removeRefreshToken,
  getUser, setUser, removeUser, clearAuthData,
  isTokenExpired
} from '../../utils/security';

// Initial state based on the AuthState interface
const initialState: AuthState = {
  user: getUser(),
  token: getToken(),
  refreshToken: getRefreshToken(),
  isAuthenticated: !!getToken() && !isTokenExpired(),
  isLoading: false,
  error: null,
  mfaRequired: false,
  mfaSessionId: null,
  tokenExpiration: null
};

// Async thunk for user login
export const login = createAsyncThunk<
  { user: User; tokenExpiration: number },
  AuthRequest,
  { rejectValue: string }
>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      // Call login API with credentials
      const response = await loginApi(credentials);
      
      // Extract token, refreshToken, and user from response
      const { accessToken, refreshToken: refreshTokenValue, user } = response;
      
      // Store token, refreshToken, and user in local storage
      setToken(accessToken);
      setRefreshToken(refreshTokenValue);
      setUser(user);
      
      // Calculate token expiration time using jwtDecode
      const decoded: any = jwtDecode(accessToken);
      const tokenExpiration = decoded.exp * 1000; // Convert to milliseconds
      
      return { user, tokenExpiration };
    } catch (error) {
      // Handle errors by rejecting with error message
      const errorResponse = error as ErrorResponse;
      return rejectWithValue(errorResponse.message || 'Login failed');
    }
  }
);

// Async thunk for user logout
export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Call logout API to invalidate the session
      await logoutApi();
      
      // Clear all authentication data from local storage
      clearAuthData();
      
      return;
    } catch (error) {
      // Handle errors by rejecting with error message
      const errorResponse = error as ErrorResponse;
      
      // Clear auth data even if API call fails
      clearAuthData();
      
      return rejectWithValue(errorResponse.message || 'Logout failed');
    }
  }
);

// Async thunk for refreshing the authentication token
export const refreshToken = createAsyncThunk<
  { accessToken: string; refreshToken: string; tokenExpiration: number },
  void,
  { rejectValue: string }
>(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      // Get current refresh token from local storage
      const currentRefreshToken = getRefreshToken();
      
      // If no refresh token exists, reject with error
      if (!currentRefreshToken) {
        return rejectWithValue('No refresh token available');
      }
      
      // Call refreshToken API with the refresh token
      const response = await refreshTokenApi({ refreshToken: currentRefreshToken });
      
      // Extract new accessToken and refreshToken from response
      const { accessToken, refreshToken: newRefreshToken } = response;
      
      // Store new tokens in local storage
      setToken(accessToken);
      setRefreshToken(newRefreshToken);
      
      // Calculate new token expiration time using jwtDecode
      const decoded: any = jwtDecode(accessToken);
      const tokenExpiration = decoded.exp * 1000; // Convert to milliseconds
      
      return { accessToken, refreshToken: newRefreshToken, tokenExpiration };
    } catch (error) {
      // Handle errors by rejecting with error message
      const errorResponse = error as ErrorResponse;
      return rejectWithValue(errorResponse.message || 'Token refresh failed');
    }
  }
);

// Async thunk for verifying multi-factor authentication
export const verifyMfa = createAsyncThunk<
  { user: User; tokenExpiration: number },
  { code: string; sessionId: string },
  { rejectValue: string }
>(
  'auth/verifyMfa',
  async ({ code, sessionId }, { rejectWithValue }) => {
    try {
      // Call verifyMfa API with code and sessionId
      const response = await verifyMfaApi({ code, sessionId });
      
      // Extract token, refreshToken, and user from response
      const { accessToken, refreshToken: refreshTokenValue, user } = response;
      
      // Store token, refreshToken, and user in local storage
      setToken(accessToken);
      setRefreshToken(refreshTokenValue);
      setUser(user);
      
      // Calculate token expiration time using jwtDecode
      const decoded: any = jwtDecode(accessToken);
      const tokenExpiration = decoded.exp * 1000; // Convert to milliseconds
      
      return { user, tokenExpiration };
    } catch (error) {
      // Handle errors by rejecting with error message
      const errorResponse = error as ErrorResponse;
      return rejectWithValue(errorResponse.message || 'MFA verification failed');
    }
  }
);

// Async thunk for retrieving the current authenticated user
export const getCurrentUser = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      // Call getCurrentUser API to get the current user
      const user = await getCurrentUserApi();
      
      // Store user data in local storage
      setUser(user);
      
      return user;
    } catch (error) {
      // Handle errors by rejecting with error message
      const errorResponse = error as ErrorResponse;
      return rejectWithValue(errorResponse.message || 'Failed to get current user');
    }
  }
);

// Create auth slice with reducers and extra reducers for async thunks
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Action to set MFA requirement state
    setMfaRequired: (state, action: PayloadAction<boolean>) => {
      state.mfaRequired = action.payload;
    },
    // Action to set MFA session ID
    setMfaSessionId: (state, action: PayloadAction<string | null>) => {
      state.mfaSessionId = action.payload;
    },
    // Action to clear authentication errors
    clearAuthError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Login thunk reducers
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = getToken();
        state.refreshToken = getRefreshToken();
        state.tokenExpiration = action.payload.tokenExpiration;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload || 'Login failed';
      });
    
    // Logout thunk reducers
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.mfaRequired = false;
        state.mfaSessionId = null;
        state.tokenExpiration = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.mfaRequired = false;
        state.mfaSessionId = null;
        state.tokenExpiration = null;
        state.error = action.payload || 'Logout failed';
      });
    
    // Token refresh thunk reducers
    builder
      .addCase(refreshToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.tokenExpiration = action.payload.tokenExpiration;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload || 'Token refresh failed';
      });
    
    // MFA verification thunk reducers
    builder
      .addCase(verifyMfa.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(verifyMfa.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = getToken();
        state.refreshToken = getRefreshToken();
        state.tokenExpiration = action.payload.tokenExpiration;
        state.mfaRequired = false;
        state.mfaSessionId = null;
        state.error = null;
      })
      .addCase(verifyMfa.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'MFA verification failed';
      });
    
    // Get current user thunk reducers
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to get current user';
      });
  },
});

// Export actions and thunks
export const { setMfaRequired, setMfaSessionId, clearAuthError } = authSlice.actions;

// Export reducer as default
export default authSlice.reducer;