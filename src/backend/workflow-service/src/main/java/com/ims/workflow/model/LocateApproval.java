package com.ims.workflow.model;

import com.ims.common.event.InventoryEvent;
import com.ims.common.event.LocateEvent;
import com.ims.common.model.BaseEntity;
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
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity class representing a locate approval in the Inventory Management System.
 * A locate approval is created when a locate request is approved, either through
 * auto-approval rules or manual review. It contains details about the approved
 * quantity, decrement quantity, approval timestamp, expiry date, and the user
 * who approved the request.
 */
@Entity
@Table(name = "locate_approvals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class LocateApproval extends BaseEntity {

    /**
     * Unique identifier for the locate approval.
     */
    private String approvalId;
    
    /**
     * The locate request that this approval is for.
     */
    private LocateRequest request;
    
    /**
     * The quantity of securities approved for the locate.
     */
    @NotNull
    @Positive
    private BigDecimal approvedQuantity;
    
    /**
     * The quantity by which available inventory is decremented.
     * This may differ from the approved quantity based on business rules.
     */
    private BigDecimal decrementQuantity;
    
    /**
     * The timestamp when the approval was made.
     */
    private LocalDateTime approvalTimestamp;
    
    /**
     * The user or system component that approved the locate.
     */
    private String approvedBy;
    
    /**
     * The date on which the locate approval expires.
     */
    private LocalDate expiryDate;
    
    /**
     * Indicates whether the locate was auto-approved by system rules.
     */
    private Boolean isAutoApproved;
    
    /**
     * The temperature of the security (HTB, GC).
     */
    private String securityTemperature;
    
    /**
     * The borrow rate for this security.
     */
    private BigDecimal borrowRate;

    /**
     * Default constructor required by JPA.
     */
    public LocateApproval() {
        super();
        this.approvalTimestamp = LocalDateTime.now();
        this.isAutoApproved = false;
        // Default expiry date to next business day
        this.expiryDate = LocalDate.now().plusDays(1);
    }

    /**
     * Converts this locate approval to a LocateEvent for publishing.
     *
     * @return A LocateEvent populated with data from this approval
     */
    public LocateEvent toLocateEvent() {
        // Create a new LocateEvent with type 'LOCATE_APPROVAL'
        LocateEvent event = LocateEvent.builder()
                .eventType("LOCATE_APPROVAL")
                .build();
        
        // Set the event properties from this approval and its associated request
        event.setLocateId(request.getRequestId());
        event.setSecurityId(request.getSecurity().getInternalId());
        event.setSecurityMarket(request.getSecurity().getMarket());
        event.setRequestorId(request.getRequestor().getCounterpartyId());
        event.setClientId(request.getClient().getCounterpartyId());
        if (request.getAggregationUnit() != null) {
            event.setAggregationUnitId(request.getAggregationUnit().getAggregationUnitId());
        }
        event.setRequestedQuantity(request.getRequestedQuantity());
        event.setApprovedQuantity(this.approvedQuantity);
        event.setDecrementQuantity(this.decrementQuantity);
        event.setRequestTimestamp(request.getRequestTimestamp());
        event.setActionTimestamp(this.approvalTimestamp);
        event.setStatus("APPROVED");
        event.setSwapCashIndicator(request.getSwapCashIndicator());
        event.setSecurityTemperature(this.securityTemperature);
        event.setBorrowRate(this.borrowRate);
        event.setExpiryDate(this.expiryDate);
        event.setActionBy(this.approvedBy);
        event.setIsAutomatic(this.isAutoApproved);
        
        return event;
    }

    /**
     * Converts this locate approval to an InventoryEvent for updating inventory.
     *
     * @return An InventoryEvent for updating inventory based on this approval
     */
    public InventoryEvent toInventoryEvent() {
        // Create a new InventoryEvent with type 'LOCATE_UPDATE'
        InventoryEvent event = InventoryEvent.builder()
                .eventType("LOCATE_UPDATE")
                .build();
        
        event.setSecurityIdentifier(request.getSecurity().getInternalId());
        event.setSecurityMarket(request.getSecurity().getMarket());
        event.setCounterpartyIdentifier(request.getClient().getCounterpartyId());
        if (request.getAggregationUnit() != null) {
            event.setAggregationUnitIdentifier(request.getAggregationUnit().getAggregationUnitId());
        }
        event.setBusinessDate(LocalDate.now());
        event.setCalculationType("LOCATE");
        event.setDecrementQuantity(this.decrementQuantity);
        event.setSecurityTemperature(this.securityTemperature);
        event.setBorrowRate(this.borrowRate);
        event.setStatus("ACTIVE");
        
        return event;
    }

    /**
     * Determines if this locate approval is expired.
     *
     * @return True if the locate approval is expired, false otherwise
     */
    public boolean isExpired() {
        LocalDate currentDate = LocalDate.now();
        return expiryDate.isBefore(currentDate);
    }

    /**
     * Determines if the security is hard to borrow based on its temperature.
     *
     * @return True if the security is hard to borrow, false otherwise
     */
    public boolean isHardToBorrow() {
        return "HTB".equals(securityTemperature);
    }

    /**
     * Determines if the security is general collateral based on its temperature.
     *
     * @return True if the security is general collateral, false otherwise
     */
    public boolean isGeneralCollateral() {
        return "GC".equals(securityTemperature);
    }

    /**
     * Gets the remaining quantity that can be used for short selling.
     *
     * @return The remaining quantity available for short selling
     */
    public BigDecimal getRemainingQuantity() {
        if (approvedQuantity == null) {
            return BigDecimal.ZERO;
        }
        
        if (decrementQuantity == null) {
            return approvedQuantity;
        }
        
        return approvedQuantity.subtract(decrementQuantity);
    }

    /**
     * Determines if this locate approval has any remaining quantity.
     *
     * @return True if the locate has remaining quantity, false otherwise
     */
    public boolean hasRemainingQuantity() {
        return getRemainingQuantity().compareTo(BigDecimal.ZERO) > 0;
    }
}