import { faker } from '@faker-js/faker'; // v8.0.2
import dayjs from 'dayjs'; // v1.11.9
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { loadTestData } from '../testUtils';
import * as mockData from '../mockData';
import * as eventMocks from './eventMocks';
import {
  SECURITY_TYPES,
  POSITION_TYPES,
  CALCULATION_TYPES,
  LOCATE_STATUS,
  SECURITY_TEMPERATURE
} from '../constants';
import {
  createMockSecurity,
  createMockPosition,
  createMockInventory,
  createMockLocateRequest,
  securities,
  positions,
  inventories,
  locates
} from '../mockData';
import {
  createMockBaseEvent,
  createMockPositionEvent,
  createMockInventoryEvent,
  createMockLocateEvent,
  EVENT_TYPES
} from './eventMocks';
import { transform } from 'lodash'; // v4.17.21

/**
 * Creates a mock security with associated price history data
 * @param overrides Properties to override default random values
 * @param historyDays 
 * @returns A mock security with price history array
 */
export function createMockSecurityWithPriceHistory(overrides: any = {}, historyDays: number = 30): any {
  // Create a base security using createMockSecurity
  const security = createMockSecurity(overrides);

  // Generate price history for the specified number of days
  security.priceHistory = Array.from({ length: historyDays }, (_, i) => {
    const date = dayjs().subtract(i, 'days').toISOString();
    const priceMovement = faker.number.float({ min: -10, max: 10 }); // Realistic price movement
    const price = faker.number.float({ min: 50, max: 200 }) + priceMovement;
    
    return {
      date,
      price: parseFloat(price.toFixed(2))
    };
  });

  // Return the security object with added priceHistory array
  return security;
}

/**
 * Creates a mock position with detailed settlement ladder data
 * @param overrides Properties to override default random values
 * @returns A mock position with settlement ladder details
 */
export function createMockPositionWithSettlementLadder(overrides: any = {}): any {
  // Create a base position using createMockPosition
  const position = createMockPosition(overrides);

  // Generate settlement ladder data for SD0 through SD4
  position.settlementLadder = {};
  for (let i = 0; i <= 4; i++) {
    const sdKey = `sd${i}`;
    position[`${sdKey}Deliver`] = faker.number.int({ min: 0, max: 1000 });
    position[`${sdKey}Receipt`] = faker.number.int({ min: 0, max: 1000 });
  }

  // Calculate projected position based on settlement ladder
  position.projectedNetPosition = position.contractualQty + 
    position.sd0Receipt - position.sd0Deliver +
    position.sd1Receipt - position.sd1Deliver +
    position.sd2Receipt - position.sd2Deliver +
    position.sd3Receipt - position.sd3Deliver +
    position.sd4Receipt - position.sd4Deliver;

  // Return the position with settlement ladder details
  return position;
}

/**
 * Creates a mock inventory with detailed category breakdown
 * @param overrides Properties to override default random values
 * @returns A mock inventory with category breakdown
 */
export function createMockInventoryWithBreakdown(overrides: any = {}): any {
  // Create a base inventory using createMockInventory
  const inventory = createMockInventory(overrides);

  // Generate breakdown of inventory by category (long positions, hypothecatable, etc.)
  inventory.categoryBreakdown = {
    longPositions: faker.number.int({ min: 0, max: inventory.availableQuantity }),
    hypothecatable: faker.number.int({ min: 0, max: inventory.availableQuantity }),
    repoPledged: faker.number.int({ min: 0, max: inventory.availableQuantity }),
    financingSwap: faker.number.int({ min: 0, max: inventory.availableQuantity }),
    externalExclusive: faker.number.int({ min: 0, max: inventory.availableQuantity })
  };

  // Ensure the sum of breakdown matches the total availability
  const breakdownSum = Object.values(inventory.categoryBreakdown).reduce((sum, qty) => sum + qty, 0);
  const adjustment = inventory.availableQuantity - breakdownSum;
  inventory.categoryBreakdown.longPositions += adjustment;

  // Return the inventory with category breakdown
  return inventory;
}

