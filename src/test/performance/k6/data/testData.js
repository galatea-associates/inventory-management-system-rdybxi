import { 
    generateRandomSecurityId, 
    generateRandomCounterpartyId, 
    generateRandomQuantity, 
    generateUUID, 
    formatDate 
} from '../lib/helpers.js'; // Import helpers for generating test data
import crypto from 'k6/crypto'; // k6 version: latest
import { exec } from 'k6/execution'; // k6 version: latest

// Predefined securities data for testing
export const SECURITIES = [
    { id: 'AAPL', securityType: 'EQUITY', issuer: 'Apple Inc.', market: 'US', status: 'ACTIVE' },
    { id: 'MSFT', securityType: 'EQUITY', issuer: 'Microsoft Corporation', market: 'US', status: 'ACTIVE' },
    { id: 'GOOGL', securityType: 'EQUITY', issuer: 'Alphabet Inc.', market: 'US', status: 'ACTIVE' },
    { id: 'AMZN', securityType: 'EQUITY', issuer: 'Amazon.com Inc.', market: 'US', status: 'ACTIVE' },
    { id: 'TSLA', securityType: 'EQUITY', issuer: 'Tesla Inc.', market: 'US', status: 'ACTIVE' },
    { id: 'FB', securityType: 'EQUITY', issuer: 'Meta Platforms Inc.', market: 'US', status: 'ACTIVE' },
    { id: 'NFLX', securityType: 'EQUITY', issuer: 'Netflix Inc.', market: 'US', status: 'ACTIVE' },
    { id: '7974.T', securityType: 'EQUITY', issuer: 'Nintendo Co., Ltd.', market: 'JP', status: 'ACTIVE' },
    { id: '9984.T', securityType: 'EQUITY', issuer: 'SoftBank Group Corp.', market: 'JP', status: 'ACTIVE' },
    { id: '6758.T', securityType: 'EQUITY', issuer: 'Sony Group Corporation', market: 'JP', status: 'ACTIVE' },
    { id: 'VOD.L', securityType: 'EQUITY', issuer: 'Vodafone Group Plc', market: 'UK', status: 'ACTIVE' },
    { id: 'HSBA.L', securityType: 'EQUITY', issuer: 'HSBC Holdings plc', market: 'UK', status: 'ACTIVE' },
    { id: 'SPY', securityType: 'ETF', issuer: 'State Street Corporation', market: 'US', status: 'ACTIVE' },
    { id: 'QQQ', securityType: 'ETF', issuer: 'Invesco', market: 'US', status: 'ACTIVE' },
    { id: 'IWM', securityType: 'ETF', issuer: 'BlackRock', market: 'US', status: 'ACTIVE' },
    { id: 'US912810TD00', securityType: 'BOND', issuer: 'US Treasury', market: 'US', status: 'ACTIVE' },
    { id: 'DE0001102580', securityType: 'BOND', issuer: 'German Government', market: 'DE', status: 'ACTIVE' },
    { id: 'GB00B6460505', securityType: 'BOND', issuer: 'UK Government', market: 'UK', status: 'ACTIVE' },
    { id: '2330.TW', securityType: 'EQUITY', issuer: 'Taiwan Semiconductor', market: 'TW', status: 'ACTIVE' },
    { id: '0700.HK', securityType: 'EQUITY', issuer: 'Tencent Holdings Ltd.', market: 'HK', status: 'ACTIVE' }
];

