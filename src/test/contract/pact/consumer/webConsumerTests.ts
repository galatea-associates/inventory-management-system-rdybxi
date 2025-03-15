import { PactV3, MatchersV3 } from '@pact-foundation/pact'; // v11.0.2
import path from 'path';
import axios from 'axios'; // v1.4.0
import { API_BASE_URL, API_ENDPOINTS } from '../../../common/constants';
import { loadTestData } from '../../../common/testUtils';

// Define constants for the Pact mock server
const PACT_DIR = path.resolve(__dirname, '../pacts');
const MOCK_SERVER_PORT = 8080;
const MOCK_SERVER_URL = `http://localhost:${MOCK_SERVER_PORT}`;

/**
 * Sets up a Pact instance for consumer contract testing
 */
function setupPact(): PactV3 {
  return new PactV3({
    consumer: 'web-ui',
    provider: 'api-gateway',
    dir: PACT_DIR,
    port: MOCK_SERVER_PORT,
    logLevel: 'warn',
  });
}

/**
 * Sets up Pact interactions for position-related API endpoints
 * @param pact The Pact instance
 */
function setupPositionInteractions(pact: PactV3): void {
  // Define interaction for getting positions with pagination
  pact.addInteraction({
    states: [{ description: 'positions exist' }],
    uponReceiving: 'a request for positions with pagination',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.POSITION.POSITIONS,
      query: {
        page: '0',
        size: '10',
        sort: 'securityId,asc',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        content: MatchersV3.eachLike({
          positionId: MatchersV3.string('pos-001'),
          securityId: MatchersV3.string('AAPL'),
          bookId: MatchersV3.string('EQUITY-01'),
          businessDate: MatchersV3.string('2023-06-15'),
          contractualQty: MatchersV3.number(10000),
          settledQty: MatchersV3.number(8000),
        }),
        totalElements: MatchersV3.number(100),
        totalPages: MatchersV3.number(10),
        size: MatchersV3.number(10),
        number: MatchersV3.number(0),
      }),
    },
  });

  // Define interaction for getting a specific position by ID
  pact.addInteraction({
    states: [{ description: 'position exists' }],
    uponReceiving: 'a request for a specific position',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.POSITION.POSITIONS + '/pos-001',
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        positionId: 'pos-001',
        securityId: 'AAPL',
        bookId: 'EQUITY-01',
        businessDate: '2023-06-15',
        contractualQty: 10000,
        settledQty: 8000,
        sd0Deliver: 0,
        sd0Receipt: 0,
        sd1Deliver: 1000,
        sd1Receipt: 2000,
        sd2Deliver: 0,
        sd2Receipt: 1000,
      }),
    },
  });

  // Define interaction for filtering positions
  pact.addInteraction({
    states: [{ description: 'positions exist' }],
    uponReceiving: 'a request for filtered positions',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.POSITION.POSITIONS,
      query: {
        securityId: 'AAPL',
        bookId: 'EQUITY-01',
        businessDate: '2023-06-15',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        content: MatchersV3.eachLike({
          positionId: MatchersV3.string('pos-001'),
          securityId: 'AAPL',
          bookId: 'EQUITY-01',
          businessDate: '2023-06-15',
          contractualQty: MatchersV3.number(10000),
          settledQty: MatchersV3.number(8000),
        }),
        totalElements: MatchersV3.number(1),
        totalPages: MatchersV3.number(1),
        size: MatchersV3.number(10),
        number: MatchersV3.number(0),
      }),
    },
  });

  // Define interaction for getting position summary
  pact.addInteraction({
    states: [{ description: 'positions exist' }],
    uponReceiving: 'a request for position summary',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.POSITION.POSITION_SUMMARY,
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        totalLong: MatchersV3.number(1200000000), // $1.2B
        totalShort: MatchersV3.number(345000000), // $345M
        net: MatchersV3.number(855000000), // $855M
        securityCount: MatchersV3.number(423),
        businessDate: '2023-06-15',
      }),
    },
  });

  // Define interaction for getting settlement ladder
  pact.addInteraction({
    states: [{ description: 'settlement ladder exists' }],
    uponReceiving: 'a request for settlement ladder',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.POSITION.SETTLEMENT_LADDER,
      query: {
        securityId: 'AAPL',
        businessDate: '2023-06-15',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        securityId: 'AAPL',
        businessDate: '2023-06-15',
        settlementDays: [
          {
            date: '2023-06-15',
            deliver: 1000,
            receipt: 2000,
            net: 1000,
          },
          {
            date: '2023-06-16',
            deliver: 2000,
            receipt: 1000,
            net: -1000,
          },
          {
            date: '2023-06-19',
            deliver: 500,
            receipt: 1500,
            net: 1000,
          },
          {
            date: '2023-06-20',
            deliver: 0,
            receipt: 500,
            net: 500,
          },
          {
            date: '2023-06-21',
            deliver: 1000,
            receipt: 0,
            net: -1000,
          },
        ],
      }),
    },
  });
}

