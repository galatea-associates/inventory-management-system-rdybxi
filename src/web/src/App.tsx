import React from 'react'; // react ^18.2.0
import { Provider } from 'react-redux'; // react-redux ^8.0.5
import { ErrorBoundary } from 'react-error-boundary'; // react-error-boundary ^4.0.10

import AppRouter from './router';
import { store } from './state/store';
import { ThemeProvider } from './contexts/ThemeContext';
import { createGlobalStyles } from './styles/globalStyles';

/**
 * Main application component that serves as the root container
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary fallback={<div>Something went wrong!</div>}>
      {/* LD1: Provide Redux store using Provider component */}
      <Provider store={store}>
        {/* LD1: Provide theme context using ThemeProvider */}
        <ThemeProvider>
          {/* LD1: Apply global styles using createGlobalStyles */}
          {createGlobalStyles()}
          {/* LD1: Render the AppRouter component for application routing */}
          <AppRouter />
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;