// Predefined counterparties for testing
export const COUNTERPARTIES = [
    { id: 'CP-ABF001', name: 'ABC Financial', type: 'BANK', status: 'ACTIVE' },
    { id: 'CP-GSI001', name: 'Global Securities Inc.', type: 'BROKER', status: 'ACTIVE' },
    { id: 'CP-JPM001', name: 'JP Morgan Asset Management', type: 'ASSET_MANAGER', status: 'ACTIVE' },
    { id: 'CP-BLK001', name: 'BlackRock Advisors', type: 'ASSET_MANAGER', status: 'ACTIVE' },
    { id: 'CP-FID001', name: 'Fidelity Investments', type: 'ASSET_MANAGER', status: 'ACTIVE' },
    { id: 'CP-VGD001', name: 'Vanguard Group', type: 'ASSET_MANAGER', status: 'ACTIVE' },
    { id: 'CP-CIT001', name: 'Citi Global Markets', type: 'BANK', status: 'ACTIVE' },
    { id: 'CP-GS001', name: 'Goldman Sachs', type: 'BANK', status: 'ACTIVE' },
    { id: 'CP-MS001', name: 'Morgan Stanley', type: 'BANK', status: 'ACTIVE' },
    { id: 'CP-DBK001', name: 'Deutsche Bank AG', type: 'BANK', status: 'ACTIVE' },
    { id: 'CP-UBS001', name: 'UBS Group AG', type: 'BANK', status: 'ACTIVE' },
    { id: 'CP-CS001', name: 'Credit Suisse', type: 'BANK', status: 'ACTIVE' },
    { id: 'CP-HSBC01', name: 'HSBC Holdings', type: 'BANK', status: 'ACTIVE' },
    { id: 'CP-BNP001', name: 'BNP Paribas', type: 'BANK', status: 'ACTIVE' },
    { id: 'CP-BARC01', name: 'Barclays', type: 'BANK', status: 'ACTIVE' }
];

// Predefined aggregation units for testing
export const AGGREGATION_UNITS = [
    { id: 'AU-US-EQ1', name: 'US Equities Unit 1', market: 'US', type: 'EQUITY' },
    { id: 'AU-US-EQ2', name: 'US Equities Unit 2', market: 'US', type: 'EQUITY' },
    { id: 'AU-EU-EQ1', name: 'EU Equities Unit 1', market: 'EU', type: 'EQUITY' },
    { id: 'AU-JP-EQ1', name: 'Japan Equities Unit', market: 'JP', type: 'EQUITY' },
    { id: 'AU-ASIA1', name: 'Asia Pacific Unit', market: 'APAC', type: 'EQUITY' },
    { id: 'AU-US-FI1', name: 'US Fixed Income Unit', market: 'US', type: 'FIXED_INCOME' },
    { id: 'AU-EU-FI1', name: 'EU Fixed Income Unit', market: 'EU', type: 'FIXED_INCOME' },
    { id: 'AU-US-ETF', name: 'US ETF Unit', market: 'US', type: 'ETF' },
    { id: 'AU-GL-ETF', name: 'Global ETF Unit', market: 'GLOBAL', type: 'ETF' },
    { id: 'AU-GL-FX1', name: 'Global FX Unit', market: 'GLOBAL', type: 'FX' }
];

// Predefined books for testing
export const BOOKS = [
    { id: 'BOOK-EQ-01', name: 'Equity Trading 1', type: 'TRADING' },
    { id: 'BOOK-EQ-02', name: 'Equity Trading 2', type: 'TRADING' },
    { id: 'BOOK-FI-01', name: 'Fixed Income 1', type: 'TRADING' },
    { id: 'BOOK-FI-02', name: 'Fixed Income 2', type: 'TRADING' },
    { id: 'BOOK-ETF-01', name: 'ETF Trading', type: 'TRADING' },
    { id: 'BOOK-PROP-01', name: 'Proprietary 1', type: 'PROPRIETARY' },
    { id: 'BOOK-PROP-02', name: 'Proprietary 2', type: 'PROPRIETARY' },
    { id: 'BOOK-CLIENT-01', name: 'Client Book 1', type: 'CLIENT' },
    { id: 'BOOK-CLIENT-02', name: 'Client Book 2', type: 'CLIENT' },
    { id: 'BOOK-HEDGE-01', name: 'Hedge Book', type: 'HEDGING' }
];

/**
 * Returns a predefined test data set for a specific scenario
 * @param {string} scenarioName - The scenario to get test data for
 * @returns {object} Test data set specific to the requested scenario
 */
