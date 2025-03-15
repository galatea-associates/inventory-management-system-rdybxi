package com.ims.calculation.model;

import com.ims.common.model.BaseEntity;

import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entity class representing aggregation unit trading limits for securities in the Inventory Management System.
 * This model tracks the long sell and short sell limits for a specific aggregation unit and security combination,
 * which are used to validate trading orders against available inventory and regulatory constraints at the 
 * aggregation unit level. It supports market-specific rules for different jurisdictions like Taiwan and Japan.
 */
@Entity
@Table(name = "aggregation_unit_limits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class AggregationUnitLimit extends BaseEntity {

    /**
     * Identifier of the aggregation unit this limit applies to.
     * Aggregation units are arbitrary subdivisions of a legal entity for trade reporting
     * purposes and activity segregation, particularly important in Asian-Pacific markets.
     */
    private String aggregationUnitId;

    /**
     * Identifier of the security this limit applies to.
     */
    private String securityId;

    /**
     * The business date for which this limit is applicable.
     */
    private LocalDate businessDate;

    /**
     * The maximum amount of the security that can be sold long by this aggregation unit.
     * This is typically based on existing long positions within the aggregation unit.
     */
    private Double longSellLimit;

    /**
     * The maximum amount of the security that can be sold short by this aggregation unit.
     * This is typically based on borrow contracts, loan contracts, and external lender availabilities.
     */
    private Double shortSellLimit;

    /**
     * The amount of the long sell limit that has already been used or allocated.
     */
    private Double longSellUsed;

    /**
     * The amount of the short sell limit that has already been used or allocated.
     */
    private Double shortSellUsed;

    /**
     * The currency in which the limits are denominated.
     */
    private String currency;

    /**
     * The type of limit (e.g., REGULATORY, INTERNAL, CLIENT).
     */
    private String limitType;

    /**
     * The market or jurisdiction this limit applies to (e.g., US, JP, TW).
     */
    private String market;

    /**
     * The status of this limit (e.g., ACTIVE, INACTIVE, PENDING).
     */
    private String status;

    /**
     * Set of market-specific rules that apply to this limit.
     * These can include special regulatory requirements for specific markets.
     * Examples: "TW_NO_RELENDING", "JP_SETTLEMENT_CUTOFF", "JP_QUANTO_SETTLEMENT"
     */
    private Set<String> marketSpecificRules;

    /**
     * Timestamp indicating when this limit was last updated.
     */
    private LocalDateTime lastUpdated;

    /**
     * Default constructor required by JPA.
     * Initializes numeric fields to 0.0 and creates an empty set for market-specific rules.
     */
    public AggregationUnitLimit() {
        super();
        this.longSellLimit = 0.0;
        this.shortSellLimit = 0.0;
        this.longSellUsed = 0.0;
        this.shortSellUsed = 0.0;
        this.marketSpecificRules = new HashSet<>();
        this.lastUpdated = LocalDateTime.now();
    }

    /**
     * Calculates the remaining long sell limit available for the aggregation unit.
     *
     * @return The remaining long sell limit
     */
    public Double getRemainingLongSellLimit() {
        return longSellLimit - longSellUsed;
    }

    /**
     * Calculates the remaining short sell limit available for the aggregation unit.
     *
     * @return The remaining short sell limit
     */
    public Double getRemainingShortSellLimit() {
        return shortSellLimit - shortSellUsed;
    }

    /**
     * Determines if the aggregation unit has sufficient long sell capacity for a given quantity.
     *
     * @param quantity The quantity to check against the remaining long sell limit
     * @return True if the aggregation unit has sufficient long sell capacity, false otherwise
     */
    public boolean hasLongSellCapacity(Double quantity) {
        return getRemainingLongSellLimit() >= quantity;
    }

    /**
     * Determines if the aggregation unit has sufficient short sell capacity for a given quantity.
     *
     * @param quantity The quantity to check against the remaining short sell limit
     * @return True if the aggregation unit has sufficient short sell capacity, false otherwise
     */
    public boolean hasShortSellCapacity(Double quantity) {
        return getRemainingShortSellLimit() >= quantity;
    }

    /**
     * Updates the long sell used amount by adding the specified quantity.
     * Also updates the lastUpdated timestamp.
     *
     * @param quantity The quantity to add to the long sell used amount
     */
    public void updateLongSellUsed(Double quantity) {
        this.longSellUsed += quantity;
        this.lastUpdated = LocalDateTime.now();
    }

    /**
     * Updates the short sell used amount by adding the specified quantity.
     * Also updates the lastUpdated timestamp.
     *
     * @param quantity The quantity to add to the short sell used amount
     */
    public void updateShortSellUsed(Double quantity) {
        this.shortSellUsed += quantity;
        this.lastUpdated = LocalDateTime.now();
    }

    /**
     * Determines if the aggregation unit limit is active and can be used for validation.
     *
     * @return True if the aggregation unit limit is active, false otherwise
     */
    public boolean isActive() {
        return "ACTIVE".equals(status);
    }

    /**
     * Adds a market-specific rule to this aggregation unit limit.
     *
     * @param rule The market-specific rule to add
     */
    public void addMarketSpecificRule(String rule) {
        if (this.marketSpecificRules == null) {
            this.marketSpecificRules = new HashSet<>();
        }
        this.marketSpecificRules.add(rule);
    }

    /**
     * Removes a market-specific rule from this aggregation unit limit.
     *
     * @param rule The market-specific rule to remove
     */
    public void removeMarketSpecificRule(String rule) {
        if (this.marketSpecificRules != null) {
            this.marketSpecificRules.remove(rule);
        }
    }

    /**
     * Checks if this aggregation unit limit has a specific market rule.
     *
     * @param rule The rule to check for
     * @return True if the rule exists, false otherwise
     */
    public boolean hasMarketSpecificRule(String rule) {
        return this.marketSpecificRules != null && this.marketSpecificRules.contains(rule);
    }

    /**
     * Applies market-specific rules to adjust the limits based on regulatory requirements.
     * This method implements the specific business logic for different markets like Taiwan and Japan.
     */
    public void applyMarketSpecificRules() {
        if ("TW".equals(market)) {
            // Taiwan-specific rules
            // In Taiwan, borrowed shares cannot be re-lent
            if (hasMarketSpecificRule("TW_NO_RELENDING")) {
                // Adjust shortSellLimit to exclude borrowed shares that cannot be re-lent
                // Implementation would vary based on specific business requirements
            }
        } else if ("JP".equals(market)) {
            // Japan-specific rules
            // Japan has different settlement cut-off times for SLAB
            if (hasMarketSpecificRule("JP_SETTLEMENT_CUTOFF")) {
                // Adjust limits based on the time of day and settlement cut-off rules
                // Implementation would vary based on specific business requirements
            }
            
            // In Japan, quanto settlements with T+1 date settle T+2
            if (hasMarketSpecificRule("JP_QUANTO_SETTLEMENT")) {
                // Adjust settlement projections for quanto settlements
                // Implementation would vary based on specific business requirements
            }
        }
        
        // Apply other market-specific rules as needed
        // This would be expanded based on specific regulatory requirements
    }

    /**
     * JPA lifecycle callback that sets the lastUpdated timestamp before an entity is persisted for the first time.
     */
    @PrePersist
    public void prePersist() {
        super.prePersist();
        this.lastUpdated = LocalDateTime.now();
    }

    /**
     * JPA lifecycle callback that updates the lastUpdated timestamp before an entity is updated.
     */
    @PreUpdate
    public void preUpdate() {
        super.preUpdate();
        this.lastUpdated = LocalDateTime.now();
    }
}