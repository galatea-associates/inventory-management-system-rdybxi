package com.ims.workflow.delegate;

import com.ims.calculation.model.AggregationUnitLimit;
import com.ims.calculation.model.ClientLimit;
import com.ims.common.event.WorkflowEvent;
import com.ims.workflow.exception.WorkflowException;
import com.ims.workflow.model.OrderValidation;
import com.ims.workflow.publisher.WorkflowEventPublisher;
import com.ims.workflow.repository.OrderValidationRepository;
import lombok.extern.slf4j.Slf4j;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Delegate class that implements the business logic for the short sell approval workflow in the Inventory Management System.
 * This class is responsible for validating short sell orders against client and aggregation unit limits, ensuring
 * compliance with regulatory requirements across different markets, and processing orders within the required 150ms SLA.
 */
@Component
@Slf4j
public class ShortSellApprovalDelegate implements JavaDelegate {

    private final OrderValidationRepository orderValidationRepository;
    private final RestTemplate restTemplate;
    private final WorkflowEventPublisher eventPublisher;
    private final String limitServiceUrl;

    /**
     * Constructor that initializes the delegate with required dependencies
     *
     * @param orderValidationRepository Repository for order validations
     * @param restTemplate RestTemplate for calling external services
     * @param eventPublisher Publisher for workflow events
     */
    @Autowired
    public ShortSellApprovalDelegate(
            OrderValidationRepository orderValidationRepository,
            RestTemplate restTemplate,
            WorkflowEventPublisher eventPublisher,
            @Value("${service.calculation.url}/api/limits") String limitServiceUrl) {
        this.orderValidationRepository = orderValidationRepository;
        this.restTemplate = restTemplate;
        this.eventPublisher = eventPublisher;
        this.limitServiceUrl = limitServiceUrl;
    }

    /**
     * Executes the delegate logic based on the current activity in the BPMN process
     *
     * @param execution The delegate execution context
     */
    @Override
    public void execute(DelegateExecution execution) throws Exception {
        log.debug("Executing ShortSellApprovalDelegate for activity: {}", execution.getCurrentActivityId());
        
        String activityId = execution.getCurrentActivityId();
        String orderId = (String) execution.getVariable("orderId");
        
        if (orderId == null || orderId.isEmpty()) {
            throw WorkflowException.shortSellWorkflowError(activityId, "Order ID is missing from execution variables");
        }
        
        try {
            switch (activityId) {
                case "validate_order":
                    validateOrder(execution, orderId);
                    break;
                case "check_client_limit":
                    checkClientLimit(execution, orderId);
                    break;
                case "check_au_limit":
                    checkAggregationUnitLimit(execution, orderId);
                    break;
                case "approve_order":
                    approveOrder(execution, orderId);
                    break;
                case "reject_client_limit":
                    rejectOrderClientLimit(execution, orderId);
                    break;
                case "reject_au_limit":
                    rejectOrderAggregationUnitLimit(execution, orderId);
                    break;
                case "reject_invalid":
                    rejectInvalidOrder(execution, orderId);
                    break;
                case "update_limits":
                    updateLimits(execution, orderId);
                    break;
                default:
                    log.warn("Unknown activity ID: {}", activityId);
                    throw new WorkflowException("SHORT_SELL", activityId, 
                            "Unknown activity ID in Short Sell Approval workflow");
            }
        } catch (WorkflowException e) {
            throw e; // Re-throw workflow exceptions
        } catch (Exception e) {
            log.error("Error executing short sell approval delegate: {}", e.getMessage(), e);
            throw WorkflowException.shortSellWorkflowError(activityId, 
                    "Error executing short sell approval: " + e.getMessage());
        }
        
        log.debug("Completed ShortSellApprovalDelegate for activity: {}", activityId);
    }

    /**
     * Validates the order format and required fields
     *
     * @param execution The delegate execution context
     * @param orderId The order ID to validate
     */
    private void validateOrder(DelegateExecution execution, String orderId) {
        log.debug("Validating order: {}", orderId);
        
        Optional<OrderValidation> validationOpt = orderValidationRepository.findByOrderId(orderId);
        OrderValidation validation;
        
        if (validationOpt.isPresent()) {
            validation = validationOpt.get();
        } else {
            // If no validation exists, create a new one with order details from variables
            validation = new OrderValidation();
            validation.setOrderId(orderId);
            validation.setOrderType((String) execution.getVariable("orderType"));
            // Additional order details would be set here from execution variables
            // This is simplified for this implementation
        }
        
        boolean isValid = validation.isValid();
        execution.setVariable("orderValid", isValid);
        log.debug("Order validation result for {}: {}", orderId, isValid);
    }

