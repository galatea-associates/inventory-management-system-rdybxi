import { faker } from '@faker-js/faker'; // v8.0.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import dayjs from 'dayjs'; // v1.11.9

import {
  SECURITY_TYPES,
  POSITION_TYPES,
  POSITION_STATUS,
  HYPOTHECATION_STATUS,
  CALCULATION_TYPES,
  LOCATE_STATUS,
  LOCATE_TYPES,
  SECURITY_TEMPERATURE,
  SWAP_CASH_INDICATOR
} from './constants';

// Import fixture data
import securities from './fixtures/securities.json';
import positions from './fixtures/positions.json';
import counterparties from './fixtures/counterparties.json';
import locates from './fixtures/locates.json';
import orders from './fixtures/orders.json';
import inventories from './fixtures/inventories.json';

/**
 * Creates a mock security object with specified or random properties
 * @param overrides Properties to override default random values
 * @returns A mock security object
 */
export function createMockSecurity(overrides = {}) {
  const securityType = faker.helpers.arrayElement(Object.values(SECURITY_TYPES));
  
  return {
    id: faker.string.uuid(),
    internalId: `SEC-${faker.string.alphanumeric(6)}`,
    securityType,
    issuer: faker.company.name(),
    description: faker.commerce.productName(),
    currency: faker.finance.currencyCode(),
    issueDate: faker.date.past().toISOString().split('T')[0],
    maturityDate: faker.date.future().toISOString().split('T')[0],
    market: faker.helpers.arrayElement(['US', 'UK', 'JP', 'HK', 'SG', 'AU', 'DE', 'FR']),
    exchange: faker.helpers.arrayElement(['NYSE', 'NASDAQ', 'LSE', 'TSE', 'SSE', 'HKEX']),
    status: 'ACTIVE',
    isBasketProduct: securityType === 'ETF' || securityType === 'INDEX',
    basketType: securityType === 'ETF' ? 'ETF' : securityType === 'INDEX' ? 'INDEX' : null,
    primaryIdentifierType: faker.helpers.arrayElement(['ISIN', 'CUSIP', 'SEDOL', 'RIC', 'BLOOMBERG_ID']),
    primaryIdentifierValue: faker.finance.account(12),
    createdBy: 'system',
    createdAt: faker.date.past().toISOString(),
    lastModifiedBy: 'system',
    lastModifiedAt: faker.date.recent().toISOString(),
    version: faker.number.int({ min: 1, max: 10 }),
    ...overrides
  };
}

/**
 * Creates a mock position object with specified or random properties
 * @param overrides Properties to override default random values
 * @returns A mock position object
 */
export function createMockPosition(overrides = {}) {
  const isLong = faker.datatype.boolean();
  const currentQty = isLong 
    ? faker.number.int({ min: 1000, max: 100000 }) 
    : -faker.number.int({ min: 1000, max: 100000 });
  const settledQty = faker.number.int({ min: 0, max: Math.abs(currentQty) }) * (currentQty < 0 ? -1 : 1);
  const sd0Qty = Math.abs(currentQty - settledQty);
  
  return {
    id: `POS-${faker.string.alphanumeric(5)}`,
    bookId: `${faker.helpers.arrayElement(['EQUITY', 'FIXED', 'DERIV', 'ETF'])}-${faker.string.numeric(2)}`,
    security: {
      internalId: `SEC-${faker.string.alphanumeric(6)}`
    },
    counterparty: {
      counterpartyId: `CP-${faker.string.numeric(5, { allowLeadingZeros: true })}`
    },
    aggregationUnit: {
      id: `AU-${faker.string.numeric(3)}`,
      name: `${faker.helpers.arrayElement(['US', 'UK', 'JP', 'EU'])} ${faker.helpers.arrayElement(['Equity', 'Fixed Income', 'Derivative'])} Trading`,
      market: faker.helpers.arrayElement(['US', 'UK', 'JP', 'HK', 'SG', 'AU', 'DE', 'FR'])
    },
    businessDate: dayjs().format('YYYY-MM-DD'),
    positionType: faker.helpers.arrayElement(Object.values(POSITION_TYPES)),
    isHypothecatable: faker.datatype.boolean(),
    isReserved: faker.datatype.boolean(),
    contractualQty: currentQty,
    settledQty,
    sd0Deliver: currentQty < 0 ? 0 : 0,
    sd0Receipt: currentQty > 0 ? sd0Qty : 0,
    sd1Deliver: faker.number.int({ min: 0, max: 1000 }),
    sd1Receipt: faker.number.int({ min: 0, max: 1000 }),
    sd2Deliver: faker.number.int({ min: 0, max: 500 }),
    sd2Receipt: faker.number.int({ min: 0, max: 500 }),
    sd3Deliver: faker.number.int({ min: 0, max: 200 }),
    sd3Receipt: faker.number.int({ min: 0, max: 200 }),
    sd4Deliver: faker.number.int({ min: 0, max: 100 }),
    sd4Receipt: faker.number.int({ min: 0, max: 100 }),
    currentNetPosition: settledQty,
    projectedNetPosition: currentQty,
    calculationStatus: 'VALID',
    calculationDate: dayjs().format('YYYY-MM-DD'),
    calculationRuleId: `RULE-${faker.string.numeric(3)}`,
    calculationRuleVersion: `${faker.number.int(10)}.${faker.number.int(10)}`,
    isStartOfDay: faker.datatype.boolean(),
    ...overrides
  };
}

