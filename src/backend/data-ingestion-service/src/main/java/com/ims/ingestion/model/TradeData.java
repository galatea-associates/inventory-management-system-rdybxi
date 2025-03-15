package com.ims.ingestion.model;

import com.ims.common.model.BaseEntity;
import com.ims.common.model.Security;
import com.ims.common.model.Counterparty;
import com.ims.common.util.DateUtil;
import com.ims.common.event.TradeDataEvent;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Index;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Entity class representing trade data received from external trading systems during the ingestion process.
 * This class stores raw trade data before it is processed and transformed into position updates.
 * It captures essential trade information including trade identifiers, security details, counterparty information,
 * quantities, prices, and settlement details.
 */
@Entity
@Table(name = "trade_data", indexes = {
    @Index(name = "idx_trade_data_trade_id", columnList = "trade_id"),
    @Index(name = "idx_trade_data_order_id", columnList = "order_id"),
    @Index(name = "idx_trade_data_execution_id", columnList = "execution_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class TradeData extends BaseEntity {

    private String tradeId;
    private String orderId;
    private String executionId;
    private String tradeType;
    
    private Security security;
    private String securityId;
    private String securityIdentifierType;
    private String securityIdentifierValue;
    
    private String bookId;
    
    private Counterparty counterparty;
    private String counterpartyId;
    
    private String side;
    private BigDecimal quantity;
    private BigDecimal price;
    private String currency;
    
    private LocalDate tradeDate;
    private LocalDate settlementDate;
    private String settlementCurrency;
    private LocalDateTime executionTime;
    
    private String tradeStatus;
    private String source;
    private String batchId;
    private String processingStatus;
    private String errorMessage;
    private String market;
    
    private Map<String, String> additionalAttributes = new HashMap<>();
    
    /**
     * Adds an additional attribute to this trade data
     *
     * @param key The attribute key
     * @param value The attribute value
     */
    public void addAttribute(String key, String value) {
        if (additionalAttributes == null) {
            additionalAttributes = new HashMap<>();
        }
        additionalAttributes.put(key, value);
    }
    
    /**
     * Gets the value of an additional attribute
     *
     * @param key The attribute key
     * @return The value of the attribute, or null if not found
     */
    public String getAttribute(String key) {
        if (additionalAttributes == null) {
            return null;
        }
        return additionalAttributes.get(key);
    }
    
    /**
     * Determines if the trade data is pending processing
     *
     * @return True if the processing status is PENDING, false otherwise
     */
    public boolean isPending() {
        return "PENDING".equals(processingStatus);
    }
    
    /**
     * Determines if the trade data has been processed
     *
     * @return True if the processing status is PROCESSED, false otherwise
     */
    public boolean isProcessed() {
        return "PROCESSED".equals(processingStatus);
    }
    
    /**
     * Determines if the trade data has encountered an error during processing
     *
     * @return True if the processing status is ERROR, false otherwise
     */
    public boolean isError() {
        return "ERROR".equals(processingStatus);
    }
    
    /**
     * Marks the trade data as processed
     */
    public void markAsProcessed() {
        this.processingStatus = "PROCESSED";
        this.errorMessage = null;
    }
    
    /**
     * Marks the trade data as having an error
     *
     * @param errorMessage The error message
     */
    public void markAsError(String errorMessage) {
        this.processingStatus = "ERROR";
        this.errorMessage = errorMessage;
    }
    
    /**
     * Determines if this trade data is part of a batch operation
     *
     * @return True if this is part of a batch, false otherwise
     */
    public boolean isBatchEvent() {
        return batchId != null && !batchId.isEmpty();
    }
    
    /**
     * Determines if this trade data is from a specific source
     *
     * @param sourceName The source name to check
     * @return True if the trade data is from the specified source, false otherwise
     */
    public boolean isFromSource(String sourceName) {
        return sourceName != null && sourceName.equals(source);
    }
    
    /**
     * Validates the trade data before processing
     *
     * @return True if the trade data is valid, false otherwise
     */
    public boolean validate() {
        // Must have at least one identifier
        boolean hasIdentifier = (tradeId != null && !tradeId.isEmpty()) || 
                               (orderId != null && !orderId.isEmpty()) || 
                               (executionId != null && !executionId.isEmpty());
        
        // Must have security identification
        boolean hasSecurityId = (securityId != null && !securityId.isEmpty()) || 
                                (securityIdentifierType != null && !securityIdentifierType.isEmpty() && 
                                 securityIdentifierValue != null && !securityIdentifierValue.isEmpty());
        
        // Must have book ID
        boolean hasBookId = bookId != null && !bookId.isEmpty();
        
        // Must have counterparty identification
        boolean hasCounterpartyId = counterpartyId != null && !counterpartyId.isEmpty();
        
        // Must have side
        boolean hasSide = side != null && !side.isEmpty();
        
        // Must have quantity
        boolean hasQuantity = quantity != null;
        
        // Must have trade date
        boolean hasTradeDate = tradeDate != null;
        
        return hasIdentifier && hasSecurityId && hasBookId && hasCounterpartyId && 
               hasSide && hasQuantity && hasTradeDate;
    }
    
    /**
     * Calculates the settlement date based on the trade date and market
     *
     * @return The calculated settlement date
     */
    public LocalDate calculateSettlementDate() {
        if (settlementDate != null) {
            return settlementDate;
        }
        
        if (tradeDate == null) {
            return null;
        }
        
        String marketCode = market;
        if (marketCode == null || marketCode.isEmpty()) {
            marketCode = "US"; // Default to US market if none specified
        }
        
        LocalDate calculatedDate = DateUtil.calculateMarketSettlementDate(tradeDate, marketCode);
        settlementDate = calculatedDate;
        
        return calculatedDate;
    }
    
    /**
     * Determines if this trade is a buy order
     *
     * @return True if this is a buy order, false otherwise
     */
    public boolean isBuy() {
        return "BUY".equals(side);
    }
    
    /**
     * Determines if this trade is a sell order
     *
     * @return True if this is a sell order, false otherwise
     */
    public boolean isSell() {
        return "SELL".equals(side);
    }
    
    /**
     * Determines if this trade data represents a trade execution
     *
     * @return True if this is a trade execution, false otherwise
     */
    public boolean isTradeExecution() {
        return "EXECUTION".equals(tradeType) || "TRADE_EXECUTION".equals(tradeType);
    }
    
    /**
     * Determines if this trade data represents an order update
     *
     * @return True if this is an order update, false otherwise
     */
    public boolean isOrderUpdate() {
        return "ORDER".equals(tradeType) || "ORDER_UPDATE".equals(tradeType);
    }
    
    /**
     * Converts this trade data to a TradeDataEvent for publishing
     *
     * @return A TradeDataEvent populated with data from this trade data
     */
    public TradeDataEvent toEvent() {
        TradeDataEvent event = TradeDataEvent.builder()
            .eventType("TRADE_DATA")
            .source(source)
            .tradeDataType(tradeType)
            .tradeId(tradeId)
            .orderId(orderId)
            .executionId(executionId)
            .securityId(securityId)
            .securityIdentifier(securityIdentifierValue)
            .bookId(bookId)
            .counterpartyId(counterpartyId)
            .side(side)
            .quantity(quantity)
            .price(price)
            .currency(currency)
            .tradeDate(tradeDate)
            .settlementDate(settlementDate != null ? settlementDate : calculateSettlementDate())
            .executionTime(executionTime)
            .tradeStatus(tradeStatus)
            .dataSource(source)
            .batchId(batchId)
            .build();
        
        // Copy additional attributes
        if (additionalAttributes != null) {
            for (Map.Entry<String, String> entry : additionalAttributes.entrySet()) {
                event.addAttribute(entry.getKey(), entry.getValue());
            }
        }
        
        return event;
    }
}