export function getTestDataSet(scenarioName) {
    switch (scenarioName) {
        case 'locateApproval':
            return {
                securities: SECURITIES.slice(0, 10),
                counterparties: COUNTERPARTIES.slice(0, 5),
                locateRequests: [
                    {
                        requestId: generateUUID(),
                        securityId: SECURITIES[0].id,
                        clientId: COUNTERPARTIES[0].id,
                        requestedQuantity: 5000,
                        requestTimestamp: new Date().toISOString(),
                        locateType: 'SHORT_SELL',
                        swapCashIndicator: 'CASH'
                    },
                    {
                        requestId: generateUUID(),
                        securityId: SECURITIES[1].id,
                        clientId: COUNTERPARTIES[1].id,
                        requestedQuantity: 10000,
                        requestTimestamp: new Date().toISOString(),
                        locateType: 'SHORT_SELL',
                        swapCashIndicator: 'SWAP'
                    }
                ]
            };

        case 'shortSellValidation':
            return {
                securities: SECURITIES.slice(0, 10),
                counterparties: COUNTERPARTIES.slice(0, 5),
                aggregationUnits: AGGREGATION_UNITS.slice(0, 3),
                orders: [
                    {
                        orderId: generateUUID(),
                        securityId: SECURITIES[0].id,
                        counterpartyId: COUNTERPARTIES[0].id,
                        aggregationUnitId: AGGREGATION_UNITS[0].id,
                        quantity: 5000,
                        side: 'SELL_SHORT',
                        price: 150.25,
                        orderDate: formatDate(new Date())
                    },
                    {
                        orderId: generateUUID(),
                        securityId: SECURITIES[1].id,
                        counterpartyId: COUNTERPARTIES[1].id,
                        aggregationUnitId: AGGREGATION_UNITS[0].id,
                        quantity: 10000,
                        side: 'SELL_SHORT',
                        price: 285.75,
                        orderDate: formatDate(new Date())
                    }
                ]
            };

        case 'positionCalculation':
            return {
                securities: SECURITIES.slice(0, 10),
                books: BOOKS.slice(0, 5),
                positions: [
                    {
                        bookId: BOOKS[0].id,
                        securityId: SECURITIES[0].id,
                        businessDate: formatDate(new Date()),
                        contractualQty: 15000,
                        settledQty: 12000,
                        sd0Deliver: 0,
                        sd0Receipt: 3000,
                        sd1Deliver: 1000,
                        sd1Receipt: 0,
                        sd2Deliver: 0,
                        sd2Receipt: 2000
                    },
                    {
                        bookId: BOOKS[1].id,
                        securityId: SECURITIES[1].id,
                        businessDate: formatDate(new Date()),
                        contractualQty: -8000,
                        settledQty: -5000,
                        sd0Deliver: 3000,
                        sd0Receipt: 0,
                        sd1Deliver: 0,
                        sd1Receipt: 0,
                        sd2Deliver: 0,
                        sd2Receipt: 0
                    }
                ]
            };

        case 'inventoryCalculation':
            return {
                securities: SECURITIES.slice(0, 10),
                inventory: [
                    {
                        securityId: SECURITIES[0].id,
                        calculationType: 'FOR_LOAN',
                        businessDate: formatDate(new Date()),
                        longPositions: 25000,
                        hypothecatable: 18000,
                        pledged: 5000,
                        external: 8000,
                        total: 56000
                    },
                    {
                        securityId: SECURITIES[1].id,
                        calculationType: 'FOR_LOAN',
                        businessDate: formatDate(new Date()),
                        longPositions: 15000,
                        hypothecatable: 12000,
                        pledged: 3000,
                        external: 5000,
                        total: 35000
                    }
                ]
            };

        case 'dataIngestion':
            return {
                referenceData: SECURITIES.slice(0, 5).map(sec => ({
                    ...sec,
                    externalIds: [
                        { type: 'BLOOMBERG', value: `${sec.id} BB` },
                        { type: 'REUTERS', value: `${sec.id}.RTR` }
                    ],
                    attributes: {
                        currencyCode: sec.market === 'US' ? 'USD' : sec.market === 'JP' ? 'JPY' : 'EUR',
                        issueDate: '2010-01-01',
                        maturityDate: sec.securityType === 'BOND' ? '2030-01-01' : null
                    }
                })),
                marketData: SECURITIES.slice(0, 5).map(sec => ({
                    securityId: sec.id,
                    price: Math.random() * 1000 + 10,
                    source: 'REUTERS',
                    timestamp: new Date().toISOString(),
                    currency: sec.market === 'US' ? 'USD' : sec.market === 'JP' ? 'JPY' : 'EUR'
                })),
                tradeData: [
                    {
                        tradeId: generateUUID(),
                        securityId: SECURITIES[0].id,
                        counterpartyId: COUNTERPARTIES[0].id,
                        quantity: 5000,
                        price: 150.25,
                        tradeDate: formatDate(new Date()),
                        settlementDate: formatDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))
                    },
                    {
                        tradeId: generateUUID(),
                        securityId: SECURITIES[1].id,
                        counterpartyId: COUNTERPARTIES[1].id,
                        quantity: -8000,
                        price: 285.75,
                        tradeDate: formatDate(new Date()),
                        settlementDate: formatDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))
                    }
                ]
            };

        case 'apiLoad':
            // Generic data set with mixed data types
            return {
                securities: SECURITIES,
                counterparties: COUNTERPARTIES,
                aggregationUnits: AGGREGATION_UNITS,
                books: BOOKS,
                positions: [
                    {
                        bookId: BOOKS[0].id,
                        securityId: SECURITIES[0].id,
                        businessDate: formatDate(new Date()),
                        contractualQty: 15000,
                        settledQty: 12000
                    }
                ],
                locateRequests: [
                    {
                        requestId: generateUUID(),
                        securityId: SECURITIES[0].id,
                        clientId: COUNTERPARTIES[0].id,
                        requestedQuantity: 5000,
                        requestTimestamp: new Date().toISOString(),
                        locateType: 'SHORT_SELL',
                        swapCashIndicator: 'CASH'
                    }
                ],
                orders: [
                    {
                        orderId: generateUUID(),
                        securityId: SECURITIES[0].id,
                        counterpartyId: COUNTERPARTIES[0].id,
                        aggregationUnitId: AGGREGATION_UNITS[0].id,
                        quantity: 5000,
                        side: 'SELL_SHORT',
                        price: 150.25,
                        orderDate: formatDate(new Date())
                    }
                ]
            };

        default:
            // Return a default dataset with basic elements
            return {
                securities: SECURITIES.slice(0, 5),
                counterparties: COUNTERPARTIES.slice(0, 3),
                aggregationUnits: AGGREGATION_UNITS.slice(0, 2),
                books: BOOKS.slice(0, 2)
            };
    }
}