    /**
     * Checks if the client has sufficient limit for the order
     *
     * @param execution The delegate execution context
     * @param orderId The order ID to check
     */
    private void checkClientLimit(DelegateExecution execution, String orderId) {
        log.debug("Checking client limit for order: {}", orderId);
        
        Optional<OrderValidation> validationOpt = orderValidationRepository.findByOrderId(orderId);
        if (!validationOpt.isPresent()) {
            throw WorkflowException.shortSellWorkflowError("check_client_limit", 
                    "Order validation not found for order ID: " + orderId);
        }
        
        OrderValidation validation = validationOpt.get();
        String clientId = validation.getClient().getCounterpartyId();
        String securityId = validation.getSecurity().getInternalId();
        BigDecimal quantity = validation.getQuantity();
        String orderType = validation.getOrderType();
        
        LocalDate businessDate = LocalDate.now();
        
        // Get client limit from the limit service
        ClientLimit clientLimit = getClientLimit(clientId, securityId, businessDate);
        if (clientLimit == null) {
            log.error("Client limit not found for client: {}, security: {}, date: {}", 
                    clientId, securityId, businessDate);
            execution.setVariable("clientLimitCheck", false);
            return;
        }
        
        boolean hasSufficientLimit;
        double availableAmount;
        
        if ("SHORT_SELL".equals(orderType)) {
            hasSufficientLimit = clientLimit.hasShortSellCapacity(quantity.doubleValue());
            availableAmount = clientLimit.getRemainingShortSellLimit();
        } else if ("LONG_SELL".equals(orderType)) {
            hasSufficientLimit = clientLimit.hasLongSellCapacity(quantity.doubleValue());
            availableAmount = clientLimit.getRemainingLongSellLimit();
        } else {
            log.warn("Unknown order type: {} for order: {}", orderType, orderId);
            hasSufficientLimit = false;
            availableAmount = 0;
        }
        
        execution.setVariable("clientLimitCheck", hasSufficientLimit);
        execution.setVariable("clientLimit", clientLimit.toString());
        execution.setVariable("clientAvailableAmount", availableAmount);
        
        log.debug("Client limit check result for order {}: {}, available: {}", 
                orderId, hasSufficientLimit, availableAmount);
    }

    /**
     * Checks if the aggregation unit has sufficient limit for the order
     *
     * @param execution The delegate execution context
     * @param orderId The order ID to check
     */
    private void checkAggregationUnitLimit(DelegateExecution execution, String orderId) {
        log.debug("Checking aggregation unit limit for order: {}", orderId);
        
        Optional<OrderValidation> validationOpt = orderValidationRepository.findByOrderId(orderId);
        if (!validationOpt.isPresent()) {
            throw WorkflowException.shortSellWorkflowError("check_au_limit", 
                    "Order validation not found for order ID: " + orderId);
        }
        
        OrderValidation validation = validationOpt.get();
        String auId = validation.getAggregationUnit().getAggregationUnitId();
        String securityId = validation.getSecurity().getInternalId();
        BigDecimal quantity = validation.getQuantity();
        String orderType = validation.getOrderType();
        
        LocalDate businessDate = LocalDate.now();
        
        // Get aggregation unit limit from the limit service
        AggregationUnitLimit auLimit = getAggregationUnitLimit(auId, securityId, businessDate);
        if (auLimit == null) {
            log.error("Aggregation unit limit not found for AU: {}, security: {}, date: {}", 
                    auId, securityId, businessDate);
            execution.setVariable("auLimitCheck", false);
            return;
        }
        
        // Apply market-specific rules
        auLimit.applyMarketSpecificRules();
        
        boolean hasSufficientLimit;
        double availableAmount;
        
        if ("SHORT_SELL".equals(orderType)) {
            hasSufficientLimit = auLimit.hasShortSellCapacity(quantity.doubleValue());
            availableAmount = auLimit.getRemainingShortSellLimit();
        } else if ("LONG_SELL".equals(orderType)) {
            hasSufficientLimit = auLimit.hasLongSellCapacity(quantity.doubleValue());
            availableAmount = auLimit.getRemainingLongSellLimit();
        } else {
            log.warn("Unknown order type: {} for order: {}", orderType, orderId);
            hasSufficientLimit = false;
            availableAmount = 0;
        }
        
        execution.setVariable("auLimitCheck", hasSufficientLimit);
        execution.setVariable("auLimit", auLimit.toString());
        execution.setVariable("auAvailableAmount", availableAmount);
        
        log.debug("Aggregation unit limit check result for order {}: {}, available: {}", 
                orderId, hasSufficientLimit, availableAmount);
    }

