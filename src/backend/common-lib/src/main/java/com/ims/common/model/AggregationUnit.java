package com.ims.common.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.HashSet;
import java.util.Set;

/**
 * Entity class representing an aggregation unit in the system. Aggregation units are arbitrary
 * subdivisions of a legal entity for trade reporting purposes and activity segregation,
 * particularly important in Asian-Pacific markets. This class is used for position aggregation,
 * limit calculations, and regulatory reporting.
 */
@Entity
@Table(name = "aggregation_units")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class AggregationUnit extends BaseEntity {

    /**
     * Unique identifier for the aggregation unit.
     */
    private String aggregationUnitId;

    /**
     * Name of the aggregation unit.
     */
    private String name;

    /**
     * Type of the aggregation unit (e.g., REGULATORY, TRADING, RISK).
     */
    private String type;

    /**
     * Market where the aggregation unit operates.
     */
    private String market;

    /**
     * Region where the aggregation unit operates.
     */
    private String region;

    /**
     * Status of the aggregation unit (e.g., ACTIVE, INACTIVE).
     */
    private String status;

    /**
     * ID of the officer responsible for the aggregation unit.
     */
    private String officerId;

    /**
     * Regulatory ID for compliance purposes.
     */
    private String regulatoryId;

    /**
     * ID of the parent entity (legal entity).
     */
    private String parentEntityId;

    /**
     * Set of book IDs associated with this aggregation unit.
     */
    @Builder.Default
    private Set<String> books = new HashSet<>();

    /**
     * Default constructor required by JPA.
     * Initializes the books collection.
     */
    public AggregationUnit() {
        super();
        this.books = new HashSet<>();
    }

    /**
     * Adds a book to this aggregation unit.
     *
     * @param bookId The ID of the book to add
     */
    public void addBook(String bookId) {
        this.books.add(bookId);
    }

    /**
     * Removes a book from this aggregation unit.
     *
     * @param bookId The ID of the book to remove
     */
    public void removeBook(String bookId) {
        this.books.remove(bookId);
    }

    /**
     * Checks if this aggregation unit contains the specified book.
     *
     * @param bookId The ID of the book to check
     * @return True if the aggregation unit contains the book, false otherwise
     */
    public boolean containsBook(String bookId) {
        return this.books.contains(bookId);
    }

    /**
     * Determines if the aggregation unit is active.
     *
     * @return True if the aggregation unit is active, false otherwise
     */
    public boolean isActive() {
        return "ACTIVE".equals(this.status);
    }

    /**
     * Determines if the aggregation unit is used for regulatory reporting.
     *
     * @return True if the aggregation unit is used for regulatory reporting, false otherwise
     */
    public boolean isRegulatory() {
        return "REGULATORY".equals(this.type);
    }

    /**
     * Determines if the aggregation unit is used for trading activities.
     *
     * @return True if the aggregation unit is used for trading activities, false otherwise
     */
    public boolean isTrading() {
        return "TRADING".equals(this.type);
    }

    /**
     * Determines if the aggregation unit is used for risk management.
     *
     * @return True if the aggregation unit is used for risk management, false otherwise
     */
    public boolean isRiskManagement() {
        return "RISK".equals(this.type);
    }

    /**
     * Retrieves market-specific rules for this aggregation unit.
     *
     * @return Set of market-specific rules applicable to this aggregation unit
     */
    public Set<String> getMarketSpecificRules() {
        Set<String> rules = new HashSet<>();
        
        // Add Taiwan-specific rules
        if ("TW".equals(market)) {
            rules.add("BORROWED_SHARES_NO_RELENDING");
        }
        
        // Add Japan-specific rules
        if ("JP".equals(market)) {
            rules.add("SETTLEMENT_CUTOFF_RULES");
            rules.add("QUANTO_SETTLEMENT_T2");
        }
        
        return rules;
    }
}