/**
 * Creates a mock counterparty object with specified or random properties
 * @param overrides Properties to override default random values
 * @returns A mock counterparty object
 */
export function createMockCounterparty(overrides = {}) {
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    counterpartyId: `CP-${faker.string.numeric(5, { allowLeadingZeros: true })}`,
    name: faker.company.name(),
    shortName: faker.company.name().split(' ')[0],
    type: faker.helpers.arrayElement(['INSTITUTIONAL', 'HEDGE_FUND', 'ASSET_MANAGER', 'CORPORATE', 'PENSION_FUND', 'BROKER_DEALER', 'RETAIL_BROKER']),
    category: faker.helpers.arrayElement(['INVESTMENT_BANK', 'ASSET_MANAGER', 'CORPORATE', 'INSTITUTIONAL', 'BROKER']),
    status: 'ACTIVE',
    kycStatus: 'APPROVED',
    riskRating: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']),
    country: faker.location.countryCode('alpha-2'),
    region: faker.helpers.arrayElement(['AMERICAS', 'EMEA', 'APAC']),
    primaryIdentifierType: 'LEI',
    primaryIdentifierValue: faker.finance.ethereumAddress().substring(2, 22),
    createdBy: 'system',
    createdAt: faker.date.past().toISOString(),
    lastModifiedBy: 'system',
    lastModifiedAt: faker.date.recent().toISOString(),
    version: faker.number.int({ min: 1, max: 5 }),
    identifiers: [
      {
        id: faker.number.int({ min: 1, max: 10000 }),
        identifierType: 'LEI',
        identifierValue: faker.finance.ethereumAddress().substring(2, 22),
        source: 'GLEIF',
        priority: 1,
        isPrimary: true
      }
    ],
    ...overrides
  };
}

/**
 * Creates a mock locate request object with specified or random properties
 * @param overrides Properties to override default random values
 * @returns A mock locate request object
 */
export function createMockLocateRequest(overrides = {}) {
  const requestTimestamp = faker.date.recent().toISOString();
  
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    requestId: `LOC-${dayjs().format('YYYYMMDD')}-${faker.string.numeric(5, { allowLeadingZeros: true })}`,
    security: {
      internalId: `SEC-${faker.string.alphanumeric(6)}`,
      description: faker.commerce.productName()
    },
    requestor: {
      counterpartyId: `CP-${faker.string.numeric(5, { allowLeadingZeros: true })}`,
      name: faker.company.name()
    },
    client: {
      counterpartyId: `CP-${faker.string.numeric(5, { allowLeadingZeros: true })}`,
      name: faker.company.name()
    },
    aggregationUnit: {
      aggregationUnitId: `AU-${faker.helpers.arrayElement(['US', 'UK', 'JP', 'EU'])}-${faker.string.numeric(3)}`,
      name: `${faker.helpers.arrayElement(['US', 'UK', 'JP', 'EU'])} ${faker.helpers.arrayElement(['Equity', 'Fixed Income'])} Trading`
    },
    locateType: faker.helpers.arrayElement(Object.values(LOCATE_TYPES)),
    requestedQuantity: faker.number.int({ min: 1000, max: 50000 }),
    requestTimestamp,
    status: faker.helpers.arrayElement(Object.values(LOCATE_STATUS)),
    swapCashIndicator: faker.helpers.arrayElement(Object.values(SWAP_CASH_INDICATOR)),
    createdBy: 'system',
    createdAt: requestTimestamp,
    lastModifiedBy: 'system',
    lastModifiedAt: requestTimestamp,
    version: 1,
    ...overrides
  };
}

