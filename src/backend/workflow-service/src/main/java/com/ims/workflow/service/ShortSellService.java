package com.ims.workflow.service;

import com.ims.calculation.model.AggregationUnitLimit;
import com.ims.calculation.model.ClientLimit;
import com.ims.common.event.WorkflowEvent;
import com.ims.workflow.delegate.ShortSellApprovalDelegate;
import com.ims.workflow.exception.WorkflowException;
import com.ims.workflow.model.OrderValidation;
import com.ims.workflow.publisher.WorkflowEventPublisher;
import com.ims.workflow.repository.OrderValidationRepository;
import lombok.extern.slf4j.Slf4j; // lombok.extern.slf4j, version: 1.18.26
import org.springframework.beans.factory.annotation.Autowired; // org.springframework.beans.factory.annotation, version: 6.0.9
import org.springframework.beans.factory.annotation.Value; // org.springframework.beans.factory.annotation, version: 6.0.9
import org.springframework.scheduling.annotation.Async; // org.springframework.scheduling.annotation, version: 6.0.9
import org.springframework.stereotype.Service; // org.springframework.stereotype, version: 6.0.9
import org.springframework.web.client.RestTemplate; // org.springframework.web.client, version: 6.0.9

import java.math.BigDecimal; // java.math, version: 17
import java.time.LocalDate; // java.time, version: 17
import java.time.LocalDateTime; // java.time, version: 17
import java.util.Optional; // java.util, version: 17
import java.util.UUID; // java.util, version: 17
import java.util.concurrent.CompletableFuture; // java.util.concurrent, version: 17

/**
 * Service responsible for validating and processing short sell orders. This service implements the core business logic
 * for the short sell approval workflow, ensuring orders are validated against client and aggregation unit limits with
 * strict performance requirements (under 150ms).
 */
@Service
@Slf4j
public class ShortSellService {

    private final OrderValidationRepository orderValidationRepository;
    private final WorkflowEventPublisher eventPublisher;
    private final ShortSellApprovalDelegate shortSellApprovalDelegate;
    private final RestTemplate restTemplate;
    private final String limitServiceUrl;
    private final boolean asyncProcessingEnabled;

    /**
     * Constructor that initializes the service with required dependencies
     *
     * @param orderValidationRepository Repository for order validations
     * @param eventPublisher          Publisher for workflow events
     * @param shortSellApprovalDelegate Delegate for Camunda workflow integration
     * @param restTemplate            RestTemplate for calling calculation service API
     * @param limitServiceUrl         URL for the limit service
     * @param asyncProcessingEnabled  Flag to enable or disable asynchronous processing
     */
    @Autowired
    public ShortSellService(
            OrderValidationRepository orderValidationRepository,
            WorkflowEventPublisher eventPublisher,
            ShortSellApprovalDelegate shortSellApprovalDelegate,
            RestTemplate restTemplate,
            @Value("${calculation.service.url}") String limitServiceUrl,
            @Value("${workflow.async-processing-enabled:true}") boolean asyncProcessingEnabled) {
        this.orderValidationRepository = orderValidationRepository;
        this.eventPublisher = eventPublisher;
        this.shortSellApprovalDelegate = shortSellApprovalDelegate;
        this.restTemplate = restTemplate;
        this.limitServiceUrl = limitServiceUrl;
        this.asyncProcessingEnabled = asyncProcessingEnabled;
    }

    /**
     * Validates a short sell or long sell order against client and aggregation unit limits
     *
     * @param orderValidation The order validation object
     * @return The processed order validation with approval or rejection status
     */
    public OrderValidation validateOrder(OrderValidation orderValidation) {
        log.info("Starting order validation for orderId: {}", orderValidation.getOrderId());

        long startTimeMillis = System.currentTimeMillis();

        // Validate the order validation object
        if (!orderValidation.isValid()) {
            log.warn("Order validation failed for orderId: {}. Order is invalid.", orderValidation.getOrderId());
            orderValidation.rejectInvalidOrder();
            orderValidation.setProcessingTime(calculateProcessingTime(startTimeMillis));
            return orderValidationRepository.save(orderValidation);
        }

        if (asyncProcessingEnabled) {
            log.info("Asynchronous processing enabled. Delegating order validation for orderId: {}", orderValidation.getOrderId());
            validateOrderAsync(orderValidation);
        } else {
            log.info("Synchronous processing enabled. Processing order validation for orderId: {}", orderValidation.getOrderId());
            orderValidation = shortSellApprovalDelegate.processOrderValidation(orderValidation);
        }

        orderValidation.setProcessingTime(calculateProcessingTime(startTimeMillis));
        return orderValidation;
    }