/**
 * Generates a batch of locate requests for testing
 * @param {number} count - Number of locate requests to generate
 * @param {object} options - Options for generating locate requests
 * @returns {array} Array of locate request objects
 */
export function generateLocateRequestBatch(count, options = {}) {
    const locateRequests = [];
    const securities = options.securities || SECURITIES;
    const counterparties = options.counterparties || COUNTERPARTIES;
    const quantityRange = options.quantityRange || { min: 1000, max: 50000 };
    
    for (let i = 0; i < count; i++) {
        const security = getRandomElement(securities);
        const counterparty = getRandomElement(counterparties);
        
        locateRequests.push({
            requestId: generateUUID(),
            securityId: security.id || security,
            clientId: counterparty.id || counterparty,
            requestedQuantity: generateRandomQuantity(quantityRange.min, quantityRange.max),
            requestTimestamp: new Date().toISOString(),
            locateType: Math.random() > 0.1 ? 'SHORT_SELL' : 'BORROW',
            swapCashIndicator: Math.random() > 0.5 ? 'SWAP' : 'CASH',
            ...(options.additionalProps || {})
        });
    }
    
    return locateRequests;
}

/**
 * Generates a batch of short sell requests for testing
 * @param {number} count - Number of short sell requests to generate
 * @param {object} options - Options for generating short sell requests
 * @returns {array} Array of short sell request objects
 */
export function generateShortSellRequestBatch(count, options = {}) {
    const shortSellRequests = [];
    const securities = options.securities || SECURITIES;
    const counterparties = options.counterparties || COUNTERPARTIES;
    const aggregationUnits = options.aggregationUnits || AGGREGATION_UNITS;
    const quantityRange = options.quantityRange || { min: 1000, max: 50000 };
    
    for (let i = 0; i < count; i++) {
        const security = getRandomElement(securities);
        const counterparty = getRandomElement(counterparties);
        const aggregationUnit = getRandomElement(aggregationUnits);
        
        shortSellRequests.push({
            orderId: generateUUID(),
            securityId: security.id || security,
            counterpartyId: counterparty.id || counterparty,
            aggregationUnitId: aggregationUnit.id || aggregationUnit,
            quantity: generateRandomQuantity(quantityRange.min, quantityRange.max),
            side: 'SELL_SHORT',
            price: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
            orderDate: formatDate(new Date()),
            ...(options.additionalProps || {})
        });
    }
    
    return shortSellRequests;
}

