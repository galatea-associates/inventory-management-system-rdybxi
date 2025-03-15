package com.ims.common.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Entity class representing inventory availability data in the Inventory Management System.
 * This model stores calculated inventory availability for different types (for loan, for pledge,
 * short sell, locate) and provides methods to query and manipulate availability data.
 * It serves as a core domain model for inventory calculations and is used throughout the system
 * for inventory management.
 */
@Entity
@Table(name = "inventory")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class Inventory extends BaseEntity {

    /**
     * The security that this inventory availability is for.
     */
    @ManyToOne
    @JoinColumn(name = "security_id")
    private Security security;

    /**
     * The counterparty that owns this inventory availability.
     */
    @ManyToOne
    @JoinColumn(name = "counterparty_id")
    private Counterparty counterparty;

    /**
     * The aggregation unit that contains this inventory availability.
     */
    @ManyToOne
    @JoinColumn(name = "aggregation_unit_id")
    private AggregationUnit aggregationUnit;

    /**
     * The business date for which this inventory availability is calculated.
     */
    @Column(nullable = false)
    private LocalDate businessDate;

    /**
     * The type of calculation (FOR_LOAN, FOR_PLEDGE, SHORT_SELL, LOCATE, OVERBORROW).
     */
    @Column(nullable = false)
    private String calculationType;

    /**
     * The gross quantity before any adjustments.
     */
    @Column(precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal grossQuantity = BigDecimal.ZERO;

    /**
     * The net quantity after adjustments but before reservations.
     */
    @Column(precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal netQuantity = BigDecimal.ZERO;

    /**
     * The quantity available for use.
     */
    @Column(precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal availableQuantity = BigDecimal.ZERO;

    /**
     * The quantity reserved for specific purposes.
     */
    @Column(precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal reservedQuantity = BigDecimal.ZERO;

    /**
     * The decrement quantity used to track locate-related decrements.
     */
    @Column(precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal decrementQuantity = BigDecimal.ZERO;

    /**
     * The market to which this inventory applies.
     */
    private String market;

    /**
     * The temperature of the security (HTB, GC).
     */
    private String securityTemperature;

    /**
     * The borrow rate for this security.
     */
    @Column(precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal borrowRate = BigDecimal.ZERO;

    /**
     * The ID of the calculation rule used.
     */
    private String calculationRuleId;

    /**
     * The version of the calculation rule used.
     */
    private String calculationRuleVersion;

    /**
     * Indicates if this inventory comes from an external source.
     */
    @Builder.Default
    private Boolean isExternalSource = false;

    /**
     * The name of the external source, if applicable.
     */
    private String externalSourceName;

    /**
     * The status of this inventory availability (ACTIVE, INACTIVE).
     */
    private String status;

    /**
     * Calculates the remaining available quantity after accounting for decrements.
     *
     * @return The remaining available quantity
     */
    public BigDecimal getRemainingAvailability() {
        return availableQuantity.subtract(decrementQuantity);
    }

    /**
     * Determines if this inventory availability is for loan availability.
     *
     * @return True if this inventory availability is for loan availability, false otherwise
     */
    public boolean isForLoan() {
        return "FOR_LOAN".equals(calculationType);
    }

    /**
     * Determines if this inventory availability is for pledge availability.
     *
     * @return True if this inventory availability is for pledge availability, false otherwise
     */
    public boolean isForPledge() {
        return "FOR_PLEDGE".equals(calculationType);
    }

    /**
     * Determines if this inventory availability is for short sell availability.
     *
     * @return True if this inventory availability is for short sell availability, false otherwise
     */
    public boolean isForShortSell() {
        return "SHORT_SELL".equals(calculationType);
    }

    /**
     * Determines if this inventory availability is for locate availability.
     *
     * @return True if this inventory availability is for locate availability, false otherwise
     */
    public boolean isForLocate() {
        return "LOCATE".equals(calculationType);
    }

    /**
     * Determines if this inventory availability is for overborrow identification.
     *
     * @return True if this inventory availability is for overborrow identification, false otherwise
     */
    public boolean isOverborrow() {
        return "OVERBORROW".equals(calculationType);
    }

    /**
     * Determines if this security is hard to borrow based on its temperature.
     *
     * @return True if the security is hard to borrow, false otherwise
     */
    public boolean isHardToBorrow() {
        return "HTB".equals(securityTemperature);
    }

    /**
     * Determines if this security is general collateral based on its temperature.
     *
     * @return True if the security is general collateral, false otherwise
     */
    public boolean isGeneralCollateral() {
        return "GC".equals(securityTemperature);
    }

    /**
     * Determines if this inventory availability has any available quantity.
     *
     * @return True if the inventory availability has available quantity, false otherwise
     */
    public boolean hasAvailability() {
        return getRemainingAvailability().compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Increments the reserved quantity by the specified amount.
     *
     * @param amount The amount to increment by
     */
    public void incrementReservedQuantity(BigDecimal amount) {
        if (amount == null) {
            return;
        }
        
        reservedQuantity = reservedQuantity.add(amount);
        availableQuantity = availableQuantity.subtract(amount);
        
        // Ensure availableQuantity doesn't go negative
        if (availableQuantity.compareTo(BigDecimal.ZERO) < 0) {
            availableQuantity = BigDecimal.ZERO;
        }
    }

    /**
     * Decrements the reserved quantity by the specified amount.
     *
     * @param amount The amount to decrement by
     */
    public void decrementReservedQuantity(BigDecimal amount) {
        if (amount == null) {
            return;
        }
        
        BigDecimal decrementAmount = amount;
        
        // Ensure we don't decrement more than what's reserved
        if (decrementAmount.compareTo(reservedQuantity) > 0) {
            decrementAmount = reservedQuantity;
        }
        
        reservedQuantity = reservedQuantity.subtract(decrementAmount);
        availableQuantity = availableQuantity.add(decrementAmount);
    }

    /**
     * Increments the decrement quantity by the specified amount.
     *
     * @param amount The amount to increment by
     */
    public void incrementDecrementQuantity(BigDecimal amount) {
        if (amount == null) {
            return;
        }
        
        decrementQuantity = decrementQuantity.add(amount);
    }

    /**
     * Decrements the decrement quantity by the specified amount.
     *
     * @param amount The amount to decrement by
     */
    public void decrementDecrementQuantity(BigDecimal amount) {
        if (amount == null) {
            return;
        }
        
        BigDecimal decrementAmount = amount;
        
        // Ensure we don't decrement more than what's already decremented
        if (decrementAmount.compareTo(decrementQuantity) > 0) {
            decrementAmount = decrementQuantity;
        }
        
        decrementQuantity = decrementQuantity.subtract(decrementAmount);
    }

    /**
     * Applies market-specific rules to the availability calculation.
     * This includes special handling for Taiwan, Japan, and other markets as required.
     */
    public void applyMarketSpecificRules() {
        if (market == null || security == null) {
            return;
        }
        
        // Apply Taiwan-specific rules
        if ("TW".equals(market)) {
            // Taiwan rule: Borrowed shares cannot be re-lent
            if (isForLoan() && Boolean.TRUE.equals(isExternalSource)) {
                availableQuantity = BigDecimal.ZERO;
            }
        }
        
        // Apply Japan-specific rules
        if ("JP".equals(market)) {
            // Japan rule: Apply settlement cut-off rules for SLAB activity
            // This is a placeholder for more complex logic that would be implemented
            // based on the time of day and settlement cycle for Japanese markets
            
            // Japan rule: Handle quanto settlements with T+2 settlement
            // This is a placeholder for specific logic related to quanto settlements
        }
        
        // Apply other market-specific rules as needed
        // This would be extended based on regulatory requirements
    }

    /**
     * Determines if this inventory availability is eligible for calculation
     * based on security, counterparty, and aggregation unit status.
     *
     * @return True if eligible for calculation, false otherwise
     */
    public boolean isEligibleForCalculation() {
        // Check if security is active
        if (security == null || !security.isActive()) {
            return false;
        }
        
        // Check if counterparty is eligible for trading
        if (counterparty == null || !counterparty.isEligibleForTrading()) {
            return false;
        }
        
        // Check if aggregation unit is active
        if (aggregationUnit == null || !aggregationUnit.isActive()) {
            return false;
        }
        
        return true;
    }

    /**
     * Determines if this inventory availability is active.
     *
     * @return True if the inventory availability is active, false otherwise
     */
    public boolean isActive() {
        return "ACTIVE".equals(status);
    }
}