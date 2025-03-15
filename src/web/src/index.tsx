import React from 'react'; // react ^18.2.0
import ReactDOM from 'react-dom/client'; // react-dom ^18.2.0
import { createRoot } from 'react-dom/client'; // react-dom/client ^18.2.0
import App from './App';
import reportWebVitals from './reportWebVitals';
import './styles/index.css';
import { i18nConfig } from './config';

/**
 * Renders the React application to the DOM
 */
function renderApp(): void {
  // 1. Get the root DOM element with id 'root'
  const rootElement = document.getElementById('root');

  // 2. Throw error if root element is not found
  if (!rootElement) {
    throw new Error('Failed to find the root element in the DOM.');
  }

  // 3. Create a React root using createRoot
  const root = createRoot(rootElement);

  // 4. Render the App component to the root
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // 5. Initialize performance monitoring with reportWebVitals
  reportWebVitals();
}

// Call the renderApp function to start the application
renderApp();