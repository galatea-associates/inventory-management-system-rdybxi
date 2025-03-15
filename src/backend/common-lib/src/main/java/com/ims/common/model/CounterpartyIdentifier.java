package com.ims.common.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Entity class representing an external identifier for a counterparty in the Inventory Management System.
 * This model maps external identifiers (such as LEI, BIC, SWIFT code, Bloomberg ID, Reuters ID)
 * to internal counterparties, supporting the multi-source data integration requirement.
 */
@Entity
@Table(name = "counterparty_identifiers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "counterparty", callSuper = true)
public class CounterpartyIdentifier extends BaseEntity implements Comparable<CounterpartyIdentifier> {

    /**
     * The type of identifier (e.g., LEI, BIC, SWIFT, BLOOMBERG_ID, REUTERS_ID)
     */
    private String identifierType;

    /**
     * The actual identifier value
     */
    private String identifierValue;

    /**
     * The source of this identifier (e.g., Bloomberg, Reuters, MarkIT)
     */
    private String source;

    /**
     * Priority of this identifier for conflict resolution (lower number means higher priority)
     */
    private Integer priority;

    /**
     * Whether this is the primary identifier for this type
     */
    private Boolean isPrimary;

    /**
     * The counterparty associated with this identifier
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "counterparty_id")
    private Counterparty counterparty;

    /**
     * Determines if this identifier is a Legal Entity Identifier (LEI)
     *
     * @return True if the identifier type is LEI, false otherwise
     */
    public boolean isLEI() {
        return "LEI".equals(identifierType);
    }

    /**
     * Determines if this identifier is a Bank Identifier Code (BIC)
     *
     * @return True if the identifier type is BIC, false otherwise
     */
    public boolean isBIC() {
        return "BIC".equals(identifierType);
    }

    /**
     * Determines if this identifier is a SWIFT code
     *
     * @return True if the identifier type is SWIFT, false otherwise
     */
    public boolean isSWIFT() {
        return "SWIFT".equals(identifierType);
    }

    /**
     * Determines if this identifier is a Bloomberg ID
     *
     * @return True if the identifier type is BLOOMBERG_ID, false otherwise
     */
    public boolean isBloombergID() {
        return "BLOOMBERG_ID".equals(identifierType);
    }

    /**
     * Determines if this identifier is a Reuters ID
     *
     * @return True if the identifier type is REUTERS_ID, false otherwise
     */
    public boolean isReutersID() {
        return "REUTERS_ID".equals(identifierType);
    }

    /**
     * Determines if this identifier is from a specific source
     *
     * @param sourceName The source name to check
     * @return True if the identifier is from the specified source, false otherwise
     */
    public boolean isFromSource(String sourceName) {
        return sourceName.equals(source);
    }

    /**
     * Compares this identifier to another based on priority
     * Lower priority value means higher priority
     *
     * @param other The other identifier to compare to
     * @return Negative if this has higher priority, positive if lower, 0 if equal
     */
    @Override
    public int compareTo(CounterpartyIdentifier other) {
        if (other == null) {
            return -1;
        }
        if (this.priority == null) {
            return (other.priority == null) ? 0 : 1;
        }
        if (other.priority == null) {
            return -1;
        }
        return this.priority.compareTo(other.priority);
    }
}