package com.ims.workflow.controller;

import com.ims.common.model.AggregationUnit;
import com.ims.common.model.Counterparty;
import com.ims.common.model.Security;
import com.ims.workflow.exception.WorkflowException;
import com.ims.workflow.model.OrderValidation;
import com.ims.workflow.service.ShortSellService;
import jakarta.validation.Valid; // jakarta.validation, version: 3.0.2
import java.math.BigDecimal; // java.math, version: 17
import java.util.HashMap; // java.util, version: 17
import java.util.Map; // java.util, version: 17
import lombok.RequiredArgsConstructor; // lombok, version: 1.18.26
import lombok.extern.slf4j.Slf4j; // lombok.extern.slf4j, version: 1.18.26
import org.springframework.http.HttpStatus; // org.springframework.http, version: 6.0.9
import org.springframework.http.ResponseEntity; // org.springframework.http, version: 6.0.9
import org.springframework.web.bind.annotation.ExceptionHandler; // org.springframework.web.bind.annotation, version: 6.0.9
import org.springframework.web.bind.annotation.GetMapping; // org.springframework.web.bind.annotation, version: 6.0.9
import org.springframework.web.bind.annotation.PathVariable; // org.springframework.web.bind.annotation, version: 6.0.9
import org.springframework.web.bind.annotation.PostMapping; // org.springframework.web.bind.annotation, version: 6.0.9
import org.springframework.web.bind.annotation.RequestBody; // org.springframework.web.bind.annotation, version: 6.0.9
import org.springframework.web.bind.annotation.RequestMapping; // org.springframework.web.bind.annotation, version: 6.0.9
import org.springframework.web.bind.annotation.RequestParam; // org.springframework.web.bind.annotation, version: 6.0.9
import org.springframework.web.bind.annotation.ResponseStatus; // org.springframework.web.bind.annotation, version: 6.0.9
import org.springframework.web.bind.annotation.RestController; // org.springframework.web.bind.annotation, version: 6.0.9

/**
 * REST controller that provides endpoints for validating and processing short sell orders in the
 * Inventory Management System. This controller handles the validation of short sell orders against
 * client and aggregation unit limits, ensuring compliance with regulatory requirements across
 * different markets. It must meet strict performance requirements, completing the validation
 * workflow in under 150ms.
 */
@RestController
@RequestMapping("/api/v1/short-sell")
@RequiredArgsConstructor
@Slf4j
public class ShortSellController {

  private final ShortSellService shortSellService;

  /**
   * Constructor that initializes the controller with required dependencies
   *
   * @param shortSellService The service for validating short sell orders
   */
  public ShortSellController(ShortSellService shortSellService) {
    this.shortSellService = shortSellService;
  }

  /**
   * Validates a short sell or long sell order against client and aggregation unit limits
   *
   * @param orderValidation The order validation object
   * @return The validated order with approval or rejection status
   */
  @PostMapping("/validate")
  @ResponseStatus(HttpStatus.OK)
  public ResponseEntity<OrderValidation> validateOrder(
      @Valid @RequestBody OrderValidation orderValidation) {
    log.info("Received order validation request: {}", orderValidation);

    // Validate the order validation using orderValidation.isValid()
    if (!orderValidation.isValid()) {
      log.warn(
          "Order validation failed for orderId: {}. Order is invalid.",
          orderValidation.getOrderId());
      throw WorkflowException.shortSellWorkflowError(
          "validateOrder", "Invalid order data. Please check required fields.");
    }

    // Call shortSellService.validateOrder(orderValidation) to process the validation
    OrderValidation processedValidation = shortSellService.validateOrder(orderValidation);

    // Return ResponseEntity.ok(processedValidation)
    return ResponseEntity.ok(processedValidation);
  }