    /**
     * Approves the order after all validation checks pass
     *
     * @param execution The delegate execution context
     * @param orderId The order ID to approve
     */
    private void approveOrder(DelegateExecution execution, String orderId) {
        log.debug("Approving order: {}", orderId);
        
        Optional<OrderValidation> validationOpt = orderValidationRepository.findByOrderId(orderId);
        if (!validationOpt.isPresent()) {
            throw WorkflowException.shortSellWorkflowError("approve_order", 
                    "Order validation not found for order ID: " + orderId);
        }
        
        OrderValidation validation = validationOpt.get();
        long startTime = (long) execution.getVariable("startTime");
        long processingTime = calculateProcessingTime(startTime);
        
        validation.approve();
        validation.setProcessingTime(processingTime);
        
        orderValidationRepository.save(validation);
        
        execution.setVariable("status", "APPROVED");
        execution.setVariable("processingTime", processingTime);
        
        // Publish order approval event
        WorkflowEvent approvalEvent = WorkflowEvent.builder()
                .eventType("ORDER_APPROVED")
                .workflowType("SHORT_SELL_APPROVAL")
                .workflowId(orderId)
                .status("APPROVED")
                .securityId(validation.getSecurity().getInternalId())
                .clientId(validation.getClient().getCounterpartyId())
                .aggregationUnitId(validation.getAggregationUnit().getAggregationUnitId())
                .actionBy("SYSTEM")
                .processingTimeMs(processingTime)
                .isAutomatic(true)
                .build();
        
        eventPublisher.publishWorkflowEvent(approvalEvent);
        
        log.info("Order {} approved in {} ms", orderId, processingTime);
    }

    /**
     * Rejects the order due to insufficient client limit
     *
     * @param execution The delegate execution context
     * @param orderId The order ID to reject
     */
    private void rejectOrderClientLimit(DelegateExecution execution, String orderId) {
        log.debug("Rejecting order due to insufficient client limit: {}", orderId);
        
        Optional<OrderValidation> validationOpt = orderValidationRepository.findByOrderId(orderId);
        if (!validationOpt.isPresent()) {
            throw WorkflowException.shortSellWorkflowError("reject_client_limit", 
                    "Order validation not found for order ID: " + orderId);
        }
        
        OrderValidation validation = validationOpt.get();
        long startTime = (long) execution.getVariable("startTime");
        long processingTime = calculateProcessingTime(startTime);
        
        validation.rejectClientLimit();
        validation.setProcessingTime(processingTime);
        
        orderValidationRepository.save(validation);
        
        execution.setVariable("status", "REJECTED");
        execution.setVariable("rejectionReason", "INSUFFICIENT_CLIENT_LIMIT");
        execution.setVariable("processingTime", processingTime);
        
        // Publish order rejection event
        WorkflowEvent rejectionEvent = WorkflowEvent.builder()
                .eventType("ORDER_REJECTED")
                .workflowType("SHORT_SELL_APPROVAL")
                .workflowId(orderId)
                .status("REJECTED")
                .securityId(validation.getSecurity().getInternalId())
                .clientId(validation.getClient().getCounterpartyId())
                .aggregationUnitId(validation.getAggregationUnit().getAggregationUnitId())
                .actionBy("SYSTEM")
                .rejectionReason("INSUFFICIENT_CLIENT_LIMIT")
                .processingTimeMs(processingTime)
                .isAutomatic(true)
                .build();
        
        eventPublisher.publishWorkflowEvent(rejectionEvent);
        
        log.info("Order {} rejected due to insufficient client limit in {} ms", orderId, processingTime);
    }

