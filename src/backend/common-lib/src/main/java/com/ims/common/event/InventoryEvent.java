package com.ims.common.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ims.common.model.Inventory;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Event class representing inventory availability updates in the Inventory Management System.
 * This event is published when inventory calculations are performed and consumed by downstream
 * services for locate approval, short sell validation, and other inventory-dependent workflows.
 */
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
@SuperBuilder
@JsonIgnoreProperties(ignoreUnknown = true)
public class InventoryEvent extends BaseEvent {

    // Security information
    private String securityIdentifier;
    private String securityMarket;
    
    // Counterparty and aggregation unit information
    private String counterpartyIdentifier;
    private String aggregationUnitIdentifier;
    
    // Date information
    private LocalDate businessDate;
    
    // Calculation information
    private String calculationType;
    private BigDecimal grossQuantity;
    private BigDecimal netQuantity;
    private BigDecimal availableQuantity;
    private BigDecimal reservedQuantity;
    private BigDecimal decrementQuantity;
    
    // Security characteristics
    private String securityTemperature;
    private BigDecimal borrowRate;
    
    // Calculation metadata
    private String calculationRuleId;
    private String calculationRuleVersion;
    
    // External source information
    private Boolean isExternalSource;
    private String externalSourceName;
    
    // Status
    private String status;

    /**
     * Static factory method to create an InventoryEvent from an Inventory entity
     *
     * @param inventory The inventory entity to create an event from
     * @param eventType The type of event to create
     * @return A new InventoryEvent populated with data from the inventory entity
     */
    public static InventoryEvent fromInventory(Inventory inventory, String eventType) {
        if (inventory == null) {
            throw new IllegalArgumentException("Inventory cannot be null");
        }

        return InventoryEvent.builder()
                .eventType(eventType)
                .securityIdentifier(inventory.getSecurity() != null ? inventory.getSecurity().getInternalId() : null)
                .securityMarket(inventory.getSecurity() != null ? inventory.getSecurity().getMarket() : null)
                .counterpartyIdentifier(inventory.getCounterparty() != null ? inventory.getCounterparty().getCounterpartyId() : null)
                .aggregationUnitIdentifier(inventory.getAggregationUnit() != null ? inventory.getAggregationUnit().getAggregationUnitId() : null)
                .businessDate(inventory.getBusinessDate())
                .calculationType(inventory.getCalculationType())
                .grossQuantity(inventory.getGrossQuantity())
                .netQuantity(inventory.getNetQuantity())
                .availableQuantity(inventory.getAvailableQuantity())
                .reservedQuantity(inventory.getReservedQuantity())
                .decrementQuantity(inventory.getDecrementQuantity())
                .securityTemperature(inventory.getSecurityTemperature())
                .borrowRate(inventory.getBorrowRate())
                .calculationRuleId(inventory.getCalculationRuleId())
                .calculationRuleVersion(inventory.getCalculationRuleVersion())
                .isExternalSource(inventory.getIsExternalSource())
                .externalSourceName(inventory.getExternalSourceName())
                .status(inventory.getStatus())
                .build();
    }

    /**
     * Validates the event data before processing
     *
     * @return True if the event is valid, false otherwise
     */
    @Override
    public boolean validate() {
        return super.validate() &&
                securityIdentifier != null && !securityIdentifier.isEmpty() &&
                calculationType != null && !calculationType.isEmpty() &&
                businessDate != null;
    }

    /**
     * Gets the routing key for this event based on security and calculation type
     *
     * @return The routing key for this event
     */
    public String getRoutingKey() {
        return securityIdentifier + "." + calculationType;
    }

    /**
     * Calculates the remaining available quantity after accounting for decrements
     *
     * @return The remaining available quantity
     */
    public BigDecimal getRemainingAvailability() {
        if (availableQuantity == null) {
            return BigDecimal.ZERO;
        }
        
        if (decrementQuantity == null) {
            return availableQuantity;
        }
        
        return availableQuantity.subtract(decrementQuantity);
    }

    /**
     * Determines if this event is for a for-loan availability update
     *
     * @return True if this is a for-loan availability update, false otherwise
     */
    public boolean isForLoanUpdate() {
        return "FOR_LOAN".equals(calculationType);
    }

    /**
     * Determines if this event is for a for-pledge availability update
     *
     * @return True if this is a for-pledge availability update, false otherwise
     */
    public boolean isForPledgeUpdate() {
        return "FOR_PLEDGE".equals(calculationType);
    }

    /**
     * Determines if this event is for a short sell availability update
     *
     * @return True if this is a short sell availability update, false otherwise
     */
    public boolean isShortSellUpdate() {
        return "SHORT_SELL".equals(calculationType);
    }

    /**
     * Determines if this event is for a locate availability update
     *
     * @return True if this is a locate availability update, false otherwise
     */
    public boolean isLocateUpdate() {
        return "LOCATE".equals(calculationType);
    }

    /**
     * Determines if this event is for an overborrow identification
     *
     * @return True if this is an overborrow identification, false otherwise
     */
    public boolean isOverborrow() {
        return "OVERBORROW".equals(calculationType);
    }

    /**
     * Determines if this security is hard to borrow based on its temperature
     *
     * @return True if the security is hard to borrow, false otherwise
     */
    public boolean isHardToBorrow() {
        return "HTB".equals(securityTemperature);
    }

    /**
     * Determines if this security is general collateral based on its temperature
     *
     * @return True if the security is general collateral, false otherwise
     */
    public boolean isGeneralCollateral() {
        return "GC".equals(securityTemperature);
    }

    /**
     * Determines if this inventory event has any available quantity
     *
     * @return True if the inventory event has available quantity, false otherwise
     */
    public boolean hasAvailability() {
        return getRemainingAvailability().compareTo(BigDecimal.ZERO) > 0;
    }
}