/**
 * Sets up Pact interactions for inventory-related API endpoints
 * @param pact The Pact instance
 */
function setupInventoryInteractions(pact: PactV3): void {
  // Define interaction for getting inventory items with pagination
  pact.addInteraction({
    states: [{ description: 'inventory items exist' }],
    uponReceiving: 'a request for inventory items with pagination',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.INVENTORY.FOR_LOAN,
      query: {
        page: '0',
        size: '10',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        content: MatchersV3.eachLike({
          inventoryId: MatchersV3.string('inv-001'),
          securityId: MatchersV3.string('AAPL'),
          calculationType: 'FOR_LOAN',
          quantity: MatchersV3.number(15000),
          businessDate: '2023-06-15',
        }),
        totalElements: MatchersV3.number(100),
        totalPages: MatchersV3.number(10),
        size: MatchersV3.number(10),
        number: MatchersV3.number(0),
      }),
    },
  });

  // Define interaction for getting a specific inventory item by ID
  pact.addInteraction({
    states: [{ description: 'inventory item exists' }],
    uponReceiving: 'a request for a specific inventory item',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.INVENTORY.FOR_LOAN + '/inv-001',
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        inventoryId: 'inv-001',
        securityId: 'AAPL',
        calculationType: 'FOR_LOAN',
        quantity: 15000,
        businessDate: '2023-06-15',
        securityDetails: {
          securityId: 'AAPL',
          name: 'Apple Inc.',
          securityType: 'EQUITY',
          market: 'US',
          currency: 'USD',
        },
      }),
    },
  });

  // Define interaction for filtering inventory items
  pact.addInteraction({
    states: [{ description: 'inventory items exist' }],
    uponReceiving: 'a request for filtered inventory items',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.INVENTORY.FOR_LOAN,
      query: {
        securityId: 'AAPL',
        businessDate: '2023-06-15',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        inventoryId: 'inv-001',
        securityId: 'AAPL',
        calculationType: 'FOR_LOAN',
        quantity: 15000,
        businessDate: '2023-06-15',
      }),
    },
  });

  // Define interaction for getting for-loan availability
  pact.addInteraction({
    states: [{ description: 'for-loan availability exists' }],
    uponReceiving: 'a request for for-loan availability',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.INVENTORY.FOR_LOAN,
      query: {
        securityId: 'AAPL',
        businessDate: '2023-06-15',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        inventoryId: 'inv-001',
        securityId: 'AAPL',
        calculationType: 'FOR_LOAN',
        quantity: 15000,
        businessDate: '2023-06-15',
      }),
    },
  });

  // Define interaction for getting for-pledge availability
  pact.addInteraction({
    states: [{ description: 'for-pledge availability exists' }],
    uponReceiving: 'a request for for-pledge availability',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.INVENTORY.FOR_PLEDGE,
      query: {
        securityId: 'AAPL',
        businessDate: '2023-06-15',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        inventoryId: 'inv-002',
        securityId: 'AAPL',
        calculationType: 'FOR_PLEDGE',
        quantity: 12000,
        businessDate: '2023-06-15',
      }),
    },
  });

  // Define interaction for getting inventory summary
  pact.addInteraction({
    states: [{ description: 'inventory summary exists' }],
    uponReceiving: 'a request for inventory summary',
    withRequest: {
      method: 'GET',
      path: '/api/v1/inventory/summary',
      query: {
        businessDate: '2023-06-15',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        totalInventory: MatchersV3.number(2500000000), // $2.5B
        forLoan: MatchersV3.number(1200000000), // $1.2B
        forPledge: MatchersV3.number(800000000), // $800M
        hardToBorrow: MatchersV3.number(300000000), // $300M
        businessDate: '2023-06-15',
      }),
    },
  });

  // Define interaction for getting top securities by availability
  pact.addInteraction({
    states: [{ description: 'top securities exist' }],
    uponReceiving: 'a request for top securities by availability',
    withRequest: {
      method: 'GET',
      path: '/api/v1/inventory/top-securities',
      query: {
        calculationType: 'FOR_LOAN',
        limit: '10',
        businessDate: '2023-06-15',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.eachLike({
        securityId: MatchersV3.string('AAPL'),
        securityName: MatchersV3.string('Apple Inc.'),
        quantity: MatchersV3.number(15000),
        value: MatchersV3.number(2475000), // Quantity * price
        calculationType: 'FOR_LOAN',
      }),
    },
  });
}