/**
 * Creates a mock order object with specified or random properties
 * @param overrides Properties to override default random values
 * @returns A mock order object
 */
export function createMockOrder(overrides = {}) {
  const orderType = faker.helpers.arrayElement(['BUY', 'LONG_SELL', 'SHORT_SELL']);
  const orderDate = dayjs().format('YYYY-MM-DD');
  const createdAt = faker.date.recent().toISOString();
  
  return {
    id: faker.number.int({ min: 1, max: 100000 }),
    orderId: `ORD-${faker.string.alphanumeric(8)}`,
    orderType,
    securityId: `SEC-${faker.string.alphanumeric(6)}`,
    security: {
      internalId: `SEC-${faker.string.alphanumeric(6)}`,
      securityType: faker.helpers.arrayElement(Object.values(SECURITY_TYPES)),
      issuer: faker.company.name(),
      description: faker.commerce.productName(),
      currency: faker.finance.currencyCode(),
      market: faker.helpers.arrayElement(['US', 'UK', 'JP', 'HK', 'SG', 'AU', 'DE', 'FR']),
      exchange: faker.helpers.arrayElement(['NYSE', 'NASDAQ', 'LSE', 'TSE', 'SSE', 'HKEX']),
      status: 'ACTIVE',
      primaryIdentifierType: faker.helpers.arrayElement(['ISIN', 'CUSIP', 'SEDOL', 'RIC', 'BLOOMBERG_ID']),
      primaryIdentifierValue: faker.finance.account(12)
    },
    clientId: `CP-${faker.string.numeric(5, { allowLeadingZeros: true })}`,
    client: {
      counterpartyId: `CP-${faker.string.numeric(5, { allowLeadingZeros: true })}`,
      name: faker.company.name(),
      shortName: faker.company.name().split(' ')[0],
      type: faker.helpers.arrayElement(['INSTITUTIONAL', 'HEDGE_FUND', 'ASSET_MANAGER', 'CORPORATE', 'PENSION_FUND']),
      status: 'ACTIVE'
    },
    aggregationUnitId: `AU-${faker.string.numeric(3)}`,
    aggregationUnit: {
      aggregationUnitId: `AU-${faker.string.numeric(3)}`,
      name: `${faker.helpers.arrayElement(['US', 'UK', 'JP', 'EU'])} ${faker.helpers.arrayElement(['Equity', 'Fixed Income'])} Trading`,
      type: faker.helpers.arrayElement(['TRADING', 'AGENCY', 'PROPRIETARY']),
      market: faker.helpers.arrayElement(['US', 'UK', 'JP', 'HK', 'SG', 'AU', 'DE', 'FR']),
      region: faker.helpers.arrayElement(['AMERICAS', 'EMEA', 'APAC']),
      status: 'ACTIVE'
    },
    buyerCounterpartyId: orderType === 'BUY' ? `CP-${faker.string.numeric(5, { allowLeadingZeros: true })}` : null,
    sellerCounterpartyId: orderType !== 'BUY' ? `CP-${faker.string.numeric(5, { allowLeadingZeros: true })}` : null,
    side: orderType === 'BUY' ? 'BUY' : 'SELL',
    price: parseFloat(faker.finance.amount(10, 1000, 2)),
    quantity: faker.number.int({ min: 100, max: 10000 }),
    orderDate,
    orderTime: dayjs().format('HH:mm:ss'),
    status: faker.helpers.arrayElement(['NEW', 'ACCEPTED', 'REJECTED', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED']),
    bookId: `${faker.helpers.arrayElement(['EQUITY', 'FIXED', 'DERIV', 'ETF'])}-${faker.string.numeric(2)}`,
    parentOrderId: faker.datatype.boolean() ? `ORD-${faker.string.alphanumeric(8)}` : null,
    createdBy: 'system',
    createdAt,
    lastModifiedBy: 'system',
    lastModifiedAt: createdAt,
    version: 1,
    ...overrides
  };
}

/**
 * Creates a mock inventory object with specified or random properties
 * @param overrides Properties to override default random values
 * @returns A mock inventory object
 */
export function createMockInventory(overrides = {}) {
  const calculationType = faker.helpers.arrayElement(Object.values(CALCULATION_TYPES));
  const grossQuantity = faker.number.int({ min: 5000, max: 100000 });
  const reservedQuantity = faker.number.int({ min: 0, max: Math.floor(grossQuantity * 0.2) });
  const decrementQuantity = faker.number.int({ min: 0, max: Math.floor(grossQuantity * 0.3) });
  const availableQuantity = grossQuantity - reservedQuantity - decrementQuantity;
  const createdAt = faker.date.recent().toISOString();
  
  return {
    id: faker.string.uuid(),
    security: {
      internalId: `SEC-${faker.string.alphanumeric(6)}`
    },
    counterparty: {
      counterpartyId: `CP-${faker.string.numeric(5, { allowLeadingZeros: true })}`
    },
    aggregationUnit: {
      id: `AU-${faker.string.numeric(3)}`,
      name: `${faker.helpers.arrayElement(['US', 'UK', 'JP', 'EU'])} ${faker.helpers.arrayElement(['Equity', 'Fixed Income'])} Trading`,
      market: faker.helpers.arrayElement(['US', 'UK', 'JP', 'HK', 'SG', 'AU', 'DE', 'FR'])
    },
    businessDate: dayjs().format('YYYY-MM-DD'),
    calculationType,
    grossQuantity,
    netQuantity: grossQuantity - reservedQuantity,
    availableQuantity,
    reservedQuantity,
    decrementQuantity,
    market: faker.helpers.arrayElement(['US', 'UK', 'JP', 'HK', 'SG', 'AU', 'DE', 'FR']),
    securityTemperature: faker.helpers.arrayElement(Object.values(SECURITY_TEMPERATURE)),
    borrowRate: parseFloat(faker.finance.amount(0.1, 5, 2)),
    calculationRuleId: `RULE-${faker.string.numeric(3)}`,
    calculationRuleVersion: `${faker.number.int(10)}.${faker.number.int(10)}`,
    isExternalSource: faker.datatype.boolean(),
    externalSourceName: faker.datatype.boolean() ? faker.company.name() : null,
    status: 'ACTIVE',
    createdBy: 'system',
    createdAt,
    lastModifiedBy: 'system',
    lastModifiedAt: createdAt,
    version: 1,
    ...overrides
  };
}

/**
 * Creates an array of mock security objects
 * @param count Number of mock securities to create
 * @param baseOverrides Base overrides to apply to all created securities
 * @returns An array of mock security objects
 */
export function createMockSecurities(count = 10, baseOverrides = {}) {
  return Array.from({ length: count }, (_, index) => 
    createMockSecurity({ 
      ...baseOverrides,
      id: `${baseOverrides.id || 'SEC'}-${index + 1}` 
    })
  );
}

/**
 * Creates an array of mock position objects
 * @param count Number of mock positions to create
 * @param baseOverrides Base overrides to apply to all created positions
 * @returns An array of mock position objects
 */
export function createMockPositions(count = 10, baseOverrides = {}) {
  return Array.from({ length: count }, (_, index) => 
    createMockPosition({ 
      ...baseOverrides,
      id: `${baseOverrides.id || 'POS'}-${String(index + 1).padStart(5, '0')}` 
    })
  );
}

/**
 * Creates an array of mock counterparty objects
 * @param count Number of mock counterparties to create
 * @param baseOverrides Base overrides to apply to all created counterparties
 * @returns An array of mock counterparty objects
 */
export function createMockCounterparties(count = 10, baseOverrides = {}) {
  return Array.from({ length: count }, (_, index) => 
    createMockCounterparty({ 
      ...baseOverrides,
      id: index + 1,
      counterpartyId: `${baseOverrides.counterpartyId || 'CP'}-${String(index + 1).padStart(5, '0')}` 
    })
  );
}

/**
 * Creates an array of mock locate request objects
 * @param count Number of mock locate requests to create
 * @param baseOverrides Base overrides to apply to all created locate requests
 * @returns An array of mock locate request objects
 */
export function createMockLocateRequests(count = 10, baseOverrides = {}) {
  return Array.from({ length: count }, (_, index) => 
    createMockLocateRequest({ 
      ...baseOverrides,
      id: index + 1,
      requestId: `${baseOverrides.requestId || 'LOC'}-${dayjs().format('YYYYMMDD')}-${String(index + 1).padStart(5, '0')}` 
    })
  );
}

/**
 * Creates an array of mock order objects
 * @param count Number of mock orders to create
 * @param baseOverrides Base overrides to apply to all created orders
 * @returns An array of mock order objects
 */
export function createMockOrders(count = 10, baseOverrides = {}) {
  return Array.from({ length: count }, (_, index) => 
    createMockOrder({ 
      ...baseOverrides,
      id: index + 1,
      orderId: `${baseOverrides.orderId || 'ORD'}-${String(index + 1).padStart(8, '0')}` 
    })
  );
}

/**
 * Creates an array of mock inventory objects
 * @param count Number of mock inventories to create
 * @param baseOverrides Base overrides to apply to all created inventories
 * @returns An array of mock inventory objects
 */
export function createMockInventories(count = 10, baseOverrides = {}) {
  return Array.from({ length: count }, (_, index) => 
    createMockInventory({ 
      ...baseOverrides,
      id: baseOverrides.id ? `${baseOverrides.id}-${index + 1}` : faker.string.uuid() 
    })
  );
}

/**
 * Creates a mock event object with specified or random properties
 * @param eventType Type of the event
 * @param payload Event payload
 * @param overrides Properties to override default random values
 * @returns A mock event object with metadata and payload
 */
export function createMockEvent(eventType, payload = {}, overrides = {}) {
  return {
    metadata: {
      eventId: uuidv4(),
      eventType,
      eventTime: new Date().toISOString(),
      source: faker.helpers.arrayElement(['market-data-service', 'reference-data-service', 'trade-service', 'calculation-service']),
      correlationId: uuidv4()
    },
    payload,
    ...overrides
  };
}

/**
 * Creates a mock reference data event with specified or random properties
 * @param payload Event payload
 * @param overrides Properties to override default random values
 * @returns A mock reference data event
 */
export function createMockReferenceDataEvent(payload = {}, overrides = {}) {
  return createMockEvent('reference.data.updated', payload, overrides);
}

/**
 * Creates a mock market data event with specified or random properties
 * @param payload Event payload
 * @param overrides Properties to override default random values
 * @returns A mock market data event
 */
export function createMockMarketDataEvent(payload = {}, overrides = {}) {
  return createMockEvent('market.data.updated', payload, overrides);
}

/**
 * Creates a mock trade data event with specified or random properties
 * @param payload Event payload
 * @param overrides Properties to override default random values
 * @returns A mock trade data event
 */
export function createMockTradeDataEvent(payload = {}, overrides = {}) {
  return createMockEvent('trade.data.updated', payload, overrides);
}

/**
 * Creates a mock position event with specified or random properties
 * @param payload Event payload
 * @param overrides Properties to override default random values
 * @returns A mock position event
 */
export function createMockPositionEvent(payload = {}, overrides = {}) {
  return createMockEvent('position.updated', payload, overrides);
}

/**
 * Creates a mock inventory event with specified or random properties
 * @param payload Event payload
 * @param overrides Properties to override default random values
 * @returns A mock inventory event
 */
export function createMockInventoryEvent(payload = {}, overrides = {}) {
  return createMockEvent('inventory.updated', payload, overrides);
}

/**
 * Creates a mock locate event with specified or random properties
 * @param payload Event payload
 * @param overrides Properties to override default random values
 * @returns A mock locate event
 */
export function createMockLocateEvent(payload = {}, overrides = {}) {
  return createMockEvent('locate.updated', payload, overrides);
}

/**
 * Creates a mock workflow event with specified or random properties
 * @param payload Event payload
 * @param overrides Properties to override default random values
 * @returns A mock workflow event
 */
export function createMockWorkflowEvent(payload = {}, overrides = {}) {
  return createMockEvent('workflow.updated', payload, overrides);
}

/**
 * Creates a mock user object with specified or random properties
 * @param overrides Properties to override default random values
 * @returns A mock user object
 */
export function createMockUser(overrides = {}) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  
  return {
    id: faker.string.uuid(),
    username: faker.internet.userName({ firstName, lastName }),
    email: faker.internet.email({ firstName, lastName }),
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    role: faker.helpers.arrayElement(['ADMIN', 'TRADER', 'OPERATIONS', 'COMPLIANCE', 'RISK']),
    department: faker.helpers.arrayElement(['TRADING', 'OPERATIONS', 'COMPLIANCE', 'RISK', 'IT']),
    status: 'ACTIVE',
    permissions: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) }, 
      () => faker.helpers.arrayElement(['READ_POSITION', 'WRITE_POSITION', 'READ_INVENTORY', 'APPROVE_LOCATE', 'VIEW_REPORT'])
    ),
    lastLogin: faker.date.recent().toISOString(),
    createdAt: faker.date.past().toISOString(),
    ...overrides
  };
}

