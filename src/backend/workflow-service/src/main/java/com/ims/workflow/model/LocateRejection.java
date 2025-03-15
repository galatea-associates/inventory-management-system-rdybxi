package com.ims.workflow.model;

import com.ims.common.model.BaseEntity;
import com.ims.common.event.LocateEvent;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

/**
 * Entity class representing a locate rejection in the Inventory Management System.
 * A locate rejection is created when a locate request is rejected, either through
 * auto-rejection rules or manual review. It contains details about the rejection
 * reason, rejection timestamp, and the user who rejected the request.
 */
@Entity
@Table(name = "locate_rejections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class LocateRejection extends BaseEntity {

    /**
     * Unique identifier for the locate rejection.
     */
    private String rejectionId;

    /**
     * The locate request that was rejected.
     */
    private LocateRequest request;

    /**
     * The reason for the rejection.
     */
    private String rejectionReason;

    /**
     * The timestamp when the rejection occurred.
     */
    private LocalDateTime rejectionTimestamp;

    /**
     * The user who rejected the request.
     */
    private String rejectedBy;

    /**
     * Indicates whether the rejection was automatic (via rules) or manual.
     */
    private Boolean isAutoRejected;

    /**
     * Default constructor required by JPA.
     */
    public LocateRejection() {
        super();
        this.rejectionTimestamp = LocalDateTime.now();
        this.isAutoRejected = false;
    }

    /**
     * Converts this locate rejection to a LocateEvent for publishing.
     *
     * @return A LocateEvent populated with data from this rejection
     */
    public LocateEvent toLocateEvent() {
        // Create a new LocateEvent with type 'LOCATE_REJECTION'
        LocateEvent event = LocateEvent.builder()
                .eventType("LOCATE_REJECTION")
                .build();
        
        // Set the event properties from this rejection and its associated request
        event.setLocateId(request.getRequestId());
        event.setSecurityId(request.getSecurity().getInternalId());
        event.setSecurityMarket(request.getSecurity().getMarket());
        event.setRequestorId(request.getRequestor().getCounterpartyId());
        event.setClientId(request.getClient().getCounterpartyId());
        
        if (request.getAggregationUnit() != null) {
            event.setAggregationUnitId(request.getAggregationUnit().getAggregationUnitId());
        }
        
        event.setRequestedQuantity(request.getRequestedQuantity());
        event.setRequestTimestamp(request.getRequestTimestamp());
        event.setActionTimestamp(this.rejectionTimestamp);
        event.setStatus("REJECTED");
        event.setSwapCashIndicator(request.getSwapCashIndicator());
        event.setRejectionReason(this.rejectionReason);
        event.setActionBy(this.rejectedBy);
        event.setIsAutomatic(this.isAutoRejected);
        
        return event;
    }

    /**
     * Determines if the rejection reason is due to insufficient inventory.
     *
     * @return True if the rejection is due to insufficient inventory, false otherwise
     */
    public boolean isInsufficientInventory() {
        return rejectionReason != null && rejectionReason.contains("INSUFFICIENT_INVENTORY");
    }

    /**
     * Determines if the rejection reason is due to security ineligibility.
     *
     * @return True if the rejection is due to security ineligibility, false otherwise
     */
    public boolean isSecurityIneligible() {
        return rejectionReason != null && rejectionReason.contains("SECURITY_INELIGIBLE");
    }

    /**
     * Determines if the rejection reason is due to client ineligibility.
     *
     * @return True if the rejection is due to client ineligibility, false otherwise
     */
    public boolean isClientIneligible() {
        return rejectionReason != null && rejectionReason.contains("CLIENT_INELIGIBLE");
    }

    /**
     * Determines if the rejection reason is due to market closure.
     *
     * @return True if the rejection is due to market closure, false otherwise
     */
    public boolean isMarketClosed() {
        return rejectionReason != null && rejectionReason.contains("MARKET_CLOSED");
    }
}