    /**
     * Rejects the order due to insufficient aggregation unit limit
     *
     * @param execution The delegate execution context
     * @param orderId The order ID to reject
     */
    private void rejectOrderAggregationUnitLimit(DelegateExecution execution, String orderId) {
        log.debug("Rejecting order due to insufficient aggregation unit limit: {}", orderId);
        
        Optional<OrderValidation> validationOpt = orderValidationRepository.findByOrderId(orderId);
        if (!validationOpt.isPresent()) {
            throw WorkflowException.shortSellWorkflowError("reject_au_limit", 
                    "Order validation not found for order ID: " + orderId);
        }
        
        OrderValidation validation = validationOpt.get();
        long startTime = (long) execution.getVariable("startTime");
        long processingTime = calculateProcessingTime(startTime);
        
        validation.rejectAggregationUnitLimit();
        validation.setProcessingTime(processingTime);
        
        orderValidationRepository.save(validation);
        
        execution.setVariable("status", "REJECTED");
        execution.setVariable("rejectionReason", "INSUFFICIENT_AGGREGATION_UNIT_LIMIT");
        execution.setVariable("processingTime", processingTime);
        
        // Publish order rejection event
        WorkflowEvent rejectionEvent = WorkflowEvent.builder()
                .eventType("ORDER_REJECTED")
                .workflowType("SHORT_SELL_APPROVAL")
                .workflowId(orderId)
                .status("REJECTED")
                .securityId(validation.getSecurity().getInternalId())
                .clientId(validation.getClient().getCounterpartyId())
                .aggregationUnitId(validation.getAggregationUnit().getAggregationUnitId())
                .actionBy("SYSTEM")
                .rejectionReason("INSUFFICIENT_AGGREGATION_UNIT_LIMIT")
                .processingTimeMs(processingTime)
                .isAutomatic(true)
                .build();
        
        eventPublisher.publishWorkflowEvent(rejectionEvent);
        
        log.info("Order {} rejected due to insufficient aggregation unit limit in {} ms", orderId, processingTime);
    }

    /**
     * Rejects the order due to invalid format or missing data
     *
     * @param execution The delegate execution context
     * @param orderId The order ID to reject
     */
    private void rejectInvalidOrder(DelegateExecution execution, String orderId) {
        log.debug("Rejecting order due to invalid format: {}", orderId);
        
        Optional<OrderValidation> validationOpt = orderValidationRepository.findByOrderId(orderId);
        if (!validationOpt.isPresent()) {
            throw WorkflowException.shortSellWorkflowError("reject_invalid", 
                    "Order validation not found for order ID: " + orderId);
        }
        
        OrderValidation validation = validationOpt.get();
        long startTime = (long) execution.getVariable("startTime");
        long processingTime = calculateProcessingTime(startTime);
        
        validation.rejectInvalidOrder();
        validation.setProcessingTime(processingTime);
        
        orderValidationRepository.save(validation);
        
        execution.setVariable("status", "REJECTED");
        execution.setVariable("rejectionReason", "INVALID_ORDER");
        execution.setVariable("processingTime", processingTime);
        
        // Publish order rejection event
        WorkflowEvent rejectionEvent = WorkflowEvent.builder()
                .eventType("ORDER_REJECTED")
                .workflowType("SHORT_SELL_APPROVAL")
                .workflowId(orderId)
                .status("REJECTED")
                .securityId(validation.getSecurity() != null ? validation.getSecurity().getInternalId() : null)
                .clientId(validation.getClient() != null ? validation.getClient().getCounterpartyId() : null)
                .aggregationUnitId(validation.getAggregationUnit() != null ? 
                        validation.getAggregationUnit().getAggregationUnitId() : null)
                .actionBy("SYSTEM")
                .rejectionReason("INVALID_ORDER")
                .processingTimeMs(processingTime)
                .isAutomatic(true)
                .build();
        
        eventPublisher.publishWorkflowEvent(rejectionEvent);
        
        log.info("Order {} rejected due to invalid format in {} ms", orderId, processingTime);
    }

    /**
     * Updates client and aggregation unit limits after order approval
     *
     * @param execution The delegate execution context
     * @param orderId The order ID for which to update limits
     */
    private void updateLimits(DelegateExecution execution, String orderId) {
        log.debug("Updating limits for order: {}", orderId);
        
        Optional<OrderValidation> validationOpt = orderValidationRepository.findByOrderId(orderId);
        if (!validationOpt.isPresent()) {
            throw WorkflowException.shortSellWorkflowError("update_limits", 
                    "Order validation not found for order ID: " + orderId);
        }
        
        OrderValidation validation = validationOpt.get();
        String clientId = validation.getClient().getCounterpartyId();
        String auId = validation.getAggregationUnit().getAggregationUnitId();
        String securityId = validation.getSecurity().getInternalId();
        BigDecimal quantity = validation.getQuantity();
        String orderType = validation.getOrderType();
        
        LocalDate businessDate = LocalDate.now();
        
        // Get limits from the limit service
        ClientLimit clientLimit = getClientLimit(clientId, securityId, businessDate);
        AggregationUnitLimit auLimit = getAggregationUnitLimit(auId, securityId, businessDate);
        
        if (clientLimit == null || auLimit == null) {
            log.error("Could not update limits for order: {}, client limit exists: {}, AU limit exists: {}", 
                    orderId, clientLimit != null, auLimit != null);
            return;
        }
        
        // Update the appropriate limits based on order type
        if ("SHORT_SELL".equals(orderType)) {
            clientLimit.updateShortSellUsed(quantity.doubleValue());
            auLimit.updateShortSellUsed(quantity.doubleValue());
        } else if ("LONG_SELL".equals(orderType)) {
            clientLimit.updateLongSellUsed(quantity.doubleValue());
            auLimit.updateLongSellUsed(quantity.doubleValue());
        }
        
        // Save the updated limits
        updateClientLimit(clientLimit);
        updateAggregationUnitLimit(auLimit);
        
        log.debug("Limits updated for order: {}", orderId);
    }