// Pre-defined mock objects for common test scenarios
export const mockSecurities = {
  apple: createMockSecurity({
    internalId: 'SEC-EQ-001',
    securityType: 'EQUITY',
    issuer: 'Apple Inc.',
    description: 'Apple Inc. Common Stock',
    currency: 'USD',
    market: 'US',
    exchange: 'NASDAQ',
    primaryIdentifierType: 'ISIN',
    primaryIdentifierValue: 'US0378331005'
  }),
  microsoft: createMockSecurity({
    internalId: 'SEC-EQ-002',
    securityType: 'EQUITY',
    issuer: 'Microsoft Corporation',
    description: 'Microsoft Corporation Common Stock',
    currency: 'USD',
    market: 'US',
    exchange: 'NASDAQ',
    primaryIdentifierType: 'ISIN',
    primaryIdentifierValue: 'US5949181045'
  }),
  tesla: createMockSecurity({
    internalId: 'SEC-EQ-003',
    securityType: 'EQUITY',
    issuer: 'Tesla, Inc.',
    description: 'Tesla, Inc. Common Stock',
    currency: 'USD',
    market: 'US',
    exchange: 'NASDAQ',
    primaryIdentifierType: 'ISIN',
    primaryIdentifierValue: 'US88160R1014'
  }),
  spyEtf: createMockSecurity({
    internalId: 'SEC-ETF-001',
    securityType: 'ETF',
    issuer: 'State Street Global Advisors',
    description: 'S&P 500 ETF Trust',
    currency: 'USD',
    market: 'US',
    exchange: 'NYSE',
    isBasketProduct: true,
    basketType: 'ETF',
    primaryIdentifierType: 'ISIN',
    primaryIdentifierValue: 'US78462F1030'
  }),
  usTreasury: createMockSecurity({
    internalId: 'SEC-BD-001',
    securityType: 'BOND',
    issuer: 'US Treasury',
    description: 'US Treasury 10Y Note',
    currency: 'USD',
    market: 'US',
    exchange: 'OTC',
    primaryIdentifierType: 'ISIN',
    primaryIdentifierValue: 'US912828N600'
  })
};

