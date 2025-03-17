package com.ims.common.model;

import com.ims.common.util.DateUtil;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Column;
import jakarta.persistence.PrePersist;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.MapKeyColumn;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.HashMap;

/**
 * Entity class representing market data received from external data providers during the ingestion process.
 * This class stores raw market data before it is processed and transformed into domain-specific models and events.
 * It supports various types of market data including prices, NAVs, and volatility data.
 */
@Entity
@Table(name = "market_data", indexes = {@Index(name = "idx_market_data_security_time", columnList = "security_id, event_time")})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class MarketData extends BaseEntity {

    /**
     * The security this market data is associated with.
     */
    @ManyToOne
    @JoinColumn(name = "security_id", insertable = false, updatable = false)
    private Security security;

    /**
     * The internal security ID.
     */
    @Column(name = "security_id")
    private String securityId;

    /**
     * The type of market data (e.g., PRICE, NAV, VOLATILITY).
     */
    @Column(name = "market_data_type", nullable = false)
    private String marketDataType;

    /**
     * The timestamp when the market data event occurred.
     */
    @Column(name = "event_time", nullable = false)
    private Instant eventTime;

    /**
     * The price of the security.
     */
    @Column(name = "price", precision = 19, scale = 8)
    private BigDecimal price;

    /**
     * The bid price of the security.
     */
    @Column(name = "bid_price", precision = 19, scale = 8)
    private BigDecimal bidPrice;

    /**
     * The ask price of the security.
     */
    @Column(name = "ask_price", precision = 19, scale = 8)
    private BigDecimal askPrice;

    /**
     * The trading volume.
     */
    @Column(name = "volume", precision = 19, scale = 2)
    private BigDecimal volume;

    /**
     * The NAV (Net Asset Value) for basket products.
     */
    @Column(name = "nav_value", precision = 19, scale = 8)
    private BigDecimal navValue;

    /**
     * The volatility value.
     */
    @Column(name = "volatility", precision = 19, scale = 8)
    private BigDecimal volatility;

    /**
     * The tenor for volatility curves (in days).
     */
    @Column(name = "tenor")
    private Integer tenor;

    /**
     * The currency of the market data.
     */
    @Column(name = "currency", length = 3)
    private String currency;

    /**
     * The source of the market data (e.g., Reuters, Bloomberg).
     */
    @Column(name = "source", nullable = false)
    private String source;

    /**
     * The batch ID for batch operations.
     */
    @Column(name = "batch_id")
    private String batchId;

    /**
     * The processing status of the market data (PENDING, PROCESSED, ERROR).
     */
    @Column(name = "processing_status")
    private String processingStatus;

    /**
     * Error message if processing failed.
     */
    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    /**
     * Flag indicating if this is a composite data point (e.g., derived from multiple sources).
     */
    @Column(name = "is_composite")
    @Builder.Default
    private Boolean isComposite = false;

    /**
     * Additional attributes that don't fit into the standard schema.
     */
    @ElementCollection
    @CollectionTable(name = "market_data_attributes", joinColumns = @JoinColumn(name = "market_data_id"))
    @MapKeyColumn(name = "attribute_key")
    @Column(name = "attribute_value")
    @Builder.Default
    private Map<String, String> additionalAttributes = new HashMap<>();

    /**
     * Static inner class representing a market data event for publishing to the event bus.
     * This is used by the toMarketDataEvent() method.
     */
    @Getter
    @Setter
    @Builder
    public static class MarketDataEvent {
        private String eventType;
        private String source;
        private String securityId;
        private String marketDataType;
        private BigDecimal price;
        private BigDecimal bidPrice;
        private BigDecimal askPrice;
        private BigDecimal volume;
        private BigDecimal navValue;
        private BigDecimal volatility;
        private Integer tenor;
        private String currency;
        private Instant effectiveTime;
        private String dataSource;
        private String batchId;
        private Boolean isComposite;
    }

    /**
     * Adds an additional attribute to this market data.
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
     * Gets the value of an additional attribute.
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
     * Determines if the market data is pending processing.
     *
     * @return True if the processing status is PENDING, false otherwise
     */
    public boolean isPending() {
        return "PENDING".equals(processingStatus);
    }

    /**
     * Determines if the market data has been processed.
     *
     * @return True if the processing status is PROCESSED, false otherwise
     */
    public boolean isProcessed() {
        return "PROCESSED".equals(processingStatus);
    }

    /**
     * Determines if the market data has encountered an error during processing.
     *
     * @return True if the processing status is ERROR, false otherwise
     */
    public boolean isError() {
        return "ERROR".equals(processingStatus);
    }

    /**
     * Marks the market data as processed.
     */
    public void markAsProcessed() {
        this.processingStatus = "PROCESSED";
        this.errorMessage = null;
    }

    /**
     * Marks the market data as having an error.
     *
     * @param errorMessage The error message
     */
    public void markAsError(String errorMessage) {
        this.processingStatus = "ERROR";
        this.errorMessage = errorMessage;
    }

    /**
     * Determines if this market data is part of a batch operation.
     *
     * @return True if this is part of a batch, false otherwise
     */
    public boolean isBatchEvent() {
        return batchId != null && !batchId.isEmpty();
    }

    /**
     * Determines if this market data is from a specific source.
     *
     * @param sourceName The source name to check
     * @return True if the market data is from the specified source, false otherwise
     */
    public boolean isFromSource(String sourceName) {
        return sourceName != null && sourceName.equals(source);
    }

    /**
     * Determines if this market data represents price information.
     *
     * @return True if this is price data, false otherwise
     */
    public boolean isPriceData() {
        return "PRICE".equals(marketDataType);
    }

    /**
     * Determines if this market data represents NAV information.
     *
     * @return True if this is NAV data, false otherwise
     */
    public boolean isNavData() {
        return "NAV".equals(marketDataType);
    }

    /**
     * Determines if this market data represents volatility information.
     *
     * @return True if this is volatility data, false otherwise
     */
    public boolean isVolatilityData() {
        return "VOLATILITY".equals(marketDataType);
    }

    /**
     * Calculates the mid price based on bid and ask prices if available.
     *
     * @return The calculated mid price or null if bid or ask prices are not available
     */
    public BigDecimal getMidPrice() {
        if (bidPrice != null && askPrice != null) {
            return bidPrice.add(askPrice).divide(new BigDecimal("2"), 8, BigDecimal.ROUND_HALF_UP);
        }
        return null;
    }

    /**
     * Calculates the spread between ask and bid prices.
     *
     * @return The calculated spread or null if bid or ask prices are not available
     */
    public BigDecimal getSpread() {
        if (bidPrice != null && askPrice != null) {
            return askPrice.subtract(bidPrice);
        }
        return null;
    }

    /**
     * Calculates the spread as a percentage of the mid price.
     *
     * @return The calculated spread percentage or null if mid price cannot be calculated
     */
    public BigDecimal getSpreadPercentage() {
        BigDecimal midPrice = getMidPrice();
        BigDecimal spread = getSpread();
        
        if (midPrice != null && spread != null && midPrice.compareTo(BigDecimal.ZERO) != 0) {
            return spread.divide(midPrice, 8, BigDecimal.ROUND_HALF_UP)
                    .multiply(new BigDecimal("100"));
        }
        return null;
    }

    /**
     * Validates the market data before processing.
     *
     * @return True if the market data is valid, false otherwise
     */
    public boolean validate() {
        // Basic validations
        if (securityId == null || securityId.isEmpty()) {
            return false;
        }
        
        if (marketDataType == null || marketDataType.isEmpty()) {
            return false;
        }
        
        if (eventTime == null) {
            return false;
        }
        
        if (source == null || source.isEmpty()) {
            return false;
        }
        
        // Type-specific validations
        if (isPriceData()) {
            return price != null || (bidPrice != null && askPrice != null);
        } else if (isNavData()) {
            return navValue != null;
        } else if (isVolatilityData()) {
            return volatility != null;
        }
        
        return true;
    }

    /**
     * Converts this market data entity to a MarketDataEvent for publishing.
     *
     * @return A MarketDataEvent populated with data from this entity
     */
    public MarketDataEvent toMarketDataEvent() {
        String eventType;
        if (isPriceData()) {
            eventType = "PRICE_UPDATE";
        } else if (isNavData()) {
            eventType = "NAV_UPDATE";
        } else if (isVolatilityData()) {
            eventType = "VOLATILITY_UPDATE";
        } else {
            eventType = "MARKET_DATA_UPDATE";
        }
        
        return MarketDataEvent.builder()
                .eventType(eventType)
                .source(source)
                .securityId(securityId)
                .marketDataType(marketDataType)
                .price(price)
                .bidPrice(bidPrice)
                .askPrice(askPrice)
                .volume(volume)
                .navValue(navValue)
                .volatility(volatility)
                .tenor(tenor)
                .currency(currency)
                .effectiveTime(eventTime)
                .dataSource(source)
                .batchId(batchId)
                .isComposite(isComposite)
                .build();
    }

    /**
     * Gets the security identifier, either from the security object or the securityId field.
     *
     * @return The security identifier
     */
    public String getSecurityIdentifier() {
        return security != null ? security.getInternalId() : securityId;
    }

    /**
     * JPA lifecycle callback that ensures securityId is set before entity is persisted.
     */
    @PrePersist
    public void prePersist() {
        super.prePersist();
        if (security != null && securityId == null) {
            securityId = security.getInternalId();
        }
        if (processingStatus == null) {
            processingStatus = "PENDING";
        }
        
        // Use DateUtil to format the creation timestamp for logging or auditing purposes
        if (getCreatedAt() != null) {
            DateUtil.formatDateTime(getCreatedAt());
        }
    }
}