    /**
     * Processes an order validation through the entire workflow
     *
     * @param orderValidation The order validation to process
     * @return The processed order validation with approval or rejection status
     */
    public OrderValidation processOrderValidation(OrderValidation orderValidation) {
        log.info("Processing order validation: {}", orderValidation.getOrderId());
        long startTime = System.currentTimeMillis();
        
        // Validate the order
        if (!orderValidation.isValid()) {
            orderValidation.rejectInvalidOrder();
            orderValidation.setProcessingTime(calculateProcessingTime(startTime));
            return orderValidationRepository.save(orderValidation);
        }
        
        // Get client and check client limit
        String clientId = orderValidation.getClient().getCounterpartyId();
        String securityId = orderValidation.getSecurity().getInternalId();
        BigDecimal quantity = orderValidation.getQuantity();
        String orderType = orderValidation.getOrderType();
        LocalDate businessDate = LocalDate.now();
        
        ClientLimit clientLimit = getClientLimit(clientId, securityId, businessDate);
        if (clientLimit == null) {
            orderValidation.rejectWithReason("CLIENT_LIMIT_NOT_FOUND");
            orderValidation.setProcessingTime(calculateProcessingTime(startTime));
            return orderValidationRepository.save(orderValidation);
        }
        
        boolean hasClientLimit = false;
        if ("SHORT_SELL".equals(orderType)) {
            hasClientLimit = clientLimit.hasShortSellCapacity(quantity.doubleValue());
        } else if ("LONG_SELL".equals(orderType)) {
            hasClientLimit = clientLimit.hasLongSellCapacity(quantity.doubleValue());
        }
        
        if (!hasClientLimit) {
            orderValidation.rejectClientLimit();
            orderValidation.setProcessingTime(calculateProcessingTime(startTime));
            return orderValidationRepository.save(orderValidation);
        }
        
        // Get aggregation unit and check AU limit
        String auId = orderValidation.getAggregationUnit().getAggregationUnitId();
        
        AggregationUnitLimit auLimit = getAggregationUnitLimit(auId, securityId, businessDate);
        if (auLimit == null) {
            orderValidation.rejectWithReason("AGGREGATION_UNIT_LIMIT_NOT_FOUND");
            orderValidation.setProcessingTime(calculateProcessingTime(startTime));
            return orderValidationRepository.save(orderValidation);
        }
        
        // Apply market-specific rules
        auLimit.applyMarketSpecificRules();
        
        boolean hasAuLimit = false;
        if ("SHORT_SELL".equals(orderType)) {
            hasAuLimit = auLimit.hasShortSellCapacity(quantity.doubleValue());
        } else if ("LONG_SELL".equals(orderType)) {
            hasAuLimit = auLimit.hasLongSellCapacity(quantity.doubleValue());
        }
        
        if (!hasAuLimit) {
            orderValidation.rejectAggregationUnitLimit();
            orderValidation.setProcessingTime(calculateProcessingTime(startTime));
            return orderValidationRepository.save(orderValidation);
        }
        
        // If both client and AU have sufficient limits, approve the order
        orderValidation.approve();
        
        // Update the limits
        if ("SHORT_SELL".equals(orderType)) {
            clientLimit.updateShortSellUsed(quantity.doubleValue());
            auLimit.updateShortSellUsed(quantity.doubleValue());
        } else if ("LONG_SELL".equals(orderType)) {
            clientLimit.updateLongSellUsed(quantity.doubleValue());
            auLimit.updateLongSellUsed(quantity.doubleValue());
        }
        
        updateClientLimit(clientLimit);
        updateAggregationUnitLimit(auLimit);
        
        // Set processing time and save
        long processingTime = calculateProcessingTime(startTime);
        orderValidation.setProcessingTime(processingTime);
        orderValidation = orderValidationRepository.save(orderValidation);
        
        // Publish appropriate event
        if (orderValidation.isApproved()) {
            // Create and publish approval event
            WorkflowEvent approvalEvent = WorkflowEvent.builder()
                    .eventType("ORDER_APPROVED")
                    .workflowType("SHORT_SELL_APPROVAL")
                    .workflowId(orderValidation.getOrderId())
                    .status("APPROVED")
                    .securityId(securityId)
                    .clientId(clientId)
                    .aggregationUnitId(auId)
                    .actionBy("SYSTEM")
                    .processingTimeMs(processingTime)
                    .isAutomatic(true)
                    .build();
            
            eventPublisher.publishWorkflowEvent(approvalEvent);
        } else if (orderValidation.isRejected()) {
            // Create and publish rejection event
            WorkflowEvent rejectionEvent = WorkflowEvent.builder()
                    .eventType("ORDER_REJECTED")
                    .workflowType("SHORT_SELL_APPROVAL")
                    .workflowId(orderValidation.getOrderId())
                    .status("REJECTED")
                    .securityId(securityId)
                    .clientId(clientId)
                    .aggregationUnitId(auId)
                    .actionBy("SYSTEM")
                    .rejectionReason(orderValidation.getRejectionReason())
                    .processingTimeMs(processingTime)
                    .isAutomatic(true)
                    .build();
            
            eventPublisher.publishWorkflowEvent(rejectionEvent);
        }
        
        log.info("Order validation processed in {} ms: {}, status: {}", 
                processingTime, orderValidation.getOrderId(), orderValidation.getStatus());
        
        return orderValidation;
    }

