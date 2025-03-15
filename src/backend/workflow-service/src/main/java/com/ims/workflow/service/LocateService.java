# src/backend/workflow-service/src/main/java/com/ims/workflow/service/LocateService.java
```java
package com.ims.workflow.service;

import com.ims.common.event.InventoryEvent;
import com.ims.common.event.LocateEvent;
import com.ims.common.model.Inventory; // version: N/A
import com.ims.workflow.exception.WorkflowException;
import com.ims.workflow.model.LocateApproval;
import com.ims.workflow.model.LocateRejection;
import com.ims.workflow.model.LocateRequest;
import com.ims.workflow.repository.LocateRepository;
import java.math.BigDecimal; // version: 17
import java.time.LocalDate; // version: 17
import java.time.LocalDateTime; // version: 17
import java.util.List; // version: 17
import java.util.Map; // version: 17
import java.util.Optional; // version: 17
import java.util.UUID; // version: 17
import lombok.RequiredArgsConstructor; // version: 1.18.26
import lombok.extern.slf4j.Slf4j; // version: 1.18.26
import org.springframework.scheduling.annotation.Scheduled; // version: 6.0.9
import org.springframework.stereotype.Service; // version: 6.0.9
import org.springframework.transaction.annotation.Transactional; // version: 6.0.9

/**
 * Service responsible for managing locate requests in the system. Handles the locate
 * approval workflow, including request creation, validation, approval, rejection, and
 * expiry.
 */
@Service // Spring service annotation for dependency injection
@Slf4j // Logging facade
@RequiredArgsConstructor // Constructor injection for dependencies
public class LocateService {

  private final LocateRepository locateRepository;
  private final WorkflowRuleService ruleService;
  private final WorkflowEventPublisher eventPublisher;

  /**
   * Creates a new locate request in the system
   *
   * @param request The locate request to create
   * @return The created locate request
   */
  @Transactional // Transaction management for database operations
  public LocateRequest createLocateRequest(LocateRequest request) {
    // Validate the request is not null
    if (request == null) {
      throw new IllegalArgumentException("Locate request cannot be null");
    }

    // Validate the request data using request.isValid()
    if (!request.isValid()) {
      throw new IllegalArgumentException("Invalid locate request data");
    }

    // Generate a unique requestId if not provided
    if (request.getRequestId() == null || request.getRequestId().isEmpty()) {
      request.setRequestId(UUID.randomUUID().toString());
    }

    // Set request status to PENDING if not set
    if (request.getStatus() == null || request.getStatus().isEmpty()) {
      request.setStatus("PENDING");
    }

    // Set request timestamp to current time if not set
    if (request.getRequestTimestamp() == null) {
      request.setRequestTimestamp(LocalDateTime.now());
    }

    // Save the request to the repository
    LocateRequest savedRequest = locateRepository.save(request);

    // Publish a locate request event using request.toLocateEvent()
    LocateEvent locateEvent = savedRequest.toLocateEvent();
    publishLocateEvent(locateEvent);

    // Log the creation of the locate request
    log.info("Created locate request: {}", savedRequest.getRequestId());

    // Return the saved request
    return savedRequest;
  }

  /**
   * Retrieves a locate request by its ID
   *
   * @param requestId The request ID
   * @return The locate request if found, or empty if not found
   */
  @Transactional(readOnly = true) // Transaction management for database operations
  public Optional<LocateRequest> getLocateRequest(String requestId) {
    // Validate requestId is not null or empty
    if (requestId == null || requestId.isEmpty()) {
      throw new IllegalArgumentException("Request ID cannot be null or empty");
    }

    // Query the repository for the locate request by ID
    Optional<LocateRequest> locateRequest = locateRepository.findByRequestId(requestId);

    // Return the result as an Optional
    return locateRequest;
  }

  /**
   * Retrieves all pending locate requests
   *
   * @return List of pending locate requests
   */
  @Transactional(readOnly = true) // Transaction management for database operations
  public List<LocateRequest> getPendingLocates() {
    // Query the repository for all pending locate requests
    List<LocateRequest> pendingLocates = locateRepository.findPendingLocates();

    // Return the list of pending requests
    return pendingLocates;
  }

  /**
   * Retrieves all active locate requests
   *
   * @return List of active locate requests
   */
  @Transactional(readOnly = true) // Transaction management for database operations
  public List<LocateRequest> getActiveLocates() {
    // Query the repository for all active locate requests
    List<LocateRequest> activeLocates = locateRepository.findActiveLocates();

    // Return the list of active requests
    return activeLocates;
  }

  /**
   * Processes auto-approval for a locate request based on rules
   *
   * @param request The locate request to process
   * @return True if the request was auto-processed, false if manual review is needed
   */
  @Transactional // Transaction management for database operations
  public boolean processAutoApproval(LocateRequest request) {
    // Validate the request is not null and in PENDING status
    if (request == null) {
      throw new IllegalArgumentException("Locate request cannot be null");
    }
    if (!request.isPending()) {
      throw new IllegalArgumentException("Locate request must be in PENDING status");
    }

    // Get active locate rules for the security's market
    String market = request.getSecurity().getMarket();
    List<WorkflowRule> rules = ruleService.getActiveLocateRules(market);

    // Create a rule evaluation context with request data
    Map<String, Object> context = new HashMap<>();
    context.put("securityId", request.getSecurity().getInternalId());
    context.put("clientId", request.getClient().getCounterpartyId());
    context.put("requestedQuantity", request.getRequestedQuantity());
    context.put("market", market);

    // Process the rules against the context
    Map<String, Object> resultContext = ruleService.processRules(rules, context);

    // If rules determine auto-approval:
    if ("APPROVED".equals(resultContext.get("status"))) {
      // Check inventory availability
      if (validateInventoryAvailability(request)) {
        // If sufficient inventory, create approval with auto-approval flag
        BigDecimal decrementQuantity = calculateDecrementQuantity(request.getRequestedQuantity(), (String) resultContext.get("securityTemperature"));

        LocateApproval approval =
            LocateApproval.builder()
                .approvalId(UUID.randomUUID().toString())
                .approvedQuantity(request.getRequestedQuantity())
                .decrementQuantity(decrementQuantity)
                .approvedBy("SYSTEM")
                .securityTemperature((String) resultContext.get("securityTemperature"))
                .borrowRate((BigDecimal) resultContext.get("borrowRate"))
                .isAutoApproved(true)
                .build();

        approveLocateRequestInternal(request, approval);
      } else {
        // If insufficient inventory, create rejection with reason
        LocateRejection rejection =
            LocateRejection.builder()
                .rejectionId(UUID.randomUUID().toString())
                .rejectionReason("INSUFFICIENT_INVENTORY")
                .rejectedBy("SYSTEM")
                .isAutoRejected(true)
                .build();

        rejectLocateRequestInternal(request, rejection);
      }
    } else if ("REJECTED".equals(resultContext.get("status"))) {
      // If rules determine auto-rejection:
      // Create rejection with auto-rejection flag
      LocateRejection rejection =
          LocateRejection.builder()
              .rejectionId(UUID.randomUUID().toString())
              .rejectionReason((String) resultContext.get("rejectionReason"))
              .rejectedBy("SYSTEM")
              .isAutoRejected(true)
              .build();

      rejectLocateRequestInternal(request, rejection);
    } else {
      // If neither auto-approval nor auto-rejection, return false (manual review)
      return false;
    }

    // Return true if auto-processed, false otherwise
    return true;
  }

  /**
   * Approves a locate request with the provided approval details
   *
   * @param requestId The ID of the locate request to approve
   * @param approvedQuantity The quantity of securities approved for the locate
   * @param approvedBy The user who approved the locate
   * @param securityTemperature The temperature of the security (HTB, GC)
   * @param borrowRate The borrow rate for this security
   * @return The approved locate request
   */
  @Transactional // Transaction management for database operations
  public LocateRequest approveLocateRequest(
      String requestId,
      BigDecimal approvedQuantity,
      String approvedBy,
      String securityTemperature,
      BigDecimal borrowRate) {
    // Retrieve the locate request by ID
    LocateRequest request =
        locateRepository
            .findByRequestId(requestId)
            .orElseThrow(
                () ->
                    WorkflowException.locateWorkflowError(
                        "LOCATE_APPROVAL", "Locate request not found: " + requestId));

    // Validate the request exists and is in PENDING status
    if (!request.isPending()) {
      throw WorkflowException.locateWorkflowError(
          "LOCATE_APPROVAL", "Locate request must be in PENDING status");
    }

    // Validate inventory availability for the requested security
    if (!validateInventoryAvailability(request)) {
      throw WorkflowException.locateWorkflowError(
          "LOCATE_APPROVAL", "Insufficient inventory for security: " + request.getSecurity().getInternalId());
    }

    // Calculate the decrement quantity based on security temperature
    BigDecimal decrementQuantity = calculateDecrementQuantity(approvedQuantity, securityTemperature);

    // Create a LocateApproval with the provided details
    LocateApproval approval =
        LocateApproval.builder()
            .approvalId(UUID.randomUUID().toString())
            .approvedQuantity(approvedQuantity)
            .decrementQuantity(decrementQuantity)
            .approvedBy(approvedBy)
            .securityTemperature(securityTemperature)
            .borrowRate(borrowRate)
            .isAutoApproved(false)
            .build();

    return approveLocateRequestInternal(request, approval);
  }

  private LocateRequest approveLocateRequestInternal(LocateRequest request, LocateApproval approval) {
    // Set approval timestamp to current time
    approval.setApprovalTimestamp(LocalDateTime.now());

    // Set expiryDate to current date plus 1 business day
    approval.setExpiryDate(LocalDate.now().plusDays(1));

    // Update the request with the approval
    request.approve(approval);

    // Save the updated request
    LocateRequest updatedRequest = locateRepository.save(request);

    // Publish locate approval event
    LocateEvent locateEvent = approval.toLocateEvent();
    publishLocateEvent(locateEvent);

    // Publish inventory update event
    InventoryEvent inventoryEvent = approval.toInventoryEvent();
    publishInventoryEvent(inventoryEvent);

    // Log the approval of the locate request
    log.info("Approved locate request: {}", request.getRequestId());

    // Return the updated request
    return updatedRequest;
  }

  /**
   * Rejects a locate request with the provided rejection reason
   *
   * @param requestId The ID of the locate request to reject
   * @param rejectionReason The reason for the rejection
   * @param rejectedBy The user who rejected the locate
   * @return The rejected locate request
   */
  @Transactional // Transaction management for database operations
  public LocateRequest rejectLocateRequest(String requestId, String rejectionReason, String rejectedBy) {
    // Retrieve the locate request by ID
    LocateRequest request =
        locateRepository
            .findByRequestId(requestId)
            .orElseThrow(
                () ->
                    WorkflowException.locateWorkflowError(
                        "LOCATE_REJECTION", "Locate request not found: " + requestId));

    // Validate the request exists and is in PENDING status
    if (!request.isPending()) {
      throw WorkflowException.locateWorkflowError(
          "LOCATE_REJECTION", "Locate request must be in PENDING status");
    }

    // Create a LocateRejection with the provided details
    LocateRejection rejection =
        LocateRejection.builder()
            .rejectionId(UUID.randomUUID().toString())
            .rejectionReason(rejectionReason)
            .rejectedBy(rejectedBy)
            .isAutoRejected(false)
            .build();

    return rejectLocateRequestInternal(request, rejection);
  }

  private LocateRequest rejectLocateRequestInternal(LocateRequest request, LocateRejection rejection) {
    // Set rejection timestamp to current time
    rejection.setRejectionTimestamp(LocalDateTime.now());

    // Update the request with the rejection
    request.reject(rejection);

    // Save the updated request
    LocateRequest updatedRequest = locateRepository.save(request);

    // Publish locate rejection event
    LocateEvent locateEvent = rejection.toLocateEvent();
    publishLocateEvent(locateEvent);

    // Log the rejection of the locate request
    log.info("Rejected locate request: {}", request.getRequestId());

    // Return the updated request
    return updatedRequest;
  }

  /**
   * Cancels a pending locate request
   *
   * @param requestId The ID of the locate request to cancel
   * @return The cancelled locate request
   */
  @Transactional // Transaction management for database operations
  public LocateRequest cancelLocateRequest(String requestId) {
    // Retrieve the locate request by ID
    LocateRequest request =
        locateRepository
            .findByRequestId(requestId)
            .orElseThrow(
                () ->
                    WorkflowException.locateWorkflowError(
                        "LOCATE_CANCELLATION", "Locate request not found: " + requestId));

    // Validate the request exists and is in PENDING status
    if (!request.isPending()) {
      throw WorkflowException.locateWorkflowError(
          "LOCATE_CANCELLATION", "Locate request must be in PENDING status");
    }

    // Cancel the request using request.cancel()
    request.cancel();

    // Save the updated request
    LocateRequest updatedRequest = locateRepository.save(request);

    // Publish locate cancellation event
    LocateEvent locateEvent = updatedRequest.toLocateEvent();
    publishLocateEvent(locateEvent);

    // Log the cancellation of the locate request
    log.info("Cancelled locate request: {}", request.getRequestId());

    // Return the updated request
    return updatedRequest;
  }

  /**
   * Expires an approved locate request
   *
   * @param requestId The ID of the locate request to expire
   * @return The expired locate request
   */
  @Transactional // Transaction management for database operations
  public LocateRequest expireLocateRequest(String requestId) {
    // Retrieve the locate request by ID
    LocateRequest request =
        locateRepository
            .findByRequestId(requestId)
            .orElseThrow(
                () ->
                    WorkflowException.locateWorkflowError(
                        "LOCATE_EXPIRATION", "Locate request not found: " + requestId));

    // Validate the request exists and is in APPROVED status
    if (!request.isApproved()) {
      throw WorkflowException.locateWorkflowError(
          "LOCATE_EXPIRATION", "Locate request must be in APPROVED status");
    }

    // Expire the request using request.expire()
    request.expire();

    // Save the updated request
    LocateRequest updatedRequest = locateRepository.save(request);

    // Publish locate expiry event
    LocateEvent locateEvent = updatedRequest.toLocateEvent();
    publishLocateEvent(locateEvent);

    // Log the expiration of the locate request
    log.info("Expired locate request: {}", request.getRequestId());

    // Return the updated request
    return updatedRequest;
  }

  /**
   * Processes all expired locate requests Scheduled to run daily at midnight
   *
   * @return The number of locate requests expired
   */
  @Transactional // Transaction management for database operations
  @Scheduled(cron = "0 0 0 * * ?") // Scheduling for periodic tasks like locate expiry
  public int processExpiredLocates() {
    // Retrieve all expired locate requests
    List<LocateRequest> expiredLocates = locateRepository.findExpiredLocates();

    // For each expired request:
    for (LocateRequest request : expiredLocates) {
      // Expire the request using request.expire()
      request.expire();

      // Save the updated request
      locateRepository.save(request);

      // Publish locate expiry event
      LocateEvent locateEvent = request.toLocateEvent();
      publishLocateEvent(locateEvent);
    }

    // Log the number of requests expired
    log.info("Processed {} expired locate requests", expiredLocates.size());

    // Return the count of expired requests
    return expiredLocates.size();
  }

  /**
   * Validates if there is sufficient inventory available for a locate request
   *
   * @param request The locate request to validate
   * @return True if sufficient inventory is available, false otherwise
   */
  public boolean validateInventoryAvailability(LocateRequest request) {
    // Extract security ID from request
    String securityId = request.getSecurity().getInternalId();

    // Call external inventory service to check availability
    // This is a placeholder for the actual implementation
    // In a real system, this would call an external service to get inventory data
    Inventory inventory = new Inventory();
    inventory.setAvailableQuantity(BigDecimal.valueOf(10000)); // Example availability

    // Compare requested quantity with available quantity
    BigDecimal requestedQuantity = request.getRequestedQuantity();
    boolean hasAvailability = inventory.hasAvailability();

    // Return true if available quantity is sufficient, false otherwise
    return hasAvailability && inventory.getRemainingAvailability().compareTo(requestedQuantity) >= 0;
  }

  /**
   * Calculates the decrement quantity based on security temperature and requested quantity
   *
   * @param requestedQuantity The quantity requested
   * @param securityTemperature The temperature of the security (HTB, GC)
   * @return The calculated decrement quantity
   */
  public BigDecimal calculateDecrementQuantity(BigDecimal requestedQuantity, String securityTemperature) {
    // If securityTemperature is 'HTB' (Hard To Borrow):
    if ("HTB".equals(securityTemperature)) {
      // Return the full requested quantity (100% decrement)
      return requestedQuantity;
    }

    // If securityTemperature is 'GC' (General Collateral):
    if ("GC".equals(securityTemperature)) {
      // Return a percentage of the requested quantity (e.g., 20% decrement)
      return requestedQuantity.multiply(BigDecimal.valueOf(0.2));
    }

    // Otherwise, return a default percentage of the requested quantity
    return requestedQuantity.multiply(BigDecimal.valueOf(0.1));
  }

  /**
   * Publishes a locate event to the event bus
   *
   * @param event The locate event to publish
   */
  public void publishLocateEvent(LocateEvent event) {
    // Validate the event is not null
    if (event == null) {
      throw new IllegalArgumentException("Locate event cannot be null");
    }

    // Use eventPublisher to publish the locate event
    eventPublisher.publishLocateEvent(event);

    // Log the event publication
    log.info("Published locate event: {}", event);
  }

  /**
   * Publishes an inventory event to the event bus
   *
   * @param event The inventory event to publish
   */
  public void publishInventoryEvent(InventoryEvent event) {
    // Validate the event is not null
    if (event == null) {
      throw new IllegalArgumentException("Inventory event cannot be null");
    }

    // Use eventPublisher to publish the inventory event
    eventPublisher.publishInventoryEvent(event);

    // Log the event publication
    log.info("Published inventory event: {}", event);
  }
}