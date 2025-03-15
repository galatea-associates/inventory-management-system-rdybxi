package com.ims.calculation.model;

import com.ims.common.model.BaseEntity;

import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity class representing client trading limits for securities in the Inventory Management System.
 * This model tracks the long sell and short sell limits for a specific client and security combination,
 * which are used to validate trading orders against available inventory and regulatory constraints.
 *
 * The limits are used in the short sell approval workflow to ensure that clients do not
 * exceed their allowed trading capacity based on their positions, approved locates,
 * and other market-specific regulations.
 */
@Entity
@Table(name = "client_limits", 
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"clientId", "securityId", "businessDate"})
       },
       indexes = {
           @Index(name = "idx_client_limit_client", columnList = "clientId"),
           @Index(name = "idx_client_limit_security", columnList = "securityId"),
           @Index(name = "idx_client_limit_business_date", columnList = "businessDate")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class ClientLimit extends BaseEntity {

    /**
     * The unique identifier of the client for which the limit applies.
     */
    @Column(nullable = false)
    private String clientId;

    /**
     * The unique identifier of the security for which the limit applies.
     */
    @Column(nullable = false)
    private String securityId;

    /**
     * The business date for which the limit is valid.
     */
    @Column(nullable = false)
    private LocalDate businessDate;

    /**
     * The maximum quantity that the client can long sell for this security.
     * Based on existing long positions and other factors.
     */
    @Column(nullable = false)
    private Double longSellLimit;

    /**
     * The maximum quantity that the client can short sell for this security.
     * Based on approved locates, pay-to-holds, and other factors.
     */
    @Column(nullable = false)
    private Double shortSellLimit;

    /**
     * The amount of the long sell limit that has been used by approved orders.
     */
    @Column(nullable = false)
    private Double longSellUsed;

    /**
     * The amount of the short sell limit that has been used by approved orders.
     */
    @Column(nullable = false)
    private Double shortSellUsed;

    /**
     * The currency in which the limit quantities are denominated.
     */
    @Column(length = 3)
    private String currency;

    /**
     * The type of the limit (e.g., "NORMAL", "RESTRICTED", "ENHANCED").
     */
    @Column(length = 20)
    private String limitType;

    /**
     * The market to which this limit applies (e.g., "US", "UK", "JP").
     */
    @Column(length = 10)
    private String market;

    /**
     * The status of the limit (e.g., "ACTIVE", "SUSPENDED", "INACTIVE").
     */
    @Column(length = 20, nullable = false)
    private String status;

    /**
     * The timestamp when the limit was last updated.
     */
    @Column(nullable = false)
    private LocalDateTime lastUpdated;

    /**
     * Default constructor required by JPA.
     * Initializes numeric fields to 0.0 and sets lastUpdated to current timestamp.
     */
    public ClientLimit() {
        super();
        this.longSellLimit = 0.0;
        this.shortSellLimit = 0.0;
        this.longSellUsed = 0.0;
        this.shortSellUsed = 0.0;
        this.lastUpdated = LocalDateTime.now();
    }

    /**
     * Calculates the remaining long sell limit available for the client.
     *
     * @return The remaining long sell limit
     */
    public Double getRemainingLongSellLimit() {
        return longSellLimit - longSellUsed;
    }

    /**
     * Calculates the remaining short sell limit available for the client.
     *
     * @return The remaining short sell limit
     */
    public Double getRemainingShortSellLimit() {
        return shortSellLimit - shortSellUsed;
    }

    /**
     * Determines if the client has sufficient long sell capacity for a given quantity.
     *
     * @param quantity The quantity to check against the remaining long sell limit
     * @return True if the client has sufficient long sell capacity, false otherwise
     */
    public boolean hasLongSellCapacity(Double quantity) {
        return getRemainingLongSellLimit() >= quantity;
    }

    /**
     * Determines if the client has sufficient short sell capacity for a given quantity.
     *
     * @param quantity The quantity to check against the remaining short sell limit
     * @return True if the client has sufficient short sell capacity, false otherwise
     */
    public boolean hasShortSellCapacity(Double quantity) {
        return getRemainingShortSellLimit() >= quantity;
    }

    /**
     * Updates the long sell used amount by adding the specified quantity.
     *
     * @param quantity The quantity to add to the used amount
     */
    public void updateLongSellUsed(Double quantity) {
        this.longSellUsed += quantity;
        this.lastUpdated = LocalDateTime.now();
    }

    /**
     * Updates the short sell used amount by adding the specified quantity.
     *
     * @param quantity The quantity to add to the used amount
     */
    public void updateShortSellUsed(Double quantity) {
        this.shortSellUsed += quantity;
        this.lastUpdated = LocalDateTime.now();
    }

    /**
     * Determines if the client limit is active and can be used for validation.
     *
     * @return True if the client limit is active, false otherwise
     */
    public boolean isActive() {
        return "ACTIVE".equals(status);
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