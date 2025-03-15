package com.ims.calculation.model;

import com.ims.common.model.BaseEntity;
import com.ims.common.model.Security;
import com.ims.common.model.Counterparty;
import com.ims.common.model.AggregationUnit;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.math.BigDecimal;

/**
 * Entity class representing calculated inventory availability in the Inventory Management System.
 * This model stores the results of inventory calculations for different types (for loan, for pledge, 
 * short sell, locate) and provides methods to query and manipulate availability data. It serves as
 * a core domain model for inventory calculations and is used throughout the system for inventory
 * management and decision-making.
 */
@Entity
@Table(name = "inventory_availability")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class InventoryAvailability extends BaseEntity {

    /**
     * Security for which this availability is calculated
     */
    @ManyToOne
    @JoinColumn(name = "security_id")
    private Security security;

    /**
     * Security ID (denormalized for query performance)
     */
    @Column(name = "security_id_value")
    private String securityId;

    /**
     * Counterparty that owns this inventory
     */
    @ManyToOne
    @JoinColumn(name = "counterparty_id")
    private Counterparty counterparty;

    /**
     * Counterparty ID (denormalized for query performance)
     */
    @Column(name = "counterparty_id_value")
    private String counterpartyId;

    /**
     * Aggregation unit containing this inventory
     */
    @ManyToOne
    @JoinColumn(name = "aggregation_unit_id")
    private AggregationUnit aggregationUnit;

    /**
     * Aggregation unit ID (denormalized for query performance)
     */
    @Column(name = "aggregation_unit_id_value")
    private String aggregationUnitId;

    /**
     * Business date for this inventory availability
     */
    @Column(name = "business_date", nullable = false)
    private LocalDate businessDate;

    /**
     * Type of calculation (FOR_LOAN, FOR_PLEDGE, SHORT_SELL, LONG_SELL, LOCATE, OVERBORROW)
     */
    @Column(name = "calculation_type", nullable = false)
    private String calculationType;

    /**
     * Gross quantity before any adjustments
     */
    @Column(name = "gross_quantity", precision = 19, scale = 4)
    private BigDecimal grossQuantity;

    /**
     * Net quantity after adjustments
     */
    @Column(name = "net_quantity", precision = 19, scale = 4)
    private BigDecimal netQuantity;

    /**
     * Available quantity for this inventory
     */
    @Column(name = "available_quantity", precision = 19, scale = 4)
    private BigDecimal availableQuantity;

    /**
     * Quantity that has been reserved but not yet used
     */
    @Column(name = "reserved_quantity", precision = 19, scale = 4)
    private BigDecimal reservedQuantity;

    /**
     * Quantity that has been decremented from availability
     */
    @Column(name = "decrement_quantity", precision = 19, scale = 4)
    private BigDecimal decrementQuantity;

    /**
     * Market for this inventory (e.g., US, JP, TW)
     */
    @Column(name = "market")
    private String market;

    /**
     * Temperature classification (HTB, GC)
     */
    @Column(name = "security_temperature")
    private String securityTemperature;

    /**
     * Borrowing rate for this security
     */
    @Column(name = "borrow_rate", precision = 10, scale = 6)
    private BigDecimal borrowRate;

    /**
     * ID of the calculation rule used
     */
    @Column(name = "calculation_rule_id")
    private String calculationRuleId;

    /**
     * Version of the calculation rule used
     */
    @Column(name = "calculation_rule_version")
    private String calculationRuleVersion;

    /**
     * Flag indicating if this data came from an external source
     */
    @Column(name = "is_external_source")
    private Boolean isExternalSource;

    /**
     * Name of the external source if applicable
     */
    @Column(name = "external_source_name")
    private String externalSourceName;

    /**
     * Status of this availability record (ACTIVE, INACTIVE)
     */
    @Column(name = "status")
    private String status;

    /**
     * Default constructor required by JPA
     */
    public InventoryAvailability() {
        super();
        this.grossQuantity = BigDecimal.ZERO;
        this.netQuantity = BigDecimal.ZERO;
        this.availableQuantity = BigDecimal.ZERO;
        this.reservedQuantity = BigDecimal.ZERO;
        this.decrementQuantity = BigDecimal.ZERO;
        this.isExternalSource = false;
        this.status = "ACTIVE";
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
     * Determines if this inventory availability is for loan availability
     *
     * @return True if this inventory availability is for loan availability, false otherwise
     */
    public boolean isForLoan() {
        return "FOR_LOAN".equals(calculationType);
    }

    /**
     * Determines if this inventory availability is for pledge availability
     *
     * @return True if this inventory availability is for pledge availability, false otherwise
     */
    public boolean isForPledge() {
        return "FOR_PLEDGE".equals(calculationType);
    }

    /**
     * Determines if this inventory availability is for short sell availability
     *
     * @return True if this inventory availability is for short sell availability, false otherwise
     */
    public boolean isForShortSell() {
        return "SHORT_SELL".equals(calculationType);
    }

    /**
     * Determines if this inventory availability is for long sell availability
     *
     * @return True if this inventory availability is for long sell availability, false otherwise
     */
    public boolean isForLongSell() {
        return "LONG_SELL".equals(calculationType);
    }

    /**
     * Determines if this inventory availability is for locate availability
     *
     * @return True if this inventory availability is for locate availability, false otherwise
     */
    public boolean isForLocate() {
        return "LOCATE".equals(calculationType);
    }

    /**
     * Determines if this inventory availability is for overborrow identification
     *
     * @return True if this inventory availability is for overborrow identification, false otherwise
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
     * Determines if this inventory availability has any available quantity
     *
     * @return True if the inventory availability has available quantity, false otherwise
     */
    public boolean hasAvailability() {
        return getRemainingAvailability().compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Increments the reserved quantity by the specified amount
     *
     * @param amount The amount to increment by
     */
    public void incrementReservedQuantity(BigDecimal amount) {
        if (amount == null) {
            return;
        }
        
        if (reservedQuantity == null) {
            reservedQuantity = BigDecimal.ZERO;
        }
        
        if (availableQuantity == null) {
            availableQuantity = BigDecimal.ZERO;
        }
        
        reservedQuantity = reservedQuantity.add(amount);
        availableQuantity = availableQuantity.subtract(amount);
    }

    /**
     * Decrements the reserved quantity by the specified amount
     *
     * @param amount The amount to decrement by
     */
    public void decrementReservedQuantity(BigDecimal amount) {
        if (amount == null) {
            return;
        }
        
        if (reservedQuantity == null) {
            reservedQuantity = BigDecimal.ZERO;
        }
        
        if (availableQuantity == null) {
            availableQuantity = BigDecimal.ZERO;
        }
        
        reservedQuantity = reservedQuantity.subtract(amount);
        availableQuantity = availableQuantity.add(amount);
    }

    /**
     * Increments the decrement quantity by the specified amount
     *
     * @param amount The amount to increment by
     */
    public void incrementDecrementQuantity(BigDecimal amount) {
        if (amount == null) {
            return;
        }
        
        if (decrementQuantity == null) {
            decrementQuantity = BigDecimal.ZERO;
        }
        
        decrementQuantity = decrementQuantity.add(amount);
    }

    /**
     * Decrements the decrement quantity by the specified amount
     *
     * @param amount The amount to decrement by
     */
    public void decrementDecrementQuantity(BigDecimal amount) {
        if (amount == null) {
            return;
        }
        
        if (decrementQuantity == null) {
            decrementQuantity = BigDecimal.ZERO;
        }
        
        decrementQuantity = decrementQuantity.subtract(amount);
    }

    /**
     * Applies market-specific rules to the availability calculation
     */
    public void applyMarketSpecificRules() {
        if (market == null) {
            return;
        }
        
        // Apply Taiwan-specific rules
        if ("TW".equals(market)) {
            // In Taiwan, borrowed shares cannot be re-lent
            if (isForLoan() && Boolean.TRUE.equals(isExternalSource)) {
                availableQuantity = BigDecimal.ZERO;
                netQuantity = BigDecimal.ZERO;
            }
        }
        
        // Apply Japan-specific rules
        if ("JP".equals(market)) {
            // Apply settlement cut-off rules for SLAB activity
            // Handle quanto settlements with T+2 settlement
            // Implementation depends on specific business rules for Japan market
        }
        
        // Other market-specific rules can be added here as needed
    }

    /**
     * Determines if this inventory availability is eligible for calculation based on
     * security, counterparty, and aggregation unit status
     *
     * @return True if eligible for calculation, false otherwise
     */
    public boolean isEligibleForCalculation() {
        // Check if security is active
        if (security != null && !security.isActive()) {
            return false;
        }
        
        // Check if counterparty is eligible for trading
        if (counterparty != null && !counterparty.isEligibleForTrading()) {
            return false;
        }
        
        // Check if aggregation unit is active
        if (aggregationUnit != null && !aggregationUnit.isActive()) {
            return false;
        }
        
        return true;
    }

    /**
     * Determines if this inventory availability is active
     *
     * @return True if the inventory availability is active, false otherwise
     */
    public boolean isActive() {
        return "ACTIVE".equals(status);
    }

    /**
     * JPA lifecycle callback that sets default values before entity is persisted
     */
    @PrePersist
    public void prePersist() {
        // Set denormalized IDs for query performance
        if (security != null) {
            securityId = security.getInternalId();
            market = security.getMarket();
        }
        
        if (counterparty != null) {
            counterpartyId = counterparty.getCounterpartyId();
        }
        
        if (aggregationUnit != null) {
            aggregationUnitId = aggregationUnit.getAggregationUnitId();
        }
        
        // Initialize BigDecimal fields to ZERO if null
        if (grossQuantity == null) {
            grossQuantity = BigDecimal.ZERO;
        }
        
        if (netQuantity == null) {
            netQuantity = BigDecimal.ZERO;
        }
        
        if (availableQuantity == null) {
            availableQuantity = BigDecimal.ZERO;
        }
        
        if (reservedQuantity == null) {
            reservedQuantity = BigDecimal.ZERO;
        }
        
        if (decrementQuantity == null) {
            decrementQuantity = BigDecimal.ZERO;
        }
    }

    /**
     * JPA lifecycle callback that updates derived fields before entity is updated
     */
    @PreUpdate
    public void preUpdate() {
        // Update denormalized IDs for query performance
        if (security != null) {
            securityId = security.getInternalId();
            market = security.getMarket();
        }
        
        if (counterparty != null) {
            counterpartyId = counterparty.getCounterpartyId();
        }
        
        if (aggregationUnit != null) {
            aggregationUnitId = aggregationUnit.getAggregationUnitId();
        }
    }
}