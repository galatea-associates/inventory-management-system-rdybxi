package com.ims.workflow.model;

import com.ims.common.model.AggregationUnit;
import com.ims.common.model.BaseEntity;
import com.ims.common.model.Counterparty;
import com.ims.common.model.Security;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal; // version: 17
import java.time.LocalDateTime; // version: 17

/**
 * Entity class representing an order validation in the system. This class stores information
 * about order validations for short sell and long sell orders, including validation status,
 * processing time, and rejection reasons. It is a critical component of the short sell approval
 * workflow that must complete within the 150ms SLA.
 */
@Entity
@Table(name = "order_validations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class OrderValidation extends BaseEntity {

    private String validationId;
    private String orderId;
    private String orderType;

    @ManyToOne
    @JoinColumn(name = "security_id")
    private Security security;

    @ManyToOne
    @JoinColumn(name = "client_id")
    private Counterparty client;

    @ManyToOne
    @JoinColumn(name = "aggregation_unit_id")
    private AggregationUnit aggregationUnit;

    private BigDecimal quantity;
    private LocalDateTime validationTimestamp;
    private String status;
    private String rejectionReason;
    private Long processingTime;

    /**
     * Determines if the order validation contains all required fields
     *
     * @return True if the validation is valid, false otherwise
     */
    public boolean isValid() {
        return orderId != null && !orderId.isEmpty() &&
                orderType != null && !orderType.isEmpty() &&
                security != null &&
                client != null &&
                aggregationUnit != null &&
                quantity != null && quantity.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Determines if the order is a short sell order
     *
     * @return True if the order is a short sell, false otherwise
     */
    public boolean isShortSell() {
        return "SHORT_SELL".equals(orderType);
    }

    /**
     * Determines if the order is a long sell order
     *
     * @return True if the order is a long sell, false otherwise
     */
    public boolean isLongSell() {
        return "LONG_SELL".equals(orderType);
    }

    /**
     * Determines if the order validation is pending
     *
     * @return True if the validation is pending, false otherwise
     */
    public boolean isPending() {
        return "PENDING".equals(status);
    }

    /**
     * Determines if the order validation is approved
     *
     * @return True if the validation is approved, false otherwise
     */
    public boolean isApproved() {
        return "APPROVED".equals(status);
    }

    /**
     * Determines if the order validation is rejected
     *
     * @return True if the validation is rejected, false otherwise
     */
    public boolean isRejected() {
        return "REJECTED".equals(status);
    }

    /**
     * Determines if the order validation has been processed (approved or rejected)
     *
     * @return True if the validation is processed, false otherwise
     */
    public boolean isProcessed() {
        return isApproved() || isRejected();
    }

    /**
     * Approves the order validation
     *
     * @return This order validation instance for method chaining
     */
    public OrderValidation approve() {
        this.status = "APPROVED";
        this.rejectionReason = null;
        return this;
    }

    /**
     * Rejects the order validation due to insufficient client limit
     *
     * @return This order validation instance for method chaining
     */
    public OrderValidation rejectClientLimit() {
        this.status = "REJECTED";
        this.rejectionReason = "INSUFFICIENT_CLIENT_LIMIT";
        return this;
    }

    /**
     * Rejects the order validation due to insufficient aggregation unit limit
     *
     * @return This order validation instance for method chaining
     */
    public OrderValidation rejectAggregationUnitLimit() {
        this.status = "REJECTED";
        this.rejectionReason = "INSUFFICIENT_AGGREGATION_UNIT_LIMIT";
        return this;
    }

    /**
     * Rejects the order validation due to invalid order data
     *
     * @return This order validation instance for method chaining
     */
    public OrderValidation rejectInvalidOrder() {
        this.status = "REJECTED";
        this.rejectionReason = "INVALID_ORDER";
        return this;
    }

    /**
     * Rejects the order validation with a custom reason
     *
     * @param reason The rejection reason
     * @return This order validation instance for method chaining
     */
    public OrderValidation rejectWithReason(String reason) {
        this.status = "REJECTED";
        this.rejectionReason = reason;
        return this;
    }

    /**
     * Sets the processing time for the validation
     *
     * @param processingTime The processing time in milliseconds
     * @return This order validation instance for method chaining
     */
    public OrderValidation setProcessingTime(Long processingTime) {
        this.processingTime = processingTime;
        return this;
    }

    /**
     * JPA lifecycle callback that sets validation timestamp before entity is persisted
     */
    @PrePersist
    public void prePersist() {
        super.prePersist();
        if (validationTimestamp == null) {
            validationTimestamp = LocalDateTime.now();
        }
        if (status == null) {
            status = "PENDING";
        }
    }
}