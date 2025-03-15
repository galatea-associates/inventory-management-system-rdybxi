package com.ims.common.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import jakarta.persistence.FetchType;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.ToString;

import java.util.Set;
import java.util.HashSet;

/**
 * Entity class representing a counterparty in the Inventory Management System.
 * Counterparties include clients, trading partners, and other financial
 * institutions that interact with the bank. This class stores essential
 * counterparty information and maintains relationships with identifiers,
 * positions, contracts, and aggregation units.
 */
@Entity
@Table(name = "counterparties")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"identifiers"}, callSuper = true)
public class Counterparty extends BaseEntity {

    private String counterpartyId;
    private String name;
    private String shortName;
    private String type;
    private String category;
    private String status;
    private String kycStatus;
    private String riskRating;
    private String country;
    private String region;
    private String primaryIdentifierType;
    private String primaryIdentifierValue;
    
    @Builder.Default
    @OneToMany(mappedBy = "counterparty", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<CounterpartyIdentifier> identifiers = new HashSet<>();
    
    /**
     * Adds a counterparty identifier to this counterparty
     *
     * @param identifier The identifier to add
     */
    public void addIdentifier(CounterpartyIdentifier identifier) {
        identifier.setCounterparty(this);
        identifiers.add(identifier);
    }

    /**
     * Removes a counterparty identifier from this counterparty
     *
     * @param identifier The identifier to remove
     */
    public void removeIdentifier(CounterpartyIdentifier identifier) {
        identifiers.remove(identifier);
        identifier.setCounterparty(null);
    }

    /**
     * Retrieves a counterparty identifier of the specified type
     *
     * @param identifierType The type of identifier to retrieve
     * @return The counterparty identifier of the specified type, or null if not found
     */
    public CounterpartyIdentifier getIdentifierByType(String identifierType) {
        for (CounterpartyIdentifier identifier : identifiers) {
            if (identifierType.equals(identifier.getIdentifierType())) {
                return identifier;
            }
        }
        return null;
    }

    /**
     * Retrieves all counterparty identifiers of the specified type
     *
     * @param identifierType The type of identifiers to retrieve
     * @return Set of counterparty identifiers of the specified type
     */
    public Set<CounterpartyIdentifier> getIdentifiersByType(String identifierType) {
        Set<CounterpartyIdentifier> result = new HashSet<>();
        for (CounterpartyIdentifier identifier : identifiers) {
            if (identifierType.equals(identifier.getIdentifierType())) {
                result.add(identifier);
            }
        }
        return result;
    }

    /**
     * Retrieves a counterparty identifier of the specified type and source
     *
     * @param identifierType The type of identifier to retrieve
     * @param source The source of the identifier
     * @return The counterparty identifier of the specified type and source, or null if not found
     */
    public CounterpartyIdentifier getIdentifierByTypeAndSource(String identifierType, String source) {
        for (CounterpartyIdentifier identifier : identifiers) {
            if (identifierType.equals(identifier.getIdentifierType()) && source.equals(identifier.getSource())) {
                return identifier;
            }
        }
        return null;
    }

    /**
     * Determines if the counterparty is active and available for trading
     *
     * @return True if the counterparty is active, false otherwise
     */
    public boolean isActive() {
        return "ACTIVE".equals(status);
    }

    /**
     * Determines if the counterparty has passed KYC checks
     *
     * @return True if the counterparty has passed KYC, false otherwise
     */
    public boolean isKycApproved() {
        return "APPROVED".equals(kycStatus);
    }

    /**
     * Determines if the counterparty is eligible for trading based on status and KYC
     *
     * @return True if the counterparty is eligible for trading, false otherwise
     */
    public boolean isEligibleForTrading() {
        return isActive() && isKycApproved();
    }

    /**
     * Determines if the counterparty is a client of the bank
     *
     * @return True if the counterparty is a client, false otherwise
     */
    public boolean isClient() {
        return "CLIENT".equals(type);
    }

    /**
     * Determines if the counterparty is an internal entity of the bank
     *
     * @return True if the counterparty is an internal entity, false otherwise
     */
    public boolean isInternalEntity() {
        return "INTERNAL".equals(type);
    }

    /**
     * Determines if the counterparty is an external broker
     *
     * @return True if the counterparty is an external broker, false otherwise
     */
    public boolean isExternalBroker() {
        return "BROKER".equals(type);
    }

    /**
     * Determines if the counterparty has a high risk rating
     *
     * @return True if the counterparty is high risk, false otherwise
     */
    public boolean isHighRisk() {
        return "HIGH".equals(riskRating);
    }
}