export const mockPositions = {
  appleEquityLong: createMockPosition({
    id: 'POS-00001',
    bookId: 'EQUITY-01',
    security: { internalId: 'SEC-EQ-001' },
    counterparty: { counterpartyId: 'CP-00001' },
    contractualQty: 12500,
    settledQty: 10000,
    sd0Receipt: 2500,
    currentNetPosition: 10000,
    projectedNetPosition: 12500
  }),
  microsoftEquityLong: createMockPosition({
    id: 'POS-00002',
    bookId: 'EQUITY-01',
    security: { internalId: 'SEC-EQ-002' },
    counterparty: { counterpartyId: 'CP-00001' },
    contractualQty: 4000,
    settledQty: 5000,
    sd0Deliver: 1000,
    currentNetPosition: 5000,
    projectedNetPosition: 4000
  }),
  teslaEquityShort: createMockPosition({
    id: 'POS-00003',
    bookId: 'EQUITY-02',
    security: { internalId: 'SEC-EQ-003' },
    counterparty: { counterpartyId: 'CP-00002' },
    contractualQty: -1500,
    settledQty: -2000,
    sd0Receipt: 500,
    currentNetPosition: -2000,
    projectedNetPosition: -1500,
    isHypothecatable: false
  }),
  spyEtfLong: createMockPosition({
    id: 'POS-00007',
    bookId: 'ETF-01',
    security: { internalId: 'SEC-ETF-001' },
    counterparty: { counterpartyId: 'CP-00005' },
    contractualQty: 7500,
    settledQty: 7500,
    currentNetPosition: 7500,
    projectedNetPosition: 7500
  })
};

