package com.ims.workflow.controller;

import com.ims.common.model.AggregationUnit; // version: 1.0.0
import com.ims.common.model.Counterparty; // version: 1.0.0
import com.ims.common.model.Security; // version: 1.0.0
import com.ims.workflow.exception.WorkflowException;
import com.ims.workflow.model.LocateRequest;
import com.ims.workflow.service.LocateService;
import jakarta.validation.Valid; // version: 3.0.2
import java.math.BigDecimal; // version: 17
import java.util.List; // version: 17
import lombok.RequiredArgsConstructor; // version: 1.18.26
import lombok.extern.slf4j.Slf4j; // version: 1.18.26
import org.springframework.http.HttpStatus; // version: 6.0.9
import org.springframework.http.ResponseEntity; // version: 6.0.9
import org.springframework.web.bind.annotation.ExceptionHandler; // version: 6.0.9
import org.springframework.web.bind.annotation.GetMapping; // version: 6.0.9
import org.springframework.web.bind.annotation.PathVariable; // version: 6.0.9
import org.springframework.web.bind.annotation.PostMapping; // version: 6.0.9
import org.springframework.web.bind.annotation.RequestBody; // version: 6.0.9
import org.springframework.web.bind.annotation.RequestMapping; // version: 6.0.9
import org.springframework.web.bind.annotation.RequestParam; // version: 6.0.9
import org.springframework.web.bind.annotation.ResponseStatus; // version: 6.0.9
import org.springframework.web.bind.annotation.RestController; // version: 6.0.9
import com.ims.workflow.model.LocateApproval; // version: N/A
import com.ims.workflow.model.LocateRejection; // version: N/A
import java.util.Optional; // version: 17

/**
 * REST controller that provides endpoints for managing locate requests in the system. Exposes
 * APIs for creating, retrieving, approving, and rejecting locate requests as part of the locate
 * approval workflow.
 */
@RestController // Indicates that this class is a controller
@RequestMapping("/api/v1/locates") // Base path for all endpoints in this controller
@RequiredArgsConstructor // Lombok annotation to generate constructor for injected dependencies
@Slf4j // Lombok annotation to automatically generate logger
public class LocateController {

  private final LocateService locateService;

  /**
   * Constructor that initializes the controller with required dependencies
   *
   * @param locateService The locate service to inject
   */
  public LocateController(LocateService locateService) {
    this.locateService = locateService;
  }

  /**
   * Creates a new locate request in the system
   *
   * @param request The locate request to create
   * @return The created locate request with status
   */
  @PostMapping // Maps HTTP POST requests onto this method
  @ResponseStatus(HttpStatus.CREATED) // Sets the HTTP status of the response
  public ResponseEntity<LocateRequest> createLocateRequest(@Valid @RequestBody LocateRequest request) {
    // Log the incoming locate request
    log.info("Received locate request: {}", request);

    // Validate the locate request using request.isValid()
    if (!request.isValid()) {
      // If invalid, throw a WorkflowException with appropriate message
      throw new WorkflowException("LOCATE_CREATION", "Invalid locate request data");
    }

    // Call locateService.createLocateRequest(request) to create the request
    LocateRequest createdRequest = locateService.createLocateRequest(request);

    // Call locateService.processAutoApproval(request) to attempt auto-approval
    locateService.processAutoApproval(createdRequest);

    // Return ResponseEntity.status(HttpStatus.CREATED).body(createdRequest)
    return ResponseEntity.status(HttpStatus.CREATED).body(createdRequest);
  }

  /**
   * Retrieves a locate request by its ID
   *
   * @param requestId The request ID
   * @return The locate request if found
   */
  @GetMapping("/{requestId}") // Maps HTTP GET requests onto this method
  public ResponseEntity<LocateRequest> getLocateRequest(@PathVariable String requestId) {
    // Log the request to retrieve locate by ID
    log.info("Received request to retrieve locate by ID: {}", requestId);

    // Call locateService.getLocateRequest(requestId) to retrieve the request
    Optional<LocateRequest> locateRequest = locateService.getLocateRequest(requestId);

    // If request not found, throw a WorkflowException with appropriate message
    if (locateRequest.isEmpty()) {
      throw new WorkflowException("LOCATE_RETRIEVAL", "Locate request not found: " + requestId);
    }

    // Return ResponseEntity.ok(locateRequest)
    return ResponseEntity.ok(locateRequest.get());
  }

  /**
   * Retrieves all pending locate requests
   *
   * @return List of pending locate requests
   */
  @GetMapping("/pending") // Maps HTTP GET requests onto this method
  public ResponseEntity<List<LocateRequest>> getPendingLocates() {
    // Log the request to retrieve pending locates
    log.info("Received request to retrieve pending locates");

    // Call locateService.getPendingLocates() to get pending requests
    List<LocateRequest> pendingLocates = locateService.getPendingLocates();

    // Return ResponseEntity.ok(pendingLocates)
    return ResponseEntity.ok(pendingLocates);
  }

  /**
   * Retrieves all active locate requests
   *
   * @return List of active locate requests
   */
  @GetMapping("/active") // Maps HTTP GET requests onto this method
  public ResponseEntity<List<LocateRequest>> getActiveLocates() {
    // Log the request to retrieve active locates
    log.info("Received request to retrieve active locates");

    // Call locateService.getActiveLocates() to get active requests
    List<LocateRequest> activeLocates = locateService.getActiveLocates();

    // Return ResponseEntity.ok(activeLocates)
    return ResponseEntity.ok(activeLocates);
  }

