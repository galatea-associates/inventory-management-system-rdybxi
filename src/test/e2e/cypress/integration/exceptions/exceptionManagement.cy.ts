import { TEST_USERS } from '../../../common/constants';

describe('Exception Management', () => {
  beforeEach(() => {
    // Intercept API calls to exceptions endpoint
    cy.intercept('GET', '/api/v1/exceptions*', {
      statusCode: 200,
      body: {
        content: [
          {
            id: 'exc-001',
            type: 'Data',
            severity: 'Critical',
            status: 'Open',
            timestamp: '2023-06-15T09:15:00Z',
            description: 'Security reference data mapping conflict',
            source: 'Data Ingestion Service',
            affectedEntity: 'AAPL (Apple Inc.)',
            assignee: null
          },
          {
            id: 'exc-002',
            type: 'Calculation',
            severity: 'High',
            status: 'Acknowledged',
            timestamp: '2023-06-15T08:45:00Z',
            description: 'Inventory calculation error for Japan market',
            source: 'Calculation Service',
            affectedEntity: 'Japan Market',
            assignee: 'operations.user'
          },
          {
            id: 'exc-003',
            type: 'System',
            severity: 'Medium',
            status: 'Open',
            timestamp: '2023-06-15T08:30:00Z',
            description: 'Performance degradation in position calculation',
            source: 'Calculation Service',
            affectedEntity: 'Position Engine',
            assignee: null
          }
        ],
        totalElements: 3,
        totalPages: 1,
        size: 10,
        page: 0
      }
    }).as('getExceptions');
    
    // Intercept API calls to exception stats endpoint
    cy.intercept('GET', '/api/v1/exceptions/stats', {
      statusCode: 200,
      body: {
        totalCount: 25,
        openCount: 12,
        acknowledgedCount: 8,
        resolvedCount: 5,
        bySeverity: {
          Critical: 5,
          High: 8,
          Medium: 10,
          Low: 2
        },
        byType: {
          Data: 8,
          Calculation: 7,
          System: 6,
          Integration: 4
        },
        byService: {
          'Data Ingestion Service': 8,
          'Calculation Service': 10,
          'Workflow Service': 4,
          'API Gateway': 3
        },
        trend: [
          { date: '2023-06-14', count: 8 },
          { date: '2023-06-15', count: 17 }
        ]
      }
    }).as('getExceptionStats');
    
    // Login as operations user
    cy.session([TEST_USERS.OPERATIONS.username], () => {
      cy.request({
        method: 'POST',
        url: '/api/v1/auth/login',
        body: {
          username: TEST_USERS.OPERATIONS.username,
          password: TEST_USERS.OPERATIONS.password
        }
      }).then((response) => {
        window.localStorage.setItem('accessToken', response.body.accessToken);
      });
    });
    
    // Navigate to exceptions page
    cy.visit('/exceptions');
    cy.wait('@getExceptions');
    cy.wait('@getExceptionStats');
  });

  it('should display the exception management page with correct components', () => {
    // Verify page title
    cy.get('h1').should('contain', 'Exception Management');
    
    // Verify filter panel is visible
    cy.get('[data-testid="filter-panel"]').should('be.visible');
    
    // Verify exception queue is visible
    cy.get('[data-testid="exception-queue"]').should('be.visible');
    
    // Verify exception detail panel is visible (empty state)
    cy.get('[data-testid="exception-detail-panel"]').should('be.visible');
    
    // Verify exception statistics are displayed
    cy.get('[data-testid="exception-stats"]').should('be.visible');
    cy.get('[data-testid="exception-stats"]').should('contain', 'Total: 25');
    cy.get('[data-testid="exception-stats"]').should('contain', 'Open: 12');
  });

  it('should filter exceptions by type', () => {
    // Intercept the filtered API call
    cy.intercept('GET', '/api/v1/exceptions*type=Data*', {
      statusCode: 200,
      body: {
        content: [
          {
            id: 'exc-001',
            type: 'Data',
            severity: 'Critical',
            status: 'Open',
            timestamp: '2023-06-15T09:15:00Z',
            description: 'Security reference data mapping conflict',
            source: 'Data Ingestion Service',
            affectedEntity: 'AAPL (Apple Inc.)',
            assignee: null
          }
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        page: 0
      }
    }).as('getDataExceptions');
    
    // Select Data from the type filter dropdown
    cy.get('[data-testid="filter-type"]').click();
    cy.get('[data-testid="filter-type-option-Data"]').click();
    
    // Wait for the filtered API call
    cy.wait('@getDataExceptions');
    
    // Verify that only Data exceptions are displayed
    cy.get('[data-testid="exception-item"]').should('have.length', 1);
    cy.get('[data-testid="exception-item"]').first().should('contain', 'Data');
  });

  it('should filter exceptions by severity', () => {
    // Intercept the filtered API call
    cy.intercept('GET', '/api/v1/exceptions*severity=Critical*', {
      statusCode: 200,
      body: {
        content: [
          {
            id: 'exc-001',
            type: 'Data',
            severity: 'Critical',
            status: 'Open',
            timestamp: '2023-06-15T09:15:00Z',
            description: 'Security reference data mapping conflict',
            source: 'Data Ingestion Service',
            affectedEntity: 'AAPL (Apple Inc.)',
            assignee: null
          }
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        page: 0
      }
    }).as('getCriticalExceptions');
    
    // Select Critical from the severity filter dropdown
    cy.get('[data-testid="filter-severity"]').click();
    cy.get('[data-testid="filter-severity-option-Critical"]').click();
    
    // Wait for the filtered API call
    cy.wait('@getCriticalExceptions');
    
    // Verify that only Critical exceptions are displayed
    cy.get('[data-testid="exception-item"]').should('have.length', 1);
    cy.get('[data-testid="exception-item"]').first().should('contain', 'Critical');
  });

  it('should filter exceptions by status', () => {
    // Intercept the filtered API call
    cy.intercept('GET', '/api/v1/exceptions*status=Open*', {
      statusCode: 200,
      body: {
        content: [
          {
            id: 'exc-001',
            type: 'Data',
            severity: 'Critical',
            status: 'Open',
            timestamp: '2023-06-15T09:15:00Z',
            description: 'Security reference data mapping conflict',
            source: 'Data Ingestion Service',
            affectedEntity: 'AAPL (Apple Inc.)',
            assignee: null
          },
          {
            id: 'exc-003',
            type: 'System',
            severity: 'Medium',
            status: 'Open',
            timestamp: '2023-06-15T08:30:00Z',
            description: 'Performance degradation in position calculation',
            source: 'Calculation Service',
            affectedEntity: 'Position Engine',
            assignee: null
          }
        ],
        totalElements: 2,
        totalPages: 1,
        size: 10,
        page: 0
      }
    }).as('getOpenExceptions');
    
    // Select Open from the status filter dropdown
    cy.get('[data-testid="filter-status"]').click();
    cy.get('[data-testid="filter-status-option-Open"]').click();
    
    // Wait for the filtered API call
    cy.wait('@getOpenExceptions');
    
    // Verify that only Open exceptions are displayed
    cy.get('[data-testid="exception-item"]').should('have.length', 2);
    cy.get('[data-testid="exception-item"]').each(($el) => {
      cy.wrap($el).should('contain', 'Open');
    });
  });

  it('should filter exceptions by date range', () => {
    // Intercept the filtered API call
    cy.intercept('GET', '/api/v1/exceptions*fromDate=*toDate=*', {
      statusCode: 200,
      body: {
        content: [
          {
            id: 'exc-001',
            type: 'Data',
            severity: 'Critical',
            status: 'Open',
            timestamp: '2023-06-15T09:15:00Z',
            description: 'Security reference data mapping conflict',
            source: 'Data Ingestion Service',
            affectedEntity: 'AAPL (Apple Inc.)',
            assignee: null
          },
          {
            id: 'exc-002',
            type: 'Calculation',
            severity: 'High',
            status: 'Acknowledged',
            timestamp: '2023-06-15T08:45:00Z',
            description: 'Inventory calculation error for Japan market',
            source: 'Calculation Service',
            affectedEntity: 'Japan Market',
            assignee: 'operations.user'
          },
          {
            id: 'exc-003',
            type: 'System',
            severity: 'Medium',
            status: 'Open',
            timestamp: '2023-06-15T08:30:00Z',
            description: 'Performance degradation in position calculation',
            source: 'Calculation Service',
            affectedEntity: 'Position Engine',
            assignee: null
          }
        ],
        totalElements: 3,
        totalPages: 1,
        size: 10,
        page: 0
      }
    }).as('getDateRangeExceptions');
    
    // Select Last 24 Hours from the date range filter dropdown
    cy.get('[data-testid="filter-date-range"]').click();
    cy.get('[data-testid="filter-date-range-option-Last 24 Hours"]').click();
    
    // Wait for the filtered API call
    cy.wait('@getDateRangeExceptions');
    
    // Verify that exceptions from the last 24 hours are displayed
    cy.get('[data-testid="exception-item"]').should('have.length', 3);
    cy.get('[data-testid="date-range-indicator"]').should('contain', 'Last 24 Hours');
  });

  it('should display exception details when selecting an exception', () => {
    // Intercept the exception detail API call
    cy.intercept('GET', '/api/v1/exceptions/exc-001', {
      statusCode: 200,
      body: {
        id: 'exc-001',
        type: 'Data',
        severity: 'Critical',
        status: 'Open',
        timestamp: '2023-06-15T09:15:00Z',
        description: 'Security reference data mapping conflict',
        source: 'Data Ingestion Service',
        affectedEntity: 'AAPL (Apple Inc.)',
        assignee: null,
        details: {
          conflictSource1: 'Reuters',
          conflictSource2: 'Bloomberg',
          conflictField: 'securityIdentifier',
          conflictValue1: 'AAPL.O',
          conflictValue2: 'AAPL UW'
        },
        timeline: [
          {
            timestamp: '2023-06-15T09:15:00Z',
            action: 'Created',
            user: 'system',
            notes: 'Automatically created by Data Ingestion Service'
          }
        ],
        comments: []
      }
    }).as('getExceptionDetail');
    
    // Click on the first exception in the queue
    cy.get('[data-testid="exception-item"]').first().click();
    
    // Wait for the exception detail API call
    cy.wait('@getExceptionDetail');
    
    // Verify that the exception detail panel displays the correct information
    cy.get('[data-testid="exception-detail-panel"]').should('contain', 'Security reference data mapping conflict');
    cy.get('[data-testid="exception-severity"]').should('contain', 'Critical');
    cy.get('[data-testid="exception-status"]').should('contain', 'Open');
    cy.get('[data-testid="exception-timestamp"]').should('contain', '2023-06-15');
    cy.get('[data-testid="exception-source"]').should('contain', 'Data Ingestion Service');
    cy.get('[data-testid="exception-affected-entity"]').should('contain', 'AAPL (Apple Inc.)');
    
    // Verify that appropriate action buttons are displayed
    cy.get('[data-testid="action-acknowledge"]').should('be.visible');
    cy.get('[data-testid="action-assign"]').should('be.visible');
    cy.get('[data-testid="action-escalate"]').should('be.visible');
  });

  it('should acknowledge an exception', () => {
    // Intercept the exception detail API call
    cy.intercept('GET', '/api/v1/exceptions/exc-001', {
      statusCode: 200,
      body: {
        id: 'exc-001',
        type: 'Data',
        severity: 'Critical',
        status: 'Open',
        timestamp: '2023-06-15T09:15:00Z',
        description: 'Security reference data mapping conflict',
        source: 'Data Ingestion Service',
        affectedEntity: 'AAPL (Apple Inc.)',
        assignee: null,
        details: {
          conflictSource1: 'Reuters',
          conflictSource2: 'Bloomberg',
          conflictField: 'securityIdentifier',
          conflictValue1: 'AAPL.O',
          conflictValue2: 'AAPL UW'
        },
        timeline: [
          {
            timestamp: '2023-06-15T09:15:00Z',
            action: 'Created',
            user: 'system',
            notes: 'Automatically created by Data Ingestion Service'
          }
        ],
        comments: []
      }
    }).as('getExceptionDetail');
    
    // Intercept the acknowledge API call
    cy.intercept('POST', '/api/v1/exceptions/exc-001/acknowledge', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Exception acknowledged successfully'
      }
    }).as('acknowledgeException');
    
    // Click on the first exception in the queue
    cy.get('[data-testid="exception-item"]').first().click();
    
    // Wait for the exception detail API call
    cy.wait('@getExceptionDetail');
    
    // Click the Acknowledge button
    cy.get('[data-testid="action-acknowledge"]').click();
    
    // Enter acknowledgment comments
    cy.get('[data-testid="acknowledge-comments"]').type('Acknowledging this exception for testing');
    
    // Submit the acknowledgment
    cy.get('[data-testid="acknowledge-submit"]').click();
    
    // Wait for the acknowledge API call
    cy.wait('@acknowledgeException');
    
    // Verify that a success notification is displayed
    cy.get('[data-testid="notification"]').should('contain', 'Exception acknowledged successfully');
    
    // Intercept the updated exception detail after acknowledgment
    cy.intercept('GET', '/api/v1/exceptions/exc-001', {
      statusCode: 200,
      body: {
        id: 'exc-001',
        type: 'Data',
        severity: 'Critical',
        status: 'Acknowledged',
        timestamp: '2023-06-15T09:15:00Z',
        description: 'Security reference data mapping conflict',
        source: 'Data Ingestion Service',
        affectedEntity: 'AAPL (Apple Inc.)',
        assignee: TEST_USERS.OPERATIONS.username,
        details: {
          conflictSource1: 'Reuters',
          conflictSource2: 'Bloomberg',
          conflictField: 'securityIdentifier',
          conflictValue1: 'AAPL.O',
          conflictValue2: 'AAPL UW'
        },
        timeline: [
          {
            timestamp: '2023-06-15T09:15:00Z',
            action: 'Created',
            user: 'system',
            notes: 'Automatically created by Data Ingestion Service'
          },
          {
            timestamp: '2023-06-15T10:00:00Z',
            action: 'Acknowledged',
            user: TEST_USERS.OPERATIONS.username,
            notes: 'Acknowledging this exception for testing'
          }
        ],
        comments: []
      }
    }).as('getUpdatedExceptionDetail');
    
    // Refresh the exception details
    cy.get('[data-testid="refresh-details"]').click();
    cy.wait('@getUpdatedExceptionDetail');
    
    // Verify that the exception status is updated
    cy.get('[data-testid="exception-status"]').should('contain', 'Acknowledged');
  });

  it('should resolve an exception', () => {
    // Intercept the exception detail API call for an acknowledged exception
    cy.intercept('GET', '/api/v1/exceptions/exc-002', {
      statusCode: 200,
      body: {
        id: 'exc-002',
        type: 'Calculation',
        severity: 'High',
        status: 'Acknowledged',
        timestamp: '2023-06-15T08:45:00Z',
        description: 'Inventory calculation error for Japan market',
        source: 'Calculation Service',
        affectedEntity: 'Japan Market',
        assignee: TEST_USERS.OPERATIONS.username,
        details: {
          errorCode: 'CALC-1045',
          affectedCalculation: 'For Loan Availability',
          marketId: 'JP'
        },
        timeline: [
          {
            timestamp: '2023-06-15T08:45:00Z',
            action: 'Created',
            user: 'system',
            notes: 'Automatically created by Calculation Service'
          },
          {
            timestamp: '2023-06-15T09:00:00Z',
            action: 'Acknowledged',
            user: TEST_USERS.OPERATIONS.username,
            notes: 'Investigating the calculation error'
          }
        ],
        comments: []
      }
    }).as('getAcknowledgedExceptionDetail');
    
    // Intercept the resolve API call
    cy.intercept('POST', '/api/v1/exceptions/exc-002/resolve', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Exception resolved successfully'
      }
    }).as('resolveException');
    
    // Click on the acknowledged exception in the queue
    cy.get('[data-testid="exception-item"]').eq(1).click();
    
    // Wait for the exception detail API call
    cy.wait('@getAcknowledgedExceptionDetail');
    
    // Click the Resolve button
    cy.get('[data-testid="action-resolve"]').click();
    
    // Enter resolution notes and action
    cy.get('[data-testid="resolve-notes"]').type('Resolved the calculation issue');
    cy.get('[data-testid="resolve-action"]').type('Updated calculation rules for Japan market');
    
    // Submit the resolution
    cy.get('[data-testid="resolve-submit"]').click();
    
    // Wait for the resolve API call
    cy.wait('@resolveException');
    
    // Verify that a success notification is displayed
    cy.get('[data-testid="notification"]').should('contain', 'Exception resolved successfully');
    
    // Intercept the updated exception detail after resolution
    cy.intercept('GET', '/api/v1/exceptions/exc-002', {
      statusCode: 200,
      body: {
        id: 'exc-002',
        type: 'Calculation',
        severity: 'High',
        status: 'Resolved',
        timestamp: '2023-06-15T08:45:00Z',
        description: 'Inventory calculation error for Japan market',
        source: 'Calculation Service',
        affectedEntity: 'Japan Market',
        assignee: TEST_USERS.OPERATIONS.username,
        details: {
          errorCode: 'CALC-1045',
          affectedCalculation: 'For Loan Availability',
          marketId: 'JP'
        },
        timeline: [
          {
            timestamp: '2023-06-15T08:45:00Z',
            action: 'Created',
            user: 'system',
            notes: 'Automatically created by Calculation Service'
          },
          {
            timestamp: '2023-06-15T09:00:00Z',
            action: 'Acknowledged',
            user: TEST_USERS.OPERATIONS.username,
            notes: 'Investigating the calculation error'
          },
          {
            timestamp: '2023-06-15T10:30:00Z',
            action: 'Resolved',
            user: TEST_USERS.OPERATIONS.username,
            notes: 'Resolved the calculation issue',
            resolution: 'Updated calculation rules for Japan market'
          }
        ],
        comments: []
      }
    }).as('getResolvedExceptionDetail');
    
    // Refresh the exception details
    cy.get('[data-testid="refresh-details"]').click();
    cy.wait('@getResolvedExceptionDetail');
    
    // Verify that the exception status is updated
    cy.get('[data-testid="exception-status"]').should('contain', 'Resolved');
  });

  it('should assign an exception to another user', () => {
    // Intercept the exception detail API call
    cy.intercept('GET', '/api/v1/exceptions/exc-001', {
      statusCode: 200,
      body: {
        id: 'exc-001',
        type: 'Data',
        severity: 'Critical',
        status: 'Open',
        timestamp: '2023-06-15T09:15:00Z',
        description: 'Security reference data mapping conflict',
        source: 'Data Ingestion Service',
        affectedEntity: 'AAPL (Apple Inc.)',
        assignee: null,
        details: {
          conflictSource1: 'Reuters',
          conflictSource2: 'Bloomberg',
          conflictField: 'securityIdentifier',
          conflictValue1: 'AAPL.O',
          conflictValue2: 'AAPL UW'
        },
        timeline: [
          {
            timestamp: '2023-06-15T09:15:00Z',
            action: 'Created',
            user: 'system',
            notes: 'Automatically created by Data Ingestion Service'
          }
        ],
        comments: []
      }
    }).as('getExceptionDetail');
    
    // Intercept the assign API call
    cy.intercept('POST', '/api/v1/exceptions/exc-001/assign', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Exception assigned successfully'
      }
    }).as('assignException');
    
    // Click on the first exception in the queue
    cy.get('[data-testid="exception-item"]').first().click();
    
    // Wait for the exception detail API call
    cy.wait('@getExceptionDetail');
    
    // Click the Assign button
    cy.get('[data-testid="action-assign"]').click();
    
    // Select an assignee from the dropdown
    cy.get('[data-testid="assign-user"]').click();
    cy.get('[data-testid="assign-user-option"]').contains(TEST_USERS.COMPLIANCE.displayName).click();
    
    // Enter assignment notes
    cy.get('[data-testid="assign-notes"]').type('Assigning to compliance team for review');
    
    // Submit the assignment
    cy.get('[data-testid="assign-submit"]').click();
    
    // Wait for the assign API call
    cy.wait('@assignException');
    
    // Verify that a success notification is displayed
    cy.get('[data-testid="notification"]').should('contain', 'Exception assigned successfully');
    
    // Intercept the updated exception detail after assignment
    cy.intercept('GET', '/api/v1/exceptions/exc-001', {
      statusCode: 200,
      body: {
        id: 'exc-001',
        type: 'Data',
        severity: 'Critical',
        status: 'Open',
        timestamp: '2023-06-15T09:15:00Z',
        description: 'Security reference data mapping conflict',
        source: 'Data Ingestion Service',
        affectedEntity: 'AAPL (Apple Inc.)',
        assignee: TEST_USERS.COMPLIANCE.username,
        details: {
          conflictSource1: 'Reuters',
          conflictSource2: 'Bloomberg',
          conflictField: 'securityIdentifier',
          conflictValue1: 'AAPL.O',
          conflictValue2: 'AAPL UW'
        },
        timeline: [
          {
            timestamp: '2023-06-15T09:15:00Z',
            action: 'Created',
            user: 'system',
            notes: 'Automatically created by Data Ingestion Service'
          },
          {
            timestamp: '2023-06-15T10:15:00Z',
            action: 'Assigned',
            user: TEST_USERS.OPERATIONS.username,
            notes: 'Assigning to compliance team for review',
            assignee: TEST_USERS.COMPLIANCE.username
          }
        ],
        comments: []
      }
    }).as('getAssignedExceptionDetail');
    
    // Refresh the exception details
    cy.get('[data-testid="refresh-details"]').click();
    cy.wait('@getAssignedExceptionDetail');
    
    // Verify that the assignee is updated
    cy.get('[data-testid="exception-assignee"]').should('contain', TEST_USERS.COMPLIANCE.displayName);
  });

  it('should escalate an exception', () => {
    // Intercept the exception detail API call
    cy.intercept('GET', '/api/v1/exceptions/exc-001', {
      statusCode: 200,
      body: {
        id: 'exc-001',
        type: 'Data',
        severity: 'Critical',
        status: 'Open',
        timestamp: '2023-06-15T09:15:00Z',
        description: 'Security reference data mapping conflict',
        source: 'Data Ingestion Service',
        affectedEntity: 'AAPL (Apple Inc.)',
        assignee: null,
        details: {
          conflictSource1: 'Reuters',
          conflictSource2: 'Bloomberg',
          conflictField: 'securityIdentifier',
          conflictValue1: 'AAPL.O',
          conflictValue2: 'AAPL UW'
        },
        timeline: [
          {
            timestamp: '2023-06-15T09:15:00Z',
            action: 'Created',
            user: 'system',
            notes: 'Automatically created by Data Ingestion Service'
          }
        ],
        comments: [],
        escalationLevel: null
      }
    }).as('getExceptionDetail');
    
    // Intercept the escalate API call
    cy.intercept('POST', '/api/v1/exceptions/exc-001/escalate', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Exception escalated successfully'
      }
    }).as('escalateException');
    
    // Click on the first exception in the queue
    cy.get('[data-testid="exception-item"]').first().click();
    
    // Wait for the exception detail API call
    cy.wait('@getExceptionDetail');
    
    // Click the Escalate button
    cy.get('[data-testid="action-escalate"]').click();
    
    // Select an escalation level
    cy.get('[data-testid="escalate-level"]').click();
    cy.get('[data-testid="escalate-level-option-High"]').click();
    
    // Enter escalation reason
    cy.get('[data-testid="escalate-reason"]').type('Requires immediate attention due to market impact');
    
    // Submit the escalation
    cy.get('[data-testid="escalate-submit"]').click();
    
    // Wait for the escalate API call
    cy.wait('@escalateException');
    
    // Verify that a success notification is displayed
    cy.get('[data-testid="notification"]').should('contain', 'Exception escalated successfully');
    
    // Intercept the updated exception detail after escalation
    cy.intercept('GET', '/api/v1/exceptions/exc-001', {
      statusCode: 200,
      body: {
        id: 'exc-001',
        type: 'Data',
        severity: 'Critical',
        status: 'Open',
        timestamp: '2023-06-15T09:15:00Z',
        description: 'Security reference data mapping conflict',
        source: 'Data Ingestion Service',
        affectedEntity: 'AAPL (Apple Inc.)',
        assignee: null,
        details: {
          conflictSource1: 'Reuters',
          conflictSource2: 'Bloomberg',
          conflictField: 'securityIdentifier',
          conflictValue1: 'AAPL.O',
          conflictValue2: 'AAPL UW'
        },
        timeline: [
          {
            timestamp: '2023-06-15T09:15:00Z',
            action: 'Created',
            user: 'system',
            notes: 'Automatically created by Data Ingestion Service'
          },
          {
            timestamp: '2023-06-15T10:30:00Z',
            action: 'Escalated',
            user: TEST_USERS.OPERATIONS.username,
            notes: 'Requires immediate attention due to market impact',
            escalationLevel: 'High'
          }
        ],
        comments: [],
        escalationLevel: 'High'
      }
    }).as('getEscalatedExceptionDetail');
    
    // Refresh the exception details
    cy.get('[data-testid="refresh-details"]').click();
    cy.wait('@getEscalatedExceptionDetail');
    
    // Verify that the escalation level is displayed
    cy.get('[data-testid="exception-escalation-level"]').should('contain', 'High');
  });

  it('should add a comment to an exception', () => {
    // Intercept the exception detail API call
    cy.intercept('GET', '/api/v1/exceptions/exc-001', {
      statusCode: 200,
      body: {
        id: 'exc-001',
        type: 'Data',
        severity: 'Critical',
        status: 'Open',
        timestamp: '2023-06-15T09:15:00Z',
        description: 'Security reference data mapping conflict',
        source: 'Data Ingestion Service',
        affectedEntity: 'AAPL (Apple Inc.)',
        assignee: null,
        details: {
          conflictSource1: 'Reuters',
          conflictSource2: 'Bloomberg',
          conflictField: 'securityIdentifier',
          conflictValue1: 'AAPL.O',
          conflictValue2: 'AAPL UW'
        },
        timeline: [
          {
            timestamp: '2023-06-15T09:15:00Z',
            action: 'Created',
            user: 'system',
            notes: 'Automatically created by Data Ingestion Service'
          }
        ],
        comments: []
      }
    }).as('getExceptionDetail');
    
    // Intercept the add comment API call
    cy.intercept('POST', '/api/v1/exceptions/exc-001/comments', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Comment added successfully'
      }
    }).as('addComment');
    
    // Click on the first exception in the queue
    cy.get('[data-testid="exception-item"]').first().click();
    
    // Wait for the exception detail API call
    cy.wait('@getExceptionDetail');
    
    // Enter a comment
    cy.get('[data-testid="comment-input"]').type('This is a test comment for the exception');
    
    // Submit the comment
    cy.get('[data-testid="add-comment-button"]').click();
    
    // Wait for the add comment API call
    cy.wait('@addComment');
    
    // Verify that a success notification is displayed
    cy.get('[data-testid="notification"]').should('contain', 'Comment added successfully');
    
    // Intercept the updated exception detail after adding comment
    cy.intercept('GET', '/api/v1/exceptions/exc-001', {
      statusCode: 200,
      body: {
        id: 'exc-001',
        type: 'Data',
        severity: 'Critical',
        status: 'Open',
        timestamp: '2023-06-15T09:15:00Z',
        description: 'Security reference data mapping conflict',
        source: 'Data Ingestion Service',
        affectedEntity: 'AAPL (Apple Inc.)',
        assignee: null,
        details: {
          conflictSource1: 'Reuters',
          conflictSource2: 'Bloomberg',
          conflictField: 'securityIdentifier',
          conflictValue1: 'AAPL.O',
          conflictValue2: 'AAPL UW'
        },
        timeline: [
          {
            timestamp: '2023-06-15T09:15:00Z',
            action: 'Created',
            user: 'system',
            notes: 'Automatically created by Data Ingestion Service'
          }
        ],
        comments: [
          {
            id: 'com-001',
            userId: TEST_USERS.OPERATIONS.username,
            userDisplayName: TEST_USERS.OPERATIONS.displayName,
            timestamp: '2023-06-15T10:45:00Z',
            text: 'This is a test comment for the exception'
          }
        ]
      }
    }).as('getCommentedExceptionDetail');
    
    // Refresh the exception details
    cy.get('[data-testid="refresh-details"]').click();
    cy.wait('@getCommentedExceptionDetail');
    
    // Verify that the new comment appears in the comments section
    cy.get('[data-testid="exception-comments"]').should('contain', 'This is a test comment for the exception');
  });

  it('should paginate through exceptions', () => {
    // Intercept the second page API call
    cy.intercept('GET', '/api/v1/exceptions*page=1*', {
      statusCode: 200,
      body: {
        content: [
          {
            id: 'exc-004',
            type: 'Integration',
            severity: 'Medium',
            status: 'Open',
            timestamp: '2023-06-15T07:15:00Z',
            description: 'External API connection failure',
            source: 'API Gateway',
            affectedEntity: 'External Provider',
            assignee: null
          },
          {
            id: 'exc-005',
            type: 'System',
            severity: 'Low',
            status: 'Acknowledged',
            timestamp: '2023-06-15T06:45:00Z',
            description: 'Database connection pool warning',
            source: 'Database Service',
            affectedEntity: 'PostgreSQL',
            assignee: 'operations.user'
          },
          {
            id: 'exc-006',
            type: 'Data',
            severity: 'High',
            status: 'Resolved',
            timestamp: '2023-06-15T06:30:00Z',
            description: 'Missing market data for ETF',
            source: 'Market Data Service',
            affectedEntity: 'ETF Basket',
            assignee: 'operations.user'
          }
        ],
        totalElements: 6,
        totalPages: 2,
        size: 3,
        page: 1
      }
    }).as('getExceptionsPage2');
    
    // Intercept the first page API call (for going back)
    cy.intercept('GET', '/api/v1/exceptions*page=0*', {
      statusCode: 200,
      body: {
        content: [
          {
            id: 'exc-001',
            type: 'Data',
            severity: 'Critical',
            status: 'Open',
            timestamp: '2023-06-15T09:15:00Z',
            description: 'Security reference data mapping conflict',
            source: 'Data Ingestion Service',
            affectedEntity: 'AAPL (Apple Inc.)',
            assignee: null
          },
          {
            id: 'exc-002',
            type: 'Calculation',
            severity: 'High',
            status: 'Acknowledged',
            timestamp: '2023-06-15T08:45:00Z',
            description: 'Inventory calculation error for Japan market',
            source: 'Calculation Service',
            affectedEntity: 'Japan Market',
            assignee: 'operations.user'
          },
          {
            id: 'exc-003',
            type: 'System',
            severity: 'Medium',
            status: 'Open',
            timestamp: '2023-06-15T08:30:00Z',
            description: 'Performance degradation in position calculation',
            source: 'Calculation Service',
            affectedEntity: 'Position Engine',
            assignee: null
          }
        ],
        totalElements: 6,
        totalPages: 2,
        size: 3,
        page: 0
      }
    }).as('getExceptionsPage1');
    
    // Update the initial exceptions response to include pagination info
    cy.intercept('GET', '/api/v1/exceptions*', {
      statusCode: 200,
      body: {
        content: [
          {
            id: 'exc-001',
            type: 'Data',
            severity: 'Critical',
            status: 'Open',
            timestamp: '2023-06-15T09:15:00Z',
            description: 'Security reference data mapping conflict',
            source: 'Data Ingestion Service',
            affectedEntity: 'AAPL (Apple Inc.)',
            assignee: null
          },
          {
            id: 'exc-002',
            type: 'Calculation',
            severity: 'High',
            status: 'Acknowledged',
            timestamp: '2023-06-15T08:45:00Z',
            description: 'Inventory calculation error for Japan market',
            source: 'Calculation Service',
            affectedEntity: 'Japan Market',
            assignee: 'operations.user'
          },
          {
            id: 'exc-003',
            type: 'System',
            severity: 'Medium',
            status: 'Open',
            timestamp: '2023-06-15T08:30:00Z',
            description: 'Performance degradation in position calculation',
            source: 'Calculation Service',
            affectedEntity: 'Position Engine',
            assignee: null
          }
        ],
        totalElements: 6,
        totalPages: 2,
        size: 3,
        page: 0
      }
    }).as('getExceptions');
    
    // Refresh the page to get the updated pagination info
    cy.visit('/exceptions');
    cy.wait('@getExceptions');
    
    // Verify that pagination controls are visible
    cy.get('[data-testid="pagination"]').should('be.visible');
    
    // Click on the next page button
    cy.get('[data-testid="pagination-next"]').click();
    
    // Wait for the second page API call
    cy.wait('@getExceptionsPage2');
    
    // Verify that page 2 is now active
    cy.get('[data-testid="pagination-page-2"]').should('have.class', 'active');
    
    // Verify that a different set of exceptions is displayed
    cy.get('[data-testid="exception-item"]').first().should('contain', 'External API connection failure');
    
    // Click on the previous page button
    cy.get('[data-testid="pagination-prev"]').click();
    
    // Wait for the first page API call
    cy.wait('@getExceptionsPage1');
    
    // Verify that page 1 is now active again
    cy.get('[data-testid="pagination-page-1"]').should('have.class', 'active');
    
    // Verify that the original set of exceptions is displayed
    cy.get('[data-testid="exception-item"]').first().should('contain', 'Security reference data mapping conflict');
  });

  it('should refresh the exception list', () => {
    // Intercept the refresh API call
    cy.intercept('GET', '/api/v1/exceptions*', {
      statusCode: 200,
      body: {
        content: [
          {
            id: 'exc-007',
            type: 'Data',
            severity: 'Critical',
            status: 'Open',
            timestamp: '2023-06-15T10:15:00Z',
            description: 'New security reference data conflict',
            source: 'Data Ingestion Service',
            affectedEntity: 'MSFT (Microsoft Corp.)',
            assignee: null
          },
          {
            id: 'exc-001',
            type: 'Data',
            severity: 'Critical',
            status: 'Open',
            timestamp: '2023-06-15T09:15:00Z',
            description: 'Security reference data mapping conflict',
            source: 'Data Ingestion Service',
            affectedEntity: 'AAPL (Apple Inc.)',
            assignee: null
          },
          {
            id: 'exc-002',
            type: 'Calculation',
            severity: 'High',
            status: 'Acknowledged',
            timestamp: '2023-06-15T08:45:00Z',
            description: 'Inventory calculation error for Japan market',
            source: 'Calculation Service',
            affectedEntity: 'Japan Market',
            assignee: 'operations.user'
          }
        ],
        totalElements: 3,
        totalPages: 1,
        size: 10,
        page: 0
      }
    }).as('refreshExceptions');
    
    // Click the refresh button
    cy.get('[data-testid="refresh-button"]').click();
    
    // Wait for the refresh API call
    cy.wait('@refreshExceptions');
    
    // Verify that the exception list is updated
    cy.get('[data-testid="exception-item"]').first().should('contain', 'New security reference data conflict');
    
    // Verify that the last updated timestamp is refreshed
    cy.get('[data-testid="last-updated"]').should('contain', 'Last updated:');
  });

  it('should handle empty exception list gracefully', () => {
    // Intercept the API call with empty results
    cy.intercept('GET', '/api/v1/exceptions*', {
      statusCode: 200,
      body: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        page: 0
      }
    }).as('emptyExceptions');
    
    // Apply filters that result in no matching exceptions
    cy.get('[data-testid="filter-type"]').click();
    cy.get('[data-testid="filter-type-option-Integration"]').click();
    cy.get('[data-testid="filter-severity"]').click();
    cy.get('[data-testid="filter-severity-option-Low"]').click();
    cy.get('[data-testid="apply-filters"]').click();
    
    // Wait for the API call
    cy.wait('@emptyExceptions');
    
    // Verify that an empty state message is displayed
    cy.get('[data-testid="empty-state"]').should('be.visible');
    cy.get('[data-testid="empty-state"]').should('contain', 'No exceptions found');
    cy.get('[data-testid="empty-state"]').should('contain', 'Try adjusting your filters');
  });

  it('should meet performance requirements for loading exceptions', () => {
    // Record the start time
    const startTime = new Date().getTime();
    
    // Reload the page to trigger a fresh load
    cy.visit('/exceptions');
    cy.wait('@getExceptions');
    cy.wait('@getExceptionStats');
    
    // Get the end time
    cy.window().then(() => {
      const endTime = new Date().getTime();
      const loadTime = endTime - startTime;
      
      // Verify that the loading time is within the UI_RESPONSE threshold (3000ms)
      expect(loadTime).to.be.lessThan(3000);
    });
  });
});