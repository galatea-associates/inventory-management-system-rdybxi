package com.ims.common.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Event class representing market data updates in the Inventory Management System.
 * This class extends BaseEvent and is used for publishing market data changes such as
 * price updates, NAV updates, and volatility data to downstream services for position
 * and inventory calculations.
 */
@Getter
@Setter
@ToString(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@JsonIgnoreProperties(ignoreUnknown = true)
public class MarketDataEvent extends BaseEvent {

    // Event type constants
    public static final String EVENT_TYPE_PRICE_UPDATE = "PRICE_UPDATE";
    public static final String EVENT_TYPE_NAV_UPDATE = "NAV_UPDATE";
    public static final String EVENT_TYPE_VOLATILITY_UPDATE = "VOLATILITY_UPDATE";
    public static final String EVENT_TYPE_BATCH_UPDATE = "BATCH_UPDATE";

    // Market data specific fields
    private String securityId;
    private String marketDataType;
    private BigDecimal price;
    private BigDecimal bidPrice;
    private BigDecimal askPrice;
    private BigDecimal volume;
    private BigDecimal navValue;
    private String currency;
    private Instant effectiveTime;
    private String dataSource;
    private String batchId;
    private Boolean isComposite;

    /**
     * Constructor that initializes a new market data event with the specified event type and source
     *
     * @param eventType The type of the event
     * @param source The source system or service that generated the event
     */
    public MarketDataEvent(String eventType, String source) {
        super(eventType, source);
        this.isComposite = false;
    }

    /**
     * Validates the market data event before processing
     *
     * @return True if the event is valid, false otherwise
     */
    @Override
    protected boolean validate() {
        boolean baseValid = super.validate();
        
        if (!baseValid || securityId == null || securityId.isEmpty() || 
            marketDataType == null || marketDataType.isEmpty() ||
            effectiveTime == null || dataSource == null || dataSource.isEmpty()) {
            return false;
        }
        
        // Specific validation based on event type
        if (isPriceUpdate()) {
            return price != null || (bidPrice != null && askPrice != null);
        } else if (isNavUpdate()) {
            return navValue != null;
        } else if (isBatchEvent()) {
            return batchId != null && !batchId.isEmpty();
        }
        
        return true;
    }
    
    /**
     * Determines if this event represents a price update
     *
     * @return True if this is a price update event, false otherwise
     */
    public boolean isPriceUpdate() {
        return EVENT_TYPE_PRICE_UPDATE.equals(getEventType());
    }
    
    /**
     * Determines if this event represents a NAV update
     *
     * @return True if this is a NAV update event, false otherwise
     */
    public boolean isNavUpdate() {
        return EVENT_TYPE_NAV_UPDATE.equals(getEventType());
    }
    
    /**
     * Determines if this event represents a volatility update
     *
     * @return True if this is a volatility update event, false otherwise
     */
    public boolean isVolatilityUpdate() {
        return EVENT_TYPE_VOLATILITY_UPDATE.equals(getEventType());
    }
    
    /**
     * Determines if this event represents a batch update
     *
     * @return True if this is a batch update event, false otherwise
     */
    public boolean isBatchEvent() {
        return EVENT_TYPE_BATCH_UPDATE.equals(getEventType());
    }
    
    /**
     * Gets the security identifier for this market data event
     *
     * @return The security identifier
     */
    public String getSecurityIdentifier() {
        return securityId;
    }
    
    /**
     * Calculates the mid price based on bid and ask prices if available
     *
     * @return The calculated mid price or null if bid or ask prices are not available
     */
    public BigDecimal getMidPrice() {
        if (bidPrice != null && askPrice != null) {
            return bidPrice.add(askPrice).divide(BigDecimal.valueOf(2), bidPrice.scale(), BigDecimal.ROUND_HALF_UP);
        }
        return null;
    }
    
    /**
     * Calculates the spread between ask and bid prices
     *
     * @return The calculated spread or null if bid or ask prices are not available
     */
    public BigDecimal getSpread() {
        if (bidPrice != null && askPrice != null) {
            return askPrice.subtract(bidPrice);
        }
        return null;
    }
}