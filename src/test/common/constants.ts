/**
 * Constants used throughout the test suite for the Inventory Management System.
 * This includes API endpoints, timeouts, performance thresholds, test data paths,
 * and various enumeration values for domain objects.
 */

// Base URL for API requests in tests
// This can be overridden by environment variables
export const API_BASE_URL = process.env.API_TEST_URL || 'http://localhost:8080/api/v1';

// API endpoint paths organized by service
export const API_ENDPOINTS = {
  REFERENCE_DATA: {
    SECURITIES: '/securities',
    SECURITY_BY_ID: '/securities/:id',
    COUNTERPARTIES: '/counterparties',
    COUNTERPARTY_BY_ID: '/counterparties/:id',
    INDEXES: '/indexes',
    INDEX_COMPOSITION: '/indexes/:id/composition',
    AGGREGATION_UNITS: '/aggregation-units',
    AGGREGATION_UNIT_BY_ID: '/aggregation-units/:id',
  },
  MARKET_DATA: {
    PRICES: '/market-data/prices',
    PRICE_BY_SECURITY: '/market-data/prices/:securityId',
    BASKET_NAVS: '/market-data/basket-navs',
    BASKET_NAV_BY_ID: '/market-data/basket-navs/:basketId',
    VOLATILITY_CURVES: '/market-data/volatility-curves',
    FX_RATES: '/market-data/fx-rates',
  },
  POSITION: {
    POSITIONS: '/positions',
    POSITIONS_BY_BOOK: '/positions/book/:bookId',
    POSITIONS_BY_SECURITY: '/positions/security/:securityId',
    SETTLEMENT_LADDER: '/positions/settlement-ladder',
    DEPOT_POSITIONS: '/positions/depot',
    POSITION_SUMMARY: '/positions/summary',
  },
  INVENTORY: {
    FOR_LOAN: '/inventory/for-loan',
    FOR_PLEDGE: '/inventory/for-pledge',
    OVERBORROWS: '/inventory/overborrows',
    SELL_LIMITS: '/inventory/sell-limits',
    CLIENT_LIMITS: '/inventory/limits/client/:clientId',
    AGGREGATION_UNIT_LIMITS: '/inventory/limits/aggregation-unit/:aggregationUnitId',
  },
  LOCATE: {
    LOCATES: '/locates',
    LOCATE_BY_ID: '/locates/:id',
    APPROVE_LOCATE: '/locates/:id/approve',
    REJECT_LOCATE: '/locates/:id/reject',
    CANCEL_LOCATE: '/locates/:id/cancel',
  },
  SHORT_SELL: {
    VALIDATE_ORDER: '/orders/validate',
    ORDERS: '/orders',
    ORDER_BY_ID: '/orders/:id',
  },
  CALCULATION_RULE: {
    RULES: '/calculation-rules',
    RULE_BY_ID: '/calculation-rules/:id',
    RULE_VERSIONS: '/calculation-rules/:id/versions',
    PUBLISH_RULE: '/calculation-rules/:id/publish',
    TEST_RULE: '/calculation-rules/:id/test',
  },
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh-token',
  },
};

// Timeout values for different test types (in milliseconds)
export const TEST_TIMEOUTS = {
  UNIT: 5000,         // 5 seconds for unit tests
  INTEGRATION: 30000, // 30 seconds for integration tests
  E2E: 60000,         // 1 minute for end-to-end tests
  PERFORMANCE: 300000 // 5 minutes for performance tests
};

// Performance threshold values for different operations (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
  EVENT_PROCESSING: 200,        // 200ms for end-to-end event processing
  SHORT_SELL_APPROVAL: 150,     // 150ms for short sell approval
  LOCATE_APPROVAL: 2000,        // 2 seconds for locate approval
  POSITION_CALCULATION: 200,    // 200ms for position calculation
  INVENTORY_CALCULATION: 200,   // 200ms for inventory calculation
  UI_RESPONSE: 3000             // 3 seconds for UI dashboard load time
};

// Paths to test fixture files
export const TEST_DATA_PATHS = {
  SECURITIES: './src/test/fixtures/securities',
  POSITIONS: './src/test/fixtures/positions',
  COUNTERPARTIES: './src/test/fixtures/counterparties',
  LOCATES: './src/test/fixtures/locates',
  ORDERS: './src/test/fixtures/orders',
  INVENTORIES: './src/test/fixtures/inventories',
  MARKET_DATA: './src/test/fixtures/market-data',
  REFERENCE_DATA: './src/test/fixtures/reference-data',
  USERS: './src/test/fixtures/users'
};

// Enumeration of security types
export const SECURITY_TYPES = {
  EQUITY: 'EQUITY',
  BOND: 'BOND',
  ETF: 'ETF',
  INDEX: 'INDEX',
  FUTURE: 'FUTURE',
  OPTION: 'OPTION'
};

// Enumeration of position types
export const POSITION_TYPES = {
  LONG: 'LONG',
  SHORT: 'SHORT',
  SYNTHETIC: 'SYNTHETIC'
};

// Enumeration of position statuses
export const POSITION_STATUS = {
  ACTIVE: 'ACTIVE',
  SETTLED: 'SETTLED',
  FAILED: 'FAILED',
  PENDING: 'PENDING'
};

// Enumeration of hypothecation statuses
export const HYPOTHECATION_STATUS = {
  HYPOTHECATABLE: 'HYPOTHECATABLE',
  NON_HYPOTHECATABLE: 'NON_HYPOTHECATABLE'
};

// Enumeration of calculation types
export const CALCULATION_TYPES = {
  FOR_LOAN: 'FOR_LOAN',
  FOR_PLEDGE: 'FOR_PLEDGE',
  OVERBORROW: 'OVERBORROW',
  LONG_SELL: 'LONG_SELL',
  SHORT_SELL: 'SHORT_SELL',
  LOCATE: 'LOCATE'
};

// Enumeration of locate request statuses
export const LOCATE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

// Enumeration of locate request types
export const LOCATE_TYPES = {
  SHORT: 'SHORT',
  LONG: 'LONG'
};

// Enumeration of security borrowing difficulty
export const SECURITY_TEMPERATURE = {
  HARD_TO_BORROW: 'HARD_TO_BORROW',
  GENERAL_COLLATERAL: 'GENERAL_COLLATERAL'
};

// Enumeration of swap cash indicators
export const SWAP_CASH_INDICATOR = {
  SWAP: 'SWAP',
  CASH: 'CASH'
};

// WebSocket event types for real-time updates
export const WEBSOCKET_EVENTS = {
  POSITION_UPDATE: 'POSITION_UPDATE',
  INVENTORY_UPDATE: 'INVENTORY_UPDATE',
  LOCATE_UPDATE: 'LOCATE_UPDATE',
  MARKET_DATA_UPDATE: 'MARKET_DATA_UPDATE',
  ALERT: 'ALERT'
};

// Simulated delays for mock responses in tests (in milliseconds)
export const MOCK_DELAYS = {
  API_RESPONSE: 50,         // 50ms delay for API responses
  WEBSOCKET_MESSAGE: 20     // 20ms delay for WebSocket messages
};