/**
 * Sets up Pact interactions for locate-related API endpoints
 * @param pact The Pact instance
 */
function setupLocateInteractions(pact: PactV3): void {
  // Define interaction for getting locate requests with pagination
  pact.addInteraction({
    states: [{ description: 'locate requests exist' }],
    uponReceiving: 'a request for locate requests with pagination',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.LOCATE.LOCATES,
      query: {
        page: '0',
        size: '10',
        status: 'PENDING',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        content: MatchersV3.eachLike({
          requestId: MatchersV3.string('loc-001'),
          requestorId: MatchersV3.string('trader-001'),
          clientId: MatchersV3.string('client-001'),
          securityId: MatchersV3.string('AAPL'),
          requestedQuantity: MatchersV3.number(5000),
          status: 'PENDING',
          requestTimestamp: MatchersV3.string('2023-06-15T09:32:15Z'),
          locateType: 'SHORT',
          swapCashIndicator: 'CASH',
        }),
        totalElements: MatchersV3.number(12),
        totalPages: MatchersV3.number(2),
        size: MatchersV3.number(10),
        number: MatchersV3.number(0),
      }),
    },
  });

  // Define interaction for getting a specific locate request by ID
  pact.addInteraction({
    states: [{ description: 'locate request exists' }],
    uponReceiving: 'a request for a specific locate request',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.LOCATE.LOCATES + '/loc-001',
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        requestId: 'loc-001',
        requestorId: 'trader-001',
        clientId: 'client-001',
        securityId: 'AAPL',
        requestedQuantity: 5000,
        status: 'PENDING',
        requestTimestamp: '2023-06-15T09:32:15Z',
        locateType: 'SHORT',
        swapCashIndicator: 'CASH',
        clientDetails: {
          clientId: 'client-001',
          name: 'ABC Capital',
          type: 'HEDGE_FUND',
        },
        securityDetails: {
          securityId: 'AAPL',
          name: 'Apple Inc.',
          securityType: 'EQUITY',
          market: 'US',
          currency: 'USD',
        },
      }),
    },
  });

  // Define interaction for filtering locate requests
  pact.addInteraction({
    states: [{ description: 'locate requests exist' }],
    uponReceiving: 'a request for filtered locate requests',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.LOCATE.LOCATES,
      query: {
        clientId: 'client-001',
        securityId: 'AAPL',
        status: 'PENDING',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        content: MatchersV3.eachLike({
          requestId: MatchersV3.string('loc-001'),
          requestorId: MatchersV3.string('trader-001'),
          clientId: 'client-001',
          securityId: 'AAPL',
          requestedQuantity: MatchersV3.number(5000),
          status: 'PENDING',
          requestTimestamp: MatchersV3.string('2023-06-15T09:32:15Z'),
        }),
        totalElements: MatchersV3.number(1),
        totalPages: MatchersV3.number(1),
        size: MatchersV3.number(10),
        number: MatchersV3.number(0),
      }),
    },
  });

  // Define interaction for creating a locate request
  pact.addInteraction({
    states: [{ description: 'ready to create locate request' }],
    uponReceiving: 'a request to create a locate request',
    withRequest: {
      method: 'POST',
      path: API_ENDPOINTS.LOCATE.LOCATES,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        requestorId: 'trader-001',
        clientId: 'client-001',
        securityId: 'AAPL',
        requestedQuantity: 5000,
        locateType: 'SHORT',
        swapCashIndicator: 'CASH',
      },
    },
    willRespondWith: {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        requestId: MatchersV3.string('loc-001'),
        requestorId: 'trader-001',
        clientId: 'client-001',
        securityId: 'AAPL',
        requestedQuantity: 5000,
        status: 'PENDING',
        requestTimestamp: MatchersV3.string('2023-06-15T09:32:15Z'),
        locateType: 'SHORT',
        swapCashIndicator: 'CASH',
      }),
    },
  });

  // Define interaction for approving a locate request
  pact.addInteraction({
    states: [{ description: 'locate request exists', params: { requestId: 'loc-001' } }],
    uponReceiving: 'a request to approve a locate request',
    withRequest: {
      method: 'PUT',
      path: API_ENDPOINTS.LOCATE.APPROVE_LOCATE.replace(':id', 'loc-001'),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        approvedQuantity: 5000,
        decrementQuantity: 5000,
        expiryDate: '2023-06-15',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        requestId: 'loc-001',
        status: 'APPROVED',
        approvalId: MatchersV3.string('appr-001'),
        approvedQuantity: 5000,
        decrementQuantity: 5000,
        approvalTimestamp: MatchersV3.string('2023-06-15T09:35:00Z'),
        expiryDate: '2023-06-15',
      }),
    },
  });

  // Define interaction for rejecting a locate request
  pact.addInteraction({
    states: [{ description: 'locate request exists', params: { requestId: 'loc-002' } }],
    uponReceiving: 'a request to reject a locate request',
    withRequest: {
      method: 'PUT',
      path: API_ENDPOINTS.LOCATE.REJECT_LOCATE.replace(':id', 'loc-002'),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        rejectionReason: 'Insufficient inventory',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        requestId: 'loc-002',
        status: 'REJECTED',
        rejectionId: MatchersV3.string('rej-001'),
        rejectionReason: 'Insufficient inventory',
        rejectionTimestamp: MatchersV3.string('2023-06-15T09:35:00Z'),
      }),
    },
  });

  // Define interaction for getting locate summary
  pact.addInteraction({
    states: [{ description: 'locate summary exists' }],
    uponReceiving: 'a request for locate summary',
    withRequest: {
      method: 'GET',
      path: '/api/v1/locates/summary',
      query: {
        businessDate: '2023-06-15',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        pendingCount: 12,
        autoApprovedCount: 145,
        autoRejectedCount: 23,
        manualCount: 8,
        totalCount: 188,
        businessDate: '2023-06-15',
      }),
    },
  });
}

