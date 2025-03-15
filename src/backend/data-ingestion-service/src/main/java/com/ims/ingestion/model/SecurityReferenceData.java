package com.ims.ingestion.model;

import com.ims.common.model.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * Entity class representing security reference data received from external data providers
 * during the ingestion process. This class serves as an intermediate representation before
 * mapping to the core Security domain model and publishing ReferenceDataEvents. It supports
 * the multi-source data integration requirement by storing source-specific information and
 * enabling conflict detection.
 */
@Entity
@Table(name = "security_reference_data", indexes = {
    @Index(name = "idx_security_ref_external_id", columnList = "external_id, identifier_type, source")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class SecurityReferenceData extends BaseEntity {

    private String externalId;
    private String identifierType;
    private String securityType;
    private String name;
    private String description;
    private String issuer;
    private String currency;
    private LocalDate issueDate;
    private LocalDate maturityDate;
    private String market;
    private String exchange;
    private String status;
    private Boolean isBasket;
    private String basketType;
    private String isin;
    private String cusip;
    private String sedol;
    private String ticker;
    private String bloombergId;
    private String reutersId;
    private String source;
    private String batchId;
    private String processingStatus;
    private String errorMessage;
    
    @Builder.Default
    private Map<String, String> additionalAttributes = new HashMap<>();

    /**
     * Adds an additional attribute to this security reference data
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
        if (this.additionalAttributes == null) {
            return null;
        }
        return this.additionalAttributes.get(key);
    }
    
    /**
     * Determines if the security reference data is pending processing
     *
     * @return True if the processing status is PENDING, false otherwise
     */
    public boolean isPending() {
        return "PENDING".equals(processingStatus);
    }
    
    /**
     * Determines if the security reference data has been processed
     *
     * @return True if the processing status is PROCESSED, false otherwise
     */
    public boolean isProcessed() {
        return "PROCESSED".equals(processingStatus);
    }
    
    /**
     * Determines if the security reference data has encountered an error during processing
     *
     * @return True if the processing status is ERROR, false otherwise
     */
    public boolean isError() {
        return "ERROR".equals(processingStatus);
    }
    
    /**
     * Marks the security reference data as processed
     */
    public void markAsProcessed() {
        this.processingStatus = "PROCESSED";
        this.errorMessage = null;
    }
    
    /**
     * Marks the security reference data as having an error
     *
     * @param errorMessage The error message
     */
    public void markAsError(String errorMessage) {
        this.processingStatus = "ERROR";
        this.errorMessage = errorMessage;
    }
    
    /**
     * Determines if this security reference data is part of a batch operation
     *
     * @return True if this is part of a batch, false otherwise
     */
    public boolean isBatchEvent() {
        return batchId != null && !batchId.isEmpty();
    }
    
    /**
     * Determines if this security reference data is from a specific source
     *
     * @param sourceName The source name to check
     * @return True if the security reference data is from the specified source, false otherwise
     */
    public boolean isFromSource(String sourceName) {
        return source != null && source.equals(sourceName);
    }
    
    /**
     * Determines if this security reference data has conflicts with another reference data
     *
     * @param other The other security reference data to compare with
     * @return True if there are conflicts, false otherwise
     */
    public boolean hasConflictWith(SecurityReferenceData other) {
        // First check if they reference the same security via any common identifier
        boolean sameSecurityReference = false;
        
        // Check ISIN
        if (isin != null && !isin.isEmpty() && 
            other.getIsin() != null && !other.getIsin().isEmpty() &&
            isin.equals(other.getIsin())) {
            sameSecurityReference = true;
        }
        
        // Check CUSIP
        if (cusip != null && !cusip.isEmpty() && 
            other.getCusip() != null && !other.getCusip().isEmpty() &&
            cusip.equals(other.getCusip())) {
            sameSecurityReference = true;
        }
        
        // Check SEDOL
        if (sedol != null && !sedol.isEmpty() && 
            other.getSedol() != null && !other.getSedol().isEmpty() &&
            sedol.equals(other.getSedol())) {
            sameSecurityReference = true;
        }
        
        // Check Ticker
        if (ticker != null && !ticker.isEmpty() && 
            other.getTicker() != null && !other.getTicker().isEmpty() &&
            ticker.equals(other.getTicker())) {
            sameSecurityReference = true;
        }
        
        // If they don't reference the same security, there's no conflict
        if (!sameSecurityReference) {
            return false;
        }
        
        // If they're from the same source, there's no conflict
        if (source != null && source.equals(other.getSource())) {
            return false;
        }
        
        // Check for conflicts in core attributes
        if (securityType != null && other.getSecurityType() != null && 
            !securityType.equals(other.getSecurityType())) {
            return true;
        }
        
        if (issuer != null && other.getIssuer() != null && 
            !issuer.equals(other.getIssuer())) {
            return true;
        }
        
        if (currency != null && other.getCurrency() != null && 
            !currency.equals(other.getCurrency())) {
            return true;
        }
        
        if (market != null && other.getMarket() != null && 
            !market.equals(other.getMarket())) {
            return true;
        }
        
        if (status != null && other.getStatus() != null && 
            !status.equals(other.getStatus())) {
            return true;
        }
        
        if (isBasket != null && other.getIsBasket() != null && 
            !isBasket.equals(other.getIsBasket())) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Validates the security reference data before processing
     *
     * @return True if the security reference data is valid, false otherwise
     */
    public boolean validate() {
        return externalId != null && !externalId.isEmpty() &&
               identifierType != null && !identifierType.isEmpty() &&
               securityType != null && !securityType.isEmpty() &&
               source != null && !source.isEmpty();
    }
    
    /**
     * Determines if this security reference data has a primary identifier (ISIN, CUSIP, SEDOL)
     *
     * @return True if a primary identifier exists, false otherwise
     */
    public boolean hasPrimaryIdentifier() {
        return (isin != null && !isin.isEmpty()) ||
               (cusip != null && !cusip.isEmpty()) ||
               (sedol != null && !sedol.isEmpty());
    }
    
    /**
     * Gets the primary identifier type for this security reference data
     *
     * @return The primary identifier type (ISIN, CUSIP, SEDOL) or null if none exists
     */
    public String getPrimaryIdentifierType() {
        if (isin != null && !isin.isEmpty()) {
            return "ISIN";
        }
        if (cusip != null && !cusip.isEmpty()) {
            return "CUSIP";
        }
        if (sedol != null && !sedol.isEmpty()) {
            return "SEDOL";
        }
        return null;
    }
    
    /**
     * Gets the primary identifier value for this security reference data
     *
     * @return The primary identifier value (ISIN, CUSIP, SEDOL) or null if none exists
     */
    public String getPrimaryIdentifierValue() {
        if (isin != null && !isin.isEmpty()) {
            return isin;
        }
        if (cusip != null && !cusip.isEmpty()) {
            return cusip;
        }
        if (sedol != null && !sedol.isEmpty()) {
            return sedol;
        }
        return null;
    }
}