/**
 * Creates a mock locate request with approval/rejection history
 * @param overrides Properties to override default random values
 * @returns A mock locate request with history
 */
export function createMockLocateWithHistory(overrides: any = {}): any {
  // Create a base locate request using createMockLocateRequest
  const locateRequest = createMockLocateRequest(overrides);

  // Generate history entries for the locate request
  locateRequest.history = Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, (_, i) => ({
    timestamp: dayjs().subtract(i, 'hours').toISOString(),
    status: faker.helpers.arrayElement([LOCATE_STATUS.APPROVED, LOCATE_STATUS.REJECTED]),
    user: faker.person.fullName(),
    notes: faker.lorem.sentence()
  }));

  // Return the locate request with history array
  return locateRequest;
}

/**
 * Creates a mock position aggregation by specified dimension
 * @param positions 
 * @param aggregationDimension 
 * @returns Aggregated position data by the specified dimension
 */
export function createMockPositionAggregation(positions: any[], aggregationDimension: string): any {
  // Group the provided positions by the specified dimension
  const groupedPositions = transform(
    positions,
    (result, position) => {
      const key = position[aggregationDimension];
      (result[key] || (result[key] = [])).push(position);
    },
    {}
  );

  // Calculate aggregated quantities for each group
  const aggregatedPositions = Object.entries(groupedPositions).map(([key, group]: [string, any[]]) => {
    const totalContractualQty = group.reduce((sum, position) => sum + position.contractualQty, 0);
    const totalSettledQty = group.reduce((sum, position) => sum + position.settledQty, 0);

    return {
      [aggregationDimension]: key,
      totalContractualQty,
      totalSettledQty
    };
  });

  // Return the aggregated position data
  return aggregatedPositions;
}

/**
 * Creates a mock inventory aggregation by specified dimension
 * @param inventories 
 * @param aggregationDimension 
 * @returns Aggregated inventory data by the specified dimension
 */
export function createMockInventoryAggregation(inventories: any[], aggregationDimension: string): any {
  // Group the provided inventories by the specified dimension
  const groupedInventories = transform(
    inventories,
    (result, inventory) => {
      const key = inventory[aggregationDimension];
      (result[key] || (result[key] = [])).push(inventory);
    },
    {}
  );

  // Calculate aggregated availability for each group
  const aggregatedInventories = Object.entries(groupedInventories).map(([key, group]: [string, any[]]) => {
    const totalAvailableQuantity = group.reduce((sum, inventory) => sum + inventory.availableQuantity, 0);

    return {
      [aggregationDimension]: key,
      totalAvailableQuantity
    };
  });

  // Return the aggregated inventory data
  return aggregatedInventories;
}

/**
 * Creates a mock locate request aggregation by specified dimension
 * @param locates 
 * @param aggregationDimension 
 * @returns Aggregated locate request data by the specified dimension
 */
export function createMockLocateAggregation(locates: any[], aggregationDimension: string): any {
  // Group the provided locate requests by the specified dimension
  const groupedLocates = transform(
    locates,
    (result, locate) => {
      const key = locate[aggregationDimension];
      (result[key] || (result[key] = [])).push(locate);
    },
    {}
  );

  // Calculate aggregated quantities and counts for each group
  const aggregatedLocates = Object.entries(groupedLocates).map(([key, group]: [string, any[]]) => {
    const totalRequestedQuantity = group.reduce((sum, locate) => sum + locate.requestedQuantity, 0);
    const locateCount = group.length;

    return {
      [aggregationDimension]: key,
      totalRequestedQuantity,
      locateCount
    };
  });

  // Return the aggregated locate request data
  return aggregatedLocates;
}

/**
 * Creates a mock time series of position data for a security
 * @param securityId 
 * @param days 
 * @param overrides 
 * @returns Array of position data points over time
 */
