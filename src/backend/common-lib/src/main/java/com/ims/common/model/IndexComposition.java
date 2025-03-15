package com.ims.common.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.PrePersist;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.time.LocalDate;

/**
 * Entity class representing the composition relationship between an index/basket security
 * and its constituent securities. This class stores the weight of each constituent within
 * the parent index/ETF and provides effective dating for tracking composition changes over time.
 */
@Entity
@Table(name = "index_compositions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"indexSecurity", "constituentSecurity"}, callSuper = true)
public class IndexComposition extends BaseEntity {

    /**
     * The index or basket security that contains constituents
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "index_security_id", nullable = false)
    private Security indexSecurity;

    /**
     * The constituent security that is part of the index/basket
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "constituent_security_id", nullable = false)
    private Security constituentSecurity;

    /**
     * The weight of this constituent in the index/basket.
     * Typically stored as a decimal value (0.01 = 1%).
     */
    private Double weight;

    /**
     * Type of composition relationship (e.g., "PRIMARY", "TRACKING", "APPROXIMATE")
     */
    private String compositionType;

    /**
     * The date from which this composition relationship is effective
     */
    private LocalDate effectiveDate;

    /**
     * The date until which this composition relationship is effective.
     * If null, the relationship is effective indefinitely.
     */
    private LocalDate expiryDate;

    /**
     * Source of the composition data (e.g., "REUTERS", "BLOOMBERG", "MARKIT")
     */
    private String source;

    /**
     * Flag indicating if this composition relationship is currently active
     */
    private Boolean isActive;

    /**
     * Determines if this composition relationship is currently active based on
     * effective and expiry dates
     *
     * @return True if the composition is currently active, false otherwise
     */
    public boolean isCurrentlyActive() {
        LocalDate currentDate = LocalDate.now();
        boolean effectiveDateValid = effectiveDate == null || !currentDate.isBefore(effectiveDate);
        boolean expiryDateValid = expiryDate == null || currentDate.isBefore(expiryDate);
        return Boolean.TRUE.equals(isActive) && effectiveDateValid && expiryDateValid;
    }

    /**
     * Returns the weight as a percentage value
     *
     * @return Weight as a percentage (0-100)
     */
    public Double getWeightAsPercentage() {
        return weight != null ? weight * 100 : null;
    }

    /**
     * Sets the weight from a percentage value
     *
     * @param percentage Weight as a percentage (0-100)
     */
    public void setWeightAsPercentage(Double percentage) {
        this.weight = percentage != null ? percentage / 100 : null;
    }

    /**
     * JPA lifecycle callback that sets default values before entity is persisted
     */
    @PrePersist
    @Override
    public void prePersist() {
        if (isActive == null) {
            isActive = true;
        }
        if (effectiveDate == null) {
            effectiveDate = LocalDate.now();
        }
        super.prePersist();
    }
}