/**
 * Sets up Pact interactions for authentication-related API endpoints
 * @param pact The Pact instance
 */
function setupAuthInteractions(pact: PactV3): void {
  // Define interaction for user login
  pact.addInteraction({
    states: [{ description: 'user exists' }],
    uponReceiving: 'a request to authenticate a user',
    withRequest: {
      method: 'POST',
      path: API_ENDPOINTS.AUTH.LOGIN,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        username: 'testuser',
        password: 'password123',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        accessToken: MatchersV3.string('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
        refreshToken: MatchersV3.string('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
        expiresIn: MatchersV3.number(3600),
        tokenType: 'bearer',
      }),
    },
  });

  // Define interaction for token refresh
  pact.addInteraction({
    states: [{ description: 'refresh token is valid' }],
    uponReceiving: 'a request to refresh an authentication token',
    withRequest: {
      method: 'POST',
      path: API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: {
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        accessToken: MatchersV3.string('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
        refreshToken: MatchersV3.string('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
        expiresIn: MatchersV3.number(3600),
        tokenType: 'bearer',
      }),
    },
  });

  // Define interaction for user logout
  pact.addInteraction({
    states: [{ description: 'user is authenticated' }],
    uponReceiving: 'a request to log out a user',
    withRequest: {
      method: 'POST',
      path: API_ENDPOINTS.AUTH.LOGOUT,
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        message: 'Logout successful',
      }),
    },
  });

  // Define interaction for getting user profile
  pact.addInteraction({
    states: [{ description: 'user is authenticated' }],
    uponReceiving: 'a request to get user profile',
    withRequest: {
      method: 'GET',
      path: '/api/v1/auth/profile',
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        userId: MatchersV3.string('user-001'),
        username: MatchersV3.string('testuser'),
        email: MatchersV3.string('testuser@example.com'),
        roles: MatchersV3.eachLike('TRADER'),
        firstName: MatchersV3.string('Test'),
        lastName: MatchersV3.string('User'),
      }),
    },
  });
}

