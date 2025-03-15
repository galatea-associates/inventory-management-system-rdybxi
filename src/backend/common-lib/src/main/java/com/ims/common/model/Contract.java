package com.ims.common.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.MapKeyColumn;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.HashMap;

/**
 * Entity class representing a financial contract in the system.
 * This class stores essential contract information and supports various contract types
 * such as securities lending agreements, repurchase agreements, and swap contracts
 * that are critical for inventory calculations.
 */
@Entity
@Table(name = "contracts", indexes = {
    @Index(name = "idx_contract_security_start_date", columnList = "security_id, start_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class Contract extends BaseEntity {

    private String contractId;
    private String externalContractId;
    private String contractType;
    private String securityId;
    
    @ManyToOne
    @JoinColumn(name = "security_id", insertable = false, updatable = false)
    private Security security;
    
    private String counterpartyId;
    
    @ManyToOne
    @JoinColumn(name = "counterparty_id", insertable = false, updatable = false)
    private Counterparty counterparty;
    
    private String direction;
    private BigDecimal quantity;
    private BigDecimal rate;
    private String currency;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate settlementDate;
    private LocalDate maturityDate;
    private String status;
    private String market;
    private String bookId;
    private Boolean isOpenTerm;
    private Boolean isRollable;
    private String collateralType;
    private BigDecimal haircut;
    private String tripartyAgent;
    
    @ElementCollection
    @CollectionTable(name = "contract_attributes", 
                    joinColumns = @JoinColumn(name = "contract_id", referencedColumnName = "id"))
    @MapKeyColumn(name = "attribute_key")
    @Column(name = "attribute_value")
    @Builder.Default
    private Map<String, String> additionalAttributes = new HashMap<>();
    
    /**
     * Default constructor required by JPA
     */
    public Contract() {
        super(); // Call super() to initialize BaseEntity fields
        this.additionalAttributes = new HashMap<>(); // Initialize additionalAttributes as new HashMap<>()
    }
    
    /**
     * Adds an additional attribute to this contract
     *
     * @param key The attribute key
     * @param value The attribute value
     */
    public void addAttribute(String key, String value) {
        this.additionalAttributes.put(key, value);
    }
    
    /**
     * Gets the value of an additional attribute
     *
     * @param key The attribute key
     * @return The value of the attribute, or null if not found
     */
    public String getAttribute(String key) {
        return this.additionalAttributes.get(key);
    }
    
    /**
     * Determines if this contract is a securities lending agreement
     *
     * @return True if this is a securities lending agreement, false otherwise
     */
    public boolean isSecuritiesLending() {
        return "SECURITIES_LENDING".equals(contractType);
    }
    
    /**
     * Determines if this contract is a repurchase agreement
     *
     * @return True if this is a repurchase agreement, false otherwise
     */
    public boolean isRepurchaseAgreement() {
        return "REPO".equals(contractType);
    }
    
    /**
     * Determines if this contract is a swap
     *
     * @return True if this is a swap, false otherwise
     */
    public boolean isSwap() {
        return "SWAP".equals(contractType);
    }
    
    /**
     * Determines if this contract is a borrow from the perspective of the bank
     *
     * @return True if this is a borrow, false otherwise
     */
    public boolean isBorrow() {
        return "BORROW".equals(direction);
    }
    
    /**
     * Determines if this contract is a loan from the perspective of the bank
     *
     * @return True if this is a loan, false otherwise
     */
    public boolean isLoan() {
        return "LOAN".equals(direction);
    }
    
    /**
     * Determines if the contract is currently active
     *
     * @return True if the contract is active, false otherwise
     */
    public boolean isActive() {
        return "ACTIVE".equals(status);
    }
    
    /**
     * Determines if the contract has expired
     *
     * @return True if the contract has expired, false otherwise
     */
    public boolean isExpired() {
        if (Boolean.TRUE.equals(isOpenTerm)) {
            return false;
        }
        return endDate != null && !LocalDate.now().isBefore(endDate);
    }
    
    /**
     * Calculates the remaining term of the contract in days
     *
     * @return The remaining term in days, or -1 if open term
     */
    public long getRemainingTerm() {
        if (Boolean.TRUE.equals(isOpenTerm)) {
            return -1;
        }
        if (endDate == null) {
            return -1;
        }
        long days = ChronoUnit.DAYS.between(LocalDate.now(), endDate);
        return Math.max(0, days);
    }
    
    /**
     * Gets the security identifier, either from the security object or the securityId field
     *
     * @return The security identifier
     */
    public String getSecurityIdentifier() {
        return security != null ? security.getInternalId() : securityId;
    }
    
    /**
     * Gets the counterparty identifier, either from the counterparty object or the counterpartyId field
     *
     * @return The counterparty identifier
     */
    public String getCounterpartyIdentifier() {
        return counterparty != null ? counterparty.getCounterpartyId() : counterpartyId;
    }
    
    /**
     * Determines if the contract can be rolled over
     *
     * @return True if the contract can be rolled over, false otherwise
     */
    public boolean canBeRolled() {
        return Boolean.TRUE.equals(isRollable) && isActive() && !isExpired();
    }
    
    /**
     * Determines if this is a triparty contract
     *
     * @return True if this is a triparty contract, false otherwise
     */
    public boolean isTriparty() {
        return tripartyAgent != null && !tripartyAgent.isEmpty();
    }
}