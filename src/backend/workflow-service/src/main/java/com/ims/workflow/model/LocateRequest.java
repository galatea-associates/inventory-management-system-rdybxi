package com.ims.workflow.model;

import com.ims.common.model.AggregationUnit;
import com.ims.common.model.BaseEntity;
import com.ims.common.model.Counterparty;
import com.ims.common.model.Security;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity class representing a locate request in the system. A locate request is submitted
 * by a client or trader to request permission to borrow a security for short selling purposes.
 * This model tracks the request details, status, and relationships to approvals or rejections.
 */
@Entity
@Table(name = "locate_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class LocateRequest extends BaseEntity {

    /**
     * Unique identifier for the locate request.
     */
    private String requestId;
    
    /**
     * The security for which locate is requested.
     */
    private Security security;
    
    /**
     * The counterparty making the locate request.
     */
    private Counterparty requestor;
    
    /**
     * The client on whose behalf the locate is being requested.
     */
    private Counterparty client;
    
    /**
     * The aggregation unit for regulatory reporting.
     */
    private AggregationUnit aggregationUnit;
    
    /**
     * The type of locate request (e.g., SHORT_SELL, SWAP).
     */
    private String locateType;
    
    /**
     * The quantity of securities requested.
     */
    private BigDecimal requestedQuantity;
    
    /**
     * The timestamp when the request was made.
     */
    private LocalDateTime requestTimestamp;
    
    /**
     * The current status of the locate request (e.g., PENDING, APPROVED, REJECTED).
     */
    private String status;
    
    /**
     * Indicator for swap/cash (relevant for swap-type locates).
     */
    private String swapCashIndicator;
    
    /**
     * The approval record if this request has been approved.
     */
    private LocateApproval approval;
    
    /**
     * The rejection record if this request has been rejected.
     */
    private LocateRejection rejection;

    /**
     * Default constructor required by JPA.
     */
    public LocateRequest() {
        super();
        this.requestTimestamp = LocalDateTime.now();
        this.status = "PENDING";
        this.requestedQuantity = BigDecimal.ZERO;
    }

    /**
     * Validates if the locate request is valid.
     *
     * @return True if the locate request is valid, false otherwise
     */
    public boolean isValid() {
        return security != null &&
               requestor != null &&
               client != null &&
               requestedQuantity.compareTo(BigDecimal.ZERO) > 0 &&
               security.isActive() &&
               client.isEligibleForTrading();
    }

    /**
     * Determines if the locate request is in pending status.
     *
     * @return True if the locate request is pending, false otherwise
     */
    public boolean isPending() {
        return "PENDING".equals(status);
    }

    /**
     * Determines if the locate request is approved.
     *
     * @return True if the locate request is approved, false otherwise
     */
    public boolean isApproved() {
        return "APPROVED".equals(status);
    }

    /**
     * Determines if the locate request is rejected.
     *
     * @return True if the locate request is rejected, false otherwise
     */
    public boolean isRejected() {
        return "REJECTED".equals(status);
    }

    /**
     * Determines if the locate request is expired.
     *
     * @return True if the locate request is expired, false otherwise
     */
    public boolean isExpired() {
        return "EXPIRED".equals(status);
    }

    /**
     * Determines if the locate request is cancelled.
     *
     * @return True if the locate request is cancelled, false otherwise
     */
    public boolean isCancelled() {
        return "CANCELLED".equals(status);
    }

    /**
     * Approves the locate request with the provided approval details.
     *
     * @param approval The approval details
     */
    public void approve(LocateApproval approval) {
        if (!isPending()) {
            throw new IllegalStateException("Only pending locate requests can be approved");
        }
        this.approval = approval;
        this.status = "APPROVED";
        if (approval != null) {
            approval.setRequest(this);
        }
    }

    /**
     * Rejects the locate request with the provided rejection details.
     *
     * @param rejection The rejection details
     */
    public void reject(LocateRejection rejection) {
        if (!isPending()) {
            throw new IllegalStateException("Only pending locate requests can be rejected");
        }
        this.rejection = rejection;
        this.status = "REJECTED";
        if (rejection != null) {
            rejection.setRequest(this);
        }
    }

    /**
     * Expires the locate request.
     */
    public void expire() {
        if (!isApproved()) {
            throw new IllegalStateException("Only approved locate requests can be expired");
        }
        this.status = "EXPIRED";
    }

    /**
     * Cancels the locate request.
     */
    public void cancel() {
        if (!isPending()) {
            throw new IllegalStateException("Only pending locate requests can be cancelled");
        }
        this.status = "CANCELLED";
    }

    /**
     * Determines if this locate request is for a short sell.
     *
     * @return True if the locate request is for a short sell, false otherwise
     */
    public boolean isShortSell() {
        return "SHORT_SELL".equals(locateType);
    }

    /**
     * Determines if this locate request is for a swap.
     *
     * @return True if the locate request is for a swap, false otherwise
     */
    public boolean isSwap() {
        return "SWAP".equals(locateType);
    }

    /**
     * Converts this locate request to a LocateEvent for publishing.
     *
     * @return A LocateEvent populated with data from this request
     */
    public LocateEvent toLocateEvent() {
        // Create a new LocateEvent with type 'LOCATE_REQUEST'
        LocateEvent event = new LocateEvent();
        
        // Set the event properties from this request
        event.setType("LOCATE_REQUEST");
        event.setRequestId(this.requestId);
        event.setSecurityId(this.security.getInternalId());
        event.setRequestorId(this.requestor.getCounterpartyId());
        event.setClientId(this.client.getCounterpartyId());
        if (this.aggregationUnit != null) {
            event.setAggregationUnitId(this.aggregationUnit.getAggregationUnitId());
        }
        event.setLocateType(this.locateType);
        event.setRequestedQuantity(this.requestedQuantity);
        event.setRequestTimestamp(this.requestTimestamp);
        event.setStatus(this.status);
        event.setSwapCashIndicator(this.swapCashIndicator);
        
        // Return the populated event
        return event;
    }
}