export function createMockPositionTimeSeries(securityId: string, days: number, overrides: any = {}): any[] {
  // Generate a series of position data points for the specified number of days
  return Array.from({ length: days }, (_, i) => {
    const businessDate = dayjs().subtract(i, 'days').format('YYYY-MM-DD');
    const contractualQty = faker.number.int({ min: 1000, max: 10000 });

    // Create realistic position changes over time
    const positionChange = faker.number.int({ min: -500, max: 500 });
    const settledQty = contractualQty - positionChange;

    // Apply any provided overrides to the generated data
    return {
      securityId,
      businessDate,
      contractualQty,
      settledQty,
      ...overrides
    };
  });
}

/**
 * Creates a mock time series of inventory data for a security
 * @param securityId 
 * @param calculationType 
 * @param days 
 * @param overrides 
 * @returns Array of inventory data points over time
 */
export function createMockInventoryTimeSeries(securityId: string, calculationType: string, days: number, overrides: any = {}): any[] {
  // Generate a series of inventory data points for the specified number of days
  return Array.from({ length: days }, (_, i) => {
    const businessDate = dayjs().subtract(i, 'days').format('YYYY-MM-DD');
    const availableQuantity = faker.number.int({ min: 1000, max: 10000 });

    // Create realistic inventory changes over time
    const inventoryChange = faker.number.int({ min: -200, max: 200 });
    const grossQuantity = availableQuantity + inventoryChange;

    // Apply any provided overrides to the generated data
    return {
      securityId,
      calculationType,
      businessDate,
      availableQuantity,
      grossQuantity,
      ...overrides
    };
  });
}

/**
 * Creates a sequence of related events for testing event processing
 * @param sequenceType 
 * @param baseData 
 * @param count 
 * @returns Array of related events in sequence
 */
export function createMockEventSequence(sequenceType: string, baseData: any, count: number): any[] {
  const events = [];

  // Based on sequenceType, determine the type of event sequence to create
  switch (sequenceType) {
    case 'positionUpdates':
      // Generate a series of position update events
      for (let i = 0; i < count; i++) {
        const position = { ...baseData, quantity: i * 100 };
        const event = createMockPositionEvent(EVENT_TYPES.POSITION.UPDATED, { position });
        events.push(event);
      }
      break;
    case 'locateRequests':
      // Generate a series of locate request events
      for (let i = 0; i < count; i++) {
        const locate = { ...baseData, quantity: i * 50 };
        const event = createMockLocateEvent(EVENT_TYPES.LOCATE.REQUESTED, { locate });
        events.push(event);
      }
      break;
    default:
      // Default to a generic event sequence
      for (let i = 0; i < count; i++) {
        const event = createMockBaseEvent({ payload: { index: i } });
        events.push(event);
      }
  }

  // Ensure events have appropriate timestamps and sequential ordering
  events.forEach((event, index) => {
    event.metadata.eventTime = dayjs().add(index, 'seconds').toISOString();
    event.metadata.correlationId = baseData.correlationId || uuidv4();
  });

  // Return the array of events in the sequence
  return events;
}

/**
 * Creates a mock calculation input and expected output for testing
 * @param calculationType 
 * @param overrides 
 * @returns Object containing input data and expected output
 */
export function createMockCalculationInputOutput(calculationType: string, overrides: any = {}): any {
  let inputData: any;
  let expectedOutput: any;

  // Based on calculationType, generate appropriate input data
  switch (calculationType) {
    case 'forLoanAvailability':
      inputData = {
        securityId: `SEC-${uuidv4().substring(0, 8)}`,
        positions: createMockPositions(5),
        marketData: { price: 120.50 }
      };
      expectedOutput = {
        availableQuantity: 5000,
        calculationType: 'forLoanAvailability'
      };
      break;
    case 'shortSellLimits':
      inputData = {
        clientId: `CP-${uuidv4().substring(0, 8)}`,
        positions: createMockPositions(3),
        locateData: createMockLocateRequests(2)
      };
      expectedOutput = {
        shortSellLimit: 2000,
        calculationType: 'shortSellLimits'
      };
      break;
    default:
      inputData = { message: 'No input data defined for this calculation type' };
      expectedOutput = { message: 'No expected output defined for this calculation type' };
  }

  // Apply any provided overrides to the input and output
  inputData = { ...inputData, ...overrides.inputData };
  expectedOutput = { ...expectedOutput, ...overrides.expectedOutput };

  // Return an object with input and expectedOutput properties
  return { inputData, expectedOutput };
}