/**
 * Generates a batch of position data for testing
 * @param {number} count - Number of position data records to generate
 * @param {object} options - Options for generating position data
 * @returns {array} Array of position data objects
 */
export function generatePositionDataBatch(count, options = {}) {
    const positionData = [];
    const securities = options.securities || SECURITIES;
    const books = options.books || BOOKS;
    const businessDate = options.businessDate || formatDate(new Date());
    
    for (let i = 0; i < count; i++) {
        const security = getRandomElement(securities);
        const book = getRandomElement(books);
        const isShort = Math.random() > 0.7; // 30% chance of short position
        
        // Generate base quantities
        const sodQty = isShort 
            ? -generateRandomQuantity(1000, 30000) 
            : generateRandomQuantity(1000, 50000);
        
        // Create random intraday activity
        const intradayChange = generateRandomQuantity(0, 5000) * (Math.random() > 0.5 ? 1 : -1);
        const currentQty = sodQty + intradayChange;
        
        // Calculate settled and unsettled amounts
        const settledPercent = Math.random() * 0.8 + 0.1; // between 10% and 90%
        const settledQty = Math.round(currentQty * settledPercent);
        
        // Create random settlement ladder
        const sd0Receive = Math.random() > 0.7 ? generateRandomQuantity(0, 5000) : 0;
        const sd0Deliver = Math.random() > 0.7 ? generateRandomQuantity(0, 5000) : 0;
        const sd1Receive = Math.random() > 0.6 ? generateRandomQuantity(0, 3000) : 0;
        const sd1Deliver = Math.random() > 0.6 ? generateRandomQuantity(0, 3000) : 0;
        const sd2Receive = Math.random() > 0.5 ? generateRandomQuantity(0, 2000) : 0;
        const sd2Deliver = Math.random() > 0.5 ? generateRandomQuantity(0, 2000) : 0;
        
        positionData.push({
            bookId: book.id || book,
            securityId: security.id || security,
            businessDate: businessDate,
            contractualQty: currentQty,
            settledQty: settledQty,
            sd0Deliver: sd0Deliver,
            sd0Receipt: sd0Receive,
            sd1Deliver: sd1Deliver,
            sd1Receipt: sd1Receive,
            sd2Deliver: sd2Deliver,
            sd2Receipt: sd2Receive,
            ...(options.additionalProps || {})
        });
    }
    
    return positionData;
}

/**
 * Generates a batch of inventory data for testing
 * @param {number} count - Number of inventory data records to generate
 * @param {object} options - Options for generating inventory data
 * @returns {array} Array of inventory data objects
 */
export function generateInventoryDataBatch(count, options = {}) {
    const inventoryData = [];
    const securities = options.securities || SECURITIES;
    const calculationTypes = options.calculationTypes || ['FOR_LOAN', 'FOR_PLEDGE'];
    const businessDate = options.businessDate || formatDate(new Date());
    
    for (let i = 0; i < count; i++) {
        const security = getRandomElement(securities);
        const calculationType = getRandomElement(calculationTypes);
        
        // Generate random quantities for different inventory categories
        const longPositions = generateRandomQuantity(10000, 100000);
        const hypothecatable = generateRandomQuantity(5000, 50000);
        const pledged = generateRandomQuantity(1000, 20000);
        const external = generateRandomQuantity(0, 30000);
        const reserved = generateRandomQuantity(0, 5000);
        const total = longPositions + hypothecatable + pledged + external - reserved;
        
        inventoryData.push({
            securityId: security.id || security,
            calculationType: calculationType,
            businessDate: businessDate,
            longPositions: longPositions,
            hypothecatable: hypothecatable,
            pledged: pledged,
            external: external,
            reserved: reserved,
            total: total,
            ...(options.additionalProps || {})
        });
    }
    
    return inventoryData;
}

