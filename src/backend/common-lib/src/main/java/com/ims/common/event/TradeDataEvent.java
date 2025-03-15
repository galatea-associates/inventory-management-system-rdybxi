package com.ims.common.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Event class representing trade data in the system. This class extends BaseEvent and contains all the
 * necessary information about trades, orders, and executions for position calculation and inventory management.
 * 
 * This class supports:
 * - Trade data ingestion (F-103) with high throughput processing
 * - Position calculation (F-201) based on trade events
 * - Event-driven architecture through Kafka messaging
 * - High-throughput message processing (F-501)
 */
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
@SuperBuilder
@JsonIgnoreProperties(ignoreUnknown = true)
public class TradeDataEvent extends BaseEvent {

    /**
     * The type of trade data (EXECUTION, ORDER, POSITION, etc.)
     */
    private String tradeDataType;
    
    /**
     * Unique identifier for the trade
     */
    private String tradeId;
    
    /**
     * Unique identifier for the order
     */
    private String orderId;
    
    /**
     * Unique identifier for the execution
     */
    private String executionId;
    
    /**
     * Internal identifier for the security
     */
    private String securityId;
    
    /**
     * External identifier for the security
     */
    private String securityIdentifier;
    
    /**
     * Identifier for the book
     */
    private String bookId;
    
    /**
     * Identifier for the counterparty
     */
    private String counterpartyId;
    
    /**
     * Trade side (BUY, SELL)
     */
    private String side;
    
    /**
     * Trade quantity
     */
    private BigDecimal quantity;
    
    /**
     * Trade price
     */
    private BigDecimal price;
    
    /**
     * Trade currency
     */
    private String currency;
    
    /**
     * Date when the trade was executed
     */
    private LocalDate tradeDate;
    
    /**
     * Date when the trade will settle
     */
    private LocalDate settlementDate;
    
    /**
     * Time when the trade was executed
     */
    private LocalDateTime executionTime;
    
    /**
     * Current status of the trade
     */
    private String tradeStatus;
    
    /**
     * Source system of the trade data
     */
    private String dataSource;
    
    /**
     * Identifier for batch processing
     */
    private String batchId;
    
    /**
     * Additional attributes for extensibility
     */
    private Map<String, String> additionalAttributes;

    /**
     * Constructor that initializes a new trade data event with the specified event type and source
     *
     * @param eventType The type of the event
     * @param source The source system or service that generated the event
     */
    public TradeDataEvent(String eventType, String source) {
        super(eventType, source);
        this.additionalAttributes = new HashMap<>();
    }

    /**
     * Validates the trade data event before processing
     *
     * @return True if the event is valid, false otherwise
     */
    @Override
    protected boolean validate() {
        boolean baseValid = super.validate();
        
        // Must have trade data type
        if (tradeDataType == null || tradeDataType.isEmpty()) {
            return false;
        }
        
        // Must have at least one identifier
        if ((tradeId == null || tradeId.isEmpty()) && 
            (orderId == null || orderId.isEmpty()) && 
            (executionId == null || executionId.isEmpty())) {
            return false;
        }
        
        // Must have security identifier
        if ((securityId == null || securityId.isEmpty()) && 
            (securityIdentifier == null || securityIdentifier.isEmpty())) {
            return false;
        }
        
        // Must have book ID
        if (bookId == null || bookId.isEmpty()) {
            return false;
        }
        
        // Must have quantity
        if (quantity == null) {
            return false;
        }
        
        return baseValid;
    }

    /**
     * Determines if this event represents a trade execution
     *
     * @return True if this is a trade execution, false otherwise
     */
    public boolean isTradeExecution() {
        return "EXECUTION".equals(tradeDataType) || "TRADE_EXECUTION".equals(tradeDataType);
    }

    /**
     * Determines if this event represents an order update
     *
     * @return True if this is an order update, false otherwise
     */
    public boolean isOrderUpdate() {
        return "ORDER".equals(tradeDataType) || "ORDER_UPDATE".equals(tradeDataType);
    }

    /**
     * Determines if this event represents a position update
     *
     * @return True if this is a position update, false otherwise
     */
    public boolean isPositionUpdate() {
        return "POSITION".equals(tradeDataType) || "POSITION_UPDATE".equals(tradeDataType);
    }

    /**
     * Determines if this event is part of a batch operation
     *
     * @return True if this is part of a batch, false otherwise
     */
    public boolean isBatchEvent() {
        return batchId != null && !batchId.isEmpty();
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
     * Adds an additional attribute to this trade data event
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
}