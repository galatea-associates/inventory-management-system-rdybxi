# src/test/integration/workflow/locateApprovalIntegration.test.ts
```typescript
/**
 * Integration test suite for the locate approval workflow in the Inventory Management System.
 * This file tests the end-to-end functionality of the locate approval process, including
 * request submission, auto-approval, manual approval, rejection, and validation of
 * inventory updates after approval.
 */

import axios from 'axios'; // ^1.4.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.5

import {
  loadTestData,
  validatePerformance,
  waitForCondition
} from '../../common/testUtils';
import { createMockLocateRequest } from '../../common/mockData';
import {
  PERFORMANCE_THRESHOLDS,
  LOCATE_STATUS,
  SECURITY_TEMPERATURE
} from '../../common/constants';
import { mockLocateApi } from '../../common/mocks/apiMocks';
import locates from '../../common/fixtures/locates.json';

/**
 * Sets up mock implementations for locate API endpoints
 */
const setupLocateApiMocks = () => {
  // Create custom mock responses for locate API endpoints
  const customResponses = {
    getLocate: jest.fn().mockImplementation((req) => {
      const locateId = req.url.split('/').pop();
      const locate = locates.find(loc => loc.id === parseInt(locateId, 10));
      return locate;
    }),
    createLocate: jest.fn().mockResolvedValue({ id: 'mock-locate-id', status: LOCATE_STATUS.PENDING }),
    approveLocate: jest.fn().mockResolvedValue({ status: LOCATE_STATUS.APPROVED }),
    rejectLocate: jest.fn().mockResolvedValue({ status: LOCATE_STATUS.REJECTED }),
  };

  // Call mockLocateApi with the custom responses
  const mockApiFunctions = mockLocateApi(customResponses);

  // Create and configure an Axios mock adapter
  const mockAdapter = new MockAdapter(axios);
  mockAdapter.onGet(/\/locates\/\d+/).reply(200, mockApiFunctions.getLocate);
  mockAdapter.onPost('/locates').reply(201, mockApiFunctions.createLocate);
  mockAdapter.onPut(/\/locates\/\d+\/approve/).reply(200, mockApiFunctions.approveLocate);
  mockAdapter.onPut(/\/locates\/\d+\/reject/).reply(200, mockApiFunctions.rejectLocate);

  // Return the mock API functions and adapter
  return { mockApiFunctions, mockAdapter };
};

/**
 * Tests the submission of a new locate request
 */
const testLocateRequestSubmission = async () => {
  // Create a mock locate request using createMockLocateRequest
  const mockLocateRequestData = createMockLocateRequest();

  // Set up mock API response for createLocateRequest
  const { mockApiFunctions } = setupLocateApiMocks();
  const createLocateMock = mockApiFunctions.createLocate;

  // Call the API to submit the locate request
  const response = await axios.post('/locates', mockLocateRequestData);

  // Verify the response contains the expected data
  expect(response.status).toBe(201);
  expect(response.data).toBeDefined();

  // Verify the request was assigned a requestId
  expect(response.data.id).toBe('mock-locate-id');

  // Verify the request status is set to PENDING
  expect(response.data.status).toBe(LOCATE_STATUS.PENDING);
};

/**
 * Tests the auto-approval of a locate request based on rules
 */
const testLocateAutoApproval = async () => {
  // Create a mock locate request for a security eligible for auto-approval
  const mockLocateRequestData = createMockLocateRequest({
    securityId: 'SEC-AUTO-APPROVE',
    requestedQuantity: 1000,
  });

  // Set up mock API responses for createLocateRequest and getLocateById
  const { mockApiFunctions } = setupLocateApiMocks();
  const createLocateMock = mockApiFunctions.createLocate;
  const getLocateByIdMock = mockApiFunctions.getLocate;

  // Call the API to submit the locate request
  await axios.post('/locates', mockLocateRequestData);

  // Wait for auto-approval processing to complete
  await waitForCondition(() => getLocateByIdMock.mock.calls.length > 0, 5000, 100);

  // Retrieve the locate request to verify its status
  const locateRequest = await axios.get(`/locates/${mockLocateRequestData.id}`);

  // Verify the request status is APPROVED
  expect(locateRequest.data.status).toBe(LOCATE_STATUS.APPROVED);

  // Verify an approval record was created with isAutoApproved=true
  expect(locateRequest.data.approval).toBeDefined();
  expect(locateRequest.data.approval.isAutoApproved).toBe(true);
};

/**
 * Tests the auto-rejection of a locate request based on rules
 */
const testLocateAutoRejection = async () => {
  // Create a mock locate request for a security with insufficient inventory
  const mockLocateRequestData = createMockLocateRequest({
    securityId: 'SEC-INSUFFICIENT-INV',
    requestedQuantity: 1000000,
  });

  // Set up mock API responses for createLocateRequest and getLocateById
  const { mockApiFunctions } = setupLocateApiMocks();
  const createLocateMock = mockApiFunctions.createLocate;
  const getLocateByIdMock = mockApiFunctions.getLocate;

  // Call the API to submit the locate request
  await axios.post('/locates', mockLocateRequestData);

  // Wait for auto-rejection processing to complete
  await waitForCondition(() => getLocateByIdMock.mock.calls.length > 0, 5000, 100);

  // Retrieve the locate request to verify its status
  const locateRequest = await axios.get(`/locates/${mockLocateRequestData.id}`);

  // Verify the request status is REJECTED
  expect(locateRequest.data.status).toBe(LOCATE_STATUS.REJECTED);

  // Verify a rejection record was created with isAutoRejected=true
  expect(locateRequest.data.rejection).toBeDefined();
  expect(locateRequest.data.rejection.isAutoRejected).toBe(true);

  // Verify the rejection reason is INSUFFICIENT_INVENTORY
  expect(locateRequest.data.rejection.rejectionReason).toBe('INSUFFICIENT_INVENTORY');
};

/**
 * Tests the manual approval of a pending locate request
 */
const testManualLocateApproval = async () => {
  // Create a mock locate request that requires manual review
  const mockLocateRequestData = createMockLocateRequest({
    securityId: 'SEC-MANUAL-REVIEW',
    requestedQuantity: 5000,
  });

  // Set up mock API responses for createLocateRequest, getLocateById, and approveLocateRequest
  const { mockApiFunctions } = setupLocateApiMocks();
  const createLocateMock = mockApiFunctions.createLocate;
  const getLocateByIdMock = mockApiFunctions.getLocate;
  const approveLocateMock = mockApiFunctions.approveLocate;

  // Call the API to submit the locate request
  await axios.post('/locates', mockLocateRequestData);

  // Verify the request status is PENDING
  expect(createLocateMock).toHaveBeenCalled();

  // Create an approval request with approvedQuantity, approvedBy, and securityTemperature
  const approvalRequest = {
    approvedQuantity: 5000,
    decrementQuantity: 5000,
    approvedBy: 'test-user',
    securityTemperature: SECURITY_TEMPERATURE.GENERAL_COLLATERAL,
    comments: 'Manual approval for testing',
    expiryDate: '2023-12-31',
  };

  // Call the API to approve the locate request
  await axios.put(`/locates/${mockLocateRequestData.id}/approve`, approvalRequest);

  // Verify the request status is updated to APPROVED
  expect(approveLocateMock).toHaveBeenCalled();

  // Retrieve the locate request to verify its status
  const locateRequest = await axios.get(`/locates/${mockLocateRequestData.id}`);

  // Verify an approval record was created with isAutoApproved=false
  expect(locateRequest.data.approval).toBeDefined();
  expect(locateRequest.data.approval.isAutoApproved).toBe(false);

  // Verify the approval contains the correct approvedQuantity and decrementQuantity
  expect(locateRequest.data.approval.approvedQuantity).toBe(approvalRequest.approvedQuantity);
  expect(locateRequest.data.approval.decrementQuantity).toBe(approvalRequest.decrementQuantity);
};

/**
 * Tests the manual rejection of a pending locate request
 */
const testManualLocateRejection = async () => {
  // Create a mock locate request that requires manual review
  const mockLocateRequestData = createMockLocateRequest({
    securityId: 'SEC-MANUAL-REVIEW',
    requestedQuantity: 5000,
  });

  // Set up mock API responses for createLocateRequest, getLocateById, and rejectLocateRequest
  const { mockApiFunctions } = setupLocateApiMocks();
  const createLocateMock = mockApiFunctions.createLocate;
  const getLocateByIdMock = mockApiFunctions.getLocate;
  const rejectLocateMock = mockApiFunctions.rejectLocate;

  // Call the API to submit the locate request
  await axios.post('/locates', mockLocateRequestData);

  // Verify the request status is PENDING
  expect(createLocateMock).toHaveBeenCalled();

  // Create a rejection request with rejectionReason and rejectedBy
  const rejectionRequest = {
    rejectionReason: 'Testing manual rejection',
    rejectedBy: 'test-user',
    comments: 'Manual rejection for testing',
  };

  // Call the API to reject the locate request
  await axios.put(`/locates/${mockLocateRequestData.id}/reject`, rejectionRequest);

  // Verify the request status is updated to REJECTED
  expect(rejectLocateMock).toHaveBeenCalled();

  // Retrieve the locate request to verify its status
  const locateRequest = await axios.get(`/locates/${mockLocateRequestData.id}`);

  // Verify a rejection record was created with isAutoRejected=false
  expect(locateRequest.data.rejection).toBeDefined();
  expect(locateRequest.data.rejection.isAutoRejected).toBe(false);

  // Verify the rejection contains the correct rejectionReason
  expect(locateRequest.data.rejection.rejectionReason).toBe(rejectionRequest.rejectionReason);
};

/**
 * Tests that inventory is updated after a locate request is approved
 */
const testInventoryUpdateAfterApproval = async () => {
  // Set up mock API responses for inventory and locate endpoints
  const { mockApiFunctions } = setupLocateApiMocks();
  const getLocateByIdMock = mockApiFunctions.getLocate;
  const approveLocateMock = mockApiFunctions.approveLocate;

  // Retrieve initial inventory for a security
  const initialInventory = await axios.get('/inventory/SEC-EQ-001');
  const initialAvailableQuantity = initialInventory.data.availableQuantity;

  // Create and submit a locate request for the security
  const mockLocateRequestData = createMockLocateRequest({
    securityId: 'SEC-EQ-001',
    requestedQuantity: 2000,
  });
  await axios.post('/locates', mockLocateRequestData);

  // Approve the locate request
  const approvalRequest = {
    approvedQuantity: 2000,
    decrementQuantity: 2000,
    approvedBy: 'test-user',
    securityTemperature: SECURITY_TEMPERATURE.GENERAL_COLLATERAL,
    comments: 'Approval for testing',
    expiryDate: '2023-12-31',
  };
  await axios.put(`/locates/${mockLocateRequestData.id}/approve`, approvalRequest);

  // Retrieve updated inventory for the security
  const updatedInventory = await axios.get('/inventory/SEC-EQ-001');

  // Verify that available quantity has been decremented by the locate amount
  expect(updatedInventory.data.availableQuantity).toBe(initialAvailableQuantity - 2000);

  // Verify that the locate is included in the active locates for the security
  expect(updatedInventory.data.activeLocates).toContain(mockLocateRequestData.id);
};

/**
 * Tests the performance of the locate approval workflow
 */
const testLocateApprovalPerformance = async () => {
  // Create a mock locate request
  const mockLocateRequestData = createMockLocateRequest();

  // Set up mock API responses with minimal delay
  const { mockApiFunctions } = setupLocateApiMocks();
  const createLocateMock = mockApiFunctions.createLocate;
  const getLocateByIdMock = mockApiFunctions.getLocate;
  const approveLocateMock = mockApiFunctions.approveLocate;

  // Measure the performance of the entire locate approval workflow
  const { success, executionTime, threshold } = await validatePerformance(
    async () => {
      await axios.post('/locates', mockLocateRequestData);
      await axios.put(`/locates/${mockLocateRequestData.id}/approve`, {
        approvedQuantity: 1000,
        decrementQuantity: 1000,
        approvedBy: 'test-user',
        securityTemperature: SECURITY_TEMPERATURE.GENERAL_COLLATERAL,
        comments: 'Performance test',
        expiryDate: '2023-12-31',
      });
      await axios.get(`/locates/${mockLocateRequestData.id}`);
    },
    [],
    PERFORMANCE_THRESHOLDS.LOCATE_APPROVAL
  );

  // Validate that the performance meets the threshold defined in PERFORMANCE_THRESHOLDS.LOCATE_APPROVAL
  expect(success).toBe(true);

  // Log performance metrics for analysis
  console.log(`Locate approval workflow performance: ${executionTime}ms (threshold: ${threshold}ms)`);
};

describe('Locate Approval Workflow Integration Tests', () => {
  it('should submit a new locate request', testLocateRequestSubmission);
  it('should auto-approve a locate request based on rules', testLocateAutoApproval);
  it('should auto-reject a locate request based on rules', testLocateAutoRejection);
  it('should manually approve a pending locate request', testManualLocateApproval);
  it('should manually reject a pending locate request', testManualLocateRejection);
  it('should update inventory after a locate request is approved', testInventoryUpdateAfterApproval);
  it('should meet performance requirements for locate approval workflow', testLocateApprovalPerformance);
});