export const mockCounterparties = {
  abcCapital: createMockCounterparty({
    id: 1,
    counterpartyId: 'CP-00001',
    name: 'ABC Capital Partners',
    shortName: 'ABC Capital',
    type: 'INSTITUTIONAL',
    category: 'INVESTMENT_BANK'
  }),
  xyzFund: createMockCounterparty({
    id: 2,
    counterpartyId: 'CP-00002',
    name: 'XYZ Investment Fund',
    shortName: 'XYZ Fund',
    type: 'HEDGE_FUND',
    category: 'ASSET_MANAGER'
  }),
  globalAm: createMockCounterparty({
    id: 3,
    counterpartyId: 'CP-00003',
    name: 'Global Asset Management',
    shortName: 'Global AM',
    type: 'ASSET_MANAGER',
    category: 'ASSET_MANAGER'
  })
};

export const mockLocates = {
  appleLong: createMockLocateRequest({
    id: 1,
    requestId: 'LOC-20230615-00001',
    security: {
      internalId: 'SEC-EQ-001',
      description: 'Apple Inc. Common Stock'
    },
    requestor: {
      counterpartyId: 'CP-00001',
      name: 'ABC Capital Partners'
    },
    client: {
      counterpartyId: 'CP-00001',
      name: 'ABC Capital Partners'
    },
    locateType: 'SHORT_SELL',
    requestedQuantity: 5000,
    status: 'APPROVED'
  }),
  teslaShort: createMockLocateRequest({
    id: 2,
    requestId: 'LOC-20230615-00002',
    security: {
      internalId: 'SEC-EQ-003',
      description: 'Tesla, Inc. Common Stock'
    },
    requestor: {
      counterpartyId: 'CP-00002',
      name: 'XYZ Investment Fund'
    },
    client: {
      counterpartyId: 'CP-00002',
      name: 'XYZ Investment Fund'
    },
    locateType: 'SHORT_SELL',
    requestedQuantity: 2500,
    status: 'PENDING'
  }),
  microsoftRejected: createMockLocateRequest({
    id: 3,
    requestId: 'LOC-20230615-00003',
    security: {
      internalId: 'SEC-EQ-002',
      description: 'Microsoft Corporation Common Stock'
    },
    requestor: {
      counterpartyId: 'CP-00003',
      name: 'Global Asset Management'
    },
    client: {
      counterpartyId: 'CP-00003',
      name: 'Global Asset Management'
    },
    locateType: 'SHORT_SELL',
    requestedQuantity: 10000,
    status: 'REJECTED'
  })
};