  /**
   * Approves a pending locate request
   *
   * @param requestId The ID of the locate request to approve
   * @param approvedQuantity The quantity of securities approved for the locate
   * @param approvedBy The user who approved the locate
   * @param securityTemperature The temperature of the security (HTB, GC)
   * @param borrowRate The borrow rate for this security
   * @return The approved locate request
   */
  @PostMapping("/{requestId}/approve") // Maps HTTP POST requests onto this method
  public ResponseEntity<LocateRequest> approveLocateRequest(
      @PathVariable String requestId,
      @RequestParam BigDecimal approvedQuantity,
      @RequestParam String approvedBy,
      @RequestParam String securityTemperature,
      @RequestParam(required = false) BigDecimal borrowRate) {
    // Log the request to approve locate
    log.info(
        "Received request to approve locate: requestId={}, approvedQuantity={}, approvedBy={}, securityTemperature={}, borrowRate={}",
        requestId,
        approvedQuantity,
        approvedBy,
        securityTemperature,
        borrowRate);

    // Validate approvedQuantity is greater than zero
    if (approvedQuantity.compareTo(BigDecimal.ZERO) <= 0) {
      throw new IllegalArgumentException("Approved quantity must be greater than zero");
    }

    // If borrowRate is null, set it to BigDecimal.ZERO
    BigDecimal actualBorrowRate = (borrowRate != null) ? borrowRate : BigDecimal.ZERO;

    // Call locateService.approveLocateRequest(requestId, approvedQuantity, approvedBy,
    // securityTemperature, borrowRate)
    LocateRequest approvedRequest =
        locateService.approveLocateRequest(
            requestId, approvedQuantity, approvedBy, securityTemperature, actualBorrowRate);

    // Return ResponseEntity.ok(approvedRequest)
    return ResponseEntity.ok(approvedRequest);
  }

  /**
   * Rejects a pending locate request
   *
   * @param requestId The ID of the locate request to reject
   * @param rejectionReason The reason for the rejection
   * @param rejectedBy The user who rejected the locate
   * @return The rejected locate request
   */
  @PostMapping("/{requestId}/reject") // Maps HTTP POST requests onto this method
  public ResponseEntity<LocateRequest> rejectLocateRequest(
      @PathVariable String requestId, @RequestParam String rejectionReason, @RequestParam String rejectedBy) {
    // Log the request to reject locate
    log.info(
        "Received request to reject locate: requestId={}, rejectionReason={}, rejectedBy={}",
        requestId,
        rejectionReason,
        rejectedBy);

    // Validate rejectionReason is not empty
    if (rejectionReason == null || rejectionReason.isEmpty()) {
      throw new IllegalArgumentException("Rejection reason cannot be null or empty");
    }

    // Call locateService.rejectLocateRequest(requestId, rejectionReason, rejectedBy)
    LocateRequest rejectedRequest =
        locateService.rejectLocateRequest(requestId, rejectionReason, rejectedBy);

    // Return ResponseEntity.ok(rejectedRequest)
    return ResponseEntity.ok(rejectedRequest);
  }

  /**
   * Cancels a pending locate request
   *
   * @param requestId The ID of the locate request to cancel
   * @return The cancelled locate request
   */
  @PostMapping("/{requestId}/cancel") // Maps HTTP POST requests onto this method
  public ResponseEntity<LocateRequest> cancelLocateRequest(@PathVariable String requestId) {
    // Log the request to cancel locate
    log.info("Received request to cancel locate: requestId={}", requestId);

    // Call locateService.cancelLocateRequest(requestId)
    LocateRequest cancelledRequest = locateService.cancelLocateRequest(requestId);

    // Return ResponseEntity.ok(cancelledRequest)
    return ResponseEntity.ok(cancelledRequest);
  }

  /**
   * Manually expires an approved locate request
   *
   * @param requestId The ID of the locate request to expire
   * @return The expired locate request
   */
  @PostMapping("/{requestId}/expire") // Maps HTTP POST requests onto this method
  public ResponseEntity<LocateRequest> expireLocateRequest(@PathVariable String requestId) {
    // Log the request to expire locate
    log.info("Received request to expire locate: requestId={}", requestId);

    // Call locateService.expireLocateRequest(requestId)
    LocateRequest expiredRequest = locateService.expireLocateRequest(requestId);

    // Return ResponseEntity.ok(expiredRequest)
    return ResponseEntity.ok(expiredRequest);
  }

  /**
   * Manually triggers processing of all expired locate requests
   *
   * @return The number of locate requests expired
   */
  @PostMapping("/process-expired") // Maps HTTP POST requests onto this method
  public ResponseEntity<Integer> processExpiredLocates() {
    // Log the request to process expired locates
    log.info("Received request to process expired locates");

    // Call locateService.processExpiredLocates() to process expired requests
    int expiredCount = locateService.processExpiredLocates();

    // Return ResponseEntity.ok(expiredCount)
    return ResponseEntity.ok(expiredCount);
  }

  /**
   * Exception handler for WorkflowException
   *
   * @param ex The exception to handle
   * @return Error response with appropriate HTTP status
   */
  @ExceptionHandler(WorkflowException.class) // Handles WorkflowException
  public ResponseEntity<Object> handleWorkflowException(WorkflowException ex) {
    // Log the workflow exception
    log.error("Workflow exception: {}", ex.getMessage(), ex);

    // Create error response with exception details
    String errorMessage = ex.getMessage();
    Object errorResponse = Map.of("error", errorMessage);

    // Return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse)
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
  }
}