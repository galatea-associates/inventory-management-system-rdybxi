package com.ims.common.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import jakarta.persistence.FetchType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

/**
 * Entity class representing a financial security in the system.
 * This class stores essential security information and serves as a central reference point
 * for positions, prices, inventory calculations, and other security-related data throughout the system.
 * It supports various security types including equities, bonds, and basket products like ETFs and indexes.
 */
@Entity
@Table(name = "securities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"identifiers", "indexConstituents", "constituentOf"}, callSuper = true)
public class Security extends BaseEntity {
    private String internalId;
    private String securityType;
    private String issuer;
    private String description;
    private String currency;
    private LocalDate issueDate;
    private LocalDate maturityDate;
    private String market;
    private String exchange;
    private String status;
    private Boolean isBasketProduct;
    private String basketType;
    private String primaryIdentifierType;
    private String primaryIdentifierValue;

    @OneToMany(mappedBy = "security", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<SecurityIdentifier> identifiers = new HashSet<>();

    @OneToMany(mappedBy = "indexSecurity", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<IndexComposition> indexConstituents = new HashSet<>();

    @OneToMany(mappedBy = "constituentSecurity", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<IndexComposition> constituentOf = new HashSet<>();

    /**
     * Adds a security identifier to this security.
     *
     * @param identifier The security identifier to add
     */
    public void addIdentifier(SecurityIdentifier identifier) {
        identifier.setSecurity(this);
        identifiers.add(identifier);
    }

    /**
     * Removes a security identifier from this security.
     *
     * @param identifier The security identifier to remove
     */
    public void removeIdentifier(SecurityIdentifier identifier) {
        identifiers.remove(identifier);
        identifier.setSecurity(null);
    }

    /**
     * Adds a constituent security to this basket product.
     *
     * @param composition The index composition to add
     */
    public void addConstituent(IndexComposition composition) {
        composition.setIndexSecurity(this);
        indexConstituents.add(composition);
    }

    /**
     * Removes a constituent security from this basket product.
     *
     * @param composition The index composition to remove
     */
    public void removeConstituent(IndexComposition composition) {
        indexConstituents.remove(composition);
        composition.setIndexSecurity(null);
    }

    /**
     * Adds this security as a constituent of another basket security.
     *
     * @param composition The index composition to add
     */
    public void addAsConstituentOf(IndexComposition composition) {
        composition.setConstituentSecurity(this);
        constituentOf.add(composition);
    }

    /**
     * Removes this security as a constituent of another basket security.
     *
     * @param composition The index composition to remove
     */
    public void removeAsConstituentOf(IndexComposition composition) {
        constituentOf.remove(composition);
        composition.setConstituentSecurity(null);
    }

    /**
     * Retrieves a security identifier of the specified type.
     *
     * @param identifierType The type of identifier to retrieve
     * @return The security identifier of the specified type, or null if not found
     */
    public SecurityIdentifier getIdentifierByType(String identifierType) {
        return identifiers.stream()
                .filter(id -> identifierType.equals(id.getIdentifierType()))
                .findFirst()
                .orElse(null);
    }

    /**
     * Retrieves all security identifiers of the specified type.
     *
     * @param identifierType The type of identifiers to retrieve
     * @return Set of security identifiers of the specified type
     */
    public Set<SecurityIdentifier> getIdentifiersByType(String identifierType) {
        return identifiers.stream()
                .filter(id -> identifierType.equals(id.getIdentifierType()))
                .collect(java.util.stream.Collectors.toSet());
    }

    /**
     * Retrieves a security identifier of the specified type and source.
     *
     * @param identifierType The type of identifier to retrieve
     * @param source The source of the identifier
     * @return The security identifier of the specified type and source, or null if not found
     */
    public SecurityIdentifier getIdentifierByTypeAndSource(String identifierType, String source) {
        return identifiers.stream()
                .filter(id -> identifierType.equals(id.getIdentifierType()) && source.equals(id.getSource()))
                .findFirst()
                .orElse(null);
    }

    /**
     * Determines if the security is active and available for trading.
     *
     * @return True if the security is active, false otherwise
     */
    public boolean isActive() {
        return "ACTIVE".equals(status);
    }

    /**
     * Determines if the security has expired based on its maturity date.
     *
     * @return True if the security has expired, false otherwise
     */
    public boolean isExpired() {
        return maturityDate != null && LocalDate.now().isAfter(maturityDate);
    }

    /**
     * Determines if the security is an equity.
     *
     * @return True if the security is an equity, false otherwise
     */
    public boolean isEquity() {
        return "EQUITY".equals(securityType);
    }

    /**
     * Determines if the security is a bond.
     *
     * @return True if the security is a bond, false otherwise
     */
    public boolean isBond() {
        return "BOND".equals(securityType);
    }

    /**
     * Determines if the security is an ETF.
     *
     * @return True if the security is an ETF, false otherwise
     */
    public boolean isETF() {
        return Boolean.TRUE.equals(isBasketProduct) && "ETF".equals(basketType);
    }

    /**
     * Determines if the security is an index.
     *
     * @return True if the security is an index, false otherwise
     */
    public boolean isIndex() {
        return Boolean.TRUE.equals(isBasketProduct) && "INDEX".equals(basketType);
    }
}