export const mockOrders = {
  appleBuy: createMockOrder({
    id: 1,
    orderId: 'ORD-00000001',
    orderType: 'BUY',
    securityId: 'SEC-EQ-001',
    security: {
      internalId: 'SEC-EQ-001',
      description: 'Apple Inc. Common Stock'
    },
    clientId: 'CP-00001',
    client: {
      counterpartyId: 'CP-00001',
      name: 'ABC Capital Partners'
    },
    side: 'BUY',
    quantity: 5000,
    price: 150.25,
    status: 'NEW'
  }),
  teslaSell: createMockOrder({
    id: 2,
    orderId: 'ORD-00000002',
    orderType: 'SHORT_SELL',
    securityId: 'SEC-EQ-003',
    security: {
      internalId: 'SEC-EQ-003',
      description: 'Tesla, Inc. Common Stock'
    },
    clientId: 'CP-00002',
    client: {
      counterpartyId: 'CP-00002',
      name: 'XYZ Investment Fund'
    },
    side: 'SELL',
    quantity: 2500,
    price: 225.75,
    status: 'NEW'
  }),
  microsoftLongSell: createMockOrder({
    id: 3,
    orderId: 'ORD-00000003',
    orderType: 'LONG_SELL',
    securityId: 'SEC-EQ-002',
    security: {
      internalId: 'SEC-EQ-002',
      description: 'Microsoft Corporation Common Stock'
    },
    clientId: 'CP-00003',
    client: {
      counterpartyId: 'CP-00003',
      name: 'Global Asset Management'
    },
    side: 'SELL',
    quantity: 3000,
    price: 325.50,
    status: 'FILLED'
  })
};