/**
 * Sets up Pact interactions for reference data API endpoints
 * @param pact The Pact instance
 */
function setupReferenceDataInteractions(pact: PactV3): void {
  // Define interaction for getting securities
  pact.addInteraction({
    states: [{ description: 'securities exist' }],
    uponReceiving: 'a request for securities with pagination',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.REFERENCE_DATA.SECURITIES,
      query: {
        page: '0',
        size: '10',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        content: MatchersV3.eachLike({
          securityId: MatchersV3.string('AAPL'),
          name: MatchersV3.string('Apple Inc.'),
          securityType: MatchersV3.string('EQUITY'),
          market: MatchersV3.string('US'),
          currency: MatchersV3.string('USD'),
          status: MatchersV3.string('ACTIVE'),
        }),
        totalElements: MatchersV3.number(1000),
        totalPages: MatchersV3.number(100),
        size: MatchersV3.number(10),
        number: MatchersV3.number(0),
      }),
    },
  });

  // Define interaction for getting a specific security by ID
  pact.addInteraction({
    states: [{ description: 'security exists' }],
    uponReceiving: 'a request for a specific security',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.REFERENCE_DATA.SECURITY_BY_ID.replace(':id', 'AAPL'),
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        securityId: 'AAPL',
        name: 'Apple Inc.',
        securityType: 'EQUITY',
        market: 'US',
        currency: 'USD',
        status: 'ACTIVE',
        issuer: 'Apple Inc.',
        issueDate: '1980-12-12',
        maturityDate: null,
        identifiers: [
          {
            identifierType: 'ISIN',
            identifierValue: 'US0378331005',
            source: 'BLOOMBERG',
          },
          {
            identifierType: 'CUSIP',
            identifierValue: '037833100',
            source: 'REUTERS',
          },
        ],
      }),
    },
  });

  // Define interaction for getting counterparties
  pact.addInteraction({
    states: [{ description: 'counterparties exist' }],
    uponReceiving: 'a request for counterparties with pagination',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTIES,
      query: {
        page: '0',
        size: '10',
      },
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        content: MatchersV3.eachLike({
          counterpartyId: MatchersV3.string('CP001'),
          name: MatchersV3.string('ABC Capital'),
          type: MatchersV3.string('HEDGE_FUND'),
          status: MatchersV3.string('ACTIVE'),
        }),
        totalElements: MatchersV3.number(500),
        totalPages: MatchersV3.number(50),
        size: MatchersV3.number(10),
        number: MatchersV3.number(0),
      }),
    },
  });

  // Define interaction for getting a specific counterparty by ID
  pact.addInteraction({
    states: [{ description: 'counterparty exists' }],
    uponReceiving: 'a request for a specific counterparty',
    withRequest: {
      method: 'GET',
      path: API_ENDPOINTS.REFERENCE_DATA.COUNTERPARTY_BY_ID.replace(':id', 'CP001'),
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        counterpartyId: 'CP001',
        name: 'ABC Capital',
        type: 'HEDGE_FUND',
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        identifiers: [
          {
            identifierType: 'LEI',
            identifierValue: '549300TRUEJDKQNIPKP76',
          },
          {
            identifierType: 'INTERNAL_ID',
            identifierValue: 'ABC123',
          },
        ],
      }),
    },
  });

  // Define interaction for getting reference data types
  pact.addInteraction({
    states: [{ description: 'reference data types exist' }],
    uponReceiving: 'a request for reference data types',
    withRequest: {
      method: 'GET',
      path: '/api/v1/reference-data/types',
      headers: {
        Accept: 'application/json',
      },
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: MatchersV3.like({
        securityTypes: ['EQUITY', 'BOND', 'ETF', 'INDEX', 'FUTURE', 'OPTION'],
        positionTypes: ['LONG', 'SHORT', 'SYNTHETIC'],
        calculationTypes: ['FOR_LOAN', 'FOR_PLEDGE', 'OVERBORROW', 'LONG_SELL', 'SHORT_SELL', 'LOCATE'],
        locateTypes: ['SHORT', 'LONG'],
        locateStatuses: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
        counterpartyTypes: ['BANK', 'BROKER', 'HEDGE_FUND', 'ASSET_MANAGER', 'PENSION_FUND', 'INSURANCE'],
      }),
    },
  });
}

