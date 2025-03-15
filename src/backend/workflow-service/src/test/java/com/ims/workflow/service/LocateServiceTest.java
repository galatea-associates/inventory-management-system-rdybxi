# src/backend/workflow-service/src/test/java/com/ims/workflow/service/LocateServiceTest.java
```java
package com.ims.workflow.service;

import com.ims.common.event.InventoryEvent;
import com.ims.common.event.LocateEvent;
import com.ims.common.model.AggregationUnit;
import com.ims.common.model.Counterparty;
import com.ims.common.model.Security;
import com.ims.workflow.exception.WorkflowException;
import com.ims.workflow.model.LocateApproval;
import com.ims.workflow.model.LocateRejection;
import com.ims.workflow.model.LocateRequest;
import com.ims.workflow.model.WorkflowRule;
import com.ims.workflow.publisher.WorkflowEventPublisher;
import com.ims.workflow.repository.LocateRepository;
import java.math.BigDecimal; // version: 17
import java.time.LocalDate; // version: 17
import java.time.LocalDateTime; // version: 17
import java.util.Arrays; // version: 17
import java.util.HashMap; // version: 17
import java.util.List; // version: 17
import java.util.Map; // version: 17
import java.util.Optional; // version: 17
import java.util.UUID; // version: 17
import java.util.concurrent.CompletableFuture; // version: 17
import org.junit.jupiter.api.BeforeEach; // version: 5.9.2
import org.junit.jupiter.api.DisplayName; // version: 5.9.2
import org.junit.jupiter.api.Test; // version: 5.9.2
import org.junit.jupiter.api.extension.ExtendWith; // version: 5.9.2
import org.mockito.ArgumentCaptor; // version: 4.8.1
import org.mockito.InjectMocks; // version: 4.8.1
import org.mockito.Mock; // version: 4.8.1
import org.mockito.Mockito; // version: 4.8.1
import org.mockito.junit.jupiter.MockitoExtension; // version: 4.8.1
import static org.junit.jupiter.api.Assertions.*; // version: 5.9.2
import static org.mockito.ArgumentMatchers.*; // version: 4.8.1
import static org.mockito.Mockito.*; // version: 4.8.1

/**
 * Test class for LocateService that verifies the functionality for creating, retrieving,
 * approving, rejecting, and managing locate requests.
 */
@ExtendWith(MockitoExtension.class)
public class LocateServiceTest {

  @Mock private LocateRepository locateRepository;

  @Mock private WorkflowRuleService ruleService;

  @Mock private WorkflowEventPublisher eventPublisher;

  @InjectMocks private LocateService locateService;

  private Security testSecurity;
  private Counterparty testRequestor;
  private Counterparty testClient;
  private AggregationUnit testAggregationUnit;
  private LocateRequest testRequest;

  /** Set up test fixtures before each test */
  @BeforeEach
  void setUp() {
    // Initialize test data for securities, counterparties, and aggregation units
    testSecurity =
        Security.builder().internalId("SEC123").securityType("EQUITY").market("US").status("ACTIVE").build();
    testRequestor = Counterparty.builder().counterpartyId("REQ456").name("Requestor").build();
    testClient = Counterparty.builder().counterpartyId("CLI789").name("Client").build();
    testAggregationUnit = AggregationUnit.builder().aggregationUnitId("AGG012").name("AggUnit").build();

    // Create sample locate request for testing
    testRequest =
        LocateRequest.builder()
            .requestId("LOC101")
            .security(testSecurity)
            .requestor(testRequestor)
            .client(testClient)
            .aggregationUnit(testAggregationUnit)
            .locateType("SHORT_SELL")
            .requestedQuantity(BigDecimal.valueOf(100))
            .requestTimestamp(LocalDateTime.now())
            .status("PENDING")
            .swapCashIndicator("CASH")
            .build();

    // Set up common mock behaviors
    when(eventPublisher.publishLocateEvent(any(LocateEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));
    when(eventPublisher.publishInventoryEvent(any(InventoryEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));
  }

  /** Test creating a new locate request */
  @Test
  @DisplayName("Should create a new locate request")
  void testCreateLocateRequest() {
    // Create a sample locate request
    LocateRequest request = createSampleLocateRequest();

    // Mock repository save method to return the request
    when(locateRepository.save(any(LocateRequest.class))).thenReturn(request);

    // Mock event publisher to return CompletableFuture.completedFuture(null)
    when(eventPublisher.publishLocateEvent(any(LocateEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call locateService.createLocateRequest with the sample request
    LocateRequest createdRequest = locateService.createLocateRequest(request);

    // Verify repository.save was called with the request
    verify(locateRepository).save(request);

    // Verify eventPublisher.publishLocateEvent was called
    verify(eventPublisher).publishLocateEvent(any(LocateEvent.class));

    // Assert the returned request matches the expected values
    assertEquals(request.getRequestId(), createdRequest.getRequestId());
    assertEquals(request.getSecurity().getInternalId(), createdRequest.getSecurity().getInternalId());
    assertEquals(request.getRequestor().getCounterpartyId(), createdRequest.getRequestor().getCounterpartyId());
    assertEquals(request.getClient().getCounterpartyId(), createdRequest.getClient().getCounterpartyId());
  }

  /** Test retrieving a locate request by ID */
  @Test
  @DisplayName("Should retrieve a locate request by ID")
  void testGetLocateRequest() {
    // Create a sample locate request with known ID
    LocateRequest request = createSampleLocateRequest();
    String requestId = request.getRequestId();

    // Mock repository findByRequestId method to return Optional.of(request)
    when(locateRepository.findByRequestId(requestId)).thenReturn(Optional.of(request));

    // Call locateService.getLocateRequest with the request ID
    Optional<LocateRequest> retrievedRequest = locateService.getLocateRequest(requestId);

    // Verify repository.findByRequestId was called with the ID
    verify(locateRepository).findByRequestId(requestId);

    // Assert the returned Optional contains the expected request
    assertTrue(retrievedRequest.isPresent());
    assertEquals(requestId, retrievedRequest.get().getRequestId());
  }

  /** Test retrieving all pending locate requests */
  @Test
  @DisplayName("Should retrieve all pending locate requests")
  void testGetPendingLocates() {
    // Create a list of sample pending locate requests
    List<LocateRequest> pendingRequests = Arrays.asList(createSampleLocateRequest(), createSampleLocateRequest());

    // Mock repository findPendingLocates method to return the list
    when(locateRepository.findPendingLocates()).thenReturn(pendingRequests);

    // Call locateService.getPendingLocates
    List<LocateRequest> retrievedRequests = locateService.getPendingLocates();

    // Verify repository.findPendingLocates was called
    verify(locateRepository).findPendingLocates();

    // Assert the returned list matches the expected list
    assertEquals(pendingRequests.size(), retrievedRequests.size());
  }

  /** Test retrieving all active locate requests */
  @Test
  @DisplayName("Should retrieve all active locate requests")
  void testGetActiveLocates() {
    // Create a list of sample active locate requests
    List<LocateRequest> activeRequests = Arrays.asList(createSampleLocateRequest(), createSampleLocateRequest());

    // Mock repository findActiveLocates method to return the list
    when(locateRepository.findActiveLocates()).thenReturn(activeRequests);

    // Call locateService.getActiveLocates
    List<LocateRequest> retrievedRequests = locateService.getActiveLocates();

    // Verify repository.findActiveLocates was called
    verify(locateRepository).findActiveLocates();

    // Assert the returned list matches the expected list
    assertEquals(activeRequests.size(), retrievedRequests.size());
  }

  /** Test auto-approval of a locate request when rules determine approval */
  @Test
  @DisplayName("Should auto-approve a locate request when rules determine approval")
  void testProcessAutoApproval_Approve() {
    // Create a sample pending locate request
    LocateRequest request = createSampleLocateRequest();

    // Create a list of workflow rules
    List<WorkflowRule> rules = Arrays.asList(WorkflowRule.builder().ruleId("RULE001").build());

    // Mock ruleService.getActiveLocateRules to return the rules
    when(ruleService.getActiveLocateRules(anyString())).thenReturn(rules);

    // Mock ruleService.processRules to return a context with auto-approval=true
    Map<String, Object> ruleContext = new HashMap<>();
    ruleContext.put("status", "APPROVED");
    when(ruleService.processRules(anyList(), anyMap())).thenReturn(ruleContext);

    // Mock locateService.validateInventoryAvailability to return true
    when(locateService.validateInventoryAvailability(any(LocateRequest.class))).thenReturn(true);

    // Mock repository.save to return the updated request
    when(locateRepository.save(any(LocateRequest.class))).thenReturn(request);

    // Mock eventPublisher methods to return CompletableFuture.completedFuture(null)
    when(eventPublisher.publishLocateEvent(any(LocateEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));
    when(eventPublisher.publishInventoryEvent(any(InventoryEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call locateService.processAutoApproval with the request
    boolean result = locateService.processAutoApproval(request);

    // Verify ruleService.getActiveLocateRules was called with the correct market
    verify(ruleService).getActiveLocateRules(testSecurity.getMarket());

    // Verify ruleService.processRules was called with the rules and context
    verify(ruleService).processRules(rules, anyMap());

    // Verify locateService.validateInventoryAvailability was called
    verify(locateService).validateInventoryAvailability(request);

    // Verify repository.save was called with the updated request
    verify(locateRepository).save(request);

    // Verify eventPublisher.publishLocateEvent was called
    verify(eventPublisher).publishLocateEvent(any(LocateEvent.class));

    // Verify eventPublisher.publishInventoryEvent was called
    verify(eventPublisher).publishInventoryEvent(any(InventoryEvent.class));

    // Assert the request status is now APPROVED
    assertEquals("APPROVED", request.getStatus());

    // Assert the result is true (auto-processed)
    assertTrue(result);
  }

  /** Test auto-rejection of a locate request when rules determine rejection */
  @Test
  @DisplayName("Should auto-reject a locate request when rules determine rejection")
  void testProcessAutoApproval_Reject() {
    // Create a sample pending locate request
    LocateRequest request = createSampleLocateRequest();

    // Create a list of workflow rules
    List<WorkflowRule> rules = Arrays.asList(WorkflowRule.builder().ruleId("RULE001").build());

    // Mock ruleService.getActiveLocateRules to return the rules
    when(ruleService.getActiveLocateRules(anyString())).thenReturn(rules);

    // Mock ruleService.processRules to return a context with auto-rejection=true and rejection-reason
    Map<String, Object> ruleContext = new HashMap<>();
    ruleContext.put("status", "REJECTED");
    ruleContext.put("rejectionReason", "INSUFFICIENT_INVENTORY");
    when(ruleService.processRules(anyList(), anyMap())).thenReturn(ruleContext);

    // Mock repository.save to return the updated request
    when(locateRepository.save(any(LocateRequest.class))).thenReturn(request);

    // Mock eventPublisher.publishLocateEvent to return CompletableFuture.completedFuture(null)
    when(eventPublisher.publishLocateEvent(any(LocateEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call locateService.processAutoApproval with the request
    boolean result = locateService.processAutoApproval(request);

    // Verify ruleService.getActiveLocateRules was called with the correct market
    verify(ruleService).getActiveLocateRules(testSecurity.getMarket());

    // Verify ruleService.processRules was called with the rules and context
    verify(ruleService).processRules(rules, anyMap());

    // Verify repository.save was called with the updated request
    verify(locateRepository).save(request);

    // Verify eventPublisher.publishLocateEvent was called
    verify(eventPublisher).publishLocateEvent(any(LocateEvent.class));

    // Assert the request status is now REJECTED
    assertEquals("REJECTED", request.getStatus());

    // Assert the result is true (auto-processed)
    assertTrue(result);
  }

  /** Test locate request requiring manual review when rules are inconclusive */
  @Test
  @DisplayName("Should require manual review when rules are inconclusive")
  void testProcessAutoApproval_ManualReview() {
    // Create a sample pending locate request
    LocateRequest request = createSampleLocateRequest();

    // Create a list of workflow rules
    List<WorkflowRule> rules = Arrays.asList(WorkflowRule.builder().ruleId("RULE001").build());

    // Mock ruleService.getActiveLocateRules to return the rules
    when(ruleService.getActiveLocateRules(anyString())).thenReturn(rules);

    // Mock ruleService.processRules to return a context without auto-approval or auto-rejection
    Map<String, Object> ruleContext = new HashMap<>();
    when(ruleService.processRules(anyList(), anyMap())).thenReturn(ruleContext);

    // Call locateService.processAutoApproval with the request
    boolean result = locateService.processAutoApproval(request);

    // Verify ruleService.getActiveLocateRules was called with the correct market
    verify(ruleService).getActiveLocateRules(testSecurity.getMarket());

    // Verify ruleService.processRules was called with the rules and context
    verify(ruleService).processRules(rules, anyMap());

    // Verify repository.save was not called
    verify(locateRepository, never()).save(any(LocateRequest.class));

    // Verify eventPublisher methods were not called
    verify(eventPublisher, never()).publishLocateEvent(any(LocateEvent.class));
    verify(eventPublisher, never()).publishInventoryEvent(any(InventoryEvent.class));

    // Assert the request status is still PENDING
    assertEquals("PENDING", request.getStatus());

    // Assert the result is false (not auto-processed)
    assertFalse(result);
  }

  /** Test manual approval of a locate request */
  @Test
  @DisplayName("Should manually approve a locate request")
  void testApproveLocateRequest() {
    // Create a sample pending locate request with known ID
    LocateRequest request = createSampleLocateRequest();
    String requestId = request.getRequestId();

    // Mock repository.findByRequestId to return Optional.of(request)
    when(locateRepository.findByRequestId(requestId)).thenReturn(Optional.of(request));

    // Mock locateService.validateInventoryAvailability to return true
    when(locateService.validateInventoryAvailability(any(LocateRequest.class))).thenReturn(true);

    // Mock repository.save to return the updated request
    when(locateRepository.save(any(LocateRequest.class))).thenReturn(request);

    // Mock eventPublisher methods to return CompletableFuture.completedFuture(null)
    when(eventPublisher.publishLocateEvent(any(LocateEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));
    when(eventPublisher.publishInventoryEvent(any(InventoryEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call locateService.approveLocateRequest with ID, quantity, approver, temperature, and rate
    BigDecimal approvedQuantity = BigDecimal.valueOf(50);
    String approvedBy = "APPROVER";
    String securityTemperature = "HTB";
    BigDecimal borrowRate = BigDecimal.valueOf(0.05);
    LocateRequest approvedRequest =
        locateService.approveLocateRequest(requestId, approvedQuantity, approvedBy, securityTemperature, borrowRate);

    // Verify repository.findByRequestId was called with the ID
    verify(locateRepository).findByRequestId(requestId);

    // Verify locateService.validateInventoryAvailability was called
    verify(locateService).validateInventoryAvailability(any(LocateRequest.class));

    // Verify repository.save was called with the updated request
    verify(locateRepository).save(any(LocateRequest.class));

    // Verify eventPublisher.publishLocateEvent was called
    verify(eventPublisher).publishLocateEvent(any(LocateEvent.class));

    // Verify eventPublisher.publishInventoryEvent was called
    verify(eventPublisher).publishInventoryEvent(any(InventoryEvent.class));

    // Assert the request status is now APPROVED
    assertEquals("APPROVED", approvedRequest.getStatus());

    // Assert the approval details match the expected values
    assertEquals(approvedQuantity, approvedRequest.getApproval().getApprovedQuantity());
    assertEquals(approvedBy, approvedRequest.getApproval().getApprovedBy());
  }

  /** Test locate request approval failure due to insufficient inventory */
  @Test
  @DisplayName("Should throw exception when approving with insufficient inventory")
  void testApproveLocateRequest_InsufficientInventory() {
    // Create a sample pending locate request with known ID
    LocateRequest request = createSampleLocateRequest();
    String requestId = request.getRequestId();

    // Mock repository.findByRequestId to return Optional.of(request)
    when(locateRepository.findByRequestId(requestId)).thenReturn(Optional.of(request));

    // Mock locateService.validateInventoryAvailability to return false
    when(locateService.validateInventoryAvailability(any(LocateRequest.class))).thenReturn(false);

    // Call locateService.approveLocateRequest and expect WorkflowException
    Exception exception =
        assertThrows(
            WorkflowException.class,
            () ->
                locateService.approveLocateRequest(
                    requestId, BigDecimal.valueOf(50), "APPROVER", "HTB", BigDecimal.valueOf(0.05)));

    // Verify repository.findByRequestId was called with the ID
    verify(locateRepository).findByRequestId(requestId);

    // Verify locateService.validateInventoryAvailability was called
    verify(locateService).validateInventoryAvailability(any(LocateRequest.class));

    // Verify repository.save was not called
    verify(locateRepository, never()).save(any(LocateRequest.class));

    // Verify eventPublisher methods were not called
    verify(eventPublisher, never()).publishLocateEvent(any(LocateEvent.class));
    verify(eventPublisher, never()).publishInventoryEvent(any(InventoryEvent.class));
  }

  /** Test manual rejection of a locate request */
  @Test
  @DisplayName("Should manually reject a locate request")
  void testRejectLocateRequest() {
    // Create a sample pending locate request with known ID
    LocateRequest request = createSampleLocateRequest();
    String requestId = request.getRequestId();

    // Mock repository.findByRequestId to return Optional.of(request)
    when(locateRepository.findByRequestId(requestId)).thenReturn(Optional.of(request));

    // Mock repository.save to return the updated request
    when(locateRepository.save(any(LocateRequest.class))).thenReturn(request);

    // Mock eventPublisher.publishLocateEvent to return CompletableFuture.completedFuture(null)
    when(eventPublisher.publishLocateEvent(any(LocateEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call locateService.rejectLocateRequest with ID, reason, and rejector
    String rejectionReason = "INSUFFICIENT_INVENTORY";
    String rejectedBy = "REJECTOR";
    LocateRequest rejectedRequest = locateService.rejectLocateRequest(requestId, rejectionReason, rejectedBy);

    // Verify repository.findByRequestId was called with the ID
    verify(locateRepository).findByRequestId(requestId);

    // Verify repository.save was called with the updated request
    verify(locateRepository).save(any(LocateRequest.class));

    // Verify eventPublisher.publishLocateEvent was called
    verify(eventPublisher).publishLocateEvent(any(LocateEvent.class));

    // Assert the request status is now REJECTED
    assertEquals("REJECTED", rejectedRequest.getStatus());

    // Assert the rejection details match the expected values
    assertEquals(rejectionReason, rejectedRequest.getRejection().getRejectionReason());
    assertEquals(rejectedBy, rejectedRequest.getRejection().getRejectedBy());
  }

  /** Test cancellation of a pending locate request */
  @Test
  @DisplayName("Should cancel a pending locate request")
  void testCancelLocateRequest() {
    // Create a sample pending locate request with known ID
    LocateRequest request = createSampleLocateRequest();
    String requestId = request.getRequestId();

    // Mock repository.findByRequestId to return Optional.of(request)
    when(locateRepository.findByRequestId(requestId)).thenReturn(Optional.of(request));

    // Mock repository.save to return the updated request
    when(locateRepository.save(any(LocateRequest.class))).thenReturn(request);

    // Mock eventPublisher.publishLocateEvent to return CompletableFuture.completedFuture(null)
    when(eventPublisher.publishLocateEvent(any(LocateEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call locateService.cancelLocateRequest with the ID
    LocateRequest cancelledRequest = locateService.cancelLocateRequest(requestId);

    // Verify repository.findByRequestId was called with the ID
    verify(locateRepository).findByRequestId(requestId);

    // Verify repository.save was called with the updated request
    verify(locateRepository).save(any(LocateRequest.class));

    // Verify eventPublisher.publishLocateEvent was called
    verify(eventPublisher).publishLocateEvent(any(LocateEvent.class));

    // Assert the request status is now CANCELLED
    assertEquals("CANCELLED", cancelledRequest.getStatus());
  }

  /** Test expiration of an approved locate request */
  @Test
  @DisplayName("Should expire an approved locate request")
  void testExpireLocateRequest() {
    // Create a sample approved locate request with known ID
    LocateRequest request = createSampleLocateRequest();
    request.setStatus("APPROVED");
    String requestId = request.getRequestId();

    // Mock repository.findByRequestId to return Optional.of(request)
    when(locateRepository.findByRequestId(requestId)).thenReturn(Optional.of(request));

    // Mock repository.save to return the updated request
    when(locateRepository.save(any(LocateRequest.class))).thenReturn(request);

    // Mock eventPublisher.publishLocateEvent to return CompletableFuture.completedFuture(null)
    when(eventPublisher.publishLocateEvent(any(LocateEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call locateService.expireLocateRequest with the ID
    LocateRequest expiredRequest = locateService.expireLocateRequest(requestId);

    // Verify repository.findByRequestId was called with the ID
    verify(locateRepository).findByRequestId(requestId);

    // Verify repository.save was called with the updated request
    verify(locateRepository).save(any(LocateRequest.class));

    // Verify eventPublisher.publishLocateEvent was called
    verify(eventPublisher).publishLocateEvent(any(LocateEvent.class));

    // Assert the request status is now EXPIRED
    assertEquals("EXPIRED", expiredRequest.getStatus());
  }

  /** Test processing of all expired locate requests */
  @Test
  @DisplayName("Should process all expired locate requests")
  void testProcessExpiredLocates() {
    // Create a list of sample approved locate requests with expired dates
    LocateRequest request1 = createSampleLocateRequest();
    request1.setStatus("APPROVED");
    LocateRequest request2 = createSampleLocateRequest();
    request2.setStatus("APPROVED");
    List<LocateRequest> expiredRequests = Arrays.asList(request1, request2);

    // Mock repository.findExpiredLocates to return the list
    when(locateRepository.findExpiredLocates()).thenReturn(expiredRequests);

    // Mock repository.save to return the updated requests
    when(locateRepository.save(any(LocateRequest.class))).thenReturn(request1, request2);

    // Mock eventPublisher.publishLocateEvent to return CompletableFuture.completedFuture(null)
    when(eventPublisher.publishLocateEvent(any(LocateEvent.class)))
        .thenReturn(CompletableFuture.completedFuture(null));

    // Call locateService.processExpiredLocates
    int expiredCount = locateService.processExpiredLocates();

    // Verify repository.findExpiredLocates was called
    verify(locateRepository).findExpiredLocates();

    // Verify repository.save was called for each request
    verify(locateRepository, times(expiredRequests.size())).save(any(LocateRequest.class));

    // Verify eventPublisher.publishLocateEvent was called for each request
    verify(eventPublisher, times(expiredRequests.size())).publishLocateEvent(any(LocateEvent.class));

    // Assert all requests now have EXPIRED status
    expiredRequests.forEach(request -> assertEquals("EXPIRED", request.getStatus()));

    // Assert the returned count matches the list size
    assertEquals(expiredRequests.size(), expiredCount);
  }

  /** Test validation of inventory availability for a locate request */
  @Test
  @DisplayName("Should validate inventory availability for a locate request")
  void testValidateInventoryAvailability() {
    // Create a sample locate request with security ID and quantity
    LocateRequest request = createSampleLocateRequest();

    // Mock external inventory service call (implementation-specific)
    // In a real system, this would call an external service to get inventory data
    // For this test, we'll just mock the locateService method directly
    LocateService locateServiceSpy = Mockito.spy(locateService);
    when(locateServiceSpy.validateInventoryAvailability(request)).thenReturn(true);

    // Call locateService.validateInventoryAvailability with the request
    boolean hasAvailability = locateServiceSpy.validateInventoryAvailability(request);

    // Verify the external inventory service was called with correct parameters
    verify(locateServiceSpy).validateInventoryAvailability(request);

    // Assert the result matches the expected availability
    assertTrue(hasAvailability);
  }

  /** Test calculation of decrement quantity for Hard To Borrow securities */
  @Test
  @DisplayName("Should calculate full decrement for HTB securities")
  void testCalculateDecrementQuantity_HTB() {
    // Create a sample requested quantity
    BigDecimal requestedQuantity = BigDecimal.valueOf(100);

    // Call locateService.calculateDecrementQuantity with quantity and 'HTB'
    BigDecimal decrementQuantity = locateService.calculateDecrementQuantity(requestedQuantity, "HTB");

    // Assert the result equals the full requested quantity (100% decrement)
    assertEquals(requestedQuantity, decrementQuantity);
  }

  /** Test calculation of decrement quantity for General Collateral securities */
  @Test
  @DisplayName("Should calculate partial decrement for GC securities")
  void testCalculateDecrementQuantity_GC() {
    // Create a sample requested quantity
    BigDecimal requestedQuantity = BigDecimal.valueOf(100);

    // Call locateService.calculateDecrementQuantity with quantity and 'GC'
    BigDecimal decrementQuantity = locateService.calculateDecrementQuantity(requestedQuantity, "GC");

    // Assert the result equals a percentage of the requested quantity (e.g., 20% decrement)
    assertEquals(BigDecimal.valueOf(20.0), decrementQuantity);
  }

  /** Test calculation of decrement quantity with default temperature */
  @Test
  @DisplayName("Should calculate default decrement for unknown temperature")
  void testCalculateDecrementQuantity_Default() {
    // Create a sample requested quantity
    BigDecimal requestedQuantity = BigDecimal.valueOf(100);

    // Call locateService.calculateDecrementQuantity with quantity and null/unknown temperature
    BigDecimal decrementQuantity = locateService.calculateDecrementQuantity(requestedQuantity, null);

    // Assert the result equals the default percentage of the requested quantity
    assertEquals(BigDecimal.valueOf(10.0), decrementQuantity);
  }

  /** Helper method to create a sample locate request for testing */
  private LocateRequest createSampleLocateRequest() {
    // Create a Security instance
    Security security = Security.builder().internalId("SEC123").build();

    // Create Counterparty instances for requestor and client
    Counterparty requestor = Counterparty.builder().counterpartyId("REQ456").build();
    Counterparty client = Counterparty.builder().counterpartyId("CLI789").build();

    // Create an AggregationUnit instance
    AggregationUnit aggregationUnit = AggregationUnit.builder().aggregationUnitId("AGG012").build();

    // Create and return a LocateRequest with these components
    return LocateRequest.builder()
        .requestId(UUID.randomUUID().toString())
        .security(security)
        .requestor(requestor)
        .client(client)
        .aggregationUnit(aggregationUnit)
        .locateType("SHORT_SELL")
        .requestedQuantity(BigDecimal.valueOf(100))
        .requestTimestamp(LocalDateTime.now())
        .status("PENDING")
        .swapCashIndicator("CASH")
        .build();
  }

  /** Helper method to create a sample approved locate request for testing */
  private LocateRequest createSampleApprovedLocateRequest() {
    // Create a sample locate request using createSampleLocateRequest
    LocateRequest request = createSampleLocateRequest();

    // Create a LocateApproval instance
    LocateApproval approval = LocateApproval.builder().approvedQuantity(BigDecimal.valueOf(50)).build();

    // Set the request status to APPROVED
    request.setStatus("APPROVED");

    // Set the approval relationship on the request
    // request.setApproval(approval);

    // Return the approved request
    return request;
  }
}