import { configureStore, getDefaultMiddleware, Middleware, EnhancedStore } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'; // react-redux ^8.1.1
import rootReducer from './rootReducer';
import { createWebSocketMiddleware } from './websocket/websocketMiddleware';
import { apiMiddleware } from '../middleware/api.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { loggerMiddleware } from '../middleware/logger.middleware';
import { RootState } from '../types/state';

/**
 * Global flag to determine if the application is running in development mode
 */
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

/**
 * Creates an error handling middleware without external dependencies
 * @returns Configured error handling middleware
 */
const createErrorMiddleware = (): Middleware => {
  // Create and return a middleware function that handles errors in actions
  return (store: MiddlewareAPI) => (next: Dispatch) => (action: any) => {
    // Intercept actions with error properties
    if (action.error) {
      // Log errors to console in development mode
      if (IS_DEVELOPMENT) {
        console.error('Error in action', action);
      }
    }
    // Return the middleware function that passes actions to the next middleware
    return next(action);
  };
};

/**
 * Configures and creates the Redux store with appropriate middleware and enhancers
 * @param preloadedState 
 * @returns Configured Redux store instance
 */
export const configureAppStore = (preloadedState?: Partial<RootState>): EnhancedStore => {
  // Create WebSocket middleware instance
  const webSocketMiddleware = createWebSocketMiddleware();

  // Create error middleware using the local factory function
  const errorMiddleware = createErrorMiddleware();

  // Get default middleware from Redux Toolkit
  let middleware = getDefaultMiddleware({
    serializableCheck: false // Disable serializable check due to non-serializable values in Redux
  });

  // Combine default middleware with custom middleware
  middleware = middleware.concat(
    apiMiddleware,
    authMiddleware,
    errorMiddleware,
    webSocketMiddleware,
    loggerMiddleware
  );

  // Configure Redux DevTools in development environment
  const devTools = IS_DEVELOPMENT ? (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__() : undefined;

  // Create and return the Redux store with rootReducer and middleware
  const store = configureStore({
    reducer: rootReducer,
    middleware: middleware,
    devTools: IS_DEVELOPMENT,
    preloadedState
  });

  return store;
};

/**
 * Configure the Redux store
 */
export const store = configureAppStore();

/**
 * Define the AppDispatch type for typed dispatching
 */
export type AppDispatch = typeof store.dispatch;

/**
 * Create typed useDispatch hook for components
 */
export const useAppDispatch: () => AppDispatch = useDispatch;

/**
 * Create typed useSelector hook for components
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;