    /**
     * Asynchronously validates a short sell or long sell order
     *
     * @param orderValidation The order validation object
     * @return A future that will complete with the processed order validation
     */
    @Async
    public CompletableFuture<OrderValidation> validateOrderAsync(OrderValidation orderValidation) {
        log.info("Starting asynchronous order validation for orderId: {}", orderValidation.getOrderId());
        OrderValidation processedValidation = shortSellApprovalDelegate.processOrderValidation(orderValidation);
        return CompletableFuture.completedFuture(processedValidation);
    }

    /**
     * Validates an order by its ID, creating a new validation if one doesn't exist
     *
     * @param orderId         The order ID
     * @param securityId      The security ID
     * @param clientId        The client ID
     * @param aggregationUnitId The aggregation unit ID
     * @param orderType       The order type
     * @param quantity        The order quantity
     * @return The processed order validation with approval or rejection status
     */
    public OrderValidation validateOrderById(String orderId, String securityId, String clientId, String aggregationUnitId, String orderType, Double quantity) {
        log.info("Starting order validation by ID for orderId: {}", orderId);

        Optional<OrderValidation> existingValidation = orderValidationRepository.findByOrderId(orderId);
        OrderValidation orderValidation;

        if (existingValidation.isPresent()) {
            orderValidation = existingValidation.get();
            log.info("Found existing order validation for orderId: {}", orderId);
        } else {
            log.info("Creating new order validation for orderId: {}", orderId);
            orderValidation = OrderValidation.builder()
                    .orderId(orderId)
                    .securityId(securityId)
                    .clientId(clientId)
                    .aggregationUnitId(aggregationUnitId)
                    .orderType(orderType)
                    .quantity(BigDecimal.valueOf(quantity))
                    .build();
        }

        return validateOrder(orderValidation);
    }

    /**
     * Retrieves a client limit from the limit service
     *
     * @param clientId     The client ID
     * @param securityId   The security ID
     * @param businessDate The business date
     * @return The client limit if found, null otherwise
     */
    public ClientLimit getClientLimit(String clientId, String securityId, LocalDate businessDate) {
        String url = limitServiceUrl + "/client?clientId={clientId}&securityId={securityId}&businessDate={businessDate}";

        try {
            log.info("Retrieving client limit from URL: {}", url);
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
     * @param securityId      The security ID
     * @param businessDate    The business date
     * @return The aggregation unit limit if found, null otherwise
     */
    public AggregationUnitLimit getAggregationUnitLimit(String aggregationUnitId, String securityId, LocalDate businessDate) {
        String url = limitServiceUrl + "/aggregation-unit?aggregationUnitId={aggregationUnitId}" +
                "&securityId={securityId}&businessDate={businessDate}";

        try {
            log.info("Retrieving aggregation unit limit from URL: {}", url);
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
    public ClientLimit updateClientLimit(ClientLimit clientLimit) {
        String url = limitServiceUrl + "/client";

        try {
            log.info("Updating client limit at URL: {}", url);
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
    public AggregationUnitLimit updateAggregationUnitLimit(AggregationUnitLimit aggregationUnitLimit) {
        String url = limitServiceUrl + "/aggregation-unit";

        try {
            log.info("Updating aggregation unit limit at URL: {}", url);
            return restTemplate.postForObject(url, aggregationUnitLimit, AggregationUnitLimit.class);
        } catch (Exception e) {
            log.error("Error updating aggregation unit limit: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Publishes a workflow event for an order validation
     *
     * @param orderValidation The order validation object
     */
    public void publishOrderValidationEvent(OrderValidation orderValidation) {
        log.info("Publishing order validation event for orderId: {}", orderValidation.getOrderId());

        WorkflowEvent event = WorkflowEvent.builder()
                .eventType(orderValidation.isApproved() ? "ORDER_APPROVED" : "ORDER_REJECTED")
                .source("short-sell-service")
                .workflowType("SHORT_SELL_APPROVAL")
                .workflowId(orderValidation.getOrderId())
                .securityId(orderValidation.getSecurity().getInternalId())
                .clientId(orderValidation.getClient().getCounterpartyId())
                .aggregationUnitId(orderValidation.getAggregationUnit().getAggregationUnitId())
                .status(orderValidation.getStatus())
                .rejectionReason(orderValidation.getRejectionReason())
                .processingTimeMs(orderValidation.getProcessingTime())
                .isAutomatic(true)
                .actionTimestamp(LocalDateTime.now())
                .build();

        eventPublisher.publishWorkflowEvent(event);
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