/**
 * Transforms position data for specific test scenarios
 * @param positions 
 * @param transformationType 
 * @param options 
 * @returns Transformed position data
 */
export function transformPositionData(positions: any[], transformationType: string, options: any = {}): any[] {
  // Apply the specified transformation to the position data
  switch (transformationType) {
    case 'filterByBook':
      // Filter positions by bookId
      return positions.filter(position => position.bookId === options.bookId);
    case 'aggregateBySecurity':
      // Aggregate positions by securityId
      return createMockPositionAggregation(positions, 'securityId');
    default:
      return positions;
  }
}

/**
 * Transforms inventory data for specific test scenarios
 * @param inventories 
 * @param transformationType 
 * @param options 
 * @returns Transformed inventory data
 */
export function transformInventoryData(inventories: any[], transformationType: string, options: any = {}): any[] {
  // Apply the specified transformation to the inventory data
  switch (transformationType) {
    case 'filterByCalculationType':
      // Filter inventories by calculationType
      return inventories.filter(inventory => inventory.calculationType === options.calculationType);
    case 'aggregateByMarket':
      // Aggregate inventories by market
      return createMockInventoryAggregation(inventories, 'market');
    default:
      return inventories;
  }
}

/**
 * Creates a comprehensive mock dataset for complex test scenarios
 * @param datasetType 
 * @param options 
 * @returns Complete mock dataset with related entities
 */
export function createMockDataset(datasetType: string, options: any = {}): any {
  let dataset: any = {};

  // Based on datasetType, determine the composition of the dataset
  switch (datasetType) {
    case 'positionCalculation':
      // Generate securities, positions, and market data
      dataset = {
        securities: createMockSecurities(3),
        positions: createMockPositions(5),
        marketData: { price: 120.50 }
      };
      break;
    case 'inventoryCalculation':
      // Generate inventories, locate requests, and market data
      dataset = {
        inventories: createMockInventories(3),
        locateRequests: createMockLocateRequests(2),
        marketData: { borrowRate: 0.75 }
      };
      break;
    default:
      dataset = { message: 'No dataset defined for this type' };
  }

  // Apply any options to customize the dataset
  dataset = { ...dataset, ...options };

  // Return the complete dataset object
  return dataset;
}

// Pre-defined complex datasets for common test scenarios
export const mockDatasets = {
  positionCalculation: createMockDataset('positionCalculation'),
  inventoryCalculation: createMockDataset('inventoryCalculation'),
  locateApproval: createMockDataset('locateApproval'),
  shortSellValidation: createMockDataset('shortSellValidation'),
  performanceTesting: createMockDataset('performanceTesting')
};

// Pre-defined data transformations for common test scenarios
export const mockTransformations = {
  position: {
    filterByBook: (positions: any[], bookId: string) => transformPositionData(positions, 'filterByBook', { bookId }),
    aggregateBySecurity: (positions: any[]) => transformPositionData(positions, 'aggregateBySecurity')
  },
  inventory: {
    filterByCalculationType: (inventories: any[], calculationType: string) => transformInventoryData(inventories, 'filterByCalculationType', { calculationType }),
    aggregateByMarket: (inventories: any[]) => transformInventoryData(inventories, 'aggregateByMarket')
  },
  locate: {
    // Add locate transformations here
  }
};