/**
 * Creates an API client configured to use the Pact mock server
 */
function createApiClient() {
  const baseUrl = MOCK_SERVER_URL + '/api/v1';
  
  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Add request interceptor for logging
  client.interceptors.request.use(request => {
    console.log(`Making ${request.method?.toUpperCase()} request to ${request.url}`);
    return request;
  });

  // Add response interceptor for logging
  client.interceptors.response.use(response => {
    console.log(`Received response with status ${response.status}`);
    return response;
  });

  return client;
}

describe('Web UI Consumer Contract Tests', () => {
  let pact: PactV3;

  beforeAll(() => {
    pact = setupPact();
  });

  afterEach(async () => {
    await pact.verify();
  });

  afterAll(async () => {
    await pact.finalize();
  });

  describe('Position API', () => {
    beforeEach(() => {
      setupPositionInteractions(pact);
    });

    test('should get positions with pagination', async () => {
      // Act
      const apiClient = createApiClient();
      const response = await apiClient.get('/positions?page=0&size=10&sort=securityId,asc');

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('totalElements');
      expect(response.data).toHaveProperty('totalPages');
    });

    test('should get a specific position by ID', async () => {
      // Act
      const apiClient = createApiClient();
      const response = await apiClient.get('/positions/pos-001');

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('positionId', 'pos-001');
      expect(response.data).toHaveProperty('securityId');
      expect(response.data).toHaveProperty('contractualQty');
    });

    test('should filter positions based on criteria', async () => {
      // Act
      const apiClient = createApiClient();
      const response = await apiClient.get('/positions?securityId=AAPL&bookId=EQUITY-01&businessDate=2023-06-15');

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data.content.length).toBeGreaterThan(0);
      expect(response.data.content[0]).toHaveProperty('securityId', 'AAPL');
      expect(response.data.content[0]).toHaveProperty('bookId', 'EQUITY-01');
    });
  });

  describe('Inventory API', () => {
    beforeEach(() => {
      setupInventoryInteractions(pact);
    });

    test('should get inventory items with pagination', async () => {
      // Act
      const apiClient = createApiClient();
      const response = await apiClient.get('/inventory/for-loan?page=0&size=10');

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('totalElements');
      expect(response.data).toHaveProperty('totalPages');
    });

    test('should get for-loan availability for a security', async () => {
      // Act
      const apiClient = createApiClient();
      const response = await apiClient.get('/inventory/for-loan?securityId=AAPL&businessDate=2023-06-15');

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('securityId', 'AAPL');
      expect(response.data).toHaveProperty('calculationType', 'FOR_LOAN');
      expect(response.data).toHaveProperty('quantity');
    });
  });

  describe('Locate API', () => {
    beforeEach(() => {
      setupLocateInteractions(pact);
    });

    test('should get locate requests with pagination', async () => {
      // Act
      const apiClient = createApiClient();
      const response = await apiClient.get('/locates?page=0&size=10&status=PENDING');

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('totalElements');
      expect(response.data).toHaveProperty('totalPages');
    });

    test('should create a locate request', async () => {
      // Arrange
      const locateRequest = {
        requestorId: 'trader-001',
        clientId: 'client-001',
        securityId: 'AAPL',
        requestedQuantity: 5000,
        locateType: 'SHORT',
        swapCashIndicator: 'CASH',
      };

      // Act
      const apiClient = createApiClient();
      const response = await apiClient.post('/locates', locateRequest);

      // Assert
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('requestId');
      expect(response.data).toHaveProperty('status', 'PENDING');
      expect(response.data).toHaveProperty('requestedQuantity', 5000);
    });

    test('should approve a locate request', async () => {
      // Arrange
      const approvalData = {
        approvedQuantity: 5000,
        decrementQuantity: 5000,
        expiryDate: '2023-06-15',
      };

      // Act
      const apiClient = createApiClient();
      const response = await apiClient.put('/locates/loc-001/approve', approvalData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('requestId', 'loc-001');
      expect(response.data).toHaveProperty('status', 'APPROVED');
      expect(response.data).toHaveProperty('approvedQuantity', 5000);
      expect(response.data).toHaveProperty('decrementQuantity', 5000);
    });
  });

  describe('Authentication API', () => {
    beforeEach(() => {
      setupAuthInteractions(pact);
    });

    test('should authenticate a user', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'password123',
      };

      // Act
      const apiClient = createApiClient();
      const response = await apiClient.post('/auth/login', credentials);

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data).toHaveProperty('expiresIn');
      expect(response.data).toHaveProperty('tokenType', 'bearer');
    });

    test('should refresh an authentication token', async () => {
      // Arrange
      const refreshRequest = {
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      };

      // Act
      const apiClient = createApiClient();
      const response = await apiClient.post('/auth/refresh-token', refreshRequest);

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data).toHaveProperty('expiresIn');
      expect(response.data).toHaveProperty('tokenType', 'bearer');
    });
  });

  describe('Reference Data API', () => {
    beforeEach(() => {
      setupReferenceDataInteractions(pact);
    });

    test('should get securities with pagination', async () => {
      // Act
      const apiClient = createApiClient();
      const response = await apiClient.get('/securities?page=0&size=10');

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('totalElements');
      expect(response.data).toHaveProperty('totalPages');
      expect(response.data.content.length).toBeGreaterThan(0);
      expect(response.data.content[0]).toHaveProperty('securityId');
      expect(response.data.content[0]).toHaveProperty('name');
      expect(response.data.content[0]).toHaveProperty('securityType');
    });
  });
});

export { setupPact, setupPositionInteractions, setupInventoryInteractions, setupLocateInteractions, setupAuthInteractions, setupReferenceDataInteractions, createApiClient };