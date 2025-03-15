package com.ims.ingestion.model;

import com.ims.common.model.BaseEntity;
import com.ims.common.model.Contract;
import com.ims.common.model.Counterparty;
import com.ims.common.model.Security;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.PrePersist;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal; // version 17
import java.time.LocalDate; // version 17
import java.util.HashMap; // version 17
import java.util.Map; // version 17

/**
 * Entity class representing contract data received from external sources during the ingestion process.
 * This class serves as an intermediate representation for various types of financial contracts including
 * securities lending agreements, repurchase agreements, and swap contracts before they are processed
 * and transformed into the core Contract domain model.
 */
@Entity
@Table(name = "contract_data", indexes = {
    @Index(name = "idx_contract_data_external_id", columnList = "external_contract_id"),
    @Index(name = "idx_contract_data_security_counterparty", columnList = "security_id, counterparty_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class ContractData extends BaseEntity {

    private String externalContractId;
    private String contractType;
    
    @ManyToOne
    @JoinColumn(name = "security_id", insertable = false, updatable = false)
    private Security security;
    
    private String securityId;
    
    @ManyToOne
    @JoinColumn(name = "counterparty_id", insertable = false, updatable = false)
    private Counterparty counterparty;
    
    private String counterpartyId;
    
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
    private String dataSource;
    private String batchId;
    private String processingStatus;
    private String errorMessage;
    
    @ElementCollection
    @CollectionTable(name = "contract_data_attributes", 
                    joinColumns = @JoinColumn(name = "contract_data_id", referencedColumnName = "id"))
    @MapKeyColumn(name = "attribute_key")
    @Column(name = "attribute_value")
    private Map<String, String> additionalAttributes;
    
    /**
     * Default constructor required by JPA
     */
    public ContractData() {
        super(); // Call super() to initialize BaseEntity fields
        this.additionalAttributes = new HashMap<>(); // Initialize additionalAttributes as new HashMap<>()
        this.isOpenTerm = false;
        this.isRollable = false;
    }
    
    /**
     * Adds an additional attribute to this contract data
     *
     * @param key The attribute key
     * @param value The attribute value
     */
    public void addAttribute(String key, String value) {
        if (this.additionalAttributes == null) {
            this.additionalAttributes = new HashMap<>();
        }
        this.additionalAttributes.put(key, value);
    }
    
    /**
     * Gets the value of an additional attribute
     *
     * @param key The attribute key
     * @return The value of the attribute, or null if not found
     */
    public String getAttribute(String key) {
        return this.additionalAttributes != null ? this.additionalAttributes.get(key) : null;
    }
    
    /**
     * Determines if the contract data is pending processing
     *
     * @return True if the processing status is PENDING, false otherwise
     */
    public boolean isPending() {
        return "PENDING".equals(processingStatus);
    }
    
    /**
     * Determines if the contract data has been processed
     *
     * @return True if the processing status is PROCESSED, false otherwise
     */
    public boolean isProcessed() {
        return "PROCESSED".equals(processingStatus);
    }
    
    /**
     * Determines if the contract data has encountered an error during processing
     *
     * @return True if the processing status is ERROR, false otherwise
     */
    public boolean isError() {
        return "ERROR".equals(processingStatus);
    }
    
    /**
     * Marks the contract data as processed
     */
    public void markAsProcessed() {
        this.processingStatus = "PROCESSED";
        this.errorMessage = null;
    }
    
    /**
     * Marks the contract data as having an error
     *
     * @param errorMessage The error message
     */
    public void markAsError(String errorMessage) {
        this.processingStatus = "ERROR";
        this.errorMessage = errorMessage;
    }
    
    /**
     * Determines if this contract data is part of a batch operation
     *
     * @return True if this is part of a batch, false otherwise
     */
    public boolean isBatchEvent() {
        return batchId != null && !batchId.isEmpty();
    }
    
    /**
     * Determines if this contract data is from a specific source
     *
     * @param sourceName The source name to check
     * @return True if the contract data is from the specified source, false otherwise
     */
    public boolean isFromSource(String sourceName) {
        return sourceName != null && sourceName.equals(dataSource);
    }
    
    /**
     * Validates the contract data before processing
     *
     * @return True if the contract data is valid, false otherwise
     */
    public boolean validate() {
        return externalContractId != null && !externalContractId.isEmpty()
                && contractType != null && !contractType.isEmpty()
                && securityId != null && !securityId.isEmpty()
                && counterpartyId != null && !counterpartyId.isEmpty()
                && direction != null && !direction.isEmpty()
                && quantity != null
                && startDate != null;
    }
    
    /**
     * Determines if this contract data represents a securities lending agreement
     *
     * @return True if this is a securities lending agreement, false otherwise
     */
    public boolean isSecuritiesLending() {
        return "SECURITIES_LENDING".equals(contractType);
    }
    
    /**
     * Determines if this contract data represents a repurchase agreement
     *
     * @return True if this is a repurchase agreement, false otherwise
     */
    public boolean isRepurchaseAgreement() {
        return "REPO".equals(contractType);
    }
    
    /**
     * Determines if this contract data represents a swap
     *
     * @return True if this is a swap, false otherwise
     */
    public boolean isSwap() {
        return "SWAP".equals(contractType);
    }
    
    /**
     * Determines if this contract data represents a borrow from the perspective of the bank
     *
     * @return True if this is a borrow, false otherwise
     */
    public boolean isBorrow() {
        return "BORROW".equals(direction);
    }
    
    /**
     * Determines if this contract data represents a loan from the perspective of the bank
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
     * Converts this contract data to a Contract domain object
     *
     * @return A Contract domain object populated with data from this contract data
     */
    public Contract toContract() {
        Contract contract = Contract.builder()
                .contractId(null) // Will be generated
                .externalContractId(this.externalContractId)
                .contractType(this.contractType)
                .securityId(this.securityId)
                .security(this.security)
                .counterpartyId(this.counterpartyId)
                .counterparty(this.counterparty)
                .direction(this.direction)
                .quantity(this.quantity)
                .rate(this.rate)
                .currency(this.currency)
                .startDate(this.startDate)
                .endDate(this.endDate)
                .settlementDate(this.settlementDate)
                .maturityDate(this.maturityDate)
                .status(this.status)
                .market(this.market)
                .bookId(this.bookId)
                .isOpenTerm(this.isOpenTerm)
                .isRollable(this.isRollable)
                .collateralType(this.collateralType)
                .haircut(this.haircut)
                .tripartyAgent(this.tripartyAgent)
                .build();
        
        // Copy additional attributes
        if (this.additionalAttributes != null) {
            for (Map.Entry<String, String> entry : this.additionalAttributes.entrySet()) {
                contract.addAttribute(entry.getKey(), entry.getValue());
            }
        }
        
        return contract;
    }
    
    /**
     * JPA lifecycle callback that ensures securityId and counterpartyId are set
     * before entity is persisted
     */
    @PrePersist
    public void prePersist() {
        super.prePersist();
        
        // Ensure securityId is set if security is available
        if (security != null && securityId == null) {
            securityId = security.getInternalId();
        }
        
        // Ensure counterpartyId is set if counterparty is available
        if (counterparty != null && counterpartyId == null) {
            counterpartyId = counterparty.getCounterpartyId();
        }
        
        // Set default processingStatus if not set
        if (processingStatus == null) {
            processingStatus = "PENDING";
        }
        
        // Initialize additionalAttributes if null
        if (additionalAttributes == null) {
            additionalAttributes = new HashMap<>();
        }
    }
}