  /**
   * Validates an order by its ID, creating a new validation if one doesn't exist
   *
   * @param orderId The order ID
   * @param securityId The security ID
   * @param clientId The client ID
   * @param aggregationUnitId The aggregation unit ID
   * @param orderType The order type
   * @param quantity The order quantity
   * @return The validated order with approval or rejection status
   */
  @PostMapping("/validate/{orderId}")
  public ResponseEntity<OrderValidation> validateOrderById(
      @PathVariable String orderId,
      @RequestParam String securityId,
      @RequestParam String clientId,
      @RequestParam String aggregationUnitId,
      @RequestParam String orderType,
      @RequestParam BigDecimal quantity) {
    log.info(
        "Received order validation request by ID: orderId={}, securityId={}, clientId={},"
            + " aggregationUnitId={}, orderType={}, quantity={}",
        orderId,
        securityId,
        clientId,
        aggregationUnitId,
        orderType,
        quantity);

    // Validate that orderType is either 'SHORT_SELL' or 'LONG_SELL'
    if (!("SHORT_SELL".equals(orderType) || "LONG_SELL".equals(orderType))) {
      log.warn("Invalid order type: {} for orderId: {}", orderType, orderId);
      throw WorkflowException.shortSellWorkflowError(
          "validateOrderById", "Invalid order type. Must be SHORT_SELL or LONG_SELL.");
    }

    // Validate that quantity is greater than zero
    if (quantity.compareTo(BigDecimal.ZERO) <= 0) {
      log.warn("Invalid quantity: {} for orderId: {}", quantity, orderId);
      throw WorkflowException.shortSellWorkflowError(
          "validateOrderById", "Invalid quantity. Must be greater than zero.");
    }

    // Call shortSellService.validateOrderById(orderId, securityId, clientId, aggregationUnitId,
    // orderType, quantity)
    OrderValidation processedValidation =
        shortSellService.validateOrderById(
            orderId, securityId, clientId, aggregationUnitId, orderType, quantity.doubleValue());

    // Return ResponseEntity.ok(processedValidation)
    return ResponseEntity.ok(processedValidation);
  }

  /**
   * Retrieves the validation status for a specific order
   *
   * @param orderId The order ID
   * @return The order validation status details
   */
  @GetMapping("/status/{orderId}")
  public ResponseEntity<Map<String, Object>> getOrderValidation(@PathVariable String orderId) {
    log.info("Received request to retrieve order validation status for orderId: {}", orderId);

    // Call shortSellService.validateOrderById(orderId, null, null, null, null, null) to retrieve
    // the validation
    OrderValidation validation =
        shortSellService.validateOrderById(orderId, null, null, null, null, null);

    // If validation not found, return ResponseEntity.notFound().build()
    if (validation == null) {
      log.warn("Order validation not found for orderId: {}", orderId);
      return ResponseEntity.notFound().build();
    }

    // Create a response map with validation status details
    Map<String, Object> responseMap = new HashMap<>();
    responseMap.put("orderId", validation.getOrderId());
    responseMap.put("status", validation.getStatus());
    responseMap.put("approved", validation.isApproved());
    responseMap.put("rejected", validation.isRejected());
    responseMap.put("rejectionReason", validation.getRejectionReason());
    responseMap.put("processingTime", validation.getProcessingTime());

    // Return ResponseEntity.ok(responseMap)
    return ResponseEntity.ok(responseMap);
  }

  /**
   * Exception handler for WorkflowException
   *
   * @param ex The WorkflowException
   * @return Error response with appropriate HTTP status
   */
  @ExceptionHandler(WorkflowException.class)
  public ResponseEntity<Map<String, Object>> handleWorkflowException(WorkflowException ex) {
    log.error("Workflow exception occurred: {}", ex.getMessage(), ex);

    // Create error response map with 'error' and 'message' fields
    Map<String, Object> errorResponse = new HashMap<>();
    errorResponse.put("error", "Workflow Error");
    errorResponse.put("message", ex.getMessage());

    // Return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse)
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
  }
}