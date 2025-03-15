package com.ims.common.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Entity class representing an external identifier for a security in the Inventory Management System.
 * This model maps external identifiers (such as ISIN, CUSIP, SEDOL, Bloomberg ID, Reuters ID) 
 * to internal securities, supporting the multi-source data integration requirement.
 */
@Entity
@Table(name = "security_identifiers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "security", callSuper = true)
public class SecurityIdentifier extends BaseEntity implements Comparable<SecurityIdentifier> {

    /**
     * The type of the identifier (e.g., ISIN, CUSIP, SEDOL, BLOOMBERG_ID, REUTERS_ID, TICKER).
     */
    private String identifierType;

    /**
     * The value of the identifier.
     */
    private String identifierValue;

    /**
     * The source of the identifier (e.g., Reuters, Bloomberg, MarkIT, Ultumus, RIMES).
     */
    private String source;

    /**
     * The priority of the identifier, used for conflict resolution when multiple sources
     * provide the same identifier type. Lower values indicate higher priority.
     */
    private Integer priority;

    /**
     * Indicates if this identifier is the primary identifier for the security.
     */
    private Boolean isPrimary;

    /**
     * The security this identifier belongs to.
     */
    @ManyToOne
    @JoinColumn(name = "security_id")
    private Security security;

    /**
     * Determines if this identifier is an ISIN.
     *
     * @return True if the identifier type is ISIN, false otherwise
     */
    public boolean isISIN() {
        return "ISIN".equals(identifierType);
    }

    /**
     * Determines if this identifier is a CUSIP.
     *
     * @return True if the identifier type is CUSIP, false otherwise
     */
    public boolean isCUSIP() {
        return "CUSIP".equals(identifierType);
    }

    /**
     * Determines if this identifier is a SEDOL.
     *
     * @return True if the identifier type is SEDOL, false otherwise
     */
    public boolean isSEDOL() {
        return "SEDOL".equals(identifierType);
    }

    /**
     * Determines if this identifier is a Bloomberg ID.
     *
     * @return True if the identifier type is BLOOMBERG_ID, false otherwise
     */
    public boolean isBloombergID() {
        return "BLOOMBERG_ID".equals(identifierType);
    }

    /**
     * Determines if this identifier is a Reuters ID.
     *
     * @return True if the identifier type is REUTERS_ID, false otherwise
     */
    public boolean isReutersID() {
        return "REUTERS_ID".equals(identifierType);
    }

    /**
     * Determines if this identifier is a ticker symbol.
     *
     * @return True if the identifier type is TICKER, false otherwise
     */
    public boolean isTicker() {
        return "TICKER".equals(identifierType);
    }

    /**
     * Determines if this identifier is from a specific source.
     *
     * @param sourceName The source name to check
     * @return True if the identifier is from the specified source, false otherwise
     */
    public boolean isFromSource(String sourceName) {
        return sourceName != null && sourceName.equals(source);
    }

    /**
     * Compares this identifier to another based on priority.
     * Lower priority values indicate higher priority.
     *
     * @param other The other identifier to compare with
     * @return Negative if this has higher priority, positive if lower, 0 if equal
     */
    @Override
    public int compareTo(SecurityIdentifier other) {
        if (other == null || other.getPriority() == null) {
            return -1;
        }
        if (this.priority == null) {
            return 1;
        }
        return this.priority.compareTo(other.getPriority());
    }
}