/**
 * Generates a batch of reference data for testing
 * @param {number} count - Number of reference data records to generate
 * @param {object} options - Options for generating reference data
 * @returns {array} Array of reference data objects
 */
export function generateReferenceDataBatch(count, options = {}) {
    const referenceData = [];
    const markets = ['US', 'UK', 'JP', 'EU', 'HK', 'TW'];
    const securityTypes = ['EQUITY', 'BOND', 'ETF', 'INDEX'];
    const statuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    
    for (let i = 0; i < count; i++) {
        const securityId = generateRandomSecurityId();
        const securityType = getRandomElement(securityTypes);
        const market = getRandomElement(markets);
        const status = Math.random() > 0.9 ? getRandomElement(['INACTIVE', 'SUSPENDED']) : 'ACTIVE';
        
        // Generate common attributes
        const referenceEntry = {
            id: securityId,
            securityType: securityType,
            issuer: `Test Issuer ${i}`,
            market: market,
            status: status,
            externalIds: [
                { type: 'BLOOMBERG', value: `${securityId} BB` },
                { type: 'REUTERS', value: `${securityId}.RTR` }
            ],
            attributes: {
                currencyCode: market === 'US' ? 'USD' : market === 'UK' ? 'GBP' : market === 'JP' ? 'JPY' : 'EUR',
                issueDate: '2015-01-01',
                maturityDate: securityType === 'BOND' ? '2030-01-01' : null
            }
        };
        
        // Add security-type specific attributes
        if (securityType === 'EQUITY') {
            referenceEntry.attributes.isin = `US${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`;
            referenceEntry.attributes.primaryExchange = market === 'US' ? 'NYSE' : market === 'UK' ? 'LSE' : 'TSE';
        } else if (securityType === 'BOND') {
            referenceEntry.attributes.couponRate = (Math.random() * 5 + 1).toFixed(2);
            referenceEntry.attributes.couponFrequency = 'SEMI_ANNUAL';
        } else if (securityType === 'ETF') {
            referenceEntry.attributes.assetClass = getRandomElement(['EQUITY', 'FIXED_INCOME', 'MULTI_ASSET']);
            referenceEntry.attributes.managementCompany = getRandomElement(['BlackRock', 'Vanguard', 'State Street']);
        }
        
        referenceData.push({
            ...referenceEntry,
            ...(options.additionalProps || {})
        });
    }
    
    return referenceData;
}

/**
 * Generates a batch of market data for testing
 * @param {number} count - Number of market data records to generate
 * @param {object} options - Options for generating market data
 * @returns {array} Array of market data objects
 */
export function generateMarketDataBatch(count, options = {}) {
    const marketData = [];
    const securities = options.securities || SECURITIES;
    const sources = options.sources || ['REUTERS', 'BLOOMBERG', 'INTERACTIVE_DATA'];
    const timestamp = options.timestamp || new Date().toISOString();
    
    for (let i = 0; i < count; i++) {
        const security = getRandomElement(securities);
        const source = getRandomElement(sources);
        const basePrice = options.basePrice || (Math.random() * 1000 + 10);
        const variation = options.variation || 0.05; // 5% variation
        
        // Apply small random variation to create realistic price movements
        const price = parseFloat((basePrice * (1 + (Math.random() * variation * 2 - variation))).toFixed(2));
        
        marketData.push({
            securityId: security.id || security,
            price: price,
            source: source,
            timestamp: timestamp,
            currency: security.market === 'US' ? 'USD' : security.market === 'UK' ? 'GBP' : security.market === 'JP' ? 'JPY' : 'EUR',
            ...(options.additionalProps || {})
        });
    }
    
    return marketData;
}

/**
 * Returns a random element from an array
 * @param {array} array - Array to select from
 * @returns {*} Random element from the array
 */
export function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Returns a random subset of elements from an array
 * @param {array} array - Array to select from
 * @param {number} count - Number of elements to select
 * @returns {array} Random subset of the original array
 */
export function getRandomSubset(array, count) {
    // Create a copy of the array
    const shuffled = [...array];
    let currentIndex = shuffled.length;
    
    // Fisher-Yates shuffle algorithm
    while (currentIndex > 0) {
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }
    
    // Return the first 'count' elements
    return shuffled.slice(0, Math.min(count, shuffled.length));
}