    /**
     * Retrieves a client limit from the limit service
     *
     * @param clientId The client ID
     * @param securityId The security ID
     * @param businessDate The business date
     * @return The client limit if found, null otherwise
     */
    private ClientLimit getClientLimit(String clientId, String securityId, LocalDate businessDate) {
        String url = limitServiceUrl + "/client?clientId={clientId}&securityId={securityId}&businessDate={businessDate}";
        
        try {
            return restTemplate.getForObject(
                    url, 
                    ClientLimit.class, 
                    clientId, 
                    securityId, 
                    businessDate);
        } catch (Exception e) {
            log.error("Error getting client limit: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Retrieves an aggregation unit limit from the limit service
     *
     * @param aggregationUnitId The aggregation unit ID
     * @param securityId The security ID
     * @param businessDate The business date
     * @return The aggregation unit limit if found, null otherwise
     */
    private AggregationUnitLimit getAggregationUnitLimit(String aggregationUnitId, String securityId, LocalDate businessDate) {
        String url = limitServiceUrl + "/aggregation-unit?aggregationUnitId={aggregationUnitId}" +
                "&securityId={securityId}&businessDate={businessDate}";
        
        try {
            return restTemplate.getForObject(
                    url, 
                    AggregationUnitLimit.class, 
                    aggregationUnitId, 
                    securityId, 
                    businessDate);
        } catch (Exception e) {
            log.error("Error getting aggregation unit limit: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Updates a client limit through the limit service
     *
     * @param clientLimit The client limit to update
     * @return The updated client limit
     */
    private ClientLimit updateClientLimit(ClientLimit clientLimit) {
        String url = limitServiceUrl + "/client";
        
        try {
            return restTemplate.postForObject(url, clientLimit, ClientLimit.class);
        } catch (Exception e) {
            log.error("Error updating client limit: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Updates an aggregation unit limit through the limit service
     *
     * @param aggregationUnitLimit The aggregation unit limit to update
     * @return The updated aggregation unit limit
     */
    private AggregationUnitLimit updateAggregationUnitLimit(AggregationUnitLimit aggregationUnitLimit) {
        String url = limitServiceUrl + "/aggregation-unit";
        
        try {
            return restTemplate.postForObject(url, aggregationUnitLimit, AggregationUnitLimit.class);
        } catch (Exception e) {
            log.error("Error updating aggregation unit limit: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Calculates the processing time in milliseconds between start time and now
     *
     * @param startTimeMillis The start time in milliseconds
     * @return The processing time in milliseconds
     */
    private long calculateProcessingTime(long startTimeMillis) {
        return System.currentTimeMillis() - startTimeMillis;
    }
}