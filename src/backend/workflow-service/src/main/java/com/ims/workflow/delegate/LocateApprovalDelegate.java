# src/backend/workflow-service/src/main/java/com/ims/workflow/delegate/LocateApprovalDelegate.java
```java
package com.ims.workflow.delegate;

import com.ims.common.event.InventoryEvent; // version: N/A
import com.ims.common.event.LocateEvent; // version: N/A
import com.ims.workflow.exception.WorkflowException; // version: N/A
import com.ims.workflow.model.LocateApproval; // version: N/A
import com.ims.workflow.model.LocateRequest; // version: N/A
import com.ims.workflow.model.LocateRejection; // version: N/A
import com.ims.workflow.service.LocateService; // version: N/A
import java.math.BigDecimal; // version: 17
import java.time.LocalDate; // version: 17
import java.time.LocalDateTime; // version: 17
import lombok.RequiredArgsConstructor; // version: 1.18.26
import lombok.extern.slf4j.Slf4j; // version: 1.18.26
import org.camunda.bpm.engine.delegate.DelegateExecution; // package_version: 7.18.0
import org.camunda.bpm.engine.delegate.JavaDelegate; // package_version: 7.18.0
import org.springframework.stereotype.Component; // version: 6.0.9

/**
 * Delegate class for the Camunda BPM process that handles locate approval workflow steps. This
 * class implements the JavaDelegate interface to execute locate approval logic within the BPMN
 * process, including validation of locate requests, checking inventory availability, and
 * creating approvals or rejections based on business rules.
 */
@Component // Spring component annotation for dependency injection
@Slf4j // Logging facade
@RequiredArgsConstructor // Constructor injection for dependencies
public class LocateApprovalDelegate implements JavaDelegate {

  private final LocateService locateService;

  /**
   * Executes the locate approval delegate logic within the Camunda process
   *
   * @param execution The execution context for the Camunda process
   */
  @Override
  public void execute(DelegateExecution execution) throws Exception {
    // Log the start of locate approval delegate execution
    log.info("Executing LocateApprovalDelegate for process instance: {}", execution.getProcessInstanceId());

    // Extract the locate request ID from the process variables
    String requestId = (String) execution.getVariable("requestId");
    log.debug("Extracted requestId from process variables: {}", requestId);

    // Retrieve the locate request using the locateService
    LocateRequest request = validateRequest(requestId);

    // Extract approval parameters from process variables (approvedBy, securityTemperature, borrowRate)
    String approvedBy = getBusinessParameter(execution, "approvedBy", String.class, "SYSTEM");
    String securityTemperature = getBusinessParameter(execution, "securityTemperature", String.class, "GC");
    BigDecimal borrowRate = getBusinessParameter(execution, "borrowRate", BigDecimal.class, BigDecimal.ZERO);

    // Validate inventory availability for the requested security
    if (locateService.validateInventoryAvailability(request)) {
      log.debug("Sufficient inventory available for locate request: {}", requestId);

      // Calculate the approved quantity based on availability
      BigDecimal approvedQuantity = request.getRequestedQuantity();

      // Calculate the decrement quantity based on security temperature
      BigDecimal decrementQuantity = locateService.calculateDecrementQuantity(approvedQuantity, securityTemperature);

      // Create a LocateApproval object with the calculated quantities
      LocateApproval approval =
          LocateApproval.builder()
              .approvalId(java.util.UUID.randomUUID().toString())
              .request(request)
              .approvedQuantity(approvedQuantity)
              .decrementQuantity(decrementQuantity)
              .approvalTimestamp(LocalDateTime.now())
              .approvedBy(approvedBy)
              .securityTemperature(securityTemperature)
              .borrowRate(borrowRate)
              .isAutoApproved(true)
              .expiryDate(LocalDate.now().plusDays(1))
              .build();

      // Update the request with the approval
      request.approve(approval);

      // Publish locate approval event
      LocateEvent locateEvent = approval.toLocateEvent();
      locateService.publishLocateEvent(locateEvent);

      // Publish inventory update event
      InventoryEvent inventoryEvent = approval.toInventoryEvent();
      locateService.publishInventoryEvent(inventoryEvent);

      // Set process variables for the approval result
      execution.setVariable("approved", true);
      execution.setVariable("approvedQuantity", approval.getApprovedQuantity());
      execution.setVariable("decrementQuantity", approval.getDecrementQuantity());
      execution.setVariable("securityTemperature", approval.getSecurityTemperature());
      execution.setVariable("borrowRate", approval.getBorrowRate());

      log.info("Locate request approved: {}", requestId);
    } else {
      log.warn("Insufficient inventory for locate request: {}", requestId);

      // Create a LocateRejection object with reason 'INSUFFICIENT_INVENTORY'
      LocateRejection rejection =
          LocateRejection.builder()
              .rejectionId(java.util.UUID.randomUUID().toString())
              .request(request)
              .rejectionReason("INSUFFICIENT_INVENTORY")
              .rejectionTimestamp(LocalDateTime.now())
              .rejectedBy("SYSTEM")
              .isAutoRejected(true)
              .build();

      // Update the request with the rejection
      request.reject(rejection);

      // Publish locate rejection event
      LocateEvent locateEvent = rejection.toLocateEvent();
      locateService.publishLocateEvent(locateEvent);

      // Set process variables for the rejection result
      execution.setVariable("approved", false);
      execution.setVariable("rejectionReason", rejection.getRejectionReason());

      log.info("Locate request rejected due to insufficient inventory: {}", requestId);
    }

    // Log the completion of locate approval delegate execution
    log.info("Completed LocateApprovalDelegate for process instance: {}", execution.getProcessInstanceId());
  }

  /**
   * Validates that the locate request exists and is in a valid state
   *
   * @param requestId The ID of the locate request to validate
   * @return The validated locate request
   * @throws WorkflowException if the request is not found or is not in a valid state
   */
  private LocateRequest validateRequest(String requestId) {
    // Retrieve the locate request using locateService.getLocateRequest(requestId)
    LocateRequest request =
        locateService
            .getLocateRequest(requestId)
            .orElseThrow(
                () ->
                    WorkflowException.locateWorkflowError(
                        "LOCATE_VALIDATION", "Locate request not found: " + requestId));

    // Validate that the request is in PENDING status
    if (!request.isPending()) {
      throw WorkflowException.locateWorkflowError(
          "LOCATE_VALIDATION", "Locate request must be in PENDING status");
    }

    // Validate that the request passes basic validation rules
    if (!request.isValid()) {
      throw WorkflowException.locateWorkflowError(
          "LOCATE_VALIDATION", "Locate request is not valid: " + requestId);
    }

    // Return the validated request
    return request;
  }

  /**
   * Retrieves a business parameter from the process execution variables with type conversion
   *
   * @param execution The execution context
   * @param paramName The name of the parameter to retrieve
   * @param type The type to convert the parameter to
   * @param defaultValue The default value to return if the parameter is not found
   * @param <T> The type of the parameter
   * @return The parameter value with the specified type, or the default value if not found
   */
  private <T> T getBusinessParameter(DelegateExecution execution, String paramName, Class<T> type, T defaultValue) {
    // Get the variable from execution.getVariable(paramName)
    Object variable = execution.getVariable(paramName);

    // If variable is null, return defaultValue
    if (variable == null) {
      log.debug("Parameter {} not found, returning default value: {}", paramName, defaultValue);
      return defaultValue;
    }

    // If variable is of the requested type, return it cast to type T
    if (type.isInstance(variable)) {
      log.debug("Parameter {} found and is of type {}, returning value: {}", paramName, type.getName(), variable);
      return type.cast(variable);
    }

    // If variable can be converted to the requested type, convert and return it
    try {
      // Attempt to convert the variable to the requested type
      T convertedValue = type.cast(variable);
      log.debug("Parameter {} found and converted to type {}, returning value: {}", paramName, type.getName(), convertedValue);
      return convertedValue;
    } catch (ClassCastException e) {
      // If conversion fails, log a warning and return the default value
      log.warn("Parameter {} found but could not be converted to type {}, returning default value: {}", paramName, type.getName(), defaultValue, e);
      return defaultValue;
    }
  }
}