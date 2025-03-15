/**
 * Main entry point for the Inventory Management System API client module.
 * This file aggregates and re-exports all API functions from the various
 * domain-specific API modules, providing a centralized access point for
 * frontend components to interact with backend services.
 */

// Import core HTTP client functions
import * as client from './client'; // axios 1.4.0

// Import authentication API functions
import * as auth from './auth';

// Import position API functions
import * as position from './position';

// Import inventory API functions
import * as inventory from './inventory';

// Import locate API functions
import * as locate from './locate';

// Import order API functions
import * as order from './order';

// Import rule API functions
import * as rule from './rule';

// Import reference data API functions
import * as reference from './reference';

// Import user API functions
import * as user from './user';

// Import exception API functions
import * as exception from './exception';

// Import WebSocket client for real-time data
import * as websocket from './websocket';

// Export core HTTP client functions for making API requests
export { client };

// Export authentication and user session management functions
export { auth };

// Export position data retrieval and management functions
export { position };

// Export inventory data retrieval and management functions
export { inventory };

// Export locate request management and approval functions
export { locate };

// Export order management and validation functions
export { order };

// Export calculation rule management functions
export { rule };

// Export reference data retrieval functions
export { reference };

// Export user profile and preferences management functions
export { user };

// Export exception management and monitoring functions
export { exception };

// Export WebSocket client for real-time data streaming
export { websocket };