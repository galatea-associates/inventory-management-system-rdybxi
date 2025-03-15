package com.ims.common.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Event class representing locate-related events in the Inventory Management System.
 * This class is used to communicate locate request, approval, rejection, cancellation,
 * and expiry events across microservices using the event-driven architecture.
 * 
 * Supports requirements for:
 * - Locate approval workflow (F-301)
 * - Locate request processing (F-301-RQ-002)
 * - Inventory validation for locates (F-301-RQ-004)
 * - Locate persistence (F-301-RQ-005)
 * - Event-driven architecture for loosely coupled services
 */
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
@SuperBuilder
@JsonIgnoreProperties(ignoreUnknown = true)
public class LocateEvent extends BaseEvent {

    private static final long serialVersionUID = 1L;

    // Locate identification
    private String locateId;
    private String locateType;
    
    // Security details
    private String securityId;
    private String securityMarket;
    
    // Client/counterparty information
    private String requestorId;
    private String clientId;
    private String aggregationUnitId;
    
    // Quantity information
    private BigDecimal requestedQuantity;
    private BigDecimal approvedQuantity;
    private BigDecimal decrementQuantity;
    
    // Timing information
    private LocalDateTime requestTimestamp;
    private LocalDateTime actionTimestamp;
    
    // Status fields
    private String status;
    private String swapCashIndicator;
    private String securityTemperature;
    private BigDecimal borrowRate;
    private LocalDate expiryDate;
    private String actionBy;
    private Boolean isAutomatic;
    private String rejectionReason;

    /**
     * Constructor that initializes a new locate event with the specified event type and source
     *
     * @param eventType The type of the event
     * @param source The source system or service that generated the event
     */
    public LocateEvent(String eventType, String source) {
        super(eventType, source);
        this.isAutomatic = false;
    }

    /**
     * Validates the event data before processing
     *
     * @return True if the event is valid, false otherwise
     */
    @Override
    protected boolean validate() {
        return super.validate() &&
               locateId != null && !locateId.isEmpty() &&
               securityId != null && !securityId.isEmpty() &&
               clientId != null && !clientId.isEmpty() &&
               status != null && !status.isEmpty();
    }

    /**
     * Gets the routing key for this event based on security and locate ID
     *
     * @return The routing key for this event
     */
    public String getRoutingKey() {
        return securityId + ":" + locateId;
    }

    /**
     * Determines if this event represents a locate request
     *
     * @return True if this is a locate request event, false otherwise
     */
    public boolean isLocateRequest() {
        return "LOCATE_REQUEST".equals(getEventType());
    }

    /**
     * Determines if this event represents a locate approval
     *
     * @return True if this is a locate approval event, false otherwise
     */
    public boolean isLocateApproval() {
        return "LOCATE_APPROVAL".equals(getEventType());
    }

    /**
     * Determines if this event represents a locate rejection
     *
     * @return True if this is a locate rejection event, false otherwise
     */
    public boolean isLocateRejection() {
        return "LOCATE_REJECTION".equals(getEventType());
    }

    /**
     * Determines if this event represents a locate cancellation
     *
     * @return True if this is a locate cancellation event, false otherwise
     */
    public boolean isLocateCancellation() {
        return "LOCATE_CANCELLATION".equals(getEventType());
    }

    /**
     * Determines if this event represents a locate expiry
     *
     * @return True if this is a locate expiry event, false otherwise
     */
    public boolean isLocateExpiry() {
        return "LOCATE_EXPIRY".equals(getEventType());
    }

    /**
     * Determines if this locate event is in pending status
     *
     * @return True if the locate is pending, false otherwise
     */
    public boolean isPending() {
        return "PENDING".equals(status);
    }

    /**
     * Determines if this locate event is in approved status
     *
     * @return True if the locate is approved, false otherwise
     */
    public boolean isApproved() {
        return "APPROVED".equals(status);
    }

    /**
     * Determines if this locate event is in rejected status
     *
     * @return True if the locate is rejected, false otherwise
     */
    public boolean isRejected() {
        return "REJECTED".equals(status);
    }

    /**
     * Determines if this locate event is in cancelled status
     *
     * @return True if the locate is cancelled, false otherwise
     */
    public boolean isCancelled() {
        return "CANCELLED".equals(status);
    }

    /**
     * Determines if this locate event is in expired status
     *
     * @return True if the locate is expired, false otherwise
     */
    public boolean isExpired() {
        return "EXPIRED".equals(status);
    }

    /**
     * Determines if the security is hard to borrow based on its temperature
     *
     * @return True if the security is hard to borrow, false otherwise
     */
    public boolean isHardToBorrow() {
        return "HTB".equals(securityTemperature);
    }

    /**
     * Determines if the security is general collateral based on its temperature
     *
     * @return True if the security is general collateral, false otherwise
     */
    public boolean isGeneralCollateral() {
        return "GC".equals(securityTemperature);
    }

    /**
     * Determines if this locate is for a swap transaction
     *
     * @return True if the locate is for a swap, false otherwise
     */
    public boolean isSwap() {
        return "SWAP".equals(swapCashIndicator);
    }

    /**
     * Determines if this locate is for a cash transaction
     *
     * @return True if the locate is for cash, false otherwise
     */
    public boolean isCash() {
        return "CASH".equals(swapCashIndicator);
    }

    /**
     * Gets the remaining quantity that can be used for short selling
     *
     * @return The remaining quantity available for short selling
     */
    public BigDecimal getRemainingQuantity() {
        if (!isApproved() || approvedQuantity == null) {
            return BigDecimal.ZERO;
        }
        
        if (decrementQuantity == null) {
            return approvedQuantity;
        }
        
        return approvedQuantity.subtract(decrementQuantity);
    }

    /**
     * Determines if this locate event has any remaining quantity
     *
     * @return True if the locate has remaining quantity, false otherwise
     */
    public boolean hasRemainingQuantity() {
        return getRemainingQuantity().compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Converts this locate event to an InventoryEvent for updating inventory
     *
     * @return An InventoryEvent for updating inventory based on this locate event
     */
    public InventoryEvent toInventoryEvent() {
        InventoryEvent event = new InventoryEvent("LOCATE_UPDATE", getSource());
        event.setSecurityId(this.securityId);
        event.setClientId(this.clientId);
        event.setAggregationUnitId(this.aggregationUnitId);
        event.setDecrementQuantity(this.decrementQuantity);
        event.setCalculationType("LOCATE");
        
        // Copy base event properties for tracing and correlation
        copyBaseProperties(event);
        
        return event;
    }
}