export const mockInventories = {
  appleForLoan: createMockInventory({
    id: 'INV-FL-00001',
    security: { internalId: 'SEC-EQ-001' },
    counterparty: { counterpartyId: 'CP-00001' },
    calculationType: 'FOR_LOAN',
    grossQuantity: 12500,
    availableQuantity: 10000,
    reservedQuantity: 1000,
    decrementQuantity: 1500,
    securityTemperature: 'GC',
    borrowRate: 0.25
  }),
  teslaForLoan: createMockInventory({
    id: 'INV-FL-00002',
    security: { internalId: 'SEC-EQ-003' },
    counterparty: { counterpartyId: 'CP-00002' },
    calculationType: 'FOR_LOAN',
    grossQuantity: 5000,
    availableQuantity: 2000,
    reservedQuantity: 1000,
    decrementQuantity: 2000,
    securityTemperature: 'HTB',
    borrowRate: 1.75
  }),
  microsoftLocate: createMockInventory({
    id: 'INV-LOC-00001',
    security: { internalId: 'SEC-EQ-002' },
    counterparty: { counterpartyId: 'CP-00001' },
    calculationType: 'LOCATE',
    grossQuantity: 8000,
    availableQuantity: 6000,
    reservedQuantity: 1000,
    decrementQuantity: 1000,
    securityTemperature: 'GC',
    borrowRate: 0.35
  })
};

export const mockEvents = {
  securityCreated: createMockReferenceDataEvent({
    security: mockSecurities.apple
  }),
  positionUpdated: createMockPositionEvent({
    position: mockPositions.appleEquityLong
  }),
  locateRequested: createMockLocateEvent({
    locate: mockLocates.appleLong
  }),
  inventoryCalculated: createMockInventoryEvent({
    inventory: mockInventories.appleForLoan
  }),
  orderSubmitted: createMockTradeDataEvent({
    order: mockOrders.appleBuy
  })
};

export const mockUsers = {
  admin: createMockUser({
    username: 'admin.user',
    email: 'admin.user@example.com',
    firstName: 'Admin',
    lastName: 'User',
    displayName: 'Admin User',
    role: 'ADMIN',
    department: 'IT',
    permissions: ['READ_POSITION', 'WRITE_POSITION', 'READ_INVENTORY', 'APPROVE_LOCATE', 'VIEW_REPORT']
  }),
  trader: createMockUser({
    username: 'john.trader',
    email: 'john.trader@example.com',
    firstName: 'John',
    lastName: 'Trader',
    displayName: 'John Trader',
    role: 'TRADER',
    department: 'TRADING',
    permissions: ['READ_POSITION', 'READ_INVENTORY', 'VIEW_REPORT']
  }),
  operations: createMockUser({
    username: 'sarah.ops',
    email: 'sarah.ops@example.com',
    firstName: 'Sarah',
    lastName: 'Operations',
    displayName: 'Sarah Operations',
    role: 'OPERATIONS',
    department: 'OPERATIONS',
    permissions: ['READ_POSITION', 'WRITE_POSITION', 'READ_INVENTORY', 'APPROVE_LOCATE']
  })
};

// Re-export imported fixtures
export { securities, positions, counterparties, locates, orders, inventories };